import { v4 as uuidv4 } from "uuid";
import { getAdapter } from "../driver.js";
import { getSettings } from "./settingsRepo.js";

function rowToKey(row) {
  if (!row) return null;
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    machineId: row.machineId,
    isActive: row.isActive === 1 || row.isActive === true,
    createdAt: row.createdAt,
    userId: row.userId || null,
    expiresAt: row.expiresAt || null,
    deviceId: row.deviceId || null,
  };
}

export async function getApiKeys() {
  const db = await getAdapter();
  const rows = db.all(`SELECT * FROM apiKeys ORDER BY createdAt ASC`);
  return rows.map(rowToKey);
}

export async function getApiKeyById(id) {
  const db = await getAdapter();
  const row = db.get(`SELECT * FROM apiKeys WHERE id = ?`, [id]);
  return rowToKey(row);
}

export async function getApiKeyByValue(key) {
  if (!key || typeof key !== "string") return null;
  const db = await getAdapter();
  return rowToKey(db.get(`SELECT * FROM apiKeys WHERE key = ?`, [key]));
}

// `owner` is only set for office-mode employee keys; owner/admin keys omit it.
export async function createApiKey(name, machineId, owner = {}) {
  if (!machineId) throw new Error("machineId is required");
  const db = await getAdapter();
  const { generateApiKeyWithMachine } = await import("@/shared/utils/apiKey");
  const result = generateApiKeyWithMachine(machineId);
  const apiKey = {
    id: uuidv4(),
    name,
    key: result.key,
    machineId,
    isActive: true,
    createdAt: new Date().toISOString(),
    userId: owner.userId || null,
    expiresAt: owner.expiresAt || null,
    deviceId: owner.deviceId || null,
  };
  db.run(
    `INSERT INTO apiKeys(id, key, name, machineId, isActive, createdAt, userId, expiresAt, deviceId) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [apiKey.id, apiKey.key, apiKey.name, apiKey.machineId, 1, apiKey.createdAt, apiKey.userId, apiKey.expiresAt, apiKey.deviceId]
  );
  return apiKey;
}

export async function updateApiKey(id, data) {
  const db = await getAdapter();
  let result = null;
  db.transaction(() => {
    const row = db.get(`SELECT * FROM apiKeys WHERE id = ?`, [id]);
    if (!row) return;
    const merged = { ...rowToKey(row), ...data };
    db.run(
      `UPDATE apiKeys SET key = ?, name = ?, machineId = ?, isActive = ? WHERE id = ?`,
      [merged.key, merged.name, merged.machineId, merged.isActive ? 1 : 0, id]
    );
    result = merged;
  });
  return result;
}

export async function deleteApiKey(id) {
  const db = await getAdapter();
  const res = db.run(`DELETE FROM apiKeys WHERE id = ?`, [id]);
  return (res?.changes ?? 0) > 0;
}

// True for office-mode employee keys. Features that office policies do not
// cover (e.g. realtime voice) use this to refuse employee keys outright.
export async function isOfficeEmployeeApiKey(key) {
  if (!key || typeof key !== "string") return false;
  const db = await getAdapter();
  return Boolean(db.get(`SELECT userId FROM apiKeys WHERE key = ?`, [key])?.userId);
}

export function isApiKeyExpired(expiresAt, now = Date.now()) {
  if (!expiresAt) return false;
  const ts = Date.parse(expiresAt);
  return Number.isFinite(ts) && ts <= now;
}

export async function validateApiKey(key) {
  if (!key || typeof key !== "string") return false;
  const db = await getAdapter();
  const row = db.get(
    `SELECT k.isActive, k.userId, k.expiresAt, u.isActive AS userActive
       FROM apiKeys k LEFT JOIN officeUsers u ON u.id = k.userId
      WHERE k.key = ?`,
    [key]
  );
  if (!row) return false;
  if (!(row.isActive === 1 || row.isActive === true)) return false;
  if (!row.userId) return true;

  // Employee key: only valid while office mode is on, the employee is active,
  // and the key has not expired.
  if (!(row.userActive === 1 || row.userActive === true)) return false;
  if (isApiKeyExpired(row.expiresAt)) return false;
  const settings = await getSettings();
  return settings.office?.enabled === true;
}
