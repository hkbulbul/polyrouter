import { describe, it, expect, vi } from "vitest";
import { calculateCostFromTokens, calculateCostBreakdownFromTokens } from "open-sse/providers/pricing.js";
import { canonicalizeUsage, extractUsage, mergeUsage } from "open-sse/utils/usageTracking.js";

vi.mock("@/lib/db/repos/pricingRepo.js", async () => {
  const { getPricingForModel } = await import("open-sse/providers/pricing.js");
  return { getPricingForModel: vi.fn(getPricingForModel) };
});
import { calculateRequestCost } from "@/lib/db/helpers/requestCost.js";

const pricing = { input: 3, output: 15, cached: 0.3, cache_creation: 3.75, reasoning: 15 };

describe("request-cost arithmetic", () => {
  it("returns input and output totals without rounding", () => {
    const result = calculateCostBreakdownFromTokens({ prompt_tokens: 330, completion_tokens: 50, cached_tokens: 200, cache_creation_input_tokens: 30 }, pricing);
    expect(result.inputCost).toBeCloseTo(0.0004725, 12);
    expect(result.outputCost).toBeCloseTo(0.00075, 12);
    expect(result.totalCost).toBe(result.inputCost + result.outputCost);
  });

  it("honors zero optional rates instead of falling back", () => {
    const result = calculateCostBreakdownFromTokens({ prompt_tokens: 330, completion_tokens: 50, cached_tokens: 200, cache_creation_input_tokens: 30, reasoning_tokens: 10 }, { ...pricing, cached: 0, reasoning: 0, cache_creation: 0 });
    expect(result.components).toEqual({ input: 0.0003, cached: 0, cacheCreation: 0, output: 0.00075, reasoning: 0 });
  });

  it("falls back to ordinary rates only for missing optional prices", () => {
    const result = calculateCostBreakdownFromTokens({ prompt_tokens: 100, cached_tokens: 40, completion_tokens: 50 }, { input: 3, output: 15 });
    expect(result.totalCost).toBeCloseTo(0.00105, 12);
  });

  it("does not double charge OpenAI reasoning, including Responses streams", () => {
    const chunks = [
      { usage: { prompt_tokens: 100, completion_tokens: 50, completion_tokens_details: { reasoning_tokens: 20 } } },
      { type: "response.completed", response: { usage: { input_tokens: 100, output_tokens: 50, output_tokens_details: { reasoning_tokens: 20 } } } },
    ];
    for (const chunk of chunks) {
      const tokens = canonicalizeUsage(mergeUsage({ prompt_tokens: 0 }, extractUsage(chunk)));
      expect(tokens.reasoning_tokens_included).toBe(true);
      expect(calculateCostFromTokens(tokens, pricing)).toBeCloseTo(0.00105, 12);
      expect(canonicalizeUsage(tokens)).toEqual(tokens);
    }
  });

  it("keeps Gemini thinking additive", () => {
    const tokens = canonicalizeUsage(extractUsage({ usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50, thoughtsTokenCount: 20 } }));
    expect(calculateCostFromTokens(tokens, pricing)).toBeCloseTo(0.00135, 12);
  });

  it("preserves nested cache usage and estimated provenance", () => {
    const tokens = canonicalizeUsage({ prompt_tokens: 100, completion_tokens: 50, prompt_tokens_details: { cached_tokens: 40 }, estimated: true });
    expect(tokens).toMatchObject({ cached_tokens: 40, estimated: true });
    expect(calculateCostFromTokens(tokens, pricing)).toBeCloseTo(0.000942, 12);
  });

  it("rejects missing/invalid pricing and never emits non-finite cost", () => {
    expect(calculateCostBreakdownFromTokens({}, null)).toBeNull();
    expect(calculateCostBreakdownFromTokens({}, { input: -1, output: 1 })).toBeNull();
    expect(calculateCostBreakdownFromTokens({}, { input: Infinity, output: 1 })).toBeNull();
    expect(calculateCostFromTokens({ prompt_tokens: NaN, completion_tokens: Infinity }, pricing)).toBe(0);
  });

  it("resolves vendor-prefixed built-in prices", async () => {
    const result = await calculateRequestCost("openrouter", "openai/gpt-4o", { prompt_tokens: 100, completion_tokens: 50 });
    expect(result).toMatchObject({ pricingFound: true, usageAvailable: true, basis: "recorded" });
    expect(result.totalCost).toBeCloseTo(0.00075, 12);
  });

  it("treats unknown model prices and missing usage as unavailable", async () => {
    expect(await calculateRequestCost("other", "unpriced-test-model", { prompt_tokens: 100 })).toMatchObject({ pricingFound: false, totalCost: null });
    expect(await calculateRequestCost("openai", "gpt-4o", {})).toMatchObject({ pricingFound: true, usageAvailable: false, totalCost: null });
  });
});
