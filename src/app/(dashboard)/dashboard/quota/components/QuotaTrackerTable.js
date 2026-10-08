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

function getDetailsId(connectionId) {
  return `quota-details-${String(connectionId).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function QuotaPreview({ quotas, compact = false }) {
  const visible = quotas.slice(0, 2);
  const overflow = quotas.length - visible.length;

  if (!quotas.length) {
    return <span className="text-xs text-text-muted">No measurable quota reported</span>;
  }

  return (
    <div className={compact ? "min-w-0 space-y-2" : "min-w-[12rem] space-y-1.5"}>
      {visible.map((quota) => {
        const remaining = getMeasuredQuotas([quota]).length
          ? getRemainingPercentage(quota)
          : null;
        const width = remaining === null ? 100 : Math.max(0, Math.min(remaining, 100));
        return (
          <div key={getQuotaVisibilityKey(quota)} className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-2">
            <div className="min-w-0">
              <div className="mb-1 flex items-center justify-between gap-2 text-[11px] leading-none">
                <span className="truncate text-text-muted">{quota.name}</span>
                <span className="shrink-0 font-medium text-text-primary tabular-nums">
                  {remaining === null ? "∞" : `${remaining}%`}
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-black/7 dark:bg-white/10"
                role="progressbar"
                aria-label={`${quota.name} remaining`}
                aria-valuemin="0"
                aria-valuemax="100"
                {...(remaining === null ? {} : { "aria-valuenow": remaining })}
              >
                <div
                  className={`h-full rounded-full ${remaining === null ? "bg-brand-500/45" : getQuotaTone(remaining)}`}
                  style={{ width: `${width}%` }}
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
        className={`flex size-9 items-center justify-center text-text-muted transition-colors hover:bg-surface-2 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${className}`}
      >
        {children || <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{icon}</span>}
      </button>
    </Tooltip>
  );
}

function AccountIdentity({ connection, compact = false, getConnectionLabel, getConnectionSecondaryLabel }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProviderIcon
        src={`/providers/${connection.provider}.png`}
        alt=""
        size={compact ? 32 : 28}
        className={`${compact ? "size-8" : "size-7"} shrink-0 object-contain`}
        fallbackText={connection.provider?.slice(0, 2).toUpperCase() || "PR"}
      />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-text-primary">
          {getConnectionLabel(connection) || connection.provider}
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-text-muted">
          <span className="shrink-0 capitalize">{connection.provider}</span>
          {getConnectionSecondaryLabel(connection) && (
            <><span aria-hidden="true">·</span><span className="truncate">{getConnectionSecondaryLabel(connection)}</span></>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ connection, remaining, error }) {
  const isInactive = connection.isActive === false;
  const isEmpty = !isInactive && remaining !== null && remaining <= 5;
  const tone = isInactive
    ? "border-border bg-surface-2 text-text-muted"
    : error
      ? "border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-300"
      : isEmpty
        ? "border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-300"
        : "border-brand-500/25 bg-brand-500/10 text-brand-700 dark:text-brand-300";
  const label = isInactive ? "Off" : error ? "Error" : isEmpty ? "Empty" : "Ready";

  return (
    <span className={`inline-flex items-center gap-1.5 border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${tone}`}>
      <span className={`size-1.5 rounded-full ${isInactive ? "bg-text-subtle" : error || isEmpty ? "bg-red-500" : "bg-brand-500"}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function AccountDetails({
  connection,
  visibleQuotas,
  hiddenQuotas,
  quotaEntry,
  copied,
  isLoading,
  rowBusy,
  isCodex,
  resetCreditCount,
  autoPingEnabled,
  getConnectionLabel,
  getKiroMethodLabel,
  getKiroRegion,
  onCopy,
  onToggleAutoPing,
  onShowResetCredits,
  onOpenResetConfirm,
  onEdit,
  onDelete,
  onHideQuota,
  onShowQuota,
  mobile = false,
}) {
  const error = quotaEntry?.error;
  return (
    <div className={mobile ? "space-y-4 border-t border-border-subtle pt-4" : "grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]"}>
      <div className="min-w-0 border border-border bg-surface px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.11em] text-text-muted">All reported quotas</span>
          {connection.providerSpecificData?.profileArn && (
            <button
              type="button"
              onClick={() => onCopy(connection.providerSpecificData.profileArn, connection.id)}
              className="inline-flex max-w-[15rem] min-h-8 items-center gap-1 text-[10px] text-text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              title={connection.providerSpecificData.profileArn}
            >
              <span className="material-symbols-outlined text-[13px]" aria-hidden="true">{copied === connection.id ? "check" : "content_copy"}</span>
              <code className="truncate font-mono">{connection.providerSpecificData.profileArn}</code>
            </button>
          )}
        </div>
        {error && <div className="mb-3 border border-red-500/20 bg-red-500/10 px-2.5 py-2 text-xs text-red-600 dark:text-red-300">{error}</div>}
        {quotaEntry?.message && <div className="mb-3 border border-blue-500/20 bg-blue-500/10 px-2.5 py-2 text-xs text-blue-600 dark:text-blue-300">{quotaEntry.message}</div>}
        <QuotaTable quotas={visibleQuotas} compact onHideQuota={(quota) => onHideQuota(connection.provider, quota)} />
        {!visibleQuotas.length && !error && !quotaEntry?.message && <p className="py-3 text-xs text-text-muted">No quota details are available for this account yet.</p>}
      </div>
      <div className="border border-border bg-surface px-3 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.11em] text-text-muted">Account controls</div>
        <div className="mt-3 space-y-2 text-xs text-text-muted">
          {connection.provider === "kiro" && <div>{getKiroMethodLabel(connection)}{getKiroRegion(connection) ? ` · ${getKiroRegion(connection)}` : ""}</div>}
          <div className="flex items-center justify-between gap-2">
            <span>Account status</span>
            <span className="font-medium text-text-primary">{connection.isActive === false ? "Turned off" : "Active"}</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {isCodex && <>
            <button type="button" disabled={resetCreditCount <= 0 || isLoading || rowBusy} onClick={() => onOpenResetConfirm(connection, resetCreditCount)} className="min-h-9 border border-border px-2.5 py-1.5 text-xs text-text-primary transition-colors hover:bg-surface-2 disabled:opacity-45">Use reset credit ({resetCreditCount})</button>
            <button type="button" disabled={isLoading || rowBusy} onClick={() => onShowResetCredits(connection)} className="min-h-9 border border-border px-2.5 py-1.5 text-xs text-text-primary transition-colors hover:bg-surface-2 disabled:opacity-45">Credit expiry</button>
          </>}
          {(connection.provider === "claude" || connection.provider === "codex") && connection.authType === "oauth" && (
            <button type="button" onClick={() => onToggleAutoPing(connection.id, connection.provider, !autoPingEnabled)} className="min-h-9 border border-border px-2.5 py-1.5 text-xs text-text-primary transition-colors hover:bg-surface-2">
              {autoPingEnabled ? "Disable auto-ping" : "Enable auto-ping"}
            </button>
          )}
          <button type="button" disabled={rowBusy} onClick={() => onEdit(connection)} className="min-h-9 border border-border px-2.5 py-1.5 text-xs text-text-primary transition-colors hover:bg-surface-2 disabled:opacity-45">Edit</button>
          <button type="button" disabled={rowBusy} onClick={() => onDelete(connection.id)} className="min-h-9 border border-red-500/25 px-2.5 py-1.5 text-xs text-red-600 transition-colors hover:bg-red-500/10 disabled:opacity-45">Delete</button>
        </div>
        {hiddenQuotas.length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.11em] text-text-muted">Hidden quota rows</div>
            <div className="flex flex-wrap gap-1.5">
              {hiddenQuotas.map((quota) => (
                <button key={getQuotaVisibilityKey(quota)} type="button" onClick={() => onShowQuota(connection.provider, quota)} className="min-h-8 border border-border px-2 py-1 text-[11px] text-text-muted transition-colors hover:bg-surface-2 hover:text-text-primary">Show {quota.name}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MobileAccountCard({
  connection,
  quotaData,
  loading,
  errors,
  quotaVisibility,
  autoPingMaps,
  copied,
  deletingId,
  togglingId,
  resettingLimitId,
  bulkBusy,
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
  expanded,
  onToggleExpanded,
}) {
  const quotaEntry = quotaData[connection.id];
  const rawQuotas = quotaEntry?.quotas || [];
  const visibleQuotas = filterQuotasByVisibility(connection.provider, rawQuotas, quotaVisibility);
  const hiddenQuotas = getHiddenQuotaRows(connection.provider, rawQuotas, quotaVisibility);
  const isLoading = loading[connection.id];
  const error = errors[connection.id];
  const rowBusy = deletingId === connection.id || togglingId === connection.id || resettingLimitId === connection.id;
  const remaining = getWorstRemaining(visibleQuotas);
  const nextReset = getEarliestReset(visibleQuotas);
  const isCodex = connection.provider === "codex";
  const detailsId = getDetailsId(connection.id);

  return (
    <article className={`border border-border bg-surface p-4 shadow-[var(--shadow-soft)] ${connection.isActive === false ? "opacity-70" : ""}`} aria-busy={isLoading}>
      <div className="flex items-start justify-between gap-3">
        <AccountIdentity connection={connection} compact getConnectionLabel={getConnectionLabel} getConnectionSecondaryLabel={getConnectionSecondaryLabel} />
        <StatusBadge connection={connection} remaining={remaining} error={error} />
      </div>
      <div className="mt-4">
        {isLoading ? <div className="h-10 animate-pulse rounded bg-surface-2" /> : error ? <p className="text-xs text-red-600 dark:text-red-300">{error}</p> : quotaEntry?.message ? <p className="text-xs text-text-muted">{quotaEntry.message}</p> : <QuotaPreview quotas={visibleQuotas} compact />}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border-subtle pt-3">
        <div className="min-w-0 text-xs text-text-muted">
          {nextReset ? <span><span className="font-medium text-text-primary">Next reset</span> · {formatResetTime(nextReset)}</span> : <span>No reset scheduled</span>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <IconAction label="Refresh quota" icon="refresh" disabled={isLoading || rowBusy || bulkBusy} onClick={() => onRefresh(connection.id, connection.provider)} className={isLoading ? "[&>span]:animate-spin" : ""} />
          <Toggle size="sm" checked={connection.isActive ?? true} disabled={rowBusy || bulkBusy} onChange={(nextActive) => onToggleActive(connection.id, nextActive)} />
        </div>
      </div>
      <button
        type="button"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
        aria-controls={detailsId}
        className="mt-3 flex min-h-10 w-full items-center justify-between border border-border px-3 text-xs font-medium text-text-primary transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <span>{expanded ? "Hide account details" : "View account details"}</span>
        <span className="material-symbols-outlined text-[18px] text-text-muted" aria-hidden="true">{expanded ? "expand_less" : "expand_more"}</span>
      </button>
      {expanded && (
        <div id={detailsId} className="mt-4">
          <AccountDetails
            connection={connection}
            visibleQuotas={visibleQuotas}
            hiddenQuotas={hiddenQuotas}
            quotaEntry={quotaEntry}
            copied={copied}
            isLoading={isLoading}
            rowBusy={rowBusy}
            isCodex={isCodex}
            resetCreditCount={getCodexResetCreditCount(quotaEntry)}
            autoPingEnabled={autoPingMaps[connection.provider]?.[connection.id] === true}
            getConnectionLabel={getConnectionLabel}
            getKiroMethodLabel={getKiroMethodLabel}
            getKiroRegion={getKiroRegion}
            onCopy={onCopy}
            onToggleAutoPing={onToggleAutoPing}
            onShowResetCredits={onShowResetCredits}
            onOpenResetConfirm={onOpenResetConfirm}
            onEdit={onEdit}
            onDelete={onDelete}
            onHideQuota={onHideQuota}
            onShowQuota={onShowQuota}
            mobile
          />
        </div>
      )}
    </article>
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

  const renderDetails = (connection, visibleQuotas, hiddenQuotas, quotaEntry, isLoading, rowBusy, isCodex) => (
    <AccountDetails
      connection={connection}
      visibleQuotas={visibleQuotas}
      hiddenQuotas={hiddenQuotas}
      quotaEntry={quotaEntry}
      copied={copied}
      isLoading={isLoading}
      rowBusy={rowBusy}
      isCodex={isCodex}
      resetCreditCount={getCodexResetCreditCount(quotaEntry)}
      autoPingEnabled={autoPingMaps[connection.provider]?.[connection.id] === true}
      getConnectionLabel={getConnectionLabel}
      getKiroMethodLabel={getKiroMethodLabel}
      getKiroRegion={getKiroRegion}
      onCopy={onCopy}
      onToggleAutoPing={onToggleAutoPing}
      onShowResetCredits={onShowResetCredits}
      onOpenResetConfirm={onOpenResetConfirm}
      onEdit={onEdit}
      onDelete={onDelete}
      onHideQuota={onHideQuota}
      onShowQuota={onShowQuota}
    />
  );

  return (
    <>
      <div className="hidden overflow-hidden border border-border bg-surface shadow-[var(--shadow-soft)] lg:block" aria-busy={Object.values(loading).some(Boolean)}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] table-fixed text-left">
            <caption className="sr-only">Connected provider accounts and their reported quota capacity</caption>
            <thead className="border-b border-border bg-bg-alt text-[10px] font-semibold uppercase tracking-[0.11em] text-text-muted">
              <tr>
                <th scope="col" className="w-[25%] px-4 py-3">Account</th>
                <th scope="col" className="w-[12%] px-3 py-3">State</th>
                <th scope="col" className="w-[31%] px-3 py-3">Quota remaining</th>
                <th scope="col" className="w-[15%] px-3 py-3">Next reset</th>
                <th scope="col" className="w-[17%] px-3 py-3 text-right">Actions</th>
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
                const expanded = expandedId === connection.id;
                const detailsId = getDetailsId(connection.id);

                return (
                  <Fragment key={connection.id}>
                    <tr className={`group transition-colors hover:bg-bg-alt/55 ${isInactive ? "opacity-60" : ""}`} aria-expanded={expanded} aria-controls={detailsId} aria-busy={isLoading}>
                      <td className="px-4 py-3 align-top"><AccountIdentity connection={connection} getConnectionLabel={getConnectionLabel} getConnectionSecondaryLabel={getConnectionSecondaryLabel} /></td>
                      <td className="px-3 py-3 align-top">
                        <div className="flex flex-col items-start gap-1.5">
                          <StatusBadge connection={connection} remaining={remaining} error={error} />
                          {connection.provider === "kiro" && <span className="text-[10px] text-text-muted">{getKiroMethodLabel(connection)}{getKiroRegion(connection) ? ` · ${getKiroRegion(connection)}` : ""}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        {isLoading ? <div className="h-8 w-44 animate-pulse rounded bg-surface-2" /> : error ? <span className="text-xs text-red-600 dark:text-red-300">{error}</span> : quotaEntry?.message ? <span className="text-xs text-text-muted">{quotaEntry.message}</span> : <QuotaPreview quotas={visibleQuotas} />}
                      </td>
                      <td className="px-3 py-3 align-top">
                        {nextReset ? <div className="flex items-center gap-1.5 text-xs font-medium text-text-primary tabular-nums"><span className="material-symbols-outlined text-[15px] text-text-muted" aria-hidden="true">schedule</span>{formatResetTime(nextReset)}</div> : <span className="text-xs text-text-muted">—</span>}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex items-center justify-end gap-0.5">
                          <IconAction label={expanded ? "Collapse account quotas" : "Expand account quotas"} icon={expanded ? "expand_less" : "expand_more"} onClick={() => setExpandedId(expanded ? null : connection.id)} />
                          <IconAction label="Refresh quota" icon="refresh" disabled={isLoading || rowBusy || bulkBusy} onClick={() => onRefresh(connection.id, connection.provider)} className={isLoading ? "[&>span]:animate-spin" : ""} />
                          {isCodex && <>
                            <IconAction label="Use Codex reset credit" icon="restart_alt" disabled={getCodexResetCreditCount(quotaEntry) <= 0 || isLoading || rowBusy} onClick={() => onOpenResetConfirm(connection, getCodexResetCreditCount(quotaEntry))} />
                            <IconAction label="View Codex reset credit expiry" icon="event" disabled={isLoading || rowBusy} onClick={() => onShowResetCredits(connection)} />
                          </>}
                          {(connection.provider === "claude" || connection.provider === "codex") && connection.authType === "oauth" && <IconAction label={autoPingMaps[connection.provider]?.[connection.id] ? "Disable auto-ping" : "Enable auto-ping"} icon="bolt" onClick={() => onToggleAutoPing(connection.id, connection.provider, !(autoPingMaps[connection.provider]?.[connection.id] === true))} className={autoPingMaps[connection.provider]?.[connection.id] ? "text-primary" : ""} />}
                          <IconAction label="Edit connection" icon="edit" disabled={rowBusy} onClick={() => onEdit(connection)} />
                          <IconAction label="Delete connection" icon="delete" disabled={rowBusy} onClick={() => onDelete(connection.id)} className="hover:text-red-600" />
                          <Toggle size="sm" checked={connection.isActive ?? true} disabled={rowBusy || bulkBusy} onChange={(nextActive) => onToggleActive(connection.id, nextActive)} />
                        </div>
                      </td>
                    </tr>
                    {expanded && <tr id={detailsId} className="bg-bg-alt/45"><td colSpan="5" className="px-4 py-4">{renderDetails(connection, visibleQuotas, hiddenQuotas, quotaEntry, isLoading, rowBusy, isCodex)}</td></tr>}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 lg:hidden" aria-label="Connected provider accounts" aria-busy={Object.values(loading).some(Boolean)}>
        {connections.map((connection) => (
          <MobileAccountCard
            key={connection.id}
            connection={connection}
            quotaData={quotaData}
            loading={loading}
            errors={errors}
            quotaVisibility={quotaVisibility}
            autoPingMaps={autoPingMaps}
            copied={copied}
            deletingId={deletingId}
            togglingId={togglingId}
            resettingLimitId={resettingLimitId}
            bulkBusy={bulkBusy}
            getConnectionLabel={getConnectionLabel}
            getConnectionSecondaryLabel={getConnectionSecondaryLabel}
            getKiroMethodLabel={getKiroMethodLabel}
            getKiroRegion={getKiroRegion}
            getCodexResetCreditCount={getCodexResetCreditCount}
            onCopy={onCopy}
            onRefresh={onRefresh}
            onToggleAutoPing={onToggleAutoPing}
            onShowResetCredits={onShowResetCredits}
            onOpenResetConfirm={onOpenResetConfirm}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleActive={onToggleActive}
            onHideQuota={onHideQuota}
            onShowQuota={onShowQuota}
            expanded={expandedId === connection.id}
            onToggleExpanded={() => setExpandedId(expandedId === connection.id ? null : connection.id)}
          />
        ))}
      </div>
    </>
  );
}
