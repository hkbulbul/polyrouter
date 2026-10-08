/**
 * DevinCliExecutor — routes completions through the official Devin CLI binary
 * via the Agent Client Protocol (ACP) JSON-RPC 2.0 over stdio.
 *
 * Protocol flow:
 *   1. Spawn `devin acp --agent-type summarizer` (text-only; no local tools).
 *   2. Send: initialize → session/new (with model + cwd) → session/prompt.
 *   3. Receive text updates and emit OpenAI-compatible SSE chunks.
 *   4. Deny any unexpected permission request and stop on error.
 *
 * Auth: noAuth — the subprocess inherits the parent env and uses credentials
 * stored by `devin auth login` (~/.local/share/devin/credentials.toml).
 *
 * Binary discovery: CLI_DEVIN_BIN env → PATH lookup → platform installer paths.
 */

import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { BaseExecutor } from "./base.js";

// ─── Binary discovery ────────────────────────────────────────────────────────

function resolveDevinBin() {
  // 1. Explicit override
  const envBin = process.env.CLI_DEVIN_BIN?.trim();
  if (envBin) return envBin;

  const isWin = process.platform === "win32";
  const home = os.homedir();

  // 2. Known installer / package-manager locations. spawn uses shell:false on
  //    macOS/Linux, so process.env.PATH alone may miss ~/.local/bin, Homebrew,
  //    Scoop, etc. when the server runs detached (tray/daemon/launchd) without
  //    a login shell — probe these explicitly before falling back to PATH.
  const candidates = isWin
    ? [
      // Official installer: %LOCALAPPDATA%\devin\cli\bin\devin.exe
      path.join(process.env.LOCALAPPDATA || path.join(home, "AppData", "Local"), "devin", "cli", "bin", "devin.exe"),
      path.join(home, ".local", "bin", "devin.exe"),
      path.join(home, "scoop", "shims", "devin.exe"),
      path.join(process.env.LOCALAPPDATA || path.join(home, "AppData", "Local"), "Programs", "devin", "devin.exe"),
    ]
    : [
      path.join(home, ".local", "share", "devin", "bin", "devin"),
      path.join(home, ".devin", "bin", "devin"),
      path.join(home, ".local", "bin", "devin"), // pipx / user install
      "/opt/homebrew/bin/devin",                  // Homebrew (Apple Silicon)
      "/usr/local/bin/devin",                     // Homebrew (Intel) / manual
      "/usr/bin/devin",
    ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  // 3. Fallback — rely on process.env.PATH
  return isWin ? "devin.exe" : "devin";
}

// ─── ACP JSON-RPC helper ────────────────────────────────────────────────────

function rpc(method, params, id) {
  const msg = { jsonrpc: "2.0", method, params };
  if (id !== undefined) msg.id = id;
  return JSON.stringify(msg) + "\n";
}

// Resolve workspace cwd from client request (Codex/CLI env context, body fields).
// Prefer an absolute existing path so agent file tools hit the user's project
// instead of os.tmpdir() (which made relative create/delete inconsistent).
function resolveWorkspaceCwd(body) {
  const candidates = [];
  const push = (v) => {
    if (typeof v === "string" && v.trim()) candidates.push(v.trim());
  };
  push(body?.cwd);
  push(body?.working_directory);
  push(body?.workdir);
  push(body?.workspace);
  push(body?.metadata?.cwd);
  push(body?.metadata?.working_directory);

  const scanText = (text) => {
    if (typeof text !== "string") return;
    for (const m of text.matchAll(/<cwd>\s*([^<]+?)\s*<\/cwd>/gi)) push(m[1]);
  };
  const scanMessages = (msgs) => {
    if (!Array.isArray(msgs)) return;
    for (const msg of msgs) {
      if (!msg) continue;
      if (typeof msg.content === "string") scanText(msg.content);
      else if (Array.isArray(msg.content)) {
        for (const p of msg.content) {
          if (typeof p === "string") scanText(p);
          else if (p && typeof p === "object") {
            scanText(p.text);
            scanText(p.input_text);
            scanText(p.content);
          }
        }
      }
      // Responses API input items
      if (typeof msg === "string") scanText(msg);
      if (msg.type === "message" && Array.isArray(msg.content)) {
        for (const p of msg.content) scanText(p?.text || p?.input_text);
      }
    }
  };
  scanMessages(body?.messages);
  scanMessages(body?.input);

  for (const c of candidates) {
    try {
      if (path.isAbsolute(c) && fs.existsSync(c) && fs.statSync(c).isDirectory()) {
        return c;
      }
    } catch {
      /* ignore */
    }
  }
  return os.tmpdir();
}

// ─── Multi-turn message → single prompt builder ─────────────────────────────

function buildPromptText(messages) {
  // Inline the whole conversation so the model has full context, including
  // prior tool_calls / tool_results so it can continue after a client round-trip.
  const lines = [];
  for (const m of messages) {
    const role = String(m.role || "user");
    let text = "";
    if (typeof m.content === "string") {
      text = m.content;
    } else if (Array.isArray(m.content)) {
      for (const p of m.content) {
        if (!p || typeof p !== "object") continue;
        if (p.type === "text") text += String(p.text || "");
        else if (p.type === "tool_use") {
          text += `\n[Tool call ${p.name} id=${p.id}]\n${JSON.stringify(p.input ?? {})}\n`;
        } else if (p.type === "tool_result") {
          const c =
            typeof p.content === "string" ? p.content : JSON.stringify(p.content ?? "");
          text += `\n[Tool result id=${p.tool_use_id}]\n${c}\n`;
        }
      }
    }
    // OpenAI tool_calls on assistant messages
    if (role === "assistant" && Array.isArray(m.tool_calls) && m.tool_calls.length) {
      const parts = m.tool_calls.map((tc) => {
        const name = tc.function?.name || tc.name || "tool";
        const args = tc.function?.arguments ?? tc.arguments ?? {};
        const argStr = typeof args === "string" ? args : JSON.stringify(args);
        return `[Tool call ${name} id=${tc.id}]\n${argStr}`;
      });
      text = [text, ...parts].filter(Boolean).join("\n\n");
    }
    // OpenAI role=tool messages
    if (role === "tool") {
      const c = typeof m.content === "string" ? m.content : JSON.stringify(m.content ?? "");
      text = `[Tool result id=${m.tool_call_id || ""}]\n${c}`;
    }
    if (!text.trim()) continue;
    if (role === "system") {
      lines.push(`[System]\n${text}`);
    } else if (role === "assistant") {
      lines.push(`[Assistant]\n${text}`);
    } else if (role === "tool") {
      lines.push(`[Tool]\n${text}`);
    } else {
      lines.push(`[User]\n${text}`);
    }
  }
  return lines.join("\n\n") || "(empty)";
}

// ─── DevinCliExecutor ─────────────────────────────────────────────────────────

export class DevinCliExecutor extends BaseExecutor {
  constructor() {
    super("devin-cli", { id: "devin-cli", baseUrl: "devin://acp/stdio" });
  }

  buildUrl() {
    return "devin://acp/stdio";
  }

  buildHeaders() {
    return {};
  }

  transformRequest() {
    return null;
  }

  async execute({ model, body, credentials, signal, log }) {
    const b = body ?? {};
    const messages = Array.isArray(b.messages)
      ? b.messages
      : Array.isArray(b.input)
        ? b.input
        : [];
    const promptText = buildPromptText(messages);
    const workspaceCwd = resolveWorkspaceCwd(b);
    const devinBin = resolveDevinBin();

    log?.info?.(
      "DEVIN",
      `devin acp → model=${model}, bin=${devinBin}, cwd=${workspaceCwd}`
    );

    const sseStream = new ReadableStream({
      start(controller) {
        const enc = new TextEncoder();
        const emit = (data) => controller.enqueue(enc.encode(data));

        // Inherit the parent environment so devin resolves stored CLI credentials
        // (~/.local/share/devin/credentials.toml from `devin auth login`). Do NOT
        // inject WINDSURF_API_KEY: this provider is noAuth, and a bogus/leaked key
        // overrides stored creds and makes devin return -32000 "invalid api key".
        const env = { ...process.env };
        delete env.WINDSURF_API_KEY;
        const acpArgs = ["acp", "--agent-type", "summarizer"];

        // Keep the requested workspace context while running the no-tools agent.
        const child = spawn(devinBin, acpArgs, {
          env,
          cwd: workspaceCwd,
          stdio: ["pipe", "pipe", "pipe"],
          shell: false,
        });

        let spawnError = null;
        let stdinClosed = false;

        child.on("error", (err) => {
          spawnError = err;
          const msg =
            err.message.includes("ENOENT") || err.message.includes("not found")
              ? `Devin CLI not found: ${devinBin}. Install via https://cli.devin.ai or set CLI_DEVIN_BIN env var.`
              : `Devin CLI spawn error: ${err.message}`;
          emit(
            `data: ${JSON.stringify({ error: { message: msg, type: "devin_cli_error", code: "spawn_failed" } })}\n\n`
          );
          emit("data: [DONE]\n\n");
          controller.close();
        });

        if (signal) {
          signal.addEventListener("abort", () => {
            if (!child.killed) child.kill("SIGTERM");
          });
        }

        // ── JSON-RPC state machine ──────────────────────────────────────────
        let idCounter = 1;
        let sessionId = null;
        let initDone = false;
        let sessionCreated = false;
        let promptSent = false;
        const responseId = `chatcmpl-devin-${Date.now()}`;
        const created = Math.floor(Date.now() / 1000);
        let roleEmitted = false;
        let totalText = "";
        let finished = false;

        const sendRpc = (method, params) => {
          if (stdinClosed || child.stdin.destroyed) return;
          const id = idCounter++;
          try {
            child.stdin.write(rpc(method, params, id));
          } catch {
            /* ignore write errors after close */
          }
          return id;
        };

        // Emit a content delta as an OpenAI-compatible SSE chunk (handles the
        // leading role chunk once).
        const emitDelta = (delta) => {
          if (!roleEmitted) {
            emit(
              `data: ${JSON.stringify({
                id: responseId,
                object: "chat.completion.chunk",
                created,
                model,
                choices: [{ index: 0, delta: { role: "assistant", content: "" }, finish_reason: null }],
              })}\n\n`
            );
            roleEmitted = true;
          }
          totalText += delta;
          emit(
            `data: ${JSON.stringify({
              id: responseId,
              object: "chat.completion.chunk",
              created,
              model,
              choices: [{ index: 0, delta: { content: delta }, finish_reason: null }],
            })}\n\n`
          );
        };

        const finish = (error, finishReason = "stop") => {
          if (finished) return;
          finished = true;

          if (error) {
            emit(
              `data: ${JSON.stringify({ error: { message: error, type: "devin_cli_error" } })}\n\n`
            );
          } else {
            // Emit finish chunk
            emit(
              `data: ${JSON.stringify({
                id: responseId,
                object: "chat.completion.chunk",
                created,
                model,
                choices: [{ index: 0, delta: {}, finish_reason: finishReason }],
                usage: {
                  prompt_tokens: Math.ceil(promptText.length / 4),
                  completion_tokens: Math.ceil(totalText.length / 4),
                  total_tokens: Math.ceil((promptText.length + totalText.length) / 4),
                  estimated: true,
                },
              })}\n\n`
            );
          }
          emit("data: [DONE]\n\n");

          // Gracefully close stdin → devin will exit
          try {
            if (!stdinClosed) {
              stdinClosed = true;
              child.stdin.end();
            }
          } catch {
            /* ignore */
          }

          // Give it 2s to exit cleanly, then SIGKILL
          const killTimer = setTimeout(() => {
            if (!child.killed) child.kill("SIGKILL");
          }, 2000);
          killTimer.unref?.();

          controller.close();
        };

        // ── stdout reader (NDJSON) ──────────────────────────────────────────
        let buffer = "";

        child.stdout.on("data", (chunk) => {
          buffer += chunk.toString("utf8");
          let nl;
          // Each ACP message is a newline-terminated JSON line
          while ((nl = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line) continue;

            let msg;
            try {
              msg = JSON.parse(line);
            } catch {
              continue; // ignore non-JSON lines (banner text, etc.)
            }

            // ── Initialize response ───────────────────────────────────────
            if (!initDone && msg.result !== undefined && !msg.method) {
              initDone = true;
              // Create session with the client workspace cwd so agent file tools
              // resolve relative paths against the project (not /tmp).
              sendRpc("session/new", {
                cwd: workspaceCwd,
                // Devin's ACP requires mcpServers even when no tools are exposed.
                mcpServers: [],
                model: model || undefined,
              });
              continue;
            }

            // ── session/new response → get sessionId ──────────────────────
            if (initDone && !sessionCreated && msg.result !== undefined && !msg.method) {
              const res = msg.result || {};
              sessionId = res.sessionId || null;
              if (!sessionId) {
                finish("Devin ACP: session/new returned no sessionId");
                return;
              }
              sessionCreated = true;
              // Send the prompt. devin 3000.2.x expects `prompt` (a sequence),
              // not `content` — using `content` returns -32602 "missing field prompt".
              promptSent = true;
              sendRpc("session/prompt", {
                sessionId,
                prompt: [{ type: "text", text: promptText }],
              });
              continue;
            }

            // ── session/prompt response (ack / final result) ────────────
            if (sessionCreated && promptSent && msg.result !== undefined && !msg.method) {
              // Devin 3000.2.x only resolves session/prompt with the final result
              // (stopReason) after streaming completes. Streaming notifications are
              // handled below; nothing to do here unless we never streamed.
              if (!roleEmitted) {
                const res = msg.result || undefined;
                const content = extractResultText(res);
                if (content) {
                  totalText = content;
                  emitDelta(content);
                }
                const stopReason = (res && res.stopReason) || "";
                if (stopReason && stopReason !== "cancelled") {
                  finish();
                  return;
                }
              }
              continue;
            }

            // Deny unexpected permissions so configuration drift cannot grant
            // local filesystem or shell access.
            if (msg.method === "session/request_permission" && msg.id !== undefined) {
              child.stdin.write(
                JSON.stringify({
                  jsonrpc: "2.0",
                  id: msg.id,
                  result: { outcome: { outcome: "cancelled" } },
                }) + "\n"
              );
              continue;
            }

            // ── Agent stopped notification (devin 3000.2.x stop signal) ───
            if (msg.method === "_cognition.ai/agent_stopped" || msg.method === "$/agent_stopped") {
              const cause = msg.params?.cause;
              if (cause === "error") {
                // devin uses errorMessage on this notification (not message/error).
                const errText =
                  msg.params?.errorMessage ||
                  msg.params?.message ||
                  msg.params?.error ||
                  "Devin agent error";
                finish(String(errText));
              } else {
                finish();
              }
              return;
            }

            // ── Streaming notifications (session/update) ──────────────────
            if (msg.method === "session/update" || msg.method === "$/update") {
              const params = msg.params;
              if (!params) continue;

              // devin 3000.2.x nests the payload under params.update.sessionUpdate;
              // older devin used a flat params.type.
              const update = params.update || {};
              const type = update.sessionUpdate || params.type;
              const contentField = update.content !== undefined ? update.content : params.content;
              const deltaText =
                typeof contentField === "string"
                  ? contentField
                  : contentField?.text ?? params.delta ?? params.text ?? "";

              if (type === "agent_message_chunk" || type === "message_delta" || type === "text_delta" || type === "content_delta") {
                if (deltaText) emitDelta(deltaText);
              } else if (type === "agent_thought_chunk") {
                // Internal reasoning — not surfaced to the client.
              } else if (type === "message_stop" || type === "stop" || type === "done") {
                finish();
                return;
              } else if (type === "error") {
                finish(String(params.message || params.error || "Devin ACP error"));
                return;
              }
              continue;
            }

            // ── Error responses ───────────────────────────────────────────
            if (msg.error) {
              finish(`Devin ACP error ${msg.error.code}: ${msg.error.message}`);
              return;
            }
          }
        });

        child.stderr.on("data", (chunk) => {
          log?.debug?.("DEVIN", `stderr: ${chunk.toString("utf8").slice(0, 200)}`);
        });

        child.on("close", (code) => {
          if (!finished) {
            if (code !== 0 && !spawnError) {
              finish(roleEmitted ? undefined : `Devin CLI exited with code ${code}`);
            } else {
              finish();
            }
          }
        });

        // ── Send initialize ───────────────────────────────────────────────
        sendRpc("initialize", {
          protocolVersion: "0.3",
          clientInfo: { name: "PolyRouter", version: "1.0" },
          capabilities: {},
        });
      },
    });

    return {
      response: new Response(sseStream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }),
      url: "devin://acp/stdio",
      headers: {},
      transformedBody: {
        model,
        cwd: workspaceCwd,
        promptLength: Array.isArray(body?.messages)
          ? body.messages.length
          : Array.isArray(body?.input)
            ? body.input.length
            : 0,
      },
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Extract text from a final ACP session/prompt result object across common shapes.
function extractResultText(result) {
  // { message: { content: "..." } }
  // { messages: [{ content: "..." }] }
  // { content: "..." }
  // { text: "..." }
  if (typeof result.content === "string") return result.content;
  if (typeof result.text === "string") return result.text;
  const msg = result.message;
  if (msg && typeof msg.content === "string") return msg.content;
  const msgs = result.messages;
  if (Array.isArray(msgs)) {
    return msgs
      .filter((m) => m.role === "assistant")
      .map((m) => String(m.content || ""))
      .join("\n");
  }
  return "";
}

export default DevinCliExecutor;
