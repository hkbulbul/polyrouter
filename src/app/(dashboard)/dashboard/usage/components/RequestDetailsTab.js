"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/shared/components/Card";
import Button from "@/shared/components/Button";
import Drawer from "@/shared/components/Drawer";
import Badge from "@/shared/components/Badge";
import ProviderIcon from "@/shared/components/ProviderIcon";
import Pagination from "@/shared/components/Pagination";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import { cn } from "@/shared/utils/cn";
import { getRequestCostPresentation } from "@/shared/utils/requestCost";
import { AI_PROVIDERS, getProviderByAlias } from "@/shared/constants/providers";

let providerNameCache = null;
let providerNodesCache = null;

async function fetchProviderNames() {
  if (providerNameCache && providerNodesCache) {
    return { providerNameCache, providerNodesCache };
  }

  const nodesRes = await fetch("/api/provider-nodes");
  const nodesData = await nodesRes.json();
  const nodes = nodesData.nodes || [];
  providerNodesCache = {};

  for (const node of nodes) {
    providerNodesCache[node.id] = node.name;
  }

  providerNameCache = {
    ...AI_PROVIDERS,
    ...providerNodesCache
  };

  return { providerNameCache, providerNodesCache };
}

function getProviderName(providerId, cache) {
  if (!providerId) return providerId;
  if (!cache) return providerId;

  const cached = cache[providerId];

  if (typeof cached === 'string') {
    return cached;
  }

  if (cached?.name) {
    return cached.name;
  }

  const providerConfig = getProviderByAlias(providerId) || AI_PROVIDERS[providerId];
  return providerConfig?.name || providerId;
}

