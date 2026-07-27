import { describe, expect, it, vi } from "vitest";
import { createOpenAIOAuthRelayState } from "../../src/shared/utils/openaiOAuthRelay.js";

const decodeBase64Url = (value) => {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
};

describe("OpenAI OAuth browser-extension relay state", () => {
  it("encodes the callback URL and original application state", () => {
    vi.stubGlobal("btoa", (value) => Buffer.from(value, "binary").toString("base64"));
    vi.stubGlobal("crypto", {
      getRandomValues: (bytes) => {
        bytes.fill(7);
        return bytes;
      },
    });

    const state = createOpenAIOAuthRelayState(
      "http://localhost:20128/callback",
      "original-state"
    );
    expect(state.startsWith("oo2_")).toBe(true);

    const payload = JSON.parse(decodeBase64Url(state.slice(4)));
    expect(payload).toEqual({
      type: "openai-oauth-callback",
      version: 1,
      nonce: expect.any(String),
      callbackUrl: "http://localhost:20128/callback",
      appState: "original-state",
    });

    vi.unstubAllGlobals();
  });
});
