"use client";

import PropTypes from "prop-types";
import { cn } from "@/shared/utils/cn";

export default function SegmentedControl({
  options = [],
  value,
  onChange,
  size = "md",
  className,
}) {
  const sizes = {
    sm: "h-7 text-xs px-2.5 gap-1.5",
    md: "h-9 text-sm px-3.5 gap-2",
    lg: "h-11 text-base px-4.5 gap-2.5",
  };

  const iconSizes = {
    sm: "text-[15px]",
    md: "text-[18px]",
    lg: "text-[20px]",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 p-0.5 border border-border bg-bg overflow-x-auto",
        className
      )}
      role="tablist"
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center justify-center shrink-0 font-medium transition-all duration-150 cursor-pointer select-none whitespace-nowrap",
              sizes[size],
              isSelected
                ? "bg-surface text-text-main font-semibold outline outline-1 -outline-offset-1 outline-border-strong"
                : "text-text-muted hover:text-text-main hover:bg-surface-2"
            )}
          >
            {option.icon && (
              <span
                className={cn(
                  "material-symbols-outlined leading-none shrink-0 inline-flex items-center justify-center",
                  iconSizes[size]
                )}
              >
                {option.icon}
              </span>
            )}
            <span className="leading-none">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

SegmentedControl.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.node.isRequired,
      icon: PropTypes.string,
    })
  ).isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  className: PropTypes.string,
};
