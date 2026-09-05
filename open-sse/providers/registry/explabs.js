import { CLAUDE_API_HEADERS } from "../shared.js";

const explabsProvider = {
  id: "explabs",
  priority: 13,
  alias: "explabs",
  aliases: ["experiential", "experientiallabs", "xpl"],
  uiAlias: "xpl",
  display: {
    name: "Experiential Labs",
    icon: "science",
    color: "#4F46E5",
    textIcon: "XPL",
    website: "https://platform.experientiallabs.ai",
    notice: {
      text: "OpenAI-compatible model gateway with unified access to Claude, GPT, Gemini, and open models. Supports Chat Completions, Responses, and Anthropic Messages APIs.",
      apiKeyUrl: "https://platform.experientiallabs.ai/settings/api-keys",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.experientiallabs.ai/v1/chat/completions",
    validateUrl: "https://api.experientiallabs.ai/v1/models",
    responsesUrl: "https://api.experientiallabs.ai/v1/responses",
  },
  // Preserve native request/response formats where Experiential Labs exposes an exact endpoint.
  transports: [
    {
      format: "openai",
      baseUrl: "https://api.experientiallabs.ai/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "openai-responses",
      baseUrl: "https://api.experientiallabs.ai/v1/responses",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://api.experientiallabs.ai/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "x-api-key", scheme: "raw" },
    },
  ],
  modelMap: {
    "claude-fable-5.1": "claude-fable-latest",
    "astra": "gpt-6-astra",
  },
  models: [
    { id: "claude-fable-latest", name: "Claude Fable Latest" },
    { id: "claude-fable-5", name: "Claude Fable 5" },
    { id: "claude-fable-5.1", name: "Claude Fable 5.1", upstreamModelId: "claude-fable-latest" },
    { id: "gpt-6-astra", name: "GPT-6 Astra" },
    { id: "astra", name: "Astra", upstreamModelId: "gpt-6-astra" },
    { id: "claude-opus-5", name: "Claude Opus 5" },
    { id: "claude-sonnet-5", name: "Claude Sonnet 5" },
    { id: "claude-sonnet-4", name: "Claude Sonnet 4" },
    { id: "claude-3-7-sonnet", name: "Claude 3.7 Sonnet" },
    { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet" },
    { id: "glm-5.3-flash", name: "GLM 5.3 Flash" },
    { id: "gpt-5.6-sol", name: "GPT-5.6 Sol" },
    { id: "gpt-5.6-luna", name: "GPT-5.6 Luna" },
    { id: "gpt-5.6-terra", name: "GPT-5.6 Terra" },
    { id: "gpt-5.5-pro", name: "GPT-5.5 Pro" },
    { id: "gpt-5.5", name: "GPT-5.5" },
    { id: "gpt-5.4-mini", name: "GPT-5.4 Mini" },
    { id: "gpt-5", name: "GPT-5" },
    { id: "gemini-3.7-flash", name: "Gemini 3.7 Flash" },
    { id: "gemini-pro-latest", name: "Gemini Pro Latest" },
    { id: "qwen3.8-27b", name: "Qwen 3.8 27B" },
    { id: "deepseek-chat", name: "DeepSeek Chat" },
    { id: "deepseek-reasoner", name: "DeepSeek Reasoner" },
  ],
  serviceKinds: ["llm"],
  modelsFetcher: { url: "https://api.experientiallabs.ai/api/models", type: "explabs" },
  passthroughModels: true,
};

export default explabsProvider;
