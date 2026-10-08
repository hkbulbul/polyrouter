"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, Button, SegmentedControl, CardSkeleton } from "@/shared/components";
import { officeApi } from "@/shared/components/office/officeClient";
import OverviewTab from "./components/OverviewTab";
import MembersTab from "./components/MembersTab";
import TeamsTab from "./components/TeamsTab";
import PoliciesTab from "./components/PoliciesTab";
import AnalyticsTab from "./components/AnalyticsTab";
import AuditTab from "./components/AuditTab";

const TABS = [
  { value: "overview", label: "Overview", icon: "dashboard" },
  { value: "members", label: "Employees", icon: "group" },
  { value: "teams", label: "Teams", icon: "groups" },
  { value: "policies", label: "Limits", icon: "tune" },
  { value: "analytics", label: "Leaderboard & Costs", icon: "leaderboard" },
  { value: "audit", label: "Audit log", icon: "history" },
];

export default function OfficePageClient() {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  // Policies and teams are needed by several tabs; refreshed after edits.
  const [policies, setPolicies] = useState([]);
  const [teams, setTeams] = useState([]);

  const loadSettings = useCallback(
    () => officeApi("/api/office/admin/settings").then(setSettings).catch((e) => setError(e.message)),
    []
  );

  const loadRefs = useCallback(
    () =>
      Promise.all([officeApi("/api/office/admin/policies"), officeApi("/api/office/admin/teams")])
        .then(([p, t]) => {
          setPolicies(p.policies);
          setTeams(t.teams);
        })
        .catch((e) => setError(e.message)),
    []
  );

  useEffect(() => {
    loadSettings();
    loadRefs();
  }, [loadSettings, loadRefs]);

  if (error && !settings) {
    return (
      <Card>
        <p className="text-sm text-red-500">{error}</p>
      </Card>
    );
  }
  if (!settings) return <CardSkeleton />;

  if (!settings.office.enabled) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <div className="flex flex-col items-center text-center gap-3 py-6">
            <span className="material-symbols-outlined text-[40px] text-text-muted">corporate_fare</span>
            <h2 className="text-lg font-semibold">Office mode is off</h2>
            <p className="text-sm text-text-muted max-w-md">
              Turn it on in Settings to add employees, set usage limits and see the leaderboard and cost analytics.
            </p>
            <Link href="/dashboard/profile">
              <Button icon="settings">Open Settings</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const refreshAll = () => {
    loadSettings();
    loadRefs();
  };

  return (
    <div className="flex flex-col gap-6">
      <SegmentedControl options={TABS} value={tab} onChange={setTab} className="self-start max-w-full" />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {tab === "overview" && <OverviewTab settings={settings} policies={policies} onSaved={setSettings} onNavigate={setTab} />}
      {tab === "members" && <MembersTab teams={teams} policies={policies} onChanged={refreshAll} />}
      {tab === "teams" && <TeamsTab teams={teams} policies={policies} onChanged={refreshAll} />}
      {tab === "policies" && <PoliciesTab policies={policies} onChanged={refreshAll} />}
      {tab === "analytics" && <AnalyticsTab />}
      {tab === "audit" && <AuditTab />}
    </div>
  );
}
