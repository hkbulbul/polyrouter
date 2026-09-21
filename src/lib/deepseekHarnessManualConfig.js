export function buildHarnessSettingsYaml({ baseUrl, models, defaultModel }) {
  const selectedModels = Array.isArray(models) && models.length > 0
    ? models
    : [defaultModel || "provider/model-id"];
  const selectedDefault = defaultModel || selectedModels[0];

  return `llm-pi-ai:\n  providers:\n    polyrouter:\n      displayName: PolyRouter\n      apiKeyEnv: POLYROUTER_API_KEY\n      api: openai-completions\n      baseURL: ${baseUrl}\n      compat:\n        thinkingFormat: deepseek\n      models:\n${selectedModels.map((model) => `        - id: ${model}\n          name: ${model}`).join("\n")}\n\nagent-default-model:\n  provider: polyrouter\n  model: ${selectedDefault}\n`;
}
