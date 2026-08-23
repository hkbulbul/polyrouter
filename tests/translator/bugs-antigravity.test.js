// Real Antigravity-MITM requests (Gemini-internal: { request: { contents, ... } }) → OpenAI.
import { describe, it, expect } from "vitest";
import "./registerAll.js";
import { translateRequest, translateResponse, initState } from "../../open-sse/translator/index.js";
import { FORMATS } from "../../open-sse/translator/formats.js";
import {
  AntigravityExecutor,
  parseAntigravityValidationRequired,
} from "../../open-sse/executors/antigravity.js";
import { ANTIGRAVITY_REQUIRES_MANUAL_PROJECT } from "../../open-sse/services/projectId.js";
import { openaiToAntigravityRequest } from "../../open-sse/translator/request/openai-to-gemini.js";
import { ANTIGRAVITY_DEFAULT_SYSTEM } from "../../open-sse/config/appConstants.js";

const AG2O = (req) =>
  translateRequest(FORMATS.ANTIGRAVITY, FORMATS.OPENAI, "m", { request: req }, true, null, null);

describe("Antigravity → OpenAI", () => {
  // antigravity-to-openai.js — content with BOTH functionResponse and functionCall/text
  // previously returned toolResults early → dropped tool calls / text (fixed in #2225)
  it("functionResponse + functionCall in same content keeps both", () => {
    const out = AG2O({
      contents: [{
        role: "model",
        parts: [
          { functionResponse: { id: "c1", name: "prev", response: { result: "done" } } },
          { functionCall: { id: "c2", name: "next", args: {} } },
        ],
      }],
    });
    const json = JSON.stringify(out);
    expect(json, "functionCall lost when sharing content with functionResponse").toContain("\"next\"");
  });

  // antigravity-to-openai.js:167 — functionCall without id gets a random Date.now() id
  // KNOWN BUG: unstable id breaks matching with its functionResponse
  it("functionCall without id keeps a stable matchable id", () => {
    const out = AG2O({
      contents: [
        { role: "model", parts: [{ functionCall: { name: "search", args: { q: "x" } } }] },
        { role: "user", parts: [{ functionResponse: { name: "search", response: { result: "r" } } }] },
      ],
    });
    const asst = out.messages.find((m) => m.tool_calls);
    const tool = out.messages.find((m) => m.role === "tool");
    expect(tool?.tool_call_id, "id mismatch between call and response").toBe(asst?.tool_calls?.[0]?.id);
  });

  // antigravity-to-openai.js:144-147 — signature-only part handling (regression guard)
  it("signature-only part does not produce empty text", () => {
    const out = AG2O({
      contents: [{ role: "model", parts: [{ thoughtSignature: "sig", text: "" }] }],
    });
    const asst = out.messages.find((m) => m.role === "assistant");
    const content = asst?.content;
    const hasEmpty = Array.isArray(content)
      ? content.some((c) => c.type === "text" && c.text === "")
      : content === "";
    expect(hasEmpty, "empty text part emitted").toBe(false);
  });
});

