import { withOfficeGate } from "@/lib/office/gate.js";
import { handleImageGeneration } from "@/sse/handlers/imageGeneration.js";

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

/** POST /v1/images/generations - OpenAI-compatible image generation endpoint */
async function handlePost(request) {
  return await handleImageGeneration(request);
}

export const POST = withOfficeGate(handlePost, { kind: "image" });
