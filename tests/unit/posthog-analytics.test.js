import { describe, expect, it } from "vitest";
import { createDashboardOpenProperties, createPostHogPageviewProperties } from "@/shared/analytics/posthog";

describe("createDashboardOpenProperties", () => {
  it("uses only fixed anonymous dashboard metadata", () => {
    expect(createDashboardOpenProperties({ appVersion: "1.0.8" })).toEqual({
      event_source: "local_dashboard",
      telemetry_identity: "installation",
      app_version: "1.0.8",
    });
  });
});

describe("createPostHogPageviewProperties", () => {
  it("captures a route without query parameters or fragments", () => {
    expect(createPostHogPageviewProperties({
      pathname: "/dashboard/providers",
      origin: "http://localhost:20128",
      referrer: "https://example.com/start?campaign=summer#top",
    })).toEqual({
      $current_url: "http://localhost:20128/dashboard/providers",
      $referrer: "https://example.com/start",
    });
  });

  it("omits malformed referrers and falls back to the dashboard root", () => {
    expect(createPostHogPageviewProperties({
      pathname: "https://untrusted.example/path?api_key=secret",
      origin: "http://localhost:20128",
      referrer: "javascript:alert(1)",
    })).toEqual({
      $current_url: "http://localhost:20128/",
    });
  });
});
