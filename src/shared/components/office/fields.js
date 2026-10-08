"use client";

import PropTypes from "prop-types";
import { cn } from "@/shared/utils/cn";

const controlClass =
  "w-full py-2 px-3 text-sm text-text-main bg-surface-2 border border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 disabled:opacity-50";

function FieldShell({ label, hint, children, className }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      {label && <span className="text-sm font-medium text-text-main">{label}</span>}
      {children}
      {hint && <span className="text-xs text-text-muted">{hint}</span>}
    </label>
  );
}

FieldShell.propTypes = { label: PropTypes.node, hint: PropTypes.node, children: PropTypes.node, className: PropTypes.string };

// Select where "" is a real, selectable choice (e.g. "No team").
export function OptionSelect({ label, hint, value, onChange, options, className, disabled }) {
  return (
    <FieldShell label={label} hint={hint} className={className}>
      <select className={controlClass} value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {options.map((o) => (
          <option key={o.value || "__empty__"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

OptionSelect.propTypes = {
  label: PropTypes.node,
  hint: PropTypes.node,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.string, label: PropTypes.node })).isRequired,
  className: PropTypes.string,
  disabled: PropTypes.bool,
};

// Numeric limit input: blank means "no limit".
export function LimitInput({ label, value, onChange, step = "1", placeholder = "No limit" }) {
  return (
    <FieldShell label={label}>
      <input
        type="number"
        min="0"
        step={step}
        inputMode="decimal"
        className={controlClass}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldShell>
  );
}

LimitInput.propTypes = {
  label: PropTypes.node,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  step: PropTypes.string,
  placeholder: PropTypes.string,
};

export function TextArea({ label, hint, value, onChange, placeholder, rows = 3 }) {
  return (
    <FieldShell label={label} hint={hint}>
      <textarea
        className={cn(controlClass, "font-mono text-xs")}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldShell>
  );
}

TextArea.propTypes = {
  label: PropTypes.node,
  hint: PropTypes.node,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  rows: PropTypes.number,
};
