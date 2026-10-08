export default {
  id: "selfhosted-embedding",
  priority: 50,
  hasFree: true,
  alias: "selfhosted-embedding",
  display: {
    name: "Self-hosted Embedding",
    icon: "cloud",
    color: "#64748B",
    textIcon: "SE",
    website: "https://github.com/ggml-org/llama.cpp",
  },
  category: "apikey",
  authType: "apikey",
  authHint: {
    apiKey: "Enter a placeholder key if your local server does not require authentication.",
  },
  hasProviderSpecificData: true,
  models: [{ id: "embedding", name: "Self-hosted embedding model", kind: "embedding" }],
  serviceKinds: ["embedding"],
  embeddingConfig: { baseUrl: "http://localhost:8080/v1/embeddings", authType: "apikey" },
};
