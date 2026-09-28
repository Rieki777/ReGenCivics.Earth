/**
 * Funding contacts against a real database (funding engine Phase 4,
 * drizzle/0280): a second conversation with the same email lands on the same
 * person, follow-ups come due with a Gmail link, do-not-contact hides them,
 * and a done follow-up leaves the list.
 *
 * Runs in CI's integration job and only against a database on this machine:
 * it writes rows, and the regen-civics .env points at production.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, like } from "drizzle-orm";
import { getDb } from "./db";
import { fundingContacts } from "../drizzle/schema";
import { dueFollowUps, markFollowUpDone, quickAdd, updateContact } from "./funding/contacts";

const url = process.env.DATABASE_URL ?? "";
const LOCAL = /@(127\.0\.0\.1|localhost)(:\d+)?\//.test(url);
const RUN = Date.now().toString(36);
const EMAIL = `ana-${RUN}@example.org`;

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

describe.skipIf(!LOCAL)("funding contacts (integration)", () => {
  let db: Db;
  let contactId = 0;

  beforeAll(async () => {
    const got = await getDb();
    if (!got) throw new Error("no database");
    db = got;
  });

  afterAll(async () => {
    if (db) await db.delete(fundingContacts).where(like(fundingContacts.name, `%${RUN}%`));
  });

  const mine = (rows: Awaited<ReturnType<typeof dueFollowUps>>) => rows.filter((r) => r.contact.name.includes(RUN));

  it("logs a conversation and lands a second one on the same person by email", async () => {
    const first = await quickAdd(
      db,
      { name: `Ana Rivera ${RUN}`, summary: "Funds soil work.", warmth: 1, email: EMAIL.toUpperCase(), source: "The Gathering 2026", channel: "event", followUpAt: "2026-10-01", nextStep: "Send the one-pager." },
      1,
    );
    expect(first.matchedExisting).toBe(false);
    contactId = first.contactId;
    const second = await quickAdd(db, { name: `Ana ${RUN}`, summary: "Asked about the cooperative.", warmth: 2, email: EMAIL, channel: "event" }, 1);
    expect(second.matchedExisting).toBe(true);
    expect(second.contactId).toBe(contactId);
    const [row] = await db.select().from(fundingContacts).where(eq(fundingContacts.id, contactId));
    expect(row.email).toBe(EMAIL);
    expect(row.warmth).toBe(2);
  });

  it("shows a due follow-up with a Gmail link, and hides it for do-not-contact", async () => {
    const due = mine(await dueFollowUps(db, "2026-10-02"));
    expect(due).toHaveLength(1);
    expect(due[0].gmailUrl).toContain("mail.google.com");
    expect(due[0].nextStep).toBe("Send the one-pager.");
    expect(mine(await dueFollowUps(db, "2026-09-30"))).toEqual([]);

    await updateContact(db, { id: contactId, doNotContact: true });
    expect(mine(await dueFollowUps(db, "2026-10-02"))).toEqual([]);
    await updateContact(db, { id: contactId, doNotContact: false });
  });

  it("drops a follow-up once it is done", async () => {
    const [due] = mine(await dueFollowUps(db, "2026-10-02"));
    await markFollowUpDone(db, due.touchId);
    expect(mine(await dueFollowUps(db, "2026-10-02"))).toEqual([]);
  });
});
