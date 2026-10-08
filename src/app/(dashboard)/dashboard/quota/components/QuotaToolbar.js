"use client";

import { useState } from "react";
import ProviderIcon from "@/shared/components/ProviderIcon";
import Button from "@/shared/components/Button";
import {
  ACCOUNT_FILTER_OPTIONS,
  QUOTA_SORT_OPTIONS,
} from "../../usage/components/ProviderLimits/utils";

function formatLastUpdated(value) {
  if (!value) return "Not updated yet";
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not updated yet";
  return `Updated ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

export default function QuotaToolbar({
  providerFilter,
  setProviderFilter,
  providerOptions,
  accountFilter,
  setAccountFilter,
  quotaSortMode,
  setQuotaSortMode,
  expiringFirst,
  setExpiringFirst,
  autoRefresh,
  setAutoRefresh,
  countdown,
  refreshingAll,
  refreshAll,
  lastUpdated,
  bulkToggling,
  onDisableDepleted,
  onEnableAvailable,
  onClearFilters,
  onResetPage,
}) {
  const [providerMenuOpen, setProviderMenuOpen] = useState(false);
  const hasFilters = providerFilter !== "all"
    || accountFilter !== "all"
    || quotaSortMode !== "default"
    || expiringFirst;
  const selectedProviderLabel = providerFilter === "all" ? "All providers" : providerFilter;

  return (
    <div className="space-y-3 border-b border-border pb-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-xl">
          <h2 className="text-lg font-semibold tracking-tight text-text-primary">Capacity at a glance</h2>
          <p className="mt-1 text-sm text-text-muted">
            See which accounts can handle the next request, then act on anything running low.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted" aria-live="polite">
            <span className="inline-flex items-center gap-1.5">
              <span className={`size-1.5 rounded-full ${lastUpdated ? "bg-brand-500" : "bg-text-subtle"}`} aria-hidden="true" />
              {formatLastUpdated(lastUpdated)}
            </span>
            <span className="hidden sm:inline" aria-hidden="true">·</span>
            <span>{autoRefresh ? `Auto-refreshing in ${countdown}s` : "Auto-refresh is off"}</span>
            <span className="hidden md:inline text-text-subtle">Claude usage refreshes every 3 minutes to respect provider limits.</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2" aria-label="Quota controls">
          <div className="relative">
            <span className="sr-only" id="quota-provider-label">Provider</span>
            <button
              type="button"
              onClick={() => setProviderMenuOpen((prev) => !prev)}
              className="flex h-9 items-center justify-between gap-2 border border-border bg-surface px-2.5 text-xs text-text-primary transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-haspopup="menu"
              aria-expanded={providerMenuOpen}
              aria-labelledby="quota-provider-label"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                {providerFilter === "all" ? (
                  <span className="material-symbols-outlined text-[15px] text-text-muted" aria-hidden="true">apps</span>
                ) : (
                  <ProviderIcon
                    src={`/providers/${providerFilter}.png`}
                    alt=""
                    size={18}
                    className="size-[18px] object-contain"
                    fallbackText={providerFilter.slice(0, 2).toUpperCase()}
                  />
                )}
                <span className="capitalize">{selectedProviderLabel}</span>
              </span>
              <span className="material-symbols-outlined text-[15px] text-text-muted" aria-hidden="true">expand_more</span>
            </button>

            {providerMenuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-30 cursor-default bg-transparent"
                  aria-label="Close provider filter"
                  onClick={() => setProviderMenuOpen(false)}
                />
                <div className="absolute left-0 z-40 mt-2 w-64 overflow-hidden border border-border bg-surface p-1.5 shadow-xl shadow-black/10" role="menu" aria-label="Provider filter">
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={providerFilter === "all"}
                    onClick={() => {
                      setProviderFilter("all");
                      onResetPage();
                      setProviderMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${providerFilter === "all" ? "bg-primary/10 text-primary" : "text-text-primary hover:bg-surface-2"}`}
                  >
                    <span className="material-symbols-outlined text-[21px]" aria-hidden="true">apps</span>
                    <span className="font-medium">All providers</span>
                    {providerFilter === "all" && <span className="material-symbols-outlined ml-auto text-[19px]" aria-hidden="true">check</span>}
                  </button>
                  <div className="my-1 h-px bg-border" />
                  <div className="max-h-72 overflow-y-auto pr-1">
                    {providerOptions.map((provider) => (
                      <button
                        key={provider}
                        type="button"
                        role="menuitemradio"
                        aria-checked={providerFilter === provider}
                        onClick={() => {
                          setProviderFilter(provider);
                          onResetPage();
                          setProviderMenuOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${providerFilter === provider ? "bg-primary/10 text-primary" : "text-text-primary hover:bg-surface-2"}`}
                      >
                        <ProviderIcon
                          src={`/providers/${provider}.png`}
                          alt=""
                          size={24}
                          className="size-6 object-contain"
                          fallbackText={provider.slice(0, 2).toUpperCase()}
                        />
                        <span className="font-medium capitalize">{provider}</span>
                        {providerFilter === provider && <span className="material-symbols-outlined ml-auto text-[19px]" aria-hidden="true">check</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <label className="flex h-9 items-center gap-2 border border-border bg-surface px-2.5 text-xs text-text-muted">
            <span className="hidden sm:inline">Status</span>
            <select
              value={accountFilter}
              onChange={(event) => {
                setAccountFilter(event.target.value);
                onResetPage();
              }}
              className="bg-transparent text-xs text-text-primary outline-none"
              aria-label="Filter accounts by status"
            >
              {ACCOUNT_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          {providerFilter === "codex" && (
            <label className="flex h-9 items-center gap-2 border border-border bg-surface px-2.5 text-xs text-text-muted">
              <span className="hidden md:inline">Sort</span>
              <select
                value={quotaSortMode}
                onChange={(event) => setQuotaSortMode(event.target.value)}
                className="bg-transparent text-xs text-text-primary outline-none"
                aria-label="Sort Codex quotas by remaining"
              >
                {QUOTA_SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          )}

          <button
            type="button"
            onClick={() => setExpiringFirst((prev) => !prev)}
            aria-pressed={expiringFirst}
            className={`flex h-9 shrink-0 items-center gap-1.5 border px-2.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${expiringFirst ? "border-brand-500/40 bg-brand-500/10 text-brand-700 dark:text-brand-300" : "border-border bg-surface text-text-primary hover:bg-surface-2"}`}
            title="Sort accounts by earliest quota reset time"
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">hourglass_top</span>
            <span>Expiring first</span>
          </button>

          {hasFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="flex h-9 items-center gap-1.5 px-2 text-xs font-medium text-text-muted transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <span className="material-symbols-outlined text-[15px]" aria-hidden="true">close</span>
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            icon="block"
            disabled={bulkToggling}
            onClick={onDisableDepleted}
            title="Turn off empty accounts on the current page"
          >
            Turn off empty <span className="hidden sm:inline">(this page)</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            icon="check_circle"
            disabled={bulkToggling}
            onClick={onEnableAvailable}
            title="Turn on available accounts on the current page"
          >
            Turn on available <span className="hidden sm:inline">(this page)</span>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRefresh((prev) => !prev)}
            className="flex h-9 items-center gap-1.5 border border-border bg-surface px-2.5 text-xs text-text-primary transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            aria-pressed={autoRefresh}
            title={autoRefresh ? "Disable auto-refresh" : "Enable auto-refresh"}
          >
            <span className={`material-symbols-outlined text-[16px] ${autoRefresh ? "text-primary" : "text-text-muted"}`} aria-hidden="true">
              {autoRefresh ? "toggle_on" : "toggle_off"}
            </span>
            <span>{autoRefresh ? "Auto-refresh" : "Refresh manually"}</span>
            {autoRefresh && <span className="text-[10px] text-text-muted tabular-nums">{countdown}s</span>}
          </button>
          <Button
            type="button"
            size="sm"
            icon="refresh"
            loading={refreshingAll}
            disabled={refreshingAll}
            onClick={() => refreshAll(true)}
            aria-label="Refresh all quotas"
          >
            <span className="hidden sm:inline">Refresh all</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
