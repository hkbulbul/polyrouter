import { loadState, saveState, generateShortId } from "../shared/state.js";
import { startNgrokListener, stopNgrokListener, getNgrokUrl, isNgrokRunning } from "./ngrok.js";
// healthCheck is provider-agnostic (DNS resolve + GET /api/health on any URL).
import { waitForHealth, probeUrlAlive } from "../cloudflare/healthCheck.js";
import { publicUrlFor, registerTunnelUrl } from "../shared/workerRegister.js";
import { defaultLocalPort } from "../shared/localPort.js";
import { getSettings, updateSettings } from "@/lib/localDb";

const svc = {
  cancelToken: { cancelled: false },
  spawnInProgress: false,
  lastRestartAt: 0,
  activeLocalPort: null,
};

export function getNgrokService() { return svc; }
export function isNgrokManuallyDisabled() { return svc.cancelToken.cancelled; }
export function isNgrokReconnecting() { return svc.spawnInProgress; }

function throwIfCancelled(token) {
  if (token.cancelled) throw new Error("tunnel cancelled");
}

async function resolveAuthtoken() {
  const settings = await getSettings();
  const token = (settings.ngrokAuthtoken || process.env.NGROK_AUTHTOKEN || "").trim();
  if (!token) {
    throw new Error(
      "ngrok authtoken missing — paste it in Dashboard → Endpoint → Enable Tunnel, or set NGROK_AUTHTOKEN. Get one at https://dashboard.ngrok.com/get-started/your-authtoken"
    );
  }
  return token;
}

export async function enableNgrok(localPort = defaultLocalPort()) {
  console.log(`[Ngrok] enable start (port=${localPort})`);
  const authtoken = await resolveAuthtoken();
  svc.cancelToken = { cancelled: false };
  svc.activeLocalPort = localPort;
  svc.spawnInProgress = true;
  const token = svc.cancelToken;

  try {
    if (isNgrokRunning()) {
      const existing = loadState();
      const liveUrl = getNgrokUrl();
      if (liveUrl && existing?.shortId) {
        const publicUrl = publicUrlFor(existing.shortId);
        // Reuse only if BOTH direct + public URL alive (worker may point at a dead URL)
        const [directOk, publicOk] = await Promise.all([
          probeUrlAlive(liveUrl),
          probeUrlAlive(publicUrl),
        ]);
        if (directOk && publicOk) {
          console.log(`[Ngrok] already running, reuse: ${liveUrl}`);
          return { success: true, tunnelUrl: liveUrl, shortId: existing.shortId, publicUrl, provider: "ngrok", alreadyRunning: true };
        }
        console.log(`[Ngrok] stale (direct=${directOk} public=${publicOk}), restart listener`);
      }
    }

    await stopNgrokListener();
    throwIfCancelled(token);

    const existing = loadState();
    const shortId = existing?.shortId || generateShortId();

    const tunnelUrl = await startNgrokListener(localPort, authtoken);
    console.log(`[Ngrok] listening: ${tunnelUrl}`);
    // A disable/switch that landed mid-start must not leave this listener behind
    if (token.cancelled) {
      await stopNgrokListener();
      throwIfCancelled(token);
    }

    const publicUrl = publicUrlFor(shortId);
    await registerTunnelUrl(shortId, tunnelUrl);
    saveState({ shortId, tunnelUrl });
    await updateSettings({ tunnelEnabled: true, tunnelUrl });
    console.log(`[Ngrok] registered shortId=${shortId} publicUrl=${publicUrl}`);

    await waitForHealth(publicUrl, token);
    console.log("[Ngrok] public URL healthy");

    console.log("[Ngrok] enable success");
    return { success: true, tunnelUrl, shortId, publicUrl, provider: "ngrok" };
  } catch (e) {
    if (!/tunnel cancelled/.test(e.message)) {
      console.error(`[Ngrok] enable error: ${e.message}`);
    }
    throw e;
  } finally {
    svc.spawnInProgress = false;
  }
}

export async function disableNgrok() {
  console.log("[Ngrok] disable");
  // Abort any in-flight enable so it cannot resurrect state after we clear it
  svc.cancelToken.cancelled = true;

  try { await stopNgrokListener(); } catch (e) { console.warn(`[Ngrok] stop warn: ${e.message}`); }

  const state = loadState();
  if (state) saveState({ shortId: state.shortId, tunnelUrl: null });

  await updateSettings({ tunnelEnabled: false, tunnelUrl: "" });
  svc.spawnInProgress = false;
  svc.activeLocalPort = null;
  return { success: true };
}

export async function getNgrokStatus() {
  const settings = await getSettings();
  const settingsEnabled = settings.tunnelEnabled === true;
  const state = loadState();
  const shortId = state?.shortId || "";
  const publicUrl = publicUrlFor(shortId);
  const running = settingsEnabled ? isNgrokRunning() : false;
  const tunnelUrl = (running ? getNgrokUrl() : "") || state?.tunnelUrl || "";

  return {
    enabled: settingsEnabled && running,
    settingsEnabled,
    provider: "ngrok",
    tunnelUrl,
    shortId,
    publicUrl,
    running
  };
}
