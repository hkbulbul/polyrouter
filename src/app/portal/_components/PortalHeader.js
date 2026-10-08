"use client";

import PropTypes from "prop-types";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/shared/components/ThemeToggle";
import { PORTAL_NAV } from "./PortalSidebar";

const PAGE_TITLES = Object.fromEntries(PORTAL_NAV.flatMap((g) => g.items.map((i) => [i.href, i.label])));

export default function PortalHeader({ me, onMenuClick, sidebarCollapsed, onToggleSidebar }) {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] || "Overview";

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-[color-mix(in_srgb,var(--color-bg)_92%,transparent)] px-4 backdrop-blur-[10px] lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="flex size-9 shrink-0 flex-col items-center justify-center gap-[5px] border border-border lg:hidden"
      >
        <i className="block h-[1.5px] w-3.5 bg-text-main" />
        <i className="block h-[1.5px] w-3.5 bg-text-main" />
      </button>

      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!sidebarCollapsed}
        title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="hidden size-9 shrink-0 items-center justify-center border border-border text-text-muted transition-colors hover:bg-surface-2 hover:text-text-main lg:flex"
      >
        <span className="material-symbols-outlined text-[18px]">{sidebarCollapsed ? "left_panel_open" : "left_panel_close"}</span>
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <h1 className="truncate text-base font-medium leading-none tracking-[-0.02em] text-text-main lg:text-lg">{title}</h1>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <div className="hidden h-9 max-w-[240px] items-center truncate border border-border bg-surface px-3 text-xs text-text-muted sm:flex">
          <span className="material-symbols-outlined mr-1.5 text-[14px] text-primary">badge</span>
          <span className="truncate">{me.user.email}</span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}

PortalHeader.propTypes = {
  me: PropTypes.object.isRequired,
  onMenuClick: PropTypes.func.isRequired,
  sidebarCollapsed: PropTypes.bool,
  onToggleSidebar: PropTypes.func.isRequired,
};
