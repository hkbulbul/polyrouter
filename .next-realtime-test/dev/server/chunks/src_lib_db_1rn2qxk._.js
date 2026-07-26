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
"[project]/src/lib/db/adapters/nodeSqliteAdapter.js [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createNodeSqliteAdapter",
    ()=>createNodeSqliteAdapter
]);
// Built-in node:sqlite adapter — available in Node >= 22.5.0.
// No native build, no npm install. API mirrors betterSqliteAdapter.
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$schema$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/schema.js [middleware] (ecmascript)");
;
const CHECKPOINT_INTERVAL_MS = 60 * 1000;
async function createNodeSqliteAdapter(filePath) {
    // Suppress "ExperimentalWarning: SQLite is an experimental feature" from node:sqlite.
    // Stable enough for production use as of Node 22.x (RC quality).
    const origEmit = process.emit;
    process.emit = function(name, data, ...rest) {
        if (name === "warning" && data?.name === "ExperimentalWarning" && /SQLite/i.test(data.message || "")) {
            return false;
        }
        return origEmit.call(process, name, data, ...rest);
    };
    // Dynamic import — fails on Node < 22.5 → driver.js falls back to sql.js
    const sqlite = await Promise.resolve().then(()=>__turbopack_context__.x("node:sqlite", ()=>require("node:sqlite"), true));
    const Database = sqlite.DatabaseSync;
    const db = new Database(filePath);
    db.exec(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$schema$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["PRAGMA_SQL"]);
    const stmtCache = new Map();
    function prepare(sql) {
        let stmt = stmtCache.get(sql);
        if (!stmt) {
            stmt = db.prepare(sql);
            stmtCache.set(sql, stmt);
        }
        return stmt;
    }
    // Periodic WAL checkpoint to keep -wal/-shm small
    const checkpointTimer = setInterval(()=>{
        try {
            db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
        } catch  {}
    }, CHECKPOINT_INTERVAL_MS);
    if (typeof checkpointTimer.unref === "function") checkpointTimer.unref();
    function gracefulClose() {
        try {
            db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
        } catch  {}
        try {
            stmtCache.clear();
        } catch  {}
        try {
            db.close();
        } catch  {}
    }
    const onShutdown = ()=>gracefulClose();
    process.once("beforeExit", onShutdown);
    process.once("SIGINT", ()=>{
        onShutdown();
        process.exit(0);
    });
    process.once("SIGTERM", ()=>{
        onShutdown();
        process.exit(0);
    });
    return {
        driver: "node:sqlite",
        run (sql, params = []) {
            const r = prepare(sql).run(...params);
            return {
                changes: Number(r.changes ?? 0),
                lastInsertRowid: Number(r.lastInsertRowid ?? 0)
            };
        },
        get (sql, params = []) {
            return prepare(sql).get(...params);
        },
        all (sql, params = []) {
            return prepare(sql).all(...params);
        },
        exec (sql) {
            return db.exec(sql);
        },
        transaction (fn) {
            // node:sqlite has no transaction wrapper. Use SAVEPOINT for nested support.
            const sp = `sp_${Math.random().toString(36).slice(2)}`;
            db.exec(`SAVEPOINT ${sp}`);
            try {
                const r = fn();
                db.exec(`RELEASE ${sp}`);
                return r;
            } catch (e) {
                try {
                    db.exec(`ROLLBACK TO ${sp}`);
                    db.exec(`RELEASE ${sp}`);
                } catch  {}
                throw e;
            }
        },
        checkpoint () {
            try {
                db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
            } catch  {}
        },
        close () {
            clearInterval(checkpointTimer);
            gracefulClose();
        },
        raw: db
    };
}
}),
];

//# sourceMappingURL=src_lib_db_1rn2qxk._.js.map