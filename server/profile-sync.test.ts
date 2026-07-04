/**
 * Profile unification (0169, Phase 2B) — sync symmetry tests.
 *
 * The forum reads profile data from playerProfiles; userProfiles stays alive
 * for onboarding-only fields. Two code paths keep the shared display fields
 * identical in both tables:
 *   forward  upsertUserProfile   (userProfiles -> playerProfiles)
 *   reverse  updatePlayerProfile (playerProfiles -> userProfiles)
 * These tests create one dedicated test user, drive both paths, and assert
 * the mirror lands. They self-clean in afterAll (the global teardown does not
 * cover profile tables).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Every assertion round-trips the remote Railway MySQL (~1.5-2s each); the
// sync functions themselves chain several queries. 5s default is too tight.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 60_000 });
import { eq } from "drizzle-orm";
import * as db from "./db";
import { getDb } from "./db";
import { playerProfiles, userProfiles, users } from "../drizzle/schema";

const skipIfNoDb = !process.env.DATABASE_URL;

const TEST_OPEN_ID = "profile-sync-test-user";
const TEST_EMAIL = "profile-sync-test@example.com";

let testUserId: number | null = null;
let testPlayerProfileId: number | null = null;

beforeAll(async () => {
  if (skipIfNoDb) return;
  const database = await getDb();
  if (!database) return;

  await db.upsertUser({
    openId: TEST_OPEN_ID,
    email: TEST_EMAIL,
    name: "Profile Sync Test User",
    loginMethod: "google",
  });
  const user = await db.getUserByOpenId(TEST_OPEN_ID);
  if (!user) throw new Error("test user not created");
  testUserId = user.id;

  // Fresh rows in both tables so each sync direction has a target.
  await database.delete(playerProfiles).where(eq(playerProfiles.userId, user.id));
  await database.delete(userProfiles).where(eq(userProfiles.userId, user.id));
  await db.createPlayerProfile({
    userId: user.id,
    displayName: "Profile Sync Test User",
    email: TEST_EMAIL,
  });
  const pp = await db.getPlayerProfileByUserId(user.id);
  if (!pp) throw new Error("test playerProfile not created");
  testPlayerProfileId = pp.id;
  await db.upsertUserProfile(user.id, { displayName: "Profile Sync Test User" });
});

afterAll(async () => {
  if (skipIfNoDb || !testUserId) return;
  const database = await getDb();
  if (!database) return;
  await database.delete(playerProfiles).where(eq(playerProfiles.userId, testUserId));
  await database.delete(userProfiles).where(eq(userProfiles.userId, testUserId));
  await database.delete(users).where(eq(users.id, testUserId));
});

describe("forward sync: upsertUserProfile -> playerProfiles", () => {
  it.skipIf(skipIfNoDb)("mirrors the full shared field set", async () => {
    await db.upsertUserProfile(testUserId!, {
      displayName: "Forward Sync Name",
      bio: "forward sync bio",
      website: "https://forward.example.com",
      location: "Forward Valley",
      preferredLanguage: "es",
      avatarUrl: "https://assets.example.com/avatar-fwd.png",
      bannerUrl: "https://assets.example.com/banner-fwd.png",
      onboardingComplete: 1,
    });
    const pp = await db.getPlayerProfileByUserId(testUserId!);
    expect(pp).toBeTruthy();
    expect(pp!.displayName).toBe("Forward Sync Name");
    expect(pp!.bio).toBe("forward sync bio");
    expect(pp!.website).toBe("https://forward.example.com");
    expect(pp!.forumLocation).toBe("Forward Valley");
    expect(pp!.preferredLanguage).toBe("es");
    expect(pp!.avatarUrl).toBe("https://assets.example.com/avatar-fwd.png");
    expect(pp!.bannerUrl).toBe("https://assets.example.com/banner-fwd.png");
    expect(pp!.onboardingComplete).toBe(1);
  });

  it.skipIf(skipIfNoDb)("does not clobber fields that were not in the update", async () => {
    await db.upsertUserProfile(testUserId!, { bio: "only the bio changed" });
    const pp = await db.getPlayerProfileByUserId(testUserId!);
    expect(pp!.bio).toBe("only the bio changed");
    // Everything else from the previous test survives untouched.
    expect(pp!.website).toBe("https://forward.example.com");
    expect(pp!.forumLocation).toBe("Forward Valley");
    expect(pp!.bannerUrl).toBe("https://assets.example.com/banner-fwd.png");
  });
});

describe("reverse sync: updatePlayerProfile -> userProfiles", () => {
  it.skipIf(skipIfNoDb)("mirrors the full shared field set", async () => {
    await db.updatePlayerProfile(testPlayerProfileId!, {
      displayName: "Reverse Sync Name",
      bio: "reverse sync bio",
      website: "https://reverse.example.com",
      forumLocation: "Reverse Ridge",
      preferredLanguage: "fr",
      avatarUrl: "https://assets.example.com/avatar-rev.png",
      bannerUrl: "https://assets.example.com/banner-rev.png",
      onboardingComplete: 1,
    });
    const up = await db.getUserProfile(testUserId!);
    expect(up).toBeTruthy();
    expect(up!.displayName).toBe("Reverse Sync Name");
    expect(up!.bio).toBe("reverse sync bio");
    expect(up!.website).toBe("https://reverse.example.com");
    expect(up!.location).toBe("Reverse Ridge");
    expect(up!.preferredLanguage).toBe("fr");
    expect(up!.avatarUrl).toBe("https://assets.example.com/avatar-rev.png");
    expect(up!.bannerUrl).toBe("https://assets.example.com/banner-rev.png");
    expect(up!.onboardingComplete).toBe(1);
  });

  it.skipIf(skipIfNoDb)("round-trips: a reverse write then a forward read agree", async () => {
    await db.updatePlayerProfile(testPlayerProfileId!, { forumLocation: "Round Trip Rock" });
    const up = await db.getUserProfile(testUserId!);
    const pp = await db.getPlayerProfileByUserId(testUserId!);
    expect(up!.location).toBe("Round Trip Rock");
    expect(pp!.forumLocation).toBe("Round Trip Rock");
  });
});

describe("getForumProfile (unified read model)", () => {
  it.skipIf(skipIfNoDb)("serves the userProfiles-shaped view from playerProfiles", async () => {
    await db.updatePlayerProfile(testPlayerProfileId!, {
      bio: "forum profile bio",
      forumLocation: "Forum Falls",
      website: "https://forum.example.com",
    });
    const fp = await db.getForumProfile(testUserId!);
    expect(fp).toBeTruthy();
    expect(fp!.bio).toBe("forum profile bio");
    expect(fp!.location).toBe("Forum Falls"); // forumLocation surfaced as location
    expect(fp!.website).toBe("https://forum.example.com");
    expect(typeof fp!.reputation).toBe("number");
  });

  it.skipIf(skipIfNoDb)("returns null when no playerProfiles row exists", async () => {
    const fp = await db.getForumProfile(0); // no user 0
    expect(fp).toBeNull();
  });
});

describe("updateForumProfile (unified write model)", () => {
  it.skipIf(skipIfNoDb)("writes playerProfiles and mirrors userProfiles in one call", async () => {
    await db.updateForumProfile(testUserId!, {
      bio: "written through the forum",
      location: "Unified Uplands",
      website: "https://unified.example.com",
      preferredLanguage: "de",
    });
    const pp = await db.getPlayerProfileByUserId(testUserId!);
    const up = await db.getUserProfile(testUserId!);
    expect(pp!.bio).toBe("written through the forum");
    expect(pp!.forumLocation).toBe("Unified Uplands");
    expect(pp!.preferredLanguage).toBe("de");
    expect(up!.bio).toBe("written through the forum");
    expect(up!.location).toBe("Unified Uplands");
    expect(up!.preferredLanguage).toBe("de");
  });
});

describe("reputation dual-write", () => {
  it.skipIf(skipIfNoDb)("incrementUserReputation raises both tables by the same amount", async () => {
    const ppBefore = await db.getPlayerProfileByUserId(testUserId!);
    const upBefore = await db.getUserProfile(testUserId!);
    await db.incrementUserReputation(testUserId!, 5);
    const ppAfter = await db.getPlayerProfileByUserId(testUserId!);
    const upAfter = await db.getUserProfile(testUserId!);
    expect(ppAfter!.reputation).toBe((ppBefore!.reputation ?? 0) + 5);
    expect(upAfter!.reputation).toBe((upBefore!.reputation ?? 0) + 5);
  });
});
