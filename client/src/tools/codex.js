// Codex: a [model_providers.polyrouter] table plus model_provider (and
// optionally model) in ~/.codex/config.toml, matching the PolyRouter
// dashboard's Codex card.
import fs from "node:fs";
import path from "node:path";
import { getSnapshot, saveSnapshotOnce, updateSnapshot, clearSnapshot } from "./snapshot.js";
import { getTopLevelLine, setTopLevelLine, removeTopLevelKey, getTable, removeTable, appendTable, tomlString } from "./tomlEdit.js";

export const id = "codex";
export const label = "Codex";

const TABLE = "model_providers.polyrouter";
const configPath = (home) => path.join(home, ".codex", "config.toml");

export function detect(home) {
  return fs.existsSync(path.join(home, ".codex"));
}

function providerTable(serverUrl, apiKey) {
  return [
    `[${TABLE}]`,
    `name = "PolyRouter"`,
    `base_url = ${tomlString(`${serverUrl}/v1`)}`,
    `wire_api = "responses"`,
    `requires_openai_auth = false`,
    `experimental_bearer_token = ${tomlString(apiKey)}`,
  ].join("\n");
}

/** The top-level model Codex will request, or null. */
export function currentModel(home) {
  const file = configPath(home);
  if (!fs.existsSync(file)) return null;
  const line = getTopLevelLine(fs.readFileSync(file, "utf8"), "model");
  const match = line && /=\s*["'](.*)["']\s*(#.*)?$/.exec(line);
  return match ? match[1] : null;
}

export function apply({ home, serverUrl, apiKey, model }) {
  const file = configPath(home);
  let text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";

  const snapshot = saveSnapshotOnce(id, {
    file,
    modelProviderLine: getTopLevelLine(text, "model_provider"),
    modelLine: getTopLevelLine(text, "model"),
    table: getTable(text, TABLE),
    managesModel: false,
  });
  // `model` is only restored if we ever wrote it (the original was captured on first connect).
  if (model && !snapshot.managesModel) updateSnapshot(id, { managesModel: true });

  text = setTopLevelLine(text, "model_provider", `model_provider = "polyrouter"`);
  if (model) text = setTopLevelLine(text, "model", `model = ${tomlString(model)}`);
  text = appendTable(removeTable(text, TABLE), providerTable(serverUrl, apiKey));

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return `${file} → model_provider = "polyrouter"${model ? `, model = "${model}"` : ""}, [${TABLE}]`;
}

export function restore({ home }) {
  const snapshot = getSnapshot(id);
  if (!snapshot) return null;
  const file = snapshot.file || configPath(home);
  if (fs.existsSync(file)) {
    let text = fs.readFileSync(file, "utf8");
    text = removeTable(text, TABLE);
    if (snapshot.table) text = appendTable(text, snapshot.table);
    text = snapshot.modelProviderLine
      ? setTopLevelLine(text, "model_provider", snapshot.modelProviderLine)
      : removeTopLevelKey(text, "model_provider");
    if (snapshot.managesModel) {
      text = snapshot.modelLine ? setTopLevelLine(text, "model", snapshot.modelLine) : removeTopLevelKey(text, "model");
    }
    text = text.replace(/\s+$/, "");
    fs.writeFileSync(file, text ? `${text}\n` : "");
  }
  clearSnapshot(id);
  return `${file} restored`;
}
