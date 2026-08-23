// Worker registration — shared by every tunnel backend (cloudflared, ngrok).
// The worker maps a stable shortlink to whatever rotating upstream URL we register,
// so the public URL users see never changes when the backend URL does.
export const WORKER_URL = process.env.TUNNEL_WORKER_URL || "https://abc-tunnel.us";

// Derived from WORKER_URL so pointing TUNNEL_WORKER_URL at another domain keeps
// register + publicUrl on the same host instead of silently disagreeing.
function workerHost() {
  try {
    return new URL(WORKER_URL).host;
  } catch {
    return "abc-tunnel.us";
  }
}

export function publicUrlFor(shortId) {
  if (!shortId) return "";
  return `https://r${shortId}.${workerHost()}`;
}

export async function registerTunnelUrl(shortId, tunnelUrl) {
  await fetch(`${WORKER_URL}/api/tunnel/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shortId, tunnelUrl })
  });
}
