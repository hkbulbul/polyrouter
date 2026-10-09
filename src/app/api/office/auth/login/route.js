import { cookies } from "next/headers";
import { touchOfficeUserLogin, addOfficeAuditLog } from "@/lib/db/index.js";
import { getClientIp } from "@/lib/auth/loginLimiter";
import { verifyOfficeCredentials, setOfficeSessionCookie } from "@/lib/office/session.js";
import { ok, fail, readJson } from "@/lib/office/http.js";

export const dynamic = "force-dynamic";

// POST /api/office/auth/login — employee portal sign-in { email, password }.
export async function POST(request) {
  try {
    const body = await readJson(request);
    const result = await verifyOfficeCredentials(body.email, body.password, getClientIp(request));
    if (!result.user) {
      const res = fail(result.status, result.error, result.retryAfter ? { retryAfter: result.retryAfter } : {});
      if (result.retryAfter) res.headers.set("Retry-After", String(result.retryAfter));
      return res;
    }
    const cookieStore = await cookies();
    await setOfficeSessionCookie(cookieStore, request, result.user);
    await touchOfficeUserLogin(result.user.id);
    await addOfficeAuditLog({ actor: result.user.email, action: "employee.portal_login" });
    return ok({ success: true, mustChangePassword: result.user.mustChangePassword });
  } catch (error) {
    return fail(500, error.message);
  }
}
