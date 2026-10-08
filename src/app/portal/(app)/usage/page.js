"use client";

import { useEffect, useState } from "react";
import { Card, SegmentedControl } from "@/shared/components";
import UsageTrendChart from "@/shared/components/office/UsageTrendChart";
import { officeApi, fmtUsd, fmtTokens, fmtNumber, PERIOD_OPTIONS } from "@/shared/components/office/officeClient";
import StatTile from "../../_components/StatTile";

export default function PortalUsagePage() {
  const [period, setPeriod] = useState("30d");
  // Tagged with its period so switching shows "Loading…" without a reset in the effect.
  const [result, setResult] = useState({ period: null, data: null, error: "" });

  useEffect(() => {
    let active = true;
    officeApi(`/api/office/me/usage?period=${period}`)
      .then((data) => active && setResult({ period, data, error: "" }))
      .catch((e) => active && setResult({ period, data: null, error: e.message }));
    return () => {
      active = false;
    };
  }, [period]);

  const { data, error } = result.period === period ? result : { data: null, error: "" };

  return (
    <div className="flex flex-col gap-6">
      <SegmentedControl size="sm" options={PERIOD_OPTIONS} value={period} onChange={setPeriod} className="self-start max-w-full" />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!data && !error && <p className="text-sm text-text-muted">Loading…</p>}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="Spend" icon="payments" value={fmtUsd(data.totals.cost)} />
            <StatTile label="Tokens" icon="token" value={fmtTokens(data.totals.tokens)} hint={`${fmtTokens(data.totals.promptTokens)} in · ${fmtTokens(data.totals.completionTokens)} out`} />
            <StatTile label="Requests" icon="swap_vert" value={fmtNumber(data.totals.requests)} />
            <StatTile label="Models used" icon="model_training" value={fmtNumber(data.byModel.length)} />
          </div>

          <Card title="Daily trend" icon="monitoring">
            <UsageTrendChart data={data.daily} />
          </Card>

          <Card padding="none">
            <div className="border-b border-border px-5 py-4">
              <p className="eyebrow">By model</p>
            </div>
            {data.byModel.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-text-muted">No usage in this period yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="eyebrow px-5 py-3 font-medium">Model</th>
                      <th className="eyebrow px-5 py-3 text-right font-medium">Requests</th>
                      <th className="eyebrow px-5 py-3 text-right font-medium">Tokens</th>
                      <th className="eyebrow px-5 py-3 text-right font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byModel.map((m) => (
                      <tr key={`${m.model}|${m.provider}`} className="border-b border-border-subtle last:border-0">
                        <td className="px-5 py-3">
                          <p className="break-all font-mono text-xs text-text-main">{m.model}</p>
                          <p className="text-xs text-text-muted">{m.provider}</p>
                        </td>
                        <td className="px-5 py-3 text-right font-mono">{fmtNumber(m.requests)}</td>
                        <td className="px-5 py-3 text-right font-mono">{fmtTokens(m.tokens)}</td>
                        <td className="px-5 py-3 text-right font-mono">{fmtUsd(m.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <p className="text-xs text-text-muted">Costs are estimates from your office&apos;s model pricing.</p>
        </>
      )}
    </div>
  );
}
