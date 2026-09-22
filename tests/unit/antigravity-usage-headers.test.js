import { describe, it, expect, vi, beforeEach } from "vitest";

const proxyAwareFetch = vi.fn(async (url) => {
  const targetUrl = typeof url === "string" ? url : (url?.url || "");
  if (targetUrl.includes(":loadCodeAssist")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ cloudaicompanionProject: "project-1", currentTier: { name: "Pro" } }),
      text: async () => "{}",
    };
  }
  if (targetUrl.includes(":retrieveUserQuota")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        buckets: [
          {
            modelId: "gemini-3.8-flash-tiered",
            remainingFraction: 0.65,
            resetTime: "2026-05-25T12:00:00Z",
          },
        ],
      }),
      text: async () => "{}",
    };
  }
  return {
    ok: true,
    status: 200,
    json: async () => ({
      models: {
        "gemini-3.8-flash-tiered": {
          displayName: "Gemini 3.8 Flash",
          quotaInfo: {
            remainingFraction: 1.0,
            resetTime: "2026-05-25T11:00:00Z",
          },
        },
      },
    }),
    text: async () => "{}",
  };
});

vi.mock("../../open-sse/utils/proxyFetch.js", () => ({
  proxyAwareFetch,
}));

describe("Antigravity usage headers and quota resolution", () => {
  beforeEach(() => proxyAwareFetch.mockClear());

  it("uses the official IDE user agent and omits router-only source headers", async () => {
    const { getAntigravityUsage } = await import("../../open-sse/services/usage/google.js");

    const result = await getAntigravityUsage("access-token", {});

    expect(proxyAwareFetch).toHaveBeenCalledTimes(3); // loadCodeAssist + fetchAvailableModels + retrieveUserQuota
    for (const [, options] of proxyAwareFetch.mock.calls) {
      expect(options.headers["User-Agent"]).toBe("antigravity/ide/2.1.1 darwin/arm64");
      expect(options.headers).not.toHaveProperty("x-request-source");
    }

    // Verify live quota from retrieveUserQuota overrides static 1.0 remainingFraction
    expect(result.quotas["gemini-3.8-flash-tiered"]).toMatchObject({
      used: 350,
      total: 1000,
      remainingPercentage: 65,
      resetAt: "2026-05-25T12:00:00.000Z",
      displayName: "Gemini 3.8 Flash",
    });
  });

  it("uses connection projectId directly and bypasses loadCodeAssist lookup", async () => {
    const { getAntigravityUsage } = await import("../../open-sse/services/usage/google.js");

    const result = await getAntigravityUsage("access-token", { projectId: "existing-proj" });

    // Should call fetchAvailableModels and retrieveUserQuota, skipping loadCodeAssist
    expect(proxyAwareFetch).toHaveBeenCalledTimes(2);
    expect(proxyAwareFetch.mock.calls[0][0]).toContain(":fetchAvailableModels");
    expect(proxyAwareFetch.mock.calls[1][0]).toContain(":retrieveUserQuota");
    expect(proxyAwareFetch.mock.calls[1][1].body).toBe(JSON.stringify({ project: "existing-proj" }));

    expect(result.quotas["gemini-3.8-flash-tiered"]).toMatchObject({
      used: 350,
      total: 1000,
      remainingPercentage: 65,
    });
  });

  it("handles retrieveUserQuota errors gracefully by preserving fetchAvailableModels quotas", async () => {
    const { getAntigravityUsage } = await import("../../open-sse/services/usage/google.js");

    proxyAwareFetch.mockImplementation(async (url) => {
      const targetUrl = typeof url === "string" ? url : (url?.url || "");
      if (targetUrl.includes(":loadCodeAssist")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ cloudaicompanionProject: "project-1", currentTier: { name: "Pro" } }),
          text: async () => "{}",
        };
      }
      if (targetUrl.includes(":retrieveUserQuota")) {
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: "Internal Server Error" }),
          text: async () => "Internal Server Error",
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          models: {
            "gemini-3.8-flash-tiered": {
              displayName: "Gemini 3.8 Flash",
              quotaInfo: {
                remainingFraction: 1.0,
                resetTime: "2026-05-25T11:00:00Z",
              },
            },
          },
        }),
        text: async () => "{}",
      };
    });

    const result = await getAntigravityUsage("access-token", {});

    expect(result.quotas["gemini-3.8-flash-tiered"]).toMatchObject({
      used: 0,
      total: 1000,
      remainingPercentage: 100,
      displayName: "Gemini 3.8 Flash",
    });
  });
});
