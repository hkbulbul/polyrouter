// Pure office-mode policy logic: limit normalization, model pattern matching,
// working-hours checks and the allow/deny decision. No DB or request access
// here so every rule is unit-testable.

export const OFFICE_KINDS = ["chat", "embeddings", "image", "audio", "video", "search", "fetch", "rerank"];

export const OFFICE_KIND_LABELS = {
  chat: "Chat / code completion",
  embeddings: "Embeddings",
  image: "Image generation",
  audio: "Speech (TTS / STT)",
  video: "Video generation",
  search: "Web search",
  fetch: "Web fetch",
  rerank: "Rerank",
};

// Numeric limits. A missing, empty, zero or negative value means "no limit".
export const NUMERIC_LIMITS = {
  requestsPerMinute: { label: "Requests / minute", integer: true },
  requestsPerHour: { label: "Requests / hour", integer: true },
  requestsPerDay: { label: "Requests / day", integer: true },
  tokensPerDay: { label: "Tokens / day", integer: true },
  tokensPerMonth: { label: "Tokens / month", integer: true },
  costPerDay: { label: "Cost / day (USD)", integer: false },
  costPerMonth: { label: "Cost / month (USD)", integer: false },
  maxConcurrent: { label: "Max concurrent requests", integer: true },
  maxInputTokens: { label: "Max input tokens / request (approx.)", integer: true },
  maxOutputTokens: { label: "Max output tokens / request", integer: true },
  maxKeys: { label: "Max API keys per employee", integer: true },
  keyTtlDays: { label: "API key lifetime (days)", integer: true },
};

const ON_LIMIT = new Set(["block", "fallback"]);
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function toLimitNumber(value, integer) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return integer ? Math.floor(n) : Math.round(n * 10000) / 10000;
}

function toPatternList(value) {
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[\n,]/) : [];
  const out = [];
  for (const item of list) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (trimmed && !out.includes(trimmed)) out.push(trimmed);
  }
  return out;
}

