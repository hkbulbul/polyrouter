// Office mode: employee accounts, teams, limit policies, light-client devices,
// audit log, and per-employee attribution columns on apiKeys/usageHistory.
import { TABLES, buildCreateTableSql } from "../schema.js";

const ADDED_COLUMNS = [
  ["apiKeys", "userId", "TEXT"],
  ["apiKeys", "expiresAt", "TEXT"],
  ["apiKeys", "deviceId", "TEXT"],
  ["usageHistory", "userId", "TEXT"],
];

export default {
  version: 4,
  name: "office-mode",
  up(db) {
    for (const [table, column, type] of ADDED_COLUMNS) {
      try {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      } catch (error) {
        if (!String(error?.message || error).toLowerCase().includes("duplicate column")) throw error;
      }
    }
    for (const name of ["officeUsers", "officeTeams", "officePolicies", "officeDevices", "officeAuditLog"]) {
      const def = TABLES[name];
      db.exec(buildCreateTableSql(name, def));
      for (const idx of def.indexes || []) db.exec(idx);
    }
    db.exec("CREATE INDEX IF NOT EXISTS idx_ak_user ON apiKeys(userId)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_uh_user_ts ON usageHistory(userId, timestamp)");
  },
};
