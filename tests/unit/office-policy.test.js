// Office mode: pure policy rules (no DB).
import { describe, it, expect } from "vitest";
import {
  normalizeLimits,
  matchesModelPattern,
  isModelAllowed,
  isWithinAllowedHours,
  evaluatePolicy,
  describeLimitStatus,
  describeRestrictions,
  OFFICE_KINDS,
} from "../../src/lib/office/policy.js";
import { clampOutputTokens } from "../../src/lib/office/gate.js";

const base = (overrides = {}) => normalizeLimits(overrides);
const at = (y, m, d, hh, mm) => new Date(y, m - 1, d, hh, mm);

describe("normalizeLimits", () => {
  it("treats empty / zero / negative / garbage numeric limits as unlimited", () => {
    const l = normalizeLimits({ requestsPerMinute: "", tokensPerDay: 0, costPerDay: -5, maxConcurrent: "abc" });
    expect(l.requestsPerMinute).toBeNull();
    expect(l.tokensPerDay).toBeNull();
    expect(l.costPerDay).toBeNull();
    expect(l.maxConcurrent).toBeNull();
  });

  it("floors integer limits and keeps cents on money limits", () => {
    const l = normalizeLimits({ requestsPerMinute: "10.9", costPerMonth: "12.345" });
    expect(l.requestsPerMinute).toBe(10);
    expect(l.costPerMonth).toBe(12.345);
  });

  it("parses model patterns from comma / newline strings and dedupes", () => {
    const l = normalizeLimits({ allowedModels: "cc/*, gpt-4o\n cc/* ", blockedModels: ["", "  *opus* "] });
    expect(l.allowedModels).toEqual(["cc/*", "gpt-4o"]);
    expect(l.blockedModels).toEqual(["*opus*"]);
  });

  it("allowedKinds: missing or all kinds → null (all), empty array → none, invalid dropped", () => {
    expect(normalizeLimits({}).allowedKinds).toBeNull();
    expect(normalizeLimits({ allowedKinds: [...OFFICE_KINDS] }).allowedKinds).toBeNull();
    expect(normalizeLimits({ allowedKinds: [] }).allowedKinds).toEqual([]);
    expect(normalizeLimits({ allowedKinds: ["chat", "bogus", "chat"] }).allowedKinds).toEqual(["chat"]);
  });

  it("validates allowed hours and drops invalid windows", () => {
    expect(normalizeLimits({ allowedHours: { start: "09:00", end: "18:00", days: [5, 1, 1, 9] } }).allowedHours)
      .toEqual({ start: "09:00", end: "18:00", days: [1, 5] });
    expect(normalizeLimits({ allowedHours: { start: "9:00", end: "18:00" } }).allowedHours).toBeNull();
    expect(normalizeLimits({ allowedHours: { start: "09:00", end: "09:00" } }).allowedHours).toBeNull();
    expect(normalizeLimits({ allowedHours: { start: "09:00", end: "18:00", days: [] } }).allowedHours).toBeNull();
  });

  it("defaults onLimit to block and rejects unknown values", () => {
    expect(normalizeLimits({}).onLimit).toBe("block");
    expect(normalizeLimits({ onLimit: "explode" }).onLimit).toBe("block");
    expect(normalizeLimits({ onLimit: "fallback", fallbackModel: " cc/haiku " }).fallbackModel).toBe("cc/haiku");
  });
});

describe("model patterns", () => {
  it("matches globs case-insensitively, including across slashes", () => {
    expect(matchesModelPattern("cc/claude-sonnet-4", "cc/*")).toBe(true);
    expect(matchesModelPattern("CC/Claude-Opus-4", "*opus*")).toBe(true);
    expect(matchesModelPattern("gpt-4o-mini", "gpt-4o")).toBe(false);
    expect(matchesModelPattern("gpt-4o", "gpt-4o")).toBe(true);
  });

  it("escapes regex metacharacters in patterns", () => {
    expect(matchesModelPattern("gpt-4o", "gpt.4o")).toBe(false);
    expect(matchesModelPattern("a+b", "a+b")).toBe(true);
  });

  it("block list wins over allow list; empty allow list allows everything", () => {
    const l = base({ allowedModels: ["cc/*"], blockedModels: ["*opus*"] });
    expect(isModelAllowed("cc/claude-sonnet-4", l)).toBe(true);
    expect(isModelAllowed("cc/claude-opus-4", l)).toBe(false);
    expect(isModelAllowed("openai/gpt-4o", l)).toBe(false);
    expect(isModelAllowed("anything", base())).toBe(true);
  });
});

describe("allowed hours", () => {
  it("same-day window respects days and the end boundary", () => {
    const hours = { start: "09:00", end: "18:00", days: [1, 2, 3, 4, 5] };
    expect(isWithinAllowedHours(hours, at(2026, 10, 5, 9, 0))).toBe(true); // Monday 09:00
    expect(isWithinAllowedHours(hours, at(2026, 10, 5, 18, 0))).toBe(false); // end is exclusive
    expect(isWithinAllowedHours(hours, at(2026, 10, 4, 12, 0))).toBe(false); // Sunday
  });

  it("overnight window applies the start day to the after-midnight part", () => {
    const hours = { start: "22:00", end: "06:00", days: [5] }; // Friday night only
    expect(isWithinAllowedHours(hours, at(2026, 10, 9, 23, 0))).toBe(true); // Fri 23:00
    expect(isWithinAllowedHours(hours, at(2026, 10, 10, 3, 0))).toBe(true); // Sat 03:00 (Friday's window)
    expect(isWithinAllowedHours(hours, at(2026, 10, 10, 23, 0))).toBe(false); // Sat 23:00
    expect(isWithinAllowedHours(hours, at(2026, 10, 9, 12, 0))).toBe(false);
  });
});

