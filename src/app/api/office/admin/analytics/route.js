import { listOfficeUsers, listOfficeTeams, getOfficeUsageByUser, getOfficeUsageByModel, getOfficeUsageDaily, ensureUsageCostBackfill } from "@/lib/db/index.js";
import { ok, fail, parsePeriod, periodStartIso } from "@/lib/office/http.js";

export const dynamic = "force-dynamic";

// GET /api/office/admin/analytics?period=today|7d|30d|month|90d|all
// Leaderboard, per-team and per-model cost, and a daily trend — employee traffic only.
export async function GET(request) {
  try {
    const period = parsePeriod(request, "30d");
    const since = periodStartIso(period);
    await ensureUsageCostBackfill();
    const [users, teams, byUserRows, byModelRows, dailyRows] = await Promise.all([
      listOfficeUsers(), listOfficeTeams(), getOfficeUsageByUser(since), getOfficeUsageByModel(since), getOfficeUsageDaily(since),
    ]);
    const userById = new Map(users.map((u) => [u.id, u]));
    const teamById = new Map(teams.map((t) => [t.id, t]));

    const leaderboard = byUserRows
      .map((r) => {
        const user = userById.get(r.userId);
        const team = user?.teamId ? teamById.get(user.teamId) : null;
        return {
          userId: r.userId,
          email: user?.email || "(deleted employee)",
          name: user?.name || "",
          teamId: team?.id || null,
          teamName: team?.name || null,
          requests: r.requests,
          promptTokens: r.promptTokens,
          completionTokens: r.completionTokens,
          tokens: r.promptTokens + r.completionTokens,
          cost: r.cost,
          unpricedRequests: r.unpricedRequests || 0,
          unpricedTokens: r.unpricedTokens || 0,
          models: r.models,
          lastUsedAt: r.lastUsedAt,
        };
      })
      .sort((a, b) => b.cost - a.cost || b.tokens - a.tokens || b.requests - a.requests);

    const teamTotals = new Map();
    for (const row of leaderboard) {
      const key = row.teamId || "__none__";
      const t = teamTotals.get(key) || { teamId: row.teamId, teamName: row.teamName || "No team", members: 0, requests: 0, tokens: 0, cost: 0 };
      t.members += 1;
      t.requests += row.requests;
      t.tokens += row.tokens;
      t.cost += row.cost;
      teamTotals.set(key, t);
    }
    const byTeam = [...teamTotals.values()].sort((a, b) => b.cost - a.cost || b.tokens - a.tokens);

    const summary = leaderboard.reduce(
      (acc, r) => ({
        requests: acc.requests + r.requests,
        tokens: acc.tokens + r.tokens,
        cost: acc.cost + r.cost,
        activeUsers: acc.activeUsers + 1,
        unpricedRequests: acc.unpricedRequests + r.unpricedRequests,
        unpricedTokens: acc.unpricedTokens + r.unpricedTokens,
      }),
      { requests: 0, tokens: 0, cost: 0, activeUsers: 0, unpricedRequests: 0, unpricedTokens: 0 }
    );
    summary.totalUsers = users.length;
    summary.avgCostPerActiveUser = summary.activeUsers ? summary.cost / summary.activeUsers : 0;

    return ok({
      period,
      since,
      summary,
      leaderboard,
      byTeam,
      byModel: byModelRows.map((r) => ({ ...r, tokens: r.promptTokens + r.completionTokens })),
      daily: dailyRows,
    });
  } catch (error) {
    return fail(500, error.message);
  }
}
