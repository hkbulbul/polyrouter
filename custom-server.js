const http = require("http");
const crypto = require("crypto");
const fs = require("fs");

// Shared only with the in-process Next route used by the WebSocket bridge.
// It is intentionally never exposed to browser JavaScript.
process.env.REALTIME_INTERNAL_SECRET ||= crypto.randomBytes(32).toString("hex");

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
  const viaProxy = !!(xff || xRealIp);
  const isLoopbackProxy = socketIp === "127.0.0.1" || socketIp === "::1" || socketIp === "::ffff:127.0.0.1";
  const proxyIp = xRealIp || (xff ? String(xff).split(",")[0].trim() : "");
  const ip = isLoopbackProxy && proxyIp ? proxyIp : socketIp;
  delete req.headers["x-9r-real-ip"];
  delete req.headers["x-forwarded-for"];
  delete req.headers["x-9r-via-proxy"];
  req.headers["x-9r-real-ip"] = ip;
  if (viaProxy) req.headers["x-9r-via-proxy"] = "1";
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
    if (!isRealtimeUpgrade(req)) return;
    stampSocketIp(req);
    const runtime = await getRealtimeRuntime();
    if (!runtime) {
      if (!socket.destroyed) socket.destroy();
      return;
    }
    runtime.handleUpgrade(req, socket, head);
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

if (fs.existsSync("./server.js")) {
  require("./server.js");
} else {
  // Development fallback: `next dev` does not create standalone/server.js,
  // but it can still share this HTTP server and its websocket upgrade hook.
  process.env.NODE_ENV ||= "development";
  process.env.PORT ||= "20127";
  const next = require("next");
  const devApp = next({
    dev: true,
    hostname: process.env.HOSTNAME || "localhost",
    port: Number(process.env.PORT),
  });
  const devHandle = devApp.getRequestHandler();
  devApp.prepare().then(() => {
    const server = http.createServer(devHandle);
    server.listen(Number(process.env.PORT), process.env.HOSTNAME || "localhost", () => {
      console.log(`▲ Next.js development server ready on http://localhost:${process.env.PORT}`);
    });
  }).catch((error) => {
    console.error("[realtime] Failed to start Next.js development server:", error?.message || error);
    process.exitCode = 1;
  });
}
