"use client";

import PropTypes from "prop-types";
import { Card } from "@/shared/components";
import { fmtDateTime, POLICY_SOURCE_LABELS } from "@/shared/components/office/officeClient";
import { usePortal } from "../../_components/PortalContext";
import ChangePasswordForm from "../../_components/ChangePasswordForm";

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-border-subtle py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="eyebrow">{label}</span>
      <span className="text-sm text-text-main sm:text-right">{children}</span>
    </div>
  );
}

Field.propTypes = { label: PropTypes.string, children: PropTypes.node };

export default function PortalAccountPage() {
  const { me, reload } = usePortal();
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Profile" icon="person" subtitle="Managed by your PolyRouter admin.">
        <Field label="Name">{me.user.name || "—"}</Field>
        <Field label="Email">{me.user.email}</Field>
        <Field label="Team">{me.user.team?.name || "—"}</Field>
        <Field label="Limits">{me.policy.name} <span className="text-text-muted">({POLICY_SOURCE_LABELS[me.policy.source]})</span></Field>
        <Field label="Last sign-in">{fmtDateTime(me.user.lastLoginAt)}</Field>
      </Card>
      <Card title="Change password" icon="lock" subtitle="Your other portal sessions are signed out.">
        <ChangePasswordForm onDone={reload} />
      </Card>
    </div>
  );
}
