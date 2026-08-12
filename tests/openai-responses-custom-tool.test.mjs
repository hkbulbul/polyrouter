import assert from "node:assert/strict";
import test from "node:test";

import { openaiResponsesToOpenAIRequest } from "../open-sse/translator/request/openai-responses.js";
import { openAICompletionToResponses } from "../open-sse/translator/response/openai-chat-to-responses.js";
import { openaiToOpenAIResponsesResponse } from "../open-sse/translator/response/openai-responses.js";

function responseState() {
  return {
    seq: 0,
    responseId: "resp_test",
    created: 1,
    started: false,
    model: "test-model",
    msgTextBuf: {},
    msgItemAdded: {},
    msgContentAdded: {},
    msgItemDone: {},
    reasoningId: "",
    reasoningIndex: -1,
    reasoningBuf: "",
    reasoningPartAdded: false,
    reasoningDone: false,
    inThinking: false,
    funcArgsBuf: {},
    funcNames: {},
    funcCallIds: {},
    funcFreeform: {},
    funcInputEmitted: {},
    funcArgsDone: {},
    funcItemDone: {},
    completedSent: false,
  };
}

test("emits Responses custom_tool_call events for freeform client tools", () => {
  const state = responseState();
  const started = openaiToOpenAIResponsesResponse({
    id: "chatcmpl_test",
    model: "test-model",
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          id: "call_test",
          type: "function",
          _polyrouterFreeform: true,
          function: { name: "apply_patch", arguments: JSON.stringify({ input: "*** Begin Patch" }) },
        }],
      },
      finish_reason: null,
    }],
  }, state);

  assert.equal(
    started.find((event) => event.event === "response.output_item.added")?.data.item.type,
    "custom_tool_call",
  );
  assert.equal(
    started.find((event) => event.event === "response.custom_tool_call_input.delta")?.data.delta,
    "*** Begin Patch",
  );

  const finished = openaiToOpenAIResponsesResponse({
    id: "chatcmpl_test",
    model: "test-model",
    choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }],
  }, state);
  const item = finished.find((event) => event.event === "response.output_item.done")?.data.item;
  assert.equal(item.type, "custom_tool_call");
  assert.equal(item.input, "*** Begin Patch");
});

test("translates custom tool calls and outputs into a retained chat tool round", () => {
  const request = openaiResponsesToOpenAIRequest("test-model", {
    input: [
      {
        type: "custom_tool_call",
        call_id: "call_patch",
        name: "apply_patch",
        input: "*** Begin Patch",
      },
      {
        type: "custom_tool_call_output",
        call_id: "call_patch",
        output: "Done!",
      },
    ],
  }, true, {});

  assert.equal(request.messages[0].tool_calls[0]._polyrouterFreeform, true);
  assert.equal(
    JSON.parse(request.messages[0].tool_calls[0].function.arguments).input,
    "*** Begin Patch",
  );
  assert.deepEqual(request.messages[1], {
    role: "tool",
    tool_call_id: "call_patch",
    content: "Done!",
  });
});

test("preserves custom tool calls in non-streaming Responses output", () => {
  const response = openAICompletionToResponses({
    id: "chatcmpl_test",
    model: "test-model",
    choices: [{
      message: {
        role: "assistant",
        content: null,
        tool_calls: [{
          id: "call_patch",
          type: "function",
          _polyrouterFreeform: true,
          function: {
            name: "apply_patch",
            arguments: JSON.stringify({ input: "*** Begin Patch" }),
          },
        }],
      },
      finish_reason: "tool_calls",
    }],
  });

  assert.equal(response.output[0].type, "custom_tool_call");
  assert.equal(response.output[0].input, "*** Begin Patch");
});
