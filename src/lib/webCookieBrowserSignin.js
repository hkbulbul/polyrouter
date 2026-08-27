import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  createProviderConnection,
  getProviderConnectionById,
  updateProviderConnection,
} from "@/models";
import { DATA_DIR } from "@/lib/dataDir.js";
import { CHATGPT_COMPOSER_SELECTOR } from "open-sse/executors/chatgpt-dom.js";
import {
  InstalledChromiumError,
  launchInstalledPersistentChromium,
} from "open-sse/utils/installedChromium.js";

const SIGNIN_TIMEOUT_MS = 10 * 60 * 1000;
const TERMINAL_FLOW_TTL_MS = 5 * 60 * 1000;
const POLL_INTERVAL_MS = 1000;
const MAX_INCOMING_COOKIES = 500;
const MAX_COOKIES = 120;
const MAX_COOKIE_VALUE_BYTES = 64 * 1024;
const MAX_COOKIE_BYTES = 1024 * 1024;
const PROFILE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FLOW_ID_PATTERN = PROFILE_ID_PATTERN;
const PROFILE_ROOT = path.join(DATA_DIR, "browser-profiles", "web-cookie");
const ACTIVE_STATUSES = new Set(["starting", "waiting"]);
const flows = new Map();
let activeFlowId = null;
let flowStartQueue = Promise.resolve();

const CHATGPT_COOKIE_NAMES = new Set([
  "_account",
  "_puid",
  "_uasid",
  "__cf_bm",
  "_cfuvid",
  "auth_provider",
  "auth_session_minimized",
  "cf_clearance",
  "consent",
  "login_session",
  "next-auth.callback-url",
  "next-auth.csrf-token",
  "oai-client-auth-session",
  "oai-did",
  "oai-sc",
]);

function isChatGptCookieName(name) {
  return CHATGPT_COOKIE_NAMES.has(name)
    || /^(?:__Secure-)?(?:next-auth|authjs)\.session-token(?:\.\d+)?$/.test(name);
}

const PROVIDERS = {
  "chatgpt-web": {
    label: "ChatGPT",
    loginUrl: "https://chatgpt.com/",
    cookieDomains: new Set([
      "chatgpt.com", "auth.chatgpt.com",
      "openai.com", "auth.openai.com", "auth0.openai.com",
    ]),
    cookieNameAllowed: isChatGptCookieName,
  },
  "grok-web": {
    label: "Grok",
    loginUrl: "https://grok.com/",
    cookieDomains: new Set(["grok.com"]),
    credentialCookie: "sso",
  },
  "perplexity-web": {
    label: "Perplexity",
    loginUrl: "https://www.perplexity.ai/",
    cookieDomains: new Set(["perplexity.ai"]),
    credentialCookie: "__Secure-next-auth.session-token",
  },
};

export class WebCookieSigninError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "WebCookieSigninError";
    this.code = code;
  }
}

function byteLength(value) {
  return Buffer.byteLength(value, "utf8");
}

function normalizeSameSite(value) {
  if (["Strict", "Lax", "None"].includes(value)) return value;
  if (value === "strict") return "Strict";
  if (value === "lax") return "Lax";
  if (value === "none" || value === "no_restriction") return "None";
  return undefined;
}

function normalizedDomain(domain) {
  return typeof domain === "string" ? domain.replace(/^\./, "").toLowerCase() : "";
}

function cookieNameAllowed(config, name) {
  if (config.cookieNameAllowed) return config.cookieNameAllowed(name);
  if (name === config.credentialCookie) return true;
  const prefix = `${config.credentialCookie}.`;
  if (!name.startsWith(prefix)) return false;
  const suffix = name.slice(prefix.length);
  return /^\d+$/.test(suffix) && Number(suffix) <= 20;
}

