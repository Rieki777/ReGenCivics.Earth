/**
 * LLM failover predicate tests.
 *
 * The provider chain runs first-party Anthropic first and brings OpenRouter
 * online when Anthropic signals it is out of credits, over quota, rate limited,
 * or overloaded. isFailoverError decides when that handoff should happen, so we
 * pin down exactly which errors trigger it (and which do not, so a real bug is
 * surfaced instead of silently retried on a second provider).
 */
import { describe, it, expect } from "vitest";
import { isFailoverError } from "./_core/llm";

describe("isFailoverError", () => {
  it("fails over when Anthropic is out of credits (400 credit-balance message)", () => {
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

  it("does NOT fail over on ordinary errors (surfaces the real bug)", () => {
    expect(isFailoverError({ status: 400, error: { message: "messages: at least one message is required" } })).toBe(false);
    expect(isFailoverError({ status: 404, message: "model not found" })).toBe(false);
    expect(isFailoverError({ status: 401, message: "invalid api key" })).toBe(false);
    expect(isFailoverError(new Error("could not parse JSON"))).toBe(false);
    expect(isFailoverError(undefined)).toBe(false);
  });
});
