// Embedding banners — display-only rows for one provider detail card, via direct anon REST.
// Shape: {id, providerId, displayName, mediaKind, mediaContent, href, position}. Never any secret.
// No kv cache on purpose: this is a handful of rows on a detail page, not the per-render grid
// fetch that justified the sponsors cache.

import { resolveSupabase } from "@/lib/sponsors/remote.js";

const MEDIA_KINDS = new Set(["image", "youtube", "html"]);
const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;
const YOUTUBE_ID = /^[\w-]{11}$/;

export function sanitizeProviderId(providerId) {
  const id = String(providerId || "").trim().toLowerCase();
  return SLUG.test(id) ? id : "";
}

// Trust boundary: mediaContent lands in the DOM (img src / iframe src / srcDoc), so a row failing
// any check is dropped rather than rendered. The admin write path validates too — this is the
// second line, because the table is also reachable by anon SELECT.
export function sanitizeBannerRow(r) {
  if (!r || typeof r !== "object") return null;
  const id = String(r.id ?? "").trim().slice(0, 64);
  const providerId = sanitizeProviderId(r.provider_id ?? r.providerId);
  const mediaKind = String(r.media_kind ?? r.mediaKind ?? "").trim().toLowerCase();
  const mediaContent = String(r.media_content ?? r.mediaContent ?? "");
  if (!id || !providerId || !MEDIA_KINDS.has(mediaKind) || !mediaContent) return null;
  if (mediaKind === "image" && !/^https:\/\//i.test(mediaContent)) return null;
  if (mediaKind === "youtube" && !YOUTUBE_ID.test(mediaContent)) return null;
  const href = String(r.href ?? "").trim().slice(0, 512);
  // Note the explicit null check: Number(null) is 0, which would sort an unpositioned banner first.
  const position = r.position == null || !Number.isFinite(Number(r.position)) ? 999 : Math.max(0, Math.min(999, Number(r.position) | 0));
  return {
    id,
    providerId,
    displayName: String(r.display_name ?? r.displayName ?? "").trim().slice(0, 120),
    mediaKind,
    mediaContent: mediaContent.slice(0, 100000),
    href: /^https:\/\//i.test(href) ? href : "",
    position,
  };
}

// Public: enabled banners for one provider card, position order. [] on anything unexpected —
// unreachable Supabase, RLS not applied, malformed rows. Nothing is surfaced to the user.
export async function getEmbeddingBanners(providerId) {
  const pid = sanitizeProviderId(providerId);
  if (!pid) return [];
  const { url, anonKey } = resolveSupabase();
  if (!url || !anonKey) return [];

  // limit caps how many iframes one provider card can mount; the id tie-break makes which-5
  // deterministic and matches the admin panel's own ordering.
  const query = `${url}/rest/v1/embedding_providers?provider_id=eq.${encodeURIComponent(pid)}&enabled=is.true&select=id,provider_id,display_name,media_kind,media_content,href,position&order=position.asc,id.asc&limit=5`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(query, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const rows = await res.json().catch(() => []);
    const banners = Array.isArray(rows) ? rows.map((r) => sanitizeBannerRow(r)).filter(Boolean) : [];
    banners.sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
    return banners;
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}
