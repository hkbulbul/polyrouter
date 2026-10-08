"use server";

import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { DEFAULT_PLUGINS } from "@/shared/constants/coworkPlugins";
import {
  readCliSnapshot,
  writeCliSnapshot,
  clearCliSnapshot,
  captureValues,
  restoreValues,
  mergeCaptured,
  getAtPath,
  setAtPath,
} from "@/lib/cliToolSnapshot";

const execAsync = promisify(exec);

const TOOL_ID = "claude";

// Exa MCP def — reuse from coworkPlugins (DRY).
const EXA_PLUGIN = DEFAULT_PLUGINS.find((p) => p.name === "exa");
const buildExaMcpEntry = () => ({
  type: EXA_PLUGIN.transport,
  url: EXA_PLUGIN.url,
});
const EXA_PATH = ["mcpServers", "exa"];

// Env keys PolyRouter writes (dashboard + CLI launcher). Their original values are
// backed up on first connect and restored on disconnect.
const MANAGED_ENV_KEYS = [
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_MODEL",
  "ANTHROPIC_DEFAULT_OPUS_MODEL",
  "ANTHROPIC_DEFAULT_SONNET_MODEL",
  "ANTHROPIC_DEFAULT_FABLE_MODEL",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL",
  "API_TIMEOUT_MS",
];
const MODEL_ENV_KEYS = MANAGED_ENV_KEYS.filter((key) => key.endsWith("_MODEL"));

const getManagedEnvPaths = (...envs) => [
  ...new Set([...MANAGED_ENV_KEYS, ...envs.flatMap((env) => Object.keys(env || {}))]),
].map((key) => ["env", key]);

// Get claude settings path based on OS
const getClaudeSettingsPath = () => {
  const homeDir = os.homedir();
  return path.join(homeDir, ".claude", "settings.json");
};

// Claude Code CLI reads mcpServers from ~/.claude.json (NOT settings.json).
const getClaudeJsonPath = () => path.join(os.homedir(), ".claude.json");

// Tolerate JSONC trailing commas; null when the file does not exist.
const readJsonFile = async (filePath) => {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content.replace(/,(\s*[}\]])/g, "$1"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
};

const readClaudeJson = async () => {
  try {
    return await readJsonFile(getClaudeJsonPath());
  } catch {
    return null;
  }
};

const isProviderModel = (value) => typeof value === "string" && value.includes("/");
const isLocalEndpoint = (url) => /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(url || "");
const stripUrl = (url) => (url || "").replace(/\/+$/, "");

// Does this env route Claude Code through PolyRouter? `knownEnv` is what PolyRouter
// last applied (or is applying now); without it we fall back to heuristics so configs
// written before backups existed are still recognised.
const isPolyRouterEnv = (env, knownEnv = {}) => {
  const url = env?.ANTHROPIC_BASE_URL;
  if (!url) return false;
  if (knownEnv.ANTHROPIC_BASE_URL && stripUrl(url) === stripUrl(knownEnv.ANTHROPIC_BASE_URL)) return true;
  if (knownEnv.ANTHROPIC_AUTH_TOKEN && env.ANTHROPIC_AUTH_TOKEN === knownEnv.ANTHROPIC_AUTH_TOKEN) return true;
  if (MODEL_ENV_KEYS.some((key) => isProviderModel(env[key]))) return true;
  return isLocalEndpoint(url);
};

// Marks values PolyRouter itself wrote, so they are never mistaken for the user's originals.
const makePolyRouterValueCheck = (env, knownEnv) => {
  const connected = isPolyRouterEnv(env, knownEnv);
  return (segments, value) => {
    if (!connected) return false;
    if (segments[0] === "mcpServers") return JSON.stringify(value) === JSON.stringify(buildExaMcpEntry());
    // ANTHROPIC_MODEL is often set by users themselves; only PolyRouter writes provider/model ids.
    if (segments[1] === "ANTHROPIC_MODEL") return isProviderModel(value);
    return true;
  };
};

const writeJsonFile = (filePath, data) => fs.writeFile(filePath, JSON.stringify(data, null, 2));

// Check if claude CLI is installed (via which/where or config file exists)
const checkClaudeInstalled = async () => {
  try {
    const isWindows = os.platform() === "win32";
    const command = isWindows ? "where claude" : "which claude";
    const env = isWindows
      ? { ...process.env, PATH: `${process.env.APPDATA}\\npm;${process.env.PATH}` }
      : process.env;
    await execAsync(command, { windowsHide: true, env });
    return true;
  } catch {
    try {
      await fs.access(getClaudeSettingsPath());
      return true;
    } catch {
      return false;
    }
  }
};

