import { cookies } from "next/headers";
import { getOfficeSettings } from "@/lib/office/context.js";
import { OFFICE_SESSION_COOKIE, getOfficeUserFromSessionToken } from "@/lib/office/session.js";
import { ok, fail } from "@/lib/office/http.js";

export const dynamic = "force-dynamic";

// GET /api/office/auth/status — public: is office mode on, and who is signed in.
export async function GET() {
  try {
    const office = await getOfficeSettings();
    const cookieStore = await cookies();
    const user = office.enabled
      ? await getOfficeUserFromSessionToken(cookieStore.get(OFFICE_SESSION_COOKIE)?.value)
      : null;
    return ok({
      officeEnabled: office.enabled,
      orgName: office.orgName,
      signedIn: Boolean(user),
      mustChangePassword: user?.mustChangePassword || false,
    });
  } catch (error) {
    return fail(500, error.message);
  }
}
