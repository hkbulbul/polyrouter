import { beforeEach, describe, expect, it, vi } from "vitest";
import { isModelNotSupportedError, checkFallbackError } from "open-sse/services/accountFallback.js";
import { TRANSIENT_COOLDOWN_MS, MODEL_UNSUPPORTED_COOLDOWN_MS } from "open-sse/config/errorConfig.js";

const dbMocks = vi.hoisted(() => ({
  getProviderConnections: vi.fn(async () => [{ id: "conn_1", name: "acct", backoffLevel: 0 }]),
  updateProviderConnection: vi.fn(async () => ({})),
  validateApiKey: vi.fn(async () => true),
  getSettings: vi.fn(async () => ({})),
  getProxyPools: vi.fn(async () => []),
}));

vi.mock("@/lib/localDb", () => dbMocks);

const { markAccountUnavailable } = await import("@/sse/services/auth.js");

// Real upstream body, as chatCore formats it into result.error
const CODEX_400 = '[400]: {"detail":"The \'gpt-5.6-sol\' model is not supported when using Codex with a ChatGPT account."}';

beforeEach(() => {
  vi.clearAllMocks();
  dbMocks.getProviderConnections.mockResolvedValue([{ id: "conn_1", name: "acct", backoffLevel: 0 }]);
});

describe("permanent model rejection classification", () => {
  it("matches the Codex unsupported-model 400", () => {
    expect(isModelNotSupportedError(400, CODEX_400)).toBe(true);
  });

  it("matches other providers' unsupported-model phrasing", () => {
    expect(isModelNotSupportedError(400, "The model 'gpt-9' does not exist or you do not have access to it")).toBe(true);
    expect(isModelNotSupportedError(400, JSON.stringify({ error: { code: "model_not_found" } }))).toBe(true);
  });

  it("leaves other errors to the normal fallback path", () => {
    expect(isModelNotSupportedError(400, "Invalid JSON body")).toBe(false);
    expect(isModelNotSupportedError(400, "rate limit exceeded")).toBe(false);
    expect(isModelNotSupportedError(429, "model is not supported")).toBe(false);
    expect(isModelNotSupportedError(400, "")).toBe(false);
  });
});

describe("markAccountUnavailable on a model-entitlement rejection", () => {
  it("rotates to the next account, locking only that model", async () => {
    const result = await markAccountUnavailable("conn_1", 400, CODEX_400, "codex", "gpt-5.6-sol");

    // Rollout-gated models are per-account: the next account may be entitled.
    expect(result.shouldFallback).toBe(true);
    const [, update] = dbMocks.updateProviderConnection.mock.calls[0];
    expect(update["modelLock_gpt-5.6-sol"]).toBeTruthy();
    expect(update["modelLock___all"]).toBeUndefined();
  });

  it("does not treat it as a 30s transient", () => {
    expect(checkFallbackError(400, CODEX_400).cooldownMs).toBe(MODEL_UNSUPPORTED_COOLDOWN_MS);
    expect(MODEL_UNSUPPORTED_COOLDOWN_MS).toBeGreaterThan(TRANSIENT_COOLDOWN_MS);
  });

  it("still locks and rotates on a real rate limit", async () => {
    const result = await markAccountUnavailable("conn_1", 429, "rate limit exceeded", "codex", "gpt-5.6-sol");

    expect(result.shouldFallback).toBe(true);
    expect(dbMocks.updateProviderConnection).toHaveBeenCalledTimes(1);
    const [, update] = dbMocks.updateProviderConnection.mock.calls[0];
    expect(update["modelLock_gpt-5.6-sol"]).toBeTruthy();
    expect(update.testStatus).toBe("unavailable");
  });
});
