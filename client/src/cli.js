// polyrouter-client — sign in to an office PolyRouter and wire up local AI tools.
import os from "node:os";
import path from "node:path";
import { api, ApiError } from "./api.js";
import { readConfig, writeConfig, deleteConfig, normalizeServerUrl } from "./config.js";
import { ask, askHidden } from "./prompt.js";
import { TOOLS, selectTools } from "./tools/index.js";
import * as codexTool from "./tools/codex.js";
import { getSnapshot } from "./tools/snapshot.js";
import { c, sym, header, section, success, failure, warn, info, note, keyValues, bar, table, spin } from "./ui.js";

const CMD = "polyrouter-client";

function help() {
  header("PolyRouter client", "use your office PolyRouter from this computer");
  section("Usage");
  const cmds = [
    ["connect <server-url>", "Sign in and configure your AI tools"],
    ["status", "Your limits and usage"],
    ["sync", "Refresh your key and rewrite tool configs"],
    ["env [--shell bash|powershell|cmd]", "Print environment variables for other tools"],
    ["disconnect", "Restore original tool configs and sign out"],
  ];
  keyValues(cmds.map(([cmd, desc]) => [c.cyan(`${CMD} ${cmd}`), desc]));
  section("Options");
  keyValues([
    ["--email <email>", "Skip the email prompt"],
    ["--tools <list>", `Tools to configure: ${TOOLS.map((t) => t.id).join(", ")} (default: those installed)`],
    ["--claude-model <model>", "Model for Claude Code (ANTHROPIC_MODEL)"],
    ["--codex-model <model>", "Model for Codex"],
    ["--no-tools", "Only sign in; don't touch any tool config"],
  ]);
  console.log();
  note("  The server URL is the one your admin shared, e.g. http://192.168.1.10:20128.");
  note("  Sign in with your office email and password (the same as the employee portal).\n");
}

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
      args[name.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase())] = value;
    } else args._.push(a);
  }
  return args;
}

// Show paths under the home directory as ~/… (path.relative copes with
// Windows slash and drive-letter case differences).
const tildify = (file) => {
  if (!file) return file;
  const rel = path.relative(path.resolve(os.homedir()), path.resolve(file));
  return rel && !rel.startsWith("..") && !path.isAbsolute(rel) ? `~${path.sep}${rel}` : file;
};

const POLICY_SOURCES = { user: "assigned to you", team: "from your team", default: "office default" };

const fmtNum = (n) => new Intl.NumberFormat().format(Math.round(Number(n) || 0));
const fmtUsd = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtVal = (unit, n) => (unit === "usd" ? fmtUsd(n) : fmtNum(n));
const plural = (n, word) => `${fmtNum(n)} ${word}${n === 1 ? "" : "s"}`;

function requireConfig() {
  const config = readConfig();
  if (!config?.serverUrl || !config?.deviceToken) {
    throw new Error(`Not connected. Run: ${CMD} connect <server-url>`);
  }
  return config;
}

function explain(error, serverUrl) {
  if (!(error instanceof ApiError)) return error;
  if (error.code === "password_change_required") {
    return new Error(`${error.message}\n  Open ${serverUrl}/portal in your browser, sign in and set your password.`);
  }
  if (error.status === 401 && /signed out|device/i.test(error.message)) {
    return new Error(`${error.message}\n  Run: ${CMD} connect ${serverUrl}`);
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
      results.push({ tool, ok: true, ...tool.apply({ home, serverUrl: config.serverUrl, apiKey, model }) });
    } catch (error) {
      results.push({ tool, ok: false, error: error.message });
    }
  }
  return results;
}

function printToolResults(results, args) {
  section("Tools");
  if (args.noTools) {
    note("  Skipped (--no-tools).");
    return;
  }
  if (!results.length) {
    note(`  No Claude Code or Codex install found. Use \`${CMD} env\` to configure other tools.`);
    return;
  }
  const width = Math.max(...results.map((r) => r.tool.label.length));
  for (const r of results) {
    const label = r.tool.label.padEnd(width);
    if (r.ok) console.log(`  ${c.green(sym.ok)} ${c.bold(label)}  ${c.gray(tildify(r.file))}`);
    else console.log(`  ${c.red(sym.err)} ${c.bold(label)}  ${c.red(r.error)}`);
  }
}

