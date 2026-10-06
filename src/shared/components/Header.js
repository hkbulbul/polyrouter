"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import PropTypes from "prop-types";
import ProviderIcon from "@/shared/components/ProviderIcon";
import HeaderMenu from "@/shared/components/HeaderMenu";
import HeaderLanguage from "@/shared/components/HeaderLanguage";
import ThemeToggle from "@/shared/components/ThemeToggle";
import BugReportModal from "@/shared/components/BugReportModal";
import { useHeaderSearchStore } from "@/store/headerSearchStore";
import { OAUTH_PROVIDERS, APIKEY_PROVIDERS } from "@/shared/constants/config";
import { MEDIA_PROVIDER_KINDS, AI_PROVIDERS } from "@/shared/constants/providers";
import { getProviderIconSrc } from "@/shared/utils/providerIcon";
import { translate } from "@/i18n/runtime";

const getPageInfo = (pathname) => {
  if (!pathname) return { title: "", description: "", breadcrumbs: [] };

  // Media provider detail: /dashboard/media-providers/[kind]/[id]
  const mediaDetailMatch = pathname.match(/\/media-providers\/([^/]+)\/([^/]+)$/);
  if (mediaDetailMatch) {
    const kindId = mediaDetailMatch[1];
    const providerId = mediaDetailMatch[2];
    const kindConfig = MEDIA_PROVIDER_KINDS.find((k) => k.id === kindId);
    const provider = AI_PROVIDERS[providerId];
    return {
      title: provider?.name || providerId,
      description: "",
      breadcrumbs: [
        { label: "Media Providers", href: `/dashboard/media-providers/${kindId}` },
        { label: kindConfig?.label || kindId, href: `/dashboard/media-providers/${kindId}` },
        { label: provider?.name || providerId, image: getProviderIconSrc(providerId) },
      ],
    };
  }

  // Media provider kind: /dashboard/media-providers/[kind]
  const mediaKindMatch = pathname.match(/\/media-providers\/([^/]+)$/);
  if (mediaKindMatch) {
    const kindId = mediaKindMatch[1];
    const kindConfig = MEDIA_PROVIDER_KINDS.find((k) => k.id === kindId);
    return {
      title: kindConfig?.label || kindId,
      description: `Manage your ${kindConfig?.label || kindId} providers`,
      icon: kindConfig?.icon || "perm_media",
      breadcrumbs: [],
    };
  }

  // Provider detail page: /dashboard/providers/[id]
  const providerMatch = pathname.match(/\/providers\/([^/]+)$/);
  if (providerMatch) {
    const providerId = providerMatch[1];
    const providerInfo =
      OAUTH_PROVIDERS[providerId] || APIKEY_PROVIDERS[providerId];
    if (providerInfo) {
      return {
        title: providerInfo.name,
        description: "",
        breadcrumbs: [
          { label: "Providers", href: "/dashboard/providers" },
          {
            label: providerInfo.name,
            image: getProviderIconSrc(providerInfo.id),
          },
        ],
      };
    }
  }

  if (pathname.includes("/providers") && !pathname.includes("/media-providers"))
    return {
      title: "Providers",
      description: "Manage your AI provider connections",
      icon: "dns",
      breadcrumbs: [],
    };
  if (pathname.includes("/combos"))
    return {
      title: "Combos",
      description: "Model combos with fallback",
      icon: "layers",
      breadcrumbs: [],
    };
  if (pathname.includes("/usage"))
    return {
      title: "Usage & Analytics",
      description:
        "Monitor your API usage, token consumption, and request logs",
      icon: "bar_chart",
      breadcrumbs: [],
    };
  if (pathname.includes("/auth-files"))
    return {
      title: "Auth Files",
      description: "Map provider credentials stored in the local database",
      icon: "vpn_key",
      breadcrumbs: [],
    };
  if (pathname.includes("/quota"))
    return {
      title: "Quota Tracker",
      description: "Track and manage your API quota limits",
      icon: "data_usage",
      breadcrumbs: [],
    };
  if (pathname.includes("/mitm"))
    return {
      title: "MITM Proxy",
      description: "Intercept CLI tool traffic and route through PolyRouter",
      icon: "security",
      breadcrumbs: [],
    };
  if (pathname.includes("/token-saver"))
    return {
      title: "Token Saver",
      description: "Compress prompts and outputs to save tokens",
      icon: "savings",
      breadcrumbs: [],
    };
  if (pathname.includes("/cli-tools"))
    return {
      title: "CLI Tools",
      description: "Configure CLI tools",
      icon: "terminal",
      breadcrumbs: [],
    };
  if (pathname.includes("/proxy-pools"))
    return {
      title: "Proxy Pools",
      description: "Manage your proxy pool configurations",
      icon: "lan",
      breadcrumbs: [],
    };
  if (pathname.includes("/skills"))
    return {
      title: "Agent Skills",
      description: "Copy a link and paste to your AI to use PolyRouter — no install needed",
      icon: "extension",
      breadcrumbs: [],
    };
  if (pathname.includes("/endpoint"))
    return {
      title: "Endpoint",
      description: "API endpoint configuration",
      icon: "api",
      breadcrumbs: [],
    };
  if (pathname.includes("/profile"))
    return {
      title: "Settings",
      description: "Manage your preferences",
      icon: "settings",
      breadcrumbs: [],
    };
  if (pathname.includes("/translator"))
    return {
      title: "Translator",
      description: "Debug translation flow between formats",
      icon: "translate",
      breadcrumbs: [],
    };
  if (pathname.includes("/console-log"))
    return {
      title: "Console Log",
      description: "Live server console output",
      icon: "monitor",
      breadcrumbs: [],
    };
  if (pathname === "/dashboard")
    return {
      title: "Endpoint",
      description: "API endpoint configuration",
      icon: "api",
      breadcrumbs: [],
    };
  return { title: "", description: "", breadcrumbs: [] };
};

