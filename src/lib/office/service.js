// Office-mode operations shared by the admin API, employee portal and light client.
import {
  createApiKey,
  listOfficeUserKeys,
  getOfficeTeamById,
  isApiKeyExpired,
} from "@/lib/db/index.js";
import { getConsistentMachineId } from "@/shared/utils/machineId";
import { describeLimitStatus } from "./policy.js";
import { getUserLimitSnapshot } from "./context.js";
import { maskKey } from "./http.js";

export class OfficeError extends Error {
  constructor(status, message, code = undefined) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Current policy, usage and per-limit status for one employee. */
export async function buildUserStatus(user, officeSettings) {
  const { policy, usage, counts } = await getUserLimitSnapshot(user, officeSettings);
  const team = user.teamId ? await getOfficeTeamById(user.teamId) : null;
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      team: team ? { id: team.id, name: team.name } : null,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt,
    },
    policy: { id: policy.policyId, name: policy.policyName, source: policy.source, limits: policy.limits },
    usage,
    counts,
    limitStatus: describeLimitStatus(policy.limits, { counts, usage }),
  };
}

function keyExpiry(limits) {
  return limits.keyTtlDays ? new Date(Date.now() + limits.keyTtlDays * 86_400_000).toISOString() : null;
}

/**
 * Mint an API key owned by an employee.
 * Manual (portal) keys honour allowSelfServiceKeys and the policy's maxKeys;
 * device keys are tied to a light-client device and do not count toward maxKeys.
 */
export async function createEmployeeKey(user, officeSettings, limits, { name, deviceId = null } = {}) {
  if (!deviceId) {
    if (!officeSettings.allowSelfServiceKeys) {
      throw new OfficeError(403, "Your admin has turned off self-service API keys.");
    }
    if (limits.maxKeys) {
      const manualKeys = (await listOfficeUserKeys(user.id)).filter((k) => !k.deviceId);
      if (manualKeys.length >= limits.maxKeys) {
        throw new OfficeError(409, `You already have the maximum of ${limits.maxKeys} API keys. Delete one first.`);
      }
    }
  }
  const machineId = await getConsistentMachineId();
  const keyName = (typeof name === "string" && name.trim() ? name.trim() : "Employee key").slice(0, 80);
  return createApiKey(keyName, machineId, { userId: user.id, expiresAt: keyExpiry(limits), deviceId });
}

export function serializeKey(key, { reveal = false } = {}) {
  return {
    id: key.id,
    name: key.name,
    key: reveal ? key.key : maskKey(key.key),
    isActive: key.isActive !== false,
    createdAt: key.createdAt,
    expiresAt: key.expiresAt || null,
    expired: isApiKeyExpired(key.expiresAt),
    deviceId: key.deviceId || null,
  };
}
