import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Disconnect / reconnect for CLI tools: PolyRouter backs up the user's original
// config values on first Apply and restores them exactly on disconnect.

const mocks = vi.hoisted(() => ({ home: "", aliases: {} }));

vi.mock("os", async (importOriginal) => {
  const actual = await importOriginal();
  const patched = { ...actual, homedir: () => mocks.home };
  return { ...patched, default: patched };
});

// No real `claude` / `codex` binaries: install checks fall back to config files,
// and Codex model-catalog registration is skipped.
vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal();
  const exec = (_cmd, _opts, callback) => (callback || _opts)(new Error("not found"));
  return { ...actual, exec, default: { ...actual, exec } };
});

vi.mock("@/models", () => ({
  getModelAliases: async () => ({ ...mocks.aliases }),
  setModelAlias: async (alias, target) => { mocks.aliases[alias] = target; },
  deleteModelAlias: async (alias) => { delete mocks.aliases[alias]; },
}));

const req = (body) => ({ json: async () => body });
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf-8"));
const writeJson = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

let tmp;
beforeEach(() => {
  vi.resetModules();
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pr-cli-disconnect-"));
  mocks.home = path.join(tmp, "home");
  mocks.aliases = {};
  fs.mkdirSync(mocks.home, { recursive: true });
  process.env.DATA_DIR = path.join(tmp, "data");
});
afterEach(() => {
  delete process.env.DATA_DIR;
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("cliToolSnapshot", () => {
  it("restores captured values and deletes paths that were absent, pruning empty parents", async () => {
    const { captureValues, restoreValues } = await import("@/lib/cliToolSnapshot");
    const obj = { a: { keep: 1, x: "orig" }, other: true };
    const captured = captureValues(obj, [["a", "x"], ["b", "c"]]);
    obj.a.x = "changed";
    obj.b = { c: "added" };
    restoreValues(obj, captured, [["a", "x"], ["b", "c"]]);
    expect(obj).toEqual({ a: { keep: 1, x: "orig" }, other: true });
  });
});

describe("Claude Code settings", () => {
  const settingsFile = () => path.join(mocks.home, ".claude", "settings.json");
  const claudeJsonFile = () => path.join(mocks.home, ".claude.json");
  const polyEnv = {
    ANTHROPIC_BASE_URL: "http://localhost:20128",
    ANTHROPIC_AUTH_TOKEN: "sk-poly",
    ANTHROPIC_DEFAULT_FABLE_MODEL: "cc/claude-fable-5",
    ANTHROPIC_DEFAULT_OPUS_MODEL: "cc/claude-opus-4-8",
    ANTHROPIC_DEFAULT_SONNET_MODEL: "cc/claude-sonnet-5",
    ANTHROPIC_DEFAULT_HAIKU_MODEL: "cc/claude-haiku-4-5-20251001",
  };

  it("switches a subscription user to PolyRouter and back without losing their own settings", async () => {
    const original = { theme: "dark", env: { MY_VAR: "1", ANTHROPIC_MODEL: "opus" } };
    const originalClaudeJson = { userID: "u1", mcpServers: { github: { type: "http", url: "https://gh" } } };
    writeJson(settingsFile(), original);
    writeJson(claudeJsonFile(), originalClaudeJson);
    const route = await import("@/app/api/cli-tools/claude-settings/route.js");

    expect((await route.POST(req({ env: polyEnv, exaMcpEnabled: true }))).status).toBe(200);
    expect(readJson(settingsFile()).env.ANTHROPIC_BASE_URL).toBe("http://localhost:20128/v1");
    expect(readJson(claudeJsonFile()).mcpServers.exa).toBeTruthy();

    // Off → original values back (incl. no leftover FABLE model), PolyRouter remembered.
    expect((await route.PATCH(req({ enabled: false }))).status).toBe(200);
    const restored = readJson(settingsFile());
    expect(restored.env).toEqual(original.env);
    expect(restored.theme).toBe("dark");
    expect(readJson(claudeJsonFile()).mcpServers).toEqual(originalClaudeJson.mcpServers);
    let status = await (await route.GET()).json();
    expect(status).toMatchObject({ hasPolyRouter: false, canReconnect: true, hasBackup: false });

    // On → same PolyRouter settings re-applied.
    expect((await route.PATCH(req({ enabled: true }))).status).toBe(200);
    expect(readJson(settingsFile()).env).toMatchObject({ ...polyEnv, ANTHROPIC_BASE_URL: "http://localhost:20128/v1", MY_VAR: "1" });
    expect(readJson(claudeJsonFile()).mcpServers.exa).toBeTruthy();
    status = await (await route.GET()).json();
    expect(status).toMatchObject({ hasPolyRouter: true, canReconnect: true, hasBackup: true });

    // Reset → original values and nothing remembered.
    expect((await route.DELETE()).status).toBe(200);
    expect(readJson(settingsFile()).env).toEqual(original.env);
    status = await (await route.GET()).json();
    expect(status).toMatchObject({ hasPolyRouter: false, canReconnect: false });
  });

  it("restores a user's own gateway instead of deleting it", async () => {
    const original = { env: { ANTHROPIC_BASE_URL: "https://gw.corp.example/v1", ANTHROPIC_AUTH_TOKEN: "corp-token", API_TIMEOUT_MS: "90000" } };
    writeJson(settingsFile(), original);
    const route = await import("@/app/api/cli-tools/claude-settings/route.js");

    await route.POST(req({ env: polyEnv }));
    await route.PATCH(req({ enabled: false }));
    expect(readJson(settingsFile()).env).toEqual(original.env);
    expect((await (await route.GET()).json()).hasPolyRouter).toBe(false);
  });

  it("disconnects a config applied before backups existed and can switch it back on", async () => {
    writeJson(settingsFile(), {
      hasCompletedOnboarding: true,
      env: { ...polyEnv, ANTHROPIC_BASE_URL: "http://localhost:20128/v1", ANTHROPIC_MODEL: "opus", API_TIMEOUT_MS: "600000" },
    });
    const route = await import("@/app/api/cli-tools/claude-settings/route.js");

    await route.PATCH(req({ enabled: false }));
    expect(readJson(settingsFile()).env).toEqual({ ANTHROPIC_MODEL: "opus" });
    expect((await (await route.GET()).json()).canReconnect).toBe(true);

    await route.PATCH(req({ enabled: true }));
    expect(readJson(settingsFile()).env).toMatchObject({ ...polyEnv, ANTHROPIC_BASE_URL: "http://localhost:20128/v1" });
  });

  it("keeps Exa and earlier env keys when the CLI launcher sends a partial update", async () => {
    writeJson(settingsFile(), {});
    const route = await import("@/app/api/cli-tools/claude-settings/route.js");

    await route.POST(req({ env: polyEnv, exaMcpEnabled: true }));
    await route.POST(req({ env: { ANTHROPIC_DEFAULT_OPUS_MODEL: "gemini/gemini-3.1-pro" } }));
    expect(readJson(claudeJsonFile()).mcpServers.exa).toBeTruthy();

    await route.PATCH(req({ enabled: false }));
    expect(readJson(settingsFile()).env).toBeUndefined();
    await route.PATCH(req({ enabled: true }));
    expect(readJson(settingsFile()).env.ANTHROPIC_DEFAULT_OPUS_MODEL).toBe("gemini/gemini-3.1-pro");
    expect(readJson(settingsFile()).env.ANTHROPIC_AUTH_TOKEN).toBe("sk-poly");
    expect(readJson(claudeJsonFile()).mcpServers.exa).toBeTruthy();
  });

  it("refuses to reconnect when nothing was ever applied", async () => {
    writeJson(settingsFile(), {});
    const route = await import("@/app/api/cli-tools/claude-settings/route.js");
    expect((await route.PATCH(req({ enabled: true }))).status).toBe(409);
  });
});

describe("Codex settings", () => {
  const configFile = () => path.join(mocks.home, ".codex", "config.toml");
  const authFile = () => path.join(mocks.home, ".codex", "auth.json");
  const chatgptAuth = {
    auth_mode: "chatgpt",
    OPENAI_API_KEY: null,
    tokens: { id_token: "id", access_token: "at", refresh_token: "rt", account_id: "acc" },
    last_refresh: "2026-10-01T00:00:00Z",
  };
  const applyBody = {
    baseUrl: "http://localhost:20128",
    apiKey: "sk-poly",
    model: "codex-astra",
    modelSlots: { "codex-astra": "cc/claude-fable-5" },
  };

  it("switches a ChatGPT-login user to PolyRouter and back to their subscription", async () => {
    const originalConfig = 'model = "gpt-5.5"\nmodel_reasoning_effort = "high"\n';
    fs.mkdirSync(path.dirname(configFile()), { recursive: true });
    fs.writeFileSync(configFile(), originalConfig);
    writeJson(authFile(), chatgptAuth);
    const route = await import("@/app/api/cli-tools/codex-settings/route.js");
    const { parseTOML } = await import("confbox");

    expect((await route.POST(req(applyBody))).status).toBe(200);
    expect(readJson(authFile()).auth_mode).toBe("apikey");
    expect(parseTOML(fs.readFileSync(configFile(), "utf-8")).model_provider).toBe("polyrouter");

    expect((await route.PATCH(req({ enabled: false }))).status).toBe(200);
    expect(parseTOML(fs.readFileSync(configFile(), "utf-8"))).toEqual({ model: "gpt-5.5", model_reasoning_effort: "high" });
    expect(readJson(authFile())).toEqual(chatgptAuth);
    expect(mocks.aliases["codex-astra"]).toBe("cc/claude-fable-5"); // kept for reconnect
    let status = await (await route.GET()).json();
    expect(status).toMatchObject({ hasPolyRouter: false, canReconnect: true });

    expect((await route.PATCH(req({ enabled: true }))).status).toBe(200);
    expect(parseTOML(fs.readFileSync(configFile(), "utf-8"))).toMatchObject({ model: "codex-astra", model_provider: "polyrouter" });
    expect(readJson(authFile())).toMatchObject({ auth_mode: "apikey", OPENAI_API_KEY: "sk-poly", tokens: chatgptAuth.tokens });

    expect((await route.DELETE()).status).toBe(200);
    expect(parseTOML(fs.readFileSync(configFile(), "utf-8"))).toEqual({ model: "gpt-5.5", model_reasoning_effort: "high" });
    expect(readJson(authFile())).toEqual(chatgptAuth);
    expect(mocks.aliases).toEqual({});
    status = await (await route.GET()).json();
    expect(status).toMatchObject({ hasPolyRouter: false, canReconnect: false });
  });

  it("disconnects a config applied before backups existed", async () => {
    fs.mkdirSync(path.dirname(configFile()), { recursive: true });
    fs.writeFileSync(configFile(), [
      'model = "cx/gpt-5.5"',
      'model_provider = "polyrouter"',
      'approval_policy = "never"',
      "",
      "[model_providers.polyrouter]",
      'name = "PolyRouter"',
      'base_url = "http://localhost:20128/v1"',
      'wire_api = "responses"',
      "requires_openai_auth = false",
      'experimental_bearer_token = "sk-poly"',
      "",
      "[agents.subagent]",
      'description = "Default PolyRouter subagent"',
      'model = "cx/gpt-5.5"',
      "",
    ].join("\n"));
    writeJson(authFile(), { ...chatgptAuth, auth_mode: "apikey", OPENAI_API_KEY: "sk-poly" });
    const route = await import("@/app/api/cli-tools/codex-settings/route.js");
    const { parseTOML } = await import("confbox");

    expect((await route.PATCH(req({ enabled: false }))).status).toBe(200);
    expect(parseTOML(fs.readFileSync(configFile(), "utf-8"))).toEqual({ approval_policy: "never" });
    const { auth_mode: _mode, OPENAI_API_KEY: _key, ...rest } = chatgptAuth;
    expect(readJson(authFile())).toEqual(rest);
    expect((await (await route.GET()).json()).canReconnect).toBe(true);
  });
});
