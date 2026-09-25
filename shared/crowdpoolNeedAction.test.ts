import { describe, expect, it } from "vitest";
import {
  capitalForItem,
  effectiveWorkMode,
  formatShortDay,
  kindForItem,
  modesFor,
  needChip,
  needShortLine,
  needTitle,
  needVerb,
  roleTimeLine,
  sheetCopy,
  thingWindowLine,
  toDay,
} from "./crowdpoolNeedAction";
import { titleForItem } from "../client/src/lib/needDisplay";

/** titleForItem exactly as client/src/lib/needDisplay.ts had it before the move. */
function legacyTitleForItem(item: any): string {
  if (item.roleTitle) return item.roleTitle;
  if (item.equipmentName) return item.equipmentName;
  if (item.resourceName) return item.resourceName;
  if (item.hectares && item.region) return `${item.hectares} hectares in ${item.region}`;
  if (item.landDescription) {
    const firstLine = String(item.landDescription).split("\n")[0];
    return firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;
  }
  return "Campaign need";
}

const TODAY = "2026-09-25";

describe("needVerb and needChip", () => {
  it("names the verb for each kind, and none for money", () => {
    expect(needVerb("role")).toBe("Apply");
    expect(needVerb("knowledge")).toBe("Apply");
    expect(needVerb("item")).toBe("Offer");
    expect(needVerb("loan")).toBe("Offer");
    expect(needVerb("shift")).toBe("Sign up");
    expect(needVerb("crypto")).toBeNull();
    expect(needVerb("financial_link")).toBeNull();
  });

  it("puts each kind under one chip, and money under none", () => {
    expect(needChip("item")).toBe("things");
    expect(needChip("loan")).toBe("things");
    expect(needChip("shift")).toBe("time");
    expect(needChip("role")).toBe("role");
    expect(needChip("knowledge")).toBe("knowhow");
    expect(needChip("crypto")).toBeNull();
    expect(needChip("financial_link")).toBeNull();
  });
});

describe("sheetCopy", () => {
  it("matches the table in section 10.3", () => {
    expect(sheetCopy("Apply", "Farm manager", "Spring Build")).toEqual({
      title: "Apply for Farm manager",
      description: "Your application goes to the stewards of Spring Build.",
      submit: "Send my application",
      success: "Application sent",
    });
    expect(sheetCopy("Offer", "Tractor", "Spring Build")).toEqual({
      title: "Offer Tractor",
      description: "Your offer goes to the stewards of Spring Build.",
      submit: "Send my offer",
      success: "Offer sent",
    });
    expect(sheetCopy("Sign up", "Planting day", "Spring Build")).toEqual({
      title: "Sign up for Planting day",
      description: "Your sign-up goes to the stewards of Spring Build.",
      submit: "Sign me up",
      success: "Sign-up sent",
    });
    expect(sheetCopy("Freeform", "", "Spring Build")).toEqual({
      title: "Offer something else",
      description: "Tell the stewards of Spring Build what you'd bring.",
      submit: "Send my offer",
      success: "Offer sent",
    });
  });
});

