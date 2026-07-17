/**
 * Needs and Offers matcher, Phase B2 (pure, no DB). Covers the ship-gate test
 * list: one introduction email per (need, offer) pair ever, the per-party
 * daily cap, tag + bioregion rules, and no self-introductions.
 */

import { describe, expect, it } from "vitest";
import {
  bioregionCompatible,
  introEmail,
  normalizeTags,
  planMatches,
  sharedTags,
  type MatchableRow,
} from "./lib/needsOffers";

const need = (id: number, tags: string[], bioregionId: number | null, email: string): MatchableRow => ({
  id,
  tags,
  bioregionId,
  partyEmail: email,
});
const offer = need;

describe("normalizeTags", () => {
  it("lowercases, kebab-cases, bounds, and dedupes", () => {
    expect(normalizeTags(["Grant Writing", "grant-writing", "  WELDING  ", "x", 42 as any])).toEqual([
      "grant-writing",
      "welding",
    ]);
    expect(normalizeTags("not-an-array")).toEqual([]);
  });
});

describe("matching rules", () => {
  it("requires at least one shared tag", () => {
    expect(sharedTags(["welding"], ["fencing"])).toEqual([]);
    expect(sharedTags(["welding", "water"], ["water"])).toEqual(["water"]);
  });

  it("treats a null bioregion as anywhere", () => {
    expect(bioregionCompatible(null, 5)).toBe(true);
    expect(bioregionCompatible(5, null)).toBe(true);
    expect(bioregionCompatible(5, 5)).toBe(true);
    expect(bioregionCompatible(5, 6)).toBe(false);
  });
});

describe("planMatches", () => {
  it("matches on shared tags in a shared bioregion", () => {
    const plan = planMatches(
      [need(1, ["welding"], 5, "a@x.test")],
      [offer(10, ["welding", "carpentry"], 5, "b@x.test")],
      new Set(),
      new Map(),
    );
    expect(plan).toEqual([{ needId: 1, offerId: 10, tags: ["welding"] }]);
  });

  it("never plans a pair already in the ledger (one email per pair ever)", () => {
    const plan = planMatches(
      [need(1, ["welding"], null, "a@x.test")],
      [offer(10, ["welding"], null, "b@x.test")],
      new Set(["1:10"]),
      new Map(),
    );
    expect(plan).toEqual([]);
  });

  it("enforces the per-party daily cap, counting both sides", () => {
    const needs = [1, 2, 3, 4].map((i) => need(i, ["welding"], null, `n${i}@x.test`));
    const busyOffer = offer(10, ["welding"], null, "busy@x.test");
    const plan = planMatches(needs, [busyOffer], new Set(), new Map(), 3);
    expect(plan).toHaveLength(3); // the offer's party hits the cap
  });

  it("seeds the cap from introductions already sent today", () => {
    const plan = planMatches(
      [need(1, ["welding"], null, "a@x.test")],
      [offer(10, ["welding"], null, "b@x.test")],
      new Set(),
      new Map([["b@x.test", 3]]),
      3,
    );
    expect(plan).toEqual([]);
  });

  it("never introduces a party to themselves and skips unreachable or untagged rows", () => {
    const plan = planMatches(
      [
        need(1, ["welding"], null, "same@x.test"),
        need(2, [], null, "tagless@x.test"),
        need(3, ["welding"], null, null as any),
      ],
      [offer(10, ["welding"], null, "same@x.test")],
      new Set(),
      new Map(),
    );
    expect(plan).toEqual([]);
  });
});

describe("introduction email", () => {
  const mail = introEmail({
    recipientName: "Ana",
    otherName: "Ben",
    otherEmail: "ben@x.test",
    needTitle: "A welder for two days",
    offerTitle: "Welding, weekends",
    tags: ["welding"],
    bioregionName: "Cascadia",
    needTimeWindow: "September",
    offerTimeWindow: "Weekends",
    boardUrl: "https://regencivics.earth/board",
  });

  it("names the other party, their email, and both posts", () => {
    expect(mail.html).toContain("ben@x.test");
    expect(mail.html).toContain("A welder for two days");
    expect(mail.html).toContain("Welding, weekends");
    expect(mail.subject).toContain("A welder for two days");
  });

  it("is clearly automated and carries no em-dashes", () => {
    expect(mail.html.toLowerCase()).toContain("automated");
    expect(mail.html + mail.subject).not.toContain("—");
  });

  it("escapes HTML in user-supplied fields", () => {
    const hostile = introEmail({
      recipientName: `<script>x</script>`,
      otherName: "Ben",
      otherEmail: "ben@x.test",
      needTitle: `<img src=x onerror=1>`,
      offerTitle: "ok",
      tags: ["a"],
      bioregionName: null,
      needTimeWindow: null,
      offerTimeWindow: null,
      boardUrl: "https://regencivics.earth/board",
    });
    expect(hostile.html).not.toContain("<script>");
    expect(hostile.html).not.toContain("<img src=x");
  });
});
