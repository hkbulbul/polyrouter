import { describe, expect, it, vi } from "vitest";
import { canonicalizeUsage } from "open-sse/utils/usageTracking.js";
import { calculateCostBreakdownFromTokens } from "open-sse/providers/pricing.js";

vi.mock("@/lib/usageDb.js", () => ({
  appendRequestLog: vi.fn(async () => {}),
  saveRequestDetail: vi.fn(async () => {}),
  saveRequestUsage: vi.fn(async () => {})
}));

import { saveRequestDetail, saveRequestUsage } from "@/lib/usageDb.js";
import { handleForcedSSEToJson } from "open-sse/handlers/chatCore/sseToJsonHandler.js";
import { FORMATS } from "open-sse/translator/formats.js";

describe("Responses nonstream request costs", () => {
  it("preserves cache and reasoning usage through forced SSE conversion", async () => {
    const usage = {
      input_tokens: 100, output_tokens: 50, total_tokens: 150,
      input_tokens_details: { cached_tokens: 40 },
      output_tokens_details: { reasoning_tokens: 20 }
    };
    const payload = `event: response.completed\ndata: ${JSON.stringify({ response: { status: "completed", usage } })}\n\n`;
    const result = await handleForcedSSEToJson({
      providerResponse: new Response(payload, { headers: { "content-type": "text/event-stream" } }),
      sourceFormat: FORMATS.OPENAI_RESPONSES,
      provider: "codex", model: "gpt-4o",
      body: { messages: [] }, stream: false,
      requestStartTime: Date.now(), trackDone: vi.fn(), appendLog: vi.fn()
    });
    expect(result.success).toBe(true);
    expect((await result.response.json()).usage).toEqual(usage);
    const detail = saveRequestDetail.mock.calls.at(-1)[0];
    const history = saveRequestUsage.mock.calls.at(-1)[0];
    expect(detail.tokens).toMatchObject({ cached_tokens: 40, reasoning_tokens: 20, reasoning_tokens_included: true });
    const pricing = { input: 3, output: 15, cached: 0.3 };
    const detailCost = calculateCostBreakdownFromTokens(canonicalizeUsage(detail.tokens), pricing);
    expect(detailCost).toEqual(calculateCostBreakdownFromTokens(canonicalizeUsage(history.tokens), pricing));
    expect(detailCost.totalCost).toBeCloseTo(0.000942, 12);
  });
});
