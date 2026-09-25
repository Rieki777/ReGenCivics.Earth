import { describe, expect, it } from "vitest";
import {
  checkAcceptHours,
  FILLED_ROLE_REFUSAL,
  fullTimeEquivalent,
  fullTimeLabel,
  HOURS_WHOLE_NUMBER_MESSAGE,
  isHoursNeed,
  reopenedOpenHours,
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

describe("reopenedOpenHours", () => {
  it("reports the open hours when a filled role opens up", () => {
    // A release or lowered hours: accepted drops under the hours needed.
    expect(reopenedOpenHours({ needed: 40, accepted: 40 }, { needed: 40, accepted: 10 })).toBe(30);
    // Raising the hours the role needs.
    expect(reopenedOpenHours({ needed: 40, accepted: 40 }, { needed: 60, accepted: 40 })).toBe(20);
  });
  it("is 0 when the role was not filled before", () => {
    expect(reopenedOpenHours({ needed: 40, accepted: 30 }, { needed: 40, accepted: 10 })).toBe(0);
    expect(reopenedOpenHours({ needed: 40, accepted: 30 }, { needed: 80, accepted: 30 })).toBe(0);
    expect(reopenedOpenHours({ needed: 0, accepted: 0 }, { needed: 40, accepted: 0 })).toBe(0);
  });
  it("is 0 when the role is still filled", () => {
    expect(reopenedOpenHours({ needed: 40, accepted: 40 }, { needed: 40, accepted: 40 })).toBe(0);
    expect(reopenedOpenHours({ needed: 60, accepted: 60 }, { needed: 40, accepted: 60 })).toBe(0);
  });
});

describe("FILLED_ROLE_REFUSAL", () => {
  it("promises no notice to followers, since following does not bring the reopened notice", () => {
    expect(FILLED_ROLE_REFUSAL).toMatch(/filled right now/);
    expect(FILLED_ROLE_REFUSAL.toLowerCase()).not.toContain("follow");
    expect(FILLED_ROLE_REFUSAL).not.toContain("\u2014"); // no em-dash
  });
});
