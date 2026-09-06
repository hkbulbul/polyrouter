import { describe, expect, it } from "vitest";
import { createSSEStream } from "../../open-sse/utils/stream.js";
import { initTranslators } from "../../open-sse/translator/index.js";

initTranslators();

describe("Antigravity streaming response handling", () => {
  it("accumulates content, thinking, and usage from Antigravity wrapped response chunks", async () => {
    let completedContent = null;
    let completedUsage = null;
    let completedTtft = null;

    const stream = createSSEStream({
      mode: "translate",
      targetFormat: "antigravity",
      sourceFormat: "claude",
      provider: "antigravity",
      model: "claude-opus-4-6-thinking",
      onStreamComplete: (content, usage, ttftAt) => {
        completedContent = content;
        completedUsage = usage;
        completedTtft = ttftAt;
      }
    });

    const chunks = [
      'data: {"response":{"candidates":[{"content":{"role":"model","parts":[{"text":"Thinking about greeting","thought":true}]}}],"usageMetadata":{"promptTokenCount":15,"candidatesTokenCount":5,"totalTokenCount":20},"modelVersion":"claude-opus-4-6-thinking","responseId":"req_1"}}\n\n',
      'data: {"response":{"candidates":[{"content":{"role":"model","parts":[{"text":"Hello world!","thought":false}]}}],"usageMetadata":{"promptTokenCount":15,"candidatesTokenCount":10,"totalTokenCount":25},"modelVersion":"claude-opus-4-6-thinking","responseId":"req_1"}}\n\n'
    ];

    const sourceStream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(new TextEncoder().encode(chunk));
        }
        controller.close();
      }
    });

    const transformed = sourceStream.pipeThrough(stream);
    const reader = transformed.getReader();
    const emitted = [];
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      emitted.push(decoder.decode(value));
    }

    expect(emitted.length).toBeGreaterThan(0);
    expect(completedContent).toEqual({
      content: "Hello world!",
      thinking: "Thinking about greeting"
    });
    expect(completedUsage.prompt_tokens).toBe(15);
    expect(completedUsage.completion_tokens).toBe(10);
    expect(completedTtft).toBeTypeOf("number");
  });
});
