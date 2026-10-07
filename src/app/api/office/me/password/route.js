import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getOfficeUserById, updateOfficeUser, addOfficeAuditLog } from "@/lib/db/index.js";
import { hashPassword, validateNewPassword, setOfficeSessionCookie } from "@/lib/office/session.js";
import { ok, fail, readJson, requireOfficeSession } from "@/lib/office/http.js";

export const dynamic = "force-dynamic";

// POST /api/office/me/password { currentPassword, newPassword }
// Ends the employee's other portal sessions; this one is re-issued.
export async function POST(request) {
  try {
    const session = await requireOfficeSession();
    if (session.response) return session.response;
    const body = await readJson(request);

    const user = await getOfficeUserById(session.user.id, { withSecret: true });
    if (!user) return fail(401, "Not signed in");
    if (typeof body.currentPassword !== "string" || !(await bcrypt.compare(body.currentPassword, user.passwordHash))) {
      return fail(401, "Current password is incorrect");
    }
    const pwError = validateNewPassword(body.newPassword);
    if (pwError) return fail(400, pwError);
    if (body.newPassword === body.currentPassword) return fail(400, "Choose a password different from the current one");

    const updated = await updateOfficeUser(
      user.id,
      { passwordHash: await hashPassword(body.newPassword), mustChangePassword: false },
      { bumpSession: true }
    );
    const cookieStore = await cookies();
    await setOfficeSessionCookie(cookieStore, request, updated);
    await addOfficeAuditLog({ actor: user.email, action: "employee.password_changed" });
    return ok({ success: true });
  } catch (error) {
    return fail(500, error.message);
  }
}
