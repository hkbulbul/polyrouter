import path from "node:path";

const BROWSER_CHANNELS = ["chrome", "msedge"];
const BROWSER_ARGS = ["--no-first-run", "--no-default-browser-check"];

export class InstalledChromiumError extends Error {
  constructor(message = "Google Chrome or Microsoft Edge is required for browser sign-in") {
    super(message);
    this.name = "InstalledChromiumError";
    this.code = "BROWSER_UNAVAILABLE";
  }
}

async function loadChromium() {
  const { chromium } = await import("playwright-core");
  return chromium;
}

async function tryChannels(operation, channels = BROWSER_CHANNELS) {
  let lastError;
  for (const channel of channels) {
    try {
      return await operation(channel);
    } catch (error) {
      lastError = error;
    }
  }

  const unavailable = new InstalledChromiumError(
    process.env.DISPLAY === "" && process.platform !== "win32"
      ? "Browser sign-in needs a desktop session"
      : "Install Google Chrome or Microsoft Edge to use browser sign-in",
  );
  unavailable.cause = lastError;
  throw unavailable;
}

export async function launchInstalledChromium(options = {}) {
  const chromium = await loadChromium();
  return tryChannels(async (channel) => ({
    browser: await chromium.launch({
      headless: false,
      args: BROWSER_ARGS,
      ...options,
      channel,
    }),
    channel,
  }));
}

export async function launchInstalledPersistentChromium(profileRoot, options = {}) {
  const chromium = await loadChromium();
  const { preferredChannel, ...launchOptions } = options;
  const channels = preferredChannel ? [preferredChannel] : BROWSER_CHANNELS;
  return tryChannels(async (channel) => {
    const profileDir = path.join(profileRoot, channel);
    const context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      args: BROWSER_ARGS,
      viewport: { width: 1280, height: 900 },
      ...launchOptions,
      channel,
    });
    return { context, channel, profileDir };
  }, channels);
}

export const __test__ = { BROWSER_CHANNELS, tryChannels };
