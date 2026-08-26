import { getCapabilitiesForModel } from "../../open-sse/providers/capabilities.js";

export const COMMAND_CODE_MIN_BYOK_VERSION = "1.30.0";
export const COMMAND_CODE_PROVIDER_ID = "polyrouter";
export const COMMAND_CODE_ENV_KEY = "POLYROUTER_API_KEY";
export const COMMAND_CODE_MANAGED_FIELD = "polyrouterManaged";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export class CommandCodeConfigError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CommandCodeConfigError";
    this.code = code;
  }
}

const conflict = (code, message) => {
  throw new CommandCodeConfigError(code, message);
};

export function parseCommandCodeConfig(content = "{}") {
  let config;
  try {
    config = JSON.parse(content);
  } catch {
    conflict("INVALID_JSON", "Command Code providers.json contains invalid JSON");
  }
  if (!isPlainObject(config)) {
    conflict("INVALID_ROOT", "Command Code providers.json must contain a JSON object");
  }

  const hasProvider = Object.prototype.hasOwnProperty.call(config, "provider");
  const hasProviders = Object.prototype.hasOwnProperty.call(config, "providers");
  if (hasProvider && hasProviders) {
    conflict("AMBIGUOUS_PROVIDER_MAP", 'providers.json cannot contain both "provider" and "providers" maps');
  }

  const mapKey = hasProvider ? "provider" : hasProviders ? "providers" : "provider";
  if ((hasProvider || hasProviders) && !isPlainObject(config[mapKey])) {
    conflict("INVALID_PROVIDER_MAP", `providers.json "${mapKey}" must be an object map`);
  }

  return { config, mapKey, providerMap: config[mapKey] || {} };
}

const isLoopbackHostname = (hostname) => {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
};

export function normalizeCommandCodeBaseUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    conflict("INVALID_BASE_URL", "A PolyRouter base URL is required");
  }

  let url;
  try {
    url = new URL(value.trim());
  } catch {
    conflict("INVALID_BASE_URL", "PolyRouter base URL must be a valid HTTP(S) URL");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    conflict("INVALID_BASE_URL", "PolyRouter base URL must use HTTP or HTTPS");
  }
  if (url.username || url.password || url.search || url.hash) {
    conflict("INVALID_BASE_URL", "PolyRouter base URL cannot contain credentials, a query, or a fragment");
  }
  if (url.protocol === "http:" && !isLoopbackHostname(url.hostname)) {
    conflict("INSECURE_REMOTE_HTTP", "Remote PolyRouter base URLs must use HTTPS");
  }

  const pathname = url.pathname.replace(/\/+$/, "");
  url.pathname = pathname.endsWith("/v1") ? pathname : `${pathname}/v1`;
  return url.toString().replace(/\/$/, "");
}

const normalizeModel = (value) => {
  const model = typeof value === "string" ? value.trim() : "";
  if (!model || model.length > 512 || /[\x00-\x1f\x7f]/.test(model)) {
    conflict("INVALID_MODEL", "Every PolyRouter model ID must be a non-empty valid string");
  }
  return model;
};

const normalizeModels = (value) => {
  if (!Array.isArray(value) || value.length === 0) {
    conflict("INVALID_MODELS", "At least one PolyRouter model is required");
  }
  return [...new Set(value.map(normalizeModel))];
};

const isLoopbackUrl = (value) => isLoopbackHostname(new URL(value).hostname);

const isApiKeyReference = (value) =>
  typeof value === "string" && (
    /^\$[A-Za-z_][A-Za-z0-9_]*$/.test(value)
    || /^\{env:[A-Za-z_][A-Za-z0-9_]*\}$/.test(value)
    || /^!\S(?:.*\S)?$/.test(value)
  );

const hasValidHeaders = (entry) => {
  if (entry.headers === undefined) return false;
  return isPlainObject(entry.headers)
    && Object.keys(entry.headers).length > 0
    && Object.entries(entry.headers).every(([name, value]) => name.trim() && typeof value === "string");
};

