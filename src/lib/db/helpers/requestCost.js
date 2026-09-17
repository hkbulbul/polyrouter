import { canonicalizeUsage } from "open-sse/utils/usageTracking.js";
import { calculateCostBreakdownFromTokens } from "open-sse/providers/pricing.js";
import { getPricingForModel } from "../repos/pricingRepo.js";

// Estimates token charges from configured USD rates, not a provider invoice.
// Unknown pricing/usage is deliberately distinct from an explicitly free model.
export async function calculateRequestCost(provider, model, tokens, basis = "recorded") {
  const canonical = canonicalizeUsage(tokens);
  const usageAvailable = !!canonical && [canonical.prompt_tokens, canonical.completion_tokens,
    canonical.cached_tokens, canonical.cache_creation_input_tokens, canonical.reasoning_tokens]
    .some((value) => value > 0);
  const unavailable = {
    inputCost: null, outputCost: null, totalCost: null, components: null, rates: null,
    pricingFound: false, usageAvailable, estimated: tokens?.estimated === true, basis,
  };
  try {
    const pricing = await getPricingForModel(provider, model);
    const breakdown = calculateCostBreakdownFromTokens(canonical || {}, pricing);
    if (!breakdown) return unavailable;
    if (!usageAvailable) return { ...unavailable, pricingFound: true, rates: breakdown.rates };
    return { ...unavailable, ...breakdown, pricingFound: true };
  } catch (error) {
    console.error("Error calculating request cost:", error);
    return unavailable;
  }
}
