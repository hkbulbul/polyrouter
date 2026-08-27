import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST() {
  return NextResponse.json(
    { error: "Web Cookie providers are temporarily unavailable", code: "SIGNIN_DISABLED" },
    { status: 503 },
  );
}
