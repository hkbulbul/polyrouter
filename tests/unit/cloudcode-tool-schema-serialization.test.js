import { describe, expect, it } from "vitest";
import { AntigravityExecutor } from "../../open-sse/executors/antigravity.js";
import { GeminiCLIExecutor } from "../../open-sse/executors/gemini-cli.js";
import {
  serializeCloudCodeClaudeFunctionDeclaration,
  serializeCloudCodeFunctionDeclaration,
} from "../../open-sse/translator/formats/gemini.js";
import {
  isToolSchemaValidationError,
  isAccountValidationRequiredError,
} from "../../open-sse/services/accountFallback.js";

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

  it("maps Anthropic input_schema to parametersJsonSchema", () => {
    const serialized = serializeCloudCodeFunctionDeclaration({
      name: "configure",
      input_schema: schemaWithDictionary(),
    });

    expect(serialized).not.toHaveProperty("input_schema");
    expect(serialized).not.toHaveProperty("parameters");
    expect(serialized.parametersJsonSchema.properties.options.additionalProperties).toEqual({
      type: "array", items: { type: "string" },
    });
  });

  it("maps Anthropic input_schema to protobuf parameters for Claude", () => {
    const serialized = serializeCloudCodeClaudeFunctionDeclaration({
      name: "configure",
      input_schema: schemaWithDictionary(),
    });

    expect(serialized).not.toHaveProperty("input_schema");
    expect(serialized).not.toHaveProperty("parametersJsonSchema");
    expect(serialized.parameters.type).toBe("object");
    expect(serialized.parameters.properties.path.type).toBe("string");
    expect(serialized.parameters.properties.options).toEqual({
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Brief explanation of why you are calling this tool",
        },
      },
      required: ["reason"],
    });
  });

  it("fills schemas that become empty after unsupported fields are removed", () => {
    const serialized = serializeCloudCodeClaudeFunctionDeclaration({
      name: "shorthand",
      input_schema: {
        type: "object",
        properties: {
          first: { type: "string" },
          second: { type: "number" },
          third: { type: "boolean" },
          value: {},
        },
      },
    });

    expect(serialized.parameters.properties.value).toEqual({
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Brief explanation of why you are calling this tool",
        },
      },
      required: ["reason"],
    });
  });

  it("does not treat a properties map as a schema", () => {
    const serialized = serializeCloudCodeClaudeFunctionDeclaration({
      name: "nested_properties",
      input_schema: {
        type: "object",
        properties: {
          config: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              properties: {
                type: "object",
                properties: { enabled: { type: "boolean" } },
              },
            },
          },
        },
      },
    });

    const propertyMap = serialized.parameters.properties.config.properties;
    expect(propertyMap).not.toHaveProperty("type");
    expect(propertyMap.properties).toEqual({
      type: "object",
      properties: { enabled: { type: "boolean" } },
    });
  });

  it("preserves property names that also happen to be schema keywords", () => {
    const serialized = serializeCloudCodeClaudeFunctionDeclaration({
      name: "reserved_names",
      input_schema: {
        type: "object",
        properties: {
          const: { type: "string", description: "Literal argument name" },
          additionalProperties: { type: "string", description: "Literal argument name" },
          type: { type: "string" },
          properties: { type: "string" },
        },
        required: ["const", "additionalProperties", "type", "properties"],
      },
    });

    expect(serialized.parameters.properties).toEqual({
      const: { type: "string", description: "Literal argument name" },
      additionalProperties: { type: "string", description: "Literal argument name" },
      type: { type: "string" },
      properties: { type: "string" },
    });
    expect(serialized.parameters.required).toEqual([
      "const", "additionalProperties", "type", "properties",
    ]);
  });

  it("normalizes a root properties map before adding empty-object placeholders", () => {
    const serialized = serializeCloudCodeClaudeFunctionDeclaration({
      name: "missing_root_type",
      input_schema: { properties: {} },
    });

    expect(serialized.parameters).toEqual({
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Brief explanation of why you are calling this tool",
        },
      },
      required: ["reason"],
    });
  });

  it("serializes Antigravity Gemini declarations through JSON Schema", async () => {
    const inputDeclarations = declarations();
    const out = await new AntigravityExecutor().transformRequest("gemini-3-flash-agent", {
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

  it("coerces bare property schemas before Gemini Cloud Code egress", async () => {
    const out = await new AntigravityExecutor().transformRequest("gemini-pro-agent", {
      request: {
        contents: [{ role: "user", parts: [{ text: "hi" }] }],
        tools: [{
          functionDeclarations: [{
            name: "configure",
            parameters: {
              type: "object",
              properties: {
                path: { type: "string" },
                mode: { type: "string" },
                enabled: { type: "boolean" },
                config: "object",
              },
            },
          }],
        }],
      },
    }, true, credentials);

    expect(out.request.tools[0].functionDeclarations[0]
      .parametersJsonSchema.properties.config).toEqual({ type: "object" });
  });

  it("preserves an argument named optional on Gemini Cloud Code egress", async () => {
    const out = await new AntigravityExecutor().transformRequest("gemini-pro-agent", {
      request: {
        contents: [{ role: "user", parts: [{ text: "hi" }] }],
        tools: [{
          functionDeclarations: [{
            name: "configure",
            parameters: {
              type: "object",
              properties: {
                optional: { type: "string", optional: true },
              },
              required: ["optional"],
            },
          }],
        }],
      },
    }, true, credentials);

    expect(out.request.tools[0].functionDeclarations[0].parametersJsonSchema).toEqual({
      type: "object",
      properties: { optional: { type: "string" } },
      required: ["optional"],
    });
  });

  it("serializes Antigravity Claude custom tool schemas through protobuf Schema", async () => {
    const out = await new AntigravityExecutor().transformRequest("claude-sonnet-4-6", {
      request: {
        contents: [{ role: "user", parts: [{ text: "hi" }] }],
        tools: [{
          functionDeclarations: [{
            name: "apply_patch",
            description: "Apply a patch",
            input_schema: schemaWithDictionary(),
          }],
        }],
      },
    }, true, credentials);

    expect(out.request.tools).toEqual([{
      functionDeclarations: [{
        name: "apply_patch",
        description: "Apply a patch",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string" },
            options: {
              type: "object",
              properties: {
                reason: {
                  type: "string",
                  description: "Brief explanation of why you are calling this tool",
                },
              },
              required: ["reason"],
            },
            metadata: {
              type: "object",
              properties: { enabled: { type: "boolean" } },
              required: ["enabled"],
            },
          },
          required: ["path"],
        },
      }],
    }]);
    const declaration = out.request.tools[0].functionDeclarations[0];
    expect(declaration).not.toHaveProperty("parametersJsonSchema");
    expect(declaration).not.toHaveProperty("input_schema");
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

  it("classifies Google account validation as action-required, not account health", () => {
    expect(isAccountValidationRequiredError(403, JSON.stringify({
      error: { message: "Verify your account to continue.", details: [{ reason: "VALIDATION_REQUIRED" }] },
    }))).toBe(true);
    expect(isAccountValidationRequiredError(403, "permission denied")).toBe(false);
    expect(isAccountValidationRequiredError(401, "VALIDATION_REQUIRED")).toBe(false);
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
