"use client";

import { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Card, Button, Badge, Modal, ConfirmModal, SegmentedControl } from "@/shared/components";
import { LimitInput } from "@/shared/components/office/fields";

const PERIODS = [
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 365, label: "1 year" },
];

const RATE_FIELDS = [
  ["input", "Input"],
  ["output", "Output"],
  ["cached", "Cache read"],
  ["cache_creation", "Cache write"],
  ["reasoning", "Reasoning"],
];

const SOURCE_BADGE = {
  custom: { variant: "primary", label: "Custom" },
  builtin: { variant: "default", label: "Built-in" },
  none: { variant: "warning", label: "No price" },
};

const fmtUsd = (n) => `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtCompact = (n) => new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(Number(n) || 0);
const fmtRate = (n) => (n === undefined || n === null ? "—" : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 4 })}`);

async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function recalcMessage(r) {
  if (!r) return "";
  const delta = r.costAfter - r.costBefore;
  return `Re-priced ${r.rows.toLocaleString()} request${r.rows === 1 ? "" : "s"}: ${fmtUsd(r.costBefore)} → ${fmtUsd(r.costAfter)} (${delta >= 0 ? "+" : "−"}${fmtUsd(Math.abs(delta))}).`;
}

// Remounted (via `key`) for each model, so the form starts from its current rates.
function PriceEditor({ entry, onClose, onSaved }) {
  const base = entry.pricing || {};
  const [rates, setRates] = useState(() => Object.fromEntries(RATE_FIELDS.map(([f]) => [f, base[f] ?? ""])));
  const [applyToPast, setApplyToPast] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (e) => {
    e.preventDefault();
    if (rates.input === "" || rates.output === "") {
      setError("Input and output prices are required.");
      return;
    }
    const pricing = {};
    for (const [field] of RATE_FIELDS) {
      if (rates[field] === "") continue;
      const value = Number(rates[field]);
      if (!Number.isFinite(value) || value < 0) {
        setError("Prices must be zero or positive numbers.");
        return;
      }
      pricing[field] = value;
    }
    setSaving(true);
    setError("");
    try {
      await api("/api/pricing", { method: "PATCH", body: JSON.stringify({ [entry.provider]: { [entry.model]: pricing } }) });
      const result = applyToPast
        ? await api("/api/pricing/recalculate", { method: "POST", body: JSON.stringify({ provider: entry.provider, model: entry.model }) })
        : null;
      onSaved(result ? recalcMessage(result) : "Price saved. Past usage keeps its recorded cost.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Price for ${entry.model}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="price-editor-form" loading={saving}>Save price</Button>
        </>
      }
    >
      <form id="price-editor-form" onSubmit={save} className="flex flex-col gap-4">
        <p className="text-sm text-text-muted">
          USD per 1M tokens for <span className="font-mono text-text-main">{entry.provider}</span>. Leave cache and reasoning
          blank to use the input / output price.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {RATE_FIELDS.map(([field, label]) => (
            <LimitInput
              key={field}
              label={`${label}${field === "input" || field === "output" ? " *" : ""}`}
              value={rates[field]}
              step="0.0001"
              placeholder={field === "input" || field === "output" ? "required" : "same as " + (field === "reasoning" ? "output" : "input")}
              onChange={(v) => setRates((r) => ({ ...r, [field]: v }))}
            />
          ))}
        </div>
        <label className="flex items-start gap-2 text-sm text-text-main">
          <input type="checkbox" className="mt-0.5" checked={applyToPast} onChange={(e) => setApplyToPast(e.target.checked)} />
          <span>
            Apply to past usage of this model
            <span className="block text-xs text-text-muted">Re-prices every recorded request for it, including requests counted as $0 so far.</span>
          </span>
        </label>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>
    </Modal>
  );
}

PriceEditor.propTypes = { entry: PropTypes.object.isRequired, onClose: PropTypes.func.isRequired, onSaved: PropTypes.func.isRequired };

export default function PricingPage() {
  const [days, setDays] = useState(90);
  const [result, setResult] = useState({ days: null, models: null, error: "" });
  const [reloadTick, setReloadTick] = useState(0);
  const [editing, setEditing] = useState(null);
  const [editorNonce, setEditorNonce] = useState(0);
  const [resetting, setResetting] = useState(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({ type: "", message: "" });

  useEffect(() => {
    let active = true;
    api(`/api/pricing/models?days=${days}`)
      .then((data) => active && setResult({ days, models: data.models, error: "" }))
      .catch((e) => active && setResult({ days, models: null, error: e.message }));
    return () => {
      active = false;
    };
  }, [days, reloadTick]);

  const reload = useCallback(() => setReloadTick((t) => t + 1), []);
  const current = result.days === days ? result : { models: null, error: "" };
  const models = current.models;
  const unpriced = (models || []).filter((m) => m.source === "none" || m.unpricedRequests > 0);

  const openEditor = (entry) => {
    setEditorNonce((n) => n + 1);
    setEditing(entry);
  };

  const resetPrice = async () => {
    setBusy(true);
    try {
      await api(`/api/pricing?provider=${encodeURIComponent(resetting.provider)}&model=${encodeURIComponent(resetting.model)}`, { method: "DELETE" });
      const r = await api("/api/pricing/recalculate", { method: "POST", body: JSON.stringify({ provider: resetting.provider, model: resetting.model }) });
      setNotice({ type: "success", message: `Custom price removed. ${recalcMessage(r)}` });
      setResetting(null);
      reload();
    } catch (err) {
      setNotice({ type: "error", message: err.message });
      setResetting(null);
    } finally {
      setBusy(false);
    }
  };

  const recalcAll = async () => {
    setBusy(true);
    try {
      const r = await api("/api/pricing/recalculate", { method: "POST", body: "{}" });
      setNotice({ type: "success", message: recalcMessage(r) });
      setConfirmAll(false);
      reload();
    } catch (err) {
      setNotice({ type: "error", message: err.message });
      setConfirmAll(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm text-text-muted">
          Costs are estimates: recorded tokens × these USD rates per 1M tokens. Every model you have used is listed with the price applied to it.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <SegmentedControl size="sm" options={PERIODS} value={days} onChange={setDays} />
          <Button size="sm" variant="secondary" icon="calculate" onClick={() => setConfirmAll(true)}>Recalculate all</Button>
        </div>
      </div>

      {notice.message && (
        <p className={notice.type === "error" ? "text-sm text-red-500" : "text-sm text-green-600 dark:text-green-400"}>{notice.message}</p>
      )}

      {unpriced.length > 0 && (
        <div className="flex items-start gap-3 border border-amber-500/30 bg-amber-500/[0.06] p-4">
          <span className="material-symbols-outlined text-[20px] text-amber-500">price_change</span>
          <p className="text-sm text-text-main">
            {unpriced.length} model{unpriced.length === 1 ? " has" : "s have"}{" "}usage counted as $0 because no price was set. Office dollar budgets
            don&apos;t count that usage either. Set a price to include it — free models can be priced at $0.
          </p>
        </div>
      )}

      <Card padding="none">
        {current.error && <p className="p-5 text-sm text-red-500">{current.error}</p>}
        {!models && !current.error && <p className="p-5 text-sm text-text-muted">Loading…</p>}
        {models?.length === 0 && <p className="p-8 text-center text-sm text-text-muted">No usage in this period.</p>}
        {models?.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="eyebrow px-5 py-3 font-medium">Model</th>
                  <th className="eyebrow px-3 py-3 text-right font-medium">Usage</th>
                  <th className="eyebrow px-3 py-3 text-right font-medium">Recorded cost</th>
                  <th className="eyebrow px-3 py-3 text-right font-medium">Input</th>
                  <th className="eyebrow px-3 py-3 text-right font-medium">Output</th>
                  <th className="eyebrow px-3 py-3 text-right font-medium">Cache read</th>
                  <th className="eyebrow px-3 py-3 font-medium">Price</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {models.map((m) => {
                  const badge = SOURCE_BADGE[m.source];
                  return (
                    <tr key={`${m.provider}|${m.model}`} className="border-b border-border-subtle last:border-0">
                      <td className="px-5 py-3">
                        <p className="break-all font-mono text-xs text-text-main">{m.model}</p>
                        <p className="text-xs text-text-muted">{m.provider}</p>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs">
                        <p>{fmtCompact(m.tokens)} tok</p>
                        <p className="text-text-muted">{fmtCompact(m.requests)} req</p>
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        <p>{fmtUsd(m.cost)}</p>
                        {m.unpricedRequests > 0 && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">{fmtCompact(m.unpricedRequests)} at $0</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs">{fmtRate(m.pricing?.input)}</td>
                      <td className="px-3 py-3 text-right font-mono text-xs">{fmtRate(m.pricing?.output)}</td>
                      <td className="px-3 py-3 text-right font-mono text-xs">{fmtRate(m.pricing ? m.pricing.cached ?? m.pricing.input : null)}</td>
                      <td className="px-3 py-3"><Badge size="sm" variant={badge.variant}>{badge.label}</Badge></td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant={m.source === "none" ? "primary" : "secondary"} icon="sell" onClick={() => openEditor(m)}>
                            {m.source === "none" ? "Set price" : "Edit"}
                          </Button>
                          {m.source === "custom" && (
                            <Button size="sm" variant="ghost" icon="restart_alt" aria-label="Remove custom price" title="Remove custom price" onClick={() => setResetting(m)} />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && (
        <PriceEditor
          key={editorNonce}
          entry={editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            setNotice({ type: "success", message });
            reload();
          }}
        />
      )}
      <ConfirmModal
        isOpen={Boolean(resetting)}
        onClose={() => setResetting(null)}
        onConfirm={resetPrice}
        loading={busy}
        title="Remove custom price?"
        confirmText="Remove"
        variant="primary"
        message={`${resetting?.model} goes back to the built-in price${resetting?.builtinPricing ? "" : " (none — it will count as $0)"}, and its past usage is re-priced.`}
      />
      <ConfirmModal
        isOpen={confirmAll}
        onClose={() => setConfirmAll(false)}
        onConfirm={recalcAll}
        loading={busy}
        title="Recalculate all costs?"
        confirmText="Recalculate"
        variant="primary"
        message="Every recorded request is re-priced with today's prices (custom prices included). Totals on the Usage, Office and portal pages update accordingly."
      />
    </div>
  );
}
