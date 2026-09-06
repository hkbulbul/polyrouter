import crypto from "crypto";
import { BaseExecutor } from "./base.js";
import { PROVIDERS } from "../config/providers.js";
import { OAUTH_ENDPOINTS, ANTIGRAVITY_HEADERS, AG_DEFAULT_TOOLS, AG_TOOL_SUFFIX } from "../config/appConstants.js";
import { HTTP_STATUS } from "../config/runtimeConfig.js";
import { resolveSessionId } from "../utils/sessionManager.js";
import { proxyAwareFetch } from "../utils/proxyFetch.js";
import { getProjectIdForConnection, ANTIGRAVITY_REQUIRES_MANUAL_PROJECT, requiresManualGcpProject } from "../services/projectId.js";
import {
  serializeCloudCodeClaudeFunctionDeclaration,
  serializeCloudCodeFunctionDeclaration,
} from "../translator/formats/gemini.js";
import { DEFAULT_THINKING_AG_SIGNATURE } from "../config/defaultThinkingSignature.js";

// Sanitize function name: Gemini requires [a-zA-Z_][a-zA-Z0-9_.:\-]{0,63}
function sanitizeFunctionName(name) {
  if (!name) return "_unknown";
  let s = name.replace(/[^a-zA-Z0-9_.:\-]/g, "_");
  if (!/^[a-zA-Z_]/.test(s)) s = "_" + s;
  return s.substring(0, 64);
}

const MAX_RETRY_AFTER_MS = 10000;
const ANTIGRAVITY_TRANSIENT_RETRY_MAX_MS = 15000;
const MAX_ANTIGRAVITY_OUTPUT_TOKENS = 64000;
const ANTIGRAVITY_IDE_REQUEST_ID_RE = /^agent\/[^/]+\/\d+\/[^/]+\/\d+$/;

function summarizeToolSchema(schema, depth = 0) {
  if (schema === null || schema === undefined) return null;
  if (typeof schema !== "object") return { valueKind: typeof schema, value: String(schema) };
  if (depth >= 4) return { type: schema.type, keys: Object.keys(schema).sort() };
  const properties = schema.properties && typeof schema.properties === "object" && !Array.isArray(schema.properties)
    ? Object.entries(schema.properties).map(([name, value]) => ({
        name,
        valueKind: Array.isArray(value) ? "array" : typeof value,
        schema: summarizeToolSchema(value, depth + 1),
      }))
    : [];
  return {
    type: schema.type,
    keys: Object.keys(schema).sort(),
    propertyCount: properties.length || undefined,
    requiredCount: Array.isArray(schema.required) ? schema.required.length : undefined,
    items: schema.items ? summarizeToolSchema(schema.items, depth + 1) : undefined,
    properties: properties.length ? properties : undefined,
    hasAdditionalProperties: Object.hasOwn(schema, "additionalProperties") || undefined,
    hasComposition: Boolean(schema.anyOf || schema.oneOf || schema.allOf || schema.$ref) || undefined,
  };
}

function logAntigravityToolSchemaSummary(declarations) {
  if (process.env.DEBUG_ANTIGRAVITY_TOOL_SCHEMA !== "true") return;
  for (const index of [38, 39]) {
    const declaration = declarations[index];
    if (!declaration) continue;
    console.debug("[AG_TOOL_SCHEMA]", JSON.stringify({
      declaration: index,
      name: declaration.name,
      schemaField: declaration.parametersJsonSchema ? "parametersJsonSchema" : "parameters",
      schema: summarizeToolSchema(declaration.parametersJsonSchema || declaration.parameters)
    }));
  }
}

export function parseAntigravityValidationRequired(bodyText) {
  if (!bodyText || typeof bodyText !== "string") return null;
  let error;
  try {
    error = JSON.parse(bodyText)?.error;
  } catch {
    return null;
  }
  const details = Array.isArray(error?.details) ? error.details : [];
  const info = details.find(detail => detail?.reason === "VALIDATION_REQUIRED");
  if (!info && !/verify your account to continue/i.test(error?.message || "")) return null;
  const help = details.find(detail => Array.isArray(detail?.links));
  const validationUrl = info?.metadata?.validation_url
    || help?.links?.find(link => /verify your account/i.test(link?.description || ""))?.url
    || null;
  return {
    message: error?.message || "Verify your account to continue.",
    validationUrl,
  };
}

