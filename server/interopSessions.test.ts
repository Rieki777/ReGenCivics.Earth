/**
 * The Circle vote, adversarially.
 *
 * Every mutation on this router is public and unauthenticated, so the slot
 * list, the voterKey, the display name shown to the whole group and the email
 * handed to join are all attacker controlled. These tests come at the pure
 * layer from that side. The scheduling rules are covered in
 * shared/interopCircle.test.ts, and the events sync in server/interopCircle.test.ts.
 */

import { describe, expect, it } from "vitest";
import { INTEROP_SLOT_KEYS } from "@shared/interopCircle";
import { cleanDisplayName, countsFromCombos } from "./routes/interopSessions";

describe("display name cleaning", () => {
  it("keeps an ordinary name intact", () => {
    expect(cleanDisplayName("Rye")).toBe("Rye");
    expect(cleanDisplayName("  Ana María  ")).toBe("Ana María");
    expect(cleanDisplayName("大地")).toBe("大地");
  });

  it("treats blank, missing and non-strings as no name", () => {
    expect(cleanDisplayName(undefined)).toBeNull();
    expect(cleanDisplayName(null)).toBeNull();
    expect(cleanDisplayName("")).toBeNull();
    expect(cleanDisplayName("     ")).toBeNull();
    expect(cleanDisplayName("\t\n ")).toBeNull();
    expect(cleanDisplayName(42 as unknown as string)).toBeNull();
  });

  it("strips control characters so a name cannot break its own line", () => {
    expect(cleanDisplayName("Rye\nCordon")).toBe("RyeCordon");
    expect(cleanDisplayName("Rye\r\nadmin")).toBe("Ryeadmin");
    expect(cleanDisplayName("Rye\u0000")).toBe("Rye");
    expect(cleanDisplayName("Rye\u001B[31m")).toBe("Rye[31m");
  });

  it("strips zero-width and bidi overrides used to disguise a name", () => {
    // RLO renders what follows it backwards, so a stored name can display as
    // something other than what it says.
    expect(cleanDisplayName("Rye\u202Ereversed")).toBe("Ryereversed");
    expect(cleanDisplayName("R\u200Bye")).toBe("Rye");
    expect(cleanDisplayName("\uFEFFRye")).toBe("Rye");
    expect(cleanDisplayName("\u2066Rye\u2069")).toBe("Rye");
  });

  it("bounds the name to the column width, after stripping", () => {
    expect(cleanDisplayName("a".repeat(500))).toHaveLength(80);
    // A name made only of stripped characters is nothing, not a blank row.
    expect(cleanDisplayName("\u200B".repeat(500))).toBeNull();
  });

  it("leaves markup as literal text for React to escape", () => {
    // Not stripped on purpose: the renderer escapes it, and mangling every
    // name containing punctuation would be worse than showing it.
    expect(cleanDisplayName("<b>Rye</b>")).toBe("<b>Rye</b>");
    expect(cleanDisplayName("'; DROP TABLE interopTimeVotes; --")).toBe("'; DROP TABLE interopTimeVotes; --");
  });
});

describe("countsFromCombos", () => {
  it("is all zeroes with nothing stored", () => {
    const { perSlot, total } = countsFromCombos([]);
    expect(total).toBe(0);
    for (const key of INTEROP_SLOT_KEYS) expect(perSlot[key]).toBe(0);
  });

  it("counts a single-slot combination", () => {
    const { perSlot, total } = countsFromCombos([{ slot: "tue", count: 3 }]);
    expect(perSlot.tue).toBe(3);
    expect(perSlot.wed).toBe(0);
    expect(total).toBe(3);
  });

  it("gives one voter a hand in every slot they picked, but counts them once", () => {
    const { perSlot, total } = countsFromCombos([{ slot: "tue,wed,thu", count: 1 }]);
    expect(perSlot.tue).toBe(1);
    expect(perSlot.wed).toBe(1);
    expect(perSlot.thu).toBe(1);
    // The headline number is people, not hands.
    expect(total).toBe(1);
  });

  it("adds combinations that overlap", () => {
    const { perSlot, total } = countsFromCombos([
      { slot: "tue", count: 2 },
      { slot: "tue,thu", count: 3 },
      { slot: "thu", count: 4 },
    ]);
    expect(perSlot.tue).toBe(5);
    expect(perSlot.thu).toBe(7);
    expect(perSlot.wed).toBe(0);
    expect(total).toBe(9);
  });

  it("stays exact at a size that would have overflowed the old row read", () => {
    // The previous implementation read rows and counted them, capped at 2000,
    // so the tally silently stopped growing. An aggregate has no such ceiling.
    const { perSlot, total } = countsFromCombos([{ slot: "wed", count: 50_000 }]);
    expect(perSlot.wed).toBe(50_000);
    expect(total).toBe(50_000);
  });

  it("coerces a driver that returns COUNT(*) as a string", () => {
    // MySQL BIGINT can arrive as a string; that would concatenate rather than add.
    const { perSlot, total } = countsFromCombos([{ slot: "tue", count: "7" as unknown as number }]);
    expect(perSlot.tue).toBe(7);
    expect(total).toBe(7);
  });

  it("ignores counts that are not real positive numbers", () => {
    const { total } = countsFromCombos([
      { slot: "tue", count: NaN },
      { slot: "wed", count: -4 },
      { slot: "thu", count: "banana" as unknown as number },
    ]);
    expect(total).toBe(0);
  });

  it("drops rows for slots that are not on offer", () => {
    // Saturday is a valid weekday now, so this is about the OFFER, not the
    // vocabulary: a day that is off the offer must not inflate a total the
    // page cannot show columns for.
    const { perSlot, total } = countsFromCombos(
      [
        { slot: "tue", count: 2 },
        { slot: "sat", count: 99 },
        { slot: "nonsense", count: 7 },
        { slot: "", count: 5 },
      ],
      ["tue", "wed", "thu"],
    );
    expect(perSlot.tue).toBe(2);
    expect(total).toBe(2);
    expect(perSlot.sat).toBeUndefined();
  });

  it("counts a retired day again once it is put back on the offer", () => {
    const combos = [{ slot: "tue,sat", count: 4 }];
    expect(countsFromCombos(combos, ["tue", "wed", "thu"]).perSlot.sat).toBeUndefined();
    const back = countsFromCombos(combos, ["tue", "wed", "thu", "sat"]);
    expect(back.perSlot.sat).toBe(4);
    // Still one voter, not two: the row is one person who can make both.
    expect(back.total).toBe(4);
  });

  it("counts a combination of an offered and an unoffered slot once, under the offered one", () => {
    const { perSlot, total } = countsFromCombos([{ slot: "tue,sat", count: 6 }], ["tue", "wed", "thu"]);
    expect(perSlot.tue).toBe(6);
    expect(total).toBe(6);
  });
});
