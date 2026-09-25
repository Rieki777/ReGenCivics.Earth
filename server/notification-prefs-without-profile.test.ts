/**
 * Email choices for an account with no player profile (2026-09-24).
 *
 * notifications.prefs.set used to write only player_profiles.notificationPrefs,
 * so every fresh magic-link account (the contribution sign-up nudge makes
 * these) was refused with "make your profile first", while campaign notices
 * already reached it by email. Prefs for those accounts now live on
 * users.notificationPrefs (0255), and every reader goes through
 * getStoredNotificationPrefs, so the email, digest, push and governance paths
 * all honour a choice saved there.
 *
 * Run against the SCRATCH database, never production.
 */
import { afterAll, describe, expect, it, vi } from "vitest";
import { eq, inArray, sql } from "drizzle-orm";
import * as dbHelpers from "./db";
import { playerProfiles, users } from "../drizzle/schema";
import { stewardCaller } from "./test-fixtures/crowdpool";
import { cadenceFor, digestWants, loadEmailPrefs, getStoredNotificationPrefs, parseStoredPrefs } from "./lib/notification-email";
import { pushWanted } from "./lib/push";

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
  notifyIfEnabled: vi.fn().mockResolvedValue(true),
}));

// { id: null } reads as "held", so the governance path never writes an
// email_logs row for the scratch database's real subscribers.
const sendEmail = vi.fn().mockResolvedValue({ id: null });
vi.mock("./_core/email", async (orig) => ({
  ...(await orig<typeof import("./_core/email")>()),
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}));

const skipIfNoDb = !process.env.DATABASE_URL;
const createdUserIds: number[] = [];
const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

/** A fresh account the way a magic link makes one: a users row, no player profile. */
async function newAccount(label: string, notificationPrefs: unknown = null): Promise<{ id: number; email: string }> {
  const database = await dbHelpers.getDb();
  const email = `prefs-${label}-${stamp}@example.com`;
  const inserted: any = await database!.insert(users).values({
    openId: `test-prefs-${label}-${stamp}`,
    email,
    name: `Prefs ${label}`,
    loginMethod: "email",
    role: "user",
    ...(notificationPrefs != null ? { notificationPrefs } : {}),
  });
  const id = Number(inserted[0].insertId);
  createdUserIds.push(id);
  return { id, email };
}

async function userRowPrefs(userId: number): Promise<unknown> {
  const database = await dbHelpers.getDb();
  const [row] = await database!.select({ p: users.notificationPrefs }).from(users).where(eq(users.id, userId));
  return row?.p ?? null;
}

async function profileCount(userId: number): Promise<number> {
  const database = await dbHelpers.getDb();
  return (await database!.select({ id: playerProfiles.id }).from(playerProfiles).where(eq(playerProfiles.userId, userId))).length;
}

afterAll(async () => {
  if (skipIfNoDb || createdUserIds.length === 0) return;
  const database = await dbHelpers.getDb();
  await database!.delete(playerProfiles).where(inArray(playerProfiles.userId, createdUserIds));
  await database!.delete(users).where(inArray(users.id, createdUserIds));
});

