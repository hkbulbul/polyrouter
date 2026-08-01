import { NextResponse } from "next/server";
import { updateSettings } from "@/lib/db/index.js";
import { setPublicTelemetryEnabled } from "@/shared/services/installationTelemetry";

export async function PATCH(request) {
  try {
    const { enabled } = await request.json();
    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
    }
    await updateSettings({ publicTelemetryEnabled: enabled });
    await setPublicTelemetryEnabled(enabled);
    return NextResponse.json({ publicTelemetryEnabled: enabled }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
