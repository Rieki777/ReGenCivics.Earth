import { describe, expect, it } from "vitest";
import { ARRIVAL_FIELDS, arrivalNoteLines, offerSteps, resolveArrivalNote, type OfferStepsInput } from "./offerStatus";

const today = "2026-10-15";
const input = (over: Partial<OfferStepsInput> = {}): OfferStepsInput => ({ status: "pending", campaignStatus: "active", ...over });
const shape = (r: ReturnType<typeof offerSteps>) => r.steps.map((s) => `${s.label}:${s.state}`);

describe("offerSteps: the steps", () => {
  it("a waiting offer is with the stewards", () => {
    const r = offerSteps(input(), today);
    expect(shape(r)).toEqual([
      "Sent:done",
      "Stewards reviewing:current",
      "Accepted:todo",
      "Underway:todo",
      "Delivered:todo",
      "Thanked:todo",
    ]);
    expect(r.ending).toBeNull();
    expect(r.stepLine).toBe("Waiting on the stewards. You can withdraw it until they accept it.");
  });

  it("an accepted offer names its hours, and reads Underway once it starts", () => {
    const r = offerSteps(input({ status: "accepted", acceptedHours: 6 }), today);
    expect(shape(r).slice(0, 3)).toEqual(["Sent:done", "Stewards reviewing:done", "Accepted for 6 hours a week:current"]);
    expect(r.stepLine).toBe("Accepted. The stewards will be in touch about the details.");
    expect(offerSteps(input({ status: "accepted", acceptedHours: 1 }), today).steps[2].label).toBe("Accepted for 1 hour a week");
    const started = offerSteps(input({ status: "accepted", needStartsOn: "2026-10-01" }), today);
    expect(shape(started)).toContain("Accepted:done");
    expect(shape(started)).toContain("Underway:current");
    expect(offerSteps(input({ status: "accepted", needStartsOn: "2026-11-01" }), today).steps[3].state).toBe("todo");
  });

  it("a lend reads Lent once its available-from day is here", () => {
    const waiting = offerSteps(input({ status: "accepted", offerMode: "lend", availableFrom: "2026-10-20" }), today);
    expect(shape(waiting)).toContain("Lent:todo");
    const lent = offerSteps(input({ status: "accepted", offerMode: "lend", availableFrom: "2026-10-15" }), today);
    expect(shape(lent)).toContain("Lent:current");
  });

  it("a delivered offer, then a thanked one", () => {
    const d = offerSteps(input({ status: "fulfilled" }), today);
    expect(shape(d).slice(3)).toEqual(["Underway:done", "Delivered:current", "Thanked:todo"]);
    expect(d.stepLine).toBe("Delivered. Thank you.");
    const t = offerSteps(input({ status: "thanked" }), today);
    expect(t.steps.every((s, i) => s.state === (i === 5 ? "current" : "done"))).toBe(true);
    expect(t.stepLine).toBe("Delivered and thanked.");
  });

  it("an unknown status reads as waiting", () => {
    expect(offerSteps(input({ status: "mystery" }), today).stepLine).toBe(
      "Waiting on the stewards. You can withdraw it until they accept it.",
    );
  });
});

