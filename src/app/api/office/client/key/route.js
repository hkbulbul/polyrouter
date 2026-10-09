import { getOfficeDeviceKey, isApiKeyExpired } from "@/lib/db/index.js";
import { getOfficeSettings, resolveEffectivePolicy } from "@/lib/office/context.js";
import { authenticateDeviceRequest } from "@/lib/office/session.js";
import { createEmployeeKey } from "@/lib/office/service.js";
import { ok, fail } from "@/lib/office/http.js";

export const dynamic = "force-dynamic";

// POST /api/office/client/key — this device's API key; re-minted when it was
// deleted or has expired, so `polyrouter-client sync` self-heals.
export async function POST(request) {
  try {
    const auth = await authenticateDeviceRequest(request);
    if (!auth.user) return fail(auth.status, auth.error);
    const { user, device } = auth;

    let key = await getOfficeDeviceKey(device.id);
    let rotated = false;
    if (!key || isApiKeyExpired(key.expiresAt)) {
      const office = await getOfficeSettings();
      const policy = await resolveEffectivePolicy(user, office);
      key = await createEmployeeKey(user, office, policy.limits, {
        name: `Client: ${device.name || "Device"}`.slice(0, 80),
        deviceId: device.id,
      });
      rotated = true;
    }
    return ok({ apiKey: key.key, expiresAt: key.expiresAt || null, rotated });
  } catch (error) {
    return fail(500, error.message);
  }
}
