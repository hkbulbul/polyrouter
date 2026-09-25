const api = require("../api/client");
const { pause, confirm, select } = require("../utils/input");
const { showStatus } = require("../utils/display");
const { selectModelFromList } = require("../utils/modelSelector");
const { showMenuWithBack } = require("../utils/menuHelper");
const { getEndpoint } = require("../utils/endpoint");

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[38;2;34;197;94m",
  brand: "\x1b[38;2;34;197;94m",
  red: "\x1b[38;2;239;68;68m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m"
};

// Claude model types with defaults (matching Web UI)
const CLAUDE_MODEL_TYPES = [
  { id: "sonnet", name: "Sonnet", envKey: "ANTHROPIC_DEFAULT_SONNET_MODEL", defaultValue: "cc/claude-sonnet-4-5-20250929" },
  { id: "opus",   name: "Opus",   envKey: "ANTHROPIC_DEFAULT_OPUS_MODEL",   defaultValue: "cc/claude-opus-4-5-20251101" },
  { id: "haiku",  name: "Haiku",  envKey: "ANTHROPIC_DEFAULT_HAIKU_MODEL",  defaultValue: "cc/claude-haiku-4-5-20251001" },
];

// ─── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Get first available API key from server
 * @returns {Promise<string|null>}
 */
async function getFirstApiKey() {
  const result = await api.getApiKeys();
  const keys = result.success ? (result.data.keys || []) : [];
  return keys.length > 0 ? keys[0].key : null;
}

// ─── Claude Code ──────────────────────────────────────────────────────────────

/**
 * Build header showing current Claude config status
 * @returns {Promise<string>}
 */
async function buildClaudeHeader() {
  const result = await api.getCliToolSettings("claude");
  if (!result.success) return `  ${COLORS.red}Failed to load settings${COLORS.reset}`;

  const settings = result.data.settings;
  const currentUrl = settings?.env?.ANTHROPIC_BASE_URL;
  const currentKey = settings?.env?.ANTHROPIC_AUTH_TOKEN;
  const lines = [];

  if (currentUrl) {
    lines.push(`Status:   ${COLORS.green}✓ Configured${COLORS.reset}`);
    lines.push(`Endpoint: ${COLORS.cyan}${currentUrl}${COLORS.reset}`);
    if (currentKey) {
      lines.push(`API Key:  ${COLORS.dim}${currentKey.substring(0, 10)}...${COLORS.reset}`);
    }
  } else {
    lines.push(`Status:   ${COLORS.red}✗ Not configured${COLORS.reset}`);
    lines.push(`${COLORS.dim}Run "Quick Setup" to configure${COLORS.reset}`);
  }

  return lines.join("\n");
}

/**
 * Get current Claude model from settings
 * @param {string} envKey
 * @returns {Promise<string>}
 */
async function getClaudeModel(envKey) {
  const result = await api.getCliToolSettings("claude");
  return result.success ? (result.data.settings?.env?.[envKey] || "Not set") : "Not set";
}

/**
 * Quick setup for Claude Code — sets endpoint, key, and all default models
 * @param {number} port
 */
async function claudeQuickSetup(port) {
  const { endpoint } = await getEndpoint(port);
  const apiKey = await getFirstApiKey();

  if (!apiKey) {
    showStatus("No API keys found. Create one in API Keys menu first.", "error");
    await pause();
    return;
  }

  const env = { ANTHROPIC_BASE_URL: endpoint, ANTHROPIC_AUTH_TOKEN: apiKey, API_TIMEOUT_MS: "600000" };
  CLAUDE_MODEL_TYPES.forEach(t => { env[t.envKey] = t.defaultValue; });

  const result = await api.applyCliToolSettings("claude", { env });
  showStatus(result.success ? "Quick Setup completed!" : `Failed: ${result.error}`, result.success ? "success" : "error");
  await pause();
}

/**
 * Select and save a specific Claude model type
 * @param {Object} modelType
 * @param {number} port
 */
