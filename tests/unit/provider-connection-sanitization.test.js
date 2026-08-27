import { describe, it, expect } from "vitest";
import {
  sanitizeProviderConnection,
  stripManagedProviderData,
} from "../../src/lib/providerNormalization.js";

describe("provider connection sanitization", () => {
  it("removes every credential and managed browser field from API responses", () => {
    const raw = {
      id: "connection-1",
      provider: "chatgpt-web",
      apiKey: "cookie-header",
      accessToken: "access",
      refreshToken: "refresh",
      idToken: "identity",
      providerSpecificData: {
        proxyPoolId: "pool-1",
        browserProfileId: "profile-secret",
        browserChannel: "chrome",
        sessionCookies: [{ name: "session", value: "cookie-secret" }],
      },
    };

    const safe = sanitizeProviderConnection(raw);

    expect(safe).toEqual({
      id: "connection-1",
      provider: "chatgpt-web",
      providerSpecificData: { proxyPoolId: "pool-1" },
    });
    expect(JSON.stringify(safe)).not.toMatch(/cookie-secret|profile-secret|cookie-header|browserChannel|access|refresh|identity/);
    expect(raw.providerSpecificData.sessionCookies).toHaveLength(1);
  });

  it("prevents generic create and update bodies from overwriting managed fields", () => {
    expect(stripManagedProviderData({
      proxyPoolId: "pool-1",
      browserProfileId: "attacker-profile",
      browserChannel: "msedge",
      sessionCookies: [{ value: "attacker-cookie" }],
    })).toEqual({ proxyPoolId: "pool-1" });
  });
});
