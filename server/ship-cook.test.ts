/**
 * Ship's Cook guard tests. The Cook is prompt-instructed to stay plant-based and
 * on-track, but on a health-adjacent surface we verify her output deterministically.
 * These lock the guard: an animal-product dish is discarded, the ship's own plant
 * dishes (cashew cheese, coconut milk, nice cream) pass, and a cooked step on the
 * Deeper Reset is flagged. The LLM is mocked so these run without a key.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const invokeLLM = vi.fn();
vi.mock("./_core/llm", () => ({
  invokeLLM: (...args: unknown[]) => invokeLLM(...args),
  isLLMConfigured: () => true,
}));

import { askShipCook, validateCookDish, detectHealthConcern, type CookDish } from "./lib/ship-cook";

function cookReturns(dish: Partial<CookDish> & { message?: string; dishName: string; hasDish?: boolean }) {
  invokeLLM.mockResolvedValueOnce({
    choices: [{ message: { role: "assistant", content: JSON.stringify({ base: [], fillings: [], toppings: [], sauce: [], method: "", why: "", ...dish }) } }],
  });
}

const DISH = (over: Partial<CookDish>): CookDish => ({
  dishName: "Test", base: [], fillings: [], toppings: [], sauce: [], method: "", why: "", ...over,
});

describe("validateCookDish", () => {
  it("flags real animal products", () => {
    expect(validateCookDish(DISH({ fillings: ["grilled chicken"] }), "table").animal).toBe(true);
    expect(validateCookDish(DISH({ toppings: ["a soft-boiled egg"] }), "table").animal).toBe(true);
    expect(validateCookDish(DISH({ sauce: ["honey drizzle"] }), "table").animal).toBe(true);
    expect(validateCookDish(DISH({ base: ["a scoop of ice cream"] }), "table").animal).toBe(true);
  });

  it("does not flag the ship's own plant dishes", () => {
    expect(validateCookDish(DISH({ sauce: ["cashew crema", "cultured cashew cheese"] }), "table").animal).toBe(false);
    expect(validateCookDish(DISH({ base: ["chia in coconut milk"], toppings: ["frozen banana nice cream"] }), "table").animal).toBe(false);
    expect(validateCookDish(DISH({ base: ["eggplant"], sauce: ["coconut cream"] }), "table").animal).toBe(false);
  });

  it("flags a cooked step only on the Deeper Reset", () => {
    const roasted = DISH({ method: "Roast the vegetables until soft." });
    expect(validateCookDish(roasted, "reset").cooked).toBe(true);
    expect(validateCookDish(roasted, "table").cooked).toBe(false);
  });
});

describe("askShipCook", () => {
  beforeEach(() => invokeLLM.mockReset());

  it("discards an off-diet dish and redirects", async () => {
    cookReturns({ message: "Try this chicken bowl.", dishName: "Chicken Bowl", fillings: ["grilled chicken"] });
    const res = await askShipCook({ message: "make me dinner", track: "table", haulItems: [{ name: "greens" }] });
    expect(res.dish).toBeNull();
    expect(res.reply.toLowerCase()).toContain("plant-based");
  });

  it("keeps a valid plant dish", async () => {
    cookReturns({ message: "Here's a bright bowl.", dishName: "Sanctuary Bowl", base: ["greens"], sauce: ["lemon-tahini"] });
    const res = await askShipCook({ message: "lunch please", track: "table", haulItems: [{ name: "greens" }] });
    expect(res.dish).toBeTruthy();
    expect(res.dish!.dishName).toBe("Sanctuary Bowl");
  });

  it("appends a raw reminder when a Reset dish mentions cooking", async () => {
    cookReturns({ message: "A warm bowl.", dishName: "Warm Bowl", base: ["greens"], method: "Lightly steam the greens." });
    const res = await askShipCook({ message: "reset dinner", track: "reset", haulItems: [{ name: "greens" }] });
    expect(res.dish).toBeTruthy();
    expect(res.reply.toLowerCase()).toContain("fully raw");
  });

  it("returns no dish when the Cook is asking rather than proposing", async () => {
    cookReturns({ message: "What else did you gather?", hasDish: false, dishName: "" });
    const res = await askShipCook({ message: "cook something", track: "table", haulItems: [] });
    expect(res.dish).toBeNull();
    expect(res.reply).toContain("What else");
  });

  it("never serves placeholder text as a dish", async () => {
    // A forced schema makes the model fill every field, so it reaches for these.
    cookReturns({ message: "I need more to work with.", dishName: "<UNKNOWN>", method: "<UNKNOWN>", why: "N/A" });
    const res = await askShipCook({ message: "cook something", track: "table", haulItems: [] });
    expect(res.dish).toBeNull();
  });

  it("strips placeholder entries out of a real dish's ingredient lists", async () => {
    cookReturns({ message: "Here you go.", dishName: "Green Bowl", base: ["greens", "N/A"], toppings: ["<UNKNOWN>"] });
    const res = await askShipCook({ message: "lunch", track: "table", haulItems: [{ name: "greens" }] });
    expect(res.dish!.base).toEqual(["greens"]);
    expect(res.dish!.toppings).toEqual([]);
  });

  it("falls back gracefully when the model is unavailable", async () => {
    invokeLLM.mockRejectedValueOnce(new Error("boom"));
    const res = await askShipCook({ message: "hi", track: "table", haulItems: [] });
    expect(res.dish).toBeNull();
    expect(res.reply.length).toBeGreaterThan(0);
  });
});

/**
 * The Cook is a food guide, never a medical one. The tradition's own failure mode
 * is reading a symptom as detox, and the crew is often hours from a hospital, so
 * these rails are enforced in code rather than left to the model.
 */
