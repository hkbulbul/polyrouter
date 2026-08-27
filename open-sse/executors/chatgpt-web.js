/**
 * ChatGPT Web Executor ? browser automation via Playwright.
 *
 * Uses the chatgpt.com web UI as an upstream AI provider.  Opens a Temporary Chat,
 * sets the effort level, sends the prompt, polls the DOM until completion, and
 * extracts the Markdown response as an OpenAI-compatible SSE stream.
 *
 * Auth: OAuth (auth.openai.com) ? same flow as the existing "codex" provider.
 * The OAuth access token gives us a ChatGPT session; we inject it as a cookie
 * into the Playwright browser context.
 */
import { createHash, randomUUID } from "crypto";
import { BaseExecutor } from "./base.js";
import { PROVIDERS } from "../config/providers.js";
import { SSE_DONE, SSE_HEADERS_NO_BUFFER } from "../utils/sseConstants.js";
import { sseChunk } from "../utils/sse.js";
import { launchInstalledChromium } from "../utils/installedChromium.js";
import {
  completeChatGptWebToolCall,
  findChatGptWebTurnByCallId,
  markChatGptWebToolBatchDelivered,
  registerChatGptWebTurn,
  revokeChatGptWebTurn,
  setChatGptWebTurnRuntime,
  waitForChatGptWebToolBatch,
} from "./chatgpt-web-broker.js";
import {
  CHATGPT_TEMPORARY_CHAT_URL,
  CHATGPT_COMPOSER_SELECTOR,
  CHATGPT_SEND_BUTTON_SELECTOR,
  CHATGPT_EFFORT_CONTROL_SELECTOR,
  CHATGPT_EFFORT_ITEM_SELECTOR,
  CHATGPT_STOP_BUTTON_SELECTOR,
  CHATGPT_COMPLETION_ACTION_SELECTOR,
  CHATGPT_ASSISTANT_TURN_SELECTOR,
  MODEL_EFFORT_MAP,
  DEFAULT_EFFORT,
} from "./chatgpt-dom.js";

// ------ configuration ------

const TURN_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const POLL_INTERVAL_MS = 300;
const COMPLETION_SETTLE_MS = 3000;
const MAX_CONCURRENT_TABS = 5;
const MCP_CONNECTOR_NAME = process.env.CHATGPT_WEB_MCP_CONNECTOR_NAME || "PolyRouter Native";

// ------ browser lifecycle ------

let browserInstance = null;
let browserContext = null;
let browserContextSessionKey = null;
let browserContextCredentialHash = null;
let browserMutationQueue = Promise.resolve();
let activeTabs = 0;
const pagesBySession = new Map();
const busySessions = new Set();

function resetBrowserState() {
  browserInstance = null;
  browserContext = null;
  browserContextSessionKey = null;
  browserContextCredentialHash = null;
  activeTabs = 0;
  pagesBySession.clear();
  busySessions.clear();
}

function normalizeStoredCookies(cookies) {
  if (!Array.isArray(cookies)) return [];

  return cookies
    .filter((cookie) => cookie?.name && cookie?.domain && typeof cookie.value === "string")
    .map((cookie) => {
      const normalized = {
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path || "/",
        httpOnly: Boolean(cookie.httpOnly),
        secure: Boolean(cookie.secure),
      };

      if (["Strict", "Lax", "None"].includes(cookie.sameSite)) {
        normalized.sameSite = cookie.sameSite;
      }
      if (Number.isFinite(cookie.expires) && cookie.expires > 0) {
        normalized.expires = cookie.expires;
      }
      if (typeof cookie.partitionKey === "string" && cookie.partitionKey) {
        normalized.partitionKey = cookie.partitionKey;
      }

      return normalized;
    });
}

