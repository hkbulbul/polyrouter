import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSettings, setInitialPasswordHash } from "@/lib/db/index.js";
import { isLocalRequest, hasValidCliToken } from "@/dashboardGuard";
import { clearAllLocks } from "@/lib/auth/loginLimiter";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request) {
  try {
    const settings = await getSettings();
    const isFirstRun = !settings.password;
    const isAuthorized = isLocalRequest(request) || (await hasValidCliToken(request)) || isFirstRun;
    if (!isAuthorized) {
      return NextResponse.json({ error: "Password setup is local-only" }, { status: 403 });
    }
    const { password } = await request.json();
    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long` },
        { status: 400 }
      );
    }

    if (settings.password) {
      return NextResponse.json({ error: "Password is already configured" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const wasSet = await setInitialPasswordHash(passwordHash);
    if (!wasSet) {
      return NextResponse.json({ error: "Password is already configured" }, { status: 409 });
    }
    clearAllLocks();
    import("@/shared/services/installationTelemetry")
      .then(({ recordInstallationTelemetry }) => recordInstallationTelemetry("setup_complete"))
      .catch(() => {});
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
