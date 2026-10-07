import { NextResponse } from "next/server";
import { getSettings } from "@/lib/localDb";

export async function GET() {
  try {
    const settings = await getSettings();
    // Office mode always requires login (see dashboardGuard isLoginOptional).
    const requireLogin = settings.requireLogin !== false || settings.office?.enabled === true;
    const tunnelDashboardAccess = settings.tunnelDashboardAccess !== false;
    const tunnelUrl = settings.tunnelUrl || "";
    const tailscaleUrl = settings.tailscaleUrl || "";
    return NextResponse.json({ requireLogin, tunnelDashboardAccess, tunnelUrl, tailscaleUrl });
  } catch (error) {
    return NextResponse.json({ requireLogin: true }, { status: 200 });
  }
}
