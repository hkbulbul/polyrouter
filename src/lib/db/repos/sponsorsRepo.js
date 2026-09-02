import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";
import { makeKv } from "../helpers/kvStore.js";

// kv scope "sponsors": key=`${kind}:${providerId}` (new) or legacy `${providerId}` (llm)
// + special key "__config:${kind}" -> {enabled, maxVisible}
// Supports kind=llm|embedding|... so LLM + Embedding (and future kinds) are independently controlled remotely.

const sponsorsKv = makeKv("sponsors");

const VALID_KINDS = new Set(["llm", "embedding", "image", "tts", "stt", "video", "search", "fetch", "music"]);
const DEFAULT_KIND = "llm";
const DEFAULT_CONFIG = { enabled: true, maxVisible: 3 };

function sanitizeKind(kind) {
  const k = String(kind || DEFAULT_KIND).trim().toLowerCase();
  return VALID_KINDS.has(k) ? k : DEFAULT_KIND;
}

function configKey(kind) { return `__config:${sanitizeKind(kind)}`; }
function sponsorKey(kind, providerId) {
  const k = sanitizeKind(kind);
  const id = String(providerId || "").trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-|-$/g, "");
  return `${k}:${id}`;
}

function sanitizeSponsor(raw, kindHint = DEFAULT_KIND) {
  if (!raw || typeof raw !== "object") return null;
  const providerId = String(raw.providerId || raw.id || "").trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-|-$/g, "");
  if (!providerId) return null;
  const kind = sanitizeKind(raw.kind ?? kindHint);
  const position = Number.isFinite(Number(raw.position)) ? Math.max(0, Math.min(999, Number(raw.position) | 0)) : 999;
  const badgeLabel = String(raw.badgeLabel ?? "Sponsored").trim().slice(0, 32) || "Sponsored";
  const badgeSublabel = String(raw.badgeSublabel ?? "").trim().slice(0, 32);
  const href = String(raw.href ?? "").trim().slice(0, 512);
  const safeHref = /^https?:\/\//i.test(href) ? href : "";
  return {
    providerId,
    kind,
    isActive: raw.isActive !== false,
    position,
    badgeLabel,
    badgeSublabel,
    href: safeHref,
  };
}

function sanitizeConfig(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_CONFIG };
  return {
    enabled: raw.enabled !== false,
    maxVisible: Number.isFinite(Number(raw.maxVisible ?? raw.max_visible)) ? Math.max(0, Math.min(20, Number(raw.maxVisible ?? raw.max_visible) | 0)) : DEFAULT_CONFIG.maxVisible,
  };
}

export async function getSponsorsConfig(kind = DEFAULT_KIND) {
  const k = sanitizeKind(kind);
  // Migrate legacy __config -> __config:llm
  const raw = await sponsorsKv.get(configKey(k), null);
  if (raw != null) return sanitizeConfig(raw);
  if (k === DEFAULT_KIND) {
    const legacy = await sponsorsKv.get("__config", null);
    if (legacy != null) return sanitizeConfig(legacy);
  }
  return { ...DEFAULT_CONFIG };
}

export async function setSponsorsConfig(patch, kind = DEFAULT_KIND) {
  const k = sanitizeKind(kind);
  const current = await getSponsorsConfig(k);
  const next = sanitizeConfig({ ...current, ...(patch || {}) });
  await sponsorsKv.set(configKey(k), next);
  return next;
}

export async function getSponsors({ kind = DEFAULT_KIND, activeOnly = false } = {}) {
  const k = sanitizeKind(kind);
  const all = await sponsorsKv.getAll();
  const out = [];
  const prefix = `${k}:`;
  for (const [key, val] of Object.entries(all)) {
    if (key.startsWith("__config")) continue;
    // Legacy keys without kind prefix are treated as llm
    const isLegacy = !key.includes(":");
    const entryKind = isLegacy ? DEFAULT_KIND : key.split(":")[0];
    if (entryKind !== k) continue;
    const s = sanitizeSponsor(val, k);
    if (!s) continue;
    // Override kind to requested kind for legacy; normalize providerId from key
    s.kind = k;
    s.providerId = isLegacy ? String(key).trim().toLowerCase() : String(key.slice(prefix.length)).trim().toLowerCase();
    if (activeOnly && !s.isActive) continue;
    out.push(s);
  }
  out.sort((a, b) => a.position - b.position || a.providerId.localeCompare(b.providerId));
  return out;
}

