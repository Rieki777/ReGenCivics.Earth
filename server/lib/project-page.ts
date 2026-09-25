/**
 * One read of a land project's public page: /project/:key (shared/projectKey.ts).
 *
 * projects.getPublic, the crawler content for /project/:key
 * (server/_core/crawler-content.ts) and the project share card
 * (server/routes/og.ts) all call resolveProjectPage, so what a visitor, a
 * crawler and a link preview see can never drift apart (build spec
 * 2026-09-25, section 8.8). Moved here unchanged from projects.getPublic.
 *
 * Privacy: from the application only id, projectName, location, country and
 * status are read, and only projectName, location and country leave the
 * server. The front campaign is built by buildCampaignView, the same
 * function as campaigns.getById, so visitors see exactly the fields a
 * campaign already publishes (PUBLIC_CAMPAIGN_FIELDS). Crawlers and share
 * cards call this with no user, so they see public campaigns only.
 */
import { TRPCError } from "@trpc/server";
import { desc, eq, inArray } from "drizzle-orm";
import * as db from "../db";
import { applications, campaigns as campaignsTable, type Campaign } from "../../drizzle/schema";
import type { TrpcContext } from "../_core/context";
import { parseProjectKey, projectPathForApplication, projectPathForCampaign, projectPathForCampaignFocus } from "../../shared/projectKey";
import { canStewardApplication, canStewardCampaign, isPublicCampaign } from "./project-steward";
import { suggestAlternatives } from "./campaign-suggest";
import { buildCampaignView, progressSummariesFor } from "../routes/campaigns";
import { buildStewardQueue } from "../../shared/stewardQueue";

const REVIEW_STATUSES = ["draft", "pending_review", "rejected"];
const PAST_STATUSES = ["completed", "funded", "cancelled"];

type SessionUser = TrpcContext["user"] | undefined;

/** Newest first by creation. */
function newestFirst(a: Campaign, b: Campaign): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id - a.id;
}

/**
 * Which of these campaigns the viewer may see on the page: the public ones
 * (isPublicCampaign: a campaign cancelled before it ever went live is not
 * one) for everyone, the rest for their stewards and admins. This one list
 * feeds the front campaign, the past campaigns, the switcher and whether
 * the project has a public page at all.
 */
async function visibleCampaigns(user: SessionUser, list: Campaign[]): Promise<Campaign[]> {
  const out: Campaign[] = [];
  for (const c of list) {
    if (isPublicCampaign(c)) out.push(c);
    else if (await canStewardCampaign(user, c)) out.push(c);
  }
  return out.sort(newestFirst);
}

/**
 * The campaign the page leads with. `focusId` (the page's ?campaign= param,
 * which every campaign notice, digest and manage link carries) wins when it
 * is one of the campaigns the viewer may see, so a project with several
 * campaigns can reach each one's offers, updates and cancel notice.
 */
export function pickFrontCampaign(visible: Campaign[], isSteward: boolean, focusId?: number | null): Campaign | null {
  const sorted = [...visible].sort(newestFirst);
  const focused = focusId ? sorted.find((c) => c.id === focusId) : undefined;
  if (focused) return focused;
  return sorted.find((c) => c.status === "active")
    ?? (isSteward ? sorted.find((c) => REVIEW_STATUSES.includes(c.status)) : undefined)
    ?? sorted.find((c) => PAST_STATUSES.includes(c.status))
    ?? null;
}

