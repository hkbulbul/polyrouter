import assert from "node:assert/strict";
import test from "node:test";

import {
  bindChatGptWebTurn,
  completeChatGptWebToolCall,
  invokeChatGptWebTurnTool,
  listChatGptWebTurnTools,
  markChatGptWebToolBatchDelivered,
  registerChatGptWebTurn,
  resetChatGptWebBrokerForTests,
  waitForChatGptWebToolBatch,
} from "../open-sse/executors/chatgpt-web-broker.js";

test.afterEach(() => resetChatGptWebBrokerForTests());

test("binds a turn and exposes only its client tools", () => {
  const turn = registerChatGptWebTurn({
    tools: [{
      type: "function",
      function: {
        name: "write_file",
        description: "Write a file",
        parameters: { type: "object", properties: { path: { type: "string" } } },
      },
    }],
  });
  const bound = bindChatGptWebTurn(turn.token);
  const tools = listChatGptWebTurnTools(bound.bindingId);

  assert.equal(bound.toolCount, 1);
  assert.equal(tools[0].name, "write_file");
  assert.equal(tools[0].parameters.properties.path.type, "string");
});

test("bridges an MCP invocation through a client tool round", async () => {
  const turn = registerChatGptWebTurn({
    tools: [{ type: "function", function: { name: "write_file", parameters: { type: "object" } } }],
  });
  const { bindingId } = bindChatGptWebTurn(turn.token);
  const invocation = invokeChatGptWebTurnTool(bindingId, "write_file", {
    path: "test.html",
    content: "<h1>Medical</h1>",
  });
  const batch = await waitForChatGptWebToolBatch(turn.token);

  assert.equal(batch.length, 1);
  assert.equal(batch[0].name, "write_file");
  markChatGptWebToolBatchDelivered(turn.token, batch);
  completeChatGptWebToolCall(batch[0].callId, {
    content: [{ type: "text", text: "created test.html" }],
  });

  assert.deepEqual(await invocation, {
    content: [{ type: "text", text: "created test.html" }],
  });
});

test("rejects a tool that was not advertised by the client", () => {
  const turn = registerChatGptWebTurn({
    tools: [{ type: "function", function: { name: "read_file", parameters: { type: "object" } } }],
  });
  const { bindingId } = bindChatGptWebTurn(turn.token);

  assert.throws(
    () => invokeChatGptWebTurnTool(bindingId, "delete_database", {}),
    /not available/,
  );
});

test("preserves freeform custom tools for Responses clients", async () => {
  const turn = registerChatGptWebTurn({
    tools: [{
      type: "function",
      _polyrouterOriginalType: "custom",
      function: {
        name: "apply_patch",
        parameters: { type: "object", properties: { input: { type: "string" } } },
      },
    }],
  });
  const { bindingId } = bindChatGptWebTurn(turn.token);
  const invocation = invokeChatGptWebTurnTool(bindingId, "apply_patch", { input: "*** Begin Patch" });
  const batch = await waitForChatGptWebToolBatch(turn.token);

  assert.equal(batch[0].freeform, true);
  assert.equal(batch[0].input, "*** Begin Patch");
  markChatGptWebToolBatchDelivered(turn.token, batch);
  completeChatGptWebToolCall(batch[0].callId, { content: [{ type: "text", text: "done" }] });
  await invocation;
});
