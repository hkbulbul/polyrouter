import { BaseExecutor } from "./base.js";
import { PROVIDERS } from "../config/providers.js";
import { proxyAwareFetch } from "../utils/proxyFetch.js";
import { dbg } from "../utils/debugLog.js";

const STREAM_TIMEOUT_MS = parseInt(process.env.TRAE_STREAM_TIMEOUT_MS || "300000", 10);

function stringifyTraeStreamError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  const cause = err?.cause;
  const code = cause?.code || err?.code || "";
  const causeMsg = cause?.message ? `: ${cause.message}` : "";
  return code ? `${msg} (${code}${causeMsg})` : msg;
}

// For simple chat turns Trae keeps `thought` empty and puts the user-facing answer in the
// `finish` tool call's summary. params/result may be an object, a JSON string, or — while the
// tool call is still streaming — a truncated JSON string.
function extractFinishSummary(tci) {
  if (!tci || typeof tci !== "object") return "";
  const name = String(tci.name || "").toLowerCase();
  if (name && name !== "finish") return "";
  const pick = (o) => {
    if (!o || typeof o !== "object") return "";
    for (const k of ["summary", "content", "text", "answer", "response"]) {
      if (typeof o[k] === "string" && o[k]) return o[k];
    }
    return "";
  };
  for (const cand of [tci.params, tci.result, tci.arguments, tci.args, tci.input]) {
    if (!cand) continue;
    if (typeof cand === "object") {
      const s = pick(cand);
      if (s) return s;
      continue;
    }
    if (typeof cand !== "string") continue;
    try {
      const s = pick(JSON.parse(cand));
      if (s) return s;
    } catch {
      // partial JSON mid-stream — take the summary value collected so far
      const m = cand.match(/"(?:summary|content|text|answer|response)"\s*:\s*"((?:[^"\\]|\\.)*)/);
      if (m) { try { return JSON.parse(`"${m[1]}"`); } catch { return m[1]; } }
    }
  }
  return "";
}

// Trae resends the full cumulative text for a plan item on every update; emit only the new
// suffix per (plan item, channel) so the client doesn't see the answer repeated.
function makeAccumulator() {
  const store = {}; const order = [];
  let emitted = 0;
  return {
    push(key, text) {
      if (!text || typeof text !== "string") return "";
      if (!(key in store)) { store[key] = ""; order.push(key); }
      const prev = store[key];
      if (text.length <= prev.length) return "";
      store[key] = text;
      emitted += text.length - prev.length;
      return text.slice(prev.length);
    },
    total() { return order.map((k) => store[k]).join(""); },
    emittedLength() { return emitted; },
  };
}

const planKey = (data) => data?.id || data?.planId || data?.task_id || "p0";

function pickPlanText(data) {
  for (const k of ["thought", "content", "text"]) {
    if (typeof data?.[k] === "string" && data[k]) return { key: `${planKey(data)}:${k}`, text: data[k] };
  }
  const summary = extractFinishSummary(data?.tool_call_info);
  if (summary) return { key: `${planKey(data)}:summary`, text: summary };
  return null;
}

function pickPlanReasoning(data) {
  for (const k of ["reasoning_content", "reasoning"]) {
    if (typeof data?.[k] === "string" && data[k]) return { key: `${planKey(data)}:${k}`, text: data[k] };
  }
  return null;
}

function flattenQuery(messages) {
  const parts = [];
  for (const m of messages || []) {
    let content = "";
    if (typeof m.content === "string") content = m.content;
    else if (Array.isArray(m.content)) content = m.content.map((p) => typeof p === "string" ? p : String(p?.text ?? "")).join("");
    if (m.role === "system") parts.push(`[System]\n${content}`);
    else if (m.role === "assistant") parts.push(`[Assistant]\n${content}`);
    else parts.push(content);
  }
  return JSON.stringify([{ type: "text", data: { content: parts.join("\n\n") } }]);
}

