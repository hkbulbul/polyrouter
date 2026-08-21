import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchMock = vi.fn();
vi.mock("../../open-sse/utils/proxyFetch.js", () => ({
  proxyAwareFetch: (...args) => fetchMock(...args),
}));

const { TraeExecutor } = await import("../../open-sse/executors/trae.js");

function okJson(obj) {
  return {
    ok: true, status: 200, headers: { get: () => "application/json" },
    text: async () => JSON.stringify(obj),
  };
}
function okStream(body) {
  return { ok: true, status: 200, headers: { get: () => "text/event-stream" }, body };
}
function sseBody(lines) {
  const enc = new TextEncoder();
  // lines: ["event: plan_item", 'data: {...}', "", ...]
  const raw = lines.join("\n");
  return {
    getReader() {
      let done = false;
      return {
        async read() {
          if (done) return { done: true, value: undefined };
          done = true;
          return { done: false, value: enc.encode(raw) };
        },
        cancel() { return Promise.resolve(); },
      };
    },
  };
}
function failingBody(err) {
  return {
    getReader() {
      return { async read() { throw err; }, cancel() { return Promise.resolve(); } };
    },
  };
}
async function collectSSE(response) {
  const text = await new Response(response.body).text();
  return text;
}

const creds = { accessToken: "t", providerSpecificData: {} };
const body = { messages: [{ role: "user", content: "hi" }] };

beforeEach(() => fetchMock.mockReset());

