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

export function createGoogleAnalyticsPageviewProperties({ pathname, origin, title }) {
  const safePathname = typeof pathname === "string" && pathname.startsWith("/")
    ? pathname
    : "/";
  const pageLocation = sanitizeAnalyticsUrl(safePathname, origin);

  return {
    page_location: pageLocation || safePathname,
    page_path: pageLocation ? new URL(pageLocation).pathname : safePathname,
    ...(typeof title === "string" && title ? { page_title: title } : {}),
  };
}
