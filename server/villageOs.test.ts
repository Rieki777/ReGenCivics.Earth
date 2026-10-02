/**
 * Get your Village OS (ADR-69): the router's gates before the database, the
 * request form's rules, the offer's two switches, and the hosting request
 * against a real database.
 *
 * The database half makes its own throwaway accounts and Season 2
 * applications (projectName "VOS Test Village ...") and removes every row it
 * makes in afterAll.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { eq, inArray } from "drizzle-orm";

// Counted, never sent: the request tests check when the owner is emailed.
vi.mock("./_core/notification", async (orig) => ({
  ...(await orig<typeof import("./_core/notification")>()),
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { notifyOwner } from "./_core/notification";
import { asHostingStatus, cleanMembershipUrl, shouldNotifyOwner, villageOsOfferFlags } from "./routes/villageOs";
import { getDb } from "./db";
import { applications, users, villageOsRequests } from "../drizzle/schema";
import { VILLAGE_OS_REPO_URL, hostingRequestInput } from "@shared/villageOsOffer";

let ipCounter = 0;
function makeCtx(user: TrpcContext["user"] | null): TrpcContext {
  ipCounter++;
  const ip = `10.88.${Math.floor(ipCounter / 250) % 250}.${(ipCounter % 250) + 1}`;
  return {
    user,
    authMethod: user ? "legacy" : null,
    req: {
      protocol: "https",
      method: "POST",
      ip,
      headers: { origin: "https://regencivics.earth", host: "regencivics.earth", "x-forwarded-for": ip },
      cookies: {},
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  } as TrpcContext;
}

const asUser = (id: number, role: "user" | "admin" = "user") =>
  ({ id, role, openId: `vos-test-${id}`, name: `VOS Test ${id}` }) as unknown as NonNullable<TrpcContext["user"]>;

const ADMIN = asUser(1, "admin");
const PLAYER = asUser(2);

const VALID = {
  applicationId: 1,
  villageName: "Riverbend",
  preferredAddress: "riverbend",
  consentDraft: true as const,
  consentHosting: true as const,
};

describe("village os: the hosting form's rules", () => {
  it("accepts a plain request and an empty web address", () => {
    expect(hostingRequestInput.safeParse(VALID).success).toBe(true);
    expect(hostingRequestInput.safeParse({ ...VALID, preferredAddress: "" }).success).toBe(true);
    expect(hostingRequestInput.safeParse({ ...VALID, preferredAddress: undefined }).success).toBe(true);
    expect(hostingRequestInput.safeParse({ ...VALID, preferredAddress: "river-bend-2" }).success).toBe(true);
  });

  it("lowercases the web address", () => {
    expect(hostingRequestInput.parse({ ...VALID, preferredAddress: "RiverBend" }).preferredAddress).toBe("riverbend");
  });

  it("needs both consents, each exactly true", () => {
    const { consentDraft: _d, ...noDraft } = VALID;
    const { consentHosting: _h, ...noHosting } = VALID;
    expect(hostingRequestInput.safeParse(noDraft).success).toBe(false);
    expect(hostingRequestInput.safeParse(noHosting).success).toBe(false);
    expect(hostingRequestInput.safeParse({ ...VALID, consentDraft: false }).success).toBe(false);
    expect(hostingRequestInput.safeParse({ ...VALID, consentHosting: "true" }).success).toBe(false);
  });

  it("refuses a web address with spaces, a leading or trailing hyphen, or 64 characters and more", () => {
    expect(hostingRequestInput.safeParse({ ...VALID, preferredAddress: "river bend" }).success).toBe(false);
    expect(hostingRequestInput.safeParse({ ...VALID, preferredAddress: "-riverbend" }).success).toBe(false);
    expect(hostingRequestInput.safeParse({ ...VALID, preferredAddress: "riverbend-" }).success).toBe(false);
    expect(hostingRequestInput.safeParse({ ...VALID, preferredAddress: "river.bend" }).success).toBe(false);
    expect(hostingRequestInput.safeParse({ ...VALID, preferredAddress: "a".repeat(63) }).success).toBe(true);
    expect(hostingRequestInput.safeParse({ ...VALID, preferredAddress: "a".repeat(64) }).success).toBe(false);
  });

  it("bounds the village name and the free text", () => {
    expect(hostingRequestInput.safeParse({ ...VALID, villageName: "R" }).success).toBe(false);
    expect(hostingRequestInput.safeParse({ ...VALID, villageName: "x".repeat(121) }).success).toBe(false);
    expect(hostingRequestInput.safeParse({ ...VALID, tagline: "x".repeat(161) }).success).toBe(false);
    expect(hostingRequestInput.safeParse({ ...VALID, applicationId: 0 }).success).toBe(false);
  });
});

describe("village os: who may call what, before the database", () => {
  it("a hosting request needs an account", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.villageOs.request(VALID)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("the queue and its status changes are admin only", async () => {
    for (const user of [null, PLAYER]) {
      const caller = appRouter.createCaller(makeCtx(user));
      await expect(caller.villageOs.adminQueue()).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.villageOs.adminSetStatus({ id: 1, status: "reviewing" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });

  it("a signed-out visitor is told nothing about applications or requests", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    expect(await caller.villageOs.eligibility()).toEqual({ signedIn: false, isAdmin: false, applications: [], requests: [] });
  });

  it("adminSetStatus only takes a known status and a bounded note", async () => {
    const caller = appRouter.createCaller(makeCtx(ADMIN));
    // @ts-expect-error not a status
    await expect(caller.villageOs.adminSetStatus({ id: 1, status: "paid" })).rejects.toThrow();
    await expect(caller.villageOs.adminSetStatus({ id: 1, status: "live", adminNote: "x".repeat(2001) })).rejects.toThrow();
  });
});

describe("village os: the offer's two switches", () => {
  it("both stay off while the env vars are unset", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    expect(await caller.villageOs.offer()).toEqual({ showRepo: false, repoUrl: null, membershipUrl: null });
  });

  it("the code link shows only when switched on", () => {
    expect(villageOsOfferFlags({ villageOsShowRepo: false, villageOsMembershipUrl: "" })).toEqual({
      showRepo: false,
      repoUrl: null,
      membershipUrl: null,
    });
    expect(villageOsOfferFlags({ villageOsShowRepo: true, villageOsMembershipUrl: "" }).repoUrl).toBe(VILLAGE_OS_REPO_URL);
  });

  it("the membership link is a clean https URL or nothing", () => {
    expect(cleanMembershipUrl("https://www.zeffy.com/en-US/donation-form/core-members")).toBe(
      "https://www.zeffy.com/en-US/donation-form/core-members",
    );
    expect(cleanMembershipUrl("  https://core.regencivics.earth/give/  ")).toBe("https://core.regencivics.earth/give");
    expect(cleanMembershipUrl("http://core.regencivics.earth/give")).toBeNull();
    expect(cleanMembershipUrl("core.regencivics.earth/give")).toBeNull();
    expect(cleanMembershipUrl("javascript:alert(1)")).toBeNull();
    expect(cleanMembershipUrl("https://localhost/give")).toBeNull();
    expect(cleanMembershipUrl("https://user:pass@core.regencivics.earth/give")).toBeNull();
    expect(cleanMembershipUrl("")).toBeNull();
    expect(cleanMembershipUrl(undefined)).toBeNull();
    expect(villageOsOfferFlags({ villageOsShowRepo: false, villageOsMembershipUrl: "https://core.regencivics.earth/give" }).membershipUrl)
      .toBe("https://core.regencivics.earth/give");
  });

  it("a stored status outside the list reads as a fresh request", () => {
    expect(asHostingStatus("drafting")).toBe("drafting");
    expect(asHostingStatus("paid")).toBe("requested");
    expect(asHostingStatus(null)).toBe("requested");
  });

  it("the owner is emailed for a new request or a withdrawn one opening again, and not for a resubmit", () => {
    expect(shouldNotifyOwner(undefined)).toBe(true);
    expect(shouldNotifyOwner(null)).toBe(true);
    expect(shouldNotifyOwner({ status: "withdrawn" })).toBe(true);
    for (const status of ["requested", "reviewing", "drafting", "live", null]) {
      expect(shouldNotifyOwner({ status })).toBe(false);
    }
  });
});

describe("village os: Sylva no longer quotes a monthly hosting price", () => {
  // The custom-game form sends Sylva's persona and the hosting field's
  // guidance to the model beside the page's own context (ADR-69), so all
  // three must agree that hosting by our team goes through Village OS.
  const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

  it.each([
    ["server/lib/ship-personas.ts", "./lib/ship-personas.ts"],
    ["shared/companions.ts", "../shared/companions.ts"],
  ])("%s carries no fixed monthly price and points hosting at Village OS", (_name, rel) => {
    const text = read(rel);
    expect(text).not.toMatch(/fixed monthly price/i);
    expect(text).toContain("regencivics.earth/village-os");
  });
});

const skipIfNoDb = !process.env.DATABASE_URL;
const PREFIX = "VOS Test Village";

describe.skipIf(skipIfNoDb)("village os: hosting requests against the database", () => {
  const userIds: number[] = [];
  const appIds: number[] = [];
  let OWNER = 0;
  let STEWARD = 0;
  let OTHER = 0;
  let accepted = 0;
  let submitted = 0;
  let othersAccepted = 0;
  const stamp = Date.now();

  async function makeUser(tag: string): Promise<number> {
    const db = (await getDb())!;
    const r: any = await db.insert(users).values({
      openId: `vos-test-${tag}-${stamp}`,
      email: `vos-test-${tag}-${stamp}@example.com`,
      name: `${PREFIX} ${tag}`,
      loginMethod: "email",
      role: "user",
    });
    const id = Number(r?.[0]?.insertId ?? r?.insertId);
    userIds.push(id);
    return id;
  }

  async function makeApplication(
    userId: number,
    opts: { status: "approved" | "submitted"; stewardUserId?: number; name: string; withGovernance?: boolean },
  ): Promise<number> {
    const db = (await getDb())!;
    const r: any = await db.insert(applications).values({
      userId,
      status: opts.status,
      season: 2,
      projectName: `${PREFIX} ${opts.name} ${stamp}`,
      projectType: "early_stage",
      location: "Test Valley",
      country: "Portugal",
      vision: "A village that grows food and keeps water on the land.",
      landStatus: "owned",
      teamSize: 4,
      teamDescription: "Four founders",
      regenerativePractices: "Swales and food forests",
      governanceApproach: opts.withGovernance === false ? "" : "Consent in a weekly circle",
      communityEngagement: "Open work days each month",
      timeCommitment: "Weekly",
      fundingNeeds: "Tools",
      stewardUserId: opts.stewardUserId ?? null,
    });
    const id = Number(r?.[0]?.insertId ?? r?.insertId);
    appIds.push(id);
    return id;
  }

  const as = (id: number) => appRouter.createCaller(makeCtx(asUser(id)));
  const admin = () => appRouter.createCaller(makeCtx(ADMIN));

  beforeAll(async () => {
    OWNER = await makeUser("owner");
    STEWARD = await makeUser("steward");
    OTHER = await makeUser("other");
    accepted = await makeApplication(OWNER, { status: "approved", name: "Riverbend" });
    submitted = await makeApplication(OWNER, { status: "submitted", name: "Still Waiting" });
    othersAccepted = await makeApplication(OTHER, { status: "approved", name: "Stewarded", stewardUserId: STEWARD, withGovernance: false });
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;
    if (appIds.length) {
      await db.delete(villageOsRequests).where(inArray(villageOsRequests.applicationId, appIds));
      await db.delete(applications).where(inArray(applications.id, appIds));
    }
    if (userIds.length) await db.delete(users).where(inArray(users.id, userIds));
  });

  it("an accepted owner asks once and gets one row; asking again updates the same row", async () => {
    const db = (await getDb())!;
    vi.mocked(notifyOwner).mockClear();
    const first = await as(OWNER).villageOs.request({ ...VALID, applicationId: accepted, villageName: "Riverbend", circleInterest: true });
    expect(first).toMatchObject({ ok: true, status: "requested" });
    // A new request emails the owner once.
    expect(notifyOwner).toHaveBeenCalledTimes(1);

    const second = await as(OWNER).villageOs.request({
      ...VALID,
      applicationId: accepted,
      villageName: "  Riverbend   Village ",
      preferredAddress: "Riverbend-Village",
      tagline: "Come walk the swales",
    });
    expect(second.id).toBe(first.id);
    // Asking again updates the row and sends no second email.
    expect(notifyOwner).toHaveBeenCalledTimes(1);

    const rows = await db.select().from(villageOsRequests).where(inArray(villageOsRequests.applicationId, [accepted]));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      userId: OWNER,
      villageName: "Riverbend Village",
      preferredAddress: "riverbend-village",
      tagline: "Come walk the swales",
      circleInterest: 0,
      consentDraft: 1,
      consentHosting: 1,
      status: "requested",
    });
  });

  it("refuses an application that is not accepted yet", async () => {
    await expect(as(OWNER).villageOs.request({ ...VALID, applicationId: submitted })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses someone else's application, and one that does not exist, the same way", async () => {
    await expect(as(OTHER).villageOs.request({ ...VALID, applicationId: accepted })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(as(OTHER).villageOs.request({ ...VALID, applicationId: 2_000_000_000 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("a project's steward can ask for it too", async () => {
    const res = await as(STEWARD).villageOs.request({ ...VALID, applicationId: othersAccepted, villageName: "Stewarded Commons" });
    expect(res).toMatchObject({ ok: true, status: "requested" });
  });

  it("eligibility lists the caller's Season 2 applications and their requests", async () => {
    const mine = await as(OWNER).villageOs.eligibility();
    expect(mine.signedIn).toBe(true);
    expect(mine.isAdmin).toBe(false);
    const byId = new Map(mine.applications.map((a) => [a.id, a]));
    expect(byId.get(accepted)?.accepted).toBe(true);
    expect(byId.get(submitted)?.accepted).toBe(false);
    expect(byId.has(othersAccepted)).toBe(false);
    const req = mine.requests.find((r) => r.applicationId === accepted);
    expect(req).toMatchObject({ villageName: "Riverbend Village", status: "requested" });
    expect(typeof req?.createdAt).toBe("string");
    expect(mine.requests.some((r) => r.applicationId === othersAccepted)).toBe(false);

    // The owner sees the request their steward made on their project.
    const owner2 = await as(OTHER).villageOs.eligibility();
    expect(owner2.applications.map((a) => a.id)).toContain(othersAccepted);
    expect(owner2.requests.map((r) => r.applicationId)).toContain(othersAccepted);
  });

  it("the admin queue drafts each village from its application and lists the gaps", async () => {
    const queue = await admin().villageOs.adminQueue();
    const riverbend = queue.find((r) => r.applicationId === accepted);
    expect(riverbend).toBeDefined();
    expect(riverbend!.projectName).toBe(`${PREFIX} Riverbend ${stamp}`);
    expect(riverbend!.seed.villageName).toBe("Riverbend Village");
    expect(riverbend!.seed.place).toBe("Test Valley, Portugal");
    expect(riverbend!.seed.tagline).toBe("Come walk the swales");
    expect(riverbend!.seed.gaps).toEqual(["what members are called", "what its gratitude or credits are called"]);
    expect(riverbend!).not.toHaveProperty("consentDraft");

    const stewarded = queue.find((r) => r.applicationId === othersAccepted);
    expect(stewarded!.seed.gaps).toContain("how it decides");
    expect(stewarded!.seed.gaps).toContain("a one-line welcome");
  });

  it("asking again keeps the team's status, and opens a withdrawn request back up", async () => {
    const queue = await admin().villageOs.adminQueue();
    const id = queue.find((r) => r.applicationId === othersAccepted)!.id;

    await admin().villageOs.adminSetStatus({ id, status: "reviewing", adminNote: "  Read it.  Call them Tuesday. " });
    vi.mocked(notifyOwner).mockClear();
    const kept = await as(OTHER).villageOs.request({ ...VALID, applicationId: othersAccepted, villageName: "Stewarded Commons" });
    expect(kept).toMatchObject({ id, status: "reviewing" });
    expect(notifyOwner).not.toHaveBeenCalled();

    await admin().villageOs.adminSetStatus({ id, status: "withdrawn" });
    const reopened = await as(OTHER).villageOs.request({ ...VALID, applicationId: othersAccepted, villageName: "Stewarded Commons" });
    expect(reopened).toMatchObject({ id, status: "requested" });
    // A withdrawn request opening again is news to the team.
    expect(notifyOwner).toHaveBeenCalledTimes(1);

    const after = (await admin().villageOs.adminQueue()).find((r) => r.id === id)!;
    expect(after.adminNote).toBe("Read it. Call them Tuesday.");
    expect(after.userId).toBe(OTHER);

    await expect(admin().villageOs.adminSetStatus({ id: 2_000_000_000, status: "live" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("a past steward stops seeing a request they made once the project's steward changes", async () => {
    const db = (await getDb())!;
    const handedOn = await makeApplication(OTHER, { status: "approved", name: "Handed On", stewardUserId: STEWARD });
    const made = await as(STEWARD).villageOs.request({ ...VALID, applicationId: handedOn, villageName: "Handed On Commons" });
    expect(made).toMatchObject({ ok: true, status: "requested" });

    const [row] = await db
      .select({ userId: villageOsRequests.userId })
      .from(villageOsRequests)
      .where(eq(villageOsRequests.applicationId, handedOn))
      .limit(1);
    expect(row?.userId).toBe(STEWARD);
    const whileSteward = await as(STEWARD).villageOs.eligibility();
    expect(whileSteward.requests.map((r) => r.applicationId)).toContain(handedOn);

    // The project names a new steward. The request row still carries the old
    // steward's id as the one who sent it, and that must no longer count.
    await db.update(applications).set({ stewardUserId: OWNER }).where(eq(applications.id, handedOn));

    const after = await as(STEWARD).villageOs.eligibility();
    expect(after.applications.map((a) => a.id)).not.toContain(handedOn);
    expect(after.requests.map((r) => r.applicationId)).not.toContain(handedOn);
    expect(after.requests.some((r) => r.villageName === "Handed On Commons")).toBe(false);

    // The new steward and the applicant see it.
    const newSteward = await as(OWNER).villageOs.eligibility();
    expect(newSteward.requests.map((r) => r.applicationId)).toContain(handedOn);
    const applicant = await as(OTHER).villageOs.eligibility();
    expect(applicant.requests.map((r) => r.applicationId)).toContain(handedOn);
  });
});
