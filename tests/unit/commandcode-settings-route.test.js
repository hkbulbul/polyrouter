import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state = {
    content: "{}",
    exists: false,
    authContent: "{}",
    authExists: false,
    authError: null,
    mode: 0o600,
    authMode: 0o600,
    transientFiles: new Map(),
    renames: 0,
    authWrites: 0,
    locked: false,
    afterSync: null,
    failRenameTo: null,
  };
  const enoent = () => Object.assign(new Error("ENOENT"), { code: "ENOENT" });
  const pathType = (filePath) => {
    const value = String(filePath);
    if (value.endsWith("providers.json")) return "config";
    if (value.endsWith("auth.json")) return "auth";
    return "transient";
  };
  const readStored = (filePath) => {
    const type = pathType(filePath);
    if (type === "config") {
      if (!state.exists) throw enoent();
      return { content: state.content, mode: state.mode };
    }
    if (type === "auth") {
      if (state.authError) throw state.authError;
      if (!state.authExists) throw enoent();
      return { content: state.authContent, mode: state.authMode };
    }
    const stored = state.transientFiles.get(String(filePath));
    if (!stored) throw enoent();
    return stored;
  };
  const writeStored = (filePath, stored) => {
    const type = pathType(filePath);
    if (type === "config") {
      state.content = stored.content;
      state.mode = stored.mode;
      state.exists = true;
      return;
    }
    if (type === "auth") {
      state.authContent = stored.content;
      state.authMode = stored.mode;
      state.authExists = true;
      return;
    }
    state.transientFiles.set(String(filePath), stored);
  };
  const deleteStored = (filePath) => {
    const type = pathType(filePath);
    if (type === "config") {
      if (!state.exists) throw enoent();
      state.exists = false;
      return;
    }
    if (type === "auth") {
      if (!state.authExists) throw enoent();
      state.authExists = false;
      return;
    }
    if (!state.transientFiles.delete(String(filePath))) throw enoent();
  };

  return {
    state,
    getSettings: vi.fn(),
    execFile: vi.fn((_file, _args, _options, callback) => callback(new Error("not found"))),
    fs: {
      access: vi.fn(async () => undefined),
      readFile: vi.fn(async (filePath) => {
        if (String(filePath).endsWith("package.json")) {
          return JSON.stringify({ name: "command-code", version: "1.32.1" });
        }
        return readStored(filePath).content;
      }),
      stat: vi.fn(async (filePath) => ({ mode: readStored(filePath).mode })),
      realpath: vi.fn(async () => { throw enoent(); }),
      mkdir: vi.fn(async (filePath) => {
        if (!String(filePath).endsWith(".polyrouter.lock")) return;
        if (state.locked) {
          throw Object.assign(new Error("EEXIST"), { code: "EEXIST" });
        }
        state.locked = true;
      }),
      open: vi.fn(async (filePath, _flags, mode) => {
        const key = String(filePath);
        if (state.transientFiles.has(key)) {
          throw Object.assign(new Error("EEXIST"), { code: "EEXIST" });
        }
        state.transientFiles.set(key, { content: "", mode });
        return {
          writeFile: vi.fn(async (content) => {
            state.transientFiles.set(key, { ...state.transientFiles.get(key), content });
          }),
          chmod: vi.fn(async (nextMode) => {
            state.transientFiles.set(key, { ...state.transientFiles.get(key), mode: nextMode });
          }),
          sync: vi.fn(async () => { await state.afterSync?.(key); }),
          close: vi.fn(async () => undefined),
        };
      }),
      rename: vi.fn(async (from, to) => {
        if (state.failRenameTo && String(to).endsWith(state.failRenameTo)) {
          throw Object.assign(new Error("EIO"), { code: "EIO" });
        }
        const stored = readStored(from);
        deleteStored(from);
        writeStored(to, stored);
        if (String(to).endsWith("providers.json")) state.renames += 1;
        if (String(to).endsWith("auth.json")) state.authWrites += 1;
      }),
      chmod: vi.fn(async () => undefined),
      unlink: vi.fn(async (filePath) => { deleteStored(filePath); }),
      rmdir: vi.fn(async () => { state.locked = false; }),
    },
  };
});

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body, init) => ({
      status: init?.status || 200,
      body,
      json: async () => body,
    })),
  },
}));

