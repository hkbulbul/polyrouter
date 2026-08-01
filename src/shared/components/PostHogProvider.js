"use client";

import { useContext, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { DashboardAnalyticsContext } from "@/shared/components/DashboardAnalyticsProvider";
import { APP_CONFIG } from "@/shared/constants/config";
import { createDashboardOpenProperties, createPostHogPageviewProperties } from "@/shared/analytics/posthog";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

function initializePostHog() {
  if (!projectToken || typeof window === "undefined" || posthog.__loaded) return false;
  posthog.init(projectToken, {
    api_host: host,
    capture_pageview: false,
    capture_pageleave: false,
    autocapture: true,
    disable_session_recording: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
    advanced_disable_decide: true,
  });
  return true;
}

function isApiPath(pathname) {
  return ["/api", "/v1", "/v1beta", "/codex", "/responses"].some(
    (prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`)
  );
}

export default function PostHogProvider({ children }) {
  const pathname = usePathname();
  const { enabled, installationId } = useContext(DashboardAnalyticsContext);
  const initialized = useRef(false);
  const opened = useRef(false);

  useEffect(() => {
    if (!projectToken || !enabled || !installationId || !pathname || typeof window === "undefined" || isApiPath(pathname)) return;
    initialized.current = initializePostHog() || posthog.__loaded;
    if (!initialized.current) return;

    posthog.identify(installationId, { telemetry_identity: "installation" });
    if (!opened.current) {
      posthog.capture("polyrouter_dashboard_opened", createDashboardOpenProperties({ appVersion: APP_CONFIG.version }));
      opened.current = true;
    }
    posthog.capture("$pageview", createPostHogPageviewProperties({
      pathname,
      origin: window.location.origin,
      referrer: document.referrer,
    }));
  }, [enabled, installationId, pathname]);

  return children;
}
