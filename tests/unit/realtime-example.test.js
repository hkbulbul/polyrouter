import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { getRealtimeUrl } from "../../src/realtime/url.js";

const examplePath = path.resolve("src/app/(dashboard)/dashboard/media-providers/[kind]/[id]/components/StsExampleCard.js");

describe("realtime OAuth example", () => {
  it("uses secure WebSockets for an HTTPS tunnel", () => {
    expect(getRealtimeUrl("https://router.example.test", "codex", "gpt-realtime-2"))
      .toBe("wss://router.example.test/v1/realtime?provider=codex&model=gpt-realtime-2");
  });

  it("keeps provider and model query values encoded", () => {
    expect(getRealtimeUrl("http://localhost:20128", "provider value", "model/value"))
      .toBe("ws://localhost:20128/v1/realtime?provider=provider%20value&model=model%2Fvalue");
  });

  it("documents server keys, short-lived tickets, and private browser compatibility", () => {
    const source = fs.readFileSync(examplePath, "utf8");
    expect(source).toContain("Authorization:");
    expect(source).toContain("/api/realtime/tickets");
    expect(source).toContain('searchParams.set("api_key"');
    expect(source).toContain("Private/trusted browser only");
    expect(source).toContain("never expose this API key to the browser");
  });
});
