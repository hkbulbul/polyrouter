import crypto from "node:crypto";
import {
  getOrCreateInstallationIdentity,
  enqueueInstallationTelemetryEvent,
  getPendingInstallationTelemetryEvents,
  acknowledgeInstallationTelemetryEvent,
  deferInstallationTelemetryEvent,
  discardInstallationTelemetryEvent,
  getNextInstallationTelemetryAttemptAt,
} from "@/lib/db/index.js";

const REQUEST_TIMEOUT_MS = 4_000;
const MAX_EVENTS_PER_FLUSH = 20;

function getConfig() {
  const url = String(process.env.INSTALLATION_TELEMETRY_URL || "").trim();
  const ingestToken = String(process.env.INSTALLATION_TELEMETRY_INGEST_TOKEN || "").trim();
  const ipSalt = String(process.env.INSTALLATION_TELEMETRY_IP_SALT || "").trim();
  if (!url || !ingestToken || !ipSalt) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") return null;
    return { url: parsed.href, ingestToken, ipSalt };
  } catch {
    return null;
  }
}

function getAppVersion() {
  return process.env.npm_package_version || process.env.POLYROUTER_VERSION || null;
}

function hashIp(ip, salt) {
  const normalized = typeof ip === "string" ? ip.trim().toLowerCase() : "";
  if (!normalized || normalized === "unknown") return null;
  return crypto.createHmac("sha256", salt).update(normalized).digest("hex");
}

async function sendEvent(config, installationId, event) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.ingestToken}`,
      },
      body: JSON.stringify({
        installation_id: installationId,
        event_id: event.eventId,
        event_type: event.eventType,
        occurred_at: event.occurredAt,
        app_version: event.appVersion,
        ...(event.ipHash ? { ip_hash: event.ipHash } : {}),
      }),
      signal: controller.signal,
    });
    return { ok: response.ok, status: response.status };
  } finally {
    clearTimeout(timeout);
  }
}

let flushPromise = null;
let retryTimer = null;

function scheduleRetry(nextAttemptAt) {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  if (!nextAttemptAt) return;
  const delay = Math.min(2 ** 31 - 1, Math.max(0, new Date(nextAttemptAt).getTime() - Date.now()));
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flushInstallationTelemetry();
  }, delay);
  if (typeof retryTimer.unref === "function") retryTimer.unref();
}

export async function flushInstallationTelemetry() {
  const config = getConfig();
  if (!config) return { delivered: 0, disabled: true };
  if (flushPromise) return flushPromise;

  flushPromise = (async () => {
    let delivered = 0;
    try {
      const identity = await getOrCreateInstallationIdentity();
      const events = await getPendingInstallationTelemetryEvents(MAX_EVENTS_PER_FLUSH);
      for (const event of events) {
        try {
          const result = await sendEvent(config, identity.installationId, event);
          if (result.ok) {
            await acknowledgeInstallationTelemetryEvent(event.eventId);
            delivered += 1;
          } else if (result.status >= 400 && result.status < 500 && result.status !== 429) {
            await discardInstallationTelemetryEvent(event.eventId);
            console.warn(`[Telemetry] Discarded ${event.eventType} event after HTTP ${result.status}; check telemetry configuration and event schema.`);
          } else {
            await deferInstallationTelemetryEvent(event.eventId, event.attempts + 1);
          }
        } catch {
          await deferInstallationTelemetryEvent(event.eventId, event.attempts + 1);
          console.warn(`[Telemetry] Deferred ${event.eventType} event after a delivery error; it will retry automatically.`);
        }
      }
    } catch {
      // Telemetry is intentionally fail-open: app startup and login must continue.
    }
    return { delivered, disabled: false };
  })().finally(async () => {
    flushPromise = null;
    try {
      scheduleRetry(await getNextInstallationTelemetryAttemptAt());
    } catch {
      // Queue inspection is best effort and must not affect application behavior.
    }
  });

  return flushPromise;
}

export async function recordInstallationTelemetry(eventType, { ip } = {}) {
  const config = getConfig();
  if (!config) return { disabled: true };

  try {
    const identity = await getOrCreateInstallationIdentity();
    const event = {
      eventId: crypto.randomUUID(),
      eventType,
      occurredAt: new Date().toISOString(),
      appVersion: getAppVersion(),
      ipHash: hashIp(ip, config.ipSalt),
    };
    await enqueueInstallationTelemetryEvent(event);
    void flushInstallationTelemetry();
    return { installationId: identity.installationId, created: identity.created, disabled: false };
  } catch {
    return { disabled: false, queued: false };
  }
}

export async function recordStartupTelemetry() {
  try {
    const identity = await getOrCreateInstallationIdentity();
    if (!getConfig()) return { installationId: identity.installationId, created: identity.created, disabled: true };
    if (identity.created) await recordInstallationTelemetry("installed");
    return await recordInstallationTelemetry("startup");
  } catch {
    return { disabled: false, queued: false };
  }
}

export const __test__ = { getConfig, hashIp };
