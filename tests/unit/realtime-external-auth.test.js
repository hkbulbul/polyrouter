import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validateApiKey: vi.fn(),
  getSettings: vi.fn(),
  getDashboardAuthSession: vi.fn(),
  getProviderCredentials: vi.fn(),
  checkAndRefreshToken: vi.fn(),
}));

vi.mock("@/lib/localDb.js", () => ({
  validateApiKey: mocks.validateApiKey,
  getSettings: mocks.getSettings,
}));
vi.mock("@/lib/auth/dashboardSession.js", () => ({ getDashboardAuthSession: mocks.getDashboardAuthSession }));
vi.mock("@/sse/services/auth.js", () => ({ getProviderCredentials: mocks.getProviderCredentials }));
vi.mock("@/sse/services/tokenRefresh.js", () => ({ checkAndRefreshToken: mocks.checkAndRefreshToken }));
vi.mock("@/shared/constants/providers.js", () => ({ resolveProviderId: (value) => value }));

import { authenticateUpgrade } from "../../src/realtime/auth.js";
import { issueRealtimeTicket } from "../../src/realtime/tickets.js";

function externalRequest(overrides = {}) {
  const { headers = {}, ...rest } = overrides;
  return {
    headers: {
      host: "router.example.com",
      origin: "https://voice.example.com",
      "x-9r-real-ip": "203.0.113.10",
      ...headers,
    },
    socket: { remoteAddress: "203.0.113.10" },
    realtimeProvider: "codex",
    realtimeModel: "gpt-realtime-2",
    realtimeSecure: true,
    ...rest,
  };
}

describe("realtime external authentication", () => {
  beforeEach(() => {
    process.env.REALTIME_INTERNAL_SECRET = "external-auth-test-secret";
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.getProviderCredentials.mockResolvedValue({
      accessToken: "opaque-access-token",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      connectionId: "connection-1",
    });
  });

  it("allows a valid API key without requiring a dashboard cookie or same origin", async () => {
    mocks.validateApiKey.mockResolvedValue(true);
    const result = await authenticateUpgrade(externalRequest({
      headers: { authorization: "Bearer external-api-key", origin: "https://unrelated-client.example" },
    }));

    expect(result.accessToken).toBe("opaque-access-token");
    expect(mocks.validateApiKey).toHaveBeenCalledWith("external-api-key");
    expect(mocks.getDashboardAuthSession).not.toHaveBeenCalled();
    expect(mocks.getSettings).not.toHaveBeenCalled();
  });

  it("rejects an invalid API key before selecting provider credentials", async () => {
    mocks.validateApiKey.mockResolvedValue(false);
    await expect(authenticateUpgrade(externalRequest({
      realtimeApiKey: "invalid-browser-key",
    }))).rejects.toThrow(/invalid PolyRouter API key/i);
    expect(mocks.getProviderCredentials).not.toHaveBeenCalled();
  });

  it("rejects remote API keys sent over plaintext WebSockets", async () => {
    mocks.validateApiKey.mockResolvedValue(true);
    await expect(authenticateUpgrade(externalRequest({
      realtimeApiKey: "valid-but-plaintext-key",
      realtimeSecure: false,
    }))).rejects.toThrow(/require WSS/i);
    expect(mocks.validateApiKey).not.toHaveBeenCalled();
  });

  it("accepts a correctly scoped browser ticket without exposing the permanent key", async () => {
    const { ticket } = issueRealtimeTicket({
      provider: "codex",
      model: "gpt-realtime-2",
      origin: "https://voice.example.com",
    });
    const result = await authenticateUpgrade(externalRequest({ realtimeTicket: ticket }));

    expect(result.connectionId).toBe("connection-1");
    expect(mocks.validateApiKey).not.toHaveBeenCalled();
    expect(mocks.getDashboardAuthSession).not.toHaveBeenCalled();
  });
});
