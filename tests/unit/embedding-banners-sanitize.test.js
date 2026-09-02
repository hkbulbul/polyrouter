import { describe, expect, it } from "vitest";
import { sanitizeBannerRow, sanitizeProviderId } from "@/lib/embeddingBanners.js";

// A banner row as the admin Edge Function writes it: youtube media_content is already a bare id.
const row = {
  id: "skda",
  provider_id: "codex",
  display_name: "summer sale",
  media_kind: "youtube",
  media_content: "BfM86k78AO0",
  href: "",
  position: 0,
};

describe("sanitizeProviderId", () => {
  it("lowercases and accepts a slug", () => {
    expect(sanitizeProviderId(" Voyage-AI ")).toBe("voyage-ai");
  });

  it("rejects anything that could alter a PostgREST filter", () => {
    for (const bad of ["", "codex,foo", "codex)", "-codex", "co dex", null, undefined]) {
      expect(sanitizeProviderId(bad)).toBe("");
    }
  });
});

describe("sanitizeBannerRow", () => {
  it("keeps a valid youtube row", () => {
    expect(sanitizeBannerRow(row)).toEqual({
      id: "skda",
      providerId: "codex",
      displayName: "summer sale",
      mediaKind: "youtube",
      mediaContent: "BfM86k78AO0",
      href: "",
      position: 0,
    });
  });

  it("drops an unknown media kind", () => {
    expect(sanitizeBannerRow({ ...row, media_kind: "svg" })).toBeNull();
  });

  it("drops a malformed youtube id", () => {
    expect(sanitizeBannerRow({ ...row, media_content: "not-an-id" })).toBeNull();
    expect(sanitizeBannerRow({ ...row, media_content: "https://youtu.be/BfM86k78AO0" })).toBeNull();
  });

  it("drops a non-https image but keeps an https one", () => {
    expect(sanitizeBannerRow({ ...row, media_kind: "image", media_content: "http://x/a.png" })).toBeNull();
    expect(sanitizeBannerRow({ ...row, media_kind: "image", media_content: "https://x/a.png" })?.mediaContent).toBe("https://x/a.png");
  });

  it("strips a javascript: href instead of dropping the row", () => {
    expect(sanitizeBannerRow({ ...row, href: "javascript:alert(1)" })?.href).toBe("");
  });

  it("drops a row with no or invalid provider", () => {
    expect(sanitizeBannerRow({ ...row, provider_id: "" })).toBeNull();
    expect(sanitizeBannerRow({ ...row, provider_id: "codex,anthropic" })).toBeNull();
  });

  it("defaults a missing position to last", () => {
    expect(sanitizeBannerRow({ ...row, position: null })?.position).toBe(999);
  });

  it("keeps html markup verbatim — the empty iframe sandbox is what contains it", () => {
    const html = sanitizeBannerRow({ ...row, media_kind: "html", media_content: "<b>hi</b><script>x()</script>" });
    expect(html?.mediaKind).toBe("html");
    expect(html?.mediaContent).toBe("<b>hi</b><script>x()</script>");
  });

  it("caps oversized media_content", () => {
    expect(sanitizeBannerRow({ ...row, media_kind: "html", media_content: "a".repeat(200000) })?.mediaContent).toHaveLength(100000);
  });

  it("drops junk", () => {
    for (const bad of [null, undefined, "", 7, {}]) expect(sanitizeBannerRow(bad)).toBeNull();
  });
});