async function claudeSelectModel(modelType, port) {
  const current = await getClaudeModel(modelType.envKey);
  const selected = await selectModelFromList(`Select ${modelType.name} Model`, current, { excludeCombos: true });
  if (!selected) return;

  const env = { [modelType.envKey]: selected };

  // Also set base URL if not configured yet
  const settingsResult = await api.getCliToolSettings("claude");
  if (!settingsResult.data?.settings?.env?.ANTHROPIC_BASE_URL) {
    const { endpoint } = await getEndpoint(port);
    const apiKey = await getFirstApiKey();
    env.ANTHROPIC_BASE_URL = endpoint;
    env.API_TIMEOUT_MS = "600000";
    if (apiKey) env.ANTHROPIC_AUTH_TOKEN = apiKey;
  }

  const result = await api.applyCliToolSettings("claude", { env });
  showStatus(result.success ? `${modelType.name} → ${selected} saved!` : `Failed: ${result.error}`, result.success ? "success" : "error");
  await pause();
}

/**
 * Reset Claude Code settings
 */
async function claudeReset() {
  const result = await api.resetCliToolSettings("claude");
  showStatus(result.success ? "Settings reset successfully!" : `Failed: ${result.error}`, result.success ? "success" : "error");
  await pause();
}

/**
 * Claude Code submenu
 * @param {number} port
 * @param {Array<string>} breadcrumb
 */
async function showClaudeCodeMenu(port, breadcrumb = []) {
  await showMenuWithBack({
    title: "🔧 Claude Code Settings",
    breadcrumb,
    headerContent: buildClaudeHeader,
    refresh: async () => ({
      sonnet: await getClaudeModel("ANTHROPIC_DEFAULT_SONNET_MODEL"),
      opus:   await getClaudeModel("ANTHROPIC_DEFAULT_OPUS_MODEL"),
      haiku:  await getClaudeModel("ANTHROPIC_DEFAULT_HAIKU_MODEL"),
    }),
    items: [
      {
        label: "⚡ Quick Setup (recommended)",
        action: async () => { await claudeQuickSetup(port); return true; }
      },
      {
        label: (d) => `Sonnet → ${d.sonnet}`,
        action: async () => { await claudeSelectModel(CLAUDE_MODEL_TYPES[0], port); return true; }
      },
      {
        label: (d) => `Opus → ${d.opus}`,
        action: async () => { await claudeSelectModel(CLAUDE_MODEL_TYPES[1], port); return true; }
      },
      {
        label: (d) => `Haiku → ${d.haiku}`,
        action: async () => { await claudeSelectModel(CLAUDE_MODEL_TYPES[2], port); return true; }
      },
      {
        label: "Reset to Default",
        action: async () => { await claudeReset(); return true; }
      }
    ]
  });
}

// ─── Codex CLI ────────────────────────────────────────────────────────────────

/**
 * Read a string from a named TOML table.
 * @param {string} config
 * @param {string} tableName
 * @param {string} key
 * @returns {string}
 */
function readCodexTomlValue(config, tableName, key) {
  if (!config) return "";
  const escapedTableName = tableName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sectionMatch = config.match(
    new RegExp(`^\\[${escapedTableName}\\]([\\s\\S]*?)(?=\\r?\\n\\[|(?![\\s\\S]))`, "m")
  );
  if (!sectionMatch) return "";
  const valueMatch = sectionMatch[1].match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]+)"`, "m"));
  return valueMatch ? valueMatch[1] : "";
}

/**
 * Parse the Codex settings used by the PolyRouter CLI.
 * @param {string} config
 * @returns {Object}
 */
function parseCodexConfig(config) {
  const modelMatch = config && config.match(/^model\s*=\s*"([^"]+)"/m);
  const modelCatalogMatch = config && config.match(/^model_catalog_json\s*=\s*"([^"]+)"/m);

  return {
    baseUrl: readCodexTomlValue(config, "model_providers.polyrouter", "base_url"),
    model: modelMatch ? modelMatch[1] : "",
    subagentModel: readCodexTomlValue(config, "agents.subagent", "model"),
    modelCatalogPath: modelCatalogMatch ? modelCatalogMatch[1] : "",
  };
}

function uniqueCodexModels(...modelGroups) {
  return [...new Set(modelGroups.flat().filter(model => typeof model === "string" && model.trim()))];
}

/**
 * Load Codex settings for menu labels and model defaults.
 * @returns {Promise<Object>}
 */
async function getCodexSettings() {
  const result = await api.getCliToolSettings("codex");
  if (!result.success) return { loadFailed: true };

  return {
    ...result.data,
    ...parseCodexConfig(result.data.config),
  };
}

/**
 * Build header showing current Codex config status
 * @param {Object} settings
 * @returns {Promise<string>}
 */
