import { getSettings, updateSettings, getOfficePolicyById, listOfficeUsers, listOfficeTeams, listOfficePolicies, addOfficeAuditLog } from "@/lib/db/index.js";
import { normalizeOfficeSettings } from "@/lib/office/context.js";
import { ok, fail, readJson, clampString } from "@/lib/office/http.js";

export const dynamic = "force-dynamic";

async function buildResponse(settings) {
  const [users, teams, policies] = await Promise.all([listOfficeUsers(), listOfficeTeams(), listOfficePolicies()]);
  return {
    office: normalizeOfficeSettings(settings.office),
    hasAdminPassword: Boolean(settings.password),
    counts: {
      users: users.length,
      activeUsers: users.filter((u) => u.isActive).length,
      teams: teams.length,
      policies: policies.length,
    },
  };
}

// GET /api/office/admin/settings
export async function GET() {
  try {
    return ok(await buildResponse(await getSettings()));
  } catch (error) {
    return fail(500, error.message);
  }
}

// PUT /api/office/admin/settings — partial update of office settings.
export async function PUT(request) {
  try {
    const body = await readJson(request);
    const settings = await getSettings();
    const current = normalizeOfficeSettings(settings.office);
    const next = { ...current };

    if (body.enabled !== undefined) {
      next.enabled = body.enabled === true;
      if (next.enabled && !settings.password) {
        return fail(409, "Set a dashboard password before turning on Office mode — employees will be on the same network as the admin dashboard.");
      }
    }
    if (body.orgName !== undefined) next.orgName = clampString(body.orgName, 120);
    if (body.publicUrl !== undefined) {
      const url = clampString(body.publicUrl, 300).replace(/\/+$/, "");
      if (url) {
        try {
          const parsed = new URL(url);
          if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("bad protocol");
        } catch {
          return fail(400, "Server URL must be a full http(s) URL, e.g. https://ai.company.com");
        }
      }
      next.publicUrl = url;
    }
    if (body.allowSelfServiceKeys !== undefined) next.allowSelfServiceKeys = body.allowSelfServiceKeys === true;
    if (body.allowClientLogin !== undefined) next.allowClientLogin = body.allowClientLogin === true;
    if (body.defaultPolicyId !== undefined) {
      if (body.defaultPolicyId && !(await getOfficePolicyById(body.defaultPolicyId))) {
        return fail(400, "Default policy not found");
      }
      next.defaultPolicyId = body.defaultPolicyId || null;
    }

    const updated = await updateSettings({ office: next });
    if (current.enabled !== next.enabled) {
      await addOfficeAuditLog({ actor: "admin", action: next.enabled ? "office.enabled" : "office.disabled" });
    } else {
      await addOfficeAuditLog({ actor: "admin", action: "office.settings_updated" });
    }
    return ok(await buildResponse(updated));
  } catch (error) {
    return fail(500, error.message);
  }
}
