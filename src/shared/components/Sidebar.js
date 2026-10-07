"use client";

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { APP_CONFIG, UPDATER_CONFIG } from "@/shared/constants/config";
import { MEDIA_PROVIDER_KINDS } from "@/shared/constants/providers";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import Button from "./Button";
import Modal from "./Modal";
import { NavGroup, NavItem, navItemClass, navItemActiveClass, navItemIdleClass, navItemCollapsedClass } from "./SidebarNav";

// const VISIBLE_MEDIA_KINDS = ["embedding", "image", "imageToText", "tts", "stt", "webSearch", "webFetch", "video", "music"];
const VISIBLE_MEDIA_KINDS = ["embedding", "image", "video", "tts", "stt", "speechToSpeech"];
// Combined entry: webSearch + webFetch share one page at /dashboard/media-providers/web
const COMBINED_WEB_ITEM = { id: "web", label: "Web Fetch & Search", icon: "travel_explore", href: "/dashboard/media-providers/web" };

const navItems = [
  { href: "/dashboard/endpoint", label: "Endpoint & Key", icon: "api" },
  { href: "/dashboard/providers", label: "Providers", icon: "dns" },
  // { href: "/dashboard/basic-chat", label: "Basic Chat", icon: "chat" }, // Hidden
  { href: "/dashboard/combos", label: "Combos", icon: "layers" },
  { href: "/dashboard/usage", label: "Usage", icon: "bar_chart" },
  { href: "/dashboard/quota", label: "Quota Tracker", icon: "data_usage" },
  { href: "/dashboard/token-saver", label: "Token Saver", icon: "savings" },
  // { href: "/dashboard/realtime", label: "Realtime Voice", icon: "mic" },
  { href: "/dashboard/cli-tools", label: "CLI Tools", icon: "terminal" },
];

// Shown only while Office mode is on (Settings → Office mode).
const OFFICE_NAV_ITEM = { href: "/dashboard/office", label: "Office", icon: "corporate_fare" };
// Must match OFFICE_MODE_EVENT in dashboard/profile/OfficeModeCard.js.
const OFFICE_MODE_EVENT = "polyrouter:office-mode-changed";

const debugItems = [
  { href: "/dashboard/console-log", label: "Console Log", icon: "terminal" },
  { href: "/dashboard/translator", label: "Translator", icon: "translate" },
];

// Media kinds shown under the Media group, plus the combined web search/fetch page
const mediaItems = [
  ...MEDIA_PROVIDER_KINDS.filter((k) => VISIBLE_MEDIA_KINDS.includes(k.id)).map((kind) => ({
    href: `/dashboard/media-providers/${kind.id}`,
    label: kind.label,
    icon: kind.icon,
  })),
  { href: COMBINED_WEB_ITEM.href, label: COMBINED_WEB_ITEM.label, icon: COMBINED_WEB_ITEM.icon },
];

const systemItems = [
  { href: "/dashboard/proxy-pools", label: "Proxy Pools", icon: "lan" },
  { href: "/dashboard/skills", label: "Skills", icon: "extension" },
];