vi.mock("child_process", () => ({ execFile: mocks.execFile }));
vi.mock("os", () => ({
  default: {
    homedir: vi.fn(() => "/mock/home"),
    platform: vi.fn(() => "linux"),
  },
}));
vi.mock("fs/promises", () => ({ default: mocks.fs, ...mocks.fs }));
vi.mock("@/lib/db/index.js", () => ({ getSettings: mocks.getSettings }));

const { GET, POST, DELETE } = await import(
  "../../src/app/api/cli-tools/commandcode-settings/route.js"
);

const request = (body) => ({ json: vi.fn(async () => body) });

const getRevision = async () => (await GET()).body.revision;

const applyBody = (revision, overrides = {}) => ({
  mode: "apply",
  baseUrl: "http://127.0.0.1:20128/v1",
  models: ["cc/anthropic/claude-sonnet-5", "combo/fallback"],
  authMode: "keyless",
  expectedRevision: revision,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.state.content = "{}";
  mocks.state.exists = false;
  mocks.state.authContent = "{}";
  mocks.state.authExists = false;
  mocks.state.authError = null;
  mocks.state.mode = 0o600;
  mocks.state.authMode = 0o600;
  mocks.state.transientFiles = new Map();
  mocks.state.renames = 0;
  mocks.state.authWrites = 0;
  mocks.state.locked = false;
  mocks.state.afterSync = null;
  mocks.state.failRenameTo = null;
  mocks.getSettings.mockResolvedValue({ requireApiKey: false });
  mocks.execFile.mockImplementation((_file, _args, _options, callback) => callback(new Error("not found")));
});

