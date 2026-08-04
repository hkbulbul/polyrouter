import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  extractApiKey: vi.fn(() => null),
  isValidApiKey: vi.fn(async () => true),
  getProviderCredentials: vi.fn(),
  markAccountUnavailable: vi.fn(async () => ({ shouldFallback: false })),
  clearAccountError: vi.fn(async () => {}),
}));
const modelMocks = vi.hoisted(() => ({
  getModelInfo: vi.fn(),
}));

vi.mock("@/sse/services/auth.js", () => authMocks);
vi.mock("@/sse/services/model.js", () => modelMocks);
vi.mock("@/lib/localDb", () => ({
  getSettings: vi.fn(async () => ({ requireApiKey: false })),
}));
vi.mock("@/models", () => ({
  getProviderNodeById: vi.fn(),
  getProviderConnectionById: vi.fn(),
}));
vi.mock("open-sse/utils/proxyFetch.js", () => ({
  proxyAwareFetch: vi.fn((url, options) => global.fetch(url, options)),
}));

import REGISTRY from "../../open-sse/providers/registry/index.js";
import { PROVIDERS, PROVIDER_MEDIA } from "../../open-sse/providers/index.js";
import { resolveTransport } from "../../open-sse/services/provider.js";
import { handleEmbeddingsCore } from "../../open-sse/handlers/embeddingsCore.js";
import { handleImageGenerationCore } from "../../open-sse/handlers/imageGenerationCore.js";
import { handleTtsCore } from "../../open-sse/handlers/ttsCore.js";
import { handleSttCore } from "../../open-sse/handlers/sttCore.js";
import { handleRerank } from "@/sse/handlers/rerank.js";
import { handleImageEdit } from "@/sse/handlers/imageEdit.js";
import { POST as validateProvider } from "@/app/api/providers/validate/route.js";
import { parseZenMuxModels } from "@/app/api/providers/[id]/models/route.js";

const originalFetch = global.fetch;
const account = {
  apiKey: "zenmux-key",
  connectionId: "zenmux-connection",
  connectionName: "ZenMux",
  providerSpecificData: { connectionProxyEnabled: false },
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
  authMocks.getProviderCredentials.mockResolvedValue(account);
  authMocks.markAccountUnavailable.mockResolvedValue({ shouldFallback: false });
  modelMocks.getModelInfo.mockImplementation(async (value) => ({
    provider: "zenmux",
    model: String(value).replace(/^zenmux\//, "").replace(/^zm\//, ""),
  }));
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("ZenMux provider registry", () => {
  it("registers ZenMux as an API-key provider with native compatible routes", () => {
    const zenmux = REGISTRY.find((entry) => entry.id === "zenmux");

    expect(zenmux).toMatchObject({
      category: "apikey",
      authType: "apikey",
      alias: "zenmux",
      aliases: ["zm"],
      passthroughModels: true,
      display: {
        notice: { apiKeyUrl: "https://zenmux.ai/invite/0DD2XM" },
      },
    });
    expect(PROVIDERS.zenmux.baseUrl).toBe("https://zenmux.ai/api/v1/chat/completions");
    expect(resolveTransport("zenmux", "openai-responses")?.baseUrl).toBe("https://zenmux.ai/api/v1/responses");
    expect(resolveTransport("zenmux", "claude")).toMatchObject({
      baseUrl: "https://zenmux.ai/api/anthropic/v1/messages",
      auth: { header: "x-api-key", scheme: "raw" },
    });
    expect(PROVIDER_MEDIA.zenmux).toMatchObject({
      embeddingConfig: { baseUrl: "https://zenmux.ai/api/v1/embeddings" },
      imageConfig: { baseUrl: "https://zenmux.ai/api/v1/images/generations" },
      imageEditConfig: { baseUrl: "https://zenmux.ai/api/v1/images/edits" },
      rerankConfig: { baseUrl: "https://zenmux.ai/api/v1/rerank" },
    });
  });

  it("maps live model display names and modalities", () => {
    const models = parseZenMuxModels({ data: [
      { id: "vendor/chat", display_name: "Chat", output_modalities: ["text"] },
      { id: "vendor/embed", display_name: "Embed", output_modalities: ["embeddings"] },
      { id: "vendor/stt", display_name: "Transcribe", output_modalities: ["transcription"] },
      { id: "vendor/tts", display_name: "Speak", output_modalities: ["audio"] },
      { id: "vendor/image", display_name: "Draw", output_modalities: ["image"] },
    ] });

    expect(models.map(({ name, kind }) => [name, kind])).toEqual([
      ["Chat", "llm"],
      ["Embed", "embedding"],
      ["Transcribe", "stt"],
      ["Speak", "tts"],
      ["Draw", "image"],
    ]);
  });
});

describe("ZenMux media adapters", () => {
  it("forwards embeddings to the ZenMux OpenAI-compatible endpoint", async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ data: [{ embedding: [0.1] }] }));

    const result = await handleEmbeddingsCore({
      body: { input: "hello" },
      modelInfo: { provider: "zenmux", model: "openai/text-embedding-3-small" },
      credentials: account,
    });

    expect(result.success).toBe(true);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe("https://zenmux.ai/api/v1/embeddings");
    expect(init.headers.Authorization).toBe("Bearer zenmux-key");
    expect(JSON.parse(init.body).model).toBe("openai/text-embedding-3-small");
  });

  it("forwards all supported OpenAI image options", async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ created: 1, data: [{ url: "https://example.test/image.png" }] }));

    const result = await handleImageGenerationCore({
      body: {
        prompt: "draw a fox",
        background: "transparent",
        moderation: "low",
        output_compression: 80,
        output_format: "webp",
        partial_images: 2,
      },
      modelInfo: { provider: "zenmux", model: "openai/gpt-image-1" },
      credentials: account,
    });

    expect(result.success).toBe(true);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe("https://zenmux.ai/api/v1/images/generations");
    expect(JSON.parse(init.body)).toMatchObject({
      model: "openai/gpt-image-1",
      background: "transparent",
      moderation: "low",
      output_compression: 80,
      output_format: "webp",
      partial_images: 2,
    });
  });

  it("preserves slash-containing TTS model IDs and decodes JSON base64 audio", async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({
      audio: Buffer.from("zenmux-audio").toString("base64"),
      format: "mp3",
    }));

    const result = await handleTtsCore({
      provider: "zenmux",
      model: "openai/gpt-4o-mini-tts",
      input: "hello",
      voice: "coral",
      audioFormat: "mp3",
      credentials: account,
      responseFormat: "json",
    });

    expect(result.success).toBe(true);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe("https://zenmux.ai/api/v1/audio/speech");
    expect(JSON.parse(init.body)).toMatchObject({
      model: "openai/gpt-4o-mini-tts",
      voice: "coral",
      response_format: "mp3",
      stream: false,
    });
    expect(await result.response.json()).toMatchObject({ format: "mp3" });
  });

  it("converts multipart transcription audio into ZenMux inline base64 JSON", async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ text: "hello" }));
    const formData = new FormData();
    formData.append("file", new Blob([Buffer.from([1, 2, 3])], { type: "audio/mpeg" }), "sample.mp3");
    formData.append("language", "en");

    const result = await handleSttCore({
      provider: "zenmux",
      model: "openai/whisper-1",
      formData,
      credentials: account,
      sttConfig: PROVIDER_MEDIA.zenmux.sttConfig,
    });

    expect(result.success).toBe(true);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe("https://zenmux.ai/api/v1/audio/transcriptions");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toMatchObject({
      model: "openai/whisper-1",
      input_audio: { data: Buffer.from([1, 2, 3]).toString("base64"), format: "mp3" },
      language: "en",
      stream: false,
    });
  });
});

