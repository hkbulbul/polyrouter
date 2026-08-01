import { describe, expect, it } from "vitest";
import { createGoogleAnalyticsDashboardOpenProperties, createGoogleAnalyticsPageviewProperties } from "@/shared/analytics/googleAnalytics";

describe("createGoogleAnalyticsDashboardOpenProperties", () => {
  it("uses only fixed anonymous dashboard metadata", () => {
    expect(createGoogleAnalyticsDashboardOpenProperties({ appVersion: "1.0.8" })).toEqual({
      event_source: "local_dashboard",
      telemetry_identity: "installation",
      app_version: "1.0.8",
    });
  });
});

describe("createGoogleAnalyticsPageviewProperties", () => {
  it("captures a route without query parameters or fragments", () => {
    expect(createGoogleAnalyticsPageviewProperties({
      pathname: "/dashboard/providers?api_key=secret#details",
      origin: "http://localhost:20128",
      title: "Providers | PolyRouter",
    })).toEqual({
      page_location: "http://localhost:20128/dashboard/providers",
      page_path: "/dashboard/providers",
      page_title: "Providers | PolyRouter",
    });
  });

  it("falls back to the root for invalid paths and omits blank titles", () => {
    expect(createGoogleAnalyticsPageviewProperties({
      pathname: "javascript:alert(1)",
      origin: "http://localhost:20128",
      title: "",
    })).toEqual({
      page_location: "http://localhost:20128/",
      page_path: "/",
    });
  });
});
