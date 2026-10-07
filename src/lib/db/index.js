// Public API barrel — all DB functions
import { getAdapter } from "./driver.js";
import { stringifyJson, parseJson } from "./helpers/jsonCol.js";

// Settings
export {
  getSettings, updateSettings, setInitialPasswordHash, isCloudEnabled, getCloudUrl, exportSettings,
} from "./repos/settingsRepo.js";

// Provider connections
export {
  getProviderConnections, getProviderConnectionById,
  createProviderConnection, updateProviderConnection,
  deleteProviderConnection, deleteProviderConnectionsByProvider,
  reorderProviderConnections, cleanupProviderConnections,
} from "./repos/connectionsRepo.js";

// Provider nodes
export {
  getProviderNodes, getProviderNodeById,
  createProviderNode, updateProviderNode, deleteProviderNode,
} from "./repos/nodesRepo.js";

// Proxy pools
export {
  getProxyPools, getProxyPoolById,
  createProxyPool, updateProxyPool, deleteProxyPool,
} from "./repos/proxyPoolsRepo.js";

// API keys
export {
  getApiKeys, getApiKeyById, getApiKeyByValue, createApiKey, updateApiKey, deleteApiKey, validateApiKey, isApiKeyExpired, isOfficeEmployeeApiKey,
} from "./repos/apiKeysRepo.js";

// Combos
export {
  getCombos, getComboById, getComboByName,
  createCombo, updateCombo, deleteCombo,
} from "./repos/combosRepo.js";

// Aliases (model + custom + mitm)
export {
  getModelAliases, setModelAlias, deleteModelAlias,
  getCustomModels, addCustomModel, deleteCustomModel,
  getMitmAlias, setMitmAliasAll,
} from "./repos/aliasRepo.js";

// Pricing
export {
  getPricing, getPricingForModel, updatePricing, resetPricing, resetAllPricing,
} from "./repos/pricingRepo.js";

// Disabled models
export {
  getDisabledModels, getDisabledByProvider, disableModels, enableModels,
} from "./repos/disabledModelsRepo.js";

// Usage
export {
  statsEmitter, trackPendingRequest, getActiveRequests,
  saveRequestUsage, getUsageHistory, getUsageStats, getChartData,
  appendRequestLog, getRecentLogs,
} from "./repos/usageRepo.js";

// Usage cost maintenance (per-rate split backfill, re-pricing, used-model prices)
export {
  ensureUsageCostBackfill, recalculateUsageCosts, getUsedModelPricing,
} from "./repos/usageCostRepo.js";

// Installation identity and telemetry queue
export {
  getInstallationIdentity, getOrCreateInstallationIdentity,
  enqueueInstallationTelemetryEvent, getPendingInstallationTelemetryEvents, getNextInstallationTelemetryAttemptAt,
  acknowledgeInstallationTelemetryEvent, deferInstallationTelemetryEvent, discardInstallationTelemetryEvent,
  discardInstallationTelemetryEventsByTarget,
} from "./repos/installationIdentityRepo.js";

// Sponsors (DB-driven provider badges — position/number controlled remotely)
export {
  getSponsorsConfig, setSponsorsConfig,
  getSponsors, getPublicSponsors, getSponsor,
  upsertSponsor, deleteSponsor, reorderSponsors,
} from "./repos/sponsorsRepo.js";

// Office mode (employees, teams, policies, devices, audit, usage aggregates)
export {
  normalizeEmail,
  listOfficeUsers, getOfficeUserById, getOfficeUserByEmail, createOfficeUser, updateOfficeUser,
  touchOfficeUserLogin, deleteOfficeUser,
  listOfficeTeams, getOfficeTeamById, createOfficeTeam, updateOfficeTeam, deleteOfficeTeam,
  listOfficePolicies, getOfficePolicyById, createOfficePolicy, updateOfficePolicy, deleteOfficePolicy,
  listOfficeUserKeys, countOfficeUserKeys, deleteOfficeUserKey,
  createOfficeDevice, getOfficeDeviceByTokenHash, listOfficeDevices, touchOfficeDevice, revokeOfficeDevice, getOfficeDeviceKey,
  addOfficeAuditLog, listOfficeAuditLog,
  getOfficeUserUsageSince, getOfficeUsageByUser, getOfficeUsageByModel, getOfficeUsageDaily, getOfficeUserIdForApiKey,
} from "./repos/officeRepo.js";

