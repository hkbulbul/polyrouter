"use client";

import { useState } from "react";
import PropTypes from "prop-types";
import { Card, Button, Input, Modal, ConfirmModal, Badge, Toggle } from "@/shared/components";
import { LimitInput, TextArea } from "@/shared/components/office/fields";
import { officeApi, fmtUsd, fmtTokens, fmtNumber } from "@/shared/components/office/officeClient";
import { OFFICE_KINDS, OFFICE_KIND_LABELS } from "@/lib/office/policy";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const GROUPS = [
  {
    title: "Request rate",
    fields: [
      ["requestsPerMinute", "Per minute"],
      ["requestsPerHour", "Per hour"],
      ["requestsPerDay", "Per day"],
      ["maxConcurrent", "At the same time"],
    ],
  },
  {
    title: "Token & cost budgets",
    fields: [
      ["tokensPerDay", "Tokens / day"],
      ["tokensPerMonth", "Tokens / month"],
      ["costPerDay", "USD / day", "0.01"],
      ["costPerMonth", "USD / month", "0.01"],
    ],
  },
  {
    title: "Per request",
    fields: [
      ["maxInputTokens", "Max input tokens (approx.)"],
      ["maxOutputTokens", "Max output tokens"],
    ],
  },
  {
    title: "API keys",
    fields: [
      ["maxKeys", "Max keys per employee"],
      ["keyTtlDays", "Key lifetime (days)"],
    ],
  },
];

const NUMERIC_FIELDS = GROUPS.flatMap((g) => g.fields.map(([f]) => f));

function toForm(policy) {
  const l = policy?.limits || {};
  const form = { name: policy?.name || "" };
  for (const f of NUMERIC_FIELDS) form[f] = l[f] ?? "";
  form.allowedModels = (l.allowedModels || []).join("\n");
  form.blockedModels = (l.blockedModels || []).join("\n");
  form.kinds = Array.isArray(l.allowedKinds) ? l.allowedKinds : [...OFFICE_KINDS];
  form.hoursEnabled = Boolean(l.allowedHours);
  form.hoursStart = l.allowedHours?.start || "09:00";
  form.hoursEnd = l.allowedHours?.end || "18:00";
  form.hoursDays = l.allowedHours?.days || [1, 2, 3, 4, 5];
  form.onLimit = l.onLimit || "block";
  form.fallbackModel = l.fallbackModel || "";
  return form;
}

function toLimits(form) {
  const limits = {};
  for (const f of NUMERIC_FIELDS) limits[f] = form[f] === "" ? null : Number(form[f]);
  limits.allowedModels = form.allowedModels;
  limits.blockedModels = form.blockedModels;
  limits.allowedKinds = form.kinds;
  limits.allowedHours = form.hoursEnabled ? { start: form.hoursStart, end: form.hoursEnd, days: form.hoursDays } : null;
  limits.onLimit = form.onLimit;
  limits.fallbackModel = form.fallbackModel;
  return limits;
}

