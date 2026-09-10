"use client";

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import PropTypes from "prop-types";
import Card from "@/shared/components/Card";

const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const fmtCost = (n) => `$${(Number(n) || 0).toFixed(2)}`;

export function fmtTime(iso) {
  if (!iso) return "Never";
  const diffMins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export { fmt, fmtCost };

function SortIcon({ field, currentSort, currentOrder }) {
  if (currentSort !== field) {
    return (
      <span className="material-symbols-outlined ml-1 inline text-[13px] opacity-30 align-middle">
        unfold_more
      </span>
    );
  }
  return (
    <span className="material-symbols-outlined ml-1 inline text-[13px] text-brand-600 dark:text-brand-400 align-middle">
      {currentOrder === "asc" ? "arrow_upward" : "arrow_downward"}
    </span>
  );
}

SortIcon.propTypes = {
  field: PropTypes.string.isRequired,
  currentSort: PropTypes.string.isRequired,
  currentOrder: PropTypes.string.isRequired,
};

/**
 * Render token or cost cells based on viewMode
 */
function ValueCells({ item, viewMode, isSummary = false }) {
  if (viewMode === "tokens") {
    return (
      <>
        <td className="px-4 py-3 text-right font-mono text-text-muted">
          {isSummary && item.promptTokens === undefined ? "—" : fmt(item.promptTokens)}
        </td>
        <td className="px-4 py-3 text-right font-mono text-blue-600 dark:text-blue-400">
          {item.cachedTokens ? fmt(item.cachedTokens) : "—"}
        </td>
        <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
          {isSummary && item.completionTokens === undefined ? "—" : fmt(item.completionTokens)}
        </td>
        <td className="px-4 py-3 text-right font-mono font-bold text-text-main">
          {fmt(item.totalTokens)}
        </td>
      </>
    );
  }
  return (
    <>
      <td className="px-4 py-3 text-right font-mono text-text-muted">
        {isSummary && item.inputCost === undefined ? "—" : fmtCost(item.inputCost)}
      </td>
      <td className="px-4 py-3 text-right font-mono text-blue-600 dark:text-blue-400">
        {item.cachedCost ? fmtCost(item.cachedCost) : "—"}
      </td>
      <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
        {isSummary && item.outputCost === undefined ? "—" : fmtCost(item.outputCost)}
      </td>
      <td className="px-4 py-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
        {fmtCost(item.totalCost || item.cost)}
      </td>
    </>
  );
}

ValueCells.propTypes = {
  item: PropTypes.object.isRequired,
  viewMode: PropTypes.string.isRequired,
  isSummary: PropTypes.bool,
};

/**
 * Reusable sortable usage breakdown table with search filter and expandable groups.
 */
export default function UsageTable({
  title,
  columns,
  groupedData,
  tableType,
  sortBy,
  sortOrder,
  onToggleSort,
  viewMode,
  storageKey,
  renderDetailCells,
  renderSummaryCells,
  emptyMessage,
}) {
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Save expanded state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...expanded]));
    } catch (e) {
      console.error(`Failed to save ${storageKey}:`, e);
    }
  }, [expanded, storageKey]);

  const toggleGroup = useCallback((groupKey) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(groupKey) ? next.delete(groupKey) : next.add(groupKey);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpanded(new Set(groupedData.map((g) => g.groupKey)));
  }, [groupedData]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  const valueColumns = useMemo(() => {
    if (viewMode === "tokens") {
      return [
        { field: "promptTokens", label: "Input" },
        { field: "cachedTokens", label: "Cached" },
        { field: "completionTokens", label: "Output" },
        { field: "totalTokens", label: "Total Tokens" },
      ];
    }
    return [
      { field: "promptTokens", label: "Input Cost" },
      { field: "cachedCost", label: "Cached Cost" },
      { field: "completionTokens", label: "Output Cost" },
      { field: "cost", label: "Total Cost" },
    ];
  }, [viewMode]);

  // Filter grouped data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return groupedData;
    const q = searchQuery.toLowerCase().trim();
    return groupedData
      .map((g) => {
        const matchesGroup = g.groupKey.toLowerCase().includes(q);
        const matchingItems = g.items.filter((item) => {
          return (
            (item.rawModel && item.rawModel.toLowerCase().includes(q)) ||
            (item.provider && item.provider.toLowerCase().includes(q)) ||
            (item.accountName && item.accountName.toLowerCase().includes(q)) ||
            (item.keyName && item.keyName.toLowerCase().includes(q)) ||
            (item.endpoint && item.endpoint.toLowerCase().includes(q))
          );
        });
        if (matchesGroup || matchingItems.length > 0) {
          return {
            ...g,
            items: matchesGroup ? g.items : matchingItems,
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [groupedData, searchQuery]);

  const totalColSpan = columns.length + valueColumns.length;

  return (
    <Card className="overflow-hidden border border-border bg-surface shadow-[var(--shadow-soft)]" padding="none">
      {/* Table Top Actions Bar */}
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between border-b border-border bg-bg-subtle/40">
        <div className="flex items-center gap-2">
          {title && <h3 className="text-sm font-semibold text-text-main">{title}</h3>}
          <div className="relative flex-1 sm:w-64">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-text-muted">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter items..."
              className="h-8 w-full border border-border bg-surface pl-8 pr-7 text-xs text-text-main placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main cursor-pointer"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={expandAll}
            className="flex items-center gap-1 px-2 py-1 text-text-muted transition-colors hover:bg-surface-2 hover:text-text-main cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">unfold_more</span>
            Expand all
          </button>
          <span className="text-border">|</span>
          <button
            type="button"
            onClick={collapseAll}
            className="flex items-center gap-1 px-2 py-1 text-text-muted transition-colors hover:bg-surface-2 hover:text-text-main cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">unfold_less</span>
            Collapse all
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="border-b border-border bg-surface-2/60 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.field}
                  className={`px-4 py-3 select-none cursor-pointer transition-colors hover:text-text-main ${
                    col.align === "right" ? "text-right" : ""
                  }`}
                  onClick={() => onToggleSort(tableType, col.field)}
                >
                  <span className="inline-flex items-center">
                    {col.label}
                    <SortIcon field={col.field} currentSort={sortBy} currentOrder={sortOrder} />
                  </span>
                </th>
              ))}
              {valueColumns.map((col) => (
                <th
                  key={col.field}
                  className="px-4 py-3 select-none text-right cursor-pointer transition-colors hover:text-text-main"
                  onClick={() => onToggleSort(tableType, col.field)}
                >
                  <span className="inline-flex items-center justify-end">
                    {col.label}
                    <SortIcon field={col.field} currentSort={sortBy} currentOrder={sortOrder} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredData.map((group) => {
              const isExpanded = expanded.has(group.groupKey);
              return (
                <Fragment key={group.groupKey}>
                  {/* Group summary row */}
                  <tr
                    className="cursor-pointer bg-surface transition-colors hover:bg-surface-2/60"
                    onClick={() => toggleGroup(group.groupKey)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`material-symbols-outlined text-[18px] text-text-muted transition-transform duration-200 ${
                            isExpanded ? "rotate-90 text-brand-600 dark:text-brand-400" : ""
                          }`}
                        >
                          chevron_right
                        </span>
                        <span
                          className={`font-semibold tracking-tight transition-colors ${
                            group.summary.pending > 0 ? "text-brand-600 dark:text-brand-400" : "text-text-main"
                          }`}
                        >
                          {group.groupKey}
                        </span>
                        <span className="bg-surface-2 px-1.5 py-0.2 text-[10px] font-mono text-text-muted">
                          {group.items.length}
                        </span>
                      </div>
                    </td>
                    {renderSummaryCells(group)}
                    <ValueCells item={group.summary} viewMode={viewMode} isSummary />
                  </tr>

                  {/* Detail rows */}
                  {isExpanded &&
                    group.items.map((item) => (
                      <tr
                        key={`detail-${item.key}`}
                        className="bg-bg-subtle/30 transition-colors hover:bg-bg-subtle/70"
                      >
                        {renderDetailCells(item)}
                        <ValueCells item={item} viewMode={viewMode} />
                      </tr>
                    ))}
                </Fragment>
              );
            })}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={totalColSpan} className="px-6 py-12 text-center text-text-muted">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[32px] opacity-30">
                      manage_search
                    </span>
                    <span className="text-sm">
                      {searchQuery ? `No matches found for "${searchQuery}"` : emptyMessage}
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

UsageTable.propTypes = {
  title: PropTypes.string,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      field: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      align: PropTypes.string,
    })
  ).isRequired,
  groupedData: PropTypes.array.isRequired,
  tableType: PropTypes.string.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
  onToggleSort: PropTypes.func.isRequired,
  viewMode: PropTypes.string.isRequired,
  storageKey: PropTypes.string.isRequired,
  renderDetailCells: PropTypes.func.isRequired,
  renderSummaryCells: PropTypes.func.isRequired,
  emptyMessage: PropTypes.string,
};
