"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Card from "@/shared/components/Card";
import SegmentedControl from "@/shared/components/SegmentedControl";

const fmtTokens = (n) => {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat().format(num);
};

const fmtCost = (n) => `$${(Number(n) || 0).toFixed(4)}`;

function CustomTooltip({ active, payload, label, viewMode }) {
  if (!active || !payload || !payload.length) return null;
  const val = payload[0].value;
  const isTokens = viewMode === "tokens";

  return (
    <div className="border border-border bg-surface/95 p-3 shadow-xl shadow-black/5 backdrop-blur-md">
      <div className="text-xs font-semibold text-text-muted mb-1.5">{label}</div>
      <div className="flex items-center gap-2">
        <span
          className="size-2"
          style={{ backgroundColor: isTokens ? "var(--color-brand-500, #16a34a)" : "#f59e0b" }}
        />
        <span className="text-xs text-text-muted">{isTokens ? "Total Tokens:" : "Est. Cost:"}</span>
        <span className="font-mono text-xs font-bold text-text-main">
          {isTokens ? fmtTokens(val) : fmtCost(val)}
        </span>
      </div>
    </div>
  );
}

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  label: PropTypes.string,
  viewMode: PropTypes.string,
};

export default function UsageChart({ period = "7d" }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("tokens");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch(`/api/usage/chart?period=${period}`);
        if (res.ok && active) {
          const json = await res.json();
          setData(Array.isArray(json) ? json : []);
        }
      } catch (e) {
        console.error("Failed to fetch chart data:", e);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [period]);

  const hasData = data.some((d) => (d.tokens || 0) > 0 || (d.cost || 0) > 0);

  // Summary stats over data points
  const summary = useMemo(() => {
    if (!data.length) return { total: 0, peak: 0, avg: 0 };
    const values = data.map((d) => (viewMode === "tokens" ? d.tokens || 0 : d.cost || 0));
    const total = values.reduce((sum, v) => sum + v, 0);
    const peak = Math.max(...values, 0);
    const avg = values.length ? total / values.length : 0;
    return { total, peak, avg };
  }, [data, viewMode]);

  return (
    <Card className="flex min-w-0 flex-col gap-4 p-4 sm:p-5">
      {/* Chart Header & Mode Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-brand-600 dark:text-brand-400">
              trending_up
            </span>
            <h3 className="text-base font-semibold tracking-tight text-text-main">
              Usage &amp; Consumption Trends
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-text-muted">
            Track token burn rate and cost progression over time
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasData && (
            <div className="hidden md:flex items-center gap-4 text-xs pr-2 border-r border-border">
              <div>
                <span className="text-text-muted">Period Total: </span>
                <span className="font-mono font-semibold text-text-main">
                  {viewMode === "tokens" ? fmtTokens(summary.total) : fmtCost(summary.total)}
                </span>
              </div>
              <div>
                <span className="text-text-muted">Peak: </span>
                <span className="font-mono font-semibold text-text-main">
                  {viewMode === "tokens" ? fmtTokens(summary.peak) : fmtCost(summary.peak)}
                </span>
              </div>
            </div>
          )}
          <SegmentedControl
            options={[
              { value: "tokens", label: "Tokens", icon: "data_usage" },
              { value: "cost", label: "Cost", icon: "attach_money" },
            ]}
            value={viewMode}
            onChange={setViewMode}
            size="sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="h-56 flex flex-col items-center justify-center gap-2 text-text-muted text-sm">
          <span className="material-symbols-outlined animate-spin text-[28px] text-brand-500">
            progress_activity
          </span>
          <span>Loading usage trend...</span>
        </div>
      ) : !hasData ? (
        <div className="h-56 flex flex-col items-center justify-center gap-2 text-center text-text-muted py-8">
          <div className="flex size-12 items-center justify-center bg-surface-2 text-text-muted">
            <span className="material-symbols-outlined text-[24px]">query_stats</span>
          </div>
          <span className="text-sm font-medium text-text-main mt-1">No usage recorded in this period</span>
          <span className="text-xs text-text-muted max-w-sm">
            Requests routed through the /v1 API endpoint will stream here automatically.
          </span>
        </div>
      ) : (
        <div className="w-full pt-1">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
              <defs>
                {/* Brand Green Gradient for Tokens */}
                <linearGradient id="gradBrandTokens" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0.0} />
                </linearGradient>
                {/* Warm Amber Gradient for Cost */}
                <linearGradient id="gradBrandCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="currentColor"
                className="text-border/60"
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "currentColor", fillOpacity: 0.5 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                dy={6}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "currentColor", fillOpacity: 0.5 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={viewMode === "tokens" ? fmtTokens : fmtCost}
                width={56}
              />
              <Tooltip
                content={<CustomTooltip viewMode={viewMode} />}
                cursor={{
                  stroke: "var(--color-border)",
                  strokeWidth: 1.5,
                  strokeDasharray: "3 3",
                }}
              />
              {viewMode === "tokens" ? (
                <Area
                  type="monotone"
                  dataKey="tokens"
                  stroke="#16a34a"
                  strokeWidth={2.2}
                  fill="url(#gradBrandTokens)"
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: "#16a34a",
                    stroke: "var(--color-surface, #ffffff)",
                    strokeWidth: 2,
                  }}
                />
              ) : (
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="#f59e0b"
                  strokeWidth={2.2}
                  fill="url(#gradBrandCost)"
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: "#f59e0b",
                    stroke: "var(--color-surface, #ffffff)",
                    strokeWidth: 2,
                  }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

UsageChart.propTypes = {
  period: PropTypes.string,
};
