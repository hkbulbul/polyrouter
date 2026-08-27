import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const temporarilyUnavailable = () => NextResponse.json(
  { error: "Web Cookie sign-in is temporarily unavailable", code: "SIGNIN_DISABLED" },
  { status: 503 },
);

export async function POST() {
  return temporarilyUnavailable();
}

export async function GET() {
  return temporarilyUnavailable();
}

export async function DELETE() {
  return temporarilyUnavailable();
}
