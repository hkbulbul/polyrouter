import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  updateSettings: vi.fn(),
  clearAllLocks: vi.fn(),
  genSalt: vi.fn(),
  hash: vi.fn(),
}));

vi.mock("@/lib/localDb", () => ({
  updateSettings: mocks.updateSettings,
}));

vi.mock("@/lib/auth/loginLimiter", () => ({
  clearAllLocks: mocks.clearAllLocks,
}));

vi.mock("bcryptjs", () => ({
  default: {
    genSalt: mocks.genSalt,
    hash: mocks.hash,
  },
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

const { POST } = await import("../../src/app/api/auth/reset-password/route.js");

function resetRequest(body) {
  if (!body) {
    return new Request("http://localhost:20128/api/auth/reset-password", {
      method: "POST",
    });
  }
  return new Request("http://localhost:20128/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("reset password route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.genSalt.mockResolvedValue("salt");
    mocks.hash.mockResolvedValue("bcrypt-hash-123456");
    mocks.updateSettings.mockResolvedValue({});
  });

  it("resets password to default 123456 and clears locks when no body is provided", async () => {
    const response = await POST(resetRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, defaultPassword: "123456" });
    expect(mocks.hash).toHaveBeenCalledWith("123456", "salt");
    expect(mocks.updateSettings).toHaveBeenCalledWith({ password: "bcrypt-hash-123456" });
    expect(mocks.clearAllLocks).toHaveBeenCalled();
  });

  it("resets password to a custom password if specified", async () => {
    mocks.hash.mockResolvedValue("bcrypt-hash-custom");

    const response = await POST(resetRequest({ password: "custompassword123" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(mocks.hash).toHaveBeenCalledWith("custompassword123", "salt");
    expect(mocks.updateSettings).toHaveBeenCalledWith({ password: "bcrypt-hash-custom" });
    expect(mocks.clearAllLocks).toHaveBeenCalled();
  });

  it("handles errors gracefully and returns 500", async () => {
    mocks.updateSettings.mockRejectedValue(new Error("db failure"));

    const response = await POST(resetRequest());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "db failure" });
  });
});
