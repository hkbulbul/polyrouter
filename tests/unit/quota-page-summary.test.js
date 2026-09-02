import { describe, expect, it } from "vitest";
import { getPageQuotaSummary } from "@/app/(dashboard)/dashboard/usage/components/ProviderLimits/utils.js";

const futureReset = "2099-01-01T04:00:00.000Z";
const earlierFutureReset = "2099-01-01T02:00:00.000Z";

describe("getPageQuotaSummary", () => {
  it("counts ready, empty, disabled, and the next reset on the current page", () => {
    const summary = getPageQuotaSummary(
      [
        { id: "ready" },
        { id: "empty" },
        { id: "off", isActive: false },
      ],
      {
        ready: { quotas: [{ name: "Five hour", used: 20, total: 100, resetAt: futureReset }] },
        empty: { quotas: [{ name: "Weekly", used: 100, total: 100, resetAt: earlierFutureReset }] },
        off: { quotas: [{ name: "Ignored", used: 0, total: 100, resetAt: earlierFutureReset }] },
      },
    );

    expect(summary).toMatchObject({
      accounts: 3,
      ready: 1,
      depleted: 1,
      disabled: 1,
      measuredAccounts: 2,
      earliestResetAt: earlierFutureReset,
    });
  });

  it("does not treat unreported and unlimited quotas as depleted", () => {
    const summary = getPageQuotaSummary(
      [{ id: "unknown" }, { id: "unlimited" }],
      {
        unknown: { quotas: [] },
        unlimited: { quotas: [{ name: "Unlimited", used: 0, total: 0 }] },
      },
    );

    expect(summary).toMatchObject({
      accounts: 2,
      ready: 0,
      depleted: 0,
      disabled: 0,
      measuredAccounts: 0,
      earliestResetAt: null,
    });
  });

  it("recognizes an explicit zero remaining percentage as depleted", () => {
    const summary = getPageQuotaSummary(
      [{ id: "empty" }],
      { empty: { quotas: [{ name: "Credits", total: 0, remainingPercentage: 0 }] } },
    );

    expect(summary).toMatchObject({ ready: 0, depleted: 1, measuredAccounts: 1 });
  });

  it("handles an empty page", () => {
    expect(getPageQuotaSummary()).toEqual({
      accounts: 0,
      ready: 0,
      depleted: 0,
      disabled: 0,
      measuredAccounts: 0,
      earliestResetAt: null,
    });
  });
});
