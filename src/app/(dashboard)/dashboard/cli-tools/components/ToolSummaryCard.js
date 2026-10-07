"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, Toggle } from "@/shared/components";
import { setPolyRouterEnabled } from "./PolyRouterSwitch";

// Derive simple connected/configured/not-installed status from API payload
function getStatus(status) {
  if (!status) return { label: "Unknown", cls: "bg-gray-500/10 text-gray-500" };
  if (!status.installed) return { label: "Not installed", cls: "bg-gray-500/10 text-gray-500" };
  if (status.updateRequired) return { label: "Update required", cls: "bg-orange-500/10 text-orange-600 dark:text-orange-400" };
  if (status.hasPolyRouter) return { label: "Connected", cls: "bg-green-500/10 text-green-600 dark:text-green-400" };
  if (status.canReconnect) return { label: "Using own login", cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400" };
  return { label: "Not configured", cls: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" };
}

export default function ToolSummaryCard({ toolId, tool, status, onStatusChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const s = getStatus(status);
  const showSwitch = tool.supportsDisconnect && status?.installed && (status.hasPolyRouter || status.canReconnect);

  const handleToggle = async (enabled) => {
    setBusy(true);
    setError(null);
    try {
      await setPolyRouterEnabled(toolId, enabled);
      const res = await fetch(`/api/cli-tools/${toolId}-settings`);
      if (res.ok) onStatusChange?.(toolId, await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card padding="sm" className="relative h-full overflow-hidden hover:border-primary/50 transition-colors">
      <div className="flex h-full flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="size-8 flex items-center justify-center shrink-0">
            {tool.image ? (
              <Image src={tool.image} alt={tool.name} width={32} height={32} className="size-8 object-contain " sizes="32px" onError={(e) => { e.target.style.display = "none"; }} loading="lazy" decoding="async" />
            ) : tool.icon ? (
              <span className="material-symbols-outlined text-[28px]" style={{ color: tool.color }}>{tool.icon}</span>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            {/* Stretched link: the whole card opens the tool, the switch stays clickable on top */}
            <Link href={`/dashboard/cli-tools/${toolId}`} className="after:absolute after:inset-0">
              <h3 className="font-medium text-sm truncate">{tool.name}</h3>
            </Link>
            <span className={`inline-block mt-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full ${s.cls}`}>{s.label}</span>
          </div>
          {showSwitch ? (
            <div className="relative z-10 shrink-0" title={status.hasPolyRouter ? `Stop using PolyRouter — ${tool.name} goes back to your own login` : `Route ${tool.name} through PolyRouter again`}>
              <Toggle size="sm" checked={!!status.hasPolyRouter} onChange={handleToggle} disabled={busy} />
            </div>
          ) : (
            <span className="material-symbols-outlined text-text-muted text-[18px] shrink-0">chevron_right</span>
          )}
        </div>
        {error && <p className="relative z-10 text-[11px] text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </Card>
  );
}
