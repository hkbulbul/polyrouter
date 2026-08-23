// Cloudflare quick tunnel: DNS propagates fast, short timeouts OK
export const HEALTH_CHECK = {
  intervalMs: 2000,
  timeoutMs: 60000,
  fetchTimeoutMs: 5000,
  dnsTimeoutMs: 2000,
};
