import { describe, expect, it } from "vitest";
import {
  CUSTOM_GAME_BLUEPRINT_FIELDS,
  EMPTY_BLUEPRINT_ANSWER,
  customGameBlueprintFieldKeys,
  formatCustomGameBlueprintAnswers,
  getBlueprintPath,
} from "./customGameBlueprintFields";

describe("customGameBlueprintFieldKeys", () => {
  it("covers vision/pains and other intake fields without duplicates", () => {
    const keys = customGameBlueprintFieldKeys();
    expect(keys).toContain("content.vision");
    expect(keys).toContain("content.problems");
    expect(keys).toContain("content.goals");
    expect(keys).toContain("identity.landStatus");
    expect(keys).toContain("deployment.budgetConfirmed");
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toHaveLength(CUSTOM_GAME_BLUEPRINT_FIELDS.length);
  });
});

describe("getBlueprintPath", () => {
  it("reads nested values", () => {
    expect(getBlueprintPath({ content: { vision: "Hello" } }, "content.vision")).toBe("Hello");
    expect(getBlueprintPath({}, "content.vision")).toBeUndefined();
  });
});

describe("formatCustomGameBlueprintAnswers", () => {
  it("does not truncate long vision/pains and shows — for empties", () => {
    const vision = "V".repeat(500);
    const pain = "P".repeat(700);
    const rows = formatCustomGameBlueprintAnswers({
      content: {
        vision,
        problems: [pain, "Second pain"],
        goals: ["Grow food", "Share land"],
      },
      identity: { landStatus: "owned", location: "Portugal" },
      deployment: { budgetConfirmed: true },
    });
    expect(rows).toHaveLength(CUSTOM_GAME_BLUEPRINT_FIELDS.length);
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(byKey["content.vision"].displayValue).toBe(vision);
    expect(byKey["content.vision"].displayValue.length).toBe(500);
    expect(byKey["content.problems"].displayValue).toContain(pain);
    expect(byKey["content.problems"].displayValue).toContain("Second pain");
    expect(byKey["content.goals"].displayValue).toBe("Grow food; Share land");
    expect(byKey["identity.landStatus"].displayValue).toBe("Owned");
    expect(byKey["deployment.budgetConfirmed"].displayValue).toBe("Yes");
    expect(byKey["language.guideName"].displayValue).toBe(EMPTY_BLUEPRINT_ANSWER);
    expect(byKey["content.story"].isEmpty).toBe(true);
  });

  it("formats personas from label or id", () => {
    const rows = formatCustomGameBlueprintAnswers({
      personas: [{ id: "resident", label: "Resident" }, { id: "investor" }],
    });
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(byKey.personas.displayValue).toBe("Resident, investor");
  });
});
