// Office mode end-to-end against a real temp SQLite DB: key validation,
// usage attribution, the gateway gate, sessions and device tokens.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

const originalDataDir = process.env.DATA_DIR;
let tempDir;
let db;
let gate;
let cache;
let session;
let context;
let dashboardSession;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "polyrouter-office-"));
  process.env.DATA_DIR = tempDir;
  vi.resetModules();
  db = await import("@/lib/db/index.js");
  await db.initDb();
  gate = await import("@/lib/office/gate.js");
  cache = await import("@/lib/office/usageCache.js");
  session = await import("@/lib/office/session.js");
  context = await import("@/lib/office/context.js");
  dashboardSession = await import("@/lib/auth/dashboardSession.js");
});

afterAll(() => {
  // Windows keeps the SQLite file locked while the process lives; best-effort cleanup.
  try {
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

beforeEach(() => {
  cache.__resetOfficeState();
});

let seq = 0;
async function setOffice(patch) {
  const settings = await db.getSettings();
  await db.updateSettings({ office: { ...(settings.office || {}), ...patch } });
}

async function makeEmployee({ limits = null, teamPolicyLimits = null } = {}) {
  seq += 1;
  let policyId = null;
  let teamId = null;
  if (limits) policyId = (await db.createOfficePolicy({ name: `p-${seq}`, limits })).id;
  if (teamPolicyLimits) {
    const teamPolicy = await db.createOfficePolicy({ name: `tp-${seq}`, limits: teamPolicyLimits });
    teamId = (await db.createOfficeTeam({ name: `team-${seq}`, policyId: teamPolicy.id })).id;
  }
  const user = await db.createOfficeUser({
    email: `Emp${seq}@Example.com`,
    name: `Emp ${seq}`,
    passwordHash: await session.hashPassword("correct horse battery"),
    teamId,
    policyId,
    mustChangePassword: false,
  });
  const key = await db.createApiKey(`k-${seq}`, "machine-test", { userId: user.id });
  return { user, key };
}

function chatRequest(apiKey, body) {
  return new Request("http://localhost/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function recordingHandler(response = () => new Response("ok")) {
  const calls = [];
  const handler = async (req) => {
    calls.push(await req.clone().json().catch(() => null));
    return response();
  };
  return { handler, calls };
}

describe("schema", () => {
  it("creates office tables and attribution columns", async () => {
    const adapter = await (await import("@/lib/db/driver.js")).getAdapter();
    const cols = (t) => adapter.all(`PRAGMA table_info(${t})`).map((r) => r.name);
    expect(cols("apiKeys")).toEqual(expect.arrayContaining(["userId", "expiresAt", "deviceId"]));
    expect(cols("usageHistory")).toContain("userId");
    for (const t of ["officeUsers", "officeTeams", "officePolicies", "officeDevices", "officeAuditLog"]) {
      expect(cols(t).length).toBeGreaterThan(0);
    }
  });

  it("stores emails normalized", async () => {
    const { user } = await makeEmployee();
    expect(user.email).toBe(`emp${seq}@example.com`);
    expect(await db.getOfficeUserByEmail(`  EMP${seq}@example.COM `)).toMatchObject({ id: user.id });
  });
});

describe("validateApiKey", () => {
  it("owner keys are unaffected by office mode", async () => {
    const owner = await db.createApiKey("owner", "machine-test");
    await setOffice({ enabled: false });
    expect(await db.validateApiKey(owner.key)).toBe(true);
    expect(await db.isOfficeEmployeeApiKey(owner.key)).toBe(false);
  });

  it("employee keys only work while office mode is on, the user is active and the key is unexpired", async () => {
    const { user, key } = await makeEmployee();
    expect(await db.isOfficeEmployeeApiKey(key.key)).toBe(true);

    await setOffice({ enabled: false });
    expect(await db.validateApiKey(key.key)).toBe(false);

    await setOffice({ enabled: true });
    expect(await db.validateApiKey(key.key)).toBe(true);

    await db.updateOfficeUser(user.id, { isActive: false });
    expect(await db.validateApiKey(key.key)).toBe(false);
    await db.updateOfficeUser(user.id, { isActive: true });

    const expired = await db.createApiKey("old", "machine-test", { userId: user.id, expiresAt: new Date(Date.now() - 1000).toISOString() });
    expect(await db.validateApiKey(expired.key)).toBe(false);
  });

  it("GET /api/keys hides employee keys", async () => {
    const { key } = await makeEmployee();
    const { GET } = await import("@/app/api/keys/route.js");
    const data = await (await GET()).json();
    expect(data.keys.some((k) => k.key === key.key)).toBe(false);
  });
});

describe("usage attribution", () => {
  it("stamps userId from the API key and aggregates per employee", async () => {
    const { user, key } = await makeEmployee();
    await db.saveRequestUsage({ provider: "openai", model: "gpt-4o", apiKey: key.key, tokens: { prompt_tokens: 100, completion_tokens: 50 } });
    await db.saveRequestUsage({ provider: "openai", model: "gpt-4o", apiKey: "not-an-employee-key", tokens: { prompt_tokens: 7, completion_tokens: 3 } });

    const since = new Date(Date.now() - 60_000).toISOString();
    const totals = await db.getOfficeUserUsageSince(user.id, since);
    expect(totals).toMatchObject({ requests: 1, promptTokens: 100, completionTokens: 50, tokens: 150 });

    const byUser = await db.getOfficeUsageByUser(since);
    expect(byUser.find((r) => r.userId === user.id)).toMatchObject({ requests: 1 });
    expect(byUser.some((r) => r.userId === null)).toBe(false);
  });

  it("invalidates the cached budget totals when new usage lands", async () => {
    const { user, key } = await makeEmployee();
    const windows1 = await context.getUserUsageWindows(user.id);
    expect(windows1.day.tokens).toBe(0);
    await db.saveRequestUsage({ provider: "openai", model: "gpt-4o", apiKey: key.key, tokens: { prompt_tokens: 10, completion_tokens: 5 } });
    const windows2 = await context.getUserUsageWindows(user.id);
    expect(windows2.day.tokens).toBe(15);
  });

  it("keeps usage history when an employee is deleted, but removes keys and devices", async () => {
    const { user, key } = await makeEmployee();
    await db.saveRequestUsage({ provider: "openai", model: "gpt-4o", apiKey: key.key, tokens: { prompt_tokens: 1, completion_tokens: 1 } });
    await db.createOfficeDevice({ userId: user.id, name: "laptop", platform: "win32", tokenHash: `h-${seq}` });
    expect(await db.deleteOfficeUser(user.id)).toBe(true);
    expect(await db.getApiKeyByValue(key.key)).toBeNull();
    expect(await db.listOfficeDevices(user.id)).toEqual([]);
    const totals = await db.getOfficeUserUsageSince(user.id, new Date(Date.now() - 60_000).toISOString());
    expect(totals.requests).toBe(1);
  });
});

describe("policy precedence", () => {
  it("user policy beats team policy beats office default", async () => {
    const defaultPolicy = await db.createOfficePolicy({ name: `default-${seq}`, limits: { requestsPerDay: 1 } });
    await setOffice({ enabled: true, defaultPolicyId: defaultPolicy.id });
    const office = await context.getOfficeSettings();

    const { user: teamUser } = await makeEmployee({ teamPolicyLimits: { requestsPerDay: 2 } });
    expect((await context.resolveEffectivePolicy(teamUser, office))).toMatchObject({ source: "team" });

    const { user: own } = await makeEmployee({ limits: { requestsPerDay: 3 }, teamPolicyLimits: { requestsPerDay: 2 } });
    const eff = await context.resolveEffectivePolicy(own, office);
    expect(eff.source).toBe("user");
    expect(eff.limits.requestsPerDay).toBe(3);

    const { user: plain } = await makeEmployee();
    expect((await context.resolveEffectivePolicy(plain, office))).toMatchObject({ source: "default" });

    await setOffice({ defaultPolicyId: null });
    expect((await context.resolveEffectivePolicy(plain, await context.getOfficeSettings()))).toMatchObject({ source: "none" });
  });
});

describe("withOfficeGate", () => {
  beforeEach(async () => {
    await setOffice({ enabled: true, defaultPolicyId: null });
  });

  it("passes owner keys and keyless requests straight through", async () => {
    const owner = await db.createApiKey("owner2", "machine-test");
    const { handler, calls } = recordingHandler();
    const gated = gate.withOfficeGate(handler, { kind: "chat", format: "openai" });
    const res = await gated(chatRequest(owner.key, { model: "x", max_tokens: 99999 }));
    expect(res.status).toBe(200);
    expect(calls[0].max_tokens).toBe(99999);

    const keyless = new Request("http://localhost/api/v1/chat/completions", { method: "POST", body: "{}" });
    expect((await gated(keyless)).status).toBe(200);
  });

  it("returns 401 for employee keys while office mode is off", async () => {
    const { key } = await makeEmployee();
    await setOffice({ enabled: false });
    const { handler, calls } = recordingHandler();
    const res = await gate.withOfficeGate(handler, { kind: "chat" })(chatRequest(key.key, { model: "x" }));
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("office_disabled");
    expect(calls).toHaveLength(0);
  });

  it("blocks disallowed models before the handler runs", async () => {
    const { key } = await makeEmployee({ limits: { allowedModels: ["cc/*"] } });
    const { handler, calls } = recordingHandler();
    const gated = gate.withOfficeGate(handler, { kind: "chat", format: "openai" });
    const denied = await gated(chatRequest(key.key, { model: "openai/gpt-4o" }));
    expect(denied.status).toBe(403);
    const body = await denied.json();
    expect(body).toMatchObject({ type: "error", error: { type: "permission_error", code: "office_model_not_allowed" } });
    expect(calls).toHaveLength(0);
    expect((await gated(chatRequest(key.key, { model: "cc/sonnet" }))).status).toBe(200);
  });

  it("enforces requests per minute", async () => {
    const { key } = await makeEmployee({ limits: { requestsPerMinute: 2 } });
    const gated = gate.withOfficeGate(recordingHandler().handler, { kind: "chat" });
    expect((await gated(chatRequest(key.key, { model: "m" }))).status).toBe(200);
    expect((await gated(chatRequest(key.key, { model: "m" }))).status).toBe(200);
    const third = await gated(chatRequest(key.key, { model: "m" }));
    expect(third.status).toBe(429);
    expect((await third.json()).error.type).toBe("rate_limit_error");
  });

  it("does not count requests it denied toward the rate limit", async () => {
    const { key } = await makeEmployee({ limits: { requestsPerMinute: 1, blockedModels: ["bad"] } });
    const gated = gate.withOfficeGate(recordingHandler().handler, { kind: "chat" });
    expect((await gated(chatRequest(key.key, { model: "bad" }))).status).toBe(403);
    expect((await gated(chatRequest(key.key, { model: "good" }))).status).toBe(200);
  });

  it("clamps max output tokens in the forwarded body", async () => {
    const { key } = await makeEmployee({ limits: { maxOutputTokens: 1000 } });
    const { handler, calls } = recordingHandler();
    await gate.withOfficeGate(handler, { kind: "chat", format: "claude" })(chatRequest(key.key, { model: "m", max_tokens: 64000, messages: [] }));
    expect(calls[0]).toMatchObject({ model: "m", max_tokens: 1000, messages: [] });
  });

  it("swaps to the fallback model once the budget is spent", async () => {
    const { key } = await makeEmployee({ limits: { tokensPerDay: 100, onLimit: "fallback", fallbackModel: "cc/haiku" } });
    await db.saveRequestUsage({ provider: "x", model: "cc/opus", apiKey: key.key, tokens: { prompt_tokens: 90, completion_tokens: 20 } });
    const { handler, calls } = recordingHandler();
    const res = await gate.withOfficeGate(handler, { kind: "chat", format: "openai" })(chatRequest(key.key, { model: "cc/opus" }));
    expect(res.status).toBe(200);
    expect(calls[0].model).toBe("cc/haiku");
  });

  it("blocks with 429 once the budget is spent and no fallback is set", async () => {
    const { key } = await makeEmployee({ limits: { tokensPerDay: 100 } });
    await db.saveRequestUsage({ provider: "x", model: "m", apiKey: key.key, tokens: { prompt_tokens: 100, completion_tokens: 1 } });
    const res = await gate.withOfficeGate(recordingHandler().handler, { kind: "chat" })(chatRequest(key.key, { model: "m" }));
    expect(res.status).toBe(429);
    expect((await res.json()).error.code).toBe("office_budget_exceeded");
  });

  it("refuses fallback when the model comes from the URL", async () => {
    const { key } = await makeEmployee({ limits: { tokensPerDay: 1, onLimit: "fallback", fallbackModel: "cheap" } });
    await db.saveRequestUsage({ provider: "x", model: "m", apiKey: key.key, tokens: { prompt_tokens: 5, completion_tokens: 0 } });
    const gated = gate.withOfficeGate(recordingHandler().handler, { kind: "chat", format: "gemini", modelInBody: false, getModel: () => "pricey" });
    expect((await gated(chatRequest(key.key, { contents: [] }))).status).toBe(429);
  });

  it("holds a concurrency slot until the response body finishes", async () => {
    const { key } = await makeEmployee({ limits: { maxConcurrent: 1 } });
    const streaming = () => new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: hi\n\n"));
        controller.close();
      },
    }));
    const gated = gate.withOfficeGate(recordingHandler(streaming).handler, { kind: "chat" });

    const first = await gated(chatRequest(key.key, { model: "m" }));
    expect(first.status).toBe(200);
    expect((await gated(chatRequest(key.key, { model: "m" }))).status).toBe(429);

    expect(await first.text()).toBe("data: hi\n\n");
    expect((await gated(chatRequest(key.key, { model: "m" }))).status).toBe(200);
  });

  it("releases the concurrency slot when the handler throws", async () => {
    const { key } = await makeEmployee({ limits: { maxConcurrent: 1 } });
    const boom = gate.withOfficeGate(async () => { throw new Error("upstream down"); }, { kind: "chat" });
    await expect(boom(chatRequest(key.key, { model: "m" }))).rejects.toThrow("upstream down");
    const ok = gate.withOfficeGate(recordingHandler().handler, { kind: "chat" });
    expect((await ok(chatRequest(key.key, { model: "m" }))).status).toBe(200);
  });

  it("filters /v1/models for employees only", async () => {
    const { key } = await makeEmployee({ limits: { allowedModels: ["cc/*"] } });
    const models = [{ id: "cc/sonnet" }, { id: "openai/gpt-4o" }];
    const req = (k) => new Request("http://localhost/v1/models", { headers: { Authorization: `Bearer ${k}` } });
    expect(await gate.filterModelsForRequest(req(key.key), models)).toEqual([{ id: "cc/sonnet" }]);
    const owner = await db.createApiKey("owner3", "machine-test");
    expect(await gate.filterModelsForRequest(req(owner.key), models)).toHaveLength(2);
  });
});

