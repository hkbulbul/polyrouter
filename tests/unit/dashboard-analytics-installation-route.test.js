import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  getOrCreateInstallationIdentity: vi.fn(),
}));

vi.mock("@/lib/db/index.js", () => mocks);
vi.mock("next/server", () => ({
  NextResponse: {
    json(body, init = {}) {
      return new Response(JSON.stringify(body), {
        status: init.status || 200,
        headers: { "Content-Type": "application/json", ...init.headers },
      });
    },
  },
}));

const originalEnv = { ...process.env };
const { GET } = await import("../../src/app/api/analytics/installation/route.js");

describe("dashboard analytics installation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.POLYROUTER_PUBLIC_TELEMETRY;
    mocks.getSettings.mockResolvedValue({ publicTelemetryEnabled: true });
    mocks.getOrCreateInstallationIdentity.mockResolvedValue({ installationId: "123e4567-e89b-42d3-a456-426614174000" });
  });

  it("returns only the opaque installation identifier while enabled", async () => {
    const response = await GET();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ enabled: true, installationId: "123e4567-e89b-42d3-a456-426614174000" });
  });

  it("does not expose an identifier after local opt-out", async () => {
    mocks.getSettings.mockResolvedValue({ publicTelemetryEnabled: false });
    const response = await GET();
    expect(await response.json()).toEqual({ enabled: false });
    expect(mocks.getOrCreateInstallationIdentity).not.toHaveBeenCalled();
  });

  it("honors the headless environment opt-out", async () => {
    process.env.POLYROUTER_PUBLIC_TELEMETRY = "false";
    const response = await GET();
    expect(await response.json()).toEqual({ enabled: false });
    expect(mocks.getOrCreateInstallationIdentity).not.toHaveBeenCalled();
  });
});

afterAll(() => {
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
});
