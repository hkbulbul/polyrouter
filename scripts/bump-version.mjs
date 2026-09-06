#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const rootPkgPath = path.join(rootDir, "package.json");
const cliPkgPath = path.join(rootDir, "cli", "package.json");

function parseSemver(v) {
  const m = String(v || "").replace(/^v/, "").trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
}

function compareSemver(a, b) {
  const [a1, a2, a3] = parseSemver(a);
  const [b1, b2, b3] = parseSemver(b);
  if (a1 !== b1) return a1 - b1;
  if (a2 !== b2) return a2 - b2;
  return a3 - b3;
}

function bumpSemver(version, type = "patch") {
  let [major, minor, patch] = parseSemver(version);
  if (type === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (type === "minor") {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
}

function getLatestNpmVersion(packageName) {
  try {
    const out = execSync(`npm view ${packageName} version --registry https://registry.npmjs.org/`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

function run() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const fromNpm = args.includes("--from-npm");
  const filteredArgs = args.filter((a) => a !== "--dry-run" && a !== "--from-npm");

  const bumpType = filteredArgs[0] || "patch";
  const customVersion = filteredArgs[1] || "";

  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf8"));
  const cliPkg = JSON.parse(fs.readFileSync(cliPkgPath, "utf8"));

  const localVersion = cliPkg.version || rootPkg.version || "1.0.0";
  let baseVersion = localVersion;

  if (fromNpm) {
    const npmVersion = getLatestNpmVersion(cliPkg.name || "polyrouter");
    if (npmVersion && compareSemver(npmVersion, baseVersion) >= 0) {
      baseVersion = npmVersion;
    }
  }

  let nextVersion = "";
  if (bumpType === "custom" && customVersion) {
    nextVersion = customVersion.replace(/^v/, "").trim();
  } else if (/^\d+\.\d+\.\d+/.test(bumpType)) {
    nextVersion = bumpType.replace(/^v/, "").trim();
  } else if (bumpType === "none") {
    nextVersion = baseVersion;
  } else {
    nextVersion = bumpSemver(baseVersion, bumpType);
  }

  console.log(`Bumping version: ${localVersion} (base: ${baseVersion}) -> ${nextVersion}`);

  if (!isDryRun) {
    rootPkg.version = nextVersion;
    cliPkg.version = nextVersion;

    fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + "\n");
    fs.writeFileSync(cliPkgPath, JSON.stringify(cliPkg, null, 2) + "\n");
    console.log(`Updated ${rootPkgPath} and ${cliPkgPath} to ${nextVersion}`);
  } else {
    console.log(`[DRY RUN] Would update ${rootPkgPath} and ${cliPkgPath} to ${nextVersion}`);
  }

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `new_version=${nextVersion}\nold_version=${localVersion}\n`);
  }

  return nextVersion;
}

run();
