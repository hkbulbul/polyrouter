import { cookies } from "next/headers";
import { clearOfficeSessionCookie } from "@/lib/office/session.js";
import { ok } from "@/lib/office/http.js";

export const dynamic = "force-dynamic";

// POST /api/office/auth/logout
export async function POST() {
  const cookieStore = await cookies();
  clearOfficeSessionCookie(cookieStore);
  return ok({ success: true });
}
