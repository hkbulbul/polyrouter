import { getOfficeTeamById, updateOfficeTeam, deleteOfficeTeam, getOfficePolicyById, addOfficeAuditLog } from "@/lib/db/index.js";
import { ok, fail, readJson, clampString, isUniqueViolation } from "@/lib/office/http.js";

export const dynamic = "force-dynamic";

// PATCH /api/office/admin/teams/:id
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const existing = await getOfficeTeamById(id);
    if (!existing) return fail(404, "Team not found");
    const body = await readJson(request);
    const patch = {};
    if (body.name !== undefined) {
      patch.name = clampString(body.name, 80);
      if (!patch.name) return fail(400, "Team name is required");
    }
    if (body.policyId !== undefined) {
      if (body.policyId && !(await getOfficePolicyById(body.policyId))) return fail(400, "Policy not found");
      patch.policyId = body.policyId || null;
    }
    const team = await updateOfficeTeam(id, patch);
    await addOfficeAuditLog({ actor: "admin", action: "team.updated", target: team.name, meta: patch });
    return ok({ team });
  } catch (error) {
    if (isUniqueViolation(error)) return fail(409, "A team with this name already exists");
    return fail(500, error.message);
  }
}

// DELETE /api/office/admin/teams/:id — members become team-less.
export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const existing = await getOfficeTeamById(id);
    if (!existing) return fail(404, "Team not found");
    await deleteOfficeTeam(id);
    await addOfficeAuditLog({ actor: "admin", action: "team.deleted", target: existing.name });
    return ok({ success: true });
  } catch (error) {
    return fail(500, error.message);
  }
}
