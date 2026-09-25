"use client";

import { useState, useEffect } from "react";
import { Card, Button, ModelSelectModal, ManualConfigModal } from "@/shared/components";
import Image from "next/image";
import BaseUrlSelect from "./BaseUrlSelect";
import ApiKeySelect from "./ApiKeySelect";
import { matchKnownEndpoint } from "./cliEndpointMatch";
import { CODEX_MODEL_SLOTS, isCodexModelSlotId } from "@/lib/codexModelCatalog";

export default function CodexToolCard({ tool, isExpanded, onToggle, baseUrl, apiKeys, activeProviders, cloudEnabled, initialStatus, tunnelEnabled, tunnelPublicUrl, tailscaleEnabled, tailscaleUrl }) {
  const [codexStatus, setCodexStatus] = useState(initialStatus || null);
  const [checkingCodex, setCheckingCodex] = useState(false);
  const [applying, setApplying] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [selectedApiKey, setSelectedApiKey] = useState("");
  const [modelSlots, setModelSlots] = useState({});
  const [activeModelId, setActiveModelId] = useState("");
  const [subagentModelId, setSubagentModelId] = useState("");
  const [modelPickerTarget, setModelPickerTarget] = useState("");
  const [modelAliases, setModelAliases] = useState({});
  const [manualModelId, setManualModelId] = useState("");
  const [showManualConfigModal, setShowManualConfigModal] = useState(false);
  const [customBaseUrl, setCustomBaseUrl] = useState("");

  useEffect(() => {
    if (apiKeys?.length > 0 && !selectedApiKey) {
      setSelectedApiKey(apiKeys[0].key);
    }
  }, [apiKeys, selectedApiKey]);

  useEffect(() => {
    if (initialStatus) setCodexStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    if (isExpanded) {
      if (!codexStatus) checkCodexStatus();
      fetchModelAliases();
    }
  }, [isExpanded]);

  const fetchModelAliases = async () => {
    try {
      const res = await fetch("/api/models/alias");
      const data = await res.json();
      if (res.ok) setModelAliases(data.aliases || {});
    } catch (error) {
      console.log("Error fetching model aliases:", error);
    }
  };

  // Parse model and subagent settings from config content
  useEffect(() => {
    const configuredSlots = codexStatus?.modelSlots || {};
    if (codexStatus?.config) {
      const modelMatch = codexStatus.config.match(/^model\s*=\s*"([^"]+)"/m);
      const subagentModelMatch = codexStatus.config.match(/\[agents\.subagent\]\s*\n\s*model\s*=\s*"([^"]+)"/m);
      const configuredMainModel = modelMatch?.[1] || "";
      const configuredSubagentModel = subagentModelMatch?.[1] || "";

      setModelSlots(current => {
        const next = { ...current, ...configuredSlots };
        if (configuredMainModel && !isCodexModelSlotId(configuredMainModel) && !next["codex-astra"]) {
          next["codex-astra"] = configuredMainModel;
        }
        if (configuredSubagentModel && !isCodexModelSlotId(configuredSubagentModel) && !next["codex-sol"]) {
          next["codex-sol"] = configuredSubagentModel;
        }
        return next;
      });

      if (configuredMainModel) {
        setActiveModelId(isCodexModelSlotId(configuredMainModel) ? configuredMainModel : "codex-astra");
      }
      if (configuredSubagentModel) {
        setSubagentModelId(isCodexModelSlotId(configuredSubagentModel) ? configuredSubagentModel : "codex-sol");
      }
    } else if (Object.keys(configuredSlots).length > 0) {
      setModelSlots(current => ({ ...current, ...configuredSlots }));
    }
  }, [codexStatus]);

  const getConfigStatus = () => {
    if (!codexStatus?.installed) return null;
    if (!codexStatus.config) return "not_configured";
    const parsed = codexStatus.config.match(/base_url\s*=\s*"([^"]+)"/);
    const currentUrl = parsed ? parsed[1] : "";
    return matchKnownEndpoint(currentUrl, { tunnelPublicUrl, tailscaleUrl }) ? "configured" : "other";
  };

  const configStatus = getConfigStatus();

  const getEffectiveBaseUrl = () => {
    const url = customBaseUrl || `${baseUrl}/v1`;
    // Ensure URL ends with /v1
    return url.endsWith("/v1") ? url : `${url}/v1`;
  };

  const getDisplayUrl = () => customBaseUrl || `${baseUrl}/v1`;
  const selectedSlotId = modelPickerTarget.startsWith("slot:")
    ? modelPickerTarget.split(":")[1]
    : "";
  const selectedSlot = CODEX_MODEL_SLOTS.find(slot => slot.id === selectedSlotId);
  const modelPickerTitle = modelPickerTarget === "manual"
    ? "Select Manual Codex Model"
    : `Select Model for ${selectedSlot?.name || "Codex Slot"}`;
  const hasValidMainModel = Boolean(modelSlots[activeModelId]?.trim());
  const effectiveSubagentModelId = subagentModelId || activeModelId;
  const hasValidSubagentModel = Boolean(modelSlots[effectiveSubagentModelId]?.trim());
  const getConfiguredModel = (modelId) => {
    if (!modelId) return "";
    const mappedModel = modelSlots[modelId]?.trim();
    if (mappedModel) return mappedModel;
    return isCodexModelSlotId(modelId) ? "" : modelId;
  };
  const manualMainModel = getConfiguredModel(activeModelId) || manualModelId;
  const manualSubagentSlot = subagentModelId || activeModelId;
  const manualSubagentModel = getConfiguredModel(manualSubagentSlot) || manualMainModel;
  const hasManualModel = Boolean(manualMainModel);

  const checkCodexStatus = async () => {
    setCheckingCodex(true);
    try {
      const res = await fetch("/api/cli-tools/codex-settings");
      const data = await res.json();
      setCodexStatus(data);
    } catch (error) {
      setCodexStatus({ installed: false, error: error.message });
    } finally {
      setCheckingCodex(false);
    }
  };

  const handleApplySettings = async () => {
    setApplying(true);
    setMessage(null);
    try {
      // Use sk_polyrouter for localhost if no key, otherwise use selected key
      const keyToUse = (selectedApiKey && selectedApiKey.trim())
        ? selectedApiKey
        : (!cloudEnabled ? "sk_polyrouter" : selectedApiKey);

      const res = await fetch("/api/cli-tools/codex-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: getEffectiveBaseUrl(),
          apiKey: keyToUse,
          model: activeModelId,
          subagentModel: subagentModelId || activeModelId,
          catalogModels: Array.isArray(codexStatus?.availableModelIds)
            ? codexStatus.availableModelIds
            : undefined,
          modelSlots,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.modelCatalog?.registered) {
          setMessage({ type: "success", text: "Settings applied. Custom models were added to the Codex app; restart Codex to refresh its model picker." });
        } else if (data.modelCatalog?.warning) {
          setMessage({ type: "warning", text: `Settings applied with warning: ${data.modelCatalog.warning}` });
        } else {
          setMessage({ type: "success", text: "Settings applied successfully!" });
        }
        checkCodexStatus();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to apply settings" });
      }
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setApplying(false);
    }
  };

  const handleResetSettings = async () => {
    setRestoring(true);
    setMessage(null);
    try {
      const res = await fetch("/api/cli-tools/codex-settings", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Settings reset successfully!" });
        setModelSlots({});
        setActiveModelId("");
        setSubagentModelId("");
        setManualModelId("");
        checkCodexStatus();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to reset settings" });
      }
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setRestoring(false);
    }
  };

  const handleModelSelect = (model) => {
    if (modelPickerTarget === "manual") {
      setManualModelId(model.value);
      setModelPickerTarget("");
      return;
    }
    if (modelPickerTarget.startsWith("slot:")) {
      const slotId = modelPickerTarget.split(":")[1];
      setModelSlots(current => ({ ...current, [slotId]: model.value }));
    }
    setModelPickerTarget("");
  };

  const handleSlotMappingChange = (slotId, model) => {
    setModelSlots(current => ({ ...current, [slotId]: model }));
    if (!model.trim()) {
      setActiveModelId(current => current === slotId ? "" : current);
      setSubagentModelId(current => current === slotId ? "" : current);
    }
  };

  const handleSetMainSlot = (slotId) => {
    if (!modelSlots[slotId]?.trim()) return;
    setActiveModelId(slotId);
  };

  const handleToggleSubagentSlot = (slotId) => {
    if (!modelSlots[slotId]?.trim()) return;
    setSubagentModelId(current => current === slotId ? "" : slotId);
  };

  const getManualConfigs = () => {
    const keyToUse = (selectedApiKey && selectedApiKey.trim())
      ? selectedApiKey
      : (!cloudEnabled ? "sk_polyrouter" : "<API_KEY_FROM_DASHBOARD>");

    if (!manualMainModel) return [];

    const configContent = `# PolyRouter Configuration for Codex CLI
model = "${manualMainModel}"
model_provider = "polyrouter"

[model_providers.polyrouter]
name = "PolyRouter"
base_url = "${getEffectiveBaseUrl()}"
wire_api = "responses"
requires_openai_auth = false
experimental_bearer_token = "${keyToUse}"

[agents.subagent]
description = "Default PolyRouter subagent"
    model = "${manualSubagentModel}"
`;

    const authContent = JSON.stringify({
      auth_mode: "apikey",
      OPENAI_API_KEY: keyToUse
    }, null, 2);

    return [
      {
        filename: "~/.codex/config.toml",
        content: configContent,
      },
      {
        filename: "~/.codex/auth.json",
        content: authContent,
      },
    ];
  };

  return (
    <Card padding="xs" className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 hover:cursor-pointer sm:items-center" onClick={onToggle}>
        <div className="flex min-w-0 items-center gap-3">
          <div className="size-8 flex items-center justify-center shrink-0">
            <Image src="/providers/codex.png" alt={tool.name} width={32} height={32} className="size-8 object-contain " sizes="32px" onError={(e) => { e.target.style.display = "none"; }} loading="lazy" decoding="async" />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="font-medium text-sm">{tool.name}</h3>
              {configStatus === "configured" && <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-500/10 text-green-600 dark:text-green-400 rounded-full">Connected</span>}
              {configStatus === "not_configured" && <span className="px-1.5 py-0.5 text-[10px] font-medium bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-full">Not configured</span>}
              {configStatus === "other" && <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full">Other</span>}
            </div>
            <p className="text-xs text-text-muted truncate">{tool.description}</p>
          </div>
        </div>
        <span className={`material-symbols-outlined text-text-muted text-[20px] transition-transform ${isExpanded ? "rotate-180" : ""}`}>expand_more</span>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border flex flex-col gap-4">
          {checkingCodex && (
            <div className="flex items-center gap-2 text-text-muted">
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              <span>Checking Codex CLI...</span>
            </div>
          )}

          {!checkingCodex && codexStatus && !codexStatus.installed && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 ">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-yellow-500">warning</span>
                  <div className="flex-1">
                    <p className="font-medium text-yellow-600 dark:text-yellow-400">Codex CLI not detected locally</p>
                    <p className="text-sm text-text-muted">Manual configuration is still available if polyrouter is deployed on a remote server.</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pl-9">
                  <Button variant="outline" size="sm" onClick={() => setModelPickerTarget("manual")} disabled={!activeProviders?.length}>
                    <span className="material-symbols-outlined text-[18px] mr-1">model_training</span>
                    {manualMainModel || "Select Manual Model"}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setShowManualConfigModal(true)} disabled={!hasManualModel} title={hasManualModel ? "Copy manual Codex configuration" : "Select a model before copying the manual configuration"} className="!bg-yellow-500/20 !border-yellow-500/40 !text-yellow-700 dark:!text-yellow-300 hover:!bg-yellow-500/30">
                    <span className="material-symbols-outlined text-[18px] mr-1">content_copy</span>
                    Manual Config
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowInstallGuide(!showInstallGuide)}>
                    <span className="material-symbols-outlined text-[18px] mr-1">{showInstallGuide ? "expand_less" : "help"}</span>
                    {showInstallGuide ? "Hide" : "How to Install"}
                  </Button>
                </div>
              </div>
              {showInstallGuide && (
                <div className="p-4 bg-surface border border-border ">
                  <h4 className="font-medium mb-3">Installation Guide</h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-text-muted mb-1">macOS / Linux / Windows:</p>
                      <code className="block px-3 py-2 bg-black/5 dark:bg-white/5  font-mono text-xs">npm install -g @openai/codex</code>
                    </div>
                    <p className="text-text-muted">After installation, run <code className="px-1 bg-black/5 dark:bg-white/5 ">codex</code> to verify.</p>
                    <div className="pt-2 border-t border-border">
                      <p className="text-text-muted text-xs">
                        Codex uses <code className="px-1 bg-black/5 dark:bg-white/5 ">~/.codex/auth.json</code> with <code className="px-1 bg-black/5 dark:bg-white/5 ">OPENAI_API_KEY</code>.
                        Click &quot;Apply&quot; to auto-configure.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!checkingCodex && codexStatus?.installed && (
            <>
              <div className="flex flex-col gap-2">
                {/* Endpoint (selector) */}
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[8rem_auto_1fr] sm:items-center sm:gap-2">
                  <span className="text-xs font-semibold text-text-main sm:text-right sm:text-sm">Select Endpoint</span>
                  <span className="material-symbols-outlined hidden text-text-muted text-[14px] sm:inline">arrow_forward</span>
                  <BaseUrlSelect
                    value={customBaseUrl || getDisplayUrl()}
                    onChange={setCustomBaseUrl}
                    requiresExternalUrl={tool.requiresExternalUrl}
                    tunnelEnabled={tunnelEnabled}
                    tunnelPublicUrl={tunnelPublicUrl}
                    tailscaleEnabled={tailscaleEnabled}
                    tailscaleUrl={tailscaleUrl}
                  />
                </div>

                {/* Current configured */}
                {codexStatus?.config && (() => {
                  const parsed = codexStatus.config.match(/base_url\s*=\s*"([^"]+)"/);
                  const currentBaseUrl = parsed ? parsed[1] : null;
                  return currentBaseUrl ? (
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[8rem_auto_1fr_auto] sm:items-center sm:gap-2">
                      <span className="text-xs font-semibold text-text-main sm:text-right sm:text-sm">Current</span>
                      <span className="material-symbols-outlined hidden text-text-muted text-[14px] sm:inline">arrow_forward</span>
                      <span className="min-w-0 truncate  bg-surface/40 px-2 py-2 text-xs text-text-muted sm:py-1.5">
                        {currentBaseUrl}
                      </span>
                    </div>
                  ) : null;
                })()}

                {/* API Key */}
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[8rem_auto_1fr_auto] sm:items-center sm:gap-2">
                  <span className="text-xs font-semibold text-text-main sm:text-right sm:text-sm">API Key</span>
                  <span className="material-symbols-outlined hidden text-text-muted text-[14px] sm:inline">arrow_forward</span>
                  <ApiKeySelect value={selectedApiKey} onChange={setSelectedApiKey} apiKeys={apiKeys} cloudEnabled={cloudEnabled} />
                </div>

                {/* Model Mappings */}
                {CODEX_MODEL_SLOTS.map(slot => {
                  const hasMapping = Boolean(modelSlots[slot.id]?.trim());
                  const isMain = activeModelId === slot.id;
                  const isSubagent = subagentModelId === slot.id;
                  return (
                    <div
                      key={slot.id}
                      className="grid grid-cols-1 gap-1.5 sm:grid-cols-[8rem_auto_1fr_auto_auto_auto] sm:items-center sm:gap-2"
                    >
                      <span className="text-xs font-semibold text-text-main sm:text-right sm:text-sm">{slot.name}</span>
                      <span className="material-symbols-outlined hidden text-text-muted text-[14px] sm:inline">arrow_forward</span>
                      <div className="relative w-full min-w-0">
                        <input
                          type="text"
                          value={modelSlots[slot.id] || ""}
                          onChange={(event) => handleSlotMappingChange(slot.id, event.target.value)}
                          placeholder="provider/model-id"
                          className="w-full min-w-0 pl-2 pr-7 py-2 bg-surface border border-border font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 sm:py-1.5"
                        />
                        {modelSlots[slot.id] && (
                          <button
                            type="button"
                            onClick={() => handleSlotMappingChange(slot.id, "")}
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-text-muted transition-colors hover:text-red-500"
                            title={`Clear ${slot.name} mapping`}
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setModelPickerTarget(`slot:${slot.id}`)}
                        disabled={!activeProviders?.length}
                        className={`w-full whitespace-nowrap border px-2 py-2 text-xs transition-colors sm:w-auto sm:shrink-0 sm:py-1.5 ${activeProviders?.length ? "cursor-pointer border-border bg-surface text-text-main hover:border-primary" : "cursor-not-allowed border-border opacity-50"}`}
                      >
                        Select Model
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetMainSlot(slot.id)}
                        disabled={!hasMapping}
                        aria-pressed={isMain}
                        className={`w-full border px-2 py-2 text-xs transition-colors sm:w-auto sm:shrink-0 sm:py-1.5 ${isMain ? "border-primary/50 bg-primary/10 font-medium text-primary" : "border-border bg-surface text-text-muted hover:border-primary/40 hover:text-text-main"} disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        Main
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleSubagentSlot(slot.id)}
                        disabled={!hasMapping}
                        aria-pressed={isSubagent}
                        className={`w-full border px-2 py-2 text-xs transition-colors sm:w-auto sm:shrink-0 sm:py-1.5 ${isSubagent ? "border-primary/50 bg-primary/10 font-medium text-primary" : "border-border bg-surface text-text-muted hover:border-primary/40 hover:text-text-main"} disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        Subagent
                      </button>
                    </div>
                  );
                })}

                <p className="text-[11px] leading-4 text-text-muted">
                  Map each Codex picker name to a real model, then choose one Main and optionally one Subagent. For example, Astra can route to Fable 5 and Sol to Gemini.
                </p>
                </div>
              {message && (
                <div
                  role="status"
                  className={`flex items-center gap-2 px-2 py-1.5 text-xs ${
                    message.type === "success"
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : message.type === "warning"
                        ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                        : "bg-red-500/10 text-red-600 dark:text-red-400"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {message.type === "success" ? "check_circle" : message.type === "warning" ? "warning" : "error"}
                  </span>
                  <span>{message.text}</span>
                </div>
              )}
              <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center">
                <Button variant="primary" size="sm" onClick={handleApplySettings} disabled={(!selectedApiKey && (cloudEnabled && apiKeys.length > 0)) || !hasValidMainModel || !hasValidSubagentModel} loading={applying}>
                  <span className="material-symbols-outlined text-[14px] mr-1">save</span>Apply
                </Button>
                <Button variant="outline" size="sm" onClick={handleResetSettings} disabled={restoring} loading={restoring}>
                  <span className="material-symbols-outlined text-[14px] mr-1">restore</span>Reset
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowManualConfigModal(true)} disabled={!hasManualModel} title={hasManualModel ? "Copy manual Codex configuration" : "Select a model before copying the manual configuration"}>
                  <span className="material-symbols-outlined text-[14px] mr-1">content_copy</span>Manual Config
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {(modelPickerTarget.startsWith("slot:") || modelPickerTarget === "manual") && (
        <ModelSelectModal
          isOpen={modelPickerTarget === "manual" || Boolean(selectedSlot)}
          onClose={() => setModelPickerTarget("")}
          onSelect={handleModelSelect}
          selectedModel={modelPickerTarget === "manual" ? manualModelId : modelSlots[selectedSlotId] || ""}
          activeProviders={activeProviders}
          modelAliases={modelAliases}
          title={modelPickerTitle}
        />
      )}

      <ManualConfigModal
        isOpen={showManualConfigModal}
        onClose={() => setShowManualConfigModal(false)}
        title="Codex CLI - Manual Configuration"
        configs={getManualConfigs()}
      />
    </Card>
  );
}
