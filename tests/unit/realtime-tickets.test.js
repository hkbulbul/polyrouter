import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consumeRealtimeTicket, issueRealtimeTicket } from "../../src/realtime/tickets.js";

describe("realtime browser tickets", () => {
  beforeEach(() => {
    process.env.REALTIME_INTERNAL_SECRET = "test-realtime-ticket-secret";
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.REALTIME_INTERNAL_SECRET;
  });

  it("issues a provider/model/origin scoped single-use ticket", () => {
    const { ticket, expiresAt } = issueRealtimeTicket({
      provider: "codex",
      model: "gpt-realtime-2",
      origin: "https://voice.example.com/path",
    });

    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(consumeRealtimeTicket(ticket, {
      provider: "codex",
      model: "gpt-realtime-2",
      origin: "https://voice.example.com",
    }).origin).toBe("https://voice.example.com");
    expect(() => consumeRealtimeTicket(ticket, {
      provider: "codex",
      model: "gpt-realtime-2",
      origin: "https://voice.example.com",
    })).toThrow(/already been used/i);
  });

  it("does not consume a ticket when its scope is wrong", () => {
    const { ticket } = issueRealtimeTicket({
      provider: "codex",
      model: "gpt-realtime-2",
      origin: "https://voice.example.com",
    });

    expect(() => consumeRealtimeTicket(ticket, {
      provider: "codex",
      model: "gpt-realtime-mini",
      origin: "https://voice.example.com",
    })).toThrow(/scope/i);
    expect(() => consumeRealtimeTicket(ticket, {
      provider: "codex",
      model: "gpt-realtime-2",
      origin: "https://other.example.com",
    })).toThrow(/origin/i);
    expect(() => consumeRealtimeTicket(ticket, {
      provider: "codex",
      model: "gpt-realtime-2",
      origin: "https://voice.example.com",
    })).not.toThrow();
  });

  it("rejects tampered and expired tickets", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const { ticket } = issueRealtimeTicket({
      provider: "codex",
      model: "gpt-realtime-2",
      origin: "https://voice.example.com",
      ttlSeconds: 1,
    });

    expect(() => consumeRealtimeTicket(`${ticket}x`, {
      provider: "codex",
      model: "gpt-realtime-2",
      origin: "https://voice.example.com",
    })).toThrow(/invalid/i);
    vi.advanceTimersByTime(2000);
    expect(() => consumeRealtimeTicket(ticket, {
      provider: "codex",
      model: "gpt-realtime-2",
      origin: "https://voice.example.com",
    })).toThrow(/expired/i);
  });

  it("requires HTTPS for public browser origins but permits localhost development", () => {
    expect(() => issueRealtimeTicket({
      provider: "codex",
      model: "gpt-realtime-2",
      origin: "http://voice.example.com",
    })).toThrow(/must use HTTPS/i);
    expect(() => issueRealtimeTicket({
      provider: "codex",
      model: "gpt-realtime-2",
      origin: "http://localhost:3000",
    })).not.toThrow();
  });
});