async function reportModels(config, apiKey, args, results) {
  let ids = [];
  try {
    ({ data: ids = [] } = await api.models(config.serverUrl, apiKey));
    ids = ids.map((m) => m.id);
  } catch {
    return;
  }
  const unknown = [args.claudeModel, args.codexModel].filter(Boolean).filter((m) => !ids.includes(m));
  // Codex keeps its own `model`; it must be one this office serves.
  const codexConfigured = results.some((r) => r.ok && r.tool.id === "codex");
  const codexModel = codexConfigured ? codexTool.currentModel(os.homedir()) : null;
  const codexMismatch = codexConfigured && ids.length && (!codexModel || !ids.includes(codexModel));

  section("Models");
  if (ids.length) {
    console.log(`  ${plural(ids.length, "model")} available to you, e.g. ${c.cyan(ids.slice(0, 4).join(", "))}${ids.length > 4 ? c.gray(", …") : ""}`);
  } else {
    note("  Your policy doesn't allow any models right now — ask your admin.");
  }
  if (unknown.length) warn(`Not in your allowed list: ${unknown.join(", ")}`);
  if (codexMismatch) {
    warn(`Codex is set to model ${c.bold(codexModel || "(none)")}, which this office doesn't serve. Pick one with:`);
    console.log(`    ${c.cyan(`${CMD} sync --codex-model <model>`)}`);
  }
}

function nextSteps() {
  section("Next");
  console.log(`  ${c.gray(sym.arrow)} Restart your AI tools to pick up the new settings`);
  console.log(`  ${c.gray(sym.arrow)} ${c.cyan(`${CMD} status`)}      see your limits and usage`);
  console.log(`  ${c.gray(sym.arrow)} ${c.cyan(`${CMD} disconnect`)}  restore your original configs\n`);
}