const ANTIGRAVITY_TRANSIENT_ERROR_PATTERNS = [
  /high\s+traffic/i,
  /agent\s+(execution\s+)?terminated\s+due\s+to\s+error/i,
  /capacity/i,
  /temporarily\s+unavailable/i,
  /timeout/i,
  /stream\s+(ended|closed|terminated|interrupted)/i,
  /empty\s+response/i,
];

const ANTIGRAVITY_TRANSIENT_STATUSES = new Set([
  HTTP_STATUS.SERVER_ERROR,
  HTTP_STATUS.BAD_GATEWAY,
  HTTP_STATUS.SERVICE_UNAVAILABLE,
  HTTP_STATUS.GATEWAY_TIMEOUT,
]);

// Fields Google generateContent rejects (Claude/OpenAI/Qwen thinking fields set at body root by thinkingUnified.js)
const ANTIGRAVITY_REQUEST_BLACKLIST = [
  "output_config",
  "thinking",
  "reasoning_effort",
  "reasoning",
  "enable_thinking",
  "thinking_budget",
  "thinkingConfig",
];

// Strip blacklisted fields from an object (used for both body.request and top-level body)
const stripBlacklisted = obj => {
  for (const key of ANTIGRAVITY_REQUEST_BLACKLIST) delete obj[key];
};

// Image generation model name patterns
const IMAGE_MODEL_PATTERNS = [
  /image/i,
  /imagen/i,
  /image-generation/i,
];

// Detect if a model is an image generation model
function isImageModel(model) {
  if (!model) return false;
  return IMAGE_MODEL_PATTERNS.some(p => p.test(model));
}

// Parse aspect ratio / resolution from model name suffixes
// e.g. "gemini-3.1-flash-image-16x9" -> { aspectRatio: "16:9" }
// e.g. "gemini-3.1-flash-image-1024x768" -> { aspectRatio: "4:3" }
function parseImageConfig(model) {
  const config = { aspectRatio: "1:1" };
  const resMatch = model.match(/(\d+)x(\d+)$/);
  if (resMatch) {
    const w = parseInt(resMatch[1]);
    const h = parseInt(resMatch[2]);
    if (w <= 16 && h <= 16) {
      config.aspectRatio = `${w}:${h}`;
    } else {
      // Resolution like 1024x768 — derive aspect ratio
      const gcd = (a, b) => b ? gcd(b, a % b) : a;
      const d = gcd(w, h);
      config.aspectRatio = `${w/d}:${h/d}`;
    }
  }
  return config;
}

function uuidFromSeed(seed) {
  const bytes = crypto.createHash("sha256").update(String(seed || "antigravity")).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function buildIdeRequestId({ body, request, credentials, model, requestType }) {
  if (ANTIGRAVITY_IDE_REQUEST_ID_RE.test(body?.requestId || "")) {
    return body.requestId;
  }

  const sessionId = request?.sessionId || body?.request?.sessionId || credentials?._clientSessionId || credentials?.connectionId || credentials?.email || "anonymous";
  const conversationId = uuidFromSeed(`antigravity:conversation:${sessionId}`);
  const trajectoryId = uuidFromSeed(`antigravity:trajectory:${sessionId}:${model}:${requestType}`);
  const contentCount = Array.isArray(request?.contents) ? request.contents.length : 1;
  const step = Math.max(1, contentCount * 2 - 1);
  return `agent/${conversationId}/${Date.now()}/${trajectoryId}/${step}`;
}

// Real Antigravity is a Node.js client — its outbound requests never carry proxy tracing,
// Stainless SDK, or Chromium Sec-Ch-* headers. Strip any that leak the proxy hop, force the
// native Node accept-encoding, and move Authorization last (OmniRoute parity).
const ANTIGRAVITY_SCRUB_HEADERS = new Set([
  "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto", "x-forwarded-port",
  "x-real-ip", "forwarded", "via",
  "x-stainless-lang", "x-stainless-package-version", "x-stainless-os", "x-stainless-arch",
  "x-stainless-runtime", "x-stainless-runtime-version", "x-stainless-timeout",
  "x-stainless-retry-count", "x-stainless-helper-method",
  "http-referer", "referer",
  "sec-ch-ua", "sec-ch-ua-mobile", "sec-ch-ua-platform", "sec-fetch-mode",
  "sec-fetch-site", "sec-fetch-dest", "priority",
  "accept-encoding",
]);

function scrubAntigravityHeaders(headers) {
  const cleaned = {};
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.startsWith("x-omniroute-") || lowerKey.startsWith("x-polyrouter-") || ANTIGRAVITY_SCRUB_HEADERS.has(lowerKey)) {
      continue;
    }
    cleaned[key] = value;
  }
  // Standard Node.js accept-encoding (Electron clients add zstd — a fingerprint mismatch).
  cleaned["Accept-Encoding"] = "gzip, deflate, br";
  return cleaned;
}

