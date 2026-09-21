"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, Button, ModelSelectModal, ManualConfigModal } from "@/shared/components";
import Image from "next/image";
import BaseUrlSelect from "./BaseUrlSelect";
import ApiKeySelect from "./ApiKeySelect";
import { matchKnownEndpoint } from "./cliEndpointMatch";

const ENDPOINT = "/api/cli-tools/deepseek-harness-settings";

function orderModelsWithDefault(models, preferredModel) {
  if (!preferredModel || !models.includes(preferredModel)) return models;
  return [preferredModel, ...models.filter((model) => model !== preferredModel)];
}

export default function DeepSeekHarnessToolCard({
  tool, isExpanded, onToggle, hasActiveProviders, apiKeys, activeProviders,
  cloudEnabled, initialStatus, tunnelEnabled, tunnelPublicUrl, tailscaleEnabled, tailscaleUrl,
}) {
  const [status, setStatus] = useState(initialStatus || null);
  const [checking, setChecking] = useState(false);
  const [applying, setApplying] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState(null);
  const initialModels = Array.isArray(initialStatus?.models)
    ? initialStatus.models.filter(Boolean)
    : Array.isArray(initialStatus?.settings?.models)
      ? initialStatus.settings.models.filter(Boolean)
      : [];
  const initialConfiguredDefault = initialStatus?.defaultModel?.model || initialStatus?.settings?.defaultModel?.model || "";
  const initialDefaultModel = initialConfiguredDefault && initialModels.includes(initialConfiguredDefault)
    ? initialConfiguredDefault
    : initialStatus?.model || initialModels[0] || initialConfiguredDefault || "";
  const [selectedApiKey, setSelectedApiKey] = useState(apiKeys?.[0]?.key || "");
  const [selectedModels, setSelectedModels] = useState(() => {
    const models = Array.isArray(initialModels) ? initialModels.filter(Boolean) : [];
    return models.length > 0
      ? orderModelsWithDefault(models, initialDefaultModel)
      : initialDefaultModel
        ? [initialDefaultModel]
        : [];
  });
  const [selectedModel, setSelectedModel] = useState(initialDefaultModel);
  const [customBaseUrl, setCustomBaseUrl] = useState(initialStatus?.baseUrl || initialStatus?.settings?.baseUrl || "");
  const [modelAliases, setModelAliases] = useState({});
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const initialized = useRef(Boolean(initialStatus));

  const hydrate = useCallback((next) => {
    const hydratedModels = Array.isArray(next?.models)
      ? next.models.filter(Boolean)
      : Array.isArray(next?.settings?.models)
        ? next.settings.models.filter(Boolean)
        : [];
    const configuredDefault = next?.defaultModel?.model || next?.settings?.defaultModel?.model || "";
    const fallback = configuredDefault && hydratedModels.includes(configuredDefault)
      ? configuredDefault
      : next?.model || hydratedModels[0] || configuredDefault || "";
    const models = hydratedModels.length > 0
      ? orderModelsWithDefault(hydratedModels, fallback)
      : fallback
        ? [fallback]
        : [];
    setSelectedModels(models);
    setSelectedModel(fallback);
    if (next?.baseUrl) setCustomBaseUrl(next.baseUrl);
  }, []);

  const checkStatus = useCallback(async ({ hydrateForm = false } = {}) => {
    setChecking(true);
    try {
      const res = await fetch(ENDPOINT);
      const data = await res.json();
      setStatus(data);
      if (hydrateForm) hydrate(data);
    } catch (error) {
      setStatus({ installed: false, error: error.message });
    } finally {
      setChecking(false);
    }
  }, [hydrate]);

  useEffect(() => {
    if (!isExpanded) return;
    const load = async () => {
      if (!initialized.current) {
        initialized.current = true;
        await checkStatus({ hydrateForm: true });
      }
      try {
        const res = await fetch("/api/models/alias");
        const data = await res.json();
        if (res.ok) setModelAliases(data.aliases || {});
      } catch { /* model picker remains usable without aliases */ }
    };
    load();
  }, [isExpanded, checkStatus]);

  const getEffectiveBaseUrl = () => {
    const url = customBaseUrl || (typeof window !== "undefined"
      ? window.location.origin.replace("://localhost", "://127.0.0.1")
      : "http://127.0.0.1:20128");
    return url.replace(/\/+$/, "").endsWith("/v1") ? url.replace(/\/+$/, "") : `${url.replace(/\/+$/, "")}/v1`;
  };

  const handleApply = async () => {
    const models = selectedModels.map((model) => model.trim()).filter(Boolean);
    if (selectedModel.trim() && !models.includes(selectedModel.trim())) models.unshift(selectedModel.trim());
    if (models.length === 0) return;
    setApplying(true); setMessage(null);
    try {
      const environmentCredential = status?.credentialSource === "environment";
      const key = environmentCredential
        ? null
        : selectedApiKey?.trim() || apiKeys?.[0]?.key || (!cloudEnabled ? "sk_polyrouter" : null);
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: getEffectiveBaseUrl(), model: models[0], models, apiKey: key,
          credentialMode: environmentCredential
            ? "environment"
            : status?.credentialConfigured && !key ? "preserve" : undefined,
          expectedRevision: status?.revision,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to apply settings");
      setMessage({ type: "success", text: "DeepSeek Harness settings applied successfully." });
      setSelectedModels(models);
      setSelectedModel(models[0]);
      setSelectedApiKey("");
      await checkStatus();
    } catch (error) { setMessage({ type: "error", text: error.message }); }
    finally { setApplying(false); }
  };

  const handleReset = async () => {
    setResetting(true); setMessage(null);
    try {
      const res = await fetch(ENDPOINT, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: status?.revision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset settings");
      setMessage({ type: "success", text: "PolyRouter settings reset; unrelated Harness configuration was preserved." });
      setSelectedModels([]); setSelectedModel(""); setCustomBaseUrl("");
      await checkStatus({ hydrateForm: true });
    } catch (error) { setMessage({ type: "error", text: error.message }); }
    finally { setResetting(false); }
  };

  const currentUrl = status?.baseUrl || status?.settings?.baseUrl;
  const collision = status?.collision || status?.drift;
  const configStatus = !status?.installed ? null : collision ? "collision" : !currentUrl ? "not_configured" : matchKnownEndpoint(currentUrl, { tunnelPublicUrl, tailscaleUrl }) ? "configured" : "other";
  const manualBase = getEffectiveBaseUrl();
  const manualModel = selectedModel || "provider/model-id";
  const manualModels = selectedModels.length > 0 ? selectedModels : [manualModel];
  const manualConfigs = [
    { filename: "$DSH_HOME/settings.yaml", content: `llm-pi-ai:\n  providers:\n    polyrouter:\n      displayName: PolyRouter\n      apiKeyEnv: POLYROUTER_API_KEY\n      api: openai-completions\n      baseURL: ${manualBase}\n      compat:\n        thinkingFormat: deepseek\n      models:\n${manualModels.map((model) => `        - id: ${model}\n          name: ${model}`).join("\\n")}\n\nagent-default-model:\n  provider: polyrouter\n  model: ${manualModel}\n` },
    { filename: "$DSH_HOME/.credentials.yaml", content: `version: 1\nrefs:\n  POLYROUTER_API_KEY: <API_KEY_FROM_DASHBOARD>\nrecords: {}\n` },
    { filename: "Run", content: "npm install -g @deepseek-ai/dsh\ndsh web" },
  ];

  return (
    <Card padding="xs" className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 hover:cursor-pointer sm:items-center" onClick={onToggle}>
        <div className="flex min-w-0 items-center gap-3">
          <div className="size-8 flex items-center justify-center shrink-0"><Image src={tool.image || "/providers/deepseek-tui.png"} alt={tool.name} width={32} height={32} className="size-8 object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} /></div>
          <div className="min-w-0"><div className="flex min-w-0 flex-wrap items-center gap-2"><h3 className="font-medium text-sm">{tool.name}</h3>{configStatus === "configured" && <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-500/10 text-green-600 rounded-full">Connected</span>}{configStatus === "not_configured" && <span className="px-1.5 py-0.5 text-[10px] font-medium bg-yellow-500/10 text-yellow-600 rounded-full">Not configured</span>}{configStatus === "other" && <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-600 rounded-full">Other</span>}{configStatus === "collision" && <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-500/10 text-red-600 rounded-full">Provider conflict</span>}</div><p className="text-xs text-text-muted truncate">{tool.description}</p></div>
        </div>
        <span className={`material-symbols-outlined text-text-muted text-[20px] transition-transform ${isExpanded ? "rotate-180" : ""}`}>expand_more</span>
      </div>
      {isExpanded && <div className="mt-4 pt-4 border-t border-border flex flex-col gap-4">
        {checking && <div className="flex items-center gap-2 text-text-muted"><span className="material-symbols-outlined animate-spin">progress_activity</span><span>Checking DeepSeek Harness...</span></div>}
        {!checking && status && !status.installed && <div className="flex flex-col gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30"><div className="flex items-start gap-3"><span className="material-symbols-outlined text-yellow-500">warning</span><div className="flex-1"><p className="font-medium text-yellow-600 dark:text-yellow-400">DeepSeek Harness was not detected locally</p><p className="text-sm text-text-muted mt-1">Install the developer preview with:</p><code className="block mt-2 p-2 bg-black/20 text-xs font-mono">npm install -g @deepseek-ai/dsh</code><p className="text-sm text-text-muted mt-2">Run it with <code>dsh web</code>. Manual configuration is still available.</p></div></div><Button variant="secondary" size="sm" onClick={() => setManualOpen(true)}><span className="material-symbols-outlined text-[18px] mr-1">content_copy</span>Manual Config</Button></div>}
        {!checking && status?.installed && <>
          {tool.notes?.map((note, index) => <div key={index} className={`flex items-start gap-2 p-2 text-xs ${note.type === "warning" ? "bg-yellow-500/10 text-yellow-600" : "bg-blue-500/10 text-blue-600"}`}><span className="material-symbols-outlined text-[14px] mt-0.5">{note.type === "warning" ? "warning" : "info"}</span><span>{note.text}</span></div>)}
          {status.warnings?.filter((warning) => !warning.includes("POLYROUTER_API_KEY is supplied by the environment")).map((warning) => <div key={warning} className="flex items-start gap-2 p-2 text-xs bg-yellow-500/10 text-yellow-600"><span className="material-symbols-outlined text-[14px]">warning</span><span>{warning}</span></div>)}
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[8rem_auto_1fr] sm:items-center sm:gap-2"><span className="text-xs font-semibold text-text-main sm:text-right sm:text-sm">Select Endpoint</span><span className="material-symbols-outlined hidden text-text-muted text-[14px] sm:inline">arrow_forward</span><BaseUrlSelect value={customBaseUrl || getEffectiveBaseUrl()} onChange={setCustomBaseUrl} requiresExternalUrl={tool.requiresExternalUrl} tunnelEnabled={tunnelEnabled} tunnelPublicUrl={tunnelPublicUrl} tailscaleEnabled={tailscaleEnabled} tailscaleUrl={tailscaleUrl} /></div>
          {currentUrl && <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[8rem_auto_1fr] sm:items-center sm:gap-2"><span className="text-xs font-semibold text-text-main sm:text-right sm:text-sm">Current</span><span className="material-symbols-outlined hidden text-text-muted text-[14px] sm:inline">arrow_forward</span><span className="truncate bg-surface/40 px-2 py-2 text-xs text-text-muted sm:py-1.5">{currentUrl} · {status.model || "no model"}</span></div>}
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[8rem_auto_1fr] sm:items-center sm:gap-2"><span className="text-xs font-semibold text-text-main sm:text-right sm:text-sm">API Key</span><span className="material-symbols-outlined hidden text-text-muted text-[14px] sm:inline">arrow_forward</span><ApiKeySelect value={selectedApiKey} onChange={setSelectedApiKey} apiKeys={apiKeys} cloudEnabled={cloudEnabled} /></div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[8rem_auto_1fr_auto] sm:items-start sm:gap-2"><span className="text-xs font-semibold text-text-main sm:text-right sm:text-sm">Models</span><span className="material-symbols-outlined hidden text-text-muted text-[14px] sm:inline mt-2">arrow_forward</span><div className="min-w-0"><div className="flex flex-wrap gap-1.5 mb-1.5">{selectedModels.map((model, index) => <span key={`${model}-${index}`} className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs text-text-main"><button type="button" onClick={() => { const next = selectedModels.filter((_, i) => i !== index); setSelectedModels(next); if (model === selectedModel) setSelectedModel(next[0] || ""); }} className="text-text-muted hover:text-red-500" title={`Remove ${model}`}><span className="material-symbols-outlined text-[13px]">close</span></button>{model}{index === 0 && <span className="text-[10px] text-text-muted">default</span>}</span>)}</div><div className="relative"><input type="text" value={selectedModel} onChange={(e) => { const value = e.target.value; setSelectedModel(value); setSelectedModels((current) => current.length === 0 ? (value.trim() ? [value] : []) : [value, ...current.slice(1)]); }} placeholder="provider/model-id" className="w-full min-w-0 pl-2 pr-7 py-2 bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 sm:py-1.5" />{selectedModel && <button type="button" onClick={() => { setSelectedModel(""); setSelectedModels((current) => current.slice(1)); }} className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-text-muted hover:text-red-500"><span className="material-symbols-outlined text-[14px]">close</span></button>}</div></div><button type="button" onClick={() => setModelModalOpen(true)} disabled={!hasActiveProviders} className="w-full sm:w-auto border px-2 py-2 text-xs bg-surface border-border text-text-main hover:border-primary disabled:opacity-50">Select</button></div>
          {message && <div className={`flex items-center gap-2 px-2 py-1.5 text-xs ${message.type === "success" ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}><span className="material-symbols-outlined text-[14px]">{message.type === "success" ? "check_circle" : "error"}</span><span>{message.text}</span></div>}
          <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center"><Button variant="primary" size="sm" onClick={handleApply} disabled={selectedModels.length === 0 && !selectedModel.trim() || collision} loading={applying}><span className="material-symbols-outlined text-[14px] mr-1">save</span>Apply</Button><Button variant="outline" size="sm" onClick={handleReset} disabled={!status.hasPolyRouter || collision} loading={resetting}><span className="material-symbols-outlined text-[14px] mr-1">restore</span>Reset</Button><Button variant="ghost" size="sm" onClick={() => setManualOpen(true)}><span className="material-symbols-outlined text-[14px] mr-1">content_copy</span>Manual Config</Button></div>
        </>}
      </div>}
      {modelModalOpen && <ModelSelectModal isOpen={modelModalOpen} onClose={() => setModelModalOpen(false)} onSelect={(model) => { const value = model.value; setSelectedModels((current) => current.includes(value) ? current : [...current, value]); if (!selectedModel.trim()) setSelectedModel(value); }} onDeselect={(model) => { const value = model.value; setSelectedModels((current) => current.filter((entry) => entry !== value)); if (selectedModel === value) setSelectedModel(selectedModels.find((entry) => entry !== value) || ""); }} selectedModel={selectedModel} addedModelValues={selectedModels} closeOnSelect={false} activeProviders={activeProviders} modelAliases={modelAliases} title="Select Models for DeepSeek Harness" instruction="Click models to add or remove them. The first model is the default." />}
      <ManualConfigModal isOpen={manualOpen} onClose={() => setManualOpen(false)} title="DeepSeek Harness - Manual Configuration" configs={manualConfigs} />
    </Card>
  );
}
