import { beforeEach, describe, expect, it, vi } from "vitest";

// ngrok is a second tunnel backend in the SAME slot as cloudflared. The invariants that
// make the swap safe: settings picks the backend, the other backend is stopped so it
// cannot keep re-registering its URL to the worker, and the public shortlink is
// identical across providers for a given shortId.

const state = { settings: {}, calls: [] };

vi.mock("@/lib/localDb", () => ({
  getSettings: async () => state.settings,
  updateSettings: async () => state.settings,
}));

vi.mock("../../src/lib/tunnel/cloudflare/manager.js", () => ({
  enableTunnel: async () => { state.calls.push("cf:enable"); return { success: true, provider: "cloudflare" }; },
  disableTunnel: async () => { state.calls.push("cf:disable"); return { success: true }; },
  getTunnelStatus: async () => ({ provider: "cloudflare" }),
  getTunnelService: () => ({ tag: "cf" }),
  isTunnelReconnecting: () => false,
  isTunnelManuallyDisabled: () => false,
  setTunnelUnexpectedExitCallback: () => {},
}));

vi.mock("../../src/lib/tunnel/cloudflare/cloudflared.js", () => ({
  isCloudflaredRunning: () => true,
}));

vi.mock("../../src/lib/tunnel/ngrok/manager.js", () => ({
  enableNgrok: async () => { state.calls.push("ngrok:enable"); return { success: true, provider: "ngrok" }; },
  disableNgrok: async () => { state.calls.push("ngrok:disable"); return { success: true }; },
  getNgrokStatus: async () => ({ provider: "ngrok" }),
  getNgrokService: () => ({ tag: "ngrok" }),
  isNgrokReconnecting: () => false,
  isNgrokManuallyDisabled: () => false,
}));

vi.mock("../../src/lib/tunnel/ngrok/ngrok.js", () => ({
  isNgrokRunning: () => false,
}));

const dispatch = await import("../../src/lib/tunnel/dispatch.js");
const { publicUrlFor } = await import("../../src/lib/tunnel/shared/workerRegister.js");

beforeEach(() => {
  state.settings = {};
  state.calls = [];
});

describe("tunnel provider dispatch", () => {
  it("defaults to cloudflare when tunnelProvider is unset or bogus", async () => {
    expect((await dispatch.getTunnelStatus()).provider).toBe("cloudflare");
    state.settings = { tunnelProvider: "not-a-provider" };
    expect((await dispatch.getTunnelStatus()).provider).toBe("cloudflare");
  });

  it("routes enable to the provider named in settings", async () => {
    state.settings = { tunnelProvider: "ngrok" };
    const result = await dispatch.enableTunnel(20128);
    expect(result.provider).toBe("ngrok");
    expect(state.calls).toContain("ngrok:enable");
    expect(state.calls).not.toContain("cf:enable");
  });

  it("stops the other backend before enabling, so it cannot re-register its URL", async () => {
    // cloudflared is mocked as running, ngrok's listener as absent.
    state.settings = { tunnelProvider: "ngrok" };
    await dispatch.enableTunnel(20128);
    expect(state.calls.indexOf("cf:disable")).toBeGreaterThanOrEqual(0);
    expect(state.calls.indexOf("cf:disable")).toBeLessThan(state.calls.indexOf("ngrok:enable"));

    // Reverse direction: ngrok is not up, so no needless disable (watchdog churn guard).
    state.calls = [];
    state.settings = { tunnelProvider: "cloudflare" };
    await dispatch.enableTunnel(20128);
    expect(state.calls).toEqual(["cf:enable"]);
  });

  it("disable stops BOTH backends — the user may have switched while one was up", async () => {
    state.settings = { tunnelProvider: "cloudflare" };
    await dispatch.disableTunnel();
    expect(state.calls).toEqual(expect.arrayContaining(["cf:disable", "ngrok:disable"]));
  });

  it("isTunnelProcessAlive follows the provider, not the process type", () => {
    expect(dispatch.isTunnelProcessAlive("cloudflare")).toBe(true); // cloudflared mocked running
    expect(dispatch.isTunnelProcessAlive("ngrok")).toBe(false);     // listener mocked absent
  });

  it("public shortlink is provider-independent and follows TUNNEL_WORKER_URL", () => {
    // Same shortId ⇒ same public URL, whichever backend produced the upstream URL.
    expect(publicUrlFor("ab23cd")).toBe(`https://rab23cd.${new URL(process.env.TUNNEL_WORKER_URL || "https://abc-tunnel.us").host}`);
    expect(publicUrlFor("")).toBe("");
  });
});
