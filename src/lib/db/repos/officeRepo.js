// Office mode persistence: employees, teams, limit policies, light-client
// devices, audit log, and per-employee usage aggregates over usageHistory.
import { v4 as uuidv4 } from "uuid";
import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";

const nowIso = () => new Date().toISOString();
const isTrue = (v) => v === 1 || v === true;

export function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

// ─── Users ───────────────────────────────────────────────────────────────

function rowToUser(row, { withSecret = false } = {}) {
  if (!row) return null;
  const user = {
    id: row.id,
    email: row.email,
    name: row.name || "",
    teamId: row.teamId || null,
    policyId: row.policyId || null,
    isActive: isTrue(row.isActive),
    mustChangePassword: isTrue(row.mustChangePassword),
    sessionVersion: row.sessionVersion || 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastLoginAt: row.lastLoginAt || null,
  };
  if (withSecret) user.passwordHash = row.passwordHash;
  return user;
}

export async function listOfficeUsers() {
  const db = await getAdapter();
  return db.all(`SELECT * FROM officeUsers ORDER BY email ASC`).map((r) => rowToUser(r));
}

export async function getOfficeUserById(id, opts) {
  if (!id) return null;
  const db = await getAdapter();
  return rowToUser(db.get(`SELECT * FROM officeUsers WHERE id = ?`, [id]), opts);
}

export async function getOfficeUserByEmail(email, opts) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const db = await getAdapter();
  return rowToUser(db.get(`SELECT * FROM officeUsers WHERE email = ?`, [normalized]), opts);
}

export async function createOfficeUser({ email, name, passwordHash, teamId = null, policyId = null, mustChangePassword = true }) {
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error("email is required");
  if (!passwordHash) throw new Error("passwordHash is required");
  const db = await getAdapter();
  const ts = nowIso();
  const id = uuidv4();
  db.run(
    `INSERT INTO officeUsers(id, email, name, passwordHash, teamId, policyId, isActive, mustChangePassword, sessionVersion, createdAt, updatedAt)
     VALUES(?, ?, ?, ?, ?, ?, 1, ?, 0, ?, ?)`,
    [id, normalized, name || "", passwordHash, teamId || null, policyId || null, mustChangePassword ? 1 : 0, ts, ts]
  );
  return getOfficeUserById(id);
}

const USER_PATCHABLE = ["name", "teamId", "policyId", "isActive", "mustChangePassword", "passwordHash"];

// `bumpSession: true` invalidates every outstanding portal session and device
// token check for this user (used on password reset and disable).
export async function updateOfficeUser(id, patch = {}, { bumpSession = false } = {}) {
  const db = await getAdapter();
  const sets = [];
  const params = [];
  for (const field of USER_PATCHABLE) {
    if (patch[field] === undefined) continue;
    let value = patch[field];
    if (field === "isActive" || field === "mustChangePassword") value = value ? 1 : 0;
    if ((field === "teamId" || field === "policyId") && !value) value = null;
    sets.push(`${field} = ?`);
    params.push(value);
  }
  if (bumpSession) sets.push(`sessionVersion = COALESCE(sessionVersion, 0) + 1`);
  if (!sets.length) return getOfficeUserById(id);
  sets.push(`updatedAt = ?`);
  params.push(nowIso(), id);
  const res = db.run(`UPDATE officeUsers SET ${sets.join(", ")} WHERE id = ?`, params);
  if ((res?.changes ?? 0) === 0) return null;
  return getOfficeUserById(id);
}

export async function touchOfficeUserLogin(id) {
  const db = await getAdapter();
  db.run(`UPDATE officeUsers SET lastLoginAt = ? WHERE id = ?`, [nowIso(), id]);
}

// Deleting an employee removes their keys and devices. Their usage history is
// kept (attributed by userId) so cost reports for past periods stay correct.
export async function deleteOfficeUser(id) {
  const db = await getAdapter();
  let deleted = false;
  db.transaction(() => {
    db.run(`DELETE FROM apiKeys WHERE userId = ?`, [id]);
    db.run(`DELETE FROM officeDevices WHERE userId = ?`, [id]);
    const res = db.run(`DELETE FROM officeUsers WHERE id = ?`, [id]);
    deleted = (res?.changes ?? 0) > 0;
  });
  return deleted;
}

