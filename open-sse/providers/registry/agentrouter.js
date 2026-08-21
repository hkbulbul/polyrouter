import { CLAUDE_CLI_SPOOF_HEADERS } from "../shared.js";

export default {
  id: "agentrouter",
  alias: "agentrouter",
  aliases: ["ar"],
  display: {
    name: "AgentRouter",
    icon: "router",
    color: "#0EA5E9",
    textIcon: "AR",
    website: "https://agentrouter.org",
    notice: {
      text: "Unified OpenAI + Claude gateway — one sk-* key for both surfaces. Requires Claude Code CLI fingerprint (sent automatically).",
      apiKeyUrl: "https://agentrouter.org/console/token",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://agentrouter.org/v1/chat/completions",
    format: "openai",
    validateUrl: "https://agentrouter.org/v1/models",
    headers: { ...CLAUDE_CLI_SPOOF_HEADERS },
  },
  transports: [
    {
      format: "openai",
      baseUrl: "https://agentrouter.org/v1/chat/completions",
      headers: { ...CLAUDE_CLI_SPOOF_HEADERS },
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://agentrouter.org/v1/messages",
      // Full Claude CLI identity — AgentRouter's /v1/messages only responds
      // when the request looks like the official CLI; without these it 401s
      // as "unauthorized_client_error". Also satisfies the OpenAI-surface
      // gate that returned 401 before the fix.
      headers: { ...CLAUDE_CLI_SPOOF_HEADERS },
      auth: { combined: true, header: "x-api-key", scheme: "raw" },
    },
  ],
  models: [
    // Live-probed 2026-08-21: claude-opus-4-8 returned 200 with fingerprint
    // (503 without), gpt-5.5/gpt-5.6 currently "无可用渠道" — kept but expect 503 until upstream recovers.
    { id: "claude-opus-4-8", name: "Claude Opus 4.8" },
    { id: "claude-opus-4-6", name: "Claude Opus 4.6" },
    { id: "claude-opus-4-7", name: "Claude Opus 4.7" },
    { id: "gpt-5.6", name: "GPT-5.6" },
    { id: "gpt-5.5", name: "GPT-5.5" },
    { id: "glm-5.2", name: "GLM-5.2" },
  ],
  modelsFetcher: { url: "https://agentrouter.org/v1/models", type: "openai" },
  passthroughModels: true,
  // 503 "无可用渠道" is transient channel exhaustion, not auth — retry before failing over.
  retry: { 503: { attempts: 3, delayMs: 800 } },
};
