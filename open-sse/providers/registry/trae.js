export default {
  id: "trae",
  priority: 45,
  alias: "tr",
  uiAlias: "tr",
  display: {
    name: "Trae",
    icon: "code",
    color: "#7C3AED",
    website: "https://trae.ai",
    notice: { signupUrl: "https://trae.ai" },
  },
  category: "oauth",
  transport: {
    baseUrl: "https://core-normal.trae.ai/api/remote/v1",
    format: "openai",
    headers: {
      "X-Trae-Client-Type": "web",
      Referer: "https://solo.trae.ai/",
    },
  },
  models: [
    { id: "auto", name: "Auto (Server Picks)" },
    { id: "work", name: "Work (Auto \u00b7 fast)" },
    { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro" },
    { id: "gemini-3-flash-solo", name: "Gemini 3 Flash" },
    { id: "minimax-m3", name: "MiniMax M3", contextLength: 1048576, supportsVision: true },
    { id: "minimax-m2.7", name: "MiniMax M2.7" },
    { id: "kimi-k2.5", name: "Kimi K2.5" },
    { id: "gpt-5.4", name: "GPT 5.4" },
    { id: "gpt-5.2", name: "GPT 5.2" },
  ],
  oauth: {
    apiEndpoint: "https://api.trae.ai",
    soloApiEndpoint: "https://core-normal.trae.ai/api/remote/v1",
    authScheme: "Cloud-IDE-JWT",
    tokenLifetimeDays: 14,
  },
};
