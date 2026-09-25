const DEFAULT_TEMPLATE_SLUGS = ["gpt-5.5", "gpt-5.6-luna", "gpt-6-astra"];

export const CODEX_MODEL_SLOTS = Object.freeze([
  { id: "codex-astra", name: "Astra" },
  { id: "codex-sol", name: "Sol" },
  { id: "codex-terra", name: "Terra" },
  { id: "codex-luna", name: "Luna" },
]);

const CODEX_MODEL_SLOT_BY_ID = new Map(CODEX_MODEL_SLOTS.map(slot => [slot.id, slot]));

export function isCodexModelSlotId(modelId) {
  return CODEX_MODEL_SLOT_BY_ID.has(modelId);
}

export function isQualifiedCodexModelTarget(value) {
  if (typeof value !== "string") return false;
  const parts = value.trim().split("/");
  return parts.length >= 2 && parts.every(part => part.trim().length > 0);
}

const cloneModel = (model) => JSON.parse(JSON.stringify(model));

const getModelLeafId = (modelId) => modelId.split("/").at(-1);

const findModelTemplate = (models, modelId) => {
  const leafId = getModelLeafId(modelId);
  return models.find(model => model.slug === modelId)
    || models.find(model => model.slug === leafId)
    || null;
};

const findDefaultTemplate = (models) => {
  for (const slug of DEFAULT_TEMPLATE_SLUGS) {
    const model = models.find(candidate => candidate.slug === slug);
    if (model) return model;
  }

  return models.find(model => model.visibility === "list") || models[0] || null;
};

const getCustomPriorities = (baseModels, count) => {
  const numericPriorities = baseModels
    .map(model => model.priority)
    .filter(priority => Number.isFinite(priority));
  const firstPriority = numericPriorities.length > 0 ? Math.min(...numericPriorities) : 1;

  return Array.from({ length: count }, (_, index) => firstPriority - count + index);
};

const buildCustomModel = (template, modelId, priority, role, displayName, description) => {
  const model = cloneModel(template);

  model.slug = modelId;
  model.display_name = displayName;
  model.description = description;
  model.priority = priority;
  model.additional_speed_tiers = [];
  model.service_tiers = [];
  model.availability_nux = null;
  model.upgrade = null;
  model.comp_hash = null;

  return model;
};

export function isPolyRouterCatalogModel(model) {
  return isCodexModelSlotId(model?.slug)
    || (typeof model?.display_name === "string" && model.display_name.startsWith("PolyRouter · "));
}

export function buildCodexModelCatalog(baseCatalog, { model, subagentModel, catalogModels = [], modelSlots = {} }) {
  const baseModels = (Array.isArray(baseCatalog?.models) ? baseCatalog.models : [])
    .filter(baseModel => !isPolyRouterCatalogModel(baseModel));
  if (baseModels.length === 0) {
    throw new Error("Codex did not provide a usable model catalog");
  }

  const mainModelId = model?.trim();
  const extraModelIds = Array.isArray(catalogModels) ? catalogModels : [];
  const configuredSlotIds = CODEX_MODEL_SLOTS
    .filter(slot => typeof modelSlots?.[slot.id] === "string" && modelSlots[slot.id].trim())
    .map(slot => slot.id);
  const requestedModels = [...new Set([mainModelId, subagentModel || mainModelId, ...configuredSlotIds, ...extraModelIds]
    .map(modelId => typeof modelId === "string" ? modelId.trim() : "")
    .filter(Boolean))];
  const customModelIds = requestedModels.filter(modelId =>
    !baseModels.some(baseModel => baseModel.slug === modelId)
  );

  if (customModelIds.length === 0) {
    return {
      catalog: baseModels.length === baseCatalog.models.length ? baseCatalog : { ...baseCatalog, models: baseModels },
      customModelIds: [],
    };
  }

  const slots = customModelIds.map(modelId => CODEX_MODEL_SLOT_BY_ID.get(modelId) || null);
  const templates = customModelIds.map((modelId, index) => (
    findModelTemplate(baseModels, slots[index] ? modelSlots[modelId] : modelId)
  ));
  const fallbackTemplate = findDefaultTemplate(baseModels);
  const priorities = getCustomPriorities(baseModels, customModelIds.length);
  const customModels = customModelIds.map((modelId, index) => {
    const template = templates[index] || fallbackTemplate;
    if (!template) {
      throw new Error("Codex did not provide a model template for PolyRouter");
    }

    const slot = slots[index];
    const role = modelId === mainModelId
      ? "main"
      : modelId === subagentModel
        ? "subagent"
        : "picker";
    const displayName = slot ? slot.name : `PolyRouter · ${modelId}`;
    const description = slot
      ? `${slot.name} routes to ${modelSlots[modelId]}`
      : `Custom PolyRouter ${role} model: ${modelId}`;
    return buildCustomModel(template, modelId, priorities[index], role, displayName, description);
  });

  return {
    catalog: {
      ...baseCatalog,
      models: [...customModels, ...baseModels],
    },
    customModelIds,
  };
}
