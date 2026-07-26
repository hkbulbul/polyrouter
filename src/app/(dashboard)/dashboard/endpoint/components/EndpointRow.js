"use client";

import { Input } from "@/shared/components";

/**
 * One endpoint connection row: [label] [url or status] [actions]
 *
 * Label column is fixed-width so Local / Tunnel / Tailscale align vertically.
 * `status` renders a pill in place of the URL field for pending/error states.
 */
export default function EndpointRow({
  label,
  active = false,
  url,
  copyId,
  copied,
  onCopy,
  status,
  actions,
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-[11px] font-mono font-semibold uppercase tracking-wide px-2 py-1 shrink-0 w-[84px] text-center border ${
          active
            ? "bg-primary/10 text-primary border-primary/25"
            : "bg-surface-2 text-text-muted border-transparent"
        }`}
      >
        {label}
      </span>

      {status ? (
        <StatusPill {...status} />
      ) : (
        <>
          <Input value={url} readOnly className="flex-1" inputClassName="font-mono text-sm py-2" />
          <button
            onClick={() => onCopy(url, copyId)}
            title="Copy endpoint"
            className="p-2 hover:bg-black/5 dark:hover:bg-white/5 text-text-muted hover:text-primary transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">
              {copied === copyId ? "check" : "content_copy"}
            </span>
          </button>
        </>
      )}

      {actions}
    </div>
  );
}

const TONES = {
  pending: "border-border bg-surface-2 text-text-muted",
  error: "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400",
};

function StatusPill({ tone = "pending", icon, spin = false, message }) {
  return (
    <div
      className={`flex-1 min-w-0 flex items-center gap-2 px-3 py-2 border text-sm ${TONES[tone] || TONES.pending}`}
    >
      <span
        className={`material-symbols-outlined text-[16px] shrink-0 ${spin ? "animate-spin" : ""}`}
      >
        {icon || (spin ? "progress_activity" : "info")}
      </span>
      <span className="truncate">{message}</span>
    </div>
  );
}
