export default {
  id: "selfhosted-stt",
  priority: 50,
  hasFree: true,
  alias: "selfhosted-stt",
  display: {
    name: "Self-hosted STT",
    icon: "cloud",
    color: "#64748B",
    textIcon: "ST",
    website: "https://github.com/ggml-org/whisper.cpp",
  },
  category: "apikey",
  authType: "apikey",
  authHint: {
    apiKey: "Enter a placeholder key if your local server does not require authentication.",
  },
  hasProviderSpecificData: true,
  models: [
    { id: "whisper-1", name: "Whisper (self-hosted)", params: ["language", "response_format", "temperature", "prompt"], kind: "stt" },
  ],
  serviceKinds: ["stt"],
  sttConfig: {
    baseUrl: "http://localhost:8080/v1/audio/transcriptions",
    authType: "apikey",
    format: "openai",
  },
};
