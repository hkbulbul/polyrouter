// Originals of every value the client overwrites, captured the first time a
// tool is connected and put back on disconnect. Reconnecting (sync, or connect
// again) never overwrites an existing snapshot, so the true originals survive.
import fs from "node:fs";
import path from "node:path";
import { clientHome } from "../config.js";

const snapshotPath = () => path.join(clientHome(), "snapshots.json");

function readAll() {
  try {
    return JSON.parse(fs.readFileSync(snapshotPath(), "utf8"));
  } catch {
    return {};
  }
}

function writeAll(all) {
  fs.mkdirSync(clientHome(), { recursive: true, mode: 0o700 });
  fs.writeFileSync(snapshotPath(), `${JSON.stringify(all, null, 2)}\n`, { mode: 0o600 });
}

export function getSnapshot(toolId) {
  return readAll()[toolId] || null;
}

export function saveSnapshotOnce(toolId, snapshot) {
  const all = readAll();
  if (all[toolId]) return all[toolId];
  all[toolId] = { capturedAt: new Date().toISOString(), ...snapshot };
  writeAll(all);
  return all[toolId];
}

// Merge fields into an existing snapshot (e.g. record that a key is now managed).
export function updateSnapshot(toolId, patch) {
  const all = readAll();
  if (!all[toolId]) return null;
  all[toolId] = { ...all[toolId], ...patch };
  writeAll(all);
  return all[toolId];
}

export function clearSnapshot(toolId) {
  const all = readAll();
  if (!(toolId in all)) return;
  delete all[toolId];
  writeAll(all);
}
