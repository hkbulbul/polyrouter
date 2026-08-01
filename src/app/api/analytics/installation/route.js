import { NextResponse } from "next/server";
import { getSettings, getOrCreateInstallationIdentity } from "@/lib/db/index.js";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const DISABLED_VALUES = new Set(["0", "false", "off", "no"]);

function isEnvironmentOptedOut() {
  return DISABLED_VALUES.has(String(process.env.POLYROUTER_PUBLIC_TELEMETRY || "").trim().toLowerCase());
}

export async function GET() {
  try {
    const settings = await getSettings();
    if (isEnvironmentOptedOut() || settings.publicTelemetryEnabled === false) {
      return NextResponse.json({ enabled: false }, { headers: NO_STORE_HEADERS });
    }
    const { installationId } = await getOrCreateInstallationIdentity();
    return NextResponse.json({ enabled: true, installationId }, { headers: NO_STORE_HEADERS });
  } catch {
    // Analytics must not make the dashboard unavailable.
    return NextResponse.json({ enabled: false }, { headers: NO_STORE_HEADERS });
  }
}
