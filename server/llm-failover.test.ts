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
import { isFailoverError, pickOpenRouterModel, _providerChainForTests } from "./_core/llm";
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
