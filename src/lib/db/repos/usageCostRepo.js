// Usage cost maintenance: backfill the per-rate cost split, re-price usage with
// current rates, and report each used model's effective price.
import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";
import { calculateRequestCostWithPricing, toCostParts } from "../helpers/requestCost.js";
import { getMetaSync, setMetaSync } from "../helpers/metaStore.js";
import { getPricingForModel } from "./pricingRepo.js";
import { COST_FIELDS, dayKeysForRow, getLocalDateKey, rowCostValues } from "./usageRepo.js";
import { invalidateOfficeUsage } from "../../office/usageCache.js";

const BACKFILL_FLAG = "usageCostComponentsBackfilled";
const ROW_COLUMNS = "id, timestamp, provider, model, connectionId, apiKey, endpoint, promptTokens, completionTokens, cost, tokens, userId, inputCost, cachedCost, outputCost, unpriced";

// Resolve pricing once per provider/model for bulk jobs.
function makePricingResolver() {
  const cache = new Map();
  return async (provider, model) => {
    const key = `${provider || ""}|${model || ""}`;
    if (!cache.has(key)) cache.set(key, await getPricingForModel(provider, model));
    return cache.get(key);
  };
}

/**
 * Backfill keeps a row's recorded total and only fills in how it splits by rate.
 * A row recorded at $0 although tokens were used is marked unpriced, even if a
 * price exists now — "Recalculate" applies today's price to it explicitly.
 */
function backfillParts(row, breakdown) {
  const stored = row.cost || 0;
  const priced = toCostParts(breakdown);
  if (stored <= 0) {
    const usedTokens = breakdown.usageAvailable;
    const freeByPrice = breakdown.pricingFound && priced.cost === 0;
    return { cost: 0, inputCost: 0, cachedCost: 0, outputCost: 0, unpriced: usedTokens && !freeByPrice ? 1 : 0 };
  }
  if (!breakdown.pricingFound || priced.cost <= 0) {
    // Cost recorded under a price that no longer exists: keep it, split unknown.
    return { cost: stored, inputCost: stored, cachedCost: 0, outputCost: 0, unpriced: 0 };
  }
  const scale = stored / priced.cost;
  return {
    cost: stored,
    inputCost: priced.inputCost * scale,
    cachedCost: priced.cachedCost * scale,
    outputCost: priced.outputCost * scale,
    unpriced: 0,
  };
}

/**
 * Write new cost parts for the given rows and move usageDaily aggregates by the
 * exact per-row difference, all in one transaction.
 * @param {Array<{row, next}>} updates
 */
function applyCostUpdates(db, updates) {
  const affectedUsers = new Set();
  db.transaction(() => {
    const days = new Map();
    const loadDay = (dateKey) => {
      if (!days.has(dateKey)) {
        const r = db.get(`SELECT data FROM usageDaily WHERE dateKey = ?`, [dateKey]);
        days.set(dateKey, r ? parseJson(r.data, null) : null);
      }
      return days.get(dateKey);
    };

    for (const { row, next } of updates) {
      db.run(
        `UPDATE usageHistory SET cost = ?, inputCost = ?, cachedCost = ?, outputCost = ?, unpriced = ? WHERE id = ?`,
        [next.cost, next.inputCost, next.cachedCost, next.outputCost, next.unpriced, row.id]
      );
      if (row.userId) affectedUsers.add(row.userId);

      const day = loadDay(getLocalDateKey(row.timestamp));
      if (!day) continue;
      const before = rowCostValues(row, row.promptTokens, row.completionTokens);
      const after = rowCostValues(next, row.promptTokens, row.completionTokens);
      const shift = (target) => {
        if (!target) return;
        target.cost = (target.cost || 0) + (after.cost - before.cost);
        for (const f of COST_FIELDS) target[f] = (target[f] || 0) + (after[f] - before[f]);
      };
      shift(day);
      const keys = dayKeysForRow(row);
      for (const [map, key] of Object.entries(keys)) {
        if (key !== null && key !== undefined) shift(day[map]?.[key]);
      }
    }

    for (const [dateKey, day] of days) {
      if (day) db.run(`UPDATE usageDaily SET data = ? WHERE dateKey = ?`, [stringifyJson(day), dateKey]);
    }
  });
  for (const userId of affectedUsers) invalidateOfficeUsage(userId);
}

