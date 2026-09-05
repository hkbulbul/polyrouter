/**
 * Singleton cache for real Claude Code client headers.
 * Captures headers from authentic Claude Code requests and makes them available
 * for forwarding to api.anthropic.com, replacing static hardcoded values.
 */

const CLAUDE_IDENTITY_HEADERS = [
  "user-agent",
  "anthropic-beta",
  "anthropic-version",
  "anthropic-dangerous-direct-browser-access",
  "x-app",
  "x-stainless-helper-method",
  "x-stainless-retry-count",
  "x-stainless-runtime-version",
  "x-stainless-package-version",
  "x-stainless-runtime",
  "x-stainless-lang",
  "x-stainless-arch",
  "x-stainless-os",
  "x-stainless-timeout",
  "x-claude-code-session-id",
  "package-version",
  "runtime-version",
  "os",
  "arch",
];

let cachedHeaders = null;

/**
 * Detect if request headers look like a real Claude Code client.
 * @param {object} headers - Lowercase header key/value object
 */
function isClaudeCodeClient(headers) {
  const ua = (headers["user-agent"] || "").toLowerCase();
  const xApp = (headers["x-app"] || "").toLowerCase();
  return ua.includes("claude-cli") || ua.includes("claude-code") || xApp === "cli";
}

/**
 * Store Claude Code identity headers if this looks like a real client request.
 * Called at the entry point before any translation/forwarding.
 * @param {object} headers - Lowercase header key/value object (from request.headers.entries())
 */
export function cacheClaudeHeaders(headers) {
  if (!headers || typeof headers !== "object") return;
  if (!isClaudeCodeClient(headers)) return;

  const captured = {};
  for (const key of CLAUDE_IDENTITY_HEADERS) {
    if (headers[key] !== undefined && headers[key] !== null) {
      captured[key] = headers[key];
    }
  }

  if (Object.keys(captured).length > 0) {
    // If the user-agent reports an older Claude Code version (< 2.1.251),
    // bump to 2.1.261 so upstream model version gates (e.g. Fable 5.1) don't reject the request
    if (captured["user-agent"]) {
      captured["user-agent"] = captured["user-agent"].replace(/(\b(?:claude-cli|claude-code)\/)2\.1\.\d+/g, (m, prefix) => {
        const v = m.split("/")[1];
        return v < "2.1.251" ? `${prefix}2.1.261` : m;
      });
    }
    cachedHeaders = captured;
    console.log(`[ClaudeHeaders] Cached ${Object.keys(captured).length} identity headers from Claude Code client`);
  }
}

/**
 * Get the most recently cached Claude Code identity headers.
 * Returns null if no authentic client request has been seen yet (cold start).
 * @returns {object|null}
 */
export function getCachedClaudeHeaders() {
  return cachedHeaders;
}