async function buildCodexHeader(settings) {
  if (settings?.loadFailed) return `  ${COLORS.red}Failed to load settings${COLORS.reset}`;

  const { installed, hasPolyRouter } = settings;
  if (!installed) return `Status:   ${COLORS.red}✗ Codex CLI not installed${COLORS.reset}`;

  if (!hasPolyRouter) {
    return [
      `Status:   ${COLORS.red}✗ Not configured${COLORS.reset}`,
      `${COLORS.dim}Run "Quick Setup" to configure${COLORS.reset}`
    ].join("\n");
  }

  const lines = [`Status:   ${COLORS.green}✓ Configured${COLORS.reset}`];
  if (settings.baseUrl) lines.push(`Endpoint: ${COLORS.cyan}${settings.baseUrl}${COLORS.reset}`);
  if (settings.model) lines.push(`Main:     ${COLORS.dim}${settings.model}${COLORS.reset}`);
  if (settings.subagentModel) lines.push(`Subagent: ${COLORS.dim}${settings.subagentModel}${COLORS.reset}`);
  if (settings.modelCatalogRegistered) {
    const modelCount = settings.availableModelIds?.length || 0;
    lines.push(`App menu: ${COLORS.green}✓ ${modelCount} PolyRouter model${modelCount === 1 ? "" : "s"}${COLORS.reset}`);
  }
  return lines.join("\n");
}

/**
 * Show the result of applying Codex model settings.
 * @param {Object} result
 * @param {string} successMessage
 */
async function showCodexApplyResult(result, successMessage) {
  if (!result.success) {
    showStatus(`Failed: ${result.error}`, "error");
    await pause();
    return;
  }

  showStatus(successMessage, "success");
  if (result.data?.modelCatalog?.registered) {
    showStatus("Codex model picker updated. Restart Codex to refresh it.", "info");
  } else if (result.data?.modelCatalog?.warning) {
    showStatus(result.data.modelCatalog.warning, "warning");
  }
  await pause();
}

/**
 * Get the endpoint and API key needed to update Codex settings.
 * @param {number} port
 * @param {Object} settings
 * @returns {Promise<{baseUrl: string, apiKey: string}|null>}
 */
async function getCodexApplyContext(port, settings) {
  const apiKey = await getFirstApiKey();
  if (!apiKey) {
    showStatus("No API keys found. Create one in API Keys menu first.", "error");
    await pause();
    return null;
  }

  const { endpoint } = await getEndpoint(port);
  return { baseUrl: settings.baseUrl || endpoint, apiKey };
}

/**
 * Quick setup for Codex CLI
 * @param {number} port
 */
async function codexQuickSetup(port) {
  const settings = await getCodexSettings();
  const model = await selectModelFromList(
    "Select Main Codex Model",
    settings.model || "cx/claude-sonnet-4-5-20250929",
    { excludeCombos: true }
  );
  if (!model) return;

  let subagentModel = model;
  const useDifferentSubagent = await confirm("Use a different model for subagents?");
  if (useDifferentSubagent) {
    subagentModel = await selectModelFromList("Select Subagent Codex Model", settings.subagentModel || model, { excludeCombos: true });
    if (!subagentModel) return;
  }

  const catalogModels = uniqueCodexModels(
    settings.availableModelIds || [],
    model,
    subagentModel
  );
  let addAnotherModel = await confirm("Add another model to the Codex app picker?");
  while (addAnotherModel) {
    const extraModel = await selectModelFromList("Add Model to Codex Picker", "", { excludeCombos: true });
    if (!extraModel) return;
    catalogModels.push(extraModel);
    addAnotherModel = await confirm("Add another model to the Codex app picker?");
  }

  const context = await getCodexApplyContext(port, settings);
  if (!context) return;

  const result = await api.applyCliToolSettings("codex", {
    ...context,
    model,
    subagentModel,
    catalogModels: uniqueCodexModels(catalogModels),
  });
  await showCodexApplyResult(result, "Codex setup completed!");
}

/**
 * Change either the main or subagent model without resetting the other role.
 * @param {"main"|"subagent"} role
 * @param {number} port
 */
