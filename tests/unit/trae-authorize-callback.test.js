import { describe, expect, it, vi } from "vitest";

vi.mock("@/models", () => ({ createProviderConnection: vi.fn() }));
vi.mock("next/server", () => ({
  NextResponse: class NextResponse extends Response {
    static json(body, init) {
      return new Response(JSON.stringify(body), init);
    }
  },
}));

const { parseTrae } = await import("../../src/app/authorize/route.js");

function jwt(overrides = {}) {
  return JSON.stringify({
    Token: "trae-access-token",
    RefreshToken: "trae-refresh-token",
    TokenExpireAt: 1_800_000_000_000,
    ClientID: "trae-client",
    ...overrides,
  });
}

describe("Trae authorization callback", () => {
  it("parses the legacy top-level callback fields", () => {
    const params = new URLSearchParams({
      userJwt: jwt(),
      userInfo: JSON.stringify({
        UserID: "user-1",
        TenantID: "tenant-1",
        Region: "US-East",
        AIRegion: "US-West",
        NonPlainTextEmail: "masked@example.com",
      }),
      userRegion: "US",
    });

    const parsed = parseTrae(params);

    expect(parsed.ok).toBe(true);
    expect(parsed.record).toMatchObject({
      provider: "trae",
      accessToken: "trae-access-token",
      refreshToken: "trae-refresh-token",
      email: "masked@example.com",
      providerSpecificData: {
        userId: "user-1",
        tenantId: "tenant-1",
        region: "US-East",
        aiRegion: "US-West",
        clientId: "trae-client",
      },
    });
  });

  it("parses fields from Trae's data envelope", () => {
    const params = new URLSearchParams({
      isRedirect: "true",
      scope: "solo",
      data: JSON.stringify({
        loginTraceID: "trace-123",
        userJwt: jwt({ Token: "nested-access-token" }),
        userInfo: JSON.stringify({ UserID: "user-2", Region: "Singapore" }),
        userRegion: "SG",
      }),
    });

    const parsed = parseTrae(params);

    expect(parsed.ok).toBe(true);
    expect(parsed.loginTraceId).toBe("trace-123");
    expect(parsed.record.accessToken).toBe("nested-access-token");
    expect(parsed.record.providerSpecificData).toMatchObject({
      userId: "user-2",
      region: "Singapore",
      userRegion: "SG",
    });
  });

  it("rejects a callback without a JWT", () => {
    expect(parseTrae(new URLSearchParams({ data: "{}" }))).toEqual({
      ok: false,
      error: "Missing userJwt in callback",
    });
  });
});
