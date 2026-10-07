// polyrouter-client — sign in to an office PolyRouter and wire up local AI tools.
import os from "node:os";
import { api, ApiError } from "./api.js";
import { readConfig, writeConfig, deleteConfig, normalizeServerUrl } from "./config.js";
import { ask, askHidden } from "./prompt.js";
import { TOOLS, selectTools } from "./tools/index.js";
import * as codexTool from "./tools/codex.js";
import { getSnapshot } from "./tools/snapshot.js";

const HELP = `polyrouter-client — use your office PolyRouter from this computer

Usage:
  polyrouter-client connect <server-url> [options]   Sign in and configure your AI tools
  polyrouter-client status                           Your limits and usage
  polyrouter-client sync [options]                   Refresh your key and rewrite tool configs
  polyrouter-client env [--shell bash|powershell|cmd] Print environment variables for other tools
  polyrouter-client disconnect                       Restore original tool configs and sign out

Options:
  --email <email>          Skip the email prompt
  --tools <list>           Tools to configure: ${TOOLS.map((t) => t.id).join(",")} (default: those installed)
  --claude-model <model>   Model for Claude Code (ANTHROPIC_MODEL)
  --codex-model <model>    Model for Codex
  --no-tools               Only sign in; don't touch any tool config

The server URL is the one your admin shared, e.g. http://192.168.1.10:20128.
Credentials are your office email and password (from the employee portal).`;

export function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--no-tools") args.noTools = true;
    else if (a === "-h" || a === "--help") args.help = true;
    else if (a.startsWith("--")) {
      const [name, inline] = a.slice(2).split("=", 2);
      const value = inline !== undefined ? inline : argv[i + 1];
      if (inline === undefined) i += 1;
      if (value === undefined || value.startsWith("--")) throw new Error(`--${name} needs a value`);
      args[name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
    } else args._.push(a);
  }
  return args;
}

function requireConfig() {
  const config = readConfig();
  if (!config?.serverUrl || !config?.deviceToken) {
    throw new Error("Not connected. Run: polyrouter-client connect <server-url>");
  }
  return config;
}

function explain(error, serverUrl) {
  if (!(error instanceof ApiError)) return error;
  if (error.code === "password_change_required") {
    return new Error(`${error.message}\nOpen ${serverUrl}/portal in your browser, sign in and set your password.`);
  }
  if (error.status === 401 && /signed out|device/i.test(error.message)) {
    return new Error(`${error.message} Run: polyrouter-client connect ${serverUrl}`);
  }
  return error;
}

async function configureTools(config, args, apiKey) {
  if (args.noTools) return [];
  const home = os.homedir();
  const tools = selectTools(home, args.tools || config.tools);
  const results = [];
  for (const tool of tools) {
    const model = tool.id === "claude" ? args.claudeModel || config.models?.claude : tool.id === "codex" ? args.codexModel || config.models?.codex : undefined;
    try {
      results.push({ tool, ok: true, detail: tool.apply({ home, serverUrl: config.serverUrl, apiKey, model }) });
    } catch (error) {
      results.push({ tool, ok: false, detail: error.message });
    }
  }
  return results;
}

function printToolResults(results) {
  if (!results.length) {
    console.log("\nNo supported tools detected (Claude Code, Codex). Use `polyrouter-client env` for other tools.");
    return;
  }
  console.log("\nConfigured:");
  for (const r of results) console.log(`  ${r.ok ? "✔" : "✖"} ${r.tool.label}: ${r.detail}`);
}

