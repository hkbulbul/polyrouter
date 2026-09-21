import crypto from "crypto";
import os from "os";
import path from "path";
import { parseDocument } from "yaml";

export const DSH_COMMAND = "dsh";
export const DSH_PACKAGE = "@deepseek-ai/dsh";
export const DSH_PROVIDER_ID = "polyrouter";
export const DSH_CREDENTIAL_REF = "POLYROUTER_API_KEY";
export const DSH_SETTINGS_NAMESPACE = "llm-pi-ai";
export const DSH_DEFAULT_MODEL_NAMESPACE = "agent-default-model";
export const DSH_SETTINGS_FILENAME = "settings.yaml";
export const DSH_CREDENTIALS_FILENAME = ".credentials.yaml";
export const DSH_METADATA_FILENAME = ".polyrouter-deepseek-harness.json";

const DEFAULT_CONTEXT_WINDOW = 262144;
const DEFAULT_MAX_TOKENS = 32768;
const MAX_MODEL_LENGTH = 256;

export class HarnessConfigError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "HarnessConfigError";
    this.code = code;
    this.details = details;
  }
}

const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);
const hasControlCharacters = (value) => /[\u0000-\u001f\x7f]/.test(value);


export function expandHomePath(value, home = os.homedir()) {
  const text = String(value || "");
  if (text === "~") return home;
  if (text.startsWith("~/") || text.startsWith("~\\")) return path.join(home, text.slice(2));
  return text;
}

export function resolveDshHome(env = process.env, cwd = process.cwd(), platform = process.platform) {
  const configured = typeof env?.DSH_HOME === "string" && env.DSH_HOME.trim()
    ? env.DSH_HOME.trim()
    : path.join(os.homedir(), ".dsh");
  const expanded = expandHomePath(configured);
  return path.resolve(cwd, expanded);
}

export function getDshPaths(env = process.env, cwd = process.cwd()) {
  const dshHome = resolveDshHome(env, cwd);
  return {
    dshHome,
    settingsPath: path.join(dshHome, DSH_SETTINGS_FILENAME),
    credentialsPath: path.join(dshHome, DSH_CREDENTIALS_FILENAME),
    metadataPath: path.join(dshHome, DSH_METADATA_FILENAME),
    lockPath: path.join(dshHome, `${DSH_METADATA_FILENAME}.lock`),
  };
}

const readEnvValue = (env, name) => {
  const entry = Object.entries(env || {}).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return typeof entry?.[1] === "string" ? entry[1].trim() : "";
};

