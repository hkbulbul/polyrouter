export default {
  id: "nara",
  alias: "nara",
  aliases: ["nararouter", "bynara"],
  uiAlias: "nara",
  display: {
    name: "Nara Router",
    icon: "router",
    color: "#2E81FE", // sampled from the official mark (public/providers/nara.png)
    textIcon: "NR",
    website: "https://bynara.id",
    notice: {
      text: "Unified OpenAI + Claude gateway (sk-nry-* key). Requires joining the Nara Telegram group and relinking at /settings, otherwise every call 403s with telegram_required. Models are credit-weighted — weight 0.1–0.2 models work on a low balance, weight >=1 returns 402 until you top up.",
      apiKeyUrl: "https://router.bynara.id/settings",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://router.bynara.id/v1/chat/completions",
    format: "openai",
    validateUrl: "https://router.bynara.id/v1/models",
  },
  // Dual surface, both live-probed 2026-08-22 with the same sk-nry-* key:
  // /v1/chat/completions accepts Bearer, /v1/messages accepts x-api-key.
  transports: [
    {
      format: "openai",
      baseUrl: "https://router.bynara.id/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://router.bynara.id/v1/messages",
      auth: { combined: true, header: "x-api-key", scheme: "raw" },
    },
  ],
  // Live catalog 2026-08-22 (54 entries). Image/video ids (agnes-image-2.0-flash,
  // agnes-image-2.1-flash, agnes-video-v2.0) are omitted: /v1/images/generations
  // exists but answers "Image model is unavailable." — add media config when upstream enables it.
  // Trailing comment on each line is the upstream credit weight (cost multiplier).
  models: [
    // ── Agnes (first = cheapest confirmed-working default) ──
    { id: "agnes-2.0-flash", name: "Agnes 2.0 Flash" },                       // 0.1
    { id: "agnes-2.5-flash", name: "Agnes 2.5 Flash" },                       // 0.2
    { id: "agnes-2.5-pro", name: "Agnes 2.5 Pro" },                           // 1
    // ── Claude ──
    { id: "claude-fable-5", name: "Claude Fable 5" },                         // 1
    { id: "claude-opus-5", name: "Claude Opus 5" },                           // 1
    { id: "claude-opus-4.8", name: "Claude Opus 4.8" },                       // 1
    { id: "claude-opus-4.7", name: "Claude Opus 4.7" },                       // 1
    { id: "claude-sonnet-5", name: "Claude Sonnet 5" },                       // 1.3
    // ── GPT ──
    { id: "gpt-5.6-luna", name: "GPT-5.6 Luna" },                             // 1
    { id: "gpt-5.6-terra", name: "GPT-5.6 Terra" },                           // 2.5
    { id: "gpt-5.6-sol", name: "GPT-5.6 Sol" },                               // 4
    { id: "gpt-5.5", name: "GPT-5.5" },                                       // 3
    { id: "gpt-5.4", name: "GPT-5.4" },                                       // 1.5
    // ── DeepSeek ──
    { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash" },                   // 1.5
    { id: "deepseek-v4-flash-alibaba", name: "DeepSeek V4 Flash (Alibaba)" },  // 1
    { id: "deepseek-v4-flash-vision-exp", name: "DeepSeek V4 Flash Vision (Exp)" }, // 1
    { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro" },                       // 3
    { id: "deepseek-v4-pro-alibaba", name: "DeepSeek V4 Pro (Alibaba)" },      // 4.5
    // ── Qwen ──
    { id: "qwen3.7-flash", name: "Qwen3.7 Flash" },                           // 1
    { id: "qwen3.7-flash-alibaba", name: "Qwen3.7 Flash (Alibaba)" },          // 1
    { id: "qwen3.7-plus", name: "Qwen3.7 Plus" },                             // 1
    { id: "qwen3.7-plus-alibaba", name: "Qwen3.7 Plus (Alibaba)" },            // 1.2
    { id: "qwen3.7-max", name: "Qwen3.7 Max" },                               // 1.2
    { id: "qwen3.7-max-alibaba", name: "Qwen3.7 Max (Alibaba)" },              // 1.25
    { id: "qwen3.8-max", name: "Qwen3.8 Max" },                               // 1
    { id: "qwen3.8-max-alibaba", name: "Qwen3.8 Max (Alibaba)" },              // 1
    { id: "qwen-3.8-max-free", name: "Qwen 3.8 Max (Free)" },                  // 1
    // ── GLM ──
    { id: "glm-5.2", name: "GLM-5.2" },                                       // 2
    { id: "glm-5.2-alibaba", name: "GLM-5.2 (Alibaba)" },                      // 1.1
    // ── Kimi ──
    { id: "kimi-k3", name: "Kimi K3" },                                       // 4
    { id: "kimi-k2.7-code", name: "Kimi K2.7 Code" },                         // 1
    { id: "kimi-k2.7-code-alibaba", name: "Kimi K2.7 Code (Alibaba)" },        // 0.75
    // ── MiMo ──
    { id: "mimo-v2.5", name: "MiMo V2.5" },                                   // 1.5
    { id: "mimo-v2.5-free", name: "MiMo V2.5 (Free)" },                       // 1
    { id: "mimo-v2.5-pro", name: "MiMo V2.5 Pro" },                           // 2.9
    { id: "mimo-v2.5-pro-ultraspeed", name: "MiMo V2.5 Pro Ultraspeed" },      // 3.5
    // ── MiniMax ──
    { id: "minimax-m3", name: "MiniMax M3" },                                 // 1
    { id: "minimax-m3-promo", name: "MiniMax M3 (Promo)" },                   // 1
    // ── Mistral ──
    { id: "mistral-large", name: "Mistral Large" },                           // 1
    { id: "mistral-medium-3-5", name: "Mistral Medium 3.5" },                 // 1
    // ── Muse Spark ──
    { id: "muse-spark-1.2", name: "Muse Spark 1.2" },                         // 1
    { id: "muse-spark-1.2-contributor", name: "Muse Spark 1.2 (Contributor)" },// 1
    { id: "muse-spark-1.2-contributor-free", name: "Muse Spark 1.2 (Contributor Free)" }, // 1
    { id: "muse-spark-1.1", name: "Muse Spark 1.1" },                         // 1
    // ── Others ──
    { id: "grok-4.6", name: "Grok 4.6" },                                     // 1
    { id: "ox-alpha", name: "OX Alpha" },                                     // 1
    { id: "ox-alpha-bynara", name: "OX Alpha (byNara)" },                     // 1
    { id: "laguna-s-2.1", name: "Laguna S 2.1" },                             // 0.5
    { id: "ling-3.0-flash-free", name: "Ling 3.0 Flash (Free)" },             // 1
    { id: "stepfun-3.7-flash", name: "StepFun 3.7 Flash" },                   // 1
    { id: "tencent-hy3-free", name: "Tencent HunYuan 3 (Free)" },             // 1
  ],
  modelsFetcher: { url: "https://router.bynara.id/v1/models", type: "openai" },
  passthroughModels: true,
};
