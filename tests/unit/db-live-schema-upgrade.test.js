// A dev server keeps its DB adapter on `global` across hot reloads. When reloaded
// code ships a newer schema, the next getAdapter() must apply it instead of
// writing to tables that lack the new columns until someone restarts.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

const originalDataDir = process.env.DATA_DIR;
let tempDir;

beforeAll(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "polyrouter-live-upgrade-"));
  process.env.DATA_DIR = tempDir;
  delete global._dbAdapter;
  vi.resetModules();
});

afterAll(() => {
  delete global._dbAdapter;
  try {
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

describe("live adapter schema upgrade", () => {
  it("re-applies pending migrations when the loaded schema is newer than the live adapter", async () => {
    const { getAdapter } = await import("@/lib/db/driver.js");
    const { SCHEMA_VERSION } = await import("@/lib/db/schema.js");
    const adapter = await getAdapter();
    const cols = () => adapter.all("PRAGMA table_info(usageHistory)").map((c) => c.name);
    expect(cols()).toContain("unpriced");

    // Simulate a server that booted on the previous schema and then hot-reloaded.
    adapter.exec("ALTER TABLE usageHistory DROP COLUMN unpriced");
    adapter.run("UPDATE _meta SET value = ? WHERE key = 'schemaVersion'", [String(SCHEMA_VERSION - 1)]);
    global._dbAdapter.schemaVersion = SCHEMA_VERSION - 1;
    expect(cols()).not.toContain("unpriced");

    const same = await getAdapter();
    expect(same).toBe(adapter); // same connection, upgraded in place
    expect(cols()).toContain("unpriced");
    expect(adapter.get("SELECT value FROM _meta WHERE key = 'schemaVersion'").value).toBe(String(SCHEMA_VERSION));
    expect(global._dbAdapter.schemaVersion).toBe(SCHEMA_VERSION);
  });
});
