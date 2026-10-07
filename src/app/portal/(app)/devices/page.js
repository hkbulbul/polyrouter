"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Button, ConfirmModal } from "@/shared/components";
import { officeApi, fmtRelative } from "@/shared/components/office/officeClient";
import { usePortal } from "../../_components/PortalContext";

const PLATFORM_ICONS = { win32: "desktop_windows", darwin: "laptop_mac", linux: "computer" };

export default function PortalDevicesPage() {
  const { me, reload } = usePortal();
  const [signingOut, setSigningOut] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const signOutDevice = async () => {
    setBusy(true);
    try {
      await officeApi(`/api/office/me/devices/${signingOut.id}`, { method: "DELETE" });
      setSigningOut(null);
      await reload();
    } catch (err) {
      setError(err.message);
      setSigningOut(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card padding="none">
        <div className="border-b border-border px-5 py-4">
          <p className="eyebrow">Signed-in devices · {me.devices.length}</p>
        </div>
        {error && <p className="px-5 pt-4 text-sm text-red-500">{error}</p>}
        {me.devices.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <span className="material-symbols-outlined text-[32px] text-text-muted">devices</span>
            <p className="text-sm text-text-muted">You are not signed in to the PolyRouter client on any computer.</p>
            {me.office.allowClientLogin && (
              <Link href="/portal/setup#client">
                <Button size="sm" variant="secondary" icon="terminal">Set up the client</Button>
              </Link>
            )}
          </div>
        ) : (
          me.devices.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 border-b border-border-subtle px-5 py-4 last:border-0">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center border border-border-subtle bg-bg text-text-muted">
                  <span className="material-symbols-outlined text-[18px]">{PLATFORM_ICONS[d.platform] || "devices"}</span>
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-main">{d.name || "Device"}</p>
                  <p className="text-xs text-text-muted">
                    {d.platform || "unknown"} · signed in {fmtRelative(d.createdAt)} · last seen {fmtRelative(d.lastSeenAt)}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="ghost" icon="logout" onClick={() => setSigningOut(d)}>Sign out</Button>
            </div>
          ))
        )}
      </Card>
      <p className="text-xs text-text-muted">Signing a device out also deletes the API key the client created on it.</p>

      <ConfirmModal
        isOpen={Boolean(signingOut)}
        onClose={() => setSigningOut(null)}
        onConfirm={signOutDevice}
        loading={busy}
        title="Sign this device out?"
        confirmText="Sign out"
        message={`${signingOut?.name || "This device"} loses access immediately. Run polyrouter-client connect there to sign in again.`}
      />
    </div>
  );
}