export function normalizeProviderCookies(provider, incoming) {
  const config = PROVIDERS[provider];
  if (!config) throw new WebCookieSigninError("UNSUPPORTED_PROVIDER", "Unsupported Web Cookie provider");
  if (!Array.isArray(incoming) || incoming.length > MAX_INCOMING_COOKIES) {
    throw new WebCookieSigninError("INVALID_COOKIES", "The browser returned an invalid cookie set");
  }
  if (incoming.length === 0) {
    throw new WebCookieSigninError("AUTH_NOT_FOUND", `No ${config.label} sign-in cookies were found`);
  }

  const normalized = [];
  const seen = new Set();
  let totalBytes = 0;

  for (const cookie of incoming) {
    const domain = normalizedDomain(cookie?.domain);
    if (!domain || !config.cookieDomains.has(domain)) continue;
    if (typeof cookie.name !== "string" || !cookieNameAllowed(config, cookie.name)) continue;
    if (typeof cookie.value !== "string" || !cookie.value || byteLength(cookie.value) > MAX_COOKIE_VALUE_BYTES) continue;

    const pathValue = typeof cookie.path === "string" && cookie.path.startsWith("/") ? cookie.path : "/";
    const key = `${domain}|${pathValue}|${cookie.name}`;
    if (seen.has(key)) continue;
    seen.add(key);

    totalBytes += byteLength(cookie.name) + byteLength(cookie.value) + byteLength(domain) + byteLength(pathValue);
    if (totalBytes > MAX_COOKIE_BYTES) {
      throw new WebCookieSigninError("INVALID_COOKIES", "The browser returned an oversized cookie set");
    }

    const item = {
      name: cookie.name,
      value: cookie.value,
      domain: typeof cookie.domain === "string" && cookie.domain.startsWith(".") ? `.${domain}` : domain,
      path: pathValue,
      httpOnly: Boolean(cookie.httpOnly),
      secure: Boolean(cookie.secure),
    };
    const sameSite = normalizeSameSite(cookie.sameSite);
    if (sameSite) item.sameSite = sameSite;
    const expires = Number.isFinite(cookie.expires) ? cookie.expires : cookie.expirationDate;
    if (Number.isFinite(expires) && expires > 0) item.expires = expires;
    const partitionKey = typeof cookie.partitionKey === "string"
      ? cookie.partitionKey
      : cookie.partitionKey?.topLevelSite;
    if (typeof partitionKey === "string" && partitionKey) item.partitionKey = partitionKey;
    normalized.push(item);
    if (normalized.length > MAX_COOKIES) {
      throw new WebCookieSigninError("INVALID_COOKIES", "The browser returned too many sign-in cookies");
    }
  }

  if (normalized.length === 0) {
    throw new WebCookieSigninError("AUTH_NOT_FOUND", `No ${config.label} sign-in cookies were found`);
  }
  return normalized;
}

export function credentialFromCookies(provider, cookies) {
  const config = PROVIDERS[provider];
  if (!config?.credentialCookie) return null;
  const relevant = cookies.filter((cookie) => normalizedDomain(cookie.domain) === [...config.cookieDomains][0]);
  const direct = relevant.find((cookie) => cookie.name === config.credentialCookie);
  if (direct?.value) return direct.value;

  const prefix = `${config.credentialCookie}.`;
  const chunks = relevant
    .filter((cookie) => cookie.name.startsWith(prefix))
    .map((cookie) => ({
      index: Number.parseInt(cookie.name.slice(prefix.length), 10),
      value: cookie.value,
    }))
    .filter((chunk) => Number.isInteger(chunk.index) && chunk.index >= 0)
    .sort((a, b) => a.index - b.index);
  if (chunks.length === 0 || chunks.some((chunk, index) => chunk.index !== index)) return null;
  return chunks.map((chunk) => chunk.value).join("");
}

