"use client";

import { useState } from "react";
import { Toggle } from "@/shared/components";

// PATCH { enabled } on a tool's settings route: false restores the user's original
// config (own login / subscription), true re-applies the last PolyRouter settings.
export async function setPolyRouterEnabled(toolId, enabled) {
  const res = await fetch(`/api/cli-tools/${toolId}-settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Failed to ${enabled ? "connect" : "disconnect"}`);
  return data;
}

export default function PolyRouterSwitch({ toolId, toolName, status, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const connected = !!status?.hasPolyRouter;
  const canToggle = connected || !!status?.canReconnect;

  const handleChange = async (enabled) => {
    setBusy(true);
    setMessage(null);
    try {
      await setPolyRouterEnabled(toolId, enabled);
      setMessage({
        type: "success",
        text: enabled
          ? `${toolName} routes through PolyRouter again. Restart ${toolName} to apply.`
          : `Original ${toolName} settings restored. Restart ${toolName} to use your own login.`,
      });
      await onChanged?.();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const description = connected
    ? `${toolName} requests go through PolyRouter. Turn off to go back to your own login/subscription — PolyRouter settings are kept for later.`
    : status?.canReconnect
      ? `${toolName} uses its own login/subscription. Turn on to route through PolyRouter with your saved settings.`
      : `${toolName} is not using PolyRouter. Configure below and click Apply to connect.`;

  return (
    <div className="flex flex-col gap-2 border border-border bg-surface/40 p-3">
      <Toggle
        checked={connected}
        onChange={handleChange}
        disabled={busy || !canToggle}
        label="Use PolyRouter"
        description={description}
      />
      {message && (
        <div className={`flex items-center gap-2 px-2 py-1.5 text-xs ${message.type === "success" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
          <span className="material-symbols-outlined text-[14px]">{message.type === "success" ? "check_circle" : "error"}</span>
          <span>{message.text}</span>
        </div>
      )}
    </div>
  );
}
