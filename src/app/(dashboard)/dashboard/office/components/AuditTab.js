"use client";

import { useEffect, useState } from "react";
import { Card } from "@/shared/components";
import { officeApi, fmtDateTime } from "@/shared/components/office/officeClient";

const ACTION_LABELS = {
  "office.enabled": "Turned Office mode on",
  "office.disabled": "Turned Office mode off",
  "office.settings_updated": "Updated office settings",
  "user.created": "Added employee",
  "user.updated": "Edited employee",
  "user.disabled": "Disabled employee",
  "user.enabled": "Re-enabled employee",
  "user.deleted": "Deleted employee",
  "user.password_reset": "Reset password",
  "team.created": "Created team",
  "team.updated": "Edited team",
  "team.deleted": "Deleted team",
  "policy.created": "Created policy",
  "policy.updated": "Edited policy",
  "policy.deleted": "Deleted policy",
  "key.created": "Created API key",
  "key.deleted": "Deleted API key",
  "key.revoked": "Revoked API key",
  "device.registered": "Signed in on a device",
  "device.signed_out": "Signed a device out",
  "device.revoked": "Signed a device out",
  "employee.portal_login": "Signed in to the portal",
  "employee.password_changed": "Changed password",
};

export default function AuditTab() {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    officeApi("/api/office/admin/audit?limit=300")
      .then((d) => setEntries(d.entries))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <Card padding="none">
      {error && <p className="text-sm text-red-500 p-4">{error}</p>}
      {!entries && !error && <p className="text-sm text-text-muted p-4">Loading…</p>}
      {entries?.length === 0 && <p className="text-sm text-text-muted p-6 text-center">Nothing recorded yet.</p>}
      {entries?.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-muted border-b border-border">
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium">Who</th>
                <th className="px-4 py-2 font-medium">What</th>
                <th className="px-4 py-2 font-medium">Target</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-border/60">
                  <td className="px-4 py-2 text-text-muted whitespace-nowrap">{fmtDateTime(e.timestamp)}</td>
                  <td className="px-4 py-2">{e.actor}</td>
                  <td className="px-4 py-2">{ACTION_LABELS[e.action] || e.action}</td>
                  <td className="px-4 py-2 text-text-muted break-all">{e.target || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
