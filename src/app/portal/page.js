"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Button, Input, Badge, SegmentedControl, ConfirmModal } from "@/shared/components";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import LimitBars from "@/shared/components/office/LimitBars";
import UsageTrendChart from "@/shared/components/office/UsageTrendChart";
import {
  officeApi, fmtUsd, fmtTokens, fmtNumber, fmtRelative, fmtDateTime, PERIOD_OPTIONS, POLICY_SOURCE_LABELS,
} from "@/shared/components/office/officeClient";
import SetupGuide from "./SetupGuide";

function ChangePasswordForm({ required, onDone }) {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.next !== form.confirm) {
      setStatus({ type: "error", message: "New passwords do not match" });
      return;
    }
    setLoading(true);
    setStatus({ type: "", message: "" });
    try {
      await officeApi("/api/office/me/password", { method: "POST", body: { currentPassword: form.current, newPassword: form.next } });
      setForm({ current: "", next: "", confirm: "" });
      setStatus({ type: "success", message: "Password updated" });
      onDone();
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {required && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          You are using a temporary password. Choose your own to continue.
        </p>
      )}
      <Input label={required ? "Temporary password" : "Current password"} type="password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} required autoComplete="current-password" />
      <Input label="New password" type="password" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} required minLength={8} hint="At least 8 characters." autoComplete="new-password" />
      <Input label="Confirm new password" type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required autoComplete="new-password" />
      {status.message && <p className={status.type === "error" ? "text-sm text-red-500" : "text-sm text-green-600 dark:text-green-400"}>{status.message}</p>}
      <Button type="submit" loading={loading} className="self-start">Update password</Button>
    </form>
  );
}

function KeyRow({ k, onDelete }) {
  const { copied, copy } = useCopyToClipboard(1500);
  const expired = k.expired;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 border border-border">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">
          {k.name} {k.deviceId && <Badge size="sm" variant="info">client</Badge>} {expired && <Badge size="sm" variant="error">expired</Badge>}
        </p>
        <p className="text-xs text-text-muted font-mono break-all">{k.key}</p>
        <p className="text-xs text-text-muted">
          Created {fmtRelative(k.createdAt)}{k.expiresAt && ` · ${expired ? "expired" : "expires"} ${fmtDateTime(k.expiresAt)}`}
        </p>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button size="sm" variant="secondary" icon={copied ? "check" : "content_copy"} onClick={() => copy(k.key)}>{copied ? "Copied" : "Copy"}</Button>
        <Button size="sm" variant="ghost" icon="delete" aria-label="Delete key" onClick={() => onDelete(k)} />
      </div>
    </div>
  );
}

