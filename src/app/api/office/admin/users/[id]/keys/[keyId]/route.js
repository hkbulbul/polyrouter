import { getOfficeUserById, deleteOfficeUserKey, addOfficeAuditLog } from "@/lib/db/index.js";
import { ok, fail } from "@/lib/office/http.js";

export const dynamic = "force-dynamic";

// DELETE /api/office/admin/users/:id/keys/:keyId — revoke one employee key.
export async function DELETE(_request, { params }) {
  try {
    const { id, keyId } = await params;
    const user = await getOfficeUserById(id);
    if (!user) return fail(404, "Employee not found");
    if (!(await deleteOfficeUserKey(id, keyId))) return fail(404, "Key not found");
    await addOfficeAuditLog({ actor: "admin", action: "key.revoked", target: user.email, meta: { keyId } });
    return ok({ success: true });
  } catch (error) {
    return fail(500, error.message);
  }
}
