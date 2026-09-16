"use server";

import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { createHash, randomUUID } from "crypto";
import { getSettings } from "@/lib/db/index.js";
import {
  COMMAND_CODE_MIN_BYOK_VERSION,
  COMMAND_CODE_PROVIDER_ID,
  CommandCodeConfigError,
  adoptCommandCodeConfig,
  applyCommandCodeConfig,
  inspectCommandCodeConfig,
  isCommandCodeVersionSupported,
  resetCommandCodeConfig,
} from "@/lib/commandCodeConfig.js";

const execFileAsync = promisify(execFile);
const COMMAND_NAMES = ["command-code", "cmdc", "commandcode"];
const CONFIG_DIR = path.join(os.homedir(), ".commandcode");
const CONFIG_PATH = path.join(CONFIG_DIR, "providers.json");
const AUTH_PATH = path.join(CONFIG_DIR, "auth.json");
const LOCK_PATH = `${CONFIG_PATH}.polyrouter.lock`;
const LOCK_TIMEOUT_MS = 5000;
const LOCK_RETRY_MS = 50;
const MAX_API_KEY_LENGTH = 4096;
let mutationQueue = Promise.resolve();

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const serializeMutation = (operation) => {
  const run = mutationQueue.then(operation, operation);
  mutationQueue = run.catch(() => {});
  return run;
};

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const withConfigLock = async (operation) => {
  await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  while (true) {
    try {
      await fs.mkdir(LOCK_PATH, { mode: 0o700 });
      break;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      if (Date.now() >= deadline) {
        throw new CommandCodeConfigError(
          "CONFIG_BUSY",
          "Command Code settings are being updated; try again",
        );
      }
      await wait(LOCK_RETRY_MS);
    }
  }

  try {
    return await operation();
  } finally {
    await fs.rmdir(LOCK_PATH).catch(() => {});
  }
};

const exists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const locateExecutables = async () => {
  const locator = os.platform() === "win32" ? "where.exe" : "which";
  const found = [];
  for (const name of COMMAND_NAMES) {
    try {
      const { stdout } = await execFileAsync(locator, [name], { windowsHide: true });
      for (const line of stdout.split(/\r?\n/)) {
        const candidate = line.trim();
        if (candidate && !found.includes(candidate)) found.push(candidate);
      }
    } catch { /* try the next unambiguous binary name */ }
  }
  return found;
};

