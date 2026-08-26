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
  normalizeCommandCodeBaseUrl,
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
let mutationQueue = Promise.resolve();

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
          "Command Code providers.json is being updated; try again",
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

const readConfig = async () => {
  try {
    const [content, stat] = await Promise.all([
      fs.readFile(CONFIG_PATH, "utf-8"),
      fs.stat(CONFIG_PATH),
    ]);
    return { content, exists: true, mode: stat.mode & 0o777 };
  } catch (error) {
    if (error.code === "ENOENT") return { content: "{}", exists: false, mode: 0o600 };
    throw error;
  }
};

const inspectStoredProviderCredential = async () => {
  try {
    const auth = JSON.parse(await fs.readFile(AUTH_PATH, "utf-8"));
    const credential = auth && typeof auth === "object" && !Array.isArray(auth)
      ? auth[COMMAND_CODE_PROVIDER_ID]
      : null;
    return {
      present: Boolean(
        credential
        && typeof credential === "object"
        && !Array.isArray(credential)
        && credential.type === "api"
        && typeof credential.key === "string"
        && credential.key.length > 0,
      ),
      readable: true,
    };
  } catch (error) {
    if (error.code === "ENOENT") return { present: false, readable: true };
    return { present: false, readable: false };
  }
};

const revisionFor = ({ content, exists: fileExists }) =>
  createHash("sha256").update(`${fileExists ? "present" : "missing"}\0${content}`).digest("hex");

const assertExpectedRevision = (expectedRevision, current) => {
  if (typeof expectedRevision !== "string" || expectedRevision !== revisionFor(current)) {
    throw new CommandCodeConfigError(
      "STALE_CONFIG",
      "Command Code providers.json changed externally; review and apply again",
    );
  }
};