export const ANTIGRAVITY_UPSTREAM_MODEL_MAP = {
  "gemini-3.8-flash": "gemini-3.8-flash-tiered",
  "gemini-3.8-flash-high": "gemini-3.8-flash-tiered",
  "gemini-3.8-flash-medium": "gemini-3.8-flash-tiered",
  "gemini-3.8-flash-low": "gemini-3.8-flash-tiered",
  "gemini-3.7-flash": "gemini-3.7-flash-tiered",
  "gemini-3.7-flash-high": "gemini-3.7-flash-tiered",
  "gemini-3.7-flash-medium": "gemini-3.7-flash-tiered",
  "gemini-3.7-flash-low": "gemini-3.7-flash-tiered",
  "gemini-3.6-flash": "gemini-3.6-flash-tiered",
  "gemini-3.1-pro": "gemini-pro-agent",
  "gemini-3.1-pro-high": "gemini-pro-agent",
};

export function resolveAntigravityModel(model) {
  if (!model || typeof model !== "string") return model;
  const clean = model.trim();
  const sufMatch = clean.match(/\([^()]+\)\s*$/);
  const suffix = sufMatch ? sufMatch[0] : "";
  const baseId = suffix ? clean.slice(0, sufMatch.index).trim() : clean;
  const mapped = ANTIGRAVITY_UPSTREAM_MODEL_MAP[baseId] || baseId;
  return (mapped + suffix).trim();
}

export class AntigravityExecutor extends BaseExecutor {
  constructor() {
    super("antigravity", PROVIDERS.antigravity);
  }

  buildUrl(model, stream, urlIndex = 0) {
    const baseUrls = this.getBaseUrls();
    const baseUrl = baseUrls[urlIndex] || baseUrls[0];
    const resolvedModel = resolveAntigravityModel(model);
    // Image generation MUST use non-streaming generateContent (chatCore forceStream
    // already flips stream=false for image models). Everything else ALWAYS streams:
    // the non-streaming `generateContent` 400s for some models (e.g. gpt-oss-120b-medium)
    // because Cloud Code internally injects stream_options without stream=true.
    // chatCore handles SSE→JSON for non-streaming clients.
    if (isImageModel(resolvedModel)) return `${baseUrl}/v1internal:generateContent`;
    return `${baseUrl}/v1internal:streamGenerateContent?alt=sse`;
  }

  // sessionId comes from transformRequest output; base.execute runs transformRequest before
  // buildHeaders, so we read it from instance state cached there (fallback: explicit arg).
  buildHeaders(credentials, stream = true, sessionId = null) {
    const raw = {
      "Content-Type": "application/json",
      "User-Agent": this.config.headers?.["User-Agent"] || ANTIGRAVITY_HEADERS["User-Agent"],
      ...(stream ? { Accept: "text/event-stream" } : {}),
    };
    const cleaned = scrubAntigravityHeaders(raw);
    // `x-goog-user-project` is quota delegation, not project selection. Consumer
    // projects such as `aicode-consumers` reject it with USER_PROJECT_DENIED;
    // the Cloud Code envelope's `project` field is authoritative.
    if (credentials?.accessToken) {
      // Authorization lands last — matches the native Antigravity fingerprint.
      cleaned.Authorization = `Bearer ${credentials.accessToken}`;
    }
    return cleaned;
  }

