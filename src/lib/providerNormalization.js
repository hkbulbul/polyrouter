import { AI_PROVIDERS } from "../shared/constants/providers.js";

/**
 * Detect xAI Grok models by id pattern (grok-*, Grok_*, etc).
 * @param {string} modelId
 * @returns {boolean}
 */
export function isXaiModel(modelId) {
  return typeof modelId === "string" && /^grok[-_]/i.test(modelId.trim());
}

export function normalizeProviderId(provider) {
  if (typeof provider !== "string") return provider;

  const trimmed = provider.trim();
  if (AI_PROVIDERS[trimmed]) return trimmed;

  const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (AI_PROVIDERS[slug]) return slug;

  const providerByName = Object.values(AI_PROVIDERS).find(
    (entry) => entry.name?.toLowerCase() === trimmed.toLowerCase()
  );
  return providerByName?.id || trimmed;
}

const SENSITIVE_CONNECTION_FIELDS = [
  "apiKey", "accessToken", "refreshToken", "idToken",
];
const SENSITIVE_PROVIDER_DATA_FIELDS = ["sessionCookies", "browserProfileId", "browserChannel"];

export function stripManagedProviderData(providerSpecificData) {
  if (!providerSpecificData || typeof providerSpecificData !== "object" || Array.isArray(providerSpecificData)) {
    return providerSpecificData;
  }
  const safe = { ...providerSpecificData };
  for (const field of SENSITIVE_PROVIDER_DATA_FIELDS) delete safe[field];
  return safe;
}

export function sanitizeProviderConnection(connection) {
  if (!connection || typeof connection !== "object") return connection;
  const safe = { ...connection };
  for (const field of SENSITIVE_CONNECTION_FIELDS) delete safe[field];
  if (safe.providerSpecificData && typeof safe.providerSpecificData === "object") {
    safe.providerSpecificData = stripManagedProviderData(safe.providerSpecificData);
  }
  return safe;
}

export function normalizeProviderSpecificData(provider, body = {}, providerSpecificData = null) {
  const next = providerSpecificData && typeof providerSpecificData === "object"
    ? { ...providerSpecificData }
    : {};

  if (provider === "ollama-local") {
    const baseUrl = (
      next.baseUrl ||
      body.baseUrl ||
      body.baseURL ||
      body.ollamaHostUrl ||
      ""
    ).trim();

    if (baseUrl) next.baseUrl = baseUrl;
  }

  return Object.keys(next).length > 0 ? next : null;
}
