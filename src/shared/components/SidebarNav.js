"use client";

import Link from "next/link";
import PropTypes from "prop-types";
import { cn } from "@/shared/utils/cn";

// Sidebar navigation primitives shared by the admin dashboard and the employee portal.
export const navItemClass = "relative flex h-9 items-center gap-2.5 px-3 text-[13px] leading-none transition-colors";
export const navItemActiveClass = "bg-surface-2 font-medium text-text-main before:absolute before:inset-y-1.5 before:left-0 before:w-[2px] before:bg-accent-fill";
export const navItemIdleClass = "text-text-muted hover:bg-surface-2 hover:text-text-main";
// Icon-only rail: center the icon and drop horizontal padding/gap
export const navItemCollapsedClass = "justify-center gap-0 px-0";

export function NavGroup({ label, collapsed = false, children }) {
  return (
    <div className="flex flex-col gap-px">
      <p className={cn("eyebrow mb-2 px-3 text-[10.5px]", collapsed && "sr-only")}>{label}</p>
      {children}
    </div>
  );
}

NavGroup.propTypes = { label: PropTypes.string, collapsed: PropTypes.bool, children: PropTypes.node };

export function NavItem({ href, label, icon, active, compact = false, collapsed = false, onNavigate }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        navItemClass,
        compact && "h-8 text-[12.5px]",
        collapsed && navItemCollapsedClass,
        active ? navItemActiveClass : navItemIdleClass
      )}
    >
      <span className={cn("material-symbols-outlined", compact ? "text-[16px]" : "text-[18px]", active && "fill-1 text-primary")}>
        {icon}
      </span>
      <span className={cn("truncate", collapsed && "sr-only")}>{label}</span>
    </Link>
  );
}

NavItem.propTypes = {
  href: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  active: PropTypes.bool,
  compact: PropTypes.bool,
  collapsed: PropTypes.bool,
  onNavigate: PropTypes.func,
};