async function codexSelectModel(role, port) {
  const settings = await getCodexSettings();
  if (role === "subagent" && !settings.model) {
    showStatus("Select a main Codex model first.", "error");
    await pause();
    return;
  }

  const isMain = role === "main";
  const selected = await selectModelFromList(
    isMain ? "Select Main Codex Model" : "Select Subagent Codex Model",
    isMain ? settings.model : settings.subagentModel,
    { excludeCombos: true }
  );
  if (!selected) return;

  const model = isMain ? selected : settings.model;
  const subagentModel = isMain
    ? (!settings.subagentModel || settings.subagentModel === settings.model ? selected : settings.subagentModel)
    : selected;
  const context = await getCodexApplyContext(port, settings);
  if (!context) return;

  const result = await api.applyCliToolSettings("codex", {
    ...context,
    model,
    subagentModel,
    catalogModels: uniqueCodexModels(settings.availableModelIds || [], model, subagentModel),
  });
  await showCodexApplyResult(result, `Codex ${role} model → ${selected} saved!`);
}

/**
 * Add a model to the Codex app picker without changing the active main model.
 * @param {number} port
 */
async function codexAddPickerModel(port) {
  const settings = await getCodexSettings();
  const selected = await selectModelFromList("Add Model to Codex Picker", "", { excludeCombos: true });
  if (!selected) return;

  const model = settings.model || selected;
  const subagentModel = settings.subagentModel || model;
  const context = await getCodexApplyContext(port, settings);
  if (!context) return;

  const result = await api.applyCliToolSettings("codex", {
    ...context,
    model,
    subagentModel,
    catalogModels: uniqueCodexModels(settings.availableModelIds || [], model, subagentModel, selected),
  });
  await showCodexApplyResult(result, `${selected} added to the Codex app picker!`);
}

/**
 * Remove a non-active model from the Codex app picker.
 * @param {number} port
 */
async function codexRemovePickerModel(port) {
  const settings = await getCodexSettings();
  if (!settings.model) {
    showStatus("Configure the main Codex model first.", "error");
    await pause();
    return;
  }

  const removableModels = uniqueCodexModels(settings.availableModelIds || [])
    .filter(model => model !== settings.model && model !== settings.subagentModel);
  if (removableModels.length === 0) {
    showStatus("No extra models are available to remove.", "info");
    await pause();
    return;
  }

  const selected = await select("Select a model to remove from the Codex app picker:", removableModels);
  const catalogModels = uniqueCodexModels(settings.availableModelIds || [])
    .filter(model => model !== selected);
  const context = await getCodexApplyContext(port, settings);
  if (!context) return;

  const result = await api.applyCliToolSettings("codex", {
    ...context,
    model: settings.model,
    subagentModel: settings.subagentModel || settings.model,
    catalogModels,
  });
  await showCodexApplyResult(result, `${selected} removed from the Codex app picker!`);
}

/**
 * Reset Codex CLI settings
 */
async function codexReset() {
  const result = await api.resetCliToolSettings("codex");
  showStatus(result.success ? "Codex settings reset!" : `Failed: ${result.error}`, result.success ? "success" : "error");
  await pause();
}

/**
 * Codex CLI submenu
 * @param {number} port
 * @param {Array<string>} breadcrumb
 */
async function showCodexMenu(port, breadcrumb = []) {
  await showMenuWithBack({
    title: "🤖 Codex CLI Settings",
    breadcrumb,
    headerContent: buildCodexHeader,
    refresh: getCodexSettings,
    items: [
      {
        label: "⚡ Quick Setup (model list)",
        action: async () => { await codexQuickSetup(port); return true; }
      },
      {
        label: (data) => `Main model → ${data.model || "Not set"}`,
        action: async () => { await codexSelectModel("main", port); return true; }
      },
      {
        label: (data) => `Subagent model → ${data.subagentModel || data.model || "Not set"}`,
        action: async () => { await codexSelectModel("subagent", port); return true; }
      },
      {
        label: (data) => `Add app picker model (${data.availableModelIds?.length || 0} configured)`,
        action: async () => { await codexAddPickerModel(port); return true; }
      },
      {
        label: "Remove app picker model",
        action: async () => { await codexRemovePickerModel(port); return true; }
      },
      {
        label: "Reset to Default",
        action: async () => { await codexReset(); return true; }
      }
    ]
  });
}

// ─── Factory Droid ────────────────────────────────────────────────────────────

/**
 * Build header showing current Droid config status
 * @returns {Promise<string>}
 */
