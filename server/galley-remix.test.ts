/**
 * Galley deterministic remix engine tests (Galley spec section 6d).
 *
 * The engine must work fully without the Ship's Cook, so these cover the four
 * guarantees the interactive leans on: token normalization (loose logging finds
 * the right dishes), track filtering (the Deeper Reset never returns a cooked
 * card), scoring (the best-matching dish wins and is built from what the crew
 * has), and thin-haul suggestions (a sparse haul offers things to grab next).
 */
import { describe, it, expect } from "vitest";
import { GALLEY_CARDS } from "@shared/galleyCards";
import { tokenizeIngredient, haulTokens, remixHaul, rollRemix } from "./lib/galley-remix";

describe("tokenizeIngredient", () => {
  it("normalizes loose surface forms to canonical tokens", () => {
    expect(tokenizeIngredient("roma tomato")).toContain("tomato");
    expect(tokenizeIngredient("ripe watermelon slabs")).toContain("watermelon");
    expect(tokenizeIngredient("a bag of tuscan kale")).toContain("kale");
  });

  it("uses word boundaries so 'pea' does not match 'peach'", () => {
    expect(tokenizeIngredient("peach")).toContain("peach");
    expect(tokenizeIngredient("peach")).not.toContain("peas");
  });

  it("returns an empty list for unknown items", () => {
    expect(tokenizeIngredient("cardboard box")).toEqual([]);
    expect(tokenizeIngredient("")).toEqual([]);
  });
});

describe("haulTokens", () => {
  it("unions tokens from item names and notes", () => {
    const tokens = haulTokens([
      { name: "watermelon" },
      { name: "some greens", note: "with a little basil" },
    ]);
    expect(tokens.has("watermelon")).toBe(true);
    expect(tokens.has("greens")).toBe(true);
    expect(tokens.has("basil")).toBe(true);
  });
});

describe("remixHaul track filtering", () => {
  it("the Deeper Reset never returns a cooked card", () => {
    // A haul that would otherwise match the corn-tortilla taco (cooked).
    const items = [
      { name: "corn tortillas" },
      { name: "mushrooms" },
      { name: "walnuts" },
      { name: "sunflower seeds" },
      { name: "cabbage" },
    ];
    const reset = remixHaul(items, "reset", GALLEY_CARDS.length);
    for (const dish of reset.dishes) {
      const card = GALLEY_CARDS.find((c) => c.slug === dish.cardSlug)!;
      expect(card.raw).toBe(true);
      expect(card.tracks).toContain("reset");
    }
    expect(reset.dishes.map((d) => d.cardSlug)).not.toContain("corn-tortilla-tacos");
  });

  it("the Ship's Table can return the cooked corn-tortilla taco", () => {
    const items = [
      { name: "corn tortillas" },
      { name: "mushrooms" },
      { name: "cilantro" },
      { name: "lime" },
    ];
    const table = remixHaul(items, "table", GALLEY_CARDS.length);
    expect(table.dishes.map((d) => d.cardSlug)).toContain("corn-tortilla-tacos");
  });
});

describe("remixHaul scoring + composition", () => {
  it("ranks the dish that uses the most of the haul first", () => {
    const items = [
      { name: "leafy greens" },
      { name: "cabbage" },
      { name: "cucumber" },
      { name: "tomato" },
      { name: "avocado" },
      { name: "carrot" },
    ];
    const { dishes } = remixHaul(items, "table", 3);
    expect(dishes.length).toBeGreaterThan(0);
    expect(dishes[0].cardSlug).toBe("deep-sanctuary-salad");
    // Scores are non-increasing.
    for (let i = 1; i < dishes.length; i++) {
      expect(dishes[i - 1].score).toBeGreaterThanOrEqual(dishes[i].score);
    }
  });

  it("builds the dish only from ingredients the crew actually has", () => {
    const items = [{ name: "watermelon" }, { name: "lime" }, { name: "mint" }];
    const { dishes } = remixHaul(items, "table", 3);
    const plate = dishes.find((d) => d.cardSlug === "watermelon-wake-up-plate");
    expect(plate).toBeTruthy();
    // The card lists chili as a topping, but the crew has no chili.
    expect(plate!.toppings).not.toContain("chili");
    expect(plate!.toppings).toContain("mint");
    expect(plate!.matchedTokens).toContain("watermelon");
  });

  it("returns no dishes for a haul with nothing recognizable", () => {
    const { dishes, suggestions } = remixHaul([{ name: "cardboard" }], "table", 3);
    expect(dishes).toEqual([]);
    expect(suggestions.length).toBeGreaterThan(0);
  });
});

describe("remixHaul thin-haul suggestions", () => {
  it("suggests two or three staples to grab when the haul is thin", () => {
    const { suggestions } = remixHaul([{ name: "lemon" }], "table", 3);
    expect(suggestions.length).toBeGreaterThanOrEqual(1);
    expect(suggestions.length).toBeLessThanOrEqual(3);
  });

  it("does not suggest an item the crew already logged", () => {
    const { suggestions } = remixHaul([{ name: "watermelon" }], "table", 3);
    expect(suggestions.map((s) => s.toLowerCase())).not.toContain("watermelon");
  });

  it("offers no grab-next list for a rich, well-matched haul", () => {
    const items = [
      { name: "leafy greens" },
      { name: "cabbage" },
      { name: "cucumber" },
      { name: "tomato" },
      { name: "avocado" },
      { name: "carrot" },
      { name: "lemon" },
    ];
    const { suggestions } = remixHaul(items, "table", 3);
    expect(suggestions).toEqual([]);
  });
});

describe("rollRemix", () => {
  it("returns a valid dish from the haul, deterministic by seed", () => {
    const items = [{ name: "watermelon" }, { name: "lime" }, { name: "mint" }];
    const a = rollRemix(items, "table", 3);
    const b = rollRemix(items, "table", 3);
    expect(a).toBeTruthy();
    expect(a!.cardSlug).toBe(b!.cardSlug);
  });

  it("returns null when nothing matches", () => {
    expect(rollRemix([{ name: "cardboard" }], "table", 1)).toBeNull();
  });
});
