import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state = {
    content: "{}",
    exists: false,
    authContent: "{}",
    authExists: false,
    authError: null,
    mode: 0o600,
    temporaryContent: "",
    renames: 0,
    locked: false,
    afterSync: null,
  };
  const enoent = () => Object.assign(new Error("ENOENT"), { code: "ENOENT" });

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
        if (String(filePath).endsWith("providers.json")) {
          if (!state.exists) throw enoent();
          return state.content;
        }
        if (String(filePath).endsWith("auth.json")) {
          if (state.authError) throw state.authError;
          if (!state.authExists) throw enoent();
          return state.authContent;
        }
        throw enoent();
      }),
      stat: vi.fn(async (filePath) => {
        if (!String(filePath).endsWith("providers.json") || !state.exists) throw enoent();
        return { mode: state.mode };
      }),
      realpath: vi.fn(async () => { throw enoent(); }),
      mkdir: vi.fn(async (filePath) => {
        if (!String(filePath).endsWith(".polyrouter.lock")) return;
        if (state.locked) {
          throw Object.assign(new Error("EEXIST"), { code: "EEXIST" });
        }
        state.locked = true;
      }),
      open: vi.fn(async () => ({
        writeFile: vi.fn(async (content) => { state.temporaryContent = content; }),
        chmod: vi.fn(async () => undefined),
        sync: vi.fn(async () => { await state.afterSync?.(); }),
        close: vi.fn(async () => undefined),
      })),
      rename: vi.fn(async () => {
        state.content = state.temporaryContent;
        state.exists = true;
        state.renames += 1;
      }),
      chmod: vi.fn(async () => undefined),
      unlink: vi.fn(async () => undefined),
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
  mocks.state.temporaryContent = "";
  mocks.state.renames = 0;
  mocks.state.locked = false;
  mocks.state.afterSync = null;
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
      "PolyRouter now requires an API key. Choose environment authentication and click Apply.",
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
    expect(response.body.warnings).toContain(
      "Command Code has a stored polyrouter credential. It overrides providers.json authentication; clear or replace it through /connect before changing the endpoint or authentication.",
    );
    expect(JSON.stringify(response.body)).not.toContain("secret");
  });

  it("fails closed for endpoint and authentication changes when auth.json is unreadable", async () => {
    const created = await POST(request(applyBody(await getRevision(), {
      models: ["first/model"],
      authMode: "environment",
    })));
    mocks.state.authError = Object.assign(new Error("EACCES"), { code: "EACCES" });

    const status = await GET();
    expect(status.status).toBe(200);
    expect(status.body.storedCredential).toBe(false);
    expect(status.body.credentialStateKnown).toBe(false);
    expect(status.body.warnings).toContain(
      "Command Code auth.json could not be inspected. Endpoint and authentication changes are blocked until the file is readable.",
    );

    const changed = await POST(request(applyBody(created.body.revision, {
      baseUrl: "https://router.example/v1",
      models: ["first/model"],
      authMode: "environment",
    })));
    expect(changed.status).toBe(409);
    expect(changed.body.code).toBe("STORED_CREDENTIAL_CONFLICT");
  });

  it("blocks endpoint or authentication changes while a stored credential overrides them", async () => {
    const configured = JSON.parse((await POST(request(applyBody(await getRevision(), {
      models: ["first/model"],
      authMode: "environment",
    })))).body.settings ? mocks.state.content : "{}");
    expect(configured.provider.polyrouter.apiKey).toBe("$POLYROUTER_API_KEY");
    mocks.state.authExists = true;
    mocks.state.authContent = JSON.stringify({
      polyrouter: { type: "api", key: "stored-polyrouter-secret" },
    });

    const revision = await getRevision();
    const endpointChange = await POST(request(applyBody(revision, {
      baseUrl: "https://router.example/v1",
      models: ["first/model"],
      authMode: "environment",
    })));
    const authChange = await POST(request(applyBody(revision, {
      models: ["first/model"],
      authMode: "keyless",
    })));

    expect(endpointChange.status).toBe(409);
    expect(endpointChange.body.code).toBe("STORED_CREDENTIAL_CONFLICT");
    expect(authChange.status).toBe(409);
    expect(authChange.body.code).toBe("STORED_CREDENTIAL_CONFLICT");
    expect(mocks.state.renames).toBe(1);
  });

  it("allows models-only Apply when a stored credential exists", async () => {
    const created = await POST(request(applyBody(await getRevision(), {
      models: ["first/model"],
      authMode: "environment",
    })));
    mocks.state.authExists = true;
    mocks.state.authContent = JSON.stringify({
      polyrouter: { type: "api", key: "stored-polyrouter-secret" },
    });

    const response = await POST(request(applyBody(created.body.revision, {
      models: ["first/model", "second/model"],
      authMode: "environment",
    })));

    expect(response.status).toBe(200);
    expect(response.body.storedCredential).toBe(true);
    expect(response.body.settings.models).toEqual(["first/model", "second/model"]);
    expect(JSON.stringify(response.body)).not.toContain("secret");
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