// Read current settings
const readSettings = async () => {
  try {
    // Treat unparseable files as "no config" rather than throwing a 500 that the
    // UI misreads as "tool not installed".
    return await readJsonFile(getClaudeSettingsPath());
  } catch (error) {
    return null;
  }
};

// Write PolyRouter env into settings.json, backing up the user's originals first.
const applyClaudeSettings = async ({ env: requestedEnv, exaMcpEnabled }) => {
  const env = { ...requestedEnv };

  // Normalize ANTHROPIC_BASE_URL to ensure /v1 suffix
  if (env.ANTHROPIC_BASE_URL) {
    env.ANTHROPIC_BASE_URL = env.ANTHROPIC_BASE_URL.endsWith("/v1")
      ? env.ANTHROPIC_BASE_URL
      : `${env.ANTHROPIC_BASE_URL}/v1`;
  }

  const settingsPath = getClaudeSettingsPath();
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });

  const currentSettings = (await readJsonFile(settingsPath)) || {};
  // undefined = unreadable ~/.claude.json: never overwrite it; null = file does not exist.
  const claudeJson = await readJsonFile(getClaudeJsonPath()).catch(() => undefined);
  const snapshot = (await readCliSnapshot(TOOL_ID)) || {};
  const lastPayload = snapshot.lastApplied?.payload || {};
  const lastEnv = lastPayload.env || {};

  // Back up whatever the user had before PolyRouter touched these keys.
  const isPolyRouterValue = makePolyRouterValueCheck(currentSettings.env, { ...lastEnv, ...env });
  const original = snapshot.original || { capturedAt: new Date().toISOString(), files: {} };
  original.files.settings = mergeCaptured(
    original.files.settings,
    captureValues(currentSettings, getManagedEnvPaths(env), isPolyRouterValue)
  );
  if (claudeJson !== undefined) {
    original.files.claudeJson = mergeCaptured(
      original.files.claudeJson,
      captureValues(claudeJson || {}, [EXA_PATH], isPolyRouterValue)
    );
  }

  const newSettings = {
    ...currentSettings,
    hasCompletedOnboarding: true,
    env: {
      ...(currentSettings.env || {}),
      ...env,
    },
  };
  await writeJsonFile(settingsPath, newSettings);

  // Exa MCP toggle — lives in ~/.claude.json (CLI reads mcpServers from here).
  // Undefined (e.g. a partial update from the CLI launcher) leaves it unchanged.
  const exaEnabled = exaMcpEnabled === undefined ? lastPayload.exaMcpEnabled : !!exaMcpEnabled;
  if (EXA_PLUGIN && exaMcpEnabled !== undefined && claudeJson !== undefined) {
    const nextClaudeJson = clone(claudeJson || {});
    if (exaEnabled) setAtPath(nextClaudeJson, EXA_PATH, buildExaMcpEntry());
    else restoreValues(nextClaudeJson, original.files.claudeJson, [EXA_PATH]);
    await writeClaudeJsonIfChanged(claudeJson, nextClaudeJson);
  }

  await writeCliSnapshot(TOOL_ID, {
    original,
    lastApplied: {
      appliedAt: new Date().toISOString(),
      payload: { env: { ...lastEnv, ...env }, exaMcpEnabled: !!exaEnabled },
    },
  });
};

const clone = (value) => JSON.parse(JSON.stringify(value));

// ~/.claude.json is constantly rewritten by Claude Code itself — only touch it when needed.
const writeClaudeJsonIfChanged = async (before, after) => {
  if (JSON.stringify(getAtPath(before || {}, EXA_PATH)) === JSON.stringify(getAtPath(after, EXA_PATH))) return;
  await writeJsonFile(getClaudeJsonPath(), after);
};

