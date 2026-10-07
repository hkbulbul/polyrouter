"use client";

import { useState } from "react";
import PropTypes from "prop-types";
import { Button, Input } from "@/shared/components";
import { officeApi } from "@/shared/components/office/officeClient";

export default function ChangePasswordForm({ required = false, onDone }) {
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
      await onDone?.();
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Input
        label={required ? "Temporary password" : "Current password"}
        type="password"
        value={form.current}
        onChange={(e) => setForm({ ...form, current: e.target.value })}
        required
        autoComplete="current-password"
        autoFocus={required}
      />
      <Input
        label="New password"
        type="password"
        value={form.next}
        onChange={(e) => setForm({ ...form, next: e.target.value })}
        required
        minLength={8}
        hint="At least 8 characters."
        autoComplete="new-password"
      />
      <Input
        label="Confirm new password"
        type="password"
        value={form.confirm}
        onChange={(e) => setForm({ ...form, confirm: e.target.value })}
        required
        autoComplete="new-password"
      />
      {status.message && (
        <p className={status.type === "error" ? "text-sm text-red-500" : "text-sm text-green-600 dark:text-green-400"}>{status.message}</p>
      )}
      <Button type="submit" loading={loading} className={required ? "w-full" : "self-start"}>
        {required ? "Set password and continue" : "Update password"}
      </Button>
    </form>
  );
}

ChangePasswordForm.propTypes = { required: PropTypes.bool, onDone: PropTypes.func };
