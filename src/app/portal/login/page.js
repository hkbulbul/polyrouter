"use client";

import { useEffect, useState } from "react";
import { Card, Button, Input } from "@/shared/components";

export default function PortalLoginPage() {
  const [status, setStatus] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/office/auth/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.signedIn) window.location.replace("/portal");
        else setStatus(data);
      })
      .catch(() => setStatus({ officeEnabled: false }));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/office/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Sign-in failed");
        return;
      }
      window.location.replace("/portal");
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  };

  if (!status) {
    return (
      <div className="dot-grid flex min-h-screen items-center justify-center bg-bg">
        <span className="material-symbols-outlined animate-spin text-[28px] text-primary">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="dot-grid relative flex min-h-screen items-center justify-center overflow-hidden bg-bg p-4">
      <div className="app-grain" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-5 flex size-11 items-center justify-center bg-[#ededed] p-2">
            <img src="/polyrouter-mark.png" alt="" width={28} height={28} className="size-full object-contain brightness-0" />
          </span>
          <p className="eyebrow mb-3">Employee portal</p>
          <h1 className="text-2xl font-medium tracking-[-0.02em] text-text-main">{status.orgName || "PolyRouter"}</h1>
          <p className="mt-2 text-sm text-text-muted">Sign in with your work email to manage your AI keys and usage.</p>
        </div>
        <Card>
          {!status.officeEnabled ? (
            <p className="text-sm text-text-muted text-center">
              Employee access is not turned on for this PolyRouter server. Ask your admin.
            </p>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <Input label="Work email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus autoComplete="username" />
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                endAdornment={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="inline-flex h-9 w-9 items-center justify-center text-text-muted hover:text-text-main"
                  >
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                }
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" loading={loading}>Sign in</Button>
              <p className="text-xs text-text-muted text-center">Forgot your password? Ask your PolyRouter admin to reset it.</p>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