// Put the user's original values back. `forget` also drops the saved PolyRouter
// settings (Reset); otherwise they are kept so the tool can be reconnected.
const disconnectClaude = async ({ forget }) => {
  const settingsPath = getClaudeSettingsPath();
  const settings = await readJsonFile(settingsPath);
  // undefined = unreadable ~/.claude.json: never overwrite it; null = file does not exist.
  const claudeJson = await readJsonFile(getClaudeJsonPath()).catch(() => undefined);
  const snapshot = (await readCliSnapshot(TOOL_ID)) || {};
  const lastPayload = snapshot.lastApplied?.payload;
  const isPolyRouterValue = makePolyRouterValueCheck(settings?.env, lastPayload?.env);
  const managedPaths = getManagedEnvPaths(lastPayload?.env);

  // No backup (connected before backups existed): keep values that aren't PolyRouter's.
  const settingsOriginal = snapshot.original?.files?.settings
    ?? captureValues(settings || {}, managedPaths, isPolyRouterValue);
  const claudeJsonOriginal = snapshot.original?.files?.claudeJson
    ?? captureValues(claudeJson || {}, [EXA_PATH], isPolyRouterValue);

  // Remember a legacy connection so it can still be switched back on.
  let lastApplied = snapshot.lastApplied;
  if (!lastApplied && isPolyRouterEnv(settings?.env)) {
    const legacyEnv = Object.fromEntries(MANAGED_ENV_KEYS
      .filter((key) => settings.env[key] !== undefined && isPolyRouterValue(["env", key], settings.env[key]))
      .map((key) => [key, settings.env[key]]));
    const exa = getAtPath(claudeJson || {}, EXA_PATH);
    lastApplied = {
      appliedAt: new Date().toISOString(),
      payload: { env: legacyEnv, exaMcpEnabled: exa.present && isPolyRouterValue(EXA_PATH, exa.value) },
    };
  }

  if (settings) {
    restoreValues(settings, settingsOriginal, managedPaths);
    await writeJsonFile(settingsPath, settings);
  }
  if (claudeJson) {
    const nextClaudeJson = restoreValues(clone(claudeJson), claudeJsonOriginal, [EXA_PATH]);
    await writeClaudeJsonIfChanged(claudeJson, nextClaudeJson);
  }

  if (forget) await clearCliSnapshot(TOOL_ID);
  else await writeCliSnapshot(TOOL_ID, { lastApplied });
};

// GET - Check claude CLI and read current settings
export async function GET() {
  try {
    const isInstalled = await checkClaudeInstalled();

    if (!isInstalled) {
      return NextResponse.json({
        installed: false,
        settings: null,
        message: "Claude CLI is not installed",
      });
    }

    const settings = await readSettings();
    const claudeJson = await readClaudeJson();
    const snapshot = await readCliSnapshot(TOOL_ID);

    return NextResponse.json({
      installed: true,
      settings: settings,
      hasPolyRouter: isPolyRouterEnv(settings?.env, snapshot?.lastApplied?.payload?.env),
      hasBackup: !!snapshot?.original,
      canReconnect: !!snapshot?.lastApplied,
      exaMcpEnabled: !!claudeJson?.mcpServers?.exa,
      settingsPath: getClaudeSettingsPath(),
    });
  } catch (error) {
    console.log("Error checking claude settings:", error);
    return NextResponse.json(
      { error: "Failed to check claude settings" },
      { status: 500 }
    );
  }
}

// POST - Backup old fields and write new settings
export async function POST(request) {
  try {
    const { env, exaMcpEnabled } = await request.json();

    if (!env || typeof env !== "object") {
      return NextResponse.json(
        { error: "Invalid env object" },
        { status: 400 }
      );
    }

    await applyClaudeSettings({ env, exaMcpEnabled });

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
    });
  } catch (error) {
    console.log("Error updating claude settings:", error);
    return NextResponse.json(
      { error: "Failed to update claude settings" },
      { status: 500 }
    );
  }
}

// PATCH - { enabled: false } restores the user's original config (e.g. back to the
// Claude subscription) but keeps PolyRouter settings; { enabled: true } re-applies them.
export async function PATCH(request) {
  try {
    const { enabled } = await request.json();

    if (enabled) {
      const snapshot = await readCliSnapshot(TOOL_ID);
      const payload = snapshot?.lastApplied?.payload;
      if (!payload?.env?.ANTHROPIC_BASE_URL) {
        return NextResponse.json(
          { error: "No saved PolyRouter settings — configure and click Apply first" },
          { status: 409 }
        );
      }
      await applyClaudeSettings(payload);
      return NextResponse.json({ success: true, message: "Claude Code now routes through PolyRouter" });
    }

    await disconnectClaude({ forget: false });
    return NextResponse.json({ success: true, message: "Original Claude Code settings restored" });
  } catch (error) {
    console.log("Error toggling claude settings:", error);
    return NextResponse.json(
      { error: "Failed to toggle claude settings" },
      { status: 500 }
    );
  }
}

// DELETE - Reset: restore the original settings and forget PolyRouter's
export async function DELETE() {
  try {
    await disconnectClaude({ forget: true });

    return NextResponse.json({
      success: true,
      message: "Settings reset successfully",
    });
  } catch (error) {
    console.log("Error resetting claude settings:", error);
    return NextResponse.json(
      { error: "Failed to reset claude settings" },
      { status: 500 }
    );
  }
}
