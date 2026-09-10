const readline = require("readline");

const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underline: "\x1b[4m",
  reverse: "\x1b[7m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  white: "\x1b[37m",
  bgGreen: "\x1b[42m",
  bgBlue: "\x1b[44m",
  black: "\x1b[30m",
  brand: "\x1b[38;2;34;197;94m", // #22c55e (PolyRouter brand green)
  brandHover: "\x1b[38;2;74;222;128m", // #4ade80 (PolyRouter brand hover)
  bgBrand: "\x1b[48;2;34;197;94m", // #22c55e background
  brandDark: "\x1b[38;2;22;163;74m", // #16a34a (Primary green)
  terracotta: "\x1b[38;2;34;197;94m", // Backward compatibility alias
  bgTerracotta: "\x1b[48;2;34;197;94m"
};

// Prime stdin once globally. Toggling raw mode between menus adds latency on
// macOS, so we keep raw mode on for the whole TUI session.
let rawPrimed = false;
function primeRawOnce() {
  if (rawPrimed || !process.stdin.isTTY) return;
  try {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.setEncoding("utf8");
    process.stdin.resume();
    rawPrimed = true;
  } catch {}
}

function suspendRawFor(fn) {
  // Temporarily drop raw mode so readline.question can buffer line input.
  const wasPrimed = rawPrimed;
  if (wasPrimed && process.stdin.isTTY) {
    try { process.stdin.setRawMode(false); } catch {}
  }
  return fn().finally(() => {
    if (wasPrimed && process.stdin.isTTY) {
      try { process.stdin.setRawMode(true); } catch {}
      process.stdin.resume();
    }
  });
}

async function prompt(question) {
  return suspendRawFor(() => new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve((answer || "").trim());
    });
  }));
}

async function select(question, options) {
  console.log(question);
  options.forEach((opt, i) => console.log(`  ${i + 1}. ${opt}`));
  while (true) {
    const answer = await prompt("\nSelect option (number): ");
    const num = parseInt(answer, 10);
    if (!isNaN(num) && num >= 1 && num <= options.length) return num - 1;
    console.log(`Invalid selection. Please enter a number between 1 and ${options.length}`);
  }
}

async function confirm(question) {
  while (true) {
    const answer = await prompt(`${question} (y/n): `);
    const lower = answer.toLowerCase();
    if (lower === "y" || lower === "yes") return true;
    if (lower === "n" || lower === "no") return false;
    console.log("Please answer 'y' or 'n'");
  }
}

async function pause(message = "Press Enter to continue...") {
  return suspendRawFor(() => new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(message, () => { rl.close(); resolve(); });
  }));
}

/**
 * Strip ANSI escape codes to calculate visual string length
 */