describe("Antigravity → Claude", () => {
  it("converts Claude custom tools into the Cloud Code Claude tool contract", () => {
    const out = translateRequest(FORMATS.CLAUDE, FORMATS.ANTIGRAVITY, "claude-opus-4-6-thinking", {
      model: "ag/claude-opus-4-6-thinking",
      max_tokens: 32,
      messages: [{ role: "user", content: "Apply the patch" }],
      tools: [{
        type: "custom",
        name: "apply_patch",
        description: "Apply a freeform patch",
        format: { type: "grammar", syntax: "lark", definition: "start: /.+/" },
      }],
    }, true, { projectId: "project-1", connectionId: "conn-1" }, "antigravity");

    const declaration = out.request.tools[0].functionDeclarations[0];
    expect(declaration).toMatchObject({
      name: "apply_patch",
      parameters: {
        type: "object",
        properties: { input: { type: "string" } },
        required: ["input"],
      },
    });
    expect(out.request.tools).toHaveLength(1);
    expect(declaration).not.toHaveProperty("format");
    expect(declaration).not.toHaveProperty("input_schema");
    expect(declaration).not.toHaveProperty("inputSchema");
  });

  it("serializes large Claude tool sets through Cloud Code protobuf parameters", async () => {
    const tools = Array.from({ length: 42 }, (_, index) => ({
      name: `tool_${index}`,
      description: `Tool ${index}`,
      input_schema: index === 38 || index === 39
        ? {
            type: "object",
            properties: {
              path: { type: "string" },
              mode: { type: "string" },
              enabled: { type: "boolean" },
              value: {},
            },
            required: ["path"],
          }
        : { type: "object", properties: { value: { type: "string" } } },
    }));
    const translated = translateRequest(FORMATS.CLAUDE, FORMATS.ANTIGRAVITY, "claude-opus-4-6-thinking", {
      model: "ag/claude-opus-4-6-thinking",
      max_tokens: 32,
      messages: [{ role: "user", content: "hi" }],
      tools,
    }, true, { projectId: "project-1", connectionId: "conn-1" }, "antigravity");
    const out = await new AntigravityExecutor().transformRequest(
      "claude-opus-4-6-thinking",
      translated,
      true,
      { projectId: "project-1", connectionId: "conn-1" }
    );

    const declarations = out.request.tools[0].functionDeclarations;
    expect(declarations).toHaveLength(42);
    for (const declaration of declarations) {
      expect(declaration).toHaveProperty("parameters");
      expect(declaration).not.toHaveProperty("parametersJsonSchema");
      expect(declaration).not.toHaveProperty("input_schema");
    }
    expect(declarations[38].parameters.type).toBe("object");
    expect(declarations[38].parameters.properties.path.type).toBe("string");
    expect(declarations[38].parameters.properties.value).toEqual({
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Brief explanation of why you are calling this tool",
        },
      },
      required: ["reason"],
    });
    expect(declarations[39].parameters.properties.value)
      .toEqual(declarations[38].parameters.properties.value);
  });

  it("tool call input_json_delta includes Anthropic index", () => {
    const state = initState(FORMATS.CLAUDE);
    const events = translateResponse(FORMATS.ANTIGRAVITY, FORMATS.CLAUDE, {
      response: {
        responseId: "resp-1",
        modelVersion: "gemini-pro-agent",
        candidates: [{
          content: {
            role: "model",
            parts: [{ functionCall: { name: "bash", args: { command: "git status" } } }],
          },
          finishReason: "STOP",
          index: 0,
        }],
      },
    }, state);

    const jsonDelta = events.find(
      (event) => event.type === "content_block_delta" && event.delta?.type === "input_json_delta"
    );
    expect(jsonDelta).toMatchObject({ index: expect.any(Number) });
    expect(JSON.parse(jsonDelta.delta.partial_json)).toEqual({ command: "git status" });
  });
});

