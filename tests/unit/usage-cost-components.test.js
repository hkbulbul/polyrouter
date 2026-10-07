// Cost split by rate, unpriced detection, backfill and re-pricing.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { vi } from "vitest";

const originalDataDir = process.env.DATA_DIR;
let tempDir;
let db;
let adapter;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "polyrouter-cost-"));
  process.env.DATA_DIR = tempDir;
  vi.resetModules();
  db = await import("@/lib/db/index.js");
  await db.initDb();
  adapter = await (await import("@/lib/db/driver.js")).getAdapter();
});

afterAll(() => {
  try {
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

const dayKey = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const readDay = (iso) => JSON.parse(adapter.get(`SELECT data FROM usageDaily WHERE dateKey = ?`, [dayKey(iso)]).data);
const close = (a, b) => expect(Math.abs(a - b)).toBeLessThan(1e-9);

// gpt-5.6-luna built-in: input 1.00, output 6.00, cached 0.10 ($/1M)
const LUNA = { provider: "explabs", model: "gpt-5.6-luna" };

describe("toCostParts", () => {
  it("splits by billing rate and flags unpriced usage", async () => {
    const { toCostParts } = await import("@/lib/db/helpers/requestCost.js");
    expect(toCostParts({ totalCost: null, usageAvailable: true })).toMatchObject({ cost: 0, unpriced: 1 });
    expect(toCostParts({ totalCost: null, usageAvailable: false })).toMatchObject({ cost: 0, unpriced: 0 });
    const parts = toCostParts({
      totalCost: 10,
      components: { input: 1, cacheCreation: 2, cached: 3, output: 3.5, reasoning: 0.5 },
    });
    expect(parts).toEqual({ cost: 10, inputCost: 3, cachedCost: 3, outputCost: 4, unpriced: 0 });
  });
});

describe("recording usage", () => {
  it("stores the real per-rate split (not a token-share split)", async () => {
    const ts = new Date().toISOString();
    // 1,000,000 prompt of which 900,000 cached; 100,000 output.
    await db.saveRequestUsage({ ...LUNA, timestamp: ts, tokens: { prompt_tokens: 1_000_000, cached_tokens: 900_000, completion_tokens: 100_000 } });
    const row = adapter.get(`SELECT cost, inputCost, cachedCost, outputCost, unpriced FROM usageHistory WHERE timestamp = ?`, [ts]);
    close(row.inputCost, 0.1); // 100k uncached × $1
    close(row.cachedCost, 0.09); // 900k cached × $0.10
    close(row.outputCost, 0.6); // 100k output × $6
    close(row.cost, 0.79);
    expect(row.unpriced).toBe(0);

    const day = readDay(ts);
    close(day.outputCost, day.byModel["gpt-5.6-luna|explabs"].outputCost);
    expect(day.byModel["gpt-5.6-luna|explabs"].outputCost).toBeGreaterThan(day.byModel["gpt-5.6-luna|explabs"].inputCost);
  });

  it("flags models without a price instead of silently treating them as free", async () => {
    const ts = new Date(Date.now() + 1).toISOString();
    await db.saveRequestUsage({ provider: "codex", model: "gpt-unpriced-test", timestamp: ts, tokens: { prompt_tokens: 5000, completion_tokens: 500 } });
    const row = adapter.get(`SELECT cost, unpriced FROM usageHistory WHERE timestamp = ?`, [ts]);
    expect(row).toMatchObject({ cost: 0, unpriced: 1 });

    for (const period of ["today", "7d"]) {
      const stats = await db.getUsageStats(period);
      expect(stats.costBreakdown.unpricedRequests).toBeGreaterThanOrEqual(1);
      const entry = stats.unpricedModels.find((m) => m.model === "gpt-unpriced-test");
      expect(entry).toMatchObject({ provider: "codex", requests: 1, tokens: 5500 });
      const model = Object.values(stats.byModel).find((m) => m.rawModel === "gpt-5.6-luna");
      close(model.inputCost + model.cachedCost + model.outputCost, model.cost);
    }
  });
});

describe("backfill and recalculation", () => {
  it("backfill splits legacy rows without changing their recorded totals", async () => {
    const ts = new Date(Date.now() - 86400000).toISOString();
    // A legacy row: cost recorded at an older (doubled) price, no split columns.
    await db.saveRequestUsage({ ...LUNA, timestamp: ts, tokens: { prompt_tokens: 200_000, completion_tokens: 100_000 } });
    adapter.run(`UPDATE usageHistory SET cost = 1.6, inputCost = 0, cachedCost = 0, outputCost = 0 WHERE timestamp = ?`, [ts]);
    const day = readDay(ts);
    for (const t of [day, day.byModel["gpt-5.6-luna|explabs"]]) {
      t.cost = 1.6;
      t.inputCost = 0;
      t.outputCost = 0;
    }
    adapter.run(`UPDATE usageDaily SET data = ? WHERE dateKey = ?`, [JSON.stringify(day), dayKey(ts)]);
    adapter.run(`DELETE FROM _meta WHERE key = 'usageCostComponentsBackfilled'`);

    vi.resetModules();
    db = await import("@/lib/db/index.js");
    await db.ensureUsageCostBackfill();

    const row = adapter.get(`SELECT cost, inputCost, cachedCost, outputCost FROM usageHistory WHERE timestamp = ?`, [ts]);
    close(row.cost, 1.6); // total kept
    close(row.inputCost, 0.4); // current split is $0.20 in / $0.60 out → scaled ×2
    close(row.outputCost, 1.2);
    const after = readDay(ts);
    close(after.byModel["gpt-5.6-luna|explabs"].inputCost, 0.4);
    close(after.byModel["gpt-5.6-luna|explabs"].cost, 1.6);
  });

  it("setting a price and recalculating re-prices history and daily totals together", async () => {
    const ts = new Date(Date.now() + 2).toISOString();
    await db.saveRequestUsage({ provider: "codex", model: "gpt-6-luna", timestamp: ts, tokens: { prompt_tokens: 2_000_000, completion_tokens: 1_000_000 } });
    expect(adapter.get(`SELECT unpriced FROM usageHistory WHERE timestamp = ?`, [ts]).unpriced).toBe(1);
    const dayBefore = readDay(ts);

    await db.updatePricing({ codex: { "gpt-6-luna": { input: 2, output: 8, cached: 0.2 } } });
    const result = await db.recalculateUsageCosts({ provider: "codex", model: "gpt-6-luna" });
    expect(result).toMatchObject({ rows: 1, changed: 1, unpricedAfter: 0 });
    close(result.costAfter, 2 * 2 + 1 * 8);

    const row = adapter.get(`SELECT cost, inputCost, outputCost, unpriced FROM usageHistory WHERE timestamp = ?`, [ts]);
    expect(row.unpriced).toBe(0);
    close(row.cost, 12);
    const dayAfter = readDay(ts);
    close(dayAfter.cost - dayBefore.cost, 12);
    close(dayAfter.byModel["gpt-6-luna|codex"].cost, 12);
    close(dayAfter.byProvider.codex.cost - dayBefore.byProvider.codex.cost, 12);
    expect(dayAfter.unpricedRequests).toBe(dayBefore.unpricedRequests - 1);

    // Idempotent: nothing left to change.
    expect((await db.recalculateUsageCosts({ provider: "codex", model: "gpt-6-luna" })).changed).toBe(0);
  });

  it("lists used models with their effective price and source", async () => {
    const models = await db.getUsedModelPricing({ sinceDays: 30 });
    expect(models.find((m) => m.model === "gpt-6-luna")).toMatchObject({ provider: "codex", source: "custom", pricing: { input: 2, output: 8 } });
    expect(models.find((m) => m.model === "gpt-5.6-luna")).toMatchObject({ source: "builtin" });
    expect(models.find((m) => m.model === "gpt-unpriced-test")).toMatchObject({ source: "none", pricing: null, unpricedRequests: 1 });
  });
});
