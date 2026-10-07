import { getOfficeUserById, updateOfficeUser, listOfficeDevices, revokeOfficeDevice, addOfficeAuditLog } from "@/lib/db/index.js";
import { hashPassword, validateNewPassword, generateTemporaryPassword } from "@/lib/office/session.js";
import { ok, fail, readJson } from "@/lib/office/http.js";

export const dynamic = "force-dynamic";

// POST /api/office/admin/users/:id/reset-password
// Sets a new password (generated when omitted), forces a change at next sign-in,
// ends all portal sessions and signs out every light-client device.
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const existing = await getOfficeUserById(id);
    if (!existing) return fail(404, "Employee not found");

    const body = await readJson(request);
    let password = typeof body.password === "string" ? body.password : "";
    const generated = !password;
    if (generated) password = generateTemporaryPassword();
    const pwError = validateNewPassword(password);
    if (pwError) return fail(400, pwError);

    await updateOfficeUser(id, { passwordHash: await hashPassword(password), mustChangePassword: true }, { bumpSession: true });
    const devices = await listOfficeDevices(id);
    for (const device of devices) {
      if (!device.revokedAt) await revokeOfficeDevice(device.id, id);
    }
    await addOfficeAuditLog({ actor: "admin", action: "user.password_reset", target: existing.email });
    return ok({ temporaryPassword: generated ? password : null });
  } catch (error) {
    return fail(500, error.message);
  }
}