describe("ZenMux additional routes", () => {
  it("strips the router prefix when forwarding rerank requests", async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ results: [] }));
    const response = await handleRerank(new Request("http://localhost/v1/rerank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "zenmux/cohere/rerank-v3.5",
        input: { query: "best", documents: ["one", "two"] },
      }),
    }));

    expect(response.status).toBe(200);
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).model).toBe("cohere/rerank-v3.5");
    expect(authMocks.clearAccountError).toHaveBeenCalledWith(
      "zenmux-connection", account, "cohere/rerank-v3.5"
    );
  });

  it("forwards JSON and multipart image edits with the upstream model ID", async () => {
    global.fetch.mockResolvedValue(jsonResponse({ created: 1, data: [] }));

    await handleImageEdit(new Request("http://localhost/v1/images/edits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "zenmux/openai/gpt-image-1", prompt: "edit", image: "data:image/png;base64,AA==" }),
    }));
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).model).toBe("openai/gpt-image-1");

    const formData = new FormData();
    formData.append("model", "zm/openai/gpt-image-1");
    formData.append("prompt", "edit multipart");
    formData.append("image", new Blob([Buffer.from([4, 5])], { type: "image/png" }), "source.png");
    await handleImageEdit(new Request("http://localhost/v1/images/edits", { method: "POST", body: formData }));

    const forwarded = global.fetch.mock.calls[1][1].body;
    expect(forwarded.get("model")).toBe("openai/gpt-image-1");
    expect(forwarded.get("image").name).toBe("source.png");
  });
});

describe("ZenMux API-key validation", () => {
  it.each([
    [403, false],
    [400, true],
    [429, true],
  ])("treats inference status %i as valid=%s", async (status, valid) => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ error: "probe" }, status));
    const response = await validateProvider(new Request("http://localhost/api/providers/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "zenmux", apiKey: "test-key" }),
    }));

    expect(await response.json()).toMatchObject({ valid });
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe("https://zenmux.ai/api/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer test-key");
  });
});
