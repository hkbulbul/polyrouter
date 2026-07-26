import { NextResponse } from "next/server";
import { authenticateUpgrade } from "@/realtime/auth.js";

export const runtime = "nodejs";

// custom-server.js generates this value before Next is loaded. It prevents a
// browser request from ever receiving the provider token used by the bridge.
export async function POST(request) {
  if (!process.env.REALTIME_INTERNAL_SECRET || request.headers.get("x-9r-realtime-internal") !== process.env.REALTIME_INTERNAL_SECRET) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const body = await request.json();
    const auth = await authenticateUpgrade({
      headers: Object.fromEntries(request.headers.entries()),
      socket: { remoteAddress: "127.0.0.1" },
      realtimeModel: body?.model || null,
      realtimeProvider: body?.provider || null,
      realtimeVoice: body?.voice || null,
    });
    return NextResponse.json(auth);
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Realtime authentication failed." }, { status: 401 });
  }
}