describe("sessions and devices", () => {
  beforeEach(async () => {
    await setOffice({ enabled: true });
  });

  it("verifies credentials, rejecting wrong passwords and disabled accounts", async () => {
    const { user } = await makeEmployee();
    const good = await session.verifyOfficeCredentials(user.email.toUpperCase(), "correct horse battery", `ip-${seq}`);
    expect(good.user).toMatchObject({ id: user.id });
    expect(good.user.passwordHash).toBeUndefined();

    expect(await session.verifyOfficeCredentials(user.email, "wrong", `ip-${seq}`)).toMatchObject({ status: 401 });
    expect(await session.verifyOfficeCredentials("nobody@example.com", "whatever1", `ip-${seq}`)).toMatchObject({ status: 401 });

    await db.updateOfficeUser(user.id, { isActive: false });
    expect(await session.verifyOfficeCredentials(user.email, "correct horse battery", `ip2-${seq}`)).toMatchObject({ status: 403 });
  });

  it("locks an email out after repeated failures from rotating IPs", async () => {
    const { user } = await makeEmployee();
    for (let i = 0; i < 5; i += 1) await session.verifyOfficeCredentials(user.email, "wrong", `rot-${seq}-${i}`);
    const locked = await session.verifyOfficeCredentials(user.email, "correct horse battery", `fresh-${seq}`);
    expect(locked.status).toBe(429);
  });

  it("office session tokens and admin tokens are not interchangeable", async () => {
    const { user } = await makeEmployee();
    const officeToken = await session.createOfficeSessionToken(user);
    expect((await session.getOfficeUserFromSessionToken(officeToken))?.id).toBe(user.id);
    expect(await dashboardSession.verifyDashboardAuthToken(officeToken)).toBe(false);

    const adminToken = await dashboardSession.createDashboardAuthToken();
    expect(await dashboardSession.verifyDashboardAuthToken(adminToken)).toBe(true);
    expect(await session.getOfficeUserFromSessionToken(adminToken)).toBeNull();

    // Even an admin-signed token claiming the office scope is rejected by the admin check.
    const forged = await dashboardSession.createDashboardAuthToken({ scope: "office", uid: user.id });
    expect(await dashboardSession.verifyDashboardAuthToken(forged)).toBe(false);
    expect(await session.getOfficeUserFromSessionToken(forged)).toBeNull();
  });

  it("a session dies when the password is reset, the user is disabled, or office mode is off", async () => {
    const { user } = await makeEmployee();
    const token = await session.createOfficeSessionToken(user);
    await db.updateOfficeUser(user.id, {}, { bumpSession: true });
    expect(await session.getOfficeUserFromSessionToken(token)).toBeNull();

    const fresh = await session.createOfficeSessionToken(await db.getOfficeUserById(user.id));
    await setOffice({ enabled: false });
    expect(await session.getOfficeUserFromSessionToken(fresh)).toBeNull();
    await setOffice({ enabled: true });
    expect(await session.getOfficeUserFromSessionToken(fresh)).not.toBeNull();
  });

  it("device tokens authenticate until revoked, and revoking deletes the device key", async () => {
    const { user } = await makeEmployee();
    const token = session.generateDeviceToken();
    const device = await db.createOfficeDevice({ userId: user.id, name: "laptop", platform: "win32", tokenHash: session.hashDeviceToken(token) });
    const deviceKey = await db.createApiKey("Client: laptop", "machine-test", { userId: user.id, deviceId: device.id });

    const req = (t) => new Request("http://localhost/api/office/client/me", { headers: { Authorization: `Bearer ${t}` } });
    expect(await session.authenticateDeviceRequest(req(token))).toMatchObject({ user: { id: user.id }, device: { id: device.id } });
    expect(await session.authenticateDeviceRequest(req("prd_nope"))).toMatchObject({ status: 401 });
    expect(await session.authenticateDeviceRequest(req("sk-not-a-device-token"))).toMatchObject({ status: 401 });

    expect((await db.getOfficeDeviceKey(device.id))?.key).toBe(deviceKey.key);
    expect(await db.revokeOfficeDevice(device.id, user.id)).toBe(true);
    expect(await session.authenticateDeviceRequest(req(token))).toMatchObject({ status: 401 });
    expect(await db.getApiKeyByValue(deviceKey.key)).toBeNull();
  });

  it("another employee cannot revoke someone else's device", async () => {
    const { user: a } = await makeEmployee();
    const { user: b } = await makeEmployee();
    const device = await db.createOfficeDevice({ userId: a.id, name: "a-laptop", platform: "", tokenHash: `x-${seq}` });
    expect(await db.revokeOfficeDevice(device.id, b.id)).toBe(false);
    expect(await db.revokeOfficeDevice(device.id, a.id)).toBe(true);
  });
});

describe("export / import", () => {
  it("round-trips office tables and employee key ownership", async () => {
    await setOffice({ enabled: true });
    const { user, key } = await makeEmployee({ limits: { requestsPerDay: 9 } });
    const dump = await db.exportDb();
    expect(dump.office.users.some((u) => u.id === user.id)).toBe(true);

    await db.importDb(dump);
    expect(await db.getOfficeUserById(user.id)).toMatchObject({ email: user.email });
    expect((await db.getApiKeyByValue(key.key))?.userId).toBe(user.id);
  });

  it("restoring a pre-office export leaves employees intact", async () => {
    const { user } = await makeEmployee();
    const dump = await db.exportDb();
    delete dump.office;
    await db.importDb(dump);
    expect(await db.getOfficeUserById(user.id)).not.toBeNull();
  });
});