const uniquePathEntries = (entries, platform) => {
  const seen = new Set();
  const result = [];
  for (const entry of entries) {
    const value = String(entry || "").trim();
    if (!value) continue;
    const key = platform === "win32" ? value.toLowerCase() : value;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
};

/**
 * Return the executable names npm may expose for dsh on this platform.
 * Windows npm installs normally create a .cmd shim, not a bare executable.
 */
export function getDshExecutableNames(platform = process.platform) {
  return platform === "win32"
    ? [`${DSH_COMMAND}.cmd`, `${DSH_COMMAND}.exe`, DSH_COMMAND]
    : [DSH_COMMAND];
}

/**
 * Build a PATH for CLI detection. GUI-launched Node processes on Windows can
 * miss the user's npm global bin directory even though the shell can run dsh.
 */
export function getDshSearchPathEntries({ env = process.env, platform = process.platform, home = os.homedir() } = {}) {
  const pathApi = platform === "win32" ? path.win32 : path.posix;
  const delimiter = platform === "win32" ? ";" : ":";
  const inherited = readEnvValue(env, "PATH").split(delimiter).filter(Boolean);
  const additional = [];
  const add = (value) => { if (value) additional.push(value); };
  const prefix = readEnvValue(env, "npm_config_prefix");
  const pnpmHome = readEnvValue(env, "PNPM_HOME");

  if (platform === "win32") {
    const appData = readEnvValue(env, "APPDATA") || pathApi.join(home, "AppData", "Roaming");
    const localAppData = readEnvValue(env, "LOCALAPPDATA") || pathApi.join(home, "AppData", "Local");
    add(pathApi.join(appData, "npm"));
    add(pathApi.join(localAppData, "npm"));
    add(pathApi.join(localAppData, "pnpm"));
    add(pnpmHome);
    if (prefix) {
      add(prefix);
      add(pathApi.join(prefix, "bin"));
      add(pathApi.join(prefix, "node_modules", ".bin"));
    }
  } else {
    add(pnpmHome);
    if (prefix) {
      add(pathApi.join(prefix, "bin"));
      add(pathApi.join(prefix, "node_modules", ".bin"));
    }
    add(pathApi.join(home, ".npm-global", "bin"));
  }

  return uniquePathEntries([...inherited, ...additional], platform);
}

export function getDshExecutableCandidates(options = {}) {
  const { platform = process.platform } = options;
  const pathApi = platform === "win32" ? path.win32 : path.posix;
  const names = getDshExecutableNames(platform);
  return getDshSearchPathEntries(options).flatMap((directory) => names.map((name) => pathApi.join(directory, name)));
}

export function normalizeBaseUrl(value) {
  if (typeof value !== "string") throw new HarnessConfigError("INVALID_BASE_URL", "A base URL is required.");
  const raw = value.trim();
  if (!raw || hasControlCharacters(raw)) throw new HarnessConfigError("INVALID_BASE_URL", "The base URL is invalid.");
  let parsed;
  try { parsed = new URL(raw); } catch { throw new HarnessConfigError("INVALID_BASE_URL", "The base URL is invalid."); }
  if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new HarnessConfigError("INVALID_BASE_URL", "The base URL must be an HTTP(S) URL without credentials, query, or fragment.");
  }
  const host = parsed.hostname.toLowerCase();
  const local = host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1" || host === "0.0.0.0";
  if (parsed.protocol === "http:" && !local) {
    throw new HarnessConfigError("INSECURE_REMOTE_HTTP", "Remote Harness endpoints must use HTTPS.");
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  if (!parsed.pathname.endsWith("/v1")) parsed.pathname = `${parsed.pathname}/v1`;
  parsed.pathname = parsed.pathname.replace(/\/+/g, "/");
  return parsed.toString().replace(/\/$/, "");
}

export function validateModel(value) {
  if (typeof value !== "string") throw new HarnessConfigError("INVALID_MODEL", "A model is required.");
  const model = value.trim();
  if (!model || model.length > MAX_MODEL_LENGTH || hasControlCharacters(model)) {
    throw new HarnessConfigError("INVALID_MODEL", "The selected model is invalid.");
  }
  return model;
}

export function validateApiKey(value) {
  if (typeof value !== "string" || !value.trim() || hasControlCharacters(value)) {
    throw new HarnessConfigError("INVALID_CREDENTIAL", "The API key is invalid.");
  }
  const key = value.trim();
  if (!/^[\x21-\x7e]+$/.test(key)) throw new HarnessConfigError("INVALID_CREDENTIAL", "The API key is invalid.");
  return key;
}

export function normalizeModels(models, fallbackModel = null) {
  const source = Array.isArray(models) ? models : fallbackModel == null ? [] : [fallbackModel];
  const normalized = [];
  const seen = new Set();
  for (const value of source) {
    const model = validateModel(value);
    if (seen.has(model)) continue;
    seen.add(model);
    normalized.push(model);
  }
  if (normalized.length === 0) {
    throw new HarnessConfigError("INVALID_MODEL", "At least one model is required.");
  }
  return normalized;
}

export function buildProviderRoute({ baseUrl, model, models, existing = null, contextWindow, maxTokens }) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const selectedModels = normalizeModels(models, model);
  const existingModels = Array.isArray(existing?.models) ? existing.models : [];
  return {
    ...(isObject(existing) ? existing : {}),
    displayName: "PolyRouter",
    apiKeyEnv: DSH_CREDENTIAL_REF,
    api: "openai-completions",
    baseURL: normalizedBaseUrl,
    compat: { ...(isObject(existing?.compat) ? existing.compat : {}), thinkingFormat: "deepseek" },
    models: selectedModels.map((selectedModel) => {
      const existingModel = existingModels.find((entry) => entry && entry.id === selectedModel);
      return {
        ...(isObject(existingModel) ? existingModel : {}),
        id: selectedModel,
        name: existingModel?.name || selectedModel,
        contextWindow: Number.isFinite(Number(contextWindow)) && Number(contextWindow) > 0 ? Math.floor(Number(contextWindow)) : (existingModel?.contextWindow || DEFAULT_CONTEXT_WINDOW),
        maxTokens: Number.isFinite(Number(maxTokens)) && Number(maxTokens) > 0 ? Math.floor(Number(maxTokens)) : (existingModel?.maxTokens || DEFAULT_MAX_TOKENS),
      };
    }),
  };
}

