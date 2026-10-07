import { createOfficeDevice, touchOfficeUserLogin, addOfficeAuditLog } from "@/lib/db/index.js";
import { getClientIp } from "@/lib/auth/loginLimiter";
import { getOfficeSettings, resolveEffectivePolicy } from "@/lib/office/context.js";
import { verifyOfficeCredentials, generateDeviceToken, hashDeviceToken } from "@/lib/office/session.js";
import { createEmployeeKey } from "@/lib/office/service.js";
import { ok, fail, readJson, clampString } from "@/lib/office/http.js";

export const dynamic = "force-dynamic";

// POST /api/office/client/login { email, password, deviceName, platform }
// Light-client sign-in: registers this device and mints its API key.
// The device token is returned once and only its hash is stored.
export async function POST(request) {
  try {
    const body = await readJson(request);
    const office = await getOfficeSettings();
    if (office.enabled && !office.allowClientLogin) {
      return fail(403, "Your admin has turned off the PolyRouter client. Use the web portal instead.");
    }

    const result = await verifyOfficeCredentials(body.email, body.password, getClientIp(request));
    if (!result.user) {
      return fail(result.status, result.error, result.retryAfter ? { retryAfter: result.retryAfter } : {});
    }
    const user = result.user;
    if (user.mustChangePassword) {
      return fail(403, "Sign in to the web portal once to replace your temporary password, then try again.", {
        code: "password_change_required",
      });
    }

    const deviceToken = generateDeviceToken();
    const device = await createOfficeDevice({
      userId: user.id,
      name: clampString(body.deviceName, 80) || "Device",
      platform: clampString(body.platform, 40),
      tokenHash: hashDeviceToken(deviceToken),
    });
    const policy = await resolveEffectivePolicy(user, office);
    const apiKey = await createEmployeeKey(user, office, policy.limits, {
      name: `Client: ${device.name}`.slice(0, 80),
      deviceId: device.id,
    });
    await touchOfficeUserLogin(user.id);
    await addOfficeAuditLog({ actor: user.email, action: "device.registered", target: device.name, meta: { deviceId: device.id, platform: device.platform } });

    return ok({
      deviceToken,
      deviceId: device.id,
      apiKey: apiKey.key,
      apiKeyExpiresAt: apiKey.expiresAt,
      user: { id: user.id, email: user.email, name: user.name },
      office: { orgName: office.orgName, publicUrl: office.publicUrl },
    }, 201);
  } catch (error) {
    return fail(500, error.message);
  }
}
