import { withOfficeGate } from "@/lib/office/gate.js";
import { handleRerank } from "@/sse/handlers/rerank.js";

export async function OPTIONS() {
  return new Response(null, { headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  } });
}

async function handlePost(request) {
  return handleRerank(request);
}

export const POST = withOfficeGate(handlePost, { kind: "rerank" });
