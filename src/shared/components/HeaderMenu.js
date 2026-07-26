"use client";

import { useState } from "react";
import { useTheme } from "@/shared/hooks/useTheme";
import ChangelogModal from "./ChangelogModal";
import { ConfirmModal } from "./Modal";
import Dropdown, { DropdownItem } from "./Dropdown";

export default function HeaderMenu({ onLogout }) {
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [shutdownOpen, setShutdownOpen] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const { toggleTheme, isDark } = useTheme();

  const handleShutdown = async () => {
    setIsShuttingDown(true);
    try {
      await fetch("/api/version/shutdown", { method: "POST" });
    } catch (e) {
      // Expected to fail as server shuts down; ignore error
    }
    setIsShuttingDown(false);
    setShutdownOpen(false);
  };

  return (
    <>
      <Dropdown
        trigger={
          <button
            className="flex items-center justify-center p-2 text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5 transition-all rounded-[var(--radius-brand)]"
            title="Menu"
          >
            <span className="material-symbols-outlined">grid_view</span>
          </button>
        }
      >
        <DropdownItem
          icon="history"
          label="Change Log"
          onClick={() => setChangelogOpen(true)}
        />
        <DropdownItem
          icon={isDark ? "light_mode" : "dark_mode"}
          label="Theme"
          onClick={toggleTheme}
        />
        <DropdownItem
          icon="power_settings_new"
          label="Shutdown"
          danger
          onClick={() => setShutdownOpen(true)}
        />
        <DropdownItem
          icon="logout"
          label="Logout"
          danger
          onClick={onLogout}
        />
      </Dropdown>

      <ChangelogModal isOpen={changelogOpen} onClose={() => setChangelogOpen(false)} />
      <ConfirmModal
        isOpen={shutdownOpen}
        onClose={() => setShutdownOpen(false)}
        onConfirm={handleShutdown}
        title="Close Proxy"
        message="Are you sure you want to close the proxy server?"
        confirmText="Close"
        cancelText="Cancel"
        variant="danger"
        loading={isShuttingDown}
      />
    </>
  );
}
