import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { updateSettings } from "@/lib/localDb";
import { clearAllLocks } from "@/lib/auth/loginLimiter";

const DEFAULT_RESET_PASSWORD = "123456";

// Reset password to default "123456" (or provided password) so user can log in immediately.
// Clears any login limiter lockouts as well.
// Access restricted to local machine / CLI token via dashboardGuard.
export async function POST(request) {
  try {
    let newPassword = DEFAULT_RESET_PASSWORD;
    if (request) {
      try {
        const body = await request.json();
        if (typeof body?.password === "string" && body.password.length >= 6) {
          newPassword = body.password;
        }
      } catch {
        // Body is optional; fallback to DEFAULT_RESET_PASSWORD
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await updateSettings({ password: passwordHash });
    clearAllLocks();
    return NextResponse.json({ success: true, defaultPassword: newPassword === DEFAULT_RESET_PASSWORD ? DEFAULT_RESET_PASSWORD : undefined });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
