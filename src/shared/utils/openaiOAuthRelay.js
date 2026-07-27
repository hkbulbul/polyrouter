const RELAY_STATE_PREFIX = "oo2_";

const bytesToBase64Url = (bytes) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return globalThis.btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
};

const encodeBase64Url = (value) =>
  bytesToBase64Url(new TextEncoder().encode(value));

export function createOpenAIOAuthRelayState(callbackUrl, appState) {
  const nonceBytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(nonceBytes);
  const payload = {
    type: "openai-oauth-callback",
    version: 1,
    nonce: bytesToBase64Url(nonceBytes),
    callbackUrl,
    ...(appState ? { appState } : {}),
  };
  return `${RELAY_STATE_PREFIX}${encodeBase64Url(JSON.stringify(payload))}`;
}
