/**
 * Crew sponsorship reconciliation. When a sponsorship donation succeeds, the
 * Stripe webhook calls recomputeCrewSponsorship to refresh the crew's cached
 * sponsoredCents from the authoritative sum of succeeded donations, flip the
 * crew to "sponsored" once the goal is met, and fire the goal-reached emails.
 *
 * Kept here (not in the router) so the webhook does not import the tRPC tree.
 * Best-effort and never throws: a sponsorship reconciliation failure must not
 * fail the donation webhook.
 */
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { churchDonations, shipCrewProfiles, shipNominations, users } from "../../drizzle/schema";
import { CREW_SPONSOR_PROGRAM_TAG } from "./ship-config";
import { emailSponsorshipReceived, emailSponsorGoalReached } from "./ship-emails";

/** Where the goal-reached notice also goes, so a crew's success is seen. */
const RYE_EMAIL = process.env.SHIP_STEWARD_EMAIL || "team@regencivics.earth";

/**
 * Recompute a crew's sponsored total from succeeded donations, update the cache,
 * flip status on goal, and notify. `latestAmountCents` is the contribution that
 * just landed (for the "someone sponsored you" email). Never throws.
 */
export async function recomputeCrewSponsorship(
  crewProfileId: number,
  latestAmountCents?: number,
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const [crew] = await db.select().from(shipCrewProfiles).where(eq(shipCrewProfiles.id, crewProfileId)).limit(1);
    if (!crew) return;

    const [{ total }] = await db
      .select({ total: sql<number>`COALESCE(SUM(${churchDonations.amountCents}), 0)` })
      .from(churchDonations)
      .where(
        and(
          eq(churchDonations.program, CREW_SPONSOR_PROGRAM_TAG),
          eq(churchDonations.crewProfileId, crewProfileId),
          eq(churchDonations.status, "succeeded"),
        ),
      );
    const sponsoredCents = Number(total ?? 0);
    const wasReached = crew.sponsoredCents >= crew.sponsorGoalCents;
    const nowReached = sponsoredCents >= crew.sponsorGoalCents;
    const alreadySailed = crew.status === "sponsored" || crew.status === "sailed";

    await db
      .update(shipCrewProfiles)
      .set({
        sponsoredCents,
        ...(nowReached && !alreadySailed ? { status: "sponsored" as const } : {}),
      })
      .where(eq(shipCrewProfiles.id, crewProfileId));

    const crewEmail = await crewContactEmail(crew.userId, crew.nominationId);
    if (crewEmail && latestAmountCents) {
      await emailSponsorshipReceived(crewEmail, { amountCents: latestAmountCents, sponsoredCents, goalCents: crew.sponsorGoalCents });
    }
    if (nowReached && !wasReached) {
      if (crewEmail) await emailSponsorGoalReached(crewEmail, crew.displayName);
      await emailSponsorGoalReached(RYE_EMAIL, crew.displayName);
    }
  } catch (err) {
    console.error("[ship-sponsorship] recompute failed:", err);
  }
}

async function crewContactEmail(userId: number | null, nominationId: number | null): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  if (userId) {
    const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
    if (u?.email) return u.email;
  }
  if (nominationId) {
    const [n] = await db.select({ contact: shipNominations.nomineeContact }).from(shipNominations).where(eq(shipNominations.id, nominationId)).limit(1);
    if (n?.contact && n.contact.includes("@")) return n.contact;
  }
  return null;
}