/** The project page for `key`, as the viewer may see it. Throws NOT_FOUND when there is none. */
export async function resolveProjectPage({ key, user, focusId }: { key: string; user: SessionUser; focusId?: number | null }) {
  const notFound = () => new TRPCError({ code: "NOT_FOUND", message: "We couldn't find that project." });
  const parsed = parseProjectKey(key);
  if (!parsed) throw notFound();
  const database = await db.getDb();
  if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

  let applicationId: number | null = parsed.kind === "application" ? parsed.id : null;
  let soleCampaign: Campaign | null = null;
  if (parsed.kind === "campaign") {
    const c = await db.getCampaignById(parsed.id);
    if (!c) throw notFound();
    // A campaign key for a campaign that has an application is the
    // application's page; canonicalPath tells the client to move.
    if (c.applicationId) applicationId = c.applicationId;
    else soleCampaign = c;
  }

  let app: { id: number; projectName: string; location: string | null; country: string | null; status: string } | null = null;
  let linked: Campaign[];
  if (applicationId != null) {
    const [row] = await database
      .select({
        id: applications.id,
        projectName: applications.projectName,
        location: applications.location,
        country: applications.country,
        status: applications.status,
      })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);
    if (!row) throw notFound();
    app = row;
    linked = await database
      .select()
      .from(campaignsTable)
      .where(eq(campaignsTable.applicationId, applicationId))
      .orderBy(desc(campaignsTable.createdAt));
  } else {
    linked = [soleCampaign!];
  }

  const visible = await visibleCampaigns(user, linked);
  let isSteward: boolean;
  if (app) {
    isSteward = await canStewardApplication(user, app.id);
    if (!isSteward) {
      for (const c of linked) {
        if (await canStewardCampaign(user, c)) { isSteward = true; break; }
      }
    }
  } else {
    isSteward = await canStewardCampaign(user, soleCampaign!);
  }

  // A project has a public page once its application passed review, or
  // once it has a campaign the viewer may see. A submitted or in-review
  // application with nothing live has no public page yet.
  const appPublic = !!app && (app.status === "approved" || app.status === "active");
  if (!appPublic && visible.length === 0 && !isSteward) throw notFound();

  const frontRow = pickFrontCampaign(visible, isSteward, focusId ?? null);
  const front = frontRow ? await buildCampaignView(frontRow, user) : null;

  const images = await db.getCampaignImagesForMany(visible.map((c) => c.id));
  // Each campaign's two-line reading, summary form, from one batched read
  // (shared/campaignProgress.ts). The front campaign carries the full one.
  const progress = await progressSummariesFor(visible);
  const campaignsOut = visible.map((c) => {
    const imgs = images[c.id] ?? [];
    const cover = imgs.find((i) => i.isCover === 1) ?? imgs[0] ?? null;
    return {
      id: c.id,
      title: c.title,
      status: c.status,
      isDemo: !!c.isDemo,
      startedAt: c.startedAt,
      completedAt: c.completedAt,
      pledgedTotal: c.pledgedTotal,
      totalValue: c.totalValue,
      currency: c.currency,
      coverImageUrl: cover?.url ?? c.generatedImageUrl ?? c.projectImageUrl ?? null,
      path: projectPathForCampaignFocus(c),
      progress: progress.get(c.id)!,
    };
  });

  // Stewards: how much is waiting on them in each campaign, for the
  // campaign switcher (same counting as the steward bar).
  const stewardWaiting: Record<number, number> = {};
  if (isSteward && visible.length > 1) {
    for (const c of visible) {
      if (!(await canStewardCampaign(user, c))) continue;
      const [contribs, items] = await Promise.all([db.getContributionsByCampaign(c.id), db.getCampaignItems(c.id)]);
      stewardWaiting[c.id] = buildStewardQueue({ contributions: contribs, items, campaignStatus: c.status }).total;
    }
  }

  const suggestions = frontRow && frontRow.status === "cancelled"
    ? (await suggestAlternatives(frontRow, 3)).map((s) => ({
        id: s.id,
        title: s.title,
        projectName: s.projectName,
        location: s.location,
        country: s.country,
        isDemo: !!s.isDemo,
        path: s.path,
      }))
    : [];

  const nameSource = app?.projectName || soleCampaign?.projectName || soleCampaign?.title || frontRow?.projectName || "";
  const canonicalPath = app
    ? projectPathForApplication(app.id, app.projectName)
    : projectPathForCampaign(soleCampaign!);

  return {
    canonicalPath,
    project: {
      applicationId: app?.id ?? null,
      name: nameSource,
      location: app?.location ?? soleCampaign?.location ?? frontRow?.location ?? null,
      country: app?.country ?? null,
      isDemo: visible.length > 0 && visible.every((c) => !!c.isDemo),
    },
    front,
    campaigns: campaignsOut,
    isSteward,
    stewardWaiting,
    suggestions,
  };
}

export type ProjectPageView = Awaited<ReturnType<typeof resolveProjectPage>>;

/**
 * resolveProjectPage for a public reader (crawlers, share cards): no user,
 * and null in place of NOT_FOUND or a database failure, so a page render
 * never breaks on it.
 */
export async function resolvePublicProjectPage(key: string): Promise<ProjectPageView | null> {
  try {
    return await resolveProjectPage({ key, user: undefined });
  } catch {
    return null;
  }
}

export { serverCurrencyFormatter } from "./currency-format";

/**
 * One sitemap entry per project with a live public campaign (spec 8.8): the
 * application's page for application-linked campaigns, the campaign key
 * otherwise, deduped. Replaced the /campaign/:id entries, which now 301.
 */
export async function publicProjectPaths(): Promise<string[]> {
  const live = (await db.listCampaigns("active")).filter((c) => isPublicCampaign(c));
  const appIds = Array.from(new Set(live.map((c) => c.applicationId).filter((id): id is number => !!id)));
  const names = new Map<number, string>();
  if (appIds.length > 0) {
    const database = await db.getDb();
    if (database) {
      const rows = await database
        .select({ id: applications.id, projectName: applications.projectName })
        .from(applications)
        .where(inArray(applications.id, appIds));
      for (const r of rows) names.set(r.id, r.projectName);
    }
  }
  const paths = new Set<string>();
  for (const c of live) {
    if (!c.applicationId) paths.add(projectPathForCampaign(c));
    // An application row that is gone has no page to list.
    else if (names.has(c.applicationId)) paths.add(projectPathForApplication(c.applicationId, names.get(c.applicationId)!));
  }
  return Array.from(paths);
}