async function buildDroidHeader() {
  const result = await api.getCliToolSettings("droid");
  if (!result.success) return `  ${COLORS.red}Failed to load settings${COLORS.reset}`;

  const { installed, hasPolyRouter, settings } = result.data;
  if (!installed) return `Status:   ${COLORS.red}✗ Factory Droid not installed${COLORS.reset}`;

  if (!hasPolyRouter) {
    return [
      `Status:   ${COLORS.red}✗ Not configured${COLORS.reset}`,
      `${COLORS.dim}Run "Quick Setup" to configure${COLORS.reset}`
    ].join("\n");
  }

  // Extract PolyRouter custom model config
  const custom = settings?.customModels?.find(m => m.id === "custom:PolyRouter-0");
  const lines = [`Status:   ${COLORS.green}✓ Configured${COLORS.reset}`];
  if (custom?.baseUrl) lines.push(`Endpoint: ${COLORS.cyan}${custom.baseUrl}${COLORS.reset}`);
  if (custom?.model)   lines.push(`Model:    ${COLORS.dim}${custom.model}${COLORS.reset}`);
  return lines.join("\n");
}

/**
 * Quick setup for Factory Droid
 * @param {number} port
 */
async function droidQuickSetup(port) {
  const { endpoint } = await getEndpoint(port);
  const apiKey = await getFirstApiKey();

  if (!apiKey) {
    showStatus("No API keys found. Create one in API Keys menu first.", "error");
    await pause();
    return;
  }

  const model = await selectModelFromList("Select Droid Model", "cc/claude-sonnet-4-5-20250929", { excludeCombos: true });
  if (!model) return;

  const result = await api.applyCliToolSettings("droid", { baseUrl: endpoint, apiKey, model });
  showStatus(result.success ? "Factory Droid setup completed!" : `Failed: ${result.error}`, result.success ? "success" : "error");
  await pause();
}

/**
 * Reset Factory Droid settings
 */
async function droidReset() {
  const result = await api.resetCliToolSettings("droid");
  showStatus(result.success ? "Factory Droid settings reset!" : `Failed: ${result.error}`, result.success ? "success" : "error");
  await pause();
}

/**
 * Factory Droid submenu
 * @param {number} port
 * @param {Array<string>} breadcrumb
 */
async function showDroidMenu(port, breadcrumb = []) {
  await showMenuWithBack({
    title: "🤖 Factory Droid Settings",
    breadcrumb,
    headerContent: buildDroidHeader,
    refresh: async () => ({}),
    items: [
      {
        label: "⚡ Quick Setup",
        action: async () => { await droidQuickSetup(port); return true; }
      },
      {
        label: "Reset to Default",
        action: async () => { await droidReset(); return true; }
      }
    ]
  });
}

// ─── Open Claw ────────────────────────────────────────────────────────────────

/**
 * Build header showing current OpenClaw config status
 * @returns {Promise<string>}
 */
async function buildOpenClawHeader() {
  const result = await api.getCliToolSettings("openclaw");
  if (!result.success) return `  ${COLORS.red}Failed to load settings${COLORS.reset}`;

  const { installed, hasPolyRouter, settings } = result.data;
  if (!installed) return `Status:   ${COLORS.red}✗ Open Claw not installed${COLORS.reset}`;

  if (!hasPolyRouter) {
    return [
      `Status:   ${COLORS.red}✗ Not configured${COLORS.reset}`,
      `${COLORS.dim}Run "Quick Setup" to configure${COLORS.reset}`
    ].join("\n");
  }

  // Extract PolyRouter provider config
  const provider = settings?.models?.providers?.["polyrouter"];
  const primary = settings?.agents?.defaults?.model?.primary || "";
  const model = primary.startsWith("polyrouter/") ? primary.replace("polyrouter/", "") : (provider?.models?.[0]?.id || "");
  const lines = [`Status:   ${COLORS.green}✓ Configured${COLORS.reset}`];
  if (provider?.baseUrl) lines.push(`Endpoint: ${COLORS.cyan}${provider.baseUrl}${COLORS.reset}`);
  if (model)             lines.push(`Model:    ${COLORS.dim}${model}${COLORS.reset}`);
  return lines.join("\n");
}

/**
 * Quick setup for Open Claw
 * @param {number} port
 */
