import { describe, expect, it, vi } from "vitest";
import { constants as cryptoConstants, createPublicKey, publicEncrypt } from "node:crypto";
import { PROVIDERS, PROVIDER_MODELS, PROVIDER_MEDIA } from "open-sse/providers/index.js";
import { TTS_MODELS_CONFIG } from "open-sse/config/ttsModels.js";
import { FORMAT_HANDLERS } from "open-sse/handlers/ttsProviders/genericFormats.js";
import { buildSearchRequest } from "open-sse/handlers/search/callers.js";
import { handleSearchCore } from "open-sse/handlers/search/index.js";
import { normalizeSearchResponse } from "open-sse/handlers/search/normalizers.js";
import { resolveTransport } from "open-sse/services/provider.js";
import { resolveProviderAlias } from "open-sse/services/model.js";
import { resolveSelfHostedEndpoint } from "open-sse/utils/selfHostedEndpoint.js";
import {
  buildGetChatMessageRequest,
  decodeCompletionChunk,
  grpcWebFrame,
  resolveWsModelId,
} from "open-sse/executors/windsurf.js";
import { getUnavailableProviderError } from "open-sse/providers/index.js";
import { AI_PROVIDERS } from "@/shared/constants/providers";
import { hasSpecializedExecutor } from "open-sse/executors/index.js";

