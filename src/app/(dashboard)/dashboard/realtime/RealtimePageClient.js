"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { float32ToPcm16Bytes, resampleFloat32 } from "@/realtime/audio.js";
import { releaseRealtimeMediaResources } from "@/realtime/browserMedia.js";
import {
  DEFAULT_REALTIME_MODEL,
  DEFAULT_REALTIME_SAMPLE_RATE,
  REALTIME_MODEL_OPTIONS,
} from "@/realtime/constants.js";

const PROCESSOR_BUFFER_SIZE = 4096;
const AUDIO_WORKLET_URL = "/realtime-audio-processor.js";

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export const float32ToPcm16 = float32ToPcm16Bytes;

function pcm16ToAudioBuffer(context, base64) {
  const bytes = base64ToBytes(base64);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const audio = context.createBuffer(1, Math.floor(bytes.byteLength / 2), DEFAULT_REALTIME_SAMPLE_RATE);
  const channel = audio.getChannelData(0);
  for (let i = 0; i < channel.length; i += 1) channel[i] = view.getInt16(i * 2, true) / 0x8000;
  return audio;
}

export default function RealtimePageClient({ providerId = "codex", providerName }) {
  const socketRef = useRef(null);
  const streamRef = useRef(null);
  const contextRef = useRef(null);
  const captureNodeRef = useRef(null);
  const sourceRef = useRef(null);
  const monitorGainRef = useRef(null);
  const nextPlaybackTime = useRef(0);
  const outputSources = useRef(new Set());
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [inputTranscript, setInputTranscript] = useState("");
  const [outputTranscript, setOutputTranscript] = useState("");
  const [model, setModel] = useState(DEFAULT_REALTIME_MODEL);

  const stopPlayback = useCallback(() => {
    for (const source of outputSources.current) {
      try { source.stop(); } catch {}
    }
    outputSources.current.clear();
    nextPlaybackTime.current = 0;
  }, []);

  const releaseMedia = useCallback(({ closeSocket = true } = {}) => {
    releaseRealtimeMediaResources({
      captureNode: captureNodeRef.current,
      source: sourceRef.current,
      monitorGain: monitorGainRef.current,
      stream: streamRef.current,
    });
    captureNodeRef.current = null;
    sourceRef.current = null;
    monitorGainRef.current = null;
    streamRef.current = null;
    if (closeSocket) {
      if (socketRef.current && socketRef.current.readyState < WebSocket.CLOSING) socketRef.current.close();
      socketRef.current = null;
    }
    stopPlayback();
  }, [stopPlayback]);

  const stop = useCallback(() => {
    releaseMedia();
    setIsConnecting(false);
    setIsRecording(false);
    setStatus("Stopped");
  }, [releaseMedia]);

  const scheduleAudio = useCallback((base64) => {
    const context = contextRef.current;
    if (!context || !base64) return;
    const source = context.createBufferSource();
    source.buffer = pcm16ToAudioBuffer(context, base64);
    source.connect(context.destination);
    const startAt = Math.max(context.currentTime, nextPlaybackTime.current);
    source.start(startAt);
    nextPlaybackTime.current = startAt + source.buffer.duration;
    outputSources.current.add(source);
    source.onended = () => outputSources.current.delete(source);
  }, []);

  const start = useCallback(async () => {
    if (isRecording || isConnecting) return;
    setIsConnecting(true);
    setError("");
    setInputTranscript("");
    setOutputTranscript("");
    setStatus("Requesting microphone permission…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const context = contextRef.current || new AudioContextClass({ sampleRate: DEFAULT_REALTIME_SAMPLE_RATE });
      contextRef.current = context;
      await context.resume();
      streamRef.current = stream;

      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const socket = new WebSocket(`${protocol}://${window.location.host}/v1/realtime?provider=${encodeURIComponent(providerId)}&model=${encodeURIComponent(model)}`);
      socketRef.current = socket;
      socket.onopen = () => {
        if (socketRef.current !== socket) return;
        const source = context.createMediaStreamSource(stream);
        const sendSamples = (samples) => {
          if (socket.readyState !== WebSocket.OPEN) return;
          const resampled = resampleFloat32(samples, context.sampleRate, DEFAULT_REALTIME_SAMPLE_RATE);
          const pcm = float32ToPcm16Bytes(resampled);
          socket.send(JSON.stringify({ type: "input_audio_buffer.append", audio: bytesToBase64(pcm) }));
        };
        sourceRef.current = source;

        const attachFallbackProcessor = () => {
          const processor = context.createScriptProcessor(PROCESSOR_BUFFER_SIZE, 1, 1);
          const monitorGain = context.createGain();
          monitorGain.gain.value = 0;
          processor.onaudioprocess = (event) => sendSamples(event.inputBuffer.getChannelData(0));
          source.connect(processor);
          processor.connect(monitorGain);
          monitorGain.connect(context.destination);
          captureNodeRef.current = processor;
          monitorGainRef.current = monitorGain;
        };

        void (async () => {
          try {
            if (!context.audioWorklet || typeof window.AudioWorkletNode !== "function") throw new Error("AudioWorklet unavailable");
            await context.audioWorklet.addModule(AUDIO_WORKLET_URL);
            if (socketRef.current !== socket || socket.readyState !== WebSocket.OPEN) return;
            const worklet = new window.AudioWorkletNode(context, "polyrouter-realtime-capture", {
              numberOfInputs: 1,
              numberOfOutputs: 0,
              channelCount: 1,
            });
            worklet.port.onmessage = (event) => sendSamples(event.data);
            source.connect(worklet);
            captureNodeRef.current = worklet;
          } catch {
            if (socketRef.current === socket && socket.readyState === WebSocket.OPEN) attachFallbackProcessor();
          }
        })();
        setIsConnecting(false);
        setIsRecording(true);
        setStatus("Listening");
      };
      socket.onmessage = ({ data }) => {
        let event;
        try { event = JSON.parse(data); } catch { return; }
        if ((event.type === "response.output_audio.delta" || event.type === "response.audio.delta") && event.delta) {
          scheduleAudio(event.delta);
          setStatus("Speaking");
        }
        if ((event.type === "response.output_audio_transcript.delta" || event.type === "response.audio_transcript.delta") && event.delta) setOutputTranscript((text) => text + event.delta);
        if (event.type === "conversation.item.input_audio_transcription.completed" && event.transcript) setInputTranscript(event.transcript);
        if (event.type === "input_audio_buffer.speech_started") {
          stopPlayback();
          setStatus("Listening");
        }
        if (event.type === "response.audio.done" || event.type === "response.done") setStatus("Listening");
        if (event.type === "error") setError(event.error?.message || "Realtime connection failed.");
      };
      socket.onerror = () => {
        if (socketRef.current !== socket) return;
        setError("Unable to connect to the local realtime service.");
        releaseMedia();
        setIsConnecting(false);
        setIsRecording(false);
        setStatus("Disconnected");
      };
      socket.onclose = () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
          releaseMedia({ closeSocket: false });
          setIsConnecting(false);
          setIsRecording(false);
          setStatus("Disconnected");
        }
      };
    } catch (reason) {
      setError(reason?.name === "NotAllowedError" ? "Microphone permission was denied." : (reason?.message || "Could not start the microphone."));
      stop();
    }
  }, [isConnecting, isRecording, model, providerId, releaseMedia, scheduleAudio, stop, stopPlayback]);

  useEffect(() => () => {
    releaseMedia();
    contextRef.current?.close().catch(() => {});
  }, [releaseMedia]);

  const cancelResponse = () => {
    socketRef.current?.send(JSON.stringify({ type: "response.cancel" }));
    stopPlayback();
  };

  return (
    <section className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-main">Speech to Speech</h1>
        <p className="mt-1 text-sm text-text-muted">Talk naturally using your connected {providerName || "OpenAI"} account. Audio stays between this browser, your local PolyRouter, and the realtime provider.</p>
      </div>
      <div className="border border-border-subtle bg-surface p-6 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div><p className="font-medium text-text-main">{status}</p>{error && <p role="alert" className="mt-1 text-sm text-red-500">{error}</p>}</div>
          <div className="flex gap-2">
            <select
              value={model}
              onChange={(event) => setModel(event.target.value)}
              disabled={isRecording || isConnecting}
              className="px-3 py-2 text-sm border border-border-subtle bg-background text-text-main"
              aria-label="Realtime model"
            >
              {REALTIME_MODEL_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
            {isRecording && <button type="button" onClick={cancelResponse} className="px-4 py-2 text-sm border border-border-subtle hover:bg-surface-2">Interrupt</button>}
            <button
              type="button"
              onClick={isRecording ? stop : start}
              disabled={isConnecting}
              className="px-4 py-2 text-sm font-medium bg-primary text-white hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
              {isRecording ? "Stop" : isConnecting ? "Connecting..." : "Start talking"}
            </button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Transcript title="You said" text={inputTranscript} empty="Your speech transcript will appear here." />
          <Transcript title="Assistant" text={outputTranscript} empty="The assistant’s response will appear here." />
        </div>
      </div>
    </section>
  );
}

function Transcript({ title, text, empty }) {
  return <div className="min-h-32 border border-border-subtle bg-bg p-4"><h2 className="text-sm font-medium text-text-main">{title}</h2><p className="mt-2 text-sm text-text-muted whitespace-pre-wrap">{text || empty}</p></div>;
}
