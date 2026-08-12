import { randomBytes } from "crypto";

const STORE_KEY = "__polyrouterChatGptWebTurnBroker";
const DEFAULT_TURN_TTL_MS = 10 * 60 * 1000;
const TOOL_BATCH_DELAY_MS = 15;

function opaqueId(prefix) {
  return `${prefix}_${randomBytes(24).toString("base64url")}`;
}

function normalizeTool(tool) {
  if (!tool || typeof tool !== "object" || Array.isArray(tool)) return null;
  const fn = tool.function && typeof tool.function === "object" ? tool.function : tool;
  const name = typeof fn.name === "string" ? fn.name.trim() : "";
  if (!name) return null;
  return {
    name,
    description: typeof fn.description === "string" ? fn.description : "",
    freeform: tool._polyrouterOriginalType === "custom" || tool.type === "custom",
    parameters:
      fn.parameters && typeof fn.parameters === "object" && !Array.isArray(fn.parameters)
        ? fn.parameters
        : { type: "object", properties: {} },
  };
}

function getStore() {
  if (!globalThis[STORE_KEY]) {
    const store = {
      turns: new Map(),
      bindings: new Map(),
      callToToken: new Map(),
    };
    const cleanup = setInterval(() => {
      const now = Date.now();
      for (const [token, turn] of store.turns) {
        if (turn.expiresAt <= now) revokeChatGptWebTurn(token, "ChatGPT Web MCP turn expired");
      }
    }, 30_000);
    cleanup.unref?.();
    store.cleanup = cleanup;
    globalThis[STORE_KEY] = store;
  }
  return globalThis[STORE_KEY];
}

function rejectWaiter(waiter, error) {
  if (!waiter) return;
  if (waiter.signal && waiter.onAbort) {
    waiter.signal.removeEventListener("abort", waiter.onAbort);
  }
  waiter.reject(error);
}

function wakeToolWaiter(turn) {
  if (!turn.waiter || turn.queuedCallIds.length === 0) return;
  const waiter = turn.waiter;
  turn.waiter = null;
  if (waiter.signal && waiter.onAbort) {
    waiter.signal.removeEventListener("abort", waiter.onAbort);
  }
  const requests = turn.queuedCallIds
    .splice(0)
    .map((callId) => turn.pendingCalls.get(callId)?.request)
    .filter(Boolean);
  waiter.resolve(requests);
}

function scheduleToolWaiter(turn) {
  if (!turn.waiter || turn.queuedCallIds.length === 0 || turn.batchTimer) return;
  turn.batchTimer = setTimeout(() => {
    turn.batchTimer = null;
    wakeToolWaiter(turn);
  }, TOOL_BATCH_DELAY_MS);
  turn.batchTimer.unref?.();
}

export function registerChatGptWebTurn({ tools, sessionId, connectionId, ttlMs } = {}) {
  const normalizedTools = (Array.isArray(tools) ? tools : []).map(normalizeTool).filter(Boolean);
  if (normalizedTools.length === 0) {
    throw new Error("ChatGPT Web MCP mode requires at least one callable client tool");
  }
  const lifetime = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : DEFAULT_TURN_TTL_MS;
  const token = opaqueId("turn");
  const turn = {
    token,
    bindingId: null,
    sessionId: sessionId || null,
    connectionId: connectionId || null,
    tools: normalizedTools,
    toolMap: new Map(normalizedTools.map((tool) => [tool.name, tool])),
    queuedCallIds: [],
    pendingCalls: new Map(),
    waiter: null,
    batchTimer: null,
    runtime: null,
    expiresAt: Date.now() + lifetime,
  };
  getStore().turns.set(token, turn);
  return turn;
}

export function bindChatGptWebTurn(token) {
  const turn = getChatGptWebTurn(token);
  if (!turn.bindingId) {
    turn.bindingId = opaqueId("binding");
    getStore().bindings.set(turn.bindingId, token);
  }
  return {
    bindingId: turn.bindingId,
    toolCount: turn.tools.length,
    validUntil: "outer_turn_end",
  };
}

export function getChatGptWebTurn(token) {
  const turn = getStore().turns.get(token);
  if (!turn || turn.expiresAt <= Date.now()) {
    if (turn) revokeChatGptWebTurn(token, "ChatGPT Web MCP turn expired");
    throw new Error("ChatGPT Web MCP turn token is invalid or expired");
  }
  return turn;
}

export function getChatGptWebTurnByBinding(bindingId) {
  const token = getStore().bindings.get(bindingId);
  if (!token) throw new Error("ChatGPT Web MCP binding is invalid or expired");
  return getChatGptWebTurn(token);
}

