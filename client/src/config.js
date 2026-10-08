// Client state lives in ~/.polyrouter-client (override with POLYROUTER_CLIENT_HOME).
// config.json holds the server URL and this device's token, so it is written 0600.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function clientHome() {
  return process.env.POLYROUTER_CLIENT_HOME || path.join(os.homedir(), ".polyrouter-client");
}

const configPath = () => path.join(clientHome(), "config.json");

export function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), "utf8"));
  } catch {
    return null;
  }
}

export function writeConfig(config) {
  fs.mkdirSync(clientHome(), { recursive: true, mode: 0o700 });
  fs.writeFileSync(configPath(), `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  try {
    fs.chmodSync(configPath(), 0o600);
  } catch {}
}

export function deleteConfig() {
  fs.rmSync(configPath(), { force: true });
}

// Accepts what people paste: the portal or dashboard URL, a /v1 URL, or a bare host:port.
export function normalizeServerUrl(input) {
  let value = String(input || "").trim();
  if (!value) throw new Error("Server URL is required, e.g. polyrouter-client connect http://192.168.1.10:20128");
  if (!/^https?:\/\//i.test(value)) value = `http://${value}`;
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Not a valid URL: ${input}`);
  }
  const pathname = url.pathname.replace(/\/+$/, "").replace(/\/(v1|portal(\/login)?|dashboard.*|login)$/i, "");
  return `${url.protocol}//${url.host}${pathname}`;
}
