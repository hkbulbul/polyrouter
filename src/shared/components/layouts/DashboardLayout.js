"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import ToastContainer from "../Toast";
import Sidebar from "../Sidebar";
import Header from "../Header";

// Desktop sidebar collapsed preference, persisted in localStorage and synced across tabs
const SIDEBAR_COLLAPSED_KEY = "polyrouter:sidebar-collapsed";
const SIDEBAR_COLLAPSED_EVENT = "polyrouter:sidebar-collapsed-change";

function subscribeSidebarCollapsed(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener(SIDEBAR_COLLAPSED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SIDEBAR_COLLAPSED_EVENT, callback);
  };
}

// In-memory fallback so the toggle still works when storage is blocked
let memoryCollapsed = false;

function readSidebarCollapsed() {
  try {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return stored === null ? memoryCollapsed : stored === "1";
  } catch {
    return memoryCollapsed;
  }
}

function writeSidebarCollapsed(collapsed) {
  memoryCollapsed = collapsed;
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {}
  window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_EVENT));
}

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarCollapsed = useSyncExternalStore(subscribeSidebarCollapsed, readSidebarCollapsed, () => false);
  const pathname = usePathname();

  const toggleSidebarCollapsed = () => writeSidebarCollapsed(!sidebarCollapsed);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg">
      <div className="app-grain" aria-hidden="true" />
      <ToastContainer />
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <div className="hidden lg:flex">
        <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebarCollapsed} />
      </div>

      {/* Sidebar - Mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform lg:hidden transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <main className="flex flex-col flex-1 h-full min-w-0 relative transition-colors duration-300 isolate">
        <Header
          key={pathname}
          onMenuClick={() => setSidebarOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebarCollapsed}
        />
        <div className={`flex-1 overflow-y-auto custom-scrollbar ${pathname === "/dashboard/basic-chat" ? "" : "px-4 py-6 sm:px-6 lg:px-8 lg:py-8"} ${pathname === "/dashboard/basic-chat" ? "flex flex-col overflow-hidden" : ""}`}>
          <div className={`${pathname === "/dashboard/basic-chat" ? "flex-1 w-full h-full flex flex-col" : "max-w-[1240px] mx-auto"}`}>{children}</div>
        </div>
      </main>
    </div>
  );
}
