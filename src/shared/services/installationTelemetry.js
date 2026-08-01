import crypto from "node:crypto";
import {
  getSettings,
  getOrCreateInstallationIdentity,
  enqueueInstallationTelemetryEvent,
  getPendingInstallationTelemetryEvents,
  acknowledgeInstallationTelemetryEvent,
  deferInstallationTelemetryEvent,
  discardInstallationTelemetryEvent,
  discardInstallationTelemetryEventsByTarget,
  getNextInstallationTelemetryAttemptAt,
} from "@/lib/db/index.js";

const REQUEST_TIMEOUT_MS = 4_000;
const MAX_EVENTS_PER_FLUSH = 20;
const PUBLIC_DISABLED_VALUES = new Set(["0", "false", "off", "no"]);

function getPrivateConfig() {
  const url = String(process.env.INSTALLATION_TELEMETRY_URL || "").trim();
  const ingestToken = String(process.env.INSTALLATION_TELEMETRY_INGEST_TOKEN || "").trim();
  const ipSalt = String(process.env.INSTALLATION_TELEMETRY_IP_SALT || "").trim();
  if (!url || !ingestToken || !ipSalt) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") return null;
    return { target: "private", url: parsed.href, ingestToken, ipSalt };
  } catch { return null; }
}

function getPublicConfig() {
  const url = String(process.env.PUBLIC_INSTALLATION_TELEMETRY_URL || "").trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    return { target: "public", url: parsed.href };
  } catch { return null; }
}

function isPublicTelemetryEnvDisabled() {
  return PUBLIC_DISABLED_VALUES.has(String(process.env.POLYROUTER_PUBLIC_TELEMETRY || "").trim().toLowerCase());
}

async function getConfig() {
  const privateConfig = getPrivateConfig();
  if (privateConfig) return privateConfig;
  if (isPublicTelemetryEnvDisabled()) return null;
  const settings = await getSettings();
  if (settings.publicTelemetryEnabled === false) return null;
  return getPublicConfig();
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
    const body = config.target === "public"
      ? {
          protocol_version: 1,
          installation_id: installationId,
          event_id: event.eventId,
          event_type: event.eventType,
          occurred_at: event.occurredAt,
          app_version: event.appVersion,
        }
      : {
          installation_id: installationId,
          event_id: event.eventId,
          event_type: event.eventType,
          occurred_at: event.occurredAt,
          app_version: event.appVersion,
          ...(event.ipHash ? { ip_hash: event.ipHash } : {}),
        };
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.ingestToken ? { Authorization: `Bearer ${config.ingestToken}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return { ok: response.ok, status: response.status };
  } finally { clearTimeout(timeout); }
}

let flushPromise = null;
let retryTimer = null;

function scheduleRetry(nextAttemptAt) {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  if (!nextAttemptAt) return;
  const delay = Math.min(2 ** 31 - 1, Math.max(0, new Date(nextAttemptAt).getTime() - Date.now()));
  retryTimer = setTimeout(() => { retryTimer = null; void flushInstallationTelemetry(); }, delay);
  if (typeof retryTimer.unref === "function") retryTimer.unref();
}

export async function flushInstallationTelemetry() {
  const config = await getConfig().catch(() => null);
  if (!config) return { delivered: 0, disabled: true };
  if (flushPromise) return flushPromise;
  flushPromise = (async () => {
    let delivered = 0;
    try {
      const identity = await getOrCreateInstallationIdentity();
      const events = await getPendingInstallationTelemetryEvents(MAX_EVENTS_PER_FLUSH, config.target);
      for (const event of events) {
        try {
          const result = await sendEvent(config, identity.installationId, event);
          if (result.ok) { await acknowledgeInstallationTelemetryEvent(event.eventId); delivered += 1; }
          else if (result.status >= 400 && result.status < 500 && result.status !== 429) await discardInstallationTelemetryEvent(event.eventId);
          else await deferInstallationTelemetryEvent(event.eventId, event.attempts + 1);
        } catch { await deferInstallationTelemetryEvent(event.eventId, event.attempts + 1); }
      }
    } catch { /* Telemetry must never affect app startup or login. */ }
    return { delivered, disabled: false };
  })().finally(async () => {
    flushPromise = null;
    try { scheduleRetry(await getNextInstallationTelemetryAttemptAt(config.target)); } catch { /* best effort */ }
  });
  return flushPromise;
}

export async function recordInstallationTelemetry(eventType, { ip } = {}) {
  const config = await getConfig().catch(() => null);
  if (!config) return { disabled: true };
  try {
    const identity = await getOrCreateInstallationIdentity();
    // Private operator configuration is authoritative and must not later fall back to
    // stale public events when those variables are removed.
    if (config.target === "private") await discardInstallationTelemetryEventsByTarget("public");
    await enqueueInstallationTelemetryEvent({
      eventId: crypto.randomUUID(), eventType, occurredAt: new Date().toISOString(),
      appVersion: getAppVersion(), target: config.target,
      ipHash: config.target === "private" ? hashIp(ip, config.ipSalt) : null,
    });
    void flushInstallationTelemetry();
    return { installationId: identity.installationId, created: identity.created, disabled: false, target: config.target };
  } catch { return { disabled: false, queued: false }; }
}

export async function recordStartupTelemetry() {
  try {
    const identity = await getOrCreateInstallationIdentity();
    const config = await getConfig();
    if (!config) return { installationId: identity.installationId, created: identity.created, disabled: true };
    if (identity.created) await recordInstallationTelemetry("installed");
    return await recordInstallationTelemetry("startup");
  } catch { return { disabled: false, queued: false }; }
}

export async function setPublicTelemetryEnabled(enabled) {
  if (enabled !== false) return { enabled: true };
  await discardInstallationTelemetryEventsByTarget("public");
  return { enabled: false };
}

export const __test__ = { getConfig, getPrivateConfig, getPublicConfig, hashIp, isPublicTelemetryEnvDisabled };
