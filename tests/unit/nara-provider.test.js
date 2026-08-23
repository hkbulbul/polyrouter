import { describe, expect, it } from "vitest";
import { PROVIDERS } from "open-sse/config/providers.js";
import { PROVIDER_MODELS, getDefaultModel, isValidModel } from "open-sse/config/providerModels.js";

// Live-probed 2026-08-22 against router.bynara.id with a real sk-nry-* key:
// /v1/chat/completions (Bearer) 200, /v1/messages (x-api-key) 200, stream 200,
// gpt-4o-mini 404 (no OpenAI passthrough names), /v1/images/generations "Image model is unavailable."
describe("nara provider registry", () => {
  it("registers transport on the OpenAI surface", () => {
    const p = PROVIDERS.nara;
    expect(p).toBeTruthy();
    expect(p.baseUrl).toBe("https://router.bynara.id/v1/chat/completions");
    expect(p.format).toBe("openai");
    expect(p.validateUrl).toBe("https://router.bynara.id/v1/models");
  });

  it("exposes both OpenAI and Claude surfaces with their own auth headers", () => {
    const t = PROVIDERS.nara.transports ?? [];
    expect(t).toHaveLength(2);
    const openai = t.find(x => x.format === "openai");
    const claude = t.find(x => x.format === "claude");
    expect(openai.auth).toMatchObject({ header: "Authorization", scheme: "bearer" });
    expect(claude.baseUrl).toBe("https://router.bynara.id/v1/messages");
    expect(claude.auth).toMatchObject({ header: "x-api-key", scheme: "raw" });
  });

  it("defaults to the cheapest confirmed-working model", () => {
    expect(getDefaultModel("nara")).toBe("agnes-2.0-flash");
  });

  it("validates catalog ids and rejects OpenAI passthrough names", () => {
    expect(isValidModel("nara", "claude-fable-5")).toBe(true);
    expect(isValidModel("nara", "gpt-5.6-luna")).toBe(true);
    // Upstream 404s "The requested model does not exist." for OpenAI-style ids.
    expect(isValidModel("nara", "gpt-4o-mini")).toBe(false);
  });

  it("omits the image/video ids upstream reports as unavailable", () => {
    const ids = PROVIDER_MODELS.nara.map(m => m.id);
    expect(ids.filter(id => /agnes-(image|video)/.test(id))).toEqual([]);
  });
});
