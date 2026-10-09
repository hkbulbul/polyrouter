import { withOfficeGate } from "@/lib/office/gate.js";
import { handleImageEdit } from "@/sse/handlers/imageEdit.js";

export const maxDuration = 300;

export async function OPTIONS() {
  return new Response(null, { headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  } });
}

async function handlePost(request) {
  return handleImageEdit(request);
}

export const POST = withOfficeGate(handlePost, { kind: "image" });