describe("evaluatePolicy", () => {
  const usage0 = { day: { tokens: 0, cost: 0 }, month: { tokens: 0, cost: 0 } };
  const run = (limits, input = {}) => evaluatePolicy(base(limits), { kind: "chat", model: "cc/sonnet", usage: usage0, ...input });

  it("allows everything with no limits", () => {
    expect(run({})).toEqual({ allowed: true });
  });

  it("denies disallowed kinds with 403", () => {
    const r = run({ allowedKinds: ["chat"] }, { kind: "image" });
    expect(r).toMatchObject({ allowed: false, status: 403, code: "office_kind_not_allowed" });
    expect(run({ allowedKinds: [] }, { kind: "chat" }).allowed).toBe(false);
  });

  it("denies blocked models with 403", () => {
    expect(run({ blockedModels: ["cc/*"] })).toMatchObject({ allowed: false, status: 403, code: "office_model_not_allowed" });
  });

  it("enforces request rate windows and concurrency with 429", () => {
    expect(run({ requestsPerMinute: 2 }, { counts: { minute: 2 } })).toMatchObject({ status: 429, code: "office_rate_limit" });
    expect(run({ requestsPerMinute: 2 }, { counts: { minute: 1 } }).allowed).toBe(true);
    expect(run({ requestsPerDay: 5 }, { counts: { day: 5 } })).toMatchObject({ status: 429 });
    expect(run({ maxConcurrent: 1 }, { inFlight: 1 })).toMatchObject({ status: 429, code: "office_concurrency_limit" });
  });

  it("rejects oversized input with 413", () => {
    expect(run({ maxInputTokens: 100 }, { inputTokens: 101 })).toMatchObject({ status: 413, code: "office_input_too_large" });
  });

  it("blocks when a token or cost budget is spent", () => {
    const usage = { day: { tokens: 1000, cost: 1 }, month: { tokens: 5000, cost: 9 } };
    expect(run({ tokensPerDay: 1000 }, { usage })).toMatchObject({ status: 429, code: "office_budget_exceeded" });
    expect(run({ costPerMonth: 9 }, { usage })).toMatchObject({ status: 429, code: "office_budget_exceeded" });
    expect(run({ costPerMonth: 10 }, { usage }).allowed).toBe(true);
  });

  it("falls back to the cheaper model only for chat, only when allowed, and never to itself", () => {
    const usage = { day: { tokens: 0, cost: 5 }, month: { tokens: 0, cost: 5 } };
    const limits = { costPerDay: 5, onLimit: "fallback", fallbackModel: "cc/haiku" };
    expect(run(limits, { usage })).toMatchObject({ allowed: true, fallbackModel: "cc/haiku" });
    expect(run(limits, { usage, kind: "image" })).toMatchObject({ allowed: false, code: "office_budget_exceeded" });
    expect(run(limits, { usage, model: "cc/haiku" })).toMatchObject({ allowed: false });
    expect(run({ ...limits, blockedModels: ["cc/haiku"] }, { usage, model: "cc/sonnet" })).toMatchObject({ allowed: false });
  });
});

describe("describeLimitStatus", () => {
  it("only lists configured limits and caps percent at 100", () => {
    const rows = describeLimitStatus(base({ tokensPerDay: 100, costPerMonth: 10 }), {
      usage: { day: { tokens: 250, cost: 0 }, month: { tokens: 0, cost: 2.5 } },
    });
    expect(rows.map((r) => r.key)).toEqual(["tokensPerDay", "costPerMonth"]);
    expect(rows[0].percent).toBe(100);
    expect(rows[1].percent).toBe(25);
  });
});

describe("describeRestrictions", () => {
  it("summarizes non-usage rules and is empty for an unrestricted policy", () => {
    expect(describeRestrictions(base())).toEqual([]);
    expect(describeRestrictions(null)).toEqual([]);
    const lines = describeRestrictions(base({
      allowedModels: "openai/*",
      allowedKinds: ["chat"],
      maxOutputTokens: 256,
      onLimit: "fallback",
      fallbackModel: "cc/haiku",
    }));
    expect(lines).toEqual([
      "Allowed models: openai/*",
      "Allowed request types: Chat / code completion",
      "Max output 256 tokens per request",
      "When a budget runs out, chat switches to cc/haiku",
    ]);
    expect(describeRestrictions(base({ allowedKinds: [] }))).toEqual(["Allowed request types: none"]);
  });
});

describe("clampOutputTokens", () => {
  it("clamps only above the cap and adds the canonical field when missing", () => {
    const a = { max_tokens: 50 };
    expect(clampOutputTokens(a, "claude", 100)).toBe(false);
    expect(a.max_tokens).toBe(50);

    const b = { max_tokens: 500 };
    expect(clampOutputTokens(b, "claude", 100)).toBe(true);
    expect(b.max_tokens).toBe(100);

    const c = {};
    expect(clampOutputTokens(c, "responses", 100)).toBe(true);
    expect(c.max_output_tokens).toBe(100);

    const d = {};
    expect(clampOutputTokens(d, "gemini", 100)).toBe(true);
    expect(d.generationConfig.maxOutputTokens).toBe(100);
  });

  it("openai: clamps max_completion_tokens without inventing max_tokens", () => {
    const body = { max_completion_tokens: 900 };
    expect(clampOutputTokens(body, "openai", 100)).toBe(true);
    expect(body).toEqual({ max_completion_tokens: 100 });
    const empty = {};
    clampOutputTokens(empty, "openai", 100);
    expect(empty).toEqual({ max_tokens: 100 });
  });
});