export default function Header({ onMenuClick, showMenuButton = true, sidebarCollapsed = false, onToggleSidebar }) {
  const pathname = usePathname();
  const [displayName, setDisplayName] = useState("");
  const [loginMethod, setLoginMethod] = useState("");
  const [bugModalOpen, setBugModalOpen] = useState(false);

  // Memoize page info to prevent unnecessary recalculations
  const pageInfo = useMemo(() => getPageInfo(pathname), [pathname]);
  const { title, breadcrumbs } = pageInfo;

  useEffect(() => {
    let cancelled = false;

    async function loadAuthStatus() {
      try {
        const res = await fetch("/api/auth/status", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setDisplayName(data?.displayName || data?.oidcName || data?.oidcEmail || "");
          setLoginMethod(data?.loginMethod || "");
        }
      } catch {
        if (!cancelled) {
          setDisplayName("");
          setLoginMethod("");
        }
      }
    }

    loadAuthStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        window.location.assign("/login");
      }
    } catch (err) {
      console.error("Failed to logout:", err);
    }
  };

  return (
    <header className="sticky top-0 shrink-0 flex h-16 items-center justify-between gap-3 px-4 lg:px-8 border-b border-border bg-[color-mix(in_srgb,var(--color-bg)_92%,transparent)] backdrop-blur-[10px] z-20">
      {/* Mobile menu button */}
      {showMenuButton && (
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="flex size-9 shrink-0 flex-col items-center justify-center gap-[5px] border border-border lg:hidden"
        >
          <i className="block h-[1.5px] w-3.5 bg-text-main" />
          <i className="block h-[1.5px] w-3.5 bg-text-main" />
        </button>
      )}

      {/* Desktop sidebar collapse toggle */}
      {onToggleSidebar && (
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!sidebarCollapsed}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden size-9 shrink-0 items-center justify-center border border-border text-text-muted transition-colors hover:bg-surface-2 hover:text-text-main lg:flex"
        >
          <span className="material-symbols-outlined text-[18px]">
            {sidebarCollapsed ? "left_panel_open" : "left_panel_close"}
          </span>
        </button>
      )}

      {/* Page title: one line — parent links (nested pages only) followed by the page name */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {breadcrumbs.length > 0 ? (
          <>
            {breadcrumbs.slice(0, -1).map((crumb, index, parents) => (
              // Show only the nearest parent on small screens to keep the row short
              <span
                key={`${crumb.label}-${crumb.href || "current"}`}
                className={`${index < parents.length - 1 ? "hidden md:flex" : "flex"} shrink-0 items-center gap-2 text-sm leading-none text-text-muted`}
              >
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-text-main transition-colors">{translate(crumb.label)}</Link>
                ) : (
                  <span>{translate(crumb.label)}</span>
                )}
                <span className="text-border-strong">/</span>
              </span>
            ))}
            {breadcrumbs[breadcrumbs.length - 1].image && (
              <ProviderIcon
                src={breadcrumbs[breadcrumbs.length - 1].image}
                alt={breadcrumbs[breadcrumbs.length - 1].label}
                size={20}
                className="object-contain max-w-[20px] max-h-[20px]"
                fallbackText={breadcrumbs[breadcrumbs.length - 1].label.slice(0, 2).toUpperCase()}
              />
            )}
            <h1 className="truncate text-base lg:text-lg font-medium leading-none tracking-[-0.02em] text-text-main">
              {translate(breadcrumbs[breadcrumbs.length - 1].label)}
            </h1>
          </>
        ) : title ? (
          <h1 className="truncate text-base lg:text-lg font-medium leading-none tracking-[-0.02em] text-text-main">
            {translate(title)}
          </h1>
        ) : null}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 shrink-0">
        {displayName && loginMethod === "OIDC" && (
          <div className="hidden sm:flex h-9 items-center max-w-[220px] px-3 border border-border bg-surface text-xs text-text-muted truncate">
            <span className="material-symbols-outlined text-[14px] mr-1.5 text-primary">person</span>
            <span className="truncate">{displayName}</span>
            <span className="ml-2 shrink-0 border border-primary/40 bg-primary/10 px-1.5 py-[3px] font-mono text-[10px] uppercase leading-none tracking-[0.08em] text-primary">
              OIDC
            </span>
          </div>
        )}
        <HeaderSearch />
        <a
          href="https://discord.gg/c5Sgutjkw"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-center size-9 border border-transparent text-text-muted hover:text-text-main hover:border-border hover:bg-surface-2 transition-colors"
          aria-label="Join the PolyRouter Discord community"
          title="Join the PolyRouter Discord community"
        >
          <svg
            className="size-[18px] transition-colors duration-200 group-hover:text-[#5865F2]"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M19.54 5.19A16.9 16.9 0 0 0 15.4 3.9a11.9 11.9 0 0 0-.53 1.08 15.7 15.7 0 0 0-5.74 0A11.9 11.9 0 0 0 8.6 3.9a16.9 16.9 0 0 0-4.14 1.29C1.84 9.08 1.13 12.88 1.48 16.63a16.9 16.9 0 0 0 5.1 2.58c.62-.84 1.17-1.73 1.64-2.67a10.4 10.4 0 0 1-1.63-.78l.4-.31a11.96 11.96 0 0 0 10.02 0l.4.31c-.52.31-1.06.57-1.63.78.47.94 1.02 1.83 1.64 2.67a16.9 16.9 0 0 0 5.1-2.58c.41-4.35-.7-8.11-2.98-11.44ZM8.5 14.75c-.98 0-1.79-.9-1.79-2s.79-2 1.79-2 1.8.9 1.79 2c0 1.1-.8 2-1.79 2Zm7 0c-.98 0-1.79-.9-1.79-2s.79-2 1.79-2 1.8.9 1.79 2c0 1.1-.8 2-1.79 2Z" />
          </svg>
        </a>
        <button
          type="button"
          onClick={() => setBugModalOpen(true)}
          className="flex items-center justify-center size-9 border border-transparent text-text-muted hover:text-text-main hover:border-border hover:bg-surface-2 transition-colors"
          aria-label="Report a bug"
          title="Report a bug"
        >
          <span className="material-symbols-outlined text-[20px]">bug_report</span>
        </button>
        <ThemeToggle />
        <HeaderLanguage />
        <HeaderMenu onLogout={handleLogout} />
      </div>
      <BugReportModal isOpen={bugModalOpen} onClose={() => setBugModalOpen(false)} />
    </header>
  );
}

function HeaderSearch() {
  const visible = useHeaderSearchStore((s) => s.visible);
  const query = useHeaderSearchStore((s) => s.query);
  const placeholder = useHeaderSearchStore((s) => s.placeholder);
  const setQuery = useHeaderSearchStore((s) => s.setQuery);

  if (!visible) return null;

  return (
    <div className="relative w-[160px] sm:w-[240px]">
      <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-[16px] pointer-events-none">
        search
      </span>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 pl-8 pr-7 border border-border bg-surface text-[13px] placeholder:text-text-muted/70 hover:border-border-strong focus:outline-none focus:border-accent-fill transition-colors"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          className="absolute right-1 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main p-0.5 "
          aria-label="Clear search"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      )}
    </div>
  );
}

Header.propTypes = {
  onMenuClick: PropTypes.func,
  showMenuButton: PropTypes.bool,
  sidebarCollapsed: PropTypes.bool,
  onToggleSidebar: PropTypes.func,
};
