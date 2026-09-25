import { describe, expect, it } from "vitest";
import {
  CODEX_MODEL_SLOTS,
  buildCodexModelCatalog,
  isQualifiedCodexModelTarget,
  isPolyRouterCatalogModel,
} from "../../src/lib/codexModelCatalog.js";
import { getModelInfoCore } from "../../open-sse/services/model.js";

const createModel = (slug, priority) => ({
  slug,
  display_name: slug,
  description: `${slug} description`,
  default_reasoning_level: "medium",
  supported_reasoning_levels: [
    { effort: "medium", description: "Balanced reasoning" },
  ],
  shell_type: "unified_exec",
  visibility: "list",
  supported_in_api: true,
  support_verbosity: false,
  priority,
  truncation_policy: { mode: "tokens", limit: 10000 },
  experimental_supported_tools: [],
  base_instructions: "Template instructions",
  context_window: 128000,
  max_context_window: 128000,
});

describe("buildCodexModelCatalog", () => {
  it("adds main and subagent models while preserving bundled models", () => {
    const baseCatalog = {
      models: [createModel("gpt-5.5", 1), createModel("gpt-5.6-luna", 2)],
    };

    const result = buildCodexModelCatalog(baseCatalog, {
      model: "openrouter/custom/main",
      subagentModel: "xpl/gpt-5.6-luna",
      catalogModels: ["cx/gpt-5.6-sol", "openrouter/custom/spare"],
    });

    expect(result.customModelIds).toEqual([
      "openrouter/custom/main",
      "xpl/gpt-5.6-luna",
      "cx/gpt-5.6-sol",
      "openrouter/custom/spare",
    ]);
    expect(result.catalog.models.map(item => item.slug)).toEqual([
      "openrouter/custom/main",
      "xpl/gpt-5.6-luna",
      "cx/gpt-5.6-sol",
      "openrouter/custom/spare",
      "gpt-5.5",
      "gpt-5.6-luna",
    ]);
    expect(result.catalog.models[0]).toMatchObject({
      display_name: "PolyRouter · openrouter/custom/main",
      description: "Custom PolyRouter main model: openrouter/custom/main",
      base_instructions: "Template instructions",
    });
    expect(result.catalog.models[1].description).toContain("subagent");
    expect(result.catalog.models[2].description).toContain("picker");
  });

  it("uses the matching built-in model as the custom model template", () => {
    const luna = {
      ...createModel("gpt-5.6-luna", 2),
      base_instructions: "Luna instructions",
    };
    const result = buildCodexModelCatalog(
      { models: [createModel("gpt-5.5", 1), luna] },
      { model: "xpl/gpt-5.6-luna" }
    );

    expect(result.catalog.models[0]).toMatchObject({
      slug: "xpl/gpt-5.6-luna",
      base_instructions: "Luna instructions",
    });
  });

  it("does not add an entry when both selected models are bundled", () => {
    const baseCatalog = { models: [createModel("gpt-5.5", 1)] };
    const result = buildCodexModelCatalog(baseCatalog, {
      model: "gpt-5.5",
      subagentModel: "gpt-5.5",
    });

    expect(result.catalog).toBe(baseCatalog);
    expect(result.customModelIds).toEqual([]);
  });

  it("deduplicates a custom model shared by both roles", () => {
    const result = buildCodexModelCatalog(
      { models: [createModel("gpt-5.5", 1)] },
      { model: "xpl/custom-model", subagentModel: "xpl/custom-model" }
    );

    expect(result.customModelIds).toEqual(["xpl/custom-model"]);
    expect(result.catalog.models).toHaveLength(2);
  });

  it("ignores invalid catalog model entries", () => {
    const result = buildCodexModelCatalog(
      { models: [createModel("gpt-5.5", 1)] },
      { model: "xpl/main", catalogModels: [null, 42, " xpl/secondary "] }
    );

    expect(result.customModelIds).toEqual(["xpl/main", "xpl/secondary"]);
  });

  it("builds named Codex slots that route to their configured models", () => {
    const result = buildCodexModelCatalog(
      { models: [createModel("gpt-5.5", 1)] },
      {
        model: "codex-astra",
        subagentModel: "codex-sol",
        modelSlots: {
          "codex-astra": "anthropic/claude-fable-5",
          "codex-sol": "gemini/gemini-3-pro",
          "codex-terra": "openai/gpt-5.5",
          "codex-luna": "openrouter/deepseek-v4",
        },
      }
    );

    expect(result.catalog.models.slice(0, 4).map(model => [model.slug, model.display_name])).toEqual([
      ["codex-astra", "Astra"],
      ["codex-sol", "Sol"],
      ["codex-terra", "Terra"],
      ["codex-luna", "Luna"],
    ]);
    expect(result.catalog.models[0].description).toBe("Astra routes to anthropic/claude-fable-5");
    expect(CODEX_MODEL_SLOTS).toHaveLength(4);
  });

  it("rebuilds the catalog without a removed picker model while keeping other extras", () => {
    const baseCatalog = { models: [createModel("gpt-5.5", 1)] };
    const initial = buildCodexModelCatalog(baseCatalog, {
      model: "openrouter/main",
      subagentModel: "openrouter/subagent",
      catalogModels: ["openrouter/extra-a", "openrouter/extra-b"],
    });
    const updated = buildCodexModelCatalog(initial.catalog, {
      model: "openrouter/main",
      subagentModel: "openrouter/subagent",
      catalogModels: ["openrouter/extra-b"],
    });

    const pickerModels = updated.catalog.models.filter(isPolyRouterCatalogModel);
    expect(pickerModels.map(model => model.slug)).toEqual([
      "openrouter/main",
      "openrouter/subagent",
      "openrouter/extra-b",
    ]);
  });

  it("rejects a catalog without model metadata", () => {
    expect(() => buildCodexModelCatalog({ models: [] }, { model: "custom/model" }))
      .toThrow("usable model catalog");
  });
});

describe("isPolyRouterCatalogModel", () => {
  it("identifies generated PolyRouter picker entries", () => {
    const result = buildCodexModelCatalog(
      { models: [createModel("gpt-5.5", 1)] },
      { model: "xpl/custom-model" }
    );

    expect(isPolyRouterCatalogModel(result.catalog.models[0])).toBe(true);
    expect(isPolyRouterCatalogModel(result.catalog.models[1])).toBe(false);
  });

  it("recognizes named Codex slot entries", () => {
    expect(isPolyRouterCatalogModel({ slug: "codex-astra", display_name: "Astra" })).toBe(true);
  });
});

describe("isQualifiedCodexModelTarget", () => {
  it("accepts provider-qualified targets and rejects ambiguous bare model IDs", () => {
    expect(isQualifiedCodexModelTarget("anthropic/claude-fable-5")).toBe(true);
    expect(isQualifiedCodexModelTarget("openrouter/vendor/model")).toBe(true);
    expect(isQualifiedCodexModelTarget("claude-fable-5")).toBe(false);
    expect(isQualifiedCodexModelTarget("openrouter/")).toBe(false);
  });
});

describe("Codex slot request routing", () => {
  it("resolves slot IDs through the existing model alias resolver", async () => {
    const aliases = {
      "codex-astra": "anthropic/claude-fable-5",
      "codex-sol": "gemini/gemini-3-pro",
    };

    await expect(getModelInfoCore("codex-astra", aliases)).resolves.toEqual({
      provider: "anthropic",
      model: "claude-fable-5",
    });
    await expect(getModelInfoCore("codex-sol", aliases)).resolves.toEqual({
      provider: "gemini",
      model: "gemini-3-pro",
    });
  });
});
