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
"[project]/src/lib/db/adapters/sqljsAdapter.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createSqlJsAdapter",
    ()=>createSqlJsAdapter
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:fs [external] (node:fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$sql$2e$js__$5b$external$5d$__$28$sql$2e$js$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$sql$2e$js$29$__ = __turbopack_context__.i("[externals]/sql.js [external] (sql.js, cjs, [project]/node_modules/sql.js)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$schema$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/schema.js [middleware] (ecmascript)");
;
;
;
let SQL = null;
async function loadSql() {
    if (SQL) return SQL;
    SQL = await (0, __TURBOPACK__imported__module__$5b$externals$5d2f$sql$2e$js__$5b$external$5d$__$28$sql$2e$js$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$sql$2e$js$29$__["default"])();
    return SQL;
}
async function createSqlJsAdapter(filePath) {
    const SQLLib = await loadSql();
    const buf = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].existsSync(filePath) ? __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].readFileSync(filePath) : null;
    const db = new SQLLib.Database(buf);
    db.exec(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$schema$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["PRAGMA_SQL"]);
    // Schema is created/synced by migrate.js after adapter init
    let dirty = false;
    let saveTimer = null;
    const SAVE_DEBOUNCE_MS = 100;
    function persist() {
        const data = db.export();
        __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].writeFileSync(filePath, Buffer.from(data));
        dirty = false;
    }
    function scheduleSave() {
        dirty = true;
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(()=>{
            saveTimer = null;
            if (dirty) {
                try {
                    persist();
                } catch (e) {
                    console.error("[sqljs] save failed:", e);
                }
            }
        }, SAVE_DEBOUNCE_MS);
    }
    function paramsObj(params) {
        if (!params || Array.isArray(params) && params.length === 0) return undefined;
        return params;
    }
    function run(sql, params = []) {
        const stmt = db.prepare(sql);
        try {
            stmt.bind(paramsObj(params));
            stmt.step();
            const changes = db.getRowsModified();
            const lastInsertRowid = db.exec("SELECT last_insert_rowid() as id")[0]?.values?.[0]?.[0] ?? null;
            scheduleSave();
            return {
                changes,
                lastInsertRowid
            };
        } finally{
            stmt.free();
        }
    }
    function get(sql, params = []) {
        const stmt = db.prepare(sql);
        try {
            stmt.bind(paramsObj(params));
            if (stmt.step()) return stmt.getAsObject();
            return undefined;
        } finally{
            stmt.free();
        }
    }
    function all(sql, params = []) {
        const stmt = db.prepare(sql);
        try {
            stmt.bind(paramsObj(params));
            const rows = [];
            while(stmt.step())rows.push(stmt.getAsObject());
            return rows;
        } finally{
            stmt.free();
        }
    }
    function exec(sql) {
        db.exec(sql);
        scheduleSave();
    }
    function transaction(fn) {
        const sp = `sp_${Math.random().toString(36).slice(2)}`;
        db.exec(`SAVEPOINT ${sp}`);
        try {
            const result = fn();
            db.exec(`RELEASE ${sp}`);
            scheduleSave();
            return result;
        } catch (e) {
            try {
                db.exec(`ROLLBACK TO ${sp}`);
                db.exec(`RELEASE ${sp}`);
            } catch  {}
            throw e;
        }
    }
    function close() {
        if (saveTimer) clearTimeout(saveTimer);
        if (dirty) persist();
        db.close();
    }
    // Flush on shutdown
    const flush = ()=>{
        if (dirty) try {
            persist();
        } catch  {}
    };
    process.on("beforeExit", flush);
    process.on("SIGINT", flush);
    process.on("SIGTERM", flush);
    return {
        driver: "sql.js",
        run,
        get,
        all,
        exec,
        transaction,
        close,
        raw: db
    };
}
}),
"[externals]/sql.js [external] (sql.js, cjs, [project]/node_modules/sql.js)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("sql.js-59d66b30daa0a8d2", () => require("sql.js-59d66b30daa0a8d2"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__1_pghx_._.js.map