export async function getPublicSponsors(kind = DEFAULT_KIND) {
  const k = sanitizeKind(kind);
  const [config, sponsors] = await Promise.all([
    getSponsorsConfig(k),
    getSponsors({ kind: k, activeOnly: true }),
  ]);
  if (!config.enabled) return { enabled: false, maxVisible: config.maxVisible, sponsors: [] };
  const capped = sponsors.slice(0, config.maxVisible);
  return { enabled: true, maxVisible: config.maxVisible, sponsors: capped };
}

export async function getSponsor(providerId, kind = DEFAULT_KIND) {
  const k = sanitizeKind(kind);
  const id = String(providerId || "").trim().toLowerCase();
  if (!id) return null;
  // Try kind-prefixed first, then legacy (llm) for back-compat
  let raw = await sponsorsKv.get(sponsorKey(k, id), null);
  if (raw == null && k === DEFAULT_KIND) raw = await sponsorsKv.get(id, null);
  return raw ? sanitizeSponsor(raw, k) : null;
}

export async function upsertSponsor(entry, kind = DEFAULT_KIND) {
  const k = sanitizeKind(entry?.kind ?? kind);
  const s = sanitizeSponsor(entry, k);
  if (!s) throw new Error("providerId is required");
  s.kind = k;
  await sponsorsKv.set(sponsorKey(k, s.providerId), s);
  // Clean legacy key if migrating
  if (k === DEFAULT_KIND) {
    const db = await getAdapter();
    const legacy = db.get(`SELECT 1 FROM kv WHERE scope='sponsors' AND key=?`, [s.providerId]);
    if (legacy) db.run(`DELETE FROM kv WHERE scope='sponsors' AND key=?`, [s.providerId]);
  }
  return s;
}

export async function deleteSponsor(providerId, kind = DEFAULT_KIND) {
  const k = sanitizeKind(kind);
  const id = String(providerId || "").trim().toLowerCase();
  if (!id) throw new Error("providerId is required");
  const db = await getAdapter();
  db.run(`DELETE FROM kv WHERE scope = 'sponsors' AND key = ?`, [sponsorKey(k, id)]);
  if (k === DEFAULT_KIND) db.run(`DELETE FROM kv WHERE scope='sponsors' AND key=?`, [id]);
}

export async function reorderSponsors(orderedIds, kind = DEFAULT_KIND) {
  if (!Array.isArray(orderedIds)) throw new Error("orderedIds must be an array");
  const k = sanitizeKind(kind);
  const current = await getSponsors({ kind: k });
  const orderMap = new Map(orderedIds.map((id, idx) => [String(id).trim().toLowerCase(), idx]));
  const db = await getAdapter();
  db.transaction(() => {
    for (const s of current) {
      if (!orderMap.has(s.providerId)) continue;
      const nextPos = orderMap.get(s.providerId);
      const updated = { ...s, position: nextPos, kind: k };
      db.run(`INSERT INTO kv(scope, key, value) VALUES('sponsors', ?, ?) ON CONFLICT(scope, key) DO UPDATE SET value = excluded.value`, [sponsorKey(k, s.providerId), stringifyJson(updated)]);
    }
  });
  return await getSponsors({ kind: k });
}

// For exportDb/importDb — raw passthrough (sanitized on read)
export async function getAllSponsorsRaw() {
  const db = await getAdapter();
  const rows = db.all(`SELECT key, value FROM kv WHERE scope = 'sponsors'`);
  const out = {};
  for (const r of rows) out[r.key] = parseJson(r.value);
  return out;
}

export { VALID_KINDS, DEFAULT_KIND, sanitizeKind };
