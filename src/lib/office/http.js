// Shared helpers for /api/office/* route handlers.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OFFICE_SESSION_COOKIE, getOfficeUserFromSessionToken } from "./session.js";

export const NO_STORE = { "Cache-Control": "no-store" };

export function ok(data, status = 200) {
  return NextResponse.json(data, { status, headers: NO_STORE });
}

export function fail(status, error, extra = {}) {
  return NextResponse.json({ error, ...extra }, { status, headers: NO_STORE });
}

export async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : {};
  } catch {
    return {};
  }
}

// SQLite UNIQUE violations surface with slightly different text per driver.
export function isUniqueViolation(error) {
  const msg = String(error?.message || error || "").toLowerCase();
  return msg.includes("unique") || msg.includes("constraint");
}

/** Portal session guard. Returns { user } or { response } (a 401 to return as-is). */
export async function requireOfficeSession() {
  const cookieStore = await cookies();
  const user = await getOfficeUserFromSessionToken(cookieStore.get(OFFICE_SESSION_COOKIE)?.value);
  if (!user) return { response: fail(401, "Not signed in") };
  return { user };
}

export const PERIODS = ["today", "7d", "30d", "month", "90d", "all"];

export function periodStartIso(period, now = new Date()) {
  switch (period) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    case "7d":
      return new Date(now.getTime() - 7 * 86_400_000).toISOString();
    case "90d":
      return new Date(now.getTime() - 90 * 86_400_000).toISOString();
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    case "all":
      return new Date(0).toISOString();
    case "30d":
    default:
      return new Date(now.getTime() - 30 * 86_400_000).toISOString();
  }
}

export function parsePeriod(request, fallback = "30d") {
  const value = new URL(request.url).searchParams.get("period");
  return PERIODS.includes(value) ? value : fallback;
}

export function maskKey(key) {
  if (!key || typeof key !== "string") return "";
  return key.length <= 12 ? `${key.slice(0, 4)}…` : `${key.slice(0, 8)}…${key.slice(-4)}`;
}

export function clampString(value, max = 120) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
