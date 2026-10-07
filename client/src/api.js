// Calls to the office PolyRouter server.

export class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function call(serverUrl, pathname, { method = "GET", body, token } = {}) {
  let res;
  try {
    res = await fetch(`${serverUrl}${pathname}`, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    const reason = error?.cause?.code || error?.name || error?.message;
    throw new ApiError(0, `Cannot reach ${serverUrl} (${reason}). Check the URL and that you are on the office network/VPN.`);
  }
  let data = {};
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    const message = data?.error?.message || data?.error || `Request failed with HTTP ${res.status}`;
    throw new ApiError(res.status, typeof message === "string" ? message : JSON.stringify(message), data?.code || data?.error?.code);
  }
  return data;
}

export const api = {
  login: (serverUrl, { email, password, deviceName, platform }) =>
    call(serverUrl, "/api/office/client/login", { method: "POST", body: { email, password, deviceName, platform } }),
  me: (serverUrl, token) => call(serverUrl, "/api/office/client/me", { token }),
  key: (serverUrl, token) => call(serverUrl, "/api/office/client/key", { method: "POST", token }),
  logout: (serverUrl, token) => call(serverUrl, "/api/office/client/logout", { method: "POST", token }),
  models: (serverUrl, apiKey) => call(serverUrl, "/v1/models", { token: apiKey }),
};
