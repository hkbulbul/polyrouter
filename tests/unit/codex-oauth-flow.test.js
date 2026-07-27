import { afterEach, describe, expect, it } from "vitest";

const CALLBACK_URL = "http://127.0.0.1:1455/auth/callback";

describe("Codex OAuth", () => {
  afterEach(async () => {
    const { stopCodexProxy, clearCodexSession } = await import("../../src/lib/oauth/utils/server.js");
    stopCodexProxy();
    clearCodexSession("matching-state");
    clearCodexSession("unknown-state");
  });

  it("builds the current PKCE authorization URL without an originator query", async () => {
    const { generateAuthData } = await import("../../src/lib/oauth/providers.js");
    const data = await generateAuthData("codex", CALLBACK_URL);
    const url = new URL(data.authUrl);

    expect(url.origin).toBe("https://auth.openai.com");
    expect(url.pathname).toBe("/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("app_EMoamEEZ73f0CkXaXp7hrann");
    expect(url.searchParams.get("redirect_uri")).toBe(CALLBACK_URL);
    expect(url.searchParams.get("scope")).toBe("openid profile email offline_access");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBe(data.codeChallenge);
    expect(url.searchParams.get("state")).toBe(data.state);
    expect(url.searchParams.get("id_token_add_organizations")).toBe("true");
    expect(url.searchParams.get("codex_cli_simplified_flow")).toBe("true");
    expect(url.searchParams.has("originator")).toBe(false);
  });

  it("starts the callback proxy on the extension-safe loopback address", async () => {
    const { startCodexProxy } = await import("../../src/lib/oauth/utils/server.js");

    expect(await startCodexProxy(20128)).toEqual({ success: true });
    const response = await fetch("http://127.0.0.1:1455/not-found");
    expect(response.status).toBe(404);
  });

  it("does not auto-exchange an unregistered state", async () => {
    const { startCodexProxy } = await import("../../src/lib/oauth/utils/server.js");

    expect(await startCodexProxy(20128)).toEqual({ success: true });
    const response = await fetch(`${CALLBACK_URL}?code=auth-code&state=unknown-state`, {
      redirect: "manual",
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "http://localhost:20128/callback?code=auth-code&state=unknown-state"
    );
  });

  it("keeps originator as an upstream transport header", async () => {
    const codex = (await import("../../open-sse/providers/registry/codex.js")).default;
    expect(codex.transport.headers.originator).toBe("codex_cli_rs");
    expect(codex.oauth.extraParams.originator).toBeUndefined();
  });
});
