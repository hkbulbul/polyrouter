import { describe, expect, it } from "vitest";
import { supportsLiveModelCatalog } from "@/shared/utils/liveModelCatalog";

describe("live model catalog providers", () => {
  it("enables account-specific model fetching for Zed and Cursor only", () => {
    expect(supportsLiveModelCatalog("zed")).toBe(true);
    expect(supportsLiveModelCatalog("cursor")).toBe(true);
    expect(supportsLiveModelCatalog("openai")).toBe(false);
  });
});
