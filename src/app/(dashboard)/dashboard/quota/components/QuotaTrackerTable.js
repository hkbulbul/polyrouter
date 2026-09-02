"use client";

import { Fragment, useState } from "react";
import ProviderIcon from "@/shared/components/ProviderIcon";
import Toggle from "@/shared/components/Toggle";
import Tooltip from "@/shared/components/Tooltip";
import QuotaTable from "../../usage/components/ProviderLimits/QuotaTable";
import {
  filterQuotasByVisibility,
  formatResetTime,
  getHiddenQuotaRows,
  getQuotaVisibilityKey,
  getRemainingPercentage,
} from "../../usage/components/ProviderLimits/utils";

function getQuotaTone(remaining) {
  if (remaining === null) return "bg-surface-3";
  if (remaining > 70) return "bg-brand-500";
  if (remaining >= 30) return "bg-amber-500";
  return "bg-red-500";
}

function getMeasuredQuotas(quotas) {
  return quotas.filter((quota) => (
    quota.total > 0
    || (quota.remaining != null && Number.isFinite(Number(quota.remaining)))
    || (quota.remainingPercentage != null && Number.isFinite(Number(quota.remainingPercentage)))
  ));
}

function getWorstRemaining(quotas) {
  const measured = getMeasuredQuotas(quotas);
  if (!measured.length) return null;
  return Math.min(...measured.map(getRemainingPercentage));
}

function getEarliestReset(quotas, now = Date.now()) {
  const resetTimes = quotas
    .map((quota) => quota.resetAt && new Date(quota.resetAt).getTime())
    .filter((time) => Number.isFinite(time) && time > now);
  if (!resetTimes.length) return null;
  return new Date(Math.min(...resetTimes)).toISOString();
}

