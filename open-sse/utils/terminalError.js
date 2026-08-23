// Terminal SSE error frames for streams that die after headers were sent.
//
// Until now, an upstream that vanished mid-stream was handled by closing the
// client's stream with zero extra bytes (streamHandler.js emitTerminal was a
// no-op unless an onAbortTerminal was supplied, and only OpenAI-Responses
// passthrough ever supplied one). A truncated answer is indistinguishable from a
// short answer, so the client never knew anything had failed and never retried.
//
// These builders close that gap: whatever the client asked for, it gets a frame
// it can actually recognize as an error.
import { FORMATS } from "../translator/formats.js";
import { formatSSE } from "./streamHelpers.js";
import { buildErrorBody } from "./error.js";
import { HTTP_STATUS } from "../config/runtimeConfig.js";
import { buildAbortedResponsesTerminalBytes } from "./responsesStreamHelpers.js";

const sharedEncoder = new TextEncoder();

// Gemini-family clients reject the `data: [DONE]` sentinel with a 400 syntax
// error — same constraint the passthrough path documents in utils/stream.js.
const NO_DONE_SENTINEL = new Set([
  FORMATS.GEMINI,
  FORMATS.GEMINI_CLI,
  FORMATS.VERTEX,
  FORMATS.ANTIGRAVITY,
  // Claude signals termination with its own `event:` frames, not a sentinel.
  FORMATS.CLAUDE,
]);

const DONE_FRAME = formatSSE({ done: true });

/**
 * Build the SSE text announcing a mid-stream failure to a client of `sourceFormat`.
 * Exported separately from the byte builder so it can be asserted on directly.
 */
export function formatTerminalErrorFrame(sourceFormat, message) {
  const body = buildErrorBody(HTTP_STATUS.BAD_GATEWAY, message);

  // Anthropic's documented mid-stream failure shape: `event: error` carrying
  // {type:"error", error:{...}}. formatSSE derives the event name from `type`.
  const payload = sourceFormat === FORMATS.CLAUDE
    ? { type: "error", error: body.error }
    : body;

  const frame = formatSSE(payload, sourceFormat);
  return NO_DONE_SENTINEL.has(sourceFormat) ? frame : `${frame}${DONE_FRAME}`;
}

/**
 * Returns the zero-arg closure streamHandler's `onAbortTerminal` hook expects,
 * or null when there is nothing useful to emit.
 */
export function buildTerminalErrorBytes(sourceFormat, message = "upstream stream ended unexpectedly") {
  // Responses passthrough already has a richer terminal (response.failed) that
  // clients key on; don't second-guess it.
  if (sourceFormat === FORMATS.OPENAI_RESPONSES) return buildAbortedResponsesTerminalBytes;

  return () => sharedEncoder.encode(formatTerminalErrorFrame(sourceFormat, message));
}
