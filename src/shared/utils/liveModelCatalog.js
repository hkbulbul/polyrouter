const LIVE_MODEL_CATALOG_PROVIDERS = new Set(["cursor", "zed"]);

export function supportsLiveModelCatalog(providerId) {
  return LIVE_MODEL_CATALOG_PROVIDERS.has(providerId);
}
