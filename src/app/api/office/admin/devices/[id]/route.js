import { revokeOfficeDevice, addOfficeAuditLog } from "@/lib/db/index.js";
import { ok, fail } from "@/lib/office/http.js";

export const dynamic = "force-dynamic";

// DELETE /api/office/admin/devices/:id — sign a light-client device out (also deletes its key).
export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    if (!(await revokeOfficeDevice(id))) return fail(404, "Device not found");
    await addOfficeAuditLog({ actor: "admin", action: "device.revoked", target: id });
    return ok({ success: true });
  } catch (error) {
    return fail(500, error.message);
  }
}
