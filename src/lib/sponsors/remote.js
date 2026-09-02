// Cloud sponsors — Supabase-backed via direct anon REST (zero Edge Function deploy)
// + local kv cache (scope sponsors_cache) + fallback to legacy local kv scope sponsors
// Badge rows are display-only: {providerId, kind, position, badgeLabel, badgeSublabel, href}
// Never contains apiKey/sessionCookies.

import { getAdapter } from "@/lib/db/driver.js";
import { parseJson, stringifyJson } from "@/lib/db/helpers/jsonCol.js";
import { makeKv } from "@/lib/db/helpers/kvStore.js";

const VALID_KINDS = new Set(["llm", "embedding", "image", "tts", "stt", "video", "search", "fetch", "music"]);
const DEFAULT_KIND = "llm";
const CACHE_TTL_MS = (() => {
  const v = Number(process.env.SPONSORS_CACHE_TTL_MS ?? process.env.NEXT_PUBLIC_SPONSORS_CACHE_TTL_MS ?? 300000);
  return Number.isFinite(v) && v >= 0 ? v : 300000;
})();

function resolveSupabase() {
  // PolyRouter can inherit the telemetry project vars, or use dedicated SPONSORS_* vars
  const url =
    process.env.SPONSORS_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SPONSORS_SUPABASE_URL ||
    // Fallback: extract project ref from INSTALLATION_TELEMETRY_URL https://<ref>.supabase.co/functions/v1/...
    (() => {
      const t = process.env.INSTALLATION_TELEMETRY_URL || process.env.PUBLIC_INSTALLATION_TELEMETRY_URL || "";
      const m = t.match(/https:\/\/([^.]+)\.supabase\.co/i);
      return m ? `https://${m[1]}.supabase.co` : "";
    })();
  // anon key — public, safe to bake. Prefer dedicated var; else there is no safe default to infer.
  const anonKey =
    process.env.SPONSORS_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SPONSORS_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  return { url: String(url || "").replace(/\/$/, ""), anonKey: String(anonKey || "").trim() };
}

function sanitizeKind(kind) {
  const k = String(kind || DEFAULT_KIND).trim().toLowerCase();
  return VALID_KINDS.has(k) ? k : DEFAULT_KIND;
}

function sanitizeSponsorRow(r, kind) {
  if (!r || typeof r !== "object") return null;
  const providerId = String(r.provider_id ?? r.providerId ?? r.id ?? "").trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-|-$/g, "");
  if (!providerId) return null;
  const position = Number.isFinite(Number(r.position)) ? Math.max(0, Math.min(999, Number(r.position) | 0)) : 999;
  const badgeLabel = String(r.badge_label ?? r.badgeLabel ?? "Sponsored").trim().slice(0, 32) || "Sponsored";
  const badgeSublabel = String(r.badge_sublabel ?? r.badgeSublabel ?? "").trim().slice(0, 32);
  const href = String(r.href ?? "").trim().slice(0, 512);
  const safeHref = /^https:\/\//i.test(href) ? href : "";
  return {
    providerId,
    kind: sanitizeKind(kind ?? r.kind),
    isActive: r.is_active !== false && r.isActive !== false,
    position,
    badgeLabel,
    badgeSublabel,
    href: safeHref,
  };
}

