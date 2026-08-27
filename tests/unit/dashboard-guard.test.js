import fs from "fs";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => {
  const nextResponse = Symbol("next");
  return {
    nextResponse,
    next: vi.fn(() => nextResponse),
    jsonResponse: vi.fn((body, init) => ({
      status: init?.status || 200,
      body,
    })),
    getSettings: vi.fn(),
    validateApiKey: vi.fn(),
    getConsistentMachineId: vi.fn(),
    verifyDashboardAuthToken: vi.fn(),
  };
});

vi.mock("next/server", () => ({
  NextResponse: {
    next: mocks.next,
    json: mocks.jsonResponse,
    redirect: vi.fn((url) => ({ status: 307, url })),
  },
}));

vi.mock("@/lib/localDb", () => ({
  getSettings: mocks.getSettings,
  validateApiKey: mocks.validateApiKey,
}));

vi.mock("@/shared/utils/machineId", () => ({
  getConsistentMachineId: mocks.getConsistentMachineId,
}));

vi.mock("@/lib/auth/dashboardSession", () => ({
  verifyDashboardAuthToken: mocks.verifyDashboardAuthToken,
}));

const { proxy, __test__ } = await import("../../src/dashboardGuard.js");
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_LOCALITY_SECRET = process.env.LOCALITY_INTERNAL_SECRET;
const LOCALITY_SECRET = "locality-secret";

function request(pathname, headers = {}, method = "GET") {
  const normalizedHeaders = new Headers(headers);
  return {
    method,
    nextUrl: { pathname, searchParams: new URL(`http://localhost${pathname}`).searchParams },
    headers: normalizedHeaders,
    cookies: { get: vi.fn(() => undefined) },
    url: `http://localhost${pathname}`,
  };
}

function trustedHeaders(realIp = "127.0.0.1", headers = {}) {
  return {
    host: "localhost:20128",
    origin: "http://localhost:20128",
    "x-9r-real-ip": realIp,
    "x-9r-locality-proof": LOCALITY_SECRET,
    ...headers,
  };
}

beforeEach(() => {
  process.env.NODE_ENV = "test";
  process.env.LOCALITY_INTERNAL_SECRET = LOCALITY_SECRET;
});

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  if (ORIGINAL_LOCALITY_SECRET === undefined) delete process.env.LOCALITY_INTERNAL_SECRET;
  else process.env.LOCALITY_INTERNAL_SECRET = ORIGINAL_LOCALITY_SECRET;
});

