// Office-mode employee authentication: credential checks (with lockout),
// portal session cookies, and light-client device tokens.
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { getScopedSigningKey, shouldUseSecureCookie } from "@/lib/auth/dashboardSession";
import { checkLock, recordFail, recordSuccess } from "@/lib/auth/loginLimiter";
import {
  getOfficeUserByEmail,
  getOfficeUserById,
  getOfficeDeviceByTokenHash,
  touchOfficeDevice,
  normalizeEmail,
} from "@/lib/db/index.js";
import { getOfficeSettings } from "./context.js";

export const OFFICE_SESSION_COOKIE = "office_session";
const SESSION_SCOPE = "office";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const SIGNING_KEY = getScopedSigningKey(SESSION_SCOPE);
const DEVICE_TOKEN_PREFIX = "prd_";
const DEVICE_TOUCH_INTERVAL_MS = 60_000;

export const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
// Compared against when the email is unknown so response time does not reveal
// which emails exist.
const DUMMY_HASH = bcrypt.hashSync("office-mode-timing-equalizer", 10);

export function validateNewPassword(password) {
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) return `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`;
  return null;
}

export function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export function generateTemporaryPassword() {
  // 14 chars from an unambiguous alphabet.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(14);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/**
 * Verify employee credentials with progressive lockout keyed by both client IP
 * and email (so neither rotating emails nor rotating IPs escapes the limiter).
 * @returns {Promise<{user} | {status:number, error:string, retryAfter?:number}>}
 */
export async function verifyOfficeCredentials(email, password, ip) {
  const officeSettings = await getOfficeSettings();
  if (!officeSettings.enabled) return { status: 403, error: "Office access is turned off on this server." };

  const normalized = normalizeEmail(email);
  if (!normalized || typeof password !== "string" || !password) {
    return { status: 400, error: "Email and password are required." };
  }

  const ipKey = `office:${ip}`;
  const emailKey = `office-email:${normalized}`;
  for (const key of [ipKey, emailKey]) {
    const lock = checkLock(key);
    if (lock.locked) {
      return { status: 429, error: `Too many failed attempts. Try again in ${lock.retryAfter}s.`, retryAfter: lock.retryAfter };
    }
  }

  const user = await getOfficeUserByEmail(normalized, { withSecret: true });
  const valid = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
  if (!user || !valid) {
    recordFail(ipKey);
    recordFail(emailKey);
    return { status: 401, error: "Invalid email or password." };
  }
  if (!user.isActive) return { status: 403, error: "Your account is disabled. Contact your admin." };

  recordSuccess(ipKey);
  recordSuccess(emailKey);
  const { passwordHash: _omit, ...safeUser } = user;
  return { user: safeUser };
}

// ─── Portal session cookie ───────────────────────────────────────────────

export async function createOfficeSessionToken(user) {
  return new SignJWT({ scope: SESSION_SCOPE, uid: user.id, sv: user.sessionVersion || 0 })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(SIGNING_KEY);
}

export async function setOfficeSessionCookie(cookieStore, request, user) {
  cookieStore.set(OFFICE_SESSION_COOKIE, await createOfficeSessionToken(user), {
    httpOnly: true,
    secure: shouldUseSecureCookie(request),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearOfficeSessionCookie(cookieStore) {
  cookieStore.delete(OFFICE_SESSION_COOKIE);
}

/** Returns the active employee for a session token, or null. */
export async function getOfficeUserFromSessionToken(token) {
  if (!token) return null;
  let payload;
  try {
    ({ payload } = await jwtVerify(token, SIGNING_KEY));
  } catch {
    return null;
  }
  if (payload.scope !== SESSION_SCOPE || typeof payload.uid !== "string") return null;
  const officeSettings = await getOfficeSettings();
  if (!officeSettings.enabled) return null;
  const user = await getOfficeUserById(payload.uid);
  if (!user || !user.isActive) return null;
  if ((user.sessionVersion || 0) !== (payload.sv || 0)) return null;
  return user;
}

// ─── Light-client device tokens ──────────────────────────────────────────

export function generateDeviceToken() {
  return DEVICE_TOKEN_PREFIX + crypto.randomBytes(32).toString("base64url");
}

export function hashDeviceToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

/**
 * Authenticate a light-client request (`Authorization: Bearer prd_…`).
 * @returns {Promise<{user, device} | {status:number, error:string}>}
 */
export async function authenticateDeviceRequest(request) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token.startsWith(DEVICE_TOKEN_PREFIX)) return { status: 401, error: "Device token required." };

  const officeSettings = await getOfficeSettings();
  if (!officeSettings.enabled) return { status: 403, error: "Office access is turned off on this server." };

  const device = await getOfficeDeviceByTokenHash(hashDeviceToken(token));
  if (!device || device.revokedAt) return { status: 401, error: "This device was signed out. Log in again." };
  const user = await getOfficeUserById(device.userId);
  if (!user || !user.isActive) return { status: 403, error: "Your account is disabled. Contact your admin." };

  const lastSeen = device.lastSeenAt ? Date.parse(device.lastSeenAt) : 0;
  if (!Number.isFinite(lastSeen) || Date.now() - lastSeen > DEVICE_TOUCH_INTERVAL_MS) {
    touchOfficeDevice(device.id).catch(() => {});
  }
  return { user, device };
}
