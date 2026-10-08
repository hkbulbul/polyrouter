"use server";

import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { parseTOML, stringifyTOML } from "confbox";
import {
  CODEX_MODEL_SLOTS,
  buildCodexModelCatalog,
  isQualifiedCodexModelTarget,
  isPolyRouterCatalogModel,
} from "@/lib/codexModelCatalog";
import { deleteModelAlias, getModelAliases, setModelAlias } from "@/models";
import {
  readCliSnapshot,
  writeCliSnapshot,
  clearCliSnapshot,
  captureValues,
  restoreValues,
  mergeCaptured,
} from "@/lib/cliToolSnapshot";

const execAsync = promisify(exec);

const TOOL_ID = "codex";

// Keys PolyRouter writes. Their original values (e.g. the user's own model, or
// auth_mode "chatgpt" for a ChatGPT subscription login) are backed up on first
// connect and restored on disconnect.
const CONFIG_MANAGED_PATHS = [
  ["model"],
  ["model_provider"],
  ["model_providers", "polyrouter"],
  ["agents", "subagent", "model"],
  ["agents", "subagent", "description"],
  ["model_catalog_json"],
];
const AUTH_MANAGED_PATHS = [["OPENAI_API_KEY"], ["auth_mode"]];

const getCodexDir = () => path.join(os.homedir(), ".codex");
const getCodexConfigPath = () => path.join(getCodexDir(), "config.toml");
const getCodexAuthPath = () => path.join(getCodexDir(), "auth.json");
const getCodexModelCatalogPath = () => path.join(getCodexDir(), "polyrouter-models.json");
const getCodexModelsCachePath = () => path.join(getCodexDir(), "models_cache.json");
const CODEX_SUBAGENT_DESCRIPTION = "Default PolyRouter subagent";

// Flatten confbox-parsed TOML into a writable object, preserving nested tables
const parsedToWritable = (obj) => obj ?? {};

// Set a nested key from a flat dotted path, creating intermediate objects as needed
const setNestedSection = (obj, dottedKey, value) => {
  const keys = dottedKey.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (cur[keys[i]] == null || typeof cur[keys[i]] !== "object") {
      cur[keys[i]] = {};
    }
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
};

const getCodexCommandEnv = () => {
  if (os.platform() !== "win32") return process.env;
  return { ...process.env, PATH: `${process.env.APPDATA}\\npm;${process.env.PATH}` };
};

const normalizePathForComparison = (value) => {
  if (typeof value !== "string" || !value.trim()) return "";
  const expandedValue = value === "~"
    ? os.homedir()
    : value.startsWith("~/") || value.startsWith("~\\")
      ? path.join(os.homedir(), value.slice(2))
      : value;
  const resolvedPath = path.resolve(expandedValue);
  return os.platform() === "win32" ? resolvedPath.toLowerCase() : resolvedPath;
};

const isManagedModelCatalogPath = (value) =>
  normalizePathForComparison(value) === normalizePathForComparison(getCodexModelCatalogPath());

const parseModelCatalog = (content) => {
  const catalog = typeof content === "string" ? JSON.parse(content) : content;
  if (!Array.isArray(catalog?.models) || catalog.models.length === 0) {
    throw new Error("Codex returned an empty model catalog");
  }
  return catalog;
};

const readManagedModelCatalog = async () => {
  try {
    return parseModelCatalog(await fs.readFile(getCodexModelCatalogPath(), "utf-8"));
  } catch {
    return null;
  }
};

const getManagedModelIds = async () => {
  const catalog = await readManagedModelCatalog();
  if (!catalog) return [];
  return catalog.models.filter(isPolyRouterCatalogModel).map(model => model.slug);
};

const formatAliasTarget = (target) => {
  if (typeof target === "string") return target;
  if (target?.provider && target?.model) return `${target.provider}/${target.model}`;
  return "";
};

const normalizeModelSlots = (modelSlots) => Object.fromEntries(
  CODEX_MODEL_SLOTS.map(slot => [
    slot.id,
    typeof modelSlots?.[slot.id] === "string" ? modelSlots[slot.id].trim() : "",
  ])
);

