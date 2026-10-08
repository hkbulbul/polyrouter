import { NextResponse } from "next/server";
import { pingModelByKind } from "./ping";
import { getModelInfo } from "@/sse/services/model.js";
import { getUnavailableProviderError } from "open-sse/providers/index.js";

// POST /api/models/test - Ping a single model via internal completions or embeddings
export async function POST(request) {
  try {
    const { model, kind } = await request.json();
    if (!model) return NextResponse.json({ error: "Model required" }, { status: 400 });
    const modelInfo = await getModelInfo(model);
    const unavailableError = getUnavailableProviderError(modelInfo.provider);
    if (unavailableError) {
      return NextResponse.json({ ok: false, error: unavailableError }, { status: 400 });
    }
    const result = await pingModelByKind(model, kind || "llm");
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
