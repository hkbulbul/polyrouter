// Built-in prices checked against the providers' official pricing pages on 2026-10-07.
import { describe, it, expect } from "vitest";
import { getPricingForModel, calculateCostBreakdownFromTokens } from "../../open-sse/providers/pricing.js";

const rates = (provider, model) => {
  const p = getPricingForModel(provider, model);
  return p && { input: p.input, cached: p.cached, output: p.output };
};

describe("official prices (developers.openai.com, ai.google.dev, docs.z.ai)", () => {
  it("GPT-6 models are priced (they used to fall through to $0)", () => {
    expect(rates("codex", "gpt-6-luna")).toEqual({ input: 0.1, cached: 0.01, output: 0.5 });
    expect(rates("codex", "gpt-6-sol")).toEqual({ input: 2, cached: 0.2, output: 10 });
    expect(rates("codex", "gpt-6.1-sol")).toEqual({ input: 2, cached: 0.1, output: 10 });
    expect(rates("codex", "gpt-6-astra")).toEqual({ input: 10, cached: 1, output: 50 });
  });

  it("GPT-5.6 models use the official rates, including provider variant names", () => {
    expect(rates("explabs", "gpt-5.6-luna")).toEqual({ input: 0.2, cached: 0.02, output: 1.2 });
    expect(rates("codex", "gpt-5.6-terra")).toEqual({ input: 2, cached: 0.2, output: 12 });
    expect(rates("kiro", "gpt-5.6-sol-thinking-agentic")).toEqual({ input: 4, cached: 0.4, output: 20 });
  });

  it("Gemini 3.8 Flash and GLM-5.3-Flash resolve to their own prices, not generic fallbacks", () => {
    expect(rates("antigravity", "gemini-3.8-flash-high")).toEqual({ input: 0.75, cached: 0.075, output: 3.75 });
    expect(rates("commandcode", "glm-5.3-flash")).toEqual({ input: 0.15, cached: 0.03, output: 0.5 });
    expect(rates("nvidia", "z-ai/glm-5.3-flash")).toEqual({ input: 0.15, cached: 0.03, output: 0.5 });
    expect(rates("x", "glm-5.3-flashx")).toEqual({ input: 0.37, cached: 0.075, output: 1.25 });
  });
});

describe("long-context tier", () => {
  const luna = getPricingForModel("codex", "gpt-6-luna");
  it("applies only above 272K input tokens and to the whole request", () => {
    const at = calculateCostBreakdownFromTokens({ prompt_tokens: 272_000, completion_tokens: 1_000 }, luna);
    expect(at.longContext).toBe(false);
    expect(at.rates.input).toBe(0.1);
    const over = calculateCostBreakdownFromTokens({ prompt_tokens: 272_001, completion_tokens: 1_000 }, luna);
    expect(over.longContext).toBe(true);
    expect(over.rates).toMatchObject({ input: 0.2, output: 0.75, cached: 0.02 });
    expect(over.totalCost).toBeCloseTo((272_001 * 0.2 + 1_000 * 0.75) / 1e6, 12);
  });

  it("models without a long-context tier are unaffected", () => {
    const glm = getPricingForModel("x", "glm-5.3-flash");
    const b = calculateCostBreakdownFromTokens({ prompt_tokens: 900_000, completion_tokens: 0 }, glm);
    expect(b.longContext).toBe(false);
    expect(b.totalCost).toBeCloseTo(0.135, 12);
  });
});
