class PolyRouterRealtimeCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.pending = [];
    this.pendingLength = 0;
    this.chunkSize = Math.max(128, Math.round(sampleRate * 0.02));
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel?.length) return true;

    this.pending.push(new Float32Array(channel));
    this.pendingLength += channel.length;
    while (this.pendingLength >= this.chunkSize) {
      const chunk = new Float32Array(this.chunkSize);
      let written = 0;
      while (written < chunk.length) {
        const head = this.pending[0];
        const count = Math.min(head.length, chunk.length - written);
        chunk.set(head.subarray(0, count), written);
        written += count;
        if (count === head.length) this.pending.shift();
        else this.pending[0] = head.subarray(count);
        this.pendingLength -= count;
      }
      this.port.postMessage(chunk, [chunk.buffer]);
    }
    return true;
  }
}

registerProcessor("polyrouter-realtime-capture", PolyRouterRealtimeCapture);
