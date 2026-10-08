import fs from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "@/lib/dataDir.js";

// Key-level backups for CLI tool configs that PolyRouter edits (Claude Code, Codex, …).
//
// When PolyRouter first connects a tool it records the user's ORIGINAL value for
// every key it is about to overwrite (or that the key was absent). Disconnecting
// puts exactly those values back — so e.g. Claude Code falls back to the user's
// own subscription login and Codex to its ChatGPT auth — while every other key the
// user or the tool changed in the meantime is left alone. The last PolyRouter
// payload is kept too, so the tool can be reconnected with one click.
//
// File: <DATA_DIR>/cli-tool-backups/<toolId>.json
// {
//   original:    { capturedAt, files: { <fileId>: [{ path: [..], present, value }] } },
//   lastApplied: { appliedAt, payload }
// }

const SNAPSHOT_DIR = path.join(DATA_DIR, "cli-tool-backups");

const getSnapshotPath = (toolId) => {
  if (!/^[a-z0-9-]+$/i.test(toolId)) throw new Error(`Invalid tool id: ${toolId}`);
  return path.join(SNAPSHOT_DIR, `${toolId}.json`);
};

const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

const isPlainObject = (value) => value != null && typeof value === "object" && !Array.isArray(value);

export const readCliSnapshot = async (toolId) => {
  try {
    const data = JSON.parse(await fs.readFile(getSnapshotPath(toolId), "utf-8"));
    return isPlainObject(data) ? data : null;
  } catch {
    return null;
  }
};

export const writeCliSnapshot = async (toolId, data) => {
  const filePath = getSnapshotPath(toolId);
  if (!data || (!data.original && !data.lastApplied)) {
    await fs.rm(filePath, { force: true });
    return;
  }
  await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
  // Originals can hold the user's own API keys — keep the file owner-only.
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), { mode: 0o600 });
};

export const clearCliSnapshot = (toolId) => writeCliSnapshot(toolId, null);

export const getAtPath = (obj, segments) => {
  let cur = obj;
  for (const key of segments) {
    if (!isPlainObject(cur) || !Object.prototype.hasOwnProperty.call(cur, key)) {
      return { present: false, value: undefined };
    }
    cur = cur[key];
  }
  return { present: true, value: cur };
};

export const setAtPath = (obj, segments, value) => {
  let cur = obj;
  for (const key of segments.slice(0, -1)) {
    if (!isPlainObject(cur[key])) cur[key] = {};
    cur = cur[key];
  }
  cur[segments[segments.length - 1]] = value;
};

// Delete a nested key, then prune parent objects that this deletion left empty.
export const deleteAtPath = (obj, segments) => {
  const parents = [obj];
  for (const key of segments.slice(0, -1)) {
    const next = parents[parents.length - 1]?.[key];
    if (!isPlainObject(next)) return;
    parents.push(next);
  }
  const leaf = parents[parents.length - 1];
  if (!Object.prototype.hasOwnProperty.call(leaf, segments[segments.length - 1])) return;
  delete leaf[segments[segments.length - 1]];
  for (let i = parents.length - 1; i > 0; i--) {
    if (Object.keys(parents[i]).length > 0) break;
    delete parents[i - 1][segments[i - 1]];
  }
};

const samePath = (a, b) => a.length === b.length && a.every((seg, i) => seg === b[i]);

const uniquePaths = (paths) => paths.reduce((acc, p) => (
  acc.some(existing => samePath(existing, p)) ? acc : [...acc, p]
), []);

/**
 * Record the current value of each path. `isPolyRouterValue(path, value)` lets a
 * caller mark values that were already written by PolyRouter (configs applied
 * before backups existed) — those are recorded as absent, never as "original".
 */
export const captureValues = (obj, paths, isPolyRouterValue = () => false) =>
  uniquePaths(paths).map((segments) => {
    const { present, value } = getAtPath(obj, segments);
    if (!present || isPolyRouterValue(segments, value)) return { path: segments, present: false };
    return { path: segments, present: true, value: clone(value) };
  });

/**
 * Put captured originals back into `obj`. Every managed path without a captured
 * original is deleted (the pre-backup "reset" behaviour).
 */
export const restoreValues = (obj, captured, managedPaths) => {
  const entries = Array.isArray(captured) ? captured : [];
  const paths = uniquePaths([...managedPaths, ...entries.map(entry => entry.path)]);
  for (const segments of paths) {
    const entry = entries.find(e => samePath(e.path, segments));
    if (entry?.present) setAtPath(obj, segments, clone(entry.value));
    else deleteAtPath(obj, segments);
  }
  return obj;
};

/** Merge newly captured entries into an existing original, keeping the first value seen for each path. */
export const mergeCaptured = (existing, captured) => {
  const base = Array.isArray(existing) ? existing : [];
  const extra = captured.filter(entry => !base.some(e => samePath(e.path, entry.path)));
  return [...base, ...extra];
};
