// Usage cost components: per-rate cost split and an "unpriced" flag on usageHistory.
// Existing rows are backfilled asynchronously by backfillUsageCostComponents()
// (pricing lookups are async), which keeps their recorded totals unchanged.
const ADDED_COLUMNS = [
  ["usageHistory", "inputCost", "REAL DEFAULT 0"],
  ["usageHistory", "cachedCost", "REAL DEFAULT 0"],
  ["usageHistory", "outputCost", "REAL DEFAULT 0"],
  ["usageHistory", "unpriced", "INTEGER DEFAULT 0"],
];

export default {
  version: 5,
  name: "usage-cost-components",
  up(db) {
    for (const [table, column, type] of ADDED_COLUMNS) {
      try {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      } catch (error) {
        if (!String(error?.message || error).toLowerCase().includes("duplicate column")) throw error;
      }
    }
  },
};
