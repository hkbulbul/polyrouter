import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ validateApiKey: vi.fn() }));

vi.mock("@/lib/localDb", () => ({ validateApiKey: mocks.validateApiKey }));

function request(body, apiKey = "valid-key") {
  return new Request("http://localhost/api/realtime/tickets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("realtime ticket endpoint", () => {
  beforeEach(() => {
    process.env.REALTIME_INTERNAL_SECRET = "test-realtime-route-secret";
    mocks.validateApiKey.mockReset();
  });

  afterEach(() => {
    delete process.env.REALTIME_INTERNAL_SECRET;
  });

  it("requires an active PolyRouter API key", async () => {
    mocks.validateApiKey.mockResolvedValue(false);
    const { POST } = await import("../../src/app/api/realtime/tickets/route.js");
    const response = await POST(request({ origin: "https://voice.example.com" }, "invalid-key"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Valid PolyRouter API key required" });
  });

  it("issues a scoped ticket for a supported realtime model", async () => {
    mocks.validateApiKey.mockResolvedValue(true);
    const { POST } = await import("../../src/app/api/realtime/tickets/route.js");
    const response = await POST(request({
      provider: "codex",
      model: "gpt-realtime-2",
      origin: "https://voice.example.com",
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ticket).toMatch(/^[^.]+\.[^.]+$/);
    expect(body.provider).toBe("codex");
    expect(body.model).toBe("gpt-realtime-2");
  });

  it("rejects unsupported ticket scope", async () => {
    mocks.validateApiKey.mockResolvedValue(true);
    const { POST } = await import("../../src/app/api/realtime/tickets/route.js");
    const response = await POST(request({
      provider: "codex",
      model: "not-a-realtime-model",
      origin: "https://voice.example.com",
    }));
    expect(response.status).toBe(400);
  });
});
