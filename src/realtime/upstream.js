import WebSocket from "ws";
import {
  buildInitialSession,
  MAX_BUFFERED_BYTES,
  MAX_PENDING_BYTES,
} from "./protocol.js";

const DEFAULT_UPSTREAM_URL = "wss://api.openai.com/v1/realtime";
const MAX_UPSTREAM_CONNECT_MS = 15000;

function buildUpstreamUrl({ model, upstreamBaseUrl }) {
  const url = new URL(upstreamBaseUrl || DEFAULT_UPSTREAM_URL);
  if (url.protocol !== "wss:" || url.hostname !== "api.openai.com" || url.pathname !== "/v1/realtime") {
    throw new Error("Realtime upstream must be the OpenAI Realtime endpoint.");
  }
  url.searchParams.set("model", model);
  return url.toString();
}

export default class RealtimeUpstream {
  constructor({ accessToken, clientSocket, model, voice, upstreamBaseUrl, sendError }) {
    if (!accessToken) throw new Error("Realtime credentials are unavailable.");
    this.clientSocket = clientSocket;
    this.sendError = sendError;
    this.closed = false;
    this.pending = [];
    this.pendingBytes = 0;
    this.socket = new WebSocket(buildUpstreamUrl({ model, upstreamBaseUrl }), {
      headers: { Authorization: `Bearer ${accessToken}` },
      maxPayload: 256 * 1024,
    });

    this.connectTimer = setTimeout(() => {
      if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
        this.sendError("upstream_timeout", "Realtime upstream connection timed out.");
        this.close();
      }
    }, MAX_UPSTREAM_CONNECT_MS);

    this.socket.on("open", () => {
      clearTimeout(this.connectTimer);
      if (this.closed) return this.socket.close();
      this.socket.send(JSON.stringify(buildInitialSession({ model, voice })));
      for (const message of this.pending) this.socket.send(message);
      this.pending = [];
      this.pendingBytes = 0;
    });

    this.socket.on("message", (data, isBinary) => {
      if (this.closed || this.clientSocket.readyState !== WebSocket.OPEN) return;
      if (this.clientSocket.bufferedAmount > MAX_BUFFERED_BYTES) {
        this.sendError("backpressure", "Realtime client is not consuming events fast enough.");
        this.close();
        return;
      }
      this.clientSocket.send(data, { binary: isBinary });
    });

    this.socket.on("error", (error) => {
      if (this.closed) return;
      this.sendError("upstream_error", error?.message || "Realtime upstream connection failed.");
      this.close();
    });

    this.socket.on("close", () => {
      if (this.closed) return;
      this.closed = true;
      if (this.clientSocket.readyState === WebSocket.OPEN || this.clientSocket.readyState === WebSocket.CONNECTING) {
        this.clientSocket.close();
      }
    });
  }

  handle(data, isBinary = false) {
    if (this.closed) return;
    if (isBinary) {
      this.sendError("unsupported_feature", "Realtime events must use JSON frames.");
      return;
    }
    const message = typeof data === "string" ? data : JSON.stringify(data);
    if (this.socket.readyState === WebSocket.OPEN) {
      if (this.socket.bufferedAmount > MAX_BUFFERED_BYTES) {
        this.sendError("backpressure", "Realtime upstream is not accepting events fast enough.");
        this.close();
        return;
      }
      this.socket.send(message);
      return;
    }
    const bytes = Buffer.byteLength(message);
    if (this.pendingBytes + bytes > MAX_PENDING_BYTES) {
      this.sendError("buffer_overflow", "Realtime initialization buffer exceeded.");
      this.close();
      return;
    }
    this.pending.push(message);
    this.pendingBytes += bytes;
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.connectTimer);
    this.pending = [];
    this.pendingBytes = 0;
    if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
      this.socket.close();
    }
  }
}