function profilePath(provider, profileId) {
  if (!PROVIDERS[provider] || !PROFILE_ID_PATTERN.test(profileId)) {
    throw new WebCookieSigninError("INVALID_PROFILE", "Managed browser profile is invalid");
  }
  const root = path.resolve(PROFILE_ROOT);
  const target = path.resolve(root, provider, profileId);
  if (!target.startsWith(`${root}${path.sep}`)) {
    throw new WebCookieSigninError("INVALID_PROFILE", "Managed browser profile is invalid");
  }
  return target;
}

function safeFlow(flow) {
  return {
    flowId: flow.id,
    provider: flow.provider,
    status: flow.status,
    message: flow.message,
    ...(flow.code ? { code: flow.code } : {}),
    ...(flow.connectionId && flow.status === "succeeded" ? { connectionId: flow.connectionId } : {}),
  };
}

function terminalCleanup(flow) {
  if (flow.expiryTimer) clearTimeout(flow.expiryTimer);
  flow.expiryTimer = setTimeout(() => {
    if (flows.get(flow.id) === flow) flows.delete(flow.id);
  }, TERMINAL_FLOW_TTL_MS);
  flow.expiryTimer.unref?.();
}

async function closeFlowContext(flow) {
  const context = flow.context;
  flow.context = null;
  if (context) await context.close().catch(() => {});
}

function finishFlow(flow, status, message, code = null) {
  if (!ACTIVE_STATUSES.has(flow.status)) return false;
  flow.status = status;
  flow.message = message;
  flow.code = code;
  if (activeFlowId === flow.id) activeFlowId = null;
  terminalCleanup(flow);
  return true;
}

async function persistCookies(flow, cookies) {
  const config = PROVIDERS[flow.provider];
  const providerSpecificData = {
    browserProfileId: flow.profileId,
    browserChannel: flow.browserChannel,
  };
  let apiKey;

  if (flow.provider === "chatgpt-web") {
    providerSpecificData.sessionCookies = cookies;
    apiKey = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  } else {
    apiKey = credentialFromCookies(flow.provider, cookies);
    if (!apiKey) {
      throw new WebCookieSigninError("AUTH_NOT_FOUND", `Finish signing in to ${config.label} in the opened browser`);
    }
  }

  if (flow.connectionId) {
    const existing = await getProviderConnectionById(flow.connectionId);
    if (!existing || existing.provider !== flow.provider || existing.authType !== "cookie") {
      throw new WebCookieSigninError("INVALID_CONNECTION", "The Web Cookie connection no longer exists");
    }
    const updated = await updateProviderConnection(flow.connectionId, {
      apiKey,
      providerSpecificData: {
        ...(existing.providerSpecificData || {}),
        ...providerSpecificData,
      },
      isActive: true,
      testStatus: "active",
      lastError: null,
      lastErrorAt: null,
    });
    return updated;
  }

  return createProviderConnection({
    provider: flow.provider,
    authType: "cookie",
    name: `${config.label} Web ${new Date().toLocaleString("en-CA")}`,
    apiKey,
    providerSpecificData,
    testStatus: "active",
    isActive: true,
  });
}

export async function importChatGptCookies(cookies, connectionId = null) {
  const normalized = normalizeProviderCookies("chatgpt-web", cookies);
  const apiKey = normalized.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  if (connectionId) {
    if (typeof connectionId !== "string" || connectionId.length > 128) {
      throw new WebCookieSigninError("INVALID_CONNECTION", "Invalid ChatGPT Web connection");
    }
    const existing = await getProviderConnectionById(connectionId);
    if (!existing || existing.provider !== "chatgpt-web" || existing.authType !== "cookie") {
      throw new WebCookieSigninError("INVALID_CONNECTION", "Invalid ChatGPT Web connection");
    }
    return updateProviderConnection(connectionId, {
      apiKey,
      providerSpecificData: {
        ...(existing.providerSpecificData || {}),
        sessionCookies: normalized,
      },
      isActive: true,
      testStatus: "active",
      lastError: null,
      lastErrorAt: null,
    });
  }

  return createProviderConnection({
    provider: "chatgpt-web",
    authType: "cookie",
    name: `ChatGPT Web ${new Date().toLocaleString("en-CA")}`,
    apiKey,
    providerSpecificData: { sessionCookies: normalized },
    testStatus: "active",
    isActive: true,
  });
}

