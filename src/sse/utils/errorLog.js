// Persistent error log.
//
// Until now every failure went to stdout only. A gateway that wedges mid-session
// and gets restarted takes its own evidence with it — the console scrollback is
// gone and there is nothing left to diagnose. This is the sink that survives.
//
// Deliberately NOT under DATA_DIR: per CLAUDE.md, logs live next to usage.json /
// log.txt in the app home, which DATA_DIR does not move.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const MAX_BYTES = 5 * 1024 * 1024;

// Same resolution as src/lib/dataDir.js defaultDir(). Duplicated rather than
// exported from there because custom-server.js (CommonJS) needs the identical
// path and cannot import the ESM module — one shape, two call sites, kept in sync
// by this comment. Existing precedent: appUpdater.js:81, mitmAliasCache.js:10.
function appHomeDir() {
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "polyrouter");
  }
  return path.join(os.homedir(), ".polyrouter");
}

export const ERROR_LOG_PATH = path.join(appHomeDir(), "error.log");

let ready = false;
// One consecutive-failure latch: if the log itself is unwritable (read-only disk,
// permissions), stop trying. A logger that spams its own failures is worse than
// no logger.
let disabled = false;

/**
 * Append one line, rotating to error.log.1 past MAX_BYTES.
 * Never throws — logging must not be able to break a request.
 */
export function appendErrorLog(message) {
  if (disabled) return;
  try {
    if (!ready) {
      fs.mkdirSync(path.dirname(ERROR_LOG_PATH), { recursive: true });
      ready = true;
    }

    const size = fs.statSync(ERROR_LOG_PATH, { throwIfNoEntry: false })?.size ?? 0;
    if (size > MAX_BYTES) {
      fs.renameSync(ERROR_LOG_PATH, `${ERROR_LOG_PATH}.1`);
    }

    fs.appendFileSync(ERROR_LOG_PATH, `[${new Date().toISOString()}] ${message}\n`);
  } catch (e) {
    disabled = true;
    console.warn(`[ErrorLog] disabled — cannot write ${ERROR_LOG_PATH}: ${e?.message || e}`);
  }
}