const authModeFor = (entry) => {
  if (entry.headers !== undefined) return hasValidHeaders(entry) ? "custom" : "invalid";
  if (entry.apiKey === false) return "keyless";
  if (entry.apiKey === `$${COMMAND_CODE_ENV_KEY}`) return "environment";
  if (isApiKeyReference(entry.apiKey)) return "custom";
  return "invalid";
};

const normalizeAuthMode = (value, baseURL, ownership) => {
  if (value === "preserve") {
    if (!ownership.owned || authModeFor(ownership.entry) !== "custom") {
      conflict("INVALID_AUTH_MODE", "Custom authentication can only be preserved from an existing PolyRouter provider");
    }

    let previousBaseURL;
    try {
      previousBaseURL = normalizeCommandCodeBaseUrl(ownership.entry.baseURL);
    } catch {
      conflict("INVALID_AUTH_MODE", "Custom authentication cannot be preserved with an invalid existing base URL");
    }
    if (previousBaseURL !== baseURL) {
      conflict("INVALID_AUTH_MODE", "Choose authentication again after changing the PolyRouter base URL");
    }
    return value;
  }

  if (value !== "keyless" && value !== "environment") {
    conflict("INVALID_AUTH_MODE", 'authMode must be "keyless", "environment", or valid "preserve"');
  }
  if (value === "keyless" && !isLoopbackUrl(baseURL)) {
    conflict("REMOTE_KEY_REQUIRED", "Remote PolyRouter endpoints require POLYROUTER_API_KEY authentication");
  }
  return value;
};

const isManagedProvider = (entry) =>
  isPlainObject(entry)
  && entry[COMMAND_CODE_MANAGED_FIELD] === true
  && entry.api === "openai-completions"
  && typeof entry.baseURL === "string"
  && isPlainObject(entry.models);

const inspectEntry = (providerMap) => {
  const entry = providerMap[COMMAND_CODE_PROVIDER_ID];
  if (entry === undefined) return { entry: null, owned: false, collision: false };
  const owned = isManagedProvider(entry);
  return { entry, owned, collision: !owned };
};

export function inspectCommandCodeConfig(content = "{}") {
  const { mapKey, providerMap } = parseCommandCodeConfig(content);
  const ownership = inspectEntry(providerMap);
  if (!ownership.owned) {
    return {
      mapKey,
      hasPolyRouter: false,
      collision: ownership.collision,
      settings: null,
      warnings: [],
    };
  }

  let baseUrl = "";
  let baseUrlValid = true;
  const warnings = [];
  try {
    baseUrl = normalizeCommandCodeBaseUrl(ownership.entry.baseURL);
  } catch {
    baseUrlValid = false;
    warnings.push("The existing PolyRouter base URL is unsafe or invalid and was not returned.");
  }
  const authMode = authModeFor(ownership.entry);
  if (authMode === "invalid") {
    warnings.push("The existing PolyRouter authentication is invalid and cannot be preserved.");
  }
  return {
    mapKey,
    hasPolyRouter: true,
    collision: false,
    settings: {
      baseUrl,
      baseUrlValid,
      models: Object.keys(isPlainObject(ownership.entry.models) ? ownership.entry.models : {}),
      authMode,
      disabled: ownership.entry.disabled === true || ownership.entry.enabled === false,
    },
    warnings,
  };
}

const getModelCapabilities = (model) => {
  const slash = model.indexOf("/");
  const provider = slash > 0 ? model.slice(0, slash) : null;
  const modelId = slash > 0 ? model.slice(slash + 1) : model;
  return getCapabilitiesForModel(provider, modelId);
};

