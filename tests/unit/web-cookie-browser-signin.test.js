import path from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  createProviderConnection: vi.fn(),
  getProviderConnectionById: vi.fn(),
  updateProviderConnection: vi.fn(),
  launchInstalledPersistentChromium: vi.fn(),
}));

vi.mock("@/models", () => ({
  createProviderConnection: mocks.createProviderConnection,
  getProviderConnectionById: mocks.getProviderConnectionById,
  updateProviderConnection: mocks.updateProviderConnection,
}));

vi.mock("@/lib/dataDir.js", () => ({ DATA_DIR: path.resolve(".test-polyrouter-data") }));
vi.mock("open-sse/utils/installedChromium.js", () => ({
  InstalledChromiumError: class InstalledChromiumError extends Error {
    constructor(message) {
      super(message);
      this.code = "BROWSER_UNAVAILABLE";
    }
  },
  launchInstalledPersistentChromium: mocks.launchInstalledPersistentChromium,
}));

const signin = await import("../../src/lib/webCookieBrowserSignin.js");
const mockedBrowserRuntime = await import("open-sse/utils/installedChromium.js");

function cookie(name, value, domain) {
  return { name, value, domain, path: "/", secure: true, httpOnly: true, sameSite: "Lax" };
}

function fakeContext(cookies = []) {
  const handlers = {};
  const page = {
    goto: vi.fn().mockResolvedValue(undefined),
    locator: vi.fn(() => ({ last: () => ({ isVisible: vi.fn().mockResolvedValue(true) }) })),
  };
  return {
    pages: vi.fn(() => [page]),
    newPage: vi.fn().mockResolvedValue(page),
    cookies: vi.fn().mockResolvedValue(cookies),
    once: vi.fn((event, handler) => { handlers[event] = handler; }),
    close: vi.fn(async () => { handlers.close?.(); }),
    page,
    handlers,
  };
}

async function waitForTerminal(flowId) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const flow = signin.getWebCookieSignin(flowId);
    if (!["starting", "waiting"].includes(flow.status)) return flow;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Flow did not finish");
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createProviderConnection.mockResolvedValue({ id: "created-1" });
});

afterEach(async () => {
  await signin.__test__.reset();
});

describe("Web Cookie cookie filtering", () => {
  it("keeps only exact ChatGPT domains and allowed auth cookies", () => {
    const result = signin.normalizeProviderCookies("chatgpt-web", [
      cookie("__Secure-next-auth.session-token.0", "part-0", ".chatgpt.com"),
      cookie("cf_clearance", "clear", "chatgpt.com"),
      cookie("analytics", "tracking", "chatgpt.com"),
      cookie("__Secure-next-auth.session-token", "stolen", "chatgpt.com.attacker.test"),
    ]);

    expect(result.map((item) => item.name)).toEqual([
      "__Secure-next-auth.session-token.0",
      "cf_clearance",
    ]);
    expect(result.map((item) => item.value)).not.toContain("stolen");
  });

  it("extracts exact Grok and Perplexity credentials including ordered chunks", () => {
    const grok = signin.normalizeProviderCookies("grok-web", [
      cookie("sso", "grok-token", ".grok.com"),
      cookie("sso", "wrong", "evil.grok.com"),
    ]);
    expect(signin.credentialFromCookies("grok-web", grok)).toBe("grok-token");

    const perplexity = signin.normalizeProviderCookies("perplexity-web", [
      cookie("__Secure-next-auth.session-token.1", "world", "perplexity.ai"),
      cookie("__Secure-next-auth.session-token.0", "hello-", "perplexity.ai"),
    ]);
    expect(signin.credentialFromCookies("perplexity-web", perplexity)).toBe("hello-world");
  });

  it("rejects malformed, unsupported, oversized, and suffix-trick cookie sets", () => {
    expect(() => signin.normalizeProviderCookies("unknown", [cookie("sso", "x", "grok.com")]))
      .toThrow("Unsupported Web Cookie provider");
    expect(() => signin.normalizeProviderCookies("grok-web", [cookie("sso", "x", "grok.com.attacker.test")]))
      .toThrow("No Grok sign-in cookies");
    expect(() => signin.normalizeProviderCookies("grok-web", [cookie("sso", "x".repeat(70_000), "grok.com")]))
      .toThrow("No Grok sign-in cookies");
  });
});

