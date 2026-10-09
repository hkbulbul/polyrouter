import { NextResponse } from "next/server";
import { recalculateUsageCosts } from "@/lib/db/index.js";

export const dynamic = "force-dynamic";

/**
 * POST /api/pricing/recalculate { provider?, model? }
 * Re-price recorded usage with the current rates — all of it, or one
 * provider/model (e.g. right after setting a price for it).
 */
export async function POST(request) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch {}
    const filter = {};
    if (typeof body?.provider === "string" && body.provider) filter.provider = body.provider;
    if (typeof body?.model === "string" && body.model) filter.model = body.model;
    return NextResponse.json(await recalculateUsageCosts(filter));
  } catch (error) {
    console.error("Error recalculating usage costs:", error);
    return NextResponse.json({ error: "Failed to recalculate costs" }, { status: 500 });
  }
}
