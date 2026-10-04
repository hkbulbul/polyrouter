export default {
  id: "kilo-gateway",
  alias: "kgw",
  aliases: ["kilogateway"],
  uiAlias: "kgw",
  display: {
    name: "Kilo Gateway",
    icon: "login",
    color: "#8B5CF6",
    textIcon: "KG",
    website: "https://kilo.ai",
    notice: { apiKeyUrl: "https://kilo.ai/dashboard?tab=apiKeys" },
  },
  category: "freeTier",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.kilo.ai/api/gateway/chat/completions",
    validateUrl: "https://api.kilo.ai/api/gateway/models",
  },
  models: [
    { id: "kilo-auto/free", name: "Kilo Auto Free" },
    { id: "nvidia/nemotron-3-super-120b-a12b:free", name: "Nemotron 3 Super 120B (Free)" },
    { id: "nvidia/nemotron-3-ultra-550b-a55b:free", name: "Nemotron 3 Ultra 550B (Free)" },
    { id: "kwaipilot/kat-coder-pro-v2.5:free", name: "Kat Coder Pro v2.5 (Free)" },
    { id: "kilo-auto/frontier", name: "Kilo Auto Frontier" },
    { id: "kilo-auto/balanced", name: "Kilo Auto Balanced" },
  ],
};