async function getBrowserContext(sessionKey, sessionCookies) {
  const cookies = normalizeStoredCookies(sessionCookies);
  const credentialHash = createHash("sha256")
    .update(JSON.stringify(cookies))
    .digest("hex");
  const open = async () => {
    if (browserInstance && !browserInstance.isConnected()) {
      resetBrowserState();
    }
    if (
      browserContext
      && browserContextSessionKey === sessionKey
      && browserContextCredentialHash === credentialHash
    ) {
      return browserContext;
    }
    if (browserContext && activeTabs > 0) {
      throw new Error("ChatGPT Web cannot switch accounts while another turn is active");
    }
    if (browserContext) await closeBrowser();

    ({ browser: browserInstance } = await launchInstalledChromium());
    const launchedBrowser = browserInstance;
    launchedBrowser.on("disconnected", () => {
      if (browserInstance === launchedBrowser) resetBrowserState();
    });
    browserContext = await browserInstance.newContext({
      viewport: { width: 1280, height: 900 },
    });
    browserContextSessionKey = sessionKey;
    browserContextCredentialHash = credentialHash;
    if (cookies.length > 0) await browserContext.addCookies(cookies);
    return browserContext;
  };

  const queued = browserMutationQueue.then(open, open);
  browserMutationQueue = queued.then(() => undefined, () => undefined);
  return queued;
}

async function closeBrowser() {
  try { await browserContext?.close(); } catch { /* ignore */ }
  try { await browserInstance?.close(); } catch { /* ignore */ }
  resetBrowserState();
}

// ------ page helpers ------

async function acquirePage(context, sessionId) {
  if (activeTabs >= MAX_CONCURRENT_TABS) {
    throw new Error(
      `ChatGPT Web: max ${MAX_CONCURRENT_TABS} concurrent turns. Retry later.`,
    );
  }
  if (busySessions.has(sessionId)) {
    throw new Error("ChatGPT Web already has a request running for this session");
  }

  let page = pagesBySession.get(sessionId);
  if (page?.isClosed()) {
    pagesBySession.delete(sessionId);
    page = null;
  }
  if (!page) {
    if (pagesBySession.size >= MAX_CONCURRENT_TABS) {
      throw new Error(
        `ChatGPT Web: max ${MAX_CONCURRENT_TABS} open sessions. Close an unused ChatGPT tab and retry.`,
      );
    }
    page = await context.newPage();
    pagesBySession.set(sessionId, page);
    page.once("close", () => {
      if (pagesBySession.get(sessionId) === page) {
        pagesBySession.delete(sessionId);
      }
      busySessions.delete(sessionId);
    });
  }

  busySessions.add(sessionId);
  activeTabs += 1;
  return page;
}

function releasePage(sessionId) {
  activeTabs = Math.max(0, activeTabs - 1);
  busySessions.delete(sessionId);
}

// ------ DOM helpers ------

async function waitFor(page, selector, timeout = 15_000) {
  const locator = page.locator(selector).last();
  await locator.waitFor({ state: "visible", timeout });
  return locator;
}

async function typeIntoComposer(page, text, selectedComposer = null) {
  const composer = selectedComposer || await waitFor(page, CHATGPT_COMPOSER_SELECTOR, 30_000);
  await composer.click();
  if (selectedComposer) {
    await page.keyboard.press("End");
    await page.keyboard.insertText(` ${text}`);
  } else {
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Backspace");
    await composer.fill(text);
  }
}

function selectedConnector(page, connectorName) {
  return page
    .locator(CHATGPT_COMPOSER_SELECTOR)
    .last()
    .locator('[data-id^="plugin:"][data-keyword]')
    .filter({ hasText: connectorName })
    .last();
}

async function connectorIsSelected(page, connectorName) {
  const selected = selectedConnector(page, connectorName);
  if (!await selected.isVisible().catch(() => false)) return false;
  return (await selected.getAttribute("data-keyword").catch(() => null)) === connectorName;
}