function parseDocumentStrict(text, filename, defaultValue) {
  if (text == null || text.trim() === "") return { doc: parseDocument("{}"), value: defaultValue, exists: false };
  let doc;
  try { doc = parseDocument(text, { uniqueKeys: true }); } catch (error) {
    throw new HarnessConfigError(filename === "credentials" ? "INVALID_CREDENTIALS" : "INVALID_SETTINGS", `The Harness ${filename} file is invalid.`);
  }
  if (doc.errors?.length) throw new HarnessConfigError(filename === "credentials" ? "INVALID_CREDENTIALS" : "INVALID_SETTINGS", `The Harness ${filename} file is invalid.`);
  const value = doc.toJS({ maxAliasCount: 100 });
  if (!isObject(value)) throw new HarnessConfigError(filename === "credentials" ? "INVALID_CREDENTIALS" : "INVALID_SETTINGS", `The Harness ${filename} file must contain a mapping.`);
  return { doc, value, exists: true };
}

export function parseHarnessSettings(text = "") {
  return parseDocumentStrict(text, "settings", {});
}

export function parseHarnessCredentials(text = "") {
  const parsed = parseDocumentStrict(text, "credentials", { version: 1, refs: {}, records: {} });
  if (!parsed.exists) return parsed;
  const { value } = parsed;
  const refs = value.refs === undefined ? {} : value.refs;
  const records = value.records === undefined ? {} : value.records;
  if (value.version !== 1 || !isObject(refs) || !isObject(records)) {
    throw new HarnessConfigError("INVALID_CREDENTIALS", "The Harness credentials file must use version 1 with mapping sections.");
  }
  for (const [ref, credential] of Object.entries(refs)) {
    if (typeof ref !== "string" || !/^[A-Z][A-Z0-9_]*$/.test(ref) || typeof credential !== "string" || !credential.trim()) {
      throw new HarnessConfigError("INVALID_CREDENTIALS", "The Harness credentials file contains an invalid reference.");
    }
  }
  return { ...parsed, value: { ...value, refs, records } };
}

export function parseHarnessMetadata(text = "") {
  if (!text || !text.trim()) return { value: null, exists: false };
  try {
    const value = JSON.parse(text);
    return { value: isObject(value) ? value : null, exists: true };
  } catch {
    throw new HarnessConfigError("INVALID_METADATA", "The PolyRouter Harness metadata file is invalid.");
  }
}

function routeFromValue(value) {
  return value?.[DSH_SETTINGS_NAMESPACE]?.providers?.[DSH_PROVIDER_ID] || null;
}

function defaultFromValue(value) {
  return value?.[DSH_DEFAULT_MODEL_NAMESPACE] || null;
}

export function isCompatibleProvider(route) {
  return isObject(route)
    && route.api === "openai-completions"
    && route.apiKeyEnv === DSH_CREDENTIAL_REF
    && typeof route.baseURL === "string"
    && Array.isArray(route.models)
    && route.models.length > 0;
}

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function revisionFor({ settingsText = "", credentialsText = "", metadataText = "", paths = {} }) {
  return crypto.createHash("sha256").update(JSON.stringify({ settingsText, credentialsText, metadataText, paths })).digest("hex");
}

export function inspectHarnessConfig({ settingsText = "", credentialsText = "", metadataText = "", env = process.env, paths = getDshPaths(env) }) {
  const settings = parseHarnessSettings(settingsText);
  const credentials = parseHarnessCredentials(credentialsText);
  const metadata = parseHarnessMetadata(metadataText);
  const provider = routeFromValue(settings.value);
  const defaultModel = defaultFromValue(settings.value);
  const owned = Boolean(metadata.value?.managed && metadata.value?.providerId === DSH_PROVIDER_ID);
  const compatible = isCompatibleProvider(provider);
  const collision = Boolean(provider && (!compatible || !owned));
  const inherited = typeof env?.[DSH_CREDENTIAL_REF] === "string" && env[DSH_CREDENTIAL_REF].trim() !== "";
  const stored = typeof credentials.value.refs?.[DSH_CREDENTIAL_REF] === "string" && credentials.value.refs[DSH_CREDENTIAL_REF].length > 0;
  const models = Array.isArray(provider?.models) ? provider.models.map((entry) => entry?.id).filter(Boolean) : [];
  const model = models[0] || null;
  const state = {
    hasPolyRouter: Boolean(provider),
    compatible,
    collision,
    drift: Boolean(
      owned
      && (
        !provider
        || !metadata.value?.managedProviderDigest
        || metadata.value.managedProviderDigest !== digest(provider)
      )
    ),
    configured: compatible && Boolean(model),
    provider: provider ? DSH_PROVIDER_ID : null,
    baseUrl: typeof provider?.baseURL === "string" ? provider.baseURL : null,
    model,
    models,
    defaultModel: defaultModel && typeof defaultModel === "object" ? { provider: defaultModel.provider || null, model: defaultModel.model || null } : null,
    credentialRef: provider?.apiKeyEnv === DSH_CREDENTIAL_REF ? DSH_CREDENTIAL_REF : null,
    credentialConfigured: inherited || stored,
    credentialSource: inherited ? "environment" : stored ? "file" : "missing",
    settingsPath: paths.settingsPath,
    credentialsPath: paths.credentialsPath,
    dshHome: paths.dshHome,
    revision: revisionFor({ settingsText, credentialsText, metadataText, paths }),
    warnings: [],
  };
  if (inherited) state.warnings.push("POLYROUTER_API_KEY is supplied by the environment and takes precedence over the Harness credentials file.");
  if (state.collision) state.warnings.push("A different polyrouter provider configuration exists; review it before applying or resetting.");
  if (state.drift) state.warnings.push("The managed provider changed outside PolyRouter; reset is disabled until it is reviewed.");
  return state;
}

