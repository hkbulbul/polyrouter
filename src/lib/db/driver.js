import { ensureDirs, DATA_FILE } from "./paths.js";
import { appendErrorLog } from "@/sse/utils/errorLog.js";

// Use global to survive Next.js dev hot-reload (module state resets on reload)
if (!global._dbAdapter) global._dbAdapter = { instance: null, initPromise: null, logged: false };
const state = global._dbAdapter;

async function tryBunSqlite() {
  // Bun runtime only — built-in, no install needed
  if (!process.versions.bun) return null;
  try {
    const { createBunSqliteAdapter } = await import("./adapters/bunSqliteAdapter.js");
    return await createBunSqliteAdapter(DATA_FILE);
  } catch (e) {
    console.warn(`[DB] bun:sqlite unavailable: ${e.message}`);
    return null;
  }
}

async function tryBetterSqlite() {
  // Skip on Bun — better-sqlite3 native bindings unsupported
  if (process.versions.bun) return null;
  try {
    const { createBetterSqliteAdapter } = await import("./adapters/betterSqliteAdapter.js");
    return createBetterSqliteAdapter(DATA_FILE);
  } catch (e) {
    console.warn(`[DB] better-sqlite3 unavailable: ${e.message}`);
    return null;
  }
}

async function tryNodeSqlite() {
  // Built-in since Node 22.5.0 — no install needed. Skip under Bun (no node:sqlite).
  if (process.versions.bun) return null;
  const [maj, min] = process.versions.node.split(".").map(Number);
  if (maj < 22 || (maj === 22 && min < 5)) return null;
  try {
    const { createNodeSqliteAdapter } = await import("./adapters/nodeSqliteAdapter.js");
    return await createNodeSqliteAdapter(DATA_FILE);
  } catch (e) {
    console.warn(`[DB] node:sqlite unavailable: ${e.message}`);
    return null;
  }
}

async function trySqlJs() {
  try {
    const { createSqlJsAdapter } = await import("./adapters/sqljsAdapter.js");
    return await createSqlJsAdapter(DATA_FILE);
  } catch (e) {
    console.warn(`[DB] sql.js unavailable: ${e.message}`);
    return null;
  }
}

async function initAdapter() {
  ensureDirs();
  // Order per runtime:
  //   Bun:  bun:sqlite → sql.js
  //   Node: better-sqlite3 → node:sqlite (≥22.5) → sql.js
  let adapter = await tryBunSqlite();
  if (!adapter) adapter = await tryBetterSqlite();
  if (!adapter) adapter = await tryNodeSqlite();
  if (!adapter) adapter = await trySqlJs();
  if (!adapter) throw new Error("[DB] No SQLite driver available (bun/better/node/sql.js all failed)");

  if (!state.logged) {
    console.log(`[DB] Driver: ${adapter.driver} | file: ${DATA_FILE}`);
    state.logged = true;
  }

  const { runMigrationOnce } = await import("./migrate.js");
  await runMigrationOnce(adapter);
  return adapter;
}

// A failed init used to be cached forever: `state.initPromise` held the rejected
// promise, so every later getAdapter() re-threw the same error and only a restart
// could recover — even once the real cause (locked file, transient EPERM, a
// driver that had since become loadable) had cleared. Worse, it was silent.
// Now a failure clears the cache so the next call retries, throttled so a
// genuinely broken file isn't re-probed through the whole driver chain on every
// single request.
const INIT_RETRY_BACKOFF_MS = 5_000;

export async function getAdapter() {
  if (state.instance) return state.instance;

  if (state.initFailedAt && Date.now() - state.initFailedAt < INIT_RETRY_BACKOFF_MS) {
    throw state.initError;
  }

  if (!state.initPromise) {
    state.initPromise = initAdapter()
      .then((a) => { state.instance = a; return a; })
      .catch((e) => {
        state.initPromise = null;
        state.initFailedAt = Date.now();
        state.initError = e;
        console.error(`[DB] init failed (retrying in ${INIT_RETRY_BACKOFF_MS}ms): ${e?.message || e}`);
        appendErrorLog(`ERROR [DB] init failed: ${e?.stack || e?.message || e}`);
        throw e;
      });
  }
  return state.initPromise;
}

export function getAdapterSync() {
  if (!state.instance) throw new Error("[DB] adapter not initialized — await getAdapter() first");
  return state.instance;
}
