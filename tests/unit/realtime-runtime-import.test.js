import { describe, expect, it } from "vitest";
import { spawnSync } from "child_process";
import fs from "fs";
import { getInternalAuthHost } from "../../src/realtime/runtime.js";

describe("realtime runtime loading", () => {
  it("loads through native Node ESM without Next.js path aliases", () => {
    const result = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", "await import('./src/realtime/runtime.js')"],
      { cwd: process.cwd(), encoding: "utf8" }
    );

    expect(result.status, result.stderr || result.stdout).toBe(0);
  });

  it("uses a loopback address matching the server binding family", () => {
    expect(getInternalAuthHost("localhost")).toBe("localhost");
    expect(getInternalAuthHost("0.0.0.0")).toBe("127.0.0.1");
    expect(getInternalAuthHost("::")).toBe("[::1]");
    expect(getInternalAuthHost("::1")).toBe("[::1]");
  });

  it("forwards external credentials only to the internal authorization hop", () => {
    const source = fs.readFileSync("src/realtime/runtime.js", "utf8");
    expect(source).toContain('request.headers.authorization || ""');
    expect(source).toContain('request.headers["x-api-key"] || ""');
    expect(source).toContain('url.searchParams.get("api_key")');
    expect(source).toContain('url.searchParams.get("ticket")');
  });
});
