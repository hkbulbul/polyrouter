"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Toggle, Button } from "@/shared/components";
import { officeApi } from "@/shared/components/office/officeClient";

export const OFFICE_MODE_EVENT = "polyrouter:office-mode-changed";

// Settings entry point for Office mode: the on/off switch plus a link to manage it.
export default function OfficeModeCard() {
  const [state, setState] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    officeApi("/api/office/admin/settings")
      .then(setState)
      .catch((e) => setError(e.message));
  }, []);

  const toggle = async (enabled) => {
    setSaving(true);
    setError("");
    try {
      const next = await officeApi("/api/office/admin/settings", { method: "PUT", body: { enabled } });
      setState(next);
      window.dispatchEvent(new CustomEvent(OFFICE_MODE_EVENT, { detail: { enabled: next.office.enabled } }));
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const enabled = state?.office?.enabled === true;

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-500/10 text-indigo-500 shrink-0">
          <span className="material-symbols-outlined text-[20px]">corporate_fare</span>
        </div>
        <h3 className="text-base sm:text-lg font-semibold">Office mode</h3>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex items-start sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm sm:text-base">Share this PolyRouter with your team</p>
            <p className="text-xs sm:text-sm text-text-muted">
              Add employees with email and password, set usage limits and budgets, and see a leaderboard and cost analytics.
              Employees sign in at <code className="bg-surface-2 px-1">/portal</code> or with the PolyRouter client.
            </p>
          </div>
          <Toggle checked={enabled} onChange={toggle} disabled={!state || saving} />
        </div>
        {state && !state.hasAdminPassword && !enabled && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Turn on “Require login” and set a dashboard password in Security above before turning on Office mode.
          </p>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        {enabled && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border/50">
            <p className="text-sm text-text-muted">
              {state.counts.activeUsers} active employee{state.counts.activeUsers === 1 ? "" : "s"} · {state.counts.policies} polic{state.counts.policies === 1 ? "y" : "ies"}.
              Login is always required while Office mode is on.
            </p>
            <Link href="/dashboard/office" className="shrink-0">
              <Button size="sm" icon="arrow_forward" className="whitespace-nowrap">Manage office</Button>
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}
