const api = require("./api/client");
const { showMenuWithBack } = require("./utils/menuHelper");
const { showProvidersMenu } = require("./menus/providers");
const { showApiKeysMenu } = require("./menus/apiKeys");
const { showCombosMenu } = require("./menus/combos");
const { showSettingsMenu } = require("./menus/settings");
const { showCliToolsMenu } = require("./menus/cliTools");

const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  brand: "\x1b[38;2;34;197;94m",
  green: "\x1b[38;2;34;197;94m",
  red: "\x1b[38;2;239;68;68m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m"
};

// Cached header (SWR): show last value instantly, refresh in background.
let cachedHeader = "";
let fetchingHeader = false;

function renderHeader(port, keys, tunnel) {
  const tunnelEnabled = tunnel && tunnel.enabled === true;
  const lines = [];
  if (tunnelEnabled && tunnel.publicUrl) {
    lines.push(`Endpoint: ${COLORS.green}${tunnel.publicUrl}/v1${COLORS.reset}`);
    lines.push(`Tunnel:   ${COLORS.green}Active${COLORS.reset} ${COLORS.dim}(${tunnel.shortId})${COLORS.reset}`);
  } else {
    lines.push(`Endpoint: ${COLORS.bright}http://localhost:${port}/v1${COLORS.reset}`);
    lines.push(`Tunnel:   ${COLORS.dim}Inactive (local only)${COLORS.reset}`);
  }
  if (!keys || keys.length === 0) {
    lines.push(`API Key:  ${COLORS.dim}No keys configured${COLORS.reset}`);
  } else {
    lines.push(`API Key:  ${COLORS.brand}${keys[0].key}${COLORS.reset}`);
    keys.slice(1).forEach(k => lines.push(`          ${COLORS.brand}${k.key}${COLORS.reset}`));
  }
  return lines.join("\n");
}

async function refreshHeaderBg(port) {
  if (fetchingHeader) return;
  fetchingHeader = true;
  try {
    const [keysResult, tunnelResult] = await Promise.all([
      api.getApiKeys(),
      api.getTunnelStatus()
    ]);
    const keys = keysResult.success ? (keysResult.data.keys || []) : [];
    const tunnel = tunnelResult.success ? (tunnelResult.data || {}) : {};
    cachedHeader = renderHeader(port, keys, tunnel);
  } finally {
    fetchingHeader = false;
  }
}

function getHeader(port) {
  // Kick off background refresh; return cache (or placeholder on first call).
  refreshHeaderBg(port);
  return cachedHeader || `Endpoint: http://localhost:${port}/v1\nTunnel:   ${COLORS.dim}...${COLORS.reset}\nKey:      ${COLORS.dim}...${COLORS.reset}`;
}

/**
 * Start Terminal UI
 * @param {number} port - Server port number
 */
async function startTerminalUI(port) {
  // Configure API client
  api.configure({ port });

  const basePath = ["PolyRouter"];

  // Prime header cache before first render
  await refreshHeaderBg(port);

  // Main menu
  await showMenuWithBack({
    title: "PolyRouter Console",
    breadcrumb: basePath,
    headerContent: () => getHeader(port),
    items: [
      {
        label: "AI Providers        (Connect & Manage)",
        action: async () => {
          await showProvidersMenu([...basePath, "Providers"]);
          return true; // Continue
        }
      },
      {
        label: "API Keys            (Generate & Manage)",
        action: async () => {
          await showApiKeysMenu(port, [...basePath, "API Keys"]);
          return true;
        }
      },
      {
        label: "Model Combos        (Fallback Chains)",
        action: async () => {
          await showCombosMenu([...basePath, "Combos"]);
          return true;
        }
      },
      {
        label: "Coding CLI Tools    (Claude, Cline, Codex)",
        action: async () => {
          await showCliToolsMenu(port, [...basePath, "CLI Tools"]);
          return true;
        }
      },
      {
        label: "Settings & Tunnel   (RTK, Auth, Network)",
        action: async () => {
          await showSettingsMenu([...basePath, "Settings"]);
          return true;
        }
      }
    ],
    backLabel: "← Return to Main Menu"
  });
}

module.exports = { startTerminalUI };
