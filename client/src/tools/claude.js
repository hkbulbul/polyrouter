// Claude Code: env entries in ~/.claude/settings.json, matching what the
// PolyRouter dashboard's Claude Code card writes.
import fs from "node:fs";
import path from "node:path";
import { getSnapshot, saveSnapshotOnce, updateSnapshot, clearSnapshot } from "./snapshot.js";

export const id = "claude";
export const label = "Claude Code";

const MANAGED_KEYS = ["ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_MODEL"];

const settingsPath = (home) => path.join(home, ".claude", "settings.json");

export function detect(home) {
  return fs.existsSync(path.join(home, ".claude"));
}

function readSettings(file) {
  if (!fs.existsSync(file)) return {};
  const raw = fs.readFileSync(file, "utf8");
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    // Never overwrite a file we cannot parse — the user would lose their settings.
    throw new Error(`${file} is not valid JSON. Fix it (or move it aside) and run sync again.`);
  }
}

function writeSettings(file, settings) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`);
}

export function apply({ home, serverUrl, apiKey, model }) {
  const file = settingsPath(home);
  const settings = readSettings(file);
  const env = settings.env && typeof settings.env === "object" ? settings.env : {};

  // Originals of every key we might ever write are captured on first connect;
  // `written` lists the keys actually written, and only those are restored.
  const originals = {};
  for (const key of MANAGED_KEYS) originals[key] = key in env ? { present: true, value: env[key] } : { present: false };
  const snapshot = saveSnapshotOnce(id, { file, env: originals, written: [] });

  const nextEnv = { ...env, ANTHROPIC_BASE_URL: `${serverUrl}/v1`, ANTHROPIC_AUTH_TOKEN: apiKey };
  if (model) nextEnv.ANTHROPIC_MODEL = model;
  const written = ["ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN", ...(model ? ["ANTHROPIC_MODEL"] : [])];
  updateSnapshot(id, { written: [...new Set([...(snapshot.written || []), ...written])] });
  writeSettings(file, { ...settings, env: nextEnv });
  return `${file} → ANTHROPIC_BASE_URL, ANTHROPIC_AUTH_TOKEN${model ? ", ANTHROPIC_MODEL" : ""}`;
}

export function restore({ home }) {
  const snapshot = getSnapshot(id);
  if (!snapshot) return null;
  const file = snapshot.file || settingsPath(home);
  if (fs.existsSync(file)) {
    const settings = readSettings(file);
    const env = { ...(settings.env || {}) };
    for (const key of snapshot.written || []) {
      const original = snapshot.env?.[key] || { present: false };
      if (original.present) env[key] = original.value;
      else delete env[key];
    }
    if (Object.keys(env).length) settings.env = env;
    else delete settings.env;
    writeSettings(file, settings);
  }
  clearSnapshot(id);
  return `${file} restored`;
}
