"use client";

import { useState } from "react";
import PropTypes from "prop-types";
import Link from "next/link";
import { Card, Button } from "@/shared/components";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import { OptionSelect } from "@/shared/components/office/fields";
import { usePortal } from "../../_components/PortalContext";
import SetupGuide from "../../_components/SetupGuide";

function CopyField({ label, value }) {
  const { copied, copy } = useCopyToClipboard(1500);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="eyebrow">{label}</span>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate border border-border-subtle bg-bg px-3 py-2 font-mono text-sm text-text-main">{value}</code>
        <Button size="sm" variant="secondary" icon={copied ? "check" : "content_copy"} onClick={() => copy(value)}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

CopyField.propTypes = { label: PropTypes.string, value: PropTypes.string };

export default function PortalSetupPage() {
  const { me } = usePortal();
  // Only rendered client-side after the portal data loaded, so window exists.
  const baseUrl = me.office.publicUrl || window.location.origin;
  const usable = me.keys.filter((k) => !k.expired);
  const [keyId, setKeyId] = useState(() => (usable.find((k) => !k.deviceId) || usable[0])?.id || "");
  const selected = usable.find((k) => k.id === keyId) || null;

  return (
    <div className="flex flex-col gap-6">
      <Card title="Connection details" icon="hub" subtitle="Use these in any OpenAI- or Anthropic-compatible tool.">
        <div className="grid gap-4 md:grid-cols-2">
          <CopyField label="OpenAI-compatible base URL" value={`${baseUrl}/v1`} />
          <CopyField label="Server" value={baseUrl} />
        </div>
      </Card>

      <Card
        title="Tool settings"
        icon="build"
        subtitle="Ready-made configuration, filled in with the key you pick."
        action={
          usable.length > 0 ? (
            <OptionSelect
              value={keyId}
              onChange={setKeyId}
              options={usable.map((k) => ({ value: k.id, label: k.name }))}
              className="w-48"
            />
          ) : null
        }
      >
        {usable.length === 0 && (
          <div className="mb-4 flex items-center justify-between gap-3 border border-amber-500/30 bg-amber-500/[0.06] p-3">
            <p className="text-sm text-text-main">You need an API key first.</p>
            <Link href="/portal/keys">
              <Button size="sm" icon="key">Create key</Button>
            </Link>
          </div>
        )}
        <SetupGuide baseUrl={baseUrl} apiKey={selected?.key} />
      </Card>

      <Card
        id="client"
        title="PolyRouter client"
        icon="terminal"
        subtitle={me.office.allowClientLogin ? "Optional — configures your tools automatically and can undo it." : "Your admin has turned off the client."}
      >
        {me.office.allowClientLogin ? (
          <div className="flex flex-col gap-4">
            <CopyField label="Run on your computer (Node.js 18+)" value={`npx polyrouter-client connect ${baseUrl}`} />
            <ul className="grid gap-2 text-sm text-text-muted sm:grid-cols-2">
              <li className="flex gap-2"><span className="material-symbols-outlined text-[18px] text-primary">login</span>Sign in with {me.user.email} and your password</li>
              <li className="flex gap-2"><span className="material-symbols-outlined text-[18px] text-primary">tune</span>Configures Claude Code and Codex automatically</li>
              <li className="flex gap-2"><span className="material-symbols-outlined text-[18px] text-primary">speed</span><code className="font-mono text-xs leading-5">polyrouter-client status</code> shows your limits</li>
              <li className="flex gap-2"><span className="material-symbols-outlined text-[18px] text-primary">undo</span><code className="font-mono text-xs leading-5">polyrouter-client disconnect</code> restores your configs</li>
            </ul>
          </div>
        ) : (
          <p className="text-sm text-text-muted">Use the tool settings above instead.</p>
        )}
      </Card>
    </div>
  );
}
