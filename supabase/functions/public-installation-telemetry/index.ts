import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_EVENT_TYPES = new Set(["installed", "startup", "setup_complete", "dashboard_login"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VERSION = /^v?\d+\.\d+\.\d+(?:[-+][0-9a-z.-]+)?$/i;
const MAX_BODY_BYTES = 2_048;
const MAX_CLOCK_SKEW_MS = 24 * 60 * 60 * 1_000;
const IP_LIMIT_PER_HOUR = 30;
const INSTALLATION_LIMIT_PER_HOUR = 12;

function json(status: number, body: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getClientIp(request: Request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

async function consumeRateLimit(supabase: ReturnType<typeof createClient>, key: string, limit: number) {
  const now = new Date();
  const bucketStart = new Date(now);
  bucketStart.setUTCMinutes(0, 0, 0);
  const { data, error } = await supabase.rpc("consume_public_installation_telemetry_rate_limit", {
    p_rate_key: key,
    p_bucket_start: bucketStart.toISOString(),
    p_expires_at: new Date(bucketStart.getTime() + 48 * 60 * 60 * 1_000).toISOString(),
    p_limit: limit,
  });
  return !error && data === true;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json(405, { error: "method_not_allowed" });
  // The app sends from its local server, never a browser. Reject browser origins
  // rather than exposing a cross-origin collection endpoint.
  if (request.headers.has("origin")) return json(403, { error: "forbidden" });
  const length = Number(request.headers.get("content-length") || 0);
  if (!Number.isFinite(length) || length > MAX_BODY_BYTES) return json(413, { error: "request_too_large" });

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) return json(413, { error: "request_too_large" });

  let body: Record<string, unknown>;
  try { body = JSON.parse(rawBody); } catch { return json(400, { error: "invalid_event" }); }
  const allowedFields = new Set(["protocol_version", "installation_id", "event_id", "event_type", "occurred_at", "app_version"]);
  if (!body || Array.isArray(body) || Object.keys(body).some((key) => !allowedFields.has(key))) {
    return json(400, { error: "invalid_event" });
  }
  const { protocol_version, installation_id, event_id, event_type, occurred_at, app_version } = body;
  const occurredAt = typeof occurred_at === "string" ? Date.parse(occurred_at) : Number.NaN;
  if (
    protocol_version !== 1 || typeof installation_id !== "string" || !UUID.test(installation_id) ||
    typeof event_id !== "string" || !UUID.test(event_id) || typeof event_type !== "string" || !ALLOWED_EVENT_TYPES.has(event_type) ||
    !Number.isFinite(occurredAt) || Math.abs(Date.now() - occurredAt) > MAX_CLOCK_SKEW_MS ||
    (app_version !== null && app_version !== undefined && (typeof app_version !== "string" || app_version.length > 64 || !VERSION.test(app_version)))
  ) return json(400, { error: "invalid_event" });

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });
  // A retried accepted event must remain idempotent even after a sender's hourly
  // rate limit has been reached.
  const { data: existingEvent, error: existingEventError } = await supabase
    .from("public_installation_events")
    .select("event_id")
    .eq("event_id", event_id)
    .maybeSingle();
  if (existingEventError) return json(500, { error: "ingest_unavailable" });
  if (existingEvent) return json(202, { accepted: "true" });

  const ipKey = `ip:${await sha256(getClientIp(request))}`;
  const installationKey = `installation:${installation_id}`;
  if (!(await consumeRateLimit(supabase, ipKey, IP_LIMIT_PER_HOUR)) || !(await consumeRateLimit(supabase, installationKey, INSTALLATION_LIMIT_PER_HOUR))) {
    return json(429, { error: "temporarily_unavailable" });
  }

  const { error: installationError } = await supabase.from("public_installations").upsert({
    installation_id, last_seen_at: new Date().toISOString(), app_version: app_version ?? null,
  }, { onConflict: "installation_id" });
  if (installationError) return json(500, { error: "ingest_unavailable" });

  const { error: eventError } = await supabase.from("public_installation_events").upsert({
    event_id, installation_id, event_type, occurred_at, app_version: app_version ?? null,
  }, { onConflict: "event_id", ignoreDuplicates: true });
  if (eventError) return json(500, { error: "ingest_unavailable" });

  return json(202, { accepted: "true" });
});
