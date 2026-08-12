import {
  bindChatGptWebTurn,
  invokeChatGptWebTurnTool,
  listChatGptWebTurnTools,
} from "open-sse/executors/chatgpt-web-broker.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "polyrouter-native", version: "1.0.0" };

const TOOLS = [
  {
    name: "polyrouter_bind_turn",
    title: "Bind this response to a PolyRouter turn",
    description:
      "Exchange the turn_token supplied in the task context for a binding_id. Call this before every other PolyRouter Native tool.",
    inputSchema: {
      type: "object",
      properties: {
        turn_token: { type: "string", description: "Exact turn_ token supplied in the current task context." },
      },
      required: ["turn_token"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "polyrouter_tool_inventory",
    title: "List tools from the active client",
    description:
      "List the exact tools advertised by the current Codex, Cline, or other client turn, including their JSON schemas.",
    inputSchema: {
      type: "object",
      properties: {
        binding_id: { type: "string" },
        query: { type: "string", default: "" },
        include_schema: { type: "boolean", default: true },
      },
      required: ["binding_id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "polyrouter_tool_call",
    title: "Call a tool from the active client",
    description:
      "Invoke an exact tool name returned by polyrouter_tool_inventory. The outer client performs the action with its normal sandbox and approval policy.",
    inputSchema: {
      type: "object",
      properties: {
        binding_id: { type: "string" },
        tool_name: { type: "string" },
        arguments: { type: "object", additionalProperties: true },
      },
      required: ["binding_id", "tool_name", "arguments"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
  },
];

function jsonRpcResult(id, result, status = 200) {
  return Response.json(
    { jsonrpc: "2.0", id, result },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "MCP-Protocol-Version": PROTOCOL_VERSION,
      },
    },
  );
}

function jsonRpcError(id, code, message, status = 400) {
  return Response.json(
    { jsonrpc: "2.0", id: id ?? null, error: { code, message } },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "MCP-Protocol-Version": PROTOCOL_VERSION,
      },
    },
  );
}

function mcpContent(value) {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
  };
}

function requireString(args, key) {
  const value = args?.[key];
  if (typeof value !== "string" || !value.trim()) throw new Error(`${key} is required`);
  return value.trim();
}

async function callTool(name, args) {
  if (name === "polyrouter_bind_turn") {
    const bound = bindChatGptWebTurn(requireString(args, "turn_token"));
    return mcpContent({
      binding_id: bound.bindingId,
      binding_status: "active",
      valid_until: bound.validUntil,
      tool_count: bound.toolCount,
      next_action: "Use this binding_id with polyrouter_tool_inventory and polyrouter_tool_call.",
    });
  }

  if (name === "polyrouter_tool_inventory") {
    const bindingId = requireString(args, "binding_id");
    const tools = listChatGptWebTurnTools(
      bindingId,
      typeof args?.query === "string" ? args.query : "",
      args?.include_schema !== false,
    );
    return mcpContent({ tools, count: tools.length });
  }

  if (name === "polyrouter_tool_call") {
    const bindingId = requireString(args, "binding_id");
    const toolName = requireString(args, "tool_name");
    const toolArgs = args?.arguments;
    if (!toolArgs || typeof toolArgs !== "object" || Array.isArray(toolArgs)) {
      throw new Error("arguments must be a JSON object");
    }
    return await invokeChatGptWebTurnTool(bindingId, toolName, toolArgs);
  }

  throw new Error(`Unknown MCP tool: ${name}`);
}

export async function POST(request) {
  let message;
  try {
    message = await request.json();
  } catch {
    return jsonRpcError(null, -32700, "Invalid JSON");
  }

  const id = message?.id;
  const method = message?.method;
  if (message?.jsonrpc !== "2.0" || typeof method !== "string") {
    return jsonRpcError(id, -32600, "Invalid JSON-RPC request");
  }

  try {
    if (method === "initialize") {
      return jsonRpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          "Bind the current turn before calling tools. Inventory the active client tools, then invoke the exact tool needed. Keep using tools until the requested task is complete and verified.",
      });
    }
    if (method === "notifications/initialized" || method === "notifications/cancelled") {
      return new Response(null, { status: 202, headers: { "Cache-Control": "no-store" } });
    }
    if (method === "ping") return jsonRpcResult(id, {});
    if (method === "tools/list") return jsonRpcResult(id, { tools: TOOLS });
    if (method === "tools/call") {
      const name = requireString(message.params, "name");
      const result = await callTool(name, message.params?.arguments || {});
      return jsonRpcResult(id, result);
    }
    return jsonRpcError(id, -32601, `Method not found: ${method}`, 404);
  } catch (error) {
    return jsonRpcResult(id, {
      content: [{ type: "text", text: error.message || String(error) }],
      isError: true,
    });
  }
}

export async function GET() {
  return new Response("PolyRouter Native MCP uses Streamable HTTP POST requests.", {
    status: 405,
    headers: { Allow: "POST, OPTIONS", "Cache-Control": "no-store" },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id",
    },
  });
}
