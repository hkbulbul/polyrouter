import { getEmbeddingBanners, sanitizeProviderId } from "@/lib/embeddingBanners.js";

export const dynamic = "force-dynamic";

const HDR = { "Cache-Control": "no-store" };

// GET /api/embedding-banners?provider_id=codex -> { providerId, banners: [...] }
// Display-only banner metadata, no secrets — allowlisted in dashboardGuard.js like /api/sponsors.
export async function GET(request) {
  const providerId = sanitizeProviderId(new URL(request.url).searchParams.get("provider_id"));
  const banners = providerId ? await getEmbeddingBanners(providerId) : [];
  return Response.json({ providerId, banners }, { headers: HDR });
}
