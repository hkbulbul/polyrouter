import { listOfficeUserKeys, listOfficeDevices } from "@/lib/db/index.js";
import { getOfficeSettings } from "@/lib/office/context.js";
import { buildUserStatus, serializeKey } from "@/lib/office/service.js";
import { ok, fail, requireOfficeSession } from "@/lib/office/http.js";

export const dynamic = "force-dynamic";

// GET /api/office/me — the signed-in employee's profile, policy, live limit status, keys and devices.
export async function GET() {
  try {
    const session = await requireOfficeSession();
    if (session.response) return session.response;
    const { user } = session;
    const office = await getOfficeSettings();
    const [status, keys, devices] = await Promise.all([
      buildUserStatus(user, office),
      listOfficeUserKeys(user.id),
      listOfficeDevices(user.id),
    ]);
    return ok({
      ...status,
      // Employees may copy their own keys to configure tools.
      keys: keys.map((k) => serializeKey(k, { reveal: true })),
      devices: devices.filter((d) => !d.revokedAt),
      office: {
        orgName: office.orgName,
        publicUrl: office.publicUrl,
        allowSelfServiceKeys: office.allowSelfServiceKeys,
        allowClientLogin: office.allowClientLogin,
      },
    });
  } catch (error) {
    return fail(500, error.message);
  }
}