describe("health triage", () => {
  beforeEach(() => invokeLLM.mockReset());

  it("triages urgent symptoms", () => {
    expect(detectHealthConcern("I have severe pain in my side")).toBe("urgent");
    expect(detectHealthConcern("my chest pain is getting worse")).toBe("urgent");
    expect(detectHealthConcern("I fainted this morning")).toBe("urgent");
    expect(detectHealthConcern("I can't keep water down")).toBe("urgent");
  });

  it("triages body talk as a concern", () => {
    expect(detectHealthConcern("I'm pregnant, is this ok?")).toBe("concern");
    expect(detectHealthConcern("I have a headache on day two")).toBe("concern");
    expect(detectHealthConcern("is this detox?")).toBe("concern");
    expect(detectHealthConcern("should I stop my B12?")).toBe("concern");
    expect(detectHealthConcern("should I try a water fast?")).toBe("concern");
  });

  it("leaves ordinary food talk alone", () => {
    expect(detectHealthConcern("what can I make with melon and cucumber?")).toBe("none");
    expect(detectHealthConcern("something cool for a hot afternoon")).toBe("none");
  });

  it("short-circuits an urgent symptom to real care, with no model call", async () => {
    const res = await askShipCook({ message: "I have severe pain in my abdomen", track: "table", haulItems: [{ name: "greens" }] });
    expect(invokeLLM).not.toHaveBeenCalled();
    expect(res.dish).toBeNull();
    expect(res.reply.toLowerCase()).toContain("emergency services");
  });

  it("rides the care note along on any body talk, even while still cooking", async () => {
    cookReturns({ message: "Here's a bright bowl.", dishName: "Green Bowl", base: ["greens"] });
    const res = await askShipCook({ message: "I've had a headache since I started, what should I eat?", track: "table", haulItems: [{ name: "greens" }] });
    expect(res.dish).toBeTruthy(); // she still cooks
    expect(res.reply.toLowerCase()).toContain("not a clinician");
    expect(res.reply.toLowerCase()).toContain("get it looked at");
  });

  it("keeps the care note when the model is unavailable", async () => {
    invokeLLM.mockRejectedValueOnce(new Error("boom"));
    const res = await askShipCook({ message: "is this dizziness normal?", track: "table", haulItems: [] });
    expect(res.reply.toLowerCase()).toContain("not a clinician");
  });
});
