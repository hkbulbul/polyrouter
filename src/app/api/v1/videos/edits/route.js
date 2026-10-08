import { withOfficeGate } from "@/lib/office/gate.js";
import { handleVideoCreate } from "@/sse/handlers/videoGeneration.js";

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

/** POST /v1/videos/edits - async video edit (xAI Grok Imagine) */
async function handlePost(request) {
  return await handleVideoCreate(request, "edits");
}

export const POST = withOfficeGate(handlePost, { kind: "video" });
