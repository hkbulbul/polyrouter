module.exports = [
"[project]/src/lib/db/schema.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// ⚠️ AGENT/DEV: Bump this by +1 EVERY TIME you change the schema below
// (add/remove/alter a table, column, or index in TABLES). It drives the
// pre-change safety backup in migrate.js: when the stored version is lower,
// one lightweight DB backup is taken before applying schema changes. Forgetting
// to bump only skips that backup — it does NOT break the additive auto-sync.
__turbopack_context__.s([
    "PRAGMA_SQL",
    ()=>PRAGMA_SQL,
    "SCHEMA_VERSION",
    ()=>SCHEMA_VERSION,
    "TABLES",
    ()=>TABLES,
    "buildCreateTableSql",
    ()=>buildCreateTableSql
]);
const SCHEMA_VERSION = 1;
const PRAGMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA temp_store = MEMORY;
PRAGMA mmap_size = 30000000;
PRAGMA cache_size = -64000;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
`;
const TABLES = {
    _meta: {
        columns: {
            key: "TEXT PRIMARY KEY",
            value: "TEXT NOT NULL"
        }
    },
    settings: {
        columns: {
            id: "INTEGER PRIMARY KEY CHECK (id = 1)",
            data: "TEXT NOT NULL"
        }
    },
    providerConnections: {
        columns: {
            id: "TEXT PRIMARY KEY",
            provider: "TEXT NOT NULL",
            authType: "TEXT NOT NULL",
            name: "TEXT",
            email: "TEXT",
            priority: "INTEGER",
            isActive: "INTEGER DEFAULT 1",
            data: "TEXT NOT NULL",
            createdAt: "TEXT NOT NULL",
            updatedAt: "TEXT NOT NULL"
        },
        indexes: [
            "CREATE INDEX IF NOT EXISTS idx_pc_provider ON providerConnections(provider)",
            "CREATE INDEX IF NOT EXISTS idx_pc_provider_active ON providerConnections(provider, isActive)",
            "CREATE INDEX IF NOT EXISTS idx_pc_priority ON providerConnections(provider, priority)"
        ]
    },
    providerNodes: {
        columns: {
            id: "TEXT PRIMARY KEY",
            type: "TEXT",
            name: "TEXT",
            data: "TEXT NOT NULL",
            createdAt: "TEXT NOT NULL",
            updatedAt: "TEXT NOT NULL"
        },
        indexes: [
            "CREATE INDEX IF NOT EXISTS idx_pn_type ON providerNodes(type)"
        ]
    },
    proxyPools: {
        columns: {
            id: "TEXT PRIMARY KEY",
            isActive: "INTEGER DEFAULT 1",
            testStatus: "TEXT",
            data: "TEXT NOT NULL",
            createdAt: "TEXT NOT NULL",
            updatedAt: "TEXT NOT NULL"
        },
        indexes: [
            "CREATE INDEX IF NOT EXISTS idx_pp_active ON proxyPools(isActive)",
            "CREATE INDEX IF NOT EXISTS idx_pp_status ON proxyPools(testStatus)"
        ]
    },
    apiKeys: {
        columns: {
            id: "TEXT PRIMARY KEY",
            key: "TEXT UNIQUE NOT NULL",
            name: "TEXT",
            machineId: "TEXT",
            isActive: "INTEGER DEFAULT 1",
            createdAt: "TEXT NOT NULL"
        },
        indexes: [
            "CREATE INDEX IF NOT EXISTS idx_ak_key ON apiKeys(key)"
        ]
    },
    combos: {
        columns: {
            id: "TEXT PRIMARY KEY",
            name: "TEXT UNIQUE NOT NULL",
            kind: "TEXT",
            models: "TEXT NOT NULL",
            createdAt: "TEXT NOT NULL",
            updatedAt: "TEXT NOT NULL"
        },
        indexes: [
            "CREATE INDEX IF NOT EXISTS idx_combo_name ON combos(name)"
        ]
    },
    kv: {
        columns: {
            scope: "TEXT NOT NULL",
            key: "TEXT NOT NULL",
            value: "TEXT NOT NULL"
        },
        primaryKey: "PRIMARY KEY (scope, key)",
        indexes: [
            "CREATE INDEX IF NOT EXISTS idx_kv_scope ON kv(scope)"
        ]
    },
    usageHistory: {
        columns: {
            id: "INTEGER PRIMARY KEY AUTOINCREMENT",
            timestamp: "TEXT NOT NULL",
            provider: "TEXT",
            model: "TEXT",
            connectionId: "TEXT",
            apiKey: "TEXT",
            endpoint: "TEXT",
            promptTokens: "INTEGER DEFAULT 0",
            completionTokens: "INTEGER DEFAULT 0",
            cost: "REAL DEFAULT 0",
            status: "TEXT",
            tokens: "TEXT",
            meta: "TEXT"
        },
        indexes: [
            "CREATE INDEX IF NOT EXISTS idx_uh_ts ON usageHistory(timestamp DESC)",
            "CREATE INDEX IF NOT EXISTS idx_uh_provider ON usageHistory(provider)",
            "CREATE INDEX IF NOT EXISTS idx_uh_model ON usageHistory(model)",
            "CREATE INDEX IF NOT EXISTS idx_uh_conn ON usageHistory(connectionId)"
        ]
    },
    usageDaily: {
        columns: {
            dateKey: "TEXT PRIMARY KEY",
            data: "TEXT NOT NULL"
        }
    },
    requestDetails: {
        columns: {
            id: "TEXT PRIMARY KEY",
            timestamp: "TEXT NOT NULL",
            provider: "TEXT",
            model: "TEXT",
            connectionId: "TEXT",
            status: "TEXT",
            data: "TEXT NOT NULL"
        },
        indexes: [
            "CREATE INDEX IF NOT EXISTS idx_rd_ts ON requestDetails(timestamp DESC)",
            "CREATE INDEX IF NOT EXISTS idx_rd_provider ON requestDetails(provider)",
            "CREATE INDEX IF NOT EXISTS idx_rd_model ON requestDetails(model)",
            "CREATE INDEX IF NOT EXISTS idx_rd_conn ON requestDetails(connectionId)"
        ]
    }
};
function buildCreateTableSql(name, def) {
    const cols = Object.entries(def.columns).map(([k, v])=>`${k} ${v}`);
    if (def.primaryKey) cols.push(def.primaryKey);
    return `CREATE TABLE IF NOT EXISTS ${name} (${cols.join(", ")})`;
}
}),
"[project]/src/lib/db/migrations/001-initial.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
// Initial schema bootstrap. For fresh DB this creates all tables/indexes.
// For existing DB at version 0 (legacy unstamped), it's idempotent (IF NOT EXISTS).
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$schema$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/schema.js [middleware] (ecmascript)");
;
const __TURBOPACK__default__export__ = {
    version: 1,
    name: "initial",
    up (db) {
        for (const [name, def] of Object.entries(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$schema$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["TABLES"])){
            db.exec((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$schema$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["buildCreateTableSql"])(name, def));
            for (const idx of def.indexes || [])db.exec(idx);
        }
    }
};
}),
"[project]/src/lib/db/migrations/index.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MIGRATIONS",
    ()=>MIGRATIONS,
    "latestVersion",
    ()=>latestVersion
]);
// Migration registry — append new entries when schema changes.
// Each migration: { version: number, name: string, up(db): void }
// Versions MUST be unique and monotonically increasing.
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$migrations$2f$001$2d$initial$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/migrations/001-initial.js [middleware] (ecmascript)");
;
const MIGRATIONS = [
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$migrations$2f$001$2d$initial$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["default"]
].sort((a, b)=>a.version - b.version);
function latestVersion() {
    return MIGRATIONS.length ? MIGRATIONS[MIGRATIONS.length - 1].version : 0;
}
}),
"[project]/src/lib/db/version.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getAppVersion",
    ()=>getAppVersion,
    "timestampSlug",
    ()=>timestampSlug
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:fs [external] (node:fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:path [external] (node:path, cjs)");
;
;
let cachedVersion = null;
function getAppVersion() {
    if (cachedVersion) return cachedVersion;
    try {
        const pkgPath = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(process.cwd(), "package.json");
        const pkg = JSON.parse(__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].readFileSync(pkgPath, "utf-8"));
        cachedVersion = pkg.version || "0.0.0";
    } catch  {
        cachedVersion = "0.0.0";
    }
    return cachedVersion;
}
function timestampSlug(date = new Date()) {
    const pad = (n)=>String(n).padStart(2, "0");
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}
}),
"[project]/src/lib/db/backup.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "backupDbLite",
    ()=>backupDbLite,
    "backupFile",
    ()=>backupFile,
    "makeBackupDir",
    ()=>makeBackupDir,
    "pruneOldBackups",
    ()=>pruneOldBackups
]);
// DB safety backups — taken ONLY before a schema change (see migrate.js).
//
// ⚠️ AGENT/DEV NOTES:
// - Backups are a best-effort safety net before schema migrations. There is NO
//   automated restore path; recovery is manual (copy a backup file back).
// - Backups intentionally EXCLUDE the `requestDetails` table (observability log,
//   auto-pruned, non-critical) so a multi-hundred-MB DB backs up as a few MB.
// - Only the newest KEEP_BACKUPS are kept; older ones are pruned automatically.
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:fs [external] (node:fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:path [external] (node:path, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$paths$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/paths.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$version$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/version.js [middleware] (ecmascript)");
;
;
;
;
const KEEP_BACKUPS = 3;
// Tables excluded from safety backups (large, non-critical, reproducible).
const BACKUP_EXCLUDE_TABLES = [
    "requestDetails"
];
function makeBackupDir(label) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$paths$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["ensureDirs"])();
    const ver = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$version$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAppVersion"])();
    const slug = `${label}-${ver}-${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$version$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["timestampSlug"])()}`;
    const dir = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$paths$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["BACKUPS_DIR"], slug);
    __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].mkdirSync(dir, {
        recursive: true
    });
    return dir;
}
function backupFile(srcPath, destDir, destName = null) {
    if (!__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].existsSync(srcPath)) return null;
    const name = destName || __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].basename(srcPath);
    const dest = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(destDir, name);
    __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].copyFileSync(srcPath, dest);
    return dest;
}
function backupDbLite(adapter, destDir, destName = "data.sqlite") {
    const dest = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(destDir, destName);
    try {
        __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].rmSync(dest, {
            force: true
        });
    } catch  {}
    const escaped = dest.replace(/'/g, "''");
    adapter.exec(`ATTACH DATABASE '${escaped}' AS bak`);
    try {
        const excluded = new Set(BACKUP_EXCLUDE_TABLES);
        const tables = adapter.all(`SELECT name, sql FROM main.sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`).filter((t)=>!excluded.has(t.name));
        adapter.transaction(()=>{
            for (const t of tables){
                // Recreate table structure in backup DB, then copy rows.
                const createSql = t.sql.replace(/CREATE TABLE\s+/i, "CREATE TABLE bak.");
                adapter.exec(createSql);
                adapter.exec(`INSERT INTO bak.${t.name} SELECT * FROM main.${t.name}`);
            }
        });
    } finally{
        try {
            adapter.exec("DETACH DATABASE bak");
        } catch  {}
    }
    return dest;
}
function pruneOldBackups() {
    if (!__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].existsSync(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$paths$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["BACKUPS_DIR"])) return;
    const entries = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].readdirSync(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$paths$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["BACKUPS_DIR"], {
        withFileTypes: true
    }).filter((e)=>e.isDirectory()).map((e)=>({
            name: e.name,
            full: __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$paths$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["BACKUPS_DIR"], e.name),
            mtime: __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].statSync(__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$paths$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["BACKUPS_DIR"], e.name)).mtimeMs
        })).sort((a, b)=>b.mtime - a.mtime);
    for (const old of entries.slice(KEEP_BACKUPS)){
        try {
            __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].rmSync(old.full, {
                recursive: true,
                force: true
            });
        } catch  {}
    }
}
}),
"[project]/src/lib/db/migrate.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MigrationAborted",
    ()=>MigrationAborted,
    "runMigrationOnce",
    ()=>runMigrationOnce
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:fs [external] (node:fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:path [external] (node:path, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$paths$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/paths.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$schema$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/schema.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$migrations$2f$index$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/migrations/index.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$metaStore$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/helpers/metaStore.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$backup$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/backup.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$version$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/version.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/helpers/jsonCol.js [middleware] (ecmascript)");
;
;
;
;
;
;
;
;
;
// Marker file: prevents re-importing legacy JSON when user wipes data.sqlite.
const MIGRATED_MARKER = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$paths$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["DB_DIR"], ".migrated-from-json");
// Track per-adapter so reusing same adapter skips re-run, but new adapter (after reset) re-runs.
const _migratedAdapters = new WeakSet();
class MigrationAborted extends Error {
    constructor(message, droppedRows){
        super(message);
        this.name = "MigrationAborted";
        this.droppedRows = droppedRows;
    }
}
// Insert rows one-by-one, collect failures, then assert COUNT(*) matches input length.
function importWithAssertion(adapter, tableName, rows, insertFn, rowMeta) {
    const dropped = [];
    for (const row of rows){
        try {
            insertFn(row);
        } catch (err) {
            dropped.push({
                ...rowMeta(row),
                reason: err.message
            });
        }
    }
    const inserted = adapter.get(`SELECT COUNT(*) as c FROM ${tableName}`)?.c ?? 0;
    if (inserted !== rows.length) {
        console.warn(`[DB][migrate] ${tableName} row-count mismatch: expected ${rows.length}, got ${inserted}. Dropped:`, dropped);
        throw new MigrationAborted(`${tableName} row-count mismatch: expected ${rows.length}, got ${inserted}`, dropped);
    }
}
function readJsonSafe(file) {
    if (!__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].existsSync(file)) return null;
    try {
        return JSON.parse(__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].readFileSync(file, "utf-8"));
    } catch  {
        return null;
    }
}
function isFreshDb(adapter) {
    // Table _meta may not exist yet on truly fresh DB
    try {
        const row = adapter.get(`SELECT COUNT(*) as c FROM _meta`);
        return !row || row.c === 0;
    } catch  {
        return true;
    }
}
// ─── Versioned migrations runner (skip-version safe) ─────────────────────
function runVersionedMigrations(adapter) {
    // Bootstrap _meta first so we can read schemaVersion
    adapter.exec((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$schema$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["buildCreateTableSql"])("_meta", __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$schema$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["TABLES"]._meta));
    const current = parseInt((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$metaStore$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getMetaSync"])(adapter, "schemaVersion", "0"), 10) || 0;
    const target = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$migrations$2f$index$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["latestVersion"])();
    if (current >= target) return {
        applied: 0,
        from: current,
        to: current
    };
    const pending = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$migrations$2f$index$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["MIGRATIONS"].filter((m)=>m.version > current);
    let lastApplied = current;
    for (const m of pending){
        adapter.transaction(()=>{
            m.up(adapter);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$metaStore$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["setMetaSync"])(adapter, "schemaVersion", m.version);
        });
        lastApplied = m.version;
        console.log(`[DB][migrate] applied #${m.version} ${m.name}`);
    }
    return {
        applied: pending.length,
        from: current,
        to: lastApplied
    };
}
// ─── Auto-sync (additive only): add missing tables/columns/indexes ───────
function syncSchemaFromTables(adapter) {
    for (const [tableName, def] of Object.entries(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$schema$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["TABLES"])){
        // Create table if absent
        adapter.exec((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$schema$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["buildCreateTableSql"])(tableName, def));
        // Diff columns
        const existing = adapter.all(`PRAGMA table_info(${tableName})`);
        const existingNames = new Set(existing.map((r)=>r.name));
        for (const [colName, colDef] of Object.entries(def.columns)){
            if (!existingNames.has(colName)) {
                // SQLite ADD COLUMN restrictions: no PRIMARY KEY / UNIQUE w/o NULL ok.
                // We strip PRIMARY KEY / UNIQUE since those are only valid at create time.
                const safeDef = colDef.replace(/PRIMARY KEY( AUTOINCREMENT)?/i, "").replace(/UNIQUE/i, "").trim();
                try {
                    adapter.exec(`ALTER TABLE ${tableName} ADD COLUMN ${colName} ${safeDef}`);
                    console.log(`[DB][sync] +column ${tableName}.${colName}`);
                } catch (e) {
                    console.warn(`[DB][sync] add column ${tableName}.${colName} failed: ${e.message}`);
                }
            }
        }
        // Indexes (idempotent)
        for (const idx of def.indexes || []){
            try {
                adapter.exec(idx);
            } catch  {}
        }
    }
}
// ─── Legacy JSON import (one-time) ───────────────────────────────────────
function importLegacyMain(adapter, data) {
    if (!data || typeof data !== "object") return;
    if (data.settings) {
        adapter.run(`INSERT INTO settings(id, data) VALUES(1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`, [
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(data.settings)
        ]);
    }
    importWithAssertion(adapter, "providerConnections", data.providerConnections || [], (c)=>{
        const { id, provider, authType, name, email, priority, isActive, createdAt, updatedAt, ...rest } = c;
        adapter.run(`INSERT OR REPLACE INTO providerConnections(id, provider, authType, name, email, priority, isActive, data, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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
    }, (c)=>({
            id: c.id ?? null,
            provider: c.provider ?? null,
            name: c.name ?? null
        }));
    importWithAssertion(adapter, "providerNodes", data.providerNodes || [], (n)=>{
        const { id, type, name, createdAt, updatedAt, ...rest } = n;
        adapter.run(`INSERT OR REPLACE INTO providerNodes(id, type, name, data, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?)`, [
            id,
            type || null,
            name || null,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(rest),
            createdAt || new Date().toISOString(),
            updatedAt || new Date().toISOString()
        ]);
    }, (n)=>({
            id: n.id ?? null,
            type: n.type ?? null,
            name: n.name ?? null
        }));
    importWithAssertion(adapter, "proxyPools", data.proxyPools || [], (p)=>{
        const { id, isActive, testStatus, createdAt, updatedAt, ...rest } = p;
        adapter.run(`INSERT OR REPLACE INTO proxyPools(id, isActive, testStatus, data, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?)`, [
            id,
            isActive === false ? 0 : 1,
            testStatus || "unknown",
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(rest),
            createdAt || new Date().toISOString(),
            updatedAt || new Date().toISOString()
        ]);
    }, (p)=>({
            id: p.id ?? null
        }));
    importWithAssertion(adapter, "apiKeys", data.apiKeys || [], (k)=>{
        adapter.run(`INSERT OR REPLACE INTO apiKeys(id, key, name, machineId, isActive, createdAt) VALUES(?, ?, ?, ?, ?, ?)`, [
            k.id,
            k.key,
            k.name || null,
            k.machineId || null,
            k.isActive === false ? 0 : 1,
            k.createdAt || new Date().toISOString()
        ]);
    }, (k)=>({
            id: k.id ?? null,
            name: k.name ?? null
        }));
    importWithAssertion(adapter, "combos", data.combos || [], (c)=>{
        adapter.run(`INSERT OR REPLACE INTO combos(id, name, kind, models, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?)`, [
            c.id,
            c.name,
            c.kind || null,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(c.models || []),
            c.createdAt || new Date().toISOString(),
            c.updatedAt || new Date().toISOString()
        ]);
    }, (c)=>({
            id: c.id ?? null,
            name: c.name ?? null
        }));
    for (const [alias, model] of Object.entries(data.modelAliases || {})){
        adapter.run(`INSERT OR REPLACE INTO kv(scope, key, value) VALUES('modelAliases', ?, ?)`, [
            alias,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(model)
        ]);
    }
    for (const m of data.customModels || []){
        const k = `${m.providerAlias}|${m.id}|${m.type || "llm"}`;
        adapter.run(`INSERT OR REPLACE INTO kv(scope, key, value) VALUES('customModels', ?, ?)`, [
            k,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(m)
        ]);
    }
    for (const [tool, mappings] of Object.entries(data.mitmAlias || {})){
        adapter.run(`INSERT OR REPLACE INTO kv(scope, key, value) VALUES('mitmAlias', ?, ?)`, [
            tool,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(mappings || {})
        ]);
    }
    for (const [provider, models] of Object.entries(data.pricing || {})){
        adapter.run(`INSERT OR REPLACE INTO kv(scope, key, value) VALUES('pricing', ?, ?)`, [
            provider,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(models || {})
        ]);
    }
}
function importLegacyUsage(adapter, data) {
    if (!data || typeof data !== "object") return;
    for (const e of data.history || []){
        const t = e.tokens || {};
        adapter.run(`INSERT INTO usageHistory(timestamp, provider, model, connectionId, apiKey, endpoint, promptTokens, completionTokens, cost, status, tokens, meta) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            e.timestamp || new Date().toISOString(),
            e.provider || null,
            e.model || null,
            e.connectionId || null,
            e.apiKey || null,
            e.endpoint || null,
            t.prompt_tokens || t.input_tokens || 0,
            t.completion_tokens || t.output_tokens || 0,
            e.cost || 0,
            e.status || "ok",
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(t),
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])({})
        ]);
    }
    for (const [dateKey, day] of Object.entries(data.dailySummary || {})){
        adapter.run(`INSERT OR REPLACE INTO usageDaily(dateKey, data) VALUES(?, ?)`, [
            dateKey,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(day)
        ]);
    }
    if (typeof data.totalRequestsLifetime === "number") {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$metaStore$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["setMetaSync"])(adapter, "totalRequestsLifetime", data.totalRequestsLifetime);
    }
}
function importLegacyDisabled(adapter, data) {
    if (!data || typeof data.disabled !== "object") return;
    for (const [provider, ids] of Object.entries(data.disabled)){
        adapter.run(`INSERT OR REPLACE INTO kv(scope, key, value) VALUES('disabledModels', ?, ?)`, [
            provider,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(ids || [])
        ]);
    }
}
function importLegacyDetails(adapter, data) {
    if (!data || !Array.isArray(data.records)) return;
    for (const r of data.records){
        adapter.run(`INSERT OR REPLACE INTO requestDetails(id, timestamp, provider, model, connectionId, status, data) VALUES(?, ?, ?, ?, ?, ?, ?)`, [
            r.id,
            r.timestamp || new Date().toISOString(),
            r.provider || null,
            r.model || null,
            r.connectionId || null,
            r.status || null,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$jsonCol$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["stringifyJson"])(r)
        ]);
    }
}
async function runMigrationOnce(adapter) {
    if (_migratedAdapters.has(adapter)) return;
    _migratedAdapters.add(adapter);
    // Capture freshness BEFORE migrations stamp _meta (otherwise we'd misclassify
    // a brand-new DB as non-fresh once schemaVersion is written).
    const fresh = isFreshDb(adapter);
    // Prune stale backups every boot so old oversized backups shrink to KEEP.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$backup$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["pruneOldBackups"])();
    // Bootstrap _meta so we can read the stored backup schema version below
    // (runVersionedMigrations also ensures this, but we need it earlier here).
    adapter.exec((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$schema$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["buildCreateTableSql"])("_meta", __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$schema$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["TABLES"]._meta));
    // Detect a pending schema change via the central SCHEMA_VERSION const.
    // A lightweight backup is taken BEFORE any schema mutation below.
    const storedSchemaVer = parseInt((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$metaStore$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getMetaSync"])(adapter, "backupSchemaVersion", "0"), 10) || 0;
    const schemaChanging = !fresh && storedSchemaVer < __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$schema$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["SCHEMA_VERSION"];
    if (schemaChanging) {
        try {
            const backupDir = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$backup$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["makeBackupDir"])(`schema-${storedSchemaVer}-to-${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$schema$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["SCHEMA_VERSION"]}`);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$backup$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["backupDbLite"])(adapter, backupDir);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$backup$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["pruneOldBackups"])();
            console.log(`[DB][migrate] pre-schema backup ${storedSchemaVer} → ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$schema$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["SCHEMA_VERSION"]}: ${backupDir}`);
        } catch (e) {
            console.warn(`[DB][migrate] pre-schema backup failed (continuing): ${e.message}`);
        }
    }
    // 1. Always run versioned migrations chain (skip-version safe)
    const migInfo = runVersionedMigrations(adapter);
    // 2. Additive sync (auto add missing columns/indexes declared in TABLES)
    syncSchemaFromTables(adapter);
    // Stamp the schema version we just reached so future boots skip re-backup.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$metaStore$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["setMetaSync"])(adapter, "backupSchemaVersion", __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$schema$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["SCHEMA_VERSION"]);
    // 3. One-time legacy JSON import (only if DB was fresh on entry)
    const alreadyImported = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].existsSync(MIGRATED_MARKER);
    const legacyMain = readJsonSafe(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$paths$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["LEGACY_FILES"].main);
    const legacyUsage = readJsonSafe(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$paths$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["LEGACY_FILES"].usage);
    const legacyDisabled = readJsonSafe(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$paths$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["LEGACY_FILES"].disabled);
    const legacyDetails = readJsonSafe(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$paths$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["LEGACY_FILES"].details);
    const hasLegacy = !!(legacyMain || legacyUsage || legacyDisabled || legacyDetails);
    if (fresh && hasLegacy && !alreadyImported) {
        const t0 = Date.now();
        const backupDir = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$backup$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["makeBackupDir"])("migrate-from-json");
        for (const f of Object.values(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$paths$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["LEGACY_FILES"]))(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$backup$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["backupFile"])(f, backupDir);
        try {
            adapter.transaction(()=>{
                importLegacyMain(adapter, legacyMain);
                importLegacyUsage(adapter, legacyUsage);
                importLegacyDisabled(adapter, legacyDisabled);
                importLegacyDetails(adapter, legacyDetails);
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$metaStore$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["setMetaSync"])(adapter, "appVersion", (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$version$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAppVersion"])());
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$metaStore$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["setMetaSync"])(adapter, "backupSchemaVersion", __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$schema$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["SCHEMA_VERSION"]);
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$metaStore$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["setMetaSync"])(adapter, "migratedAt", new Date().toISOString());
            });
        } catch (err) {
            if (err instanceof MigrationAborted) {
                console.error(`[DB][migrate] aborted: ${err.message} | legacy JSON kept | backup: ${backupDir}`);
                return;
            }
            throw err;
        }
        try {
            __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].writeFileSync(MIGRATED_MARKER, new Date().toISOString());
        } catch  {}
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$backup$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["pruneOldBackups"])();
        console.log(`[DB][migrate] JSON → SQLite in ${Date.now() - t0}ms | legacy JSON kept at DATA_DIR | backup: ${backupDir}`);
        return;
    }
    // Track app version for informational purposes only. App version bumps no
    // longer trigger a DB backup — only real schema changes (SCHEMA_VERSION) do.
    const newVer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$version$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getAppVersion"])();
    const oldVer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$metaStore$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["getMetaSync"])(adapter, "appVersion", null);
    if (oldVer !== newVer) (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$helpers$2f$metaStore$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["setMetaSync"])(adapter, "appVersion", newVer);
}
}),
];

//# sourceMappingURL=src_lib_db_1rccdn8._.js.map