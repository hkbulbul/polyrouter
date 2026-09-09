import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  setInitialPasswordHash: vi.fn(),
  isLocalRequest: vi.fn(),
  hasValidCliToken: vi.fn(),
  recordInstallationTelemetry: vi.fn(),
  hash: vi.fn(),
}));

vi.mock("@/lib/db/index.js", () => ({
  getSettings: mocks.getSettings,
  setInitialPasswordHash: mocks.setInitialPasswordHash,
}));

vi.mock("@/dashboardGuard", () => ({
  isLocalRequest: mocks.isLocalRequest,
  hasValidCliToken: mocks.hasValidCliToken,
}));

vi.mock("bcryptjs", () => ({
  default: { hash: mocks.hash },
}));

vi.mock("@/shared/services/installationTelemetry", () => ({
  recordInstallationTelemetry: mocks.recordInstallationTelemetry,
}));

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

const { POST } = await import("../../src/app/api/auth/setup-password/route.js");

function setupRequest(body = {}) {
  return new Request("http://localhost:20128/api/auth/setup-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("setup password route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isLocalRequest.mockReturnValue(true);
    mocks.hasValidCliToken.mockResolvedValue(false);
    mocks.getSettings.mockResolvedValue({ password: null });
    mocks.hash.mockResolvedValue("bcrypt-hash");
    mocks.setInitialPasswordHash.mockResolvedValue(true);
  });

  it("rejects a non-local password setup request when password is configured", async () => {
    mocks.isLocalRequest.mockReturnValue(false);
    mocks.hasValidCliToken.mockResolvedValue(false);
    mocks.getSettings.mockResolvedValue({ password: "existing-hash" });

    const response = await POST(setupRequest({ password: "secure-pass" }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Password setup is local-only" });
  });

  it("allows non-local password setup on first run when no password exists", async () => {
    mocks.isLocalRequest.mockReturnValue(false);
    mocks.hasValidCliToken.mockResolvedValue(false);
    mocks.getSettings.mockResolvedValue({ password: null });

    const response = await POST(setupRequest({ password: "secure-pass" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(mocks.setInitialPasswordHash).toHaveBeenCalledWith("bcrypt-hash");
  });

  it("allows non-local password setup with valid CLI token", async () => {
    mocks.isLocalRequest.mockReturnValue(false);
    mocks.hasValidCliToken.mockResolvedValue(true);
    mocks.getSettings.mockResolvedValue({ password: "existing-hash" });

    const response = await POST(setupRequest({ password: "secure-pass" }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Password is already configured" });
  });

  it("requires a password of at least eight characters", async () => {
    const response = await POST(setupRequest({ password: "short" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Password must be at least 8 characters long" });
    expect(mocks.hash).not.toHaveBeenCalled();
  });

  it("rejects setup when a password is already configured", async () => {
    mocks.getSettings.mockResolvedValue({ password: "existing-hash" });

    const response = await POST(setupRequest({ password: "secure-pass" }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Password is already configured" });
    expect(mocks.hash).not.toHaveBeenCalled();
  });

  it("sets the first password atomically", async () => {
    const response = await POST(setupRequest({ password: "secure-pass" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ success: true });
    expect(mocks.hash).toHaveBeenCalledWith("secure-pass", 10);
    expect(mocks.setInitialPasswordHash).toHaveBeenCalledWith("bcrypt-hash");
    await vi.waitFor(() => {
      expect(mocks.recordInstallationTelemetry).toHaveBeenCalledWith("setup_complete");
    });
  });

  it("returns a conflict when another request wins the initial password write", async () => {
    mocks.setInitialPasswordHash.mockResolvedValue(false);

    const response = await POST(setupRequest({ password: "secure-pass" }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Password is already configured" });
  });

  it("returns a server error when persistence fails", async () => {
    mocks.getSettings.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(setupRequest({ password: "secure-pass" }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "database unavailable" });
  });
});