const readCodexModelSlots = async () => {
  const aliases = await getModelAliases();
  return Object.fromEntries(CODEX_MODEL_SLOTS.map(slot => [
    slot.id,
    formatAliasTarget(aliases[slot.id]),
  ]));
};

const syncCodexModelSlots = async (modelSlots) => {
  const normalizedSlots = normalizeModelSlots(modelSlots);
  const aliases = await getModelAliases();

  for (const slot of CODEX_MODEL_SLOTS) {
    const target = normalizedSlots[slot.id];
    if (target) {
      await setModelAlias(slot.id, target);
    } else if (aliases[slot.id]) {
      await deleteModelAlias(slot.id);
    }
  }

  return normalizedSlots;
};

const loadCodexBaseCatalog = async () => {
  try {
    const { stdout } = await execAsync("codex debug models --bundled", {
      windowsHide: true,
      env: getCodexCommandEnv(),
      maxBuffer: 20 * 1024 * 1024,
      timeout: 15000,
    });
    return parseModelCatalog(stdout);
  } catch {
    try {
      return parseModelCatalog(await fs.readFile(getCodexModelsCachePath(), "utf-8"));
    } catch {
      return null;
    }
  }
};

const registerPolyRouterModels = async (model, subagentModel, catalogModels, modelSlots) => {
  const baseCatalog = await loadCodexBaseCatalog();
  if (!baseCatalog) {
    return {
      registered: false,
      customModelIds: [...new Set([model, subagentModel, ...(catalogModels || [])]
        .filter(modelId => typeof modelId === "string" && modelId.trim()))],
      warning: "Codex model catalog registration is unavailable on this installation",
    };
  }

  const { catalog, customModelIds } = buildCodexModelCatalog(baseCatalog, {
    model,
    subagentModel,
    catalogModels,
    modelSlots,
  });

  if (customModelIds.length === 0) {
    return { registered: false, customModelIds: [] };
  }

  const catalogPath = getCodexModelCatalogPath();
  await fs.writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
  return { registered: true, customModelIds, catalogPath };
};

