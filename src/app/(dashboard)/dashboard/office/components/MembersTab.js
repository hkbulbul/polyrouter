"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Card, Button, Input, Modal, ConfirmModal, Badge, Toggle } from "@/shared/components";
import Drawer from "@/shared/components/Drawer";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import { OptionSelect } from "@/shared/components/office/fields";
import LimitBars from "@/shared/components/office/LimitBars";
import { officeApi, fmtUsd, fmtTokens, fmtNumber, fmtRelative, fmtDateTime } from "@/shared/components/office/officeClient";

const SOURCE_LABEL = { user: "own", team: "team", default: "default", none: "" };

function TempPasswordModal({ info, onClose }) {
  const { copied, copy } = useCopyToClipboard(1500);
  if (!info) return null;
  const text = `Email: ${info.email}\nTemporary password: ${info.password}${info.portalUrl ? `\nSign in: ${info.portalUrl}` : ""}`;
  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Share these sign-in details"
      footer={<Button onClick={onClose}>Done</Button>}
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-muted">
          This password is shown only once. The employee must replace it the first time they sign in.
        </p>
        <pre className="bg-surface-2 p-3 text-sm font-mono whitespace-pre-wrap break-all">{text}</pre>
        <Button variant="secondary" icon={copied ? "check" : "content_copy"} onClick={() => copy(text)}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </Modal>
  );
}

TempPasswordModal.propTypes = { info: PropTypes.object, onClose: PropTypes.func.isRequired };

