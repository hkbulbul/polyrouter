"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Button } from "@/shared/components";
import LimitBars from "@/shared/components/office/LimitBars";
import UsageTrendChart from "@/shared/components/office/UsageTrendChart";
import { officeApi, fmtUsd, fmtTokens, fmtNumber, POLICY_SOURCE_LABELS } from "@/shared/components/office/officeClient";
import { usePortal } from "../_components/PortalContext";
import StatTile from "../_components/StatTile";

const plural = (n, word) => `${fmtNumber(n)} ${word}${n === 1 ? "" : "s"}`;

export default function PortalOverviewPage() {
  const { me } = usePortal();
  const [week, setWeek] = useState(null);

  useEffect(() => {
    officeApi("/api/office/me/usage?period=7d").then(setWeek).catch(() => setWeek({ daily: [] }));
  }, []);

  const firstName = (me.user.name || "").split(/\s+/)[0];
  const usableKey = me.keys.find((k) => !k.deviceId && !k.expired);
  const nearLimit = me.limitStatus.filter((r) => r.percent >= 80);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="eyebrow">{me.office.orgName || "PolyRouter"}</p>
        <h2 className="text-2xl font-medium tracking-[-0.02em] text-text-main">
          {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        </h2>
      </div>

      {nearLimit.length > 0 && (
        <div className="flex items-start gap-3 border border-amber-500/30 bg-amber-500/[0.06] p-4">
          <span className="material-symbols-outlined text-[20px] text-amber-500">warning</span>
          <p className="text-sm text-text-main">
            {nearLimit.map((r) => `${r.label}: ${r.percent}%`).join(" · ")}. Requests are limited once you reach 100%.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Spend today" icon="today" value={fmtUsd(me.usage.day.cost)} hint={plural(me.usage.day.requests, "request")} />
        <StatTile label="Spend this month" icon="calendar_month" value={fmtUsd(me.usage.month.cost)} hint={plural(me.usage.month.requests, "request")} />
        <StatTile label="Tokens this month" icon="token" value={fmtTokens(me.usage.month.tokens)} hint={`${fmtTokens(me.usage.day.tokens)} today`} />
        <StatTile label="API keys" icon="key" value={fmtNumber(me.keys.length)} hint={`${me.devices.length} signed-in device${me.devices.length === 1 ? "" : "s"}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card
          className="lg:col-span-2"
          title="Your limits"
          subtitle={`${me.policy.name} · ${POLICY_SOURCE_LABELS[me.policy.source]}`}
          icon="speed"
        >
          <LimitBars rows={me.limitStatus} limits={me.policy.limits} emptyText="No usage limits — use AI as you need." />
        </Card>
        <Card
          className="lg:col-span-3"
          title="Last 7 days"
          icon="monitoring"
          action={<Link href="/portal/usage" className="text-xs text-primary hover:underline">Details</Link>}
        >
          {week ? <UsageTrendChart data={week.daily} height={200} /> : <p className="text-sm text-text-muted">Loading…</p>}
        </Card>
      </div>

      <Card title="Get started" icon="rocket_launch" subtitle="Point your AI tools at this office PolyRouter.">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-3 border border-border-subtle p-4">
            <p className="eyebrow">1 · API key</p>
            <p className="text-sm text-text-muted">
              {usableKey ? `You have an active key: ${usableKey.name}.` : "Create a personal API key for your tools."}
            </p>
            <Link href="/portal/keys" className="mt-auto">
              <Button size="sm" variant={usableKey ? "secondary" : "primary"} icon="key">{usableKey ? "Manage keys" : "Create key"}</Button>
            </Link>
          </div>
          <div className="flex flex-col gap-3 border border-border-subtle p-4">
            <p className="eyebrow">2 · Configure tools</p>
            <p className="text-sm text-text-muted">Copy ready-made settings for Claude Code, Codex, Cursor and other OpenAI-compatible tools.</p>
            <Link href="/portal/setup" className="mt-auto">
              <Button size="sm" variant="secondary" icon="build">Set up tools</Button>
            </Link>
          </div>
          <div className="flex flex-col gap-3 border border-border-subtle p-4">
            <p className="eyebrow">3 · Or let the client do it</p>
            <p className="text-sm text-text-muted">
              {me.office.allowClientLogin
                ? "The PolyRouter client signs in and configures your tools automatically."
                : "Your admin has turned off the PolyRouter client — use the setup page instead."}
            </p>
            {me.office.allowClientLogin && (
              <Link href="/portal/setup#client" className="mt-auto">
                <Button size="sm" variant="secondary" icon="terminal">Client setup</Button>
              </Link>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
