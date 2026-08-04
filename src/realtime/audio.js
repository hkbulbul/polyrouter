import { DEFAULT_REALTIME_SAMPLE_RATE } from "./constants.js";

export function resampleFloat32(samples, inputSampleRate, outputSampleRate = DEFAULT_REALTIME_SAMPLE_RATE) {
  if (!(samples instanceof Float32Array)) samples = Float32Array.from(samples || []);
  if (!samples.length || inputSampleRate === outputSampleRate) return samples;
  if (!Number.isFinite(inputSampleRate) || inputSampleRate <= 0 || !Number.isFinite(outputSampleRate) || outputSampleRate <= 0) {
    throw new Error("Audio sample rates must be positive numbers.");
  }

  const outputLength = Math.max(1, Math.round(samples.length * outputSampleRate / inputSampleRate));
  const output = new Float32Array(outputLength);
  const scale = inputSampleRate / outputSampleRate;

  for (let index = 0; index < outputLength; index += 1) {
    const position = index * scale;
    const left = Math.min(samples.length - 1, Math.floor(position));
    const right = Math.min(samples.length - 1, left + 1);
    const mix = position - left;
    output[index] = samples[left] + (samples[right] - samples[left]) * mix;
  }
  return output;
}

export function float32ToPcm16Bytes(samples) {
  const pcm = new Int16Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    pcm[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return new Uint8Array(pcm.buffer);
}
