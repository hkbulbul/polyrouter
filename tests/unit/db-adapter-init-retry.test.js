import { beforeEach, describe, expect, it, vi } from "vitest";

// A rejected initAdapter() used to stay cached on state.initPromise forever, so
// every later getAdapter() re-threw the same error — a transient locked/unwritable
// db file permanently bricked the gateway and only a restart cleared it.

let failNext = 0;

vi.mock("../../src/lib/db/paths.js", async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    ensureDirs: () => {
      if (failNext > 0) { failNext--; throw Object.assign(new Error("EPERM: mkdir"), { code: "EPERM" }); }
      return real.ensureDirs();
    },
  };
});

const { getAdapter } = await import("../../src/lib/db/driver.js");

beforeEach(() => {
  failNext = 0;
  delete global._dbAdapter;
  vi.useRealTimers();
});

describe("db adapter init recovery", () => {
  it("retries after a failed init instead of caching the rejection forever", async () => {
    // Fresh module state, so re-import to rebind `state` to the new global.
    vi.resetModules();
    const { getAdapter: fresh } = await import("../../src/lib/db/driver.js");

    failNext = 1;
    await expect(fresh()).rejects.toThrow(/EPERM/);

    // Inside the backoff window the cached error is re-thrown (deliberate: a
    // genuinely broken file must not re-probe the whole driver chain per request).
    await expect(fresh()).rejects.toThrow(/EPERM/);

    // Past the window the next call actually retries — and now succeeds.
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 5_001);
    const adapter = await fresh();
    vi.useRealTimers();

    expect(adapter?.driver).toBeTruthy();
  });

  it("caches the adapter once init succeeds", async () => {
    vi.resetModules();
    const { getAdapter: fresh } = await import("../../src/lib/db/driver.js");
    const a = await fresh();
    const b = await fresh();
    expect(a).toBe(b);
  });
});
