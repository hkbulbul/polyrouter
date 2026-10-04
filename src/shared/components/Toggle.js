"use client";

import { cn } from "@/shared/utils/cn";

export default function Toggle({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  size = "md",
  className,
}) {
  const sizes = {
    sm: { track: "w-8 h-4", thumb: "size-2.5", translate: "translate-x-[17px]" },
    md: { track: "w-10 h-5", thumb: "size-3.5", translate: "translate-x-[21px]" },
    lg: { track: "w-12 h-6", thumb: "size-4", translate: "translate-x-[25px]" },
  };

  const handleClick = () => {
    if (!disabled && onChange) onChange(!checked);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          "relative inline-flex shrink-0 items-center cursor-pointer border",
          "transition-colors duration-200 ease-in-out",
          checked ? "border-accent-fill bg-accent-fill" : "border-border-strong bg-surface-2",
          sizes[size].track,
          disabled && "cursor-not-allowed"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block",
            "transform transition duration-200 ease-in-out",
            checked ? cn(sizes[size].translate, "bg-on-primary") : "translate-x-[3px] bg-text-muted",
            sizes[size].thumb
          )}
        />
      </button>
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-sm font-medium text-text-main">{label}</span>
          )}
          {description && (
            <span className="text-xs text-text-muted">{description}</span>
          )}
        </div>
      )}
    </div>
  );
}
