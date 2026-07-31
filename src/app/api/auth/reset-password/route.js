import { NextResponse } from "next/server";
import { updateSettings } from "@/lib/localDb";

// Clear the stored hash so the local first-run password setup flow can run again.
// Local-only (enforced by dashboardGuard). Never returns or restores a default password.
export async function POST() {
  try {
    await updateSettings({ password: null });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
