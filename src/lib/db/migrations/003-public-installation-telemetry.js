export default {
  version: 3,
  name: "public-installation-telemetry",
  up(db) {
    try {
      db.exec("ALTER TABLE installationTelemetryQueue ADD COLUMN target TEXT NOT NULL DEFAULT 'private'");
    } catch (error) {
      if (!String(error?.message || error).toLowerCase().includes("duplicate column")) throw error;
    }
  },
};
