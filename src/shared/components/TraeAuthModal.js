"use client";
import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { Modal, Button, Input } from "@/shared/components";

const CLIENT_ID = "en1oxy7wnw8j9n";
function randomHex(bytes) {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}
function randomDigits(n) {
  let s = "";
  while (s.length < n) s += Math.floor(Math.random() * 1e10).toString();
  return s.slice(0, n);
}
function buildAuthUrl(cb, traceId) {
  const m = randomHex(32);
  const d = randomDigits(19);
  const ps = new URLSearchParams({
    login_version: "1",
    auth_from: "solo",
    login_channel: "native_ide",
    plugin_version: "2.3.24254",
    auth_type: "local",
    client_id: CLIENT_ID,
    redirect: "0",
    login_trace_id: traceId,
    auth_callback_url: cb,
    machine_id: m,
    device_id: d,
    x_device_id: d,
    x_machine_id: m,
    x_device_brand: "Mac14,7",
    x_device_type: "mac",
    x_os_version: "macOS 26.4.1",
    x_env: "",
    x_app_version: "0.1.7",
    x_app_type: "stable",
    hide_saas_login: "true",
  });
  return "https://www.trae.ai/authorization?" + ps.toString();
}

export default function TraeAuthModal({ isOpen, onSuccess, onClose }) {
  const [step, setStep] = useState("connect");
  const [accessToken, setAccessToken] = useState("");
  const [webId, setWebId] = useState("");
  const [bizUserId, setBizUserId] = useState("");
  const [userUniqueId, setUserUniqueId] = useState("");
  const [scope, setScope] = useState("marscode-us");
  const [tenant, setTenant] = useState("marscode");
  const [region, setRegion] = useState("US-East");
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const traceRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setStep("connect");
      setError(null);
      setAuthorizing(false);
      setImporting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onMsg = (ev) => {
      const m = ev.data;
      if (!m || m.type !== "trae-oauth-callback") return;
      const here = location;
      const alt = here.hostname === "127.0.0.1" ? "localhost" : here.hostname === "localhost" ? "127.0.0.1" : null;
      const allowed = new Set([here.origin]);
      if (alt) allowed.add(here.protocol + "//" + alt + (here.port ? ":" + here.port : ""));
      if (!allowed.has(ev.origin)) return;
      if (!traceRef.current || m.loginTraceId !== traceRef.current) return;
      setAuthorizing(false);
      if (m.success) {
        setStep("success");
        onSuccess?.();
      } else {
        setError(m.error || "Authorization failed");
        setStep("error");
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [isOpen, onSuccess]);

  const handleAuthorize = () => {
    setError(null);
    setAuthorizing(true);
    setStep("waiting");
    const tid = crypto.randomUUID();
    traceRef.current = tid;
    const port = location.port || (location.protocol === "https:" ? "443" : "80");
    const cb = "http://127.0.0.1:" + port + "/authorize";
    const url = buildAuthUrl(cb, tid);
    const w = window.open(url, "trae-oauth", "width=520,height=720");
    if (!w) {
      setAuthorizing(false);
      setStep("connect");
      setError("Popup blocked - allow popups and try again.");
      return;
    }
    const poll = setInterval(() => {
      if (w.closed) {
        clearInterval(poll);
        setAuthorizing((p) => {
          if (p) {
            setError("Authorization window closed before completion.");
            setStep("error");
          }
          return false;
        });
      }
    }, 700);
  };

  const handleImport = async () => {
    if (!accessToken.trim()) {
      setError("Access token required");
      setStep("error");
      return;
    }
    setImporting(true);
    setError(null);
    try {
      const body = { accessToken: accessToken.trim() };
      if (webId.trim()) body.webId = webId.trim();
      if (bizUserId.trim()) body.bizUserId = bizUserId.trim();
      if (userUniqueId.trim()) body.userUniqueId = userUniqueId.trim();
      if (scope.trim()) body.scope = scope.trim();
      if (tenant.trim()) body.tenant = tenant.trim();
      if (region.trim()) body.region = region.trim();
      const r = await fetch("/api/oauth/trae/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || d.error?.message || "Import failed");
      setStep("success");
      onSuccess?.();
    } catch (e) {
      setError(e.message);
      setStep("error");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setStep("connect");
    setError(null);
    setAuthorizing(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} title="Connect Trae" onClose={handleClose}>
      <div className="flex flex-col gap-4">
        {step === "connect" && (
          <>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-emerald-600">login</span>
              </div>
              <div>
                <p className="text-sm font-semibold">Authorize with browser</p>
                <p className="text-xs text-text-muted">Sign in to trae.ai, then confirm. Callback is 127.0.0.1/authorize.</p>
              </div>
            </div>
            <Button onClick={handleAuthorize} disabled={authorizing} fullWidth icon="open_in_new">
              Authorize with Browser
            </Button>
            <Button onClick={() => window.open("https://solo.trae.ai/", "_blank", "noopener,noreferrer")} variant="ghost" fullWidth icon="language">
              Open solo.trae.ai
            </Button>
            <div className="flex items-center gap-3 text-xs text-text-muted">
              <span className="flex-1 border-t border-border" />
              <span>or paste manually</span>
              <span className="flex-1 border-t border-border" />
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-800 dark:text-blue-200">DevTools Network - copy JWT from <code>Authorization: Cloud-IDE-JWT &lt;token&gt;</code> on any POST to core-normal.trae.ai (~14d). Paste below.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Access Token <span className="text-red-500">*</span>
              </label>
              <textarea
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="eyJ..."
                rows={3}
                className="w-full px-3 py-2 text-sm font-mono border border-border bg-background focus:outline-none focus:border-primary resize-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input value={webId} onChange={(e) => setWebId(e.target.value)} placeholder="webId (optional)" className="font-mono text-sm" />
              <Input value={bizUserId} onChange={(e) => setBizUserId(e.target.value)} placeholder="bizUserId (optional)" className="font-mono text-sm" />
              <Input value={userUniqueId} onChange={(e) => setUserUniqueId(e.target.value)} placeholder="userUniqueId (optional)" className="font-mono text-sm" />
              <Input value={scope} onChange={(e) => setScope(e.target.value)} placeholder="scope" className="text-sm" />
              <Input value={tenant} onChange={(e) => setTenant(e.target.value)} placeholder="tenant" className="text-sm" />
              <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="region" className="text-sm" />
            </div>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 p-3 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={handleImport} fullWidth disabled={importing || !accessToken.trim()}>
                {importing ? "Importing..." : "Import Token"}
              </Button>
              <Button onClick={handleClose} variant="ghost" fullWidth>
                Cancel
              </Button>
            </div>
          </>
        )}

        {step === "waiting" && (
          <div className="text-center py-6">
            <div className="size-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-primary animate-spin">progress_activity</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Waiting for authorization...</h3>
            <p className="text-sm text-text-muted mb-4">Complete the login in the popup window. This window will update automatically.</p>
            <Button onClick={handleClose} variant="ghost" fullWidth>Cancel</Button>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-6">
            <div className="size-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-green-600">check_circle</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Connected Successfully!</h3>
            <p className="text-sm text-text-muted mb-4">Your Trae account has been connected.</p>
            <Button onClick={handleClose} fullWidth>Done</Button>
          </div>
        )}

        {step === "error" && (
          <div className="text-center py-6">
            <div className="size-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-red-600">error</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Connection Failed</h3>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <div className="flex gap-2">
              <Button onClick={() => { setStep("connect"); setError(null); }} variant="secondary" fullWidth>Try Again</Button>
              <Button onClick={handleClose} variant="ghost" fullWidth>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
TraeAuthModal.propTypes = { isOpen: PropTypes.bool.isRequired, onSuccess: PropTypes.func, onClose: PropTypes.func.isRequired };
