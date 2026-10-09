/**
 * The need rules moved out of db.createCampaign (bundle 1, item 9) into
 * server/lib/need-rules.ts, case by case, and the rows they build. Pure: no
 * database. The create suites (contributions, role-hours, give-lend,
 * zero-value) still pin the same rules end to end through campaigns.create.
 */
import { describe, expect, it } from "vitest";
import {
  asStoredNeed,
  assertNeedRules,
  isHoursNeedInput,
  needInsertValues,
  needModesForCreate,
  needUpdateValues,
  type NeedInput,
} from "./lib/need-rules";
import { ZERO_VALUE } from "../shared/crowdpoolCopy";

const MONEY_REFUSAL =
  "Money isn't added as a need. Set the money this project asks for, and add the routes it holds, in the Money step.";
const HOURS_REFUSAL = "Each role needs the hours a week it asks for.";
const MODES_REFUSAL = "Choose whether you'd take each thing as a gift, on loan, or both.";
const WINDOW_REFUSAL = "A need can't end before it starts.";

const thing = (over: Partial<NeedInput> = {}): NeedInput => ({
  category: "resource", kind: "item", resourceName: "Wheelbarrow", estimatedValue: 120, ...over,
});
const role = (over: Partial<NeedInput> = {}): NeedInput => ({
  category: "role", kind: "role", roleTitle: "Garden lead", hoursPerWeek: 10, estimatedValue: 4000, ...over,
});

function refusal(items: NeedInput[]): string | null {
  try {
    assertNeedRules(items);
    return null;
  } catch (err) {
    expect((err as { code?: string }).code).toBe("BAD_REQUEST");
    return (err as Error).message;
  }
}

describe("assertNeedRules", () => {
  it("passes a thing and a role that meet every rule", () => {
    expect(refusal([thing({ neededFrom: "2026-11-01", neededUntil: "2026-11-30", acceptsLoan: true }), role()])).toBeNull();
  });

  it("refuses money as a need, crypto or a financial link, with the Money step line", () => {
    expect(refusal([thing({ kind: "crypto" })])).toBe(MONEY_REFUSAL);
    expect(refusal([thing({ kind: "financial_link" })])).toBe(MONEY_REFUSAL);
  });

  it("refuses a need listed at 0, or under half a cent, and names it", () => {
    expect(refusal([thing({ estimatedValue: 0 })])).toBe(ZERO_VALUE.server("Wheelbarrow"));
    expect(refusal([thing({ estimatedValue: 0.004 })])).toBe(ZERO_VALUE.server("Wheelbarrow"));
    expect(refusal([role({ roleTitle: "Tom &amp; Ann", estimatedValue: 0 })])).toBe(ZERO_VALUE.server("Tom & Ann"));
    expect(refusal([{ category: "land", estimatedValue: 0 }])).toBe(ZERO_VALUE.server("A need"));
    expect(refusal([thing({ estimatedValue: 0.01 })])).toBeNull();
  });

  it("refuses a window that ends before it starts", () => {
    expect(refusal([thing({ neededFrom: "2026-11-10", neededUntil: "2026-11-09" })])).toBe(WINDOW_REFUSAL);
    expect(refusal([thing({ neededFrom: "2026-11-10", neededUntil: "2026-11-10" })])).toBeNull();
    expect(refusal([thing({ neededUntil: "2026-11-09" })])).toBeNull();
  });

  it("refuses a thing that takes neither a gift nor a loan; a legacy loan always takes loans", () => {
    expect(refusal([thing({ acceptsGift: false, acceptsLoan: false })])).toBe(MODES_REFUSAL);
    expect(refusal([thing({ acceptsGift: false, acceptsLoan: true })])).toBeNull();
    expect(refusal([thing({ kind: "loan", acceptsGift: false, acceptsLoan: false })])).toBeNull();
    // Roles, shifts and knowledge ignore the modes.
    expect(refusal([thing({ kind: "knowledge", acceptsGift: false, acceptsLoan: false })])).toBeNull();
  });

  it("refuses a role in the Roles step without whole hours a week", () => {
    expect(refusal([role({ hoursPerWeek: undefined })])).toBe(HOURS_REFUSAL);
    expect(refusal([role({ hoursPerWeek: 0 })])).toBe(HOURS_REFUSAL);
    expect(refusal([role({ hoursPerWeek: 2.5 })])).toBe(HOURS_REFUSAL);
    // A role with no kind defaults to 'role' and is an hours need too.
    expect(refusal([role({ kind: undefined, hoursPerWeek: undefined })])).toBe(HOURS_REFUSAL);
    // The Other Needs step's roles (category resource) stay count needs.
    expect(refusal([thing({ kind: "role", hoursPerWeek: undefined })])).toBeNull();
  });

  it("checks every need before the hours, so a later need at 0 is named first", () => {
    expect(refusal([role({ hoursPerWeek: undefined }), thing({ estimatedValue: 0 })])).toBe(ZERO_VALUE.server("Wheelbarrow"));
  });
});

