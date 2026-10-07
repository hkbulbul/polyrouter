import { NextResponse } from "next/server";
import { getUsedModelPricing } from "@/lib/db/index.js";

export const dynamic = "force-dynamic";

/**
 * GET /api/pricing/models?days=90
 * Every model with recorded usage in the window, its effective $/1M rates and
 * whether they are custom, built-in or missing (missing = counted as $0).
 */
export async function GET(request) {
  try {
    const days = Math.min(Math.max(parseInt(new URL(request.url).searchParams.get("days"), 10) || 90, 1), 3650);
    return NextResponse.json({ days, models: await getUsedModelPricing({ sinceDays: days }) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error listing model pricing:", error);
    return NextResponse.json({ error: "Failed to list model pricing" }, { status: 500 });
  }
}
