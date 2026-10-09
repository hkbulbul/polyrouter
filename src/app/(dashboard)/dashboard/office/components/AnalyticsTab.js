"use client";

import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Link from "next/link";
import { Card, Button, SegmentedControl } from "@/shared/components";
import UsageTrendChart from "@/shared/components/office/UsageTrendChart";
import { officeApi, fmtUsd, fmtTokens, fmtNumber, fmtRelative, downloadCsv, PERIOD_OPTIONS } from "@/shared/components/office/officeClient";

const RANK_STYLE = ["text-amber-500", "text-slate-400", "text-orange-700"];

function Kpi({ label, value }) {
  return (
    <Card padding="sm">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-xl font-semibold font-mono mt-1">{value}</p>
    </Card>
  );
}

Kpi.propTypes = { label: PropTypes.string, value: PropTypes.node };

function ShareBar({ value, max }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 bg-surface-2 w-24 hidden md:block" aria-hidden="true">
      <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

ShareBar.propTypes = { value: PropTypes.number, max: PropTypes.number };

export default function AnalyticsTab() {
  const [period, setPeriod] = useState("30d");
  // Tagged with the period it belongs to, so switching periods shows "Loading…" without resetting state in the effect.
  const [result, setResult] = useState({ period: null, data: null, error: "" });
  const [sortBy, setSortBy] = useState("cost");

  useEffect(() => {
    let active = true;
    officeApi(`/api/office/admin/analytics?period=${period}`)
      .then((data) => active && setResult({ period, data, error: "" }))
      .catch((e) => active && setResult({ period, data: null, error: e.message }));
    return () => {
      active = false;
    };
  }, [period]);

  const current = result.period === period ? result : { data: null, error: "" };
  const { data, error } = current;

  const leaderboard = data ? [...data.leaderboard].sort((a, b) => b[sortBy] - a[sortBy]) : [];
  const maxMetric = leaderboard.length ? leaderboard[0][sortBy] : 0;

  const exportCsv = () => {
    downloadCsv(
      `office-leaderboard-${period}.csv`,
      leaderboard.map((r, i) => ({
        rank: i + 1,
        email: r.email,
        name: r.name,
        team: r.teamName || "",
        requests: r.requests,
        input_tokens: r.promptTokens,
        output_tokens: r.completionTokens,
        cost_usd: r.cost.toFixed(6),
        models_used: r.models,
        last_used: r.lastUsedAt || "",
      }))
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SegmentedControl size="sm" options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
        <Button size="sm" variant="secondary" icon="download" onClick={exportCsv} disabled={!leaderboard.length}>Export CSV</Button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!data && !error && <p className="text-sm text-text-muted">Loading…</p>}
      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi label="Total spend" value={fmtUsd(data.summary.cost)} />
            <Kpi label="Tokens" value={fmtTokens(data.summary.tokens)} />
            <Kpi label="Requests" value={fmtNumber(data.summary.requests)} />
            <Kpi label="Avg spend / active employee" value={fmtUsd(data.summary.avgCostPerActiveUser)} />
          </div>

          {data.summary.unpricedRequests > 0 && (
            <div className="flex flex-col gap-3 border border-amber-500/30 bg-amber-500/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[20px] text-amber-500">price_change</span>
                <p className="text-sm text-text-main">
                  {fmtNumber(data.summary.unpricedRequests)} employee request{data.summary.unpricedRequests === 1 ? "" : "s"} ({fmtTokens(data.summary.unpricedTokens)} tokens) used models
                  without a price. They count as $0 here and don&apos;t use up anyone&apos;s dollar budget.
                </p>
              </div>
              <Link href="/dashboard/pricing" className="shrink-0">
                <Button size="sm" variant="secondary" icon="sell">Set prices</Button>
              </Link>
            </div>
          )}

          <Card title="Daily trend" icon="monitoring">
            <UsageTrendChart data={data.daily} />
          </Card>

          <Card padding="none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">emoji_events</span>
                <h3 className="font-semibold">Leaderboard</h3>
              </div>
              <SegmentedControl
                size="sm"
                value={sortBy}
                onChange={setSortBy}
                options={[
                  { value: "cost", label: "Cost" },
                  { value: "tokens", label: "Tokens" },
                  { value: "requests", label: "Requests" },
                ]}
              />
            </div>
            {leaderboard.length === 0 ? (
              <p className="p-6 text-sm text-text-muted text-center">No employee usage in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-text-muted border-b border-border">
                      <th className="px-4 py-2 font-medium w-12">#</th>
                      <th className="px-4 py-2 font-medium">Employee</th>
                      <th className="px-4 py-2 font-medium">Team</th>
                      <th className="px-4 py-2 font-medium text-right">Requests</th>
                      <th className="px-4 py-2 font-medium text-right">Tokens</th>
                      <th className="px-4 py-2 font-medium text-right">Cost</th>
                      <th className="px-4 py-2 font-medium" />
                      <th className="px-4 py-2 font-medium">Last used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((r, i) => (
                      <tr key={r.userId} className="border-b border-border/60">
                        <td className={`px-4 py-2 font-semibold ${RANK_STYLE[i] || "text-text-muted"}`}>{i + 1}</td>
                        <td className="px-4 py-2">
                          <p className="font-medium">{r.name || r.email}</p>
                          {r.name && <p className="text-xs text-text-muted">{r.email}</p>}
                        </td>
                        <td className="px-4 py-2 text-text-muted">{r.teamName || "—"}</td>
                        <td className="px-4 py-2 text-right font-mono">{fmtNumber(r.requests)}</td>
                        <td className="px-4 py-2 text-right font-mono">{fmtTokens(r.tokens)}</td>
                        <td className="px-4 py-2 text-right font-mono">
                          <p>{fmtUsd(r.cost)}</p>
                          {r.unpricedRequests > 0 && (
                            <p className="text-xs text-amber-600 dark:text-amber-400" title="Requests on models without a price">
                              + {fmtNumber(r.unpricedRequests)} unpriced
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-2"><ShareBar value={r[sortBy]} max={maxMetric} /></td>
                        <td className="px-4 py-2 text-text-muted">{fmtRelative(r.lastUsedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card title="Cost by team" icon="groups" padding="sm">
              {data.byTeam.length === 0 ? (
                <p className="text-sm text-text-muted">No data.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {data.byTeam.map((t) => (
                      <tr key={t.teamId || "none"} className="border-b border-border/60 last:border-0">
                        <td className="py-2">
                          <p className="font-medium">{t.teamName}</p>
                          <p className="text-xs text-text-muted">{t.members} active · {fmtNumber(t.requests)} req</p>
                        </td>
                        <td className="py-2 text-right font-mono">
                          <p>{fmtUsd(t.cost)}</p>
                          <p className="text-xs text-text-muted">{fmtTokens(t.tokens)} tok</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
            <Card title="Cost by model" icon="model_training" padding="sm">
              {data.byModel.length === 0 ? (
                <p className="text-sm text-text-muted">No data.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {data.byModel.slice(0, 15).map((m) => (
                      <tr key={`${m.model}|${m.provider}`} className="border-b border-border/60 last:border-0">
                        <td className="py-2 min-w-0">
                          <p className="font-medium font-mono text-xs break-all">{m.model}</p>
                          <p className="text-xs text-text-muted">
                            {m.provider} · {fmtNumber(m.requests)} req
                            {m.unpricedRequests > 0 && <span className="text-amber-600 dark:text-amber-400"> · no price</span>}
                          </p>
                        </td>
                        <td className="py-2 text-right font-mono">
                          <p>{fmtUsd(m.cost)}</p>
                          <p className="text-xs text-text-muted">{fmtTokens(m.tokens)} tok</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
          <p className="text-xs text-text-muted">
            Costs are estimates from PolyRouter&apos;s model pricing table. Only traffic made with employee keys is counted here.
          </p>
        </>
      )}
    </div>
  );
}
