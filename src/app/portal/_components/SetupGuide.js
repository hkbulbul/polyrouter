"use client";

import { useState } from "react";
import PropTypes from "prop-types";
import { Button, SegmentedControl } from "@/shared/components";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";

// Copy-paste configuration for common tools, filled with the employee's key.
function snippets(baseUrl, apiKey) {
  const v1 = `${baseUrl}/v1`;
  return {
    claude: {
      label: "Claude Code",
      note: "Add to ~/.claude/settings.json (or export the variables in your shell).",
      code: JSON.stringify({ env: { ANTHROPIC_BASE_URL: v1, ANTHROPIC_AUTH_TOKEN: apiKey } }, null, 2),
    },
    codex: {
      label: "Codex",
      note: "Add to ~/.codex/config.toml, then pick a model your admin allows.",
      code: `model_provider = "polyrouter"

[model_providers.polyrouter]
name = "PolyRouter"
base_url = "${v1}"
wire_api = "responses"
requires_openai_auth = false
experimental_bearer_token = "${apiKey}"`,
    },
    openai: {
      label: "OpenAI-compatible",
      note: "Cursor, Cline, Continue, Open WebUI and SDKs: use these as the custom OpenAI base URL and key.",
      code: `Base URL: ${v1}\nAPI key:  ${apiKey}`,
    },
    curl: {
      label: "curl",
      note: "Quick test from a terminal.",
      code: `curl ${v1}/chat/completions \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "<model>", "messages": [{"role": "user", "content": "Hello"}]}'`,
    },
  };
}

export default function SetupGuide({ baseUrl, apiKey }) {
  const [tool, setTool] = useState("claude");
  const { copied, copy } = useCopyToClipboard(1500);
  const all = snippets(baseUrl, apiKey || "<your-api-key>");
  const current = all[tool];

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        size="sm"
        value={tool}
        onChange={setTool}
        options={Object.entries(all).map(([value, s]) => ({ value, label: s.label }))}
        className="self-start max-w-full"
      />
      <p className="text-xs text-text-muted">{current.note}</p>
      <div className="relative">
        <pre className="bg-surface-2 p-3 pr-24 text-xs font-mono whitespace-pre-wrap break-all">{current.code}</pre>
        <Button
          size="sm"
          variant="secondary"
          icon={copied ? "check" : "content_copy"}
          className="absolute top-2 right-2"
          onClick={() => copy(current.code)}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      {!apiKey && <p className="text-xs text-amber-600 dark:text-amber-400">Create an API key first — it will be filled in here.</p>}
    </div>
  );
}

SetupGuide.propTypes = { baseUrl: PropTypes.string.isRequired, apiKey: PropTypes.string };