async function fetchSponsorsFromSupabase(kind) {
  const { url, anonKey } = resolveSupabase();
  if (!url || !anonKey) return null; // not configured -> caller falls back to local

  const k = sanitizeKind(kind);
  // Direct REST via anon REST API (RLS anon SELECT must exist — migration 004)
  // sponsors + sponsors_config in parallel
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
  };
  const sponsorsUrl = `${url}/rest/v1/sponsors?kind=eq.${encodeURIComponent(k)}&is_active=eq.true&select=provider_id,kind,position,badge_label,badge_sublabel,href&order=position.asc`;
  const configUrl = `${url}/rest/v1/sponsors_config?kind=eq.${encodeURIComponent(k)}&select=enabled,max_visible`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 3500);
  try {
    const [sRes, cRes] = await Promise.all([
      fetch(sponsorsUrl, { headers, cache: "no-store", signal: controller.signal }),
      fetch(configUrl, { headers, cache: "no-store", signal: controller.signal }),
    ]);
    if (!sRes.ok) {
      // Cloud not reachable or RLS not yet applied — treat as not-configured
      return null;
    }
    const rows = await sRes.json().catch(() => []);
    const cfgRows = cRes.ok ? await cRes.json().catch(() => []) : [];
    const cfg = cfgRows[0] || { enabled: true, max_visible: 3 };
    const sponsors = Array.isArray(rows) ? rows.map((r) => sanitizeSponsorRow(r, k)).filter(Boolean) : [];
    // Apply maxVisible cap server-agnostic (anon path has no cap server-side)
    const maxVisible = Number.isFinite(Number(cfg.max_visible ?? cfg.maxVisible))
      ? Math.max(0, Math.min(20, Number(cfg.max_visible ?? cfg.maxVisible) | 0))
      : 3;
    const enabled = cfg.enabled !== false;
    if (!enabled) return { enabled: false, maxVisible, sponsors: [] };
    sponsors.sort((a, b) => a.position - b.position || a.providerId.localeCompare(b.providerId));
    return { enabled: true, maxVisible, sponsors: sponsors.slice(0, maxVisible) };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// cache: kv scope sponsors_cache, key `${kind}` -> { at, data }
const cacheKv = makeKv("sponsors_cache");

async function readCache(kind) {
  const k = sanitizeKind(kind);
  const raw = await cacheKv.get(k, null);
  if (!raw || typeof raw !== "object") return null;
  const at = Number(raw.at);
  if (!Number.isFinite(at)) return null;
  if (Date.now() - at > CACHE_TTL_MS) return null;
  // sanitize on read
  const data = raw.data;
  if (!data || typeof data !== "object") return null;
  return data;
}

async function writeCache(kind, data) {
  const k = sanitizeKind(kind);
  await cacheKv.set(k, { at: Date.now(), data });
}

async function readStaleCache(kind) {
  const k = sanitizeKind(kind);
  const raw = await cacheKv.get(k, null);
  return raw && typeof raw === "object" ? raw.data : null;
}

// Public: returns {enabled, maxVisible, sponsors} with TTL, stale fallback, local fallback
export async function getCloudSponsors(kind = DEFAULT_KIND, opts = {}) {
  const k = sanitizeKind(kind);

  // 1) fresh cache -> serve (skip if forceRefresh)
  if (!opts.forceRefresh) {
    const cached = await readCache(k);
    if (cached) return cached;
  }

  // 2) fetch cloud
  const remote = await fetchSponsorsFromSupabase(k);
  if (remote) {
    await writeCache(k, remote);
    return remote;
  }

  // 3) stale cache if cloud failed
  const stale = await readStaleCache(k);
  if (stale) return stale;

  // 4) local fallback (legacy kv sponsors scoped by kind)
  // Legacy data has no kind field — treat all entries as llm; for non-llm return empty
  try {
    const { getPublicSponsors: getLocalPublicSponsors } = await import("@/lib/db/repos/sponsorsRepo.js");
    // sponsorsRepo stores by providerId across kinds in one flat map — expose a kind-aware helper below
    // For now, only llm legacy fallback is meaningful
    if (k !== DEFAULT_KIND) return { enabled: true, maxVisible: 3, sponsors: [] };
    // getPublicSponsors returns for llm legacy generic
    const local = await getLocalPublicSponsors(k);
    // Cache it (so next call is fresh without re-probing cloud if still unconfigured)
    const normalized = {
      enabled: !!local.enabled,
      maxVisible: local.maxVisible ?? 3,
      sponsors: (local.sponsors || []).map((s) => ({ ...s, kind: k })),
    };
    await writeCache(k, normalized);
    return normalized;
  } catch {
    return { enabled: true, maxVisible: 3, sponsors: [] };
  }
}

// Also export helpers for route
export { sanitizeKind, VALID_KINDS, resolveSupabase };
