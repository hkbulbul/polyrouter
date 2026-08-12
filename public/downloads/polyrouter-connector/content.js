const PAGE_SOURCE = "polyrouter-web";
const EXTENSION_SOURCE = "polyrouter-connector";

function postToPage(message) {
  window.postMessage(
    {
      source: EXTENSION_SOURCE,
      ...message,
    },
    window.location.origin
  );
}

postToPage({
  type: "POLYROUTER_CONNECTOR_READY",
  version: chrome.runtime.getManifest().version,
});

window.addEventListener("message", async (event) => {
  if (
    event.source !== window ||
    event.origin !== window.location.origin ||
    event.data?.source !== PAGE_SOURCE ||
    event.data?.type !== "POLYROUTER_CONNECTOR_REQUEST"
  ) {
    return;
  }

  const { requestId, action, provider } = event.data;

  if (action === "IMPORT_PROVIDER_SESSION") {
    const confirmed = window.confirm(
      "Allow PolyRouter Connector to import this provider session into your local PolyRouter instance?"
    );
    if (!confirmed) {
      postToPage({
        type: "POLYROUTER_CONNECTOR_RESPONSE",
        requestId,
        ok: false,
        error: "Session import cancelled",
      });
      return;
    }
  }

  try {
    const response = await chrome.runtime.sendMessage({ action, provider });
    postToPage({
      type: "POLYROUTER_CONNECTOR_RESPONSE",
      requestId,
      ...response,
    });
  } catch (error) {
    postToPage({
      type: "POLYROUTER_CONNECTOR_RESPONSE",
      requestId,
      ok: false,
      error: error.message || String(error),
    });
  }
});
