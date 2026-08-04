import {
  extractApiKey, isValidApiKey, getProviderCredentials, markAccountUnavailable, clearAccountError,
} from "../services/auth.js";
import { getSettings } from "@/lib/localDb";
import { getModelInfo } from "../services/model.js";
import { AI_PROVIDERS } from "@/shared/constants/providers";
import { errorResponse, unavailableResponse, parseUpstreamError } from "open-sse/utils/error.js";
import { HTTP_STATUS } from "open-sse/config/runtimeConfig.js";
import { proxyAwareFetch } from "open-sse/utils/proxyFetch.js";

export async function handleRerank(request) {
  let body;
  try { body = await request.json(); } catch { return errorResponse(HTTP_STATUS.BAD_REQUEST, "Invalid JSON body"); }

  const settings = await getSettings();
  if (settings.requireApiKey) {
    const apiKey = extractApiKey(request);
    if (!apiKey) return errorResponse(HTTP_STATUS.UNAUTHORIZED, "Missing API key");
    if (!(await isValidApiKey(apiKey))) return errorResponse(HTTP_STATUS.UNAUTHORIZED, "Invalid API key");
  }
  if (!body.model) return errorResponse(HTTP_STATUS.BAD_REQUEST, "Missing model");
  if (!body.input?.query || !Array.isArray(body.input?.documents)) {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, "Missing input.query or input.documents");
  }

  const modelInfo = await getModelInfo(body.model);
  const config = AI_PROVIDERS[modelInfo.provider]?.rerankConfig;
  if (!modelInfo.provider || !config?.baseUrl) return errorResponse(HTTP_STATUS.BAD_REQUEST, "Provider does not support rerank");

  const excluded = new Set();
  let lastError = "Rerank failed";
  let lastStatus = HTTP_STATUS.BAD_GATEWAY;
  while (true) {
    const credentials = await getProviderCredentials(modelInfo.provider, excluded, modelInfo.model);
    if (!credentials || credentials.allRateLimited) {
      if (credentials?.allRateLimited) {
        return unavailableResponse(lastStatus, lastError, credentials.retryAfter, credentials.retryAfterHuman);
      }
      return errorResponse(lastStatus, excluded.size ? lastError : `No credentials for provider: ${modelInfo.provider}`);
    }

    let response;
    try {
      response = await proxyAwareFetch(config.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${credentials.apiKey || credentials.accessToken}` },
        body: JSON.stringify({ ...body, model: modelInfo.model }),
      }, credentials.providerSpecificData);
    } catch (error) {
      lastError = error.message || "Rerank request failed";
      lastStatus = HTTP_STATUS.BAD_GATEWAY;
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