describe("needModesForCreate and isHoursNeedInput", () => {
  it("reads gifts on and loans off unless told, a legacy loan as loans only, and other kinds as no thing", () => {
    expect(needModesForCreate({ category: "resource" })).toEqual({ thing: true, gift: true, loan: false });
    expect(needModesForCreate({ category: "equipment", kind: "item", acceptsGift: false, acceptsLoan: true })).toEqual({ thing: true, gift: false, loan: true });
    expect(needModesForCreate({ category: "equipment", kind: "loan", acceptsGift: true })).toEqual({ thing: true, gift: false, loan: true });
    expect(needModesForCreate({ category: "role" })).toEqual({ thing: false, gift: true, loan: false });
    expect(needModesForCreate({ category: "resource", kind: "shift" })).toEqual({ thing: false, gift: true, loan: false });
  });
  it("counts only category role with kind role as an hours need", () => {
    expect(isHoursNeedInput({ category: "role" })).toBe(true);
    expect(isHoursNeedInput({ category: "role", kind: "role" })).toBe(true);
    expect(isHoursNeedInput({ category: "resource", kind: "role" })).toBe(false);
    expect(isHoursNeedInput({ category: "role", kind: "shift" })).toBe(false);
  });
});

describe("needInsertValues", () => {
  it("stores a legacy loan as an item that takes loans only", () => {
    const row = needInsertValues(9, thing({ kind: "loan" }));
    expect(row).toMatchObject({ campaignId: 9, kind: "item", acceptsGift: 0, acceptsLoan: 1, capacityUnit: "count", quantityWanted: 1 });
  });
  it("stores a role in hours a week, ignoring any quantity sent", () => {
    const row = needInsertValues(9, role({ quantityWanted: 3, workMode: "remote" }));
    expect(row).toMatchObject({
      kind: "role", capacityUnit: "hours_per_week", quantityWanted: 10, hoursPerWeek: 10,
      acceptsGift: 1, acceptsLoan: 0, capitalType: "experiential", workMode: "remote",
    });
  });
  it("defaults the capital by category and the quantity from the category's own field", () => {
    expect(needInsertValues(9, { category: "land", estimatedValue: 5 }).capitalType).toBe("living");
    expect(needInsertValues(9, thing()).capitalType).toBe("material");
    expect(needInsertValues(9, thing({ capitalType: "social" })).capitalType).toBe("social");
    expect(needInsertValues(9, thing({ resourceQuantity: 4 })).quantityWanted).toBe(4);
    expect(needInsertValues(9, { category: "equipment", equipmentQuantity: 2, estimatedValue: 5 }).quantityWanted).toBe(2);
    expect(needInsertValues(9, thing({ quantityWanted: 6, resourceQuantity: 4 })).quantityWanted).toBe(6);
    expect(needInsertValues(9, thing({ features: ["water"] })).features).toBe('["water"]');
    expect(needInsertValues(9, thing()).neededFrom).toBeNull();
  });
});

describe("needUpdateValues (a draft edit)", () => {
  const storedHoursRole = { category: "role", kind: "role", capacityUnit: "hours_per_week", capitalType: "experiential" } as const;
  const storedThing = { category: "equipment", kind: "item", capacityUnit: "count", capitalType: "material" } as const;

  it("keeps the stored category and kind whatever was sent", () => {
    const sent = role({ roleTitle: "Should not land", equipmentName: "Wood chipper", quantityWanted: 2 });
    expect(asStoredNeed(storedThing, sent)).toMatchObject({ category: "equipment", kind: "item" });
    const out = needUpdateValues(storedThing, sent);
    expect(out).toMatchObject({ equipmentName: "Wood chipper", quantityWanted: 2, equipmentQuantity: 2 });
    expect("roleTitle" in out).toBe(false);
    expect("category" in out).toBe(false);
    expect("kind" in out).toBe(false);
  });
  it("sets an hours role's capacity from its hours a week", () => {
    const out = needUpdateValues(storedHoursRole, role({ hoursPerWeek: 12, quantityWanted: 1, estimatedValue: 5000, roleDescription: "Beds and paths" }));
    expect(out).toMatchObject({ quantityWanted: 12, hoursPerWeek: 12, estimatedValue: 5000, roleTitle: "Garden lead", roleDescription: "Beds and paths" });
    expect("acceptsGift" in out).toBe(false);
  });
  it("clears the dates, description and place left out, and keeps the capital left out", () => {
    const out = needUpdateValues({ ...storedThing, category: "resource" }, thing({ quantityWanted: 3, acceptsLoan: true }));
    expect(out).toMatchObject({
      resourceName: "Wheelbarrow", resourceDescription: null, resourceQuantity: 3, quantityWanted: 3,
      neededFrom: null, neededUntil: null, workMode: null, capitalType: "material", acceptsGift: 1, acceptsLoan: 1,
    });
    expect(needUpdateValues(storedThing, thing({ capitalType: "living" })).capitalType).toBe("living");
  });
});