describe("notification prefs for an account with no player profile", () => {
  it.skipIf(skipIfNoDb)("saves campaignsEmail, reads it back, and never makes a profile", async () => {
    const { id } = await newAccount("fresh");
    const caller = stewardCaller(id);

    const before = await caller.notifications.prefs.get();
    expect(before.campaignsEmail).toBe("immediate");
    expect(before).not.toHaveProperty("hasProfile");

    await expect(caller.notifications.prefs.set({ campaignsEmail: "off" })).resolves.toMatchObject({ success: true });
    // Saving the same value again still reads as saved.
    await expect(caller.notifications.prefs.set({ campaignsEmail: "off" })).resolves.toMatchObject({ success: true });
    expect((await caller.notifications.prefs.get()).campaignsEmail).toBe("off");

    expect(await userRowPrefs(id)).toMatchObject({ campaignsEmail: "off" });
    // No public profile or directory entry as a side effect.
    expect(await profileCount(id)).toBe(0);
  });

  it.skipIf(skipIfNoDb)("the email paths honour a choice saved on the users row", async () => {
    const { id } = await newAccount("email-path");
    const caller = stewardCaller(id);

    await caller.notifications.prefs.set({ campaignsEmail: "off" });
    let { prefs, paused } = await loadEmailPrefs(id);
    expect(paused).toBe(false);
    expect(cadenceFor("contribution_accepted", prefs)).toBe("off");
    // The digest leaves it out too, even long after the notice.
    expect(digestWants("contribution_accepted", new Date(Date.now() - 2 * 60 * 60 * 1000), prefs)).toBe(false);

    await caller.notifications.prefs.set({ campaignsEmail: "daily" });
    ({ prefs } = await loadEmailPrefs(id));
    expect(cadenceFor("contribution_accepted", prefs)).toBe("daily");
    expect(digestWants("contribution_accepted", new Date(), prefs)).toBe(true);
  });

  it.skipIf(skipIfNoDb)("keeps the legacy keys and push keys already stored", async () => {
    const { id } = await newAccount("legacy", {
      communityUpdates: false,
      questAnnouncements: true,
      governanceUpdates: true,
      campaignsPush: false,
    });
    const caller = stewardCaller(id);

    await caller.notifications.prefs.set({ repliesEmail: "daily" });
    expect(await userRowPrefs(id)).toMatchObject({
      communityUpdates: false,
      questAnnouncements: true,
      governanceUpdates: true,
      campaignsPush: false,
      repliesEmail: "daily",
    });
    expect(await pushWanted(id, "contribution_accepted")).toBe(false);
    expect(await pushWanted(id, "mention")).toBe(true);

    // The profile page's three toggles save for a profile-less account too,
    // and keep the email choice.
    await caller.playerProfiles.updateNotificationPrefs({ communityUpdates: true, questAnnouncements: false, governanceUpdates: false });
    expect(await userRowPrefs(id)).toMatchObject({
      communityUpdates: true,
      questAnnouncements: false,
      governanceUpdates: false,
      campaignsPush: false,
      repliesEmail: "daily",
    });
    expect(await profileCount(id)).toBe(0);
  });

  it.skipIf(skipIfNoDb)("governance updates reach a profile-less subscriber", async () => {
    const { id, email } = await newAccount("governance", { governanceUpdates: true });
    const other = await newAccount("governance-off", { governanceUpdates: false });
    sendEmail.mockClear();
    const { notifyGovernanceSubscribers } = await import("./jobs/assemblyNotify");
    await notifyGovernanceSubscribers("Test governance subject", "<p>test</p>");
    const recipients = sendEmail.mock.calls.map((c) => (c[0] as { to: string }).to);
    expect(recipients).toContain(email);
    expect(recipients).not.toContain(other.email);
    expect(await profileCount(id)).toBe(0);
  });

  it.skipIf(skipIfNoDb)("governance email reads prefs the same way the settings page does", async () => {
    // Double-encoded by the old players.updateNotificationPrefs bug: the
    // column holds a JSON string. parseStoredPrefs unwraps it, so the page
    // shows the toggle on; the governance query has to agree.
    const doubled = await newAccount("gov-doubled");
    // MySQL's own spacing, which the old LIKE '"governanceUpdates":true' missed.
    const spaced = await newAccount("gov-spaced");
    // A string "true" is not the boolean the toggle writes.
    const stringy = await newAccount("gov-string", { governanceUpdates: "true" });
    // Profile prefs win over the users row, both ways.
    const profileOff = await newAccount("gov-profile-off", { governanceUpdates: true });
    const profileOn = await newAccount("gov-profile-on", { governanceUpdates: false });
    // A double-encoded value that does not unwrap to JSON is skipped, and
    // does not break the query for everyone else.
    const odd = await newAccount("gov-odd");
    const database = await dbHelpers.getDb();
    await database!.execute(sql`UPDATE users SET notificationPrefs = ${JSON.stringify(JSON.stringify({ governanceUpdates: true }))} WHERE id = ${doubled.id}`);
    await database!.execute(sql`UPDATE users SET notificationPrefs = ${'{"governanceUpdates": true, "campaignsEmail": "daily"}'} WHERE id = ${spaced.id}`);
    await database!.execute(sql`UPDATE users SET notificationPrefs = ${JSON.stringify("not json at all")} WHERE id = ${odd.id}`);
    await dbHelpers.createPlayerProfile({ userId: profileOff.id, displayName: "Gov Profile Off", notificationPrefs: { governanceUpdates: false } });
    await dbHelpers.createPlayerProfile({ userId: profileOn.id, displayName: "Gov Profile On", notificationPrefs: { governanceUpdates: true } });

    // The settings page's reading, for the record.
    expect(parseStoredPrefs(await getStoredNotificationPrefs(doubled.id)).governanceUpdates).toBe(true);

    sendEmail.mockClear();
    const { notifyGovernanceSubscribers } = await import("./jobs/assemblyNotify");
    await notifyGovernanceSubscribers("Test governance subject", "<p>test</p>");
    const recipients = sendEmail.mock.calls.map((c) => (c[0] as { to: string }).to);
    expect(recipients).toContain(doubled.email);
    expect(recipients).toContain(spaced.email);
    expect(recipients).toContain(profileOn.email);
    expect(recipients).not.toContain(stringy.email);
    expect(recipients).not.toContain(profileOff.email);
    expect(recipients).not.toContain(odd.email);
  });
});