function stripAnsi(str) {
  if (typeof str !== "string") return "";
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Interactive arrow-key menu styled with PolyRouter design language.
 * Clean modern bordered card layout with brand accents.
 */
async function selectMenu(title, items, defaultIndex = 0, subtitle = "", headerContent = "", breadcrumb = []) {
  return new Promise((resolve) => {
    let selectedIndex = defaultIndex;
    let isActive = true;

    primeRawOnce();
    if (!process.stdin.isTTY) { resolve(-1); return; }

    const renderMenu = () => {
      if (!isActive) return;
      process.stdout.write("\x1b[2J\x1b[H");

      const termWidth = process.stdout.columns || 80;
      // Fixed comfortable card width, responsive to smaller terminals
      const cardWidth = Math.max(48, Math.min(termWidth - 4, 64));
      const innerWidth = cardWidth - 2;

      const lines = [];

      // Top border: ╭──────────────────────────────╮
      lines.push(`${COLORS.dim}╭${"─".repeat(innerWidth)}╮${COLORS.reset}`);

      // Brand Title line: │  ● PolyRouter  v1.0.28   │
      // If title includes version or subpage, format gracefully
      let headerTitle = title;
      if (headerTitle.startsWith("Choose Interface")) {
        headerTitle = `${COLORS.brand}●${COLORS.reset} ${COLORS.bright}${COLORS.brand}Poly${COLORS.reset}${COLORS.bright}Router${COLORS.reset} ${COLORS.dim}${title.replace("Choose Interface ", "")}${COLORS.reset}`;
      } else {
        headerTitle = `${COLORS.brand}●${COLORS.reset} ${COLORS.bright}${title}${COLORS.reset}`;
      }

      const visualHeaderLen = stripAnsi(headerTitle).length;
      const rightPad = Math.max(0, innerWidth - 3 - visualHeaderLen);
      lines.push(`${COLORS.dim}│${COLORS.reset}   ${headerTitle}${" ".repeat(rightPad)}${COLORS.dim}│${COLORS.reset}`);

      // Subtitle (e.g. server URL or status)
      if (subtitle) {
        const visualSubLen = stripAnsi(subtitle).length;
        const subPad = Math.max(0, innerWidth - 3 - visualSubLen);
        lines.push(`${COLORS.dim}│${COLORS.reset}   ${subtitle}${" ".repeat(subPad)}${COLORS.dim}│${COLORS.reset}`);
      }

      // Breadcrumb path
      if (breadcrumb.length > 0) {
        const bcText = `${COLORS.dim}${breadcrumb.join(" › ")}${COLORS.reset}`;
        const visualBcLen = stripAnsi(bcText).length;
        const bcPad = Math.max(0, innerWidth - 3 - visualBcLen);
        lines.push(`${COLORS.dim}│${COLORS.reset}   ${bcText}${" ".repeat(bcPad)}${COLORS.dim}│${COLORS.reset}`);
      }

      // Header content (Endpoint, tunnel status, keys, etc.)
      if (headerContent) {
        lines.push(`${COLORS.dim}├${"─".repeat(innerWidth)}┤${COLORS.reset}`);
        const headerLines = String(headerContent).split("\n");
        for (const hLine of headerLines) {
          const visLen = stripAnsi(hLine).length;
          const pad = Math.max(0, innerWidth - 3 - visLen);
          lines.push(`${COLORS.dim}│${COLORS.reset}   ${hLine}${" ".repeat(pad)}${COLORS.dim}│${COLORS.reset}`);
        }
      }

      // Divider before items
      lines.push(`${COLORS.dim}├${"─".repeat(innerWidth)}┤${COLORS.reset}`);
      lines.push(`${COLORS.dim}│${" ".repeat(innerWidth)}│${COLORS.reset}`);

      // Render Menu Items
      items.forEach((item, index) => {
        const isSelected = index === selectedIndex;
        const iconPrefix = isSelected
          ? `${COLORS.brand}❯${COLORS.reset}`
          : " ";

        let itemDisplay = "";
        if (isSelected) {
          itemDisplay = `${COLORS.bright}${COLORS.brand}${item.label}${COLORS.reset}`;
        } else {
          itemDisplay = `${COLORS.dim}${item.label}${COLORS.reset}`;
        }

        const fullItemLine = ` ${iconPrefix}  ${itemDisplay}`;
        const visualItemLen = stripAnsi(fullItemLine).length;
        const pad = Math.max(0, innerWidth - visualItemLen);
        lines.push(`${COLORS.dim}│${COLORS.reset}${fullItemLine}${" ".repeat(pad)}${COLORS.dim}│${COLORS.reset}`);
      });

      // Bottom padding & help hint
      lines.push(`${COLORS.dim}│${" ".repeat(innerWidth)}│${COLORS.reset}`);
      const hint = `${COLORS.dim}Use ↑/↓ to navigate • Enter to select • Esc to back${COLORS.reset}`;
      const visualHintLen = stripAnsi(hint).length;
      const hintPad = Math.max(0, innerWidth - 3 - visualHintLen);
      lines.push(`${COLORS.dim}│${COLORS.reset}   ${hint}${" ".repeat(hintPad)}${COLORS.dim}│${COLORS.reset}`);

      // Bottom border: ╰──────────────────────────────╯
      lines.push(`${COLORS.dim}╰${"─".repeat(innerWidth)}╯${COLORS.reset}`);

      console.log("\n" + lines.join("\n"));
    };

    const cleanup = () => {
      if (!isActive) return;
      isActive = false;
      process.stdin.removeListener("keypress", onKeypress);
    };

    const move = (delta) => {
      selectedIndex = (selectedIndex + delta + items.length) % items.length;
      renderMenu();
    };

    const onKeypress = (_str, key) => {
      if (!isActive || !key) return;
      if (key.name === "up") return move(-1);
      if (key.name === "down") return move(1);
      if (key.name === "return") { cleanup(); resolve(selectedIndex); return; }
      if (key.name === "escape") { cleanup(); resolve(-1); return; }
      if (key.ctrl && key.name === "c") { cleanup(); process.exit(0); }
    };

    process.stdin.on("keypress", onKeypress);
    renderMenu();
  });
}

module.exports = {
  prompt,
  select,
  confirm,
  pause,
  selectMenu,
  COLORS
};
