/**
 * Get your Village OS tRPC router (/village-os and /village-os/host, ADR-69).
 *
 * The offer's words and rules live in shared/villageOsOffer.ts. This router
 * serves the two switches the page needs (the code link and the membership
 * button, both off until their env vars are set), tells a signed-in founder
 * which of their Season 2 applications can ask for hosting, takes the hosting
 * request, and gives admins the queue with a first draft of each village.
 *
 * No money moves anywhere here. Hosting never depends on giving
 * (HOSTING_DEPENDS_ON_GIFT), so nothing in this file reads, joins or returns
 * gift or donation data, and the membership link is only ever a link.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { adminProcedure, protectedProcedure, publicProcedure, rateLimited, router } from "../_core/trpc";
import { ENV } from "../_core/env";
import { notifyOwner } from "../_core/notification";
import { getDb } from "../db";
import { frameOriginsFor } from "../lib/frame-check";
import { applications, villageOsRequests } from "../../drizzle/schema";
import { isAdminRole } from "@shared/adminRole";
import { cleanRepoUrl } from "@shared/interopTools";
import { cleanBoardLine, cleanBoardText } from "@shared/sessionBoard";
import {
  AMORA_CIRCLES_EMBED_URL,
  AMORA_CIRCLES_URL,
  DRAFT_FIELDS,
  HOSTING_REQUEST_STATUSES,
  HOSTING_SEASON,
  HOSTING_STATUS_LABEL,
  VILLAGE_OS_OFFER,
  VILLAGE_OS_REPO_URL,
  applicationToVillageSeed,
  hostingRequestInput,
  isAcceptedForHosting,
  type DraftField,
  type HostingRequestStatus,
  type VillageSeed,
} from "@shared/villageOsOffer";

/** A founder fills this in once or twice; five a minute is plenty and keeps loops slow. */
const REQUEST_LIMIT = { windowMs: 60_000, max: 5 };

/** The stored lengths (migration 0287). Input is bounded by hostingRequestInput; these trim. */
const STORED = {
  villageName: 120,
  ownDomain: 253,
  country: 80,
  timeZone: 64,
  language: 40,
  memberWord: 40,
  currencyName: 40,
  tagline: 160,
  adminNote: 2000,
} as const;

async function database() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return db;
}

/**
 * The membership link as the page may show it: an https URL that cleans, with
 * no credentials in it, or nothing. A scheme-less or http value is refused
 * rather than upgraded, so what Railway holds is exactly what people open.
 */
export function cleanMembershipUrl(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!/^https:\/\//i.test(trimmed)) return null;
  const cleaned = cleanRepoUrl(trimmed);
  if (!cleaned || !cleaned.startsWith("https://")) return null;
  try {
    const url = new URL(cleaned);
    if (url.username || url.password) return null;
  } catch {
    return null;
  }
  return cleaned;
}

/** The two switches the offer page reads, from the env (pure, so tests can pass their own). */
export function villageOsOfferFlags(env: { villageOsShowRepo: boolean; villageOsMembershipUrl: string }) {
  const showRepo = env.villageOsShowRepo === true;
  return {
    showRepo,
    repoUrl: showRepo ? VILLAGE_OS_REPO_URL : null,
    membershipUrl: cleanMembershipUrl(env.villageOsMembershipUrl),
  };
}

/** A stored status as one of the known keys. Anything else reads as a fresh request. */
export function asHostingStatus(raw: string | null | undefined): HostingRequestStatus {
  return (HOSTING_REQUEST_STATUSES as readonly string[]).includes(raw ?? "")
    ? (raw as HostingRequestStatus)
    : "requested";
}

/**
 * Whether a hosting request should email the owner: only a new request, or a
 * withdrawn one that asking again opens back up. `before` is the row as it
 * stood before this request, or undefined when there was none.
 */
export function shouldNotifyOwner(before: { status: string | null } | null | undefined): boolean {
  return !before || before.status === "withdrawn";
}

const iso = (d: Date | string | null | undefined): string =>
  d instanceof Date ? d.toISOString() : d ? new Date(d).toISOString() : "";

/** The application columns a first draft may read: DRAFT_FIELDS and nothing else. */
const draftColumns = {
  id: applications.id,
  projectName: applications.projectName,
  location: applications.location,
  country: applications.country,
  vision: applications.vision,
  landStatus: applications.landStatus,
  teamSize: applications.teamSize,
  governanceApproach: applications.governanceApproach,
  regenerativePractices: applications.regenerativePractices,
  communityEngagement: applications.communityEngagement,
  meetingFrequency: applications.meetingFrequency,
};
// Every draft field has a column above (a compile-time check).
const _draftColumnsCoverDraftFields: Record<DraftField, unknown> = draftColumns;
void _draftColumnsCoverDraftFields;

