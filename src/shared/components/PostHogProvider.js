"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { createPostHogPageviewProperties } from "@/shared/analytics/posthog";

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

export default function PostHogProvider({ children }) {
  const pathname = usePathname();
  const initialized = useRef(false);

  useEffect(() => {
    if (!projectToken || !pathname || typeof window === "undefined") return;

    initialized.current = initializePostHog() || posthog.__loaded;
    if (!initialized.current) return;

    posthog.capture("$pageview", createPostHogPageviewProperties({
      pathname,
      origin: window.location.origin,
      referrer: document.referrer,
    }));
  }, [pathname]);

  return children;
}
