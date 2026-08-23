// ngrok agent-as-library. No binary download, no PID file: the listener lives inside
// this process and dies with it. Kept on globalThis so a Next.js hot reload cannot
// orphan a listener we no longer hold a handle to.
const g = (globalThis.__polyrouterNgrok ??= { listener: null });

export function isNgrokRunning() {
  return !!g.listener;
}

export function getNgrokUrl() {
  try {
    const url = typeof g.listener?.url === "function" ? g.listener.url() : g.listener?.url;
    return typeof url === "string" ? url : "";
  } catch {
    return "";
  }
}

// @ngrok/ngrok is an optionalDependency (native napi module) — imported lazily so a
// missing/unsupported build never breaks startup for cloudflare users.
async function loadForward() {
  let mod;
  try {
    mod = await import("@ngrok/ngrok");
  } catch (e) {
    throw new Error(
      `@ngrok/ngrok is not installed (optional dependency). Run "npm install @ngrok/ngrok" and restart. (${e.message})`
    );
  }
  const forward = mod.forward || mod.default?.forward;
  if (typeof forward !== "function") throw new Error("@ngrok/ngrok has no forward() export");
  return forward;
}

/** Start a listener for the local app port. Returns the public *.ngrok URL. */
export async function startNgrokListener(localPort, authtoken) {
  await stopNgrokListener();
  const forward = await loadForward();

  g.listener = await forward({ addr: `http://127.0.0.1:${localPort}`, authtoken });

  const url = getNgrokUrl();
  if (!url) {
    await stopNgrokListener();
    throw new Error("ngrok returned no public URL");
  }
  return url;
}

export async function stopNgrokListener() {
  const listener = g.listener;
  g.listener = null;
  if (!listener) return;
  try {
    await listener.close?.();
  } catch { /* best effort — process exit closes it anyway */ }
}
