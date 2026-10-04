export default {
  id: "api-airforce",
  alias: "af",
  aliases: ["airforce"],
  uiAlias: "af",
  display: {
    name: "API.airforce",
    icon: "flight",
    color: "#0EA5E9",
    textIcon: "AF",
    website: "https://api.airforce",
    notice: { apiKeyUrl: "https://api.airforce" },
  },
  category: "freeTier",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.airforce/v1/chat/completions",
    validateUrl: "https://api.airforce/v1/models",
    headers: {
      "HTTP-Referer": "https://polyrouter.local",
      "X-Title": "PolyRouter",
    },
    forceStream: true,
  },
  models: [
    { id: "gpt-oss-120b", name: "GPT-OSS 120B (Free)" },
    { id: "gpt-oss-20b", name: "GPT-OSS 20B (Free)" },
    { id: "kimi-k2.7-code", name: "Kimi K2.7 Code (Free)" },
  ],
  modelsFetcher: { url: "https://api.airforce/v1/models", type: "openai" },
  passthroughModels: true,
};