describe("roleTimeLine (R18)", () => {
  const hoursRole = (over: Record<string, unknown> = {}) => ({
    kind: "role",
    capacityUnit: "hours_per_week",
    quantityWanted: 20,
    ...over,
  });

  it("with an end date: hours a week until then, and the hours in all", () => {
    // 1 Oct to 15 Dec is 75 days, about 11 weeks.
    expect(roleTimeLine(hoursRole({ neededFrom: "2026-10-01", neededUntil: "2026-12-15" }), TODAY))
      .toBe("20 hrs a week until 15 Dec, about 220 hours in all");
  });

  it("counts from today when the role has no start date, and adds the year when it is not this year", () => {
    // 25 Sep 2026 to 26 Mar 2027 is 182 days, 26 weeks.
    expect(roleTimeLine(hoursRole({ quantityWanted: 40, neededUntil: "2027-03-26" }), TODAY))
      .toBe("40 hrs a week until 26 Mar 2027, about 1,040 hours in all");
  });

  it("never counts fewer than one week", () => {
    expect(roleTimeLine(hoursRole({ neededFrom: "2026-10-01", neededUntil: "2026-10-02" }), TODAY))
      .toBe("20 hrs a week until 2 Oct, about 20 hours in all");
  });

  it("with a duration in months", () => {
    expect(roleTimeLine(hoursRole({ durationMonths: 6 }), TODAY))
      .toBe("20 hrs a week for 6 months, about 520 hours in all");
    expect(roleTimeLine(hoursRole({ durationMonths: 1 }), TODAY))
      .toBe("20 hrs a week for 1 month, about 87 hours in all");
  });

  it("otherwise just the hours a week", () => {
    expect(roleTimeLine(hoursRole(), TODAY)).toBe("20 hrs a week");
  });

  it("a legacy count role reads per person, and anything else reads nothing", () => {
    expect(roleTimeLine({ kind: "role", capacityUnit: "count", hoursPerWeek: 10, quantityWanted: 2 }, TODAY))
      .toBe("10 hrs a week each");
    expect(roleTimeLine({ kind: "role", capacityUnit: "count", quantityWanted: 2 }, TODAY)).toBeNull();
    expect(roleTimeLine({ kind: "item", quantityWanted: 1 }, TODAY)).toBeNull();
  });
});

describe("modesFor, thingWindowLine and effectiveWorkMode", () => {
  it("a legacy loan need reads loan only whatever its columns say", () => {
    expect(modesFor({ kind: "loan", acceptsGift: 1, acceptsLoan: 0 })).toEqual({ gift: false, loan: true });
    expect(modesFor({ kind: "loan" })).toEqual({ gift: false, loan: true });
  });

  it("a thing reads its columns, defaulting to gift only", () => {
    expect(modesFor({ kind: "item" })).toEqual({ gift: true, loan: false });
    expect(modesFor({ kind: "item", acceptsGift: 1, acceptsLoan: 1 })).toEqual({ gift: true, loan: true });
    expect(modesFor({ kind: "item", acceptsGift: 0, acceptsLoan: 1 })).toEqual({ gift: false, loan: true });
    expect(modesFor({ kind: "item", acceptsGift: false, acceptsLoan: true })).toEqual({ gift: false, loan: true });
  });

  it("roles, shifts and knowledge ignore the mode columns", () => {
    expect(modesFor({ kind: "role", acceptsGift: 0, acceptsLoan: 1 })).toEqual({ gift: true, loan: false });
    expect(modesFor({ kind: "shift", acceptsLoan: 1 })).toEqual({ gift: true, loan: false });
  });

  it("writes the card line for a thing need", () => {
    const today = "2027-01-10";
    expect(thingWindowLine({ kind: "item", neededFrom: "2027-03-01", neededUntil: "2027-06-30", acceptsGift: 1, acceptsLoan: 1 }, today))
      .toBe("Needed 1 Mar to 30 Jun. Give or lend.");
    expect(thingWindowLine({ kind: "item", neededUntil: "2027-06-30", acceptsGift: 0, acceptsLoan: 1 }, today))
      .toBe("Needed by 30 Jun. On loan.");
    expect(thingWindowLine({ kind: "item", neededFrom: "2027-03-01", acceptsGift: 1, acceptsLoan: 0 }, today))
      .toBe("Needed from 1 Mar.");
    expect(thingWindowLine({ kind: "item", neededFrom: "2028-03-01", acceptsGift: 1 }, today))
      .toBe("Needed from 1 Mar 2028.");
    expect(thingWindowLine({ kind: "loan" }, today)).toBe("On loan.");
    expect(thingWindowLine({ kind: "item", acceptsGift: 1, acceptsLoan: 0 }, today)).toBeNull();
    expect(thingWindowLine({ kind: "role", neededUntil: "2027-06-30" }, today)).toBeNull();
  });

  it("says where a need happens", () => {
    expect(effectiveWorkMode({ kind: "role", workMode: "on_site" })).toBe("land");
    expect(effectiveWorkMode({ kind: "role", workMode: "remote" })).toBe("remote");
    expect(effectiveWorkMode({ kind: "knowledge", workMode: "either" })).toBe("either");
    expect(effectiveWorkMode({ kind: "item" })).toBe("land");
    expect(effectiveWorkMode({ kind: "loan" })).toBe("land");
    expect(effectiveWorkMode({ kind: "shift" })).toBe("land");
    expect(effectiveWorkMode({ kind: "role" })).toBeNull();
    expect(effectiveWorkMode({ kind: "knowledge" })).toBeNull();
    expect(effectiveWorkMode({ kind: "crypto" })).toBeNull();
  });
});

