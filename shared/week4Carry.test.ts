/**
 * Which earlier card a Week 4 card carries (shared/boardCarry.ts matchCard),
 * in the cases the 2026-10-15 review of the Week 4 board found: two Week 3
 * cards with one name, a card tied to another application, and a person's
 * link on a card renamed since.
 */
import { describe, expect, it } from "vitest";
import { CARRY_COPY, matchCard, type EarlierCard } from "./boardCarry";
import { fillCopy } from "./sessionBoard";

describe("which Week 3 card a Week 4 card carries", () => {
  it("lists every same-name card for the facilitator, in card order, so the second can be picked", () => {
    const earlier: EarlierCard[] = [
      { id: 35, week: 3, name: "Amora", applicationId: null },
      { id: 33, week: 3, name: "amora", applicationId: null },
      { id: 40, week: 3, name: "Amora", applicationId: null, hidden: true },
    ];
    const m = matchCard({ id: 9, name: "Amora", applicationId: null }, [...earlier].sort((a, b) => a.id - b.id), undefined);
    expect(m).toEqual({
      match: "suggested",
      from: [],
      suggested: [{ week: 3, cardId: 33, name: "amora" }, { week: 3, cardId: 35, name: "Amora" }],
    });
  });

  it("never suggests or carries a card tied to a different application", () => {
    const earlier: EarlierCard[] = [
      { id: 301, week: 3, name: "Casa Verde", applicationId: 7 },
      { id: 302, week: 3, name: "Casa Verde Farm", applicationId: 11 },
    ];
    const casa = { id: 9, name: "Casa Verde", applicationId: 11 };
    // Same name, other application: no suggestion. Its own application still matches.
    expect(matchCard(casa, [earlier[0]], undefined)).toEqual({ match: "none", from: [], suggested: [] });
    // A facilitator's link recorded before the application was set carries nothing, alone...
    expect(matchCard(casa, [earlier[0]], { from: 301, by: "facilitator" })).toEqual({ match: "none", from: [], suggested: [] });
    // ...or beside the application match.
    const both = matchCard(casa, earlier, { from: 301, by: "facilitator" });
    expect(both.match).toBe("application");
    expect(both.from.map((f) => f.cardId)).toEqual([302]);
    // A card with no application of its own still carries a linked card that has one.
    expect(matchCard({ id: 9, name: "Casa", applicationId: null }, earlier, { from: 301, by: "facilitator" }))
      .toMatchObject({ match: "confirmed", from: [{ cardId: 301 }] });
  });

  it("a person's link holds while the names match; renamed, the card waits for the facilitator's yes", () => {
    const earlier: EarlierCard[] = [
      { id: 33, week: 3, name: "Templeofroots.com", applicationId: null },
      { id: 34, week: 3, name: "Amora", applicationId: 57 },
      { id: 38, week: 3, name: "Amora stray", applicationId: null },
    ];
    expect(matchCard({ id: 2, name: "Templeofroots.com", applicationId: null }, earlier, { from: 33, by: "person" }))
      .toMatchObject({ match: "yours", from: [{ cardId: 33 }] });
    expect(matchCard({ id: 2, name: "Amora Village", applicationId: null }, earlier, { from: 33, by: "person" }))
      .toEqual({ match: "suggested", from: [], suggested: [{ week: 3, cardId: 33, name: "Templeofroots.com" }] });
    // A tile's link and a facilitator's yes survive a rename.
    expect(matchCard({ id: 2, name: "Temple", applicationId: null }, earlier, { from: 33, by: "tile" }).match).toBe("carried");
    expect(matchCard({ id: 2, name: "Temple", applicationId: null }, earlier, { from: 33, by: "facilitator" }).match).toBe("confirmed");
    // Beside an application match, a renamed card's person link stays behind.
    const app = matchCard({ id: 1, name: "Amora", applicationId: 57 }, earlier, { from: 38, by: "person" });
    expect(app.from.map((f) => f.cardId)).toEqual([34]);
    expect(matchCard({ id: 1, name: "Amora stray", applicationId: 57 }, earlier, { from: 38, by: "person" }).from.map((f) => f.cardId)).toEqual([34, 38]);
  });

  it("the facilitator's words for two cards with one name, and for a card another card carries", () => {
    expect(fillCopy(CARRY_COPY.confirmPickAsk, { week: 3, name: "Amora" })).toBe("Which Week 3 card is the same project as Amora?");
    expect(fillCopy(CARRY_COPY.confirmPickYes, { week: 3, name: "Amora", answers: 14 })).toBe("This one: Amora, Week 3, 14 answers");
    expect(fillCopy(CARRY_COPY.confirmPickYesOne, { week: 3, name: "Amora" })).toBe("This one: Amora, Week 3, 1 answer");
    expect(fillCopy(CARRY_COPY.carriedBy, { other: "Amora Village", name: "Amora", week: 3 }))
      .toBe("Amora Village already carries Amora from Week 3. Merge this card into it.");
    for (const line of [CARRY_COPY.confirmPickAsk, CARRY_COPY.confirmPickYes, CARRY_COPY.confirmPickYesOne, CARRY_COPY.confirmNone, CARRY_COPY.carriedBy]) {
      expect(line).not.toContain(String.fromCodePoint(0x2013));
      expect(line).not.toContain(String.fromCodePoint(0x2014));
      expect(fillCopy(line, { week: 3, name: "X", answers: 2, other: "Y" })).not.toMatch(/\{\w+\}/);
    }
  });
});
