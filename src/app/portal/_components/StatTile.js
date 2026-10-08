"use client";

import PropTypes from "prop-types";
import { Card } from "@/shared/components";

// KPI tile: mono eyebrow label, large value, optional hint and icon.
export default function StatTile({ label, value, hint, icon }) {
  return (
    <Card padding="sm" className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <p className="eyebrow min-w-0 leading-snug">{label}</p>
        {icon && <span className="material-symbols-outlined shrink-0 text-[18px] text-text-muted">{icon}</span>}
      </div>
      <p className="font-mono text-2xl font-medium leading-none tracking-[-0.02em] text-text-main">{value}</p>
      {hint && <p className="text-xs leading-snug text-text-muted">{hint}</p>}
    </Card>
  );
}

StatTile.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.node, hint: PropTypes.node, icon: PropTypes.string };
