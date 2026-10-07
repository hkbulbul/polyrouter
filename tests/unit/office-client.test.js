// polyrouter-client (light office client): config editing and restore.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getTopLevelLine, setTopLevelLine, removeTopLevelKey, getTable, removeTable, appendTable, tomlString,
} from "../../client/src/tools/tomlEdit.js";
import * as claude from "../../client/src/tools/claude.js";
import * as codex from "../../client/src/tools/codex.js";
import { normalizeServerUrl } from "../../client/src/config.js";
import { parseArgs } from "../../client/src/cli.js";

describe("tomlEdit", () => {
  const doc = [
    "# my codex config",
    'model = "gpt-5"',
    'model_provider = "openai"',
    "notes = [",
    '  "[not.a.header]",',
    "  [1, 2],",
    "]",
    'prompt = """',
    "[also.not.a.header]",
    '"""',
    "",
    "[model_providers.openai]",
    'name = "OpenAI"',
    "",
    "[model_providers.polyrouter]",
    'base_url = "old"',
    "",
    "[model_providers.polyrouter.http_headers]",
    'X = "1"',
    "",
    "[profiles.fast]",
    'model = "gpt-5-mini"',
  ].join("\n");

  it("reads top-level keys only (not keys inside tables)", () => {
    expect(getTopLevelLine(doc, "model")).toBe('model = "gpt-5"');
    expect(getTopLevelLine(doc, "model_provider")).toBe('model_provider = "openai"');
    expect(getTopLevelLine(doc, "name")).toBeNull();
  });

  it("ignores [..] inside multi-line arrays and strings", () => {
    expect(getTable(doc, "not.a.header")).toBeNull();
    expect(getTable(doc, "also.not.a.header")).toBeNull();
  });

  it("extracts and removes a table together with its sub-tables", () => {
    expect(getTable(doc, "model_providers.polyrouter")).toBe(
      '[model_providers.polyrouter]\nbase_url = "old"\n\n[model_providers.polyrouter.http_headers]\nX = "1"'
    );
    const removed = removeTable(doc, "model_providers.polyrouter");
    expect(removed).not.toContain("polyrouter");
    expect(removed).toContain("[model_providers.openai]");
    expect(removed).toContain("[profiles.fast]");
  });

  it("sets a top-level key without touching same-named keys in tables", () => {
    const out = setTopLevelLine(doc, "model", 'model = "cc/x"');
    expect(getTopLevelLine(out, "model")).toBe('model = "cc/x"');
    expect(out).toContain('[profiles.fast]\nmodel = "gpt-5-mini"');
    expect(out.match(/^model = /gm)).toHaveLength(2); // top-level + profile
    expect(removeTopLevelKey(out, "model")).toContain('model = "gpt-5-mini"');
  });

  it("appends tables with a single blank-line separator and escapes strings", () => {
    expect(appendTable("a = 1\n\n\n", "[t]\nb = 2")).toBe("a = 1\n\n[t]\nb = 2\n");
    expect(appendTable("", "[t]")).toBe("[t]\n");
    expect(tomlString('C:\\x "q"')).toBe('"C:\\\\x \\"q\\""');
  });
});