async function warnAboutModels(config, apiKey, args, results) {
  try {
    const { data = [] } = await api.models(config.serverUrl, apiKey);
    const ids = data.map((m) => m.id);
    const chosen = [args.claudeModel, args.codexModel].filter(Boolean);
    const unknown = chosen.filter((m) => !ids.includes(m));
    if (unknown.length) console.log(`\n⚠ Not in your allowed model list: ${unknown.join(", ")}`);
    // Codex keeps its own `model`; it must be one this office serves.
    const codexConfigured = results.some((r) => r.ok && r.tool.id === "codex");
    const codexModel = codexConfigured ? codexTool.currentModel(os.homedir()) : null;
    if (codexConfigured && ids.length && (!codexModel || !ids.includes(codexModel))) {
      console.log(`\n⚠ Codex is set to model "${codexModel || "(none)"}", which is not in your list. Pick one with:`);
      console.log("  polyrouter-client sync --codex-model <model>");
    }
    if (ids.length) console.log(`\n${ids.length} models available to you, e.g. ${ids.slice(0, 5).join(", ")}${ids.length > 5 ? ", …" : ""}`);
  } catch {}
}

async function connect(args) {
  const serverUrl = normalizeServerUrl(args._[1] || (await ask("PolyRouter server URL")));
  const email = args.email || (await ask("Office email"));
  const password = await askHidden("Password");
  if (!email || !password) throw new Error("Email and password are required");

  const previous = readConfig();
  if (previous?.deviceToken) {
    // Replacing a session: sign the old device out (best effort). Tool snapshots
    // are kept, so disconnect still restores the true originals.
    await api.logout(previous.serverUrl, previous.deviceToken).catch(() => {});
  }

  let login;
  try {
    login = await api.login(serverUrl, { email, password, deviceName: os.hostname(), platform: process.platform });
  } catch (error) {
    throw explain(error, serverUrl);
  }

  const config = {
    serverUrl,
    email: login.user.email,
    deviceId: login.deviceId,
    deviceToken: login.deviceToken,
    orgName: login.office?.orgName || "",
    tools: args.tools || previous?.tools || null,
    models: { claude: args.claudeModel || previous?.models?.claude, codex: args.codexModel || previous?.models?.codex },
  };
  writeConfig(config);
  console.log(`\n✔ Signed in to ${config.orgName || serverUrl} as ${config.email}`);

  const results = await configureTools(config, args, login.apiKey);
  printToolResults(results);
  await warnAboutModels(config, login.apiKey, args, results);
  console.log("\nRestart your AI tools to pick up the new settings. Check your limits any time with: polyrouter-client status");
  return 0;
}

async function sync(args) {
  const config = requireConfig();
  let key;
  try {
    key = await api.key(config.serverUrl, config.deviceToken);
  } catch (error) {
    throw explain(error, config.serverUrl);
  }
  if (args.tools) config.tools = args.tools;
  if (args.claudeModel || args.codexModel) {
    config.models = { ...config.models, ...(args.claudeModel && { claude: args.claudeModel }), ...(args.codexModel && { codex: args.codexModel }) };
  }
  writeConfig(config);
  if (key.rotated) console.log("✔ Your previous key had expired or was removed — a new one was issued.");
  const results = await configureTools(config, args, key.apiKey);
  printToolResults(results);
  await warnAboutModels(config, key.apiKey, args, results);
  return 0;
}

function bar(percent) {
  const filled = Math.round(Math.min(100, percent) / 10);
  return `[${"#".repeat(filled)}${"-".repeat(10 - filled)}]`;
}

function fmt(unit, n) {
  if (unit === "usd") return `$${Number(n || 0).toFixed(2)}`;
  return new Intl.NumberFormat().format(Math.round(Number(n) || 0));
}

function describeRestrictions(l) {
  const out = [];
  if (l.allowedModels?.length) out.push(`Allowed models: ${l.allowedModels.join(", ")}`);
  if (l.blockedModels?.length) out.push(`Blocked models: ${l.blockedModels.join(", ")}`);
  if (Array.isArray(l.allowedKinds)) out.push(`Allowed request types: ${l.allowedKinds.length ? l.allowedKinds.join(", ") : "none"}`);
  if (l.maxConcurrent) out.push(`Max ${l.maxConcurrent} requests at once`);
  if (l.maxInputTokens) out.push(`Max input ≈${fmt("tokens", l.maxInputTokens)} tokens per request`);
  if (l.maxOutputTokens) out.push(`Max output ${fmt("tokens", l.maxOutputTokens)} tokens per request`);
  if (l.allowedHours) out.push(`Allowed hours ${l.allowedHours.start}–${l.allowedHours.end} (server time)`);
  if (l.onLimit === "fallback" && l.fallbackModel) out.push(`When a budget runs out, chat switches to ${l.fallbackModel}`);
  return out;
}

