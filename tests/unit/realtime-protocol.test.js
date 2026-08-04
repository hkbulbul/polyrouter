import { describe, expect, it } from "vitest";
import {
  DEFAULT_REALTIME_MODEL,
  DEFAULT_REALTIME_SAMPLE_RATE,
  REALTIME_MODELS,
  buildInitialSession,
  validateClientEvent,
} from "../../src/realtime/protocol.js";

describe("realtime protocol", () => {
  it("keeps the existing model IDs available", () => {
    expect(DEFAULT_REALTIME_MODEL).toBe("gpt-realtime-2");
    expect(Array.from(REALTIME_MODELS)).toEqual(["gpt-realtime-2", "gpt-realtime", "gpt-realtime-mini"]);
  });

  it("builds a 24 kHz audio session with transcription enabled", () => {
    const event = buildInitialSession();
    expect(event.session.model).toBe(DEFAULT_REALTIME_MODEL);
    expect(event.session.audio.input.format.rate).toBe(DEFAULT_REALTIME_SAMPLE_RATE);
    expect(event.session.audio.output.format.rate).toBe(DEFAULT_REALTIME_SAMPLE_RATE);
    expect(event.session.audio.input.transcription).toEqual({ model: "gpt-4o-mini-transcribe" });
    expect(event.session.audio.input.turn_detection.interrupt_response).toBe(true);
  });

  it("continues accepting the existing realtime client event set", () => {
    expect(validateClientEvent({ type: "input_audio_buffer.append", audio: "AA==" }).ok).toBe(true);
    expect(validateClientEvent({ type: "response.cancel" }).ok).toBe(true);
    expect(validateClientEvent({ type: "unknown.event" }).ok).toBe(false);
  });
});