export default function Sidebar({ onClose, collapsed = false, onToggleCollapse }) {
  const pathname = usePathname();
  const onMediaRoute = pathname.startsWith("/dashboard/media-providers");
  const [mediaOpen, setMediaOpen] = useState(onMediaRoute);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateState, setUpdateState] = useState(null);
  const [enableTranslator, setEnableTranslator] = useState(false);
  const [officeEnabled, setOfficeEnabled] = useState(false);
  const { copied, copy } = useCopyToClipboard(2000);

  const INSTALL_CMD = UPDATER_CONFIG.installCmdLatest;

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        if (data.enableTranslator) setEnableTranslator(true);
        setOfficeEnabled(data.office?.enabled === true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onOfficeChange = (event) => setOfficeEnabled(event.detail?.enabled === true);
    window.addEventListener(OFFICE_MODE_EVENT, onOfficeChange);
    return () => window.removeEventListener(OFFICE_MODE_EVENT, onOfficeChange);
  }, []);

  const visibleNavItems = officeEnabled ? [...navItems, OFFICE_NAV_ITEM] : navItems;

  // Lazy check for new npm version on mount
  useEffect(() => {
    fetch("/api/version")
      .then(res => res.json())
      .then(data => { if (data.hasUpdate) setUpdateInfo(data); })
      .catch(() => {});
  }, []);

  const isActive = (href) => {
    if (href === "/dashboard/endpoint") {
      return pathname === "/dashboard" || pathname.startsWith("/dashboard/endpoint");
    }
    return pathname.startsWith(href);
  };

  const startAutomaticUpdate = async () => {
    setShowUpdateModal(false);
    setIsUpdating(true);
    setUpdateState({ phase: "starting", logTail: [] });

    try {
      const response = await fetch("/api/version/update", { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Could not start the updater");
      }

      const statusUrl = `http://127.0.0.1:${UPDATER_CONFIG.statusPort}/update/status`;
      const deadline = Date.now() + 120000;
      while (Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, UPDATER_CONFIG.statusPollIntervalMs));
        try {
          const statusResponse = await fetch(statusUrl, { cache: "no-store" });
          if (!statusResponse.ok) continue;
          const status = await statusResponse.json();
          setUpdateState(status);
          if (status.done) return;
        } catch {
          // The updater needs a moment to start after the app server exits.
        }
      }
      throw new Error("The updater did not report completion. Use the manual command below.");
    } catch (error) {
      setUpdateState({ phase: "error", done: true, success: false, error: error.message, logTail: [] });
    }
  };

  const updatePhaseLabel = {
    starting: "Preparing update...",
    waitingForExit: "Closing PolyRouter...",
    installing: "Installing the latest version...",
    done: "Update complete. Restarting PolyRouter...",
    error: "Automatic update failed",
  }[updateState?.phase] || "Updating PolyRouter...";

  return (
    <>
      <aside
        className={cn(
          "flex flex-col border-r border-border bg-sidebar transition-[width,background-color,border-color] duration-300 min-h-full",
          collapsed ? "w-[64px]" : "w-[248px]"
        )}
      >

        {/* Wordmark: logo in a light tile followed by the name in mono caps (landing style) */}
        <div className={cn("flex h-16 shrink-0 items-center gap-2 border-b border-border", collapsed ? "justify-center px-0" : "justify-between px-5")}>
          <Link
            href="/dashboard"
            onClick={onClose}
            aria-label="PolyRouter dashboard"
            title={collapsed ? "PolyRouter" : undefined}
            className="inline-flex min-w-0 items-center gap-2.5 whitespace-nowrap font-mono text-sm uppercase leading-none text-text-main"
          >
            <span className="flex size-[30px] shrink-0 items-center justify-center bg-[#ededed] p-[5px]">
              <img src="/polyrouter-mark.png" alt="" width={20} height={20} className="size-full object-contain brightness-0" />
            </span>
            {!collapsed && "PolyRouter"}
          </Link>
          {!collapsed && (
            <span className="font-mono text-[10.5px] leading-none text-text-muted">v{APP_CONFIG.version}</span>
          )}
        </div>

        {/* Navigation */}
        <nav aria-label="Dashboard" className={cn("flex flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden custom-scrollbar py-5", collapsed ? "px-2" : "px-3")}>
          <NavGroup label="Workspace" collapsed={collapsed}>
            {visibleNavItems.map((item) => (
              <NavItem key={item.href} {...item} collapsed={collapsed} active={isActive(item.href)} onNavigate={onClose} />
            ))}
          </NavGroup>

          <NavGroup label="Media" collapsed={collapsed}>
            <button
              type="button"
              onClick={() => {
                // The submenu can't render in the icon rail, so expand the sidebar to show it
                if (collapsed) {
                  onToggleCollapse?.();
                  setMediaOpen(true);
                } else {
                  setMediaOpen((v) => !v);
                }
              }}
              aria-expanded={!collapsed && mediaOpen}
              title={collapsed ? "Media Providers" : undefined}
              className={cn(
                navItemClass,
                "w-full",
                collapsed && navItemCollapsedClass,
                onMediaRoute && (collapsed || !mediaOpen) ? navItemActiveClass : navItemIdleClass
              )}
            >
              <span className={cn("material-symbols-outlined text-[18px]", collapsed && onMediaRoute && "fill-1 text-primary")}>perm_media</span>
              <span className={cn("flex-1 text-left", collapsed && "sr-only")}>Media Providers</span>
              {!collapsed && (
                <span className={cn("material-symbols-outlined text-[16px] transition-transform duration-200", mediaOpen && "rotate-180")}>
                  expand_more
                </span>
              )}
            </button>
            {mediaOpen && !collapsed && (
              <div className="ml-[21px] flex flex-col gap-px border-l border-border pl-2">
                {mediaItems.map((item) => (
                  <NavItem
                    key={item.href}
                    {...item}
                    compact
                    active={pathname.startsWith(item.href)}
                    onNavigate={onClose}
                  />
                ))}
              </div>
            )}
          </NavGroup>

          <NavGroup label="System" collapsed={collapsed}>
            {systemItems.map((item) => (
              <NavItem key={item.href} {...item} collapsed={collapsed} active={isActive(item.href)} onNavigate={onClose} />
            ))}
            {debugItems
              .filter((item) => item.href !== "/dashboard/translator" || enableTranslator)
              .map((item) => (
                <NavItem key={item.href} {...item} collapsed={collapsed} active={isActive(item.href)} onNavigate={onClose} />
              ))}
            <NavItem href="/dashboard/profile" label="Settings" icon="settings" collapsed={collapsed} active={isActive("/dashboard/profile")} onNavigate={onClose} />
          </NavGroup>
        </nav>

        {updateInfo && collapsed && (
          <div className="flex shrink-0 justify-center border-t border-border p-2">
            <button
              type="button"
              onClick={() => setShowUpdateModal(true)}
              aria-label={`Update available: v${updateInfo.latestVersion}`}
              title={`Update available: v${updateInfo.latestVersion}`}
              className="relative flex size-9 items-center justify-center border border-primary/30 bg-primary/[0.06] text-primary transition-colors hover:bg-primary/[0.12]"
            >
              <span className="material-symbols-outlined text-[18px]">upgrade</span>
              <span className="absolute right-1 top-1 size-1.5 bg-accent-fill animate-pulse" aria-hidden="true" />
            </button>
          </div>
        )}

        {updateInfo && !collapsed && (
          <div className="shrink-0 border-t border-border p-3">
            <div className="border border-primary/30 bg-primary/[0.06] p-3">
              <p className="eyebrow flex items-center gap-2 text-primary">
                <span className="size-1.5 bg-accent-fill animate-pulse" aria-hidden="true" />
                Update available
              </p>
              <p className="mt-2 font-mono text-[12px] leading-none text-text-main">
                v{updateInfo.currentVersion} <span className="text-text-muted">→</span> v{updateInfo.latestVersion}
              </p>
              <Button
                type="button"
                size="sm"
                fullWidth
                icon="upgrade"
                className="mt-3"
                onClick={() => setShowUpdateModal(true)}
              >
                Update PolyRouter
              </Button>
            </div>
          </div>
        )}

      </aside>

      <Modal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        title="Update PolyRouter"
        size="md"
      >
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center bg-brand-500/10 text-brand-500">
            <span className="material-symbols-outlined text-[22px]">terminal</span>
          </div>
          <div>
            <p className="text-sm font-medium text-text-main">
              Install v{updateInfo?.latestVersion}
            </p>
            <p className="mt-1 text-xs leading-5 text-text-muted">
              PolyRouter will close, install v{updateInfo?.latestVersion}, and restart automatically.
            </p>
          </div>
        </div>

        <Button
          type="button"
          fullWidth
          icon="upgrade"
          className="mt-5"
          onClick={startAutomaticUpdate}
        >
          Update and restart
        </Button>

        <div className="mt-3 border border-border-subtle bg-surface-2 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Manual fallback
          </p>
          <code className="block break-all font-mono text-xs leading-5 text-text-main">
            {INSTALL_CMD}
          </code>
        </div>

        <Button
          type="button"
          fullWidth
          variant={copied === "update-command" ? "success" : "primary"}
          icon={copied === "update-command" ? "check" : "content_copy"}
          className="mt-4"
          onClick={() => copy(INSTALL_CMD, "update-command")}
        >
          {copied === "update-command" ? "Command copied" : "Copy update command"}
        </Button>
      </Modal>

      {isUpdating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm">
          <div className="w-full max-w-md border border-white/10 bg-neutral-950 p-6 text-white shadow-2xl">
            <div className="flex items-center gap-3">
              <span className={cn(
                "material-symbols-outlined text-2xl",
                updateState?.phase === "error" ? "text-red-400" :
                  updateState?.phase === "done" ? "text-green-400" : "animate-spin text-brand-400"
              )}>
                {updateState?.phase === "error" ? "error" : updateState?.phase === "done" ? "check_circle" : "progress_activity"}
              </span>
              <div>
                <h2 className="font-semibold">{updatePhaseLabel}</h2>
                <p className="mt-1 text-xs text-white/60">Keep this window open while the update finishes.</p>
              </div>
            </div>

            {updateState?.logTail?.length > 0 && (
              <pre className="mt-5 max-h-36 overflow-auto whitespace-pre-wrap border border-white/10 bg-black p-3 text-[11px] leading-5 text-white/65">
                {updateState.logTail.join("\n")}
              </pre>
            )}

            {updateState?.phase === "error" && (
              <>
                <p className="mt-4 text-xs leading-5 text-red-300">{updateState.error}</p>
                <code className="mt-3 block break-all border border-white/10 bg-black p-3 text-xs text-green-400">
                  {INSTALL_CMD}
                </code>
                <Button fullWidth variant="secondary" className="mt-4" onClick={() => setIsUpdating(false)}>
                  Close
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

Sidebar.propTypes = {
  onClose: PropTypes.func,
  collapsed: PropTypes.bool,
  onToggleCollapse: PropTypes.func,
};
