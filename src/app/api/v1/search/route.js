import { withOfficeGate } from "@/lib/office/gate.js";
import { handleSearch } from "@/sse/handlers/search.js";

/**
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "*"
    }
  });
}

/**
 * POST /v1/search - Web search endpoint
 */
async function handlePost(request) {
  return await handleSearch(request);
}

export const POST = withOfficeGate(handlePost, { kind: "search" });
