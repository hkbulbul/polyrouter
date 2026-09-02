import { NextResponse } from "next/server";
import {
  getPublicSponsors,
  getSponsors,
  getSponsorsConfig,
  setSponsorsConfig,
  upsertSponsor,
  deleteSponsor,
} from "@/lib/db/index.js";

export const dynamic = "force-dynamic";

const HDR = { "Cache-Control": "no-store" };

function kindParam(request) {
  const k = request.nextUrl.searchParams.get("kind");
  if (!k) return "llm";
  return String(k).trim().toLowerCase() || "llm";
}

// Public: GET /api/sponsors?kind=llm|embedding  -> badge metadata only (capped, no secrets)
// Tries cloud (Supabase) first with 5m cache; falls back to local kv on failure/offline.
// Cloud is source of truth for remote control + position + number across all installs.
export async function GET(request) {
  try {
    const kind = kindParam(request);
    const isAll = request.nextUrl.searchParams.get("all") === "1";

    // Admin full dump — keep local/auth path for debugging
    if (isAll) {
      const [config, sponsors] = await Promise.all([
        getSponsorsConfig(kind),
        getSponsors({ kind }),
      ]);
      return NextResponse.json({ kind, config, sponsors }, { headers: HDR });
    }

    // Cloud path with local fallback (refresh=1 busts 5m kv cache immediately)
    try {
      const { getCloudSponsors } = await import("@/lib/sponsors/remote.js");
      const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1" || request.nextUrl.searchParams.get("nocache") === "1";
      const data = await getCloudSponsors(kind, { forceRefresh });
      // Badge-only, already capped/maxVisible applied in remote
      return NextResponse.json({ kind, ...data }, { headers: HDR });
    } catch {
      // Fallback to local if remote unavailable
      const data = await getPublicSponsors(kind);
      return NextResponse.json({ kind, ...data }, { headers: HDR });
    }
  } catch (e) {
    return NextResponse.json({ error: e.message || "Failed to load sponsors" }, { status: 500, headers: HDR });
  }
}

// Admin: upsert badge or update config. PATCH body is one of:
//  { config: {enabled, maxVisible}, kind?: "llm"|"embedding" }
//  { sponsor: { providerId, isActive, position, badgeLabel, badgeSublabel, href, kind? } }
//  { deleteProviderId: "agentrouter", kind? }
//  { reorder: ["id1","id2",...], kind? }
// Writes local kv only (local override); cloud source stays in Supabase Studio / web.polyrouter admin.
export async function PATCH(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const kindFromBody = String(body.kind || "").trim().toLowerCase();
    const kindFallback = kindParam(request);
    const kind = kindFromBody || kindFallback;

    if (body.config && typeof body.config === "object") {
      const next = await setSponsorsConfig(body.config, kind);
      return NextResponse.json({ kind, config: next }, { headers: HDR });
    }

    if (body.sponsor && typeof body.sponsor === "object") {
      const saved = await upsertSponsor({ ...body.sponsor, kind }, kind);
      return NextResponse.json({ kind, sponsor: saved }, { headers: HDR });
    }

    if (typeof body.deleteProviderId === "string" && body.deleteProviderId.trim()) {
      await deleteSponsor(body.deleteProviderId, kind);
      return NextResponse.json({ kind, ok: true }, { headers: HDR });
    }

    if (Array.isArray(body.reorder)) {
      const { reorderSponsors } = await import("@/lib/db/index.js");
      const sponsors = await reorderSponsors(body.reorder, kind);
      return NextResponse.json({ kind, sponsors }, { headers: HDR });
    }

    return NextResponse.json({ error: "Provide one of: {config}, {sponsor}, {deleteProviderId}, {reorder}" }, { status: 400, headers: HDR });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Failed to update sponsors" }, { status: 500, headers: HDR });
  }
}
