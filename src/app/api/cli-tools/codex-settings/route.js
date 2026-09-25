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
  isPolyRouterCatalogModel,
} from "@/lib/codexModelCatalog";
import { deleteModelAlias, getModelAliases, setModelAlias } from "@/models";

const execAsync = promisify(exec);

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

// Delete a nested key from a flat dotted path
const deleteNestedSection = (obj, dottedKey) => {
  const keys = dottedKey.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    cur = cur?.[keys[i]];
    if (cur == null) return;
  }
  delete cur[keys[keys.length - 1]];
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

const toStoredAliasTarget = (modelId) => {
  if (modelId.includes("/")) return modelId;

  const provider = modelId.startsWith("claude-")
    ? "anthropic"
    : modelId.startsWith("gemini-")
      ? "gemini"
      : modelId.startsWith("gpt-")
        ? "openai"
        : "openrouter";
  return `${provider}/${modelId}`;
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
      await setModelAlias(slot.id, toStoredAliasTarget(target));
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
    let modelCatalogRegistered = false;
    try {
      const parsed = config ? parseTOML(config) : null;
      modelCatalogRegistered = isManagedModelCatalogPath(parsed?.model_catalog_json);
    } catch { /* Keep the existing config untouched when it cannot be parsed */ }

    return NextResponse.json({
      installed: true,
      config,
      hasPolyRouter: hasPolyRouterConfig(config),
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

// POST - Update PolyRouter settings (merge with existing config)
export async function POST(request) {
  try {
    const { baseUrl, apiKey, model, subagentModel, catalogModels, modelSlots } = await request.json();
    
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
      if (slotIds.has(model) && !requestedModelSlots[model]) {
        return NextResponse.json({ error: `Configure a model mapping for ${model}` }, { status: 400 });
      }
      if (slotIds.has(effectiveSubagentModel) && !requestedModelSlots[effectiveSubagentModel]) {
        return NextResponse.json({ error: `Configure a model mapping for ${effectiveSubagentModel}` }, { status: 400 });
      }
    }
    const normalizedModelSlots = requestedModelSlots || await readCodexModelSlots();
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

    // Update auth.json with OPENAI_API_KEY (Codex reads this first)
    const authPath = getCodexAuthPath();
    let authData = {};
    try {
      const existingAuth = await fs.readFile(authPath, "utf-8");
      authData = JSON.parse(existingAuth);
    } catch { /* No existing auth */ }
    
    // Force apikey mode (keep existing tokens untouched for ChatGPT login reuse)
    authData.OPENAI_API_KEY = apiKey;
    authData.auth_mode = "apikey";
    await fs.writeFile(authPath, JSON.stringify(authData, null, 2));

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
}

// DELETE - Remove PolyRouter settings only (keep other settings)
export async function DELETE() {
  try {
    const configPath = getCodexConfigPath();

    for (const slot of CODEX_MODEL_SLOTS) {
      await deleteModelAlias(slot.id);
    }

    // Read and parse existing config
    let parsed = {};
    try {
      const existingConfig = await fs.readFile(configPath, "utf-8");
      parsed = parsedToWritable(parseTOML(existingConfig));
    } catch (error) {
      if (error.code === "ENOENT") {
        await removeManagedModelCatalogFile();
        return NextResponse.json({
          success: true,
          message: "No config file to reset",
        });
      }
      throw error;
    }

    // Remove PolyRouter related root fields only if they point to polyrouter
    if (parsed.model_provider === "polyrouter") {
      delete parsed.model;
      delete parsed.model_provider;
    }

    // Remove polyrouter provider section
    deleteNestedSection(parsed, "model_providers.polyrouter");

    // Remove the PolyRouter subagent model without deleting other agent settings
    const subagentSettings = parsed.agents?.subagent;
    if (subagentSettings && typeof subagentSettings === "object") {
      delete subagentSettings.model;
      if (subagentSettings.description === CODEX_SUBAGENT_DESCRIPTION) {
        delete subagentSettings.description;
      }
      if (Object.keys(subagentSettings).length === 0) delete parsed.agents.subagent;
      if (parsed.agents && Object.keys(parsed.agents).length === 0) delete parsed.agents;
    }

    const removedModelCatalog = isManagedModelCatalogPath(parsed.model_catalog_json);
    if (removedModelCatalog) delete parsed.model_catalog_json;

    // Write updated config
    const configContent = stringifyTOML(parsed);
    await fs.writeFile(configPath, configContent);

    if (removedModelCatalog) await removeManagedModelCatalogFile();

    // Remove OPENAI_API_KEY from auth.json
    const authPath = getCodexAuthPath();
    try {
      const existingAuth = await fs.readFile(authPath, "utf-8");
      const authData = JSON.parse(existingAuth);
      delete authData.OPENAI_API_KEY;
      delete authData.auth_mode;

      // Write back or delete if empty
      if (Object.keys(authData).length === 0) {
        await fs.unlink(authPath);
      } else {
        await fs.writeFile(authPath, JSON.stringify(authData, null, 2));
      }
    } catch { /* No auth file */ }

    return NextResponse.json({
      success: true,
      message: "PolyRouter settings removed successfully",
      modelCatalogRemoved: removedModelCatalog,
    });
  } catch (error) {
    console.log("Error resetting codex settings:", error);
    return NextResponse.json({ error: "Failed to reset codex settings" }, { status: 500 });
  }
}