// Request details
export {
  saveRequestDetail, getRequestDetails, getRequestDetailById, getDistinctProviders,
} from "./repos/requestDetailsRepo.js";

// Export/import full DB
export async function exportDb() {
  const db = await getAdapter();
  const { exportSettings } = await import("./repos/settingsRepo.js");

  const out = {
    settings: await exportSettings(),
    providerConnections: db.all(`SELECT * FROM providerConnections`).map((r) => ({ ...parseJson(r.data, {}), id: r.id, provider: r.provider, authType: r.authType, name: r.name, email: r.email, priority: r.priority, isActive: r.isActive === 1, createdAt: r.createdAt, updatedAt: r.updatedAt })),
    providerNodes: db.all(`SELECT * FROM providerNodes`).map((r) => ({ ...parseJson(r.data, {}), id: r.id, type: r.type, name: r.name, createdAt: r.createdAt, updatedAt: r.updatedAt })),
    proxyPools: db.all(`SELECT * FROM proxyPools`).map((r) => ({ ...parseJson(r.data, {}), id: r.id, isActive: r.isActive === 1, testStatus: r.testStatus, createdAt: r.createdAt, updatedAt: r.updatedAt })),
    apiKeys: db.all(`SELECT * FROM apiKeys`).map((r) => ({ id: r.id, key: r.key, name: r.name, machineId: r.machineId, isActive: r.isActive === 1, createdAt: r.createdAt, userId: r.userId || null, expiresAt: r.expiresAt || null, deviceId: r.deviceId || null })),
    combos: db.all(`SELECT * FROM combos`).map((r) => ({ id: r.id, name: r.name, kind: r.kind, models: parseJson(r.models, []), createdAt: r.createdAt, updatedAt: r.updatedAt })),
    modelAliases: {},
    customModels: [],
    mitmAlias: {},
    pricing: {},
    sponsors: {},
    office: {
      users: db.all(`SELECT * FROM officeUsers`),
      teams: db.all(`SELECT * FROM officeTeams`),
      policies: db.all(`SELECT * FROM officePolicies`),
    },
  };

  for (const r of db.all(`SELECT key, value FROM kv WHERE scope = 'modelAliases'`)) out.modelAliases[r.key] = parseJson(r.value);
  for (const r of db.all(`SELECT key, value FROM kv WHERE scope = 'customModels'`)) out.customModels.push(parseJson(r.value));
  for (const r of db.all(`SELECT key, value FROM kv WHERE scope = 'mitmAlias'`)) out.mitmAlias[r.key] = parseJson(r.value);
  for (const r of db.all(`SELECT key, value FROM kv WHERE scope = 'pricing'`)) out.pricing[r.key] = parseJson(r.value);
  for (const r of db.all(`SELECT key, value FROM kv WHERE scope = 'sponsors'`)) out.sponsors[r.key] = parseJson(r.value);

  return out;
}