async function openClawQuickSetup(port) {
  const { endpoint } = await getEndpoint(port);
  const apiKey = await getFirstApiKey();

  if (!apiKey) {
    showStatus("No API keys found. Create one in API Keys menu first.", "error");
    await pause();
    return;
  }

  const model = await selectModelFromList("Select OpenClaw Model", "cc/claude-sonnet-4-5-20250929", { excludeCombos: true });
  if (!model) return;

  const result = await api.applyCliToolSettings("openclaw", { baseUrl: endpoint, apiKey, model });
  showStatus(result.success ? "Open Claw setup completed!" : `Failed: ${result.error}`, result.success ? "success" : "error");
  await pause();
}

/**
 * Reset Open Claw settings
 */
async function openClawReset() {
  const result = await api.resetCliToolSettings("openclaw");
  showStatus(result.success ? "Open Claw settings reset!" : `Failed: ${result.error}`, result.success ? "success" : "error");
  await pause();
}

/**
 * Open Claw submenu
 * @param {number} port
 * @param {Array<string>} breadcrumb
 */
async function showOpenClawMenu(port, breadcrumb = []) {
  await showMenuWithBack({
    title: "🦞 Open Claw Settings",
    breadcrumb,
    headerContent: buildOpenClawHeader,
    refresh: async () => ({}),
    items: [
      {
        label: "⚡ Quick Setup",
        action: async () => { await openClawQuickSetup(port); return true; }
      },
      {
        label: "Reset to Default",
        action: async () => { await openClawReset(); return true; }
      }
    ]
  });
}

// ─── OpenCode CLI ─────────────────────────────────────────────────────────────

async function buildOpenCodeHeader() {
  const result = await api.getCliToolSettings("opencode");
  if (!result.success) return `  ${COLORS.red}Failed to load settings${COLORS.reset}`;

  const { installed, hasPolyRouter, opencode } = result.data;
  if (!installed) return `Status:   ${COLORS.red}✗ OpenCode CLI not installed${COLORS.reset}`;

  if (!hasPolyRouter) {
    return [
      `Status:   ${COLORS.red}✗ Not configured${COLORS.reset}`,
      `${COLORS.dim}Run "Quick Setup" to configure${COLORS.reset}`
    ].join("\n");
  }

  const lines = [`Status:   ${COLORS.green}✓ Configured${COLORS.reset}`];
  if (opencode?.baseURL) lines.push(`Endpoint: ${COLORS.cyan}${opencode.baseURL}${COLORS.reset}`);
  if (opencode?.activeModel) lines.push(`Active:   ${COLORS.dim}${opencode.activeModel}${COLORS.reset}`);
  if (Array.isArray(opencode?.models) && opencode.models.length > 0) {
    lines.push(`Models:   ${COLORS.dim}${opencode.models.join(", ")}${COLORS.reset}`);
  }
  return lines.join("\n");
}

async function openCodeQuickSetup(port) {
  const { endpoint } = await getEndpoint(port);
  const apiKey = await getFirstApiKey();

  if (!apiKey) {
    showStatus("No API keys found. Create one in API Keys menu first.", "error");
    await pause();
    return;
  }

  // Pick first model (also becomes active model by default)
  const firstModel = await selectModelFromList("Select Active Model (OpenCode)", "", { excludeCombos: true });
  if (!firstModel) return;

  const models = [firstModel];

  // Optionally add more models
  while (true) {
    const more = await confirm(`Add another model? (current: ${models.length})`);
    if (!more) break;
    const next = await selectModelFromList(`Add Model #${models.length + 1}`, models.join(", "), { excludeCombos: true });
    if (!next) break;
    if (!models.includes(next)) models.push(next);
  }

  // Optional subagent model
  let subagentModel = firstModel;
  const wantSubagent = await confirm(`Set a different subagent model? (default: ${firstModel})`);
  if (wantSubagent) {
    const picked = await selectModelFromList("Select Subagent Model", firstModel, { excludeCombos: true });
    if (picked) subagentModel = picked;
  }

  const result = await api.applyCliToolSettings("opencode", {
    baseUrl: endpoint,
    apiKey,
    models,
    activeModel: firstModel,
    subagentModel,
  });
  showStatus(result.success ? "OpenCode setup completed!" : `Failed: ${result.error}`, result.success ? "success" : "error");
  await pause();
}

async function openCodeReset() {
  const result = await api.resetCliToolSettings("opencode");
  showStatus(result.success ? "OpenCode settings reset!" : `Failed: ${result.error}`, result.success ? "success" : "error");
  await pause();
}

