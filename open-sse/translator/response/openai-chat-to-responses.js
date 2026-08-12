function freeformInput(argumentsText) {
  try {
    const parsed = JSON.parse(argumentsText || "{}");
    if (typeof parsed?.input === "string") return parsed.input;
  } catch {
    // Preserve raw freeform input when it is not JSON wrapped.
  }
  return argumentsText;
}

export function openAICompletionToResponses(responseBody) {
  if (!responseBody?.choices?.[0]) return responseBody;

  const choice = responseBody.choices[0];
  const message = choice.message || {};
  const responseId = String(responseBody.id || `chatcmpl-${Date.now()}`);
  const output = [];

  const reasoning =
    message.reasoning_content ||
    message.provider_specific_fields?.reasoning_content ||
    "";
  if (reasoning) {
    output.push({
      id: `rs_${responseId}`,
      type: "reasoning",
      summary: [{ type: "summary_text", text: reasoning }],
    });
  }

  if (typeof message.content === "string") {
    output.push({
      id: `msg_${responseId}`,
      type: "message",
      status: "completed",
      role: "assistant",
      content: [{
        type: "output_text",
        annotations: [],
        logprobs: [],
        text: message.content,
      }],
    });
  }

  for (const [index, toolCall] of (message.tool_calls || []).entries()) {
    const callId = toolCall.id || `call_${Date.now()}_${index}`;
    const fn = toolCall.function || {};
    const argumentsText =
      typeof fn.arguments === "string"
        ? fn.arguments
        : JSON.stringify(fn.arguments || toolCall.arguments || {});
    if (toolCall._polyrouterFreeform === true) {
      output.push({
        id: `ctc_${callId}`,
        type: "custom_tool_call",
        status: "completed",
        call_id: callId,
        name: fn.name || toolCall.name || "",
        input: freeformInput(argumentsText),
      });
    } else {
      output.push({
        id: `fc_${callId}`,
        type: "function_call",
        status: "completed",
        call_id: callId,
        name: fn.name || toolCall.name || "",
        arguments: argumentsText,
      });
    }
  }

  const usage = responseBody.usage || {};
  const inputTokens = usage.prompt_tokens || usage.input_tokens || 0;
  const outputTokens = usage.completion_tokens || usage.output_tokens || 0;
  const cachedTokens =
    usage.prompt_tokens_details?.cached_tokens ||
    usage.input_tokens_details?.cached_tokens ||
    0;
  const reasoningTokens =
    usage.completion_tokens_details?.reasoning_tokens ||
    usage.output_tokens_details?.reasoning_tokens ||
    0;

  return {
    id: responseId.startsWith("resp_") ? responseId : `resp_${responseId}`,
    object: "response",
    created_at: responseBody.created || Math.floor(Date.now() / 1000),
    status: "completed",
    background: false,
    error: null,
    incomplete_details: null,
    model: responseBody.model || "unknown",
    output,
    parallel_tool_calls: true,
    tool_choice: "auto",
    tools: [],
    usage: {
      input_tokens: inputTokens,
      input_tokens_details: { cached_tokens: cachedTokens },
      output_tokens: outputTokens,
      output_tokens_details: { reasoning_tokens: reasoningTokens },
      total_tokens: usage.total_tokens || inputTokens + outputTokens,
    },
  };
}
