"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Modal, Button } from "@/shared/components";

const API_URL = "/api/oauth/web-cookie/browser";
const DOWNLOAD_URL = "/downloads/polyrouter-connector.zip";
const PROVIDERS = {
  "chatgpt-web": "ChatGPT",
  "grok-web": "Grok",
  "perplexity-web": "Perplexity",
};
const ACTIVE_STATUSES = new Set(["starting", "waiting", "committing"]);

function sendConnectorRequest(action, connectionId = null, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const requestId = globalThis.crypto?.randomUUID?.()
      || `polyrouter-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", handleResponse);
      reject(new Error("PolyRouter Connector did not respond"));
    }, timeoutMs);

    function handleResponse(event) {
      if (
        event.source !== window
        || event.origin !== window.location.origin
        || event.data?.source !== "polyrouter-connector"
        || event.data?.type !== "POLYROUTER_CONNECTOR_RESPONSE"
        || event.data?.requestId !== requestId
      ) return;

      window.clearTimeout(timeout);
      window.removeEventListener("message", handleResponse);
      if (event.data.ok) resolve(event.data.data);
      else reject(new Error(event.data.error || "Connector request failed"));
    }

    window.addEventListener("message", handleResponse);
    window.postMessage({
      source: "polyrouter-web",
      type: "POLYROUTER_CONNECTOR_REQUEST",
      requestId,
      action,
      provider: "chatgpt-web",
      ...(connectionId ? { connectionId } : {}),
    }, window.location.origin);
  });
}

export default function WebCookieSigninModal({
  isOpen,
  provider,
  connectionId,
  onManual,
  onSuccess,
  onClose,
}) {
  const providerName = PROVIDERS[provider] || "Provider";
  const [flow, setFlow] = useState(null);
  const [error, setError] = useState("");
  const [connectorStatus, setConnectorStatus] = useState("checking");
  const [showConnector, setShowConnector] = useState(false);
  const flowRef = useRef(null);
  const completedRef = useRef(false);
  const generationRef = useRef(0);

  const reset = useCallback(() => {
    generationRef.current += 1;
    setFlow(null);
    flowRef.current = null;
    completedRef.current = false;
    setError("");
    setShowConnector(false);
    setConnectorStatus("checking");
  }, []);

  const poll = useCallback(async (flowId, generation) => {
    const response = await fetch(`${API_URL}?flowId=${encodeURIComponent(flowId)}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (generationRef.current !== generation) return null;
    if (!response.ok) throw new Error(data.error || "Could not check browser sign-in");
    setFlow(data);
    flowRef.current = data;
    if (data.status === "succeeded" && !completedRef.current) {
      completedRef.current = true;
      await onSuccess?.();
      if (generationRef.current !== generation) return data;
      window.setTimeout(() => {
        if (generationRef.current === generation) {
          reset();
          onClose?.();
        }
      }, 900);
    } else if (data.status === "failed") {
      setError(data.message || "Browser sign-in failed");
    }
    return data;
  }, [onClose, onSuccess, reset]);

  useEffect(() => {
    if (!isOpen || !flow?.flowId || !ACTIVE_STATUSES.has(flow.status)) return undefined;
    let stopped = false;
    const generation = generationRef.current;
    const timer = window.setInterval(() => {
      poll(flow.flowId, generation).catch((pollError) => {
        if (!stopped && generationRef.current === generation) setError(pollError.message);
      });
    }, 1000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [flow?.flowId, flow?.status, isOpen, poll]);

  useEffect(() => {
    if (!isOpen || provider !== "chatgpt-web") return undefined;
    let active = true;
    sendConnectorRequest("PING", null, 1500)
      .then(() => { if (active) setConnectorStatus("ready"); })
      .catch(() => { if (active) setConnectorStatus("missing"); });
    return () => { active = false; };
  }, [isOpen, provider]);

  const start = async () => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    setError("");
    setFlow({ status: "starting", message: `Opening ${providerName} sign-in` });
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, ...(connectionId ? { connectionId } : {}) }),
      });
      const data = await response.json().catch(() => ({}));
      if (generationRef.current !== generation) {
        if (response.ok && data.flowId) {
          await fetch(`${API_URL}?flowId=${encodeURIComponent(data.flowId)}`, { method: "DELETE" }).catch(() => {});
        }
        return;
      }
      if (!response.ok) throw new Error(data.error || "Could not open the sign-in browser");
      setFlow(data);
      flowRef.current = data;
    } catch (startError) {
      if (generationRef.current !== generation) return;
      setFlow(null);
      setError(startError.message);
    }
  };

  const cancel = useCallback(async () => {
    const active = flowRef.current;
    if (!active?.flowId || !ACTIVE_STATUSES.has(active.status)) return;
    flowRef.current = { ...active, status: "cancelled" };
    await fetch(`${API_URL}?flowId=${encodeURIComponent(active.flowId)}`, { method: "DELETE" }).catch(() => {});
  }, []);

  const close = async () => {
    await cancel();
    reset();
    onClose?.();
  };

  const openManual = async () => {
    await cancel();
    reset();
    onManual?.(connectionId);
  };

  const importConnector = async () => {
    setError("");
    try {
      await sendConnectorRequest("OPEN_PROVIDER_TAB");
      const imported = await sendConnectorRequest("IMPORT_PROVIDER_SESSION", connectionId, 30000);
      const response = await fetch("/api/oauth/chatgpt-web/cookie", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PolyRouter-Connector": "1",
        },
        body: JSON.stringify(imported),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || "PolyRouter rejected the ChatGPT session");
      }
      await onSuccess?.();
      reset();
      onClose?.();
    } catch (connectorError) {
      setError(connectorError.message);
    }
  };

  const active = ACTIVE_STATUSES.has(flow?.status);
  const succeeded = flow?.status === "succeeded";

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={`${connectionId ? "Renew" : "Connect"} ${providerName}`}
    >
      <div className="space-y-4">
        {succeeded ? (
          <div className="flex min-h-52 flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15 text-green-500">
              <span className="material-symbols-outlined text-3xl">check_circle</span>
            </div>
            <p className="text-lg font-semibold text-text-main">{providerName} connected</p>
            <p className="mt-1 text-sm text-text-muted">The browser window is closed and your local connection is ready.</p>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-surface-2 p-5">
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white">
                  <span className="material-symbols-outlined">open_in_browser</span>
                </div>
                <div>
                  <p className="font-semibold text-text-main">Sign in with a separate browser window</p>
                  <p className="mt-1 text-sm leading-6 text-text-muted">
                    PolyRouter opens a dedicated local Chrome or Edge profile. Sign in normally; your everyday browser profile is never read.
                  </p>
                </div>
              </div>
            </div>

            {!flow && (
              <Button fullWidth icon="login" onClick={start}>
                {connectionId ? "Renew sign-in" : `Sign in to ${providerName}`}
              </Button>
            )}

            {active && (
              <div className="rounded-xl border border-brand-500/20 bg-brand-500/10 p-4 text-center">
                <span className="material-symbols-outlined animate-spin text-2xl text-brand-500">progress_activity</span>
                <p className="mt-2 text-sm font-semibold text-text-main">{flow.message}</p>
                <p className="mt-1 text-xs text-text-muted">Complete password, CAPTCHA, or MFA in the opened window. This can take a few minutes.</p>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                <p className="text-sm text-red-500">{error}</p>
                <Button size="sm" variant="secondary" className="mt-3" onClick={start}>Try again</Button>
              </div>
            )}

            <div className="border-t border-border pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Other options</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button variant="secondary" icon="key" onClick={openManual} disabled={active}>
                  Enter cookie manually
                </Button>
                {provider === "chatgpt-web" && (
                  <Button
                    variant="secondary"
                    icon="extension"
                    onClick={() => setShowConnector((value) => !value)}
                    disabled={active}
                  >
                    Use existing browser
                  </Button>
                )}
              </div>
            </div>

            {provider === "chatgpt-web" && showConnector && (
              <div className="rounded-xl border border-border bg-surface-2 p-4">
                {connectorStatus === "ready" ? (
                  <>
                    <p className="text-sm font-semibold text-text-main">PolyRouter Connector is ready</p>
                    <p className="mt-1 text-xs text-text-muted">Import the ChatGPT session from your current Chrome profile after confirmation.</p>
                    <Button size="sm" className="mt-3" icon="sync_lock" onClick={importConnector}>Import current session</Button>
                  </>
                ) : connectorStatus === "checking" ? (
                  <p className="text-sm text-text-muted">Checking PolyRouter Connector…</p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-text-main">Connector is not installed</p>
                    <p className="mt-1 text-xs leading-5 text-text-muted">Use this fallback only when you specifically need your existing Chrome login.</p>
                    <a href={DOWNLOAD_URL} download className="mt-3 inline-flex h-9 items-center gap-2 bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600">
                      <span className="material-symbols-outlined text-[18px]">download</span>
                      Download extension
                    </a>
                  </>
                )}
              </div>
            )}

            <div className="flex justify-end border-t border-border pt-3">
              <Button variant="ghost" onClick={close}>{active ? "Cancel" : "Close"}</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

WebCookieSigninModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  provider: PropTypes.oneOf(Object.keys(PROVIDERS)).isRequired,
  connectionId: PropTypes.string,
  onManual: PropTypes.func,
  onSuccess: PropTypes.func,
  onClose: PropTypes.func,
};
