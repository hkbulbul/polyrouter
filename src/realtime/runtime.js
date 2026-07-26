import { WebSocketServer, WebSocket } from "ws";
import RealtimeUpstream from "./upstream.js";
import {
  MAX_PENDING_BYTES,
  REALTIME_PATH,
  makeError,
  validateClientEvent,
} from "./protocol.js";
async function authenticateUpgrade(request, host) {
  const url = new URL(request.url || "/", `http://${host}`);
  // The dev server binds to `localhost` on Windows (often IPv6 ::1), while
  // 127.0.0.1 may be unreachable. Keep this in-process hop on the same local
  // hostname in both dev and production; it never leaves the machine.
  const internalHost = host === "0.0.0.0" || host === "::" ? "localhost" : host;
  const response = await fetch(`http://${internalHost}:${process.env.PORT || 20128}/api/realtime/authorize`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cookie": request.headers.cookie || "",
      "x-9r-realtime-internal": process.env.REALTIME_INTERNAL_SECRET || "",
    },
    body: JSON.stringify({
      model: url.searchParams.get("model"),
      provider: url.searchParams.get("provider"),
      voice: url.searchParams.get("voice"),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.accessToken) throw new Error(payload.error || "Realtime authentication failed.");
  return payload;
}

const MAX_FRAME_BYTES = 256 * 1024;
const MAX_SESSIONS = 4;

function rejectUpgrade(socket, status, message) {
  if (socket.destroyed) return;
  socket.end(`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
}

export function createRealtimeRuntime({ host = "localhost" } = {}) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_FRAME_BYTES });
  const sessions = new Set();

  wss.on("connection", (client, request) => {
    if (sessions.size >= MAX_SESSIONS) {
      client.close(1013, "Realtime session limit reached.");
      return;
    }
    sessions.add(client);
    let upstream = null;
    let initialized = false;
    let closed = false;
    let pending = [];
    let pendingBytes = 0;

    const send = (event) => {
      if (closed || client.readyState !== WebSocket.OPEN) return;
      if (client.bufferedAmount > MAX_FRAME_BYTES * 4) {
        client.close(1009, "Realtime client buffer exceeded.");
        return;
      }
      client.send(JSON.stringify(event));
    };

    const cleanup = () => {
      if (closed) return;
      closed = true;
      pending = [];
      pendingBytes = 0;
      upstream?.close();
      upstream = null;
      sessions.delete(client);
    };

    const closeWithError = (code, message) => {
      send(makeError(code, message));
      client.close(1011, message.slice(0, 120));
      cleanup();
    };

    const dispatch = (data, isBinary) => {
      if (closed) return;
      if (isBinary) {
        send(makeError("unsupported_feature", "Realtime events must use JSON frames."));
        return;
      }
      let parsed;
      try {
        parsed = JSON.parse(data.toString());
      } catch {
        send(makeError("invalid_json", "Realtime messages must contain valid JSON."));
        return;
      }
      const validation = validateClientEvent(parsed);
      if (!validation.ok) {
        send(makeError("invalid_event", validation.message));
        return;
      }
      upstream?.handle(parsed, false);
    };

    client.on("message", (data, isBinary) => {
      const frame = Buffer.isBuffer(data) ? data : Buffer.from(data);
      if (frame.byteLength > MAX_FRAME_BYTES) {
        closeWithError("frame_too_large", "Realtime frame exceeds the maximum size.");
        return;
      }
      if (initialized) {
        dispatch(frame, isBinary);
        return;
      }
      if (pendingBytes + frame.byteLength > MAX_PENDING_BYTES) {
        closeWithError("buffer_overflow", "Realtime initialization buffer exceeded.");
        return;
      }
      pending.push({ frame, isBinary });
      pendingBytes += frame.byteLength;
    });

    client.once("close", cleanup);
    client.once("error", cleanup);

    void (async () => {
      try {
        const auth = await authenticateUpgrade(request, host);
        if (closed || client.readyState !== WebSocket.OPEN) return;
        upstream = new RealtimeUpstream({
          accessToken: auth.accessToken,
          clientSocket: client,
          model: auth.model,
          voice: auth.voice,
          sendError: (code, message) => send(makeError(code, message)),
        });
        initialized = true;
        for (const item of pending) dispatch(item.frame, item.isBinary);
        pending = [];
        pendingBytes = 0;
      } catch (error) {
        closeWithError("auth_failed", error?.message || "Realtime authentication failed.");
      }
    })();
  });

  return {
    handleUpgrade(request, socket, head) {
      let url;
      try {
        url = new URL(request.url || "/", `http://${host}`);
      } catch {
        rejectUpgrade(socket, 400, "Bad Request");
        return;
      }
      if (url.pathname !== REALTIME_PATH) {
        rejectUpgrade(socket, 404, "Not Found");
        return;
      }
      wss.handleUpgrade(request, socket, head, (client) => {
        wss.emit("connection", client, request);
      });
    },
    async close() {
      for (const client of sessions) client.close(1001, "Server shutting down.");
      await new Promise((resolve) => wss.close(resolve));
    },
  };
}
