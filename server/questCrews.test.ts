/**
 * Multiplayer Mode Phase A: crew assembly planning rules (pure, no DB).
 * Covers the ship-gate test list: crews form at min size, fill to max, overflow
 * starts the next crew, refills come first, and formation emails are idempotent
 * (one per member per crew, keyed on formationEmailSentAt).
 */

import { describe, expect, it } from "vitest";
import {
  crewCompletionPost,
  crewStatusForCount,
  crewWelcomePost,
  formationEmail,
  isCrewComplete,
  listNames,
  membersDueFormationEmail,
  planCrewAssembly,
} from "./lib/questCrews";
import { MULTIPLAYER_QUESTS, liveMultiplayerQuests } from "@shared/multiplayerQuests";

const quest = { crewSizeMin: 3, crewSizeMax: 5 };
const signup = (id: number, userId = id * 10) => ({ id, userId });

describe("planCrewAssembly", () => {
  it("forms no crew below crewSizeMin", () => {
    const plan = planCrewAssembly(quest, [signup(1), signup(2)], []);
    expect(plan.newCrews).toHaveLength(0);
    expect(plan.refills).toHaveLength(0);
    expect(plan.leftoverSignupIds).toEqual([1, 2]);
  });

  it("forms a crew exactly at crewSizeMin", () => {
    const plan = planCrewAssembly(quest, [signup(1), signup(2), signup(3)], []);
    expect(plan.newCrews).toHaveLength(1);
    expect(plan.newCrews[0].signups.map((s) => s.id)).toEqual([1, 2, 3]);
    expect(plan.leftoverSignupIds).toEqual([]);
  });

  it("fills a crew to crewSizeMax and leaves the sub-min remainder open", () => {
    const signups = [1, 2, 3, 4, 5, 6, 7].map((n) => signup(n));
    const plan = planCrewAssembly(quest, signups, []);
    expect(plan.newCrews).toHaveLength(1);
    expect(plan.newCrews[0].signups).toHaveLength(5);
    expect(plan.leftoverSignupIds).toEqual([6, 7]);
  });

  it("starts the next crew when signups pass crewSizeMax", () => {
    const signups = Array.from({ length: 10 }, (_, i) => signup(i + 1));
    const plan = planCrewAssembly(quest, signups, []);
    expect(plan.newCrews).toHaveLength(2);
    expect(plan.newCrews[0].signups).toHaveLength(5);
    expect(plan.newCrews[1].signups).toHaveLength(5);
  });

  it("refills forming crews before creating new ones, oldest crew first", () => {
    const signups = [1, 2, 3, 4].map((n) => signup(n));
    const openCrews = [
      { crewId: 7, activeMemberCount: 4, memberUserIds: [900] },
      { crewId: 9, activeMemberCount: 3, memberUserIds: [901] },
    ];
    const plan = planCrewAssembly(quest, signups, openCrews);
    expect(plan.refills).toEqual([
      { crewId: 7, signups: [signup(1)] },
      { crewId: 9, signups: [signup(2), signup(3)] },
    ]);
    expect(plan.newCrews).toHaveLength(0);
    expect(plan.leftoverSignupIds).toEqual([4]);
  });

  it("never seats a player twice: crewed users and duplicate signups are skipped", () => {
    const signups = [signup(1, 100), signup(2, 100), signup(3, 200), signup(4, 300), signup(5, 400)];
    const openCrews = [{ crewId: 1, activeMemberCount: 5, memberUserIds: [400] }];
    const plan = planCrewAssembly(quest, signups, openCrews);
    // userId 100 counted once, 400 already crewed: 3 unique eligible players.
    expect(plan.newCrews).toHaveLength(1);
    expect(plan.newCrews[0].signups.map((s) => s.userId)).toEqual([100, 200, 300]);
  });
});

describe("crewStatusForCount", () => {
  it("is ready at crewSizeMax and forming below", () => {
    expect(crewStatusForCount(5, 5)).toBe("ready");
    expect(crewStatusForCount(4, 5)).toBe("forming");
  });
});

describe("membersDueFormationEmail (idempotency)", () => {
  const member = (memberId: number, status: "joined" | "left" | "completed", sent: Date | null) => ({
    memberId,
    status,
    formationEmailSentAt: sent,
  });

  it("emails each joined member exactly once", () => {
    const members = [
      member(1, "joined", null),
      member(2, "joined", new Date()),
      member(3, "left", null),
      member(4, "completed", null),
    ];
    const due = membersDueFormationEmail(members);
    expect(due.map((m) => m.memberId)).toEqual([1]);
    // A re-run after stamping finds nothing due: one email per member per crew.
    const afterStamp = members.map((m) =>
      m.memberId === 1 ? { ...m, formationEmailSentAt: new Date() } : m,
    );
    expect(membersDueFormationEmail(afterStamp)).toHaveLength(0);
  });
});

