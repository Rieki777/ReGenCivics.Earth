import { describe, expect, it } from "vitest";
import {
  checkAcceptHours,
  fullTimeEquivalent,
  fullTimeLabel,
  HOURS_WHOLE_NUMBER_MESSAGE,
  isHoursNeed,
  roleFillState,
  scaleRoleValue,
  standingHours,
} from "./roleCapacity";

const role = (over: Partial<Parameters<typeof roleFillState>[0]> = {}) => ({
  kind: "role",
  capacityUnit: "hours_per_week",
  quantityWanted: 40,
  quantityClaimed: 0,
  quantityDelivered: 0,
  estimatedValue: 8000,
  ...over,
});

describe("isHoursNeed", () => {
  it("is true only for a role marked hours_per_week", () => {
    expect(isHoursNeed({ kind: "role", capacityUnit: "hours_per_week" })).toBe(true);
    expect(isHoursNeed({ kind: "role", capacityUnit: "count" })).toBe(false);
    expect(isHoursNeed({ kind: "role", capacityUnit: null })).toBe(false);
    expect(isHoursNeed({ kind: "shift", capacityUnit: "hours_per_week" })).toBe(false);
    expect(isHoursNeed(null)).toBe(false);
  });
});

describe("roleFillState", () => {
  it("reads open and partial", () => {
    expect(roleFillState(role({ quantityClaimed: 10 }))).toEqual({
      needed: 40, accepted: 10, delivered: 0, open: 30, filled: false, percentAccepted: 25,
    });
  });
  it("reads filled at exactly the hours needed, and caps percent at 100", () => {
    expect(roleFillState(role({ quantityClaimed: 40 })).filled).toBe(true);
    const over = roleFillState(role({ quantityClaimed: 50 }));
    expect(over.filled).toBe(true);
    expect(over.open).toBe(0);
    expect(over.percentAccepted).toBe(100);
  });
  it("never reads filled with nothing needed", () => {
    expect(roleFillState(role({ quantityWanted: 0 })).filled).toBe(false);
  });
});

describe("fullTimeEquivalent and fullTimeLabel", () => {
  it("converts at 40 hours a person", () => {
    expect(fullTimeEquivalent(120)).toBe(3);
    expect(fullTimeEquivalent(60)).toBe(1.5);
  });
  it("labels in plain words", () => {
    expect(fullTimeLabel(40)).toBe("about 1 full-time person");
    expect(fullTimeLabel(120)).toBe("about 3 full-time people");
    expect(fullTimeLabel(20)).toBe("about half a full-time person");
    expect(fullTimeLabel(5)).toBe("a few hours a week");
    expect(fullTimeLabel(60)).toBe("about 1.5 full-time people");
  });
});

describe("scaleRoleValue", () => {
  it("gives the share of value by hours, to the cent", () => {
    expect(scaleRoleValue(8000, 40, 10)).toBe(2000);
    expect(scaleRoleValue(1000, 3, 1)).toBe(333.33);
  });
  it("is 0 for a role with no hours", () => {
    expect(scaleRoleValue(8000, 0, 10)).toBe(0);
    expect(scaleRoleValue(8000, -5, 10)).toBe(0);
  });
});

describe("checkAcceptHours", () => {
  it("accepts within the open hours", () => {
    expect(checkAcceptHours({ requested: 30, neededHours: 40, standingExcludingThis: 10 })).toEqual({ ok: true });
  });
  it("refuses past the open hours with the number still open", () => {
    const r = checkAcceptHours({ requested: 50, neededHours: 40, standingExcludingThis: 10 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.open).toBe(30);
      expect(r.message).toBe(
        "Only 30 hours a week are still open on this role. Lower the hours to 30 or fewer, or raise the hours the role needs.",
      );
    }
  });
  it("refuses on a filled role", () => {
    const r = checkAcceptHours({ requested: 1, neededHours: 40, standingExcludingThis: 40 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.open).toBe(0);
      expect(r.message).toBe("This role is already filled. Release someone or raise the hours it needs first.");
    }
  });
  it("refuses a fraction, zero or a negative", () => {
    for (const requested of [0, -1, 2.5, Number.NaN]) {
      const r = checkAcceptHours({ requested, neededHours: 40, standingExcludingThis: 0 });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message).toBe(HOURS_WHOLE_NUMBER_MESSAGE);
    }
  });
});

describe("standingHours", () => {
  it("sums accepted over standing statuses and delivered over delivered ones", () => {
    expect(standingHours([
      { status: "accepted", quantityPledged: 10 },
      { status: "fulfilled", quantityPledged: 5 },
      { status: "thanked", quantityPledged: 2 },
      { status: "pending", quantityPledged: 100 },
      { status: "released", quantityPledged: 100 },
      { status: "cancelled", quantityPledged: 100 },
    ])).toEqual({ accepted: 17, delivered: 7 });
  });
});
