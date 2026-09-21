import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { GET, POST, DELETE } from "../../src/app/api/cli-tools/deepseek-harness-settings/route.js";

let temporaryHome;
let previousHome;
let previousKey;

afterEach(async () => {
  if (previousHome === undefined) delete process.env.DSH_HOME;
  else process.env.DSH_HOME = previousHome;
  if (previousKey === undefined) delete process.env.POLYROUTER_API_KEY;
  else process.env.POLYROUTER_API_KEY = previousKey;
  if (temporaryHome) await fs.rm(temporaryHome, { recursive: true, force: true });
  temporaryHome = null;
});

function request(body) {
  return new Request("http://localhost/api/cli-tools/deepseek-harness-settings", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
}

describe("deepseek-harness-settings route", () => {
  it("applies, reports, and resets a configuration without exposing the key", async () => {
    previousHome = process.env.DSH_HOME;
    previousKey = process.env.POLYROUTER_API_KEY;
    delete process.env.POLYROUTER_API_KEY;
    temporaryHome = await fs.mkdtemp(path.join(os.tmpdir(), "polyrouter-dsh-"));
    process.env.DSH_HOME = temporaryHome;

    const initial = await GET();
    expect(initial.status).toBe(200);
    expect((await initial.json()).hasPolyRouter).toBe(false);

    const applied = await POST(await request({
      baseUrl: "http://127.0.0.1:20128",
      model: "cc/test",
      apiKey: "sk_route_secret",
    }));
    expect(applied.status).toBe(200);
    const appliedBody = await applied.json();
    expect(appliedBody.model).toBe("cc/test");
    expect(JSON.stringify(appliedBody)).not.toContain("sk_route_secret");

    const settings = await fs.readFile(path.join(temporaryHome, "settings.yaml"), "utf8");
    const credentials = await fs.readFile(path.join(temporaryHome, ".credentials.yaml"), "utf8");
    expect(settings).not.toContain("sk_route_secret");
    expect(credentials).toContain("sk_route_secret");
    expect(credentials).toContain("version: 1");
    expect(credentials).toContain("refs:");
    expect(credentials).toContain("records:");

    const reset = await DELETE(new Request("http://localhost", { method: "DELETE", body: JSON.stringify({ expectedRevision: appliedBody.revision }) }));
    expect(reset.status).toBe(200);
    expect((await reset.json()).hasPolyRouter).toBe(false);
  });

  it("applies multiple models and keeps the first model as default", async () => {
    previousHome = process.env.DSH_HOME;
    previousKey = process.env.POLYROUTER_API_KEY;
    delete process.env.POLYROUTER_API_KEY;
    temporaryHome = await fs.mkdtemp(path.join(os.tmpdir(), "polyrouter-dsh-"));
    process.env.DSH_HOME = temporaryHome;

    const initial = await GET();
    const applied = await POST(await request({
      baseUrl: "http://127.0.0.1:20128",
      models: ["cc/one", "cc/two", "cc/one"],
      model: "cc/one",
      apiKey: "sk_multiple",
    }));
    expect(applied.status).toBe(200);
    const body = await applied.json();
    expect(body.models).toEqual(["cc/one", "cc/two"]);
    expect(body.model).toBe("cc/one");
    const settings = await fs.readFile(path.join(temporaryHome, "settings.yaml"), "utf8");
    expect(settings).toContain("cc/one");
    expect(settings).toContain("cc/two");
    expect(settings).toContain("model: cc/one");
    expect(initial.status).toBe(200);
  });

  it("rejects a stale write and inherited credential shadowing", async () => {
    previousHome = process.env.DSH_HOME;
    previousKey = process.env.POLYROUTER_API_KEY;
    delete process.env.POLYROUTER_API_KEY;
    temporaryHome = await fs.mkdtemp(path.join(os.tmpdir(), "polyrouter-dsh-"));
    process.env.DSH_HOME = temporaryHome;
    const current = await GET();
    const revision = (await current.json()).revision;
    const first = await POST(await request({ baseUrl: "http://127.0.0.1:20128", model: "cc/one", apiKey: "sk_one", expectedRevision: revision }));
    expect(first.status).toBe(200);
    const stale = await POST(await request({ baseUrl: "http://127.0.0.1:20128", model: "cc/two", apiKey: "sk_two", expectedRevision: revision }));
    expect(stale.status).toBe(409);

    process.env.POLYROUTER_API_KEY = "sk_environment";
    const shadowed = await POST(await request({ baseUrl: "http://127.0.0.1:20128", model: "cc/three", apiKey: "sk_three" }));
    expect(shadowed.status).toBe(409);
    expect((await shadowed.json()).code).toBe("CREDENTIAL_SHADOWED");

    const before = await fs.readFile(path.join(temporaryHome, ".credentials.yaml"), "utf8").catch(() => "");
    const environmentApply = await POST(await request({
      baseUrl: "http://127.0.0.1:20128",
      model: "cc/environment-model",
      credentialMode: "environment",
    }));
    expect(environmentApply.status).toBe(200);
    const environmentBody = await environmentApply.json();
    expect(environmentBody.model).toBe("cc/environment-model");
    expect(JSON.stringify(environmentBody)).not.toContain("sk_environment");
    const after = await fs.readFile(path.join(temporaryHome, ".credentials.yaml"), "utf8").catch(() => "");
    expect(after).toBe(before);
  });
});
