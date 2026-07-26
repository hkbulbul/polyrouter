"use client";

import { useState, useEffect } from "react";
import { Card } from "@/shared/components";
import { getProviderAlias } from "@/shared/constants/providers";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import { Row } from "./exampleShared";

function getCodeSnippet(endpoint, apiKey, provider, model) {
  const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws";
  const host = endpoint ? new URL(endpoint).host : "localhost:20128";
  const wsUrl = `${protocol}://${host}/v1/realtime?provider=${encodeURIComponent(provider)}&model=${encodeURIComponent(model)}`;
  const key = apiKey || "YOUR_KEY";

  return `// Connect to Speech-to-Speech WebSocket
const ws = new WebSocket("${wsUrl}");

ws.onopen = () => {
  // Send initial session config with auth
  ws.send(JSON.stringify({
    type: "session.update",
    session: {
      modalities: ["text", "audio"],
      instructions: "You are a helpful assistant.",
      voice: "alloy",
      input_audio_format: "pcm16",
      output_audio_format: "pcm16",
      input_audio_transcription: { enabled: true },
    },
    api_key: "${key}",
  }));
};

// Send audio from microphone
function sendAudio(pcm16Base64) {
  ws.send(JSON.stringify({
    type: "input_audio_buffer.append",
    audio: pcm16Base64,
  }));
}

// Receive responses
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  // Audio output
  if (msg.type === "response.audio.delta" && msg.delta) {
    playAudioChunk(base64ToPcm16(msg.delta));
  }
  // Text transcript
  if (msg.type === "response.audio_transcript.delta" && msg.delta) {
    console.log("Assistant:", msg.delta);
  }
  // Full user transcript
  if (msg.type === "conversation.item.input_audio_transcription.completed") {
    console.log("You said:", msg.transcript);
  }
};

ws.onerror = (err) => console.error("WebSocket error:", err);`;
}

export function StsExampleCard({ providerId }) {
  const providerAlias = getProviderAlias(providerId);
  const [apiKey, setApiKey] = useState("");
  const [useTunnel, setUseTunnel] = useState(false);
  const [localEndpoint, setLocalEndpoint] = useState("");
  const [tunnelEndpoint, setTunnelEndpoint] = useState("");
  const [model, setModel] = useState("gpt-realtime-2");
  const { copied: copiedCode, copy: copyCode } = useCopyToClipboard();

  useEffect(() => {
    setLocalEndpoint(window.location.origin);
    fetch("/api/keys")
      .then((r) => r.json())
      .then((d) => { setApiKey((d.keys || []).find((k) => k.isActive !== false)?.key || ""); })
      .catch(() => {});
    fetch("/api/tunnel/status")
      .then((r) => r.json())
      .then((d) => { if (d.publicUrl) setTunnelEndpoint(d.publicUrl); })
      .catch(() => {});
  }, []);

  const endpoint = useTunnel ? tunnelEndpoint : localEndpoint;
  const wsProtocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws";
  const host = endpoint ? new URL(endpoint).host : "localhost:20128";
  const wsUrl = endpoint ? `${wsProtocol}://${host}/v1/realtime?provider=${encodeURIComponent(providerId)}&model=${encodeURIComponent(model)}` : "";
  const codeSnippet = endpoint ? getCodeSnippet(endpoint, apiKey, providerId, model) : "";

  return (
    <Card>
      <h2 className="text-lg font-semibold mb-4">Example</h2>

      <div className="flex flex-col gap-2.5">
        {/* Endpoint */}
        <Row label="Endpoint">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <span className="w-full min-w-0 flex-1 px-3 py-1.5 text-sm font-mono text-text-main bg-sidebar truncate">
              {wsUrl || "ws://localhost:20128/v1/realtime"}
            </span>
            {tunnelEndpoint && (
              <button
                onClick={() => setUseTunnel((v) => !v)}
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

        {/* API Key */}
        <Row label="API Key">
          <span className="px-3 py-1.5 text-sm font-mono text-text-main bg-sidebar truncate block">
            {apiKey ? `${apiKey.slice(0, 8)}${"•".repeat(Math.min(20, apiKey.length - 8))}` : <span className="text-text-muted italic">No key configured</span>}
          </span>
        </Row>

        {/* Model selector */}
        <Row label="Model">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-border bg-background focus:outline-none focus:border-primary"
          >
            <option value="gpt-realtime-2">GPT Realtime 2</option>
            <option value="gpt-realtime">GPT Realtime</option>
            <option value="gpt-realtime-mini">GPT Realtime Mini</option>
          </select>
        </Row>

        {/* Instructions */}
        <div className="mt-1">
          <p className="text-xs text-text-muted mb-3">
            Speech to Speech uses WebSockets for real-time voice conversations. Use this JavaScript snippet to connect directly, or try the interactive widget below.
          </p>
        </div>

        {/* Code snippet + Copy */}
        <div className="mt-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1.5">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">JavaScript Example</span>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <button
                onClick={() => copyCode(codeSnippet)}
                className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">{copiedCode ? "check" : "content_copy"}</span>
                {copiedCode ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <pre className="bg-sidebar px-3 py-2.5 text-xs font-mono text-text-main overflow-x-auto whitespace-pre-wrap break-all">{codeSnippet || "Loading..."}</pre>
        </div>
      </div>
    </Card>
  );
}