const packageCandidatesForExecutable = async (executable) => {
  const candidates = [
    path.join(path.dirname(executable), "node_modules", "command-code", "package.json"),
    path.join(path.dirname(path.dirname(executable)), "lib", "node_modules", "command-code", "package.json"),
  ];
  try {
    let current = path.dirname(await fs.realpath(executable));
    for (let depth = 0; depth < 6; depth += 1) {
      candidates.push(path.join(current, "package.json"));
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  } catch { /* npm shims are not always resolvable as symlinks */ }
  return candidates;
};

const readCommandCodePackage = async (candidate) => {
  try {
    const parsed = JSON.parse(await fs.readFile(candidate, "utf-8"));
    return parsed?.name === "command-code" && typeof parsed.version === "string"
      ? { version: parsed.version, packagePath: candidate }
      : null;
  } catch {
    return null;
  }
};

const detectCommandCode = async () => {
  const executables = await locateExecutables();
  const packageCandidates = [];
  for (const executable of executables) {
    packageCandidates.push(...await packageCandidatesForExecutable(executable));
  }
  if (process.env.APPDATA) {
    packageCandidates.push(path.join(process.env.APPDATA, "npm", "node_modules", "command-code", "package.json"));
  }
  if (process.env.npm_config_prefix) {
    packageCandidates.push(path.join(process.env.npm_config_prefix, "node_modules", "command-code", "package.json"));
    packageCandidates.push(path.join(process.env.npm_config_prefix, "lib", "node_modules", "command-code", "package.json"));
  }
  packageCandidates.push(
    path.join(os.homedir(), ".npm-global", "lib", "node_modules", "command-code", "package.json"),
    path.join(path.parse(os.homedir()).root, "usr", "local", "lib", "node_modules", "command-code", "package.json"),
    path.join(path.parse(os.homedir()).root, "usr", "lib", "node_modules", "command-code", "package.json"),
  );

  for (const candidate of [...new Set(packageCandidates)]) {
    const pkg = await readCommandCodePackage(candidate);
    if (pkg) return { installed: true, executables, ...pkg };
  }
  const configExists = await exists(CONFIG_DIR);
  return {
    installed: executables.length > 0 || configExists,
    executables,
    version: null,
    packagePath: null,
  };
};

const readFileState = async (filePath) => {
  try {
    const [content, stat] = await Promise.all([
      fs.readFile(filePath, "utf-8"),
      fs.stat(filePath),
    ]);
    return { content, exists: true, mode: stat.mode & 0o777 };
  } catch (error) {
    if (error.code === "ENOENT") return { content: "{}", exists: false, mode: 0o600 };
    throw error;
  }
};

const readConfig = () => readFileState(CONFIG_PATH);

const readAuth = async () => {
  let state;
  try {
    state = await readFileState(AUTH_PATH);
  } catch {
    return {
      content: null,
      exists: null,
      mode: 0o600,
      data: null,
      readable: false,
    };
  }

  try {
    const data = JSON.parse(state.content);
    if (!isPlainObject(data)) throw new Error("Invalid auth root");
    return { ...state, data, readable: true };
  } catch {
    return { ...state, data: null, readable: false };
  }
};

const inspectStoredProviderCredential = (auth) => {
  if (!auth.readable) {
    return { entryPresent: false, present: false, readable: false };
  }
  const entryPresent = Object.prototype.hasOwnProperty.call(
    auth.data,
    COMMAND_CODE_PROVIDER_ID,
  );
  const credential = auth.data[COMMAND_CODE_PROVIDER_ID];
  return {
    entryPresent,
    present: Boolean(
      isPlainObject(credential)
      && credential.type === "api"
      && typeof credential.key === "string"
      && credential.key.length > 0,
    ),
    readable: true,
  };
};

const revisionPart = (state) => {
  if (state.content === null) return "unreadable";
  return `${state.exists ? "present" : "missing"}\0${state.content}`;
};

const revisionFor = (config, auth) => createHash("sha256")
  .update(`config\0${revisionPart(config)}\0auth\0${revisionPart(auth)}`)
  .digest("hex");

const readCurrentFiles = async () => {
  const [config, auth] = await Promise.all([readConfig(), readAuth()]);
  return { config, auth };
};

const assertExpectedRevision = (expectedRevision, current) => {
  if (typeof expectedRevision !== "string"
    || expectedRevision !== revisionFor(current.config, current.auth)) {
    throw new CommandCodeConfigError(
      "STALE_CONFIG",
      "Command Code settings changed externally; review and apply again",
    );
  }
};

const assertReadableAuth = (auth) => {
  if (!auth.readable) {
    throw new CommandCodeConfigError(
      "AUTH_FILE_UNREADABLE",
      "Command Code auth.json must contain a readable JSON object before PolyRouter can update credentials",
    );
  }
};

const normalizeApiKey = (value) => {
  if (typeof value !== "string") {
    throw new CommandCodeConfigError("API_KEY_REQUIRED", "Select a PolyRouter API key");
  }
  const apiKey = value.trim();
  if (!apiKey) {
    throw new CommandCodeConfigError("API_KEY_REQUIRED", "Select a PolyRouter API key");
  }
  if (apiKey.length > MAX_API_KEY_LENGTH || /[\x00-\x1f\x7f]/.test(apiKey)) {
    throw new CommandCodeConfigError("INVALID_API_KEY", "The selected PolyRouter API key is invalid");
  }
  return apiKey;
};

const updateAuth = (auth, authMode, apiKey) => {
  assertReadableAuth(auth);
  if (authMode === "preserve") return auth;

  const data = { ...auth.data };
  if (authMode === "stored") {
    data[COMMAND_CODE_PROVIDER_ID] = {
      type: "api",
      key: normalizeApiKey(apiKey),
    };
  } else {
    delete data[COMMAND_CODE_PROVIDER_ID];
  }

  const nextExists = Object.keys(data).length > 0;
  return {
    content: nextExists ? `${JSON.stringify(data, null, 2)}\n` : "{}",
    exists: nextExists,
    mode: auth.mode,
    data,
    readable: true,
  };
};

const writeTemporaryFile = async (filePath, content, mode) => {
  let handle;
  try {
    handle = await fs.open(filePath, "wx", mode);
    await handle.writeFile(content, "utf-8");
    await handle.chmod(mode);
    await handle.sync();
  } finally {
    await handle?.close().catch(() => {});
  }
};

const commitSettings = async ({
  expectedRevision,
  current,
  configContent,
  configExists = true,
  authNext = current.auth,
}) => {
  await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  const transactionId = `${process.pid}.${randomUUID()}`;
  const entries = [
    {
      target: CONFIG_PATH,
      current: current.config,
      next: { content: configContent, exists: configExists, mode: current.config.mode },
      temporary: path.join(CONFIG_DIR, `.providers.json.${transactionId}.tmp`),
      backup: path.join(CONFIG_DIR, `.providers.json.${transactionId}.bak`),
    },
    {
      target: AUTH_PATH,
      current: current.auth,
      next: authNext,
      temporary: path.join(CONFIG_DIR, `.auth.json.${transactionId}.tmp`),
      backup: path.join(CONFIG_DIR, `.auth.json.${transactionId}.bak`),
    },
  ].filter((entry) => entry.current.exists !== entry.next.exists
    || entry.current.content !== entry.next.content);

  const prepared = [];
  const backedUp = [];
  const installed = [];
  try {
    for (const entry of entries) {
      if (!entry.next.exists) continue;
      await writeTemporaryFile(entry.temporary, entry.next.content, entry.next.mode);
      prepared.push(entry);
    }

    const latest = await readCurrentFiles();
    assertExpectedRevision(expectedRevision, latest);

    for (const entry of entries) {
      if (!entry.current.exists) continue;
      await fs.rename(entry.target, entry.backup);
      backedUp.push(entry);
    }
    for (const entry of entries) {
      if (!entry.next.exists) continue;
      await fs.rename(entry.temporary, entry.target);
      installed.push(entry);
    }
    for (const entry of backedUp) {
      await fs.unlink(entry.backup).catch(() => {});
    }
  } catch (error) {
    for (const entry of [...installed].reverse()) {
      await fs.unlink(entry.target).catch(() => {});
    }
    for (const entry of [...backedUp].reverse()) {
      await fs.rename(entry.backup, entry.target).catch(() => {});
    }
    throw error;
  } finally {
    for (const entry of prepared) {
      await fs.unlink(entry.temporary).catch(() => {});
    }
  }

  return {
    config: {
      content: configContent,
      exists: configExists,
      mode: current.config.mode,
    },
    auth: authNext,
  };
};

const versionWarnings = (detection) => {
  if (!detection.installed) return ["Command Code was not detected locally."];
  if (!detection.version) return ["Command Code version could not be verified. Version 1.30.0 or later is required."];
  if (!isCommandCodeVersionSupported(detection.version)) {
    return [`Command Code ${detection.version} does not support native BYOK. Upgrade to ${COMMAND_CODE_MIN_BYOK_VERSION} or later.`];
  }
  return [];
};

const requireSupportedInstallation = (detection) => {
  if (!detection.installed) {
    throw new CommandCodeConfigError("NOT_INSTALLED", "Command Code is not installed locally");
  }
  if (!isCommandCodeVersionSupported(detection.version)) {
    throw new CommandCodeConfigError(
      "UPDATE_REQUIRED",
      `Command Code ${COMMAND_CODE_MIN_BYOK_VERSION} or later is required for native BYOK providers`,
    );
  }
};

const conflictResponse = (error) => {
  const inputCodes = new Set([
    "INVALID_BASE_URL",
    "INSECURE_REMOTE_HTTP",
    "INVALID_MODEL",
    "INVALID_MODELS",
    "INVALID_AUTH_MODE",
    "REMOTE_KEY_REQUIRED",
    "API_KEY_REQUIRED",
    "INVALID_API_KEY",
    "PROVIDER_NOT_FOUND",
    "INVALID_OWNERSHIP_MARKER",
    "INVALID_PROVIDER",
  ]);
  const status = inputCodes.has(error.code) ? 400 : 409;
  return NextResponse.json({ error: error.message, code: error.code }, { status });
};

const inspectSafely = (config) => {
  try {
    return { inspection: inspectCommandCodeConfig(config.content), configError: null };
  } catch (error) {
    if (error instanceof CommandCodeConfigError) return { inspection: null, configError: error };
    throw error;
  }
};

const buildStatus = ({ detection, config, auth, dashboardSettings }) => {
  const { inspection, configError } = inspectSafely(config);
  const credential = inspectStoredProviderCredential(auth);
  const warnings = versionWarnings(detection);
  if (configError) warnings.push(configError.message);
  if (inspection?.collision) warnings.push('The provider ID "polyrouter" is already used by another configuration.');
  warnings.push(...(inspection?.warnings || []));

  const apiKeyRequired = dashboardSettings?.requireApiKey === true;
  let settings = inspection?.settings || null;
  if (settings && credential.present) {
    settings = { ...settings, authMode: "stored" };
  }

  if (!credential.readable) {
    warnings.push("Command Code auth.json is unreadable or invalid. Repair it before applying or resetting PolyRouter credentials.");
  } else if (credential.entryPresent && !credential.present) {
    warnings.push("Command Code has an invalid polyrouter credential. Select an API key and click Apply to replace it.");
  } else if (settings?.authMode === "stored" && !credential.present) {
    warnings.push("Command Code does not have a stored PolyRouter API key. Select one and click Apply.");
  }
  if (inspection?.hasPolyRouter && apiKeyRequired && settings?.authMode === "keyless") {
    warnings.push("PolyRouter now requires an API key. Select stored API-key authentication and click Apply.");
  }

  const authCompatible = settings?.authMode === "stored"
    ? credential.present
    : settings?.authMode === "keyless"
      ? !apiKeyRequired
      : settings?.authMode !== "invalid";
  const compatible = Boolean(
    inspection?.hasPolyRouter
    && settings?.baseUrlValid
    && !settings.disabled
    && settings.models.length > 0
    && authCompatible,
  );

  return {
    installed: detection.installed,
    version: detection.version,
    updateRequired: detection.installed && !isCommandCodeVersionSupported(detection.version),
    hasPolyRouter: inspection?.hasPolyRouter || false,
    compatible,
    apiKeyRequired,
    collision: inspection?.collision || false,
    storedCredential: credential.present,
    credentialEntryPresent: credential.entryPresent,
    credentialStateKnown: credential.readable,
    settings,
    revision: revisionFor(config, auth),
    warnings,
  };
};

export async function GET() {
  try {
    const [detection, current, dashboardSettings] = await Promise.all([
      detectCommandCode(),
      readCurrentFiles(),
      getSettings(),
    ]);
    return NextResponse.json(buildStatus({
      detection,
      config: current.config,
      auth: current.auth,
      dashboardSettings,
    }));
  } catch (error) {
    console.log("Error checking Command Code settings:", error);
    return NextResponse.json({ error: "Failed to check Command Code settings" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const [body, detection] = await Promise.all([request.json(), detectCommandCode()]);
    requireSupportedInstallation(detection);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
    }
    if (body.mode !== "apply" && body.mode !== "adopt") {
      return NextResponse.json({ error: 'mode must be "apply" or "adopt"' }, { status: 400 });
    }

    return await serializeMutation(() => withConfigLock(async () => {
      const [current, dashboardSettings] = await Promise.all([
        readCurrentFiles(),
        getSettings(),
      ]);
      assertExpectedRevision(body.expectedRevision, current);

      if (body.mode === "adopt") {
        const result = adoptCommandCodeConfig(current.config.content);
        const committed = await commitSettings({
          expectedRevision: body.expectedRevision,
          current,
          configContent: result.content,
        });
        const inspection = inspectCommandCodeConfig(result.content);
        const credential = inspectStoredProviderCredential(committed.auth);
        return NextResponse.json({
          success: true,
          operation: "adopt",
          revision: revisionFor(committed.config, committed.auth),
          settings: credential.present
            ? { ...inspection.settings, authMode: "stored" }
            : inspection.settings,
          warnings: inspection.warnings,
          storedCredential: credential.present,
          credentialStateKnown: credential.readable,
          message: "Existing polyrouter provider adopted. Review it, then click Apply to update it.",
        });
      }

      assertReadableAuth(current.auth);
      if (body.authMode === "keyless" && dashboardSettings?.requireApiKey === true) {
        throw new CommandCodeConfigError(
          "API_KEY_REQUIRED",
          "Keyless Command Code access is disabled while PolyRouter requires API keys",
        );
      }

      const credential = inspectStoredProviderCredential(current.auth);
      if (body.authMode === "preserve" && credential.entryPresent) {
        throw new CommandCodeConfigError(
          "STORED_CREDENTIAL_CONFLICT",
          "Choose stored API-key authentication to replace the existing Command Code credential",
        );
      }

      const result = applyCommandCodeConfig(current.config.content, {
        baseUrl: body.baseUrl,
        models: body.models,
        authMode: body.authMode,
      });
      const authNext = updateAuth(current.auth, body.authMode, body.apiKey);
      const committed = await commitSettings({
        expectedRevision: body.expectedRevision,
        current,
        configContent: result.content,
        authNext,
      });
      const inspection = inspectCommandCodeConfig(result.content);
      const storedCredential = inspectStoredProviderCredential(committed.auth);
      const modelCount = Object.keys(result.entry.models).length;
      return NextResponse.json({
        success: true,
        operation: result.operation,
        revision: revisionFor(committed.config, committed.auth),
        settings: body.authMode === "stored"
          ? { ...inspection.settings, authMode: "stored" }
          : inspection.settings,
        warnings: inspection.warnings,
        storedCredential: storedCredential.present,
        credentialStateKnown: storedCredential.readable,
        message: `PolyRouter provider ${result.operation === "create" ? "added" : "updated"} with ${modelCount} model${modelCount === 1 ? "" : "s"}. Reopen /model or /connect in Command Code and select a polyrouter/<model-id> model.`,
      });
    }));
  } catch (error) {
    if (error instanceof CommandCodeConfigError) return conflictResponse(error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }
    console.log("Error updating Command Code settings:", error);
    return NextResponse.json({ error: "Failed to update Command Code settings" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const [body, detection] = await Promise.all([
      request.json().catch(() => ({})),
      detectCommandCode(),
    ]);
    requireSupportedInstallation(detection);

    return await serializeMutation(() => withConfigLock(async () => {
      const current = await readCurrentFiles();
      assertExpectedRevision(body.expectedRevision, current);
      assertReadableAuth(current.auth);

      const result = resetCommandCodeConfig(current.config.content);
      const authNext = updateAuth(current.auth, "keyless");
      const authChanged = authNext.exists !== current.auth.exists
        || authNext.content !== current.auth.content;
      if (!result.changed && !authChanged) {
        return NextResponse.json({
          success: true,
          revision: revisionFor(current.config, current.auth),
          message: "No PolyRouter provider or credential was configured",
        });
      }

      const committed = await commitSettings({
        expectedRevision: body.expectedRevision,
        current,
        configContent: result.content,
        configExists: result.changed ? true : current.config.exists,
        authNext,
      });
      return NextResponse.json({
        success: true,
        revision: revisionFor(committed.config, committed.auth),
        message: "PolyRouter provider and stored credential removed. Reopen /model or /connect in Command Code.",
      });
    }));
  } catch (error) {
    if (error instanceof CommandCodeConfigError) return conflictResponse(error);
    console.log("Error resetting Command Code settings:", error);
    return NextResponse.json({ error: "Failed to reset Command Code settings" }, { status: 500 });
  }
}
