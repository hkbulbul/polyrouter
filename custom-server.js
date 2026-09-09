const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const os = require("os");

// ─── Crash guard ──────────────────────────────────────────────────────────────
// These handlers existed only in cli/cli.js (the launcher), so a stray rejection
// in the *server* process was fatal and undiagnosable. The throws actually being
// guarded here are request-scoped and harmless — a rejecting reader.cancel() on a
// client disconnect, a throw inside the async upgrade listener below.
//
// Deliberately log-and-stay-up rather than process.exit(1): cli/cli.js:846 does
// auto-restart with backoff, but a bare `npm run start` has no supervisor, and the
// reported symptom is a hang, not a crash — exiting would turn "one dropped
// request" into "gateway gone".
//
// This duplicates src/lib/dataDir.js defaultDir() and src/sse/utils/errorLog.js on
// purpose: this file is CommonJS and cannot import either ESM module.
const ERROR_LOG_PATH = path.join(
  process.platform === "win32"
    ? path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "polyrouter")
    : path.join(os.homedir(), ".polyrouter"),
  "error.log"
);

// Ignore EPIPE on stdout/stderr so broken pipes don't spin in uncaughtException loops
process.stdout?.on?.("error", (err) => { if (err?.code === "EPIPE") return; });
process.stderr?.on?.("error", (err) => { if (err?.code === "EPIPE") return; });

function logFatal(kind, err) {
  if (err?.code === "EPIPE" || err?.syscall === "write" || err?.message?.includes?.("EPIPE")) return;
  const detail = err?.stack || err?.message || String(err);
  try {
    console.error(`[${kind}]`, detail);
  } catch { /* console write failed */ }
  try {
    fs.mkdirSync(path.dirname(ERROR_LOG_PATH), { recursive: true });
    fs.appendFileSync(ERROR_LOG_PATH, `[${new Date().toISOString()}] ${kind} ${detail}\n`);
  } catch { /* logging must not be the thing that kills the process */ }
}

process.on("unhandledRejection", (reason) => logFatal("unhandledRejection", reason));
process.on("uncaughtException", (err) => logFatal("uncaughtException", err));

// Shared only with in-process Next code. Never expose these to browser JavaScript.
process.env.REALTIME_INTERNAL_SECRET ||= crypto.randomBytes(32).toString("hex");
process.env.LOCALITY_INTERNAL_SECRET ||= crypto.randomBytes(32).toString("hex");

const origCreate = http.createServer.bind(http);
let realtimeRuntimePromise;

function isRealtimeUpgrade(req) {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    return url.pathname === "/v1/realtime";
  } catch {
    return false;
  }
}

function stampSocketIp(req) {
  const socketIp = req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "";
  const xff = req.headers["x-forwarded-for"];
  const xRealIp = req.headers["x-real-ip"];
  const xForwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim().toLowerCase();
  const viaProxy = !!(xff || xRealIp);
  const isLoopbackProxy = socketIp === "127.0.0.1" || socketIp === "::1" || socketIp === "::ffff:127.0.0.1";
  const proxyIp = xRealIp || (xff ? String(xff).split(",")[0].trim() : "");
  const ip = isLoopbackProxy && proxyIp ? proxyIp : socketIp;
  delete req.headers["x-9r-real-ip"];
  delete req.headers["x-forwarded-for"];
  delete req.headers["x-9r-via-proxy"];
  delete req.headers["x-9r-secure"];
  delete req.headers["x-9r-locality-proof"];
  delete req.headers["x-9r-local"];
  req.headers["x-9r-real-ip"] = ip;
  req.headers["x-9r-locality-proof"] = process.env.LOCALITY_INTERNAL_SECRET;
  if (viaProxy) req.headers["x-9r-via-proxy"] = "1";
  if (req.socket?.encrypted === true || (isLoopbackProxy && viaProxy && xForwardedProto === "https")) {
    req.headers["x-9r-secure"] = "1";
  }
}

function getRealtimeRuntime() {
  if (!realtimeRuntimePromise) {
    realtimeRuntimePromise = import("./src/realtime/runtime.js")
      .then(({ createRealtimeRuntime }) => createRealtimeRuntime({ host: process.env.HOSTNAME || "localhost" }))
      .catch((error) => {
        console.error("[realtime] Failed to initialize WebSocket runtime:", error?.message || error);
        return null;
      });
  }
  return realtimeRuntimePromise;
}

// Wrap Next standalone HTTP server: derive client IP from the TCP socket
// (unspoofable) and strip client-supplied forwarding headers so downstream
// rate-limiting keys on the real peer address instead of attacker-controlled XFF.
http.createServer = (...args) => {
  const handler = args.find((a) => typeof a === "function");
  const rest = args.filter((a) => typeof a !== "function");
  if (!handler) return origCreate(...args);
  const wrapped = (req, res) => {
    stampSocketIp(req);
    return handler(req, res);
  };
  const server = origCreate(...rest, wrapped);

  // Next's App Router cannot handle arbitrary WebSocket upgrades. Dispatch only
  // our exact realtime path and leave HMR/other Next upgrade paths untouched.
  server.on("upgrade", async (req, socket, head) => {
    try {
      if (!isRealtimeUpgrade(req)) return;
      stampSocketIp(req);
      const runtime = await getRealtimeRuntime();
      if (!runtime) {
        if (!socket.destroyed) socket.destroy();
        return;
      }
      runtime.handleUpgrade(req, socket, head);
    } catch (error) {
      // An async listener's throw escapes as an unhandledRejection, so this was
      // previously a process-level event for one bad WebSocket handshake.
      logFatal("upgrade", error);
      if (!socket.destroyed) socket.destroy();
    }
  });

  const closeRuntime = () => {
    if (realtimeRuntimePromise) {
      realtimeRuntimePromise.then((runtime) => runtime?.close()).catch(() => {});
    }
  };
  process.once("SIGINT", closeRuntime);
  process.once("SIGTERM", closeRuntime);
  return server;
};

const standaloneServer = path.join(__dirname, "server.js");
if (fs.existsSync(standaloneServer)) {
  require(standaloneServer);
} else {
  const isProduction = process.argv.includes("--production");
  process.env.NODE_ENV = isProduction ? "production" : (process.env.NODE_ENV || "development");
  process.env.PORT ||= "20127";
  // Keep development manifests separate from the production build.
  process.env.NEXT_DIST_DIR = isProduction ? ".next" : (process.env.NEXT_DIST_DIR || ".next-dev");
  const next = require("next");
  const app = next({
    dev: !isProduction,
    hostname: process.env.HOSTNAME || "localhost",
    port: Number(process.env.PORT),
  });
  const handle = app.getRequestHandler();
  app.prepare().then(() => {
    const server = http.createServer(handle);
    server.listen(Number(process.env.PORT), process.env.HOSTNAME || "localhost", () => {
      const mode = isProduction ? "production" : "development";
      console.log(`▲ Next.js ${mode} server ready on http://localhost:${process.env.PORT}`);
    });
  }).catch((error) => {
    console.error("[realtime] Failed to start Next.js server:", error?.message || error);
    process.exitCode = 1;
  });
}
