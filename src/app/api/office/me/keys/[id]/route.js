import { deleteOfficeUserKey, addOfficeAuditLog } from "@/lib/db/index.js";
import { ok, fail, requireOfficeSession } from "@/lib/office/http.js";

export const dynamic = "force-dynamic";

// DELETE /api/office/me/keys/:id — revoke one of your own keys.
export async function DELETE(_request, { params }) {
  try {
    const session = await requireOfficeSession();
    if (session.response) return session.response;
    const { id } = await params;
    if (!(await deleteOfficeUserKey(session.user.id, id))) return fail(404, "Key not found");
    await addOfficeAuditLog({ actor: session.user.email, action: "key.deleted", meta: { keyId: id } });
    return ok({ success: true });
  } catch (error) {
    return fail(500, error.message);
  }
}