function toAllowedHours(value) {
  if (!value || typeof value !== "object") return null;
  const start = typeof value.start === "string" ? value.start.trim() : "";
  const end = typeof value.end === "string" ? value.end.trim() : "";
  if (!TIME_RE.test(start) || !TIME_RE.test(end) || start === end) return null;
  const days = Array.isArray(value.days)
    ? [...new Set(value.days.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b)
    : [0, 1, 2, 3, 4, 5, 6];
  if (!days.length) return null;
  return { start, end, days };
}

// Sanitize an admin-supplied limits object into the canonical shape.
export function normalizeLimits(input = {}) {
  const src = input && typeof input === "object" ? input : {};
  const limits = {};
  for (const [field, def] of Object.entries(NUMERIC_LIMITS)) {
    limits[field] = toLimitNumber(src[field], def.integer);
  }
  limits.allowedModels = toPatternList(src.allowedModels);
  limits.blockedModels = toPatternList(src.blockedModels);
  // null = every kind allowed; an array (possibly empty) is an explicit allow-list.
  if (Array.isArray(src.allowedKinds)) {
    const kinds = [...new Set(src.allowedKinds.filter((k) => OFFICE_KINDS.includes(k)))];
    limits.allowedKinds = kinds.length === OFFICE_KINDS.length ? null : kinds;
  } else {
    limits.allowedKinds = null;
  }
  limits.allowedHours = toAllowedHours(src.allowedHours);
  limits.onLimit = ON_LIMIT.has(src.onLimit) ? src.onLimit : "block";
  limits.fallbackModel = typeof src.fallbackModel === "string" ? src.fallbackModel.trim() : "";
  return limits;
}

// Case-insensitive glob: `*` matches any run of characters (including `/`).
export function matchesModelPattern(model, pattern) {
  if (typeof model !== "string" || typeof pattern !== "string") return false;
  const escaped = pattern.trim().toLowerCase().replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(model.trim().toLowerCase());
}

export function isModelAllowed(model, limits) {
  if (!model) return true;
  if ((limits.blockedModels || []).some((p) => matchesModelPattern(model, p))) return false;
  const allowed = limits.allowedModels || [];
  if (!allowed.length) return true;
  return allowed.some((p) => matchesModelPattern(model, p));
}

/**
 * Policy check for a request whose model name may route elsewhere (a combo's
 * members, an alias's target). Denied if the name or ANY target is blocked;
 * with an allow-list, allowed if the name itself is allowed or EVERY target is.
 * @param {string|null} model the name the client sent
 * @param {string[]} targets models it actually routes to (empty for a plain model)
 */
export function isModelRequestAllowed(model, targets, limits) {
  if (!model) return true;
  const all = [model, ...(targets || [])];
  if (all.some((m) => (limits.blockedModels || []).some((p) => matchesModelPattern(m, p)))) return false;
  const allowed = limits.allowedModels || [];
  if (!allowed.length) return true;
  if (allowed.some((p) => matchesModelPattern(model, p))) return true;
  return Boolean(targets?.length) && targets.every((t) => allowed.some((p) => matchesModelPattern(t, p)));
}

function minutesOf(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Server-local time. Supports overnight windows (e.g. 22:00 → 06:00); for an
// overnight window the day check applies to the day the window started.
export function isWithinAllowedHours(allowedHours, now = new Date()) {
  if (!allowedHours) return true;
  const start = minutesOf(allowedHours.start);
  const end = minutesOf(allowedHours.end);
  const cur = now.getHours() * 60 + now.getMinutes();
  const day = now.getDay();
  if (start < end) {
    return allowedHours.days.includes(day) && cur >= start && cur < end;
  }
  if (cur >= start) return allowedHours.days.includes(day);
  if (cur < end) return allowedHours.days.includes((day + 6) % 7);
  return false;
}

export function getWindowStarts(now = new Date()) {
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return { dayStartIso: dayStart.toISOString(), monthStartIso: monthStart.toISOString() };
}

export function estimateInputTokens(body) {
  if (!body || typeof body !== "object") return 0;
  try {
    return Math.ceil(JSON.stringify(body).length / 4);
  } catch {
    return 0;
  }
}

function deny(status, code, message) {
  return { allowed: false, status, code, message };
}

const fmtUsd = (n) => `$${Number(n || 0).toFixed(2)}`;

/**
 * Decide whether a request may proceed.
 * @param {object} limits normalized limits
 * @param {object} input { kind, model, modelTargets, inputTokens, now, counts:{minute,hour,day}, inFlight, usage:{day:{tokens,cost}, month:{tokens,cost}} }
 * @returns {{allowed:true, fallbackModel?:string, budgetExceeded?:string} | {allowed:false,status,code,message}}
 */
export function evaluatePolicy(limits, input) {
  const { kind, model, modelTargets = [], inputTokens = 0, now = new Date(), counts = {}, inFlight = 0, usage = {} } = input;

  if (Array.isArray(limits.allowedKinds) && !limits.allowedKinds.includes(kind)) {
    return deny(403, "office_kind_not_allowed", `Your office policy does not allow ${OFFICE_KIND_LABELS[kind] || kind} requests.`);
  }
  if (!isWithinAllowedHours(limits.allowedHours, now)) {
    const h = limits.allowedHours;
    return deny(403, "office_outside_hours", `AI access is only allowed ${h.start}–${h.end} on permitted days (server time).`);
  }
  if (model && !isModelRequestAllowed(model, modelTargets, limits)) {
    return deny(403, "office_model_not_allowed", `Model "${model}" is not allowed by your office policy.`);
  }
  if (limits.maxInputTokens && inputTokens > limits.maxInputTokens) {
    return deny(413, "office_input_too_large", `Request is about ${inputTokens} input tokens; your office limit is ${limits.maxInputTokens}.`);
  }

  if (limits.requestsPerMinute && (counts.minute || 0) >= limits.requestsPerMinute) {
    return deny(429, "office_rate_limit", `Rate limit reached: ${limits.requestsPerMinute} requests per minute.`);
  }
  if (limits.requestsPerHour && (counts.hour || 0) >= limits.requestsPerHour) {
    return deny(429, "office_rate_limit", `Rate limit reached: ${limits.requestsPerHour} requests per hour.`);
  }
  if (limits.requestsPerDay && (counts.day || 0) >= limits.requestsPerDay) {
    return deny(429, "office_rate_limit", `Daily request limit reached: ${limits.requestsPerDay} requests per day.`);
  }
  if (limits.maxConcurrent && inFlight >= limits.maxConcurrent) {
    return deny(429, "office_concurrency_limit", `Too many requests at once: limit is ${limits.maxConcurrent} concurrent.`);
  }

  const day = usage.day || { tokens: 0, cost: 0 };
  const month = usage.month || { tokens: 0, cost: 0 };
  let budgetExceeded = null;
  if (limits.tokensPerDay && day.tokens >= limits.tokensPerDay) budgetExceeded = `Daily token limit reached (${limits.tokensPerDay}).`;
  else if (limits.tokensPerMonth && month.tokens >= limits.tokensPerMonth) budgetExceeded = `Monthly token limit reached (${limits.tokensPerMonth}).`;
  else if (limits.costPerDay && day.cost >= limits.costPerDay) budgetExceeded = `Daily budget reached (${fmtUsd(limits.costPerDay)}).`;
  else if (limits.costPerMonth && month.cost >= limits.costPerMonth) budgetExceeded = `Monthly budget reached (${fmtUsd(limits.costPerMonth)}).`;

  if (budgetExceeded) {
    const fb = limits.fallbackModel;
    const canFallback = kind === "chat"
      && limits.onLimit === "fallback"
      && fb
      && model
      && fb.toLowerCase() !== String(model).toLowerCase()
      && isModelAllowed(fb, limits);
    if (canFallback) return { allowed: true, fallbackModel: fb, budgetExceeded };
    return deny(429, "office_budget_exceeded", `${budgetExceeded} Contact your admin to raise it.`);
  }

  return { allowed: true };
}

// Human-readable non-usage rules (model lists, request types, per-request caps…).
export function describeRestrictions(limits) {
  const l = limits || {};
  const out = [];
  if (l.allowedModels?.length) out.push(`Allowed models: ${l.allowedModels.join(", ")}`);
  if (l.blockedModels?.length) out.push(`Blocked models: ${l.blockedModels.join(", ")}`);
  if (Array.isArray(l.allowedKinds)) {
    out.push(`Allowed request types: ${l.allowedKinds.length ? l.allowedKinds.map((k) => OFFICE_KIND_LABELS[k] || k).join(", ") : "none"}`);
  }
  if (l.maxConcurrent) out.push(`At most ${l.maxConcurrent} requests at once`);
  if (l.maxInputTokens) out.push(`Max input ≈${l.maxInputTokens.toLocaleString()} tokens per request`);
  if (l.maxOutputTokens) out.push(`Max output ${l.maxOutputTokens.toLocaleString()} tokens per request`);
  if (l.allowedHours) out.push(`Allowed ${l.allowedHours.start}–${l.allowedHours.end} (server time)`);
  if (l.onLimit === "fallback" && l.fallbackModel) out.push(`When a budget runs out, chat switches to ${l.fallbackModel}`);
  if (l.keyTtlDays) out.push(`New API keys expire after ${l.keyTtlDays} days`);
  return out;
}

// Shape a policy-aware view of current usage for the portal / client.
export function describeLimitStatus(limits, { counts = {}, usage = {} } = {}) {
  const rows = [];
  const add = (key, label, used, limit, unit) => {
    if (!limit) return;
    rows.push({ key, label, used, limit, unit, percent: Math.min(100, Math.round((used / limit) * 100)) });
  };
  add("requestsPerMinute", "Requests this minute", counts.minute || 0, limits.requestsPerMinute, "requests");
  add("requestsPerHour", "Requests this hour", counts.hour || 0, limits.requestsPerHour, "requests");
  add("requestsPerDay", "Requests today", counts.day || 0, limits.requestsPerDay, "requests");
  add("tokensPerDay", "Tokens today", usage.day?.tokens || 0, limits.tokensPerDay, "tokens");
  add("tokensPerMonth", "Tokens this month", usage.month?.tokens || 0, limits.tokensPerMonth, "tokens");
  add("costPerDay", "Spend today", usage.day?.cost || 0, limits.costPerDay, "usd");
  add("costPerMonth", "Spend this month", usage.month?.cost || 0, limits.costPerMonth, "usd");
  return rows;
}
