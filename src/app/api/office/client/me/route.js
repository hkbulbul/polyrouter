import { getOfficeSettings } from "@/lib/office/context.js";
import { authenticateDeviceRequest } from "@/lib/office/session.js";
import { buildUserStatus } from "@/lib/office/service.js";
import { ok, fail } from "@/lib/office/http.js";

export const dynamic = "force-dynamic";

// GET /api/office/client/me — status for the light client (policy, usage, limits).
export async function GET(request) {
  try {
    const auth = await authenticateDeviceRequest(request);
    if (!auth.user) return fail(auth.status, auth.error);
    const office = await getOfficeSettings();
    const status = await buildUserStatus(auth.user, office);
    return ok({
      ...status,
      device: { id: auth.device.id, name: auth.device.name },
      office: { orgName: office.orgName, publicUrl: office.publicUrl },
    });
  } catch (error) {
    return fail(500, error.message);
  }
}
