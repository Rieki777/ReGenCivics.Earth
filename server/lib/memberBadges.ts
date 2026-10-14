/**
 * Who in a call time vote is an accepted land project or an Alliance Partner
 * (ADR-72, shared/memberBadges.ts).
 *
 * Read when a tally is read, so a vote cast before its voter was approved
 * carries the badge the moment they are. Three ways a vote is matched, so
 * votes cast before votes recorded who cast them still count:
 *   - the vote's userId (stamped when the voter was signed in, or attached
 *     when they come back signed in), against approved applications' owner
 *     and steward, and approved alliance applications' owner;
 *   - a Season vote's project name, against approved land project names;
 *   - a Circle vote's browser key, through the Circle's tools register, whose
 *     row gains the person's email when they join, against approved alliance
 *     partners' contact email.
 *
 * The approved sets are small (dozens of rows), so they are read whole and
 * kept for a minute; the tallies poll every few seconds.
 */
import { inArray } from "drizzle-orm";
import { allianceApplications, applications, interopTools } from "../../drizzle/schema";
import { getDb } from "../db";
import { mergeBadges, projectNameKey, type MemberBadge } from "@shared/memberBadges";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export type BadgeIndex = {
  byUser: Map<number, MemberBadge[]>;
  landProjectNames: Set<string>;
  partnerEmails: Set<string>;
};

const APPROVED = ["approved", "active"] as const;
const TTL_MS = 60_000;
let cached: { at: number; index: BadgeIndex } | null = null;

export function emptyBadgeIndex(): BadgeIndex {
  return { byUser: new Map(), landProjectNames: new Set(), partnerEmails: new Set() };
}

export async function badgeIndex(database: Db, now = Date.now()): Promise<BadgeIndex> {
  if (cached && now - cached.at < TTL_MS) return cached.index;
  const index = emptyBadgeIndex();
  const add = (userId: number | null | undefined, badge: MemberBadge) => {
    if (userId == null) return;
    index.byUser.set(userId, mergeBadges(index.byUser.get(userId), [badge]));
  };
  try {
    const land = await database
      .select({ userId: applications.userId, stewardUserId: applications.stewardUserId, projectName: applications.projectName })
      .from(applications)
      .where(inArray(applications.status, [...APPROVED]));
    for (const row of land) {
      add(row.userId, "land_project");
      add(row.stewardUserId, "land_project");
      if (row.projectName?.trim()) index.landProjectNames.add(projectNameKey(row.projectName));
    }
  } catch (err) {
    console.error("[memberBadges] land project read failed:", err);
  }
  try {
    const partners = await database
      .select({ userId: allianceApplications.userId, contactEmail: allianceApplications.contactEmail })
      .from(allianceApplications)
      .where(inArray(allianceApplications.status, [...APPROVED]));
    for (const row of partners) {
      add(row.userId, "alliance_partner");
      if (row.contactEmail) index.partnerEmails.add(row.contactEmail.trim().toLowerCase());
    }
  } catch (err) {
    // Before migration 0297 is applied the table is missing; the page keeps
    // its shape with land project badges only.
    console.error("[memberBadges] alliance read failed:", err);
  }
  cached = { at: now, index };
  return index;
}

/** Drop the cache, so an approval shows on the next tally (and in tests). */
export function clearBadgeCache(): void {
  cached = null;
}

/** A Season vote's badges: its voter, or its project's name. */
export function seasonVoteBadges(index: BadgeIndex, row: { userId?: number | null; projectName: string | null }): MemberBadge[] {
  const byName: MemberBadge[] = row.projectName && index.landProjectNames.has(projectNameKey(row.projectName)) ? ["land_project"] : [];
  return mergeBadges(row.userId != null ? index.byUser.get(row.userId) : undefined, byName);
}

/**
 * The Circle's voter keys whose register row carries an approved partner's
 * email. One read over the keys in hand, not the whole register.
 */
export async function partnerVoterKeys(database: Db, index: BadgeIndex, voterKeys: string[]): Promise<Set<string>> {
  if (!voterKeys.length || !index.partnerEmails.size) return new Set();
  try {
    const rows = await database
      .select({ voterKey: interopTools.voterKey, email: interopTools.email })
      .from(interopTools)
      .where(inArray(interopTools.voterKey, voterKeys));
    return new Set(
      rows
        .filter((r) => r.voterKey && r.email && index.partnerEmails.has(r.email.trim().toLowerCase()))
        .map((r) => r.voterKey as string),
    );
  } catch (err) {
    console.error("[memberBadges] register read failed:", err);
    return new Set();
  }
}
