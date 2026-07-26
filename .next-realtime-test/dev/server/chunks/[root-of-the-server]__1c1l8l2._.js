module.exports = [
"[externals]/next/dist/build/adapter/setup-node-env.external.js [external] (next/dist/build/adapter/setup-node-env.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/build/adapter/setup-node-env.external.js", () => require("next/dist/build/adapter/setup-node-env.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/lib/incremental-cache/tags-manifest.external.js [external] (next/dist/server/lib/incremental-cache/tags-manifest.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/lib/incremental-cache/tags-manifest.external.js", () => require("next/dist/server/lib/incremental-cache/tags-manifest.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/next/dist/server/lib/incremental-cache/memory-cache.external.js [external] (next/dist/server/lib/incremental-cache/memory-cache.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/lib/incremental-cache/memory-cache.external.js", () => require("next/dist/server/lib/incremental-cache/memory-cache.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/lib/incremental-cache/shared-cache-controls.external.js [external] (next/dist/server/lib/incremental-cache/shared-cache-controls.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/lib/incremental-cache/shared-cache-controls.external.js", () => require("next/dist/server/lib/incremental-cache/shared-cache-controls.external.js"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/node:path [external] (node:path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:path", () => require("node:path"));

module.exports = mod;
}),
"[externals]/node:fs [external] (node:fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:fs", () => require("node:fs"));

module.exports = mod;
}),
"[externals]/os [external] (os, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("os", () => require("os"));

module.exports = mod;
}),
"[project]/src/lib/dataDir.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DATA_DIR",
    ()=>DATA_DIR,
    "getDataDir",
    ()=>getDataDir
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:fs [external] (node:fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$os__$5b$external$5d$__$28$os$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/os [external] (os, cjs)");
;
;
;
const APP_NAME = "9router";
function defaultDir() {
    if ("TURBOPACK compile-time truthy", 1) {
        return __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(process.env.APPDATA || __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$externals$5d2f$os__$5b$external$5d$__$28$os$2c$__cjs$29$__["default"].homedir(), "AppData", "Roaming"), APP_NAME);
    }
    //TURBOPACK unreachable
    ;
}
function getDataDir() {
    const configured = process.env.DATA_DIR;
    if (!configured) return defaultDir();
    // On Windows, ignore Unix-style absolute paths (e.g. /var/lib/...) that come
    // from a Linux-targeted .env or Docker config — they are not valid here.
    if (process.platform === "win32" && /^\//.test(configured)) {
        console.warn(`[DATA_DIR] '${configured}' is a Unix path on Windows → fallback to default`);
        return defaultDir();
    }
    try {
        __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].mkdirSync(configured, {
            recursive: true
        });
        return configured;
    } catch (e) {
        if (e?.code === "EACCES" || e?.code === "EPERM") {
            console.warn(`[DATA_DIR] '${configured}' not writable → fallback ~/.${APP_NAME}`);
            return defaultDir();
        }
        throw e;
    }
}
const DATA_DIR = getDataDir();
}),
"[project]/src/lib/db/paths.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BACKUPS_DIR",
    ()=>BACKUPS_DIR,
    "DATA_FILE",
    ()=>DATA_FILE,
    "DB_DIR",
    ()=>DB_DIR,
    "LEGACY_FILES",
    ()=>LEGACY_FILES,
    "ensureDirs",
    ()=>ensureDirs
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:path [external] (node:path, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:fs [external] (node:fs, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$dataDir$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/dataDir.js [middleware] (ecmascript)");
;
;
;
const DB_DIR = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$dataDir$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["DATA_DIR"], "db");
const DATA_FILE = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(DB_DIR, "data.sqlite");
const BACKUPS_DIR = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(DB_DIR, "backups");
const LEGACY_FILES = {
    main: __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$dataDir$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["DATA_DIR"], "db.json"),
    usage: __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$dataDir$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["DATA_DIR"], "usage.json"),
    disabled: __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$dataDir$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["DATA_DIR"], "disabledModels.json"),
    details: __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$dataDir$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["DATA_DIR"], "request-details.json")
};
function ensureDirs() {
    for (const dir of [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$dataDir$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["DATA_DIR"],
        DB_DIR,
        BACKUPS_DIR
    ]){
        if (!__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].existsSync(dir)) __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].mkdirSync(dir, {
            recursive: true
        });
    }
}
}),
"[project]/src/lib/db/driver.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getAdapter",
    ()=>getAdapter,
    "getAdapterSync",
    ()=>getAdapterSync
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$paths$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/paths.js [middleware] (ecmascript)");
;
// Use global to survive Next.js dev hot-reload (module state resets on reload)
if (!/*TURBOPACK member replacement*/ __turbopack_context__.g._dbAdapter) /*TURBOPACK member replacement*/ __turbopack_context__.g._dbAdapter = {
    instance: null,
    initPromise: null,
    logged: false
};
const state = /*TURBOPACK member replacement*/ __turbopack_context__.g._dbAdapter;
async function tryBunSqlite() {
    // Bun runtime only — built-in, no install needed
    if (!process.versions.bun) return null;
    try {
        const { createBunSqliteAdapter } = await __turbopack_context__.A("[project]/src/lib/db/adapters/bunSqliteAdapter.js [middleware] (ecmascript, async loader)");
        return await createBunSqliteAdapter(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$paths$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["DATA_FILE"]);
    } catch (e) {
        console.warn(`[DB] bun:sqlite unavailable: ${e.message}`);
        return null;
    }
}
async function tryBetterSqlite() {
    // Skip on Bun — better-sqlite3 native bindings unsupported
    if (process.versions.bun) return null;
    try {
        const { createBetterSqliteAdapter } = await __turbopack_context__.A("[project]/src/lib/db/adapters/betterSqliteAdapter.js [middleware] (ecmascript, async loader)");
        return createBetterSqliteAdapter(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$paths$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["DATA_FILE"]);
    } catch (e) {
        console.warn(`[DB] better-sqlite3 unavailable: ${e.message}`);
        return null;
    }
}
async function tryNodeSqlite() {
    // Built-in since Node 22.5.0 — no install needed. Skip under Bun (no node:sqlite).
    if (process.versions.bun) return null;
    const [maj, min] = process.versions.node.split(".").map(Number);
    if (maj < 22 || maj === 22 && min < 5) return null;
    try {
        const { createNodeSqliteAdapter } = await __turbopack_context__.A("[project]/src/lib/db/adapters/nodeSqliteAdapter.js [middleware] (ecmascript, async loader)");
        return await createNodeSqliteAdapter(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$paths$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["DATA_FILE"]);
    } catch (e) {
        console.warn(`[DB] node:sqlite unavailable: ${e.message}`);
        return null;
    }
}
async function trySqlJs() {
    try {
        const { createSqlJsAdapter } = await __turbopack_context__.A("[project]/src/lib/db/adapters/sqljsAdapter.js [middleware] (ecmascript, async loader)");
        return await createSqlJsAdapter(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$paths$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["DATA_FILE"]);
    } catch (e) {
        console.warn(`[DB] sql.js unavailable: ${e.message}`);
        return null;
    }
}
async function initAdapter() {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$paths$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["ensureDirs"])();
    // Order per runtime:
    //   Bun:  bun:sqlite → sql.js
    //   Node: better-sqlite3 → node:sqlite (≥22.5) → sql.js
    let adapter = await tryBunSqlite();
    if (!adapter) adapter = await tryBetterSqlite();
    if (!adapter) adapter = await tryNodeSqlite();
    if (!adapter) adapter = await trySqlJs();
    if (!adapter) throw new Error("[DB] No SQLite driver available (bun/better/node/sql.js all failed)");
    if (!state.logged) {
        console.log(`[DB] Driver: ${adapter.driver} | file: ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$paths$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["DATA_FILE"]}`);
        state.logged = true;
    }
    const { runMigrationOnce } = await __turbopack_context__.A("[project]/src/lib/db/migrate.js [middleware] (ecmascript, async loader)");
    await runMigrationOnce(adapter);
    return adapter;
}
async function getAdapter() {
    if (state.instance) return state.instance;
    if (!state.initPromise) state.initPromise = initAdapter().then((a)=>{
        state.instance = a;
        return a;
    });
    return state.initPromise;
}
function getAdapterSync() {
    if (!state.instance) throw new Error("[DB] adapter not initialized — await getAdapter() first");
    return state.instance;
}
}),
"[project]/src/lib/db/helpers/jsonCol.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseJson",
    ()=>parseJson,
    "stringifyJson",
    ()=>stringifyJson
]);
function parseJson(str, fallback = null) {
    if (str == null) return fallback;
    if (typeof str !== "string") return str;
    try {
        return JSON.parse(str);
    } catch  {
        return fallback;
    }
}
function stringifyJson(value) {
    return JSON.stringify(value ?? null);
}
}),
"[project]/src/lib/db/repos/settingsRepo.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "exportSettings",
    ()=>exportSettings,
    "getCloudUrl",
    ()=>getCloudUrl,
    "getSettings",
    ()=>getSettings,
    "isCloudEnabled",
    ()=>isCloudEnabled,
    "updateSettings",
    ()=>updateSettings
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/driver.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/helpers/jsonCol.js [middleware] (ecmascript)");
;
;
const DEFAULT_MITM_ROUTER_BASE = "http://localhost:20128";
const DEFAULT_HEADROOM_URL = process.env.HEADROOM_URL || "http://localhost:8787";
const DEFAULT_SETTINGS = {
    cloudEnabled: false,
    tunnelEnabled: false,
    tunnelUrl: "",
    tunnelProvider: "cloudflare",
    tailscaleEnabled: false,
    tailscaleUrl: "",
    stickyRoundRobinLimit: 3,
    providerStrategies: {},
    quotaVisibility: {},
    comboStrategy: "fallback",
    comboStickyRoundRobinLimit: 1,
    comboStrategies: {},
    requireLogin: true,
    tunnelDashboardAccess: true,
    authMode: "password",
    oidcIssuerUrl: "",
    oidcClientId: "",
    oidcClientSecret: "",
    oidcScopes: "openid profile email",
    oidcLoginLabel: "Sign in with OIDC",
    enableObservability: true,
    observabilityMaxRecords: 1000,
    observabilityBatchSize: 20,
    observabilityFlushIntervalMs: 5000,
    observabilityMaxJsonSize: 5,
    outboundProxyEnabled: false,
    outboundProxyUrl: "",
    outboundNoProxy: "",
    mitmRouterBaseUrl: DEFAULT_MITM_ROUTER_BASE,
    dnsToolEnabled: {},
    rtkEnabled: true,
    headroomEnabled: false,
    headroomUrl: DEFAULT_HEADROOM_URL,
    headroomCompressUserMessages: false,
    cavemanEnabled: false,
    cavemanLevel: "full",
    ponytailEnabled: false,
    ponytailLevel: "full",
    pxpipeEnabled: false,
    pxpipeAutoInstall: true,
    pxpipeMinChars: 25000,
    pxpipeTimeoutMs: 15000
};
async function readRaw() {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const row = db.get(`SELECT data FROM settings WHERE id = 1`);
    return row ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(row.data, {}) : {};
}
// Merge raw settings with defaults; backward-compat for missing keys
function mergeWithDefaults(raw) {
    const merged = {
        ...DEFAULT_SETTINGS,
        ...raw || {}
    };
    for (const [key, defVal] of Object.entries(DEFAULT_SETTINGS)){
        if (merged[key] === undefined) {
            if (key === "outboundProxyEnabled" && typeof merged.outboundProxyUrl === "string" && merged.outboundProxyUrl.trim()) {
                merged[key] = true;
            } else {
                merged[key] = defVal;
            }
        }
    }
    return merged;
}
async function getSettings() {
    const raw = await readRaw();
    return mergeWithDefaults(raw);
}
async function updateSettings(updates) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    let next;
    db.transaction(()=>{
        const row = db.get(`SELECT data FROM settings WHERE id = 1`);
        const current = row ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(row.data, {}) : {};
        next = {
            ...current,
            ...updates
        };
        db.run(`INSERT INTO settings(id, data) VALUES(1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`, [
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(next)
        ]);
    });
    return mergeWithDefaults(next);
}
async function isCloudEnabled() {
    const settings = await getSettings();
    return settings.cloudEnabled === true;
}
async function getCloudUrl() {
    const settings = await getSettings();
    return settings.cloudUrl || process.env.CLOUD_URL || ("TURBOPACK compile-time value", "https://9router.com") || "";
}
async function exportSettings() {
    return await readRaw();
}
}),
"[externals]/node:crypto [external] (node:crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:crypto", () => require("node:crypto"));

module.exports = mod;
}),
"[project]/src/lib/db/repos/connectionsRepo.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cleanupProviderConnections",
    ()=>cleanupProviderConnections,
    "createProviderConnection",
    ()=>createProviderConnection,
    "deleteProviderConnection",
    ()=>deleteProviderConnection,
    "deleteProviderConnectionsByProvider",
    ()=>deleteProviderConnectionsByProvider,
    "getProviderConnectionById",
    ()=>getProviderConnectionById,
    "getProviderConnections",
    ()=>getProviderConnections,
    "reorderProviderConnections",
    ()=>reorderProviderConnections,
    "updateProviderConnection",
    ()=>updateProviderConnection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__ = __turbopack_context__.i("[project]/node_modules/uuid/dist-node/v4.js [middleware] (ecmascript) <export default as v4>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/driver.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/helpers/jsonCol.js [middleware] (ecmascript)");
