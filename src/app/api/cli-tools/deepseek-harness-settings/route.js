"use server";

import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  DSH_COMMAND,
  DSH_PACKAGE,
  getDshPaths,
  getDshExecutableCandidates,
  getDshSearchPathEntries,
  HarnessConfigError,
  inspectHarnessConfig,
  applyHarnessDocuments,
  resetHarnessDocuments,
  parseHarnessMetadata,
  redactHarnessError,
} from "@/lib/deepseekHarnessConfig";

const execFileAsync = promisify(execFile);
let mutationQueue = Promise.resolve();

const serializeMutation = (operation) => {
  const run = mutationQueue.then(operation, operation);
  mutationQueue = run.catch(() => {});
  return run;
};

async function readOptional(filePath) {
  try { return await fs.readFile(filePath, "utf8"); }
  catch (error) { if (error.code === "ENOENT") return ""; throw error; }
}

async function readSnapshot(paths) {
  const [settingsText, credentialsText, metadataText] = await Promise.all([
    readOptional(paths.settingsPath),
    readOptional(paths.credentialsPath),
    readOptional(paths.metadataPath),
  ]);
  return { settingsText, credentialsText, metadataText };
}

async function ensureSecureHome(home) {
  await fs.mkdir(home, { recursive: true, mode: 0o700 });
  try { await fs.chmod(home, 0o700); } catch { /* Windows may not expose POSIX modes. */ }
}

async function writeAtomic(filePath, content) {
  const dir = filePath.replace(/[\\/][^\\/]*$/, "");
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const temporary = `${filePath}.polyrouter-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`;
  try {
    await fs.writeFile(temporary, content, { encoding: "utf8", mode: 0o600 });
    try { await fs.chmod(temporary, 0o600); } catch { /* Windows. */ }
    await fs.rename(temporary, filePath);
    try { await fs.chmod(filePath, 0o600); } catch { /* Windows. */ }
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

async function commitSnapshot(paths, before, after) {
  await ensureSecureHome(paths.dshHome);
  const changed = [];
  for (const [name, filePath] of [["settingsText", paths.settingsPath], ["credentialsText", paths.credentialsPath], ["metadataText", paths.metadataPath]]) {
    if (before[name] === after[name]) continue;
    changed.push({ name, filePath, old: before[name], next: after[name] });
  }
  const committed = [];
  try {
    for (const file of changed) {
      if (file.next) {
        await writeAtomic(file.filePath, file.next);
      } else {
        await fs.rm(file.filePath, { force: true });
      }
      committed.push(file);
    }
  } catch (error) {
    for (const file of committed.reverse()) {
      try {
        if (file.old) await writeAtomic(file.filePath, file.old);
        else await fs.rm(file.filePath, { force: true });
      } catch { /* Preserve the original failure; next GET reports the issue. */ }
    }
    throw error;
  }
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findExecutable() {
  const platform = os.platform();
  const command = platform === "win32" ? "where.exe" : "which";
  const searchPath = getDshSearchPathEntries({ env: process.env, platform });
  const env = { ...process.env, PATH: searchPath.join(platform === "win32" ? ";" : path.delimiter) };
  try {
    const { stdout } = await execFileAsync(command, [DSH_COMMAND], { windowsHide: true, timeout: 3000, env });
    const found = stdout.trim().split(/\r?\n/).map((line) => line.trim()).find(Boolean);
    if (found) return { path: found, source: "path" };
  } catch { /* fall through to direct known-location checks */ }

  for (const candidate of getDshExecutableCandidates({ env: process.env, platform })) {
    if (await pathExists(candidate)) return { path: candidate, source: "known-location" };
  }
  return { path: null, source: null };
}

async function detectInstallation(paths) {
  const executable = await findExecutable();
  const executablePath = executable.path;
  let version = null;
  if (executablePath) {
    try {
      const result = await execFileAsync(executablePath, ["--version"], { windowsHide: true, timeout: 3000 });
      version = `${result.stdout || result.stderr || ""}`.trim().split(/\r?\n/)[0] || null;
    } catch { /* Version probing is best effort. */ }
  }
  let hasHome = false;
  try { await fs.access(paths.dshHome); hasHome = true; } catch { /* absent */ }
  return {
    installed: Boolean(executablePath || hasHome),
    executablePath,
    detectionSource: executable.source,
    version,
    packageName: DSH_PACKAGE,
    configOnly: !executablePath && hasHome,
  };
}

function responseError(error) {
  const safe = redactHarnessError(error);
  const status = error instanceof HarnessConfigError
    ? ({ CREDENTIAL_SHADOWED: 409, PROVIDER_ID_CONFLICT: 409, STALE_CONFIG: 409, CONFIG_DRIFT: 409 }[error.code] || 400)
    : 500;
  return NextResponse.json({ error: safe.message, code: safe.code }, { status });
}

async function inspectCurrent() {
  const paths = getDshPaths();
  const snapshot = await readSnapshot(paths);
  const install = await detectInstallation(paths);
  const state = inspectHarnessConfig({ ...snapshot, env: process.env, paths });
  return { ...install, ...state, settings: state, configPath: paths.settingsPath };
}

export async function GET() {
  try {
    return NextResponse.json(await inspectCurrent());
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request) {
  return serializeMutation(async () => {
    try {
      const body = await request.json();
      const paths = getDshPaths();
      const before = await readSnapshot(paths);
      const current = inspectHarnessConfig({ ...before, env: process.env, paths });
      if (body?.expectedRevision && body.expectedRevision !== current.revision) {
        throw new HarnessConfigError("STALE_CONFIG", "DeepSeek Harness settings changed. Refresh and try again.");
      }
      const result = applyHarnessDocuments({
        ...before,
        baseUrl: body?.baseUrl,
        model: body?.model,
        models: body?.models,
        apiKey: body?.apiKey,
        credentialMode: body?.credentialMode === "environment" ? "environment" : "file",
        preserveCredential: body?.credentialMode === "preserve",
        env: process.env,
        paths,
        contextWindow: body?.contextWindow,
        maxTokens: body?.maxTokens,
      });
      await commitSnapshot(paths, before, result);
      const state = await inspectCurrent();
      return NextResponse.json({ success: true, message: "DeepSeek Harness settings applied successfully.", ...state });
    } catch (error) {
      return responseError(error);
    }
  });
}

export async function DELETE(request) {
  return serializeMutation(async () => {
    try {
      let body = {};
      try { body = await request.json(); } catch { /* DELETE bodies are optional. */ }
      const paths = getDshPaths();
      const before = await readSnapshot(paths);
      const current = inspectHarnessConfig({ ...before, env: process.env, paths });
      if (body?.expectedRevision && body.expectedRevision !== current.revision) {
        throw new HarnessConfigError("STALE_CONFIG", "DeepSeek Harness settings changed. Refresh and try again.");
      }
      const result = resetHarnessDocuments({ ...before, env: process.env, paths });
      await commitSnapshot(paths, before, result);
      return NextResponse.json({ success: true, message: "DeepSeek Harness PolyRouter settings reset.", ...(await inspectCurrent()) });
    } catch (error) {
      return responseError(error);
    }
  });
}