describe("Antigravity executor", () => {
  it("extracts Google account validation actions from 403 responses", async () => {
    const validationUrl = "https://accounts.google.com/signin/continue?example=1";
    const body = JSON.stringify({
      error: {
        code: 403,
        message: "Verify your account to continue.",
        details: [{
          reason: "VALIDATION_REQUIRED",
          metadata: { validation_url: validationUrl },
        }],
      },
    });
    const parsed = parseAntigravityValidationRequired(body);
    expect(parsed).toEqual({
      message: "Verify your account to continue.",
      validationUrl,
    });

    const executor = new AntigravityExecutor();
    const response = new Response(body, { status: 403 });
    expect(await executor.shouldRefreshResponse(response)).toBe(false);
    expect(executor.parseError(response, body).message).toContain(validationUrl);
  });

  it("rejects a persisted BYOP sentinel instead of sending it as a project ID", async () => {
    const out = await new AntigravityExecutor().transformRequest("claude-sonnet-4-6", {
      request: { contents: [{ role: "user", parts: [{ text: "hi" }] }] },
    }, true, {
      projectId: ANTIGRAVITY_REQUIRES_MANUAL_PROJECT,
      connectionId: "conn-byop",
    });

    expect(out).toBeInstanceOf(Response);
    expect(out.status).toBe(422);
    await expect(out.json()).resolves.toMatchObject({
      error: { code: "gcp_project_required" },
    });
  });

  it("strips optional from nested tool schemas and serializes schema types", async () => {
    const out = await new AntigravityExecutor().transformRequest("gemini-2.5-pro", {
      request: {
        contents: [{ role: "user", parts: [{ text: "hi" }] }],
        tools: [{
          functionDeclarations: [{
            name: "lookup",
            description: "Lookup a value",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Search query",
                  optional: true,
                },
              },
            },
          }],
        }],
      },
    }, true, { projectId: "project-1", connectionId: "conn-1" });

    const declaration = out.request.tools[0].functionDeclarations[0];
    const query = declaration.parametersJsonSchema.properties.query;
    expect(declaration).not.toHaveProperty("parameters");
    expect(query).toEqual({ type: "string", description: "Search query" });
  });

  it("serializes Cloud Code Claude custom tool schemas as protobuf Schema", async () => {
    const out = await new AntigravityExecutor().transformRequest("claude-sonnet-4-6", {
      request: {
        contents: [{ role: "user", parts: [{ text: "hi" }] }],
        tools: [{
          functionDeclarations: [{
            name: "configure",
            parameters: {
              type: "object",
              properties: {
                options: {
                  type: "object",
                  properties: { enabled: { type: "boolean" } },
                  required: ["enabled"],
                },
              },
              required: ["options"],
            },
            input_schema: {
              type: "object",
              properties: {
                options: {
                  type: "object",
                  properties: { enabled: { type: "boolean" } },
                  required: ["enabled"],
                },
              },
              required: ["options"],
            },
          }],
        }],
      },
    }, true, { projectId: "project-1", connectionId: "conn-1" });

    const declaration = out.request.tools[0].functionDeclarations[0];
    expect(declaration).toMatchObject({
      name: "configure",
      parameters: {
        type: "object",
        properties: { options: { type: "object" } },
        required: ["options"],
      },
    });
    expect(declaration).not.toHaveProperty("parametersJsonSchema");
    expect(declaration).not.toHaveProperty("input_schema");
    expect(out.request.toolConfig).toEqual({ functionCallingConfig: { mode: "VALIDATED" } });
  });

  it("does not inject the legacy Antigravity default system prompt for Gemini-backed models", () => {
    const out = openaiToAntigravityRequest("gemini-3.5-flash-low", {
      messages: [
        { role: "system", content: "USER_SYSTEM_PROMPT" },
        { role: "user", content: "hello" },
      ],
    }, true, { projectId: "project-1", connectionId: "conn-1" });

    const system = JSON.stringify(out.request.systemInstruction);
    expect(system).toContain("USER_SYSTEM_PROMPT");
    expect(system).not.toContain(ANTIGRAVITY_DEFAULT_SYSTEM);
    expect(system).not.toContain("Please ignore the following [ignore]");
  });

  it("does not inject the legacy Antigravity default system prompt for Claude-backed models", () => {
    const out = openaiToAntigravityRequest("claude-opus-4-6-thinking", {
      messages: [
        { role: "system", content: "USER_SYSTEM_PROMPT" },
        { role: "user", content: "hello" },
      ],
    }, true, { projectId: "project-1", connectionId: "conn-1" });

    const system = JSON.stringify(out.request.systemInstruction);
    expect(system).toContain("USER_SYSTEM_PROMPT");
    expect(system).not.toContain(ANTIGRAVITY_DEFAULT_SYSTEM);
    expect(system).not.toContain("Please ignore the following [ignore]");
  });
});
