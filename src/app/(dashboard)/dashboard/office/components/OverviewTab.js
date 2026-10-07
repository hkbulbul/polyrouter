"use client";

import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Card, Button, Input, Toggle } from "@/shared/components";
import { OptionSelect } from "@/shared/components/office/fields";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import { officeApi, fmtUsd, fmtTokens, fmtNumber } from "@/shared/components/office/officeClient";

function Stat({ label, value, hint }) {
  return (
    <Card padding="sm">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-2xl font-semibold mt-1 font-mono">{value}</p>
      {hint && <p className="text-xs text-text-muted mt-1">{hint}</p>}
    </Card>
  );
}

Stat.propTypes = { label: PropTypes.string, value: PropTypes.node, hint: PropTypes.string };

function CopyRow({ label, value }) {
  const { copied, copy } = useCopyToClipboard(1500);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 truncate bg-surface-2 px-3 py-2 text-sm font-mono">{value}</code>
        <Button size="sm" variant="secondary" icon={copied ? "check" : "content_copy"} onClick={() => copy(value)}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

CopyRow.propTypes = { label: PropTypes.string, value: PropTypes.string };

export default function OverviewTab({ settings, policies, onSaved, onNavigate }) {
  const [form, setForm] = useState(settings.office);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [month, setMonth] = useState(null);
  // This tab only renders client-side, after the settings fetch.
  const origin = window.location.origin;

  useEffect(() => {
    officeApi("/api/office/admin/analytics?period=month").then((d) => setMonth(d.summary)).catch(() => {});
  }, []);

  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus({ type: "", message: "" });
    try {
      const next = await officeApi("/api/office/admin/settings", {
        method: "PUT",
        body: {
          orgName: form.orgName,
          publicUrl: form.publicUrl,
          defaultPolicyId: form.defaultPolicyId || null,
          allowSelfServiceKeys: form.allowSelfServiceKeys,
          allowClientLogin: form.allowClientLogin,
        },
      });
      onSaved(next);
      setForm(next.office);
      setStatus({ type: "success", message: "Saved" });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const baseUrl = settings.office.publicUrl || origin;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Spend this month" value={month ? fmtUsd(month.cost) : "—"} />
        <Stat label="Tokens this month" value={month ? fmtTokens(month.tokens) : "—"} />
        <Stat label="Requests this month" value={month ? fmtNumber(month.requests) : "—"} />
        <Stat
          label="Active employees"
          value={`${month ? month.activeUsers : "—"} / ${settings.counts.activeUsers}`}
          hint="used AI this month / enabled accounts"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Office settings" icon="settings">
          <form onSubmit={save} className="flex flex-col gap-4">
            <Input label="Organization name" value={form.orgName} onChange={(e) => set("orgName")(e.target.value)} placeholder="Acme Inc." maxLength={120} />
            <div className="flex flex-col gap-1.5">
              <Input
                label="Server URL employees use"
                value={form.publicUrl}
                onChange={(e) => set("publicUrl")(e.target.value)}
                placeholder="http://192.168.1.10:20128 or https://ai.company.com"
                hint="The LAN, Tailscale or tunnel address of this PolyRouter. Shown to employees in the portal and client."
              />
              {origin && form.publicUrl !== origin && (
                <button type="button" className="self-start text-xs text-primary hover:underline" onClick={() => set("publicUrl")(origin)}>
                  Use this browser&apos;s address ({origin})
                </button>
              )}
            </div>
            <OptionSelect
              label="Default limits for everyone"
              value={form.defaultPolicyId || ""}
              onChange={(v) => set("defaultPolicyId")(v || null)}
              options={[{ value: "", label: "No default (unlimited)" }, ...policies.map((p) => ({ value: p.id, label: p.name }))]}
              hint="Applies to employees without their own or a team policy."
            />
            <Toggle
              checked={form.allowSelfServiceKeys}
              onChange={set("allowSelfServiceKeys")}
              label="Employees can create their own API keys"
              description="In the web portal. Keys are always tied to the employee and their limits."
            />
            <Toggle
              checked={form.allowClientLogin}
              onChange={set("allowClientLogin")}
              label="Allow the PolyRouter client"
              description="Employees can sign in from the light desktop client to auto-configure their coding tools."
            />
            <div className="flex items-center gap-3">
              <Button type="submit" loading={saving}>Save</Button>
              {status.message && (
                <span className={status.type === "error" ? "text-sm text-red-500" : "text-sm text-green-600 dark:text-green-400"}>
                  {status.message}
                </span>
              )}
            </div>
          </form>
        </Card>

        <Card title="How employees connect" icon="hub">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-muted">
              Add employees in the <button type="button" className="text-primary hover:underline" onClick={() => onNavigate("members")}>Employees</button> tab
              and share their email and temporary password. They then pick one of these:
            </p>
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">1. Web portal (no install)</p>
              <CopyRow label="Employee portal" value={`${baseUrl}/portal`} />
              <p className="text-xs text-text-muted">They sign in, create an API key and copy setup snippets for their tools.</p>
            </div>
            <div className="flex flex-col gap-3 pt-3 border-t border-border/50">
              <p className="text-sm font-medium">2. PolyRouter client (optional)</p>
              <CopyRow label="Run on the employee's computer" value={`npx polyrouter-client connect ${baseUrl}`} />
              <p className="text-xs text-text-muted">
                Signs in, then writes Claude Code / Codex / other tool configs automatically. <code>polyrouter-client disconnect</code> restores the originals.
              </p>
            </div>
            <div className="flex flex-col gap-3 pt-3 border-t border-border/50">
              <CopyRow label="OpenAI-compatible base URL" value={`${baseUrl}/v1`} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

OverviewTab.propTypes = {
  settings: PropTypes.object.isRequired,
  policies: PropTypes.array.isRequired,
  onSaved: PropTypes.func.isRequired,
  onNavigate: PropTypes.func.isRequired,
};
