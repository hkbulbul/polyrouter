import { describe, expect, it } from "vitest";
import {
  DSH_CREDENTIAL_REF,
  applyHarnessDocuments,
  getDshExecutableCandidates,
  getDshExecutableNames,
  getDshSearchPathEntries,
  inspectHarnessConfig,
  normalizeBaseUrl,
  parseHarnessCredentials,
  parseHarnessSettings,
  resetHarnessDocuments,
  resolveDshHome,
} from "../../src/lib/deepseekHarnessConfig.js";

const env = {};

describe("deepseekHarnessConfig", () => {
  it("resolves the single-root Harness home on Windows and macOS", () => {
    expect(resolveDshHome({ DSH_HOME: "~/custom-dsh" }, "C:/work", "win32")).toMatch(/custom-dsh$/);
    expect(resolveDshHome({ DSH_HOME: "  " }, "C:/work", "darwin")).toMatch(/\.dsh$/);
    expect(resolveDshHome({ DSH_HOME: "C:\\Users\\tester\\.dsh" }, "C:/work", "win32")).toMatch(/tester[\\/]\.dsh$/);
  });

  it("normalizes local and remote endpoints", () => {
    expect(normalizeBaseUrl("http://127.0.0.1:20128///")).toBe("http://127.0.0.1:20128/v1");
    expect(normalizeBaseUrl("https://router.example/api///")).toBe("https://router.example/api/v1");
    expect(() => normalizeBaseUrl("http://router.example")).toThrow(expect.objectContaining({ code: "INSECURE_REMOTE_HTTP" }));
  });

  it("augments Windows PATH with npm global bins and removes duplicates", () => {
    const entries = getDshSearchPathEntries({
      platform: "win32",
      home: "C:/Users/tester",
      env: {
        Path: "C:/Windows/System32;C:/Users/tester/AppData/Roaming/npm",
        APPDATA: "C:/Users/tester/AppData/Roaming",
        LOCALAPPDATA: "C:/Users/tester/AppData/Local",
        npm_config_prefix: "C:/Users/tester/AppData/Roaming/npm",
      },
    });
    expect(entries[0]).toBe("C:/Windows/System32");
    expect(entries.filter((entry) => entry.toLowerCase() === "c:/users/tester/appdata/roaming/npm")).toHaveLength(1);
    expect(entries).toContain("C:\\Users\\tester\\AppData\\Local\\npm");
    expect(entries).toContain("C:\\Users\\tester\\AppData\\Local\\pnpm");
    expect(entries).toContain("C:\\Users\\tester\\AppData\\Roaming\\npm\\node_modules\\.bin");
    expect(getDshExecutableNames("win32")).toEqual(["dsh.cmd", "dsh.exe", "dsh"]);
    expect(getDshExecutableCandidates({
      platform: "win32",
      home: "C:/Users/tester",
      env: { APPDATA: "C:/Users/tester/AppData/Roaming", PATH: "" },
    })[0]).toBe("C:\\Users\\tester\\AppData\\Roaming\\npm\\dsh.cmd");
  });

  it("normalizes multiple models and preserves metadata for existing entries", () => {
    const result = applyHarnessDocuments({
      settingsText: "",
      credentialsText: "version: 1\nrefs:\n  OTHER_KEY: other\nrecords: {}\n",
      baseUrl: "http://127.0.0.1:20128",
      models: ["cc/first", " cc/second ", "cc/first"],
      apiKey: "sk_test_secret",
      env,
    });
    expect(result.state.models).toEqual(["cc/first", "cc/second"]);
    expect(result.state.model).toBe("cc/first");
    expect(result.state.defaultModel.model).toBe("cc/first");
    const settings = parseHarnessSettings(result.settingsText).value;
    expect(settings["llm-pi-ai"].providers.polyrouter.models.map((entry) => entry.id)).toEqual(["cc/first", "cc/second"]);
  });

  it("creates the DSH provider route and credential reference without putting a key in settings", () => {
    const result = applyHarnessDocuments({
      settingsText: "# existing\nother: value\n",
      credentialsText: "version: 1\nrefs:\n  OTHER_KEY: other\nrecords: {}\n",
      metadataText: "",
      baseUrl: "http://127.0.0.1:20128",
      model: "cc/claude-sonnet-5",
      apiKey: "sk_test_secret",
      env,
    });
    expect(result.settingsText).toContain("apiKeyEnv: POLYROUTER_API_KEY");
    expect(result.settingsText).not.toContain("sk_test_secret");
    expect(result.credentialsText).toContain(`${DSH_CREDENTIAL_REF}: sk_test_secret`);
    expect(result.credentialsText).toContain("OTHER_KEY: other");
    expect(result.state.model).toBe("cc/claude-sonnet-5");
  });

  it("accepts the current Harness credentials document with records and no refs", () => {
    const parsed = parseHarnessCredentials("version: 1\nrecords:\n  client-connection/browser-session:\n    kind: grant\n");
    expect(parsed.value.refs).toEqual({});
    expect(parsed.value.records["client-connection/browser-session"].kind).toBe("grant");
  });

  it("applies the provider route using an inherited credential without changing the credential file", () => {
    const credentialsText = "version: 1\nrefs:\n  OTHER_KEY: other\nrecords:\n  client-connection/browser-session:\n    kind: grant\n";
    const result = applyHarnessDocuments({
      settingsText: "",
      credentialsText,
      baseUrl: "http://127.0.0.1:20128",
      model: "cc/environment-model",
      credentialMode: "environment",
      env: { POLYROUTER_API_KEY: "sk_environment_secret" },
    });

    expect(result.credentialsText).toBe(credentialsText);
    expect(result.settingsText).toContain("id: cc/environment-model");
    expect(result.state.credentialSource).toBe("environment");
    expect(JSON.stringify(result.state)).not.toContain("sk_environment_secret");
  });

  it("preserves comments and rejects malformed documents", () => {
    expect(parseHarnessSettings("# keep\nfoo: bar\n").doc.toString()).toContain("# keep");
    expect(() => parseHarnessSettings("foo: [")).toThrow(expect.objectContaining({ code: "INVALID_SETTINGS" }));
    expect(() => parseHarnessCredentials("version: 2\nrefs: {}\nrecords: {}\n")).toThrow(expect.objectContaining({ code: "INVALID_CREDENTIALS" }));
  });

  it("redacts credentials from inspection and reports environment precedence", () => {
    const settings = "llm-pi-ai:\n  providers:\n    polyrouter:\n      api: openai-completions\n      apiKeyEnv: POLYROUTER_API_KEY\n      baseURL: http://127.0.0.1:20128/v1\n      models:\n        - id: cc/test\n";
    const credentials = "version: 1\nrefs:\n  POLYROUTER_API_KEY: sk_secret\nrecords: {}\n";
    const result = inspectHarnessConfig({ settingsText: settings, credentialsText: credentials, env: { POLYROUTER_API_KEY: "sk_env" } });
    expect(JSON.stringify(result)).not.toContain("sk_secret");
    expect(JSON.stringify(result)).not.toContain("sk_env");
    expect(result.credentialSource).toBe("environment");
    expect(result.warnings.join(" ")).toContain("takes precedence");
  });

  it("resets only the owned route and credential", () => {
    const applied = applyHarnessDocuments({ baseUrl: "http://127.0.0.1:20128", model: "cc/test", apiKey: "sk_test", env });
    const reset = resetHarnessDocuments({ ...applied, env });
    expect(reset.settingsText).not.toContain("polyrouter:");
    expect(reset.credentialsText).not.toContain(DSH_CREDENTIAL_REF);
  });
});
