export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const url = new URL(request.url);
  return Response.json({
    enabled: process.env.CHATGPT_WEB_MCP_ENABLED !== "0",
    connectorName: process.env.CHATGPT_WEB_MCP_CONNECTOR_NAME || "PolyRouter Native",
    transport: "streamable-http",
    endpoint: `${url.origin}/api/mcp/chatgpt-web`,
    requiresSecureTunnel: true,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
