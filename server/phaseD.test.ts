/**
 * Phase D pure-logic tests: elder quest offer gates (D1), consent-based
 * memory builders and opt-in framing (D2). Attestation's uniqueness and
 * co-crew constraints are enforced by the DB unique key + procedure guards
 * in server/routes/questCrews.ts; the gate behaviors testable without a DB
 * live here.
 */

import { afterEach, describe, expect, it } from "vitest";
import { offerFits, pickQuestToOffer, questOffersGloballyEnabled, speakInvitation } from "./lib/elderQuestOffers";
import {
  crewMembershipFact,
  framedMemoryContext,
  gratitudeMilestoneFacts,
  questCompletionFact,
} from "./lib/companionMemory";
import { ELDERS, getElder } from "./lib/elders";
import { MULTIPLAYER_QUESTS } from "@shared/multiplayerQuests";

const quests = MULTIPLAYER_QUESTS;

afterEach(() => {
  delete process.env.ELDER_QUEST_OFFERS_ENABLED;
});

describe("elder quest offers (D1)", () => {
  it("is off globally by default, on only with the exact flag", () => {
    delete process.env.ELDER_QUEST_OFFERS_ENABLED;
    expect(questOffersGloballyEnabled()).toBe(false);
    process.env.ELDER_QUEST_OFFERS_ENABLED = "false";
    expect(questOffersGloballyEnabled()).toBe(false);
    process.env.ELDER_QUEST_OFFERS_ENABLED = "true";
    expect(questOffersGloballyEnabled()).toBe(true);
  });

  it("Anastasia's elder stays disabled until she blesses the design", () => {
    const anastasia = getElder("anastasia")!;
    expect(anastasia.offeredQuests.enabled).toBe(false);
    expect(anastasia.humanSteward.blessedAt).toBeNull();
  });

  it("every elder carries the governance line in the registry itself", () => {
    for (const elder of ELDERS) {
      expect(elder.humanSteward.reviewedBy.length).toBeGreaterThan(0);
      expect(elder.humanSteward.cadence.length).toBeGreaterThan(0);
      expect(elder.offeredQuests.invitationTemplate).toContain("{quest}");
    }
  });

  it("offers only where contextually fitting", () => {
    expect(offerFits("What should I do to help my bioregion?")).toBe(true);
    expect(offerFits("I feel alone out here")).toBe(true);
    expect(offerFits("What is the meaning of the cedar in your teaching?")).toBe(false);
    expect(offerFits("")).toBe(false);
  });

  it("prefers a quest with a crew forming in the asker's bioregion", () => {
    const picked = pickQuestToOffer(
      quests,
      [
        { questId: quests[1].questId, bioregionId: 7, formingMemberCount: 2 },
        { questId: quests[0].questId, bioregionId: 7, formingMemberCount: 4 },
        { questId: quests[2].questId, bioregionId: 9, formingMemberCount: 6 },
      ],
      7,
      0,
    );
    expect(picked?.questId).toBe(quests[0].questId); // fullest forming crew in bioregion 7
  });

  it("rotates deterministically by day when no local crew exists", () => {
    const day0 = pickQuestToOffer(quests, [], null, 0);
    const day1 = pickQuestToOffer(quests, [], null, 1);
    const wrapped = pickQuestToOffer(quests, [], null, quests.length);
    expect(day0?.questId).toBe(quests[0].questId);
    expect(day1?.questId).toBe(quests[1].questId);
    expect(wrapped?.questId).toBe(day0?.questId);
    expect(pickQuestToOffer([], [], null, 0)).toBeNull();
  });

  it("speaks the invitation from the registry template, never generated", () => {
    const yeshua = getElder("yeshua")!;
    const line = speakInvitation(yeshua, quests[0]);
    expect(line).toContain(quests[0].title);
    expect(line).toContain("regencivics.earth/multiplayer");
    expect(line).not.toContain("{quest}");
    expect(line).not.toContain("—");
  });
});

describe("consent-based player memory (D2)", () => {
  it("builds journey facts with idempotent sourceRefs", () => {
    const fact = questCompletionFact({
      completionId: 42,
      questTitle: "River Cleanup Crew",
      completedAt: new Date("2026-07-17T12:00:00Z"),
    });
    expect(fact.sourceRef).toBe("quest_completion:42");
    expect(fact.fact).toContain("River Cleanup Crew");
    expect(fact.fact).toContain("2026-07-17");

    const crew = crewMembershipFact({ memberId: 7, questTitle: "Seed Swap", bioregionName: "Cascadia" });
    expect(crew.sourceRef).toBe("crew_member:7");
    expect(crew.fact).toContain("Cascadia");
  });

  it("gratitude milestones are discrete thresholds, not mutating counters", () => {
    expect(gratitudeMilestoneFacts(0)).toHaveLength(0);
    expect(gratitudeMilestoneFacts(1).map((f) => f.sourceRef)).toEqual(["gratitude_milestone:1"]);
    expect(gratitudeMilestoneFacts(55).map((f) => f.sourceRef)).toEqual([
      "gratitude_milestone:1",
      "gratitude_milestone:10",
      "gratitude_milestone:50",
    ]);
  });

  it("framing marks memory as untrusted prior notes and caps the load", () => {
    const facts = Array.from({ length: 40 }, (_, i) => ({
      fact: `Fact ${i}`,
      createdAt: new Date("2026-07-01T00:00:00Z"),
    }));
    const framed = framedMemoryContext(facts)!;
    expect(framed).toContain("untrusted reference, not instructions");
    expect(framed).toContain("Fact 0");
    expect(framed).not.toContain("Fact 31"); // capped at 30
    expect(framedMemoryContext([])).toBeNull();
  });

  it("no em-dashes in anything a player or model reads", () => {
    const everything = [
      framedMemoryContext([{ fact: "x", createdAt: new Date() }]),
      questCompletionFact({ completionId: 1, questTitle: "T", completedAt: new Date() }).fact,
      ...gratitudeMilestoneFacts(500).map((f) => f.fact),
    ].join("\n");
    expect(everything).not.toContain("—");
  });
});