function CollapsibleSection({ title, children, defaultOpen = false, icon = null, copyText = null, copyId = null }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { copied, copy } = useCopyToClipboard();

  return (
    <div className="border border-border bg-surface overflow-hidden shadow-xs">
      <div className="w-full flex items-center justify-between p-3 bg-surface-2/50 hover:bg-surface-2 transition-colors">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex items-center gap-2 text-left"
        >
          {icon && <span className="material-symbols-outlined text-[18px] text-text-muted">{icon}</span>}
          <span className="font-semibold text-sm text-text-main">{title}</span>
        </button>
        <div className="flex items-center gap-2">
          {copyText && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                copy(copyText, copyId || title);
              }}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-border bg-surface text-text-muted hover:text-text-main hover:bg-surface-2 transition-colors cursor-pointer"
              title="Copy to clipboard"
            >
              <span className="material-symbols-outlined text-[14px]">
                {copied === (copyId || title) ? "check" : "content_copy"}
              </span>
              <span>{copied === (copyId || title) ? "Copied!" : "Copy"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-text-muted hover:text-text-main p-1 cursor-pointer"
          >
            <span className={cn(
              "material-symbols-outlined text-[20px] transition-transform duration-200 block",
              isOpen ? "rotate-90" : ""
            )}>
              chevron_right
            </span>
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
}

function getCachedTokens(tokens) {
  return tokens?.cached_tokens || tokens?.cache_read_input_tokens || 0;
}

function getCacheCreationTokens(tokens) {
  return tokens?.cache_creation_input_tokens || 0;
}

function getInputTokens(tokens) {
  const prompt = tokens?.prompt_tokens || tokens?.input_tokens || 0;
  // Canonical storage keeps prompt cache-inclusive. Legacy Claude rows may have
  // stored prompt cache-exclusive; fall back to cache when it's larger so old
  // rows don't under-report input.
  const cache = getCachedTokens(tokens);
  return prompt < cache ? cache : prompt;
}

function getStatusPresentation(status, error) {
  const normalizedStatus = typeof status === "string" ? status.toLowerCase() : "";
  const isSuccess = normalizedStatus === "success" || normalizedStatus === "ok" || (!normalizedStatus && !error);
  const isError = normalizedStatus === "error" || normalizedStatus === "failed" || Boolean(error);

  return {
    label: status || (isError ? "failed" : "success"),
    variant: isSuccess ? "success" : isError ? "error" : "default"
  };
}

function RequestCostCell({ costBreakdown }) {
  const cost = getRequestCostPresentation(costBreakdown);

  return (
    <td
      className="px-4 py-3 text-right font-mono text-xs text-text-main"
      title={cost.available ? "Rate-based estimate; not a provider invoice." : cost.reason}
    >
      <div className="flex flex-col items-end gap-0.5 leading-tight">
        <span className="font-semibold">{cost.total}</span>
        <span className="text-[10px] text-text-muted">
          {cost.available ? `Input ${cost.input} · Output ${cost.output}` : cost.reason}
        </span>
      </div>
    </td>
  );
}

function RequestCostBreakdown({ costBreakdown }) {
  const cost = getRequestCostPresentation(costBreakdown);
  const componentRows = [
    ["Input", cost.components?.input],
    ["Cached", cost.components?.cached],
    ["Cache creation", cost.components?.cacheCreation],
    ["Output", cost.components?.output],
    ["Reasoning", cost.components?.reasoning]
  ];
  const rateRows = [
    ["Input", cost.rates?.input],
    ["Cached", cost.rates?.cached],
    ["Cache creation", cost.rates?.cacheCreation],
    ["Output", cost.rates?.output],
    ["Reasoning", cost.rates?.reasoning]
  ];
  const hasRates = rateRows.some(([, value]) => value && value !== "—");

  return (
    <div className="border border-border bg-surface-2/30 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-text-muted">payments</span>
        <span className="font-semibold text-sm text-text-main">Cost (USD)</span>
        <Badge variant={cost.available ? "info" : "default"} size="sm">
          {cost.available ? "Estimate" : "Unavailable"}
        </Badge>
        {cost.basis === "current-pricing" && (
          <Badge variant="warning" size="sm">Current pricing</Badge>
        )}
      </div>

      <p className="mb-4 text-xs text-text-muted">
        Rate-based estimate; not a provider invoice.
        {cost.estimated ? " Token usage is estimated." : ""}
      </p>

      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <div>
          <span className="block text-xs text-text-muted">Total</span>
          <span className="font-mono font-semibold text-text-main">{cost.total}</span>
        </div>
        <div>
          <span className="block text-xs text-text-muted">Input</span>
          <span className="font-mono text-text-main">{cost.input}</span>
        </div>
        <div>
          <span className="block text-xs text-text-muted">Output</span>
          <span className="font-mono text-text-main">{cost.output}</span>
        </div>
      </div>

      {cost.available ? (
        <>
          <div className="mt-4 border-t border-border pt-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Component breakdown</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-5">
              {componentRows.map(([label, value]) => (
                <div key={label}>
                  <span className="block text-xs text-text-muted">{label}</span>
                  <span className="font-mono text-text-main">{value || "—"}</span>
                </div>
              ))}
            </div>
          </div>

          {hasRates && (
            <details className="mt-4 border-t border-border pt-3">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-text-muted hover:text-text-main">
                Rates per 1M tokens
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-5">
                {rateRows.map(([label, value]) => (
                  <div key={label}>
                    <span className="block text-xs text-text-muted">{label}</span>
                    <span className="font-mono text-text-main">{value || "—"}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      ) : (
        <p className="mt-4 border-t border-border pt-3 text-xs text-text-muted">{cost.reason}</p>
      )}
    </div>
  );
}

export default function RequestDetailsTab() {
  const [details, setDetails] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [providers, setProviders] = useState([]);
  const [providerNameCache, setProviderNameCache] = useState(null);
  const [filters, setFilters] = useState({
    provider: "",
    model: "",
    status: "",
    startDate: "",
    endDate: ""
  });

  useEffect(() => {
    let active = true;
    async function loadProviders() {
      try {
        const res = await fetch("/api/usage/providers");
        if (res.ok && active) {
          const data = await res.json();
          setProviders(data.providers || []);
        }

        const cache = await fetchProviderNames();
        if (active) {
          setProviderNameCache(cache.providerNameCache);
        }
      } catch (error) {
        console.error("Failed to fetch providers:", error);
      }
    }
    loadProviders();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadDetails() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: pagination.page.toString(),
          pageSize: pagination.pageSize.toString(),
        });
        if (filters.provider) params.append("provider", filters.provider);
        if (filters.model) params.append("model", filters.model);
        if (filters.status) params.append("status", filters.status);
        if (filters.startDate) params.append("startDate", filters.startDate);
        if (filters.endDate) params.append("endDate", filters.endDate);

        const res = await fetch(`/api/usage/request-details?${params}`);
        if (res.ok && active) {
          const data = await res.json();
          setDetails(data.details || []);
          setPagination((prev) => ({ ...prev, ...data.pagination }));
        }
      } catch (error) {
        console.error("Failed to fetch request details:", error);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDetails();
    return () => {
      active = false;
    };
  }, [pagination.page, pagination.pageSize, filters]);

  const handleViewDetail = (detail) => {
    setSelectedDetail(detail);
    setIsDrawerOpen(true);
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newPageSize) => {
    setPagination(prev => ({ ...prev, pageSize: newPageSize, page: 1 }));
  };

  const handleClearFilters = () => {
    setFilters({ provider: "", model: "", status: "", startDate: "", endDate: "" });
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Card padding="md" className="border border-border bg-surface shadow-[var(--shadow-soft)]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="model-search" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Model
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-text-muted">
                search
              </span>
              <input
                id="model-search"
                type="text"
                placeholder="Filter model..."
                value={filters.model}
                onChange={(e) => setFilters({ ...filters, model: e.target.value })}
                className="h-9 w-full border border-border bg-surface pl-8 pr-3 text-xs text-text-main placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="provider-filter" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Provider
            </label>
            <select
              id="provider-filter"
              value={filters.provider}
              onChange={(e) => setFilters({ ...filters, provider: e.target.value })}
              className="h-9 border border-border bg-surface px-3 text-xs text-text-main focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
              style={{ colorScheme: 'auto' }}
            >
              <option value="">All Providers</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="status-filter" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Status
            </label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="h-9 border border-border bg-surface px-3 text-xs text-text-main focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
              style={{ colorScheme: 'auto' }}
            >
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="start-date-filter" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Start Date
            </label>
            <input
              id="start-date-filter"
              type="datetime-local"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="h-9 border border-border bg-surface px-3 text-xs text-text-main focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="end-date-filter" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                End Date
              </label>
              {(filters.provider || filters.model || filters.status || filters.startDate || filters.endDate) && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-[11px] font-medium text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
            <input
              id="end-date-filter"
              type="datetime-local"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="h-9 border border-border bg-surface px-3 text-xs text-text-main focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>
      </Card>

      <Card padding="none" className="border border-border bg-surface shadow-[var(--shadow-soft)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-xs sm:text-sm">
            <thead className="border-b border-border bg-surface-2/60 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Input Tokens</th>
                <th className="px-4 py-3 text-right">Cached</th>
                <th className="px-4 py-3 text-right">Cache Creation</th>
                <th className="px-4 py-3 text-right">Output Tokens</th>
                <th className="px-4 py-3 text-right">Cost (USD)</th>
                <th className="px-4 py-3">Latency</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan="11" className="p-12 text-center text-text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-[24px] text-brand-500">progress_activity</span>
                      <span>Loading request records...</span>
                    </div>
                  </td>
                </tr>
              ) : details.length === 0 ? (
                <tr>
                  <td colSpan="11" className="p-12 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[32px] opacity-30">receipt_long</span>
                      <span>No request details found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                details.map((detail, index) => {
                  const status = getStatusPresentation(detail.status, detail.error);
                  return (
                    <tr
                      key={`${detail.id}-${index}`}
                      onClick={() => handleViewDetail(detail)}
                      className="cursor-pointer bg-surface transition-colors hover:bg-surface-2/60"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-text-muted font-mono">
                        {new Date(detail.timestamp).toLocaleString()}
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3 font-mono text-xs font-semibold text-text-main" title={detail.model}>
                        {detail.model}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <ProviderIcon providerId={detail.provider} size={15} />
                          <span className="truncate text-xs font-medium text-text-main">
                            {getProviderName(detail.provider, providerNameCache)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={status.variant} size="sm" dot>
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-text-main">
                        {getInputTokens(detail.tokens).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-blue-600 dark:text-blue-400">
                        {getCachedTokens(detail.tokens) > 0 ? getCachedTokens(detail.tokens).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-purple-600 dark:text-purple-400">
                        {getCacheCreationTokens(detail.tokens) > 0 ? getCacheCreationTokens(detail.tokens).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">
                        {detail.tokens?.completion_tokens?.toLocaleString() || 0}
                      </td>
                      <RequestCostCell costBreakdown={detail.costBreakdown} />
                      <td className="px-4 py-3 text-xs text-text-muted font-mono">
                        <div className="flex flex-col gap-0.5 leading-tight">
                          <span>TTFT: <strong className="text-text-main">{detail.latency?.ttft || 0}ms</strong></span>
                          <span>Total: <span>{detail.latency?.total || 0}ms</span></span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetail(detail)}
                        >
                          Detail
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && details.length > 0 && (
          <div className="border-t border-black/5 dark:border-white/5">
            <Pagination
              currentPage={pagination.page}
              pageSize={pagination.pageSize}
              totalItems={pagination.totalItems}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </Card>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Request Details"
        width="lg"
      >
        {selectedDetail && (
          <div className="space-y-6">
            <div className="grid min-w-0 grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <span className="text-text-muted">ID:</span>{" "}
                <span className="break-all font-mono text-text-main">{selectedDetail.id}</span>
              </div>
              <div>
                <span className="text-text-muted">Timestamp:</span>{" "}
                <span className="text-text-main">{new Date(selectedDetail.timestamp).toLocaleString()}</span>
              </div>
              <div>
                 <span className="text-text-muted">Provider:</span>{" "}
                 <span className="text-text-main font-medium">{getProviderName(selectedDetail.provider, providerNameCache)}</span>
               </div>
              <div>
                <span className="text-text-muted">Model:</span>{" "}
                <span className="text-text-main font-mono">{selectedDetail.model}</span>
              </div>
              <div>
                <span className="text-text-muted">Status:</span>{" "}
                <span className={cn(
                  "font-medium",
                  selectedDetail.status === "success" ? "text-green-600" : "text-red-600"
                )}>
                  {selectedDetail.status}
                </span>
              </div>
              <div>
                <span className="text-text-muted">Latency:</span>{" "}
                <span className="text-text-main font-mono">
                  TTFT {selectedDetail.latency?.ttft || 0}ms / Total {selectedDetail.latency?.total || 0}ms
                </span>
              </div>
              <div>
                <span className="text-text-muted">Input Tokens:</span>{" "}
                <span className="text-text-main font-mono">
                  {getInputTokens(selectedDetail.tokens).toLocaleString()}
                </span>
              </div>
              {getCachedTokens(selectedDetail.tokens) > 0 && (
                <div>
                  <span className="text-text-muted">Cached Tokens:</span>{" "}
                  <span className="text-text-main font-mono">
                    {getCachedTokens(selectedDetail.tokens).toLocaleString()}
                  </span>
                </div>
              )}
              {getCacheCreationTokens(selectedDetail.tokens) > 0 && (
                <div>
                  <span className="text-text-muted">Cache Creation:</span>{" "}
                  <span className="text-text-main font-mono">
                    {getCacheCreationTokens(selectedDetail.tokens).toLocaleString()}
                  </span>
                </div>
              )}
              <div>
                <span className="text-text-muted">Output Tokens:</span>{" "}
                <span className="text-text-main font-mono">
                  {selectedDetail.tokens?.completion_tokens?.toLocaleString() || 0}
                </span>
              </div>
            </div>

            <RequestCostBreakdown costBreakdown={selectedDetail.costBreakdown} />

            {selectedDetail.pxpipe && (
              <div className=" border border-black/5 dark:border-white/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[18px] text-text-muted">image</span>
                  <span className="font-semibold text-sm text-text-main">PXPIPE</span>
                  <span className={cn(
                    "text-xs px-2 py-0.5 ",
                    selectedDetail.pxpipe.applied
                      ? "bg-green-500/15 text-green-600"
                      : "bg-green-500/15 text-green-600"
                  )}>
                    {selectedDetail.pxpipe.applied ? "Activated" : "Skipped"}
                  </span>
                </div>
                {selectedDetail.pxpipe.applied ? (
                  <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    <div>
                      <span className="text-text-muted block text-xs">Original (est.)</span>
                      <span className="font-mono">{(selectedDetail.pxpipe.tokensBeforeEst || 0).toLocaleString()} tokens</span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-xs">Compressed (est.)</span>
                      <span className="font-mono">{(selectedDetail.pxpipe.tokensAfterEst || 0).toLocaleString()} tokens</span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-xs">Saved</span>
                      <span className="font-mono text-green-600">{selectedDetail.pxpipe.savedPct || 0}%</span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-xs">Images</span>
                      <span className="font-mono">{selectedDetail.pxpipe.imageCount || 0} ({selectedDetail.pxpipe.durationMs || 0}ms)</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">
                    Reason: <span className="font-mono">{selectedDetail.pxpipe.reason}</span>
                    {selectedDetail.pxpipe.detail ? ` — ${selectedDetail.pxpipe.detail}` : ""}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-4">
              <CollapsibleSection
                title="1. Client Request (Input)"
                defaultOpen={true}
                icon="input"
                copyText={JSON.stringify(selectedDetail.request, null, 2)}
                copyId="client-request"
              >
                <pre className="max-h-[300px] max-w-full overflow-auto border border-border bg-bg-subtle/70 p-3 font-mono text-xs text-text-main sm:p-4">
                  {JSON.stringify(selectedDetail.request, null, 2)}
                </pre>
              </CollapsibleSection>

              {selectedDetail.providerRequest && (
                <CollapsibleSection
                  title="2. Provider Request (Translated)"
                  icon="translate"
                  copyText={JSON.stringify(selectedDetail.providerRequest, null, 2)}
                  copyId="provider-request"
                >
                  <pre className="max-h-[300px] max-w-full overflow-auto border border-border bg-bg-subtle/70 p-3 font-mono text-xs text-text-main sm:p-4">
                    {JSON.stringify(selectedDetail.providerRequest, null, 2)}
                  </pre>
                </CollapsibleSection>
              )}

              {selectedDetail.providerResponse && (
                <CollapsibleSection
                  title="3. Provider Response (Raw)"
                  icon="data_object"
                  copyText={typeof selectedDetail.providerResponse === 'object'
                    ? JSON.stringify(selectedDetail.providerResponse, null, 2)
                    : String(selectedDetail.providerResponse)
                  }
                  copyId="provider-response"
                >
                  <pre className="max-h-[300px] max-w-full overflow-auto border border-border bg-bg-subtle/70 p-3 font-mono text-xs text-text-main sm:p-4">
                    {typeof selectedDetail.providerResponse === 'object'
                      ? JSON.stringify(selectedDetail.providerResponse, null, 2)
                      : selectedDetail.providerResponse
                    }
                  </pre>
                </CollapsibleSection>
              )}

              <CollapsibleSection
                title="4. Client Response (Final)"
                defaultOpen={true}
                icon="output"
                copyText={selectedDetail.response?.content || ""}
                copyId="client-response"
              >
                {selectedDetail.response?.thinking && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-text-main mb-2 flex items-center gap-2 text-xs uppercase tracking-wide opacity-70">
                      <span className="material-symbols-outlined text-[16px]">psychology</span>
                      Thinking Process
                    </h4>
                    <pre className="max-h-[200px] max-w-full overflow-auto border border-green-500/20 bg-green-500/5 p-3 font-mono text-xs text-green-700 dark:text-green-300 sm:p-4">
                      {selectedDetail.response.thinking}
                    </pre>
                  </div>
                )}

                <h4 className="font-semibold text-text-main mb-2 text-xs uppercase tracking-wide opacity-70">
                  Content
                </h4>
                <pre className="max-h-[300px] max-w-full overflow-auto border border-border bg-bg-subtle/70 p-3 font-mono text-xs text-text-main sm:p-4">
                  {selectedDetail.response?.content || "[No content]"}
                </pre>
              </CollapsibleSection>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
