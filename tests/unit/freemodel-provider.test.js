import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/models", () => ({
  getProviderNodeById: vi.fn(),
}));

import REGISTRY from "../../open-sse/providers/registry/index.js";
import { PROVIDERS, PROVIDER_MEDIA, PROVIDER_MODELS } from "../../open-sse/providers/index.js";
import { resolveTransport } from "../../open-sse/services/provider.js";
import { POST as validateProvider } from "@/app/api/providers/validate/route.js";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("FreeModel provider registry", () => {
  it("registers FreeModel as an LLM API-key provider with native compatible routes", () => {
    const freemodel = REGISTRY.find((entry) => entry.id === "freemodel");

    expect(freemodel).toMatchObject({
      category: "apikey",
      authType: "apikey",
      alias: "fm",
      aliases: ["free-model"],
      passthroughModels: true,
      display: {
        name: "FreeModel",
        website: "https://freemodel.dev",
      },
      modelsFetcher: {
        url: "https://api.freemodel.dev/v1/models",
        type: "freemodel",
      },
    });
    expect(PROVIDERS.freemodel.baseUrl).toBe("https://api.freemodel.dev/v1/chat/completions");
    expect(resolveTransport("freemodel", "openai-responses")).toMatchObject({
      baseUrl: "https://api.freemodel.dev/v1/responses",
      auth: { header: "Authorization", scheme: "bearer" },
    });
    expect(resolveTransport("freemodel", "claude")).toMatchObject({
      baseUrl: "https://api.freemodel.dev/v1/messages",
      auth: { header: "x-api-key", scheme: "raw" },
    });
    expect(PROVIDER_MODELS.fm.map((model) => model.id)).toEqual([
      "auto",
      "FreeModel",
      "gpt-5.6-sol",
      "gpt-5.6-terra",
      "gpt-5.6-luna",
    ]);
    expect(PROVIDER_MEDIA.freemodel).toMatchObject({
      modelsFetcher: { type: "freemodel" },
    });
  });
});

describe("FreeModel API-key validation", () => {
  it.each([
    [403, false],
    [400, true],
    [429, true],
  ])("treats inference status %i as valid=%s", async (status, valid) => {
    global.fetch = vi.fn().mockResolvedValueOnce(new Response("{}", { status }));

    const response = await validateProvider(new Request("http://localhost/api/providers/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "freemodel", apiKey: "test-key" }),
    }));

    expect(await response.json()).toMatchObject({ valid });
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe("https://api.freemodel.dev/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer test-key");
    expect(JSON.parse(init.body)).toMatchObject({ model: "auto", max_tokens: 1 });
  });
});
