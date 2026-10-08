const PATHS = {
  embedding: "/v1/embeddings",
  stt: "/v1/audio/transcriptions",
  tts: "/v1/audio/speech",
};

export function resolveSelfHostedEndpoint(value, kind) {
  const route = PATHS[kind];
  if (!route) throw new Error(`Unsupported self-hosted service: ${kind}`);
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`A self-hosted ${kind} endpoint URL is required`);
  }

  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Endpoint URL must be a valid HTTP or HTTPS URL");
  }

  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Endpoint URL must use HTTP or HTTPS and must not include credentials");
  }
  if (url.search || url.hash) {
    throw new Error("Endpoint URL must not include a query string or fragment");
  }

  const cleanPath = url.pathname.replace(/\/+$/, "");
  const suffix = route.slice("/v1".length);
  if (kind === "embedding") {
    if (cleanPath.endsWith("/embeddings")) {
      url.pathname = cleanPath;
    } else if (cleanPath.endsWith("/v1")) {
      url.pathname = `${cleanPath}/embeddings`;
    } else {
      url.pathname = `${cleanPath}/v1/embeddings`;
    }
  } else if (cleanPath.endsWith(suffix)) {
    url.pathname = cleanPath;
  } else if (cleanPath.endsWith("/v1")) {
    url.pathname = `${cleanPath}${suffix}`;
  } else {
    url.pathname = `${cleanPath}/v1${suffix}`;
  }

  return url.toString();
}
