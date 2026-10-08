import { addOfficeAuditLog } from "@/lib/db/index.js";
import { getOfficeSettings, resolveEffectivePolicy } from "@/lib/office/context.js";
import { createEmployeeKey, serializeKey, OfficeError } from "@/lib/office/service.js";
import { ok, fail, readJson, requireOfficeSession } from "@/lib/office/http.js";

export const dynamic = "force-dynamic";

// POST /api/office/me/keys { name } — create a personal API key.
export async function POST(request) {
  try {
    const session = await requireOfficeSession();
    if (session.response) return session.response;
    const { user } = session;
    if (user.mustChangePassword) return fail(403, "Change your temporary password before creating API keys");

    const body = await readJson(request);
    const office = await getOfficeSettings();
    const policy = await resolveEffectivePolicy(user, office);
    const key = await createEmployeeKey(user, office, policy.limits, { name: body.name });
    await addOfficeAuditLog({ actor: user.email, action: "key.created", meta: { keyId: key.id, name: key.name } });
    return ok({ key: serializeKey(key, { reveal: true }) }, 201);
  } catch (error) {
    if (error instanceof OfficeError) return fail(error.status, error.message);
    return fail(500, error.message);
  }
}
