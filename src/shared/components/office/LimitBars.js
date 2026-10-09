"use client";

import PropTypes from "prop-types";
import { cn } from "@/shared/utils/cn";
import { fmtLimitValue } from "./officeClient";
import { describeRestrictions } from "@/lib/office/policy";

// Progress bars for each configured limit (from describeLimitStatus), followed by
// the policy's non-usage rules (allowed models, request types, per-request caps).
export default function LimitBars({ rows, limits, emptyText = "No usage limits apply." }) {
  const restrictions = describeRestrictions(limits);
  if (!rows?.length && !restrictions.length) return <p className="text-sm text-text-muted">{emptyText}</p>;
  return (
    <div className="flex flex-col gap-3">
      {(rows || []).map((row) => {
        const tone = row.percent >= 100 ? "bg-red-500" : row.percent >= 80 ? "bg-amber-500" : "bg-brand-500";
        return (
          <div key={row.key} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">{row.label}</span>
              <span className="font-mono text-text-main">
                {fmtLimitValue(row.unit, row.used)} / {fmtLimitValue(row.unit, row.limit)}
              </span>
            </div>
            <div
              className="h-2 bg-surface-2 overflow-hidden"
              role="progressbar"
              aria-label={row.label}
              aria-valuenow={row.percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className={cn("h-full transition-all", tone)} style={{ width: `${row.percent}%` }} />
            </div>
          </div>
        );
      })}
      {restrictions.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs text-text-muted list-disc pl-4">
          {restrictions.map((r) => <li key={r}>{r}</li>)}
        </ul>
      )}
    </div>
  );
}

LimitBars.propTypes = {
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      used: PropTypes.number,
      limit: PropTypes.number,
      unit: PropTypes.string,
      percent: PropTypes.number,
    })
  ),
  limits: PropTypes.object,
  emptyText: PropTypes.string,
};
