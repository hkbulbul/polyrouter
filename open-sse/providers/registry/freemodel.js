const API_BASE = "https://api.freemodel.dev/v1";

export default {
  id: "freemodel",
  priority: 13,
  alias: "fm",
  aliases: ["free-model"],
  uiAlias: "fm",
  display: {
    name: "FreeModel",
    icon: "auto_awesome",
    color: "#19C37D",
    textIcon: "FM",
    website: "https://freemodel.dev",
    notice: {
      text: "One API with automatic routing across frontier models. Supports OpenAI Chat Completions and Responses; Claude requests are translated by PolyRouter.",
      apiKeyUrl: "https://freemodel.dev",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: `${API_BASE}/chat/completions`,
    validateUrl: `${API_BASE}/models`,
    responsesUrl: `${API_BASE}/responses`,
    thinkingFormat: "openai",
  },
  transports: [
    {
      format: "openai",
      baseUrl: `${API_BASE}/chat/completions`,
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "openai-responses",
      baseUrl: `${API_BASE}/responses`,
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
  ],
  models: [
    { id: "auto", name: "Auto Router" },
    { id: "FreeModel", name: "FreeModel" },
    { id: "gpt-5.6-sol", name: "GPT-5.6 Sol" },
    { id: "gpt-5.6-terra", name: "GPT-5.6 Terra" },
    { id: "gpt-5.6-luna", name: "GPT-5.6 Luna" },
  ],
  modelsFetcher: { url: `${API_BASE}/models`, type: "freemodel" },
  passthroughModels: true,
};
