import { TABLES, buildCreateTableSql } from "../schema.js";

export default {
  version: 2,
  name: "installation-identity",
  up(db) {
    for (const name of ["installationIdentity", "installationTelemetryQueue"]) {
      const def = TABLES[name];
      db.exec(buildCreateTableSql(name, def));
      for (const idx of def.indexes || []) db.exec(idx);
    }
  },
};