// Remounted (via `key`) each time it opens, so state starts fresh from props.
function MemberFormModal({ isOpen, member, teams, policies, onClose, onSaved }) {
  const isEdit = Boolean(member);
  const [form, setForm] = useState(() =>
    member
      ? { name: member.name, teamId: member.teamId || "", policyId: member.policyId || "" }
      : { email: "", name: "", password: "", teamId: "", policyId: "" }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (isEdit) {
        await officeApi(`/api/office/admin/users/${member.id}`, {
          method: "PATCH",
          body: { name: form.name, teamId: form.teamId || null, policyId: form.policyId || null },
        });
        onSaved(null);
      } else {
        const res = await officeApi("/api/office/admin/users", {
          method: "POST",
          body: { ...form, teamId: form.teamId || null, policyId: form.policyId || null },
        });
        onSaved(res.temporaryPassword ? { email: res.user.email, password: res.temporaryPassword } : null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit ${member?.email}` : "Add employee"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="office-member-form" loading={saving}>{isEdit ? "Save" : "Add employee"}</Button>
        </>
      }
    >
      <form id="office-member-form" onSubmit={submit} className="flex flex-col gap-4">
        {!isEdit && (
          <Input label="Email" type="email" required value={form.email || ""} onChange={(e) => set("email")(e.target.value)} placeholder="jane@company.com" autoFocus />
        )}
        <Input label="Name" value={form.name || ""} onChange={(e) => set("name")(e.target.value)} placeholder="Jane Doe" maxLength={120} />
        {!isEdit && (
          <Input
            label="Password"
            type="text"
            value={form.password || ""}
            onChange={(e) => set("password")(e.target.value)}
            placeholder="Leave blank to generate one"
            hint="Temporary — the employee must change it on first sign-in."
            autoComplete="off"
          />
        )}
        <OptionSelect
          label="Team"
          value={form.teamId || ""}
          onChange={set("teamId")}
          options={[{ value: "", label: "No team" }, ...teams.map((t) => ({ value: t.id, label: t.name }))]}
        />
        <OptionSelect
          label="Limits"
          value={form.policyId || ""}
          onChange={set("policyId")}
          options={[{ value: "", label: "Inherit (team policy, else office default)" }, ...policies.map((p) => ({ value: p.id, label: p.name }))]}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>
    </Modal>
  );
}

MemberFormModal.propTypes = {
  isOpen: PropTypes.bool,
  member: PropTypes.object,
  teams: PropTypes.array.isRequired,
  policies: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

// Keyed by memberId, so switching employees starts from a clean "Loading…" state.
function MemberDetail({ memberId, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(
    () => officeApi(`/api/office/admin/users/${memberId}`).then(setDetail).catch((e) => setError(e.message)),
    [memberId]
  );

  useEffect(() => {
    load();
  }, [load]);

  const revokeKey = async (keyId) => {
    try {
      await officeApi(`/api/office/admin/users/${memberId}/keys/${keyId}`, { method: "DELETE" });
      await load();
      onChanged();
    } catch (e) {
      setError(e.message);
    }
  };

  const revokeDevice = async (deviceId) => {
    try {
      await officeApi(`/api/office/admin/devices/${deviceId}`, { method: "DELETE" });
      await load();
      onChanged();
    } catch (e) {
      setError(e.message);
    }
  };

  const status = detail?.status;
  return (
    <>
      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
      {!detail ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold">Limits</h4>
            <p className="text-xs text-text-muted">
              Policy: <span className="font-medium text-text-main">{status.policy.name}</span>
              {status.policy.source !== "none" && ` (${status.policy.source})`}
            </p>
            <LimitBars rows={status.limitStatus} limits={status.policy.limits} emptyText="No usage limits — this employee is unlimited." />
          </section>

          <section className="grid grid-cols-2 gap-3">
            <Card padding="xs">
              <p className="text-xs text-text-muted">Today</p>
              <p className="font-mono text-sm">{fmtUsd(status.usage.day.cost)} · {fmtTokens(status.usage.day.tokens)} tok</p>
            </Card>
            <Card padding="xs">
              <p className="text-xs text-text-muted">This month</p>
              <p className="font-mono text-sm">{fmtUsd(status.usage.month.cost)} · {fmtTokens(status.usage.month.tokens)} tok</p>
            </Card>
          </section>

          <section className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold">API keys ({detail.keys.length})</h4>
            {detail.keys.length === 0 && <p className="text-sm text-text-muted">No keys yet.</p>}
            {detail.keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between gap-3 p-2 border border-border">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{k.name}</p>
                  <p className="text-xs text-text-muted font-mono">
                    {k.key} · created {fmtRelative(k.createdAt)}
                    {k.expiresAt && ` · expires ${fmtDateTime(k.expiresAt)}`}
                  </p>
                </div>
                <Button size="sm" variant="ghost" icon="delete" onClick={() => revokeKey(k.id)}>Revoke</Button>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold">Client devices</h4>
            {detail.devices.length === 0 && <p className="text-sm text-text-muted">Not signed in on any device.</p>}
            {detail.devices.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 p-2 border border-border">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {d.name || "Device"} {d.platform && <span className="text-text-muted font-normal">({d.platform})</span>}
                  </p>
                  <p className="text-xs text-text-muted">
                    {d.revokedAt ? `Signed out ${fmtRelative(d.revokedAt)}` : `Last seen ${fmtRelative(d.lastSeenAt)}`}
                  </p>
                </div>
                {!d.revokedAt && <Button size="sm" variant="ghost" icon="logout" onClick={() => revokeDevice(d.id)}>Sign out</Button>}
              </div>
            ))}
          </section>
        </div>
      )}
    </>
  );
}

MemberDetail.propTypes = { memberId: PropTypes.string.isRequired, onChanged: PropTypes.func.isRequired };

function MemberDrawer({ member, onClose, onChanged }) {
  return (
    <Drawer isOpen={Boolean(member)} onClose={onClose} title={member?.email || "Employee"} width="lg">
      {member && <MemberDetail key={member.id} memberId={member.id} onChanged={onChanged} />}
    </Drawer>
  );
}

MemberDrawer.propTypes = { member: PropTypes.object, onClose: PropTypes.func.isRequired, onChanged: PropTypes.func.isRequired };

export default function MembersTab({ teams, policies, onChanged }) {
  const [members, setMembers] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [formState, setFormState] = useState({ open: false, member: null, nonce: 0 });
  const [tempPassword, setTempPassword] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind: "delete"|"reset", member }
  const [busy, setBusy] = useState(false);
  const [drawerMember, setDrawerMember] = useState(null);
  const [portalUrl, setPortalUrl] = useState("");

  const load = useCallback(
    () =>
      Promise.all([officeApi("/api/office/admin/users"), officeApi("/api/office/admin/settings")])
        .then(([data, settings]) => {
          setMembers(data.users);
          setPortalUrl(`${settings.office.publicUrl || window.location.origin}/portal`);
        })
        .catch((e) => setError(e.message)),
    []
  );

  const openForm = (member) => setFormState((s) => ({ open: true, member, nonce: s.nonce + 1 }));
  const closeForm = () => setFormState((s) => ({ ...s, open: false }));

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!members) return [];
    if (!q) return members;
    return members.filter((m) => [m.email, m.name, m.teamName].some((v) => v && v.toLowerCase().includes(q)));
  }, [members, query]);

  const setActive = async (member, isActive) => {
    try {
      await officeApi(`/api/office/admin/users/${member.id}`, { method: "PATCH", body: { isActive } });
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === "delete") {
        await officeApi(`/api/office/admin/users/${confirm.member.id}`, { method: "DELETE" });
        onChanged();
      } else {
        const res = await officeApi(`/api/office/admin/users/${confirm.member.id}/reset-password`, { method: "POST", body: {} });
        setTempPassword({ email: confirm.member.email, password: res.temporaryPassword, portalUrl });
      }
      setConfirm(null);
      await load();
    } catch (e) {
      setError(e.message);
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card padding="none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-border">
        <Input icon="search" placeholder="Search employees" value={query} onChange={(e) => setQuery(e.target.value)} className="sm:w-72" />
        <Button icon="person_add" onClick={() => openForm(null)}>Add employee</Button>
      </div>
      {error && <p className="text-sm text-red-500 px-4 pt-3">{error}</p>}
      {!members ? (
        <p className="p-4 text-sm text-text-muted">Loading…</p>
      ) : members.length === 0 ? (
        <div className="p-8 text-center text-sm text-text-muted">No employees yet. Add the first one to get started.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-muted border-b border-border">
                <th className="px-4 py-2 font-medium">Employee</th>
                <th className="px-4 py-2 font-medium">Team</th>
                <th className="px-4 py-2 font-medium">Limits</th>
                <th className="px-4 py-2 font-medium text-right">This month</th>
                <th className="px-4 py-2 font-medium">Last sign-in</th>
                <th className="px-4 py-2 font-medium">Active</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-b border-border/60 hover:bg-surface-2/50">
                  <td className="px-4 py-2">
                    <button type="button" className="text-left" onClick={() => setDrawerMember(m)}>
                      <p className="font-medium hover:text-primary">{m.name || m.email}</p>
                      {m.name && <p className="text-xs text-text-muted">{m.email}</p>}
                    </button>
                    {m.mustChangePassword && <Badge size="sm" variant="warning" className="mt-1">temp password</Badge>}
                  </td>
                  <td className="px-4 py-2 text-text-muted">{m.teamName || "—"}</td>
                  <td className="px-4 py-2">
                    <span>{m.effectivePolicy.name}</span>
                    {SOURCE_LABEL[m.effectivePolicy.source] && (
                      <span className="text-xs text-text-muted"> · {SOURCE_LABEL[m.effectivePolicy.source]}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    <p>{fmtUsd(m.monthUsage.cost)}</p>
                    <p className="text-xs text-text-muted">{fmtTokens(m.monthUsage.tokens)} tok · {fmtNumber(m.monthUsage.requests)} req</p>
                  </td>
                  <td className="px-4 py-2 text-text-muted">{fmtRelative(m.lastLoginAt)}</td>
                  <td className="px-4 py-2">
                    <Toggle size="sm" checked={m.isActive} onChange={(v) => setActive(m, v)} />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" icon="edit" aria-label="Edit" onClick={() => openForm(m)} />
                      <Button size="sm" variant="ghost" icon="lock_reset" aria-label="Reset password" onClick={() => setConfirm({ kind: "reset", member: m })} />
                      <Button size="sm" variant="ghost" icon="delete" aria-label="Delete" onClick={() => setConfirm({ kind: "delete", member: m })} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MemberFormModal
        key={formState.nonce}
        isOpen={formState.open}
        member={formState.member}
        teams={teams}
        policies={policies}
        onClose={closeForm}
        onSaved={(temp) => {
          closeForm();
          if (temp) setTempPassword({ ...temp, portalUrl });
          load();
          onChanged();
        }}
      />
      <TempPasswordModal info={tempPassword} onClose={() => setTempPassword(null)} />
      <ConfirmModal
        isOpen={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        loading={busy}
        title={confirm?.kind === "delete" ? "Delete employee?" : "Reset password?"}
        confirmText={confirm?.kind === "delete" ? "Delete" : "Reset password"}
        variant={confirm?.kind === "delete" ? "danger" : "primary"}
        message={
          confirm?.kind === "delete"
            ? `${confirm?.member.email} will lose access immediately. Their API keys and devices are removed; past usage stays in your reports.`
            : `A new temporary password is generated for ${confirm?.member.email}. They are signed out of the portal and every client device.`
        }
      />
      <MemberDrawer member={drawerMember} onClose={() => setDrawerMember(null)} onChanged={load} />
    </Card>
  );
}

MembersTab.propTypes = {
  teams: PropTypes.array.isRequired,
  policies: PropTypes.array.isRequired,
  onChanged: PropTypes.func.isRequired,
};
