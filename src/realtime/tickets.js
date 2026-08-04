import { createHmac, randomUUID, timingSafeEqual } from "crypto";

const TICKET_VERSION = 1;
const DEFAULT_TTL_SECONDS = 60;
const MAX_TTL_SECONDS = 120;
const MAX_TRACKED_TICKETS = 2000;
const usedTicketIds = globalThis.__polyrouterUsedRealtimeTicketIds ||= new Map();

function getSigningSecret() {
  const secret = process.env.REALTIME_INTERNAL_SECRET;
  if (!secret) throw new Error("Realtime ticket signing is unavailable.");
  return secret;
}

function encode(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function sign(encodedPayload) {
  return createHmac("sha256", getSigningSecret()).update(encodedPayload).digest("base64url");
}

function signaturesMatch(actual, expected) {
  const left = Buffer.from(actual || "", "utf8");
  const right = Buffer.from(expected || "", "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

function normalizeOrigin(origin) {
  const url = new URL(origin);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Realtime ticket origin must use HTTP or HTTPS.");
  const isLoopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1" || url.hostname === "[::1]";
  if (url.protocol !== "https:" && !isLoopback) throw new Error("Public realtime ticket origins must use HTTPS.");
  return url.origin;
}

function pruneUsedTickets(nowSeconds) {
  for (const [id, expiresAt] of usedTicketIds) {
    if (expiresAt <= nowSeconds) usedTicketIds.delete(id);
  }
  while (usedTicketIds.size > MAX_TRACKED_TICKETS) {
    usedTicketIds.delete(usedTicketIds.keys().next().value);
  }
}

export function issueRealtimeTicket({ provider, model, origin, ttlSeconds = DEFAULT_TTL_SECONDS }) {
  const now = Math.floor(Date.now() / 1000);
  const ttl = Math.max(1, Math.min(MAX_TTL_SECONDS, Number(ttlSeconds) || DEFAULT_TTL_SECONDS));
  const payload = {
    v: TICKET_VERSION,
    jti: randomUUID(),
    iat: now,
    exp: now + ttl,
    provider,
    model,
    origin: normalizeOrigin(origin),
  };
  const encodedPayload = encode(payload);
  return {
    ticket: `${encodedPayload}.${sign(encodedPayload)}`,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
}

export function consumeRealtimeTicket(ticket, { provider, model, origin }) {
  if (typeof ticket !== "string" || ticket.length > 4096) throw new Error("Invalid realtime ticket.");
  const [encodedPayload, signature, extra] = ticket.split(".");
  if (!encodedPayload || !signature || extra || !signaturesMatch(signature, sign(encodedPayload))) {
    throw new Error("Invalid realtime ticket.");
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid realtime ticket.");
  }

  const now = Math.floor(Date.now() / 1000);
  pruneUsedTickets(now);
  if (payload?.v !== TICKET_VERSION || typeof payload.jti !== "string" || payload.exp <= now) {
    throw new Error("Realtime ticket has expired.");
  }
  if (payload.provider !== provider || payload.model !== model) throw new Error("Realtime ticket scope does not match this connection.");
  if (!origin || normalizeOrigin(origin) !== payload.origin) throw new Error("Realtime ticket origin does not match.");
  if (usedTicketIds.has(payload.jti)) throw new Error("Realtime ticket has already been used.");

  usedTicketIds.set(payload.jti, payload.exp);
  return payload;
}

export const __test__ = { normalizeOrigin, pruneUsedTickets };