export default function PortalPage() {
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("30d");
  // Tagged with the period it was loaded for, so a period switch shows "Loading…" without a reset in the effect.
  const [usageState, setUsageState] = useState({ period: null, data: null });
  const [keyName, setKeyName] = useState("");
  const [keyError, setKeyError] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingKey, setDeletingKey] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleMeError = useCallback((e) => {
    if (e.status === 401) window.location.replace("/portal/login");
    else setError(e.message);
  }, []);

  const loadMe = useCallback(() => officeApi("/api/office/me").then(setMe).catch(handleMeError), [handleMeError]);

  useEffect(() => {
    officeApi("/api/office/me").then(setMe).catch(handleMeError);
  }, [handleMeError]);

  const usageEnabled = Boolean(me) && !me.user.mustChangePassword;
  useEffect(() => {
    if (!usageEnabled) return;
    let active = true;
    officeApi(`/api/office/me/usage?period=${period}`)
      .then((data) => active && setUsageState({ period, data }))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [usageEnabled, period]);
  const usage = usageState.period === period ? usageState.data : null;

  const logout = async () => {
    await fetch("/api/office/auth/logout", { method: "POST" }).catch(() => {});
    window.location.replace("/portal/login");
  };

  const createKey = async (e) => {
    e.preventDefault();
    setCreating(true);
    setKeyError("");
    try {
      await officeApi("/api/office/me/keys", { method: "POST", body: { name: keyName || "My key" } });
      setKeyName("");
      await loadMe();
    } catch (err) {
      setKeyError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteKey = async () => {
    setBusy(true);
    try {
      await officeApi(`/api/office/me/keys/${deletingKey.id}`, { method: "DELETE" });
      setDeletingKey(null);
      await loadMe();
    } catch (err) {
      setKeyError(err.message);
      setDeletingKey(null);
    } finally {
      setBusy(false);
    }
  };

  const signOutDevice = async (id) => {
    try {
      await officeApi(`/api/office/me/devices/${id}`, { method: "DELETE" });
      await loadMe();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        {error ? <p className="text-sm text-red-500">{error}</p> : <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />}
      </div>
    );
  }

  // Only rendered after the client-side fetch, so window is always defined here.
  const baseUrl = me.office.publicUrl || window.location.origin;
  const activeKey = me.keys.find((k) => !k.deviceId && !k.expired);

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border-subtle bg-surface">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/favicon.svg" alt="" width={28} height={28} />
            <div className="min-w-0">
              <p className="font-semibold truncate">{me.office.orgName || "PolyRouter"}</p>
              <p className="text-xs text-text-muted truncate">{me.user.name || me.user.email}{me.user.team && ` · ${me.user.team.name}`}</p>
            </div>
          </div>
          <Button size="sm" variant="ghost" icon="logout" onClick={logout}>Sign out</Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
        {error && <p className="text-sm text-red-500">{error}</p>}

        {me.user.mustChangePassword ? (
          <Card title="Set your password" icon="lock" className="max-w-lg">
            <ChangePasswordForm required onDone={loadMe} />
          </Card>
        ) : (
          <>
            <div className="grid lg:grid-cols-2 gap-6">
              <Card title="Your limits" icon="speed">
                <p className="text-xs text-text-muted mb-4">
                  Policy: <span className="font-medium text-text-main">{me.policy.name}</span> ({POLICY_SOURCE_LABELS[me.policy.source]})
                </p>
                <LimitBars rows={me.limitStatus} limits={me.policy.limits} emptyText="No usage limits — use AI as you need." />
              </Card>
              <Card title="Today & this month" icon="insights">
                <div className="grid grid-cols-2 gap-4">
                  {[["Today", me.usage.day], ["This month", me.usage.month]].map(([label, u]) => (
                    <div key={label}>
                      <p className="text-xs text-text-muted">{label}</p>
                      <p className="text-xl font-semibold font-mono">{fmtUsd(u.cost)}</p>
                      <p className="text-xs text-text-muted">{fmtTokens(u.tokens)} tokens · {fmtNumber(u.requests)} request{u.requests === 1 ? "" : "s"}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card title="API keys" icon="key">
              <div className="flex flex-col gap-3">
                {me.keys.length === 0 && <p className="text-sm text-text-muted">You have no API keys yet.</p>}
                {me.keys.map((k) => <KeyRow key={k.id} k={k} onDelete={setDeletingKey} />)}
                {me.office.allowSelfServiceKeys ? (
                  <form onSubmit={createKey} className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Input placeholder="Key name, e.g. Laptop" value={keyName} onChange={(e) => setKeyName(e.target.value)} maxLength={80} className="flex-1" />
                    <Button type="submit" icon="add" loading={creating}>Create key</Button>
                  </form>
                ) : (
                  <p className="text-xs text-text-muted">Your admin creates keys for you, or use the PolyRouter client.</p>
                )}
                {keyError && <p className="text-sm text-red-500">{keyError}</p>}
              </div>
            </Card>

            <Card title="Set up your tools" icon="build">
              <SetupGuide baseUrl={baseUrl} apiKey={activeKey?.key} />
              {me.office.allowClientLogin && (
                <p className="text-xs text-text-muted mt-4">
                  Prefer automatic setup? Run <code className="bg-surface-2 px-1">npx polyrouter-client connect {baseUrl}</code> and sign in with this email and password.
                </p>
              )}
            </Card>

            <Card title="Your usage" icon="bar_chart">
              <div className="flex flex-col gap-4">
                <SegmentedControl size="sm" options={PERIOD_OPTIONS} value={period} onChange={setPeriod} className="self-start max-w-full" />
                {!usage ? (
                  <p className="text-sm text-text-muted">Loading…</p>
                ) : (
                  <>
                    <p className="text-sm">
                      <span className="font-mono font-semibold">{fmtUsd(usage.totals.cost)}</span>
                      <span className="text-text-muted"> · {fmtTokens(usage.totals.tokens)} tokens · {fmtNumber(usage.totals.requests)} requests</span>
                    </p>
                    <UsageTrendChart data={usage.daily} />
                    {usage.byModel.length > 0 && (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-text-muted border-b border-border">
                            <th className="py-2 font-medium">Model</th>
                            <th className="py-2 font-medium text-right">Requests</th>
                            <th className="py-2 font-medium text-right">Tokens</th>
                            <th className="py-2 font-medium text-right">Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usage.byModel.map((m) => (
                            <tr key={`${m.model}|${m.provider}`} className="border-b border-border/60">
                              <td className="py-2 font-mono text-xs break-all">{m.model}</td>
                              <td className="py-2 text-right font-mono">{fmtNumber(m.requests)}</td>
                              <td className="py-2 text-right font-mono">{fmtTokens(m.tokens)}</td>
                              <td className="py-2 text-right font-mono">{fmtUsd(m.cost)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </div>
            </Card>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card title="Signed-in devices" icon="devices">
                {me.devices.length === 0 ? (
                  <p className="text-sm text-text-muted">You are not signed in to the PolyRouter client anywhere.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {me.devices.map((d) => (
                      <div key={d.id} className="flex items-center justify-between gap-3 p-2 border border-border">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{d.name || "Device"} {d.platform && <span className="text-text-muted font-normal">({d.platform})</span>}</p>
                          <p className="text-xs text-text-muted">Last seen {fmtRelative(d.lastSeenAt)}</p>
                        </div>
                        <Button size="sm" variant="ghost" icon="logout" onClick={() => signOutDevice(d.id)}>Sign out</Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              <Card title="Change password" icon="lock">
                <ChangePasswordForm onDone={loadMe} />
              </Card>
            </div>
          </>
        )}
      </main>

      <ConfirmModal
        isOpen={Boolean(deletingKey)}
        onClose={() => setDeletingKey(null)}
        onConfirm={deleteKey}
        loading={busy}
        title="Delete API key?"
        confirmText="Delete"
        message={`Tools using “${deletingKey?.name}” stop working immediately.`}
      />
    </div>
  );
}