const changed = (row, next) =>
  Math.abs((row.cost || 0) - next.cost) > 1e-12 ||
  Math.abs((row.inputCost || 0) - next.inputCost) > 1e-12 ||
  Math.abs((row.cachedCost || 0) - next.cachedCost) > 1e-12 ||
  Math.abs((row.outputCost || 0) - next.outputCost) > 1e-12 ||
  (row.unpriced ? 1 : 0) !== next.unpriced;

let backfillPromise = null;

/** One-time split of existing rows' cost by rate. Recorded totals are not changed. */
export function ensureUsageCostBackfill() {
  if (!backfillPromise) {
    backfillPromise = (async () => {
      const db = await getAdapter();
      if (getMetaSync(db, BACKFILL_FLAG, "0") === "1") return { rows: 0, skipped: true };
      const rows = db.all(`SELECT ${ROW_COLUMNS} FROM usageHistory WHERE inputCost = 0 AND cachedCost = 0 AND outputCost = 0 AND unpriced = 0`);
      const resolve = makePricingResolver();
      const updates = [];
      for (const row of rows) {
        const breakdown = calculateRequestCostWithPricing(await resolve(row.provider, row.model), parseJson(row.tokens, {}));
        const next = backfillParts(row, breakdown);
        if (changed(row, next)) updates.push({ row, next });
      }
      applyCostUpdates(db, updates);
      setMetaSync(db, BACKFILL_FLAG, "1");
      return { rows: updates.length };
    })().catch((error) => {
      backfillPromise = null;
      console.error("[usage] cost backfill failed:", error?.message || error);
      return { rows: 0, error: error?.message };
    });
  }
  return backfillPromise;
}

/**
 * Re-price recorded usage with the current rates (custom prices included).
 * @param {{provider?: string, model?: string}} [filter] limit to one provider and/or model
 * @returns {Promise<{rows:number, changed:number, costBefore:number, costAfter:number, unpricedAfter:number}>}
 */
export async function recalculateUsageCosts(filter = {}) {
  await ensureUsageCostBackfill();
  const db = await getAdapter();
  const conds = [];
  const params = [];
  if (filter.provider) { conds.push("provider = ?"); params.push(filter.provider); }
  if (filter.model) { conds.push("model = ?"); params.push(filter.model); }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const rows = db.all(`SELECT ${ROW_COLUMNS} FROM usageHistory ${where}`, params);

  const resolve = makePricingResolver();
  const updates = [];
  let costBefore = 0;
  let costAfter = 0;
  let unpricedAfter = 0;
  for (const row of rows) {
    const next = toCostParts(calculateRequestCostWithPricing(await resolve(row.provider, row.model), parseJson(row.tokens, {})));
    costBefore += row.cost || 0;
    costAfter += next.cost;
    unpricedAfter += next.unpriced;
    if (changed(row, next)) updates.push({ row, next });
  }
  applyCostUpdates(db, updates);
  return { rows: rows.length, changed: updates.length, costBefore, costAfter, unpricedAfter };
}

/**
 * Every provider/model with recorded usage in the window, with its effective
 * price and where that price comes from (custom, built-in, or none).
 */
export async function getUsedModelPricing({ sinceDays = 90 } = {}) {
  await ensureUsageCostBackfill();
  const db = await getAdapter();
  const since = new Date(Date.now() - sinceDays * 86400000).toISOString();
  const rows = db.all(
    `SELECT provider, model, COUNT(*) AS requests,
            COALESCE(SUM(promptTokens), 0) + COALESCE(SUM(completionTokens), 0) AS tokens,
            COALESCE(SUM(cost), 0) AS cost, COALESCE(SUM(unpriced), 0) AS unpricedRequests,
            MAX(timestamp) AS lastUsed
       FROM usageHistory WHERE timestamp >= ? AND model IS NOT NULL
      GROUP BY provider, model ORDER BY cost DESC, tokens DESC`,
    [since]
  );
  const userPricing = {};
  for (const r of db.all(`SELECT key, value FROM kv WHERE scope = 'pricing'`)) userPricing[r.key] = parseJson(r.value, {}) || {};
  const { getPricingForModel: builtIn } = await import("open-sse/providers/pricing.js");

  return rows.map((r) => {
    const custom = userPricing[r.provider]?.[r.model] || null;
    const builtin = builtIn(r.provider, r.model);
    return {
      ...r,
      pricing: custom || builtin || null,
      source: custom ? "custom" : builtin ? "builtin" : "none",
      builtinPricing: builtin || null,
    };
  });
}
