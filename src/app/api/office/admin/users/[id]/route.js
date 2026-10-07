import {
  getOfficeUserById, updateOfficeUser, deleteOfficeUser, getOfficeTeamById, getOfficePolicyById,
  listOfficeUserKeys, listOfficeDevices, addOfficeAuditLog,
} from "@/lib/db/index.js";
import { getOfficeSettings } from "@/lib/office/context.js";
import { buildUserStatus, serializeKey } from "@/lib/office/service.js";
import { ok, fail, readJson, clampString } from "@/lib/office/http.js";

export const dynamic = "force-dynamic";

// GET /api/office/admin/users/:id — profile, effective policy + live limit status, keys (masked), devices.
export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const user = await getOfficeUserById(id);
    if (!user) return fail(404, "Employee not found");
    const [status, keys, devices] = await Promise.all([
      buildUserStatus(user, await getOfficeSettings()),
      listOfficeUserKeys(id),
      listOfficeDevices(id),
    ]);
    return ok({
      user,
      status,
      keys: keys.map((k) => serializeKey(k)),
      devices,
    });
  } catch (error) {
    return fail(500, error.message);
  }
}

// PATCH /api/office/admin/users/:id — name, team, policy, active, must-change-password.
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const existing = await getOfficeUserById(id);
    if (!existing) return fail(404, "Employee not found");
    const body = await readJson(request);
    const patch = {};

    if (body.name !== undefined) patch.name = clampString(body.name, 120);
    if (body.teamId !== undefined) {
      if (body.teamId && !(await getOfficeTeamById(body.teamId))) return fail(400, "Team not found");
      patch.teamId = body.teamId || null;
    }
    if (body.policyId !== undefined) {
      if (body.policyId && !(await getOfficePolicyById(body.policyId))) return fail(400, "Policy not found");
      patch.policyId = body.policyId || null;
    }
    if (body.isActive !== undefined) patch.isActive = body.isActive === true;
    if (body.mustChangePassword !== undefined) patch.mustChangePassword = body.mustChangePassword === true;

    // Disabling ends every portal session immediately.
    const disabling = patch.isActive === false && existing.isActive;
    const user = await updateOfficeUser(id, patch, { bumpSession: disabling });

    let action = "user.updated";
    if (patch.isActive === false && existing.isActive) action = "user.disabled";
    else if (patch.isActive === true && !existing.isActive) action = "user.enabled";
    await addOfficeAuditLog({ actor: "admin", action, target: existing.email, meta: patch });
    return ok({ user });
  } catch (error) {
    return fail(500, error.message);
  }
}

// DELETE /api/office/admin/users/:id — removes the employee, their keys and devices (usage history is kept).
export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const existing = await getOfficeUserById(id);
    if (!existing) return fail(404, "Employee not found");
    await deleteOfficeUser(id);
    await addOfficeAuditLog({ actor: "admin", action: "user.deleted", target: existing.email });
    return ok({ success: true });
  } catch (error) {
    return fail(500, error.message);
  }
}
