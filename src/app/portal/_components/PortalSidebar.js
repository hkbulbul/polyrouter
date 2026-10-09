"use client";

import PropTypes from "prop-types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { NavGroup, NavItem } from "@/shared/components/SidebarNav";

export const PORTAL_NAV = [
  { group: "Workspace", items: [
    { href: "/portal", label: "Overview", icon: "dashboard" },
    { href: "/portal/keys", label: "API keys", icon: "key" },
    { href: "/portal/setup", label: "Set up tools", icon: "build" },
    { href: "/portal/usage", label: "Usage", icon: "bar_chart" },
  ] },
  { group: "Account", items: [
    { href: "/portal/devices", label: "Devices", icon: "devices" },
    { href: "/portal/account", label: "Account", icon: "manage_accounts" },
  ] },
];

const isActive = (pathname, href) => (href === "/portal" ? pathname === "/portal" : pathname.startsWith(href));

function initials(user) {
  const source = (user?.name || user?.email || "?").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] || "?") + (parts[1]?.[0] || "")).toUpperCase();
}

export default function PortalSidebar({ me, collapsed = false, onClose, onSignOut }) {
  const pathname = usePathname();
  const orgName = me.office.orgName || "PolyRouter";

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-sidebar transition-[width,background-color,border-color] duration-300 min-h-full",
        collapsed ? "w-[64px]" : "w-[248px]"
      )}
    >
      {/* Wordmark — same treatment as the admin sidebar */}
      <div className={cn("flex h-16 shrink-0 items-center gap-2 border-b border-border", collapsed ? "justify-center px-0" : "justify-between px-5")}>
        <Link
          href="/portal"
          onClick={onClose}
          aria-label={`${orgName} portal`}
          title={collapsed ? orgName : undefined}
          className="inline-flex min-w-0 items-center gap-2.5 whitespace-nowrap font-mono text-sm uppercase leading-none text-text-main"
        >
          <span className="flex size-[30px] shrink-0 items-center justify-center bg-[#ededed] p-[5px]">
            <img src="/polyrouter-mark.png" alt="" width={20} height={20} className="size-full object-contain brightness-0" />
          </span>
          {!collapsed && <span className="truncate">{orgName}</span>}
        </Link>
        {!collapsed && <span className="font-mono text-[10.5px] leading-none text-text-muted">Employee</span>}
      </div>

      <nav aria-label="Portal" className={cn("flex flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden custom-scrollbar py-5", collapsed ? "px-2" : "px-3")}>
        {PORTAL_NAV.map(({ group, items }) => (
          <NavGroup key={group} label={group} collapsed={collapsed}>
            {items.map((item) => (
              <NavItem key={item.href} {...item} collapsed={collapsed} active={isActive(pathname, item.href)} onNavigate={onClose} />
            ))}
          </NavGroup>
        ))}
      </nav>

      {/* Signed-in employee */}
      <div className={cn("shrink-0 border-t border-border", collapsed ? "flex justify-center p-2" : "p-3")}>
        {collapsed ? (
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="flex size-9 items-center justify-center border border-border text-text-muted transition-colors hover:bg-surface-2 hover:text-text-main"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center bg-primary/10 font-mono text-[12px] font-medium text-primary">
              {initials(me.user)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium leading-tight text-text-main">{me.user.name || me.user.email}</p>
              <p className="truncate text-[11.5px] leading-tight text-text-muted">{me.user.team?.name || me.user.email}</p>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              aria-label="Sign out"
              title="Sign out"
              className="flex size-8 shrink-0 items-center justify-center text-text-muted transition-colors hover:bg-surface-2 hover:text-text-main"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

PortalSidebar.propTypes = {
  me: PropTypes.object.isRequired,
  collapsed: PropTypes.bool,
  onClose: PropTypes.func,
  onSignOut: PropTypes.func.isRequired,
};