;
;
;
const OPTIONAL_FIELDS = [
    "displayName",
    "email",
    "globalPriority",
    "defaultModel",
    "accessToken",
    "refreshToken",
    "expiresAt",
    "tokenType",
    "scope",
    "projectId",
    "apiKey",
    "testStatus",
    "lastTested",
    "lastError",
    "lastErrorAt",
    "rateLimitedUntil",
    "expiresIn",
    "errorCode",
    "consecutiveUseCount",
    "idToken",
    "lastRefreshAt"
];
function rowToConn(row) {
    if (!row) return null;
    const extra = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(row.data, {});
    return {
        ...extra,
        id: row.id,
        provider: row.provider,
        authType: row.authType,
        name: row.name,
        email: row.email,
        priority: row.priority,
        isActive: row.isActive === 1 || row.isActive === true,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    };
}
function connToRow(c) {
    const { id, provider, authType, name, email, priority, isActive, createdAt, updatedAt, ...rest } = c;
    return {
        id,
        provider,
        authType,
        name: name ?? null,
        email: email ?? null,
        priority: priority ?? null,
        isActive: isActive === false ? 0 : 1,
        data: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(rest),
        createdAt,
        updatedAt
    };
}
function upsert(db, c) {
    const r = connToRow(c);
    db.run(`INSERT INTO providerConnections(id, provider, authType, name, email, priority, isActive, data, createdAt, updatedAt)
     VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       provider=excluded.provider, authType=excluded.authType, name=excluded.name,
       email=excluded.email, priority=excluded.priority, isActive=excluded.isActive,
       data=excluded.data, updatedAt=excluded.updatedAt`, [
        r.id,
        r.provider,
        r.authType,
        r.name,
        r.email,
        r.priority,
        r.isActive,
        r.data,
        r.createdAt,
        r.updatedAt
    ]);
}
function deriveConnectionName(data, fallbackName) {
    if (data.provider === "github") {
        return data.providerSpecificData?.githubLogin || data.providerSpecificData?.githubEmail || data.email || data.providerSpecificData?.githubName || fallbackName;
    }
    return fallbackName;
}
async function getProviderConnections(filter = {}) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const where = [];
    const params = [];
    if (filter.provider) {
        where.push("provider = ?");
        params.push(filter.provider);
    }
    if (filter.isActive !== undefined) {
        where.push("isActive = ?");
        params.push(filter.isActive ? 1 : 0);
    }
    const sql = `SELECT * FROM providerConnections${where.length ? ` WHERE ${where.join(" AND ")}` : ""}`;
    const rows = db.all(sql, params);
    const list = rows.map(rowToConn);
    list.sort((a, b)=>(a.priority || 999) - (b.priority || 999));
    return list;
}
async function getProviderConnectionById(id) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const row = db.get(`SELECT * FROM providerConnections WHERE id = ?`, [
        id
    ]);
    return rowToConn(row);
}
// Internal sync reorder — must be called INSIDE a transaction
function reorderInTx(db, providerId) {
    const list = db.all(`SELECT * FROM providerConnections WHERE provider = ?`, [
        providerId
    ]).map(rowToConn);
    list.sort((a, b)=>{
        const pDiff = (a.priority || 0) - (b.priority || 0);
        if (pDiff !== 0) return pDiff;
        return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });
    list.forEach((c, i)=>{
        db.run(`UPDATE providerConnections SET priority = ? WHERE id = ?`, [
            i + 1,
            c.id
        ]);
    });
}
async function createProviderConnection(data) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const now = new Date().toISOString();
    let result;
    db.transaction(()=>{
        const all = db.all(`SELECT * FROM providerConnections WHERE provider = ?`, [
            data.provider
        ]).map(rowToConn);
        let existing = null;
        if (data.authType === "oauth" && data.email) {
            const incomingUsername = data.providerSpecificData?.username;
            const incomingWs = data.providerSpecificData?.chatgptAccountId;
            existing = all.find((c)=>{
                if (c.authType !== "oauth" || c.email !== data.email) return false;
                // Codex/OpenAI can issue multiple OAuth grants for the same email.
                // Refresh tokens are rotated single-use; collapsing a new login onto an
                // existing bare-email row overwrites the first account's token pair and
                // makes it look "invalid" after adding a second account. Only update an
                // existing Codex row when both rows expose the same ChatGPT account ID.
                if (data.provider === "codex") {
                    const existingWs = c.providerSpecificData?.chatgptAccountId;
                    return !!incomingWs && !!existingWs && incomingWs === existingWs;
                }
                // Workspace providers use workspace ID when both sides have it
                const existingWs = c.providerSpecificData?.chatgptAccountId;
                if (incomingWs && existingWs) return incomingWs === existingWs;
                if (incomingWs && !existingWs) return false;
                if (!incomingWs && existingWs) return false;
                // Non-workspace providers: match on (email + username) so cross-IdP
                // accounts don't overwrite each other. Require username on both sides
                // — if only one side has it, treat as a distinct identity rather than
                // collapsing onto the bare-email fallback (which would re-introduce
                // the cross-IdP overwrite).
                const existingUsername = c.providerSpecificData?.username;
                if (incomingUsername && existingUsername) {
                    return incomingUsername === existingUsername;
                }
                if (incomingUsername || existingUsername) return false;
                return true;
            });
        } else if (data.authType === "apikey" && data.name) {
            existing = all.find((c)=>c.authType === "apikey" && c.name === data.name);
        }
        // access_token: never dedup — user manages duplicates manually
        if (existing) {
            const merged = {
                ...existing,
                ...data,
                updatedAt: now
            };
            upsert(db, merged);
            result = merged;
            return;
        }
        let connectionName = data.name || null;
        if (!connectionName && (data.authType === "oauth" || data.authType === "access_token")) {
            connectionName = deriveConnectionName(data, data.email || `Account ${all.length + 1}`);
        }
        let connectionPriority = data.priority;
        if (!connectionPriority) {
            connectionPriority = all.reduce((m, c)=>Math.max(m, c.priority || 0), 0) + 1;
        }
        const conn = {
            id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__["v4"])(),
            provider: data.provider,
            authType: data.authType || "oauth",
            name: connectionName,
            priority: connectionPriority,
            isActive: data.isActive !== undefined ? data.isActive : true,
            createdAt: now,
            updatedAt: now
        };
        for (const f of OPTIONAL_FIELDS){
            if (data[f] !== undefined && data[f] !== null) conn[f] = data[f];
        }
        if (data.providerSpecificData && Object.keys(data.providerSpecificData).length > 0) {
            conn.providerSpecificData = data.providerSpecificData;
        }
        if (data.email !== undefined) conn.email = data.email;
        upsert(db, conn);
        reorderInTx(db, data.provider);
        result = conn;
    });
    return result;
}
async function updateProviderConnection(id, data) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    let result;
    db.transaction(()=>{
        const row = db.get(`SELECT * FROM providerConnections WHERE id = ?`, [
            id
        ]);
        if (!row) {
            result = null;
            return;
        }
        const existing = rowToConn(row);
        const merged = {
            ...existing,
            ...data,
            updatedAt: new Date().toISOString()
        };
        upsert(db, merged);
        if (data.priority !== undefined) reorderInTx(db, existing.provider);
        result = merged;
    });
    return result;
}
async function deleteProviderConnection(id) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    let ok = false;
    db.transaction(()=>{
        const row = db.get(`SELECT provider FROM providerConnections WHERE id = ?`, [
            id
        ]);
        if (!row) return;
        db.run(`DELETE FROM providerConnections WHERE id = ?`, [
            id
        ]);
        reorderInTx(db, row.provider);
        ok = true;
    });
    return ok;
}
async function deleteProviderConnectionsByProvider(providerId) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const before = db.get(`SELECT COUNT(*) AS n FROM providerConnections WHERE provider = ?`, [
        providerId
    ]);
    db.run(`DELETE FROM providerConnections WHERE provider = ?`, [
        providerId
    ]);
    return before?.n || 0;
}
async function reorderProviderConnections(providerId) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    db.transaction(()=>reorderInTx(db, providerId));
}
async function cleanupProviderConnections() {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const fieldsToCheck = [
        "displayName",
        "email",
        "globalPriority",
        "defaultModel",
        "accessToken",
        "refreshToken",
        "expiresAt",
        "tokenType",
        "scope",
        "projectId",
        "apiKey",
        "testStatus",
        "lastTested",
        "lastError",
        "lastErrorAt",
        "rateLimitedUntil",
        "expiresIn",
        "consecutiveUseCount"
    ];
    let cleaned = 0;
    db.transaction(()=>{
        const rows = db.all(`SELECT * FROM providerConnections`);
        for (const row of rows){
            const conn = rowToConn(row);
            let dirty = false;
            for (const f of fieldsToCheck){
                if (conn[f] === null || conn[f] === undefined) {
                    if (f in conn) {
                        delete conn[f];
                        cleaned++;
                        dirty = true;
                    }
                }
            }
            if (conn.providerSpecificData && Object.keys(conn.providerSpecificData).length === 0) {
                delete conn.providerSpecificData;
                cleaned++;
                dirty = true;
            }
            if (dirty) upsert(db, conn);
        }
    });
    return cleaned;
}
}),
"[project]/src/lib/db/repos/nodesRepo.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createProviderNode",
    ()=>createProviderNode,
    "deleteProviderNode",
    ()=>deleteProviderNode,
    "getProviderNodeById",
    ()=>getProviderNodeById,
    "getProviderNodes",
    ()=>getProviderNodes,
    "updateProviderNode",
    ()=>updateProviderNode
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__ = __turbopack_context__.i("[project]/node_modules/uuid/dist-node/v4.js [middleware] (ecmascript) <export default as v4>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/driver.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/helpers/jsonCol.js [middleware] (ecmascript)");
;
;
;
function rowToNode(row) {
    if (!row) return null;
    const extra = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(row.data, {});
    return {
        ...extra,
        id: row.id,
        type: row.type,
        name: row.name,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    };
}
function nodeToRow(n) {
    const { id, type, name, createdAt, updatedAt, ...rest } = n;
    return {
        id,
        type: type ?? null,
        name: name ?? null,
        data: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(rest),
        createdAt,
        updatedAt
    };
}
function upsert(db, n) {
    const r = nodeToRow(n);
    db.run(`INSERT INTO providerNodes(id, type, name, data, createdAt, updatedAt)
     VALUES(?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       type=excluded.type, name=excluded.name, data=excluded.data, updatedAt=excluded.updatedAt`, [
        r.id,
        r.type,
        r.name,
        r.data,
        r.createdAt,
        r.updatedAt
    ]);
}
async function getProviderNodes(filter = {}) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const where = [];
    const params = [];
    if (filter.type) {
        where.push("type = ?");
        params.push(filter.type);
    }
    const sql = `SELECT * FROM providerNodes${where.length ? ` WHERE ${where.join(" AND ")}` : ""}`;
    return db.all(sql, params).map(rowToNode);
}
async function getProviderNodeById(id) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    return rowToNode(db.get(`SELECT * FROM providerNodes WHERE id = ?`, [
        id
    ]));
}
async function createProviderNode(data) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const now = new Date().toISOString();
    const node = {
        id: data.id || (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__["v4"])(),
        type: data.type,
        name: data.name,
        prefix: data.prefix,
        apiType: data.apiType,
        baseUrl: data.baseUrl,
        createdAt: now,
        updatedAt: now
    };
    upsert(db, node);
    return node;
}
async function updateProviderNode(id, data) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    let result = null;
    db.transaction(()=>{
        const row = db.get(`SELECT * FROM providerNodes WHERE id = ?`, [
            id
        ]);
        if (!row) return;
        const merged = {
            ...rowToNode(row),
            ...data,
            updatedAt: new Date().toISOString()
        };
        upsert(db, merged);
        result = merged;
    });
    return result;
}
async function deleteProviderNode(id) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    let removed = null;
    db.transaction(()=>{
        const row = db.get(`SELECT * FROM providerNodes WHERE id = ?`, [
            id
        ]);
        if (!row) return;
        removed = rowToNode(row);
        db.run(`DELETE FROM providerNodes WHERE id = ?`, [
            id
        ]);
    });
    return removed;
}
}),
"[project]/src/lib/db/repos/proxyPoolsRepo.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createProxyPool",
    ()=>createProxyPool,
    "deleteProxyPool",
    ()=>deleteProxyPool,
    "getProxyPoolById",
    ()=>getProxyPoolById,
    "getProxyPools",
    ()=>getProxyPools,
    "updateProxyPool",
    ()=>updateProxyPool
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__ = __turbopack_context__.i("[project]/node_modules/uuid/dist-node/v4.js [middleware] (ecmascript) <export default as v4>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/driver.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/helpers/jsonCol.js [middleware] (ecmascript)");
;
;
;
function rowToPool(row) {
    if (!row) return null;
    const extra = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(row.data, {});
    return {
        ...extra,
        id: row.id,
        isActive: row.isActive === 1 || row.isActive === true,
        testStatus: row.testStatus,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    };
}
function poolToRow(p) {
    const { id, isActive, testStatus, createdAt, updatedAt, ...rest } = p;
    return {
        id,
        isActive: isActive === false ? 0 : 1,
        testStatus: testStatus ?? null,
        data: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(rest),
        createdAt,
        updatedAt
    };
}
function upsert(db, p) {
    const r = poolToRow(p);
    db.run(`INSERT INTO proxyPools(id, isActive, testStatus, data, createdAt, updatedAt)
     VALUES(?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       isActive=excluded.isActive, testStatus=excluded.testStatus,
       data=excluded.data, updatedAt=excluded.updatedAt`, [
        r.id,
        r.isActive,
        r.testStatus,
        r.data,
        r.createdAt,
        r.updatedAt
    ]);
}
async function getProxyPools(filter = {}) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const where = [];
    const params = [];
    if (filter.isActive !== undefined) {
        where.push("isActive = ?");
        params.push(filter.isActive ? 1 : 0);
    }
    if (filter.testStatus) {
        where.push("testStatus = ?");
        params.push(filter.testStatus);
    }
    const sql = `SELECT * FROM proxyPools${where.length ? ` WHERE ${where.join(" AND ")}` : ""}`;
    const list = db.all(sql, params).map(rowToPool);
    list.sort((a, b)=>new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    return list;
}
async function getProxyPoolById(id) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    return rowToPool(db.get(`SELECT * FROM proxyPools WHERE id = ?`, [
        id
    ]));
}
async function createProxyPool(data) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const now = new Date().toISOString();
    const pool = {
        id: data.id || (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__["v4"])(),
        name: data.name,
        proxyUrl: data.proxyUrl,
        noProxy: data.noProxy || "",
        type: data.type || "http",
        isActive: data.isActive !== undefined ? data.isActive : true,
        strictProxy: data.strictProxy === true,
        testStatus: data.testStatus || "unknown",
        lastTestedAt: data.lastTestedAt || null,
        lastError: data.lastError || null,
        createdAt: now,
        updatedAt: now
    };
    upsert(db, pool);
    return pool;
}
async function updateProxyPool(id, data) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    let result = null;
    db.transaction(()=>{
        const row = db.get(`SELECT * FROM proxyPools WHERE id = ?`, [
            id
        ]);
        if (!row) return;
        const merged = {
            ...rowToPool(row),
            ...data,
            updatedAt: new Date().toISOString()
        };
        upsert(db, merged);
        result = merged;
    });
    return result;
}
async function deleteProxyPool(id) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    let removed = null;
    db.transaction(()=>{
        const row = db.get(`SELECT * FROM proxyPools WHERE id = ?`, [
            id
        ]);
        if (!row) return;
        removed = rowToPool(row);
        db.run(`DELETE FROM proxyPools WHERE id = ?`, [
            id
        ]);
    });
    return removed;
}
}),
"[project]/src/lib/db/repos/apiKeysRepo.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createApiKey",
    ()=>createApiKey,
    "deleteApiKey",
    ()=>deleteApiKey,
    "getApiKeyById",
    ()=>getApiKeyById,
    "getApiKeys",
    ()=>getApiKeys,
    "updateApiKey",
    ()=>updateApiKey,
    "validateApiKey",
    ()=>validateApiKey
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__ = __turbopack_context__.i("[project]/node_modules/uuid/dist-node/v4.js [middleware] (ecmascript) <export default as v4>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/driver.js [middleware] (ecmascript)");
;
;
function rowToKey(row) {
    if (!row) return null;
    return {
        id: row.id,
        key: row.key,
        name: row.name,
        machineId: row.machineId,
        isActive: row.isActive === 1 || row.isActive === true,
        createdAt: row.createdAt
    };
}
async function getApiKeys() {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const rows = db.all(`SELECT * FROM apiKeys ORDER BY createdAt ASC`);
    return rows.map(rowToKey);
}
async function getApiKeyById(id) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const row = db.get(`SELECT * FROM apiKeys WHERE id = ?`, [
        id
    ]);
    return rowToKey(row);
}
async function createApiKey(name, machineId) {
    if (!machineId) throw new Error("machineId is required");
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const { generateApiKeyWithMachine } = await __turbopack_context__.A("[project]/src/shared/utils/apiKey.js [middleware] (ecmascript, async loader)");
    const result = generateApiKeyWithMachine(machineId);
    const apiKey = {
        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__["v4"])(),
        name,
        key: result.key,
        machineId,
        isActive: true,
        createdAt: new Date().toISOString()
    };
    db.run(`INSERT INTO apiKeys(id, key, name, machineId, isActive, createdAt) VALUES(?, ?, ?, ?, ?, ?)`, [
        apiKey.id,
        apiKey.key,
        apiKey.name,
        apiKey.machineId,
        1,
        apiKey.createdAt
    ]);
    return apiKey;
}
async function updateApiKey(id, data) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    let result = null;
    db.transaction(()=>{
        const row = db.get(`SELECT * FROM apiKeys WHERE id = ?`, [
            id
        ]);
        if (!row) return;
        const merged = {
            ...rowToKey(row),
            ...data
        };
        db.run(`UPDATE apiKeys SET key = ?, name = ?, machineId = ?, isActive = ? WHERE id = ?`, [
            merged.key,
            merged.name,
            merged.machineId,
            merged.isActive ? 1 : 0,
            id
        ]);
        result = merged;
    });
    return result;
}
async function deleteApiKey(id) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const res = db.run(`DELETE FROM apiKeys WHERE id = ?`, [
        id
    ]);
    return (res?.changes ?? 0) > 0;
}
async function validateApiKey(key) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const row = db.get(`SELECT isActive FROM apiKeys WHERE key = ?`, [
        key
    ]);
    if (!row) return false;
    return row.isActive === 1 || row.isActive === true;
}
}),
"[project]/src/lib/db/repos/combosRepo.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createCombo",
    ()=>createCombo,
    "deleteCombo",
    ()=>deleteCombo,
    "getComboById",
    ()=>getComboById,
    "getComboByName",
    ()=>getComboByName,
    "getCombos",
    ()=>getCombos,
    "updateCombo",
    ()=>updateCombo
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__ = __turbopack_context__.i("[project]/node_modules/uuid/dist-node/v4.js [middleware] (ecmascript) <export default as v4>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/driver.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/helpers/jsonCol.js [middleware] (ecmascript)");
;
;
;
function rowToCombo(row) {
    if (!row) return null;
    return {
        id: row.id,
        name: row.name,
        kind: row.kind,
        models: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(row.models, []),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    };
}
async function getCombos() {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const rows = db.all(`SELECT * FROM combos ORDER BY createdAt ASC`);
    return rows.map(rowToCombo);
}
async function getComboById(id) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const row = db.get(`SELECT * FROM combos WHERE id = ?`, [
        id
    ]);
    return rowToCombo(row);
}
async function getComboByName(name) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const row = db.get(`SELECT * FROM combos WHERE name = ?`, [
        name
    ]);
    return rowToCombo(row);
}
async function createCombo(data) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const now = new Date().toISOString();
    const combo = {
        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__["v4"])(),
        name: data.name,
        kind: data.kind || null,
        models: data.models || [],
        createdAt: now,
        updatedAt: now
    };
    db.run(`INSERT INTO combos(id, name, kind, models, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?)`, [
        combo.id,
        combo.name,
        combo.kind,
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(combo.models),
        combo.createdAt,
        combo.updatedAt
    ]);
    return combo;
}
async function updateCombo(id, data) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    let result = null;
    db.transaction(()=>{
        const row = db.get(`SELECT * FROM combos WHERE id = ?`, [
            id
        ]);
        if (!row) return;
        const merged = {
            ...rowToCombo(row),
            ...data,
            updatedAt: new Date().toISOString()
        };
        db.run(`UPDATE combos SET name = ?, kind = ?, models = ?, updatedAt = ? WHERE id = ?`, [
            merged.name,
            merged.kind,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(merged.models || []),
            merged.updatedAt,
            id
        ]);
        result = merged;
    });
    return result;
}
async function deleteCombo(id) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const res = db.run(`DELETE FROM combos WHERE id = ?`, [
        id
    ]);
    return (res?.changes ?? 0) > 0;
}
}),
"[project]/src/lib/db/helpers/kvStore.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "makeKv",
    ()=>makeKv
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/driver.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/helpers/jsonCol.js [middleware] (ecmascript)");
;
;
function makeKv(scope) {
    return {
        async get (key, fallback = null) {
            const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
            const row = db.get(`SELECT value FROM kv WHERE scope = ? AND key = ?`, [
                scope,
                key
            ]);
            return row ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(row.value, fallback) : fallback;
        },
        async getAll () {
            const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
            const rows = db.all(`SELECT key, value FROM kv WHERE scope = ?`, [
                scope
            ]);
            const out = {};
            for (const r of rows)out[r.key] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(r.value);
            return out;
        },
        async set (key, value) {
            const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
            db.run(`INSERT INTO kv(scope, key, value) VALUES(?, ?, ?) ON CONFLICT(scope, key) DO UPDATE SET value = excluded.value`, [
                scope,
                key,
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(value)
            ]);
        },
        async setMany (obj) {
            const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
            db.transaction(()=>{
                for (const [k, v] of Object.entries(obj)){
                    db.run(`INSERT INTO kv(scope, key, value) VALUES(?, ?, ?) ON CONFLICT(scope, key) DO UPDATE SET value = excluded.value`, [
                        scope,
                        k,
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(v)
                    ]);
                }
            });
        },
        async remove (key) {
            const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
            db.run(`DELETE FROM kv WHERE scope = ? AND key = ?`, [
                scope,
                key
            ]);
        },
        async clear () {
            const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
            db.run(`DELETE FROM kv WHERE scope = ?`, [
                scope
            ]);
        }
    };
}
}),
"[project]/src/lib/db/repos/aliasRepo.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "addCustomModel",
    ()=>addCustomModel,
    "deleteCustomModel",
    ()=>deleteCustomModel,
    "deleteModelAlias",
    ()=>deleteModelAlias,
    "getCustomModels",
    ()=>getCustomModels,
    "getMitmAlias",
    ()=>getMitmAlias,
    "getModelAliases",
    ()=>getModelAliases,
    "setMitmAliasAll",
    ()=>setMitmAliasAll,
    "setModelAlias",
    ()=>setModelAlias
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/driver.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/helpers/jsonCol.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$kvStore$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/helpers/kvStore.js [middleware] (ecmascript)");
;
;
;
const aliasKv = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$kvStore$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["makeKv"])("modelAliases");
const customKv = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$kvStore$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["makeKv"])("customModels");
const mitmKv = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$kvStore$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["makeKv"])("mitmAlias");
async function getModelAliases() {
    return await aliasKv.getAll();
}
async function setModelAlias(alias, model) {
    await aliasKv.set(alias, model);
}
async function deleteModelAlias(alias) {
    await aliasKv.remove(alias);
}
// customModels: key=`${providerAlias}|${id}|${type}`, value=full model object
function customKey(providerAlias, id, type) {
    return `${providerAlias}|${id}|${type}`;
}
async function getCustomModels() {
    const all = await customKv.getAll();
    return Object.values(all);
}
async function addCustomModel({ providerAlias, id, type = "llm", name }) {
    const k = customKey(providerAlias, id, type);
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    let added = false;
    db.transaction(()=>{
        const row = db.get(`SELECT 1 FROM kv WHERE scope = 'customModels' AND key = ?`, [
            k
        ]);
        if (row) return;
        const value = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])({
            providerAlias,
            id,
            type,
            name: name || id
        });
        db.run(`INSERT INTO kv(scope, key, value) VALUES('customModels', ?, ?)`, [
            k,
            value
        ]);
        added = true;
    });
    return added;
}
async function deleteCustomModel({ providerAlias, id, type = "llm" }) {
    await customKv.remove(customKey(providerAlias, id, type));
}
async function getMitmAlias(toolName) {
    if (toolName) {
        const v = await mitmKv.get(toolName);
        return v || {};
    }
    return await mitmKv.getAll();
}
async function setMitmAliasAll(toolName, mappings) {
    await mitmKv.set(toolName, mappings || {});
}
}),
"[project]/src/lib/db/repos/pricingRepo.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getPricing",
    ()=>getPricing,
    "getPricingForModel",
    ()=>getPricingForModel,
    "resetAllPricing",
    ()=>resetAllPricing,
    "resetPricing",
    ()=>resetPricing,
    "updatePricing",
    ()=>updatePricing
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/driver.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/helpers/jsonCol.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$kvStore$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/helpers/kvStore.js [middleware] (ecmascript)");
;
;
;
const pricingKv = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$kvStore$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["makeKv"])("pricing");
const CACHE_TTL_MS = 5000;
let cache = {
    value: null,
    expiresAt: 0
};
function invalidate() {
    cache = {
        value: null,
        expiresAt: 0
    };
}
async function getUserPricing() {
    return await pricingKv.getAll();
}
async function getPricing() {
    const now = Date.now();
    if (cache.value && cache.expiresAt > now) return cache.value;
    const userPricing = await getUserPricing();
    const { PROVIDER_PRICING } = await __turbopack_context__.A("[project]/open-sse/providers/pricing.js [middleware] (ecmascript, async loader)");
    const merged = {};
    for (const [provider, models] of Object.entries(PROVIDER_PRICING)){
        merged[provider] = {
            ...models
        };
        if (userPricing[provider]) {
            for (const [model, pricing] of Object.entries(userPricing[provider])){
                merged[provider][model] = merged[provider][model] ? {
                    ...merged[provider][model],
                    ...pricing
                } : pricing;
            }
        }
    }
    for (const [provider, models] of Object.entries(userPricing)){
        if (!merged[provider]) {
            merged[provider] = {
                ...models
            };
        } else {
            for (const [model, pricing] of Object.entries(models)){
                if (!merged[provider][model]) merged[provider][model] = pricing;
            }
        }
    }
    cache = {
        value: merged,
        expiresAt: now + CACHE_TTL_MS
    };
    return merged;
}
async function getPricingForModel(provider, model) {
    if (!model) return null;
    const userPricing = await getUserPricing();
    if (provider && userPricing[provider]?.[model]) return userPricing[provider][model];
    const { getPricingForModel: resolveConst } = await __turbopack_context__.A("[project]/open-sse/providers/pricing.js [middleware] (ecmascript, async loader)");
    return resolveConst(provider, model);
}
async function updatePricing(pricingData) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    db.transaction(()=>{
        for (const [provider, models] of Object.entries(pricingData)){
            const row = db.get(`SELECT value FROM kv WHERE scope = 'pricing' AND key = ?`, [
                provider
            ]);
            const current = row ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(row.value, {}) || {} : {};
            const merged = {
                ...current
            };
            for (const [model, pricing] of Object.entries(models)){
                merged[model] = pricing;
            }
            db.run(`INSERT INTO kv(scope, key, value) VALUES('pricing', ?, ?) ON CONFLICT(scope, key) DO UPDATE SET value = excluded.value`, [
                provider,
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(merged)
            ]);
        }
    });
    invalidate();
    return await getUserPricing();
}
async function resetPricing(provider, model) {
    if (!provider) return await getUserPricing();
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    db.transaction(()=>{
        if (!model) {
            db.run(`DELETE FROM kv WHERE scope = 'pricing' AND key = ?`, [
                provider
            ]);
            return;
        }
        const row = db.get(`SELECT value FROM kv WHERE scope = 'pricing' AND key = ?`, [
            provider
        ]);
        const current = row ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(row.value, {}) || {} : {};
        delete current[model];
        if (Object.keys(current).length === 0) {
            db.run(`DELETE FROM kv WHERE scope = 'pricing' AND key = ?`, [
                provider
            ]);
        } else {
            db.run(`INSERT INTO kv(scope, key, value) VALUES('pricing', ?, ?) ON CONFLICT(scope, key) DO UPDATE SET value = excluded.value`, [
                provider,
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(current)
            ]);
        }
    });
    invalidate();
    return await getUserPricing();
}
async function resetAllPricing() {
    await pricingKv.clear();
    invalidate();
    return {};
}
}),
"[project]/src/lib/db/repos/disabledModelsRepo.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "disableModels",
    ()=>disableModels,
    "enableModels",
    ()=>enableModels,
    "getDisabledByProvider",
    ()=>getDisabledByProvider,
    "getDisabledModels",
    ()=>getDisabledModels
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/driver.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/helpers/jsonCol.js [middleware] (ecmascript)");
;
;
const SCOPE = "disabledModels";
async function getDisabledModels() {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const rows = db.all(`SELECT key, value FROM kv WHERE scope = ?`, [
        SCOPE
    ]);
    const out = {};
    for (const r of rows)out[r.key] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(r.value, []);
    return out;
}
async function getDisabledByProvider(providerAlias) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const row = db.get(`SELECT value FROM kv WHERE scope = ? AND key = ?`, [
        SCOPE,
        providerAlias
    ]);
    return row ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(row.value, []) || [] : [];
}
async function disableModels(providerAlias, ids) {
    if (!providerAlias || !Array.isArray(ids)) return;
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    db.transaction(()=>{
        const row = db.get(`SELECT value FROM kv WHERE scope = ? AND key = ?`, [
            SCOPE,
            providerAlias
        ]);
        const current = row ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(row.value, []) || [] : [];
        const merged = [
            ...new Set([
                ...current,
                ...ids
            ])
        ];
        db.run(`INSERT INTO kv(scope, key, value) VALUES(?, ?, ?) ON CONFLICT(scope, key) DO UPDATE SET value = excluded.value`, [
            SCOPE,
            providerAlias,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(merged)
        ]);
    });
}
async function enableModels(providerAlias, ids) {
    if (!providerAlias) return;
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    db.transaction(()=>{
        if (!Array.isArray(ids) || ids.length === 0) {
            db.run(`DELETE FROM kv WHERE scope = ? AND key = ?`, [
                SCOPE,
                providerAlias
            ]);
            return;
        }
        const row = db.get(`SELECT value FROM kv WHERE scope = ? AND key = ?`, [
            SCOPE,
            providerAlias
        ]);
        const current = row ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(row.value, []) || [] : [];
        const removeSet = new Set(ids);
        const next = current.filter((id)=>!removeSet.has(id));
        if (next.length === 0) {
            db.run(`DELETE FROM kv WHERE scope = ? AND key = ?`, [
                SCOPE,
                providerAlias
            ]);
        } else {
            db.run(`INSERT INTO kv(scope, key, value) VALUES(?, ?, ?) ON CONFLICT(scope, key) DO UPDATE SET value = excluded.value`, [
                SCOPE,
                providerAlias,
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(next)
            ]);
        }
    });
}
}),
"[externals]/events [external] (events, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("events", () => require("events"));