export async function importDb(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Invalid database payload");
  }
  const db = await getAdapter();

  db.transaction(() => {
    // Wipe all tables (keep _meta)
    db.run(`DELETE FROM settings`);
    db.run(`DELETE FROM providerConnections`);
    db.run(`DELETE FROM providerNodes`);
    db.run(`DELETE FROM proxyPools`);
    db.run(`DELETE FROM apiKeys`);
    db.run(`DELETE FROM combos`);
    db.run(`DELETE FROM kv WHERE scope IN ('modelAliases', 'customModels', 'mitmAlias', 'pricing', 'sponsors')`);

    // Settings
    if (payload.settings) {
      db.run(`INSERT INTO settings(id, data) VALUES(1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`, [stringifyJson(payload.settings)]);
    }

    for (const c of payload.providerConnections || []) {
      const { id, provider, authType, name, email, priority, isActive, createdAt, updatedAt, ...rest } = c;
      db.run(
        `INSERT OR REPLACE INTO providerConnections(id, provider, authType, name, email, priority, isActive, data, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, provider, authType || "oauth", name || null, email || null, priority || null, isActive === false ? 0 : 1, stringifyJson(rest), createdAt || new Date().toISOString(), updatedAt || new Date().toISOString()]
      );
    }
    for (const n of payload.providerNodes || []) {
      const { id, type, name, createdAt, updatedAt, ...rest } = n;
      db.run(
        `INSERT OR REPLACE INTO providerNodes(id, type, name, data, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?)`,
        [id, type || null, name || null, stringifyJson(rest), createdAt || new Date().toISOString(), updatedAt || new Date().toISOString()]
      );
    }
    for (const p of payload.proxyPools || []) {
      const { id, isActive, testStatus, createdAt, updatedAt, ...rest } = p;
      db.run(
        `INSERT OR REPLACE INTO proxyPools(id, isActive, testStatus, data, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?)`,
        [id, isActive === false ? 0 : 1, testStatus || "unknown", stringifyJson(rest), createdAt || new Date().toISOString(), updatedAt || new Date().toISOString()]
      );
    }
    for (const k of payload.apiKeys || []) {
      db.run(
        `INSERT OR REPLACE INTO apiKeys(id, key, name, machineId, isActive, createdAt, userId, expiresAt, deviceId) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [k.id, k.key, k.name || null, k.machineId || null, k.isActive === false ? 0 : 1, k.createdAt || new Date().toISOString(), k.userId || null, k.expiresAt || null, k.deviceId || null]
      );
    }
    // Office tables are only replaced when the payload carries them, so restoring
    // an export from before office mode existed does not wipe employees.
    if (payload.office && typeof payload.office === "object") {
      db.run(`DELETE FROM officeUsers`);
      db.run(`DELETE FROM officeTeams`);
      db.run(`DELETE FROM officePolicies`);
      for (const u of payload.office.users || []) {
        db.run(
          `INSERT OR REPLACE INTO officeUsers(id, email, name, passwordHash, teamId, policyId, isActive, mustChangePassword, sessionVersion, createdAt, updatedAt, lastLoginAt) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [u.id, u.email, u.name || "", u.passwordHash, u.teamId || null, u.policyId || null, u.isActive === 0 ? 0 : 1, u.mustChangePassword ? 1 : 0, u.sessionVersion || 0, u.createdAt || new Date().toISOString(), u.updatedAt || new Date().toISOString(), u.lastLoginAt || null]
        );
      }
      for (const t of payload.office.teams || []) {
        db.run(
          `INSERT OR REPLACE INTO officeTeams(id, name, policyId, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?)`,
          [t.id, t.name, t.policyId || null, t.createdAt || new Date().toISOString(), t.updatedAt || new Date().toISOString()]
        );
      }
      for (const p of payload.office.policies || []) {
        db.run(
          `INSERT OR REPLACE INTO officePolicies(id, name, limits, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?)`,
          [p.id, p.name, typeof p.limits === "string" ? p.limits : stringifyJson(p.limits || {}), p.createdAt || new Date().toISOString(), p.updatedAt || new Date().toISOString()]
        );
      }
    }
    for (const c of payload.combos || []) {
      db.run(
        `INSERT OR REPLACE INTO combos(id, name, kind, models, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?)`,
        [c.id, c.name, c.kind || null, stringifyJson(c.models || []), c.createdAt || new Date().toISOString(), c.updatedAt || new Date().toISOString()]
      );
    }
    for (const [a, m] of Object.entries(payload.modelAliases || {})) {
      db.run(`INSERT OR REPLACE INTO kv(scope, key, value) VALUES('modelAliases', ?, ?)`, [a, stringifyJson(m)]);
    }
    for (const m of payload.customModels || []) {
      const k = `${m.providerAlias}|${m.id}|${m.type || "llm"}`;
      db.run(`INSERT OR REPLACE INTO kv(scope, key, value) VALUES('customModels', ?, ?)`, [k, stringifyJson(m)]);
    }
    for (const [tool, mappings] of Object.entries(payload.mitmAlias || {})) {
      db.run(`INSERT OR REPLACE INTO kv(scope, key, value) VALUES('mitmAlias', ?, ?)`, [tool, stringifyJson(mappings || {})]);
    }
    for (const [provider, models] of Object.entries(payload.pricing || {})) {
      db.run(`INSERT OR REPLACE INTO kv(scope, key, value) VALUES('pricing', ?, ?)`, [provider, stringifyJson(models || {})]);
    }
    for (const [key, val] of Object.entries(payload.sponsors || {})) {
      db.run(`INSERT OR REPLACE INTO kv(scope, key, value) VALUES('sponsors', ?, ?)`, [key, stringifyJson(val)]);
    }
  });

  return await exportDb();
}

// Eager init helper (optional)
export async function initDb() {
  await getAdapter();
}
