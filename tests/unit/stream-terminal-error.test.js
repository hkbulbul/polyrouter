import { describe, expect, it } from "vitest";

import { createDisconnectAwareStream } from "../../open-sse/utils/streamHandler.js";
import { buildTerminalErrorBytes, formatTerminalErrorFrame } from "../../open-sse/utils/terminalError.js";
import { FORMATS } from "../../open-sse/translator/formats.js";

function makeController() {
  let connected = true;
  return {
    signal: new AbortController().signal,
    startTime: Date.now(),
    isConnected: () => connected,
    handleComplete: () => { connected = false; },
    handleError: () => { connected = false; },
    handleDisconnect: () => { connected = false; },
    abort: () => { connected = false; },
  };
}

function erroringUpstream(error) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("data: hi\n\n"));
      controller.error(error);
    },
  });
}

const asTransform = (readable) => ({
  readable,
  writable: { getWriter: () => ({ abort: () => Promise.resolve() }) },
});

async function readAll(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

describe("terminal error frame shape", () => {
  it("gives OpenAI clients an error object plus the [DONE] sentinel", () => {
    const frame = formatTerminalErrorFrame(FORMATS.OPENAI, "boom");
    expect(frame).toContain('"message":"boom"');
    expect(frame).toContain('"code":"bad_gateway"');
    expect(frame).toContain("data: [DONE]");
  });

  it("gives Claude clients an `event: error` frame and no sentinel", () => {
    const frame = formatTerminalErrorFrame(FORMATS.CLAUDE, "boom");
    expect(frame).toContain("event: error");
    expect(frame).toContain('"type":"error"');
    expect(frame).not.toContain("[DONE]");
  });

  // Gemini-family clients reject `data: [DONE]` with a 400 syntax error.
  it.each([FORMATS.GEMINI, FORMATS.GEMINI_CLI, FORMATS.VERTEX, FORMATS.ANTIGRAVITY])(
    "omits the [DONE] sentinel for %s",
    (format) => {
      const frame = formatTerminalErrorFrame(format, "boom");
      expect(frame).toContain('"message":"boom"');
      expect(frame).not.toContain("[DONE]");
    }
  );
});

describe("mid-stream death reaches the client", () => {
  it("appends a terminal error frame instead of closing silently", async () => {
    const out = createDisconnectAwareStream(
      asTransform(erroringUpstream(Object.assign(new Error("terminated"), { code: "ECONNRESET" }))),
      makeController(),
      buildTerminalErrorBytes(FORMATS.OPENAI)
    );

    const text = await readAll(out);
    // Before this change the stream closed here with zero extra bytes, which a
    // client cannot distinguish from a short-but-complete answer.
    expect(text).toContain('"code":"bad_gateway"');
  });
});

describe("account penalty gating (the correctness crux)", () => {
  const collectAborts = () => {
    const seen = [];
    return { seen, cb: (e) => seen.push(e) };
  };

  it("penalizes a genuine upstream reset", async () => {
    const { seen, cb } = collectAborts();
    const out = createDisconnectAwareStream(
      asTransform(erroringUpstream(Object.assign(new Error("terminated"), { code: "ECONNRESET" }))),
      makeController(),
      buildTerminalErrorBytes(FORMATS.OPENAI),
      cb
    );
    await readAll(out);
    expect(seen).toHaveLength(1);
  });

  // undici's bodyTimeout default (300s) is *below* the app stall watchdog, so this
  // is the code a silent upstream actually produces in practice.
  it("penalizes an undici body timeout", async () => {
    const { seen, cb } = collectAborts();
    const err = Object.assign(new Error("Body Timeout Error"), { code: "UND_ERR_BODY_TIMEOUT" });
    const out = createDisconnectAwareStream(
      asTransform(erroringUpstream(err)),
      makeController(),
      buildTerminalErrorBytes(FORMATS.OPENAI),
      cb
    );
    await readAll(out);
    expect(seen).toHaveLength(1);
  });

  it("does NOT penalize when the client stopped the generation", async () => {
    const { seen, cb } = collectAborts();
    const controller = makeController();
    // handleDisconnect flips isConnected() first, exactly as the real client-cancel
    // path does; the AbortError that follows must not cool down the account.
    controller.handleDisconnect("client_closed");

    const out = createDisconnectAwareStream(
      asTransform(erroringUpstream(Object.assign(new Error("aborted"), { name: "AbortError" }))),
      controller,
      buildTerminalErrorBytes(FORMATS.OPENAI),
      cb
    );
    await readAll(out);
    expect(seen).toHaveLength(0);
  });

  it("does NOT penalize on our own stall-watchdog abort", async () => {
    const { seen, cb } = collectAborts();
    const controller = makeController();
    // pipeWithDisconnect's watchdog calls handleError then abort(); both flip
    // isConnected() before the resulting AbortError surfaces in pull().
    controller.handleError(new Error("stream stall timeout"));

    const out = createDisconnectAwareStream(
      asTransform(erroringUpstream(Object.assign(new Error("aborted"), { name: "AbortError" }))),
      controller,
      buildTerminalErrorBytes(FORMATS.OPENAI),
      cb
    );
    await readAll(out);
    expect(seen).toHaveLength(0);
  });

  it("survives a throwing penalty callback", async () => {
    const out = createDisconnectAwareStream(
      asTransform(erroringUpstream(Object.assign(new Error("terminated"), { code: "ECONNRESET" }))),
      makeController(),
      buildTerminalErrorBytes(FORMATS.OPENAI),
      () => { throw new Error("db down"); }
    );
    await expect(readAll(out)).resolves.toContain('"code":"bad_gateway"');
  });
});