export function applyCommandCodeConfig(content = "{}", input = {}) {
  const { config, mapKey, providerMap } = parseCommandCodeConfig(content);
  const ownership = inspectEntry(providerMap);
  if (ownership.collision) {
    conflict("PROVIDER_ID_CONFLICT", 'The provider ID "polyrouter" is already owned by another configuration');
  }

  const baseURL = normalizeCommandCodeBaseUrl(input.baseUrl);
  const models = normalizeModels(input.models);
  const authMode = normalizeAuthMode(input.authMode, baseURL, ownership);
  const previous = ownership.owned ? ownership.entry : {};
  const previousModels = isPlainObject(previous.models) ? previous.models : {};
  const previousHeaders = previous.headers;
  const activePrevious = { ...previous };
  delete activePrevious.headers;
  delete activePrevious.disabled;
  delete activePrevious.enabled;
  const nextModels = Object.fromEntries(models.map((model) => {
    if (isPlainObject(previousModels[model])) return [model, previousModels[model]];
    const capabilities = getModelCapabilities(model);
    return [model, {
      name: model,
      contextWindow: capabilities.contextWindow,
      maxOutput: capabilities.maxOutput,
      reasoning: capabilities.reasoning,
    }];
  }));

  const entry = {
    ...activePrevious,
    name: "PolyRouter",
    api: "openai-completions",
    [COMMAND_CODE_MANAGED_FIELD]: true,
    baseURL,
    ...(authMode === "preserve"
      ? (previousHeaders === undefined ? {} : { headers: previousHeaders })
      : { apiKey: authMode === "keyless" ? false : `$${COMMAND_CODE_ENV_KEY}` }),
    models: nextModels,
  };
  const nextConfig = {
    ...config,
    [mapKey]: { ...providerMap, [COMMAND_CODE_PROVIDER_ID]: entry },
  };

  return {
    content: `${JSON.stringify(nextConfig, null, 2)}\n`,
    config: nextConfig,
    mapKey,
    entry,
    operation: ownership.owned ? "update" : "create",
  };
}

export function adoptCommandCodeConfig(content = "{}") {
  const { config, mapKey, providerMap } = parseCommandCodeConfig(content);
  const ownership = inspectEntry(providerMap);
  if (!ownership.collision || !isPlainObject(ownership.entry)) {
    conflict("PROVIDER_NOT_FOUND", 'No markerless "polyrouter" provider is available to adopt');
  }
  if (ownership.entry[COMMAND_CODE_MANAGED_FIELD] !== undefined) {
    conflict("INVALID_OWNERSHIP_MARKER", "Only a markerless polyrouter provider can be adopted");
  }
  if (ownership.entry.api !== "openai-completions"
    || typeof ownership.entry.baseURL !== "string"
    || !isPlainObject(ownership.entry.models)) {
    conflict("INVALID_PROVIDER", "The existing polyrouter provider is not a valid OpenAI-compatible configuration");
  }

  const nextConfig = {
    ...config,
    [mapKey]: {
      ...providerMap,
      [COMMAND_CODE_PROVIDER_ID]: {
        ...ownership.entry,
        [COMMAND_CODE_MANAGED_FIELD]: true,
      },
    },
  };
  return {
    content: `${JSON.stringify(nextConfig, null, 2)}\n`,
    config: nextConfig,
    mapKey,
  };
}

export function resetCommandCodeConfig(content = "{}") {
  const { config, mapKey, providerMap } = parseCommandCodeConfig(content);
  const ownership = inspectEntry(providerMap);
  if (ownership.collision) {
    conflict("PROVIDER_ID_CONFLICT", 'The provider ID "polyrouter" is not owned by PolyRouter');
  }
  if (!ownership.owned) {
    return { content, config, mapKey, changed: false };
  }

  const nextMap = { ...providerMap };
  delete nextMap[COMMAND_CODE_PROVIDER_ID];
  const nextConfig = { ...config, [mapKey]: nextMap };
  return {
    content: `${JSON.stringify(nextConfig, null, 2)}\n`,
    config: nextConfig,
    mapKey,
    changed: true,
  };
}

export function isCommandCodeVersionSupported(version, minimum = COMMAND_CODE_MIN_BYOK_VERSION) {
  const numericParts = (value) => {
    if (typeof value !== "string") return null;
    const match = value.trim().match(/^(\d+)\.(\d+)\.(\d+)(-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/);
    return match ? { parts: match.slice(1, 4).map(Number), prerelease: Boolean(match[4]) } : null;
  };
  const current = numericParts(version);
  const required = numericParts(minimum);
  if (!current || !required) return false;
  for (let index = 0; index < 3; index += 1) {
    if (current.parts[index] !== required.parts[index]) {
      return current.parts[index] > required.parts[index];
    }
  }
  return !current.prerelease || required.prerelease;
}
