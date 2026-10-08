// Runtime i18n must not revert text that React re-rendered after the node was
// first seen (it used to restore the very first value on every route change,
// e.g. a layout header kept showing the previous page's title).
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const element = { tagName: "H1", hasAttribute: () => false, parentElement: null };
const textNode = (value) => ({ nodeValue: value, parentElement: element });

let nodes = [];

beforeEach(() => {
  vi.resetModules();
  globalThis.window = {};
  globalThis.NodeFilter = { SHOW_TEXT: 4 };
  globalThis.document = {
    cookie: "",
    body: {},
    createTreeWalker: () => {
      let i = 0;
      return { nextNode: () => nodes[i++] || null };
    },
  };
});

afterEach(() => {
  delete globalThis.window;
  delete globalThis.NodeFilter;
  delete globalThis.document;
});

describe("runtime i18n re-processing", () => {
  it("keeps text React changed since the node was first processed", async () => {
    const { reloadTranslations } = await import("../../src/i18n/runtime.js");
    const title = textNode("Overview");
    nodes = [title];
    await reloadTranslations(); // first pass records "Overview"

    title.nodeValue = "Usage"; // React re-render after navigation
    await reloadTranslations(); // route-change pass

    expect(title.nodeValue).toBe("Usage");
  });

  it("leaves unchanged text alone", async () => {
    const { reloadTranslations } = await import("../../src/i18n/runtime.js");
    const label = textNode("API keys");
    nodes = [label];
    await reloadTranslations();
    await reloadTranslations();
    expect(label.nodeValue).toBe("API keys");
  });
});
