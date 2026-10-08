import * as claude from "./claude.js";
import * as codex from "./codex.js";

export const TOOLS = [claude, codex];

export function findTool(id) {
  return TOOLS.find((t) => t.id === id) || null;
}

// --tools claude,codex → those tools; otherwise every tool installed on this machine.
export function selectTools(home, requested) {
  if (requested) {
    const ids = requested.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const unknown = ids.filter((tid) => !findTool(tid));
    if (unknown.length) throw new Error(`Unknown tool(s): ${unknown.join(", ")}. Supported: ${TOOLS.map((t) => t.id).join(", ")}`);
    return ids.map(findTool);
  }
  return TOOLS.filter((t) => t.detect(home));
}
