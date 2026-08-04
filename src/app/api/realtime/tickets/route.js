import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/localDb";
import { REALTIME_MODELS } from "@/realtime/constants";
import { issueRealtimeTicket } from "@/realtime/tickets";
import { resolveProviderId } from "@/shared/constants/providers";

const REALTIME_PROVIDERS = new Set(["codex", "openai"]);

function extractApiKey(request) {
  const authorization = request.headers.get("authorization") || "";
  if (authorization.startsWith("Bearer ")) return authorization.slice(7).trim();
  return request.headers.get("x-api-key")?.trim() || "";
}

export async function POST(request) {
  try {
    const apiKey = extractApiKey(request);
    if (!apiKey || !(await validateApiKey(apiKey))) {
      return NextResponse.json({ error: "Valid PolyRouter API key required" }, { status: 401 });
    }

    const body = await request.json();
    const provider = resolveProviderId(body?.provider || "codex");
    const model = body?.model || "gpt-realtime-2";
    if (!REALTIME_PROVIDERS.has(provider) || !REALTIME_MODELS.has(model)) {
      return NextResponse.json({ error: "Unsupported realtime provider or model" }, { status: 400 });
    }
    if (typeof body?.origin !== "string" || !body.origin) {
      return NextResponse.json({ error: "Browser origin is required" }, { status: 400 });
    }

    const result = issueRealtimeTicket({
      provider,
      model,
      origin: body.origin,
      ttlSeconds: body.ttlSeconds,
    });
    return NextResponse.json({ ...result, provider, model });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Failed to create realtime ticket" }, { status: 400 });
  }
}