  async transformRequest(model, body, stream, credentials) {
    const resolvedModel = resolveAntigravityModel(model);
    // Real project id only — a fabricated id ("useful-fuze-abc12") is not a Cloud Code
    // project and only earns a delayed 429 RESOURCE_EXHAUSTED from Google's quota check.
    const storedProjectId = typeof credentials?.projectId === "string"
      ? credentials.projectId.trim()
      : "";
    const hadStoredByopSentinel = storedProjectId === ANTIGRAVITY_REQUIRES_MANUAL_PROJECT;
    let requiresManualProject = hadStoredByopSentinel && !credentials?.accessToken;
    let projectId = hadStoredByopSentinel ? null : (storedProjectId || null);

    // Auto-discover a missing project id (loadCodeAssist → onboardUser). The service is
    // memoized per-connection for 1h, and chat.js already warms it on cold miss — so this
    // is normally a cache hit. Prefer the OAuth-stored id over any client-supplied body
    // project to avoid stale/wrong values causing 404/403 upstream.
    if (!projectId && credentials?.accessToken) {
      const discovered = await getProjectIdForConnection(
        credentials.connectionId || credentials.email,
        credentials.accessToken
      );
      if (discovered === ANTIGRAVITY_REQUIRES_MANUAL_PROJECT) {
        requiresManualProject = true;
      } else if (discovered) {
        projectId = discovered;
      }
    }
    // Also honor a BYOP marker set by an earlier discovery for this connection
    // (executor may be called with different credential shapes per request).
    if (!projectId && !requiresManualProject) {
      const cid = credentials?.connectionId || credentials?.email;
      if (requiresManualGcpProject(cid)) requiresManualProject = true;
    }

    // Fail fast with a clear signal instead of sending a fabricated/empty project id.
    if (!projectId) {
      if (requiresManualProject) {
        return new Response(JSON.stringify({
          error: {
            message:
              "GCP_PROJECT_REQUIRED: Google Antigravity now requires a free GCP Project ID. " +
              "Create one at console.cloud.google.com and enter it in Providers → Antigravity " +
              "(connection settings → Project ID). Automatic project creation is no longer " +
              "available for personal accounts.",
            type: "gcp_project_required",
            code: "gcp_project_required",
          },
        }), { status: 422, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({
        error: {
          message: "Missing Google projectId for Antigravity account. Auto-discovery via " +
            "loadCodeAssist found no Cloud Code project. Please reconnect OAuth in Providers → " +
            "Antigravity (and ensure the Google account has completed Gemini Code Assist onboarding).",
          type: "oauth_missing_project_id",
          code: "missing_project_id",
        },
      }), { status: 422, headers: { "Content-Type": "application/json" } });
    }

    // ─── Image generation: completely different request structure ───
    if (isImageModel(resolvedModel)) {
      const imageConfig = parseImageConfig(resolvedModel);
      // Strip model name suffixes for the actual API model name
      const cleanModel = resolvedModel.replace(/-(\d+)x(\d+)$/, "");

      // Build simplified contents — text-only, merge all user messages
      const contents = [];
      const srcContents = body.request?.contents || body.contents || [];
      for (const c of srcContents) {
        const textParts = (c.parts || []).filter(p => p.text !== undefined).map(p => ({ text: p.text }));
        if (textParts.length > 0) {
          contents.push({ role: c.role || "user", parts: textParts });
        }
      }

      const sessionId = resolveSessionId({
        headers: credentials?.rawHeaders,
        body,
        connectionId: credentials?.email || credentials?.connectionId,
        scope: "antigravity",
      });

      this._lastSessionId = sessionId;
      const request = {
        contents,
        generationConfig: {
          temperature: 1.0,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
          imageConfig,
        },
        sessionId,
        // No tools, no systemInstruction, no safetySettings for image gen
      };

      return {
        project: projectId,
        model: cleanModel,
        userAgent: "antigravity",
        requestType: "image_gen",
        requestId: buildIdeRequestId({ body, request, credentials, model: cleanModel, requestType: "image_gen" }),
        request,
      };
    }

    // ─── Standard (non-image) request ───
    // Fix contents for Claude models via Antigravity
    const contents = body.request?.contents?.map(c => {
      let role = c.role;
      // functionResponse must be role "user" for Claude models
      if (c.parts?.some(p => p.functionResponse)) {
        role = "user";
      }
      // Strip thought-only parts, keep thoughtSignature on functionCall parts (Gemini 3+ requires it)
      const parts = c.parts?.filter(p => {
        if (p.thought && !p.functionCall) return false;
        if (p.thoughtSignature && !p.functionCall && !p.text) return false;
        return true;
      });
      // Gemini 3+ rejects functionCall parts without thoughtSignature. Clients (Claude Code, IDE)
      // don't persist thoughtSignature in their history, so backfill the default signature on any
      // functionCall part that arrives without one.
      const needsBackfill = parts?.some(p => p.functionCall && !p.thoughtSignature) ?? false;
      if (role !== c.role || parts?.length !== c.parts?.length || needsBackfill) {
        return {
          ...c, role,
          parts: needsBackfill
            ? parts.map(p => (p.functionCall && !p.thoughtSignature)
                ? { ...p, thoughtSignature: DEFAULT_THINKING_AG_SIGNATURE }
                : p)
            : parts,
        };
      }
      return c;
    });

    // Claude-backed models use protobuf `parameters`, which Cloud Code maps to
    // Anthropic input_schema. Gemini-backed models accept parametersJsonSchema.
    const isClaudeModel = resolvedModel.toLowerCase().includes("claude");
    let tools = body.request?.tools;

    if (tools && tools.length > 0) {
      // Merge all groups into a single functionDeclarations group (Gemini expects 1 group)
      const seenToolNames = new Set();
      const allDeclarations = [];
      for (const group of tools) {
        for (const fn of group?.functionDeclarations || []) {
          if (!fn?.name) continue;
          const name = sanitizeFunctionName(fn.name);
          if (seenToolNames.has(name)) continue;
          seenToolNames.add(name);
          const serializeDeclaration = isClaudeModel
            ? serializeCloudCodeClaudeFunctionDeclaration
            : serializeCloudCodeFunctionDeclaration;
          allDeclarations.push(serializeDeclaration({
            ...fn,
            name,
            parameters: fn.parameters
              ?? fn.input_schema
              ?? fn.parametersJsonSchema
              ?? { type: "object", properties: {} }
          }));
        }
      }
      logAntigravityToolSchemaSummary(allDeclarations);
      tools = allDeclarations.length > 0 ? [{ functionDeclarations: allDeclarations }] : [];
    }

    // Strip tools/toolConfig (handled separately) and blacklisted fields that Google rejects
    const { tools: _originalTools, toolConfig: _originalToolConfig, ...requestWithoutTools } = body.request || {};
    stripBlacklisted(requestWithoutTools);
    const generationConfig = { ...(requestWithoutTools.generationConfig || {}) };
    if (generationConfig.maxOutputTokens > MAX_ANTIGRAVITY_OUTPUT_TOKENS) {
      generationConfig.maxOutputTokens = MAX_ANTIGRAVITY_OUTPUT_TOKENS;
    }

    const transformedRequest = {
      ...requestWithoutTools,
      generationConfig,
      ...(contents && { contents }),
      ...(tools && { tools }),
      sessionId: body.request?.sessionId || resolveSessionId({ headers: credentials?.rawHeaders, body, connectionId: credentials?.email || credentials?.connectionId, scope: "antigravity" }),
      safetySettings: undefined,
      ...(tools?.length > 0 && { toolConfig: { functionCallingConfig: { mode: "VALIDATED" } } })
    };

    // Strip blacklisted thinking fields from top-level body (set by thinkingUnified.js at root, not body.request)
    stripBlacklisted(body);

    this._lastSessionId = transformedRequest.sessionId; // cached for buildHeaders (base.execute order)

    return {
      ...body,
      project: projectId,
      model: resolvedModel,
      userAgent: "antigravity",
      requestType: "agent",
      requestId: buildIdeRequestId({ body, request: transformedRequest, credentials, model: resolvedModel, requestType: "agent" }),
      request: transformedRequest
    };
  }

  async refreshCredentials(credentials, log, proxyOptions = null) {
    if (!credentials.refreshToken) return null;

    try {
      const response = await proxyAwareFetch(OAUTH_ENDPOINTS.google.token, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: credentials.refreshToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret
        })
      }, proxyOptions);

      if (!response.ok) return null;

      const tokens = await response.json();
      log?.info?.("TOKEN", "Antigravity refreshed");

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || credentials.refreshToken,
        expiresIn: tokens.expires_in,
        projectId: credentials.projectId
      };
    } catch (error) {
      log?.error?.("TOKEN", `Antigravity refresh error: ${error.message}`);
      return null;
    }
  }

  generateSessionId() {
    return crypto.randomUUID() + Date.now().toString();
  }

  async shouldRefreshResponse(response) {
    if (response?.status !== HTTP_STATUS.FORBIDDEN || typeof response.clone !== "function") return true;
    try {
      const bodyText = await response.clone().text();
      return !parseAntigravityValidationRequired(bodyText);
    } catch {
      return true;
    }
  }

  parseError(response, bodyText) {
    const validation = parseAntigravityValidationRequired(bodyText);
    if (validation) {
      const link = validation.validationUrl ? ` Complete verification: ${validation.validationUrl}` : "";
      return {
        status: response.status,
        message: `${validation.message}${link}`,
        validationRequired: true,
      };
    }
    return super.parseError(response, bodyText);
  }

  parseRetryHeaders(headers) {
    if (!headers?.get) return null;

    const retryAfter = headers.get('retry-after');
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds) && seconds > 0) return seconds * 1000;

      const date = new Date(retryAfter);
      if (!isNaN(date.getTime())) {
        const diff = date.getTime() - Date.now();
        return diff > 0 ? diff : null;
      }
    }

    const resetAfter = headers.get('x-ratelimit-reset-after');
    if (resetAfter) {
      const seconds = parseInt(resetAfter, 10);
      if (!isNaN(seconds) && seconds > 0) return seconds * 1000;
    }

    const resetTimestamp = headers.get('x-ratelimit-reset');
    if (resetTimestamp) {
      const ts = parseInt(resetTimestamp, 10) * 1000;
      const diff = ts - Date.now();
      return diff > 0 ? diff : null;
    }

    return null;
  }

  // Parse retry time from Antigravity error message body
  // Format: "Your quota will reset after 2h7m23s" or "1h30m" or "45m" or "30s"
  parseRetryFromErrorMessage(errorMessage) {
    if (!errorMessage || typeof errorMessage !== "string") return null;

    const match = errorMessage.match(/reset after (\d+h)?(\d+m)?(\d+s)?/i);
    if (!match) return null;

    let totalMs = 0;
    if (match[1]) totalMs += parseInt(match[1]) * 3600 * 1000; // hours
    if (match[2]) totalMs += parseInt(match[2]) * 60 * 1000; // minutes
    if (match[3]) totalMs += parseInt(match[3]) * 1000; // seconds

    return totalMs > 0 ? totalMs : null;
  }

  extractErrorMessage(errorJson, bodyText = "") {
    return [
      errorJson?.error?.message,
      errorJson?.message,
      errorJson?.error,
      bodyText,
    ].filter(Boolean).map(v => typeof v === "string" ? v : JSON.stringify(v)).join("\n");
  }

  isTransientAntigravityError(status, message) {
    if (status === HTTP_STATUS.RATE_LIMITED) return true;
    if (ANTIGRAVITY_TRANSIENT_STATUSES.has(status)) return true;
    return ANTIGRAVITY_TRANSIENT_ERROR_PATTERNS.some(pattern => pattern.test(message || ""));
  }

  // Hook called by BaseExecutor.tryRetry: derive delay from Retry-After (header → body),
  // cap at MAX_RETRY_AFTER_MS, else retry transient Antigravity failures with backoff.
  // Return false to veto (fallback URL / final error).
  async computeRetryDelay(response, attempt) {
    let bodyText = "";
    let errorJson = null;
    let retryMs = this.parseRetryHeaders(response.headers);

    try {
      bodyText = await response.clone().text();
      errorJson = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      // ignore parse errors → fall through to status/message based retry
    }

    const errorMessage = this.extractErrorMessage(errorJson, bodyText);

    if (!retryMs) {
      retryMs = this.parseRetryFromErrorMessage(errorMessage);
    }
    if (retryMs) return retryMs <= MAX_RETRY_AFTER_MS ? retryMs : false;

    if (!this.isTransientAntigravityError(response.status, errorMessage)) return false;

    const cap = response.status === HTTP_STATUS.RATE_LIMITED
      ? MAX_RETRY_AFTER_MS
      : ANTIGRAVITY_TRANSIENT_RETRY_MAX_MS;
    return Math.min(1000 * (2 ** attempt), cap); // exponential backoff
  }

  /**
   * Cloak tools before sending to Antigravity provider (anti-ban):
   * - Rename client tools with _ide suffix
   * - Inject AG default decoy tools after client tools
   * Returns { cloakedBody, toolNameMap } where toolNameMap maps suffixed → original
   */
  static cloakTools(body, clientTool = null) {
    const tools = body.request?.tools;
    if (!tools || tools.length === 0) {
      return { cloakedBody: body, toolNameMap: null };
    }

    const isCopilot = clientTool === "github-copilot";
    const toolNameMap = new Map();
    const clientDeclarations = [];
    const decoyNames = new Set(AG_DECOY_TOOLS.map(tool => tool.name));

    // First: collect renamed client tools
    for (const toolGroup of tools) {
      if (!toolGroup.functionDeclarations) continue;

      for (const func of toolGroup.functionDeclarations) {
        // For GitHub Copilot, avoid emitting duplicate native Antigravity tool names.
        // Keep the decoys only once in the final declaration list.
        if (isCopilot && AG_DEFAULT_TOOLS.has(func.name)) {
          continue;
        }

        // Skip if already covered by decoys for Copilot
        if (isCopilot && decoyNames.has(func.name)) {
          continue;
        }

        // Preserve native AG names for non-Copilot clients
        if (AG_DEFAULT_TOOLS.has(func.name)) {
          clientDeclarations.push(func);
          continue;
        }

        const suffixed = `${func.name}${AG_TOOL_SUFFIX}`;
        toolNameMap.set(suffixed, func.name);
        clientDeclarations.push({ ...func, name: suffixed });
      }
    }

    // Client tools first, then AG decoy tools
    const allDeclarations = [];
    const seenNames = new Set();
    for (const decl of [...clientDeclarations, ...AG_DECOY_TOOLS]) {
      if (!decl?.name || seenNames.has(decl.name)) continue;
      seenNames.add(decl.name);
      allDeclarations.push(decl);
    }

    // Rename tool names in conversation history (contents)
    const cloakedContents = body.request?.contents?.map(msg => {
      if (!msg.parts) return msg;
      
      const cloakedParts = msg.parts.map(part => {
        // Rename functionCall.name
        if (part.functionCall && !AG_DEFAULT_TOOLS.has(part.functionCall.name)) {
          return {
            ...part,
            functionCall: {
              ...part.functionCall,
              name: `${part.functionCall.name}${AG_TOOL_SUFFIX}`
            }
          };
        }
        
        // Rename functionResponse.name
        if (part.functionResponse && !AG_DEFAULT_TOOLS.has(part.functionResponse.name)) {
          return {
            ...part,
            functionResponse: {
              ...part.functionResponse,
              name: `${part.functionResponse.name}${AG_TOOL_SUFFIX}`
            }
          };
        }
        
        return part;
      });
      
      return { ...msg, parts: cloakedParts };
    });

    // Single functionDeclarations group: client tools first, then decoys
    return {
      cloakedBody: {
        ...body,
        request: {
          ...body.request,
          tools: [{ functionDeclarations: allDeclarations }],
          contents: cloakedContents || body.request.contents
        }
      },
      toolNameMap
    };
  }
}

