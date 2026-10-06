import { describe, expect, it } from "vitest";
import { ARCHETYPE_KEYS, ARCHETYPES } from "./archetypes";
import {
  archetypeKeyForSave,
  buildGiftRecord,
  characterFromPublicProfile,
  classPortraitSrc,
  maturityArc,
  normalizeCharacterChoice,
  parsePartyKeys,
  standingFromRecord,
  visibleStanding,
} from "./characterSheet";

describe("archetype keys", () => {
  it("matches the Village OS cast", () => {
    expect(ARCHETYPE_KEYS).toEqual([
      "building",
      "researching",
      "facilitating",
      "catalyzing",
      "storytelling",
    ]);
    expect(ARCHETYPES.map((a) => a.key)).toEqual([...ARCHETYPE_KEYS]);
  });
});

describe("character choice", () => {
  it("drops unknown keys and keeps the primary in the party", () => {
    const choice = normalizeCharacterChoice({
      primaryArchetypeKey: "storytelling",
      partyArchetypeKeys: ["nope", "building", "building", "storytelling"],
      portraitPresentation: "f",
    });
    expect(choice.primaryArchetypeKey).toBe("storytelling");
    expect(choice.partyArchetypeKeys).toEqual(["storytelling", "building"]);
    expect(choice.portraitPresentation).toBe("f");
  });

  it("clears a class that is not one of the five", () => {
    expect(normalizeCharacterChoice({
      primaryArchetypeKey: "wizard",
      partyArchetypeKeys: ["wizard"],
      portraitPresentation: "x",
    })).toEqual({
      primaryArchetypeKey: null,
      partyArchetypeKeys: [],
      portraitPresentation: null,
    });
  });

  it("parses party json and ignores junk", () => {
    expect(parsePartyKeys('["building","nope",1]')).toEqual(["building"]);
    expect(parsePartyKeys(null)).toEqual([]);
  });
});

describe("save stamp", () => {
  it("adds the primary key only when the profile has a character", () => {
    expect(archetypeKeyForSave("building")).toBe("building");
    expect(archetypeKeyForSave(null)).toBeNull();
    expect(archetypeKeyForSave("")).toBeNull();
    expect(archetypeKeyForSave("wizard")).toBeNull();
  });
});

describe("gift record", () => {
  it("hides zero capitals and keeps a quiet line", () => {
    const record = buildGiftRecord([
      { capital: "living", description: "Land parcel", value: 42000, kind: "gift" },
      { capital: "health", description: "", value: 0, kind: "gift" },
      { capital: "experiential", description: "Food forest", value: 12000, kind: "role" },
      { capital: "not-a-capital", description: "Skip", value: 10, kind: "gift" },
    ]);
    expect(record.empty).toBe(false);
    expect(record.lines.map((line) => line.capital)).toEqual(["living", "experiential"]);
    expect(record.giftCount).toBe(1);
    expect(record.roleCount).toBe(1);
    expect(record.brings).toBe(54000);
    expect(record.quietLine).toContain("Material");
    expect(record.quietLine).toContain("Social");
    expect(record.quietLine).toContain("Cultural");
    expect(record.quietLine).not.toContain("Health");
    expect(record.lines.some((line) => line.capital === "health")).toBe(false);
  });

  it("shows health only when a gift uses it", () => {
    const record = buildGiftRecord([
      { capital: "health", description: "Care shifts", value: 500, kind: "gift" },
    ]);
    expect(record.lines).toHaveLength(1);
    expect(record.lines[0]?.label).toBe("Health");
  });

  it("is an empty state when nothing has a value", () => {
    const record = buildGiftRecord([
      { capital: "financial", description: "Pledge", value: 0, kind: "gift" },
    ]);
    expect(record.empty).toBe(true);
    expect(record.quietLine).toBe("");
    expect(standingFromRecord(record)).toEqual({ brings: null, gifts: null, roles: null });
  });
});

describe("standing row", () => {
  it("hides until a number is above zero and leaves unread figures off", () => {
    expect(visibleStanding({ brings: 0, gifts: 0, roles: 0 })).toBeNull();
    expect(visibleStanding({ brings: null, gifts: null, roles: null })).toBeNull();
    expect(visibleStanding({ brings: 1200, gifts: null, roles: 0 })).toEqual({ brings: 1200 });
  });
});

describe("maturity arc", () => {
  it("draws only when both rung numbers are known", () => {
    expect(maturityArc(null, 12)).toBeNull();
    expect(maturityArc(0, null)).toBeNull();
    expect(maturityArc(0, 0)).toBeNull();
    expect(maturityArc(0, 12)).toBeCloseTo(1 / 12);
    expect(maturityArc(11, 12)).toBe(1);
  });
});

describe("public profile seam", () => {
  it("keeps public identity fields and ignores an unknown class", () => {
    const local = characterFromPublicProfile({
      archetypeKey: "facilitating",
      partyKeys: ["facilitating", "catalyzing"],
      portraitUrl: "https://village.example/portrait.webp",
      displayName: "Amora",
      stageIndex: 3,
      stageCount: 12,
    });
    expect(local.primaryArchetypeKey).toBe("facilitating");
    expect(local.partyArchetypeKeys).toEqual(["facilitating", "catalyzing"]);
    expect(local.displayName).toBe("Amora");
    expect(local.portraitUrl).toContain("portrait.webp");
    expect(local.arc).toBeCloseTo(4 / 12);
    expect(classPortraitSrc("building", "f")).toBe("/images/avatars/building-f-olive.webp");
    expect(classPortraitSrc("building", null)).toBeNull();
  });
});