// ─── Teams ───────────────────────────────────────────────────────────────

function rowToTeam(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, policyId: row.policyId || null, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

export async function listOfficeTeams() {
  const db = await getAdapter();
  return db.all(`SELECT * FROM officeTeams ORDER BY name ASC`).map(rowToTeam);
}

export async function getOfficeTeamById(id) {
  if (!id) return null;
  const db = await getAdapter();
  return rowToTeam(db.get(`SELECT * FROM officeTeams WHERE id = ?`, [id]));
}

export async function createOfficeTeam({ name, policyId = null }) {
  const db = await getAdapter();
  const ts = nowIso();
  const id = uuidv4();
  db.run(`INSERT INTO officeTeams(id, name, policyId, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?)`, [id, name, policyId || null, ts, ts]);
  return getOfficeTeamById(id);
}

export async function updateOfficeTeam(id, { name, policyId } = {}) {
  const db = await getAdapter();
  const sets = [];
  const params = [];
  if (name !== undefined) { sets.push("name = ?"); params.push(name); }
  if (policyId !== undefined) { sets.push("policyId = ?"); params.push(policyId || null); }
  if (!sets.length) return getOfficeTeamById(id);
  sets.push("updatedAt = ?");
  params.push(nowIso(), id);
  const res = db.run(`UPDATE officeTeams SET ${sets.join(", ")} WHERE id = ?`, params);
  if ((res?.changes ?? 0) === 0) return null;
  return getOfficeTeamById(id);
}

export async function deleteOfficeTeam(id) {
  const db = await getAdapter();
  let deleted = false;
  db.transaction(() => {
    db.run(`UPDATE officeUsers SET teamId = NULL WHERE teamId = ?`, [id]);
    const res = db.run(`DELETE FROM officeTeams WHERE id = ?`, [id]);
    deleted = (res?.changes ?? 0) > 0;
  });
  return deleted;
}

// ─── Policies ────────────────────────────────────────────────────────────

function rowToPolicy(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, limits: parseJson(row.limits, {}), createdAt: row.createdAt, updatedAt: row.updatedAt };
}

export async function listOfficePolicies() {
  const db = await getAdapter();
  return db.all(`SELECT * FROM officePolicies ORDER BY name ASC`).map(rowToPolicy);
}

export async function getOfficePolicyById(id) {
  if (!id) return null;
  const db = await getAdapter();
  return rowToPolicy(db.get(`SELECT * FROM officePolicies WHERE id = ?`, [id]));
}

export async function createOfficePolicy({ name, limits = {} }) {
  const db = await getAdapter();
  const ts = nowIso();
  const id = uuidv4();
  db.run(`INSERT INTO officePolicies(id, name, limits, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?)`, [id, name, stringifyJson(limits), ts, ts]);
  return getOfficePolicyById(id);
}

export async function updateOfficePolicy(id, { name, limits } = {}) {
  const db = await getAdapter();
  const sets = [];
  const params = [];
  if (name !== undefined) { sets.push("name = ?"); params.push(name); }
  if (limits !== undefined) { sets.push("limits = ?"); params.push(stringifyJson(limits)); }
  if (!sets.length) return getOfficePolicyById(id);
  sets.push("updatedAt = ?");
  params.push(nowIso(), id);
  const res = db.run(`UPDATE officePolicies SET ${sets.join(", ")} WHERE id = ?`, params);
  if ((res?.changes ?? 0) === 0) return null;
  return getOfficePolicyById(id);
}

// Detaches the policy from users/teams; clearing settings.office.defaultPolicyId
// is the caller's job (settings live in a different repo).
export async function deleteOfficePolicy(id) {
  const db = await getAdapter();
  let deleted = false;
  db.transaction(() => {
    db.run(`UPDATE officeUsers SET policyId = NULL WHERE policyId = ?`, [id]);
    db.run(`UPDATE officeTeams SET policyId = NULL WHERE policyId = ?`, [id]);
    const res = db.run(`DELETE FROM officePolicies WHERE id = ?`, [id]);
    deleted = (res?.changes ?? 0) > 0;
  });
  return deleted;
}

