"use client";

import { useState } from "react";
import PropTypes from "prop-types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import SegmentedControl from "@/shared/components/SegmentedControl";
import { fmtTokens, fmtUsd, fmtNumber } from "./officeClient";

const METRICS = {
  cost: { label: "Cost", color: "#f59e0b", format: (v) => fmtUsd(v) },
  tokens: { label: "Tokens", color: "var(--color-brand-500, #16a34a)", format: fmtTokens },
  requests: { label: "Requests", color: "#3b82f6", format: fmtNumber },
};

// Daily bar chart over rows of { day, requests, tokens, cost }.
export default function UsageTrendChart({ data, height = 220 }) {
  const [metric, setMetric] = useState("cost");
  const m = METRICS[metric];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <SegmentedControl
          size="sm"
          value={metric}
          onChange={setMetric}
          options={Object.entries(METRICS).map(([value, def]) => ({ value, label: def.label }))}
        />
      </div>
      {data?.length ? (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border, #e5e7eb)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={56} tickFormatter={m.format} />
              <Tooltip
                cursor={{ fill: "rgba(127,127,127,0.08)" }}
                formatter={(value) => [m.format(value), m.label]}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey={metric} fill={m.color} radius={[2, 2, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center justify-center text-sm text-text-muted border border-dashed border-border" style={{ height }}>
          No usage in this period yet.
        </div>
      )}
    </div>
  );
}

UsageTrendChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object),
  height: PropTypes.number,
};
