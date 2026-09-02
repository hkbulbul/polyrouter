"use client";

import { useParams, notFound, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, Badge, Button, Toggle, AddCustomEmbeddingModal } from "@/shared/components";
import ProviderIcon from "@/shared/components/ProviderIcon";
import { MEDIA_PROVIDER_KINDS, AI_PROVIDERS, getProvidersByKind } from "@/shared/constants/providers";

// Kinds that support combos (currently disabled for image/tts — temporarily hidden).
// webSearch/webFetch handled by /web page.
const COMBO_KINDS = new Set([]);
const COMBO_BASE_NAMES = { image: "image-combo", tts: "tts-combo" };

function getEffectiveStatus(conn) {
  const isCooldown = Object.entries(conn).some(
    ([k, v]) => k.startsWith("modelLock_") && v && new Date(v).getTime() > Date.now()
  );
  return conn.testStatus === "unavailable" && !isCooldown ? "active" : conn.testStatus;
}

function MediaProviderCard({ provider, kind, connections, isCustom, onToggle, sponsor = null }) {
  const providerInfo = AI_PROVIDERS[provider.id];
  const isNoAuth = !!providerInfo?.noAuth;

  const connectionProviderId = kind === "speechToSpeech" && provider.id === "openai" ? "codex" : provider.id;
  const providerConns = connections.filter((c) => c.provider === connectionProviderId);
  const connected = providerConns.filter((c) => { const s = getEffectiveStatus(c); return s === "active" || s === "success"; }).length;
  const error = providerConns.filter((c) => { const s = getEffectiveStatus(c); return s === "error" || s === "expired" || s === "unavailable"; }).length;
  const total = providerConns.length;
  const allDisabled = total > 0 && providerConns.every((c) => c.isActive === false);

  const handleToggleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggle) onToggle(connectionProviderId, allDisabled);
  };

  const renderStatus = () => {
    if (isNoAuth) return <Badge variant="success" size="sm">Ready</Badge>;
    if (allDisabled) return <Badge variant="default" size="sm">Disabled</Badge>;
    if (total === 0) return <span className="text-xs text-text-muted">No connections</span>;
    return (
      <>
        {connected > 0 && <Badge variant="success" size="sm" dot>{connected} Connected</Badge>}
        {error > 0 && <Badge variant="error" size="sm" dot>{error} Error</Badge>}
        {connected === 0 && error === 0 && <Badge variant="default" size="sm">{total} Added</Badge>}
      </>
    );
  };

  return (
    <Link href={`/dashboard/media-providers/${kind}/${provider.id}`} className="group">
      <Card
        padding="xs"
        className={`relative h-full hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors cursor-pointer ${allDisabled ? "opacity-50" : ""}`}
      >
        {sponsor ? (
          sponsor.href ? (
            <a
              href={sponsor.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="absolute -top-2.5 right-3 z-10 inline-flex h-[18px] items-center gap-1.5 bg-amber-400 pl-3 pr-2 text-[9px] font-bold uppercase leading-none text-amber-950 shadow-[0_2px_5px_rgba(245,158,11,0.22)] [clip-path:polygon(8px_0,100%_0,100%_100%,0_100%)] hover:bg-amber-300"
              title={sponsor.badgeSublabel ? `${sponsor.badgeLabel}: ${sponsor.badgeSublabel}` : sponsor.badgeLabel}
            >
              <span className="tracking-[0.14em]">{sponsor.badgeLabel}</span>
              {sponsor.badgeSublabel ? (
                <>
                  <span aria-hidden="true" className="h-2.5 w-px bg-amber-800/35" />
                  <span className="font-black tracking-wide">{sponsor.badgeSublabel}</span>
                </>
              ) : null}
            </a>
          ) : (
            <span
              className="pointer-events-none absolute -top-2.5 right-3 z-10 inline-flex h-[18px] items-center gap-1.5 bg-amber-400 pl-3 pr-2 text-[9px] font-bold uppercase leading-none text-amber-950 shadow-[0_2px_5px_rgba(245,158,11,0.22)] [clip-path:polygon(8px_0,100%_0,100%_100%,0_100%)]"
              title={sponsor.badgeSublabel ? `${sponsor.badgeLabel}: ${sponsor.badgeSublabel}` : sponsor.badgeLabel}
            >
              <span className="tracking-[0.14em]">{sponsor.badgeLabel}</span>
              {sponsor.badgeSublabel ? (
                <>
                  <span aria-hidden="true" className="h-2.5 w-px bg-amber-800/35" />
                  <span className="font-black tracking-wide">{sponsor.badgeSublabel}</span>
                </>
              ) : null}
            </span>
          )
        ) : null}
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="size-8  flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${provider.color?.length > 7 ? provider.color : (provider.color ?? "#888") + "15"}` }}
            >
              <ProviderIcon
                src={`/providers/${provider.id}.png`}
                alt={provider.name}
                size={30}
                className="object-contain  max-w-[30px] max-h-[30px]"
                fallbackText={provider.textIcon || provider.id.slice(0, 2).toUpperCase()}
                fallbackColor={provider.color}
              />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm">{provider.name}</h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {isCustom && <Badge variant="default" size="sm">Custom</Badge>}
                {renderStatus()}
              </div>
            </div>
          </div>
          {total > 0 && (
            <div
              className="shrink-0 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
              onClick={handleToggleClick}
            >
              <Toggle
                size="sm"
                checked={!allDisabled}
                onChange={() => {}}
                title={allDisabled ? "Enable provider" : "Disable provider"}
              />
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}

function ComboList({ combos }) {
  if (combos.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {combos.map((combo) => (
        <Link key={combo.id} href={`/dashboard/media-providers/combo/${combo.id}`}>
          <Card padding="xs" className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer">
            <div className="flex min-w-0 items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[18px]">layers</span>
              <code className="text-sm font-mono font-medium flex-1 truncate">{combo.name}</code>
              <div className="flex flex-wrap items-center gap-1 sm:shrink-0">
                {combo.models.slice(0, 6).map((entry, i) => {
                  const pid = typeof entry === "string" ? entry.split("/")[0] : "";
                  const p = AI_PROVIDERS[pid];
                  return (
                    <div key={`${entry}-${i}`} title={p?.name || entry} className="size-5  flex items-center justify-center" style={{ backgroundColor: `${(p?.color ?? "#888")}15` }}>
                      <ProviderIcon
                        src={`/providers/${pid}.png`}
                        alt={p?.name || pid}
                        size={18}
                        className="object-contain  max-w-[18px] max-h-[18px]"
                        fallbackText={p?.textIcon || pid.slice(0, 2).toUpperCase()}
                        fallbackColor={p?.color}
                      />
                    </div>
                  );
                })}
                {combo.models.length > 6 && (
                  <span className="text-[10px] text-text-muted ml-1">+{combo.models.length - 6}</span>
                )}
              </div>
              <span className="text-[11px] text-text-muted shrink-0">{combo.models.length}</span>
              <span className="material-symbols-outlined text-text-muted text-[16px]">chevron_right</span>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default function MediaProviderKindPage() {
  const { kind: requestedKind } = useParams();
  const router = useRouter();
  const [connections, setConnections] = useState([]);
  const [customNodes, setCustomNodes] = useState([]);
  const [combos, setCombos] = useState([]);
  const [sponsorsMap, setSponsorsMap] = useState(null);
  const [showAddCustomEmbedding, setShowAddCustomEmbedding] = useState(false);

  // webSearch/webFetch listing pages are merged into /web
  useEffect(() => {
    if (requestedKind === "webSearch" || requestedKind === "webFetch") {
      router.replace("/dashboard/media-providers/web");
    }
  }, [requestedKind, router]);

  const kindConfig = MEDIA_PROVIDER_KINDS.find((k) => k.id === requestedKind || k.id.toLowerCase() === String(requestedKind || "").toLowerCase());
  const kind = kindConfig?.id || requestedKind;
  const isEmbedding = kind === "embedding";
  const supportsCombo = COMBO_KINDS.has(kind);

  useEffect(() => {
    if (!kindConfig) return;
    fetch("/api/providers", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setConnections(d.connections || []))
      .catch(() => {});
    fetch(`/api/sponsors?kind=${encodeURIComponent(kind)}&refresh=1`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const m = new Map();
        for (const s of d.sponsors || []) m.set(String(s.providerId).toLowerCase(), s);
        setSponsorsMap(m);
      })
      .catch(() => {});
    if (isEmbedding) {
      fetch("/api/provider-nodes", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => setCustomNodes((d.nodes || []).filter((n) => n.type === "custom-embedding")))
        .catch(() => {});
    }
    if (supportsCombo) {
      fetch("/api/combos", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => setCombos(d.combos || []))
        .catch(() => {});
    }
  }, [isEmbedding, supportsCombo, kindConfig, kind]);

  if (!kindConfig) return notFound();

  const providers = getProvidersByKind(kind);
  const kindCombos = combos.filter((c) => c.kind === kind);

  // Map custom nodes to MediaProviderCard shape
  const customProviders = customNodes.map((n) => ({
    id: n.id,
    name: n.name || "Custom Embedding",
    color: "#6366F1",
    textIcon: "CE",
  }));

  const getSponsorPos = (id) => sponsorsMap?.get(String(id).toLowerCase())?.position ?? 9999;
  const sortedProviders = [...providers].sort((a, b) => {
    const pa = getSponsorPos(a.id), pb = getSponsorPos(b.id);
    const sa = pa !== 9999, sb = pb !== 9999;
    if (sa !== sb) return sa ? -1 : 1;
    if (sa && pa !== pb) return pa - pb;
    return (a.name || "").localeCompare(b.name || "");
  });
  const sortedCustomProviders = [...customProviders].sort((a, b) => {
    const pa = getSponsorPos(a.id), pb = getSponsorPos(b.id);
    const sa = pa !== 9999, sb = pb !== 9999;
    if (sa !== sb) return sa ? -1 : 1;
    if (sa && pa !== pb) return pa - pb;
    return (a.name || "").localeCompare(b.name || "");
  });
  const allProviders = [...sortedProviders, ...sortedCustomProviders];

  const handleToggleProvider = async (providerId, newActive) => {
    const providerConns = connections.filter((c) => c.provider === providerId);
    setConnections((prev) =>
      prev.map((c) => (c.provider === providerId ? { ...c, isActive: newActive } : c))
    );
    await Promise.allSettled(
      providerConns.map((c) =>
        fetch(`/api/providers/${c.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: newActive }),
        })
      )
    );
  };

  const handleCreateCombo = async () => {
    const base = COMBO_BASE_NAMES[kind] || `${kind}-combo`;
    let name = base;
    let i = 1;
    const existing = new Set(combos.map((c) => c.name));
    while (existing.has(name)) { name = `${base}-${i++}`; }
    const res = await fetch("/api/combos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, models: [], kind }),
    });
    if (res.ok) {
      const created = await res.json();
      router.push(`/dashboard/media-providers/combo/${created.id}`);
    } else {
      const err = await res.json();
      alert(err.error || "Failed to create combo");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {(isEmbedding || supportsCombo) && (
        <div className="flex items-center justify-end gap-2">
          {supportsCombo && (
            <Button size="sm" icon="add" onClick={handleCreateCombo}>Create Combo</Button>
          )}
          {isEmbedding && (
            <Button size="sm" icon="add" onClick={() => setShowAddCustomEmbedding(true)}>
              Add Custom Embedding
            </Button>
          )}
        </div>
      )}

      {supportsCombo && kindCombos.length > 0 && (
        <ComboList combos={kindCombos} />
      )}

      {allProviders.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border  text-text-muted text-sm">
          No providers support <strong>{kindConfig.label}</strong> yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedProviders.map((provider) => (
            <MediaProviderCard
              key={provider.id}
              provider={provider}
              kind={kind}
              connections={connections}
              onToggle={handleToggleProvider}
              sponsor={sponsorsMap?.get(String(provider.id).toLowerCase()) || null}
            />
          ))}
          {sortedCustomProviders.map((provider) => (
            <MediaProviderCard
              key={provider.id}
              provider={provider}
              kind={kind}
              connections={connections}
              isCustom
              onToggle={handleToggleProvider}
              sponsor={sponsorsMap?.get(String(provider.id).toLowerCase()) || null}
            />
          ))}
        </div>
      )}

      {isEmbedding && (
        <AddCustomEmbeddingModal
          isOpen={showAddCustomEmbedding}
          onClose={() => setShowAddCustomEmbedding(false)}
          onCreated={(node) => {
            setCustomNodes((prev) => [...prev, node]);
            setShowAddCustomEmbedding(false);
          }}
        />
      )}
    </div>
  );
}
