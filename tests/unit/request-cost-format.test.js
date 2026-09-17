import { describe, expect, it } from "vitest";
import {
  formatRequestCost,
  getRequestCostAvailability,
  getRequestCostPresentation
} from "../../src/shared/utils/requestCost.js";

describe("request cost presentation", () => {
  it("formats USD costs to six decimals", () => {
    expect(formatRequestCost(1.23456789)).toBe("$1.234568");
    expect(formatRequestCost(0)).toBe("$0.000000");
  });

  it("keeps positive sub-micro-dollar costs visible", () => {
    expect(formatRequestCost(0.0000001)).toBe("< $0.000001");
  });

  it("does not invent a zero for missing values", () => {
    expect(formatRequestCost(null)).toBe("—");
    expect(formatRequestCost(undefined)).toBe("—");
    expect(getRequestCostAvailability(null)).toEqual({
      available: false,
      reason: "Cost data is unavailable for this request."
    });
  });

  it("requires both pricing and usage", () => {
    expect(getRequestCostAvailability({ pricingFound: false, usageAvailable: true })).toMatchObject({
      available: false,
      reason: "Pricing was not found for this request."
    });
    expect(getRequestCostAvailability({ pricingFound: true, usageAvailable: false })).toMatchObject({
      available: false,
      reason: "Token usage was not recorded for this request."
    });
  });

  it("formats totals, components, rates, and estimate metadata", () => {
    const result = getRequestCostPresentation({
      inputCost: 0.1,
      outputCost: 0.2,
      totalCost: 0.3,
      components: { input: 0.09, cached: 0.01, cacheCreation: 0, output: 0.2, reasoning: 0 },
      pricingFound: true,
      usageAvailable: true,
      estimated: true,
      basis: "current-pricing",
      rates: { input: 1, output: 2, cached: 0.5, cache_creation: 3, reasoning: 4 }
    });

    expect(result).toMatchObject({
      available: true,
      total: "$0.300000",
      input: "$0.100000",
      output: "$0.200000",
      basis: "current-pricing",
      estimated: true,
      components: {
        input: "$0.090000",
        cached: "$0.010000",
        cacheCreation: "$0.000000",
        output: "$0.200000",
        reasoning: "$0.000000"
      },
      rates: {
        input: "$1.000000",
        output: "$2.000000",
        cached: "$0.500000",
        cacheCreation: "$3.000000",
        reasoning: "$4.000000"
      }
    });
  });
});
