import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const registryDir = join(scriptDir, "..", "open-sse", "providers", "registry");
const indexPath = join(registryDir, "index.js");
const current = readFileSync(indexPath, "utf8");
const orderedNames = [
  ...new Set(
    [...current.matchAll(/from "\.\/([^"]+)\.js"/g)].map((match) => match[1]),
  ),
];
const known = new Set(orderedNames);
const addedNames = readdirSync(registryDir)
  .filter((name) => name.endsWith(".js") && name !== "index.js")
  .map((name) => name.slice(0, -3))
  .filter((name) => !known.has(name))
  .sort();

orderedNames.push(...addedNames);

const imports = orderedNames.map((name, index) => `import p${index} from "./${name}.js";`);
const exports = orderedNames.map((_, index) => `  p${index},`);
const output = [
  "// Auto-generated: static imports for all registry entries",
  ...imports,
  "",
  "export default [",
  ...exports,
  "];",
  "",
].join("\n");

writeFileSync(indexPath, output, "utf8");
