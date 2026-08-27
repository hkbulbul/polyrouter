import { describe, it, expect } from "vitest";
import { __test__ } from "../../open-sse/utils/installedChromium.js";

describe("installed Chromium channel fallback", () => {
  it("tries Chrome before Edge", async () => {
    const tried = [];
    const result = await __test__.tryChannels(async (channel) => {
      tried.push(channel);
      if (channel === "chrome") throw new Error("missing");
      return channel;
    });

    expect(result).toBe("msedge");
    expect(tried).toEqual(["chrome", "msedge"]);
  });
});
