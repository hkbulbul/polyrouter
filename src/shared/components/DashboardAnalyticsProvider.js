"use client";

import { createContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

export const DashboardAnalyticsContext = createContext({ enabled: false, installationId: null });

function isDashboardPath(pathname) {
  return pathname === "/dashboard" || pathname?.startsWith("/dashboard/");
}

export default function DashboardAnalyticsProvider({ children }) {
  const pathname = usePathname();
  const [state, setState] = useState({ enabled: false, installationId: null });

  useEffect(() => {
    let cancelled = false;
    if (!isDashboardPath(pathname)) {
      setState({ enabled: false, installationId: null });
      return () => { cancelled = true; };
    }
    fetch("/api/analytics/installation", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { enabled: false })
      .then((data) => {
        if (cancelled || data?.enabled !== true || typeof data.installationId !== "string") return;
        setState({ enabled: true, installationId: data.installationId });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [pathname]);

  const value = useMemo(() => state, [state]);
  return <DashboardAnalyticsContext.Provider value={value}>{children}</DashboardAnalyticsContext.Provider>;
}