async function selectMcpConnector(page, connectorName) {
  let composer = await waitFor(page, CHATGPT_COMPOSER_SELECTOR, 30_000);
  await composer.fill("");
  if (await connectorIsSelected(page, connectorName)) return composer;

  const rows = page.locator('.__menu-item[tabindex="0"]');
  const exactRow = rows.filter({ has: page.getByText(connectorName, { exact: true }) });
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    composer = await waitFor(page, CHATGPT_COMPOSER_SELECTOR, 10_000);
    await composer.fill("");
    await composer.focus();
    await composer.pressSequentially(`@${connectorName[0]?.toLowerCase() || "p"}`, { delay: 30 });
    if (await exactRow.last().isVisible().catch(() => false)) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (!await exactRow.last().isVisible().catch(() => false)) {
    throw new Error(
      `ChatGPT MCP connector ${JSON.stringify(connectorName)} is not available. Enable Developer mode and attach the connector.`,
    );
  }
  await exactRow.last().dispatchEvent("click");
  composer = await waitFor(page, CHATGPT_COMPOSER_SELECTOR, 10_000);
  await selectedConnector(page, connectorName).waitFor({ state: "visible", timeout: 10_000 });
  if (!await connectorIsSelected(page, connectorName)) {
    throw new Error(`ChatGPT did not select MCP connector ${JSON.stringify(connectorName)}`);
  }
  return composer;
}

async function setEffortLevel(page, effortIndex) {
  const effortBtn = page.locator(CHATGPT_EFFORT_CONTROL_SELECTOR).last();
  try {
    await effortBtn.waitFor({ state: "visible", timeout: 10_000 });
    const expanded = await effortBtn.getAttribute("aria-expanded");
    const menu = page.locator(
      '[role="menu"]:has([role="menuitemradio"])',
    ).last();
    const menuOpen = await menu.isVisible().catch(() => false);
    if (menuOpen !== true && expanded !== "true") {
      await effortBtn.click();
      await menu.waitFor({ state: "visible", timeout: 5_000 });
    }
  } catch {
    return false;
  }
  const items = page.locator(CHATGPT_EFFORT_ITEM_SELECTOR);
  const count = await items.count();
  if (count <= 1 || effortIndex >= count) return false;
  if (effortIndex < count) {
    await items.nth(effortIndex).click();
    return true;
  }
  return false;
}

async function getAssistantText(page) {
  const turns = page.locator(CHATGPT_ASSISTANT_TURN_SELECTOR);
  const count = await turns.count();
  if (count === 0) return "";
  const turn = turns.last();
  const text = await turn.textContent().catch(() => "");
  return (text || "").trim();
}

// ------ main turn execution ------

