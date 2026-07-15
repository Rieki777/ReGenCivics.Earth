/**
 * Shipwright engine tests: the deterministic shell around the maintainer AI.
 *
 * We mock the LLM so these run without a key, and assert the guarantees the
 * voyage experience leans on: a safety trigger short-circuits to make-safe
 * guidance without any model call, follow-up turns carry the prior conversation
 * so the Shipwright remembers the case, the photo note never claims sight the
 * model does not have, and reference notes ground every prompt.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const invokeLLM = vi.fn();
vi.mock("./_core/llm", () => ({
  invokeLLM: (...args: unknown[]) => invokeLLM(...args),
  isLLMConfigured: () => true,
}));

import { askShipwright } from "./lib/ship-shipwright";

function modelReturns(text: string) {
  invokeLLM.mockResolvedValueOnce({
    choices: [{ message: { role: "assistant", content: text } }],
  });
}

type LLMCall = { messages: Array<{ role: string; content: string }> };

describe("askShipwright", () => {
  beforeEach(() => invokeLLM.mockReset());

  it("short-circuits a danger system to make-safe guidance without calling the model", async () => {
    const res = await askShipwright({
      question: "I smell propane by the stove, what do I check?",
      chunks: [],
      cases: [],
    });
    expect(res.escalated).toBe(true);
    expect(res.reply).toContain("Keeper");
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("carries the prior conversation into the model so follow-ups keep context", async () => {
    modelReturns("Try the reset switch behind the panel. If anything feels unsafe, stop and call your Keeper.");
    const history = [
      { role: "user" as const, content: "the generator won't start" },
      { role: "assistant" as const, content: "Check the fuel level first." },
    ];
    await askShipwright({
      question: "fuel is fine, what next?",
      history,
      chunks: [],
      cases: [],
    });
    const call = invokeLLM.mock.calls[0][0] as LLMCall;
    const contents = call.messages.map((m) => m.content);
    expect(contents).toContain("the generator won't start");
    expect(contents).toContain("Check the fuel level first.");
    // The new question is the final user turn.
    expect(call.messages[call.messages.length - 1]).toEqual({ role: "user", content: "fuel is fine, what next?" });
  });

  it("never claims to see an attached photo", async () => {
    modelReturns("Noted.");
    await askShipwright({
      question: "the water pump is rattling, photo attached",
      chunks: [],
      cases: [],
      hasPhoto: true,
    });
    const call = invokeLLM.mock.calls[0][0] as LLMCall;
    const system = call.messages[0].content;
    expect(system).toContain("cannot view images");
    expect(system).not.toContain("describe what you see if it helps");
  });

  it("grounds the prompt in the retrieved reference notes", async () => {
    modelReturns("The inverter switch is under the bed platform. If anything feels unsafe, stop and call your Keeper.");
    await askShipwright({
      question: "where is the inverter switch?",
      chunks: [{ title: "Inverter basics", content: "The Magnum inverter lives under the bed platform.", system: "electrical", sourceRef: "manual p.12" }],
      cases: [{ title: "Inverter breaker trip", resolution: "reset breaker", whatWorked: "the red reset button" }],
    });
    const call = invokeLLM.mock.calls[0][0] as LLMCall;
    const system = call.messages[0].content;
    expect(system).toContain("Inverter basics");
    expect(system).toContain("SIMILAR RESOLVED CASES");
    expect(system).toContain("Inverter breaker trip");
  });

  it("falls back to a warm line when the model returns nothing", async () => {
    modelReturns("");
    const res = await askShipwright({ question: "the fridge light flickers", chunks: [], cases: [] });
    expect(res.escalated).toBe(false);
    expect(res.reply).toContain("Keeper");
  });
});
