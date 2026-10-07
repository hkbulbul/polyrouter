// Office-mode gateway gate. Wraps a /v1 route handler: requests made with an
// employee's API key are checked against that employee's effective policy
// before the handler runs. Owner/admin keys and keyless local requests pass
// straight through untouched.
import { resolveOfficeRequestContext, getUserUsageWindows } from "./context.js";
import { evaluatePolicy, estimateInputTokens, isModelAllowed } from "./policy.js";
import { getRequestCounts, recordRequest, getInFlight, acquireLease } from "./usageCache.js";

const ERROR_TYPES = {
  401: "authentication_error",
  403: "permission_error",
  413: "request_too_large",
  429: "rate_limit_error",
};

// Shape satisfies both OpenAI clients (error.message/type/code) and Anthropic
// clients (top-level type:"error" + error.type/message).
export function officeErrorResponse(status, code, message) {
  return new Response(
    JSON.stringify({ type: "error", error: { type: ERROR_TYPES[status] || "api_error", code, message } }),
    { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
  );
}

// Mirrors the key sources the dashboard guard accepts for /v1 traffic.
export function extractGatewayApiKey(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7).trim() || null;
  const xApiKey = request.headers.get("x-api-key");
  if (xApiKey) return xApiKey;
  const googKey = request.headers.get("x-goog-api-key");
  if (googKey) return googKey;
  try {
    return new URL(request.url).searchParams.get("key") || null;
  } catch {
    return null;
  }
}

async function readBodyForInspection(request) {
  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      return { form: await request.clone().formData(), body: null };
    }
    return { form: null, body: await request.clone().json() };
  } catch {
    // Malformed body: let the real handler produce its usual 400.
    return { form: null, body: null };
  }
}

function clampField(obj, field, max) {
  const cur = Number(obj[field]);
  if (Number.isFinite(cur) && cur > 0 && cur <= max) return false;
  obj[field] = max;
  return true;
}

// Returns true when the body was changed. Only fields the client already sent
// are clamped, plus the one canonical field for the format when none is sent
// (otherwise the upstream default could exceed the limit).
export function clampOutputTokens(body, format, max) {
  if (!body || typeof body !== "object" || !max) return false;
  switch (format) {
    case "claude":
      return clampField(body, "max_tokens", max);
    case "responses":
      return clampField(body, "max_output_tokens", max);
    case "gemini": {
      if (!body.generationConfig || typeof body.generationConfig !== "object") body.generationConfig = {};
      return clampField(body.generationConfig, "maxOutputTokens", max);
    }
    case "openai": {
      const hasCompletion = body.max_completion_tokens !== undefined;
      const hasMax = body.max_tokens !== undefined;
      let changed = false;
      if (hasCompletion) changed = clampField(body, "max_completion_tokens", max) || changed;
      if (hasMax || !hasCompletion) changed = clampField(body, "max_tokens", max) || changed;
      return changed;
    }
    default:
      return false;
  }
}

function rebuildJsonRequest(request, body) {
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  headers.set("content-type", "application/json");
  return new Request(request.url, {
    method: request.method,
    headers,
    body: JSON.stringify(body),
    signal: request.signal,
  });
}

// Release the concurrency lease when the response body finishes, errors, or
// the client disconnects (cancel).
export function releaseOnBodyEnd(response, release) {
  if (!response || !response.body) {
    release();
    return response;
  }
  const reader = response.body.getReader();
  const stream = new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          release();
          controller.close();
        } else {
          controller.enqueue(value);
        }
      } catch (error) {
        release();
        controller.error(error);
      }
    },
    cancel(reason) {
      release();
      return reader.cancel(reason);
    },
  });
  return new Response(stream, { status: response.status, statusText: response.statusText, headers: response.headers });
}

/**
 * @param {(request: Request, routeCtx?: any) => Promise<Response>} handler
 * @param {object} opts
 * @param {string} opts.kind one of OFFICE_KINDS
 * @param {"openai"|"claude"|"responses"|"gemini"|null} [opts.format] body format, for output-token clamping and model fallback
 * @param {boolean} [opts.parseBody=true] inspect the body for `model`
 * @param {(args:{request, routeCtx, body, form}) => Promise<string|null>|string|null} [opts.getModel]
 * @param {boolean} [opts.modelInBody=true] false when the model comes from the URL (fallback cannot rewrite it)
 */
export function withOfficeGate(handler, opts) {
  const { kind, format = null, parseBody = true, getModel = null, modelInBody = true } = opts;

  return async function officeGated(request, routeCtx) {
    let ctx;
    try {
      ctx = await resolveOfficeRequestContext(extractGatewayApiKey(request));
    } catch (error) {
      console.error("[office] gate context error:", error?.message || error);
      return officeErrorResponse(503, "office_gate_unavailable", "Office policy check failed; try again shortly.");
    }
    if (!ctx) return handler(request, routeCtx);
    if (ctx.error) return officeErrorResponse(ctx.error.status, ctx.error.code, ctx.error.message);

    const { user, policy } = ctx;
    const limits = policy.limits;

    const { body, form } = parseBody ? await readBodyForInspection(request) : { body: null, form: null };
    let model = getModel
      ? await getModel({ request, routeCtx, body, form })
      : (body?.model ?? form?.get?.("model") ?? null);
    model = typeof model === "string" && model.trim() ? model.trim() : null;

    const now = new Date();
    const usage = await getUserUsageWindows(user.id, now);

    // Synchronous from here to recordRequest/acquireLease: no await in between,
    // so concurrent requests cannot both pass the same rate/concurrency check.
    const decision = evaluatePolicy(limits, {
      kind,
      model,
      inputTokens: kind === "chat" ? estimateInputTokens(body) : 0,
      now,
      counts: getRequestCounts(user.id, now),
      inFlight: getInFlight(user.id),
      usage,
    });
    if (!decision.allowed) return officeErrorResponse(decision.status, decision.code, decision.message);

    const useFallback = Boolean(decision.fallbackModel);
    if (useFallback && (!modelInBody || !body)) {
      return officeErrorResponse(429, "office_budget_exceeded", `${decision.budgetExceeded} Contact your admin to raise it.`);
    }

    recordRequest(user.id, now);
    const release = limits.maxConcurrent ? acquireLease(user.id) : null;

    let outRequest = request;
    if (body && typeof body === "object" && !Array.isArray(body)) {
      const next = structuredClone(body);
      let changed = false;
      if (useFallback) {
        next.model = decision.fallbackModel;
        changed = true;
        console.log(`[office] ${user.email}: ${decision.budgetExceeded} Falling back ${model} → ${decision.fallbackModel}`);
      }
      if (limits.maxOutputTokens && format) changed = clampOutputTokens(next, format, limits.maxOutputTokens) || changed;
      if (changed) outRequest = rebuildJsonRequest(request, next);
    }

    let response;
    try {
      response = await handler(outRequest, routeCtx);
    } catch (error) {
      release?.();
      throw error;
    }
    return release ? releaseOnBodyEnd(response, release) : response;
  };
}

/**
 * Filter a /v1/models list for an employee key. Owner keys get the list
 * unchanged; an employee whose access is blocked gets an empty list.
 */
export async function filterModelsForRequest(request, models) {
  if (!request?.headers || !Array.isArray(models)) return models;
  let ctx;
  try {
    ctx = await resolveOfficeRequestContext(extractGatewayApiKey(request));
  } catch {
    return models;
  }
  if (!ctx) return models;
  if (ctx.error) return [];
  return models.filter((m) => isModelAllowed(m?.id, ctx.policy.limits));
}