describe("Command Code settings route", () => {
  it("returns a revision and sanitized custom authentication state", async () => {
    mocks.state.exists = true;
    mocks.state.content = JSON.stringify({
      provider: {
        polyrouter: {
          name: "PolyRouter",
          api: "openai-completions",
          polyrouterManaged: true,
          baseURL: "https://router.example/v1",
          apiKey: "$CUSTOM_ROUTER_KEY",
          models: { "first/model": { name: "first/model" } },
        },
      },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.body.settings).toEqual({
      baseUrl: "https://router.example/v1",
      baseUrlValid: true,
      models: ["first/model"],
      authMode: "custom",
      disabled: false,
    });
    expect(response.body.revision).toMatch(/^[a-f0-9]{64}$/);
    expect(response.body.compatible).toBe(true);
    expect(response.body.apiKeyRequired).toBe(false);
    expect(response.body.storedCredential).toBe(false);
    expect(response.body).not.toHaveProperty("configPath");
    expect(JSON.stringify(response.body)).not.toContain("CUSTOM_ROUTER_KEY");
  });

  it("rejects stale POST and DELETE without writing", async () => {
    const post = await POST(request(applyBody("stale")));
    const remove = await DELETE(request({ expectedRevision: "stale" }));

    expect(post.status).toBe(409);
    expect(post.body.code).toBe("STALE_CONFIG");
    expect(remove.status).toBe(409);
    expect(remove.body.code).toBe("STALE_CONFIG");
    expect(mocks.state.renames).toBe(0);
  });

  it("allows exactly one concurrent write for a shared revision", async () => {
    const revision = await getRevision();
    const responses = await Promise.all([
      POST(request(applyBody(revision, { models: ["first/model"] }))),
      POST(request(applyBody(revision, { models: ["second/model"] }))),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(mocks.state.renames).toBe(1);
    expect(Object.keys(JSON.parse(mocks.state.content).provider.polyrouter.models)).toHaveLength(1);
  });

  it("serializes POST and DELETE sharing one revision", async () => {
    const revision = await getRevision();
    const responses = await Promise.all([
      POST(request(applyBody(revision, { models: ["first/model"] }))),
      DELETE(request({ expectedRevision: revision })),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(mocks.state.renames).toBe(1);
  });

  it("does not poison the mutation queue after a failed Apply", async () => {
    const revision = await getRevision();
    const invalid = await POST(request(applyBody(revision, { models: [] })));
    const valid = await POST(request(applyBody(revision, { models: ["valid/model"] })));

    expect(invalid.status).toBe(400);
    expect(invalid.body.code).toBe("INVALID_MODELS");
    expect(valid.status).toBe(200);
    expect(mocks.state.renames).toBe(1);
  });

  it("rejects an external edit completed before the final revision check", async () => {
    const revision = await getRevision();
    mocks.state.afterSync = async () => {
      mocks.state.content = '{"external":true}';
      mocks.state.exists = true;
      mocks.state.afterSync = null;
    };

    const response = await POST(request(applyBody(revision)));

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("STALE_CONFIG");
    expect(mocks.state.renames).toBe(0);
    expect(mocks.state.locked).toBe(false);
    expect(mocks.state.content).toBe('{"external":true}');
  });

  it("releases the cooperative lock after a failed Apply", async () => {
    const revision = await getRevision();
    const invalid = await POST(request(applyBody(revision, { models: [] })));
    const valid = await POST(request(applyBody(revision, { models: ["valid/model"] })));

    expect(invalid.status).toBe(400);
    expect(valid.status).toBe(200);
    expect(mocks.state.locked).toBe(false);
  });

  it("rejects non-object request bodies", async () => {
    const response = await POST(request(null));

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Request body must be a JSON object");
    expect(mocks.state.renames).toBe(0);
  });

  it("reports saved keyless authentication as incompatible when API keys become required", async () => {
    mocks.state.exists = true;
    mocks.state.content = JSON.stringify({
      provider: {
        polyrouter: {
          name: "PolyRouter",
          api: "openai-completions",
          polyrouterManaged: true,
          baseURL: "http://127.0.0.1:20128/v1",
          apiKey: false,
          models: { "first/model": { name: "first/model" } },
        },
      },
    });
    mocks.getSettings.mockResolvedValue({ requireApiKey: true });

    const response = await GET();

    expect(response.body.hasPolyRouter).toBe(true);
    expect(response.body.compatible).toBe(false);
    expect(response.body.apiKeyRequired).toBe(true);
    expect(response.body.settings.authMode).toBe("keyless");
    expect(response.body.warnings).toContain(
      "PolyRouter now requires an API key. Select stored API-key authentication and click Apply.",
    );
  });

  it("reports invalid authentication as incompatible", async () => {
    mocks.state.exists = true;
    mocks.state.content = JSON.stringify({
      provider: {
        polyrouter: {
          name: "PolyRouter",
          api: "openai-completions",
          polyrouterManaged: true,
          baseURL: "http://127.0.0.1:20128/v1",
          apiKey: "raw-secret",
          models: { "first/model": { name: "first/model" } },
        },
      },
    });

    const response = await GET();

    expect(response.body.hasPolyRouter).toBe(true);
    expect(response.body.compatible).toBe(false);
    expect(response.body.settings.authMode).toBe("invalid");
    expect(response.body.warnings).toContain(
      "The existing PolyRouter authentication is invalid and cannot be preserved.",
    );
    expect(JSON.stringify(response.body)).not.toContain("raw-secret");
  });

  it("rejects keyless Apply when dashboard API keys are required", async () => {
    mocks.getSettings.mockResolvedValue({ requireApiKey: true });
    const revision = await getRevision();

    const response = await POST(request(applyBody(revision)));

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("API_KEY_REQUIRED");
    expect(mocks.state.renames).toBe(0);
  });

  it("detects stored provider credentials without exposing them", async () => {
    mocks.state.authExists = true;
    mocks.state.authContent = JSON.stringify({
      apiKey: "command-code-account-secret",
      polyrouter: { type: "api", key: "stored-polyrouter-secret" },
      other: { type: "api", key: "other-secret" },
    });

    const response = await GET();

    expect(response.body.storedCredential).toBe(true);
    expect(response.body.credentialStateKnown).toBe(true);
    expect(JSON.stringify(response.body)).not.toContain("secret");
  });

  it("automatically stores the selected key and preserves unrelated auth data", async () => {
    mocks.state.authExists = true;
    mocks.state.authContent = JSON.stringify({
      apiKey: "command-code-login",
      userId: "user-1",
      other: { type: "api", key: "other-provider-key" },
    });
    const selectedKey = "sk-polyrouter-selected";

    const response = await POST(request(applyBody(await getRevision(), {
      models: ["first/model"],
      authMode: "stored",
      apiKey: selectedKey,
    })));

    expect(response.status).toBe(200);
    expect(response.body.settings.authMode).toBe("stored");
    expect(response.body.storedCredential).toBe(true);
    expect(JSON.stringify(response.body)).not.toContain(selectedKey);
    expect(JSON.parse(mocks.state.content).provider.polyrouter).not.toHaveProperty("apiKey");
    expect(JSON.parse(mocks.state.authContent)).toEqual({
      apiKey: "command-code-login",
      userId: "user-1",
      other: { type: "api", key: "other-provider-key" },
      polyrouter: { type: "api", key: selectedKey },
    });
    expect(mocks.state.renames).toBe(1);
    expect(mocks.state.authWrites).toBe(1);
  });

  it("rotates only the PolyRouter credential and keeps model Apply idempotent", async () => {
    const first = await POST(request(applyBody(await getRevision(), {
      models: ["first/model"],
      authMode: "stored",
      apiKey: "first-key",
    })));
    const firstConfig = mocks.state.content;

    const repeated = await POST(request(applyBody(first.body.revision, {
      models: ["first/model"],
      authMode: "stored",
      apiKey: "first-key",
    })));
    expect(repeated.status).toBe(200);
    expect(mocks.state.content).toBe(firstConfig);
    expect(mocks.state.renames).toBe(1);
    expect(mocks.state.authWrites).toBe(1);

    const rotated = await POST(request(applyBody(repeated.body.revision, {
      models: ["first/model", "second/model"],
      authMode: "stored",
      apiKey: "second-key",
    })));
    expect(rotated.status).toBe(200);
    expect(rotated.body.settings.models).toEqual(["first/model", "second/model"]);
    expect(JSON.parse(mocks.state.authContent).polyrouter.key).toBe("second-key");
    expect(JSON.stringify(rotated.body)).not.toContain("second-key");
  });

  it("rejects missing or invalid stored API keys without writing", async () => {
    const revision = await getRevision();
    const missing = await POST(request(applyBody(revision, {
      authMode: "stored",
      apiKey: "",
    })));
    const invalid = await POST(request(applyBody(revision, {
      authMode: "stored",
      apiKey: "bad\nkey",
    })));

    expect(missing.status).toBe(400);
    expect(missing.body.code).toBe("API_KEY_REQUIRED");
    expect(invalid.status).toBe(400);
    expect(invalid.body.code).toBe("INVALID_API_KEY");
    expect(mocks.state.renames).toBe(0);
    expect(mocks.state.authWrites).toBe(0);
  });

  it("fails closed when auth.json is unreadable or malformed", async () => {
    mocks.state.authExists = true;
    mocks.state.authContent = "{";
    const status = await GET();

    expect(status.status).toBe(200);
    expect(status.body.credentialStateKnown).toBe(false);
    expect(status.body.warnings).toContain(
      "Command Code auth.json is unreadable or invalid. Repair it before applying or resetting PolyRouter credentials.",
    );

    const changed = await POST(request(applyBody(status.body.revision, {
      authMode: "stored",
      apiKey: "selected-key",
    })));
    expect(changed.status).toBe(409);
    expect(changed.body.code).toBe("AUTH_FILE_UNREADABLE");
    expect(mocks.state.renames).toBe(0);
  });

  it("keyless Apply removes only the stored PolyRouter credential", async () => {
    const stored = await POST(request(applyBody(await getRevision(), {
      models: ["first/model"],
      authMode: "stored",
      apiKey: "stored-key",
    })));
    const auth = JSON.parse(mocks.state.authContent);
    auth.apiKey = "command-code-login";
    auth.other = { type: "api", key: "other-key" };
    mocks.state.authContent = JSON.stringify(auth);
    const revision = await getRevision();

    const response = await POST(request(applyBody(revision, {
      models: ["first/model"],
      authMode: "keyless",
    })));

    expect(stored.status).toBe(200);
    expect(response.status).toBe(200);
    expect(response.body.settings.authMode).toBe("keyless");
    expect(response.body.storedCredential).toBe(false);
    expect(JSON.parse(mocks.state.content).provider.polyrouter.apiKey).toBe(false);
    expect(JSON.parse(mocks.state.authContent)).toEqual({
      apiKey: "command-code-login",
      other: { type: "api", key: "other-key" },
    });
  });

  it("rolls back providers.json when installing auth.json fails", async () => {
    mocks.state.exists = true;
    mocks.state.content = '{"existing":true}';
    mocks.state.authExists = true;
    mocks.state.authContent = JSON.stringify({ apiKey: "command-code-login" });
    const originalConfig = mocks.state.content;
    const originalAuth = mocks.state.authContent;
    mocks.state.failRenameTo = "auth.json";

    const response = await POST(request(applyBody(await getRevision(), {
      authMode: "stored",
      apiKey: "selected-key",
    })));

    expect(response.status).toBe(500);
    expect(mocks.state.content).toBe(originalConfig);
    expect(mocks.state.authContent).toBe(originalAuth);
    expect(mocks.state.locked).toBe(false);
  });


  it("requires explicit adoption before changing a markerless provider", async () => {
    mocks.state.exists = true;
    mocks.state.content = JSON.stringify({
      provider: {
        polyrouter: {
          name: "PolyRouter",
          api: "openai-completions",
          baseURL: "http://127.0.0.1:20128/v1",
          apiKey: false,
          models: { "legacy/model": { name: "legacy/model" } },
        },
      },
    });
    const initial = await GET();

    expect(initial.body.collision).toBe(true);
    const blocked = await POST(request(applyBody(initial.body.revision)));
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe("PROVIDER_ID_CONFLICT");

    const adopted = await POST(request({
      mode: "adopt",
      expectedRevision: initial.body.revision,
    }));
    expect(adopted.status).toBe(200);
    expect(adopted.body.operation).toBe("adopt");
    expect(adopted.body.settings.models).toEqual(["legacy/model"]);
    expect(JSON.parse(mocks.state.content).provider.polyrouter.polyrouterManaged).toBe(true);
  });

  it("applies multiple models once and returns sanitized settings", async () => {
    const revision = await getRevision();

    const response = await POST(request(applyBody(revision, {
      models: ["cc/anthropic/claude-sonnet-5", "combo/fallback", "combo/fallback"],
    })));

    expect(response.status).toBe(200);
    expect(response.body.settings.models).toEqual([
      "cc/anthropic/claude-sonnet-5",
      "combo/fallback",
    ]);
    expect(response.body.message).toContain("2 models");
    expect(mocks.state.renames).toBe(1);
    expect(JSON.stringify(response.body)).not.toContain("apiKey");
  });
});
