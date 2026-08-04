export const REALTIME_MODEL_OPTIONS = [
  { id: "gpt-realtime-2", name: "GPT Realtime 2" },
  { id: "gpt-realtime", name: "GPT Realtime" },
  { id: "gpt-realtime-mini", name: "GPT Realtime Mini" },
];

export const DEFAULT_REALTIME_MODEL = REALTIME_MODEL_OPTIONS[0].id;
export const DEFAULT_REALTIME_VOICE = "alloy";
export const DEFAULT_REALTIME_SAMPLE_RATE = 24000;
export const REALTIME_MODELS = new Set(REALTIME_MODEL_OPTIONS.map((model) => model.id));