async function authenticationReady(flow, page) {
  const rawCookies = await flow.context.cookies();
  let cookies;
  try {
    cookies = normalizeProviderCookies(flow.provider, rawCookies);
  } catch (error) {
    if (error instanceof WebCookieSigninError && error.code === "AUTH_NOT_FOUND") return null;
    throw error;
  }

  if (flow.provider === "chatgpt-web") {
    const composerVisible = await page.locator(CHATGPT_COMPOSER_SELECTOR).last().isVisible().catch(() => false);
    return composerVisible ? cookies : null;
  }
  return credentialFromCookies(flow.provider, cookies) ? cookies : null;
}

async function runFlow(flow) {
  try {
    await fs.mkdir(flow.profileRoot, { recursive: true, mode: 0o700 });
    const { context, channel } = await launchInstalledPersistentChromium(
      flow.profileRoot,
      flow.preferredChannel ? { preferredChannel: flow.preferredChannel } : {},
    );
    flow.context = context;
    flow.browserChannel = channel;
    if (!ACTIVE_STATUSES.has(flow.status)) {
      await closeFlowContext(flow);
      return;
    }

    context.once("close", () => {
      if (flow.context === context) flow.context = null;
      if (flow.status !== "committing") {
        finishFlow(flow, "failed", "The sign-in browser was closed before authentication completed", "BROWSER_CLOSED");
      }
    });
    flow.status = "waiting";
    flow.message = `Finish signing in to ${PROVIDERS[flow.provider].label} in the opened browser`;

    const page = context.pages()[0] || await context.newPage();
    await page.goto(PROVIDERS[flow.provider].loginUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    const deadline = Date.now() + SIGNIN_TIMEOUT_MS;
    while (ACTIVE_STATUSES.has(flow.status) && Date.now() < deadline) {
      const cookies = await authenticationReady(flow, page);
      if (cookies) {
        flow.status = "committing";
        flow.message = `Saving ${PROVIDERS[flow.provider].label} connection`;
        const connection = await persistCookies(flow, cookies);
        flow.connectionId = connection.id;
        flow.status = "succeeded";
        flow.message = `${PROVIDERS[flow.provider].label} connected`;
        flow.code = null;
        if (activeFlowId === flow.id) activeFlowId = null;
        terminalCleanup(flow);
        await closeFlowContext(flow);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    if (ACTIVE_STATUSES.has(flow.status)) {
      finishFlow(flow, "failed", "Browser sign-in timed out; try again", "SIGNIN_TIMEOUT");
    }
  } catch (error) {
    if (ACTIVE_STATUSES.has(flow.status) || flow.status === "committing") {
      const known = error instanceof WebCookieSigninError || error instanceof InstalledChromiumError;
      flow.status = "failed";
      flow.message = known
        ? error.message
        : "Browser sign-in failed; try the Connector or enter the cookie manually";
      flow.code = known ? error.code : "SIGNIN_FAILED";
      if (activeFlowId === flow.id) activeFlowId = null;
      terminalCleanup(flow);
    }
  } finally {
    await closeFlowContext(flow);
  }
}

export async function startWebCookieSignin({ provider, connectionId = null } = {}) {
  const start = async () => {
    if (!PROVIDERS[provider]) {
      throw new WebCookieSigninError("UNSUPPORTED_PROVIDER", "Unsupported Web Cookie provider");
    }
    if (activeFlowId) {
      const activeStatus = flows.get(activeFlowId)?.status;
      if (ACTIVE_STATUSES.has(activeStatus) || activeStatus === "committing") {
        throw new WebCookieSigninError("SIGNIN_BUSY", "Another browser sign-in is already active");
      }
    }

    let profileId = randomUUID();
    let preferredChannel = null;
    if (connectionId) {
      if (typeof connectionId !== "string" || connectionId.length > 128) {
        throw new WebCookieSigninError("INVALID_CONNECTION", "Invalid Web Cookie connection");
      }
      const existing = await getProviderConnectionById(connectionId);
      if (!existing || existing.provider !== provider || existing.authType !== "cookie") {
        throw new WebCookieSigninError("INVALID_CONNECTION", "Invalid Web Cookie connection");
      }
      const existingProfileId = existing.providerSpecificData?.browserProfileId;
      if (PROFILE_ID_PATTERN.test(existingProfileId || "")) profileId = existingProfileId;
      const existingChannel = existing.providerSpecificData?.browserChannel;
      if (["chrome", "msedge"].includes(existingChannel)) preferredChannel = existingChannel;
    }

    const flow = {
      id: randomUUID(),
      provider,
      connectionId,
      profileId,
      preferredChannel,
      browserChannel: null,
      profileRoot: profilePath(provider, profileId),
      status: "starting",
      message: `Opening ${PROVIDERS[provider].label} sign-in`,
      code: null,
      context: null,
      expiryTimer: null,
    };
    flows.set(flow.id, flow);
    activeFlowId = flow.id;
    void runFlow(flow);
    return safeFlow(flow);
  };

  const queued = flowStartQueue.then(start, start);
  flowStartQueue = queued.then(() => undefined, () => undefined);
  return queued;
}

export function getWebCookieSignin(flowId) {
  if (!FLOW_ID_PATTERN.test(flowId || "")) {
    throw new WebCookieSigninError("INVALID_FLOW", "Browser sign-in flow not found");
  }
  const flow = flows.get(flowId);
  if (!flow) throw new WebCookieSigninError("INVALID_FLOW", "Browser sign-in flow not found");
  return safeFlow(flow);
}

export async function cancelWebCookieSignin(flowId) {
  if (!FLOW_ID_PATTERN.test(flowId || "")) {
    throw new WebCookieSigninError("INVALID_FLOW", "Browser sign-in flow not found");
  }
  const flow = flows.get(flowId);
  if (!flow) throw new WebCookieSigninError("INVALID_FLOW", "Browser sign-in flow not found");
  if (flow.status === "committing") {
    throw new WebCookieSigninError("SIGNIN_COMMITTING", "Browser sign-in is already being saved");
  }
  if (ACTIVE_STATUSES.has(flow.status)) finishFlow(flow, "cancelled", "Browser sign-in cancelled", "SIGNIN_CANCELLED");
  await closeFlowContext(flow);
  return safeFlow(flow);
}

export async function removeManagedBrowserProfile(connection) {
  for (const flow of flows.values()) {
    if (flow.connectionId !== connection?.id) continue;
    if (flow.status === "committing") {
      throw new WebCookieSigninError("SIGNIN_COMMITTING", "Wait for browser sign-in to finish before deleting this connection");
    }
    if (ACTIVE_STATUSES.has(flow.status)) await cancelWebCookieSignin(flow.id);
  }
  const profileId = connection?.providerSpecificData?.browserProfileId;
  if (!profileId) return;
  const target = profilePath(connection.provider, profileId);
  await fs.rm(target, { recursive: true, force: true });
}

export const __test__ = {
  PROVIDERS,
  PROFILE_ROOT,
  flows,
  profilePath,
  safeFlow,
  async reset() {
    for (const flow of flows.values()) {
      if (flow.expiryTimer) clearTimeout(flow.expiryTimer);
      await closeFlowContext(flow);
    }
    flows.clear();
    activeFlowId = null;
    flowStartQueue = Promise.resolve();
  },
};
