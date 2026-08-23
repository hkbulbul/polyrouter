// The port the local app listens on — the tunnel target for every backend.
export function defaultLocalPort() {
  const configuredPort = Number.parseInt(process.env.PORT || "", 10);
  return Number.isInteger(configuredPort) && configuredPort > 0 && configuredPort <= 65535
    ? configuredPort
    : 20128;
}
