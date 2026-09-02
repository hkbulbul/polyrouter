function sanitizeAnalyticsUrl(value, baseUrl) {
  if (!value) return null;

  try {
    const url = new URL(value, baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return `${url.origin}${url.pathname}`;
  } catch {
    return null;
  }
}

export function createDashboardOpenProperties({ appVersion }) {
  return {
    event_source: "local_dashboard",
    telemetry_identity: "installation",
    ...(typeof appVersion === "string" && appVersion ? { app_version: appVersion } : {}),
  };
}

export function createInstallationLifecycleProperties({ installationId, appVersion, eventType }) {
  return {
    event_source: "installation_telemetry",
    telemetry_identity: "installation",
    installation_id: installationId,
    event_type: eventType,
    ...(typeof appVersion === "string" && appVersion ? { app_version: appVersion } : {}),
  };
}

export function createPostHogPageviewProperties({ pathname, origin, referrer }) {
  const safePathname = typeof pathname === "string" && pathname.startsWith("/")
    ? pathname
    : "/";
  const currentUrl = sanitizeAnalyticsUrl(safePathname, origin);
  const safeReferrer = sanitizeAnalyticsUrl(referrer);

  return {
    $current_url: currentUrl || safePathname,
    ...(safeReferrer ? { $referrer: safeReferrer } : {}),
  };
}