describe("isCrewComplete", () => {
  it("requires every staying member to have completed", () => {
    expect(
      isCrewComplete([
        { userId: 1, status: "completed" },
        { userId: 2, status: "joined" },
      ]),
    ).toBe(false);
    expect(
      isCrewComplete([
        { userId: 1, status: "completed" },
        { userId: 2, status: "completed" },
      ]),
    ).toBe(true);
  });

  it("ignores members who left and rejects empty crews", () => {
    expect(
      isCrewComplete([
        { userId: 1, status: "completed" },
        { userId: 2, status: "left" },
      ]),
    ).toBe(true);
    expect(isCrewComplete([{ userId: 2, status: "left" }])).toBe(false);
    expect(isCrewComplete([])).toBe(false);
  });
});

describe("player-facing copy (writing rules, STEERING.md section 1)", () => {
  const sampleQuest = MULTIPLAYER_QUESTS[0];

  it("welcome post names the quest, members, steps, and done", () => {
    const post = crewWelcomePost({
      quest: sampleQuest,
      bioregionName: "Cascadia",
      memberNames: ["Ana", "Ben", "Cleo"],
    });
    expect(post.title).toContain(sampleQuest.title);
    expect(post.content).toContain("Ana");
    expect(post.content).toContain(sampleQuest.steps[0].title);
    expect(post.content).toContain(sampleQuest.definitionOfDone);
  });

  it("formation email links the crew thread and lists crewmates", () => {
    const mail = formationEmail({
      recipientName: "Ana",
      questTitle: sampleQuest.title,
      bioregionName: "Cascadia",
      memberNames: ["Ana", "Ben", "Cleo"],
      threadUrl: "https://regencivics.earth/community/post/42",
      questUrl: "https://regencivics.earth/multiplayer",
    });
    expect(mail.subject).toContain("Cascadia");
    expect(mail.html).toContain("/community/post/42");
    expect(mail.html).toContain("Ben and Cleo");
    expect(mail.html).not.toContain("Hi Ana, Hi");
  });

  it("no em-dashes anywhere a player reads", () => {
    const everything = [
      JSON.stringify(MULTIPLAYER_QUESTS),
      crewWelcomePost({ quest: sampleQuest, bioregionName: "Cascadia", memberNames: ["Ana"] }).content,
      crewCompletionPost({ questTitle: sampleQuest.title, bioregionName: "Cascadia" }),
      formationEmail({
        recipientName: "Ana",
        questTitle: sampleQuest.title,
        bioregionName: "Cascadia",
        memberNames: ["Ana"],
        threadUrl: "https://x",
        questUrl: "https://y",
      }).html,
    ].join("\n");
    expect(everything).not.toContain("—");
  });

  it("listNames reads naturally at every size", () => {
    expect(listNames(["Ana"])).toBe("Ana");
    expect(listNames(["Ana", "Ben"])).toBe("Ana and Ben");
    expect(listNames(["Ana", "Ben", "Cleo"])).toBe("Ana, Ben, and Cleo");
  });
});

describe("multiplayer quest definitions", () => {
  it("every quest structurally requires 3 to 7 players with distinct parts", () => {
    for (const q of MULTIPLAYER_QUESTS) {
      expect(q.crewSizeMin).toBeGreaterThanOrEqual(3);
      expect(q.crewSizeMax).toBeLessThanOrEqual(7);
      expect(q.crewSizeMin).toBeLessThanOrEqual(q.crewSizeMax);
      expect(q.crewRoles.length).toBeGreaterThanOrEqual(3);
      expect(q.steps.length).toBeGreaterThanOrEqual(4);
      expect(q.sdt.autonomy).toBeGreaterThanOrEqual(1);
      expect(q.sdt.relatedness).toBeGreaterThanOrEqual(1);
    }
  });

  it("questIds are unique and namespaced away from the file-based quests", () => {
    const ids = MULTIPLAYER_QUESTS.map((q) => q.questId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^crew-quest-\d+$/);
  });

  it("the five ratified launch quests are live", () => {
    // Rye ratified the launch five on 2026-07-16. Drafts added later still
    // hide until ratified; this guards the launch set stays intact.
    expect(liveMultiplayerQuests()).toHaveLength(5);
  });
});
