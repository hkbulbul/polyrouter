import { canonicalizeUsage } from "open-sse/utils/usageTracking.js";
import { calculateCostBreakdownFromTokens } from "open-sse/providers/pricing.js";
import { getPricingForModel } from "../repos/pricingRepo.js";

/**
 * Collapse a calculateRequestCost() breakdown into the stored usage columns.
 * inputCost = uncached input + cache writes, cachedCost = cache reads,
 * outputCost = output + reasoning; they sum to `cost`. `unpriced` marks rows
 * that used tokens but had no price — they count as $0 and are surfaced in the UI.
 */
export function toCostParts(breakdown) {
  if (!breakdown || breakdown.totalCost === null || breakdown.totalCost === undefined) {
    return { cost: 0, inputCost: 0, cachedCost: 0, outputCost: 0, unpriced: breakdown?.usageAvailable ? 1 : 0 };
  }
  const c = breakdown.components || {};
  return {
    cost: breakdown.totalCost,
    inputCost: (c.input || 0) + (c.cacheCreation || 0),
    cachedCost: c.cached || 0,
    outputCost: (c.output || 0) + (c.reasoning || 0),
    unpriced: 0,
  };
}

// Estimates token charges from configured USD rates, not a provider invoice.
// Unknown pricing/usage is deliberately distinct from an explicitly free model.
export async function calculateRequestCost(provider, model, tokens, basis = "recorded") {
  try {
    return calculateRequestCostWithPricing(await getPricingForModel(provider, model), tokens, basis);
  } catch (error) {
    console.error("Error calculating request cost:", error);
    return calculateRequestCostWithPricing(null, tokens, basis);
  }
}

// Same as calculateRequestCost with an already-resolved pricing entry (or null),
// so bulk jobs can look pricing up once per provider/model.
export function calculateRequestCostWithPricing(pricing, tokens, basis = "recorded") {
  const canonical = canonicalizeUsage(tokens);
  const usageAvailable = !!canonical && [canonical.prompt_tokens, canonical.completion_tokens,
    canonical.cached_tokens, canonical.cache_creation_input_tokens, canonical.reasoning_tokens]
    .some((value) => value > 0);
  const unavailable = {
    inputCost: null, outputCost: null, totalCost: null, components: null, rates: null,
    pricingFound: false, usageAvailable, estimated: tokens?.estimated === true, basis,
  };
  const breakdown = calculateCostBreakdownFromTokens(canonical || {}, pricing);
  if (!breakdown) return unavailable;
  if (!usageAvailable) return { ...unavailable, pricingFound: true, rates: breakdown.rates };
  return { ...unavailable, ...breakdown, pricingFound: true };
}
