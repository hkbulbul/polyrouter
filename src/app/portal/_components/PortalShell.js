"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Card } from "@/shared/components";
import ToastContainer from "@/shared/components/Toast";
import { useSidebarCollapsed } from "@/shared/hooks/useSidebarCollapsed";
import { officeApi } from "@/shared/components/office/officeClient";
import { PortalContext } from "./PortalContext";
import PortalSidebar from "./PortalSidebar";
import PortalHeader from "./PortalHeader";
import ChangePasswordForm from "./ChangePasswordForm";

const SIDEBAR_COLLAPSED_KEY = "polyrouter:portal-sidebar-collapsed";

async function signOut() {
  await fetch("/api/office/auth/logout", { method: "POST" }).catch(() => {});
  window.location.replace("/portal/login");
}

function FullScreen({ children }) {
  return (
    <div className="dot-grid relative flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="app-grain" aria-hidden="true" />
      {children}
    </div>
  );
}

FullScreen.propTypes = { children: PropTypes.node };

// Employee portal frame: same layout, sidebar and header language as the admin
// DashboardLayout. Loads /api/office/me once and shares it with every page.
export default function PortalShell({ children }) {
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, toggleSidebarCollapsed] = useSidebarCollapsed(SIDEBAR_COLLAPSED_KEY);

  const handleError = useCallback((e) => {
    if (e.status === 401) window.location.replace("/portal/login");
    else setError(e.message);
  }, []);

  const reload = useCallback(() => officeApi("/api/office/me").then(setMe).catch(handleError), [handleError]);

  useEffect(() => {
    officeApi("/api/office/me").then(setMe).catch(handleError);
  }, [handleError]);

  const value = useMemo(() => ({ me, reload }), [me, reload]);

  if (!me) {
    return (
      <FullScreen>
        {error ? (
          <Card className="max-w-md text-center">
            <p className="text-sm text-red-500">{error}</p>
          </Card>
        ) : (
          <span className="material-symbols-outlined animate-spin text-[28px] text-primary">progress_activity</span>
        )}
      </FullScreen>
    );
  }

  // A temporary password must be replaced before anything else is usable.
  if (me.user.mustChangePassword) {
    return (
      <FullScreen>
        <div className="relative z-10 w-full max-w-md">
          <div className="mb-6 text-center">
            <p className="eyebrow mb-3">{me.office.orgName || "PolyRouter"}</p>
            <h1 className="text-2xl font-medium tracking-[-0.02em] text-text-main">Set your password</h1>
            <p className="mt-2 text-sm text-text-muted">
              Welcome, {me.user.name || me.user.email}. Replace the temporary password your admin gave you to continue.
            </p>
          </div>
          <Card>
            <ChangePasswordForm required onDone={reload} />
          </Card>
          <button type="button" onClick={signOut} className="mt-4 w-full text-center text-xs text-text-muted hover:text-text-main">
            Sign out
          </button>
        </div>
      </FullScreen>
    );
  }

  return (
    <PortalContext.Provider value={value}>
      <div className="flex h-screen w-full overflow-hidden bg-bg">
        <div className="app-grain" aria-hidden="true" />
        <ToastContainer />
        {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        <div className="hidden lg:flex">
          <PortalSidebar me={me} collapsed={sidebarCollapsed} onSignOut={signOut} />
        </div>
        <div
          className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <PortalSidebar me={me} onClose={() => setSidebarOpen(false)} onSignOut={signOut} />
        </div>

        <main className="relative isolate flex h-full min-w-0 flex-1 flex-col">
          <PortalHeader
            me={me}
            onMenuClick={() => setSidebarOpen(true)}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={toggleSidebarCollapsed}
          />
          <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="mx-auto max-w-[1240px]">
              {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
              {children}
            </div>
          </div>
        </main>
      </div>
    </PortalContext.Provider>
  );
}

PortalShell.propTypes = { children: PropTypes.node };
