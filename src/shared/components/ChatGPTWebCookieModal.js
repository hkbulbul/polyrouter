"use client";

import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Modal, Button } from "@/shared/components";

const DOWNLOAD_URL = "/downloads/polyrouter-connector.zip";
const PROVIDER = "chatgpt-web";

function sendConnectorRequest(action, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const requestId =
      globalThis.crypto?.randomUUID?.() ||
      `polyrouter-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", handleResponse);
      reject(new Error("PolyRouter Connector did not respond"));
    }, timeoutMs);

    function handleResponse(event) {
      if (
        event.source !== window ||
        event.origin !== window.location.origin ||
        event.data?.source !== "polyrouter-connector" ||
        event.data?.type !== "POLYROUTER_CONNECTOR_RESPONSE" ||
        event.data?.requestId !== requestId
      ) {
        return;
      }

      window.clearTimeout(timeout);
      window.removeEventListener("message", handleResponse);

      if (event.data.ok) {
        resolve(event.data.data);
      } else {
        reject(new Error(event.data.error || "Connector request failed"));
      }
    }

    window.addEventListener("message", handleResponse);
    window.postMessage(
      {
        source: "polyrouter-web",
        type: "POLYROUTER_CONNECTOR_REQUEST",
        requestId,
        action,
        provider: PROVIDER,
      },
      window.location.origin
    );
  });
}

export default function ChatGPTWebCookieModal({ isOpen, onSuccess, onClose }) {
  const [extensionStatus, setExtensionStatus] = useState("checking");
  const [action, setAction] = useState("idle");
  const [error, setError] = useState(null);
  const [mcpStatus, setMcpStatus] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    let active = true;

    sendConnectorRequest("PING", 1500)
      .then(() => {
        if (active) setExtensionStatus("ready");
      })
      .catch(() => {
        if (active) setExtensionStatus("missing");
      });

    fetch("/api/mcp/chatgpt-web/status", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((status) => {
        if (active && status) setMcpStatus(status);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [isOpen]);

  const handleOpenProvider = async () => {
    setAction("opening");
    setError(null);

    try {
      await sendConnectorRequest("OPEN_PROVIDER_TAB");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAction("idle");
    }
  };

  const handleImport = async () => {
    setAction("importing");
    setError(null);

    try {
      await sendConnectorRequest("IMPORT_PROVIDER_SESSION", 30000);
      setAction("success");
      window.setTimeout(() => {
        onSuccess?.();
        onClose?.();
      }, 1200);
    } catch (requestError) {
      setError(requestError.message);
      setAction("idle");
    }
  };

  const handleClose = () => {
    setError(null);
    setAction("idle");
    onClose?.();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Connect ChatGPT Web">
      <div className="space-y-4">
        {extensionStatus === "checking" && (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
            <span className="material-symbols-outlined animate-spin text-3xl text-brand-500">
              progress_activity
            </span>
            <div>
              <p className="font-semibold text-text-main">Checking browser connector</p>
              <p className="mt-1 text-sm text-text-muted">
                Looking for PolyRouter Connector in this Chrome profile.
              </p>
            </div>
          </div>
        )}

        {extensionStatus === "missing" && (
          <>
            <div className="overflow-hidden rounded-xl border border-border bg-surface-2">
              <div className="border-b border-border bg-gradient-to-br from-brand-500/15 via-transparent to-transparent p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm">
                  <span className="material-symbols-outlined">extension</span>
                </div>
                <p className="text-lg font-semibold text-text-main">
                  Add PolyRouter Connector first
                </p>
                <p className="mt-1 text-sm leading-6 text-text-muted">
                  The extension securely imports signed-in provider sessions from your
                  existing Chrome profile into local PolyRouter.
                </p>
              </div>

              <ol className="space-y-3 p-5 text-sm text-text-muted">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-500">1</span>
                  <span>Download and extract the extension ZIP.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-500">2</span>
                  <span>Open <strong className="text-text-main">chrome://extensions</strong>, enable Developer mode, then choose Load unpacked.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-500">3</span>
                  <span>Select the extracted folder and reload this PolyRouter page.</span>
                </li>
              </ol>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <a
                href={DOWNLOAD_URL}
                download
                className="inline-flex h-9 items-center justify-center gap-2 bg-brand-500 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Download extension
              </a>
              <Button variant="secondary" icon="refresh" onClick={() => window.location.reload()}>
                Reload after installing
              </Button>
            </div>
          </>
        )}

        {extensionStatus === "ready" && action !== "success" && (
          <>
            <div className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/10 p-4">
              <span className="material-symbols-outlined text-green-500">verified</span>
              <div>
                <p className="text-sm font-semibold text-text-main">PolyRouter Connector is ready</p>
                <p className="text-xs text-text-muted">Cookies stay local and are imported only after confirmation.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleOpenProvider}
                disabled={action !== "idle"}
                className="group rounded-xl border border-border bg-surface-2 p-4 text-left transition-colors hover:border-brand-500/40 hover:bg-surface-3 disabled:opacity-50"
              >
                <span className="material-symbols-outlined mb-4 text-2xl text-brand-500">open_in_browser</span>
                <span className="block text-sm font-semibold text-text-main">1. Open ChatGPT</span>
                <span className="mt-1 block text-xs leading-5 text-text-muted">Opens or focuses a tab in this Chrome window so you can sign in.</span>
              </button>

              <button
                type="button"
                onClick={handleImport}
                disabled={action !== "idle"}
                className="group rounded-xl border border-brand-500/30 bg-brand-500/10 p-4 text-left transition-colors hover:bg-brand-500/15 disabled:opacity-50"
              >
                <span className={`material-symbols-outlined mb-4 text-2xl text-brand-500 ${action === "importing" ? "animate-spin" : ""}`}>
                  {action === "importing" ? "progress_activity" : "sync_lock"}
                </span>
                <span className="block text-sm font-semibold text-text-main">2. Import session</span>
                <span className="mt-1 block text-xs leading-5 text-text-muted">Checks the signed-in tab and copies its complete session into PolyRouter.</span>
              </button>
            </div>

            {action === "importing" && (
              <div className="rounded-lg border border-brand-500/20 bg-brand-500/10 p-3 text-center">
                <p className="text-sm font-medium text-brand-500">Importing your ChatGPT session...</p>
                <p className="mt-1 text-xs text-text-muted">Keep the signed-in ChatGPT tab open.</p>
              </div>
            )}
          </>
        )}

        {action === "success" && (
          <div className="flex min-h-52 flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15 text-green-500">
              <span className="material-symbols-outlined text-3xl">check_circle</span>
            </div>
            <p className="text-lg font-semibold text-text-main">ChatGPT connected</p>
            <p className="mt-1 text-sm text-text-muted">The existing Chrome session is now available to PolyRouter.</p>
          </div>
        )}

        {mcpStatus?.enabled && (
          <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined mt-0.5 text-brand-500">hub</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-main">Full MCP tool bridge</p>
                <p className="mt-1 text-xs leading-5 text-text-muted">
                  In ChatGPT Developer mode, connect a Secure MCP Tunnel app named{" "}
                  <strong className="text-text-main">{mcpStatus.connectorName}</strong>. Point the tunnel at:
                </p>
                <code className="mt-2 block overflow-x-auto rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text-main">
                  {mcpStatus.endpoint}
                </code>
                <p className="mt-2 text-xs leading-5 text-text-muted">
                  When Codex or Cline sends tools, PolyRouter selects this connector automatically and keeps the browser turn alive until the client returns each tool result.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {action !== "success" && (
          <div className="flex justify-end border-t border-border pt-3">
            <Button variant="ghost" onClick={handleClose} disabled={action === "importing"}>
              Close
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

ChatGPTWebCookieModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onSuccess: PropTypes.func,
  onClose: PropTypes.func,
};
