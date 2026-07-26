"use client";

import { useState, useEffect, useCallback } from "react";
import Modal, { ConfirmModal } from "./Modal";
import { useNotificationStore } from "@/store/notificationStore";
import { getDefaultPricing } from "open-sse/providers/pricing.js";
import Button from "./Button";

export default function PricingModal({ isOpen, onClose, onSave }) {
  const [pricingData, setPricingData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const notify = useNotificationStore();

  useEffect(() => {
    if (isOpen) {
      loadPricing();
    }
  }, [isOpen]);

  const loadPricing = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/pricing");
      if (response.ok) {
        const data = await response.json();
        setPricingData(data);
      } else {
        const defaults = getDefaultPricing();
        setPricingData(defaults);
      }
    } catch (error) {
      console.error("Failed to load pricing:", error);
      const defaults = getDefaultPricing();
      setPricingData(defaults);
    } finally {
      setLoading(false);
    }
  };

  const handlePricingChange = useCallback((provider, model, field, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;

    setPricingData((prev) => {
      const newData = { ...prev };
      if (!newData[provider]) newData[provider] = {};
      if (!newData[provider][model]) newData[provider][model] = {};
      newData[provider][model][field] = numValue;
      return newData;
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pricingData),
      });

      if (response.ok) {
        onSave?.();
        onClose();
      } else {
        const error = await response.json();
        notify.error(error.error || "Failed to save pricing");
      }
    } catch (error) {
      console.error("Failed to save pricing:", error);
      notify.error("Failed to save pricing");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetConfirmOpen(false);
    try {
      const response = await fetch("/api/pricing", { method: "DELETE" });
      if (response.ok) {
        const defaults = getDefaultPricing();
        setPricingData(defaults);
        notify.success("Pricing reset to defaults");
      }
    } catch (error) {
      console.error("Failed to reset pricing:", error);
      notify.error("Failed to reset pricing");
    }
  };

  // Get all unique providers and models for display
  const allProviders = Object.keys(pricingData).sort();
  const pricingFields = ["input", "output", "cached", "reasoning", "cache_creation"];

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pricing Configuration"
      size="full"
      footer={
        <div className="flex items-center justify-between gap-2 w-full">
          <Button
            variant="outline"
            onClick={() => setResetConfirmOpen(true)}
            disabled={saving}
            className="text-red-500 border-red-500/20 hover:bg-red-500/10"
          >
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              Save Changes
            </Button>
          </div>
        </div>
      }
    >
      <div className="-mx-5 -my-5 px-5 py-5 space-y-6 max-h-[calc(85vh-130px)] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="text-center py-8 text-text-muted">
            Loading pricing data...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-surface-2 border border-border-subtle rounded-[var(--radius-brand)] p-3 text-sm">
              <p className="font-medium mb-1">Pricing Rates Format</p>
              <p className="text-text-muted">
                All rates are in <strong>dollars per million tokens</strong> ($/1M
                tokens). Example: Input rate of 2.50 means $2.50 per 1,000,000
                input tokens.
              </p>
            </div>

            {/* Pricing Tables */}
            {allProviders.map((provider) => {
              const models = Object.keys(pricingData[provider]).sort();
              return (
                <div
                  key={provider}
                  className="border border-border-subtle rounded-[var(--radius-brand)] overflow-hidden"
                >
                  <div className="bg-surface-2 px-4 py-2 font-semibold text-sm">
                    {provider.toUpperCase()}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-2/40 text-text-muted uppercase text-xs">
                        <tr>
                          <th className="px-3 py-2 text-left">Model</th>
                          <th className="px-3 py-2 text-right text-blue-600 dark:text-blue-400">Input</th>
                          <th className="px-3 py-2 text-right text-amber-600 dark:text-amber-400">Output</th>
                          <th className="px-3 py-2 text-right">Cached</th>
                          <th className="px-3 py-2 text-right">Reasoning</th>
                          <th className="px-3 py-2 text-right">
                            Cache Creation
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {models.map((model) => (
                          <tr
                            key={model}
                            className="hover:bg-surface-2/50"
                          >
                            <td className="px-3 py-2 font-medium">{model}</td>
                            {pricingFields.map((field) => {
                              const isInput = field === "input";
                              const isOutput = field === "output";
                              const borderClass = isInput
                                ? "border-l-2 border-l-blue-400 dark:border-l-blue-500"
                                : isOutput
                                ? "border-l-2 border-l-amber-400 dark:border-l-amber-500"
                                : "";
                              return (
                                <td key={field} className={`px-3 py-2 ${borderClass}`}>
                                  <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={
                                    pricingData[provider][model][field] || 0
                                  }
                                  onChange={(e) =>
                                    handlePricingChange(
                                      provider,
                                      model,
                                      field,
                                      e.target.value
                                    )
                                  }
                                  className="w-20 px-2 py-1 text-right bg-surface border border-border rounded-[var(--radius-brand)] focus:outline-none focus:border-primary text-text-main text-sm"
                                />
                              </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {allProviders.length === 0 && (
              <div className="text-center py-8 text-text-muted">
                No pricing data available
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>

    <ConfirmModal
      isOpen={resetConfirmOpen}
      onClose={() => setResetConfirmOpen(false)}
      onConfirm={handleReset}
      title="Reset Pricing"
      message="Reset all pricing to defaults? This cannot be undone."
      confirmText="Reset"
      cancelText="Cancel"
      variant="danger"
    />
    </>
  );
}
