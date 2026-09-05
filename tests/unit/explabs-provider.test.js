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
  getProviderConnectionById: vi.fn(),
  updateProviderConnection: vi.fn(async () => {}),
}));
vi.mock("@/models", () => ({
  getProviderNodeById: vi.fn(),
  getProviderConnectionById: vi.fn(),
}));
vi.mock("open-sse/utils/proxyFetch.js", () => ({
  proxyAwareFetch: vi.fn((url, options) => global.fetch(url, options)),
}));

import REGISTRY from "../../open-sse/providers/registry/index.js";
import { PROVIDERS, PROVIDER_MEDIA, PROVIDER_MODELS } from "../../open-sse/providers/index.js";
import { resolveTransport } from "../../open-sse/services/provider.js";
import { resolveProviderAlias } from "../../open-sse/services/model.js";
import { resolveProviderId } from "@/shared/constants/providers.js";
import { POST as validateProvider } from "@/app/api/providers/validate/route.js";
import { parseExplabsModels } from "@/app/api/providers/[id]/models/route.js";
import { FILTERS } from "@/app/api/providers/suggested-models/filters.js";
import { testSingleConnection } from "@/app/api/providers/[id]/test/testUtils.js";
import { getProviderConnectionById } from "@/lib/localDb";
import { translateRequest } from "../../open-sse/translator/index.js";
import { getCapabilitiesForModel } from "../../open-sse/providers/capabilities.js";
import { getProviderIconSrc } from "@/shared/utils/providerIcon.js";
import fs from "fs";
import path from "path";

const originalFetch = global.fetch;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("Experiential Labs provider registry", () => {
  it("registers Experiential Labs as an API-key provider with native multi-transports", () => {
    const explabs = REGISTRY.find((entry) => entry.id === "explabs");

    expect(explabs).toMatchObject({
      category: "apikey",
      authType: "apikey",
      alias: "explabs",
      aliases: ["experiential", "experientiallabs", "xpl"],
      uiAlias: "xpl",
      passthroughModels: true,
      display: {
        name: "Experiential Labs",
        website: "https://platform.experientiallabs.ai",
        notice: { apiKeyUrl: "https://platform.experientiallabs.ai/settings/api-keys" },
      },
    });

    // Default chat completion transport
    expect(PROVIDERS.explabs.baseUrl).toBe("https://api.experientiallabs.ai/v1/chat/completions");

    // Native Responses API transport
    expect(resolveTransport("explabs", "openai-responses")).toMatchObject({
      baseUrl: "https://api.experientiallabs.ai/v1/responses",
      auth: { header: "Authorization", scheme: "bearer" },
    });

    // Native Anthropic Messages API transport
    expect(resolveTransport("explabs", "claude")).toMatchObject({
      baseUrl: "https://api.experientiallabs.ai/v1/messages",
      auth: { header: "x-api-key", scheme: "raw" },
    });

    // Models fetcher config for suggested models
    expect(PROVIDER_MEDIA.explabs).toMatchObject({
      modelsFetcher: {
        url: "https://api.experientiallabs.ai/api/models",
        type: "explabs",
      },
    });
  });

  it("resolves all provider aliases correctly", () => {
    expect(resolveProviderAlias("explabs")).toBe("explabs");
    expect(resolveProviderAlias("experiential")).toBe("explabs");
    expect(resolveProviderAlias("experientiallabs")).toBe("explabs");
    expect(resolveProviderAlias("xpl")).toBe("explabs");

    expect(resolveProviderId("explabs")).toBe("explabs");
    expect(resolveProviderId("experiential")).toBe("explabs");
    expect(resolveProviderId("xpl")).toBe("explabs");
  });

  it("parses models correctly for both OpenAI list and catalog formats", () => {
    // OpenAI style /v1/models response
    const openaiStyle = parseExplabsModels({
      object: "list",
      data: [
        { id: "claude-opus-5", object: "model", created: 0, owned_by: "exp" },
        { id: "gpt-5.5", object: "model", created: 0, owned_by: "exp" },
      ],
    });
    expect(openaiStyle).toEqual([
      { id: "claude-opus-5", name: "claude-opus-5", kind: "llm", object: "model", created: 0, owned_by: "exp" },
      { id: "gpt-5.5", name: "gpt-5.5", kind: "llm", object: "model", created: 0, owned_by: "exp" },
    ]);

    // Public catalog style /api/models response
    const catalogStyle = parseExplabsModels({
      models: [
        { model: { slug: "qwen3.8-27b", display_name: "Qwen 3.8 27B", context_window: 131072 } },
      ],
    });
    expect(catalogStyle).toEqual([
      { id: "qwen3.8-27b", name: "Qwen 3.8 27B", kind: "llm", slug: "qwen3.8-27b", display_name: "Qwen 3.8 27B", context_window: 131072 },
    ]);
  });

  it("filters suggested models from public catalog correctly", () => {
    const rawCatalog = [
      {
        model: { slug: "claude-opus-5", display_name: "Claude Opus 5", context_window: 200000 },
      },
      {
        model: { slug: "gemini-3.7-flash", display_name: "Gemini 3.7 Flash", context_window: 1048576 },
      },
    ];

    const filtered = FILTERS.explabs(rawCatalog);
    expect(filtered).toEqual([
      { id: "claude-opus-5", name: "Claude Opus 5", contextLength: 200000 },
      { id: "gemini-3.7-flash", name: "Gemini 3.7 Flash", contextLength: 1048576 },
    ]);

    // Experiential alias filter should behave identically
    expect(FILTERS.experiential(rawCatalog)).toEqual(filtered);
  });
});

