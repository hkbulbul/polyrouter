"use client";

import PropTypes from "prop-types";
import Card from "@/shared/components/Card";
import Badge from "@/shared/components/Badge";

const fmt = (value) => {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  if (abs < 1_000) return new Intl.NumberFormat().format(n);

  const units = [
    { threshold: 1_000_000_000, suffix: "B" },
    { threshold: 1_000_000, suffix: "M" },
    { threshold: 1_000, suffix: "K" },
  ];
  const unit = units.find(({ threshold }) => abs >= threshold);
  const scaled = n / unit.threshold;
  const formatted = scaled.toFixed(scaled >= 100 ? 0 : 1).replace(/\.0$/, "");
  return `${formatted}${unit.suffix}`;
};

const fmtCost = (n) => `$${(n || 0).toFixed(2)}`;

export default function OverviewCards({ stats }) {
  const totalPrompt = stats.totalPromptTokens || 0;
  const totalCached = stats.totalCachedTokens || 0;
  const totalCompletion = stats.totalCompletionTokens || 0;
  const totalRequests = stats.totalRequests || 0;
  const totalCost = stats.totalCost || 0;

  // Cache hit / token saving percentage
  const cacheHitRate = totalPrompt > 0 ? ((totalCached / totalPrompt) * 100).toFixed(1) : "0.0";
  // Cost per 1k requests
  const costPer1k = totalRequests > 0 ? ((totalCost / totalRequests) * 1000).toFixed(2) : "0.00";

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 sm:gap-4">
      {/* 1. Total Requests */}
      <Card
        className="flex min-w-0 flex-col justify-between p-4 transition-all duration-200 hover:border-brand-500/30 hover:shadow-[var(--shadow-soft)]"
        padding="none"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Total Requests
          </span>
          <div className="flex size-8 shrink-0 items-center justify-center bg-surface-2 text-text-muted">
            <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-2">
          <span className="truncate text-2xl font-bold tracking-tight text-text-main tabular-nums">
            {fmt(totalRequests)}
          </span>
          {stats.activeRequests?.length > 0 && (
            <Badge variant="primary" size="sm" dot>
              {stats.activeRequests.length} active
            </Badge>
          )}
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-text-muted">
          <span className="truncate">Across all models &amp; keys</span>
        </div>
      </Card>

      {/* 2. Total Input Tokens */}
      <Card
        className="flex min-w-0 flex-col justify-between p-4 transition-all duration-200 hover:border-brand-500/30 hover:shadow-[var(--shadow-soft)]"
        padding="none"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Input Tokens
          </span>
          <div className="flex size-8 shrink-0 items-center justify-center bg-brand-500/10 text-brand-600 dark:text-brand-400">
            <span className="material-symbols-outlined text-[18px]">input</span>
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-2">
          <span className="truncate text-2xl font-bold tracking-tight text-brand-600 dark:text-brand-400 tabular-nums">
            {fmt(totalPrompt)}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-text-muted">
          <span>Prompt &amp; context load</span>
        </div>
      </Card>

      {/* 3. Cached Tokens */}
      <Card
        className="flex min-w-0 flex-col justify-between p-4 transition-all duration-200 hover:border-blue-500/30 hover:shadow-[var(--shadow-soft)]"
        padding="none"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Cached Tokens
          </span>
          <div className="flex size-8 shrink-0 items-center justify-center bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <span className="material-symbols-outlined text-[18px]">bolt</span>
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-2">
          <span className="truncate text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 tabular-nums">
            {fmt(totalCached)}
          </span>
          {Number(cacheHitRate) > 0 && (
            <Badge variant="info" size="sm">
              {cacheHitRate}% rate
            </Badge>
          )}
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-text-muted">
          <span>Prompt cache reused</span>
        </div>
      </Card>

      {/* 4. Output Tokens */}
      <Card
        className="flex min-w-0 flex-col justify-between p-4 transition-all duration-200 hover:border-emerald-500/30 hover:shadow-[var(--shadow-soft)]"
        padding="none"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Output Tokens
          </span>
          <div className="flex size-8 shrink-0 items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <span className="material-symbols-outlined text-[18px]">output</span>
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-2">
          <span className="truncate text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
            {fmt(totalCompletion)}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-text-muted">
          <span>Generated completions</span>
        </div>
      </Card>

      {/* 5. Est. Cost */}
      <Card
        className="flex min-w-0 flex-col justify-between p-4 transition-all duration-200 hover:border-amber-500/30 hover:shadow-[var(--shadow-soft)]"
        padding="none"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Est. Cost
          </span>
          <div className="flex size-8 shrink-0 items-center justify-center bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <span className="material-symbols-outlined text-[18px]">payments</span>
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-2">
          <span className="truncate text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
            ~{fmtCost(totalCost)}
          </span>
          <Badge variant="warning" size="sm">
            ${costPer1k}/1k req
          </Badge>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-text-muted">
          <span className="truncate">Est. benchmark rate</span>
        </div>
      </Card>
    </div>
  );
}

OverviewCards.propTypes = {
  stats: PropTypes.object.isRequired,
};
