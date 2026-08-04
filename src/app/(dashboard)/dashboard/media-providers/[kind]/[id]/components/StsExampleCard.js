"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Card } from "@/shared/components";
import { getRealtimeUrl } from "@/realtime/url";
import { DEFAULT_REALTIME_MODEL, REALTIME_MODEL_OPTIONS } from "@/realtime/constants";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import { Row } from "./exampleShared";

const AUTH_MODES = [
  { id: "dashboard", label: "Dashboard session" },
  { id: "server", label: "Server / CLI API key" },
  { id: "ticket", label: "External website ticket" },
  { id: "query", label: "Private browser API key" },
];

function browserHandlers() {
  return `ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "session.update",
    session: { instructions: "You are a helpful assistant." },
  }));
};

function sendAudio(pcm16Base64) {
  ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: pcm16Base64 }));
}

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if ((msg.type === "response.output_audio.delta" || msg.type === "response.audio.delta") && msg.delta) {
    playAudioChunk(base64ToPcm16(msg.delta));
  }
  if ((msg.type === "response.output_audio_transcript.delta" || msg.type === "response.audio_transcript.delta") && msg.delta) {
    console.log("Assistant:", msg.delta);
  }
  if (msg.type === "conversation.item.input_audio_transcription.completed") {
    console.log("You said:", msg.transcript);
  }
};

ws.onerror = (error) => console.error("WebSocket error:", error);`;
}

function getCodeSnippet({ endpoint, provider, model, authMode, apiKey }) {
  const wsUrl = getRealtimeUrl(endpoint, provider, model);
  const httpUrl = new URL(endpoint);

  if (authMode === "server") {
    return `import WebSocket from "ws";

const ws = new WebSocket("${wsUrl}", {
  headers: {
    Authorization: \`Bearer \${process.env.POLYROUTER_API_KEY}\`,
  },
});

${browserHandlers()}`;
  }

  if (authMode === "ticket") {
    return `// Your trusted website backend (never expose this API key to the browser)
const ticketResponse = await fetch("${httpUrl.origin}/api/realtime/tickets", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.POLYROUTER_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    provider: "${provider}",
    model: "${model}",
    origin: "https://your-website.example",
  }),
});
const { ticket } = await ticketResponse.json();
// Return only the short-lived ticket to your browser.

// Browser code
const ws = new WebSocket(
  "${wsUrl}&ticket=" + encodeURIComponent(ticket)
);

${browserHandlers()}`;
  }

  if (authMode === "query") {
    const url = new URL(wsUrl);
    url.searchParams.set("api_key", apiKey || "YOUR_POLYROUTER_API_KEY");
    return `// Private/trusted browser only. The permanent key is visible to browser users.
const ws = new WebSocket("${url.toString()}");

${browserHandlers()}`;
  }

  return `// Dashboard-only: the same-origin WebSocket uses your dashboard session cookie.
const ws = new WebSocket("${wsUrl}");

${browserHandlers()}`;
}

export function StsExampleCard({ providerId }) {
  const [authMode, setAuthMode] = useState("ticket");
  const [apiKey, setApiKey] = useState("");
  const [useTunnel, setUseTunnel] = useState(false);
  const localEndpoint = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => ""
  );
  const [tunnelEndpoint, setTunnelEndpoint] = useState("");
  const [model, setModel] = useState(DEFAULT_REALTIME_MODEL);
  const { copied: copiedCode, copy: copyCode } = useCopyToClipboard();

  useEffect(() => {
    Promise.all([
      fetch("/api/tunnel/status").then((response) => response.json()),
      fetch("/api/keys").then((response) => response.json()),
    ]).then(([tunnel, keys]) => {
      if (tunnel.publicUrl) setTunnelEndpoint(tunnel.publicUrl);
      setApiKey((keys.keys || []).find((key) => key.isActive !== false)?.key || "");
    }).catch(() => {});
  }, []);

  const endpoint = useTunnel ? tunnelEndpoint : localEndpoint;
  const wsUrl = endpoint ? getRealtimeUrl(endpoint, providerId, model) : "";
  const codeSnippet = endpoint ? getCodeSnippet({ endpoint, provider: providerId, model, authMode, apiKey }) : "";
  const isPermanentBrowserKey = authMode === "query";

  return (
    <Card>
      <h2 className="text-lg font-semibold mb-4">Connection Examples</h2>

      <div className="flex flex-col gap-2.5">
        <Row label="Endpoint">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <span className="w-full min-w-0 flex-1 px-3 py-1.5 text-sm font-mono text-text-main bg-sidebar truncate">
              {wsUrl || "ws://localhost:20127/v1/realtime"}
            </span>
            {tunnelEndpoint && (
              <button
                type="button"
                onClick={() => setUseTunnel((value) => !value)}
                title={useTunnel ? "Using tunnel" : "Using local"}
                className={`flex items-center gap-1 text-xs px-2 py-1.5 border shrink-0 transition-colors ${
                  useTunnel ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-text-muted hover:text-primary"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">wifi_tethering</span>
                Tunnel
              </button>
            )}
          </div>
        </Row>

        <Row label="Authentication">
          <select
            value={authMode}
            onChange={(event) => setAuthMode(event.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-border bg-background focus:outline-none focus:border-primary"
          >
            {AUTH_MODES.map((mode) => <option key={mode.id} value={mode.id}>{mode.label}</option>)}
          </select>
        </Row>

        <Row label="Model">
          <select
            value={model}
            onChange={(event) => setModel(event.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-border bg-background focus:outline-none focus:border-primary"
          >
            {REALTIME_MODEL_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </select>
        </Row>

        <div className={`mt-1 border px-3 py-2 text-xs ${isPermanentBrowserKey ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300" : "border-border bg-sidebar text-text-muted"}`}>
          {authMode === "dashboard" && "Uses the active dashboard cookie. This mode is same-origin only."}
          {authMode === "server" && "Recommended for servers, CLIs, native apps, and trusted automation. Keep the API key in an environment variable."}
          {authMode === "ticket" && "Recommended for public websites. The backend exchanges its API key for a single-use browser ticket valid for about one minute."}
          {authMode === "query" && "Compatibility mode for private browser deployments only. The permanent API key is visible in JavaScript and WebSocket URLs; always use WSS outside localhost."}
        </div>

        <div className="mt-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1.5">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">JavaScript Example</span>
            <button
              type="button"
              onClick={() => copyCode(codeSnippet)}
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">{copiedCode ? "check" : "content_copy"}</span>
              {copiedCode ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="bg-sidebar px-3 py-2.5 text-xs font-mono text-text-main overflow-x-auto whitespace-pre-wrap break-all">{codeSnippet || "Loading..."}</pre>
        </div>
      </div>
    </Card>
  );
}
