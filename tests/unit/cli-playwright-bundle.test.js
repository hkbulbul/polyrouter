import fs from "node:fs";
import { describe, it, expect } from "vitest";

describe("CLI browser runtime packaging", () => {
  it("carries playwright-core without adding a downloaded browser package", () => {
    const buildScript = fs.readFileSync(new URL("../../cli/scripts/build-cli.js", import.meta.url), "utf8");
    const packageJson = JSON.parse(fs.readFileSync(new URL("../../package.json", import.meta.url), "utf8"));

    expect(buildScript).toContain('ensureModuleInBundle("playwright-core")');
    expect(packageJson.dependencies["playwright-core"]).toBeTruthy();
    expect(packageJson.dependencies.playwright).toBeUndefined();
    expect(packageJson.dependencies.puppeteer).toBeUndefined();
  });
});
