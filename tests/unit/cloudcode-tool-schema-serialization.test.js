import { describe, expect, it } from "vitest";
import { AntigravityExecutor } from "../../open-sse/executors/antigravity.js";
import { GeminiCLIExecutor } from "../../open-sse/executors/gemini-cli.js";
import { serializeCloudCodeFunctionDeclaration } from "../../open-sse/translator/formats/gemini.js";
import { isToolSchemaValidationError } from "../../open-sse/services/accountFallback.js";

const credentials = { projectId: "project-1", connectionId: "conn-1" };

function schemaWithDictionary() {
  return {
    type: "OBJECT",
    properties: {
      path: { type: "STRING" },
      options: {
        type: "OBJECT",
        additionalProperties: {
          type: "ARRAY",
          items: { type: "STRING" },
        },
      },
      metadata: {
        type: "object",
        properties: {
          enabled: { type: "boolean" },
        },
        required: ["enabled"],
      },
    },
    required: ["path"],
  };
}

function declaration(index) {
  return {
    name: `tool_${index}`,
    parameters: index === 38 || index === 39
      ? schemaWithDictionary()
      : { type: "object", properties: { value: { type: "string" } } },
  };
}

function declarations() {
  return Array.from({ length: 42 }, (_, index) => declaration(index));
}

describe("Cloud Code tool schema serialization", () => {
  it("uses parametersJsonSchema without mutating complex schemas", () => {
    const parameters = schemaWithDictionary();
    const original = structuredClone(parameters);
    const serialized = serializeCloudCodeFunctionDeclaration({ name: "complex", parameters });

    expect(serialized).not.toHaveProperty("parameters");
    expect(serialized.parametersJsonSchema).toEqual({
      type: "object",
      properties: {
        path: { type: "string" },
        options: {
          type: "object",
          additionalProperties: {
            type: "array",
            items: { type: "string" },
          },
        },
        metadata: {
          type: "object",
          properties: { enabled: { type: "boolean" } },
          required: ["enabled"],
        },
      },
      required: ["path"],
    });
    expect(parameters).toEqual(original);
    expect(serialized.parametersJsonSchema.properties.options).not.toHaveProperty("reason");
  });

  it("serializes Antigravity Gemini declarations through JSON Schema", () => {
    const inputDeclarations = declarations();
    const out = new AntigravityExecutor().transformRequest("gemini-3-flash-agent", {
      request: {
        contents: [{ role: "user", parts: [{ text: "hi" }] }],
        tools: [{ functionDeclarations: inputDeclarations }],
      },
    }, true, credentials);

    const outputDeclarations = out.request.tools[0].functionDeclarations;
    expect(outputDeclarations).toHaveLength(42);
    for (const fn of outputDeclarations) {
      expect(fn).toHaveProperty("parametersJsonSchema");
      expect(fn).not.toHaveProperty("parameters");
    }
    expect(outputDeclarations[38].parametersJsonSchema.properties.options.additionalProperties).toEqual({
      type: "array", items: { type: "string" },
    });
    expect(outputDeclarations[39].parametersJsonSchema.properties.options).not.toHaveProperty("reason");
    expect(inputDeclarations[38].parameters.type).toBe("OBJECT");
  });

  it("preserves Antigravity Claude custom tool schemas", () => {
    const out = new AntigravityExecutor().transformRequest("claude-sonnet-4-6", {
      request: {
        contents: [{ role: "user", parts: [{ text: "hi" }] }],
        tools: [{
          functionDeclarations: [{
            name: "apply_patch",
            description: "Apply a patch",
            parameters: { type: "object", properties: { input: { type: "string" } }, required: ["input"] },
            input_schema: { type: "object", properties: { input: { type: "string" } }, required: ["input"] },
          }],
        }],
      },
    }, true, credentials);

    expect(out.request.tools).toEqual([{
      functionDeclarations: [{
        name: "apply_patch",
        description: "Apply a patch",
        parameters: { type: "object", properties: { input: { type: "string" } }, required: ["input"] },
        input_schema: { type: "object", properties: { input: { type: "string" } }, required: ["input"] },
      }],
    }]);
    expect(out.request.toolConfig).toEqual({ functionCallingConfig: { mode: "VALIDATED" } });
  });

  it("does not classify unrelated or transient failures as schema errors", () => {
    expect(isToolSchemaValidationError(400, "request.tools[0].function_declarations[38].parameters.properties[3].value invalid"))
      .toBe(true);
    expect(isToolSchemaValidationError(400, "tools.0.custom.input_schema: Field required"))
      .toBe(true);
    expect(isToolSchemaValidationError(400, "Invalid request body")).toBe(false);
    expect(isToolSchemaValidationError(429, "function_declarations invalid")).toBe(false);
  });

  it("serializes wrapped Gemini CLI requests through JSON Schema", () => {
    const executor = new GeminiCLIExecutor();
    const out = executor.transformRequest("gemini-2.5-pro", {
      project: "project-1",
      model: "gemini-2.5-pro",
      request: {
        contents: [{ role: "user", parts: [{ text: "hi" }] }],
        tools: [{ functionDeclarations: [declaration(38)] }],
      },
    }, true, credentials);

    const fn = out.request.tools[0].functionDeclarations[0];
    expect(fn).toHaveProperty("parametersJsonSchema");
    expect(fn).not.toHaveProperty("parameters");
    expect(fn.parametersJsonSchema.properties.options.additionalProperties).toEqual({
      type: "array", items: { type: "string" },
    });
  });
});