async function connect(args) {
  header("PolyRouter client", "connect this computer");
  console.log();
  const serverUrl = normalizeServerUrl(args._[1] || (await ask("  Server URL")));
  if (args._[1]) note(`  Server  ${serverUrl}`);
  const email = args.email || (await ask("  Work email"));
  if (args.email) note(`  Email   ${email}`);
  const password = await askHidden("  Password");
  if (!email || !password) throw new Error("Email and password are required");

  const previous = readConfig();
  if (previous?.deviceToken) {
    // Replacing a session: sign the old device out (best effort). Tool snapshots
    // are kept, so disconnect still restores the true originals.
    await api.logout(previous.serverUrl, previous.deviceToken).catch(() => {});
  }

  let login;
  try {
    login = await spin("Signing in…", () =>
      api.login(serverUrl, { email, password, deviceName: os.hostname(), platform: process.platform })
    );
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
  console.log();
  success(`Signed in to ${c.bold(config.orgName || serverUrl)} as ${c.bold(config.email)}`);
  note(`  This computer is registered as "${os.hostname()}".`);

  const results = await configureTools(config, args, login.apiKey);
  printToolResults(results, args);
  await reportModels(config, login.apiKey, args, results);
  nextSteps();
  return results.some((r) => !r.ok) ? 1 : 0;
}

async function sync(args) {
  const config = requireConfig();
  header("PolyRouter client", "sync");
  let key;
  try {
    key = await spin("Refreshing your key…", () => api.key(config.serverUrl, config.deviceToken));
  } catch (error) {
    throw explain(error, config.serverUrl);
  }
  if (args.tools) config.tools = args.tools;
  if (args.claudeModel || args.codexModel) {
    config.models = { ...config.models, ...(args.claudeModel && { claude: args.claudeModel }), ...(args.codexModel && { codex: args.codexModel }) };
  }
  writeConfig(config);
  console.log();
  if (key.rotated) success("Your previous key had expired or was removed — a new one was issued.");
  else success("Your key is valid.");
  const results = await configureTools(config, args, key.apiKey);
  printToolResults(results, args);
  await reportModels(config, key.apiKey, args, results);
  console.log();
  return results.some((r) => !r.ok) ? 1 : 0;
}

function describeRestrictions(l) {
  const out = [];
  if (l.allowedModels?.length) out.push(`Allowed models: ${l.allowedModels.join(", ")}`);
  if (l.blockedModels?.length) out.push(`Blocked models: ${l.blockedModels.join(", ")}`);
  if (Array.isArray(l.allowedKinds)) out.push(`Allowed request types: ${l.allowedKinds.length ? l.allowedKinds.join(", ") : "none"}`);
  if (l.maxConcurrent) out.push(`At most ${l.maxConcurrent} requests at once`);
  if (l.maxInputTokens) out.push(`Max input ≈${fmtNum(l.maxInputTokens)} tokens per request`);
  if (l.maxOutputTokens) out.push(`Max output ${fmtNum(l.maxOutputTokens)} tokens per request`);
  if (l.allowedHours) out.push(`Allowed ${l.allowedHours.start}–${l.allowedHours.end} (server time)`);
  if (l.onLimit === "fallback" && l.fallbackModel) out.push(`When a budget runs out, chat switches to ${l.fallbackModel}`);
  return out;
}

async function status() {
  const config = requireConfig();
  let me;
  try {
    me = await spin("Loading…", () => api.me(config.serverUrl, config.deviceToken));
  } catch (error) {
    throw explain(error, config.serverUrl);
  }
  header(me.office?.orgName || "PolyRouter", config.serverUrl);
  console.log();
  keyValues([
    ["Account", `${c.bold(me.user.name || me.user.email)}${me.user.name ? c.gray(`  ${me.user.email}`) : ""}`],
    ["Team", me.user.team?.name || c.gray("—")],
    ["Policy", `${me.policy.name}${POLICY_SOURCES[me.policy.source] ? c.gray(`  ${POLICY_SOURCES[me.policy.source]}`) : ""}`],
    ["Device", me.device?.name || os.hostname()],
  ]);

  section("Limits");
  const restrictions = describeRestrictions(me.policy.limits || {});
  if (!me.limitStatus.length && !restrictions.length) note("  No limits — use AI as you need.");
  if (me.limitStatus.length) {
    const width = Math.max(...me.limitStatus.map((r) => r.label.length));
    for (const row of me.limitStatus) {
      const pct = `${String(row.percent).padStart(3)}%`;
      console.log(`  ${row.label.padEnd(width)}  ${bar(row.percent)} ${pct}  ${c.gray(`${fmtVal(row.unit, row.used)} / ${fmtVal(row.unit, row.limit)}`)}`);
    }
  }
  for (const line of restrictions) console.log(`  ${c.gray(sym.bullet)} ${line}`);

  section("Usage");
  table(
    ["", "Spend", "Tokens", "Requests"],
    [
      ["Today", fmtUsd(me.usage.day.cost), fmtNum(me.usage.day.tokens), fmtNum(me.usage.day.requests)],
      ["This month", fmtUsd(me.usage.month.cost), fmtNum(me.usage.month.tokens), fmtNum(me.usage.month.requests)],
    ]
  );

  section("Tools");
  for (const tool of TOOLS) {
    const on = Boolean(getSnapshot(tool.id));
    console.log(`  ${on ? c.green(sym.ok) : c.gray(sym.dot)} ${tool.label}${on ? "" : c.gray("  not configured")}`);
  }
  console.log();
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
  // Plain output only: this is meant to be eval'd or pasted into a shell.
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
  header("PolyRouter client", "disconnect");
  section("Tools");
  let restoredAny = false;
  const width = Math.max(...TOOLS.map((t) => t.label.length));
  for (const tool of TOOLS) {
    const label = c.bold(tool.label.padEnd(width));
    try {
      const msg = tool.restore({ home });
      if (msg) {
        restoredAny = true;
        console.log(`  ${c.green(sym.ok)} ${label}  ${c.gray("original settings restored")}`);
      }
    } catch (error) {
      console.log(`  ${c.red(sym.err)} ${label}  ${c.red(error.message)}`);
    }
  }
  if (!restoredAny) note("  Nothing to restore.");
  console.log();
  if (config?.deviceToken) {
    await spin("Signing out…", () => api.logout(config.serverUrl, config.deviceToken)).then(
      () => success("Signed this device out"),
      () => warn("Could not reach the server to sign out; your admin can revoke this device.")
    );
  }
  deleteConfig();
  info("Disconnected.\n");
  return 0;
}

export async function main(argv) {
  const args = parseArgs(argv);
  const command = args._[0];
  if (args.help || !command || command === "help") {
    help();
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
      failure(`Unknown command: ${command}`);
      help();
      return 1;
  }
}