export function listChatGptWebTurnTools(bindingId, query = "", includeSchema = true) {
  const turn = getChatGptWebTurnByBinding(bindingId);
  const needle = String(query || "").trim().toLowerCase();
  return turn.tools
    .filter((tool) => !needle || `${tool.name} ${tool.description}`.toLowerCase().includes(needle))
    .map((tool) => ({
      name: tool.name,
      description: tool.description,
      kind: tool.freeform ? "custom" : "function",
      ...(includeSchema ? { parameters: tool.parameters } : {}),
    }));
}

export function invokeChatGptWebTurnTool(bindingId, toolName, args = {}) {
  const turn = getChatGptWebTurnByBinding(bindingId);
  const name = String(toolName || "").trim();
  if (!turn.toolMap.has(name)) throw new Error(`Client tool is not available in this turn: ${name}`);
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw new Error("Tool arguments must be a JSON object");
  }

  const callId = opaqueId("call_cgw");
  const tool = turn.toolMap.get(name);
  const request = {
    callId,
    name,
    arguments: args,
    freeform: tool.freeform,
    ...(tool.freeform ? { input: typeof args.input === "string" ? args.input : JSON.stringify(args) } : {}),
  };
  return new Promise((resolve, reject) => {
    turn.pendingCalls.set(callId, { request, resolve, reject, delivered: false });
    turn.queuedCallIds.push(callId);
    getStore().callToToken.set(callId, turn.token);
    scheduleToolWaiter(turn);
  });
}

export function waitForChatGptWebToolBatch(token, signal) {
  const turn = getChatGptWebTurn(token);
  if (turn.queuedCallIds.length > 0) {
    return Promise.resolve(
      turn.queuedCallIds
        .splice(0)
        .map((callId) => turn.pendingCalls.get(callId)?.request)
        .filter(Boolean),
    );
  }
  if (turn.waiter) throw new Error("A ChatGPT Web MCP tool waiter is already active for this turn");
  if (signal?.aborted) return Promise.reject(new DOMException("Tool wait aborted", "AbortError"));
  return new Promise((resolve, reject) => {
    const waiter = { resolve, reject, signal, onAbort: null };
    if (signal) {
      waiter.onAbort = () => {
        if (turn.waiter === waiter) turn.waiter = null;
        reject(new DOMException("Tool wait aborted", "AbortError"));
      };
      signal.addEventListener("abort", waiter.onAbort, { once: true });
    }
    turn.waiter = waiter;
  });
}

export function markChatGptWebToolBatchDelivered(token, requests) {
  const turn = getChatGptWebTurn(token);
  for (const request of requests) {
    const pending = turn.pendingCalls.get(request.callId);
    if (pending) pending.delivered = true;
  }
}

export function completeChatGptWebToolCall(callId, result) {
  const store = getStore();
  const token = store.callToToken.get(callId);
  if (!token) throw new Error(`ChatGPT Web MCP tool call is not pending: ${callId}`);
  const turn = getChatGptWebTurn(token);
  const pending = turn.pendingCalls.get(callId);
  if (!pending || !pending.delivered) {
    throw new Error(`ChatGPT Web MCP tool call was not delivered to the client: ${callId}`);
  }
  turn.pendingCalls.delete(callId);
  store.callToToken.delete(callId);
  pending.resolve(result);
  return turn;
}

export function findChatGptWebTurnByCallId(callId) {
  const token = getStore().callToToken.get(callId);
  return token ? getChatGptWebTurn(token) : null;
}

export function setChatGptWebTurnRuntime(token, runtime) {
  const turn = getChatGptWebTurn(token);
  turn.runtime = runtime;
  return turn;
}

export function revokeChatGptWebTurn(token, reason = "ChatGPT Web MCP turn ended") {
  const store = getStore();
  const turn = store.turns.get(token);
  if (!turn) return;
  store.turns.delete(token);
  if (turn.bindingId) store.bindings.delete(turn.bindingId);
  if (turn.batchTimer) clearTimeout(turn.batchTimer);
  turn.batchTimer = null;
  rejectWaiter(turn.waiter, new Error(reason));
  turn.waiter = null;
  for (const [callId, pending] of turn.pendingCalls) {
    store.callToToken.delete(callId);
    pending.reject(new Error(reason));
  }
  turn.pendingCalls.clear();
  turn.queuedCallIds = [];
}

export function resetChatGptWebBrokerForTests() {
  const store = getStore();
  for (const token of [...store.turns.keys()]) revokeChatGptWebTurn(token, "Test reset");
}