describe("TraeExecutor", () => {
  it("GET /events advertises SSE and does not send Content-Type", async () => {
    const ex = new TraeExecutor();
    fetchMock.mockResolvedValueOnce(okJson({ code: 0, data: { chat_session_id: "s1", message_id: "m1" } }));
    fetchMock.mockResolvedValueOnce(okStream(sseBody(["event: done", "data: {}", ""])));
    await ex.execute({ model: "auto", body, stream: false, credentials: creds });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, getOpts] = fetchMock.mock.calls[1];
    expect(getOpts.method).toBe("GET");
    expect(getOpts.headers.Accept).toBe("text/event-stream");
    expect(getOpts.headers["Cache-Control"]).toBe("no-cache");
    expect(getOpts.headers["Accept-Encoding"]).toBe("identity");
    expect(getOpts.headers["Content-Type"]).toBeUndefined();
  });

  it("forwards proxyOptions to both calls", async () => {
    const ex = new TraeExecutor();
    const po = { vercelRelayUrl: "https://relay.example" };
    fetchMock.mockResolvedValueOnce(okJson({ code: 0, data: { chat_session_id: "s1", message_id: "m1" } }));
    fetchMock.mockResolvedValueOnce(okStream(sseBody(["event: done", "data: {}", ""])));
    await ex.execute({ model: "auto", body, stream: false, credentials: creds, proxyOptions: po });
    expect(fetchMock.mock.calls[0][2]).toEqual(po);
    expect(fetchMock.mock.calls[1][2]).toEqual(po);
  });

  it("content then EOF without done → clean stop, no error text", async () => {
    const ex = new TraeExecutor();
    fetchMock.mockResolvedValueOnce(okJson({ code: 0, data: { chat_session_id: "s1", message_id: "m1" } }));
    fetchMock.mockResolvedValueOnce(okStream(sseBody(["event: plan_item", 'data: {"id":"p1","thought":"hello"}', ""])));
    const { response } = await ex.execute({ model: "minimax-m3", body, stream: true, credentials: creds });
    const text = await collectSSE(response);
    expect(text).toContain('"role":"assistant"');
    expect(text).toContain("hello");
    expect(text).not.toMatch(/trae stream error|ended before done|empty response/i);
    expect((text.match(/"finish_reason":"stop"/g) || []).length).toBe(1);
    expect(text).toContain("[DONE]");
  });

  it("no content and EOF without done → visible empty-response notice + stop", async () => {
    const ex = new TraeExecutor();
    fetchMock.mockResolvedValueOnce(okJson({ code: 0, data: { chat_session_id: "s1", message_id: "m1" } }));
    fetchMock.mockResolvedValueOnce(okStream(sseBody(["event: heartbeat", "data: {}", ""])));
    const { response } = await ex.execute({ model: "minimax-m3", body, stream: true, credentials: creds });
    const text = await collectSSE(response);
    expect(text).toMatch(/empty response .* stream ended before done event/i);
    expect((text.match(/"finish_reason":"stop"/g) || []).length).toBe(1);
  });

  it("answer in finish tool summary is streamed as content, reasoning stays on its own channel", async () => {
    const ex = new TraeExecutor();
    const plan = (summary) => 'data: ' + JSON.stringify({
      id: "p1", thought: "", reasoning_content: "internal chain of thought",
      tool_call_info: { id: "tc1", name: "finish", params: { summary } },
    });
    fetchMock.mockResolvedValueOnce(okJson({ code: 0, data: { chat_session_id: "s1", message_id: "m1" } }));
    fetchMock.mockResolvedValueOnce(okStream(sseBody([
      "event: plan_item", plan("Hi"), "",
      "event: plan_item", plan("Hi there!"), "",
      "event: done", "data: {}", "",
    ])));
    const { response } = await ex.execute({ model: "minimax-m3", body, stream: true, credentials: creds });
    const text = await collectSSE(response);
    const contentDeltas = [...text.matchAll(/"delta":\{"content":"((?:[^"\\]|\\.)*)"\}/g)].map((m) => m[1]);
    expect(contentDeltas.join("")).toBe("Hi there!");
    expect(text).toContain('"reasoning_content":"internal chain of thought"');
    expect(contentDeltas.join("")).not.toContain("internal chain of thought");
    expect((text.match(/"finish_reason":"stop"/g) || []).length).toBe(1);
  });

  it("partial JSON tool params still yield the summary text so far", async () => {
    const ex = new TraeExecutor();
    fetchMock.mockResolvedValueOnce(okJson({ code: 0, data: { chat_session_id: "s1", message_id: "m1" } }));
    fetchMock.mockResolvedValueOnce(okStream(sseBody([
      "event: plan_item",
      'data: ' + JSON.stringify({ id: "p1", thought: "", tool_call_info: { name: "finish", params: '{"summary":"MiniMax-M3' } }),
      "",
      "event: done", "data: {}", "",
    ])));
    const { response } = await ex.execute({ model: "minimax-m3", body, stream: true, credentials: creds });
    const text = await collectSSE(response);
    expect(text).toContain("MiniMax-M3");
  });

  it("repeated cumulative thought is not duplicated", async () => {
    const ex = new TraeExecutor();
    fetchMock.mockResolvedValueOnce(okJson({ code: 0, data: { chat_session_id: "s1", message_id: "m1" } }));
    fetchMock.mockResolvedValueOnce(okStream(sseBody([
      "event: plan_item", 'data: {"id":"p1","thought":"hi"}', "",
      "event: plan_item", 'data: {"id":"p1","thought":"hi"}', "",
      "event: plan_item", 'data: {"id":"p1","thought":"hi there"}', "",
      "event: done", "data: {}", "",
    ])));
    const { response } = await ex.execute({ model: "minimax-m3", body, stream: true, credentials: creds });
    const text = await collectSSE(response);
    const contentDeltas = [...text.matchAll(/"delta":\{"content":"((?:[^"\\]|\\.)*)"\}/g)].map((m) => m[1]);
    expect(contentDeltas.join("")).toBe("hi there");
  });

  it("mid-stream fetch failure surfaces cause as visible content + stop", async () => {
    const ex = new TraeExecutor();
    const cause = Object.assign(new Error("other side closed"), { code: "UND_ERR_SOCKET" });
    const err = Object.assign(new TypeError("fetch failed"), { cause });
    fetchMock.mockResolvedValueOnce(okJson({ code: 0, data: { chat_session_id: "s1", message_id: "m1" } }));
    fetchMock.mockResolvedValueOnce(okStream(failingBody(err)));
    const { response } = await ex.execute({ model: "auto", body, stream: true, credentials: creds });
    const text = await collectSSE(response);
    expect(text).toContain("UND_ERR_SOCKET");
    expect(text).toMatch(/"finish_reason":"stop"/);
  });

  it("normal plan_item→done streams content and stop exactly once", async () => {
    const ex = new TraeExecutor();
    fetchMock.mockResolvedValueOnce(okJson({ code: 0, data: { chat_session_id: "s1", message_id: "m1" } }));
    fetchMock.mockResolvedValueOnce(okStream(sseBody([
      "event: plan_item", 'data: {"id":"p1","thought":"hello world"}', "",
      "event: done", "data: {}", "",
    ])));
    const { response } = await ex.execute({ model: "auto", body, stream: true, credentials: creds });
    const text = await collectSSE(response);
    expect(text).toContain("hello world");
    expect((text.match(/"finish_reason":"stop"/g) || []).length).toBe(1);
    expect(text.trimEnd().endsWith("data: [DONE]")).toBe(true);
  });

  it("non-stream stream failure returns 502 with cause", async () => {
    const ex = new TraeExecutor();
    const cause = Object.assign(new Error("boom"), { code: "UND_ERR_SOCKET" });
    const err = Object.assign(new TypeError("fetch failed"), { cause });
    fetchMock.mockResolvedValueOnce(okJson({ code: 0, data: { chat_session_id: "s1", message_id: "m1" } }));
    fetchMock.mockResolvedValueOnce(okStream(failingBody(err)));
    const { response } = await ex.execute({ model: "auto", body, stream: false, credentials: creds });
    expect(response.status).toBe(502);
    const j = JSON.parse(await response.text());
    expect(j.error.message).toMatch(/UND_ERR_SOCKET/);
  });
});
