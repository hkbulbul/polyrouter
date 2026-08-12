const chatgptWebProvider = {
  id: "chatgpt-web",
  priority: 160,
  alias: "chatgpt-web",
  aliases: ["cgw"],
  uiAlias: "cgw",
  display: {
    name: "ChatGPT Web",
    icon: "smart_toy",
    color: "#10A37F",
    textIcon: "CGW",
    website: "https://chatgpt.com",
  },
  category: "webCookie",
  authType: "cookie",
  authHint: "Paste your ChatGPT session cookie from chatgpt.com",
  transport: {
    baseUrl: "https://chatgpt.com",
    format: "openai",
    authType: "cookie",
  },
  models: [
    { id: "gpt-5.6-sol", name: "GPT-5.6 Sol (Instant)" },
    { id: "gpt-5.6-sol-medium", name: "GPT-5.6 Sol (Medium)" },
    { id: "gpt-5.6-sol-high", name: "GPT-5.6 Sol (High)" },
    { id: "gpt-5.6-sol-xhigh", name: "GPT-5.6 Sol (Extra High)" },
    { id: "gpt-5.6-sol-pro", name: "GPT-5.6 Sol Pro" },
  ],
  serviceKinds: ["llm"],
};

export default chatgptWebProvider;
