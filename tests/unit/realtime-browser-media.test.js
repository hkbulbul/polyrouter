import { describe, expect, it, vi } from "vitest";
import { releaseRealtimeMediaResources } from "../../src/realtime/browserMedia.js";

describe("realtime browser media cleanup", () => {
  it("disconnects audio nodes, clears the worklet handler, and stops every microphone track", () => {
    const captureNode = { disconnect: vi.fn(), port: { onmessage: vi.fn() } };
    const source = { disconnect: vi.fn() };
    const monitorGain = { disconnect: vi.fn() };
    const tracks = [{ stop: vi.fn() }, { stop: vi.fn() }];

    releaseRealtimeMediaResources({
      captureNode,
      source,
      monitorGain,
      stream: { getTracks: () => tracks },
    });

    expect(captureNode.port.onmessage).toBeNull();
    expect(captureNode.disconnect).toHaveBeenCalledOnce();
    expect(source.disconnect).toHaveBeenCalledOnce();
    expect(monitorGain.disconnect).toHaveBeenCalledOnce();
    expect(tracks.every((track) => track.stop.mock.calls.length === 1)).toBe(true);
  });

  it("continues cleanup when one browser resource throws", () => {
    const track = { stop: vi.fn() };
    expect(() => releaseRealtimeMediaResources({
      captureNode: { disconnect: () => { throw new Error("already disconnected"); } },
      stream: { getTracks: () => [track] },
    })).not.toThrow();
    expect(track.stop).toHaveBeenCalledOnce();
  });
});
