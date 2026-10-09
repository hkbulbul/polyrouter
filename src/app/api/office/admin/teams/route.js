import { listOfficeTeams, createOfficeTeam, getOfficePolicyById, listOfficeUsers, addOfficeAuditLog } from "@/lib/db/index.js";
import { ok, fail, readJson, clampString, isUniqueViolation } from "@/lib/office/http.js";

export const dynamic = "force-dynamic";

// GET /api/office/admin/teams
export async function GET() {
  try {
    const [teams, users] = await Promise.all([listOfficeTeams(), listOfficeUsers()]);
    return ok({
      teams: teams.map((t) => ({ ...t, memberCount: users.filter((u) => u.teamId === t.id).length })),
    });
  } catch (error) {
    return fail(500, error.message);
  }
}

// POST /api/office/admin/teams
export async function POST(request) {
  try {
    const body = await readJson(request);
    const name = clampString(body.name, 80);
    if (!name) return fail(400, "Team name is required");
    if (body.policyId && !(await getOfficePolicyById(body.policyId))) return fail(400, "Policy not found");
    const team = await createOfficeTeam({ name, policyId: body.policyId || null });
    await addOfficeAuditLog({ actor: "admin", action: "team.created", target: name });
    return ok({ team }, 201);
  } catch (error) {
    if (isUniqueViolation(error)) return fail(409, "A team with this name already exists");
    return fail(500, error.message);
  }
}