function QuotaPreview({ quotas }) {
  const visible = quotas.slice(0, 2);
  const overflow = quotas.length - visible.length;

  if (!quotas.length) {
    return <span className="text-xs text-text-muted">No quota reported</span>;
  }

  return (
    <div className="min-w-[12rem] space-y-1.5">
      {visible.map((quota) => {
        const remaining = getMeasuredQuotas([quota]).length
          ? getRemainingPercentage(quota)
          : null;
        return (
          <div key={getQuotaVisibilityKey(quota)} className="grid grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-2">
            <div className="min-w-0">
              <div className="mb-1 flex items-center justify-between gap-2 text-[11px] leading-none">
                <span className="truncate text-text-muted">{quota.name}</span>
                <span className="shrink-0 font-medium text-text-primary tabular-nums">
                  {remaining === null ? "∞" : `${remaining}%`}
                </span>
              </div>
              <div className="h-1 overflow-hidden bg-black/7 dark:bg-white/10">
                <div
                  className={remaining === null ? "h-full w-full bg-brand-500/45" : `h-full ${getQuotaTone(remaining)}`}
                  style={remaining === null ? undefined : { width: `${Math.max(0, Math.min(remaining, 100))}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
      {overflow > 0 && <div className="text-[10px] text-text-muted">+{overflow} more quota{overflow === 1 ? "" : "s"}</div>}
    </div>
  );
}

function IconAction({ label, icon, className = "", disabled = false, onClick, children }) {
  return (
    <Tooltip text={label}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`flex h-8 w-8 items-center justify-center text-text-muted transition-colors hover:bg-black/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-white/5 ${className}`}
      >
        {children || <span className="material-symbols-outlined text-[18px]">{icon}</span>}
      </button>
    </Tooltip>
  );
}

export default function QuotaTrackerTable({
  connections,
  quotaData,
  loading,
  errors,
  quotaVisibility,
  autoPingMaps,
  copied,
  bulkBusy,
  deletingId,
  togglingId,
  resettingLimitId,
  getConnectionLabel,
  getConnectionSecondaryLabel,
  getKiroMethodLabel,
  getKiroRegion,
  getCodexResetCreditCount,
  onCopy,
  onRefresh,
  onToggleAutoPing,
  onShowResetCredits,
  onOpenResetConfirm,
  onEdit,
  onDelete,
  onToggleActive,
  onHideQuota,
  onShowQuota,
}) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="overflow-hidden border border-border bg-surface shadow-[var(--shadow-soft)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] table-fixed text-left">
          <thead className="border-b border-border bg-bg-alt text-[10px] font-semibold uppercase tracking-[0.11em] text-text-muted">
            <tr>
              <th className="w-[25%] px-4 py-3">Account</th>
              <th className="w-[12%] px-3 py-3">State</th>
              <th className="w-[31%] px-3 py-3">Quota remaining</th>
              <th className="w-[15%] px-3 py-3">Next reset</th>
              <th className="w-[17%] px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {connections.map((connection) => {
              const quotaEntry = quotaData[connection.id];
              const rawQuotas = quotaEntry?.quotas || [];
              const visibleQuotas = filterQuotasByVisibility(connection.provider, rawQuotas, quotaVisibility);
              const hiddenQuotas = getHiddenQuotaRows(connection.provider, rawQuotas, quotaVisibility);
              const isLoading = loading[connection.id];
              const error = errors[connection.id];
              const isInactive = connection.isActive === false;
              const rowBusy = deletingId === connection.id || togglingId === connection.id || resettingLimitId === connection.id;
              const remaining = getWorstRemaining(visibleQuotas);
              const nextReset = getEarliestReset(visibleQuotas);
              const isCodex = connection.provider === "codex";
              const resetCreditCount = getCodexResetCreditCount(quotaEntry);
              const expanded = expandedId === connection.id;

              return (
                <Fragment key={connection.id}>
                  <tr className={`group transition-colors hover:bg-bg-alt/55 ${isInactive ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3 align-top">
                      <div className="flex min-w-0 items-center gap-3">
                        <ProviderIcon
                          src={`/providers/${connection.provider}.png`}
                          alt={connection.provider}
                          size={28}
                          className="size-7 shrink-0 object-contain"
                          fallbackText={connection.provider?.slice(0, 2).toUpperCase() || "PR"}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-text-primary">
                            {getConnectionLabel(connection) || connection.provider}
                          </div>
                          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-text-muted">
                            <span className="shrink-0 capitalize">{connection.provider}</span>
                            {getConnectionSecondaryLabel(connection) && <><span aria-hidden="true">·</span><span className="truncate">{getConnectionSecondaryLabel(connection)}</span></>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-col items-start gap-1.5">
                        <span className={`border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${isInactive ? "border-border bg-surface-2 text-text-muted" : remaining !== null && remaining <= 5 ? "border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-300" : "border-brand-500/25 bg-brand-500/10 text-brand-700 dark:text-brand-300"}`}>
                          {isInactive ? "Off" : remaining !== null && remaining <= 5 ? "Empty" : "Ready"}
                        </span>
                        {connection.provider === "kiro" && <span className="text-[10px] text-text-muted">{getKiroMethodLabel(connection)}{getKiroRegion(connection) ? ` · ${getKiroRegion(connection)}` : ""}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      {isLoading ? (
                        <div className="h-8 w-44 animate-pulse bg-surface-2" />
                      ) : error ? (
                        <span className="text-xs text-red-600 dark:text-red-300">{error}</span>
                      ) : quotaEntry?.message ? (
                        <span className="text-xs text-text-muted">{quotaEntry.message}</span>
                      ) : (
                        <QuotaPreview quotas={visibleQuotas} />
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      {nextReset ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-text-primary tabular-nums">
                          <span className="material-symbols-outlined text-[15px] text-text-muted">schedule</span>
                          {formatResetTime(nextReset)}
                        </div>
                      ) : <span className="text-xs text-text-muted">—</span>}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex items-center justify-end gap-0.5">
                        <IconAction
                          label={expanded ? "Collapse account quotas" : "Expand account quotas"}
                          icon={expanded ? "expand_less" : "expand_more"}
                          onClick={() => setExpandedId(expanded ? null : connection.id)}
                        />
                        <IconAction label="Refresh quota" icon="refresh" disabled={isLoading || rowBusy || bulkBusy} onClick={() => onRefresh(connection.id, connection.provider)} className={isLoading ? "[&>span]:animate-spin" : ""} />
                        <div className="hidden items-center lg:flex">
                          {isCodex && <>
                            <IconAction label="Use Codex reset credit" icon="restart_alt" disabled={resetCreditCount <= 0 || isLoading || rowBusy} onClick={() => onOpenResetConfirm(connection, resetCreditCount)} />
                            <IconAction label="View Codex reset credit expiry" icon="event" disabled={isLoading || rowBusy} onClick={() => onShowResetCredits(connection)} />
                          </>}
                          {connection.provider === "claude" || connection.provider === "codex" ? (
                            connection.authType === "oauth" && <IconAction label={autoPingMaps[connection.provider]?.[connection.id] ? "Disable auto-ping" : "Enable auto-ping"} icon="bolt" onClick={() => onToggleAutoPing(connection.id, connection.provider, !(autoPingMaps[connection.provider]?.[connection.id] === true))} className={autoPingMaps[connection.provider]?.[connection.id] ? "text-primary" : ""} />
                          ) : null}
                          <IconAction label="Edit connection" icon="edit" disabled={rowBusy} onClick={() => onEdit(connection)} />
                          <IconAction label="Delete connection" icon="delete" disabled={rowBusy} onClick={() => onDelete(connection.id)} className="hover:text-red-600" />
                        </div>
                        <Toggle size="sm" checked={connection.isActive ?? true} disabled={rowBusy || bulkBusy} onChange={(nextActive) => onToggleActive(connection.id, nextActive)} />
                      </div>
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="bg-bg-alt/45">
                      <td colSpan="5" className="px-4 py-4">
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
                          <div className="min-w-0 border border-border bg-surface px-3 py-2">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.11em] text-text-muted">All reported quotas</span>
                              {connection.providerSpecificData?.profileArn && (
                                <button type="button" onClick={() => onCopy(connection.providerSpecificData.profileArn, connection.id)} className="inline-flex max-w-[15rem] items-center gap-1 text-[10px] text-text-muted transition-colors hover:text-primary" title={connection.providerSpecificData.profileArn}>
                                  <span className="material-symbols-outlined text-[13px]">{copied === connection.id ? "check" : "content_copy"}</span>
                                  <code className="truncate font-mono">{connection.providerSpecificData.profileArn}</code>
                                </button>
                              )}
                            </div>
                            <QuotaTable quotas={visibleQuotas} compact onHideQuota={(quota) => onHideQuota(connection.provider, quota)} />
                          </div>
                          <div className="border border-border bg-surface px-3 py-3">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.11em] text-text-muted">Account controls</div>
                            <div className="mt-3 flex flex-wrap gap-1.5 lg:hidden">
                              {isCodex && <>
                                <button type="button" disabled={resetCreditCount <= 0 || isLoading || rowBusy} onClick={() => onOpenResetConfirm(connection, resetCreditCount)} className="border border-border px-2 py-1 text-xs text-text-primary disabled:opacity-45">Use reset credit ({resetCreditCount})</button>
                                <button type="button" disabled={isLoading || rowBusy} onClick={() => onShowResetCredits(connection)} className="border border-border px-2 py-1 text-xs text-text-primary disabled:opacity-45">Credit expiry</button>
                              </>}
                              {(connection.provider === "claude" || connection.provider === "codex") && connection.authType === "oauth" && <button type="button" onClick={() => onToggleAutoPing(connection.id, connection.provider, !(autoPingMaps[connection.provider]?.[connection.id] === true))} className="border border-border px-2 py-1 text-xs text-text-primary">{autoPingMaps[connection.provider]?.[connection.id] ? "Disable auto-ping" : "Enable auto-ping"}</button>}
                              <button type="button" disabled={rowBusy} onClick={() => onEdit(connection)} className="border border-border px-2 py-1 text-xs text-text-primary disabled:opacity-45">Edit</button>
                              <button type="button" disabled={rowBusy} onClick={() => onDelete(connection.id)} className="border border-red-500/25 px-2 py-1 text-xs text-red-600 disabled:opacity-45">Delete</button>
                            </div>
                            {hiddenQuotas.length > 0 && <div className="mt-4 border-t border-border pt-3"><div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.11em] text-text-muted">Hidden quota rows</div><div className="flex flex-wrap gap-1.5">{hiddenQuotas.map((quota) => <button key={getQuotaVisibilityKey(quota)} type="button" onClick={() => onShowQuota(connection.provider, quota)} className="border border-border px-2 py-1 text-[11px] text-text-muted transition-colors hover:bg-bg-alt hover:text-text-primary">Show {quota.name}</button>)}</div></div>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