function toggleIn(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// Remounted (via `key`) each time it opens, so state starts fresh from props.
function PolicyEditor({ isOpen, policy, onClose, onSaved }) {
  const [form, setForm] = useState(() => toForm(policy));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.hoursEnabled && (!form.hoursDays.length || form.hoursStart === form.hoursEnd)) {
      setError("Working hours need at least one day and a start different from the end.");
      return;
    }
    if (form.onLimit === "fallback" && !form.fallbackModel.trim()) {
      setError("Enter the cheaper model to switch to, or choose Block.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = { name: form.name, limits: toLimits(form) };
      if (policy) await officeApi(`/api/office/admin/policies/${policy.id}`, { method: "PATCH", body });
      else await officeApi("/api/office/admin/policies", { method: "POST", body });
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
      size="full"
      title={policy ? `Edit limits: ${policy.name}` : "New limits policy"}
      footer={
        <>
          {error && <p className="text-sm text-red-500 mr-auto">{error}</p>}
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="office-policy-form" loading={saving}>Save</Button>
        </>
      }
    >
      <form id="office-policy-form" onSubmit={submit} className="flex flex-col gap-6">
        <Input label="Policy name" required value={form.name} onChange={(e) => set("name")(e.target.value)} placeholder="Standard developer" maxLength={80} autoFocus />
        <p className="text-xs text-text-muted -mt-4">Leave a field blank for no limit. Day and month windows use this server&apos;s local time.</p>

        {GROUPS.map((group) => (
          <section key={group.title} className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold">{group.title}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {group.fields.map(([field, label, step]) => (
                <LimitInput key={field} label={label} value={form[field]} step={step} onChange={set(field)} />
              ))}
            </div>
          </section>
        ))}

        <section className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold">When a budget runs out</h4>
          <div className="flex flex-col sm:flex-row gap-3">
            {[
              ["block", "Block requests until the budget resets"],
              ["fallback", "Switch chat requests to a cheaper model"],
            ].map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="onLimit" checked={form.onLimit === value} onChange={() => set("onLimit")(value)} />
                {label}
              </label>
            ))}
          </div>
          {form.onLimit === "fallback" && (
            <Input label="Cheaper model" value={form.fallbackModel} onChange={(e) => set("fallbackModel")(e.target.value)} placeholder="e.g. cc/claude-haiku-4-5" />
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold">Models</h4>
          <div className="grid md:grid-cols-2 gap-3">
            <TextArea
              label="Allowed models"
              value={form.allowedModels}
              onChange={set("allowedModels")}
              placeholder={"cc/*\nopenai/gpt-4o-mini"}
              hint="One pattern per line; * matches anything. Empty = all models."
            />
            <TextArea
              label="Blocked models"
              value={form.blockedModels}
              onChange={set("blockedModels")}
              placeholder={"*opus*"}
              hint="Checked first — wins over the allow list."
            />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold">Allowed request types</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {OFFICE_KINDS.map((kind) => (
              <label key={kind} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.kinds.includes(kind)} onChange={() => set("kinds")(toggleIn(form.kinds, kind))} />
                {OFFICE_KIND_LABELS[kind]}
              </label>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <Toggle checked={form.hoursEnabled} onChange={set("hoursEnabled")} label="Only allow AI during working hours" description="Server local time. An end before the start spans midnight." />
          {form.hoursEnabled && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <input type="time" className="bg-surface-2 px-3 py-2 text-sm" value={form.hoursStart} onChange={(e) => set("hoursStart")(e.target.value)} aria-label="Start time" />
                <span className="text-sm text-text-muted">to</span>
                <input type="time" className="bg-surface-2 px-3 py-2 text-sm" value={form.hoursEnd} onChange={(e) => set("hoursEnd")(e.target.value)} aria-label="End time" />
              </div>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((label, day) => (
                  <label key={label} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.hoursDays.includes(day)} onChange={() => set("hoursDays")(toggleIn(form.hoursDays, day))} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </section>
      </form>
    </Modal>
  );
}

PolicyEditor.propTypes = { isOpen: PropTypes.bool, policy: PropTypes.object, onClose: PropTypes.func.isRequired, onSaved: PropTypes.func.isRequired };

function summarize(l) {
  const chips = [];
  if (l.requestsPerMinute) chips.push(`${fmtNumber(l.requestsPerMinute)} req/min`);
  if (l.requestsPerHour) chips.push(`${fmtNumber(l.requestsPerHour)} req/hour`);
  if (l.requestsPerDay) chips.push(`${fmtNumber(l.requestsPerDay)} req/day`);
  if (l.maxConcurrent) chips.push(`${l.maxConcurrent} at once`);
  if (l.tokensPerDay) chips.push(`${fmtTokens(l.tokensPerDay)} tok/day`);
  if (l.tokensPerMonth) chips.push(`${fmtTokens(l.tokensPerMonth)} tok/month`);
  if (l.costPerDay) chips.push(`${fmtUsd(l.costPerDay)}/day`);
  if (l.costPerMonth) chips.push(`${fmtUsd(l.costPerMonth)}/month`);
  if (l.maxOutputTokens) chips.push(`≤${fmtTokens(l.maxOutputTokens)} output`);
  if (l.maxInputTokens) chips.push(`≤${fmtTokens(l.maxInputTokens)} input`);
  if (l.allowedModels?.length) chips.push(`${l.allowedModels.length} allowed model pattern${l.allowedModels.length === 1 ? "" : "s"}`);
  if (l.blockedModels?.length) chips.push(`${l.blockedModels.length} blocked`);
  if (Array.isArray(l.allowedKinds)) chips.push(`${l.allowedKinds.length}/${OFFICE_KINDS.length} request types`);
  if (l.allowedHours) chips.push(`${l.allowedHours.start}–${l.allowedHours.end}`);
  if (l.onLimit === "fallback" && l.fallbackModel) chips.push(`falls back to ${l.fallbackModel}`);
  if (l.maxKeys) chips.push(`max ${l.maxKeys} keys`);
  if (l.keyTtlDays) chips.push(`keys expire in ${l.keyTtlDays}d`);
  return chips;
}

export default function PoliciesTab({ policies, onChanged }) {
  const [editor, setEditor] = useState({ open: false, policy: null, nonce: 0 });
  const openEditor = (policy) => setEditor((e) => ({ open: true, policy, nonce: e.nonce + 1 }));
  const closeEditor = () => setEditor((e) => ({ ...e, open: false }));
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const remove = async () => {
    setBusy(true);
    try {
      await officeApi(`/api/office/admin/policies/${deleting.id}`, { method: "DELETE" });
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-text-muted max-w-2xl">
          A policy is a reusable set of limits. Each employee uses their own policy if set, otherwise their team&apos;s, otherwise the office default (Overview tab).
        </p>
        <Button icon="add" onClick={() => openEditor(null)}>New policy</Button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {policies.length === 0 ? (
        <Card>
          <p className="text-sm text-text-muted text-center py-6">No policies yet — employees are unlimited until you add one.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {policies.map((p) => {
            const chips = summarize(p.limits);
            return (
              <Card key={p.id} padding="sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{p.name}</p>
                      {p.isDefault && <Badge size="sm" variant="primary">default</Badge>}
                    </div>
                    <p className="text-xs text-text-muted">
                      {p.userCount} employee{p.userCount === 1 ? "" : "s"} · {p.teamCount} team{p.teamCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" icon="edit" aria-label="Edit policy" onClick={() => openEditor(p)} />
                    <Button size="sm" variant="ghost" icon="delete" aria-label="Delete policy" onClick={() => setDeleting(p)} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {chips.length ? chips.map((c) => <Badge key={c} size="sm">{c}</Badge>) : <span className="text-xs text-text-muted">No limits (unlimited)</span>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <PolicyEditor
        key={editor.nonce}
        isOpen={editor.open}
        policy={editor.policy}
        onClose={closeEditor}
        onSaved={() => {
          closeEditor();
          onChanged();
        }}
      />
      <ConfirmModal
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busy}
        title="Delete policy?"
        confirmText="Delete"
        message={`Employees and teams using “${deleting?.name}” fall back to the next policy in line (team, then office default).`}
      />
    </div>
  );
}

PoliciesTab.propTypes = { policies: PropTypes.array.isRequired, onChanged: PropTypes.func.isRequired };
