function safely(run) {
  try { run?.(); } catch {}
}

export function releaseRealtimeMediaResources({ captureNode, source, monitorGain, stream } = {}) {
  if (captureNode?.port) captureNode.port.onmessage = null;
  safely(() => captureNode?.disconnect());
  safely(() => source?.disconnect());
  safely(() => monitorGain?.disconnect());
  for (const track of stream?.getTracks?.() || []) safely(() => track.stop());
}
