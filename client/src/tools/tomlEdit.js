// Line-based edits for Codex's config.toml that touch only what PolyRouter
// manages (a few top-level keys and one table) and leave everything else —
// comments, ordering, formatting — byte-for-byte as the user wrote it.

const HEADER_RE = /^\s*\[\[?\s*([A-Za-z0-9_\-."' ]+?)\s*\]\]?\s*(#.*)?$/;

// Classify each line: is it a table header, and is it inside a multi-line
// string or array (where a "[" at line start is data, not a header)?
function scan(lines) {
  const info = [];
  let inString = null; // '"""' or "'''"
  let depth = 0;
  for (const line of lines) {
    const header = !inString && depth === 0 ? HEADER_RE.exec(line) : null;
    info.push({ header: header ? header[1].replace(/\s+/g, "") : null, top: false });
    if (header) continue;
    // Track multi-line strings and bracket depth outside of strings.
    let i = 0;
    while (i < line.length) {
      if (inString) {
        const end = line.indexOf(inString, i);
        if (end === -1) break;
        inString = null;
        i = end + 3;
        continue;
      }
      const ch = line[i];
      if (ch === "#") break;
      if (line.startsWith('"""', i) || line.startsWith("'''", i)) {
        inString = line.slice(i, i + 3);
        i += 3;
        continue;
      }
      if (ch === '"' || ch === "'") {
        // Single-line string: skip to its closing quote (honouring \" in basic strings).
        let j = i + 1;
        while (j < line.length && line[j] !== ch) j += ch === '"' && line[j] === "\\" ? 2 : 1;
        i = j + 1;
        continue;
      }
      if (ch === "[") depth += 1;
      else if (ch === "]") depth = Math.max(0, depth - 1);
      i += 1;
    }
  }
  // Top-level region: everything before the first header.
  const firstHeader = info.findIndex((l) => l.header);
  const topEnd = firstHeader === -1 ? lines.length : firstHeader;
  for (let k = 0; k < topEnd; k += 1) info[k].top = true;
  return { info, topEnd };
}

const splitLines = (text) => (text ? text.replace(/\r\n/g, "\n").split("\n") : []);
const joinLines = (lines) => lines.join("\n");
const keyRe = (key) => new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*=`);

export function tomlString(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Raw line of a top-level key, or null. */
export function getTopLevelLine(text, key) {
  const lines = splitLines(text);
  const { topEnd } = scan(lines);
  const re = keyRe(key);
  for (let i = 0; i < topEnd; i += 1) if (re.test(lines[i])) return lines[i];
  return null;
}

export function removeTopLevelKey(text, key) {
  const lines = splitLines(text);
  const { topEnd } = scan(lines);
  const re = keyRe(key);
  return joinLines(lines.filter((line, i) => !(i < topEnd && re.test(line))));
}

/** Put `rawLine` at the start of the top-level region, replacing any existing line for `key`. */
export function setTopLevelLine(text, key, rawLine) {
  const lines = splitLines(removeTopLevelKey(text, key));
  return joinLines([rawLine, ...lines]);
}

// Line ranges of a table and its sub-tables (e.g. [a.b] and [a.b.c]).
function tableRanges(lines, header) {
  const { info } = scan(lines);
  const ranges = [];
  for (let i = 0; i < lines.length; i += 1) {
    const h = info[i].header;
    if (h && (h === header || h.startsWith(`${header}.`))) {
      let end = i + 1;
      while (end < lines.length && !info[end].header) end += 1;
      ranges.push([i, end]);
      i = end - 1;
    }
  }
  return ranges;
}

/** Raw text of a table (with sub-tables), or null. */
export function getTable(text, header) {
  const lines = splitLines(text);
  const ranges = tableRanges(lines, header);
  if (!ranges.length) return null;
  return ranges.map(([s, e]) => joinLines(lines.slice(s, e)).replace(/\n+$/, "")).join("\n\n");
}

export function removeTable(text, header) {
  const lines = splitLines(text);
  const drop = new Set();
  for (const [s, e] of tableRanges(lines, header)) for (let i = s; i < e; i += 1) drop.add(i);
  return joinLines(lines.filter((_, i) => !drop.has(i)));
}

/** Append raw table text at the end, separated by one blank line. */
export function appendTable(text, tableText) {
  const base = String(text || "").replace(/\s+$/, "");
  return `${base ? `${base}\n\n` : ""}${tableText.replace(/\s+$/, "")}\n`;
}
