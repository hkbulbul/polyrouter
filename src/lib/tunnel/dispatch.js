// Tunnel provider dispatch. Both backends publish the SAME public shortlink
// (shared/state.js shortId + worker registration), so switching provider does not
// change the URL users see. Caller-facing names match the old cloudflare-only
// exports, so routes and the CLI need no changes.
import * as cloudflare from "./cloudflare/manager.js";
import { isCloudflaredRunning } from "./cloudflare/cloudflared.js";
import * as ngrok from "./ngrok/manager.js";
import { isNgrokRunning } from "./ngrok/ngrok.js";
import { defaultLocalPort } from "./shared/localPort.js";
import { getSettings } from "@/lib/localDb";

export const TUNNEL_PROVIDERS = ["cloudflare", "ngrok"];

export function normalizeProvider(value) {
  return TUNNEL_PROVIDERS.includes(value) ? value : "cloudflare";
}

async function currentProvider() {
  const settings = await getSettings();
  return normalizeProvider(settings.tunnelProvider || process.env.TUNNEL_PROVIDER);
}

export async function enableTunnel(localPort = defaultLocalPort()) {
  const provider = await currentProvider();
  // Stop the other backend first — a leftover listener/process would keep
  // re-registering its own URL to the worker and fight the new one. Guarded on
  // "actually up" so the 60s watchdog restart doesn't churn settings every tick.
  if (provider === "ngrok") {
    if (isCloudflaredRunning()) {
      try { await cloudflare.disableTunnel(); } catch { /* best effort */ }
    }
    return ngrok.enableNgrok(localPort);
  }
  if (isNgrokRunning()) {
    try { await ngrok.disableNgrok(); } catch { /* best effort */ }
  }
  return cloudflare.enableTunnel(localPort);
}

// Stop both regardless of the current setting: the user may have switched
// provider while the previous one was still up.
export async function disableTunnel() {
  const results = await Promise.allSettled([cloudflare.disableTunnel(), ngrok.disableNgrok()]);
  const failed = results.find((r) => r.status === "rejected");
  if (failed) console.warn(`[Tunnel] disable warn: ${failed.reason?.message}`);
  return { success: true };
}

export async function getTunnelStatus() {
  const provider = await currentProvider();
  return provider === "ngrok" ? ngrok.getNgrokStatus() : cloudflare.getTunnelStatus();
}

// Sync — callers already hold settings when they need a specific provider's service.
export function getTunnelService(provider) {
  return normalizeProvider(provider) === "ngrok" ? ngrok.getNgrokService() : cloudflare.getTunnelService();
}

export function isTunnelReconnecting(provider) {
  return normalizeProvider(provider) === "ngrok" ? ngrok.isNgrokReconnecting() : cloudflare.isTunnelReconnecting();
}

export function isTunnelManuallyDisabled(provider) {
  return normalizeProvider(provider) === "ngrok" ? ngrok.isNgrokManuallyDisabled() : cloudflare.isTunnelManuallyDisabled();
}

/** Is the active backend's tunnel process/listener still up? (watchdog guard) */
export function isTunnelProcessAlive(provider) {
  return normalizeProvider(provider) === "ngrok" ? isNgrokRunning() : isCloudflaredRunning();
}

// Only cloudflared can exit on its own; ngrok's listener lives in-process.
export const setTunnelUnexpectedExitCallback = cloudflare.setTunnelUnexpectedExitCallback;