const atomicWriteConfig = async (content, expectedRevision, current) => {
  await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });

  const temporaryPath = path.join(CONFIG_DIR, `.providers.json.${process.pid}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await fs.open(temporaryPath, "wx", current.mode);
    await handle.writeFile(content, "utf-8");
    await handle.chmod(current.mode);
    await handle.sync();
    await handle.close();
    handle = null;

    // ponytail: Cooperative locks cannot block external editors; upgrade when Node exposes conditional replace.
    const latest = await readConfig();
    assertExpectedRevision(expectedRevision, latest);
    await fs.rename(temporaryPath, CONFIG_PATH);
  } finally {
    if (handle) await handle.close().catch(() => {});
    await fs.unlink(temporaryPath).catch(() => {});
  }
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

export async function GET() {
  try {
    const [detection, config, dashboardSettings, storedCredential] = await Promise.all([
      detectCommandCode(),
      readConfig(),
      getSettings(),
      inspectStoredProviderCredential(),
    ]);
    const { inspection, configError } = inspectSafely(config);
    const warnings = versionWarnings(detection);
    if (configError) warnings.push(configError.message);
    if (inspection?.collision) warnings.push('The provider ID "polyrouter" is already used by another configuration.');
    warnings.push(...(inspection?.warnings || []));
    const apiKeyRequired = dashboardSettings?.requireApiKey === true;
    const settings = inspection?.settings || null;
    const compatible = Boolean(
      inspection?.hasPolyRouter
      && settings?.baseUrlValid
      && !settings.disabled
      && settings.models.length > 0
      && settings.authMode !== "invalid"
      && !(apiKeyRequired && settings.authMode === "keyless"),
    );
    if (inspection?.hasPolyRouter && apiKeyRequired && settings?.authMode === "keyless") {
      warnings.push("PolyRouter now requires an API key. Choose environment authentication and click Apply.");
    }
    if (storedCredential.present) {
      warnings.push("Command Code has a stored polyrouter credential. It overrides providers.json authentication; clear or replace it through /connect before changing the endpoint or authentication.");
    } else if (!storedCredential.readable) {
      warnings.push("Command Code auth.json could not be inspected. Endpoint and authentication changes are blocked until the file is readable.");
    }

    return NextResponse.json({
      installed: detection.installed,
      version: detection.version,
      updateRequired: detection.installed && !isCommandCodeVersionSupported(detection.version),
      hasPolyRouter: inspection?.hasPolyRouter || false,
      compatible,
      apiKeyRequired,
      collision: inspection?.collision || false,
      storedCredential: storedCredential.present,
      credentialStateKnown: storedCredential.readable,
      settings,
      revision: revisionFor(config),
      warnings,
    });
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
      const [config, settings, storedCredential] = await Promise.all([
        readConfig(),
        getSettings(),
        inspectStoredProviderCredential(),
      ]);
      assertExpectedRevision(body.expectedRevision, config);

      if (body.mode === "adopt") {
        const result = adoptCommandCodeConfig(config.content);
        await atomicWriteConfig(result.content, body.expectedRevision, config);
        const inspection = inspectCommandCodeConfig(result.content);
        return NextResponse.json({
          success: true,
          operation: "adopt",
          revision: revisionFor({ content: result.content, exists: true }),
          settings: inspection.settings,
          warnings: inspection.warnings,
          storedCredential: storedCredential.present,
          credentialStateKnown: storedCredential.readable,
          message: "Existing polyrouter provider adopted. Review it, then click Apply to update it.",
        });
      }

      if (body.authMode === "keyless" && settings?.requireApiKey === true) {
        throw new CommandCodeConfigError(
          "API_KEY_REQUIRED",
          "Keyless Command Code access is disabled while PolyRouter requires API keys",
        );
      }

      const currentInspection = inspectCommandCodeConfig(config.content);
      if (storedCredential.present || !storedCredential.readable) {
        const baseUrl = normalizeCommandCodeBaseUrl(body.baseUrl);
        const currentBaseUrl = currentInspection.settings?.baseUrlValid
          ? currentInspection.settings.baseUrl
          : null;
        const authMode = body.authMode === "preserve"
          ? currentInspection.settings?.authMode
          : body.authMode;
        if (!currentInspection.hasPolyRouter
          || baseUrl !== currentBaseUrl
          || authMode !== currentInspection.settings?.authMode) {
          throw new CommandCodeConfigError(
            "STORED_CREDENTIAL_CONFLICT",
            storedCredential.present
              ? "Clear or replace the stored polyrouter credential through Command Code /connect before changing the endpoint or authentication"
              : "Command Code auth.json must be readable before changing the endpoint or authentication",
          );
        }
      }

      const result = applyCommandCodeConfig(config.content, {
        baseUrl: body.baseUrl,
        models: body.models,
        authMode: body.authMode,
      });
      await atomicWriteConfig(result.content, body.expectedRevision, config);
      const writtenConfig = { content: result.content, exists: true };
      const inspection = inspectCommandCodeConfig(result.content);
      const modelCount = Object.keys(result.entry.models).length;
      return NextResponse.json({
        success: true,
        operation: result.operation,
        revision: revisionFor(writtenConfig),
        settings: inspection.settings,
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
      const config = await readConfig();
      assertExpectedRevision(body.expectedRevision, config);
      const result = resetCommandCodeConfig(config.content);
      if (!result.changed) {
        return NextResponse.json({
          success: true,
          revision: revisionFor(config),
          message: "No PolyRouter provider was configured",
        });
      }

      await atomicWriteConfig(result.content, body.expectedRevision, config);
      return NextResponse.json({
        success: true,
        revision: revisionFor({ content: result.content, exists: true }),
        message: "PolyRouter provider removed. Reopen /model or /connect in Command Code.",
      });
    }));
  } catch (error) {
    if (error instanceof CommandCodeConfigError) return conflictResponse(error);
    console.log("Error resetting Command Code settings:", error);
    return NextResponse.json({ error: "Failed to reset Command Code settings" }, { status: 500 });
  }
}
