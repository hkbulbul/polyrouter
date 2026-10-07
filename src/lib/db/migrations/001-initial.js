// Initial schema bootstrap. For fresh DB this creates all tables/indexes.
// For existing DB at version 0 (legacy unstamped), it's idempotent (IF NOT EXISTS).
import { TABLES, buildCreateTableSql } from "../schema.js";

export default {
  version: 1,
  name: "initial",
  up(db) {
    for (const [name, def] of Object.entries(TABLES)) {
      db.exec(buildCreateTableSql(name, def));
      for (const idx of def.indexes || []) {
        // A legacy unstamped DB may already have this table without a column added
        // later (e.g. apiKeys.userId); the additive sync adds the column and then
        // re-creates the index, so a missing-column index here is safe to skip.
        try { db.exec(idx); } catch {}
      }
    }
  },
};
