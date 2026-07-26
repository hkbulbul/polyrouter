"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SAMPLE_RATE = 24000;
const PROCESSOR_BUFFER_SIZE = 4096;
const REALTIME_MODELS = [
  { id: "gpt-realtime-2", name: "GPT Realtime 2" },
  { id: "gpt-realtime", name: "GPT Realtime" },
  { id: "gpt-realtime-mini", name: "GPT Realtime Mini" },
];

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

export function float32ToPcm16(samples) {
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return new Uint8Array(pcm.buffer);
}

function pcm16ToAudioBuffer(context, base64) {
  const bytes = base64ToBytes(base64);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const audio = context.createBuffer(1, Math.floor(bytes.byteLength / 2), SAMPLE_RATE);
  const channel = audio.getChannelData(0);
  for (let i = 0; i < channel.length; i += 1) channel[i] = view.getInt16(i * 2, true) / 0x8000;
  return audio;
}

export default function RealtimePageClient({ providerId = "codex", providerName }) {
  const socketRef = useRef(null);
  const streamRef = useRef(null);
  const contextRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);
  const nextPlaybackTime = useRef(0);
  const outputSources = useRef(new Set());
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [inputTranscript, setInputTranscript] = useState("");
  const [outputTranscript, setOutputTranscript] = useState("");
  const [model, setModel] = useState("gpt-realtime-2");

  const stopPlayback = useCallback(() => {
    for (const source of outputSources.current) {
      try { source.stop(); } catch {}
    }
    outputSources.current.clear();
    nextPlaybackTime.current = 0;
  }, []);

  const stop = useCallback(() => {
    setIsRecording(false);
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    processorRef.current = null;
    sourceRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (socketRef.current && socketRef.current.readyState < WebSocket.CLOSING) socketRef.current.close();
    socketRef.current = null;
    stopPlayback();
    setStatus("Stopped");
  }, [stopPlayback]);

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
    if (isRecording) return;
    setError("");
    setInputTranscript("");
    setOutputTranscript("");
    setStatus("Requesting microphone permission…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const context = contextRef.current || new AudioContextClass({ sampleRate: SAMPLE_RATE });
      contextRef.current = context;
      await context.resume();
      streamRef.current = stream;

      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const socket = new WebSocket(`${protocol}://${window.location.host}/v1/realtime?provider=${encodeURIComponent(providerId)}&model=${encodeURIComponent(model)}`);
      socketRef.current = socket;
      socket.onopen = () => {
        if (socketRef.current !== socket) return;
        const source = context.createMediaStreamSource(stream);
        const processor = context.createScriptProcessor(PROCESSOR_BUFFER_SIZE, 1, 1);
        source.connect(processor);
        processor.connect(context.destination);
        processor.onaudioprocess = (event) => {
          if (socket.readyState !== WebSocket.OPEN) return;
          const pcm = float32ToPcm16(event.inputBuffer.getChannelData(0));
          socket.send(JSON.stringify({ type: "input_audio_buffer.append", audio: bytesToBase64(pcm) }));
        };
        sourceRef.current = source;
        processorRef.current = processor;
        setIsRecording(true);
        setStatus("Listening");
      };
      socket.onmessage = ({ data }) => {
        let event;
        try { event = JSON.parse(data); } catch { return; }
        if ((event.type === "response.output_audio.delta" || event.type === "response.audio.delta") && event.delta) scheduleAudio(event.delta);
        if ((event.type === "response.output_audio_transcript.delta" || event.type === "response.audio_transcript.delta") && event.delta) setOutputTranscript((text) => text + event.delta);
        if (event.type === "conversation.item.input_audio_transcription.completed" && event.transcript) setInputTranscript(event.transcript);
        if (event.type === "input_audio_buffer.speech_started") {
          stopPlayback();
          setStatus("Listening");
        }
        if (event.type === "response.audio.done" || event.type === "response.done") setStatus("Listening");
        if (event.type === "error") setError(event.error?.message || "Realtime connection failed.");
      };
      socket.onerror = () => setError("Unable to connect to the local realtime service.");
      socket.onclose = () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
          setIsRecording(false);
          setStatus("Disconnected");
        }
      };
    } catch (reason) {
      setError(reason?.name === "NotAllowedError" ? "Microphone permission was denied." : (reason?.message || "Could not start the microphone."));
      stop();
    }
  }, [isRecording, model, providerId, scheduleAudio, stop, stopPlayback]);

  useEffect(() => () => {
    stop();
    contextRef.current?.close().catch(() => {});
  }, [stop]);

  const cancelResponse = () => {
    socketRef.current?.send(JSON.stringify({ type: "response.cancel" }));
    stopPlayback();
  };

  return (
    <section className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-main">Speech to Speech</h1>
        <p className="mt-1 text-sm text-text-muted">Talk naturally using your connected {providerName || "OpenAI"} account. Audio stays between this browser, your local 9Router, and the realtime provider.</p>
      </div>
      <div className="border border-border-subtle bg-surface p-6 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div><p className="font-medium text-text-main">{status}</p>{error && <p role="alert" className="mt-1 text-sm text-red-500">{error}</p>}</div>
          <div className="flex gap-2">
            <select
              value={model}
              onChange={(event) => setModel(event.target.value)}
              disabled={isRecording}
              className="px-3 py-2 text-sm border border-border-subtle bg-background text-text-main"
              aria-label="Realtime model"
            >
              {REALTIME_MODELS.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
            {isRecording && <button type="button" onClick={cancelResponse} className="px-4 py-2 text-sm border border-border-subtle hover:bg-surface-2">Interrupt</button>}
            <button type="button" onClick={isRecording ? stop : start} className="px-4 py-2 text-sm font-medium bg-primary text-white hover:opacity-90">{isRecording ? "Stop" : "Start talking"}</button>
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
