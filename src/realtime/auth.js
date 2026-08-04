import { getProviderCredentials } from "@/sse/services/auth.js";
import { checkAndRefreshToken } from "@/sse/services/tokenRefresh.js";
import { getSettings, validateApiKey } from "@/lib/localDb.js";
import { getDashboardAuthSession } from "@/lib/auth/dashboardSession.js";
import { resolveProviderId } from "@/shared/constants/providers.js";
import { DEFAULT_REALTIME_MODEL, REALTIME_MODELS } from "./protocol.js";
import { consumeRealtimeTicket } from "./tickets.js";

const REALTIME_PROVIDERS = new Set(["codex", "openai"]);
const ACCESS_TOKEN_EXPIRY_MARGIN_MS = 5 * 60 * 1000;

function accessTokenIsFresh(credentials) {
  if (!credentials?.accessToken) return false;

  try {
    const payload = JSON.parse(Buffer.from(credentials.accessToken.split(".")[1], "base64url").toString("utf8"));
    if (typeof payload.exp === "number") {
      return payload.exp * 1000 > Date.now() + ACCESS_TOKEN_EXPIRY_MARGIN_MS;
    }
  } catch {
    // Some providers use opaque access tokens. Fall back to the stored expiry.
  }

  const expiresAt = credentials.expiresAt ? new Date(credentials.expiresAt).getTime() : 0;
  return Number.isFinite(expiresAt) && expiresAt > Date.now() + ACCESS_TOKEN_EXPIRY_MARGIN_MS;
}

function isLoopbackAddress(address) {
  if (!address) return false;
  const normalized = String(address).replace(/^::ffff:/, "");
  return normalized === "127.0.0.1" || normalized === "::1" || normalized === "localhost";
}

export function requestIsLoopback(request) {
  const ip = request?.headers?.["x-9r-real-ip"] || request?.socket?.remoteAddress;
  if (ip) return isLoopbackAddress(ip);
  const host = String(request?.headers?.host || "").split(":")[0];
  return isLoopbackAddress(host);
}

export function originIsLoopback(request) {
  const origin = request?.headers?.origin;
  if (!origin) return true;
  try {
    return isLoopbackAddress(new URL(origin).hostname);
  } catch {
    return false;
  }
}

export function originMatchesHost(request) {
  const origin = request?.headers?.origin;
  if (!origin) return requestIsLoopback(request);
  try {
    const originUrl = new URL(origin);
    const host = String(request?.headers?.host || "").trim().toLowerCase();
    return Boolean(host) && originUrl.host.toLowerCase() === host;
  } catch {
    return false;
  }
}

export function validateRealtimeRequestBoundary(request, { requireLogin, hasSession }) {
  const isLoopback = requestIsLoopback(request);
  if (!originMatchesHost(request)) {
    throw new Error("Realtime requests must come from the active dashboard origin.");
  }
  // Remote tunnel access remains supported, but it must always carry a valid
  // dashboard session even when password protection is disabled for localhost.
  if ((!isLoopback || requireLogin) && !hasSession) {
    throw new Error("Dashboard authentication is required for realtime.");
  }
}

export function extractRealtimeApiKey(request) {
  const authorization = String(request?.headers?.authorization || "");
  if (authorization.startsWith("Bearer ")) return authorization.slice(7).trim();
  const headerKey = String(request?.headers?.["x-api-key"] || "").trim();
  if (headerKey) return headerKey;
  return typeof request?.realtimeApiKey === "string" ? request.realtimeApiKey.trim() : "";
}

function requireSecureExternalCredential(request) {
  if (!requestIsLoopback(request) && request.realtimeSecure !== true) {
    throw new Error("External realtime API-key and ticket connections require WSS.");
  }
}

export async function authenticateUpgrade(request) {
  const provider = resolveProviderId(request.realtimeProvider || "codex");
  if (!REALTIME_PROVIDERS.has(provider)) {
    throw new Error("This provider is not enabled for realtime voice.");
  }

  const model = request.realtimeModel || (provider === "openai" ? "gpt-realtime" : DEFAULT_REALTIME_MODEL);
  if (!REALTIME_MODELS.has(model)) {
    throw new Error("This realtime model is not enabled.");
  }

  if (request.realtimeTicket) {
    requireSecureExternalCredential(request);
    consumeRealtimeTicket(request.realtimeTicket, {
      provider,
      model,
      origin: request.headers?.origin,
    });
  } else {
    const apiKey = extractRealtimeApiKey(request);
    if (apiKey) {
      requireSecureExternalCredential(request);
      if (!(await validateApiKey(apiKey))) throw new Error("Invalid PolyRouter API key.");
    } else {
      const cookieHeader = String(request.headers?.cookie || "");
      const authToken = cookieHeader
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("auth_token="))
        ?.slice("auth_token=".length);
      const session = await getDashboardAuthSession(authToken);
      const settings = await getSettings();
      validateRealtimeRequestBoundary(request, {
        requireLogin: settings?.requireLogin !== false,
        hasSession: Boolean(session),
      });
    }
  }
  // A provider can have several OAuth accounts. One may have an expired or
  // revoked refresh token while another is healthy; realtime setup must not
  // fail the entire feature on the first bad account.
  const excludedConnectionIds = new Set();
  let refreshed = null;
  let lastRefreshError = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const credentials = await getProviderCredentials(provider, excludedConnectionIds, model);
    if (!credentials || credentials.allRateLimited) break;
    try {
      // Match the OpenAI OAuth reference: use a valid access token directly
      // and rotate the refresh token only when the access token is near expiry.
      const candidate = accessTokenIsFresh(credentials)
        ? credentials
        : await checkAndRefreshToken(provider, credentials);
      if (candidate?.accessToken || candidate?.apiKey) {
        refreshed = candidate;
        break;
      }
      lastRefreshError = new Error("Realtime provider credentials could not be refreshed.");
    } catch (error) {
      lastRefreshError = error;
      if (credentials.connectionId) excludedConnectionIds.add(credentials.connectionId);
    }
  }
  if (!refreshed?.accessToken && !refreshed?.apiKey) {
    throw new Error(lastRefreshError?.message || "No available realtime provider connection.");
  }

  return {
    provider,
    model,
    voice: request.realtimeVoice || "alloy",
    accessToken: refreshed.accessToken || refreshed.apiKey,
    connectionId: refreshed.connectionId,
  };
}