describe("dashboard guard public LLM API access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSettings.mockResolvedValue({ requireLogin: true });
    mocks.validateApiKey.mockResolvedValue(false);
    mocks.getConsistentMachineId.mockResolvedValue("cli-token");
    mocks.verifyDashboardAuthToken.mockResolvedValue(false);
  });

  it("rejects unstamped loopback public LLM API without API key", async () => {
    const response = await proxy(request("/v1/chat/completions", { host: "localhost:20128" }));

    expect(response.status).toBe(401);
  });

  it("rejects remote Host-spoof when real peer IP is non-loopback", async () => {
    const response = await proxy(request("/v1/chat/completions", {
      host: "localhost",
      "x-9r-real-ip": "10.204.111.34",
      "x-9r-locality-proof": LOCALITY_SECRET,
    }));

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("API key required for remote API access");
  });

  it("allows loopback peer IP regardless of Host", async () => {
    const response = await proxy(request("/v1/chat/completions", trustedHeaders()));

    expect(response).toBe(mocks.nextResponse);
    expect(mocks.validateApiKey).not.toHaveBeenCalled();
  });

  it("rejects remote rewritten public LLM API without API key", async () => {
    const response = await proxy(request("/api/v1/chat/completions", { host: "router.example.com" }));

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("API key required for remote API access");
  });

  it("rejects unstamped rewritten public LLM API without API key", async () => {
    const response = await proxy(request("/api/v1/chat/completions", { host: "localhost:20128" }));

    expect(response.status).toBe(401);
  });

  it("rejects remote beta public LLM API without API key", async () => {
    const response = await proxy(request("/v1beta/models", { host: "router.example.com" }));

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("API key required for remote API access");
  });

  it("rejects remote rewritten beta public LLM API without API key", async () => {
    const response = await proxy(request("/api/v1beta/models", { host: "router.example.com" }));

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("API key required for remote API access");
  });

  it("rejects remote codex rewrite without API key", async () => {
    const response = await proxy(request("/codex/x", { host: "router.example.com" }));

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("API key required for remote API access");
  });

  it("allows remote codex rewrite with valid API key", async () => {
    mocks.validateApiKey.mockResolvedValue(true);

    const response = await proxy(request("/codex/x", {
      host: "router.example.com",
      authorization: "Bearer sk-valid",
    }));

    expect(response).toBe(mocks.nextResponse);
    expect(mocks.validateApiKey).toHaveBeenCalledWith("sk-valid");
  });

  it("allows remote public LLM API with valid bearer API key", async () => {
    mocks.validateApiKey.mockResolvedValue(true);

    const response = await proxy(request("/api/v1/chat/completions", {
      host: "router.example.com",
      authorization: "Bearer sk-valid",
    }));

    expect(response).toBe(mocks.nextResponse);
    expect(mocks.validateApiKey).toHaveBeenCalledWith("sk-valid");
  });

  it("allows remote public LLM API with valid x-api-key", async () => {
    mocks.validateApiKey.mockResolvedValue(true);

    const response = await proxy(request("/v1/web/fetch", {
      host: "router.example.com",
      "x-api-key": "sk-valid",
    }));

    expect(response).toBe(mocks.nextResponse);
    expect(mocks.validateApiKey).toHaveBeenCalledWith("sk-valid");
  });

  it("allows remote rewritten beta public LLM API with valid API key", async () => {
    mocks.validateApiKey.mockResolvedValue(true);

    const response = await proxy(request("/api/v1beta/models", {
      host: "router.example.com",
      "x-api-key": "sk-valid",
    }));

    expect(response).toBe(mocks.nextResponse);
    expect(mocks.validateApiKey).toHaveBeenCalledWith("sk-valid");
  });

  it("allows remote beta public LLM API with valid Google API key header", async () => {
    mocks.validateApiKey.mockResolvedValue(true);

    const response = await proxy(request("/v1beta/models", {
      host: "router.example.com",
      "x-goog-api-key": "sk-valid",
    }));

    expect(response).toBe(mocks.nextResponse);
    expect(mocks.validateApiKey).toHaveBeenCalledWith("sk-valid");
  });

  it("allows remote beta public LLM API with valid Google key query parameter", async () => {
    mocks.validateApiKey.mockResolvedValue(true);

    const response = await proxy(request("/v1beta/models?key=sk-valid", {
      host: "router.example.com",
    }));

    expect(response).toBe(mocks.nextResponse);
    expect(mocks.validateApiKey).toHaveBeenCalledWith("sk-valid");
  });
});