async function status() {
  const config = requireConfig();
  let me;
  try {
    me = await api.me(config.serverUrl, config.deviceToken);
  } catch (error) {
    throw explain(error, config.serverUrl);
  }
  console.log(`${me.office?.orgName || config.serverUrl} — ${me.user.name || me.user.email}${me.user.team ? ` (${me.user.team.name})` : ""}`);
  console.log(`Server: ${config.serverUrl}   Device: ${me.device?.name || os.hostname()}`);
  console.log(`Policy: ${me.policy.name}${me.policy.source !== "none" ? ` (${me.policy.source})` : ""}\n`);
  if (!me.limitStatus.length) console.log("No usage caps.");
  for (const row of me.limitStatus) {
    console.log(`${bar(row.percent)} ${String(row.percent).padStart(3)}%  ${row.label}: ${fmt(row.unit, row.used)} / ${fmt(row.unit, row.limit)}`);
  }
  for (const line of describeRestrictions(me.policy.limits || {})) console.log(`• ${line}`);
  const usageLine = (u) => `$${u.cost.toFixed(2)} · ${fmt("tokens", u.tokens)} tokens · ${u.requests} request${u.requests === 1 ? "" : "s"}`;
  console.log(`\nToday:      ${usageLine(me.usage.day)}`);
  console.log(`This month: ${usageLine(me.usage.month)}`);
  const connected = TOOLS.filter((t) => getSnapshot(t.id)).map((t) => t.label);
  console.log(`\nConfigured tools: ${connected.length ? connected.join(", ") : "none"}`);
  return 0;
}

async function env(args) {
  const config = requireConfig();
  const { apiKey } = await api.key(config.serverUrl, config.deviceToken).catch((error) => {
    throw explain(error, config.serverUrl);
  });
  const vars = {
    OPENAI_BASE_URL: `${config.serverUrl}/v1`,
    OPENAI_API_KEY: apiKey,
    ANTHROPIC_BASE_URL: `${config.serverUrl}/v1`,
    ANTHROPIC_AUTH_TOKEN: apiKey,
  };
  const shell = args.shell || (process.platform === "win32" ? "powershell" : "bash");
  for (const [k, v] of Object.entries(vars)) {
    if (shell === "powershell") console.log(`$env:${k} = "${v}"`);
    else if (shell === "cmd") console.log(`set ${k}=${v}`);
    else console.log(`export ${k}="${v}"`);
  }
  return 0;
}

async function disconnect() {
  const config = readConfig();
  const home = os.homedir();
  for (const tool of TOOLS) {
    try {
      const msg = tool.restore({ home });
      if (msg) console.log(`✔ ${tool.label}: ${msg}`);
    } catch (error) {
      console.log(`✖ ${tool.label}: ${error.message}`);
    }
  }
  if (config?.deviceToken) {
    await api.logout(config.serverUrl, config.deviceToken).then(
      () => console.log("✔ Signed this device out"),
      () => console.log("⚠ Could not reach the server to sign out; your admin can revoke this device.")
    );
  }
  deleteConfig();
  console.log("Disconnected.");
  return 0;
}

export async function main(argv) {
  const args = parseArgs(argv);
  const command = args._[0];
  if (args.help || !command || command === "help") {
    console.log(HELP);
    return 0;
  }
  switch (command) {
    case "connect":
    case "login":
      return connect(args);
    case "sync":
      return sync(args);
    case "status":
      return status();
    case "env":
      return env(args);
    case "disconnect":
    case "logout":
      return disconnect();
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(HELP);
      return 1;
  }
}
