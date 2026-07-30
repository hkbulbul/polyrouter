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
