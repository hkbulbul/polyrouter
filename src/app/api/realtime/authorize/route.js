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
    const clientIp = request.headers.get("x-9r-realtime-client-ip") || "";
    const clientOrigin = request.headers.get("x-9r-realtime-client-origin") || "";
    const clientHost = request.headers.get("x-9r-realtime-client-host") || "";
    const auth = await authenticateUpgrade({
      headers: {
        cookie: request.headers.get("cookie") || "",
        host: clientHost,
        origin: clientOrigin,
        "x-9r-real-ip": clientIp,
        authorization: request.headers.get("x-9r-realtime-client-authorization") || "",
        "x-api-key": request.headers.get("x-9r-realtime-client-api-key") || "",
      },
      socket: { remoteAddress: clientIp },
      realtimeModel: body?.model || null,
      realtimeProvider: body?.provider || null,
      realtimeVoice: body?.voice || null,
      realtimeApiKey: body?.apiKey || null,
      realtimeTicket: body?.ticket || null,
      realtimeSecure: request.headers.get("x-9r-realtime-client-secure") === "1",
    });
    return NextResponse.json(auth);
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Realtime authentication failed." }, { status: 401 });
  }
}
