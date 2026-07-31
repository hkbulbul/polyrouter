import { describe, it, expect, afterEach } from "vitest";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const client = require("../../cli/src/cli/api/client.js");
const originalPlatform = process.platform;
const originalDataDir = process.env.DATA_DIR;
const originalAppData = process.env.APPDATA;

function setPlatform(platform) {
  Object.defineProperty(process, "platform", { value: platform });
}

afterEach(() => {
  Object.defineProperty(process, "platform", { value: originalPlatform });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
  if (originalAppData === undefined) delete process.env.APPDATA;
  else process.env.APPDATA = originalAppData;
});

describe("CLI API client data directory", () => {
  it("uses the Windows default for a Unix-style DATA_DIR", () => {
    setPlatform("win32");
    process.env.APPDATA = "C:\\Users\\tester\\AppData\\Roaming";
    process.env.DATA_DIR = "/var/lib/polyrouter";

    expect(client.__test__.getDataDir()).toBe(path.join(process.env.APPDATA, "polyrouter"));
  });

  it("preserves an explicit Windows DATA_DIR", () => {
    setPlatform("win32");
    process.env.DATA_DIR = "D:\\polyrouter-data";

    expect(client.__test__.getDataDir()).toBe("D:\\polyrouter-data");
  });

  it("uses the platform default when DATA_DIR is unset", () => {
    setPlatform("win32");
    process.env.APPDATA = "C:\\Users\\tester\\AppData\\Roaming";
    delete process.env.DATA_DIR;

    expect(client.__test__.getDataDir()).toBe(path.join(process.env.APPDATA, "polyrouter"));
  });

  it("keeps a configured Unix data directory on non-Windows platforms", () => {
    setPlatform("linux");
    process.env.DATA_DIR = "/var/lib/polyrouter";

    expect(client.__test__.getDataDir()).toBe("/var/lib/polyrouter");
  });
});
