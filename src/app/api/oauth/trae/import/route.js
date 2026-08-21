import { NextResponse } from "next/server";
import { createProviderConnection } from "@/models";

export async function POST(request) {
  try {
    const { accessToken, webId, bizUserId, userUniqueId, scope, tenant, region } = await request.json();
    if (!accessToken || typeof accessToken !== "string" || !accessToken.trim()) {
      return NextResponse.json({ error: "Access token is required" }, { status: 400 });
    }
    const token = accessToken.trim();
    if (token.length < 20) return NextResponse.json({ error: "Invalid token format" }, { status: 400 });
    const connection = await createProviderConnection({
      provider: "trae",
      authType: "oauth",
      accessToken: token,
      refreshToken: null,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      providerSpecificData: {
        webId: (webId || "").trim(),
        bizUserId: (bizUserId || "").trim(),
        userUniqueId: (userUniqueId || "").trim(),
        scope: scope || "marscode-us",
        tenant: tenant || "marscode",
        region: region || "US-East",
        aiRegion: region || "US-East",
        appLanguage: "en",
        appVersion: "1.0.0.1229",
        userRegion: "US",
        userIdentity: "Free",
        authMethod: "imported",
      },
      testStatus: "active",
    });
    return NextResponse.json({ success: true, connection: { id: connection.id, provider: connection.provider } });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Import failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    provider: "trae",
    method: "import_token",
    instructions: "Sign in to solo.trae.ai, open DevTools Network, copy the JWT from Authorization: Cloud-IDE-JWT <token> header on any POST to core-normal.trae.ai, paste as accessToken (~14-day lifetime). Optionally provide webId/bizUserId/userUniqueId from common_params.",
    requiredFields: [
      { name: "accessToken", label: "Access Token (Cloud-IDE-JWT)", description: "JWT from Authorization header on solo.trae.ai", type: "textarea", required: true },
      { name: "webId", label: "Web ID", description: "common_params.web_id", type: "text" },
      { name: "bizUserId", label: "Biz User ID", description: "common_params.biz_user_id", type: "text" },
      { name: "userUniqueId", label: "User Unique ID", description: "common_params.user_unique_id", type: "text" },
      { name: "scope", label: "Scope", description: "default: marscode-us", type: "text" },
      { name: "tenant", label: "Tenant", description: "default: marscode", type: "text" },
      { name: "region", label: "Region", description: "default: US-East", type: "text" },
    ],
  });
}