module.exports = mod;
}),
"[project]/src/lib/db/helpers/metaStore.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getMeta",
    ()=>getMeta,
    "getMetaSync",
    ()=>getMetaSync,
    "setMeta",
    ()=>setMeta,
    "setMetaSync",
    ()=>setMetaSync
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/driver.js [middleware] (ecmascript)");
;
async function getMeta(key, fallback = null) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const row = db.get(`SELECT value FROM _meta WHERE key = ?`, [
        key
    ]);
    return row ? row.value : fallback;
}
async function setMeta(key, value) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    db.run(`INSERT INTO _meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, [
        key,
        String(value)
    ]);
}
function getMetaSync(adapter, key, fallback = null) {
    const row = adapter.get(`SELECT value FROM _meta WHERE key = ?`, [
        key
    ]);
    return row ? row.value : fallback;
}
function setMetaSync(adapter, key, value) {
    adapter.run(`INSERT INTO _meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, [
        key,
        String(value)
    ]);
}
}),
"[project]/src/lib/db/repos/usageRepo.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "appendRequestLog",
    ()=>appendRequestLog,
    "getActiveRequests",
    ()=>getActiveRequests,
    "getChartData",
    ()=>getChartData,
    "getRecentLogs",
    ()=>getRecentLogs,
    "getUsageHistory",
    ()=>getUsageHistory,
    "getUsageStats",
    ()=>getUsageStats,
    "saveRequestUsage",
    ()=>saveRequestUsage,
    "statsEmitter",
    ()=>statsEmitter,
    "trackPendingRequest",
    ()=>trackPendingRequest
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$events__$5b$external$5d$__$28$events$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/events [external] (events, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/driver.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/helpers/jsonCol.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$metaStore$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/helpers/metaStore.js [middleware] (ecmascript)");
;
;
;
;
function maskApiKey(key) {
    if (!key || typeof key !== "string") return null;
    if (key.length <= 8) return key.charAt(0) + "***";
    return key.slice(0, 8) + "***";
}
const PENDING_TIMEOUT_MS = 60 * 1000;
const RING_CAP = 50;
const CONN_CACHE_TTL_MS = 30 * 1000;
const PERIOD_MS = {
    "24h": 86400000,
    "7d": 604800000,
    "30d": 2592000000,
    "60d": 5184000000
};
// In-memory state shared across Next.js modules
if (!/*TURBOPACK member replacement*/ __turbopack_context__.g._pendingRequests) /*TURBOPACK member replacement*/ __turbopack_context__.g._pendingRequests = {
    byModel: {},
    byAccount: {}
};
if (!/*TURBOPACK member replacement*/ __turbopack_context__.g._lastErrorProvider) /*TURBOPACK member replacement*/ __turbopack_context__.g._lastErrorProvider = {
    provider: "",
    ts: 0
};
if (!/*TURBOPACK member replacement*/ __turbopack_context__.g._statsEmitter) {
    /*TURBOPACK member replacement*/ __turbopack_context__.g._statsEmitter = new __TURBOPACK__imported__module__$5b$externals$5d2f$events__$5b$external$5d$__$28$events$2c$__cjs$29$__["EventEmitter"]();
    /*TURBOPACK member replacement*/ __turbopack_context__.g._statsEmitter.setMaxListeners(50);
}
if (!/*TURBOPACK member replacement*/ __turbopack_context__.g._pendingTimers) /*TURBOPACK member replacement*/ __turbopack_context__.g._pendingTimers = {};
if (!/*TURBOPACK member replacement*/ __turbopack_context__.g._recentRing) /*TURBOPACK member replacement*/ __turbopack_context__.g._recentRing = {
    items: [],
    initialized: false
};
if (!/*TURBOPACK member replacement*/ __turbopack_context__.g._connectionMapCache) /*TURBOPACK member replacement*/ __turbopack_context__.g._connectionMapCache = {
    map: {},
    ts: 0
};
if (!/*TURBOPACK member replacement*/ __turbopack_context__.g._statsEmitTimers) /*TURBOPACK member replacement*/ __turbopack_context__.g._statsEmitTimers = {
    pending: null,
    update: null
};
const pendingRequests = /*TURBOPACK member replacement*/ __turbopack_context__.g._pendingRequests;
const lastErrorProvider = /*TURBOPACK member replacement*/ __turbopack_context__.g._lastErrorProvider;
const pendingTimers = /*TURBOPACK member replacement*/ __turbopack_context__.g._pendingTimers;
const recentRing = /*TURBOPACK member replacement*/ __turbopack_context__.g._recentRing;
const connCache = /*TURBOPACK member replacement*/ __turbopack_context__.g._connectionMapCache;
const statsEmitTimers = /*TURBOPACK member replacement*/ __turbopack_context__.g._statsEmitTimers;
const statsEmitter = /*TURBOPACK member replacement*/ __turbopack_context__.g._statsEmitter;
function scheduleStatsEvent(event, delayMs = 150) {
    const key = event === "update" ? "update" : "pending";
    if (statsEmitTimers[key]) return;
    statsEmitTimers[key] = setTimeout(()=>{
        statsEmitTimers[key] = null;
        statsEmitter.emit(event);
    }, delayMs);
    statsEmitTimers[key]?.unref?.();
}
function getLocalDateKey(timestamp) {
    const d = timestamp ? new Date(timestamp) : new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addToCounter(target, key, values) {
    if (!target[key]) target[key] = {
        requests: 0,
        promptTokens: 0,
        completionTokens: 0,
        cachedTokens: 0,
        cost: 0
    };
    target[key].requests += values.requests || 1;
    target[key].promptTokens += values.promptTokens || 0;
    target[key].completionTokens += values.completionTokens || 0;
    target[key].cachedTokens += values.cachedTokens || 0;
    target[key].cost += values.cost || 0;
    if (values.meta) Object.assign(target[key], values.meta);
}
function aggregateEntryToDay(day, entry) {
    const promptTokens = entry.tokens?.prompt_tokens || entry.tokens?.input_tokens || 0;
    const completionTokens = entry.tokens?.completion_tokens || entry.tokens?.output_tokens || 0;
    const cachedTokens = entry.tokens?.cached_tokens || entry.tokens?.cache_read_input_tokens || 0;
    const cost = entry.cost || 0;
    const vals = {
        promptTokens,
        completionTokens,
        cachedTokens,
        cost
    };
    day.requests = (day.requests || 0) + 1;
    day.promptTokens = (day.promptTokens || 0) + promptTokens;
    day.completionTokens = (day.completionTokens || 0) + completionTokens;
    day.cachedTokens = (day.cachedTokens || 0) + cachedTokens;
    day.cost = (day.cost || 0) + cost;
    day.byProvider ||= {};
    day.byModel ||= {};
    day.byAccount ||= {};
    day.byApiKey ||= {};
    day.byEndpoint ||= {};
    if (entry.provider) addToCounter(day.byProvider, entry.provider, vals);
    const modelKey = entry.provider ? `${entry.model}|${entry.provider}` : entry.model;
    addToCounter(day.byModel, modelKey, {
        ...vals,
        meta: {
            rawModel: entry.model,
            provider: entry.provider
        }
    });
    if (entry.connectionId) {
        addToCounter(day.byAccount, entry.connectionId, {
            ...vals,
            meta: {
                rawModel: entry.model,
                provider: entry.provider
            }
        });
    }
    const apiKeyVal = entry.apiKey && typeof entry.apiKey === "string" ? entry.apiKey : "local-no-key";
    const akModelKey = `${apiKeyVal}|${entry.model}|${entry.provider || "unknown"}`;
    addToCounter(day.byApiKey, akModelKey, {
        ...vals,
        meta: {
            rawModel: entry.model,
            provider: entry.provider,
            apiKey: entry.apiKey || null
        }
    });
    const endpoint = entry.endpoint || "Unknown";
    const epKey = `${endpoint}|${entry.model}|${entry.provider || "unknown"}`;
    addToCounter(day.byEndpoint, epKey, {
        ...vals,
        meta: {
            endpoint,
            rawModel: entry.model,
            provider: entry.provider
        }
    });
}
function pushToRing(entry) {
    recentRing.items.push(entry);
    if (recentRing.items.length > RING_CAP) {
        recentRing.items = recentRing.items.slice(-RING_CAP);
    }
}
async function getConnectionMapCached() {
    if (Date.now() - connCache.ts < CONN_CACHE_TTL_MS) return connCache.map;
    try {
        const { getProviderConnections } = await __turbopack_context__.A("[project]/src/lib/db/repos/connectionsRepo.js [middleware] (ecmascript, async loader)");
        const all = await getProviderConnections();
        const map = {};
        for (const c of all)map[c.id] = c.name || c.email || c.id;
        connCache.map = map;
        connCache.ts = Date.now();
    } catch  {}
    return connCache.map;
}
async function ensureRingInitialized() {
    if (recentRing.initialized) return;
    recentRing.initialized = true;
    try {
        const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
        const rows = db.all(`SELECT timestamp, provider, model, connectionId, apiKey, endpoint, cost, status, tokens FROM usageHistory ORDER BY id DESC LIMIT ?`, [
            RING_CAP
        ]);
        recentRing.items = rows.reverse().map((r)=>({
                timestamp: r.timestamp,
                provider: r.provider,
                model: r.model,
                connectionId: r.connectionId,
                apiKey: r.apiKey,
                endpoint: r.endpoint,
                cost: r.cost,
                status: r.status,
                tokens: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(r.tokens, {})
            }));
    } catch  {}
}
async function calculateCost(provider, model, tokens) {
    if (!tokens || !provider || !model) return 0;
    try {
        const { getPricingForModel } = await __turbopack_context__.A("[project]/src/lib/db/repos/pricingRepo.js [middleware] (ecmascript, async loader)");
        const pricing = await getPricingForModel(provider, model);
        if (!pricing) return 0;
        // Delegate the actual math to the single source of truth (avoids the two
        // copies drifting apart — see open-sse/providers/pricing.js for the
        // cache-inclusive prompt_tokens convention this assumes).
        const { calculateCostFromTokens } = await __turbopack_context__.A("[project]/open-sse/providers/pricing.js [middleware] (ecmascript, async loader)");
        return calculateCostFromTokens(tokens, pricing);
    } catch (e) {
        console.error("Error calculating cost:", e);
        return 0;
    }
}
function trackPendingRequest(model, provider, connectionId, started, error = false) {
    const modelKey = provider ? `${model} (${provider})` : model;
    const timerKey = `${connectionId}|${modelKey}`;
    if (!pendingRequests.byModel[modelKey]) pendingRequests.byModel[modelKey] = 0;
    pendingRequests.byModel[modelKey] = Math.max(0, pendingRequests.byModel[modelKey] + (started ? 1 : -1));
    if (pendingRequests.byModel[modelKey] === 0) delete pendingRequests.byModel[modelKey];
    if (connectionId) {
        if (!pendingRequests.byAccount[connectionId]) pendingRequests.byAccount[connectionId] = {};
        if (!pendingRequests.byAccount[connectionId][modelKey]) pendingRequests.byAccount[connectionId][modelKey] = 0;
        pendingRequests.byAccount[connectionId][modelKey] = Math.max(0, pendingRequests.byAccount[connectionId][modelKey] + (started ? 1 : -1));
        if (pendingRequests.byAccount[connectionId][modelKey] === 0) {
            delete pendingRequests.byAccount[connectionId][modelKey];
            if (Object.keys(pendingRequests.byAccount[connectionId]).length === 0) {
                delete pendingRequests.byAccount[connectionId];
            }
        }
    }
    if (started) {
        clearTimeout(pendingTimers[timerKey]);
        pendingTimers[timerKey] = setTimeout(()=>{
            delete pendingTimers[timerKey];
            if (pendingRequests.byModel[modelKey] > 0) pendingRequests.byModel[modelKey] = 0;
            if (connectionId && pendingRequests.byAccount[connectionId]?.[modelKey] > 0) {
                pendingRequests.byAccount[connectionId][modelKey] = 0;
            }
            scheduleStatsEvent("pending");
        }, PENDING_TIMEOUT_MS);
    } else {
        clearTimeout(pendingTimers[timerKey]);
        delete pendingTimers[timerKey];
    }
    if (!started && error && provider) {
        lastErrorProvider.provider = provider.toLowerCase();
        lastErrorProvider.ts = Date.now();
    }
    // [PENDING] console line removed; lifecycle is visible via "▶" and "📊 done" lines
    scheduleStatsEvent("pending");
}
async function getActiveRequests() {
    const activeRequests = [];
    const connectionMap = await getConnectionMapCached();
    for (const [connectionId, models] of Object.entries(pendingRequests.byAccount)){
        for (const [modelKey, count] of Object.entries(models)){
            if (count > 0) {
                const accountName = connectionMap[connectionId] || `Account ${connectionId.slice(0, 8)}...`;
                const match = modelKey.match(/^(.*) \((.*)\)$/);
                activeRequests.push({
                    model: match ? match[1] : modelKey,
                    provider: match ? match[2] : "unknown",
                    account: accountName,
                    count
                });
            }
        }
    }
    await ensureRingInitialized();
    const seen = new Set();
    const recentRequests = [
        ...recentRing.items
    ].sort((a, b)=>new Date(b.timestamp) - new Date(a.timestamp)).map((e)=>{
        const t = e.tokens || {};
        return {
            timestamp: e.timestamp,
            model: e.model,
            provider: e.provider || "",
            promptTokens: t.prompt_tokens || t.input_tokens || 0,
            completionTokens: t.completion_tokens || t.output_tokens || 0,
            status: e.status || "ok"
        };
    }).filter((e)=>{
        if (e.promptTokens === 0 && e.completionTokens === 0) return false;
        const minute = e.timestamp ? e.timestamp.slice(0, 16) : "";
        const key = `${e.model}|${e.provider}|${e.promptTokens}|${e.completionTokens}|${minute}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).slice(0, 20);
    const errorProvider = Date.now() - lastErrorProvider.ts < 10000 ? lastErrorProvider.provider : "";
    return {
        activeRequests,
        recentRequests,
        errorProvider
    };
}
async function saveRequestUsage(entry) {
    try {
        const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
        if (!entry.timestamp) entry.timestamp = new Date().toISOString();
        entry.cost = await calculateCost(entry.provider, entry.model, entry.tokens);
        const tokens = entry.tokens || {};
        const promptTokens = tokens.prompt_tokens || tokens.input_tokens || 0;
        const completionTokens = tokens.completion_tokens || tokens.output_tokens || 0;
        let inserted = false;
        // All 3 writes (history insert, daily upsert, lifetime counter) in ONE transaction.
        // better-sqlite3 is sync → no JS yield mid-transaction → no race in same process.
        db.transaction(()=>{
            const existing = db.get(`SELECT id, endpoint FROM usageHistory
         WHERE timestamp = ?
           AND COALESCE(provider, '') = COALESCE(?, '')
           AND COALESCE(model, '') = COALESCE(?, '')
           AND COALESCE(connectionId, '') = COALESCE(?, '')
           AND COALESCE(apiKey, '') = COALESCE(?, '')
           AND promptTokens = ?
           AND completionTokens = ?
         ORDER BY id DESC LIMIT 1`, [
                entry.timestamp,
                entry.provider || null,
                entry.model || null,
                entry.connectionId || null,
                entry.apiKey || null,
                promptTokens,
                completionTokens
            ]);
            if (existing) {
                if (!existing.endpoint && entry.endpoint) {
                    db.run(`UPDATE usageHistory SET endpoint = ? WHERE id = ?`, [
                        entry.endpoint,
                        existing.id
                    ]);
                }
                return;
            }
            db.run(`INSERT INTO usageHistory(timestamp, provider, model, connectionId, apiKey, endpoint, promptTokens, completionTokens, cost, status, tokens, meta) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                entry.timestamp,
                entry.provider || null,
                entry.model || null,
                entry.connectionId || null,
                entry.apiKey || null,
                entry.endpoint || null,
                promptTokens,
                completionTokens,
                entry.cost || 0,
                entry.status || "ok",
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(tokens),
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])({})
            ]);
            const dateKey = getLocalDateKey(entry.timestamp);
            const row = db.get(`SELECT data FROM usageDaily WHERE dateKey = ?`, [
                dateKey
            ]);
            const day = row ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(row.data, {}) : {
                requests: 0,
                promptTokens: 0,
                completionTokens: 0,
                cost: 0,
                byProvider: {},
                byModel: {},
                byAccount: {},
                byApiKey: {},
                byEndpoint: {}
            };
            aggregateEntryToDay(day, entry);
            db.run(`INSERT INTO usageDaily(dateKey, data) VALUES(?, ?) ON CONFLICT(dateKey) DO UPDATE SET data = excluded.data`, [
                dateKey,
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(day)
            ]);
            // Atomic counter increment in same transaction
            const cur = db.get(`SELECT value FROM _meta WHERE key = 'totalRequestsLifetime'`);
            const next = (cur ? parseInt(cur.value, 10) : 0) + 1;
            db.run(`INSERT INTO _meta(key, value) VALUES('totalRequestsLifetime', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, [
                String(next)
            ]);
            inserted = true;
        });
        if (inserted) {
            pushToRing(entry);
            scheduleStatsEvent("update", 250);
        }
    } catch (e) {
        console.error("Failed to save usage stats:", e);
    }
}
async function getUsageHistory(filter = {}) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const conds = [];
    const params = [];
    if (filter.provider) {
        conds.push("provider = ?");
        params.push(filter.provider);
    }
    if (filter.model) {
        conds.push("model = ?");
        params.push(filter.model);
    }
    if (filter.startDate) {
        conds.push("timestamp >= ?");
        params.push(new Date(filter.startDate).toISOString());
    }
    if (filter.endDate) {
        conds.push("timestamp <= ?");
        params.push(new Date(filter.endDate).toISOString());
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const rows = db.all(`SELECT timestamp, provider, model, connectionId, apiKey, endpoint, cost, status, tokens FROM usageHistory ${where} ORDER BY id ASC`, params);
    return rows.map((r)=>({
            timestamp: r.timestamp,
            provider: r.provider,
            model: r.model,
            connectionId: r.connectionId,
            apiKeyMasked: maskApiKey(r.apiKey),
            endpoint: r.endpoint,
            cost: r.cost,
            status: r.status,
            tokens: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(r.tokens, {})
        }));
}
function loadDaysInRange(adapter, maxDays) {
    if (maxDays == null) {
        return adapter.all(`SELECT dateKey, data FROM usageDaily`);
    }
    const today = new Date();
    const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate() - maxDays + 1);
    const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
    return adapter.all(`SELECT dateKey, data FROM usageDaily WHERE dateKey >= ?`, [
        cutoffKey
    ]);
}
async function getUsageStats(period = "all") {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const [{ getProviderConnections }, { getApiKeys }, { getProviderNodes }] = await Promise.all([
        __turbopack_context__.A("[project]/src/lib/db/repos/connectionsRepo.js [middleware] (ecmascript, async loader)"),
        __turbopack_context__.A("[project]/src/lib/db/repos/apiKeysRepo.js [middleware] (ecmascript, async loader)"),
        __turbopack_context__.A("[project]/src/lib/db/repos/nodesRepo.js [middleware] (ecmascript, async loader)")
    ]);
    let allConnections = [];
    try {
        allConnections = await getProviderConnections();
    } catch  {}
    const connectionMap = {};
    for (const c of allConnections)connectionMap[c.id] = c.name || c.email || c.id;
    const providerNodeNameMap = {};
    try {
        const nodes = await getProviderNodes();
        for (const n of nodes)if (n.id && n.name) providerNodeNameMap[n.id] = n.name;
    } catch  {}
    let allApiKeys = [];
    try {
        allApiKeys = await getApiKeys();
    } catch  {}
    const apiKeyMap = {};
    for (const k of allApiKeys)apiKeyMap[k.key] = {
        name: k.name,
        id: k.id,
        createdAt: k.createdAt
    };
    // recentRequests from live history (last 100 entries enough for 20 deduped)
    const recentRows = db.all(`SELECT timestamp, provider, model, tokens, status FROM usageHistory ORDER BY id DESC LIMIT 100`);
    const seen = new Set();
    const recentRequests = recentRows.map((r)=>{
        const t = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(r.tokens, {}) || {};
        return {
            timestamp: r.timestamp,
            model: r.model,
            provider: r.provider || "",
            promptTokens: t.prompt_tokens || t.input_tokens || 0,
            completionTokens: t.completion_tokens || t.output_tokens || 0,
            cachedTokens: t.cached_tokens || t.cache_read_input_tokens || 0,
            status: r.status || "ok"
        };
    }).filter((e)=>{
        if (e.promptTokens === 0 && e.completionTokens === 0) return false;
        const minute = e.timestamp ? e.timestamp.slice(0, 16) : "";
        const key = `${e.model}|${e.provider}|${e.promptTokens}|${e.completionTokens}|${minute}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).slice(0, 20);
    const stats = {
        totalRequests: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalCachedTokens: 0,
        totalCost: 0,
        byProvider: {},
        byModel: {},
        byAccount: {},
        byApiKey: {},
        byEndpoint: {},
        last10Minutes: [],
        pending: pendingRequests,
        activeRequests: [],
        recentRequests,
        errorProvider: Date.now() - lastErrorProvider.ts < 10000 ? lastErrorProvider.provider : ""
    };
    // Active requests
    for (const [connectionId, models] of Object.entries(pendingRequests.byAccount)){
        for (const [modelKey, count] of Object.entries(models)){
            if (count > 0) {
                const accountName = connectionMap[connectionId] || `Account ${connectionId.slice(0, 8)}...`;
                const match = modelKey.match(/^(.*) \((.*)\)$/);
                stats.activeRequests.push({
                    model: match ? match[1] : modelKey,
                    provider: match ? match[2] : "unknown",
                    account: accountName,
                    count
                });
            }
        }
    }
    // last10Minutes — query 10min window
    const now = new Date();
    const currentMinuteStart = new Date(Math.floor(now.getTime() / 60000) * 60000);
    const tenMinutesAgo = new Date(currentMinuteStart.getTime() - 9 * 60 * 1000);
    const bucketMap = {};
    for(let i = 0; i < 10; i++){
        const ts = currentMinuteStart.getTime() - (9 - i) * 60 * 1000;
        bucketMap[ts] = {
            requests: 0,
            promptTokens: 0,
            completionTokens: 0,
            cost: 0
        };
        stats.last10Minutes.push(bucketMap[ts]);
    }
    const recent10 = db.all(`SELECT timestamp, promptTokens, completionTokens, cost FROM usageHistory WHERE timestamp >= ? AND timestamp <= ?`, [
        tenMinutesAgo.toISOString(),
        now.toISOString()
    ]);
    for (const r of recent10){
        const tt = new Date(r.timestamp).getTime();
        const minuteStart = Math.floor(tt / 60000) * 60000;
        if (bucketMap[minuteStart]) {
            bucketMap[minuteStart].requests++;
            bucketMap[minuteStart].promptTokens += r.promptTokens || 0;
            bucketMap[minuteStart].completionTokens += r.completionTokens || 0;
            bucketMap[minuteStart].cost += r.cost || 0;
        }
    }
    const useDailySummary = period !== "24h" && period !== "today";
    if (useDailySummary) {
        const periodDays = {
            "7d": 7,
            "30d": 30,
            "60d": 60
        };
        const maxDays = periodDays[period] || null;
        const dayRows = loadDaysInRange(db, maxDays);
        for (const dr of dayRows){
            const dateKey = dr.dateKey;
            const day = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(dr.data, {});
            stats.totalPromptTokens += day.promptTokens || 0;
            stats.totalCompletionTokens += day.completionTokens || 0;
            stats.totalCachedTokens += day.cachedTokens || 0;
            stats.totalCost += day.cost || 0;
            for (const [prov, p] of Object.entries(day.byProvider || {})){
                if (!stats.byProvider[prov]) stats.byProvider[prov] = {
                    requests: 0,
                    promptTokens: 0,
                    completionTokens: 0,
                    cachedTokens: 0,
                    cost: 0
                };
                stats.byProvider[prov].requests += p.requests || 0;
                stats.byProvider[prov].promptTokens += p.promptTokens || 0;
                stats.byProvider[prov].completionTokens += p.completionTokens || 0;
                stats.byProvider[prov].cachedTokens += p.cachedTokens || 0;
                stats.byProvider[prov].cost += p.cost || 0;
            }
            for (const [mk, m] of Object.entries(day.byModel || {})){
                const rawModel = m.rawModel || mk.split("|")[0];
                const provider = m.provider || mk.split("|")[1] || "";
                const statsKey = provider ? `${rawModel} (${provider})` : rawModel;
                const providerDisplayName = providerNodeNameMap[provider] || provider;
                if (!stats.byModel[statsKey]) {
                    stats.byModel[statsKey] = {
                        requests: 0,
                        promptTokens: 0,
                        completionTokens: 0,
                        cachedTokens: 0,
                        cost: 0,
                        rawModel,
                        provider: providerDisplayName,
                        lastUsed: dateKey
                    };
                }
                stats.byModel[statsKey].requests += m.requests || 0;
                stats.byModel[statsKey].promptTokens += m.promptTokens || 0;
                stats.byModel[statsKey].completionTokens += m.completionTokens || 0;
                stats.byModel[statsKey].cachedTokens += m.cachedTokens || 0;
                stats.byModel[statsKey].cost += m.cost || 0;
                if (dateKey > (stats.byModel[statsKey].lastUsed || "")) stats.byModel[statsKey].lastUsed = dateKey;
            }
            for (const [connId, a] of Object.entries(day.byAccount || {})){
                const accountName = connectionMap[connId] || `Account ${connId.slice(0, 8)}...`;
                const rawModel = a.rawModel || "";
                const provider = a.provider || "";
                const providerDisplayName = providerNodeNameMap[provider] || provider;
                const accountKey = `${rawModel} (${provider} - ${accountName})`;
                if (!stats.byAccount[accountKey]) {
                    stats.byAccount[accountKey] = {
                        requests: 0,
                        promptTokens: 0,
                        completionTokens: 0,
                        cachedTokens: 0,
                        cost: 0,
                        rawModel,
                        provider: providerDisplayName,
                        connectionId: connId,
                        accountName,
                        lastUsed: dateKey
                    };
                }
                stats.byAccount[accountKey].requests += a.requests || 0;
                stats.byAccount[accountKey].promptTokens += a.promptTokens || 0;
                stats.byAccount[accountKey].completionTokens += a.completionTokens || 0;
                stats.byAccount[accountKey].cachedTokens += a.cachedTokens || 0;
                stats.byAccount[accountKey].cost += a.cost || 0;
                if (dateKey > (stats.byAccount[accountKey].lastUsed || "")) stats.byAccount[accountKey].lastUsed = dateKey;
            }
            for (const [akKey, ak] of Object.entries(day.byApiKey || {})){
                const rawModel = ak.rawModel || "";
                const provider = ak.provider || "";
                const providerDisplayName = providerNodeNameMap[provider] || provider;
                const apiKeyVal = ak.apiKey;
                const keyInfo = apiKeyVal ? apiKeyMap[apiKeyVal] : null;
                const keyName = keyInfo?.name || (apiKeyVal ? apiKeyVal.slice(0, 8) + "..." : "Local (No API Key)");
                const apiKeyMasked = maskApiKey(apiKeyVal);
                const apiKeyKey = apiKeyMasked || "local-no-key";
                if (!stats.byApiKey[akKey]) {
                    stats.byApiKey[akKey] = {
                        requests: 0,
                        promptTokens: 0,
                        completionTokens: 0,
                        cachedTokens: 0,
                        cost: 0,
                        rawModel,
                        provider: providerDisplayName,
                        apiKeyMasked,
                        keyName,
                        apiKeyKey,
                        lastUsed: dateKey
                    };
                }
                stats.byApiKey[akKey].requests += ak.requests || 0;
                stats.byApiKey[akKey].promptTokens += ak.promptTokens || 0;
                stats.byApiKey[akKey].completionTokens += ak.completionTokens || 0;
                stats.byApiKey[akKey].cachedTokens += ak.cachedTokens || 0;
                stats.byApiKey[akKey].cost += ak.cost || 0;
                if (dateKey > (stats.byApiKey[akKey].lastUsed || "")) stats.byApiKey[akKey].lastUsed = dateKey;
            }
            for (const [epKey, ep] of Object.entries(day.byEndpoint || {})){
                const endpoint = ep.endpoint || epKey.split("|")[0] || "Unknown";
                const rawModel = ep.rawModel || "";
                const provider = ep.provider || "";
                const providerDisplayName = providerNodeNameMap[provider] || provider;
                if (!stats.byEndpoint[epKey]) {
                    stats.byEndpoint[epKey] = {
                        requests: 0,
                        promptTokens: 0,
                        completionTokens: 0,
                        cachedTokens: 0,
                        cost: 0,
                        endpoint,
                        rawModel,
                        provider: providerDisplayName,
                        lastUsed: dateKey
                    };
                }
                stats.byEndpoint[epKey].requests += ep.requests || 0;
                stats.byEndpoint[epKey].promptTokens += ep.promptTokens || 0;
                stats.byEndpoint[epKey].completionTokens += ep.completionTokens || 0;
                stats.byEndpoint[epKey].cachedTokens += ep.cachedTokens || 0;
                stats.byEndpoint[epKey].cost += ep.cost || 0;
                if (dateKey > (stats.byEndpoint[epKey].lastUsed || "")) stats.byEndpoint[epKey].lastUsed = dateKey;
            }
        }
        // Overlay precise lastUsed timestamps from history
        const overlayCutoff = maxDays ? Date.now() - maxDays * 86400000 : 0;
        const histRows = db.all(`SELECT timestamp, provider, model, connectionId, apiKey, endpoint FROM usageHistory WHERE timestamp >= ?`, [
            new Date(overlayCutoff).toISOString()
        ]);
        for (const e of histRows){
            const ts = e.timestamp;
            const modelKey = e.provider ? `${e.model} (${e.provider})` : e.model;
            if (stats.byModel[modelKey] && new Date(ts) > new Date(stats.byModel[modelKey].lastUsed)) stats.byModel[modelKey].lastUsed = ts;
            if (e.connectionId) {
                const accountName = connectionMap[e.connectionId] || `Account ${e.connectionId.slice(0, 8)}...`;
                const accountKey = `${e.model} (${e.provider} - ${accountName})`;
                if (stats.byAccount[accountKey] && new Date(ts) > new Date(stats.byAccount[accountKey].lastUsed)) stats.byAccount[accountKey].lastUsed = ts;
            }
            const apiKeyKey = e.apiKey && typeof e.apiKey === "string" ? `${e.apiKey}|${e.model}|${e.provider || "unknown"}` : "local-no-key";
            if (stats.byApiKey[apiKeyKey] && new Date(ts) > new Date(stats.byApiKey[apiKeyKey].lastUsed)) stats.byApiKey[apiKeyKey].lastUsed = ts;
            const endpoint = e.endpoint || "Unknown";
            const endpointKey = `${endpoint}|${e.model}|${e.provider || "unknown"}`;
            if (stats.byEndpoint[endpointKey] && new Date(ts) > new Date(stats.byEndpoint[endpointKey].lastUsed)) stats.byEndpoint[endpointKey].lastUsed = ts;
        }
    } else {
        // 24h / today: live history
        let cutoff;
        if (period === "today") {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            cutoff = startOfDay.toISOString();
        } else {
            cutoff = new Date(Date.now() - PERIOD_MS["24h"]).toISOString();
        }
        const filtered = db.all(`SELECT timestamp, provider, model, connectionId, apiKey, endpoint, promptTokens, completionTokens, cost, tokens FROM usageHistory WHERE timestamp >= ?`, [
            cutoff
        ]);
        for (const r of filtered){
            const tokens = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(r.tokens, {}) || {};
            const promptTokens = tokens.prompt_tokens || 0;
            const completionTokens = tokens.completion_tokens || 0;
            const cachedTokens = tokens.cached_tokens || tokens.cache_read_input_tokens || 0;
            const entryCost = r.cost || 0;
            const providerDisplayName = providerNodeNameMap[r.provider] || r.provider;
            stats.totalPromptTokens += promptTokens;
            stats.totalCompletionTokens += completionTokens;
            stats.totalCachedTokens += cachedTokens;
            stats.totalCost += entryCost;
            if (!stats.byProvider[r.provider]) stats.byProvider[r.provider] = {
                requests: 0,
                promptTokens: 0,
                completionTokens: 0,
                cachedTokens: 0,
                cost: 0
            };
            stats.byProvider[r.provider].requests++;
            stats.byProvider[r.provider].promptTokens += promptTokens;
            stats.byProvider[r.provider].completionTokens += completionTokens;
            stats.byProvider[r.provider].cachedTokens += cachedTokens;
            stats.byProvider[r.provider].cost += entryCost;
            const modelKey = r.provider ? `${r.model} (${r.provider})` : r.model;
            if (!stats.byModel[modelKey]) {
                stats.byModel[modelKey] = {
                    requests: 0,
                    promptTokens: 0,
                    completionTokens: 0,
                    cachedTokens: 0,
                    cost: 0,
                    rawModel: r.model,
                    provider: providerDisplayName,
                    lastUsed: r.timestamp
                };
            }
            stats.byModel[modelKey].requests++;
            stats.byModel[modelKey].promptTokens += promptTokens;
            stats.byModel[modelKey].completionTokens += completionTokens;
            stats.byModel[modelKey].cachedTokens += cachedTokens;
            stats.byModel[modelKey].cost += entryCost;
            if (new Date(r.timestamp) > new Date(stats.byModel[modelKey].lastUsed)) stats.byModel[modelKey].lastUsed = r.timestamp;
            if (r.connectionId) {
                const accountName = connectionMap[r.connectionId] || `Account ${r.connectionId.slice(0, 8)}...`;
                const accountKey = `${r.model} (${r.provider} - ${accountName})`;
                if (!stats.byAccount[accountKey]) {
                    stats.byAccount[accountKey] = {
                        requests: 0,
                        promptTokens: 0,
                        completionTokens: 0,
                        cachedTokens: 0,
                        cost: 0,
                        rawModel: r.model,
                        provider: providerDisplayName,
                        connectionId: r.connectionId,
                        accountName,
                        lastUsed: r.timestamp
                    };
                }
                stats.byAccount[accountKey].requests++;
                stats.byAccount[accountKey].promptTokens += promptTokens;
                stats.byAccount[accountKey].completionTokens += completionTokens;
                stats.byAccount[accountKey].cachedTokens += cachedTokens;
                stats.byAccount[accountKey].cost += entryCost;
                if (new Date(r.timestamp) > new Date(stats.byAccount[accountKey].lastUsed)) stats.byAccount[accountKey].lastUsed = r.timestamp;
            }
            if (r.apiKey && typeof r.apiKey === "string") {
                const keyInfo = apiKeyMap[r.apiKey];
                const keyName = keyInfo?.name || r.apiKey.slice(0, 8) + "...";
                const apiKeyMasked = maskApiKey(r.apiKey);
                const akKey = `${apiKeyMasked}|${r.model}|${r.provider || "unknown"}`;
                if (!stats.byApiKey[akKey]) {
                    stats.byApiKey[akKey] = {
                        requests: 0,
                        promptTokens: 0,
                        completionTokens: 0,
                        cachedTokens: 0,
                        cost: 0,
                        rawModel: r.model,
                        provider: providerDisplayName,
                        apiKeyMasked,
                        keyName,
                        apiKeyKey: apiKeyMasked,
                        lastUsed: r.timestamp
                    };
                }
                const ake = stats.byApiKey[akKey];
                ake.requests++;
                ake.promptTokens += promptTokens;
                ake.completionTokens += completionTokens;
                ake.cachedTokens += cachedTokens;
                ake.cost += entryCost;
                if (new Date(r.timestamp) > new Date(ake.lastUsed)) ake.lastUsed = r.timestamp;
            } else {
                if (!stats.byApiKey["local-no-key"]) {
                    stats.byApiKey["local-no-key"] = {
                        requests: 0,
                        promptTokens: 0,
                        completionTokens: 0,
                        cachedTokens: 0,
                        cost: 0,
                        rawModel: r.model,
                        provider: providerDisplayName,
                        apiKeyMasked: null,
                        keyName: "Local (No API Key)",
                        apiKeyKey: "local-no-key",
                        lastUsed: r.timestamp
                    };
                }
                const ake = stats.byApiKey["local-no-key"];
                ake.requests++;
                ake.promptTokens += promptTokens;
                ake.completionTokens += completionTokens;
                ake.cachedTokens += cachedTokens;
                ake.cost += entryCost;
                if (new Date(r.timestamp) > new Date(ake.lastUsed)) ake.lastUsed = r.timestamp;
            }
            const endpoint = r.endpoint || "Unknown";
            const epKey = `${endpoint}|${r.model}|${r.provider || "unknown"}`;
            if (!stats.byEndpoint[epKey]) {
                stats.byEndpoint[epKey] = {
                    requests: 0,
                    promptTokens: 0,
                    completionTokens: 0,
                    cachedTokens: 0,
                    cost: 0,
                    endpoint,
                    rawModel: r.model,
                    provider: providerDisplayName,
                    lastUsed: r.timestamp
                };
            }
            const epe = stats.byEndpoint[epKey];
            epe.requests++;
            epe.promptTokens += promptTokens;
            epe.completionTokens += completionTokens;
            epe.cachedTokens += cachedTokens;
            epe.cost += entryCost;
            if (new Date(r.timestamp) > new Date(epe.lastUsed)) epe.lastUsed = r.timestamp;
        }
    }
    stats.totalRequests = Object.values(stats.byProvider).reduce((sum, p)=>sum + (p.requests || 0), 0);
    return stats;
}
async function getChartData(period = "7d") {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const now = Date.now();
    if (period === "today") {
        const bucketCount = 24;
        const bucketMs = 3600000;
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const startTime = startOfDay.getTime();
        const endTime = startTime + bucketCount * bucketMs;
        const labelFn = (ts)=>new Date(ts).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            });
        const buckets = Array.from({
            length: bucketCount
        }, (_, i)=>({
                label: labelFn(startTime + i * bucketMs),
                tokens: 0,
                cost: 0
            }));
        const rows = db.all(`SELECT timestamp, promptTokens, completionTokens, cost FROM usageHistory WHERE timestamp >= ?`, [
            new Date(startTime).toISOString()
        ]);
        for (const r of rows){
            const t = new Date(r.timestamp).getTime();
            if (t < startTime || t >= endTime) continue;
            const idx = Math.floor((t - startTime) / bucketMs);
            if (idx >= 0 && idx < bucketCount) {
                buckets[idx].tokens += (r.promptTokens || 0) + (r.completionTokens || 0);
                buckets[idx].cost += r.cost || 0;
            }
        }
        return buckets;
    }
    if (period === "24h") {
        const bucketCount = 24;
        const bucketMs = 3600000;
        const labelFn = (ts)=>new Date(ts).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            });
        const startTime = now - bucketCount * bucketMs;
        const buckets = Array.from({
            length: bucketCount
        }, (_, i)=>({
                label: labelFn(startTime + i * bucketMs),
                tokens: 0,
                cost: 0
            }));
        const rows = db.all(`SELECT timestamp, promptTokens, completionTokens, cost FROM usageHistory WHERE timestamp >= ?`, [
            new Date(startTime).toISOString()
        ]);
        for (const r of rows){
            const t = new Date(r.timestamp).getTime();
            if (t < startTime || t > now) continue;
            const idx = Math.min(Math.floor((t - startTime) / bucketMs), bucketCount - 1);
            buckets[idx].tokens += (r.promptTokens || 0) + (r.completionTokens || 0);
            buckets[idx].cost += r.cost || 0;
        }
        return buckets;
    }
    const bucketCount = period === "7d" ? 7 : period === "30d" ? 30 : 60;
    const today = new Date();
    const labelFn = (d)=>d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric"
        });
    // Build map of dateKey → day data
    const dayRows = loadDaysInRange(db, bucketCount);
    const dayMap = {};
    for (const r of dayRows)dayMap[r.dateKey] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(r.data, {});
    return Array.from({
        length: bucketCount
    }, (_, i)=>{
        const d = new Date(today);
        d.setDate(d.getDate() - (bucketCount - 1 - i));
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const dayData = dayMap[dateKey];
        return {
            label: labelFn(d),
            tokens: dayData ? (dayData.promptTokens || 0) + (dayData.completionTokens || 0) : 0,
            cost: dayData ? dayData.cost || 0 : 0
        };
    });
}
function formatLogDate(date = new Date()) {
    const pad = (n)=>String(n).padStart(2, "0");
    return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
async function appendRequestLog() {}
async function getRecentLogs(limit = 200) {
    try {
        const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
        const rows = db.all(`SELECT timestamp, provider, model, connectionId, promptTokens, completionTokens, status, tokens FROM usageHistory ORDER BY id DESC LIMIT ?`, [
            limit
        ]);
        if (!rows.length) return [];
        const connMap = {};
        try {
            const { getProviderConnections } = await __turbopack_context__.A("[project]/src/lib/db/repos/connectionsRepo.js [middleware] (ecmascript, async loader)");
            const connections = await getProviderConnections();
            for (const c of connections)connMap[c.id] = c.name || c.email || "";
        } catch  {}
        return rows.map((r)=>{
            const ts = formatLogDate(new Date(r.timestamp));
            const p = r.provider?.toUpperCase() || "-";
            const m = r.model || "-";
            const account = connMap[r.connectionId] || (r.connectionId ? r.connectionId.slice(0, 8) : "-");
            const tk = r.tokens ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(r.tokens, {}) : {};
            const sent = r.promptTokens ?? tk.prompt_tokens ?? "-";
            const received = r.completionTokens ?? tk.completion_tokens ?? "-";
            return `${ts} | ${m} | ${p} | ${account} | ${sent} | ${received} | ${r.status || "-"}`;
        });
    } catch (e) {
        console.error("[usageRepo] getRecentLogs failed:", e.message);
        return [];
    }
}
}),
"[project]/src/lib/db/repos/requestDetailsRepo.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getDistinctProviders",
    ()=>getDistinctProviders,
    "getRequestDetailById",
    ()=>getRequestDetailById,
    "getRequestDetails",
    ()=>getRequestDetails,
    "saveRequestDetail",
    ()=>saveRequestDetail
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/driver.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/helpers/jsonCol.js [middleware] (ecmascript)");
;
;
const DEFAULT_MAX_RECORDS = 200;
const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_FLUSH_INTERVAL_MS = 5000;
const DEFAULT_MAX_JSON_SIZE = 5 * 1024;
const CONFIG_CACHE_TTL_MS = 5000;
let cachedConfig = null;
let cachedConfigTs = 0;
async function getObservabilityConfig() {
    if (cachedConfig && Date.now() - cachedConfigTs < CONFIG_CACHE_TTL_MS) return cachedConfig;
    try {
        const { getSettings } = await __turbopack_context__.A("[project]/src/lib/db/repos/settingsRepo.js [middleware] (ecmascript, async loader)");
        const settings = await getSettings();
        const envEnabled = process.env.OBSERVABILITY_ENABLED !== "false";
        const enabled = typeof settings.enableObservability2 === "boolean" ? settings.enableObservability2 : envEnabled;
        cachedConfig = {
            enabled,
            maxRecords: settings.observabilityMaxRecords || parseInt(process.env.OBSERVABILITY_MAX_RECORDS || String(DEFAULT_MAX_RECORDS), 10),
            batchSize: settings.observabilityBatchSize || parseInt(process.env.OBSERVABILITY_BATCH_SIZE || String(DEFAULT_BATCH_SIZE), 10),
            flushIntervalMs: settings.observabilityFlushIntervalMs || parseInt(process.env.OBSERVABILITY_FLUSH_INTERVAL_MS || String(DEFAULT_FLUSH_INTERVAL_MS), 10),
            maxJsonSize: (settings.observabilityMaxJsonSize || parseInt(process.env.OBSERVABILITY_MAX_JSON_SIZE || "5", 10)) * 1024
        };
    } catch  {
        cachedConfig = {
            enabled: false,
            maxRecords: DEFAULT_MAX_RECORDS,
            batchSize: DEFAULT_BATCH_SIZE,
            flushIntervalMs: DEFAULT_FLUSH_INTERVAL_MS,
            maxJsonSize: DEFAULT_MAX_JSON_SIZE
        };
    }
    cachedConfigTs = Date.now();
    return cachedConfig;
}
let writeBuffer = [];
let flushTimer = null;
let isFlushing = false;
function sanitizeHeaders(headers) {
    if (!headers || typeof headers !== "object") return {};
    const sensitiveKeys = [
        "authorization",
        "x-api-key",
        "cookie",
        "token",
        "api-key"
    ];
    const sanitized = {
        ...headers
    };
    for (const key of Object.keys(sanitized)){
        if (sensitiveKeys.some((s)=>key.toLowerCase().includes(s))) delete sanitized[key];
    }
    return sanitized;
}
function generateDetailId(model) {
    const timestamp = new Date().toISOString();
    const random = Math.random().toString(36).substring(2, 8);
    const modelPart = model ? model.replace(/[^a-zA-Z0-9-]/g, "-") : "unknown";
    return `${timestamp}-${random}-${modelPart}`;
}
function truncateField(obj, maxSize) {
    const str = JSON.stringify(obj || {});
    if (str.length > maxSize) {
        return {
            _truncated: true,
            _originalSize: str.length,
            _preview: str.substring(0, 200)
        };
    }
    return obj || {};
}
async function flushToDatabase() {
    if (isFlushing) return;
    if (writeBuffer.length === 0) return;
    isFlushing = true;
    try {
        // Drain entire buffer (loop in case more pushed during await)
        while(writeBuffer.length > 0){
            const items = writeBuffer.splice(0, writeBuffer.length);
            const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
            const config = await getObservabilityConfig();
            db.transaction(()=>{
                for (const item of items){
                    if (!item.id) item.id = generateDetailId(item.model);
                    if (!item.timestamp) item.timestamp = new Date().toISOString();
                    if (item.request?.headers) item.request.headers = sanitizeHeaders(item.request.headers);
                    const record = {
                        id: item.id,
                        provider: item.provider || null,
                        model: item.model || null,
                        connectionId: item.connectionId || null,
                        timestamp: item.timestamp,
                        status: item.status || null,
                        latency: item.latency || {},
                        tokens: item.tokens || {},
                        request: truncateField(item.request, config.maxJsonSize),
                        providerRequest: truncateField(item.providerRequest, config.maxJsonSize),
                        providerResponse: truncateField(item.providerResponse, config.maxJsonSize),
                        response: truncateField(item.response, config.maxJsonSize),
                        pxpipe: item.pxpipe || undefined
                    };
                    db.run(`INSERT INTO requestDetails(id, timestamp, provider, model, connectionId, status, data) VALUES(?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET timestamp = excluded.timestamp, provider = excluded.provider, model = excluded.model, connectionId = excluded.connectionId, status = excluded.status, data = excluded.data`, [
                        record.id,
                        record.timestamp,
                        record.provider,
                        record.model,
                        record.connectionId,
                        record.status,
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(record)
                    ]);
                }
                const cnt = db.get(`SELECT COUNT(*) as c FROM requestDetails`);
                if (cnt && cnt.c > config.maxRecords) {
                    db.run(`DELETE FROM requestDetails WHERE id IN (SELECT id FROM requestDetails ORDER BY timestamp ASC LIMIT ?)`, [
                        cnt.c - config.maxRecords
                    ]);
                }
            });
        }
    } catch (e) {
        console.error("[requestDetailsRepo] Batch write failed:", e);
    } finally{
        isFlushing = false;
    }
}
async function saveRequestDetail(detail) {
    const config = await getObservabilityConfig();
    if (!config.enabled) return;
    writeBuffer.push(detail);
    // Trigger immediate flush if batch threshold reached.
    // flushToDatabase() drains entire buffer in a loop, so all pushes during await are persisted.
    if (writeBuffer.length >= config.batchSize) {
        if (flushTimer) {
            clearTimeout(flushTimer);
            flushTimer = null;
        }
        flushToDatabase().catch((e)=>console.error("[requestDetailsRepo] flush err:", e));
    } else if (!flushTimer) {
        flushTimer = setTimeout(()=>{
            flushTimer = null;
            flushToDatabase().catch(()=>{});
        }, config.flushIntervalMs);
    }
}
async function getRequestDetails(filter = {}) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const conds = [];
    const params = [];
    if (filter.provider) {
        conds.push("provider = ?");
        params.push(filter.provider);
    }
    if (filter.model) {
        conds.push("model = ?");
        params.push(filter.model);
    }
    if (filter.connectionId) {
        conds.push("connectionId = ?");
        params.push(filter.connectionId);
    }
    if (filter.status) {
        conds.push("status = ?");
        params.push(filter.status);
    }
    if (filter.startDate) {
        conds.push("timestamp >= ?");
        params.push(new Date(filter.startDate).toISOString());
    }
    if (filter.endDate) {
        conds.push("timestamp <= ?");
        params.push(new Date(filter.endDate).toISOString());
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const cntRow = db.get(`SELECT COUNT(*) as c FROM requestDetails ${where}`, params);
    const totalItems = cntRow ? cntRow.c : 0;
    const page = filter.page || 1;
    const pageSize = filter.pageSize || 50;
    const totalPages = Math.ceil(totalItems / pageSize);
    const offset = (page - 1) * pageSize;
    const rows = db.all(`SELECT data FROM requestDetails ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`, [
        ...params,
        pageSize,
        offset
    ]);
    const details = rows.map((r)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(r.data, {}));
    return {
        details,
        pagination: {
            page,
            pageSize,
            totalItems,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        }
    };
}
async function getDistinctProviders() {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const rows = db.all(`SELECT DISTINCT provider FROM requestDetails WHERE provider IS NOT NULL ORDER BY provider ASC`);
    return rows.map((r)=>r.provider);
}
async function getRequestDetailById(id) {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const row = db.get(`SELECT data FROM requestDetails WHERE id = ?`, [
        id
    ]);
    return row ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(row.data, null) : null;
}
const _shutdownHandler = async ()=>{
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
    if (writeBuffer.length > 0) await flushToDatabase();
};
function ensureShutdownHandler() {
    process.off("beforeExit", _shutdownHandler);
    process.off("SIGINT", _shutdownHandler);
    process.off("SIGTERM", _shutdownHandler);
    process.off("exit", _shutdownHandler);
    process.on("beforeExit", _shutdownHandler);
    process.on("SIGINT", _shutdownHandler);
    process.on("SIGTERM", _shutdownHandler);
    process.on("exit", _shutdownHandler);
}
ensureShutdownHandler();
}),
"[project]/src/lib/db/index.js [middleware] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "exportDb",
    ()=>exportDb,
    "importDb",
    ()=>importDb,
    "initDb",
    ()=>initDb
]);
// Public API barrel — all DB functions
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/driver.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/helpers/jsonCol.js [middleware] (ecmascript)");
// Settings
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$repos$2f$settingsRepo$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/repos/settingsRepo.js [middleware] (ecmascript)");
// Provider connections
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$repos$2f$connectionsRepo$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/repos/connectionsRepo.js [middleware] (ecmascript)");
// Provider nodes
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$repos$2f$nodesRepo$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/repos/nodesRepo.js [middleware] (ecmascript)");
// Proxy pools
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$repos$2f$proxyPoolsRepo$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/repos/proxyPoolsRepo.js [middleware] (ecmascript)");
// API keys
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$repos$2f$apiKeysRepo$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/repos/apiKeysRepo.js [middleware] (ecmascript)");
// Combos
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$repos$2f$combosRepo$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/repos/combosRepo.js [middleware] (ecmascript)");
// Aliases (model + custom + mitm)
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$repos$2f$aliasRepo$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/repos/aliasRepo.js [middleware] (ecmascript)");
// Pricing
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$repos$2f$pricingRepo$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/repos/pricingRepo.js [middleware] (ecmascript)");
// Disabled models
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$repos$2f$disabledModelsRepo$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/repos/disabledModelsRepo.js [middleware] (ecmascript)");
// Usage
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$repos$2f$usageRepo$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/repos/usageRepo.js [middleware] (ecmascript)");
// Request details
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$repos$2f$requestDetailsRepo$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/repos/requestDetailsRepo.js [middleware] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
;
;
async function exportDb() {
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    const { exportSettings } = await __turbopack_context__.A("[project]/src/lib/db/repos/settingsRepo.js [middleware] (ecmascript, async loader)");
    const out = {
        settings: await exportSettings(),
        providerConnections: db.all(`SELECT * FROM providerConnections`).map((r)=>({
                ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(r.data, {}),
                id: r.id,
                provider: r.provider,
                authType: r.authType,
                name: r.name,
                email: r.email,
                priority: r.priority,
                isActive: r.isActive === 1,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt
            })),
        providerNodes: db.all(`SELECT * FROM providerNodes`).map((r)=>({
                ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(r.data, {}),
                id: r.id,
                type: r.type,
                name: r.name,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt
            })),
        proxyPools: db.all(`SELECT * FROM proxyPools`).map((r)=>({
                ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(r.data, {}),
                id: r.id,
                isActive: r.isActive === 1,
                testStatus: r.testStatus,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt
            })),
        apiKeys: db.all(`SELECT * FROM apiKeys`).map((r)=>({
                id: r.id,
                key: r.key,
                name: r.name,
                machineId: r.machineId,
                isActive: r.isActive === 1,
                createdAt: r.createdAt
            })),
        combos: db.all(`SELECT * FROM combos`).map((r)=>({
                id: r.id,
                name: r.name,
                kind: r.kind,
                models: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(r.models, []),
                createdAt: r.createdAt,
                updatedAt: r.updatedAt
            })),
        modelAliases: {},
        customModels: [],
        mitmAlias: {},
        pricing: {}
    };
    for (const r of db.all(`SELECT key, value FROM kv WHERE scope = 'modelAliases'`))out.modelAliases[r.key] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(r.value);
    for (const r of db.all(`SELECT key, value FROM kv WHERE scope = 'customModels'`))out.customModels.push((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(r.value));
    for (const r of db.all(`SELECT key, value FROM kv WHERE scope = 'mitmAlias'`))out.mitmAlias[r.key] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(r.value);
    for (const r of db.all(`SELECT key, value FROM kv WHERE scope = 'pricing'`))out.pricing[r.key] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["parseJson"])(r.value);
    return out;
}
async function importDb(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("Invalid database payload");
    }
    const db = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
    db.transaction(()=>{
        // Wipe all tables (keep _meta)
        db.run(`DELETE FROM settings`);
        db.run(`DELETE FROM providerConnections`);
        db.run(`DELETE FROM providerNodes`);
        db.run(`DELETE FROM proxyPools`);
        db.run(`DELETE FROM apiKeys`);
        db.run(`DELETE FROM combos`);
        db.run(`DELETE FROM kv WHERE scope IN ('modelAliases', 'customModels', 'mitmAlias', 'pricing')`);
        // Settings
        if (payload.settings) {
            db.run(`INSERT INTO settings(id, data) VALUES(1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`, [
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(payload.settings)
            ]);
        }
        for (const c of payload.providerConnections || []){
            const { id, provider, authType, name, email, priority, isActive, createdAt, updatedAt, ...rest } = c;
            db.run(`INSERT OR REPLACE INTO providerConnections(id, provider, authType, name, email, priority, isActive, data, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                id,
                provider,
                authType || "oauth",
                name || null,
                email || null,
                priority || null,
                isActive === false ? 0 : 1,
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(rest),
                createdAt || new Date().toISOString(),
                updatedAt || new Date().toISOString()
            ]);
        }
        for (const n of payload.providerNodes || []){
            const { id, type, name, createdAt, updatedAt, ...rest } = n;
            db.run(`INSERT OR REPLACE INTO providerNodes(id, type, name, data, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?)`, [
                id,
                type || null,
                name || null,
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(rest),
                createdAt || new Date().toISOString(),
                updatedAt || new Date().toISOString()
            ]);
        }
        for (const p of payload.proxyPools || []){
            const { id, isActive, testStatus, createdAt, updatedAt, ...rest } = p;
            db.run(`INSERT OR REPLACE INTO proxyPools(id, isActive, testStatus, data, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?)`, [
                id,
                isActive === false ? 0 : 1,
                testStatus || "unknown",
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(rest),
                createdAt || new Date().toISOString(),
                updatedAt || new Date().toISOString()
            ]);
        }
        for (const k of payload.apiKeys || []){
            db.run(`INSERT OR REPLACE INTO apiKeys(id, key, name, machineId, isActive, createdAt) VALUES(?, ?, ?, ?, ?, ?)`, [
                k.id,
                k.key,
                k.name || null,
                k.machineId || null,
                k.isActive === false ? 0 : 1,
                k.createdAt || new Date().toISOString()
            ]);
        }
        for (const c of payload.combos || []){
            db.run(`INSERT OR REPLACE INTO combos(id, name, kind, models, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?)`, [
                c.id,
                c.name,
                c.kind || null,
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(c.models || []),
                c.createdAt || new Date().toISOString(),
                c.updatedAt || new Date().toISOString()
            ]);
        }
        for (const [a, m] of Object.entries(payload.modelAliases || {})){
            db.run(`INSERT OR REPLACE INTO kv(scope, key, value) VALUES('modelAliases', ?, ?)`, [
                a,
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(m)
            ]);
        }
        for (const m of payload.customModels || []){
            const k = `${m.providerAlias}|${m.id}|${m.type || "llm"}`;
            db.run(`INSERT OR REPLACE INTO kv(scope, key, value) VALUES('customModels', ?, ?)`, [
                k,
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(m)
            ]);
        }
        for (const [tool, mappings] of Object.entries(payload.mitmAlias || {})){
            db.run(`INSERT OR REPLACE INTO kv(scope, key, value) VALUES('mitmAlias', ?, ?)`, [
                tool,
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(mappings || {})
            ]);
        }
        for (const [provider, models] of Object.entries(payload.pricing || {})){
            db.run(`INSERT OR REPLACE INTO kv(scope, key, value) VALUES('pricing', ?, ?)`, [
                provider,
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(models || {})
            ]);
        }
    });
    return await exportDb();
}
async function initDb() {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$driver$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAdapter"])();
}
}),
"[project]/src/lib/localDb.js [middleware] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
// Shim → re-export from new SQLite-based DB layer (src/lib/db/)
// Kept for backward compatibility with existing imports.
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/lib/db/index.js [middleware] (ecmascript) <locals>");
;
}),
"[externals]/child_process [external] (child_process, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("child_process", () => require("child_process"));

module.exports = mod;
}),
"[project]/src/shared/utils/machineId.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getConsistentMachineId",
    ()=>getConsistentMachineId,
    "getRawMachineId",
    ()=>getRawMachineId,
    "isBrowser",
    ()=>isBrowser
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$node$2d$machine$2d$id$2f$dist$2f$index$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/node-machine-id/dist/index.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:fs [external] (node:fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:path [external] (node:path, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:crypto [external] (node:crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$dataDir$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/dataDir.js [middleware] (ecmascript)");
;
;
;
;
;
const MACHINE_ID_FILE = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$dataDir$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["DATA_DIR"], 'machine-id');
const AUTH_DIR = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$dataDir$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["DATA_DIR"], 'auth');
const CLI_SECRET_FILE = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(AUTH_DIR, 'cli-secret');
const CLI_AUTH_SALT = '9r-cli-auth';
let cachedRawId = null;
let cachedCliSecret = null;
// Persist raw machine ID to file → guarantees CLI/server/middleware see same value
// even when machineIdSync fails or returns inconsistent values across runtimes.
function loadRawMachineId() {
    if (cachedRawId) return cachedRawId;
    try {
        cachedRawId = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].readFileSync(MACHINE_ID_FILE, 'utf8').trim();
        if (cachedRawId) return cachedRawId;
    } catch  {}
    try {
        cachedRawId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$node$2d$machine$2d$id$2f$dist$2f$index$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["machineIdSync"])();
    } catch  {
        cachedRawId = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["default"].randomUUID();
    }
    try {
        __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].mkdirSync(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$dataDir$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["DATA_DIR"], {
            recursive: true
        });
        __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].writeFileSync(MACHINE_ID_FILE, cachedRawId, {
            mode: 0o600
        });
    } catch  {}
    return cachedRawId;
}
// Random secret persisted on first run → unpredictable CLI token even when machineId leaks.
function loadCliSecret() {
    if (cachedCliSecret) return cachedCliSecret;
    try {
        cachedCliSecret = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].readFileSync(CLI_SECRET_FILE, 'utf8').trim();
        if (cachedCliSecret) return cachedCliSecret;
    } catch  {}
    cachedCliSecret = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["default"].randomBytes(32).toString('hex');
    try {
        __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].mkdirSync(AUTH_DIR, {
            recursive: true
        });
        __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].writeFileSync(CLI_SECRET_FILE, cachedCliSecret, {
            mode: 0o600
        });
    } catch  {}
    return cachedCliSecret;
}
async function getConsistentMachineId(salt = null) {
    const saltValue = salt || process.env.MACHINE_ID_SALT || 'endpoint-proxy-salt';
    const raw = loadRawMachineId();
    const extra = saltValue === CLI_AUTH_SALT ? loadCliSecret() : '';
    return __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["default"].createHash('sha256').update(raw + saltValue + extra).digest('hex').substring(0, 16);
}
async function getRawMachineId() {
    return loadRawMachineId();
}
function isBrowser() {
    return ("TURBOPACK compile-time value", "undefined") !== 'undefined';
}
}),
"[project]/src/lib/auth/dashboardSession.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "clearDashboardAuthCookie",
    ()=>clearDashboardAuthCookie,
    "createDashboardAuthToken",
    ()=>createDashboardAuthToken,
    "getDashboardAuthSession",
    ()=>getDashboardAuthSession,
    "setDashboardAuthCookie",
    ()=>setDashboardAuthCookie,
    "shouldUseSecureCookie",
    ()=>shouldUseSecureCookie,
    "verifyDashboardAuthToken",
    ()=>verifyDashboardAuthToken,
    "verifyDashboardPassword",
    ()=>verifyDashboardPassword
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$webapi$2f$jwt$2f$sign$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jose/dist/webapi/jwt/sign.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$webapi$2f$jwt$2f$verify$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jose/dist/webapi/jwt/verify.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/bcryptjs/index.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:fs [external] (node:fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:path [external] (node:path, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:crypto [external] (node:crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$dataDir$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/dataDir.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$localDb$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/lib/localDb.js [middleware] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$repos$2f$settingsRepo$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/repos/settingsRepo.js [middleware] (ecmascript)");
;
;
;
;
;
;
;
const DEFAULT_PASSWORD = "123456";
function loadJwtSecret() {
    if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
    const file = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$dataDir$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["DATA_DIR"], "jwt-secret");
    try {
        return __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].readFileSync(file, "utf8").trim();
    } catch  {}
    __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].mkdirSync(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$dataDir$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["DATA_DIR"], {
        recursive: true
    });
    const generated = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["default"].randomBytes(32).toString("hex");
    __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].writeFileSync(file, generated, {
        mode: 0o600
    });
    return generated;
}
const SECRET = new TextEncoder().encode(loadJwtSecret());
function shouldUseSecureCookie(request) {
    const forceSecureCookie = process.env.AUTH_COOKIE_SECURE === "true";
    const forwardedProto = request?.headers?.get?.("x-forwarded-proto");
    const isHttpsRequest = forwardedProto === "https";
    return forceSecureCookie || isHttpsRequest;
}
async function createDashboardAuthToken(claims = {}) {
    return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$webapi$2f$jwt$2f$sign$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["SignJWT"]({
        authenticated: true,
        ...claims
    }).setProtectedHeader({
        alg: "HS256"
    }).setIssuedAt().setExpirationTime("24h").sign(SECRET);
}
async function verifyDashboardAuthToken(token) {
    if (!token) return false;
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$webapi$2f$jwt$2f$verify$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["jwtVerify"])(token, SECRET);
        return true;
    } catch  {
        return false;
    }
}
async function getDashboardAuthSession(token) {
    if (!token) return null;
    try {
        const { payload } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$webapi$2f$jwt$2f$verify$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["jwtVerify"])(token, SECRET);
        return payload;
    } catch  {
        return null;
    }
}
async function setDashboardAuthCookie(cookieStore, request, claims = {}) {
    const token = await createDashboardAuthToken(claims);
    cookieStore.set("auth_token", token, {
        httpOnly: true,
        secure: shouldUseSecureCookie(request),
        sameSite: "lax",
        path: "/"
    });
}
function clearDashboardAuthCookie(cookieStore) {
    cookieStore.delete("auth_token");
}
async function verifyDashboardPassword(password) {
    if (typeof password !== "string" || !password) return false;
    const settings = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$repos$2f$settingsRepo$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getSettings"])();
    const storedHash = settings?.password;
    if (storedHash) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["default"].compare(password, storedHash);
    const initialPassword = process.env.INITIAL_PASSWORD || DEFAULT_PASSWORD;
    return password === initialPassword;
}
}),
"[project]/src/dashboardGuard.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__test__",
    ()=>__test__,
    "isLocalRequest",
    ()=>isLocalRequest,
    "proxy",
    ()=>proxy
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$localDb$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/lib/localDb.js [middleware] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$repos$2f$settingsRepo$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/repos/settingsRepo.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$repos$2f$apiKeysRepo$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/repos/apiKeysRepo.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$utils$2f$machineId$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/utils/machineId.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$dashboardSession$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth/dashboardSession.js [middleware] (ecmascript)");
;
;
;
;
const CLI_TOKEN_HEADER = "x-9r-cli-token";
const CLI_TOKEN_SALT = "9r-cli-auth";
let cachedCliToken = null;
async function getCliToken() {
    if (!cachedCliToken) cachedCliToken = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$utils$2f$machineId$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getConsistentMachineId"])(CLI_TOKEN_SALT);
    return cachedCliToken;
}
async function hasValidCliToken(request) {
    const token = request.headers.get(CLI_TOKEN_HEADER);
    if (!token) return false;
    return token === await getCliToken();
}
// Public API paths — no auth required (LLM API has its own key auth inside handler).
const PUBLIC_API_PATHS = [
    "/api/health",
    "/api/init",
    "/api/locale",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/status",
    "/api/auth/oidc",
    "/api/version",
    "/api/settings/require-login"
];
// Public top-level prefixes (LLM API endpoints with their own API key auth).
const PUBLIC_PREFIXES = [
    "/v1",
    "/v1beta",
    "/api/v1",
    "/api/v1beta",
    "/codex"
];
// Always require JWT token regardless of requireLogin setting
const ALWAYS_PROTECTED = [
    "/api/shutdown",
    "/api/settings/database",
    "/api/version/shutdown",
    "/api/version/update",
    "/api/oauth/cursor/auto-import",
    "/api/oauth/kiro/auto-import"
];
// Require auth, but allow through if requireLogin is disabled
const PROTECTED_API_PATHS = [
    "/api/settings",
    "/api/keys",
    "/api/providers",
    "/api/provider-nodes",
    "/api/proxy-pools",
    "/api/combos",
    "/api/models",
    "/api/usage",
    "/api/oauth",
    "/api/cloud",
    "/api/media-providers",
    "/api/pricing",
    "/api/tags",
    "/api/cli-tools",
    "/api/mcp",
    "/api/translator",
    "/api/tunnel"
];
// Routes that spawn child processes or read host secrets — restrict to localhost.
const LOCAL_ONLY_PATHS = [
    "/api/cli-tools/cowork-settings",
    "/api/cli-tools/antigravity-mitm",
    "/api/mcp/",
    "/api/tunnel/tailscale-install",
    "/api/tunnel/tailscale-enable",
    "/api/tunnel/tailscale-disable",
    "/api/tunnel/tailscale-check",
    "/api/tunnel/enable",
    "/api/tunnel/disable",
    "/api/oauth/cursor/auto-import",
    "/api/oauth/kiro/auto-import",
    "/api/auth/reset-password",
    "/api/headroom/start",
    "/api/headroom/stop",
    "/api/headroom/proxy"
];
const LOOPBACK_HOSTS = new Set([
    "localhost",
    "127.0.0.1",
    "::1"
]);
function isLoopbackHostname(h) {
    if (!h) return false;
    const name = h.split(":")[0].replace(/^\[|\]$/g, "").toLowerCase();
    return LOOPBACK_HOSTS.has(name);
}
function isLocalRequest(request) {
    // Stamped by custom-server.js when forwarding headers exist: request came through
    // a reverse proxy, so the loopback socket is the proxy hop, not the end-user.
    if (request.headers.get("x-9r-via-proxy")) return false;
    // Trusted peer IP from TCP socket (custom-server.js); unspoofable. Primary anchor for "local".
    const realIp = request.headers.get("x-9r-real-ip");
    if (realIp) {
        if (!isLoopbackHostname(realIp)) return false;
    } else if (!isLoopbackHostname(request.headers.get("host"))) {
        // Fallback for bare server.js (dev) without custom-server: legacy Host-based check.
        return false;
    }
    const origin = request.headers.get("origin");
    if (origin) {
        try {
            if (!isLoopbackHostname(new URL(origin).hostname)) return false;
        } catch  {
            return false;
        }
    }
    return true;
}
function isPublicLlmApi(pathname) {
    return PUBLIC_PREFIXES.some((p)=>pathname === p || pathname.startsWith(`${p}/`));
}
function extractApiKey(request) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
    const apiKeyHeader = request.headers.get("x-api-key");
    if (apiKeyHeader) return apiKeyHeader;
    const googleApiKeyHeader = request.headers.get("x-goog-api-key");
    if (googleApiKeyHeader) return googleApiKeyHeader;
    return request.nextUrl.searchParams?.get("key") || null;
}
async function hasValidApiKey(request) {
    const apiKey = extractApiKey(request);
    if (!apiKey) return false;
    return await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$repos$2f$apiKeysRepo$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["validateApiKey"])(apiKey);
}
async function canAccessPublicLlmApi(request) {
    if (isLocalRequest(request)) return true;
    if (await hasValidCliToken(request)) return true;
    return await hasValidApiKey(request);
}
async function canAccessLocalOnlyRoute(request) {
    if (await hasValidCliToken(request)) return true;
    // Browser on host: loopback Host + Origin (blocks tunnel/CSRF) + auth (JWT or requireLogin=false)
    if (isLocalRequest(request) && await isAuthenticated(request)) return true;
    return false;
}
async function hasValidToken(request) {
    const token = request.cookies.get("auth_token")?.value;
    return await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$dashboardSession$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["verifyDashboardAuthToken"])(token);
}
// Read settings directly from DB to avoid self-fetch deadlock in proxy
async function loadSettings() {
    try {
        return await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$repos$2f$settingsRepo$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getSettings"])();
    } catch  {
        return null;
    }
}
async function isAuthenticated(request) {
    if (await hasValidToken(request)) return true;
    const settings = await loadSettings();
    if (settings && settings.requireLogin === false) return true;
    return false;
}
function isPublicApi(pathname) {
    if (isPublicLlmApi(pathname)) return true;
    return PUBLIC_API_PATHS.some((p)=>pathname === p || pathname.startsWith(`${p}/`));
}
const __test__ = {
    isLocalRequest,
    isPublicLlmApi,
    extractApiKey,
    canAccessPublicLlmApi,
    canAccessLocalOnlyRoute
};
async function proxy(request) {
    const { pathname } = request.nextUrl;
    // Local-only gate for spawn-capable / host-secret routes.
    if (LOCAL_ONLY_PATHS.some((p)=>pathname.startsWith(p))) {
        if (!await canAccessLocalOnlyRoute(request)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Local only: CLI token required"
            }, {
                status: 403
            });
        }
    }
    // Always protected - require valid JWT or local CLI token (machineId-based)
    if (ALWAYS_PROTECTED.some((p)=>pathname.startsWith(p))) {
        if (await hasValidCliToken(request) || await hasValidToken(request)) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].next();
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Unauthorized"
        }, {
            status: 401
        });
    }
    if (isPublicLlmApi(pathname)) {
        if (await canAccessPublicLlmApi(request)) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].next();
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "API key required for remote API access"
        }, {
            status: 401
        });
    }
    // Deny-by-default for /api/* — public allow-list bypasses, everything else requires auth.
    if (pathname.startsWith("/api/")) {
        if (isPublicApi(pathname)) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].next();
        if (await hasValidCliToken(request) || await isAuthenticated(request)) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].next();
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Unauthorized"
        }, {
            status: 401
        });
    }
    // Protect all dashboard routes
    if (pathname.startsWith("/dashboard")) {
        let requireLogin = true;
        let tunnelDashboardAccess = true;
        try {
            const settings = await loadSettings();
            if (settings) {
                requireLogin = settings.requireLogin !== false;
                tunnelDashboardAccess = settings.tunnelDashboardAccess === true;
                // Block tunnel/tailscale access if disabled (redirect to login)
                if (!tunnelDashboardAccess) {
                    const host = (request.headers.get("host") || "").split(":")[0].toLowerCase();
                    const tunnelHost = settings.tunnelUrl ? new URL(settings.tunnelUrl).hostname.toLowerCase() : "";
                    const tailscaleHost = settings.tailscaleUrl ? new URL(settings.tailscaleUrl).hostname.toLowerCase() : "";
                    if (tunnelHost && host === tunnelHost || tailscaleHost && host === tailscaleHost) {
                        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/login", request.url));
                    }
                }
            }
        } catch  {
        // On error, keep defaults (require login, block tunnel)
        }
        // If login not required, allow through
        if (!requireLogin) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].next();
        // Verify JWT token
        const token = request.cookies.get("auth_token")?.value;
        if (token) {
            if (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$dashboardSession$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["verifyDashboardAuthToken"])(token)) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].next();
            } else {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/login", request.url));
            }
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/login", request.url));
    }
    // Redirect / to /dashboard if logged in, or /dashboard if it's the root
    if (pathname === "/") {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/dashboard", request.url));
    }
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].next();
}
}),
"[project]/src/proxy.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "default",
    ()=>proxy
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$dashboardGuard$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/dashboardGuard.js [middleware] (ecmascript)");
;
async function proxy(request) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$dashboardGuard$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["proxy"])(request);
}
const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon\\.ico).*)"
    ]
};
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__1c1l8l2._.js.map