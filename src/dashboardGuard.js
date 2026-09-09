import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getSettings, validateApiKey } from "@/lib/localDb";
import { getConsistentMachineId } from "@/shared/utils/machineId";
import { verifyDashboardAuthToken } from "@/lib/auth/dashboardSession";

const CLI_TOKEN_HEADER = "x-9r-cli-token";
const CLI_TOKEN_SALT = "9r-cli-auth";
const LOCALITY_PROOF_HEADER = "x-9r-locality-proof";

let cachedCliToken = null;
async function getCliToken() {
  if (!cachedCliToken) cachedCliToken = await getConsistentMachineId(CLI_TOKEN_SALT);
  return cachedCliToken;
}

export async function hasValidCliToken(request) {
  const token = request.headers.get(CLI_TOKEN_HEADER);
  if (!token) return false;
  return token === await getCliToken();
}

// Public API paths — no auth required (LLM API has its own key auth inside handler).
const PUBLIC_API_PATHS = [
  "/api/health",
  "/api/init",
  "/api/locale",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/status",
  "/api/auth/setup-password",
  "/api/auth/oidc",
  "/api/version",
  "/api/settings/require-login",
  "/api/realtime/tickets",
  "/api/mcp/chatgpt-web",
  // Display-only banner rows for the provider detail page. No secrets — same rationale as the
  // /api/sponsors GET bypass below. GET is the only export, so other verbs 405 on their own.
  // Matching is exact-or-prefix, so any future /api/embedding-banners/* would also be public.
  "/api/embedding-banners",
];

// Public top-level prefixes (LLM API endpoints with their own API key auth).
const PUBLIC_PREFIXES = ["/v1", "/v1beta", "/api/v1", "/api/v1beta", "/codex"];

// Always require JWT token regardless of requireLogin setting
const ALWAYS_PROTECTED = [
  "/api/shutdown",
  "/api/settings/database",
  "/api/version/shutdown",
  "/api/version/update",
  "/api/oauth/cursor/auto-import",
  "/api/oauth/kiro/auto-import",
];

// Require auth, but allow through if requireLogin is disabled
const PROTECTED_API_PATHS = [
  "/api/settings",
  "/api/keys",
  "/api/providers",
  "/api/provider-nodes",
  "/api/proxy-pools",
  "/api/combos",
  "/api/models",
  "/api/usage",
  "/api/oauth",
  "/api/cloud",
  "/api/media-providers",
  "/api/pricing",
  "/api/tags",
  "/api/cli-tools",
  "/api/mcp",
  "/api/translator",
  "/api/tunnel",
];

// Routes that spawn child processes or read host secrets — restrict to localhost.
const LOCAL_ONLY_PATHS = [
  "/api/cli-tools/cowork-settings",
  "/api/cli-tools/commandcode-settings",
  "/api/cli-tools/antigravity-mitm",
  "/api/mcp/",
  "/api/tunnel/tailscale-install",
  "/api/tunnel/tailscale-enable",
  "/api/tunnel/tailscale-disable",
  "/api/tunnel/tailscale-check",
  "/api/tunnel/enable",
  "/api/tunnel/disable",
  "/api/oauth/cursor/auto-import",
  "/api/oauth/kiro/auto-import",
  "/api/oauth/chatgpt-web/cookie",
  "/api/oauth/web-cookie/browser",
  "/api/auth/reset-password",
  "/api/headroom/start",
  "/api/headroom/stop",
  "/api/headroom/proxy",
];

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isLoopbackHostname(value) {
  if (typeof value !== "string" || !value) return false;

  let host = value.trim().toLowerCase();
  if (host.startsWith("[")) {
    const match = /^\[([^\]]+)\](?::\d+)?$/.exec(host);
    if (!match) return false;
    host = match[1];
  } else if (!host.startsWith("::")) {
    const match = /^([^:]+)(?::\d+)?$/.exec(host);
    if (!match) return false;
    host = match[1];
  }

  // Handle IPv4-mapped IPv6 (::ffff:127.0.0.1) — common on Windows.
  host = host.replace(/^::ffff:/, "");
  return LOOPBACK_HOSTS.has(host);
}

function secretsMatch(actual, expected) {
  const left = Buffer.from(actual || "", "utf8");
  const right = Buffer.from(expected || "", "utf8");
  return left.length > 0 && left.length === right.length && timingSafeEqual(left, right);
}

function hasLoopbackOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return isLoopbackHostname(new URL(origin).hostname);
  } catch {
    return false;
  }
}

export function isLocalRequest(request) {
  if (request.headers.get("x-9r-local") === "1") {
    return true;
  }
  const expectedProof = process.env.LOCALITY_INTERNAL_SECRET;
  const actualProof = request.headers.get(LOCALITY_PROOF_HEADER);
  if (expectedProof && secretsMatch(actualProof, expectedProof)) {
    if (request.headers.get("x-9r-via-proxy")) return false;
    return isLoopbackHostname(request.headers.get("x-9r-real-ip")) && hasLoopbackOrigin(request);
  }

  // Requests without a socket-stamped proof are not trusted as local. This also
  // keeps raw Next development servers from treating a spoofed Host as locality.
  return false;
}

