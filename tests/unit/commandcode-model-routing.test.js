import { describe, expect, it } from "vitest";
import { getModelUpstreamId, PROVIDER_MODELS } from "../../open-sse/config/providerModels.js";
import { CommandCodeExecutor } from "../../open-sse/executors/commandcode.js";
import { openaiToCommandCodeRequest } from "../../open-sse/translator/request/openai-to-commandcode.js";

const CLIENT_MODEL = "glm-5.3-flash";
const UPSTREAM_MODEL = "z-ai/glm-5.3-flash";

describe("CommandCode model routing", () => {
  it("registers the GLM 5.3 Flash client alias with its canonical upstream id", () => {
    expect(PROVIDER_MODELS.commandcode).toContainEqual(expect.objectContaining({
      id: CLIENT_MODEL,
      upstreamModelId: UPSTREAM_MODEL,
    }));
    expect(getModelUpstreamId("commandcode", CLIENT_MODEL)).toBe(UPSTREAM_MODEL);
  });

  it("sends the canonical model id in the CommandCode request envelope", () => {
    const model = getModelUpstreamId("commandcode", CLIENT_MODEL);
    const request = openaiToCommandCodeRequest(model, {
      messages: [{ role: "user", content: "hi" }],
    }, true);

    expect(request.params.model).toBe(UPSTREAM_MODEL);
  });

  it("keeps the canonical model nested in params for CommandCode's native envelope", () => {
    const executor = new CommandCodeExecutor();
    const body = openaiToCommandCodeRequest(UPSTREAM_MODEL, {
      messages: [{ role: "user", content: "hi" }],
    }, true);
    // chatCore applies this generic field after every translator returns.
    body.model = UPSTREAM_MODEL;

    const transformed = executor.transformRequest(UPSTREAM_MODEL, body, true, {});

    expect(transformed.model).toBeUndefined();
    expect(transformed.params.model).toBe(UPSTREAM_MODEL);
    expect(transformed.params.stream).toBe(true);
  });

  it("uses the current native CommandCode client identity", () => {
    const executor = new CommandCodeExecutor();

    expect(executor.buildHeaders({}, true)).toMatchObject({
      "x-command-code-version": "1.58.0",
      "x-cli-environment": "cli",
      "User-Agent": "cli",
    });
  });

  it("does not attempt token refresh for static API-key failures", async () => {
    const executor = new CommandCodeExecutor();

    expect(await executor.shouldRefreshResponse(new Response(null, { status: 403 }))).toBe(false);
  });
});
