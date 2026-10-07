import { listOfficePolicies, createOfficePolicy, listOfficeUsers, listOfficeTeams, addOfficeAuditLog } from "@/lib/db/index.js";
import { getOfficeSettings } from "@/lib/office/context.js";
import { normalizeLimits } from "@/lib/office/policy.js";
import { ok, fail, readJson, clampString, isUniqueViolation } from "@/lib/office/http.js";

export const dynamic = "force-dynamic";

// GET /api/office/admin/policies — with where each policy is used.
export async function GET() {
  try {
    const [policies, users, teams, officeSettings] = await Promise.all([
      listOfficePolicies(), listOfficeUsers(), listOfficeTeams(), getOfficeSettings(),
    ]);
    return ok({
      policies: policies.map((p) => ({
        ...p,
        limits: normalizeLimits(p.limits),
        isDefault: officeSettings.defaultPolicyId === p.id,
        userCount: users.filter((u) => u.policyId === p.id).length,
        teamCount: teams.filter((t) => t.policyId === p.id).length,
      })),
    });
  } catch (error) {
    return fail(500, error.message);
  }
}

// POST /api/office/admin/policies
export async function POST(request) {
  try {
    const body = await readJson(request);
    const name = clampString(body.name, 80);
    if (!name) return fail(400, "Policy name is required");
    const policy = await createOfficePolicy({ name, limits: normalizeLimits(body.limits) });
    await addOfficeAuditLog({ actor: "admin", action: "policy.created", target: name });
    return ok({ policy }, 201);
  } catch (error) {
    if (isUniqueViolation(error)) return fail(409, "A policy with this name already exists");
    return fail(500, error.message);
  }
}
