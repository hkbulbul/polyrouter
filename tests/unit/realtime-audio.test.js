import { describe, expect, it } from "vitest";
import { float32ToPcm16Bytes, resampleFloat32 } from "../../src/realtime/audio.js";

describe("realtime audio conversion", () => {
  it("preserves 24 kHz input without copying it", () => {
    const samples = new Float32Array([0, 0.5, -0.5]);
    expect(resampleFloat32(samples, 24000, 24000)).toBe(samples);
  });

  it("resamples 48 kHz input to the 24 kHz wire rate", () => {
    const samples = new Float32Array(480);
    for (let index = 0; index < samples.length; index += 1) samples[index] = index / samples.length;
    const output = resampleFloat32(samples, 48000, 24000);

    expect(output).toHaveLength(240);
    expect(output[0]).toBeCloseTo(samples[0]);
    expect(output[100]).toBeCloseTo(samples[200]);
  });

  it("clamps float audio when encoding PCM16", () => {
    const bytes = float32ToPcm16Bytes(new Float32Array([-2, -1, 0, 1, 2]));
    const pcm = new Int16Array(bytes.buffer);
    expect(Array.from(pcm)).toEqual([-32768, -32768, 0, 32767, 32767]);
  });
});
