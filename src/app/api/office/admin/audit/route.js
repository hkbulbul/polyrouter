import { listOfficeAuditLog } from "@/lib/db/index.js";
import { ok, fail } from "@/lib/office/http.js";

export const dynamic = "force-dynamic";

// GET /api/office/admin/audit?limit=200
export async function GET(request) {
  try {
    const limit = new URL(request.url).searchParams.get("limit") || 200;
    return ok({ entries: await listOfficeAuditLog({ limit }) });
  } catch (error) {
    return fail(500, error.message);
  }
}
