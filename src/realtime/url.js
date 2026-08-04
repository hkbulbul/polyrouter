export function getRealtimeUrl(endpoint, provider, model) {
  const url = new URL(endpoint || "http://localhost:20128");
  const protocol = url.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${url.host}/v1/realtime?provider=${encodeURIComponent(provider)}&model=${encodeURIComponent(model)}`;
}