const removeManagedModelCatalogFile = async () => {
  try {
    await fs.unlink(getCodexModelCatalogPath());
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
};

// Check if codex CLI is installed (via which/where or config file exists)
const checkCodexInstalled = async () => {
  try {
    const isWindows = os.platform() === "win32";
    const command = isWindows ? "where codex" : "which codex";
    await execAsync(command, { windowsHide: true, env: getCodexCommandEnv() });
    return true;
  } catch {
    try {
      await fs.access(getCodexConfigPath());
      return true;
    } catch {
      return false;
    }
  }
};

// Read current config.toml
const readConfig = async () => {
  try {
    const configPath = getCodexConfigPath();
    const content = await fs.readFile(configPath, "utf-8");
    return content;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
};

// Check if config has PolyRouter settings
const hasPolyRouterConfig = (config) => {
  if (!config) return false;
  return config.includes("model_provider = \"polyrouter\"") || config.includes("[model_providers.polyrouter]");
};

const readJsonFile = async (filePath) => {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf-8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
};

// Marks values PolyRouter itself wrote, so configs applied before backups existed
// are never mistaken for the user's originals.
const makePolyRouterValueCheck = (parsedConfig) => {
  const connected = parsedConfig?.model_provider === "polyrouter" || !!parsedConfig?.model_providers?.polyrouter;
  const bearer = parsedConfig?.model_providers?.polyrouter?.experimental_bearer_token;
  return {
    config: ([key, , leaf], value) => {
      if (key === "model_catalog_json") return isManagedModelCatalogPath(value);
      if (leaf === "description") return value === CODEX_SUBAGENT_DESCRIPTION;
      return connected;
    },
    auth: (authData) => connected && !!bearer && authData?.OPENAI_API_KEY === bearer,
  };
};

const captureAuth = (authData, isPolyRouterAuth) =>
  captureValues(authData || {}, AUTH_MANAGED_PATHS, () => isPolyRouterAuth(authData));

// GET - Check codex CLI and read current settings
export async function GET() {
  try {
    const isInstalled = await checkCodexInstalled();
    
    if (!isInstalled) {
      return NextResponse.json({
        installed: false,
        config: null,
        message: "Codex CLI is not installed",
      });
    }

    const config = await readConfig();
    const availableModelIds = await getManagedModelIds();
    const modelSlots = await readCodexModelSlots();
    const snapshot = await readCliSnapshot(TOOL_ID);
    let modelCatalogRegistered = false;
    try {
      const parsed = config ? parseTOML(config) : null;
      modelCatalogRegistered = isManagedModelCatalogPath(parsed?.model_catalog_json);
    } catch { /* Keep the existing config untouched when it cannot be parsed */ }

    return NextResponse.json({
      installed: true,
      config,
      hasPolyRouter: hasPolyRouterConfig(config),
      hasBackup: !!snapshot?.original,
      canReconnect: !!snapshot?.lastApplied,
      configPath: getCodexConfigPath(),
      modelCatalogRegistered,
      availableModelIds,
      modelSlots,
    });
  } catch (error) {
    console.log("Error checking codex settings:", error);
    return NextResponse.json({ error: "Failed to check codex settings" }, { status: 500 });
  }
}

// Write PolyRouter settings into config.toml + auth.json, backing up the user's originals first.
const applyCodexSettings = async ({ baseUrl, apiKey, model, subagentModel, catalogModels, modelSlots }) => {
  try {

    if (!baseUrl || !apiKey || !model) {
      return NextResponse.json({ error: "baseUrl, apiKey and model are required" }, { status: 400 });
    }

    const codexDir = getCodexDir();
    const configPath = getCodexConfigPath();

    // Ensure directory exists
    await fs.mkdir(codexDir, { recursive: true });

    // Read and parse existing config
    let parsed = {};
    try {
      const existingConfig = await fs.readFile(configPath, "utf-8");
      parsed = parsedToWritable(parseTOML(existingConfig));
    } catch { /* No existing config */ }

    const effectiveSubagentModel = subagentModel || model;
    const slotIds = new Set(CODEX_MODEL_SLOTS.map(slot => slot.id));
    const hasModelSlots = modelSlots && typeof modelSlots === "object" && !Array.isArray(modelSlots);
    const requestedModelSlots = hasModelSlots ? normalizeModelSlots(modelSlots) : null;
    if (requestedModelSlots) {
      const invalidSlot = CODEX_MODEL_SLOTS.find(slot =>
        requestedModelSlots[slot.id] && !isQualifiedCodexModelTarget(requestedModelSlots[slot.id])
      );
      if (invalidSlot) {
        return NextResponse.json({
          error: `Model mapping for ${invalidSlot.name} must use provider/model format`,
        }, { status: 400 });
      }
      if (slotIds.has(model) && !requestedModelSlots[model]) {
        return NextResponse.json({ error: `Configure a model mapping for ${model}` }, { status: 400 });
      }
      if (slotIds.has(effectiveSubagentModel) && !requestedModelSlots[effectiveSubagentModel]) {
        return NextResponse.json({ error: `Configure a model mapping for ${effectiveSubagentModel}` }, { status: 400 });
      }
    }
    const normalizedModelSlots = requestedModelSlots || await readCodexModelSlots();
    const invalidStoredSlot = CODEX_MODEL_SLOTS.find(slot =>
      normalizedModelSlots[slot.id] && !isQualifiedCodexModelTarget(normalizedModelSlots[slot.id])
    );
    if (invalidStoredSlot) {
      return NextResponse.json({
        error: `Model mapping for ${invalidStoredSlot.name} must use provider/model format`,
      }, { status: 400 });
    }
    if (requestedModelSlots) await syncCodexModelSlots(requestedModelSlots);
    const existingCatalogModels = await getManagedModelIds();
    const requestedCatalogModels = Array.isArray(catalogModels)
      ? catalogModels
      : existingCatalogModels;
    let modelCatalogResult;
    try {
      modelCatalogResult = await registerPolyRouterModels(
        model,
        effectiveSubagentModel,
        requestedCatalogModels,
        normalizedModelSlots
      );
    } catch (error) {
      console.warn("Error registering PolyRouter models in Codex catalog:", error);
      modelCatalogResult = {
        registered: false,
        customModelIds: [...new Set([model, effectiveSubagentModel, ...requestedCatalogModels]
          .filter(modelId => typeof modelId === "string" && modelId.trim()))],
        warning: "Failed to register custom models in the Codex app picker",
      };
    }

    const authPath = getCodexAuthPath();
    let authData = {};
    try {
      authData = (await readJsonFile(authPath)) || {};
    } catch { /* Unreadable auth — rewritten below as before */ }

    // Back up whatever the user had before PolyRouter touched these keys.
    const snapshot = (await readCliSnapshot(TOOL_ID)) || {};
    const isPolyRouterValue = makePolyRouterValueCheck(parsed);
    const original = snapshot.original || { capturedAt: new Date().toISOString(), files: {} };
    original.files.config = mergeCaptured(
      original.files.config,
      captureValues(parsed, CONFIG_MANAGED_PATHS, isPolyRouterValue.config)
    );
    original.files.auth = mergeCaptured(original.files.auth, captureAuth(authData, isPolyRouterValue.auth));

    // Update only PolyRouter related fields (api_key goes to auth.json, not config.toml)
    parsed.model = model;
    parsed.model_provider = "polyrouter";

    if (modelCatalogResult.registered) {
      parsed.model_catalog_json = modelCatalogResult.catalogPath;
    } else if (isManagedModelCatalogPath(parsed.model_catalog_json)) {
      delete parsed.model_catalog_json;
      if (modelCatalogResult.customModelIds.length === 0) {
        await removeManagedModelCatalogFile();
      }
    }

    // Update or create polyrouter provider section with bearer token and disabled openai auth
    // Ensure /v1 suffix is added only once
    const normalizedBaseUrl = baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;
    setNestedSection(parsed, "model_providers.polyrouter", {
      name: "PolyRouter",
      base_url: normalizedBaseUrl,
      wire_api: "responses",
      requires_openai_auth: false,
      experimental_bearer_token: apiKey,
    });

    // Add subagent configuration
    setNestedSection(parsed, "agents.subagent.model", effectiveSubagentModel);
    if (!parsed.agents?.subagent?.description) {
      setNestedSection(parsed, "agents.subagent.description", CODEX_SUBAGENT_DESCRIPTION);
    }

    // Write merged config
    const configContent = stringifyTOML(parsed);
    await fs.writeFile(configPath, configContent);

    // Update auth.json with OPENAI_API_KEY (Codex reads this first).
    // Force apikey mode (keep existing tokens untouched for ChatGPT login reuse)
    authData.OPENAI_API_KEY = apiKey;
    authData.auth_mode = "apikey";
    await fs.writeFile(authPath, JSON.stringify(authData, null, 2));

    await writeCliSnapshot(TOOL_ID, {
      original,
      lastApplied: {
        appliedAt: new Date().toISOString(),
        payload: {
          baseUrl,
          apiKey,
          model,
          subagentModel: effectiveSubagentModel,
          catalogModels: requestedCatalogModels,
          modelSlots: normalizedModelSlots,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Codex settings applied successfully!",
      configPath,
      modelCatalog: modelCatalogResult,
      modelSlots: normalizedModelSlots,
    });
  } catch (error) {
    console.log("Error updating codex settings:", error);
    return NextResponse.json({ error: "Failed to update codex settings" }, { status: 500 });
  }
};

// POST - Update PolyRouter settings (merge with existing config)
export async function POST(request) {
  try {
    return await applyCodexSettings(await request.json());
  } catch (error) {
    console.log("Error updating codex settings:", error);
    return NextResponse.json({ error: "Failed to update codex settings" }, { status: 500 });
  }
}

// Put the user's original Codex values back. `forget` also drops the saved
// PolyRouter settings and model slots (Reset); otherwise they are kept so the
// tool can be reconnected.
const disconnectCodex = async ({ forget }) => {
  const configPath = getCodexConfigPath();
  const authPath = getCodexAuthPath();
  const snapshot = (await readCliSnapshot(TOOL_ID)) || {};

  let parsed = null;
  try {
    const existingConfig = await readConfig();
    if (existingConfig !== null) parsed = parsedToWritable(parseTOML(existingConfig));
  } catch (error) {
    if (error.code) throw error;
    throw new Error("~/.codex/config.toml could not be parsed — fix it manually before disconnecting");
  }
  const authData = await readJsonFile(authPath).catch(() => undefined);
  const isPolyRouterValue = makePolyRouterValueCheck(parsed);

  // Remember a legacy connection (applied before backups existed) so it can be switched back on.
  let lastApplied = snapshot.lastApplied;
  const provider = parsed?.model_providers?.polyrouter;
  if (!lastApplied && provider?.base_url && provider?.experimental_bearer_token && parsed?.model) {
    lastApplied = {
      appliedAt: new Date().toISOString(),
      payload: {
        baseUrl: provider.base_url,
        apiKey: provider.experimental_bearer_token,
        model: parsed.model,
        subagentModel: parsed.agents?.subagent?.model || parsed.model,
        catalogModels: await getManagedModelIds(),
        modelSlots: await readCodexModelSlots(),
      },
    };
  }

  let removedModelCatalog = false;
  if (parsed) {
    // No backup: keep any value that isn't PolyRouter's.
    const configOriginal = snapshot.original?.files?.config
      ?? captureValues(parsed, CONFIG_MANAGED_PATHS, isPolyRouterValue.config);
    removedModelCatalog = isManagedModelCatalogPath(parsed.model_catalog_json);
    restoreValues(parsed, configOriginal, CONFIG_MANAGED_PATHS);
    removedModelCatalog = removedModelCatalog && !isManagedModelCatalogPath(parsed.model_catalog_json);
    await fs.writeFile(configPath, stringifyTOML(parsed));
  }

  // auth.json: put back the original OPENAI_API_KEY / auth_mode (e.g. "chatgpt").
  if (authData) {
    const authOriginal = snapshot.original?.files?.auth ?? captureAuth(authData, isPolyRouterValue.auth);
    restoreValues(authData, authOriginal, AUTH_MANAGED_PATHS);
    if (Object.keys(authData).length === 0) await fs.unlink(authPath);
    else await fs.writeFile(authPath, JSON.stringify(authData, null, 2));
  }

  if (forget) {
    for (const slot of CODEX_MODEL_SLOTS) {
      await deleteModelAlias(slot.id);
    }
    if (removedModelCatalog || !parsed) await removeManagedModelCatalogFile();
    await clearCliSnapshot(TOOL_ID);
  } else {
    await writeCliSnapshot(TOOL_ID, { lastApplied });
  }

  return { configFound: !!parsed, removedModelCatalog };
};

// PATCH - { enabled: false } restores the user's original Codex config (e.g. back to
// the ChatGPT subscription) but keeps PolyRouter settings; { enabled: true } re-applies them.
export async function PATCH(request) {
  try {
    const { enabled } = await request.json();

    if (enabled) {
      const snapshot = await readCliSnapshot(TOOL_ID);
      if (!snapshot?.lastApplied?.payload) {
        return NextResponse.json(
          { error: "No saved PolyRouter settings — configure and click Apply first" },
          { status: 409 }
        );
      }
      return await applyCodexSettings(snapshot.lastApplied.payload);
    }

    await disconnectCodex({ forget: false });
    return NextResponse.json({ success: true, message: "Original Codex settings restored" });
  } catch (error) {
    console.log("Error toggling codex settings:", error);
    return NextResponse.json({ error: error.message || "Failed to toggle codex settings" }, { status: 500 });
  }
}

// DELETE - Reset: restore the original settings and forget PolyRouter's
export async function DELETE() {
  try {
    const { configFound, removedModelCatalog } = await disconnectCodex({ forget: true });

    return NextResponse.json({
      success: true,
      message: configFound ? "PolyRouter settings removed successfully" : "No config file to reset",
      modelCatalogRemoved: removedModelCatalog,
    });
  } catch (error) {
    console.log("Error resetting codex settings:", error);
    return NextResponse.json({ error: "Failed to reset codex settings" }, { status: 500 });
  }
}
