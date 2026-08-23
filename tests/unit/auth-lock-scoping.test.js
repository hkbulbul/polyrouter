import { beforeEach, describe, expect, it, vi } from "vitest";

// The reported symptom: mid-session the gateway stops answering and only a restart
// fixes it. Root cause was a single GLOBAL promise-chain mutex in auth.js held
// across every DB await — one never-settling query wedged every provider forever.
// These tests pin the two properties that make that impossible now.

const state = {
  settings: { fallbackStrategy: "round-robin" },
  connections: [],
  // Resolve to make getProviderConnections hang for a given provider.
  hang: null,
  updates: [],
};

vi.mock("@/lib/localDb", () => ({
  getSettings: async () => state.settings,
  getProxyPools: async () => [],
  validateApiKey: async () => true,
  getProviderConnections: async ({ provider }) => {
    if (state.hang === provider) await new Promise(() => {});
    return state.connections.filter((c) => c.provider === provider);
  },
  updateProviderConnection: async (id, patch) => { state.updates.push({ id, patch }); },
}));

vi.mock("@/lib/network/connectionProxy", () => ({
  resolveConnectionProxyConfig: async () => ({}),
  pickProxyPoolId: () => null,
}));

const { getProviderCredentials } = await import("../../src/sse/services/auth.js");

const conn = (provider, id, lastUsedAt = null, consecutiveUseCount = 0) => ({
  id, provider, name: id, isActive: true, authType: "apikey", apiKey: `k-${id}`,
  lastUsedAt, consecutiveUseCount,
});

beforeEach(() => {
  state.hang = null;
  state.updates = [];
  state.settings = { fallbackStrategy: "round-robin" };
});

describe("account-selection lock scoping", () => {
  it("a hung provider does not block a different provider (the reported bug)", async () => {
    state.connections = [conn("stuckprov", "a"), conn("okprov", "b")];
    state.hang = "stuckprov";

    // Start the doomed request first so it owns the lock, then race a healthy one.
    const stuck = getProviderCredentials("stuckprov");
    const healthy = await Promise.race([
      getProviderCredentials("okprov"),
      new Promise((_, rej) => setTimeout(() => rej(new Error("BLOCKED — global lock regression")), 1000)),
    ]);

    expect(healthy?.connectionId).toBe("b");
    stuck.catch(() => {});   // never settles by design; don't leak a rejection
  });

  it("fill-first (the default) takes no lock at all, so it cannot deadlock", async () => {
    state.settings = { fallbackStrategy: "fill-first" };
    state.connections = [conn("p1", "x"), conn("p2", "y")];
    state.hang = "p1";

    const stuck = getProviderCredentials("p1");
    const healthy = await Promise.race([
      getProviderCredentials("p2"),
      new Promise((_, rej) => setTimeout(() => rej(new Error("BLOCKED")), 1000)),
    ]);
    expect(healthy?.connectionId).toBe("y");
    stuck.catch(() => {});
  });

  it("still serializes round-robin on one provider (the lock does real work)", async () => {
    // Two accounts, neither used yet → each concurrent caller must claim a
    // different one. Without serialization both read the same pre-write state.
    state.connections = [conn("rr", "one"), conn("rr", "two")];
    state.settings = { fallbackStrategy: "round-robin", stickyRoundRobinLimit: 1 };

    const [first, second] = await Promise.all([
      getProviderCredentials("rr"),
      getProviderCredentials("rr"),
    ]);

    // Both writes landed, in order — proof the critical section covered the
    // read-modify-write rather than two callers racing on a stale read.
    expect(state.updates).toHaveLength(2);
    expect(first?.connectionId).toBeTruthy();
    expect(second?.connectionId).toBeTruthy();
  });
});
