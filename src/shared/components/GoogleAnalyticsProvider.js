"use client";

import { useCallback, useContext, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { DashboardAnalyticsContext } from "@/shared/components/DashboardAnalyticsProvider";
import { APP_CONFIG } from "@/shared/constants/config";
import { createGoogleAnalyticsDashboardOpenProperties, createGoogleAnalyticsPageviewProperties } from "@/shared/analytics/googleAnalytics";

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

function initializeGoogleAnalytics() {
  if (!measurementId || typeof window === "undefined" || window.__polyrouterGaInitialized) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { cookie_domain: "none", send_page_view: false });
  window.__polyrouterGaInitialized = true;
}

function isApiPath(pathname) {
  return ["/api", "/v1", "/v1beta", "/codex", "/responses"].some(
    (prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`)
  );
}

export default function GoogleAnalyticsProvider({ children }) {
  const pathname = usePathname();
  const { enabled, installationId } = useContext(DashboardAnalyticsContext);
  const scriptLoaded = useRef(false);
  const lastTrackedPathname = useRef(null);
  const opened = useRef(false);

  const trackPageview = useCallback(() => {
    if (!enabled || !installationId || !pathname || isApiPath(pathname) || lastTrackedPathname.current === pathname) return;
    initializeGoogleAnalytics();
    window.gtag("config", measurementId, { user_id: installationId, cookie_domain: "none", send_page_view: false });
    if (!opened.current) {
      window.gtag("event", "polyrouter_dashboard_opened", {
        send_to: measurementId,
        ...createGoogleAnalyticsDashboardOpenProperties({ appVersion: APP_CONFIG.version }),
      });
      opened.current = true;
    }
    window.gtag("event", "page_view", {
      send_to: measurementId,
      ...createGoogleAnalyticsPageviewProperties({ pathname, origin: window.location.origin, title: document.title }),
    });
    lastTrackedPathname.current = pathname;
  }, [enabled, installationId, pathname]);

  useEffect(() => {
    if (!measurementId || typeof window === "undefined" || !scriptLoaded.current) return;
    trackPageview();
  }, [trackPageview]);

  if (!measurementId) return children;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
        strategy="afterInteractive"
        onLoad={() => { scriptLoaded.current = true; trackPageview(); }}
      />
      {children}
    </>
  );
}
