import { describe, expect, it } from "vitest";
import {
  COMMAND_CODE_MANAGED_FIELD,
  adoptCommandCodeConfig,
  applyCommandCodeConfig,
  inspectCommandCodeConfig,
  isCommandCodeVersionSupported,
  normalizeCommandCodeBaseUrl,
  parseCommandCodeConfig,
  resetCommandCodeConfig,
} from "../../src/lib/commandCodeConfig.js";

const INPUT = {
  baseUrl: "http://127.0.0.1:20128/",
  models: ["cc/anthropic/claude-sonnet-5", "combo/team/fallback"],
  authMode: "keyless",
};

const apply = (content = "{}", input = INPUT) => applyCommandCodeConfig(content, input);

function expectConfigError(fn, code) {
  expect(fn).toThrow(expect.objectContaining({ code }));
}

describe("commandCodeConfig", () => {
  it("creates the canonical provider map with metadata for every model", () => {
    const result = apply();
    const entry = result.config.provider.polyrouter;

    expect(result.operation).toBe("create");
    expect(entry).toMatchObject({
      name: "PolyRouter",
      api: "openai-completions",
      baseURL: "http://127.0.0.1:20128/v1",
      apiKey: false,
      [COMMAND_CODE_MANAGED_FIELD]: true,
    });
    expect(Object.keys(entry.models)).toEqual(INPUT.models);
    expect(entry.models[INPUT.models[0]]).toMatchObject({
      name: INPUT.models[0],
      contextWindow: 1000000,
      maxOutput: 128000,
      reasoning: true,
    });
    expect(entry.models[INPUT.models[1]]).toMatchObject({
      name: INPUT.models[1],
      contextWindow: expect.any(Number),
      maxOutput: expect.any(Number),
      reasoning: expect.any(Boolean),
    });
  });

  it("trims and deduplicates model IDs while preserving order", () => {
    const result = apply("{}", {
      ...INPUT,
      models: [" first/model ", "second/model", "first/model"],
    });

    expect(Object.keys(result.entry.models)).toEqual(["first/model", "second/model"]);
  });

  it("preserves an existing plural provider map and unrelated data", () => {
    const content = JSON.stringify({
      theme: "dark",
      providers: { other: { name: "Other" } },
    });
    const result = apply(content);

    expect(result.mapKey).toBe("providers");
    expect(result.config.theme).toBe("dark");
    expect(result.config.providers.other).toEqual({ name: "Other" });
    expect(result.config.provider).toBeUndefined();
  });

  it("replaces model membership exactly and preserves retained metadata", () => {
    const first = apply().content;
    const parsed = JSON.parse(first);
    parsed.provider.polyrouter.custom = "keep";
    parsed.provider.polyrouter.models[INPUT.models[0]] = {
      ...parsed.provider.polyrouter.models[INPUT.models[0]],
      customMetadata: "keep",
      contextWindow: 42,
    };

    const second = apply(JSON.stringify(parsed), {
      ...INPUT,
      models: [INPUT.models[0], "new/model"],
      authMode: "environment",
    });

    expect(second.operation).toBe("update");
    expect(second.entry.custom).toBe("keep");
    expect(Object.keys(second.entry.models)).toEqual([INPUT.models[0], "new/model"]);
    expect(second.entry.models[INPUT.models[0]]).toEqual(parsed.provider.polyrouter.models[INPUT.models[0]]);
    expect(second.entry.models[INPUT.models[1]]).toBeUndefined();
    expect(second.entry.models["new/model"]).toMatchObject({ name: "new/model" });
    expect(second.entry.apiKey).toBe("$POLYROUTER_API_KEY");
  });

  it("is idempotent for an exact multi-model Apply", () => {
    const first = apply().content;
    expect(apply(first).content).toBe(first);
  });

  it("uses Command Code native stored credentials without an inline apiKey", () => {
    const result = apply("{}", { ...INPUT, authMode: "stored" });

    expect(result.entry).not.toHaveProperty("apiKey");
    expect(inspectCommandCodeConfig(result.content).settings.authMode).toBe("stored");
    expect(apply(result.content, { ...INPUT, authMode: "stored" }).content).toBe(result.content);
  });

  it("rejects invalid model arrays and elements", () => {
    for (const models of [undefined, null, [], "model", [""], [null], [`ok/model`, `bad\nmodel`]]) {
      expectConfigError(
        () => apply("{}", { ...INPUT, models }),
        Array.isArray(models) && models.length > 0 ? "INVALID_MODEL" : "INVALID_MODELS",
      );
    }
    expectConfigError(
      () => apply("{}", { ...INPUT, models: ["x".repeat(513)] }),
      "INVALID_MODEL",
    );
  });

  it("rejects raw, unknown, and remote keyless authentication", () => {
    expectConfigError(
      () => apply("{}", { ...INPUT, authMode: "sk-secret" }),
      "INVALID_AUTH_MODE",
    );
    expectConfigError(
      () => apply("{}", { ...INPUT, authMode: undefined, apiKey: "sk-secret" }),
      "INVALID_AUTH_MODE",
    );
    expectConfigError(
      () => apply("{}", { ...INPUT, baseUrl: "https://router.example", authMode: "keyless" }),
      "REMOTE_KEY_REQUIRED",
    );
    expect(apply("{}", {
      ...INPUT,
      baseUrl: "https://router.example",
      authMode: "environment",
    }).entry.apiKey).toBe("$POLYROUTER_API_KEY");
  });

  it("preserves custom authentication opaquely only for the unchanged endpoint", () => {
    const custom = JSON.stringify({
      provider: {
        polyrouter: {
          name: "PolyRouter",
          api: "openai-completions",
          polyrouterManaged: true,
          baseURL: "https://router.example/v1",
          apiKey: "$CUSTOM_ROUTER_KEY",
          models: { "old/model": { name: "old/model", custom: true } },
        },
      },
    });
    const preserved = apply(custom, {
      baseUrl: "https://router.example/",
      models: ["old/model", "new/model"],
      authMode: "preserve",
    });

    expect(preserved.entry.apiKey).toBe("$CUSTOM_ROUTER_KEY");
    expectConfigError(
      () => apply("{}", { ...INPUT, authMode: "preserve" }),
      "INVALID_AUTH_MODE",
    );
    expectConfigError(
      () => apply(custom, {
        baseUrl: "https://other.example",
        models: ["old/model"],
        authMode: "preserve",
      }),
      "INVALID_AUTH_MODE",
    );
  });

  it("treats headers as opaque authentication and removes them when auth is replaced", () => {
    const content = JSON.stringify({
      provider: {
        polyrouter: {
          name: "PolyRouter",
          api: "openai-completions",
          polyrouterManaged: true,
          baseURL: "https://router.example/v1",
          apiKey: false,
          headers: { Authorization: "Bearer secret", "X-API-Key": "secret" },
          models: { "old/model": { name: "old/model" } },
        },
      },
    });

    expect(inspectCommandCodeConfig(content).settings.authMode).toBe("custom");
    const preserved = apply(content, {
      baseUrl: "https://router.example",
      models: ["old/model"],
      authMode: "preserve",
    });
    expect(preserved.entry.headers).toEqual({
      Authorization: "Bearer secret",
      "X-API-Key": "secret",
    });

    const replaced = apply(content, {
      baseUrl: "https://other.example",
      models: ["old/model"],
      authMode: "environment",
    });
    expect(replaced.entry.headers).toBeUndefined();
    expect(replaced.entry.apiKey).toBe("$POLYROUTER_API_KEY");
    expect(JSON.stringify(replaced.entry)).not.toContain("secret");
  });

  it("activates a disabled owned provider when Apply succeeds", () => {
    const config = apply().config;
    config.provider.polyrouter.disabled = true;
    config.provider.polyrouter.enabled = false;

    expect(inspectCommandCodeConfig(JSON.stringify(config)).settings.disabled).toBe(true);
    const activated = apply(JSON.stringify(config));
    expect(activated.entry.disabled).toBeUndefined();
    expect(activated.entry.enabled).toBeUndefined();
    expect(inspectCommandCodeConfig(activated.content).settings.disabled).toBe(false);
  });

  it("normalizes safe URLs and rejects secret-bearing or cleartext remote URLs", () => {
    expect(normalizeCommandCodeBaseUrl("https://router.example/api///"))
      .toBe("https://router.example/api/v1");
    expect(normalizeCommandCodeBaseUrl("http://localhost:20128/v1/"))
      .toBe("http://localhost:20128/v1");
    expect(normalizeCommandCodeBaseUrl("http://[::1]:20128"))
      .toBe("http://[::1]:20128/v1");

    for (const value of [
      "file:///tmp/router",
      "https://user:pass@router.example",
      "https://router.example?key=value",
      "https://router.example/#section",
      "not a URL",
    ]) {
      expectConfigError(() => normalizeCommandCodeBaseUrl(value), "INVALID_BASE_URL");
    }
    for (const value of ["http://router.example", "http://192.168.1.8:20128"]) {
      expectConfigError(() => normalizeCommandCodeBaseUrl(value), "INSECURE_REMOTE_HTTP");
    }
  });

  it("rejects malformed, ambiguous, and foreign provider configurations", () => {
    expectConfigError(() => parseCommandCodeConfig("{"), "INVALID_JSON");
    expectConfigError(() => parseCommandCodeConfig("[]"), "INVALID_ROOT");
    expectConfigError(
      () => parseCommandCodeConfig('{"provider":[],"providers":{}}'),
      "AMBIGUOUS_PROVIDER_MAP",
    );
    expectConfigError(
      () => parseCommandCodeConfig('{"provider":[]}'),
      "INVALID_PROVIDER_MAP",
    );
    expectConfigError(
      () => apply('{"provider":{"polyrouter":{"name":"Someone Else"}}}'),
      "PROVIDER_ID_CONFLICT",
    );
  });

  it("never adopts, overwrites, or resets a markerless lookalike", () => {
    const content = JSON.stringify({
      provider: {
        polyrouter: {
          name: "PolyRouter",
          api: "openai-completions",
          baseURL: "http://127.0.0.1:20128/v1",
          apiKey: false,
          models: { "user/model": { name: "user/model" } },
        },
      },
    });
    const inspected = inspectCommandCodeConfig(content);

    expect(inspected).toEqual({
      mapKey: "provider",
      hasPolyRouter: false,
      collision: true,
      settings: null,
      warnings: [],
    });
    expectConfigError(() => apply(content), "PROVIDER_ID_CONFLICT");
    expectConfigError(() => resetCommandCodeConfig(content), "PROVIDER_ID_CONFLICT");

    const adopted = adoptCommandCodeConfig(content);
    expect(adopted.config.provider.polyrouter).toEqual({
      ...JSON.parse(content).provider.polyrouter,
      polyrouterManaged: true,
    });
    expect(inspectCommandCodeConfig(adopted.content).hasPolyRouter).toBe(true);
    expect(resetCommandCodeConfig(adopted.content).changed).toBe(true);
    expectConfigError(
      () => adoptCommandCodeConfig('{"provider":{"polyrouter":{"polyrouterManaged":false}}}'),
      "INVALID_OWNERSHIP_MARKER",
    );
    expectConfigError(
      () => adoptCommandCodeConfig('{"provider":{"polyrouter":{"api":"anthropic-messages","baseURL":"https://example.com","models":{}}}}'),
      "INVALID_PROVIDER",
    );
  });

  it("classifies only valid Command Code authentication forms as preservable", () => {
    const inspectAuth = (authentication) => {
      const config = apply().config;
      delete config.provider.polyrouter.apiKey;
      Object.assign(config.provider.polyrouter, authentication);
      return inspectCommandCodeConfig(JSON.stringify(config));
    };

    expect(inspectAuth({}).settings.authMode).toBe("stored");

    for (const authentication of [
      { apiKey: "raw-secret" },
      { apiKey: "$9INVALID" },
      { apiKey: "{env:INVALID-NAME}" },
      { apiKey: "!" },
      { headers: {} },
      { headers: { Authorization: 42 } },
    ]) {
      const inspected = inspectAuth(authentication);
      expect(inspected.settings.authMode).toBe("invalid");
      expect(inspected.warnings).toContain(
        "The existing PolyRouter authentication is invalid and cannot be preserved.",
      );
      expectConfigError(
        () => applyCommandCodeConfig(JSON.stringify({
          provider: {
            polyrouter: {
              ...apply().entry,
              apiKey: undefined,
              ...authentication,
            },
          },
        }), { ...INPUT, authMode: "preserve" }),
        "INVALID_AUTH_MODE",
      );
    }

    for (const apiKey of ["$OTHER_ROUTER_KEY", "{env:OTHER_ROUTER_KEY}", "!secret-tool read router-key"]) {
      const inspected = inspectAuth({ apiKey });
      expect(inspected.settings.authMode).toBe("custom");
      expect(inspected.warnings).toEqual([]);
    }
  });

  it("reports only sanitized ownership state", () => {
    const custom = apply().config;
    custom.provider.polyrouter.apiKey = "$CUSTOM_ROUTER_KEY";
    const inspected = inspectCommandCodeConfig(JSON.stringify(custom));

    expect(inspected).toEqual({
      mapKey: "provider",
      hasPolyRouter: true,
      collision: false,
      settings: {
        baseUrl: "http://127.0.0.1:20128/v1",
        baseUrlValid: true,
        models: INPUT.models,
        authMode: "custom",
        disabled: false,
      },
      warnings: [],
    });
    expect(JSON.stringify(inspected)).not.toContain("CUSTOM_ROUTER_KEY");
    expect(inspected).not.toHaveProperty("entry");
    expect(inspected).not.toHaveProperty("config");
  });

  it("redacts an unsafe existing base URL", () => {
    const config = apply().config;
    config.provider.polyrouter.baseURL = "https://user:secret@router.example/v1?token=secret";
    const inspected = inspectCommandCodeConfig(JSON.stringify(config));

    expect(inspected.settings.baseUrl).toBe("");
    expect(inspected.settings.baseUrlValid).toBe(false);
    expect(inspected.warnings).toHaveLength(1);
    expect(JSON.stringify(inspected)).not.toContain("secret");
    expect(JSON.stringify(inspected)).not.toContain("router.example");
  });

  it("resets only the owned entry and is idempotent", () => {
    const configured = JSON.parse(apply('{"otherTopLevel":true,"provider":{"other":{"name":"Other"}}}').content);
    const reset = resetCommandCodeConfig(JSON.stringify(configured));

    expect(reset.changed).toBe(true);
    expect(reset.config).toEqual({
      otherTopLevel: true,
      provider: { other: { name: "Other" } },
    });
    expect(resetCommandCodeConfig(reset.content).changed).toBe(false);
  });

  it("refuses to reset a foreign provider collision", () => {
    expectConfigError(
      () => resetCommandCodeConfig('{"provider":{"polyrouter":{"name":"Foreign"}}}'),
      "PROVIDER_ID_CONFLICT",
    );
  });

  it("compares supported Command Code versions numerically", () => {
    expect(isCommandCodeVersionSupported("1.29.99")).toBe(false);
    expect(isCommandCodeVersionSupported("1.30.0")).toBe(true);
    expect(isCommandCodeVersionSupported("1.30.0-beta.1")).toBe(false);
    expect(isCommandCodeVersionSupported("1.31.0-beta.1")).toBe(true);
    expect(isCommandCodeVersionSupported("1.32.1")).toBe(true);
    expect(isCommandCodeVersionSupported("2.0.0")).toBe(true);
    expect(isCommandCodeVersionSupported("unknown")).toBe(false);
  });
});