describe("tool apply / restore", () => {
  let home;
  let clientHome;
  const prevClientHome = process.env.POLYROUTER_CLIENT_HOME;

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), "prc-home-"));
    clientHome = fs.mkdtempSync(path.join(os.tmpdir(), "prc-state-"));
    process.env.POLYROUTER_CLIENT_HOME = clientHome;
  });

  afterEach(() => {
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(clientHome, { recursive: true, force: true });
    if (prevClientHome === undefined) delete process.env.POLYROUTER_CLIENT_HOME;
    else process.env.POLYROUTER_CLIENT_HOME = prevClientHome;
  });

  const claudeFile = () => path.join(home, ".claude", "settings.json");
  const codexFile = () => path.join(home, ".codex", "config.toml");

  it("claude: writes env, survives re-sync, restores exact originals", () => {
    fs.mkdirSync(path.dirname(claudeFile()), { recursive: true });
    const original = { theme: "dark", env: { ANTHROPIC_BASE_URL: "https://mine.example", OTHER: "keep" } };
    fs.writeFileSync(claudeFile(), JSON.stringify(original));

    claude.apply({ home, serverUrl: "http://office:20128", apiKey: "sk-1" });
    let s = JSON.parse(fs.readFileSync(claudeFile(), "utf8"));
    expect(s.env).toEqual({ ANTHROPIC_BASE_URL: "http://office:20128/v1", ANTHROPIC_AUTH_TOKEN: "sk-1", OTHER: "keep" });
    expect(s.theme).toBe("dark");

    // Second sync with a model must not overwrite the snapshot of originals.
    claude.apply({ home, serverUrl: "http://office:20128", apiKey: "sk-2", model: "cc/sonnet" });
    s = JSON.parse(fs.readFileSync(claudeFile(), "utf8"));
    expect(s.env.ANTHROPIC_AUTH_TOKEN).toBe("sk-2");
    expect(s.env.ANTHROPIC_MODEL).toBe("cc/sonnet");

    expect(claude.restore({ home })).toMatch(/restored/);
    expect(JSON.parse(fs.readFileSync(claudeFile(), "utf8"))).toEqual(original);
    expect(claude.restore({ home })).toBeNull();
  });

  it("claude: does not clobber an unparseable settings file", () => {
    fs.mkdirSync(path.dirname(claudeFile()), { recursive: true });
    fs.writeFileSync(claudeFile(), "{ // comment\n}");
    expect(() => claude.apply({ home, serverUrl: "http://o", apiKey: "k" })).toThrow(/not valid JSON/);
    expect(fs.readFileSync(claudeFile(), "utf8")).toBe("{ // comment\n}");
  });

  it("claude: removes env entirely when it did not exist before", () => {
    claude.apply({ home, serverUrl: "http://o", apiKey: "k" });
    claude.restore({ home });
    expect(JSON.parse(fs.readFileSync(claudeFile(), "utf8"))).toEqual({});
  });

  it("codex: configures provider and restores the original file content", () => {
    fs.mkdirSync(path.dirname(codexFile()), { recursive: true });
    const original = 'model = "gpt-5"\nmodel_provider = "openai"\n\n[model_providers.openai]\nname = "OpenAI"\n';
    fs.writeFileSync(codexFile(), original);

    codex.apply({ home, serverUrl: "http://office:20128", apiKey: "sk-1" });
    let text = fs.readFileSync(codexFile(), "utf8");
    expect(getTopLevelLine(text, "model_provider")).toBe('model_provider = "polyrouter"');
    expect(getTopLevelLine(text, "model")).toBe('model = "gpt-5"');
    expect(getTable(text, "model_providers.polyrouter")).toContain('base_url = "http://office:20128/v1"');
    expect(text).toContain('experimental_bearer_token = "sk-1"');
    expect(text).toContain("[model_providers.openai]");

    codex.apply({ home, serverUrl: "http://office:20128", apiKey: "sk-2", model: "cx/gpt-5-codex" });
    text = fs.readFileSync(codexFile(), "utf8");
    expect(text.match(/\[model_providers\.polyrouter\]/g)).toHaveLength(1);
    expect(getTopLevelLine(text, "model")).toBe('model = "cx/gpt-5-codex"');

    codex.restore({ home });
    text = fs.readFileSync(codexFile(), "utf8");
    expect(getTopLevelLine(text, "model")).toBe('model = "gpt-5"');
    expect(getTopLevelLine(text, "model_provider")).toBe('model_provider = "openai"');
    expect(text).not.toContain("polyrouter");
    expect(text).toContain('[model_providers.openai]\nname = "OpenAI"');
  });

  it("codex: works from no config file and restores to empty", () => {
    codex.apply({ home, serverUrl: "http://o", apiKey: "k" });
    const text = fs.readFileSync(codexFile(), "utf8");
    expect(text.startsWith('model_provider = "polyrouter"\n')).toBe(true);
    codex.restore({ home });
    expect(fs.readFileSync(codexFile(), "utf8")).toBe("");
  });
});

describe("cli helpers", () => {
  it("normalizes pasted server URLs", () => {
    expect(normalizeServerUrl("192.168.1.10:20128")).toBe("http://192.168.1.10:20128");
    expect(normalizeServerUrl("https://ai.acme.com/portal/login")).toBe("https://ai.acme.com");
    expect(normalizeServerUrl("http://host:20128/v1/")).toBe("http://host:20128");
    expect(normalizeServerUrl("http://host:20128/dashboard/office")).toBe("http://host:20128");
    expect(() => normalizeServerUrl("")).toThrow();
  });

  it("parses flags and positionals", () => {
    expect(parseArgs(["connect", "http://h", "--email", "a@b.c", "--tools=claude", "--no-tools"])).toEqual({
      _: ["connect", "http://h"],
      email: "a@b.c",
      tools: "claude",
      noTools: true,
    });
    expect(parseArgs(["sync", "--codex-model", "cx/m"]).codexModel).toBe("cx/m");
    expect(() => parseArgs(["connect", "--email"])).toThrow(/needs a value/);
  });
});
