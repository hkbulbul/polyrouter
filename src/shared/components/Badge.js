"use client";

import { cn } from "@/shared/utils/cn";

const variants = {
  default: "border-border bg-surface-2 text-text-muted",
  primary: "border-primary/40 bg-primary/10 text-primary",
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  error: "border-danger/40 bg-danger/10 text-danger",
  info: "border-info/40 bg-info/10 text-info",
};

const sizes = {
  sm: "px-1.5 py-[3px] text-[10px]",
  md: "px-2 py-[5px] text-[11px]",
  lg: "px-2.5 py-1.5 text-xs",
};

export default function Badge({
  children,
  variant = "default",
  size = "md",
  dot = false,
  icon,
  className,
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap border font-mono font-medium leading-none tracking-[0.02em]",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            "size-1.5",
            variant === "success" && "bg-success",
            variant === "warning" && "bg-warning",
            variant === "error" && "bg-danger",
            variant === "info" && "bg-info",
            variant === "primary" && "bg-primary",
            variant === "default" && "bg-text-muted"
          )}
        />
      )}
      {icon && <span className="material-symbols-outlined text-[14px]">{icon}</span>}
      {children}
    </span>
  );
}
