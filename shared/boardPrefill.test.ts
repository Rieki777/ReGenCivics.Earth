import { describe, expect, it } from "vitest";
import {
  PREFILL_NOTE,
  dropPrefillFields,
  prefillWrites,
  suggestBoardPrefill,
  type PrefillRecord,
} from "./boardPrefill";

const base: PrefillRecord = {
  application: {
    projectName: "Amora",
    location: "Ubud",
    country: "Indonesia",
    landStatus: "owned",
    projectSizeHectares: 12,
    currentPeopleCount: 20,
    currentHouseholdCount: 6,
    teamSize: 8,
    teamDescription: "A core group that already lives on the land.",
    regenerativePractices: "Food forest and greywater.",
    websiteUrl: "amora.earth",
  },
  campaign: {
    currentPhase: "Sprout",
    legalStructure: "Cooperative in Indonesia",
    housingPlans: "Three small houses",
    foodSystems: "Kitchen garden",
    waterSystems: "Spring and tank",
    energySystems: "Solar",
    challenges: "The road washes out in the rains.",
  },
  readinessTicks: [],
};

describe("suggestBoardPrefill", () => {
  it("fills the card from the application and the campaign", () => {
    const fill = suggestBoardPrefill(base);
    expect(fill.place).toBe("Ubud, Indonesia");
    expect(fill.url).toBe("https://amora.earth");
    expect(fill.phase).toBe("sprout");
    expect(fill.whereNow).toContain("The land is owned");
    expect(fill.whereNow).toContain("12 hectares");
    expect(fill.whereNow).toContain("8 in the core team");
    expect(fill.whereNow).toContain("20 people there now");
    expect(fill.whereNow).toContain("Food forest and greywater");
    expect(fill.whereNow).toContain("Housing: Three small houses");
    expect(fill.whereNow).not.toContain("Phase they wrote");
    expect(fill.pain).toBe("The road washes out in the rains.");
    expect(fill.ready).toEqual(["land", "legal"]);
    expect(JSON.stringify(fill)).not.toContain("—");
    expect(PREFILL_NOTE).not.toContain("—");
  });

  it("uses a steward's readiness ticks and does not add inferred ones beside them", () => {
    const fill = suggestBoardPrefill({
      ...base,
      application: { ...base.application, landStatus: "owned" },
      readinessTicks: ["governance", "care"],
    });
    expect(fill.ready).toEqual(["governance", "care"]);
  });

  it("does not check land when the application is still seeking, and skips a blank legal answer", () => {
    const fill = suggestBoardPrefill({
      application: { projectName: "River", location: "Bali", landStatus: "seeking" },
      campaign: { legalStructure: "none", challenges: "" },
      readinessTicks: [],
    });
    expect(fill.ready).toBeUndefined();
    expect(fill.pain).toBeUndefined();
    expect(fill.whereNow).toContain("Still looking for land");
  });

  it("leaves the stage blank when the campaign phase is not one of the five", () => {
    const fill = suggestBoardPrefill({
      application: { projectName: "River", location: "Bali" },
      campaign: { currentPhase: "Just getting going" },
    });
    expect(fill.phase).toBeUndefined();
    expect(fill.whereNow).toContain("Phase they wrote: Just getting going.");
  });

  it("leaves growth opportunities off the card", () => {
    const fill = suggestBoardPrefill(base);
    expect(fill).not.toHaveProperty("opp");
    expect(Object.keys(fill).sort()).toEqual(["pain", "phase", "place", "ready", "url", "whereNow"]);
  });

  it("does not overwrite a value already on the card", () => {
    const suggestion = suggestBoardPrefill(base);
    const writes = prefillWrites(
      {
        place: "Already typed",
        url: null,
        phase: "seed",
        whereNow: "We wrote this live.",
        ready: ["care"],
        painCount: 1,
      },
      suggestion,
    );
    expect(writes).toEqual({ url: "https://amora.earth" });
  });

  it("fills every empty field, including the first pain point", () => {
    const suggestion = suggestBoardPrefill(base);
    const writes = prefillWrites(
      { place: "", url: null, phase: null, whereNow: "  ", ready: [], painCount: 0 },
      suggestion,
    );
    expect(writes.phase).toBe("sprout");
    expect(writes.pain).toBe("The road washes out in the rains.");
    expect(writes.ready).toEqual(["land", "legal"]);
  });

  it("drops a mark once that field is edited", () => {
    expect(dropPrefillFields("place,whereNow,ready", ["whereNow"])).toBe("place,ready");
    expect(dropPrefillFields("pain", ["pain"])).toBeNull();
  });
});
