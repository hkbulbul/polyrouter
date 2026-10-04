import { AntigravityExecutor } from "./antigravity.js";
import { AzureExecutor } from "./azure.js";
import { GeminiCLIExecutor } from "./gemini-cli.js";
import { GithubExecutor } from "./github.js";
import { IFlowExecutor } from "./iflow.js";
import { QoderExecutor } from "./qoder.js";
import { KiroExecutor } from "./kiro.js";
import { KimchiExecutor } from "./kimchi.js";
import { CodexExecutor } from "./codex.js";
import { CursorExecutor } from "./cursor.js";
import { VertexExecutor } from "./vertex.js";
import { QwenExecutor } from "./qwen.js";
import { OpenCodeExecutor } from "./opencode.js";
import { OpenCodeGoExecutor } from "./opencode-go.js";
import { GrokWebExecutor } from "./grok-web.js";
import { GrokCliExecutor } from "./grok-cli.js";
import { PerplexityWebExecutor } from "./perplexity-web.js";
import { OllamaLocalExecutor } from "./ollama-local.js";
import { CommandCodeExecutor } from "./commandcode.js";
import { XiaomiTokenplanExecutor } from "./xiaomi-tokenplan.js";
import { MimoFreeExecutor } from "./mimo-free.js";
import { ChatGptWebExecutor } from "./chatgpt-web.js";
import { CodeBuddyExecutor } from "./codebuddy-cn.js";
import { TraeExecutor } from "./trae.js";
import { WindsurfExecutor } from "./windsurf.js";
import { DevinCliExecutor } from "./devin-cli.js";
import ZedExecutor from "./zed.js";
import { DefaultExecutor } from "./default.js";
import { getUnavailableProviderError } from "../providers/index.js";
import { resolveProviderAlias } from "../services/model.js";

const executors = {
  antigravity: new AntigravityExecutor(),
  azure: new AzureExecutor(),
  "gemini-cli": new GeminiCLIExecutor(),
  github: new GithubExecutor(),
  iflow: new IFlowExecutor(),
  qoder: new QoderExecutor(),
  kiro: new KiroExecutor(),
  kimchi: new KimchiExecutor(),
  codex: new CodexExecutor(),
  cursor: new CursorExecutor(),
  cu: new CursorExecutor(), // Alias for cursor
  vertex: new VertexExecutor("vertex"),
  "vertex-partner": new VertexExecutor("vertex-partner"),
  qwen: new QwenExecutor(),
  opencode: new OpenCodeExecutor(),
  "opencode-go": new OpenCodeGoExecutor(),
  "grok-web": new GrokWebExecutor(),
  "grok-cli": new GrokCliExecutor(),
  gcli: new GrokCliExecutor(), // Alias
  gb: new GrokCliExecutor(), // Alias (Grok Build)
  "perplexity-web": new PerplexityWebExecutor(),
  "ollama-local": new OllamaLocalExecutor(),
  commandcode: new CommandCodeExecutor(),
  "xiaomi-tokenplan": new XiaomiTokenplanExecutor(),
  "mimo-free": new MimoFreeExecutor(),
  "chatgpt-web": new ChatGptWebExecutor(),
  mmf: new MimoFreeExecutor(), // Alias for mimo-free
  "codebuddy-cn": new CodeBuddyExecutor(),
  trae: new TraeExecutor(),
  tr: new TraeExecutor(),
  windsurf: new WindsurfExecutor(),
  "devin-cli": new DevinCliExecutor(),
  zed: new ZedExecutor(),
};

const defaultCache = new Map();

export function getExecutor(provider) {
  const canonicalProvider = resolveProviderAlias(provider);
  const unavailableError = getUnavailableProviderError(canonicalProvider);
  if (unavailableError) throw new Error(unavailableError);
  if (executors[canonicalProvider]) return executors[canonicalProvider];
  if (!defaultCache.has(canonicalProvider)) {
    defaultCache.set(canonicalProvider, new DefaultExecutor(canonicalProvider));
  }
  return defaultCache.get(canonicalProvider);
}

export function hasSpecializedExecutor(provider) {
  return !!executors[resolveProviderAlias(provider)];
}

export { BaseExecutor } from "./base.js";
export { AntigravityExecutor } from "./antigravity.js";
export { AzureExecutor } from "./azure.js";
export { GeminiCLIExecutor } from "./gemini-cli.js";
export { GithubExecutor } from "./github.js";
export { IFlowExecutor } from "./iflow.js";
export { QoderExecutor } from "./qoder.js";
export { KiroExecutor } from "./kiro.js";
export { KimchiExecutor } from "./kimchi.js";
export { CodexExecutor } from "./codex.js";
export { CursorExecutor } from "./cursor.js";
export { VertexExecutor } from "./vertex.js";
export { DefaultExecutor } from "./default.js";
export { QwenExecutor } from "./qwen.js";
export { OpenCodeExecutor } from "./opencode.js";
export { OpenCodeGoExecutor } from "./opencode-go.js";
export { GrokWebExecutor } from "./grok-web.js";
export { GrokCliExecutor } from "./grok-cli.js";
export { PerplexityWebExecutor } from "./perplexity-web.js";
export { OllamaLocalExecutor } from "./ollama-local.js";
export { CommandCodeExecutor } from "./commandcode.js";
export { XiaomiTokenplanExecutor } from "./xiaomi-tokenplan.js";
export { MimoFreeExecutor } from "./mimo-free.js";
export { ChatGptWebExecutor } from "./chatgpt-web.js";
export { TraeExecutor } from "./trae.js";
export { WindsurfExecutor } from "./windsurf.js";
export { DevinCliExecutor } from "./devin-cli.js";
export { default as ZedExecutor } from "./zed.js";
export { CodeBuddyExecutor } from "./codebuddy-cn.js";