// ─── Employee API keys ───────────────────────────────────────────────────

export async function listOfficeUserKeys(userId) {
  const db = await getAdapter();
  return db.all(`SELECT * FROM apiKeys WHERE userId = ? ORDER BY createdAt ASC`, [userId]).map((row) => ({
    id: row.id,
    key: row.key,
    name: row.name,
    isActive: isTrue(row.isActive),
    createdAt: row.createdAt,
    expiresAt: row.expiresAt || null,
    deviceId: row.deviceId || null,
  }));
}

export async function countOfficeUserKeys(userId) {
  const db = await getAdapter();
  return db.get(`SELECT COUNT(*) AS c FROM apiKeys WHERE userId = ?`, [userId])?.c ?? 0;
}

export async function deleteOfficeUserKey(userId, keyId) {
  const db = await getAdapter();
  const res = db.run(`DELETE FROM apiKeys WHERE id = ? AND userId = ?`, [keyId, userId]);
  return (res?.changes ?? 0) > 0;
}

// ─── Devices (light client) ──────────────────────────────────────────────

function rowToDevice(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId,
    name: row.name || "",
    platform: row.platform || "",
    createdAt: row.createdAt,
    lastSeenAt: row.lastSeenAt || null,
    revokedAt: row.revokedAt || null,
  };
}

