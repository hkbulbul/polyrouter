// Tunnel service — provider-dispatched (cloudflare | ngrok)
export {
  enableTunnel,
  disableTunnel,
  getTunnelStatus,
  isTunnelManuallyDisabled,
  isTunnelReconnecting,
  isTunnelProcessAlive,
  getTunnelService,
  setTunnelUnexpectedExitCallback,
  normalizeProvider,
  TUNNEL_PROVIDERS,
} from "./dispatch.js";

// Cloudflare-specific (binary management)
export {
  killCloudflared,
  isCloudflaredRunning,
  ensureCloudflared,
  getDownloadStatus,
} from "./cloudflare/cloudflared.js";
export { probeUrlAlive as probeCloudflareAlive } from "./cloudflare/healthCheck.js";

// ngrok-specific (in-process listener)
export { isNgrokRunning, stopNgrokListener } from "./ngrok/ngrok.js";

// Tailscale service
export {
  enableTailscale,
  disableTailscale,
  getTailscaleStatus,
  isTailscaleReconnecting,
  getTailscaleService,
} from "./tailscale/manager.js";
export {
  isTailscaleInstalled,
  isTailscaleRunning,
  isTailscaleRunningStrict,
  isTailscaleLoggedIn,
  isTailscaleLoggedInStrict,
  isSystemDaemonRunning,
  isDaemonAlive,
  startFunnel,
  getTailscaleBin,
  installTailscale,
  startLogin,
  startDaemonWithPassword,
  TAILSCALE_SOCKET,
} from "./tailscale/tailscale.js";
export { probeUrlAlive as probeTailscaleAlive } from "./tailscale/healthCheck.js";

// Shared
export { loadState, generateShortId } from "./shared/state.js";
export { checkInternet } from "./shared/internetCheck.js";
export {
  RESTART_COOLDOWN_MS,
  NETWORK_SETTLE_MS,
  WATCHDOG_INTERVAL_MS,
  NETWORK_CHECK_INTERVAL_MS,
  VIRTUAL_IFACE_REGEX,
} from "./shared/watchdogConfig.js";
