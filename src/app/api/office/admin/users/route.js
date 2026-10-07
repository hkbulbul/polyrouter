import {
  listOfficeUsers, createOfficeUser, getOfficeUserByEmail, getOfficeTeamById, getOfficePolicyById,
  listOfficeTeams, listOfficePolicies, listOfficeDevices, getApiKeys, getOfficeUsageByUser, addOfficeAuditLog, normalizeEmail,
} from "@/lib/db/index.js";
import { getOfficeSettings } from "@/lib/office/context.js";
import { hashPassword, validateNewPassword, generateTemporaryPassword } from "@/lib/office/session.js";
import { ok, fail, readJson, clampString, isUniqueViolation, periodStartIso, EMAIL_RE } from "@/lib/office/http.js";

export const dynamic = "force-dynamic";

// GET /api/office/admin/users — employees with team, policy, key/device counts and month-to-date usage.
export async function GET() {
  try {
    const [users, teams, policies, devices, keys, officeSettings] = await Promise.all([
      listOfficeUsers(), listOfficeTeams(), listOfficePolicies(), listOfficeDevices(), getApiKeys(), getOfficeSettings(),
    ]);
    const usageRows = await getOfficeUsageByUser(periodStartIso("month"));
    const teamById = new Map(teams.map((t) => [t.id, t]));
    const policyById = new Map(policies.map((p) => [p.id, p]));
    const usageByUser = new Map(usageRows.map((r) => [r.userId, r]));

    const result = users.map((u) => {
      const team = u.teamId ? teamById.get(u.teamId) : null;
      // Same precedence as resolveEffectivePolicy: user → team → office default.
      let effective = { source: "none", name: "Unlimited" };
      for (const [source, id] of [["user", u.policyId], ["team", team?.policyId], ["default", officeSettings.defaultPolicyId]]) {
        const p = id ? policyById.get(id) : null;
        if (p) { effective = { source, name: p.name }; break; }
      }
      const usage = usageByUser.get(u.id);
      return {
        ...u,
        teamName: team?.name || null,
        effectivePolicy: effective,
        keyCount: keys.filter((k) => k.userId === u.id).length,
        deviceCount: devices.filter((d) => d.userId === u.id && !d.revokedAt).length,
        monthUsage: {
          requests: usage?.requests || 0,
          tokens: (usage?.promptTokens || 0) + (usage?.completionTokens || 0),
          cost: usage?.cost || 0,
        },
      };
    });
    return ok({ users: result });
  } catch (error) {
    return fail(500, error.message);
  }
}

// POST /api/office/admin/users — create an employee. Without a password a
// temporary one is generated and returned once.
export async function POST(request) {
  try {
    const body = await readJson(request);
    const email = normalizeEmail(body.email);
    if (!EMAIL_RE.test(email) || email.length > 254) return fail(400, "A valid email is required");
    if (await getOfficeUserByEmail(email)) return fail(409, "An employee with this email already exists");

    let password = typeof body.password === "string" ? body.password : "";
    let generated = false;
    if (!password) {
      password = generateTemporaryPassword();
      generated = true;
    }
    const pwError = validateNewPassword(password);
    if (pwError) return fail(400, pwError);

    const teamId = body.teamId || null;
    const policyId = body.policyId || null;
    if (teamId && !(await getOfficeTeamById(teamId))) return fail(400, "Team not found");
    if (policyId && !(await getOfficePolicyById(policyId))) return fail(400, "Policy not found");

    const user = await createOfficeUser({
      email,
      name: clampString(body.name, 120),
      passwordHash: await hashPassword(password),
      teamId,
      policyId,
      mustChangePassword: body.mustChangePassword !== false,
    });
    await addOfficeAuditLog({ actor: "admin", action: "user.created", target: email });
    return ok({ user, temporaryPassword: generated ? password : null }, 201);
  } catch (error) {
    if (isUniqueViolation(error)) return fail(409, "An employee with this email already exists");
    return fail(500, error.message);
  }
}