describe("needTitle, kindForItem and capitalForItem (moved from needDisplay)", () => {
  const fixtures: any[] = [
    // The NeedCard.test.tsx role fixture.
    { id: 5, kind: "role", capacityUnit: "hours_per_week", capitalType: "experiential", roleTitle: "Farm Manager", quantityWanted: 40 },
    { kind: "item", equipmentName: "Tractor" },
    { kind: "item", resourceName: "Seed potatoes" },
    { kind: "item", hectares: 12, region: "Alentejo" },
    { kind: "item", hectares: 12 },
    { kind: "item", landDescription: "A south-facing slope\nwith a spring" },
    { kind: "item", landDescription: "x".repeat(120) },
    { kind: "item" },
    {},
  ];

  it("gives exactly what titleForItem gave, and needDisplay still exports it", () => {
    for (const f of fixtures) {
      expect(needTitle(f)).toBe(legacyTitleForItem(f));
      expect(titleForItem(f)).toBe(legacyTitleForItem(f));
    }
  });

  it("reads legacy rows from their category", () => {
    expect(kindForItem({ category: "role" })).toBe("role");
    expect(kindForItem({ category: "equipment" })).toBe("item");
    expect(kindForItem({ kind: "shift", category: "resource" })).toBe("shift");
    expect(capitalForItem({ category: "land" })).toBe("living");
    expect(capitalForItem({ category: "role" })).toBe("experiential");
    expect(capitalForItem({ category: "equipment" })).toBe("material");
    expect(capitalForItem({ capitalType: "health", category: "role" })).toBe("health");
  });
});

describe("needShortLine and dates", () => {
  it("writes one short line per need", () => {
    expect(needShortLine({ kind: "role", capacityUnit: "hours_per_week", roleTitle: "Farm manager", quantityWanted: 20 }, TODAY))
      .toBe("Farm manager, 20 hrs a week");
    expect(needShortLine({ kind: "shift", roleTitle: "Planting day", quantityWanted: 12 }, TODAY)).toBe("Planting day, 12 places");
    expect(needShortLine({ kind: "shift", roleTitle: "Planting day", quantityWanted: 1 }, TODAY)).toBe("Planting day, 1 place");
    expect(needShortLine({ kind: "item", equipmentName: "Tractor", neededFrom: "2026-10-01", neededUntil: "2026-12-15" }, TODAY))
      .toBe("Tractor, 1 Oct to 15 Dec");
    expect(needShortLine({ kind: "item", equipmentName: "Tractor" }, TODAY)).toBe("Tractor");
    expect(needShortLine({ kind: "knowledge", resourceName: "Soil workshop" }, TODAY)).toBe("Soil workshop");
  });

  it("reads dates as days in UTC", () => {
    expect(toDay("2027-03-01")).toBe("2027-03-01");
    expect(toDay("2027-03-01 00:00:00")).toBe("2027-03-01");
    expect(toDay(new Date("2027-03-01T23:30:00Z"))).toBe("2027-03-01");
    expect(toDay(null)).toBeNull();
    expect(toDay("not a date")).toBeNull();
    expect(formatShortDay("2026-04-01", TODAY)).toBe("1 Apr");
    expect(formatShortDay("2027-04-01", TODAY)).toBe("1 Apr 2027");
  });
});