function pickDraftFields(app: Record<string, unknown> | null | undefined): Partial<Record<DraftField, unknown>> {
  const out: Partial<Record<DraftField, unknown>> = {};
  if (!app) return out;
  for (const f of DRAFT_FIELDS) out[f] = app[f];
  return out;
}

export const villageOsRouter = router({
  /** Public: whether the page shows the code link and the membership button. */
  offer: publicProcedure.query(() => villageOsOfferFlags(ENV)),

  /**
   * Public: Amora's circles map for the Week 2 board, and which of the board's
   * origins Amora lets frame its map-only view (server/lib/frame-check.ts).
   * The board draws the live map only on one of those origins, and a picture
   * otherwise.
   */
  amoraMap: publicProcedure.query(async () => ({
    url: AMORA_CIRCLES_URL,
    embedUrl: AMORA_CIRCLES_EMBED_URL,
    frameOrigins: await frameOriginsFor(AMORA_CIRCLES_EMBED_URL),
  })),

  /**
   * Public: what the hosting form can offer this visitor. Signed out, nothing
   * (and no database read). Signed in, their own Season 2 applications, as
   * owner or steward, each marked accepted or not, and the hosting requests
   * that sit on one of those applications.
   */
  eligibility: publicProcedure.query(async ({ ctx }) => {
    const user = ctx.user;
    if (!user) {
      return {
        signedIn: false,
        isAdmin: false,
        applications: [] as { id: number; projectName: string; accepted: boolean }[],
        requests: [] as { id: number; applicationId: number; villageName: string; status: HostingRequestStatus; createdAt: string }[],
      };
    }
    const db = await database();
    const apps = await db
      .select({
        id: applications.id,
        projectName: applications.projectName,
        status: applications.status,
        season: applications.season,
      })
      .from(applications)
      .where(and(
        eq(applications.season, HOSTING_SEASON),
        or(eq(applications.userId, user.id), eq(applications.stewardUserId, user.id)),
      ))
      .orderBy(desc(applications.id));

    // Requests are scoped to the applications the caller owns or stewards right
    // now, never to who sent the form. Stewardship can change after a request
    // is made, and a past steward must stop seeing it. Every legitimate request
    // sits on one of these applications, because `request` checks the same
    // ownership before it writes.
    const appIds = apps.map((a) => a.id);
    const requestRows = appIds.length
      ? await db
          .select({
            id: villageOsRequests.id,
            applicationId: villageOsRequests.applicationId,
            villageName: villageOsRequests.villageName,
            status: villageOsRequests.status,
            createdAt: villageOsRequests.createdAt,
          })
          .from(villageOsRequests)
          .where(inArray(villageOsRequests.applicationId, appIds))
          .orderBy(desc(villageOsRequests.id))
      : [];

    return {
      signedIn: true,
      isAdmin: isAdminRole(user.role),
      applications: apps.map((a) => ({ id: a.id, projectName: a.projectName, accepted: isAcceptedForHosting(a) })),
      requests: requestRows.map((r) => ({
        id: r.id,
        applicationId: r.applicationId,
        villageName: r.villageName,
        status: asHostingStatus(r.status),
        createdAt: iso(r.createdAt),
      })),
    };
  }),

  /**
   * Signed in: ask the team to host a village for an accepted Season 2
   * application the caller applied with or stewards. One request per
   * application: asking again updates it, and a withdrawn request opens again.
   */
  request: protectedProcedure
    .use(rateLimited(REQUEST_LIMIT))
    .input(hostingRequestInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const db = await database();

      const [app] = await db
        .select({
          id: applications.id,
          userId: applications.userId,
          stewardUserId: applications.stewardUserId,
          projectName: applications.projectName,
          status: applications.status,
          season: applications.season,
        })
        .from(applications)
        .where(eq(applications.id, input.applicationId))
        .limit(1);
      // A missing application and someone else's read the same, so the answer
      // says nothing about which application ids exist.
      if (!app || (app.userId !== userId && app.stewardUserId !== userId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can ask for hosting only for a project you applied with or steward.",
        });
      }
      if (!isAcceptedForHosting(app)) {
        throw new TRPCError({ code: "FORBIDDEN", message: `${VILLAGE_OS_OFFER.notEligible.title}.` });
      }

      const villageName = cleanBoardLine(input.villageName, STORED.villageName);
      if (!villageName) throw new TRPCError({ code: "BAD_REQUEST", message: "Give your village a name." });
      const fields = {
        userId,
        villageName,
        preferredAddress: input.preferredAddress ? input.preferredAddress : null,
        ownDomain: cleanBoardLine(input.ownDomain, STORED.ownDomain),
        country: cleanBoardLine(input.country, STORED.country),
        timeZone: cleanBoardLine(input.timeZone, STORED.timeZone),
        language: cleanBoardLine(input.language, STORED.language),
        memberWord: cleanBoardLine(input.memberWord, STORED.memberWord),
        currencyName: cleanBoardLine(input.currencyName, STORED.currencyName),
        tagline: cleanBoardLine(input.tagline, STORED.tagline),
        circleInterest: input.circleInterest ? 1 : 0,
        consentDraft: 1,
        consentHosting: 1,
      };

      const [before] = await db
        .select({ id: villageOsRequests.id, status: villageOsRequests.status })
        .from(villageOsRequests)
        .where(eq(villageOsRequests.applicationId, app.id))
        .limit(1);

      // One row per application, even when two tabs send at once (the unique
      // key on applicationId). The status stays where the team put it, except
      // a withdrawn request, which asking again opens back up.
      await db
        .insert(villageOsRequests)
        .values({ ...fields, applicationId: app.id, status: "requested" })
        .onDuplicateKeyUpdate({
          set: {
            ...fields,
            status: sql`IF(\`status\` = 'withdrawn', 'requested', \`status\`)`,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          },
        });

      const [row] = await db
        .select({ id: villageOsRequests.id, status: villageOsRequests.status })
        .from(villageOsRequests)
        .where(eq(villageOsRequests.applicationId, app.id))
        .limit(1);
      if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const status = asHostingStatus(row.status);

      // The team hears about a request once: when it is new, or when a
      // withdrawn one opens again. Asking again otherwise only updates the row,
      // which the admin queue already shows, so a resubmit loop cannot flood
      // the owner's inbox or the mail quota sign-in depends on.
      if (!shouldNotifyOwner(before)) return { ok: true as const, id: row.id, status };

      // Best effort and not awaited: the request is saved whatever happens to
      // the email, and a slow mail provider never holds up the founder's page.
      void notifyOwner({
        title: `Village OS hosting request${before ? " opened again" : ""}: ${app.projectName}`,
        content: [
          `${app.projectName} asked the team to host its village on Village OS.`,
          "",
          `Village name: ${villageName}`,
          `Web address: ${fields.preferredAddress ?? "not given"}`,
          `Own domain: ${fields.ownDomain ?? "not given"}`,
          `Founders circle interest: ${fields.circleInterest ? "yes" : "no"}`,
          `Status: ${HOSTING_STATUS_LABEL[status]}`,
          `Application ${app.id}, request ${row.id}, account ${userId}.`,
          "",
          "The first draft and its gaps are in the admin hosting queue.",
        ].join("\n"),
      }).catch((err) => console.warn("[villageOs] owner notification failed:", err));

      return { ok: true as const, id: row.id, status };
    }),

  /**
   * Admin: every hosting request, newest first, with a first draft of the
   * village built from the application's DRAFT_FIELDS and the request's own
   * words. The draft lists its gaps; nothing is invented.
   */
  adminQueue: adminProcedure.query(async () => {
    const db = await database();
    const rows = await db
      .select()
      .from(villageOsRequests)
      .orderBy(desc(villageOsRequests.createdAt), desc(villageOsRequests.id))
      .limit(500);
    const appIds = Array.from(new Set(rows.map((r) => r.applicationId)));
    const apps = appIds.length
      ? await db.select(draftColumns).from(applications).where(inArray(applications.id, appIds))
      : [];
    const byId = new Map(apps.map((a) => [a.id, a]));

    return rows.map((r) => {
      const app = byId.get(r.applicationId) ?? null;
      const seed: VillageSeed = applicationToVillageSeed(pickDraftFields(app), r);
      return {
        id: r.id,
        applicationId: r.applicationId,
        projectName: app?.projectName ?? null,
        userId: r.userId,
        villageName: r.villageName,
        preferredAddress: r.preferredAddress,
        ownDomain: r.ownDomain,
        country: r.country,
        timeZone: r.timeZone,
        language: r.language,
        memberWord: r.memberWord,
        currencyName: r.currencyName,
        tagline: r.tagline,
        circleInterest: !!r.circleInterest,
        status: asHostingStatus(r.status),
        adminNote: r.adminNote,
        createdAt: iso(r.createdAt),
        updatedAt: iso(r.updatedAt),
        seed,
      };
    });
  }),

  /** Admin: move a request along, and keep a working note on it. */
  adminSetStatus: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      status: z.enum(HOSTING_REQUEST_STATUSES),
      adminNote: z.string().max(STORED.adminNote).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await database();
      const [row] = await db
        .select({ id: villageOsRequests.id })
        .from(villageOsRequests)
        .where(eq(villageOsRequests.id, input.id))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "That request is not in the queue." });
      const set: Partial<typeof villageOsRequests.$inferInsert> = { status: input.status };
      if (input.adminNote !== undefined) set.adminNote = cleanBoardText(input.adminNote, STORED.adminNote);
      await db.update(villageOsRequests).set(set).where(eq(villageOsRequests.id, row.id));
      return { ok: true as const };
    }),
});
