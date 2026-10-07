import { getOfficePolicyById, updateOfficePolicy, deleteOfficePolicy, getSettings, updateSettings, addOfficeAuditLog } from "@/lib/db/index.js";
import { normalizeOfficeSettings } from "@/lib/office/context.js";
import { normalizeLimits } from "@/lib/office/policy.js";
import { ok, fail, readJson, clampString, isUniqueViolation } from "@/lib/office/http.js";

export const dynamic = "force-dynamic";

// PATCH /api/office/admin/policies/:id
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const existing = await getOfficePolicyById(id);
    if (!existing) return fail(404, "Policy not found");
    const body = await readJson(request);
    const patch = {};
    if (body.name !== undefined) {
      patch.name = clampString(body.name, 80);
      if (!patch.name) return fail(400, "Policy name is required");
    }
    if (body.limits !== undefined) patch.limits = normalizeLimits(body.limits);
    const policy = await updateOfficePolicy(id, patch);
    await addOfficeAuditLog({ actor: "admin", action: "policy.updated", target: policy.name });
    return ok({ policy: { ...policy, limits: normalizeLimits(policy.limits) } });
  } catch (error) {
    if (isUniqueViolation(error)) return fail(409, "A policy with this name already exists");
    return fail(500, error.message);
  }
}

// DELETE /api/office/admin/policies/:id — users/teams on it fall back to the next policy in line.
export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const existing = await getOfficePolicyById(id);
    if (!existing) return fail(404, "Policy not found");
    await deleteOfficePolicy(id);
    const settings = await getSettings();
    const office = normalizeOfficeSettings(settings.office);
    if (office.defaultPolicyId === id) await updateSettings({ office: { ...office, defaultPolicyId: null } });
    await addOfficeAuditLog({ actor: "admin", action: "policy.deleted", target: existing.name });
    return ok({ success: true });
  } catch (error) {
    return fail(500, error.message);
  }
}