async function runChatGptTurn(page, prompt, effortIndex, signal, log, { connectorName = null } = {}) {
  await page.goto(CHATGPT_TEMPORARY_CHAT_URL, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  await waitFor(page, CHATGPT_COMPOSER_SELECTOR, 20_000);

  if (effortIndex > 0) {
    await setEffortLevel(page, effortIndex);
  }

  await new Promise((r) => setTimeout(r, 300));
  const selectedComposer = connectorName
    ? await selectMcpConnector(page, connectorName)
    : null;
  await typeIntoComposer(page, prompt, selectedComposer);

  const sendBtn = page.locator(CHATGPT_SEND_BUTTON_SELECTOR).last();
  await sendBtn.click();
  log?.info?.("CHATGPT-WEB", `Sent prompt (${prompt.length} chars), effort=${effortIndex}`);

  const deadline = Date.now() + TURN_TIMEOUT_MS;
  let lastText = "";
  let completed = false;
  let sawRunning = false;

  while (Date.now() < deadline) {
    if (signal?.aborted) throw new Error("Turn aborted");

    const rateLimitDialog = page.locator(
      '[role="dialog"]:has-text("Too many requests")',
    ).last();
    if (await rateLimitDialog.isVisible().catch(() => false)) {
      const dismissBtn = rateLimitDialog.getByRole("button", {
        name: "Got it",
        exact: true,
      }).last();
      if (await dismissBtn.isVisible().catch(() => false)) {
        await dismissBtn.press("Enter").catch(() => {});
      }
      throw new Error("ChatGPT rate limited. Wait and retry.");
    }

    const sessionFail = page.locator(
      '[role="alert"]:has-text("Failed to load subscription")',
    ).last();
    if (await sessionFail.isVisible().catch(() => false)) {
      throw new Error("ChatGPT subscription unavailable. Re-sign in.");
    }

    const stopBtn = page.locator(CHATGPT_STOP_BUTTON_SELECTOR).last();
    const running = await stopBtn.isVisible().catch(() => false);
    if (running) sawRunning = true;

    const text = await getAssistantText(page);

    if (!running && sawRunning && text.length > 0) {
      await new Promise((r) => setTimeout(r, COMPLETION_SETTLE_MS));

      const copyBtn = page.locator(
        CHATGPT_COMPLETION_ACTION_SELECTOR,
      ).last();
      const hasCopyBtn = await copyBtn.isVisible().catch(() => false);

      const finalText = await getAssistantText(page);

      if (hasCopyBtn || finalText === text) {
        log?.info?.(
          "CHATGPT-WEB",
          `Completed: ${finalText.length} chars`,
        );
        return finalText;
      }
    }

    lastText = text;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  log?.warn?.("CHATGPT-WEB", `Turn timed out after ${TURN_TIMEOUT_MS}ms`);
  const partial = await getAssistantText(page);
  if (partial) return partial;
  throw new Error("ChatGPT Web turn timed out with no response.");
}

// ------ OpenAI stream builders ------

function buildStreamingResponse(text, model, cid, created) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          sseChunk({
            id: cid,
            object: "chat.completion.chunk",
            created,
            model,
            system_fingerprint: null,
            choices: [
              {
                index: 0,
                delta: { role: "assistant" },
                finish_reason: null,
                logprobs: null,
              },
            ],
          }),
        ),
      );

      let pos = 0;
      const chunkSize = 500;
      while (pos < text.length) {
        const delta = text.slice(pos, pos + chunkSize);
        pos += chunkSize;
        controller.enqueue(
          encoder.encode(
            sseChunk({
              id: cid,
              object: "chat.completion.chunk",
              created,
              model,
              system_fingerprint: null,
              choices: [
                {
                  index: 0,
                  delta: { content: delta },
                  finish_reason: null,
                  logprobs: null,
                },
              ],
            }),
          ),
        );
      }

      controller.enqueue(
        encoder.encode(
          sseChunk({
            id: cid,
            object: "chat.completion.chunk",
            created,
            model,
            system_fingerprint: null,
            choices: [
              {
                index: 0,
                delta: {},
                finish_reason: "stop",
                logprobs: null,
              },
            ],
          }),
        ),
      );
      controller.enqueue(encoder.encode(SSE_DONE));
      controller.close();
    },
  });
}

function buildNonStreamingResponse(text, model, cid, created) {
  const promptTokens = Math.ceil(text.length / 3);
  const completionTokens = Math.ceil(text.length / 3);
  return new Response(
    JSON.stringify({
      id: cid,
      object: "chat.completion",
      created,
      model,
      system_fingerprint: null,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: text },
          finish_reason: "stop",
          logprobs: null,
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function buildToolStreamingResponse(toolCalls, model, cid, created) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(sseChunk({
        id: cid,
        object: "chat.completion.chunk",
        created,
        model,
        choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }],
      })));
      toolCalls.forEach((toolCall, index) => {
        controller.enqueue(encoder.encode(sseChunk({
          id: cid,
          object: "chat.completion.chunk",
          created,
          model,
          choices: [{
            index: 0,
            delta: {
              tool_calls: [{
                index,
                id: toolCall.callId,
                type: "function",
                ...(toolCall.freeform ? { _polyrouterFreeform: true } : {}),
                function: {
                  name: toolCall.name,
                  arguments: toolCall.freeform
                    ? JSON.stringify({ input: toolCall.input || "" })
                    : JSON.stringify(toolCall.arguments || {}),
                },
              }],
            },
            finish_reason: null,
          }],
        })));
      });
      controller.enqueue(encoder.encode(sseChunk({
        id: cid,
        object: "chat.completion.chunk",
        created,
        model,
        choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }],
      })));
      controller.enqueue(encoder.encode(SSE_DONE));
      controller.close();
    },
  });
}

