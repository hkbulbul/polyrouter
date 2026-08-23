import { describe, expect, it, vi } from "vitest";

// Both singleflight layers that wrap token refresh used to pin an in-flight promise
// with no staleness check: dedup.js only ever expiry-checked *settled* results, and
// oauthCredentialManager.js only cleared on settle. A token endpoint that never
// answered therefore blocked every later refresh for that key until restart.

const TTL = 35_000;   // TOKEN_REFRESH_TIMEOUT_MS (30s) + 5s grace

const { dedupRefresh } = await import("../../open-sse/services/tokenRefresh/dedup.js");
const { withCredentialRefreshLock } = await import("../../open-sse/services/oauthCredentialManager.js");

describe("dedupRefresh in-flight TTL", () => {
  it("coalesces concurrent refreshes for the same token", async () => {
    let calls = 0;
    const fn = async () => { calls++; return { accessToken: "t1" }; };
    const [a, b] = await Promise.all([
      dedupRefresh("p", "old-a", fn),
      dedupRefresh("p", "old-a", fn),
    ]);
    expect(calls).toBe(1);
    expect(a).toBe(b);
  });

  it("re-attempts once a hung refresh exceeds the TTL instead of pinning the key", async () => {
    vi.useFakeTimers();
    try {
      let calls = 0;
      const hang = () => { calls++; return new Promise(() => {}); };

      const stuck = dedupRefresh("p", "old-b", hang);
      stuck.catch(() => {});
      expect(calls).toBe(1);

      // Still inside the window → reuse, no second attempt.
      dedupRefresh("p", "old-b", hang).catch(() => {});
      expect(calls).toBe(1);

      vi.setSystemTime(Date.now() + TTL + 1);

      const retry = dedupRefresh("p", "old-b", async () => ({ accessToken: "recovered" }));
      expect(calls).toBe(1);                          // hang() not called again
      await expect(retry).resolves.toEqual({ accessToken: "recovered" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("clears the key when a refresh rejects, so the next caller retries", async () => {
    await expect(dedupRefresh("p", "old-c", async () => { throw new Error("timeout"); })).rejects.toThrow("timeout");
    await expect(dedupRefresh("p", "old-c", async () => ({ accessToken: "ok" }))).resolves.toEqual({ accessToken: "ok" });
  });
});

describe("withCredentialRefreshLock in-flight TTL", () => {
  const creds = (id) => ({ connectionId: id });

  it("coalesces concurrent refreshes for the same connection", async () => {
    let calls = 0;
    const fn = async () => { calls++; return "done"; };
    await Promise.all([
      withCredentialRefreshLock("p", creds("c1"), fn),
      withCredentialRefreshLock("p", creds("c1"), fn),
    ]);
    expect(calls).toBe(1);
  });

  it("discards a hung lock past the TTL", async () => {
    vi.useFakeTimers();
    try {
      let calls = 0;
      const hang = () => { calls++; return new Promise(() => {}); };

      withCredentialRefreshLock("p", creds("c2"), hang).catch(() => {});
      withCredentialRefreshLock("p", creds("c2"), hang).catch(() => {});
      await Promise.resolve();   // the impl defers refreshFn onto a microtask
      expect(calls).toBe(1);

      vi.setSystemTime(Date.now() + TTL + 1);
      await expect(withCredentialRefreshLock("p", creds("c2"), async () => "recovered")).resolves.toBe("recovered");
      expect(calls).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("clears the lock on rejection", async () => {
    await expect(withCredentialRefreshLock("p", creds("c3"), async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    await expect(withCredentialRefreshLock("p", creds("c3"), async () => "ok")).resolves.toBe("ok");
  });
});
