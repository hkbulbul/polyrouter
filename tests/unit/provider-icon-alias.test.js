import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { getProviderIconSrc } from "../../src/shared/utils/providerIcon.js";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

const providersWithIcons = [
  "zed",
  "devin-cli",
  "api-airforce",
  "bazaarlink",
  "kilo-gateway",
  "windsurf",
];

describe("provider icon aliases", () => {
  it("uses the existing Alibaba icon for Model Studio Intl", () => {
    expect(getProviderIconSrc("alims-intl")).toBe("/providers/alicode-intl.png");
  });

  it.each(providersWithIcons)("resolves the shipped %s logo", (providerId) => {
    expect(getProviderIconSrc(providerId)).toBe(`/providers/${providerId}.png`);
    expect(fs.existsSync(`${repoRoot}public/providers/${providerId}.png`)).toBe(true);
  });

  it.each([
    ["airforce", "api-airforce"],
    ["bazaar-link", "bazaarlink"],
    ["kilogateway", "kilo-gateway"],
  ])("resolves the %s provider alias", (alias, providerId) => {
    expect(getProviderIconSrc(alias)).toBe(`/providers/${providerId}.png`);
  });
});
