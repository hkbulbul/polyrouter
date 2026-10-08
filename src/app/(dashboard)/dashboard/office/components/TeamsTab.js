"use client";

import { useState } from "react";
import PropTypes from "prop-types";
import { Card, Button, Input, Modal, ConfirmModal } from "@/shared/components";
import { OptionSelect } from "@/shared/components/office/fields";
import { officeApi } from "@/shared/components/office/officeClient";

// Remounted (via `key`) each time it opens, so state starts fresh from props.
function TeamFormModal({ team, isOpen, policies, onClose, onSaved }) {
  const [name, setName] = useState(team?.name || "");
  const [policyId, setPolicyId] = useState(team?.policyId || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = { name, policyId: policyId || null };
      if (team) await officeApi(`/api/office/admin/teams/${team.id}`, { method: "PATCH", body });
      else await officeApi("/api/office/admin/teams", { method: "POST", body });
      onSaved();
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
      title={team ? "Edit team" : "New team"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="office-team-form" loading={saving}>Save</Button>
        </>
      }
    >
      <form id="office-team-form" onSubmit={submit} className="flex flex-col gap-4">
        <Input label="Team name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Engineering" maxLength={80} autoFocus />
        <OptionSelect
          label="Team limits"
          value={policyId}
          onChange={setPolicyId}
          hint="Members without their own limits use this policy."
          options={[{ value: "", label: "Inherit office default" }, ...policies.map((p) => ({ value: p.id, label: p.name }))]}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>
    </Modal>
  );
}

TeamFormModal.propTypes = {
  team: PropTypes.object,
  isOpen: PropTypes.bool,
  policies: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

export default function TeamsTab({ teams, policies, onChanged }) {
  const [form, setForm] = useState({ open: false, team: null, nonce: 0 });
  const openForm = (team) => setForm((f) => ({ open: true, team, nonce: f.nonce + 1 }));
  const closeForm = () => setForm((f) => ({ ...f, open: false }));
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const policyName = (id) => policies.find((p) => p.id === id)?.name;

  const remove = async () => {
    setBusy(true);
    try {
      await officeApi(`/api/office/admin/teams/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      onChanged();
    } catch (e) {
      setError(e.message);
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card padding="none">
      <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
        <p className="text-sm text-text-muted">Group employees and give a whole team the same limits.</p>
        <Button icon="group_add" onClick={() => openForm(null)}>New team</Button>
      </div>
      {error && <p className="text-sm text-red-500 px-4 pt-3">{error}</p>}
      {teams.length === 0 ? (
        <div className="p-8 text-center text-sm text-text-muted">No teams yet.</div>
      ) : (
        <ul>
          {teams.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/60">
              <div>
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-text-muted">
                  {t.memberCount} member{t.memberCount === 1 ? "" : "s"} · Limits: {policyName(t.policyId) || "office default"}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" icon="edit" aria-label="Edit team" onClick={() => openForm(t)} />
                <Button size="sm" variant="ghost" icon="delete" aria-label="Delete team" onClick={() => setDeleting(t)} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <TeamFormModal
        key={form.nonce}
        isOpen={form.open}
        team={form.team}
        policies={policies}
        onClose={closeForm}
        onSaved={() => {
          closeForm();
          onChanged();
        }}
      />
      <ConfirmModal
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busy}
        title="Delete team?"
        confirmText="Delete"
        message={`Members of ${deleting?.name} stay, but no longer belong to a team.`}
      />
    </Card>
  );
}

TeamsTab.propTypes = {
  teams: PropTypes.array.isRequired,
  policies: PropTypes.array.isRequired,
  onChanged: PropTypes.func.isRequired,
};
