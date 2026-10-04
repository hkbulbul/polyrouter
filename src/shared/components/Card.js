"use client";

import { cn } from "@/shared/utils/cn";

export default function Card({
  children,
  title,
  subtitle,
  icon,
  action,
  padding = "md",
  hover = false,
  elev = false,
  className,
  ...props
}) {
  const paddings = {
    none: "",
    xs: "p-3",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={cn(
        "bg-surface border",
        elev ? "border-border" : "border-border-subtle",
        hover && "hover:border-border-strong hover:bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-surface-2))] transition-colors cursor-pointer",
        paddings[padding],
        className
      )}
      {...props}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex min-w-0 items-center gap-3">
            {icon && (
              <div className="flex size-9 shrink-0 items-center justify-center border border-border-subtle bg-bg text-primary">
                <span className="material-symbols-outlined text-[18px]">{icon}</span>
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3 className="text-[15px] font-medium leading-tight tracking-[-0.01em] text-text-main">{title}</h3>
              )}
              {subtitle && (
                <p className="mt-1 text-[13px] leading-snug text-text-muted">{subtitle}</p>
              )}
            </div>
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

Card.Section = function CardSection({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "p-4 ",
        "bg-bg border border-border-subtle",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

Card.Row = function CardRow({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "p-3 -mx-3 px-3 transition-colors",
        "border-b border-border-subtle last:border-b-0",
        "hover:bg-surface-2/50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

Card.ListItem = function CardListItem({
  children,
  actions,
  className,
  ...props
}) {
  return (
    <div
      className={cn(
        "group flex items-center justify-between p-3 -mx-3 px-3",
        "border-b border-border-subtle last:border-b-0",
        "hover:bg-surface-2/50 transition-colors",
        className
      )}
      {...props}
    >
      <div className="flex-1 min-w-0">{children}</div>
      {actions && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {actions}
        </div>
      )}
    </div>
  );
};
