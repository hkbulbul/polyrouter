/**
 * Meta AI — API key provider.
 * Create a Model API key at https://dev.meta.ai and paste it here.
 * Inference: api.meta.ai/v1/chat/completions (OpenAI-compatible).
 */

export default {
  id: "meta",
  priority: 270,
  alias: "meta",
  uiAlias: "meta",
  display: {
    name: "Meta AI",
    icon: "auto_awesome",
    color: "#0082FB",
    textIcon: "M",
    website: "https://dev.meta.ai",
    notice: {
      text: "Create a Model API key at dev.meta.ai and paste it here. OpenAI-compatible chat completions via api.meta.ai.",
      signupUrl: "https://dev.meta.ai",
    },
  },
  category: "apikey",
  authModes: ["apikey"],
  authType: "apikey",
  authHint: "Enter your Model API key from https://dev.meta.ai",
  transport: {
    baseUrl: "https://api.meta.ai/v1/chat/completions",
    format: "openai",
    forceStream: true,
    headers: {
      "User-Agent": "muse-code/0.1.0",
    },
    auth: {
      combined: true,
      header: "Authorization",
      scheme: "bearer",
    },
    retry: {
      429: { attempts: 2, delayMs: 2000 },
      502: { attempts: 2, delayMs: 1500 },
      503: { attempts: 2, delayMs: 1500 },
    },
  },
  models: [{ id: "muse-spark-1.2", name: "Muse Spark 1.2" }],
  modelsFetcher: { url: "https://api.meta.ai/v1/models", type: "openai" },
  passthroughModels: true,
  features: {
    usage: true,
  },
};