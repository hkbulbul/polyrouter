const COST_PRECISION = 6;
const POSITIVE_TINY_COST_THRESHOLD = 10 ** -COST_PRECISION;

/**
 * Format a request cost as USD without hiding zero-valued requests.
 *
 * The API is the source of cost arithmetic; this helper only presents the
 * already-calculated amount. Values smaller than one display unit are shown
 * as an honest lower bound rather than rounded down to zero.
 */
export function formatRequestCost(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  if (amount > 0 && amount < POSITIVE_TINY_COST_THRESHOLD) {
    return "< $0.000001";
  }

  return `$${amount.toFixed(COST_PRECISION)}`;
}

// Kept as a focused alias for callers that only need a USD value formatter.
export const formatUsdCost = formatRequestCost;

/**
 * Return the truthful availability state for a request's cost breakdown.
 * Pricing and usage are independent prerequisites for displaying a cost.
 */
export function getRequestCostAvailability(costBreakdown) {
  if (!costBreakdown) {
    return {
      available: false,
      reason: "Cost data is unavailable for this request."
    };
  }

  if (costBreakdown.pricingFound !== true) {
    return {
      available: false,
      reason: "Pricing was not found for this request."
    };
  }

  if (costBreakdown.usageAvailable !== true) {
    return {
      available: false,
      reason: "Token usage was not recorded for this request."
    };
  }

  return { available: true, reason: "" };
}

/**
 * Prepare all values shown by the request-cost UI without doing cost
 * arithmetic in the component. `null` values remain unavailable instead of
 * being coerced into a misleading zero.
 */
export function getRequestCostPresentation(costBreakdown) {
  const availability = getRequestCostAvailability(costBreakdown);

  if (!availability.available) {
    return {
      ...availability,
      total: "—",
      input: "—",
      output: "—",
      components: null,
      rates: null,
      basis: null,
      estimated: false
    };
  }

  const components = costBreakdown.components || {};
  const rates = costBreakdown.rates || {};

  return {
    ...availability,
    total: formatRequestCost(costBreakdown.totalCost),
    input: formatRequestCost(costBreakdown.inputCost),
    output: formatRequestCost(costBreakdown.outputCost),
    components: {
      input: formatRequestCost(components.input),
      cached: formatRequestCost(components.cached),
      cacheCreation: formatRequestCost(components.cacheCreation),
      output: formatRequestCost(components.output),
      reasoning: formatRequestCost(components.reasoning)
    },
    rates: {
      input: formatRequestCost(rates.input),
      output: formatRequestCost(rates.output),
      cached: formatRequestCost(rates.cached),
      cacheCreation: formatRequestCost(rates.cache_creation),
      reasoning: formatRequestCost(rates.reasoning)
    },
    basis: costBreakdown.basis || null,
    estimated: costBreakdown.estimated === true
  };
}