function buildToolNonStreamingResponse(toolCalls, model, cid, created) {
  return new Response(JSON.stringify({
    id: cid,
    object: "chat.completion",
    created,
    model,
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: null,
        tool_calls: toolCalls.map((toolCall) => ({
          id: toolCall.callId,
          type: "function",
          ...(toolCall.freeform ? { _polyrouterFreeform: true } : {}),
          function: {
            name: toolCall.name,
            arguments: toolCall.freeform
              ? JSON.stringify({ input: toolCall.input || "" })
              : JSON.stringify(toolCall.arguments || {}),
          },
        })),
      },
      finish_reason: "tool_calls",
    }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(status, message, type = "invalid_request") {
  return new Response(JSON.stringify({ error: { message, type } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function messageContentText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return content == null ? "" : JSON.stringify(content);
  return content.map((item) => {
    if (typeof item === "string") return item;
    if (typeof item?.text === "string") return item.text;
    if (typeof item?.output === "string") return item.output;
    return JSON.stringify(item);
  }).join("\n");
}

function pendingToolResults(messages) {
  const results = [];
  for (const message of messages || []) {
    if (message?.role !== "tool" || typeof message.tool_call_id !== "string") continue;
    const turn = findChatGptWebTurnByCallId(message.tool_call_id);
    if (!turn) continue;
    results.push({ turn, callId: message.tool_call_id, content: messageContentText(message.content) });
  }
  return results;
}

function toolResultAsMcp(content) {
  return {
    content: [{ type: "text", text: content || "Tool completed with no output." }],
  };
}

function mcpPromptPrefix(turnToken, connectorName) {
  return [
    `A developer-mode MCP app named ${connectorName} is attached to this response.`,
    "For local files, commands, processes, images, and other client tools, use that MCP app.",
    `Before any answer or commentary, call polyrouter_bind_turn with turn_token ${turnToken}.`,
    "Use the returned binding_id with polyrouter_tool_inventory, then call the exact required tool through polyrouter_tool_call.",
    "The outer client executes tools with its normal sandbox and approval policy and returns real results to this same response.",
    "Keep calling tools until the task is complete and verified. Never print a proposed tool call as assistant text.",
    "Do not reveal the turn_token or binding_id in the user-facing answer.",
  ].join("\n");
}

function cleanupToolRuntime(turn, reason, abortBrowser = false) {
  const runtime = turn?.runtime;
  if (!runtime || runtime.cleaned) return;
  runtime.cleaned = true;
  if (runtime.expiryTimer) clearTimeout(runtime.expiryTimer);
  if (abortBrowser) runtime.abortController.abort();
  revokeChatGptWebTurn(turn.token, reason);
  releasePage(runtime.pageSessionId);
}

async function nextToolRuntimeResponse(turn, stream, log) {
  const runtime = turn.runtime;
  if (!runtime || runtime.cleaned) throw new Error("ChatGPT Web MCP runtime is not active");
  const waitAbort = new AbortController();
  try {
    const next = await Promise.race([
      waitForChatGptWebToolBatch(turn.token, waitAbort.signal)
        .then((requests) => ({ type: "tools", requests })),
      runtime.browserPromise.then(
        (text) => ({ type: "final", text }),
        (error) => ({ type: "error", error }),
      ),
    ]);
    waitAbort.abort();

    const cid = `chatcmpl-cgw-${randomUUID().slice(0, 12)}`;
    const created = Math.floor(Date.now() / 1000);
    if (next.type === "tools") {
      if (next.requests.length === 0) throw new Error("ChatGPT Web MCP returned an empty tool batch");
      markChatGptWebToolBatchDelivered(turn.token, next.requests);
      runtime.outstanding = new Set(next.requests.map((request) => request.callId));
      log?.info?.("CHATGPT-WEB", `MCP requested ${next.requests.length} client tool(s)`);
      const response = stream
        ? new Response(buildToolStreamingResponse(next.requests, runtime.model, cid, created), {
            status: 200,
            headers: { ...SSE_HEADERS_NO_BUFFER },
          })
        : buildToolNonStreamingResponse(next.requests, runtime.model, cid, created);
      return { response };
    }
    if (next.type === "error") throw next.error;

    cleanupToolRuntime(turn, "ChatGPT Web MCP turn completed");
    const response = stream
      ? new Response(buildStreamingResponse(next.text, runtime.model, cid, created), {
          status: 200,
          headers: { ...SSE_HEADERS_NO_BUFFER },
        })
      : buildNonStreamingResponse(next.text, runtime.model, cid, created);
    return { response };
  } catch (error) {
    waitAbort.abort();
    cleanupToolRuntime(turn, error.message || "ChatGPT Web MCP turn failed", true);
    throw error;
  }
}

// ------ executor ------

export class ChatGptWebExecutor extends BaseExecutor {
  constructor() {
    super("chatgpt-web", PROVIDERS["chatgpt-web"]);
  }

  async execute({ model, body, stream, credentials, signal, log, sessionId }) {
    const messages = body?.messages;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      const errResp = new Response(
        JSON.stringify({
          error: { message: "Missing messages", type: "invalid_request" },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
      return { response: errResp };
    }

    const effort = MODEL_EFFORT_MAP[model] || DEFAULT_EFFORT;
    log?.info?.("CHATGPT-WEB", `model=${model} effort=${effort.label}(${effort.index})`);

    const continuedResults = pendingToolResults(messages);
    if (continuedResults.length > 0) {
      const turn = continuedResults[0].turn;
      if (continuedResults.some((result) => result.turn.token !== turn.token)) {
        return { response: errorResponse(400, "Tool results reference multiple active ChatGPT Web turns") };
      }
      if (turn.connectionId && turn.connectionId !== credentials?.connectionId) {
        cleanupToolRuntime(turn, "ChatGPT Web MCP continuation changed connections", true);
        return { response: errorResponse(409, "ChatGPT Web MCP continuation must use its original connection") };
      }
      const runtime = turn.runtime;
      const expected = runtime?.outstanding;
      if (!runtime || !expected || expected.size === 0) {
        return { response: errorResponse(409, "ChatGPT Web MCP turn has no outstanding client tools") };
      }
      const returned = new Set(continuedResults.map((result) => result.callId));
      if (returned.size !== expected.size || [...expected].some((callId) => !returned.has(callId))) {
        return {
          response: errorResponse(
            400,
            `Expected ${expected.size} tool result(s), received ${returned.size}`,
          ),
        };
      }
      try {
        for (const result of continuedResults) {
          completeChatGptWebToolCall(result.callId, toolResultAsMcp(result.content));
        }
        runtime.outstanding = new Set();
        return await nextToolRuntimeResponse(turn, stream, log);
      } catch (error) {
        log?.error?.("CHATGPT-WEB", `MCP continuation failed: ${error.message || String(error)}`);
        return { response: errorResponse(502, `ChatGPT Web MCP: ${error.message || String(error)}`, "upstream_error") };
      }
    }

    const basePrompt = messagesToPrompt(messages);
    if (!basePrompt.trim()) {
      const errResp = new Response(
        JSON.stringify({
          error: { message: "Empty prompt", type: "invalid_request" },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
      return { response: errResp };
    }

    const sessionCookies = credentials?.providerSpecificData?.sessionCookies;
    if (!Array.isArray(sessionCookies) || sessionCookies.length === 0) {
      const errResp = new Response(
        JSON.stringify({
          error: {
            message: "ChatGPT Web cookies are not configured. Re-authenticate with PolyRouter Connector.",
            type: "auth_error",
          },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
      return { response: errResp };
    }

    const sessionKey =
      credentials?.connectionId ||
      credentials?.providerSpecificData?.sessionDir ||
      "chatgpt-web-default";
    const pageSessionId = sessionId || sessionKey;
    const mcpEnabled =
      process.env.CHATGPT_WEB_MCP_ENABLED !== "0" &&
      credentials?.providerSpecificData?.mcpEnabled !== false &&
      body?.tool_choice !== "none" &&
      Array.isArray(body?.tools) &&
      body.tools.length > 0;
    let page;
    let mcpTurn = null;
    let pageOwnedByRuntime = false;
    try {
      const context = await getBrowserContext(sessionKey, sessionCookies);
      page = await acquirePage(context, pageSessionId);

      if (mcpEnabled) {
        mcpTurn = registerChatGptWebTurn({
          tools: body.tools,
          sessionId: pageSessionId,
          connectionId: credentials?.connectionId,
          ttlMs: TURN_TIMEOUT_MS + 60_000,
        });
        const abortController = new AbortController();
        const prompt = `${mcpPromptPrefix(mcpTurn.token, MCP_CONNECTOR_NAME)}\n\n${basePrompt}`;
        const browserPromise = runChatGptTurn(
          page,
          prompt,
          effort.index,
          abortController.signal,
          log,
          { connectorName: MCP_CONNECTOR_NAME },
        );
        const runtime = {
          page,
          pageSessionId,
          model,
          browserPromise,
          abortController,
          outstanding: new Set(),
          cleaned: false,
          expiryTimer: null,
        };
        setChatGptWebTurnRuntime(mcpTurn.token, runtime);
        runtime.expiryTimer = setTimeout(() => {
          cleanupToolRuntime(mcpTurn, "ChatGPT Web MCP turn timed out", true);
        }, TURN_TIMEOUT_MS + 60_000);
        runtime.expiryTimer.unref?.();
        pageOwnedByRuntime = true;
        return await nextToolRuntimeResponse(mcpTurn, stream, log);
      }

      const result = await runChatGptTurn(
        page,
        basePrompt,
        effort.index,
        signal,
        log,
      );

      const cid = `chatcmpl-cgw-${randomUUID().slice(0, 12)}`;
      const created = Math.floor(Date.now() / 1000);

      let response;
      if (stream) {
        response = new Response(
          buildStreamingResponse(result, model, cid, created),
          { status: 200, headers: { ...SSE_HEADERS_NO_BUFFER } },
        );
      } else {
        response = buildNonStreamingResponse(result, model, cid, created);
      }

      return { response };
    } catch (err) {
      if (mcpTurn && !pageOwnedByRuntime) {
        revokeChatGptWebTurn(mcpTurn.token, err.message || "ChatGPT Web MCP setup failed");
      }
      log?.error?.("CHATGPT-WEB", `Turn failed: ${err.message || String(err)}`);
      const status =
        err.message?.includes("rate limited") ? 429
        : err.message?.includes("subscription") ? 503
        : err.message?.includes("auth") ? 401
        : 502;
      const errResp = new Response(
        JSON.stringify({
          error: {
            message: `ChatGPT Web: ${err.message || String(err)}`,
            type: "upstream_error",
          },
        }),
        { status, headers: { "Content-Type": "application/json" } },
      );
      return { response: errResp };
    } finally {
      if (page && !pageOwnedByRuntime) releasePage(pageSessionId);
    }
  }
}

// ------ message to prompt conversion ------

function messagesToPrompt(messages) {
  const parts = [];
  for (const msg of messages) {
    let role = String(msg.role || "user");
    if (role === "developer" || role === "system") role = "system";
    const content = messageContentText(msg.content);
    if (role === "assistant" && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
      const calls = msg.tool_calls.map((call) => {
        const name = call?.function?.name || "unknown_tool";
        const args = call?.function?.arguments || "{}";
        return `${name}(${args})`;
      });
      parts.push(`assistant tool calls: ${calls.join(", ")}`);
    }
    if (!content.trim()) continue;
    if (role === "tool") {
      parts.push(`tool result ${msg.tool_call_id || "unknown"}: ${content}`);
    } else {
      parts.push(role === "system" ? content : `${role}: ${content}`);
    }
  }
  return parts.join("\n\n");
}

export default ChatGptWebExecutor;
