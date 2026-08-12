import { describe, expect, it } from "vitest";

import { getProviderIconSrc } from "../../src/shared/utils/providerIcon.js";

describe("provider icon aliases", () => {
  it("uses the existing Alibaba icon for Model Studio Intl", () => {
    expect(getProviderIconSrc("alims-intl")).toBe("/providers/alicode-intl.png");
  });
});
