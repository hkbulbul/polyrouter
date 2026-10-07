import { revokeOfficeDevice, addOfficeAuditLog } from "@/lib/db/index.js";
import { ok, fail, requireOfficeSession } from "@/lib/office/http.js";

export const dynamic = "force-dynamic";

// DELETE /api/office/me/devices/:id — sign one of your own devices out.
export async function DELETE(_request, { params }) {
  try {
    const session = await requireOfficeSession();
    if (session.response) return session.response;
    const { id } = await params;
    if (!(await revokeOfficeDevice(id, session.user.id))) return fail(404, "Device not found");
    await addOfficeAuditLog({ actor: session.user.email, action: "device.signed_out", target: id });
    return ok({ success: true });
  } catch (error) {
    return fail(500, error.message);
  }
}