function nextWithoutLocalityProof(request) {
  const headers = new Headers(request.headers);
  if (isLocalRequest(request)) {
    headers.set("x-9r-local", "1");
  } else {
    headers.delete("x-9r-local");
  }
  headers.delete(LOCALITY_PROOF_HEADER);
  return NextResponse.next({ request: { headers } });
}

function isPublicLlmApi(pathname) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function extractApiKey(request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  const apiKeyHeader = request.headers.get("x-api-key");
  if (apiKeyHeader) return apiKeyHeader;
  const googleApiKeyHeader = request.headers.get("x-goog-api-key");
  if (googleApiKeyHeader) return googleApiKeyHeader;
  return request.nextUrl.searchParams?.get("key") || null;
}

async function hasValidApiKey(request) {
  const apiKey = extractApiKey(request);
  if (!apiKey) return false;
  return await validateApiKey(apiKey);
}

async function canAccessPublicLlmApi(request) {
  if (isLocalRequest(request)) return true;
  if (await hasValidCliToken(request)) return true;
  return await hasValidApiKey(request);
}

async function canAccessLocalOnlyRoute(request) {
  if (await hasValidCliToken(request)) return true;
  // Browser on host: loopback Host + Origin (blocks tunnel/CSRF) + auth (JWT or requireLogin=false)
  if (isLocalRequest(request) && await isAuthenticated(request)) return true;
  return false;
}

async function hasValidToken(request) {
  const token = request.cookies.get("auth_token")?.value;
  return await verifyDashboardAuthToken(token);
}

// Read settings directly from DB to avoid self-fetch deadlock in proxy
async function loadSettings() {
  try {
    return await getSettings();
  } catch {
    return null;
  }
}

async function isAuthenticated(request) {
  if (await hasValidToken(request)) return true;
  const settings = await loadSettings();
  if (settings && settings.requireLogin === false) return true;
  return false;
}

function isPublicApi(pathname) {
  if (isPublicLlmApi(pathname)) return true;
  return PUBLIC_API_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isPublicChatGptWebMcp(pathname) {
  return pathname === "/api/mcp/chatgpt-web" || pathname.startsWith("/api/mcp/chatgpt-web/");
}

export const __test__ = {
  isLocalRequest,
  isPublicLlmApi,
  isPublicChatGptWebMcp,
  extractApiKey,
  canAccessPublicLlmApi,
  canAccessLocalOnlyRoute,
};

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Local-only gate for spawn-capable / host-secret routes.
  if (!isPublicChatGptWebMcp(pathname) && LOCAL_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    if (!(await canAccessLocalOnlyRoute(request))) {
      return NextResponse.json({ error: "Local only: CLI token required" }, { status: 403 });
    }
  }

  // Always protected - require valid JWT or local CLI token (machineId-based)
  if (ALWAYS_PROTECTED.some((p) => pathname.startsWith(p))) {
    if (await hasValidCliToken(request) || await hasValidToken(request))
      return nextWithoutLocalityProof(request);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isPublicLlmApi(pathname)) {
    if (await canAccessPublicLlmApi(request)) return nextWithoutLocalityProof(request);
    return NextResponse.json({ error: "API key required for remote API access" }, { status: 401 });
  }

  // Sponsors GET is public (badge metadata only, no secrets, kind-aware) — lets provider/embedding grids
  // load before login and for any client. PATCH/others stay protected below.
  if (pathname === "/api/sponsors" && request.method === "GET") {
    return nextWithoutLocalityProof(request);
  }

  // Deny-by-default for /api/* — public allow-list bypasses, everything else requires auth.
  if (pathname.startsWith("/api/")) {
    if (isPublicApi(pathname)) return nextWithoutLocalityProof(request);
    if (await hasValidCliToken(request) || await isAuthenticated(request))
      return nextWithoutLocalityProof(request);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Protect all dashboard routes
  if (pathname.startsWith("/dashboard")) {
    let requireLogin = true;
    let tunnelDashboardAccess = true;

    try {
      const settings = await loadSettings();
      if (settings) {
        requireLogin = settings.requireLogin !== false;
        tunnelDashboardAccess = settings.tunnelDashboardAccess === true;

        // Block tunnel/tailscale access if disabled (redirect to login)
        if (!tunnelDashboardAccess) {
          const host = (request.headers.get("host") || "").split(":")[0].toLowerCase();
          const tunnelHost = settings.tunnelUrl ? new URL(settings.tunnelUrl).hostname.toLowerCase() : "";
          const tailscaleHost = settings.tailscaleUrl ? new URL(settings.tailscaleUrl).hostname.toLowerCase() : "";
          if ((tunnelHost && host === tunnelHost) || (tailscaleHost && host === tailscaleHost)) {
            return NextResponse.redirect(new URL("/login", request.url));
          }
        }
      }
    } catch {
      // On error, keep defaults (require login, block tunnel)
    }

    // If login not required, allow through
    if (!requireLogin) return nextWithoutLocalityProof(request);

    // Verify JWT token
    const token = request.cookies.get("auth_token")?.value;
    if (token) {
      if (await verifyDashboardAuthToken(token)) {
        return nextWithoutLocalityProof(request);
      } else {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect / to /dashboard if logged in, or /dashboard if it's the root
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return nextWithoutLocalityProof(request);
}
