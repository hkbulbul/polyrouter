"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Button,
  Card,
  ConfirmModal,
  ManualConfigModal,
  ModelSelectModal,
} from "@/shared/components";
import BaseUrlSelect from "./BaseUrlSelect";
import ApiKeySelect from "./ApiKeySelect";

const ENDPOINT = "/api/cli-tools/commandcode-settings";
const ENV_KEY = "POLYROUTER_API_KEY";
const LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "::1"];

const inspectEndpoint = (value) => {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    const remote = !LOOPBACK_HOSTS.includes(hostname);
    const pathname = url.pathname.replace(/\/+$/, "");
    url.pathname = pathname.endsWith("/v1") ? pathname : `${pathname}/v1`;
    const valid = ["http:", "https:"].includes(url.protocol)
      && !url.username
      && !url.password
      && !url.search
      && !url.hash
      && (!remote || url.protocol === "https:");
    return {
      valid,
      remote,
      normalized: valid ? url.toString().replace(/\/$/, "") : "",
    };
  } catch {
    return { valid: false, remote: false, normalized: "" };
  }
};

const modelValue = (model) => model?.value || model?.name || model;

export default function CommandCodeToolCard({
  tool,
  isExpanded,
  onToggle,
  activeProviders,
  requireApiKey,
  apiKeys,
  cloudEnabled,
  tunnelEnabled,
  tunnelPublicUrl,
  tailscaleEnabled,
  tailscaleUrl,
}) {
  const [status, setStatus] = useState(null);
  const [checking, setChecking] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [selectedModels, setSelectedModels] = useState([]);
  const [modelInput, setModelInput] = useState("");
  const [authMode, setAuthMode] = useState(requireApiKey ? "stored" : "keyless");
  const [userSelectedApiKey, setUserSelectedApiKey] = useState(null);
  const defaultApiKey = apiKeys?.[0]?.key || (!cloudEnabled ? "sk_polyrouter" : "");
  const selectedApiKey = userSelectedApiKey ?? defaultApiKey;
  const setSelectedApiKey = setUserSelectedApiKey;
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [modelAliases, setModelAliases] = useState({});
  const [apiKeyRequired, setApiKeyRequired] = useState(requireApiKey);
  const statusRequestRef = useRef(0);

  const hydrateSettings = useCallback((data) => {
    setStatus(data);
    setApiKeyRequired(data.apiKeyRequired === true);
    if (!data.settings) {
      setBaseUrl("");
      setSelectedModels([]);
      setAuthMode(data.apiKeyRequired ? "stored" : "keyless");
      return;
    }
    setBaseUrl(data.settings.baseUrl || "");
    setSelectedModels(data.settings.models || []);
    if (data.settings.authMode === "custom") {
      setAuthMode("preserve");
    } else if (["stored", "environment"].includes(data.settings.authMode)) {
      setAuthMode("stored");
    } else if (data.settings.authMode === "keyless") {
      setAuthMode("keyless");
    }
  }, []);

  const checkStatus = useCallback(async ({ hydrate = false } = {}) => {
    const requestId = statusRequestRef.current + 1;
    statusRequestRef.current = requestId;
    setChecking(true);
    try {
      const response = await fetch(ENDPOINT, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to check Command Code");
      if (statusRequestRef.current !== requestId) return null;
      if (hydrate) hydrateSettings(data);
      else setStatus(data);
      return data;
    } catch (error) {
      if (statusRequestRef.current === requestId) {
        setStatus({ installed: false, error: error.message, warnings: [error.message] });
      }
      return null;
    } finally {
      if (statusRequestRef.current === requestId) setChecking(false);
    }
  }, [hydrateSettings]);

  useEffect(() => {
    if (!isExpanded) return;
    let cancelled = false;
    Promise.resolve().then(async () => {
      if (cancelled) return;
      await checkStatus({ hydrate: true });
      const response = await fetch("/api/models/alias");
      const data = await response.json();
      if (!cancelled && response.ok) setModelAliases(data.aliases || {});
    }).catch(() => {});
    return () => {
      cancelled = true;
      statusRequestRef.current += 1;
    };
  }, [isExpanded, checkStatus]);

  useEffect(() => {
    if (!isExpanded) return undefined;
    const refresh = () => { void checkStatus({ hydrate: true }); };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [isExpanded, checkStatus]);

  const endpoint = useMemo(() => inspectEndpoint(baseUrl), [baseUrl]);
  const configuredEndpoint = useMemo(
    () => inspectEndpoint(status?.settings?.baseUrl || ""),
    [status?.settings?.baseUrl],
  );
  const customAuthUnchanged = status?.settings?.authMode === "custom"
    && endpoint.valid
    && endpoint.normalized === configuredEndpoint.normalized;
  const keylessDisabled = apiKeyRequired || endpoint.remote;

  const changeBaseUrl = (value) => {
    const nextEndpoint = inspectEndpoint(value);
    const nextMatchesConfigured = status?.settings?.authMode === "custom"
      && nextEndpoint.valid
      && nextEndpoint.normalized === configuredEndpoint.normalized;
    setBaseUrl(value);
    setAuthMode((current) => {
      if (current === "preserve" && !nextMatchesConfigured) return "stored";
      if (current === "keyless" && nextEndpoint.remote) return "stored";
      return current;
    });
    setMessage(null);
  };

  const addModel = (value = modelInput) => {
    const model = typeof value === "string" ? value.trim() : "";
    if (!model) return;
    setSelectedModels((current) => current.includes(model) ? current : [...current, model]);
    setModelInput("");
    setMessage(null);
  };

  const removeModel = (value) => {
    const model = modelValue(value);
    setSelectedModels((current) => current.filter((item) => item !== model));
    setMessage(null);
  };

  const selectModel = (selected) => {
    if (selected?.isPlaceholder) {
      setModelInput(modelValue(selected));
      setModelModalOpen(false);
      return;
    }
    addModel(modelValue(selected));
  };

  const handleAdopt = async () => {
    setWorking(true);
    setMessage(null);
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "adopt",
          expectedRevision: status?.revision,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.code === "STALE_CONFIG") await checkStatus({ hydrate: true });
        throw new Error(data.error || "Unable to adopt Command Code configuration");
      }
      hydrateSettings({
        ...status,
        hasPolyRouter: true,
        collision: false,
        revision: data.revision,
        settings: data.settings,
        warnings: data.warnings || [],
        storedCredential: data.storedCredential === true,
        credentialStateKnown: data.credentialStateKnown !== false,
      });
      setMessage({ type: "success", text: data.message });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setWorking(false);
    }
  };

  const handleApply = async () => {
    setWorking(true);
    setMessage(null);
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "apply",
          baseUrl,
          models: selectedModels,
          authMode,
          ...(authMode === "stored" ? { apiKey: selectedApiKey } : {}),
          expectedRevision: status?.revision,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (["STALE_CONFIG", "API_KEY_REQUIRED"].includes(data.code)) {
          await checkStatus({ hydrate: true });
        }
        throw new Error(data.error || "Command Code configuration failed");
      }

      hydrateSettings({
        ...status,
        hasPolyRouter: true,
        revision: data.revision,
        settings: data.settings,
        warnings: data.warnings || [],
        storedCredential: data.storedCredential === true,
        credentialStateKnown: data.credentialStateKnown !== false,
      });
      setMessage({ type: "success", text: data.message });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setWorking(false);
    }
  };

  const handleReset = async () => {
    setWorking(true);
    setMessage(null);
    try {
      const response = await fetch(ENDPOINT, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: status?.revision }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (["STALE_CONFIG", "API_KEY_REQUIRED"].includes(data.code)) {
          await checkStatus({ hydrate: true });
        }
        throw new Error(data.error || "Unable to reset Command Code");
      }
      setResetModalOpen(false);
      hydrateSettings({
        ...status,
        hasPolyRouter: false,
        revision: data.revision,
        settings: null,
      });
      setMessage({ type: "success", text: data.message });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setWorking(false);
    }
  };

  const providerSnippet = {
    name: "PolyRouter",
    api: "openai-completions",
    polyrouterManaged: true,
    baseURL: baseUrl || "http://127.0.0.1:20128/v1",
    ...(authMode === "keyless"
      ? { apiKey: false }
      : authMode === "environment"
        ? { apiKey: `$${ENV_KEY}` }
        : {}),
    models: Object.fromEntries(
      (selectedModels.length ? selectedModels : ["provider/model-id"])
        .map((model) => [model, {}]),
    ),
  };
  const manualConfigs = [
    {
      filename: authMode === "preserve"
        ? "~/.commandcode/providers.json (merge only)"
        : "~/.commandcode/providers.json",
      content: authMode === "preserve"
        ? `Keep the existing apiKey and headers fields unchanged. Merge only:\n${JSON.stringify(providerSnippet, null, 2)}`
        : JSON.stringify({ provider: { polyrouter: providerSnippet } }, null, 2),
    },
    ...(authMode === "stored" ? [{
      filename: "~/.commandcode/auth.json (merge this field)",
      content: JSON.stringify({
        polyrouter: {
          type: "api",
          key: selectedApiKey || "<POLYROUTER_API_KEY>",
        },
      }, null, 2),
    }] : []),
    ...(authMode === "environment" ? [
      {
        filename: "Bash / zsh",
        content: `export ${ENV_KEY}="<POLYROUTER_API_KEY>"\ncommand-code`,
      },
      {
        filename: "PowerShell",
        content: `$env:${ENV_KEY} = "<POLYROUTER_API_KEY>"\ncommand-code`,
      },
    ] : []),
  ];

  const supported = status?.installed && !status?.updateRequired;
  const configStatus = !status?.installed
    ? null
    : status.updateRequired
      ? "update_required"
      : status.hasPolyRouter && status.compatible
        ? "configured"
        : "not_configured";
  const resetModels = status?.settings?.models?.join(", ") || "configured models";
  const canApply = endpoint.valid
    && selectedModels.length > 0
    && Boolean(status?.revision)
    && (!keylessDisabled || authMode !== "keyless")
    && (authMode !== "stored" || Boolean(selectedApiKey.trim()))
    && (authMode !== "preserve" || customAuthUnchanged);

  return (
    <Card padding="xs" className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 hover:cursor-pointer sm:items-center" onClick={onToggle}>
        <div className="flex min-w-0 items-center gap-3">
          <div className="size-8 flex items-center justify-center shrink-0">
            <Image src={tool.image} alt={tool.name} width={32} height={32} className="size-8 object-contain" sizes="32px" loading="lazy" decoding="async" />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="font-medium text-sm">{tool.name}</h3>
              {configStatus === "configured" && <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-500/10 text-green-600 dark:text-green-400 rounded-full">Connected</span>}
              {configStatus === "not_configured" && <span className="px-1.5 py-0.5 text-[10px] font-medium bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-full">Not configured</span>}
              {configStatus === "update_required" && <span className="px-1.5 py-0.5 text-[10px] font-medium bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-full">Update required</span>}
            </div>
            <p className="text-xs text-text-muted truncate">{tool.description}</p>
          </div>
        </div>
        <span className={`material-symbols-outlined text-text-muted text-[20px] transition-transform ${isExpanded ? "rotate-180" : ""}`}>expand_more</span>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border flex flex-col gap-4">
          {checking && <div className="flex items-center gap-2 text-text-muted"><span className="material-symbols-outlined animate-spin">progress_activity</span><span>Checking Command Code...</span></div>}

          {!checking && !status?.installed && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 text-sm">
              <p className="font-medium text-yellow-700 dark:text-yellow-300">Command Code not detected locally</p>
              <p className="mt-1 text-text-muted">Install Command Code 1.30.0 or later, then check again.</p>
              <code className="block mt-2 p-2 bg-black/10 dark:bg-white/5 text-xs">npm install -g command-code@latest</code>
            </div>
          )}

          {!checking && status?.updateRequired && (
            <div className="p-4 bg-orange-500/10 border border-orange-500/30 text-sm">
              <p className="font-medium text-orange-700 dark:text-orange-300">Command Code {status.version || "version unknown"} cannot load native BYOK providers</p>
              <p className="mt-1 text-text-muted">Upgrade to 1.30.0 or later. No configuration will be written.</p>
              <code className="block mt-2 p-2 bg-black/10 dark:bg-white/5 text-xs">npm install -g command-code@latest</code>
            </div>
          )}

          {!checking && supported && (
            <>
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[8rem_auto_1fr] sm:items-center sm:gap-2">
                  <span className="text-xs font-semibold text-text-main sm:text-right sm:text-sm">Endpoint</span>
                  <span className="material-symbols-outlined hidden text-text-muted text-[14px] sm:inline">arrow_forward</span>
                  <BaseUrlSelect key={status.revision} value={baseUrl} onChange={changeBaseUrl} preserveInitialValue tunnelEnabled={tunnelEnabled} tunnelPublicUrl={tunnelPublicUrl} tailscaleEnabled={tailscaleEnabled} tailscaleUrl={tailscaleUrl} />
                </div>

                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[8rem_auto_1fr] sm:items-start sm:gap-2">
                  <span className="text-xs font-semibold text-text-main sm:pt-2 sm:text-right sm:text-sm">Models {selectedModels.length > 0 && <span className="text-primary">({selectedModels.length})</span>}</span>
                  <span className="material-symbols-outlined hidden text-text-muted text-[14px] sm:mt-2 sm:inline">arrow_forward</span>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex min-h-[34px] flex-wrap gap-1.5 border border-border bg-surface px-2 py-1.5">
                      {selectedModels.length === 0 ? (
                        <span className="text-xs text-text-muted">No models selected</span>
                      ) : selectedModels.map((model) => (
                        <span key={model} className="inline-flex max-w-full items-center gap-1 border border-border bg-black/5 px-2 py-0.5 text-xs dark:bg-white/5">
                          <span className="truncate font-mono">{model}</span>
                          <button type="button" onClick={() => removeModel(model)} className="shrink-0 text-text-muted hover:text-red-500" title={`Remove ${model}`}>
                            <span className="material-symbols-outlined text-[12px]">close</span>
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        value={modelInput}
                        onChange={(event) => setModelInput(event.target.value)}
                        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addModel(); } }}
                        placeholder="provider/model-id"
                        className="w-full min-w-0 px-2 py-2 bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 sm:py-1.5"
                      />
                      <button type="button" onClick={() => setModelModalOpen(true)} disabled={!activeProviders?.length} className="shrink-0 border border-border bg-surface px-2 py-1.5 text-xs hover:border-primary disabled:opacity-50">Select</button>
                      <button type="button" onClick={() => addModel()} disabled={!modelInput.trim()} className="shrink-0 border border-border bg-surface px-2 py-1.5 hover:border-primary disabled:opacity-50" title="Add model">
                        <span className="material-symbols-outlined text-[14px]">add</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[8rem_auto_1fr] sm:items-center sm:gap-2">
                  <span className="text-xs font-semibold text-text-main sm:text-right sm:text-sm">Authentication</span>
                  <span className="material-symbols-outlined hidden text-text-muted text-[14px] sm:inline">arrow_forward</span>
                  <select value={authMode} onChange={(event) => { setAuthMode(event.target.value); setMessage(null); }} className="w-full px-2 py-2 bg-surface border border-border text-xs sm:py-1.5">
                    {customAuthUnchanged && <option value="preserve">Keep existing custom authentication</option>}
                    <option value="stored">Stored API key (automatic)</option>
                    <option value="keyless" disabled={keylessDisabled}>Keyless local endpoint</option>
                    <option value="environment">Environment variable: {ENV_KEY}</option>
                  </select>
                </div>

                {authMode === "stored" && (
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[8rem_auto_1fr] sm:items-start sm:gap-2">
                    <span className="text-xs font-semibold text-text-main sm:pt-2 sm:text-right sm:text-sm">API Key</span>
                    <span className="material-symbols-outlined hidden text-text-muted text-[14px] sm:mt-2 sm:inline">arrow_forward</span>
                    <ApiKeySelect value={selectedApiKey} onChange={setSelectedApiKey} apiKeys={apiKeys} cloudEnabled={cloudEnabled} />
                  </div>
                )}
              </div>

              {!endpoint.valid && baseUrl && <p className="p-2 bg-red-500/10 text-xs text-red-600">Use loopback HTTP or remote HTTPS without credentials, query parameters, or fragments.</p>}
              {apiKeyRequired && status?.settings?.authMode === "keyless" && authMode === "keyless" && <p className="p-2 bg-yellow-500/10 text-xs text-yellow-700 dark:text-yellow-300">This saved keyless configuration is incompatible because PolyRouter now requires an API key. Select stored API-key authentication, then click Apply.</p>}
              {authMode === "stored" && <p className="p-2 bg-blue-500/10 text-xs text-blue-700 dark:text-blue-300">Apply stores this key in Command Code&apos;s native auth.json provider credential. Existing Command Code login and other provider credentials stay unchanged.</p>}
              {status?.credentialStateKnown === false && <p className="p-2 bg-yellow-500/10 text-xs text-yellow-700 dark:text-yellow-300">Command Code auth.json is unreadable or invalid. Repair it before applying or resetting PolyRouter credentials.</p>}
              {authMode === "environment" && <p className="p-2 bg-blue-500/10 text-xs text-blue-700 dark:text-blue-300">Command Code will read {ENV_KEY} from the environment of every new process.</p>}
              {authMode === "preserve" && <p className="p-2 bg-blue-500/10 text-xs text-blue-700 dark:text-blue-300">Existing custom authentication stays unchanged. Changing the endpoint requires choosing authentication again.</p>}
              {status.warnings?.map((warning) => <p key={warning} className="p-2 bg-yellow-500/10 text-xs text-yellow-700 dark:text-yellow-300">{warning}</p>)}

              {status?.collision && <div className="p-2 bg-yellow-500/10 text-xs text-yellow-700 dark:text-yellow-300"><p>An existing markerless polyrouter provider may be from an earlier PolyRouter version or a manual configuration. Review providers.json first. Adoption changes only its ownership marker; Apply remains separate.</p><Button variant="outline" size="sm" onClick={handleAdopt} disabled={working} className="mt-2">Adopt existing provider</Button></div>}
              <p className="p-2 bg-primary/5 text-xs text-text-muted">Selections stay as drafts until Apply. Apply replaces only PolyRouter&apos;s configured model set. Command Code&apos;s active model remains unchanged.</p>
              {(working || message) && <div className={`flex items-center gap-2 px-2 py-1.5 text-xs ${working ? "bg-primary/5 text-text-muted" : message.type === "success" ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}><span className={`material-symbols-outlined text-[14px] ${working ? "animate-spin" : ""}`}>{working ? "progress_activity" : message.type === "success" ? "check_circle" : "error"}</span><span>{working ? "Updating Command Code configuration..." : message.text}</span></div>}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button variant="primary" size="sm" onClick={handleApply} disabled={!canApply || working || status.collision} loading={working}><span className="material-symbols-outlined text-[14px] mr-1">save</span>Apply</Button>
                <Button variant="outline" size="sm" onClick={() => setResetModalOpen(true)} disabled={(!status.hasPolyRouter && !status.storedCredential && !status.credentialEntryPresent) || working}><span className="material-symbols-outlined text-[14px] mr-1">restore</span>Reset</Button>
                <Button variant="ghost" size="sm" onClick={() => setManualModalOpen(true)}><span className="material-symbols-outlined text-[14px] mr-1">content_copy</span>Manual config</Button>
              </div>
            </>
          )}
        </div>
      )}

      <ModelSelectModal
        isOpen={modelModalOpen}
        onClose={() => setModelModalOpen(false)}
        onSelect={selectModel}
        onDeselect={removeModel}
        selectedModel={null}
        activeProviders={activeProviders}
        modelAliases={modelAliases}
        addedModelValues={selectedModels}
        closeOnSelect={false}
        instruction="Click to add, click again to remove. Selections are written only when you click Apply."
        title="Select Models for Command Code"
      />
      <ManualConfigModal isOpen={manualModalOpen} onClose={() => setManualModalOpen(false)} title="Command Code - Manual Configuration" configs={manualConfigs} />
      <ConfirmModal isOpen={resetModalOpen} onClose={() => setResetModalOpen(false)} onConfirm={handleReset} loading={working} title="Remove PolyRouter from Command Code?" confirmText="Remove provider" message={`Switch active Command Code sessions away from polyrouter/* first. This removes only PolyRouter's ${resetModels} provider entry and stored credential. Existing Command Code login and other provider credentials stay unchanged.`} />
    </Card>
  );
}
