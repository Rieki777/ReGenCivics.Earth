/**
 * Project stewards: the single gate for who holds a land project's tools.
 *
 * A project steward is any of:
 *   - the campaign's creator (`campaigns.userId`);
 *   - the linked application's applicant (`applications.userId`);
 *   - the linked application's `stewardUserId`;
 *   - a holder of an approved `land_project` org claim on that application
 *     (`org_claims.orgId = String(applicationId)`);
 *   - admins and superadmins (access only: they are never added to
 *     recipient lists).
 *
 * Every campaign steward check goes through here. Before 2026-09-24 each
 * procedure compared `campaign.userId` inline, so the applicant or the
 * approved steward of a land project could not answer offers on their own
 * project's campaign. See .ai/docs/security/OWASP-TOP10.md A01: stewards
 * now see contributor contact details through getContributionsForOwner, a
 * deliberate widening with this module as the only gate.
 */
import { TRPCError } from "@trpc/server";
import { and, eq, sql, type SQL } from "drizzle-orm";
import { getDb } from "../db";
import { applications, campaigns, orgClaims, type Campaign } from "../../drizzle/schema";
import type { TrpcContext } from "../_core/context";
import { canSeeFullRecord, isAdminUser } from "./public-projection";

type SessionUser = TrpcContext["user"] | undefined;
type CampaignRef = Pick<Campaign, "userId" | "applicationId">;

/**
 * Statuses a campaign is not published in. A draft is a project still writing
 * its pitch; pending_review and rejected are the review queue.
 */
export const UNPUBLISHED_CAMPAIGN_STATUSES: ReadonlyArray<string> = ["draft", "pending_review", "rejected"];

/** The columns the public-visibility rule reads. Load them wherever it runs. */
export type CampaignVisibilityRef = Pick<Campaign, "status" | "startedAt" | "publishedAt">;

/**
 * Whether anyone at all may see this campaign.
 *
 * Live, complete (and legacy funded) campaigns are public. A cancelled
 * campaign is public only if it was ever published: going live stamps
 * startedAt and publishedAt (campaigns.updateStatus), and the demo seed
 * stamps both. A draft or in-review campaign that is cancelled never reached
 * visitors, so it stays with its stewards and admins. Before 2026-09-24
 * 'cancelled' counted as published outright, so cancelling a draft made it
 * publicly readable through getById, list and the project page.
 *
 * Hub contract (docs/CROWDPOOL_HUB_CONTRACT.md): village reads change only
 * for campaigns that were never published, which villages never saw, so no
 * village-visible meaning moves and this is not a version bump.
 *
 * The SQL twin is publicCampaignSql below; keep the two in step.
 */
export function isPublicCampaign(campaign: CampaignVisibilityRef): boolean {
  if (UNPUBLISHED_CAMPAIGN_STATUSES.includes(campaign.status)) return false;
  if (campaign.status === "cancelled") return !!(campaign.startedAt || campaign.publishedAt);
  return true;
}

/**
 * isPublicCampaign as a SQL condition on the `campaigns` table, for any
 * query that builds the public set in the database.
 */
export const publicCampaignSql: SQL = sql`(${campaigns.status} IN ('active', 'funded', 'completed') OR (${campaigns.status} = 'cancelled' AND (${campaigns.startedAt} IS NOT NULL OR ${campaigns.publishedAt} IS NOT NULL)))`;

/** Sync check: public (isPublicCampaign), or the creator, or an admin. */
export function canSeeCampaign(user: SessionUser, campaign: CampaignVisibilityRef & Pick<Campaign, "userId">): boolean {
  if (isPublicCampaign(campaign)) return true;
  return canSeeFullRecord(user, campaign.userId);
}

function uniqueIds(ids: Array<number | null | undefined>): number[] {
  const out: number[] = [];
  for (const id of ids) {
    if (typeof id === "number" && Number.isInteger(id) && id > 0 && !out.includes(id)) out.push(id);
  }
  return out;
}

/** Applicant, stewardUserId, and approved land_project claim holders of one application. */
export async function getApplicationStewardIds(applicationId: number): Promise<number[]> {
  if (!applicationId) return [];
  const database = await getDb();
  if (!database) return [];
  const [app] = await database
    .select({ userId: applications.userId, stewardUserId: applications.stewardUserId })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  const claims = await database
    .select({ userId: orgClaims.userId })
    .from(orgClaims)
    .where(and(
      eq(orgClaims.orgType, "land_project"),
      eq(orgClaims.orgId, String(applicationId)),
      eq(orgClaims.status, "approved"),
    ));
  return uniqueIds([app?.userId, app?.stewardUserId, ...claims.map((c) => c.userId)]);
}

/** Every steward of a campaign, admins excluded. Unique and non-null. */
export async function getCampaignStewardIds(campaign: CampaignRef): Promise<number[]> {
  const fromApp = campaign.applicationId ? await getApplicationStewardIds(campaign.applicationId) : [];
  return uniqueIds([campaign.userId, ...fromApp]);
}

export async function canStewardCampaign(user: SessionUser, campaign: CampaignRef): Promise<boolean> {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  if (campaign.userId === user.id) return true;
  if (!campaign.applicationId) return false;
  const ids = await getApplicationStewardIds(campaign.applicationId);
  return ids.includes(user.id);
}

export async function canStewardApplication(user: SessionUser, applicationId: number): Promise<boolean> {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  const ids = await getApplicationStewardIds(applicationId);
  return ids.includes(user.id);
}

export async function assertCampaignSteward(
  user: SessionUser,
  campaign: CampaignRef,
  message = "Only this project's stewards can do that.",
): Promise<void> {
  if (!(await canStewardCampaign(user, campaign))) {
    throw new TRPCError({ code: "FORBIDDEN", message });
  }
}

/**
 * Public campaigns (isPublicCampaign) are for everyone; the rest, including
 * one cancelled before it ever went live, are for their stewards and admins.
 */
export async function canViewCampaign(user: SessionUser, campaign: Campaign): Promise<boolean> {
  if (canSeeCampaign(user, campaign)) return true;
  return canStewardCampaign(user, campaign);
}
