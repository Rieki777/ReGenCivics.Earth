import { describe, expect, it } from "vitest";
import { boardKeyTagFor } from "@shared/boardIdentityLink";
import { defaultBoardState } from "@shared/sessionBoard";
import { collatePeople, type CollateInput } from "./sessionBoardPeople";

const KEY = "guestkey00000001";
const OTHER = "browserkey1234567";

function base(over: Partial<CollateInput> = {}): CollateInput {
  const state = defaultBoardState(2);
  state.sessionStartedAt = 1_700_000_000_000;
  state.endedAt = 1_700_003_600_000;
  return {
    week: 2,
    now: 1_700_004_000_000,
    plannedMs: 3_600_000,
    state,
    items: [],
    projects: [],
    votes: [],
    inquiries: [],
    tags: [],
    users: [],
    schedule: [],
    applications: [],
    elsewhere: [],
    ...over,
  };
}

describe("collatePeople", () => {
  it("merges a guest into the email once the tag is added", async () => {
    const identity = `k:${KEY}`;
    const tag = await boardKeyTagFor(identity);
    const before = await collatePeople(base({
      items: [{ id: 1, kind: "arrive", text: "Grateful", projectId: null, authorKey: identity, displayName: "Pat", createdAt: 1_699_000_000_000 }],
      inquiries: [{ id: 9, email: "pat@example.com", fullName: "Pat Lee", roleInterest: "follow-up", additionalNotes: null, userId: null, createdAt: 1_700_001_000_000, referralSource: "season2-week-board:week-2" }],
    }));
    expect(before.people).toHaveLength(2);

    const after = await collatePeople(base({
      items: [{ id: 1, kind: "arrive", text: "Grateful", projectId: null, authorKey: identity, displayName: "Pat", createdAt: 1_699_000_000_000 }],
      inquiries: [{ id: 9, email: "pat@example.com", fullName: "Pat Lee", roleInterest: "follow-up", additionalNotes: null, userId: null, createdAt: 1_700_001_000_000, referralSource: "season2-week-board:week-2" }],
      tags: [{ contactType: "inquiry", contactId: 9, tag }],
    }));
    expect(after.people).toHaveLength(1);
    expect(after.people[0].email).toBe("pat@example.com");
    expect(after.people[0].name).toBe("Pat Lee");
    expect(after.people[0].arrivalWords).toEqual(["Grateful"]);
    expect(after.people[0].inputs.find((row) => row.text === "Grateful")?.timing).toBe("before");
    expect(JSON.stringify(after)).not.toContain(KEY);
  });

  it("merges an account and a browser key through the user tag", async () => {
    const guest = `k:${OTHER}`;
    const tag = await boardKeyTagFor(guest);
    const result = await collatePeople(base({
      items: [
        { id: 1, kind: "arrive", text: "Here", projectId: null, authorKey: "u:7", displayName: null, createdAt: 1_700_001_000_000 },
        { id: 2, kind: "leave", text: "Thanks", projectId: null, authorKey: guest, displayName: "Sam", createdAt: 1_700_002_000_000 },
      ],
      tags: [{ contactType: "user", contactId: 7, tag }],
      users: [{ id: 7, name: "Sam Okonkwo", email: "sam@example.com" }],
    }));
    expect(result.people).toHaveLength(1);
    expect(result.people[0].email).toBe("sam@example.com");
    expect(result.people[0].userId).toBe(7);
    expect(result.people[0].signedIn).toBe(true);
    expect(result.people[0].arrivalWords).toEqual(["Here"]);
    expect(result.people[0].closingWords).toEqual(["Thanks"]);
    expect(result.people[0].badges).toContain("Signed in");
  });

  it("joins a schedule sign-up by the same browser key", async () => {
    const result = await collatePeople(base({
      items: [{ id: 1, kind: "arrive", text: "Ready", projectId: null, authorKey: `k:${KEY}`, displayName: null, createdAt: 1_700_001_000_000 }],
      schedule: [{ voterKey: KEY, displayName: "Ada", projectName: "Hill Farm", projectUrl: "https://hill.example" }],
    }));
    expect(result.people).toHaveLength(1);
    expect(result.people[0].schedule).toEqual({ project: "Hill Farm", url: "https://hill.example" });
    expect(result.people[0].badges).toContain("Schedule");
    expect(result.people[0].name).toBe("Ada");
    expect(result.people[0].email).toBeNull();
  });

  it("keeps an anonymous guest as Guest plus six hex characters", async () => {
    const identity = `k:${KEY}`;
    const result = await collatePeople(base({
      items: [{ id: 1, kind: "game", text: "Players share tools", projectId: null, authorKey: identity, displayName: null, createdAt: 1_700_001_000_000 }],
    }));
    expect(result.people).toHaveLength(1);
    expect(result.people[0].name).toMatch(/^Guest [0-9a-f]{6}$/);
    expect(result.people[0].guestId).toHaveLength(6);
    expect(result.people[0].email).toBeNull();
    expect(JSON.stringify(result)).not.toContain(KEY);
    expect(result.totals.guestsWithoutEmail).toBe(1);
  });

  it("shows a raise-hand row that has no board input", async () => {
    const result = await collatePeople(base({
      inquiries: [{
        id: 4,
        email: "ada@example.com",
        fullName: "Ada Lovelace",
        roleInterest: "coach",
        additionalNotes: null,
        userId: null,
        createdAt: 1_700_002_000_000,
        referralSource: "season2-week-board:week-2",
      }],
    }));
    expect(result.people).toHaveLength(1);
    expect(result.people[0].email).toBe("ada@example.com");
    expect(result.people[0].badges).toContain("Coach");
    expect(result.people[0].inputs[0].timing).toBe("live");
    expect(result.people[0].inputs[0].stage).toBe("A Game we build together");
  });
});
