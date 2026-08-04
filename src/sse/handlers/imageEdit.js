import {
  extractApiKey, isValidApiKey, getProviderCredentials, markAccountUnavailable, clearAccountError,
} from "../services/auth.js";
import { getSettings } from "@/lib/localDb";
import { getModelInfo } from "../services/model.js";
import { AI_PROVIDERS } from "@/shared/constants/providers";
import { errorResponse, unavailableResponse, parseUpstreamError } from "open-sse/utils/error.js";
import { HTTP_STATUS } from "open-sse/config/runtimeConfig.js";
import { proxyAwareFetch } from "open-sse/utils/proxyFetch.js";

function cloneFormData(source, upstreamModel) {
  const copy = new FormData();
  for (const [key, value] of source.entries()) copy.append(key, key === "model" ? upstreamModel : value);
  if (!source.has("model")) copy.append("model", upstreamModel);
  return copy;
}

export async function handleImageEdit(request) {
  const contentType = request.headers.get("content-type") || "";
  const multipart = contentType.includes("multipart/form-data");
  let payload;
  try { payload = multipart ? await request.formData() : await request.json(); }
  catch { return errorResponse(HTTP_STATUS.BAD_REQUEST, multipart ? "Invalid multipart form data" : "Invalid JSON body"); }

  const settings = await getSettings();
  if (settings.requireApiKey) {
    const apiKey = extractApiKey(request);
    if (!apiKey) return errorResponse(HTTP_STATUS.UNAUTHORIZED, "Missing API key");
    if (!(await isValidApiKey(apiKey))) return errorResponse(HTTP_STATUS.UNAUTHORIZED, "Invalid API key");
  }

  const modelId = multipart ? payload.get("model") : payload.model;
  const prompt = multipart ? payload.get("prompt") : payload.prompt;
  if (!modelId) return errorResponse(HTTP_STATUS.BAD_REQUEST, "Missing model");
  if (!prompt) return errorResponse(HTTP_STATUS.BAD_REQUEST, "Missing prompt");

  const modelInfo = await getModelInfo(modelId);
  const config = AI_PROVIDERS[modelInfo.provider]?.imageEditConfig;
  if (!modelInfo.provider || !config?.baseUrl) return errorResponse(HTTP_STATUS.BAD_REQUEST, "Provider does not support image editing");

  const excluded = new Set();
  let lastError = "Image edit failed";
  let lastStatus = HTTP_STATUS.BAD_GATEWAY;
  while (true) {
    const credentials = await getProviderCredentials(modelInfo.provider, excluded, modelInfo.model);
    if (!credentials || credentials.allRateLimited) {
      if (credentials?.allRateLimited) {
        return unavailableResponse(lastStatus, lastError, credentials.retryAfter, credentials.retryAfterHuman);
      }
      return errorResponse(lastStatus, excluded.size ? lastError : `No credentials for provider: ${modelInfo.provider}`);
    }

    const requestBody = multipart
      ? cloneFormData(payload, modelInfo.model)
      : JSON.stringify({ ...payload, model: modelInfo.model });
    const headers = { Authorization: `Bearer ${credentials.apiKey || credentials.accessToken}` };
    if (!multipart) headers["Content-Type"] = "application/json";

    let response;
    try {
      response = await proxyAwareFetch(
        config.baseUrl,
        { method: "POST", headers, body: requestBody },
        credentials.providerSpecificData
      );
    } catch (error) {
      lastStatus = HTTP_STATUS.BAD_GATEWAY;
      lastError = error.message || "Image edit request failed";
      const { shouldFallback } = await markAccountUnavailable(
        credentials.connectionId, lastStatus, lastError, modelInfo.provider, modelInfo.model
      );
      if (!shouldFallback) return errorResponse(lastStatus, lastError);
      excluded.add(credentials.connectionId);
      continue;
    }

    if (response.ok) {
      await clearAccountError(credentials.connectionId, credentials, modelInfo.model);
      return new Response(response.body, {
        status: response.status,
        headers: { "Content-Type": response.headers.get("content-type") || "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    lastStatus = response.status;
    lastError = (await parseUpstreamError(response)).message;
    const { shouldFallback } = await markAccountUnavailable(credentials.connectionId, lastStatus, lastError, modelInfo.provider, modelInfo.model);
    if (!shouldFallback) return errorResponse(lastStatus, lastError);
    excluded.add(credentials.connectionId);
  }
}
