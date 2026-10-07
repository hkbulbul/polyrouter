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
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4 relative overflow-hidden">
      <div className="landing-grid absolute inset-0 pointer-events-none" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">{status.orgName || "PolyRouter"}</h1>
          <p className="text-text-muted">Employee sign-in</p>
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
