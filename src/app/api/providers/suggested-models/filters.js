// Free OpenCode models that don't use the "-free" id suffix
const KNOWN_FREE_OPENCODE_MODELS = ["big-pickle"];

export const FILTERS = {
  freemodel: (models) =>
    models.map((m) => ({
      id: m.id,
      name: m.name || m.id,
    })),

  zenmux: (models) =>
    models.map((m) => ({
      id: m.id,
      name: m.display_name || m.name || m.id,
      contextLength: m.context_length,
    })),

  explabs: (items) =>
    (Array.isArray(items) ? items : []).map((item) => {
      const m = item?.model || item;
      return {
        id: m.slug || m.id,
        name: m.display_name || m.name || m.slug || m.id,
        contextLength: m.context_window || m.contextLength,
      };
    }),

  experiential: (items) => FILTERS.explabs(items),

  "openrouter-free": (models) =>
    models
      .filter(
        (m) =>
          m.pricing?.prompt === "0" &&
          m.pricing?.completion === "0" &&
          m.context_length >= 200000
      )
      .map((m) => ({ id: m.id, name: m.name, contextLength: m.context_length }))
      .sort((a, b) => b.contextLength - a.contextLength),

  "opencode-free": (models) =>
    models
      .filter((m) => m.id?.endsWith("-free") || KNOWN_FREE_OPENCODE_MODELS.includes(m.id))
      .map((m) => ({ id: m.id, name: m.id })),

  // models.dev returns a large catalog; keep only mimo models
  "mimo-free": (models) =>
    (Array.isArray(models) ? models : [])
      .filter((m) => m.id?.startsWith("mimo") || m.name?.toLowerCase().includes("mimo"))
      .map((m) => ({ id: m.id, name: m.name || m.id })),
};
