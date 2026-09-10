"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Card from "./Card";
import Badge from "./Badge";
import ProviderIcon from "./ProviderIcon";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";

export default function RequestLogger() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { copied, copy } = useCopyToClipboard();

  const fetchLogs = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/usage/request-logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function loadInitial() {
      try {
        const res = await fetch("/api/usage/request-logs");
        if (res.ok && active) {
          const data = await res.json();
          setLogs(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to fetch logs:", error);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadInitial();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchLogs(false);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  // Filter logs based on search query
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase().trim();
    return logs.filter((log) => log.toLowerCase().includes(q));
  }, [logs, searchQuery]);

  return (
    <div className="flex flex-col gap-4">
      {/* Top Controls Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-brand-600 dark:text-brand-400">
              terminal
            </span>
            <h2 className="text-base font-semibold tracking-tight text-text-main">
              Live Gateway Request Logs
            </h2>
            <span className="bg-surface-2 px-2 py-0.5 font-mono text-[10px] text-text-muted">
              {filteredLogs.length} events
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Real-time feed of traffic passing through PolyRouter
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Filter */}
          <div className="relative w-full sm:w-60">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[15px] text-text-muted">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="h-8 w-full border border-border bg-surface pl-8 pr-7 text-xs text-text-main placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main cursor-pointer"
              >
                <span className="material-symbols-outlined text-[13px]">close</span>
              </button>
            )}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchLogs(true)}
            className="flex items-center gap-1 h-8 border border-border bg-surface px-2.5 text-xs text-text-muted hover:text-text-main hover:bg-surface-2 transition-colors cursor-pointer"
            title="Refresh logs"
          >
            <span className="material-symbols-outlined text-[15px]">refresh</span>
          </button>

          {/* Auto Refresh Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 h-8 px-3 text-xs font-medium border transition-colors cursor-pointer ${
              autoRefresh
                ? "border-brand-500/30 bg-brand-500/10 text-brand-600 dark:text-brand-400"
                : "border-border bg-surface text-text-muted hover:bg-surface-2"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                autoRefresh ? "bg-brand-500 animate-pulse" : "bg-text-muted"
              }`}
            />
            <span>{autoRefresh ? "Auto-refresh (3s)" : "Paused"}</span>
          </button>
        </div>
      </div>

      {/* Log Output Table */}
      <Card
        className="overflow-hidden border border-border bg-surface shadow-[var(--shadow-soft)]"
        padding="none"
      >
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto font-mono text-xs">
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center gap-2 p-12 text-text-muted">
              <span className="material-symbols-outlined animate-spin text-[24px] text-brand-500">
                progress_activity
              </span>
              <span>Loading live stream...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-12 text-center text-text-muted">
              <span className="material-symbols-outlined text-[32px] opacity-30">terminal</span>
              <span>
                {searchQuery ? `No logs match "${searchQuery}"` : "No logs recorded yet."}
              </span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 bg-surface-2/80 backdrop-blur-xs border-b border-border z-10 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="px-3 py-2.5 border-r border-border/60">DateTime</th>
                  <th className="px-3 py-2.5 border-r border-border/60">Model</th>
                  <th className="px-3 py-2.5 border-r border-border/60">Provider</th>
                  <th className="px-3 py-2.5 border-r border-border/60">Account</th>
                  <th className="px-3 py-2.5 border-r border-border/60 text-right">In</th>
                  <th className="px-3 py-2.5 border-r border-border/60 text-right">Out</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-center">Copy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredLogs.map((log, i) => {
                  const parts = log.split(" | ");
                  if (parts.length < 7) return null;

                  const status = parts[6]?.trim();
                  const isPending = status.includes("PENDING");
                  const isFailed = status.includes("FAILED");
                  const isSuccess = status.includes("OK");
                  const provider = parts[2]?.trim();

                  return (
                    <tr
                      key={i}
                      className={`transition-colors hover:bg-surface-2/60 ${
                        isPending ? "bg-brand-500/5" : ""
                      }`}
                    >
                      <td className="px-3 py-2 border-r border-border/60 text-text-muted">
                        {parts[0]}
                      </td>
                      <td className="px-3 py-2 border-r border-border/60 font-medium text-text-main">
                        {parts[1]}
                      </td>
                      <td className="px-3 py-2 border-r border-border/60">
                        <div className="flex items-center gap-1.5">
                          <ProviderIcon providerId={provider.toLowerCase()} size={14} />
                          <span className="font-sans text-[11px] font-medium text-text-main">
                            {provider}
                          </span>
                        </div>
                      </td>
                      <td
                        className="px-3 py-2 border-r border-border/60 truncate max-w-[160px] text-text-muted"
                        title={parts[3]}
                      >
                        {parts[3]}
                      </td>
                      <td className="px-3 py-2 border-r border-border/60 text-right font-mono text-brand-600 dark:text-brand-400">
                        {parts[4]}
                      </td>
                      <td className="px-3 py-2 border-r border-border/60 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {parts[5]}
                      </td>
                      <td className="px-3 py-2 border-r border-border/60 text-center">
                        <Badge
                          variant={isSuccess ? "success" : isFailed ? "error" : "primary"}
                          size="sm"
                          dot
                        >
                          {status}
                        </Badge>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => copy(log, `log-${i}`)}
                          className="inline-flex items-center justify-center size-6 text-text-muted hover:text-text-main hover:bg-surface-2 transition-colors cursor-pointer"
                          title="Copy log entry"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {copied === `log-${i}` ? "check" : "content_copy"}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
      <div className="flex items-center justify-between text-[11px] text-text-muted">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px]">info</span>
          Logs are streamed directly from PolyRouter server runtime history.
        </span>
      </div>
    </div>
  );
}
