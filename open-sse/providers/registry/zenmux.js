import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "zenmux",
  priority: 12,
  alias: "zenmux",
  aliases: ["zm"],
  uiAlias: "zm",
  display: {
    name: "ZenMux",
    icon: "hub",
    color: "#0F766E",
    textIcon: "ZM",
    website: "https://zenmux.ai",
    notice: {
      text: "Unified access to OpenAI, Anthropic, Gemini, DeepSeek, Qwen, and other models through OpenAI-compatible APIs.",
      apiKeyUrl: "https://zenmux.ai/invite/0DD2XM",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://zenmux.ai/api/v1/chat/completions",
    validateUrl: "https://zenmux.ai/api/v1/models",
    responsesUrl: "https://zenmux.ai/api/v1/responses",
    thinkingFormat: "openai",
  },
  // Preserve native request/response formats where ZenMux exposes an exact endpoint.
  transports: [
    {
      format: "openai",
      baseUrl: "https://zenmux.ai/api/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "openai-responses",
      baseUrl: "https://zenmux.ai/api/v1/responses",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://zenmux.ai/api/anthropic/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "x-api-key", scheme: "raw" },
    },
  ],
  models: [],
  serviceKinds: ["llm", "embedding", "tts", "stt", "image", "imageToText"],
  ttsConfig: {
    baseUrl: "https://zenmux.ai/api/v1/audio/speech",
    authType: "apikey",
    authHeader: "bearer",
    format: "zenmux",
  },
  sttConfig: {
    baseUrl: "https://zenmux.ai/api/v1/audio/transcriptions",
    authType: "apikey",
    authHeader: "bearer",
    format: "zenmux",
  },
  embeddingConfig: {
    baseUrl: "https://zenmux.ai/api/v1/embeddings",
    authType: "apikey",
    authHeader: "bearer",
  },
  imageConfig: {
    baseUrl: "https://zenmux.ai/api/v1/images/generations",
  },
  imageEditConfig: {
    baseUrl: "https://zenmux.ai/api/v1/images/edits",
  },
  rerankConfig: {
    baseUrl: "https://zenmux.ai/api/v1/rerank",
  },
  modelsFetcher: { url: "https://zenmux.ai/api/v1/models", type: "zenmux" },
  passthroughModels: true,
};
