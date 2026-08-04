import { describe, expect, it } from "vitest";
import {
  originMatchesHost,
  extractRealtimeApiKey,
  requestIsLoopback,
  validateRealtimeRequestBoundary,
} from "../../src/realtime/auth.js";

function request({ ip = "127.0.0.1", host = "localhost:20128", origin } = {}) {
  return {
    headers: {
      host,
      ...(origin === undefined ? {} : { origin }),
      "x-9r-real-ip": ip,
    },
    socket: { remoteAddress: ip },
  };
}

describe("realtime request boundary", () => {
  it("extracts API keys from server headers and browser query compatibility", () => {
    expect(extractRealtimeApiKey({ headers: { authorization: "Bearer server-key" } })).toBe("server-key");
    expect(extractRealtimeApiKey({ headers: { "x-api-key": "header-key" } })).toBe("header-key");
    expect(extractRealtimeApiKey({ headers: {}, realtimeApiKey: "query-key" })).toBe("query-key");
  });

  it("preserves passwordless localhost access", () => {
    expect(() => validateRealtimeRequestBoundary(request(), { requireLogin: false, hasSession: false })).not.toThrow();
  });

  it("requires a session for authenticated localhost dashboards", () => {
    expect(() => validateRealtimeRequestBoundary(request(), { requireLogin: true, hasSession: false })).toThrow(/authentication/i);
  });

  it("allows same-origin tunnel access with a dashboard session", () => {
    const tunnelRequest = request({
      ip: "203.0.113.20",
      host: "router.example.test",
      origin: "https://router.example.test",
    });
    expect(requestIsLoopback(tunnelRequest)).toBe(false);
    expect(originMatchesHost(tunnelRequest)).toBe(true);
    expect(() => validateRealtimeRequestBoundary(tunnelRequest, { requireLogin: false, hasSession: true })).not.toThrow();
  });

  it("rejects passwordless remote access", () => {
    const tunnelRequest = request({
      ip: "203.0.113.20",
      host: "router.example.test",
      origin: "https://router.example.test",
    });
    expect(() => validateRealtimeRequestBoundary(tunnelRequest, { requireLogin: false, hasSession: false })).toThrow(/authentication/i);
  });

  it("rejects cross-origin browser connections", () => {
    const crossOriginRequest = request({
      host: "localhost:20128",
      origin: "https://attacker.example",
    });
    expect(originMatchesHost(crossOriginRequest)).toBe(false);
    expect(() => validateRealtimeRequestBoundary(crossOriginRequest, { requireLogin: false, hasSession: false })).toThrow(/dashboard origin/i);
  });
});
