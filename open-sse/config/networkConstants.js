import commandCodeProvider from "../providers/registry/commandcode.js";

// Hosts whose system-DNS results can be intercepted. Keep provider-specific
// endpoints in their registry and derive their hostnames here.
export const MITM_DNS_BYPASS_HOSTS = new Set([
  "cloudcode-pa.googleapis.com",
  "daily-cloudcode-pa.googleapis.com",
  "api.individual.githubcopilot.com",
  "q.us-east-1.amazonaws.com",
  "codewhisperer.us-east-1.amazonaws.com",
  "api2.cursor.sh",
  new URL(commandCodeProvider.transport.baseUrl).hostname,
]);
