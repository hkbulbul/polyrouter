// In-memory office-mode counters. Dependency-free so the usage repo can import
// it without a cycle. State lives on `global` so every Next.js module instance
// in the process shares one copy.
//
// - Request-rate counters use fixed windows (minute / hour / local day). They
//   reset on process restart, which is an accepted tradeoff for a single
//   server process.
// - Token/cost totals are computed from usageHistory and cached briefly here;
//   saveRequestUsage invalidates a user's entries as soon as new usage lands.
// - In-flight counts back the max-concurrent limit.

if (!global._officeState) {
  global._officeState = {
    usageTotals: new Map(), // `${userId}|${sinceIso}` → { value, ts }
    rates: new Map(), // userId → { minuteKey, minute, hourKey, hour, dayKey, day }
    inFlight: new Map(), // userId → count
  };
}

const state = global._officeState;
const USAGE_TTL_MS = 10_000;
const LEASE_MAX_MS = 15 * 60 * 1000;

export function localDayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// ─── Usage totals cache ──────────────────────────────────────────────────

export async function getCachedUsage(userId, sinceIso, loader) {
  const key = `${userId}|${sinceIso}`;
  const hit = state.usageTotals.get(key);
  if (hit && Date.now() - hit.ts < USAGE_TTL_MS) return hit.value;
  const value = await loader();
  state.usageTotals.set(key, { value, ts: Date.now() });
  return value;
}

export function invalidateOfficeUsage(userId) {
  if (!userId) return;
  const prefix = `${userId}|`;
  for (const key of state.usageTotals.keys()) {
    if (key.startsWith(prefix)) state.usageTotals.delete(key);
  }
}

// ─── Request-rate counters ───────────────────────────────────────────────

function currentRate(userId, now) {
  const minuteKey = Math.floor(now.getTime() / 60_000);
  const hourKey = Math.floor(now.getTime() / 3_600_000);
  const dayKey = localDayKey(now);
  let r = state.rates.get(userId);
  if (!r) {
    r = { minuteKey, minute: 0, hourKey, hour: 0, dayKey, day: 0 };
    state.rates.set(userId, r);
  }
  if (r.minuteKey !== minuteKey) { r.minuteKey = minuteKey; r.minute = 0; }
  if (r.hourKey !== hourKey) { r.hourKey = hourKey; r.hour = 0; }
  if (r.dayKey !== dayKey) { r.dayKey = dayKey; r.day = 0; }
  return r;
}

export function getRequestCounts(userId, now = new Date()) {
  const r = currentRate(userId, now);
  return { minute: r.minute, hour: r.hour, day: r.day };
}

export function recordRequest(userId, now = new Date()) {
  const r = currentRate(userId, now);
  r.minute += 1;
  r.hour += 1;
  r.day += 1;
}

// ─── Concurrency leases ──────────────────────────────────────────────────

export function getInFlight(userId) {
  return state.inFlight.get(userId) || 0;
}

// Returns an idempotent release(). The lease also self-releases after
// LEASE_MAX_MS so a response stream that never finishes or cancels cannot
// pin a user at their concurrency cap forever.
export function acquireLease(userId) {
  state.inFlight.set(userId, getInFlight(userId) + 1);
  let released = false;
  const timer = setTimeout(() => release(), LEASE_MAX_MS);
  timer.unref?.();
  function release() {
    if (released) return;
    released = true;
    clearTimeout(timer);
    const next = getInFlight(userId) - 1;
    if (next > 0) state.inFlight.set(userId, next);
    else state.inFlight.delete(userId);
  }
  return release;
}

// Test hook.
export function __resetOfficeState() {
  state.usageTotals.clear();
  state.rates.clear();
  state.inFlight.clear();
}