describe("offerSteps: the endings", () => {
  const cases: Array<[Partial<OfferStepsInput>, string, string, string[]]> = [
    [{ status: "rejected" }, "rejected", "Not this time", ["Sent", "Stewards reviewing"]],
    [{ status: "withdrawn" }, "withdrawn", "You withdrew", ["Sent"]],
    [{ status: "cancelled", campaignStatus: "cancelled" }, "campaign_cancelled", "Campaign cancelled", ["Sent"]],
    [{ status: "cancelled", campaignStatus: "closed" }, "closed_with_campaign", "Closed when the campaign closed", ["Sent"]],
    [{ status: "cancelled", campaignStatus: "completed" }, "closed_with_campaign", "Closed when the campaign closed", ["Sent"]],
    [
      { status: "released", closeReleasedAt: "2026-11-30T00:00:00Z", campaignStatus: "closed" },
      "released_at_close",
      "Released with thanks when the campaign closed",
      ["Sent", "Stewards reviewing", "Accepted"],
    ],
    [{ status: "released" }, "released", "Released by the stewards", ["Sent", "Stewards reviewing", "Accepted"]],
    [{ status: "expired" }, "expired", "The place closed", ["Sent", "Stewards reviewing", "Accepted"]],
    [
      { status: "fulfilled", offerMode: "lend", returnedAt: "2026-12-01T00:00:00Z" },
      "returned",
      "Returned to you",
      ["Sent", "Stewards reviewing", "Accepted", "Lent", "Delivered"],
    ],
    [
      { status: "thanked", offerMode: "lend", returnedAt: new Date("2026-12-01T00:00:00Z") },
      "returned",
      "Returned to you",
      ["Sent", "Stewards reviewing", "Accepted", "Lent", "Delivered", "Thanked"],
    ],
    [
      { status: "accepted", offerMode: "lend", returnedAt: "2026-12-01T00:00:00Z" },
      "returned",
      "Returned to you",
      ["Sent", "Stewards reviewing", "Accepted", "Lent"],
    ],
  ];

  it("names each ending, shows only the steps it reached, and uses its words as the line", () => {
    for (const [over, key, text, reached] of cases) {
      const r = offerSteps(input(over), today);
      const label = JSON.stringify(over);
      expect(r.ending, label).toEqual({ key, text });
      expect(r.stepLine, label).toBe(text);
      expect(r.steps.map((s) => s.label), label).toEqual(reached);
      expect(r.steps.every((s) => s.state === "done"), label).toBe(true);
    }
  });

  it("never says pledge, claim, funded or earned", () => {
    const texts: string[] = [];
    for (const status of ["pending", "accepted", "fulfilled", "thanked", "rejected", "withdrawn", "cancelled", "released", "expired"]) {
      for (const campaignStatus of ["active", "cancelled", "closed", "completed"]) {
        const r = offerSteps(input({ status, campaignStatus, acceptedHours: 4, offerMode: "lend" }), today);
        texts.push(r.stepLine, ...r.steps.map((s) => s.label), r.ending?.text ?? "");
      }
    }
    for (const t of texts) expect(t).not.toMatch(/pledg|claim|funded|earn|undefined|null|NaN/i);
  });
});

describe("resolveArrivalNote", () => {
  const campaignNote = {
    whereToGo: "The barn at the end of the lane",
    whatToBring: "Gloves and a hat",
    askFor: "Maria",
    meals: "Lunch is on us",
    beds: null,
    gettingThere: "Park by the gate",
  };

  it("fills each field from the need's note, else the campaign's", () => {
    const r = resolveArrivalNote(campaignNote, { whereToGo: "The lower field", beds: "2 beds, ask first", askFor: "  " });
    expect(r).toEqual({
      whereToGo: "The lower field",
      whatToBring: "Gloves and a hat",
      askFor: "Maria",
      meals: "Lunch is on us",
      beds: "2 beds, ask first",
      gettingThere: "Park by the gate",
    });
  });

  it("reads the campaign note alone for a freeform offer, and the need's alone when there is no campaign note", () => {
    expect(resolveArrivalNote(campaignNote, null)!.whereToGo).toBe("The barn at the end of the lane");
    expect(resolveArrivalNote(null, { meals: "Bring a dish" })).toEqual({
      whereToGo: null,
      whatToBring: null,
      askFor: null,
      meals: "Bring a dish",
      beds: null,
      gettingThere: null,
    });
  });

  it("is null when nothing is set on either", () => {
    expect(resolveArrivalNote(null, null)).toBeNull();
    expect(resolveArrivalNote({ whereToGo: "  ", meals: "" }, { beds: null })).toBeNull();
  });

  it("gives labelled lines for the set fields, in order", () => {
    const lines = arrivalNoteLines(resolveArrivalNote(campaignNote, null));
    expect(lines.map((l) => l.field)).toEqual(["whereToGo", "whatToBring", "askFor", "meals", "gettingThere"]);
    expect(lines.map((l) => l.label)).toEqual(["Where to go", "What to bring", "Ask for", "Meals", "Getting there"]);
    expect(arrivalNoteLines(null)).toEqual([]);
    expect(ARRIVAL_FIELDS).toHaveLength(6);
  });
});
