"use client";

import PropTypes from "prop-types";
import Link from "next/link";

const fmt = (n) => new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(Number(n) || 0);

// Models used without a price are counted as $0 — say so instead of looking free.
export default function UnpricedNotice({ models }) {
  if (!models?.length) return null;
  const requests = models.reduce((sum, m) => sum + (m.requests || 0), 0);
  const tokens = models.reduce((sum, m) => sum + (m.tokens || 0), 0);
  const shown = models.slice(0, 4);

  return (
    <div className="flex flex-col gap-3 border border-amber-500/30 bg-amber-500/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="material-symbols-outlined text-[20px] text-amber-500">price_change</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-main">
            {fmt(requests)} request{requests === 1 ? "" : "s"} ({fmt(tokens)} tokens) used models without a price, so they count as $0 in this estimate.
          </p>
          <p className="mt-1 truncate text-xs text-text-muted">
            {shown.map((m) => `${m.model}${m.providerName || m.provider ? ` (${m.providerName || m.provider})` : ""}`).join(", ")}
            {models.length > shown.length ? ` and ${models.length - shown.length} more` : ""}
          </p>
        </div>
      </div>
      <Link
        href="/dashboard/pricing"
        className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 border border-amber-500/40 px-3 text-xs font-semibold text-text-main transition-colors hover:bg-amber-500/10"
      >
        <span className="material-symbols-outlined text-[16px]">sell</span>
        Set prices
      </Link>
    </div>
  );
}

UnpricedNotice.propTypes = {
  models: PropTypes.arrayOf(
    PropTypes.shape({ model: PropTypes.string, provider: PropTypes.string, providerName: PropTypes.string, requests: PropTypes.number, tokens: PropTypes.number })
  ),
};
