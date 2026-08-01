import crypto from "node:crypto";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  getOrCreateInstallationIdentity: vi.fn(),
  enqueueInstallationTelemetryEvent: vi.fn(),
  getPendingInstallationTelemetryEvents: vi.fn(),
  acknowledgeInstallationTelemetryEvent: vi.fn(),
  deferInstallationTelemetryEvent: vi.fn(),
  discardInstallationTelemetryEvent: vi.fn(),
  discardInstallationTelemetryEventsByTarget: vi.fn(),
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
  process.env.PUBLIC_INSTALLATION_TELEMETRY_URL = "https://public-telemetry.example.test/ingest";
  process.env.POLYROUTER_PUBLIC_TELEMETRY = "true";
  mocks.getSettings.mockResolvedValue({ publicTelemetryEnabled: true });
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
    expect(__test__.getPrivateConfig()).toBeNull();
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

describe("public installation telemetry", () => {
  it("uses the public endpoint without sending private telemetry fields", async () => {
    delete process.env.INSTALLATION_TELEMETRY_URL;
    delete process.env.INSTALLATION_TELEMETRY_INGEST_TOKEN;
    delete process.env.INSTALLATION_TELEMETRY_IP_SALT;
    mocks.getPendingInstallationTelemetryEvents.mockResolvedValue([{
      eventId: "123e4567-e89b-42d3-a456-426614174003",
      eventType: "startup",
      occurredAt: "2026-08-01T00:00:00.000Z",
      appVersion: "1.0.7",
      ipHash: null,
      attempts: 0,
      target: "public",
    }]);
    global.fetch.mockResolvedValue(new Response("", { status: 202 }));

    const { flushInstallationTelemetry } = await import("@/shared/services/installationTelemetry.js");
    await flushInstallationTelemetry();

    expect(global.fetch).toHaveBeenCalledWith(
      "https://public-telemetry.example.test/ingest",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining('"protocol_version":1'),
      })
    );
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body).not.toHaveProperty("ip_hash");
    expect(body).not.toHaveProperty("machine_id");
  });

  it("honors the public telemetry environment opt-out", async () => {
    delete process.env.INSTALLATION_TELEMETRY_URL;
    delete process.env.INSTALLATION_TELEMETRY_INGEST_TOKEN;
    delete process.env.INSTALLATION_TELEMETRY_IP_SALT;
    process.env.POLYROUTER_PUBLIC_TELEMETRY = "false";
    const { __test__ } = await import("@/shared/services/installationTelemetry.js");
    await expect(__test__.getConfig()).resolves.toBeNull();
  });

  it("purges queued public events when opted out", async () => {
    const { setPublicTelemetryEnabled } = await import("@/shared/services/installationTelemetry.js");
    await setPublicTelemetryEnabled(false);
    expect(mocks.discardInstallationTelemetryEventsByTarget).toHaveBeenCalledWith("public");
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