describe("dashboard guard local-only access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSettings.mockResolvedValue({ requireLogin: true });
    mocks.validateApiKey.mockResolvedValue(false);
    mocks.getConsistentMachineId.mockResolvedValue("cli-token");
    mocks.verifyDashboardAuthToken.mockResolvedValue(false);
  });

  it.each(["GET", "POST", "DELETE"])("rejects remote Web Cookie browser sign-in %s access", async (method) => {
    mocks.getSettings.mockResolvedValue({ requireLogin: false });

    const response = await proxy(request("/api/oauth/web-cookie/browser?flowId=test", {
      host: "router.example.com",
      origin: "https://router.example.com",
    }, method));

    expect(response.status).toBe(403);
  });

  it("rejects connector cookie import from an unstamped request", async () => {
    mocks.getSettings.mockResolvedValue({ requireLogin: false });

    const response = await proxy(request("/api/oauth/chatgpt-web/cookie", {
      host: "localhost:20128",
    }, "POST"));

    expect(response.status).toBe(403);
  });

  it("allows trusted local connector cookie import", async () => {
    mocks.getSettings.mockResolvedValue({ requireLogin: false });

    const response = await proxy(request("/api/oauth/chatgpt-web/cookie", trustedHeaders(), "POST"));

    expect(response).toBe(mocks.nextResponse);
  });

  it("rejects Web Cookie browser sign-in with an evil Origin", async () => {
    mocks.getSettings.mockResolvedValue({ requireLogin: false });

    const response = await proxy(request("/api/oauth/web-cookie/browser", {
      ...trustedHeaders(),
      origin: "https://evil.example.com",
    }, "POST"));

    expect(response.status).toBe(403);
  });

  it("rejects Web Cookie browser sign-in through a local reverse proxy", async () => {
    mocks.getSettings.mockResolvedValue({ requireLogin: false });

    const response = await proxy(request("/api/oauth/web-cookie/browser", trustedHeaders("127.0.0.1", {
      "x-9r-via-proxy": "1",
    }), "POST"));

    expect(response.status).toBe(403);
  });

  it.each(["GET", "POST", "DELETE"])("allows trusted local Web Cookie browser sign-in %s access", async (method) => {
    mocks.getSettings.mockResolvedValue({ requireLogin: false });

    const response = await proxy(request("/api/oauth/web-cookie/browser", trustedHeaders(), method));

    expect(response).toBe(mocks.nextResponse);
  });

  it("allows remote Web Cookie browser sign-in with a valid CLI token", async () => {
    const response = await proxy(request("/api/oauth/web-cookie/browser", {
      host: "router.example.com",
      "x-9r-cli-token": "cli-token",
    }, "POST"));

    expect(response).toBe(mocks.nextResponse);
  });

  it("rejects local-only route from non-loopback host without CLI token", async () => {
    const response = await proxy(request("/api/mcp/filesystem/sse", {
      host: "router.example.com",
    }));

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Local only: CLI token required");
  });

  it.each(["GET", "POST", "DELETE"])("rejects forged production Command Code %s access", async (method) => {
    process.env.NODE_ENV = "production";
    mocks.getSettings.mockResolvedValue({ requireLogin: false });

    const response = await proxy(request("/api/cli-tools/commandcode-settings", {
      host: "localhost:20128",
      origin: "http://localhost:20128",
      "x-9r-real-ip": "127.0.0.1",
    }, method));

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Local only: CLI token required");
  });

  it("rejects an invalid production locality proof", async () => {
    process.env.NODE_ENV = "production";
    mocks.getSettings.mockResolvedValue({ requireLogin: false });

    const response = await proxy(request("/api/cli-tools/commandcode-settings", {
      ...trustedHeaders(),
      "x-9r-locality-proof": "forged",
    }));

    expect(response.status).toBe(403);
  });

  it("allows trusted local Command Code access when dashboard login is disabled", async () => {
    process.env.NODE_ENV = "production";
    mocks.getSettings.mockResolvedValue({ requireLogin: false });

    const response = await proxy(request("/api/cli-tools/commandcode-settings", trustedHeaders()));

    expect(response).toBe(mocks.nextResponse);
  });

  it("rejects local-only route on loopback when requireLogin=true and no JWT", async () => {
    const response = await proxy(request("/api/mcp/filesystem/sse", {
      host: "localhost:20128",
      origin: "http://localhost:20128",
    }));

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Local only: CLI token required");
  });

  it("rejects unstamped local-only route even when requireLogin=false", async () => {
    mocks.getSettings.mockResolvedValue({ requireLogin: false });

    const response = await proxy(request("/api/cli-tools/antigravity-mitm", {
      host: "localhost:20128",
      origin: "http://localhost:20128",
    }));

    expect(response.status).toBe(403);
  });

  it("allows a local-only route from a native IPv6 loopback peer", async () => {
    mocks.getSettings.mockResolvedValue({ requireLogin: false });

    const response = await proxy(request("/api/cli-tools/antigravity-mitm", trustedHeaders("::1")));

    expect(response).toBe(mocks.nextResponse);
  });

  it("allows a local-only route from an IPv4-mapped loopback peer", async () => {
    mocks.getSettings.mockResolvedValue({ requireLogin: false });

    const response = await proxy(request("/api/cli-tools/antigravity-mitm", trustedHeaders("::ffff:127.0.0.1")));

    expect(response).toBe(mocks.nextResponse);
  });

  it("rejects bracketed IPv6 loopback without a stamped peer", async () => {
    mocks.getSettings.mockResolvedValue({ requireLogin: false });

    const response = await proxy(request("/api/cli-tools/antigravity-mitm", {
      host: "[::1]:20128",
      origin: "http://[::1]:20128",
    }));

    expect(response.status).toBe(403);
  });

  it("rejects a remote IPv6 peer despite localhost headers", async () => {
    mocks.getSettings.mockResolvedValue({ requireLogin: false });

    const response = await proxy(request("/api/cli-tools/antigravity-mitm", trustedHeaders("2001:db8::1")));

    expect(response.status).toBe(403);
  });

  it("rejects a forwarded request even when its socket peer is IPv6 loopback", async () => {
    mocks.getSettings.mockResolvedValue({ requireLogin: false });

    const response = await proxy(request("/api/cli-tools/antigravity-mitm", trustedHeaders("::1", {
      "x-9r-via-proxy": "1",
    })));

    expect(response.status).toBe(403);
  });

  it("rejects local-only route from tunnel host even when requireLogin=false", async () => {
    mocks.getSettings.mockResolvedValue({ requireLogin: false });

    const response = await proxy(request("/api/cli-tools/antigravity-mitm", {
      host: "router.example.com",
    }));

    expect(response.status).toBe(403);
  });

  it("rejects local-only route when Origin is non-loopback (CSRF block)", async () => {
    mocks.getSettings.mockResolvedValue({ requireLogin: false });

    const response = await proxy(request("/api/cli-tools/antigravity-mitm", {
      host: "localhost:20128",
      origin: "http://evil.example.com",
    }));

    expect(response.status).toBe(403);
  });

  it("allows remote Command Code access with a valid CLI token", async () => {
    process.env.NODE_ENV = "production";

    const response = await proxy(request("/api/cli-tools/commandcode-settings", {
      host: "router.example.com",
      "x-9r-cli-token": "cli-token",
    }));

    expect(response).toBe(mocks.nextResponse);
  });

  it("rejects unproven internal locality headers during development", async () => {
    mocks.getSettings.mockResolvedValue({ requireLogin: false });

    const response = await proxy(request("/api/cli-tools/commandcode-settings", {
      host: "localhost:20128",
      origin: "http://localhost:20128",
      "x-9r-real-ip": "127.0.0.1",
    }));

    expect(response.status).toBe(403);
  });

  it("strips locality proof before continuing", async () => {
    mocks.getSettings.mockResolvedValue({ requireLogin: false });

    await proxy(request("/api/cli-tools/commandcode-settings", trustedHeaders()));

    const forwarded = mocks.next.mock.calls.at(-1)[0].request.headers;
    expect(forwarded.get("x-9r-locality-proof")).toBeNull();
    expect(forwarded.get("x-9r-real-ip")).toBe("127.0.0.1");
  });

  it("allows setup-password through the public API allowlist for route-level checks", async () => {
    const response = await proxy(request("/api/auth/setup-password", {
      host: "router.example.com",
    }));

    expect(response).toBe(mocks.nextResponse);
  });
});

describe("production entrypoints", () => {
  it("routes Node and Bun production starts through custom-server", () => {
    const packageJson = JSON.parse(fs.readFileSync(new URL("../../package.json", import.meta.url), "utf8"));

    expect(packageJson.scripts.start).toBe("node custom-server.js --production");
    expect(packageJson.scripts["start:bun"]).toBe("bun custom-server.js --production");
  });
});

describe("dashboard guard helpers", () => {
  it("extracts bearer API keys before x-api-key", () => {
    const apiRequest = request("/v1/chat/completions", {
      authorization: "Bearer bearer-key",
      "x-api-key": "header-key",
    });

    expect(__test__.extractApiKey(apiRequest)).toBe("bearer-key");
  });

  it("extracts Google API keys after x-api-key", () => {
    const apiRequest = request("/v1beta/models?key=query-key", {
      "x-api-key": "header-key",
      "x-goog-api-key": "google-key",
    });

    expect(__test__.extractApiKey(apiRequest)).toBe("header-key");
  });
});
