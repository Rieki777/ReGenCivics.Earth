/**
 * LLM failover + model routing tests.
 *
 * The provider chain runs OpenRouter FIRST with the cheapest model for the
 * task tier (ADR-43), and brings first-party Anthropic online when OpenRouter
 * signals credits, quota, rate limits, overload, or a model-routing failure.
 * isFailoverError decides when that handoff should happen, so we pin down
 * exactly which errors trigger it (and which do not, so a real bug is
 * surfaced instead of silently retried on a second provider).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isFailoverError, pickOpenRouterModel, _providerChainForTests, isReasoningModel, extractJsonObject } from "./_core/llm";
import { ENV } from "./_core/env";

describe("isFailoverError", () => {
  it("fails over when a provider is out of credits (400 credit-balance message)", () => {
    expect(isFailoverError({ status: 400, error: { message: "Your credit balance is too low to access the Anthropic API." } })).toBe(true);
    expect(isFailoverError({ message: "insufficient credit balance" })).toBe(true);
  });

  it("fails over on quota / billing / payment errors", () => {
    expect(isFailoverError({ status: 402, message: "Payment required" })).toBe(true);
    expect(isFailoverError({ message: "You have exceeded your quota" })).toBe(true);
    expect(isFailoverError({ message: "billing hard limit reached" })).toBe(true);
  });

  it("fails over on rate limits and overload", () => {
    expect(isFailoverError({ status: 429 })).toBe(true);
    expect(isFailoverError({ status: 529 })).toBe(true);
    expect(isFailoverError({ message: "the model is overloaded" })).toBe(true);
  });

  it("fails over on model-routing failures (deprecated slug, no allowed providers)", () => {
    // With OpenRouter primary, a stale model slug must not take a feature down
    // when the direct Anthropic path still works. This exact error broke every
    // AI feature at once on 2026-07-14.
    expect(isFailoverError({ status: 404, message: "model not found" })).toBe(true);
    expect(isFailoverError({ status: 404, message: "No allowed providers are available for the selected model" })).toBe(true);
    expect(isFailoverError({ status: 400, message: "No allowed providers are available for the selected model." })).toBe(true);
  });

  it("does NOT fail over on ordinary errors (surfaces the real bug)", () => {
    expect(isFailoverError({ status: 400, error: { message: "messages: at least one message is required" } })).toBe(false);
    expect(isFailoverError({ status: 404, message: "route not found" })).toBe(false);
    expect(isFailoverError({ status: 401, message: "invalid api key" })).toBe(false);
    expect(isFailoverError(new Error("could not parse JSON"))).toBe(false);
    expect(isFailoverError(undefined)).toBe(false);
  });
});

describe("pickOpenRouterModel", () => {
  it("maps each task tier to its configured model", () => {
    expect(pickOpenRouterModel("light")).toBe(ENV.llmModelLight);
    expect(pickOpenRouterModel("standard")).toBe(ENV.llmModelStandard);
    expect(pickOpenRouterModel("complex")).toBe(ENV.llmModelComplex);
  });

  it("never routes to an anthropic/* slug (this OpenRouter account cannot reach that provider)", () => {
    for (const task of ["light", "standard", "complex"] as const) {
      expect(pickOpenRouterModel(task).startsWith("anthropic/")).toBe(false);
      expect(pickOpenRouterModel(task).startsWith("claude-")).toBe(false);
    }
  });
});

describe("reasoning-model detection (ADR-45 part 3)", () => {
  it("flags reasoning families", () => {
    for (const m of [
      "moonshotai/kimi-k3",
      "moonshotai/kimi-k2.5",
      "moonshotai/kimi-k2-thinking",
      "google/gemini-2.5-pro",
      "google/gemini-3.5-flash",
      "openai/gpt-5.6-sol",
      "openai/o3",
      "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    ]) {
      expect(isReasoningModel(m), m).toBe(true);
    }
  });

  it("leaves the classic workhorses on tool forcing", () => {
    for (const m of ["openai/gpt-4o-mini", "google/gemini-2.5-flash-lite", "claude-haiku-4-5-20251001", "meta-llama/llama-3.3-70b-instruct:free"]) {
      expect(isReasoningModel(m), m).toBe(false);
    }
  });
});

describe("extractJsonObject", () => {
  it("parses a bare JSON object", () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses fenced and prose-wrapped JSON", () => {
    expect(extractJsonObject('Here you go:\n```json\n{"content":"hola"}\n```\nDone.')).toEqual({ content: "hola" });
  });

  it("handles nested braces and trailing text", () => {
    expect(extractJsonObject('{"pros":[{"point":"x","voiceCount":2}]} trailing')).toEqual({ pros: [{ point: "x", voiceCount: 2 }] });
  });

  it("returns null when there is no object", () => {
    expect(extractJsonObject("no json here")).toBeNull();
    expect(extractJsonObject("[1,2,3]")).toBeNull();
  });
});

describe("providerChain free lane (opt-in)", () => {
  let saved: { or: string; an: string; free: string };
  beforeEach(() => {
    saved = { or: ENV.openrouterApiKey, an: ENV.anthropicApiKey, free: ENV.llmModelLightFree };
    ENV.openrouterApiKey = "test-key";
    ENV.anthropicApiKey = "test-key-2";
  });
  afterEach(() => {
    ENV.openrouterApiKey = saved.or;
    ENV.anthropicApiKey = saved.an;
    ENV.llmModelLightFree = saved.free;
  });

  it("is OFF by default: light tier goes straight to the paid light model", () => {
    ENV.llmModelLightFree = "";
    const chain = _providerChainForTests("light");
    expect(chain[0]).toEqual({ provider: "openrouter", model: ENV.llmModelLight });
  });

  it("when opted in, light tier tries the free variant first, then paid light, then anthropic", () => {
    ENV.llmModelLightFree = "some/model:free";
    const chain = _providerChainForTests("light");
    expect(chain.map((c) => c.model)).toEqual(["some/model:free", ENV.llmModelLight, expect.any(String)]);
    expect(chain[2].provider).toBe("anthropic");
  });

  it("the free lane never touches standard or complex tiers", () => {
    ENV.llmModelLightFree = "some/model:free";
    expect(_providerChainForTests("standard")[0].model).toBe(ENV.llmModelStandard);
    expect(_providerChainForTests("complex")[0].model).toBe(ENV.llmModelComplex);
  });
});

describe("OpenRouter client never carries an Anthropic key", () => {
  /**
   * Regression guard for the 2026-07-24 outage-in-plain-sight.
   *
   * The Anthropic SDK falls back to process.env.ANTHROPIC_API_KEY whenever
   * `apiKey` is undefined, and sends it as an x-api-key header next to our
   * Bearer token. OpenRouter reads that header as an Anthropic BYOK credential
   * and pins routing to the anthropic provider, so every non-Anthropic model
   * 404s with "No allowed providers are available for the selected model".
   *
   * The effect was total and silent: light, standard and complex all 404'd on
   * production and failed over to first-party Anthropic, so ADR-43's routing
   * looked configured while doing nothing, and our Anthropic key was sent to a
   * third party on every call. Only reproducible with ANTHROPIC_API_KEY set,
   * which is why it survived local testing.
   *
   * If apiKey is ever loosened back to undefined, this fails.
   */
  it("passes apiKey: null so no x-api-key header is sent", async () => {
    const prev = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "sk-ant-should-never-reach-openrouter";
    try {
      const { _openrouterClientForTests } = await import("./_core/llm");
      const client = _openrouterClientForTests();
      expect(client.apiKey).toBeNull();
      expect(client.apiKey).not.toBe(process.env.ANTHROPIC_API_KEY);
      expect(client.authToken).not.toBe(process.env.ANTHROPIC_API_KEY);
    } finally {
      if (prev === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = prev;
    }
  });
});