async function showOpenCodeMenu(port, breadcrumb = []) {
  await showMenuWithBack({
    title: "💻 OpenCode CLI Settings",
    breadcrumb,
    headerContent: buildOpenCodeHeader,
    refresh: async () => ({}),
    items: [
      { label: "⚡ Quick Setup", action: async () => { await openCodeQuickSetup(port); return true; } },
      { label: "Reset to Default", action: async () => { await openCodeReset(); return true; } }
    ]
  });
}

// ─── Hermes Agent ─────────────────────────────────────────────────────────────

async function buildHermesHeader() {
  const result = await api.getCliToolSettings("hermes");
  if (!result.success) return `  ${COLORS.red}Failed to load settings${COLORS.reset}`;

  const { installed, hasPolyRouter, settings } = result.data;
  if (!installed) return `Status:   ${COLORS.red}✗ Hermes Agent not installed${COLORS.reset}`;

  if (!hasPolyRouter) {
    return [
      `Status:   ${COLORS.red}✗ Not configured${COLORS.reset}`,
      `${COLORS.dim}Run "Quick Setup" to configure${COLORS.reset}`
    ].join("\n");
  }

  const model = settings?.model || {};
  const lines = [`Status:   ${COLORS.green}✓ Configured${COLORS.reset}`];
  if (model.base_url) lines.push(`Endpoint: ${COLORS.cyan}${model.base_url}${COLORS.reset}`);
  if (model.default)  lines.push(`Model:    ${COLORS.dim}${model.default}${COLORS.reset}`);
  return lines.join("\n");
}

async function hermesQuickSetup(port) {
  const { endpoint } = await getEndpoint(port);
  const apiKey = await getFirstApiKey();

  if (!apiKey) {
    showStatus("No API keys found. Create one in API Keys menu first.", "error");
    await pause();
    return;
  }

  const model = await selectModelFromList("Select Hermes Model", "", { excludeCombos: true });
  if (!model) return;

  const result = await api.applyCliToolSettings("hermes", { baseUrl: endpoint, apiKey, model });
  showStatus(result.success ? "Hermes setup completed!" : `Failed: ${result.error}`, result.success ? "success" : "error");
  await pause();
}

async function hermesReset() {
  const result = await api.resetCliToolSettings("hermes");
  showStatus(result.success ? "Hermes settings reset!" : `Failed: ${result.error}`, result.success ? "success" : "error");
  await pause();
}

async function showHermesMenu(port, breadcrumb = []) {
  await showMenuWithBack({
    title: "⚡ Hermes Agent Settings",
    breadcrumb,
    headerContent: buildHermesHeader,
    refresh: async () => ({}),
    items: [
      { label: "⚡ Quick Setup", action: async () => { await hermesQuickSetup(port); return true; } },
      { label: "Reset to Default", action: async () => { await hermesReset(); return true; } }
    ]
  });
}

// ─── Main CLI Tools Menu ──────────────────────────────────────────────────────

/**
 * Main CLI Tools menu
 * @param {number} port
 * @param {Array<string>} breadcrumb
 */
async function showCliToolsMenu(port, breadcrumb = []) {
  const { endpoint } = await getEndpoint(port);
  await showMenuWithBack({
    title: "🔧 CLI Tools",
    breadcrumb,
    headerContent: `Configure CLI tools to use PolyRouter\nEndpoint: ${endpoint}`,
    items: [
      {
        label: "Claude Code",
        action: async () => { await showClaudeCodeMenu(port, [...breadcrumb, "Claude Code"]); return true; }
      },
      {
        label: "Codex CLI",
        action: async () => { await showCodexMenu(port, [...breadcrumb, "Codex CLI"]); return true; }
      },
      {
        label: "Factory Droid",
        action: async () => { await showDroidMenu(port, [...breadcrumb, "Factory Droid"]); return true; }
      },
      {
        label: "Open Claw",
        action: async () => { await showOpenClawMenu(port, [...breadcrumb, "Open Claw"]); return true; }
      },
      {
        label: "OpenCode",
        action: async () => { await showOpenCodeMenu(port, [...breadcrumb, "OpenCode"]); return true; }
      },
      {
        label: "Hermes",
        action: async () => { await showHermesMenu(port, [...breadcrumb, "Hermes"]); return true; }
      }
    ]
  });
}

module.exports = { showCliToolsMenu };
