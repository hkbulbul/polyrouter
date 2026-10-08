export default {
  id: "selfhosted-tts",
  priority: 50,
  hasFree: true,
  alias: "selfhosted-tts",
  display: {
    name: "Self-hosted TTS",
    icon: "cloud",
    color: "#64748B",
    textIcon: "TT",
    website: "https://github.com/remsky/Kokoro-FastAPI",
  },
  category: "apikey",
  authType: "apikey",
  authHint: {
    apiKey: "Enter a placeholder key if your local server does not require authentication.",
  },
  hasProviderSpecificData: true,
  models: [
    { id: "kokoro", name: "Kokoro (self-hosted)", params: ["voice", "response_format", "speed"], kind: "tts" },
  ],
  serviceKinds: ["tts"],
  ttsConfig: {
    baseUrl: "http://localhost:8880",
    defaultModel: "kokoro",
    authType: "apikey",
    format: "openai",
  },
};