describe("managed browser lifecycle", () => {
  it("creates a Grok cookie connection and returns no secrets", async () => {
    const context = fakeContext([cookie("sso", "super-secret", "grok.com")]);
    mocks.launchInstalledPersistentChromium.mockResolvedValue({ context, channel: "chrome" });

    const started = await signin.startWebCookieSignin({ provider: "grok-web" });
    const completed = await waitForTerminal(started.flowId);

    expect(completed).toMatchObject({ status: "succeeded", connectionId: "created-1" });
    expect(JSON.stringify(completed)).not.toContain("super-secret");
    expect(mocks.createProviderConnection).toHaveBeenCalledWith(expect.objectContaining({
      provider: "grok-web",
      authType: "cookie",
      apiKey: "super-secret",
      providerSpecificData: expect.objectContaining({ browserProfileId: expect.any(String) }),
    }));
    expect(context.close).toHaveBeenCalled();
  });

  it("renews the requested connection without replacing its other provider data", async () => {
    const existing = {
      id: "connection-1",
      provider: "perplexity-web",
      authType: "cookie",
      name: "My account",
      providerSpecificData: {
        proxyPoolId: "pool-1",
        browserProfileId: "79b60200-c195-4db1-9dbd-ad8f17fb75e7",
        browserChannel: "msedge",
      },
    };
    mocks.getProviderConnectionById.mockResolvedValue(existing);
    mocks.updateProviderConnection.mockResolvedValue({ ...existing, id: "connection-1" });
    mocks.launchInstalledPersistentChromium.mockResolvedValue({
      context: fakeContext([cookie("__Secure-next-auth.session-token", "fresh", "perplexity.ai")]),
      channel: "msedge",
    });

    const started = await signin.startWebCookieSignin({
      provider: "perplexity-web",
      connectionId: "connection-1",
    });
    const completed = await waitForTerminal(started.flowId);

    expect(completed.connectionId).toBe("connection-1");
    expect(mocks.updateProviderConnection).toHaveBeenCalledWith("connection-1", expect.objectContaining({
      apiKey: "fresh",
      providerSpecificData: expect.objectContaining({
        proxyPoolId: "pool-1",
        browserChannel: "msedge",
      }),
    }));
    expect(mocks.launchInstalledPersistentChromium).toHaveBeenCalledWith(
      expect.any(String),
      { preferredChannel: "msedge" },
    );
    expect(mocks.createProviderConnection).not.toHaveBeenCalled();
  });

  it("serializes simultaneous starts so only one browser sign-in wins", async () => {
    const context = fakeContext([]);
    mocks.launchInstalledPersistentChromium.mockResolvedValue({ context, channel: "chrome" });

    const [first, second] = await Promise.allSettled([
      signin.startWebCookieSignin({ provider: "grok-web" }),
      signin.startWebCookieSignin({ provider: "perplexity-web" }),
    ]);

    expect(first.status).toBe("fulfilled");
    expect(second).toMatchObject({ status: "rejected", reason: { code: "SIGNIN_BUSY" } });
    await signin.cancelWebCookieSignin(first.value.flowId);
  });

  it("permits only one active sign-in and cancels with browser cleanup", async () => {
    const context = fakeContext([]);
    mocks.launchInstalledPersistentChromium.mockResolvedValue({ context, channel: "chrome" });

    const started = await signin.startWebCookieSignin({ provider: "grok-web" });
    for (let attempt = 0; attempt < 20 && !signin.__test__.flows.get(started.flowId)?.context; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    await expect(signin.startWebCookieSignin({ provider: "perplexity-web" }))
      .rejects.toMatchObject({ code: "SIGNIN_BUSY" });

    const cancelled = await signin.cancelWebCookieSignin(started.flowId);
    expect(cancelled).toMatchObject({ status: "cancelled", code: "SIGNIN_CANCELLED" });
    expect(context.close).toHaveBeenCalled();
  });

  it("reports a sanitized browser-unavailable failure", async () => {
    mocks.launchInstalledPersistentChromium.mockRejectedValue(
      new mockedBrowserRuntime.InstalledChromiumError(
        "Install Google Chrome or Microsoft Edge to use browser sign-in",
      ),
    );

    const started = await signin.startWebCookieSignin({ provider: "chatgpt-web" });
    const failed = await waitForTerminal(started.flowId);

    expect(failed).toMatchObject({ status: "failed", code: "BROWSER_UNAVAILABLE" });
    expect(failed.message).toContain("Install Google Chrome or Microsoft Edge");
    expect(failed).not.toHaveProperty("profileRoot");
  });

  it("keeps generated profile paths contained beneath the managed root", () => {
    const profileId = "79b60200-c195-4db1-9dbd-ad8f17fb75e7";
    const profile = signin.__test__.profilePath("chatgpt-web", profileId);
    expect(profile.startsWith(`${path.resolve(signin.__test__.PROFILE_ROOT)}${path.sep}`)).toBe(true);
    expect(() => signin.__test__.profilePath("chatgpt-web", "../escape")).toThrow("profile is invalid");
  });
});