function ensureMap(doc, key) {
  if (!isObject(doc.get(key)?.toJSON?.() ?? doc.get(key))) doc.set(key, {});
}

export function applyHarnessDocuments({ settingsText = "", credentialsText = "", metadataText = "", baseUrl, model, models, apiKey, credentialMode = "file", preserveCredential = false, env = process.env, paths = getDshPaths(env), contextWindow, maxTokens }) {
  const inheritedCredential = typeof env?.[DSH_CREDENTIAL_REF] === "string" && env[DSH_CREDENTIAL_REF].trim();
  const useEnvironmentCredential = credentialMode === "environment";
  if (useEnvironmentCredential && !inheritedCredential) {
    throw new HarnessConfigError("CREDENTIAL_ENVIRONMENT_MISSING", "POLYROUTER_API_KEY is not supplied by the environment that launched dsh.");
  }
  if (inheritedCredential && !useEnvironmentCredential) {
    throw new HarnessConfigError("CREDENTIAL_SHADOWED", "The credential reference is supplied by the environment that launched dsh.");
  }
  const settings = parseHarnessSettings(settingsText);
  const credentials = parseHarnessCredentials(credentialsText);
  const metadata = parseHarnessMetadata(metadataText);
  const current = routeFromValue(settings.value);
  const owned = Boolean(metadata.value?.managed && metadata.value?.providerId === DSH_PROVIDER_ID);
  if (current && (!owned || !isCompatibleProvider(current))) {
    throw new HarnessConfigError("PROVIDER_ID_CONFLICT", "An existing polyrouter provider is not managed by PolyRouter.");
  }
  if (
    owned
    && (
      !current
      || !metadata.value?.managedProviderDigest
      || metadata.value.managedProviderDigest !== digest(current)
    )
  ) {
    throw new HarnessConfigError(
      "CONFIG_DRIFT",
      "The managed Harness provider changed outside PolyRouter; review before applying or resetting."
    );
  }
  const normalizedModels = normalizeModels(models, model);
  const requestedDefault = model == null ? normalizedModels[0] : validateModel(model);
  if (!normalizedModels.includes(requestedDefault)) {
    throw new HarnessConfigError("INVALID_MODEL", "The default model must be included in the selected models.");
  }
  const selectedModels = [requestedDefault, ...normalizedModels.filter((entry) => entry !== requestedDefault)];
  const selectedModel = selectedModels[0];
  const route = buildProviderRoute({ baseUrl, models: selectedModels, existing: current, contextWindow, maxTokens });
  const storedCredential = credentials.value.refs?.[DSH_CREDENTIAL_REF];
  const selectedKey = apiKey == null || String(apiKey).trim() === "" ? null : validateApiKey(apiKey);
  if (!useEnvironmentCredential && !selectedKey && !storedCredential && !preserveCredential) {
    throw new HarnessConfigError("INVALID_CREDENTIAL", "An API key is required for a new Harness configuration.");
  }
  if (!useEnvironmentCredential && !selectedKey && preserveCredential && !storedCredential) {
    throw new HarnessConfigError("INVALID_CREDENTIAL", "No existing Harness credential is available to preserve.");
  }
  if (useEnvironmentCredential && selectedKey) {
    throw new HarnessConfigError("CREDENTIAL_SHADOWED", "The credential reference is supplied by the environment that launched dsh.");
  }
  const firstApply = !owned;
  const previousDefault = firstApply ? (settings.value[DSH_DEFAULT_MODEL_NAMESPACE] ?? null) : metadata.value?.previousDefault;
  settings.doc.setIn([DSH_SETTINGS_NAMESPACE, "providers", DSH_PROVIDER_ID], route);
  settings.doc.set(DSH_DEFAULT_MODEL_NAMESPACE, { provider: DSH_PROVIDER_ID, model: selectedModel });
  if (selectedKey) {
    credentials.doc.set("version", 1);
    const refs = credentials.doc.get("refs")?.toJSON?.() || {};
    const records = credentials.doc.get("records")?.toJSON?.() || {};
    credentials.doc.set("refs", { ...refs, [DSH_CREDENTIAL_REF]: selectedKey });
    credentials.doc.set("records", records);
  }
  const nextMetadata = {
    version: 1,
    managed: true,
    providerId: DSH_PROVIDER_ID,
    credentialRef: DSH_CREDENTIAL_REF,
    credentialSource: useEnvironmentCredential ? "environment" : "file",
    previousDefault,
    createdCredential: selectedKey && !storedCredential
      ? true
      : metadata.value?.createdCredential || false,
    lastCredentialSha256: selectedKey
      ? digest(selectedKey)
      : metadata.value?.lastCredentialSha256 || null,
    managedProviderDigest: digest(route),
  };
  return {
    settingsText: settings.doc.toString(),
    credentialsText: credentials.doc.toString(),
    metadataText: `${JSON.stringify(nextMetadata, null, 2)}\n`,
    metadata: nextMetadata,
    state: inspectHarnessConfig({ settingsText: settings.doc.toString(), credentialsText: credentials.doc.toString(), metadataText: JSON.stringify(nextMetadata), env, paths }),
  };
}

