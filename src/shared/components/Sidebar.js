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

const debugItems = [
  { href: "/dashboard/console-log", label: "Console Log", icon: "terminal" },
  { href: "/dashboard/translator", label: "Translator", icon: "translate" },
];

const systemItems = [
  { href: "/dashboard/proxy-pools", label: "Proxy Pools", icon: "lan" },
  { href: "/dashboard/skills", label: "Skills", icon: "extension" },
];

export default function Sidebar({ onClose }) {
  const pathname = usePathname();
  const [mediaOpen, setMediaOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateState, setUpdateState] = useState(null);
  const [enableTranslator, setEnableTranslator] = useState(false);
  const { copied, copy } = useCopyToClipboard(2000);

  const INSTALL_CMD = UPDATER_CONFIG.installCmdLatest;

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => { if (data.enableTranslator) setEnableTranslator(true); })
      .catch(() => {});
  }, []);

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
      <aside className="flex w-72 flex-col border-r border-border-subtle bg-vibrancy backdrop-blur-xl transition-colors duration-300 min-h-full">

        {/* Logo */}
        <div className="px-5 py-4 flex flex-col gap-2 border-b border-border-subtle/50">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="size-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border border-border-subtle bg-surface shadow-xs transition-transform duration-200 group-hover:scale-105">
              <img
                src="/favicon.svg"
                alt="PolyRouter"
                width={36}
                height={36}
                className="size-full object-contain"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-base font-semibold tracking-tight leading-tight truncate">
                <span className="text-brand-500">Poly</span><span className="text-text-main">Router</span>
              </h1>
              <span className="text-[11px] text-text-muted font-mono">v{APP_CONFIG.version}</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 space-y-0.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-1 transition-all group",
                isActive(item.href)
                  ? "bg-primary/10 text-primary"
                  : "text-text-muted hover:bg-surface-2 hover:text-text-main"
              )}
            >
              <span
                className={cn(
                  "material-symbols-outlined text-[18px]",
                  isActive(item.href) ? "fill-1" : "group-hover:text-primary transition-colors"
                )}
              >
                {item.icon}
              </span>
              <span className="text-[13px] font-medium">{item.label}</span>
            </Link>
          ))}

          {/* System section */}
          <div className="pt-3 mt-2 space-y-0.5">
            <p className="px-4 text-xs font-semibold text-text-muted/60 uppercase tracking-wider mb-2">
              System
            </p>

            {/* Media Providers accordion */}
            <button
              onClick={() => setMediaOpen((v) => !v)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-1 transition-all group",
                pathname.startsWith("/dashboard/media-providers")
                  ? "bg-primary/10 text-primary"
                  : "text-text-muted hover:bg-surface-2 hover:text-text-main"
              )}
            >
              <span className="material-symbols-outlined text-[18px]">perm_media</span>
              <span className="text-[13px] font-medium flex-1 text-left">Media Providers</span>
              <span className="material-symbols-outlined text-[14px] transition-transform" style={{ transform: mediaOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                expand_more
              </span>
            </button>
            {mediaOpen && (
              <div className="pl-4">
                {MEDIA_PROVIDER_KINDS.filter((k) => VISIBLE_MEDIA_KINDS.includes(k.id)).map((kind) => (
                  <Link
                    key={kind.id}
                    href={`/dashboard/media-providers/${kind.id}`}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-4 py-1 transition-all group",
                      pathname.startsWith(`/dashboard/media-providers/${kind.id}`)
                        ? "bg-primary/10 text-primary"
                        : "text-text-muted hover:bg-surface-2 hover:text-text-main"
                    )}
                  >
                    <span className="material-symbols-outlined text-[16px]">{kind.icon}</span>
                    <span className="text-sm">{kind.label}</span>
                  </Link>
                ))}
                <Link
                  key={COMBINED_WEB_ITEM.id}
                  href={COMBINED_WEB_ITEM.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-4 py-1 transition-all group",
                    pathname.startsWith(COMBINED_WEB_ITEM.href)
                      ? "bg-primary/10 text-primary"
                      : "text-text-muted hover:bg-surface-2 hover:text-text-main"
                  )}
                >
                  <span className="material-symbols-outlined text-[16px]">{COMBINED_WEB_ITEM.icon}</span>
                  <span className="text-sm">{COMBINED_WEB_ITEM.label}</span>
                </Link>
              </div>
            )}

            {systemItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-1 transition-all group",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-text-muted hover:bg-surface-2 hover:text-text-main"
                )}
              >
                <span
                  className={cn(
                    "material-symbols-outlined text-[18px]",
                    isActive(item.href) ? "fill-1" : "group-hover:text-primary transition-colors"
                  )}
                >
                  {item.icon}
                </span>
                <span className="text-[13px] font-medium">{item.label}</span>
              </Link>
            ))}

            {/* Debug items (inside System section, before Settings) */}
            {debugItems.map((item) => {
              const show = item.href !== "/dashboard/translator" || enableTranslator;
              return show ? (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-1 transition-all group",
                    isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-text-muted hover:bg-surface-2 hover:text-text-main"
                  )}
                >
                  <span
                    className={cn(
                      "material-symbols-outlined text-[18px]",
                      isActive(item.href) ? "fill-1" : "group-hover:text-primary transition-colors"
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="text-[13px] font-medium">{item.label}</span>
                </Link>
              ) : null;
            })}

            {/* Settings */}
            <Link
              href="/dashboard/profile"
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-1 transition-all group",
                isActive("/dashboard/profile")
                  ? "bg-primary/10 text-primary"
                  : "text-text-muted hover:bg-surface-2 hover:text-text-main"
              )}
            >
              <span
                className={cn(
                  "material-symbols-outlined text-[18px]",
                  isActive("/dashboard/profile") ? "fill-1" : "group-hover:text-primary transition-colors"
                )}
              >
                settings
              </span>
              <span className="text-[13px] font-medium">Settings</span>
            </Link>
          </div>
        </nav>

        {updateInfo && (
          <div className="shrink-0 border-t border-border-subtle px-4 py-4">
            <div className="border border-brand-500/20 bg-brand-500/[0.07] px-3 py-3">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined mt-0.5 text-[18px] text-brand-500">
                  system_update_alt
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-text-main">Update available</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-text-muted">
                    v{updateInfo.currentVersion} to v{updateInfo.latestVersion}
                  </p>
                </div>
              </div>
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
};
