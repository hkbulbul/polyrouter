import { revokeOfficeDevice, addOfficeAuditLog } from "@/lib/db/index.js";
import { authenticateDeviceRequest } from "@/lib/office/session.js";
import { ok, fail } from "@/lib/office/http.js";

export const dynamic = "force-dynamic";

// POST /api/office/client/logout — sign this device out and delete its key.
export async function POST(request) {
  try {
    const auth = await authenticateDeviceRequest(request);
    if (!auth.user) return fail(auth.status, auth.error);
    await revokeOfficeDevice(auth.device.id, auth.user.id);
    await addOfficeAuditLog({ actor: auth.user.email, action: "device.signed_out", target: auth.device.name });
    return ok({ success: true });
  } catch (error) {
    return fail(500, error.message);
  }
}