export class TraeExecutor extends BaseExecutor {
  constructor() { super("trae", PROVIDERS["trae"]); }
  base() { return (this.config.baseUrl || "https://core-normal.trae.ai/api/remote/v1").replace(/\/$/, ""); }
  buildHeaders(credentials) {
    const psd = credentials?.providerSpecificData || {};
    return {
      Authorization: `Cloud-IDE-JWT ${credentials?.accessToken || ""}`,
      "Content-Type": "application/json",
      "X-Trae-Client-Type": "web",
      "X-Preferenced-Language": psd.appLanguage || "en",
      "x-user-region": psd.userRegion || "US",
      Referer: "https://solo.trae.ai/",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
    };
  }
  resolveMode(model) {
    const m = String(model || "").trim().toLowerCase();
    if (m === "work" || m === "auto-work" || m === "solo-work") return { mode: "work", strategy: "auto", modelName: "" };
    const auto = !m || m === "auto";
    return { mode: "code", strategy: auto ? "auto" : "manual", modelName: auto ? "" : model };
  }
  commonParams(psd, mode, sessionId) {
    const cp = {
      language: "en-us", app_language: psd.appLanguage || "en", quality: "stable",
      app_version: psd.appVersion || "1.0.0.1229", web_id: psd.webId || "", user_identity: psd.userIdentity || "Free",
      is_freshman: "0", biz_user_id: psd.bizUserId || "", user_unique_id: psd.userUniqueId || "",
      scope: psd.scope || "marscode-us", tenant: psd.tenant || "marscode", region: psd.region || "US-East",
      aiRegion: psd.aiRegion || psd.region || "US-East", is_privacy_mode: 0, privacy_mode: "off", solo_chat_mode: mode,
    };
    if (sessionId) cp.biz_session_id = sessionId;
    return JSON.stringify(cp);
  }
  async createSession(headers, query, model, psd, signal, proxyOptions) {
    const { mode, strategy, modelName } = this.resolveMode(model);
    const body = {
      mode, environment_id: "default",
      initial_message: { chat_session_id: "", content: [], query, model_name: modelName, agent_type: "solo_agent_remote", model_selection_strategy: strategy, common_params: this.commonParams(psd, mode) },
      env: "remote", auto_create_project: false, origin: "web",
    };
    const res = await proxyAwareFetch(`${this.base()}/chat_sessions`, { method: "POST", headers, body: JSON.stringify(body), signal: signal || undefined }, proxyOptions || null);
    const text = await res.text();
    if (!res.ok) throw new Error(`[${res.status}] ${text}`);
    const json = JSON.parse(text);
    if (json?.code !== 0) throw new Error(`Trae create_session: ${JSON.stringify(json)}`);
    return { sessionId: json.data.chat_session_id, messageId: json.data.message_id };
  }
  async streamEvents(headers, sessionId, replyTo, onEvent, signal, proxyOptions) {
    const url = `${this.base()}/chat_sessions/${sessionId}/events?reply_to_message_id=${encodeURIComponent(replyTo)}`;
    const eventHeaders = { ...headers, Accept: "text/event-stream", "Cache-Control": "no-cache", "Accept-Encoding": "identity" };
    delete eventHeaders["Content-Type"];
    const ctrl = new AbortController();
    if (signal?.aborted) ctrl.abort(signal.reason);
    const timer = setTimeout(() => ctrl.abort(new Error("trae stream timeout")), STREAM_TIMEOUT_MS);
    const onAbort = () => ctrl.abort(signal?.reason);
    if (signal) signal.addEventListener("abort", onAbort, { once: true });
    let reader = null;
    let sawDone = false;
    const wrappedOnEvent = (ev, data) => {
      if (ev === "done") sawDone = true;
      const detail = ev === "plan_item" || ev === "error"
        ? ` preview=${(() => { try { return JSON.stringify(data).slice(0, 300); } catch { return String(data).slice(0, 300); } })()}`
        : "";
      dbg("TRAE", `ev=${ev} keys=[${data && typeof data === "object" ? Object.keys(data).join(",") : typeof data}]${detail}`);
      return onEvent(ev, data);
    };
    try {
      let res = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          res = await proxyAwareFetch(url, { method: "GET", headers: eventHeaders, signal: ctrl.signal }, proxyOptions || null);
          if (!res.ok || !res.body) throw new Error(`[${res.status}] events stream failed`);
          break;
        } catch (err) {
          if (signal?.aborted || ctrl.signal.aborted || err?.name === "AbortError") throw err;
          const code = err?.code || err?.cause?.code || "";
          const msg = err?.message || "";
          const retryable = code.startsWith("UND_ERR") || code === "ECONNRESET" || code === "ETIMEDOUT" || msg.includes("fetch failed") || msg.includes("Connect Timeout");
          if (!retryable || attempt === 2) throw err;
          dbg("TRAE", `retry GET ${attempt + 1}/2 code=${code} msg=${msg.slice(0, 80)}`);
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        }
      }
      reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = ""; let ev = null;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).replace(/\r$/, ""); buf = buf.slice(nl + 1);
          if (line.startsWith("event:")) ev = line.slice(6).trim();
          else if (line.startsWith("data:")) {
            let data; try { data = JSON.parse(line.slice(5).trim()); } catch { data = { _raw: line.slice(5).trim() }; }
            if (wrappedOnEvent(ev, data)) { await reader.cancel().catch(() => {}); return { sawDone }; }
          } else if (line === "") ev = null;
        }
      }
      buf += decoder.decode();
      if (buf) {
        for (const line of buf.split("\n")) {
          const trimmed = line.replace(/\r$/, "");
          if (trimmed.startsWith("event:")) ev = trimmed.slice(6).trim();
          else if (trimmed.startsWith("data:")) {
            let data; try { data = JSON.parse(trimmed.slice(5).trim()); } catch { data = { _raw: trimmed.slice(5).trim() }; }
            if (wrappedOnEvent(ev, data)) return { sawDone };
          }
        }
      }
      // A clean EOF without a `done` event is normal for Trae once the `finish` tool call has
      // been delivered — report it and let the caller decide (it only matters if no text arrived).
      if (!sawDone) dbg("TRAE", "events stream EOF without done event");
      return { sawDone };
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", onAbort);
      if (reader) reader.cancel().catch(() => {});
    }
  }
  async execute({ model, body, stream, credentials, signal, proxyOptions }) {
    const headers = this.buildHeaders(credentials);
    const psd = credentials?.providerSpecificData || {};
    const query = flattenQuery(body?.messages || []);
    const responseId = `chatcmpl-trae-${Date.now()}`; const created = Math.floor(Date.now() / 1000);
    const errResponse = (status, message) => new Response(JSON.stringify({ error: { message: String(message).slice(0,500), type: "api_error", code: "" } }), { status, headers: { "Content-Type": "application/json" } });
    let session;
    try { session = await this.createSession(headers, query, model, psd, signal, proxyOptions); } catch (err) { return { response: errResponse(502, err instanceof Error ? err.message : String(err)), url: this.base(), headers, transformedBody: body }; }
    const textAcc = makeAccumulator();
    const reasoningAcc = makeAccumulator();
    let usage = null; let errorEvent = null;
    const renderNewText = (data) => {
      const hit = pickPlanText(data);
      return hit ? textAcc.push(hit.key, hit.text) : "";
    };
    const renderNewReasoning = (data) => {
      const hit = pickPlanReasoning(data);
      return hit ? reasoningAcc.push(hit.key, hit.text) : "";
    };
    if (stream !== false) {
      const enc = new TextEncoder();
      const sse = new ReadableStream({
        start: async (controller) => {
          const emit = (obj) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
          try {
            emit({ id: responseId, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }] });
            const status = await this.streamEvents(headers, session.sessionId, session.messageId, (ev, data) => {
              if (ev === "error") { errorEvent = data; return true; }
              if (ev === "token_usage") usage = data;
              if (ev === "plan_item") {
                const reasoning = renderNewReasoning(data);
                if (reasoning) emit({ id: responseId, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta: { reasoning_content: reasoning }, finish_reason: null }] });
                const piece = renderNewText(data); if (piece) emit({ id: responseId, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta: { content: piece }, finish_reason: null }] });
              }
              return ev === "done";
            }, signal, proxyOptions);
            if (errorEvent) {
              const content = `[trae error ${errorEvent.code || ""}: ${errorEvent.message || JSON.stringify(errorEvent).slice(0,500)}]`;
              dbg("TRAE", `upstream errorEvent code=${errorEvent.code} msg=${errorEvent.message}`);
              emit({ id: responseId, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta: { content }, finish_reason: null }] });
            } else if (textAcc.emittedLength() === 0) {
              // No answer text at all — say so rather than returning a silently empty turn.
              const why = status?.sawDone ? "no answer text in plan_item events" : "stream ended before done event";
              dbg("TRAE", `empty stream ${why} reasoningChars=${reasoningAcc.emittedLength()} usage=${JSON.stringify(usage)}`);
              const hadReasoning = reasoningAcc.emittedLength() > 0 ? ", only reasoning was returned" : "";
              emit({ id: responseId, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta: { content: `[trae: empty response — ${why}${hadReasoning}]` }, finish_reason: null }] });
            }
            emit({ id: responseId, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] });
            if (usage) emit({ id: responseId, object: "chat.completion.chunk", created, model, choices: [], usage: { prompt_tokens: usage.prompt_tokens || 0, completion_tokens: usage.completion_tokens || 0, total_tokens: usage.total_tokens || 0 } });
            controller.enqueue(enc.encode("data: [DONE]\n\n")); controller.close();
          } catch (err) {
            const msg = stringifyTraeStreamError(err);
            dbg("TRAE", `stream catch msg=${msg}`);
            try { controller.enqueue(enc.encode(`data: ${JSON.stringify({ id: responseId, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta: { content: `[trae stream error: ${msg}]` }, finish_reason: null }] })}\n\n`)); } catch {}
            try { controller.enqueue(enc.encode(`data: ${JSON.stringify({ id: responseId, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\n`)); } catch {}
            try { controller.enqueue(enc.encode("data: [DONE]\n\n")); controller.close(); } catch { try { controller.error(err); } catch {} }
          }
        },
      });
      return { response: new Response(sse, { status: 200, headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } }), url: this.base(), headers, transformedBody: body };
    }
    let status = null;
    try {
      status = await this.streamEvents(headers, session.sessionId, session.messageId, (ev, data) => {
        if (ev === "error") { errorEvent = data; return true; }
        if (ev === "token_usage") usage = data;
        if (ev === "plan_item") { renderNewReasoning(data); renderNewText(data); }
        return ev === "done";
      }, signal, proxyOptions);
    } catch (err) { return { response: errResponse(502, stringifyTraeStreamError(err)), url: this.base(), headers, transformedBody: body }; }
    if (errorEvent) return { response: errResponse(502, `trae ${errorEvent.code}: ${errorEvent.message}`), url: this.base(), headers, transformedBody: body };
    const content = textAcc.total();
    if (!content) {
      const why = status?.sawDone ? "no answer text in plan_item events" : "stream ended before done event";
      return { response: errResponse(502, `Trae returned empty content (${why})`), url: this.base(), headers, transformedBody: body };
    }
    const out = { id: responseId, object: "chat.completion", created, model, choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }] };
    if (usage) out.usage = { prompt_tokens: usage.prompt_tokens || 0, completion_tokens: usage.completion_tokens || 0, total_tokens: usage.total_tokens || 0 };
    return { response: new Response(JSON.stringify(out), { status: 200, headers: { "Content-Type": "application/json" } }), url: this.base(), headers, transformedBody: body };
  }
  async refreshCredentials(credentials) {
    const psd = credentials?.providerSpecificData || {};
    const refreshToken = credentials?.refreshToken; if (!refreshToken) return null;
    const host = (psd.host || "https://api-us-east.trae.ai").replace(/\/$/, "");
    const url = `${host}/cloudide/api/v3/trae/oauth/ExchangeToken`;
    const body = { ClientID: psd.clientId || "", RefreshToken: refreshToken, ClientSecret: "-", UserID: "" };
    const res = await proxyAwareFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const text = await res.text(); if (!res.ok) throw new Error(`Trae ExchangeToken HTTP ${res.status}: ${text.slice(0,200)}`);
    let parsed; try { parsed = JSON.parse(text); } catch { throw new Error("Trae ExchangeToken: response was not JSON"); }
    if (parsed?.ResponseMetadata?.Error?.Code) throw new Error(`Trae ExchangeToken error: ${parsed.ResponseMetadata.Error.Code}`);
    if (!parsed?.Result?.Token) throw new Error("Trae ExchangeToken: response missing Result.Token");
    return { accessToken: parsed.Result.Token, refreshToken: parsed.Result.RefreshToken || refreshToken, expiresAt: parsed.Result.TokenExpireAt ? new Date(Number(parsed.Result.TokenExpireAt)).toISOString() : undefined };
  }
}
export default TraeExecutor;