describe("notification prefs for an account with a player profile", () => {
  it.skipIf(skipIfNoDb)("reads and writes the profile, as before", async () => {
    // A stale users-row value must not leak through while the profile holds prefs.
    const { id } = await newAccount("with-profile", { campaignsEmail: "off" });
    await dbHelpers.createPlayerProfile({
      userId: id,
      displayName: "Prefs With Profile",
      notificationPrefs: { campaignsEmail: "daily", questAnnouncements: false },
    });
    const caller = stewardCaller(id);

    expect((await caller.notifications.prefs.get()).campaignsEmail).toBe("daily");
    await caller.notifications.prefs.set({ repliesEmail: "off" });

    const profile = await dbHelpers.getPlayerProfileByUserId(id);
    expect(profile!.notificationPrefs).toMatchObject({ campaignsEmail: "daily", repliesEmail: "off", questAnnouncements: false });
    expect(await userRowPrefs(id)).toEqual({ campaignsEmail: "off" });
    expect(cadenceFor("contribution_accepted", (await loadEmailPrefs(id)).prefs)).toBe("daily");
  });

  it.skipIf(skipIfNoDb)("a profile made after saving carries the saved choices over", async () => {
    const { id } = await newAccount("later-profile");
    const caller = stewardCaller(id);
    await caller.notifications.prefs.set({ campaignsEmail: "off" });

    await dbHelpers.createPlayerProfile({ userId: id, displayName: "Prefs Later Profile" });
    expect(await getStoredNotificationPrefs(id)).toMatchObject({ campaignsEmail: "off" });
    expect((await caller.notifications.prefs.get()).campaignsEmail).toBe("off");

    // The first save on the profile keeps the choice made before it existed.
    await caller.notifications.prefs.set({ mentionsEmail: "daily" });
    const profile = await dbHelpers.getPlayerProfileByUserId(id);
    expect(profile!.notificationPrefs).toMatchObject({ campaignsEmail: "off", mentionsEmail: "daily" });
  });

  it.skipIf(skipIfNoDb)("an account row that does not exist is never reported as saved", async () => {
    const missing = 2_000_000_000 - Math.floor(Math.random() * 1000);
    createdUserIds.push(missing); // afterAll clears anything a regression writes for it
    await expect(stewardCaller(missing).notifications.prefs.set({ campaignsEmail: "off" }))
      .rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});
