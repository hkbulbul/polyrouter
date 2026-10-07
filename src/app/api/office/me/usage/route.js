import { getOfficeUsageDaily, getOfficeUsageByModel, getOfficeUserUsageSince } from "@/lib/db/index.js";
import { ok, fail, requireOfficeSession, parsePeriod, periodStartIso } from "@/lib/office/http.js";

export const dynamic = "force-dynamic";

// GET /api/office/me/usage?period=… — your own usage trend and per-model breakdown.
export async function GET(request) {
  try {
    const session = await requireOfficeSession();
    if (session.response) return session.response;
    const period = parsePeriod(request, "30d");
    const since = periodStartIso(period);
    const userId = session.user.id;
    const [totals, daily, byModel] = await Promise.all([
      getOfficeUserUsageSince(userId, since),
      getOfficeUsageDaily(since, userId),
      getOfficeUsageByModel(since, userId),
    ]);
    return ok({
      period,
      totals,
      daily,
      byModel: byModel.map((r) => ({ ...r, tokens: r.promptTokens + r.completionTokens })),
    });
  } catch (error) {
    return fail(500, error.message);
  }
}
