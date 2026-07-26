const MAX_EVENT_BYTES = 256 * 1024;

export const REALTIME_PATH = "/v1/realtime";
export const REALTIME_PROTOCOL = "9router.realtime.voice.v1";
// ChatGPT/Codex OAuth accounts use the realtime model exposed by the
// reference OAuth bridge. Keep the public API model names as fallbacks.
export const DEFAULT_REALTIME_MODEL = "gpt-realtime-2";
export const DEFAULT_REALTIME_VOICE = "alloy";
export const DEFAULT_REALTIME_SAMPLE_RATE = 24000;

export const MAX_PENDING_BYTES = 1024 * 1024;
export const MAX_BUFFERED_BYTES = 1024 * 1024;

export const REALTIME_MODELS = new Set(["gpt-realtime-2", "gpt-realtime", "gpt-realtime-mini"]);

const KNOWN_CLIENT_EVENTS = new Set([
  "session.update",
  "conversation.item.create",
  "response.create",
  "response.cancel",
  "input_audio_buffer.append",
  "input_audio_buffer.commit",
  "input_audio_buffer.clear",
  "conversation.item.delete",
]);

export function safeJsonSize(value) {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export function isSupportedClientEvent(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof value.type === "string" &&
      KNOWN_CLIENT_EVENTS.has(value.type)
  );
}

export function validateClientEvent(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, message: "Realtime events must be JSON objects." };
  }
  if (typeof value.type !== "string" || !value.type) {
    return { ok: false, message: "Realtime events must include a type." };
  }
  if (!KNOWN_CLIENT_EVENTS.has(value.type)) {
    return { ok: false, message: `Unsupported realtime event: ${value.type}` };
  }
  if (value.type === "session.update" && (!value.session || typeof value.session !== "object" || Array.isArray(value.session))) {
    return { ok: false, message: "session.update events must include a session object." };
  }
  if (value.type === "input_audio_buffer.append" && (typeof value.audio !== "string" || !value.audio)) {
    return { ok: false, message: "Audio append events must include base64 audio." };
  }
  if (safeJsonSize(value) > MAX_EVENT_BYTES) {
    return { ok: false, message: "Realtime event exceeds the maximum size." };
  }
  return { ok: true, event: value };
}

export function makeError(code, message) {
  return {
    type: "error",
    error: { code, message },
  };
}

export function buildInitialSession({ model, voice } = {}) {
  return {
    type: "session.update",
    session: {
      type: "realtime",
      output_modalities: ["audio"],
      model: model || DEFAULT_REALTIME_MODEL,
      audio: {
        input: {
          format: { type: "audio/pcm", rate: DEFAULT_REALTIME_SAMPLE_RATE },
          turn_detection: {
            type: "server_vad",
            create_response: true,
            interrupt_response: true,
          },
        },
        output: {
          format: { type: "audio/pcm", rate: DEFAULT_REALTIME_SAMPLE_RATE },
          voice: voice || DEFAULT_REALTIME_VOICE,
        },
      },
    },
  };
}
