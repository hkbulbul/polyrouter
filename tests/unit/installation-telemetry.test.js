import crypto from "node:crypto";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOrCreateInstallationIdentity: vi.fn(),
  enqueueInstallationTelemetryEvent: vi.fn(),
  getPendingInstallationTelemetryEvents: vi.fn(),
  acknowledgeInstallationTelemetryEvent: vi.fn(),
  deferInstallationTelemetryEvent: vi.fn(),
  discardInstallationTelemetryEvent: vi.fn(),
  getNextInstallationTelemetryAttemptAt: vi.fn(),
}));

vi.mock("@/lib/db/index.js", () => mocks);

const originalEnv = { ...process.env };
const originalFetch = global.fetch;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  process.env.INSTALLATION_TELEMETRY_URL = "https://telemetry.example.test/ingest";
  process.env.INSTALLATION_TELEMETRY_INGEST_TOKEN = "test-ingest-token";
  process.env.INSTALLATION_TELEMETRY_IP_SALT = "test-ip-salt";
  mocks.getOrCreateInstallationIdentity.mockResolvedValue({
    installationId: "123e4567-e89b-42d3-a456-426614174000",
    created: false,
  });
  mocks.getPendingInstallationTelemetryEvents.mockResolvedValue([]);
  mocks.getNextInstallationTelemetryAttemptAt.mockResolvedValue(null);
  global.fetch = vi.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
});

describe("installation telemetry privacy", () => {
  it("requires all server-only telemetry configuration", async () => {
    delete process.env.INSTALLATION_TELEMETRY_IP_SALT;
    const { __test__ } = await import("@/shared/services/installationTelemetry.js");
    expect(__test__.getConfig()).toBeNull();
  });

  it("uses HMAC hashing rather than retaining a raw IP", async () => {
    const { __test__ } = await import("@/shared/services/installationTelemetry.js");
    const actual = __test__.hashIp("203.0.113.42", process.env.INSTALLATION_TELEMETRY_IP_SALT);
    const expected = crypto.createHmac("sha256", process.env.INSTALLATION_TELEMETRY_IP_SALT).update("203.0.113.42").digest("hex");
    expect(actual).toBe(expected);
    expect(actual).not.toContain("203.0.113.42");
    expect(__test__.hashIp("unknown", process.env.INSTALLATION_TELEMETRY_IP_SALT)).toBeNull();
  });
});

describe("installation telemetry delivery", () => {
  it("delivers setup_complete events accepted by the Supabase contract", async () => {
    const event = {
      eventId: "123e4567-e89b-42d3-a456-426614174001",
      eventType: "setup_complete",
      occurredAt: "2026-08-01T00:00:00.000Z",
      appVersion: "1.0.6",
      ipHash: null,
      attempts: 0,
    };
    mocks.getPendingInstallationTelemetryEvents.mockResolvedValue([event]);
    global.fetch.mockResolvedValue(new Response("", { status: 202 }));

    const { flushInstallationTelemetry } = await import("@/shared/services/installationTelemetry.js");
    await flushInstallationTelemetry();

    expect(global.fetch).toHaveBeenCalledWith(
      "https://telemetry.example.test/ingest",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-ingest-token" }),
        body: expect.stringContaining('"event_type":"setup_complete"'),
      })
    );
    expect(mocks.acknowledgeInstallationTelemetryEvent).toHaveBeenCalledWith(event.eventId);
    expect(mocks.deferInstallationTelemetryEvent).not.toHaveBeenCalled();
  });

  it("drops non-retryable receiver errors instead of retrying forever", async () => {
    const event = {
      eventId: "123e4567-e89b-42d3-a456-426614174002",
      eventType: "dashboard_login",
      occurredAt: "2026-08-01T00:00:00.000Z",
      appVersion: null,
      ipHash: null,
      attempts: 0,
    };
    mocks.getPendingInstallationTelemetryEvents.mockResolvedValue([event]);
    global.fetch.mockResolvedValue(new Response("", { status: 401 }));
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const { flushInstallationTelemetry } = await import("@/shared/services/installationTelemetry.js");
    await flushInstallationTelemetry();

    expect(mocks.discardInstallationTelemetryEvent).toHaveBeenCalledWith(event.eventId);
    expect(mocks.deferInstallationTelemetryEvent).not.toHaveBeenCalled();
  });
});
