// Terminal presentation for polyrouter-client (no dependencies).
// Colors only on a real TTY and never when NO_COLOR is set; ASCII symbols
// where the terminal can't be trusted with Unicode (legacy Windows consoles).

const out = process.stdout;

export function colorEnabled(stream = out, env = process.env) {
  if ("NO_COLOR" in env) return false;
  if (env.FORCE_COLOR && env.FORCE_COLOR !== "0") return true;
  return Boolean(stream.isTTY) && env.TERM !== "dumb";
}

function unicodeSupported(env = process.env) {
  if (process.platform !== "win32") return env.TERM !== "linux";
  return Boolean(env.WT_SESSION || env.TERMINUS_SUBLIME || env.ConEmuTask === "{cmd::Cmder}" || env.TERM_PROGRAM === "vscode" || env.TERM === "xterm-256color" || env.TERM === "alacritty");
}

const useColor = colorEnabled();
const wrap = (open, close) => (s) => (useColor ? `\u001b[${open}m${s}\u001b[${close}m` : String(s));

export const c = {
  bold: wrap(1, 22),
  dim: wrap(2, 22),
  red: wrap(31, 39),
  green: wrap(32, 39),
  yellow: wrap(33, 39),
  cyan: wrap(36, 39),
  gray: wrap(90, 39),
};

const uni = unicodeSupported();
export const sym = uni
  ? { ok: "✔", err: "✖", warn: "▲", dot: "●", arrow: "→", brand: "◆", full: "█", empty: "░", bullet: "•" }
  : { ok: "√", err: "x", warn: "!", dot: "*", arrow: "->", brand: "*", full: "#", empty: "-", bullet: "-" };

const ANSI_RE = /\u001b\[[0-9;]*m/g;
export const visibleLength = (s) => String(s).replace(ANSI_RE, "").length;
const padEnd = (s, n) => s + " ".repeat(Math.max(0, n - visibleLength(s)));

export function header(title, subtitle) {
  console.log(`\n${c.green(sym.brand)} ${c.bold(title)}${subtitle ? `  ${c.gray(subtitle)}` : ""}`);
}

export function section(title) {
  console.log(`\n${c.bold(title)}`);
}

export const success = (msg) => console.log(`${c.green(sym.ok)} ${msg}`);
export const failure = (msg) => console.log(`${c.red(sym.err)} ${msg}`);
export const warn = (msg) => console.log(`${c.yellow(sym.warn)} ${msg}`);
export const info = (msg) => console.log(`${c.cyan(sym.dot)} ${msg}`);
export const note = (msg) => console.log(c.gray(msg));

/** Aligned "label  value" rows, indented two spaces. */
export function keyValues(rows) {
  const width = Math.max(...rows.map(([k]) => visibleLength(k)));
  for (const [k, v] of rows) console.log(`  ${c.gray(padEnd(k, width))}  ${v}`);
}

/** Colored usage bar: green below 80%, yellow below 100%, red at or above. */
export function bar(percent, width = 20) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  const filled = Math.round((p / 100) * width);
  const tone = p >= 100 ? c.red : p >= 80 ? c.yellow : c.green;
  return tone(sym.full.repeat(filled)) + c.gray(sym.empty.repeat(width - filled));
}

/** Simple table with right-aligned numeric columns after the first. */
export function table(head, rows) {
  const widths = head.map((h, i) => Math.max(visibleLength(h), ...rows.map((r) => visibleLength(r[i]))));
  const line = (cells, style = (x) => x) =>
    "  " + cells.map((cell, i) => (i === 0 ? padEnd(style(cell), widths[i]) : " ".repeat(widths[i] - visibleLength(cell)) + style(cell))).join("   ");
  console.log(line(head, c.gray));
  for (const r of rows) console.log(line(r));
}

/** Run `task` while showing a spinner (TTY only). Returns the task's result. */
export async function spin(text, task) {
  if (!out.isTTY) return task();
  const frames = uni ? ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] : ["-", "\\", "|", "/"];
  let i = 0;
  const render = () => out.write(`\r${c.cyan(frames[i++ % frames.length])} ${text}`);
  render();
  const timer = setInterval(render, 80);
  try {
    return await task();
  } finally {
    clearInterval(timer);
    out.write(`\r${" ".repeat(visibleLength(text) + 2)}\r`);
  }
}
