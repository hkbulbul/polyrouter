// Resolves who an office-mode request belongs to and which policy applies.
import {
  getSettings,
  getApiKeyByValue,
  isApiKeyExpired,
  getOfficeUserById,
  getOfficeTeamById,
  getOfficePolicyById,
  getOfficeUserUsageSince,
} from "@/lib/db/index.js";
import { normalizeLimits, getWindowStarts } from "./policy.js";
import { getCachedUsage, getRequestCounts } from "./usageCache.js";

export const OFFICE_SETTINGS_DEFAULTS = {
  enabled: false,
  orgName: "",
  publicUrl: "",
  allowSelfServiceKeys: true,
  allowClientLogin: true,
  defaultPolicyId: null,
};

export function normalizeOfficeSettings(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  return {
    enabled: src.enabled === true,
    orgName: typeof src.orgName === "string" ? src.orgName.trim().slice(0, 120) : "",
    publicUrl: typeof src.publicUrl === "string" ? src.publicUrl.trim().replace(/\/+$/, "") : "",
    allowSelfServiceKeys: src.allowSelfServiceKeys !== false,
    allowClientLogin: src.allowClientLogin !== false,
    defaultPolicyId: typeof src.defaultPolicyId === "string" && src.defaultPolicyId ? src.defaultPolicyId : null,
  };
}

export async function getOfficeSettings(settings = null) {
  const s = settings || (await getSettings());
  return normalizeOfficeSettings(s.office);
}

// Effective policy: the user's own policy, else their team's, else the
// office default. Whole-policy precedence (no field merging) keeps the result
// predictable and easy to explain in the UI.
export async function resolveEffectivePolicy(user, officeSettings) {
  const candidates = [];
  if (user?.policyId) candidates.push(["user", user.policyId]);
  if (user?.teamId) {
    const team = await getOfficeTeamById(user.teamId);
    if (team?.policyId) candidates.push(["team", team.policyId]);
  }
  if (officeSettings?.defaultPolicyId) candidates.push(["default", officeSettings.defaultPolicyId]);

  for (const [source, policyId] of candidates) {
    const policy = await getOfficePolicyById(policyId);
    if (policy) {
      return { source, policyId: policy.id, policyName: policy.name, limits: normalizeLimits(policy.limits) };
    }
  }
  return { source: "none", policyId: null, policyName: "Unlimited", limits: normalizeLimits({}) };
}

export async function getUserUsageWindows(userId, now = new Date()) {
  const { dayStartIso, monthStartIso } = getWindowStarts(now);
  const [day, month] = await Promise.all([
    getCachedUsage(userId, dayStartIso, () => getOfficeUserUsageSince(userId, dayStartIso)),
    getCachedUsage(userId, monthStartIso, () => getOfficeUserUsageSince(userId, monthStartIso)),
  ]);
  return { day, month };
}

export async function getUserLimitSnapshot(user, officeSettings, now = new Date()) {
  const policy = await resolveEffectivePolicy(user, officeSettings);
  const usage = await getUserUsageWindows(user.id, now);
  const counts = getRequestCounts(user.id, now);
  return { policy, usage, counts };
}

/**
 * Resolve the office context for an inbound gateway API key.
 * @returns {Promise<null | {error:{status,code,message}} | {user, key, policy, officeSettings}>}
 *   null → not an employee key (owner traffic or no key); the gate stays out of the way.
 */
export async function resolveOfficeRequestContext(apiKey) {
  if (!apiKey) return null;
  const key = await getApiKeyByValue(apiKey);
  if (!key || !key.userId) return null;

  const settings = await getSettings();
  const officeSettings = normalizeOfficeSettings(settings.office);
  if (!officeSettings.enabled) {
    return { error: { status: 401, code: "office_disabled", message: "Office access is turned off on this PolyRouter server." } };
  }
  if (!key.isActive) {
    return { error: { status: 401, code: "office_key_revoked", message: "This API key has been revoked." } };
  }
  if (isApiKeyExpired(key.expiresAt)) {
    return { error: { status: 401, code: "office_key_expired", message: "This API key has expired. Create a new one in the employee portal." } };
  }
  const user = await getOfficeUserById(key.userId);
  if (!user || !user.isActive) {
    return { error: { status: 403, code: "office_account_disabled", message: "Your office account is disabled. Contact your admin." } };
  }

  const policy = await resolveEffectivePolicy(user, officeSettings);
  return { user, key, policy, officeSettings };
}
