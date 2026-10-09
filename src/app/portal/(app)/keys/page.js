"use client";

import { useState } from "react";
import PropTypes from "prop-types";
import Link from "next/link";
import { Card, Button, Input, Badge, ConfirmModal } from "@/shared/components";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import { officeApi, fmtRelative, fmtDateTime } from "@/shared/components/office/officeClient";
import { usePortal } from "../../_components/PortalContext";

function KeyRow({ k, onDelete }) {
  const { copied, copy } = useCopyToClipboard(1500);
  return (
    <div className="flex flex-col gap-3 border-b border-border-subtle px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-text-main">{k.name}</p>
          {k.deviceId && <Badge size="sm" variant="info">client</Badge>}
          {k.expired && <Badge size="sm" variant="error">expired</Badge>}
        </div>
        <p className="mt-1 break-all font-mono text-xs text-text-muted">{k.key}</p>
        <p className="mt-1 text-xs text-text-muted">
          Created {fmtRelative(k.createdAt)}
          {k.expiresAt && ` · ${k.expired ? "expired" : "expires"} ${fmtDateTime(k.expiresAt)}`}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button size="sm" variant="secondary" icon={copied ? "check" : "content_copy"} onClick={() => copy(k.key)}>
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button size="sm" variant="ghost" icon="delete" aria-label={`Delete ${k.name}`} onClick={() => onDelete(k)} />
      </div>
    </div>
  );
}

KeyRow.propTypes = { k: PropTypes.object.isRequired, onDelete: PropTypes.func.isRequired };

export default function PortalKeysPage() {
  const { me, reload } = usePortal();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const create = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      await officeApi("/api/office/me/keys", { method: "POST", body: { name: name || "My key" } });
      setName("");
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await officeApi(`/api/office/me/keys/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      await reload();
    } catch (err) {
      setError(err.message);
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  const ttl = me.policy.limits.keyTtlDays;
  const maxKeys = me.policy.limits.maxKeys;

  return (
    <div className="flex flex-col gap-6">
      {me.office.allowSelfServiceKeys ? (
        <Card title="Create a key" icon="add_circle" subtitle="Each key is tied to your account and your office limits.">
          <form onSubmit={create} className="flex flex-col gap-2 sm:flex-row">
            <Input placeholder="Key name, e.g. Laptop" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="flex-1" />
            <Button type="submit" icon="add" loading={creating}>Create key</Button>
          </form>
          {(ttl || maxKeys) && (
            <p className="mt-3 text-xs text-text-muted">
              {[maxKeys && `Up to ${maxKeys} keys`, ttl && `keys expire after ${ttl} days`].filter(Boolean).join(" · ")}. Keys made by the PolyRouter client don&apos;t count toward the limit.
            </p>
          )}
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-text-muted">Your admin creates keys for you, or use the PolyRouter client to get one automatically.</p>
        </Card>
      )}

      <Card padding="none">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <p className="eyebrow">Your keys · {me.keys.length}</p>
          {me.keys.length > 0 && (
            <Link href="/portal/setup" className="text-xs text-primary hover:underline">Use a key in your tools</Link>
          )}
        </div>
        {me.keys.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-text-muted">No API keys yet.</p>
        ) : (
          me.keys.map((k) => <KeyRow key={k.id} k={k} onDelete={setDeleting} />)
        )}
      </Card>

      <ConfirmModal
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busy}
        title="Delete API key?"
        confirmText="Delete"
        message={`Tools using “${deleting?.name}” stop working immediately.`}
      />
    </div>
  );
}