// AG decoy tools — same names as AG native defaults, redirect to _ide suffixed tools
const AG_DECOY_TOOLS = [
  {
    name: "browser_subagent",
    description: "This tool is currently unavailable.",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  },
  {
    name: "command_status",
    description: "This tool is currently unavailable.",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  },
  {
    name: "find_by_name",
    description: "This tool is currently unavailable.",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  },
  {
    name: "generate_image",
    description: "This tool is currently unavailable.",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  },
  {
    name: "grep_search",
    description: "This tool is currently unavailable.",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  },
  {
    name: "list_dir",
    description: "This tool is currently unavailable.",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  },
  {
    name: "list_resources",
    description: "This tool is currently unavailable.",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  },
  {
    name: "mcp_sequential-thinking_sequentialthinking",
    description: "This tool is currently unavailable.",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  },
  {
    name: "multi_replace_file_content",
    description: "This tool is currently unavailable.",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  },
  {
    name: "notify_user",
    description: "This tool is currently unavailable.",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  },
  {
    name: "read_resource",
    description: "This tool is currently unavailable.",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  },
  {
    name: "read_terminal",
    description: "This tool is currently unavailable.",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  },
  {
    name: "read_url_content",
    description: "This tool is currently unavailable.",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  },
  {
    name: "replace_file_content",
    description: "This tool is currently unavailable.",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  },
  {
    name: "run_command",
    description: "This tool is currently unavailable.",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  },
  {
    name: "search_web",
    description: "This tool is currently unavailable.",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  },
  {
    name: "send_command_input",
    description: "This tool is currently unavailable.",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  },
  {
    name: "task_boundary",
    description: "This tool is currently unavailable.",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  },
  {
    name: "view_content_chunk",
    description: "This tool is currently unavailable.",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  },
  {
    name: "view_file",
    description: "This tool is currently unavailable.",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  },
  {
    name: "write_to_file",
    description: "This tool is currently unavailable.",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  }
];

export default AntigravityExecutor;
