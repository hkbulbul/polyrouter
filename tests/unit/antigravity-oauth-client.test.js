// Guards the deduped Antigravity OAuth client: same values across all 3 sources after refactor.
import { afterEach, describe, it, expect, vi } from "vitest";

const EXPECTED = {
  clientId: "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com",
  clientSecret: "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",
};
const GOOGLE = {
  clientId: "681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com",
  clientSecret: "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",
};

describe("antigravity oauth client (deduped)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shared source holds the canonical credentials", async () => {
    const { ANTIGRAVITY_OAUTH_CLIENT } = await import("../../open-sse/providers/shared.js");
    expect(ANTIGRAVITY_OAUTH_CLIENT).toEqual(EXPECTED);
  });

  it("registry transport keeps clientId/clientSecret", async () => {
    const ag = (await import("../../open-sse/providers/registry/antigravity.js")).default;
    expect(ag.transport.clientId).toBe(EXPECTED.clientId);
    expect(ag.transport.clientSecret).toBe(EXPECTED.clientSecret);
  });

  it("google client shared by gemini + gemini-cli", async () => {
    const { GOOGLE_OAUTH_CLIENT } = await import("../../open-sse/providers/shared.js");
    expect(GOOGLE_OAUTH_CLIENT).toEqual(GOOGLE);
    const gemini = (await import("../../open-sse/providers/registry/gemini.js")).default;
    const gc = (await import("../../open-sse/providers/registry/gemini-cli.js")).default;
    expect(gemini.transport.clientSecret).toBe(GOOGLE.clientSecret);
    expect(gc.transport.clientSecret).toBe(GOOGLE.clientSecret);
  });

  // Guard: oauth.js must spread shared clients + derive from registry (PROVIDER_OAUTH).
  it("src oauth.js imports shared client + keeps full shape", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "../../src/lib/oauth/constants/oauth.js"), "utf8");
    expect(src).toContain('import { ANTIGRAVITY_OAUTH_CLIENT, GOOGLE_OAUTH_CLIENT } from "open-sse/providers/shared.js"');
    expect(src).toContain("...ANTIGRAVITY_OAUTH_CLIENT");
    expect(src).toContain("...GOOGLE_OAUTH_CLIENT");
    // authorizeUrl now lives in registry; oauth.js derives via PROVIDER_OAUTH spread
    expect(src).toContain('PROVIDER_OAUTH["antigravity"]');
    expect(src).toContain('PROVIDER_OAUTH["gemini-cli"]');
    expect(src).not.toContain(EXPECTED.clientSecret); // antigravity secret no longer hardcoded here
    expect(src).not.toContain(GOOGLE.clientSecret);   // gemini secret no longer hardcoded here
  });

  it("maps post-exchange identity and project data", async () => {
    // Import first: providers installs its proxy-aware fetch wrapper at module load.
    const { exchangeTokens } = await import("../../src/lib/oauth/providers.js");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "ag-access-token",
          refresh_token: "ag-refresh-token",
          expires_in: 3600,
          scope: "openid email",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ email: "user@example.com" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ cloudaicompanionProject: { id: "project-123" } }),
      })
      .mockResolvedValue({ ok: true, json: async () => ({ done: true }) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await exchangeTokens(
      "antigravity",
      "authorization-code",
      "http://localhost:20128/callback",
      "unused-verifier",
    );

    expect(result).toMatchObject({
      accessToken: "ag-access-token",
      refreshToken: "ag-refresh-token",
      expiresIn: 3600,
      email: "user@example.com",
      projectId: "project-123",
    });
  }, 15_000);

  it("declares post-exchange data in every mapper that reads it", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "../../src/lib/oauth/providers.js"), "utf8");

    const invalidMappers = src.match(
      /mapTokens:\s*\(tokens\)\s*=>(?:(?!mapTokens:)[\s\S])*?extra\?\./g,
    );
    expect(invalidMappers).toBeNull();
  });
});
