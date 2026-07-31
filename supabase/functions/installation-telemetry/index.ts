import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_EVENT_TYPES = new Set(["installed", "startup", "setup_complete", "dashboard_login"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(status: number, body: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json(405, { error: "method_not_allowed" });
  const expectedToken = Deno.env.get("INSTALLATION_TELEMETRY_INGEST_TOKEN");
  if (!expectedToken || request.headers.get("authorization") !== `Bearer ${expectedToken}`) {
    return json(401, { error: "unauthorized" });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const { installation_id, event_id, event_type, occurred_at, app_version, ip_hash } = body;
  if (
    typeof installation_id !== "string" || !UUID.test(installation_id) ||
    typeof event_id !== "string" || !UUID.test(event_id) ||
    typeof event_type !== "string" || !ALLOWED_EVENT_TYPES.has(event_type) ||
    typeof occurred_at !== "string" || Number.isNaN(Date.parse(occurred_at)) ||
    (app_version !== undefined && typeof app_version !== "string") ||
    (ip_hash !== undefined && (typeof ip_hash !== "string" || !/^[a-f0-9]{64}$/i.test(ip_hash)))
  ) return json(400, { error: "invalid_event" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const { error: installationError } = await supabase.from("installations").upsert({
    installation_id,
    last_seen_at: new Date().toISOString(),
    app_version: app_version ?? null,
  }, { onConflict: "installation_id" });
  if (installationError) return json(500, { error: "installation_write_failed" });

  const { error: eventError } = await supabase.from("installation_events").upsert({
    event_id,
    installation_id,
    event_type,
    occurred_at,
    app_version: app_version ?? null,
    ip_hash: ip_hash ?? null,
  }, { onConflict: "event_id", ignoreDuplicates: true });
  if (eventError) return json(500, { error: "event_write_failed" });

  return json(202, { accepted: "true" });
});
