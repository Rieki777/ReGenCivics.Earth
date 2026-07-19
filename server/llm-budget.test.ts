/**
 * Global LLM cost circuit-breaker tests.
 *
 * The breaker sits inside invokeLLM/streamLLM and enforces site-wide daily
 * ceilings on call count and estimated tokens, closing the "no global cost
 * circuit-breaker" gap in AI-AUTOMATION-RISKS. These tests exercise the
 * check/record pair directly (no network) by mutating ENV caps.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ENV } from "./_core/env";
import {
  LLMBudgetExceededError,
  estimateTokens,
  getLLMBudgetStatus,
  _resetLLMBudgetForTests,
  _llmBudgetInternals,
} from "./_core/llm";

const { checkLLMBudget, recordLLMUsage } = _llmBudgetInternals;

const originalCallBudget = ENV.llmDailyCallBudget;
const originalTokenBudget = ENV.llmDailyTokenBudget;

beforeEach(() => {
  _resetLLMBudgetForTests();
});

afterEach(() => {
  (ENV as any).llmDailyCallBudget = originalCallBudget;
  (ENV as any).llmDailyTokenBudget = originalTokenBudget;
  _resetLLMBudgetForTests();
});

describe("estimateTokens", () => {
  it("estimates ~4 chars per token and handles empty input", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("a".repeat(401))).toBe(101);
  });
});

describe("LLM daily budget breaker", () => {
  it("allows calls under the ceilings and counts usage", () => {
    (ENV as any).llmDailyCallBudget = 3;
    (ENV as any).llmDailyTokenBudget = 1_000_000;
    expect(() => checkLLMBudget(400)).not.toThrow();
    recordLLMUsage(400, 400);
    const status = getLLMBudgetStatus();
    expect(status.calls).toBe(1);
    expect(status.estTokens).toBe(200);
    expect(status.trippedAt).toBeNull();
  });

  it("trips on the call ceiling and reports which ceiling", () => {
    (ENV as any).llmDailyCallBudget = 2;
    (ENV as any).llmDailyTokenBudget = 0; // token ceiling disabled
    recordLLMUsage(100, 100);
    recordLLMUsage(100, 100);
    expect(() => checkLLMBudget(100)).toThrow(LLMBudgetExceededError);
    try {
      checkLLMBudget(100);
    } catch (e: any) {
      expect(e.name).toBe("LLMBudgetExceededError");
      expect(e.message).toContain("calls");
    }
    expect(getLLMBudgetStatus().trippedAt).not.toBeNull();
  });

  it("trips on the token ceiling including the incoming request's estimate", () => {
    (ENV as any).llmDailyCallBudget = 0; // call ceiling disabled
    (ENV as any).llmDailyTokenBudget = 300;
    recordLLMUsage(400, 400); // ~200 estimated tokens used
    // Incoming 500 chars => ~125 tokens; 200 + 125 >= 300 must trip.
    expect(() => checkLLMBudget(500)).toThrow(LLMBudgetExceededError);
  });

  it("a ceiling set to 0 is disabled", () => {
    (ENV as any).llmDailyCallBudget = 0;
    (ENV as any).llmDailyTokenBudget = 0;
    for (let i = 0; i < 50; i++) recordLLMUsage(10_000, 10_000);
    expect(() => checkLLMBudget(10_000)).not.toThrow();
  });

  it("reset clears counters and the tripped marker", () => {
    (ENV as any).llmDailyCallBudget = 1;
    recordLLMUsage(100, 100);
    expect(() => checkLLMBudget(100)).toThrow();
    _resetLLMBudgetForTests();
    expect(getLLMBudgetStatus().calls).toBe(0);
    expect(() => checkLLMBudget(100)).not.toThrow();
  });
});
