import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../open-sse/utils/proxyFetch.js", () => ({
  proxyAwareFetch: vi.fn(),
}));

import { proxyAwareFetch } from "../../open-sse/utils/proxyFetch.js";
import { getUsageForProvider } from "../../open-sse/services/usage.js";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Antigravity usage project id resolution and live quota", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the connection-level projectId and overrides static 100% quota with live bucket data", async () => {
    proxyAwareFetch
      // 1. fetchAvailableModels
      .mockResolvedValueOnce(jsonResponse({
        models: {
          "gemini-3.8-flash-tiered": {
            displayName: "Gemini 3.8 Flash",
            quotaInfo: {
              remainingFraction: 1.0,
              resetTime: "2026-05-25T11:00:00Z",
            },
          },
          "claude-sonnet-4-6": {
            displayName: "Claude Sonnet 4.6 (Thinking)",
            quotaInfo: {
              remainingFraction: 1.0,
              resetTime: "2026-05-25T11:00:00Z",
            },
          },
        },
      }))
      // 2. retrieveUserQuota
      .mockResolvedValueOnce(jsonResponse({
        buckets: [
          {
            modelId: "gemini-3.8-flash-tiered",
            remainingFraction: 0.42,
            resetTime: "2026-05-25T14:30:00Z",
          },
        ],
      }));

    const usage = await getUsageForProvider({
      provider: "antigravity",
      accessToken: "test-token",
      projectId: "my-gcp-project",
    });

    expect(proxyAwareFetch).toHaveBeenCalledTimes(2);

    // fetchAvailableModels called with project in body
    expect(proxyAwareFetch).toHaveBeenNthCalledWith(
      1,
      "https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels",
      expect.objectContaining({
        body: JSON.stringify({ project: "my-gcp-project" }),
      }),
      null
    );

    // retrieveUserQuota called with project in body
    expect(proxyAwareFetch).toHaveBeenNthCalledWith(
      2,
      "https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota",
      expect.objectContaining({
        body: JSON.stringify({ project: "my-gcp-project" }),
      }),
      null
    );

    // Live consumed quota overrides static 1.0
    expect(usage.quotas["gemini-3.8-flash-tiered"]).toMatchObject({
      used: 580,
      total: 1000,
      remainingPercentage: 42,
      resetAt: "2026-05-25T14:30:00.000Z",
      displayName: "Gemini 3.8 Flash",
    });

    // Unmodified model stays from fetchAvailableModels
    expect(usage.quotas["claude-sonnet-4-6"]).toMatchObject({
      used: 0,
      total: 1000,
      remainingPercentage: 100,
      resetAt: "2026-05-25T11:00:00.000Z",
    });
  });

  it("resolves project ID from loadCodeAssist when connection does not have one", async () => {
    proxyAwareFetch
      // 1. loadCodeAssist
      .mockResolvedValueOnce(jsonResponse({
        cloudaicompanionProject: { id: "resolved-project-99" },
        currentTier: { name: "Pro" },
      }))
      // 2. fetchAvailableModels
      .mockResolvedValueOnce(jsonResponse({
        models: {
          "gemini-3.8-flash-tiered": {
            quotaInfo: {
              remainingFraction: 1.0,
            },
          },
        },
      }))
      // 3. retrieveUserQuota
      .mockResolvedValueOnce(jsonResponse({
        buckets: [
          {
            modelId: "gemini-3.8-flash-tiered",
            remainingFraction: 0.1,
          },
        ],
      }));

    const usage = await getUsageForProvider({
      provider: "antigravity",
      accessToken: "test-token",
    });

    expect(proxyAwareFetch).toHaveBeenCalledTimes(3);
    expect(proxyAwareFetch).toHaveBeenNthCalledWith(
      3,
      "https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota",
      expect.objectContaining({
        body: JSON.stringify({ project: "resolved-project-99" }),
      }),
      null
    );

    expect(usage.plan).toBe("Pro");
    expect(usage.quotas["gemini-3.8-flash-tiered"].remainingPercentage).toBe(10);
    expect(usage.quotas["gemini-3.8-flash-tiered"].used).toBe(900);
  });
});
