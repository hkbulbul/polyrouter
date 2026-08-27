const PROVIDERS = {
  "chatgpt-web": {
    label: "ChatGPT",
    loginUrl: "https://chatgpt.com/",
    tabPatterns: ["https://chatgpt.com/*", "https://*.chatgpt.com/*"],
    cookieDomains: ["chatgpt.com", "openai.com"],
  },
};

function getProvider(providerId) {
  const provider = PROVIDERS[providerId];
  if (!provider) {
    throw new Error(`Unsupported provider: ${providerId}`);
  }
  return provider;
}

function getPolyRouterOrigin(sender) {
  const senderUrl = sender.url || sender.tab?.url;
  if (!senderUrl) {
    throw new Error("PolyRouter page origin is unavailable");
  }

  const url = new URL(senderUrl);
  const isLoopback = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "http:" || !isLoopback) {
    throw new Error("The connector only accepts requests from local PolyRouter pages");
  }

  return url.origin;
}

async function collectProviderCookies(provider) {
  const cookiesByKey = new Map();

  for (const domain of provider.cookieDomains) {
    const cookies = await chrome.cookies.getAll({ domain });
    for (const cookie of cookies) {
      const partition = cookie.partitionKey?.topLevelSite || "";
      const key = [cookie.storeId, cookie.domain, cookie.path, cookie.name, partition].join("|");
      cookiesByKey.set(key, cookie);
    }
  }

  return Array.from(cookiesByKey.values());
}

async function findProviderTab(provider) {
  const tabs = await chrome.tabs.query({ url: provider.tabPatterns });
  return tabs.find((tab) => typeof tab.id === "number");
}

async function focusOrOpenProviderTab(provider) {
  const existingTab = await findProviderTab(provider);

  if (existingTab?.id) {
    await chrome.tabs.update(existingTab.id, { active: true });
    if (typeof existingTab.windowId === "number") {
      await chrome.windows.update(existingTab.windowId, { focused: true });
    }
    return { reused: true };
  }

  await chrome.tabs.create({ url: provider.loginUrl, active: true });
  return { reused: false };
}

async function verifyProviderSession(provider) {
  const tab = await findProviderTab(provider);
  if (!tab?.id) {
    throw new Error(`Open ${provider.label} in this Chrome window and sign in first.`);
  }

  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => ({
      authenticated: Boolean(
        document.querySelector(
          '#prompt-textarea, [data-testid="prompt-textarea"], [contenteditable="true"][data-lexical-editor="true"]'
        )
      ),
    }),
  });

  if (!result?.result?.authenticated) {
    throw new Error(
      `The open ${provider.label} tab is not signed in yet. Finish signing in, wait for the chat composer, then import again.`
    );
  }
}

async function importProviderSession(providerId, connectionId, sender) {
  getPolyRouterOrigin(sender);
  const provider = getProvider(providerId);
  await verifyProviderSession(provider);
  const cookies = await collectProviderCookies(provider);

  if (cookies.length === 0) {
    throw new Error(`No ${provider.label} cookies were found. Sign in first, then try again.`);
  }

  return { provider: providerId, connectionId: connectionId || null, cookies };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handleMessage = async () => {
    switch (message?.action) {
      case "PING":
        return { version: chrome.runtime.getManifest().version };
      case "OPEN_PROVIDER_TAB":
        return focusOrOpenProviderTab(getProvider(message.provider));
      case "IMPORT_PROVIDER_SESSION":
        return importProviderSession(message.provider, message.connectionId, sender);
      default:
        throw new Error("Unknown PolyRouter Connector action");
    }
  };

  handleMessage()
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));

  return true;
});