describe("Experiential Labs API-key validation", () => {
  it.each([
    [200, true],
    [401, false],
    [403, false],
    [429, true],
  ])("validates key with status %i -> valid=%s", async (status, valid) => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ data: [] }, status));

    const response = await validateProvider(new Request("http://localhost/api/providers/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "explabs", apiKey: "xpl_test_key" }),
    }));

    expect(await response.json()).toMatchObject({ valid });
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe("https://api.experientiallabs.ai/v1/models");
    expect(init.headers.Authorization).toBe("Bearer xpl_test_key");
  });

  it("supports 'experiential' provider ID in validation", async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ data: [] }, 200));

    const response = await validateProvider(new Request("http://localhost/api/providers/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "experiential", apiKey: "xpl_test_key" }),
    }));

    expect(await response.json()).toMatchObject({ valid: true });
  });
});

describe("Experiential Labs testSingleConnection", () => {
  it("returns valid:true on 200 from /v1/models", async () => {
    getProviderConnectionById.mockResolvedValueOnce({
      id: "conn-1",
      provider: "explabs",
      authType: "apikey",
      apiKey: "xpl_test_key",
    });
    global.fetch.mockResolvedValueOnce(jsonResponse({ data: [] }, 200));

    const result = await testSingleConnection("conn-1");

    expect(result.valid).toBe(true);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe("https://api.experientiallabs.ai/v1/models");
    expect(init.headers.Authorization).toBe("Bearer xpl_test_key");
  });

  it("returns valid:false and error on 401", async () => {
    getProviderConnectionById.mockResolvedValueOnce({
      id: "conn-2",
      provider: "explabs",
      authType: "apikey",
      apiKey: "bad_key",
    });
    global.fetch.mockResolvedValueOnce(jsonResponse({ error: "invalid_key" }, 401));

    const result = await testSingleConnection("conn-2");

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid API key");
  });
});

describe("Experiential Labs Claude Code & Thinking Routing", () => {
  it("resolves capabilities for claude-opus-5 with adaptive thinking", () => {
    const caps = getCapabilitiesForModel("explabs", "claude-opus-5");
    expect(caps.reasoning).toBe(true);
    expect(caps.thinkingFormat).toBe("claude-adaptive");
    expect(caps.contextWindow).toBe(1000000);
  });

  it("preserves adaptive thinking and never emits reasoning_effort for Claude Code on explabs/claude-opus-5", () => {
    const body = {
      model: "explabs/claude-opus-5",
      messages: [{ role: "user", content: "hi" }],
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
    };

    const translated = translateRequest("claude", "claude", "claude-opus-5", body, true, null, "explabs");

    expect(translated.reasoning_effort).toBeUndefined();
    expect(translated.thinking).toEqual({ type: "adaptive" });
    expect(translated.output_config).toEqual({ effort: "high" });
  });

  it("applies reasoning_effort for OpenAI-compatible client routing to explabs/claude-opus-5", () => {
    const body = {
      model: "explabs/claude-opus-5",
      messages: [{ role: "user", content: "hi" }],
      reasoning_effort: "high",
    };

    const translated = translateRequest("openai", "openai", "claude-opus-5", body, true, null, "explabs");

    expect(translated.reasoning_effort).toBe("high");
    expect(translated.thinking).toBeUndefined();
    expect(translated.output_config).toBeUndefined();
  });

  it("translates Claude Code request with adaptive thinking to claude-budget with budget_tokens for explabs/claude-fable-5.1", () => {
    const body = {
      model: "explabs/claude-fable-5.1",
      messages: [{ role: "user", content: "hi" }],
      thinking: { type: "adaptive" },
    };

    const translated = translateRequest("claude", "claude", "claude-fable-5.1", body, true, null, "explabs");

    expect(translated.thinking).toEqual({ type: "enabled", budget_tokens: 8192 });
    expect(translated.max_tokens).toBeGreaterThan(8192);
  });

  it("normalizes Claude Code thinking for non-Claude models like explabs/glm-5.3-flash to claude-budget with budget_tokens", () => {
    const body = {
      model: "explabs/glm-5.3-flash",
      messages: [{ role: "user", content: "hi" }],
      thinking: { type: "adaptive" },
    };

    const translated = translateRequest("claude", "claude", "glm-5.3-flash", body, true, null, "explabs");

    expect(translated.thinking).toEqual({ type: "enabled", budget_tokens: 8192 });
    expect(translated.max_tokens).toBeGreaterThan(8192);
  });

  it("provides logo image assets and resolves them via getProviderIconSrc", () => {
    const rootDir = path.resolve(__dirname, "../..");
    expect(fs.existsSync(path.join(rootDir, "public/providers/explabs.png"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "cli/app/public/providers/explabs.png"))).toBe(true);

    // Icon resolution resolves primary and aliases to explabs.png
    expect(getProviderIconSrc("explabs")).toBe("/providers/explabs.png");
    expect(getProviderIconSrc("experiential")).toBe("/providers/explabs.png");
    expect(getProviderIconSrc("xpl")).toBe("/providers/explabs.png");
  });
});
