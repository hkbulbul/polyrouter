import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import commandCodeProvider from "../../open-sse/providers/registry/commandcode.js";
import { MITM_DNS_BYPASS_HOSTS } from "../../open-sse/config/networkConstants.js";

const COMMANDCODE_API_URL = commandCodeProvider.transport.baseUrl;
const COMMANDCODE_HOSTNAME = new URL(COMMANDCODE_API_URL).hostname;

const mocks = vi.hoisted(() => ({
  agentOptions: [],
  fetch: vi.fn(),
  resolve4: vi.fn(),
  setServers: vi.fn(),
}));

vi.mock("undici", () => {
  class Agent {
    constructor(options) {
      this.options = options;
      mocks.agentOptions.push(options);
    }
  }

  return {
    Agent,
    ProxyAgent: Agent,
    setGlobalDispatcher: vi.fn(),
  };
});

vi.mock("dns", () => {
  class Resolver {
    setServers(servers) {
      mocks.setServers(servers);
    }

    resolve4(hostname, callback) {
      mocks.resolve4(hostname);
      callback(null, ["172.67.167.23", "104.21.49.202", "172.67.167.23"]);
    }
  }

  return {
    default: { setDefaultResultOrder: vi.fn() },
    Resolver,
  };
});

const originalFetch = globalThis.fetch;
globalThis.fetch = mocks.fetch;
const { proxyAwareFetch } = await import("../../open-sse/utils/proxyFetch.js");

afterAll(() => {
  globalThis.fetch = originalFetch;
});

beforeEach(() => {
  mocks.fetch.mockReset();
  mocks.fetch.mockResolvedValue(new Response(null, { status: 401 }));
  mocks.resolve4.mockClear();
});

describe("proxyAwareFetch CommandCode DNS fallback", () => {
  it("derives the CommandCode bypass hostname from its provider transport", () => {
    expect(MITM_DNS_BYPASS_HOSTS).toContain(COMMANDCODE_HOSTNAME);
  });

  it("offers every public IPv4 address to Undici for the CommandCode API", async () => {
    await proxyAwareFetch(COMMANDCODE_API_URL, { method: "POST" });

    expect(mocks.resolve4).toHaveBeenCalledWith(COMMANDCODE_HOSTNAME);
    const dispatcher = mocks.fetch.mock.calls[0][1].dispatcher;
    expect(dispatcher.options.connect.autoSelectFamily).toBe(true);

    const lookup = vi.fn();
    dispatcher.options.connect.lookup(COMMANDCODE_HOSTNAME, { all: true }, lookup);
    expect(lookup).toHaveBeenCalledWith(null, [
      { address: "172.67.167.23", family: 4 },
      { address: "104.21.49.202", family: 4 },
    ]);
  });

  it("does not apply the bypass to a lookalike hostname", async () => {
    await proxyAwareFetch(`https://${COMMANDCODE_HOSTNAME}.example.com/alpha/generate`, { method: "POST" });

    expect(mocks.resolve4).not.toHaveBeenCalled();
    const dispatcher = mocks.fetch.mock.calls[0][1].dispatcher;
    expect(dispatcher.options.connect.autoSelectFamily).toBe(false);
  });
});