export function resetHarnessDocuments({ settingsText = "", credentialsText = "", metadataText = "", env = process.env, paths = getDshPaths(env) }) {
  const settings = parseHarnessSettings(settingsText);
  const credentials = parseHarnessCredentials(credentialsText);
  const metadata = parseHarnessMetadata(metadataText);
  const provider = routeFromValue(settings.value);
  const owned = Boolean(metadata.value?.managed && metadata.value?.providerId === DSH_PROVIDER_ID);
  if (provider && (!owned || !isCompatibleProvider(provider))) {
    throw new HarnessConfigError("PROVIDER_ID_CONFLICT", "The existing polyrouter provider is not managed by PolyRouter.");
  }
  if (
    owned
    && (
      !provider
      || !metadata.value?.managedProviderDigest
      || metadata.value.managedProviderDigest !== digest(provider)
    )
  ) {
    throw new HarnessConfigError(
      "CONFIG_DRIFT",
      "The managed Harness provider changed outside PolyRouter; review before applying or resetting."
    );
  }
  if (owned) {
    const providers = settings.doc.getIn([DSH_SETTINGS_NAMESPACE, "providers"])?.toJSON?.() || {};
    delete providers[DSH_PROVIDER_ID];
    settings.doc.setIn([DSH_SETTINGS_NAMESPACE, "providers"], providers);
  }
  const currentDefault = defaultFromValue(settings.value);
  if (owned && currentDefault?.provider === DSH_PROVIDER_ID && currentDefault?.model) {
    if (metadata.value?.previousDefault) settings.doc.set(DSH_DEFAULT_MODEL_NAMESPACE, metadata.value.previousDefault);
    else settings.doc.delete(DSH_DEFAULT_MODEL_NAMESPACE);
  }
  if (owned && metadata.value?.credentialSource !== "environment" && metadata.value?.createdCredential && credentials.value.refs?.[DSH_CREDENTIAL_REF]) {
    const currentHash = digest(credentials.value.refs[DSH_CREDENTIAL_REF]);
    if (currentHash === metadata.value.lastCredentialSha256) {
      const refs = credentials.doc.get("refs")?.toJSON?.() || {};
      delete refs[DSH_CREDENTIAL_REF];
      credentials.doc.set("refs", refs);
    }
  }
  return {
    settingsText: settings.doc.toString(),
    credentialsText: credentials.doc.toString(),
    metadataText: "",
    state: inspectHarnessConfig({ settingsText: settings.doc.toString(), credentialsText: credentials.doc.toString(), metadataText: "", env, paths }),
  };
}

export function redactHarnessError(error) {
  if (error instanceof HarnessConfigError) return { code: error.code, message: error.message };
  return { code: "INTERNAL_ERROR", message: "Failed to update DeepSeek Harness settings." };
}
