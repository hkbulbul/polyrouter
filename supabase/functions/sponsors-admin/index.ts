import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VALID_KINDS = new Set(["llm", "embedding", "image", "tts", "stt", "video", "search", "fetch", "music"]);

function json(status: number, body: unknown, extra?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...(extra || {}) },
  });
}

function sanitizeKind(k: unknown) {
  const s = String(k || "llm").trim().toLowerCase();
  return VALID_KINDS.has(s) ? s : "llm";
}

function sanitizeSponsor(raw: Record<string, unknown>, kindHint: string) {
  if (!raw || typeof raw !== "object") return null;
  const providerId = String(raw.providerId ?? raw.provider_id ?? (raw as Record<string,unknown>).id ?? "").trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-|-$/g, "");
  if (!providerId) return null;
  const kind = sanitizeKind((raw as Record<string,unknown>).kind ?? kindHint);
  const position = Number.isFinite(Number(raw.position)) ? Math.max(0, Math.min(999, Number(raw.position as number) | 0)) : 999;
  const badgeLabel = String(raw.badgeLabel ?? (raw as Record<string,unknown>).badge_label ?? "Sponsored").trim().slice(0, 32) || "Sponsored";
  const badgeSublabel = String(raw.badgeSublabel ?? (raw as Record<string,unknown>).badge_sublabel ?? "").trim().slice(0, 32);
  const href = String(raw.href ?? "").trim().slice(0, 512);
  const safeHref = /^https:\/\//i.test(href) ? href : "";
  return {
    provider_id: providerId,
    kind,
    is_active: (raw as Record<string,unknown>).isActive !== false && (raw as Record<string,unknown>).is_active !== false,
    position,
    badge_label: badgeLabel,
    badge_sublabel: badgeSublabel,
    href: safeHref,
  };
}

Deno.serve(async (request) => {
  // Web.polyrouter is Vite SPA; allow CORS from dashboard origin only if needed — for now allow anon + dashboard Supabase auth.
  const corsHeaders: Record<string,string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  };
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  // Reads (GET) are public via anon RLS; this fn is for writes (require Supabase auth JWT).
  // Expect Authorization: Bearer <supabase anon auth JWT from dashboard login>
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return json(401, { error: "missing Authorization: Bearer <supabase auth JWT>" }, corsHeaders);

  // Verify the JWT is a valid Supabase auth session (authenticated user), not anon key alone
  const supaAnon = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { auth: { persistSession: false } }
  );
  const { data: userRes, error: userErr } = await supaAnon.auth.getUser(authHeader.slice(7));
  if (userErr || !userRes?.user) return json(401, { error: "invalid auth JWT — sign in to web.polyrouter dashboard first" }, corsHeaders);

  // Service client for writes
  const svc = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const url = new URL(request.url);
    const kindParam = sanitizeKind(url.searchParams.get("kind") || "llm");

    if (request.method === "GET") {
      const kind = kindParam;
      const [sRes, cRes] = await Promise.all([
        svc.from("sponsors").select("provider_id,kind,is_active,position,badge_label,badge_sublabel,href").eq("kind", kind).order("position", { ascending: true }),
        svc.from("sponsors_config").select("enabled,max_visible").eq("kind", kind).maybeSingle(),
      ]);
      if (sRes.error) return json(500, { error: sRes.error.message }, corsHeaders);
      const sponsors = (sRes.data || []).map((r: Record<string,unknown>) => ({
        providerId: r.provider_id,
        kind: r.kind,
        isActive: r.is_active !== false,
        position: r.position,
        badgeLabel: r.badge_label,
        badgeSublabel: r.badge_sublabel,
        href: r.href,
      }));
      const config = cRes.data ? { enabled: cRes.data.enabled !== false, maxVisible: cRes.data.max_visible ?? 3 } : { enabled: true, maxVisible: 3 };
      return json(200, { kind, config, sponsors }, corsHeaders);
    }

    if (request.method === "POST" || request.method === "PATCH") {
      const body = await request.json().catch(() => ({})) as Record<string, unknown>;

      // { config: {enabled, maxVisible} }
      if (body.config && typeof body.config === "object") {
        const cfg = body.config as Record<string,unknown>;
        const kind = sanitizeKind((cfg.kind as unknown) ?? body.kind ?? kindParam);
        const enabled = cfg.enabled !== false;
        const maxVisible = Number.isFinite(Number(cfg.maxVisible ?? (cfg as Record<string,unknown>).max_visible))
          ? Math.max(0, Math.min(20, Number((cfg.maxVisible ?? (cfg as Record<string,unknown>).max_visible) as number) | 0))
          : 3;
        const { error } = await svc.from("sponsors_config").upsert({ kind, enabled, max_visible: maxVisible, updated_at: new Date().toISOString() }, { onConflict: "kind" });
        if (error) return json(500, { error: error.message }, corsHeaders);
        return json(200, { kind, config: { enabled, maxVisible } }, corsHeaders);
      }

      // { reorder: [ids] }
      if (Array.isArray(body.reorder)) {
        const kind = sanitizeKind((body.kind as unknown) ?? kindParam);
        const ids = (body.reorder as unknown[]).map((x) => String(x).trim().toLowerCase()).filter(Boolean);
        for (let i = 0; i < ids.length; i++) {
          const { error } = await svc.from("sponsors").update({ position: i, updated_at: new Date().toISOString() }).eq("kind", kind).eq("provider_id", ids[i]);
          if (error) return json(500, { error: error.message }, corsHeaders);
        }
        return json(200, { kind, ok: true }, corsHeaders);
      }

      // { sponsor: {...} } or bare sponsor object
      const sponsorRaw = (body.sponsor && typeof body.sponsor === "object" ? body.sponsor : body) as Record<string, unknown>;
      const s = sanitizeSponsor(sponsorRaw, sanitizeKind((sponsorRaw as Record<string,unknown>).kind ?? body.kind ?? kindParam));
      if (!s) return json(400, { error: "providerId required" }, corsHeaders);
      const { error } = await svc.from("sponsors").upsert({ ...s, updated_at: new Date().toISOString() }, { onConflict: "kind,provider_id" });
      if (error) return json(500, { error: error.message }, corsHeaders);
      return json(200, { kind: s.kind, sponsor: { providerId: s.provider_id, kind: s.kind, isActive: s.is_active, position: s.position, badgeLabel: s.badge_label, badgeSublabel: s.badge_sublabel, href: s.href } }, corsHeaders);
    }

    if (request.method === "DELETE") {
      const kind = sanitizeKind(url.searchParams.get("kind") || "llm");
      const providerId = String(url.searchParams.get("provider_id") || url.searchParams.get("providerId") || "").trim().toLowerCase();
      if (!providerId) return json(400, { error: "provider_id (or providerId) query required" }, corsHeaders);
      const { error } = await svc.from("sponsors").delete().eq("kind", kind).eq("provider_id", providerId);
      if (error) return json(500, { error: error.message }, corsHeaders);
      return json(200, { kind, ok: true }, corsHeaders);
    }

    return json(405, { error: "method_not_allowed" }, corsHeaders);
  } catch (e) {
    return json(500, { error: String((e as Error).message || e) }, corsHeaders);
  }
});