export async function createOfficeDevice({ userId, name, platform, tokenHash }) {
  const db = await getAdapter();
  const id = uuidv4();
  const ts = nowIso();
  db.run(
    `INSERT INTO officeDevices(id, userId, name, platform, tokenHash, createdAt, lastSeenAt) VALUES(?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, name || "", platform || "", tokenHash, ts, ts]
  );
  return rowToDevice(db.get(`SELECT * FROM officeDevices WHERE id = ?`, [id]));
}

export async function getOfficeDeviceByTokenHash(tokenHash) {
  if (!tokenHash) return null;
  const db = await getAdapter();
  return rowToDevice(db.get(`SELECT * FROM officeDevices WHERE tokenHash = ?`, [tokenHash]));
}

export async function listOfficeDevices(userId = null) {
  const db = await getAdapter();
  const rows = userId
    ? db.all(`SELECT * FROM officeDevices WHERE userId = ? ORDER BY createdAt DESC`, [userId])
    : db.all(`SELECT * FROM officeDevices ORDER BY createdAt DESC`);
  return rows.map(rowToDevice);
}

export async function touchOfficeDevice(id) {
  const db = await getAdapter();
  db.run(`UPDATE officeDevices SET lastSeenAt = ? WHERE id = ?`, [nowIso(), id]);
}

// Revoking a device also deletes the API keys it minted.
export async function revokeOfficeDevice(id, userId = null) {
  const db = await getAdapter();
  let revoked = false;
  db.transaction(() => {
    const row = userId
      ? db.get(`SELECT id FROM officeDevices WHERE id = ? AND userId = ?`, [id, userId])
      : db.get(`SELECT id FROM officeDevices WHERE id = ?`, [id]);
    if (!row) return;
    db.run(`UPDATE officeDevices SET revokedAt = COALESCE(revokedAt, ?) WHERE id = ?`, [nowIso(), id]);
    db.run(`DELETE FROM apiKeys WHERE deviceId = ?`, [id]);
    revoked = true;
  });
  return revoked;
}

export async function getOfficeDeviceKey(deviceId) {
  const db = await getAdapter();
  const row = db.get(`SELECT * FROM apiKeys WHERE deviceId = ? AND isActive = 1 ORDER BY createdAt DESC LIMIT 1`, [deviceId]);
  return row ? { id: row.id, key: row.key, name: row.name, expiresAt: row.expiresAt || null } : null;
}

// ─── Audit log ───────────────────────────────────────────────────────────

export async function addOfficeAuditLog({ actor, action, target = null, meta = null }) {
  try {
    const db = await getAdapter();
    db.run(
      `INSERT INTO officeAuditLog(timestamp, actor, action, target, meta) VALUES(?, ?, ?, ?, ?)`,
      [nowIso(), actor || "system", action, target, meta ? stringifyJson(meta) : null]
    );
    // Keep the log bounded.
    db.run(`DELETE FROM officeAuditLog WHERE id <= (SELECT id FROM officeAuditLog ORDER BY id DESC LIMIT 1 OFFSET 5000)`);
  } catch (e) {
    console.error("[office] audit log write failed:", e?.message || e);
  }
}

export async function listOfficeAuditLog({ limit = 200 } = {}) {
  const db = await getAdapter();
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 200, 1), 1000);
  return db.all(`SELECT * FROM officeAuditLog ORDER BY id DESC LIMIT ?`, [safeLimit]).map((r) => ({
    id: r.id, timestamp: r.timestamp, actor: r.actor, action: r.action, target: r.target, meta: parseJson(r.meta, null),
  }));
}

// ─── Usage aggregates ────────────────────────────────────────────────────

export async function getOfficeUserUsageSince(userId, sinceIso) {
  const db = await getAdapter();
  const row = db.get(
    `SELECT COUNT(*) AS requests,
            COALESCE(SUM(promptTokens), 0) AS promptTokens,
            COALESCE(SUM(completionTokens), 0) AS completionTokens,
            COALESCE(SUM(cost), 0) AS cost
       FROM usageHistory WHERE userId = ? AND timestamp >= ?`,
    [userId, sinceIso]
  );
  const promptTokens = row?.promptTokens || 0;
  const completionTokens = row?.completionTokens || 0;
  return {
    requests: row?.requests || 0,
    promptTokens,
    completionTokens,
    tokens: promptTokens + completionTokens,
    cost: row?.cost || 0,
  };
}

function scopedWhere(sinceIso, userId) {
  const conds = ["userId IS NOT NULL", "timestamp >= ?"];
  const params = [sinceIso];
  if (userId) { conds.push("userId = ?"); params.push(userId); }
  return { where: conds.join(" AND "), params };
}

export async function getOfficeUsageByUser(sinceIso) {
  const db = await getAdapter();
  const { where, params } = scopedWhere(sinceIso);
  return db.all(
    `SELECT userId, COUNT(*) AS requests,
            COALESCE(SUM(promptTokens), 0) AS promptTokens,
            COALESCE(SUM(completionTokens), 0) AS completionTokens,
            COALESCE(SUM(cost), 0) AS cost,
            COUNT(DISTINCT model) AS models,
            MAX(timestamp) AS lastUsedAt
       FROM usageHistory WHERE ${where} GROUP BY userId`,
    params
  );
}

export async function getOfficeUsageByModel(sinceIso, userId = null) {
  const db = await getAdapter();
  const { where, params } = scopedWhere(sinceIso, userId);
  return db.all(
    `SELECT model, provider, COUNT(*) AS requests,
            COALESCE(SUM(promptTokens), 0) AS promptTokens,
            COALESCE(SUM(completionTokens), 0) AS completionTokens,
            COALESCE(SUM(cost), 0) AS cost
       FROM usageHistory WHERE ${where} GROUP BY model, provider ORDER BY cost DESC, requests DESC`,
    params
  );
}

export async function getOfficeUsageDaily(sinceIso, userId = null) {
  const db = await getAdapter();
  const { where, params } = scopedWhere(sinceIso, userId);
  return db.all(
    `SELECT date(timestamp, 'localtime') AS day, COUNT(*) AS requests,
            COALESCE(SUM(promptTokens), 0) + COALESCE(SUM(completionTokens), 0) AS tokens,
            COALESCE(SUM(cost), 0) AS cost
       FROM usageHistory WHERE ${where} GROUP BY day ORDER BY day ASC`,
    params
  );
}

export async function getOfficeUserIdForApiKey(key) {
  if (!key || typeof key !== "string") return null;
  const db = await getAdapter();
  return db.get(`SELECT userId FROM apiKeys WHERE key = ?`, [key])?.userId || null;
}