describe("9Router provider transfers", () => {
  it.each([
    ["api-airforce", "https://api.airforce/v1/chat/completions"],
    ["baidu", "https://qianfan.baidubce.com/v2/chat/completions"],
    ["bazaarlink", "https://bazaarlink.ai/api/v1/chat/completions"],
    ["bluesminds", "https://api.bluesminds.com/v1/chat/completions"],
    ["kilo-gateway", "https://api.kilo.ai/api/gateway/chat/completions"],
    ["llm7", "https://api.llm7.io/v1/chat/completions"],
    ["morph", "https://api.morphllm.com/v1/chat/completions"],
    ["sambanova", "https://api.sambanova.ai/v1/chat/completions"],
    ["tencent", "https://api.hunyuan.cloud.tencent.com/v1/chat/completions"],
  ])("%s is registered with its OpenAI-compatible endpoint", (provider, endpoint) => {
    expect(PROVIDERS[provider].baseUrl).toBe(endpoint);
  });

  it("resolves provider aliases and keeps live catalogs enabled where provided", () => {
    expect(resolveProviderAlias("af")).toBe("api-airforce");
    expect(resolveProviderAlias("qianfan")).toBe("baidu");
    expect(PROVIDER_MEDIA["api-airforce"].modelsFetcher.url).toBe("https://api.airforce/v1/models");
    expect(PROVIDER_MODELS.bzl.some(({ id }) => id === "auto:free")).toBe(true);
    expect(AI_PROVIDERS.llm7.passthroughModels).toBe(true);
  });

  it("routes Windsurf through its gRPC-Web executor and translates model IDs", () => {
    expect(resolveProviderAlias("ws")).toBe("windsurf");
    expect(resolveWsModelId("gpt-5.5")).toBe("gpt-5-5-medium");
    const request = buildGetChatMessageRequest("sk-ws-test", "gpt-5-5-medium", [
      { role: "user", content: "hello" },
    ]);
    const frame = grpcWebFrame(request);
    expect(frame[0]).toBe(0);
    expect(new DataView(frame.buffer).getUint32(1, false)).toBe(request.length);
    expect(decodeCompletionChunk(new Uint8Array([0x0a, 4, 0x0a, 2, 0x6f, 0x6b])))
      .toEqual({ kind: "content", text: "ok" });
  });

  it("routes Zed through its native hosted executor and RSA callback parser", async () => {
    const {
      createZedNativeAuthData,
      decryptZedAccessToken,
      decodeZedSystemIdVerifier,
      parseZedCallbackPayload,
    } = await import("open-sse/shared/zedAuth.js");
    const { generateAuthData } = await import("@/lib/oauth/providers");
    expect(getUnavailableProviderError("zed")).toBeNull();
    expect(hasSpecializedExecutor("zed")).toBe(true);
    const authData = await generateAuthData("zed", "http://localhost:20127/callback");
    const authUrl = new URL(authData.authUrl);
    expect(authData.codeVerifier).toMatch(/^zed-rsa-pkcs1:/);
    expect(authUrl.searchParams.get("native_app_port")).toBe("58443");
    expect(authUrl.searchParams.get("native_app_public_key")).toBeTruthy();
    const auth = createZedNativeAuthData({ defaultNativeAppPort: 58443 });
    expect(decodeZedSystemIdVerifier(auth.privateKeyVerifier)).toBe(auth.systemId);
    const publicKey = createPublicKey({
      key: Buffer.from(auth.publicKey, "base64"),
      format: "der",
      type: "pkcs1",
    });
    const encrypted = publicEncrypt({
      key: publicKey,
      padding: cryptoConstants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    }, Buffer.from("zed-access-token"));
    expect(decryptZedAccessToken(encrypted.toString("base64url"), auth.privateKeyVerifier))
      .toBe("zed-access-token");
    expect(parseZedCallbackPayload("http://localhost/?user_id=user-1&access_token=encrypted"))
      .toEqual({ userId: "user-1", encryptedAccessToken: "encrypted" });
  });

  it("routes Devin through a text-only ACP executor with no API-key requirement", () => {
    expect(getUnavailableProviderError("devin-cli")).toBeNull();
    expect(hasSpecializedExecutor("devin-cli")).toBe(true);
    expect(AI_PROVIDERS["devin-cli"].noAuth).toBe(true);
  });

  it("routes OpenCode Zen models through the source-format-specific endpoint", () => {
    expect(resolveTransport("opencode-zen", "openai")?.baseUrl)
      .toBe("https://opencode.ai/zen/v1/chat/completions");
    expect(resolveTransport("opencode-zen", "claude")?.baseUrl)
      .toBe("https://opencode.ai/zen/v1/messages");
    expect(resolveTransport("opencode-zen", "openai-responses")?.baseUrl)
      .toBe("https://opencode.ai/zen/v1/responses");
    expect(PROVIDER_MODELS.ocz.find(({ id }) => id === "claude-sonnet-4-6").targetFormat)
      .toBe("claude");
    expect(PROVIDER_MODELS.ocz.find(({ id }) => id === "gpt-5-6-sol").targetFormat)
      .toBe("openai-responses");
  });

  it("reuses an Ollama connection and routes Ollama Search's native request", () => {
    expect(PROVIDER_MEDIA["ollama-search"].credentialFallback).toBe("ollama");
    const request = buildSearchRequest(
      { id: "ollama-search", ...PROVIDER_MEDIA["ollama-search"].searchConfig },
      {
        query: "local models",
        searchType: "web",
        maxResults: 5,
        token: "ollama-key",
        country: "US",
        language: "en",
      },
    );
    expect(request.init.method).toBe("POST");
    expect(request.init.headers.Authorization).toBe("Bearer ollama-key");
    expect(JSON.parse(request.init.body)).toEqual({
      query: "local models",
      max_results: 5,
      country: "US",
      language: "en",
    });
    expect(normalizeSearchResponse("ollama-search", {
      results: [{ title: "Local models", url: "https://example.test", content: "A result" }],
    }, "local models", "web").results[0]).toMatchObject({
      title: "Local models",
      snippet: "A result",
      url: "https://example.test",
    });
  });

  it("builds Xquik's authenticated search request and normalizes tweet results", () => {
    const request = buildSearchRequest(
      { id: "xquik", ...PROVIDER_MEDIA.xquik.searchConfig },
      {
        query: "polyrouter",
        searchType: "x",
        maxResults: 8,
        token: "test-key",
        language: "en",
        providerOptions: { queryType: "Latest", cursor: "page-2" },
      },
    );
    const url = new URL(request.url);
    expect(url.searchParams.get("q")).toBe("polyrouter");
    expect(url.searchParams.get("limit")).toBe("8");
    expect(url.searchParams.get("queryType")).toBe("Latest");
    expect(url.searchParams.get("cursor")).toBe("page-2");
    expect(request.init.headers["x-api-key"]).toBe("test-key");

    const result = normalizeSearchResponse("xquik", {
      tweets: [{
        id: "123",
        text: "A public post",
        createdAt: "2026-09-28T00:00:00.000Z",
        author: { username: "author", name: "Author" },
      }],
      has_next_page: true,
      next_cursor: "page-3",
    }, "polyrouter", "x");
    expect(result.results[0]).toMatchObject({
      title: "@author on X",
      url: "https://x.com/author/status/123",
      snippet: "A public post",
    });
    expect(result.pagination).toEqual({ has_more: true, next_cursor: "page-3" });
  });

  it("clears the associated account error after a successful dedicated search", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ results: [] }), {
      headers: { "Content-Type": "application/json" },
    }));
    const onRequestSuccess = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    try {
      const result = await handleSearchCore({
        body: { query: "local models", max_results: 5 },
        provider: { id: "ollama-search" },
        providerConfig: PROVIDER_MEDIA["ollama-search"].searchConfig,
        credentials: { apiKey: "test-key" },
        onRequestSuccess,
      });
      expect(result.success).toBe(true);
      expect(onRequestSuccess).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("sends Fish Audio's model in the HTTP header and voice as reference_id", async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array(120)));
    vi.stubGlobal("fetch", fetchMock);
    try {
      const result = await FORMAT_HANDLERS["fish-audio"]({
        baseUrl: "https://api.fish.audio/v1/tts",
        apiKey: "test-key",
        text: "Hello",
        modelId: "s2.1-pro",
        voiceId: "voice-123",
      });
      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers).toMatchObject({
        Authorization: "Bearer test-key",
        model: "s2.1-pro",
      });
      expect(JSON.parse(init.body)).toEqual({
        text: "Hello",
        format: "mp3",
        reference_id: "voice-123",
      });
      expect(result.format).toBe("mp3");
      expect(TTS_MODELS_CONFIG["fish-audio"].models.map(({ id }) => id))
        .toEqual(["s2.1-pro-free", "s2.1-pro", "s2-pro", "s1"]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("normalizes local media service URLs to their request paths", () => {
    expect(resolveSelfHostedEndpoint("http://localhost:8080/v1", "embedding"))
      .toBe("http://localhost:8080/v1/embeddings");
    expect(resolveSelfHostedEndpoint("http://localhost:8080", "stt"))
      .toBe("http://localhost:8080/v1/audio/transcriptions");
    expect(resolveSelfHostedEndpoint("http://localhost:8880/v1/audio/speech", "tts"))
      .toBe("http://localhost:8880/v1/audio/speech");
  });

  it("rejects unsafe or malformed custom media URLs", () => {
    expect(() => resolveSelfHostedEndpoint("file:///tmp/audio", "tts")).toThrow(/HTTP or HTTPS/);
    expect(() => resolveSelfHostedEndpoint("http://user:pass@localhost:8880", "tts"))
      .toThrow(/must not include credentials/);
    expect(() => resolveSelfHostedEndpoint("http://localhost:8880?key=value", "tts"))
      .toThrow(/query string or fragment/);
    expect(() => resolveSelfHostedEndpoint("http://localhost:8880", "video"))
      .toThrow(/Unsupported self-hosted service/);
  });
});
