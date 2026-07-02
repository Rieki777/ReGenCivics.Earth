/**
 * Bounty Engine router.
 *
 * One router for every kind of rewarded work: call tasks (one role: doer)
 * and code contributions (two roles: proposer + shipper). The tRPC surface
 * follows three permission tiers: player procedures (anyone signed in),
 * maintainer procedures (canAccept from bounty_permissions), and
 * reverser procedures (canReverse from bounty_permissions).
 *
 * The single payout path is payRole() in server/db/bounties.ts.
 * No credit logic lives in this file.
 */
import { z } from "zod";
import { eq, and, desc, inArray, or, ne, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  publicProcedure,
  protectedProcedure,
  superadminProcedure,
  maintainerProcedure,
  reverserProcedure,
  rateLimited,
  router,
} from "../_core/trpc";
import { getDb } from "../db";
import {
  bounties,
  bountyRoles,
  bountyEvents,
  bountyArtifacts,
  bountyPermissions,
  bountyDemandFactors,
  notifications,
  users,
  recordings,
  roles as rolesCatalog,
  roleHolders,
  playerProfiles,
} from "../../drizzle/schema";
import { payRole, reverseRole, getTierAmounts, meetsLargeTierFloor, getBountyPermission } from "../db/bounties";
import { computeBountyAmount, getCommittedEmission, type ImpactLevel, type ValuationBreakdown } from "../db/bountyValuation";
import { getGameVariable } from "../game";
import { sanitizeInput } from "../_core/security";

type DbInstance = NonNullable<Awaited<ReturnType<typeof getDb>>>;

// ── Shared zod schemas ───────────────────────────────────────────────────────

const TierSchema = z.enum(["trivial", "small", "medium", "large"]);
const ImpactSchema = z.enum(["low", "normal", "high"]);
const SourceTypeSchema = z.enum(["call_task", "contribution"]);

// ── Shared enrichment: source recording + role display, and gratitude tally ──

interface BountyRowLike { id: number; recordingId: number | null; roleSlug: string | null }
type BountyEnrichment = {
  recordingTitle: string | null;
  recordingVideoId: string | null;
  roleName: string | null;
  roleCircle: string | null;
  roleColor: string | null;
};

/** Batch-fetch the source recording title and role display for a set of bounty rows. */
async function enrichBounties<T extends BountyRowLike>(db: DbInstance, rows: T[]): Promise<Array<T & BountyEnrichment>> {
  const recIds = [...new Set(rows.map((r) => r.recordingId).filter((x): x is number => x != null))];
  const slugs = [...new Set(rows.map((r) => r.roleSlug).filter((x): x is string => x != null))];

  const recMap = new Map<number, { title: string; videoId: string | null }>();
  if (recIds.length) {
    const recs = await db
      .select({ id: recordings.id, title: recordings.title, videoId: recordings.youtubeVideoId })
      .from(recordings)
      .where(inArray(recordings.id, recIds));
    for (const r of recs) recMap.set(r.id, { title: r.title, videoId: r.videoId ?? null });
  }

  const roleMap = new Map<string, { title: string; circle: string | null; color: string | null }>();
  if (slugs.length) {
    const rs = await db
      .select({ slug: rolesCatalog.slug, title: rolesCatalog.title, circle: rolesCatalog.circle, color: rolesCatalog.color })
      .from(rolesCatalog)
      .where(inArray(rolesCatalog.slug, slugs));
    for (const r of rs) roleMap.set(r.slug, { title: r.title, circle: r.circle, color: r.color });
  }

  return rows.map((r) => {
    const rec = r.recordingId != null ? recMap.get(r.recordingId) : null;
    const meta = r.roleSlug ? roleMap.get(r.roleSlug) : null;
    return {
      ...r,
      recordingTitle: rec?.title ?? null,
      recordingVideoId: rec?.videoId ?? null,
      roleName: meta?.title ?? null,
      roleCircle: meta?.circle ?? null,
      roleColor: meta?.color ?? null,
    };
  });
}

/** Sum of gratitude gifts (private $ReGen credited with source 'gratitude_bounty') per bounty. */
async function gratitudeTallyForBounties(db: DbInstance, bountyIds: number[]): Promise<Map<number, { total: number; count: number }>> {
  const out = new Map<number, { total: number; count: number }>();
  if (!bountyIds.length) return out;
  const refs = bountyIds.map((id) => `bounty:${id}`);
  const rows = await db.execute(sql`
    SELECT sourceRef, COALESCE(SUM(amount), 0) AS total, COUNT(*) AS cnt
    FROM user_token_ledger
    WHERE source = 'gratitude_bounty' AND sourceRef IN (${sql.join(refs, sql`, `)})
    GROUP BY sourceRef
  `).then((r: any) => r[0] ?? []);
  for (const row of rows) {
    const id = Number(String(row.sourceRef).split(":")[1]);
    if (Number.isFinite(id)) out.set(id, { total: Number(row.total) || 0, count: Number(row.cnt) || 0 });
  }
  return out;
}

/** The locked reward amount for a bounty, from its stored valuation breakdown. */
function breakdownAmount(b: { valuationBreakdown?: unknown }): number {
  const bd = b.valuationBreakdown as ValuationBreakdown | null | undefined;
  return bd && Number.isFinite(bd.amount) ? bd.amount : 0;
}

// ── Helper: build role slots for a new bounty ────────────────────────────────

async function buildRolesForBounty(
  sourceType: "call_task" | "contribution",
  tier: "trivial" | "small" | "medium" | "large" | null | undefined,
): Promise<Array<{ role: "doer" | "proposer" | "shipper"; amount: number }>> {
  if (!tier) {
    if (sourceType === "call_task") return [{ role: "doer", amount: 0 }];
    return [{ role: "proposer", amount: 0 }, { role: "shipper", amount: 0 }];
  }
  const { delivery, proposal } = await getTierAmounts(tier);
  if (sourceType === "call_task") {
    return [{ role: "doer", amount: delivery }];
  }
  return [
    { role: "proposer", amount: proposal },
    { role: "shipper", amount: delivery },
  ];
}

// ── Helper: write a bounty_events row ────────────────────────────────────────

async function logEvent(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  bountyId: number,
  event: string,
  opts: { roleId?: number | null; actorUserId?: number | null; detail?: unknown } = {},
) {
  await db.insert(bountyEvents).values({
    bountyId,
    roleId: opts.roleId ?? null,
    actorUserId: opts.actorUserId ?? null,
    event,
    detail: opts.detail as Record<string, unknown> | null ?? null,
  });
}

// ── Router ───────────────────────────────────────────────────────────────────

export const bountiesRouter = router({

  // ── Player: propose a bounty ─────────────────────────────────────────────
  propose: protectedProcedure
    .use(rateLimited({ windowMs: 60_000, max: 5 }))
    .input(z.object({
      sourceType: SourceTypeSchema,
      title: z.string().min(3).max(255),
      body: z.string().min(10).max(10000),
      tier: TierSchema.nullable().optional(),
      tokenType: z.enum(["regen", "rcivics", "rgvoice", "rcvoice"]).default("regen"),
      // contribution fields
      kind: z.enum(["fix", "feature"]).nullable().optional(),
      githubRepo: z.string().max(255).nullable().optional(),
      githubIssueNumber: z.number().int().positive().nullable().optional(),
      sourceForumPostId: z.number().int().positive().nullable().optional(),
      // call_task fields
      recordingId: z.number().int().positive().nullable().optional(),
      roleSlug: z.string().max(64).nullable().optional(),
      evidenceQuote: z.string().max(2000).nullable().optional(),
      evidenceTs: z.number().int().min(0).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      if (input.tier === "large") {
        const meets = await meetsLargeTierFloor(ctx.user.id);
        if (!meets) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Large bounties require a higher citizenship tier" });
        }
      }

      const roles = await buildRolesForBounty(input.sourceType, input.tier ?? null);

      const [insertResult] = await db.insert(bounties).values({
        sourceType: input.sourceType,
        title: input.title,
        body: input.body,
        tier: input.tier ?? null,
        tokenType: input.tokenType,
        workStatus: "proposed",
        kind: input.kind ?? null,
        githubRepo: input.githubRepo ?? null,
        githubIssueNumber: input.githubIssueNumber ?? null,
        sourceForumPostId: input.sourceForumPostId ?? null,
        recordingId: input.recordingId ?? null,
        roleSlug: input.roleSlug ?? null,
        evidenceQuote: input.evidenceQuote ?? null,
        evidenceTs: input.evidenceTs ?? null,
      });
      const bountyId = (insertResult as unknown as { insertId: number }).insertId;

      for (const r of roles) {
        const userId = (input.sourceType === "contribution" && r.role === "proposer")
          ? ctx.user.id : null;
        const payStatus = userId ? "filled" : "unfilled";
        await db.insert(bountyRoles).values({
          bountyId,
          role: r.role,
          userId,
          amount: r.amount,
          payStatus,
          filledByLog: userId
            ? [{ userId, action: "proposed", at: new Date().toISOString() }]
            : null,
        });
      }

      await logEvent(db, bountyId, "proposed", { actorUserId: ctx.user.id });
      return { ok: true, bountyId };
    }),

  // ── Public: bounty board ─────────────────────────────────────────────────
  listBoard: publicProcedure
    .input(z.object({
      sourceType: SourceTypeSchema.optional(),
      tier: TierSchema.optional(),
      roleSlug: z.string().max(64).optional(),
      circle: z.string().max(128).optional(),
      sort: z.enum(["newest", "reward", "closing"]).default("newest"),
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      // A circle filter resolves to the role slugs that belong to it.
      let circleSlugs: string[] | null = null;
      if (input.circle) {
        const rs = await db.select({ slug: rolesCatalog.slug }).from(rolesCatalog).where(eq(rolesCatalog.circle, input.circle));
        circleSlugs = rs.map((r) => r.slug);
        if (!circleSlugs.length) return [];
      }
      const filters = [
        or(eq(bounties.workStatus, "open"), eq(bounties.workStatus, "accepted")),
        input.sourceType ? eq(bounties.sourceType, input.sourceType) : undefined,
        input.tier ? eq(bounties.tier, input.tier) : undefined,
        input.roleSlug ? eq(bounties.roleSlug, input.roleSlug) : undefined,
        circleSlugs ? inArray(bounties.roleSlug, circleSlugs) : undefined,
      ].filter(Boolean) as ReturnType<typeof eq>[];
      const where = filters.length === 1 ? filters[0] : and(...filters);
      const rows = await db
        .select()
        .from(bounties)
        .where(where)
        .orderBy(desc(bounties.createdAt))
        .limit(input.limit);
      if (!rows.length) return [];
      const ids = rows.map((b) => b.id);
      const roles = await db
        .select()
        .from(bountyRoles)
        .where(and(inArray(bountyRoles.bountyId, ids), eq(bountyRoles.payStatus, "unfilled")));
      const roleMap = new Map<number, typeof roles>();
      for (const r of roles) {
        if (!roleMap.has(r.bountyId)) roleMap.set(r.bountyId, []);
        roleMap.get(r.bountyId)!.push(r);
      }
      const enriched = await enrichBounties(db, rows);
      const withRoles = enriched.map((b) => ({ ...b, openRoles: roleMap.get(b.id) ?? [] }));
      // Sort within the fetched window (the board is small; reward/closing need
      // the joined amount/expiry that SQL ordering by createdAt can't give here).
      if (input.sort === "reward") {
        withRoles.sort((a, b) => breakdownAmount(b) - breakdownAmount(a));
      } else if (input.sort === "closing") {
        withRoles.sort((a, b) => {
          const ax = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
          const bx = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
          return ax - bx;
        });
      }
      return withRoles;
    }),

  // ── Player: my roles ─────────────────────────────────────────────────────
  listMine: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const roles = await db
        .select()
        .from(bountyRoles)
        .where(eq(bountyRoles.userId, ctx.user.id))
        .orderBy(desc(bountyRoles.createdAt))
        .limit(input.limit);
      if (!roles.length) return [];
      const bIds = [...new Set(roles.map((r) => r.bountyId))];
      const bRows = await db.select().from(bounties).where(inArray(bounties.id, bIds));
      const enriched = await enrichBounties(db, bRows);
      const bMap = new Map(enriched.map((b) => [b.id, b]));
      return roles.map((r) => ({ ...r, bounty: bMap.get(r.bountyId) ?? null }));
    }),

  // ── Player: claim an open role ────────────────────────────────────────────
  claimRole: protectedProcedure
    .use(rateLimited({ windowMs: 60_000, max: 10 }))
    .input(z.object({ roleId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const [role] = await db
        .select()
        .from(bountyRoles)
        .where(eq(bountyRoles.id, input.roleId))
        .limit(1);
      if (!role) throw new TRPCError({ code: "NOT_FOUND" });
      if (role.payStatus !== "unfilled") {
        throw new TRPCError({ code: "CONFLICT", message: "Role is already claimed" });
      }
      const [bounty] = await db
        .select({ workStatus: bounties.workStatus })
        .from(bounties)
        .where(eq(bounties.id, role.bountyId))
        .limit(1);
      if (!bounty || (bounty.workStatus !== "open" && bounty.workStatus !== "accepted")) {
        throw new TRPCError({ code: "CONFLICT", message: "Bounty is not open for claiming" });
      }
      // Note: the same user can claim a role even if they also hold the proposer role —
      // the separation-of-duties guard in payRole() will hold for maintainer review.
      const result = await db.update(bountyRoles).set({
        userId: ctx.user.id,
        payStatus: "filled",
        filledByLog: [{ userId: ctx.user.id, action: "claimed", at: new Date().toISOString() }],
      }).where(and(eq(bountyRoles.id, input.roleId), eq(bountyRoles.payStatus, "unfilled")));
      const affected = (result as unknown as { affectedRows?: number }[])[0]?.affectedRows
        ?? (result as unknown as { affectedRows?: number })?.affectedRows ?? 0;
      if (!affected) throw new TRPCError({ code: "CONFLICT", message: "Race condition: role was just claimed" });
      await logEvent(db, role.bountyId, "claimed", { roleId: role.id, actorUserId: ctx.user.id });
      return { ok: true };
    }),

  // ── Player: release a claimed role ────────────────────────────────────────
  releaseRole: protectedProcedure
    .input(z.object({ roleId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const [role] = await db
        .select()
        .from(bountyRoles)
        .where(eq(bountyRoles.id, input.roleId))
        .limit(1);
      if (!role) throw new TRPCError({ code: "NOT_FOUND" });
      if (role.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (role.payStatus !== "filled") {
        throw new TRPCError({ code: "CONFLICT", message: "Role cannot be released in its current state" });
      }
      await db.update(bountyRoles).set({ userId: null, payStatus: "unfilled", filledByLog: null })
        .where(eq(bountyRoles.id, input.roleId));
      await logEvent(db, role.bountyId, "released", { roleId: role.id, actorUserId: ctx.user.id });
      return { ok: true };
    }),

  // ── Player: link a PR to a contribution bounty (-> in_review) ────────────
  linkPr: protectedProcedure
    .input(z.object({
      bountyId: z.number().int().positive(),
      prNumber: z.number().int().positive(),
      githubRepo: z.string().max(255).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const [bounty] = await db.select().from(bounties).where(eq(bounties.id, input.bountyId)).limit(1);
      if (!bounty) throw new TRPCError({ code: "NOT_FOUND" });
      if (bounty.sourceType !== "contribution") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only contribution bounties can link PRs" });
      }
      const [shipperRole] = await db
        .select()
        .from(bountyRoles)
        .where(and(
          eq(bountyRoles.bountyId, input.bountyId),
          eq(bountyRoles.role, "shipper"),
          eq(bountyRoles.userId, ctx.user.id),
        ))
        .limit(1);
      if (!shipperRole) throw new TRPCError({ code: "FORBIDDEN", message: "You must hold the shipper role" });
      const existing = (bounty.mergedPrNumbers as number[] | null) ?? [];
      const updated = [...new Set([...existing, input.prNumber])];
      await db.update(bounties).set({
        workStatus: "in_review",
        mergedPrNumbers: updated,
        githubRepo: input.githubRepo ?? bounty.githubRepo,
      }).where(eq(bounties.id, input.bountyId));
      await logEvent(db, input.bountyId, "pr_linked", {
        actorUserId: ctx.user.id,
        detail: { prNumber: input.prNumber },
      });
      return { ok: true };
    }),

  // ── Player: submit proof-of-work for a claimed call task (-> in_review) ────
  submitArtifact: protectedProcedure
    .use(rateLimited({ windowMs: 60_000, max: 10 }))
    .input(z.object({
      bountyId: z.number().int().positive(),
      artifactType: z.enum(["photo", "text", "link", "video"]),
      artifactUrl: z.string().url().max(1000).optional(),
      artifactText: z.string().max(5000).optional(),
      caption: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      if (!input.artifactUrl && !input.artifactText) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Add a link or a written summary of the work" });
      }
      const [bounty] = await db.select().from(bounties).where(eq(bounties.id, input.bountyId)).limit(1);
      if (!bounty) throw new TRPCError({ code: "NOT_FOUND" });
      if (bounty.sourceType !== "call_task") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only call tasks take work artifacts" });
      }
      if (bounty.workStatus !== "accepted" && bounty.workStatus !== "in_review") {
        throw new TRPCError({ code: "CONFLICT", message: `Task is ${bounty.workStatus}, not open for submission` });
      }
      // Caller must hold the filled doer role.
      const [doerRole] = await db.select().from(bountyRoles).where(and(
        eq(bountyRoles.bountyId, input.bountyId),
        eq(bountyRoles.role, "doer"),
        eq(bountyRoles.userId, ctx.user.id),
      )).limit(1);
      if (!doerRole) throw new TRPCError({ code: "FORBIDDEN", message: "Claim the task before submitting work" });

      await db.insert(bountyArtifacts).values({
        bountyId: input.bountyId,
        roleId: doerRole.id,
        userId: ctx.user.id,
        artifactType: input.artifactType,
        artifactUrl: input.artifactUrl ?? null,
        artifactText: input.artifactText ? sanitizeInput(input.artifactText) : null,
        caption: input.caption ? sanitizeInput(input.caption) : null,
      });
      await db.update(bounties).set({ workStatus: "in_review" }).where(eq(bounties.id, input.bountyId));
      await logEvent(db, input.bountyId, "artifact_submitted", {
        roleId: doerRole.id,
        actorUserId: ctx.user.id,
        detail: { artifactType: input.artifactType },
      });
      // Nudge the maintainer who accepted it that work is ready for review.
      if (bounty.approvedBy) {
        await db.insert(notifications).values({
          playerId: bounty.approvedBy,
          type: "mention",
          title: `Work ready for review: ${bounty.title.slice(0, 160)}`,
          body: "A contributor submitted work on a call task. Review it in the admin queue.",
          link: `/admin`,
        });
      }
      return { ok: true };
    }),

  // ── Maintainer: accept a proposal ─────────────────────────────────────────
  accept: maintainerProcedure
    .input(z.object({
      bountyId: z.number().int().positive(),
      tier: TierSchema.optional(),
      // The human consent on value: confirm/adjust the impact, flag hard-to-fill,
      // or override the computed amount with a logged reason. Then the amount locks.
      impactLevel: ImpactSchema.optional(),
      priorityBoost: z.boolean().optional(),
      overrideAmount: z.number().int().min(0).max(100000).optional(),
      overrideReason: z.string().max(500).optional(),
      completionChecklist: z.array(z.string().max(500)).max(20).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const [bounty] = await db.select().from(bounties).where(eq(bounties.id, input.bountyId)).limit(1);
      if (!bounty) throw new TRPCError({ code: "NOT_FOUND" });
      if (bounty.workStatus !== "proposed") {
        throw new TRPCError({ code: "CONFLICT", message: `Bounty is ${bounty.workStatus}, not proposed` });
      }
      // Accepter != proposer
      const [proposerRole] = await db
        .select({ userId: bountyRoles.userId })
        .from(bountyRoles)
        .where(and(eq(bountyRoles.bountyId, input.bountyId), eq(bountyRoles.role, "proposer")))
        .limit(1);
      if (proposerRole?.userId === ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot accept your own proposal" });
      }
      // Value the bounty through the deterministic engine and lock the breakdown.
      // Later weight or demand changes never touch an accepted bounty.
      const scopeTier = input.tier ?? bounty.tier;
      const priority = input.priorityBoost ?? Boolean(bounty.priorityBoost);
      const storedBreakdown = (bounty.valuationBreakdown as ValuationBreakdown | null) ?? null;
      let lockedBreakdown: ValuationBreakdown | null = null;
      if (scopeTier) {
        const impactLevel: ImpactLevel = input.impactLevel ?? storedBreakdown?.impactLevel ?? "normal";
        const computed = await computeBountyAmount({ scopeTier, impactLevel, priority, roleSlug: bounty.roleSlug });
        const finalAmount = input.overrideAmount != null ? input.overrideAmount : computed.amount;
        lockedBreakdown = input.overrideAmount != null
          ? { ...computed, amount: finalAmount, override: { by: ctx.user.id, reason: input.overrideReason ?? null, suggested: computed.amount } }
          : computed;
        const proposalFraction = await getGameVariable("bounty.proposal_fraction").catch(() => 0.15);
        const proposerAmount = Math.round(finalAmount * proposalFraction);
        const allRoles = await db.select().from(bountyRoles).where(eq(bountyRoles.bountyId, input.bountyId));
        for (const r of allRoles) {
          const newAmount = r.role === "proposer" ? proposerAmount : finalAmount;
          await db.update(bountyRoles).set({ amount: newAmount }).where(eq(bountyRoles.id, r.id));
        }
      }
      await db.update(bounties).set({
        workStatus: "accepted",
        approvedBy: ctx.user.id,
        tier: scopeTier ?? null,
        priorityBoost: priority,
        valuationBreakdown: lockedBreakdown
          ? (lockedBreakdown as unknown as Record<string, unknown>)
          : bounty.valuationBreakdown,
        completionChecklist: input.completionChecklist ? input.completionChecklist as unknown as null : bounty.completionChecklist,
      }).where(eq(bounties.id, input.bountyId));
      await logEvent(db, input.bountyId, "accepted", {
        actorUserId: ctx.user.id,
        detail: {
          tier: scopeTier,
          amount: lockedBreakdown?.amount ?? null,
          override: input.overrideAmount != null ? { suggested: lockedBreakdown?.override?.suggested ?? null, reason: input.overrideReason ?? null } : undefined,
        },
      });
      if (proposerRole?.userId) {
        await db.insert(notifications).values({
          playerId: proposerRole.userId,
          type: "mention",
          title: `Bounty accepted: ${bounty.title.slice(0, 180)}`,
          body: "Your bounty proposal was accepted and is now open for contributors.",
          link: `/bounties#bounty-${input.bountyId}`,
        });
      }
      return { ok: true };
    }),

  // ── Maintainer: decline a proposal ────────────────────────────────────────
  decline: maintainerProcedure
    .input(z.object({
      bountyId: z.number().int().positive(),
      reason: z.string().min(1).max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      await db.update(bounties).set({ workStatus: "declined", declinedReason: input.reason })
        .where(and(eq(bounties.id, input.bountyId), eq(bounties.workStatus, "proposed")));
      await logEvent(db, input.bountyId, "declined", { actorUserId: ctx.user.id, detail: { reason: input.reason } });
      return { ok: true };
    }),

  // ── Maintainer: admin queue ────────────────────────────────────────────────
  adminQueue: maintainerProcedure
    .input(z.object({
      filter: z.enum(["proposals", "held_payouts", "review", "all"]).default("proposals"),
      limit: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { bounties: [], heldRoles: [] };
      let pendingBounties: typeof bounties.$inferSelect[] = [];
      if (input.filter !== "held_payouts") {
        pendingBounties = await db
          .select()
          .from(bounties)
          .where(eq(bounties.workStatus, "proposed"))
          .orderBy(desc(bounties.createdAt))
          .limit(input.limit);
      }
      let heldRoles: Array<typeof bountyRoles.$inferSelect & { bounty: typeof bounties.$inferSelect | null }> = [];
      if (input.filter !== "proposals") {
        const held = await db
          .select()
          .from(bountyRoles)
          .where(eq(bountyRoles.payStatus, "held"))
          .orderBy(desc(bountyRoles.createdAt))
          .limit(input.limit);
        if (held.length > 0) {
          const bIds = [...new Set(held.map((r) => r.bountyId))];
          const bRows = await db.select().from(bounties).where(inArray(bounties.id, bIds));
          const bMap = new Map(bRows.map((b) => [b.id, b]));
          heldRoles = held.map((r) => ({ ...r, bounty: bMap.get(r.bountyId) ?? null }));
        }
      }
      // Call tasks awaiting maintainer review (doer submitted work).
      let reviewBounties: Array<typeof bounties.$inferSelect & {
        doer: typeof bountyRoles.$inferSelect | null;
        artifacts: typeof bountyArtifacts.$inferSelect[];
      }> = [];
      if (input.filter === "review" || input.filter === "all") {
        const inReview = await db
          .select()
          .from(bounties)
          .where(and(eq(bounties.workStatus, "in_review"), eq(bounties.sourceType, "call_task")))
          .orderBy(desc(bounties.updatedAt))
          .limit(input.limit);
        if (inReview.length > 0) {
          const ids = inReview.map((b) => b.id);
          const doerRows = await db.select().from(bountyRoles)
            .where(and(inArray(bountyRoles.bountyId, ids), eq(bountyRoles.role, "doer")));
          const artRows = await db.select().from(bountyArtifacts)
            .where(inArray(bountyArtifacts.bountyId, ids)).orderBy(desc(bountyArtifacts.createdAt));
          const doerByBounty = new Map(doerRows.map((r) => [r.bountyId, r]));
          const artsByBounty = new Map<number, typeof bountyArtifacts.$inferSelect[]>();
          for (const a of artRows) {
            const arr = artsByBounty.get(a.bountyId) ?? [];
            arr.push(a);
            artsByBounty.set(a.bountyId, arr);
          }
          reviewBounties = inReview.map((b) => ({
            ...b,
            doer: doerByBounty.get(b.id) ?? null,
            artifacts: artsByBounty.get(b.id) ?? [],
          }));
        }
      }
      return { bounties: pendingBounties, heldRoles, reviewBounties };
    }),

  // ── Maintainer: attach unmatched merge to a role ──────────────────────────
  resolvePending: maintainerProcedure
    .input(z.object({
      roleId: z.number().int().positive(),
      userId: z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const [role] = await db.select().from(bountyRoles).where(eq(bountyRoles.id, input.roleId)).limit(1);
      if (!role) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(bountyRoles).set({
        userId: input.userId,
        payStatus: "payable",
        filledByLog: [{ userId: input.userId, action: "admin_resolved", by: ctx.user.id, at: new Date().toISOString() }],
      }).where(eq(bountyRoles.id, input.roleId));
      await logEvent(db, role.bountyId, "resolved", { roleId: role.id, actorUserId: ctx.user.id, detail: { userId: input.userId } });
      const result = await payRole(role.id, { actorUserId: ctx.user.id });
      return { ok: result.ok, reason: result.reason };
    }),

  // ── Maintainer: release a held payout ─────────────────────────────────────
  consentAndPay: maintainerProcedure
    .input(z.object({ roleId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const [role] = await db.select().from(bountyRoles).where(eq(bountyRoles.id, input.roleId)).limit(1);
      if (!role) throw new TRPCError({ code: "NOT_FOUND" });
      if (role.payStatus !== "held") {
        throw new TRPCError({ code: "CONFLICT", message: "Role is not in held status" });
      }
      await db.update(bountyRoles).set({ payStatus: "payable" }).where(eq(bountyRoles.id, input.roleId));
      await logEvent(db, role.bountyId, "consented", { roleId: role.id, actorUserId: ctx.user.id });
      const result = await payRole(role.id, { actorUserId: ctx.user.id });
      return { ok: result.ok, reason: result.reason };
    }),

  // ── Reverser: reverse a payout during the settlement hold ─────────────────
  reverse: reverserProcedure
    .input(z.object({
      roleId: z.number().int().positive(),
      reason: z.string().min(1).max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await reverseRole(input.roleId, input.reason, ctx.user.id);
      if (!result.ok) {
        throw new TRPCError({ code: "CONFLICT", message: result.reason ?? "Reversal failed" });
      }
      return { ok: true };
    }),

  // ── Superadmin: grant maintainer permissions ───────────────────────────────
  grantMaintainer: superadminProcedure
    .input(z.object({
      userId: z.number().int().positive(),
      canAccept: z.boolean().default(true),
      canReverse: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      await db.insert(bountyPermissions).values({
        userId: input.userId,
        canAccept: input.canAccept ? 1 : 0,
        canReverse: input.canReverse ? 1 : 0,
        grantedBy: ctx.user.id,
        grantedAt: new Date(),
      }).onDuplicateKeyUpdate({
        set: {
          canAccept: input.canAccept ? 1 : 0,
          canReverse: input.canReverse ? 1 : 0,
          grantedBy: ctx.user.id,
          grantedAt: new Date(),
        },
      });
      return { ok: true };
    }),

  // ── Superadmin: revoke maintainer permissions ──────────────────────────────
  revokeMaintainer: superadminProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      await db.delete(bountyPermissions).where(eq(bountyPermissions.userId, input.userId));
      return { ok: true };
    }),

  // ── Superadmin: list empowered accounts ───────────────────────────────────
  listMaintainers: superadminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        userId: bountyPermissions.userId,
        canAccept: bountyPermissions.canAccept,
        canReverse: bountyPermissions.canReverse,
        grantedBy: bountyPermissions.grantedBy,
        grantedAt: bountyPermissions.grantedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(bountyPermissions)
      .leftJoin(users, eq(users.id, bountyPermissions.userId));
  }),

  // ── Player: my bounty permissions ─────────────────────────────────────────
  myPermissions: protectedProcedure.query(async ({ ctx }) => {
    const perm = await getBountyPermission(ctx.user.id);
    return { canAccept: !!perm?.canAccept, canReverse: !!perm?.canReverse };
  }),

  // ── Maintainer: get audit events for a bounty ─────────────────────────────
  getEvents: maintainerProcedure
    .input(z.object({ bountyId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(bountyEvents)
        .where(eq(bountyEvents.bountyId, input.bountyId))
        .orderBy(bountyEvents.createdAt);
    }),

  // ── Maintainer: manually complete a call task bounty ──────────────────────
  complete: maintainerProcedure
    .input(z.object({
      bountyId: z.number().int().positive(),
      doerUserId: z.number().int().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const [bounty] = await db.select().from(bounties).where(eq(bounties.id, input.bountyId)).limit(1);
      if (!bounty) throw new TRPCError({ code: "NOT_FOUND" });
      if (bounty.sourceType === "call_task" && input.doerUserId) {
        await db.update(bountyRoles).set({
          userId: input.doerUserId,
          payStatus: "payable",
        }).where(and(eq(bountyRoles.bountyId, input.bountyId), eq(bountyRoles.role, "doer")));
      } else {
        await db.update(bountyRoles).set({ payStatus: "payable" })
          .where(and(eq(bountyRoles.bountyId, input.bountyId), eq(bountyRoles.payStatus, "filled")));
      }
      await db.update(bounties).set({ workStatus: "completed" }).where(eq(bounties.id, input.bountyId));
      await logEvent(db, input.bountyId, "completed", { actorUserId: ctx.user.id });
      const payableRoles = await db
        .select()
        .from(bountyRoles)
        .where(and(eq(bountyRoles.bountyId, input.bountyId), eq(bountyRoles.payStatus, "payable")));
      const results = [];
      for (const r of payableRoles) {
        results.push(await payRole(r.id, { actorUserId: ctx.user.id }));
      }
      return { ok: true, payments: results };
    }),

  // ── Public: get a single bounty with roles ─────────────────────────────────
  get: publicProcedure
    .input(z.object({ bountyId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [bounty] = await db.select().from(bounties).where(eq(bounties.id, input.bountyId)).limit(1);
      if (!bounty) return null;
      const roles = await db.select().from(bountyRoles).where(eq(bountyRoles.bountyId, input.bountyId));
      const artifacts = await db.select().from(bountyArtifacts)
        .where(eq(bountyArtifacts.bountyId, input.bountyId)).orderBy(desc(bountyArtifacts.createdAt));
      const [enriched] = await enrichBounties(db, [bounty]);
      const tally = (await gratitudeTallyForBounties(db, [bounty.id])).get(bounty.id) ?? { total: 0, count: 0 };
      // sociocraticOverviewJson is already on the row; expose it under a stable name.
      return {
        ...enriched,
        roles,
        artifacts,
        sociocraticOverview: bounty.sociocraticOverviewJson ?? null,
        gratitude: tally,
      };
    }),

  // ── Player: the role slugs the viewer holds (for the "For your role" badge) ─
  myRoles: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [] as string[];
    const rows = await db
      .select({ roleSlug: roleHolders.roleSlug })
      .from(roleHolders)
      .where(and(eq(roleHolders.userId, ctx.user.id), eq(roleHolders.isActive, 1)));
    return [...new Set(rows.map((r) => r.roleSlug))];
  }),

  // ── Public: recently completed bounties, with doer + gratitude tally ───────
  recentCompleted: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(12) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      // Paid delivery roles (shipper for contributions, else doer), newest first.
      const paidRoles = await db
        .select()
        .from(bountyRoles)
        .where(and(inArray(bountyRoles.role, ["doer", "shipper"]), eq(bountyRoles.payStatus, "paid")))
        .orderBy(desc(bountyRoles.paidAt))
        .limit(input.limit);
      if (!paidRoles.length) return [];
      const bIds = [...new Set(paidRoles.map((r) => r.bountyId))];
      const bRows = await db.select().from(bounties).where(inArray(bounties.id, bIds));
      const enriched = await enrichBounties(db, bRows);
      const bMap = new Map(enriched.map((b) => [b.id, b]));
      const tally = await gratitudeTallyForBounties(db, bIds);

      const userIds = [...new Set(paidRoles.map((r) => r.userId).filter((x): x is number => x != null))];
      const doerMap = new Map<number, { userId: number; name: string | null; handle: string | null; avatarUrl: string | null; displayName: string | null }>();
      if (userIds.length) {
        const people = await db
          .select({
            id: users.id,
            name: users.name,
            handle: users.handle,
            displayName: playerProfiles.displayName,
            avatarUrl: playerProfiles.avatarUrl,
          })
          .from(users)
          .leftJoin(playerProfiles, eq(playerProfiles.userId, users.id))
          .where(inArray(users.id, userIds));
        for (const p of people) doerMap.set(p.id, { userId: p.id, name: p.name, handle: p.handle, avatarUrl: p.avatarUrl ?? null, displayName: p.displayName ?? null });
      }

      return paidRoles.map((r) => {
        const bounty = bMap.get(r.bountyId) ?? null;
        const doer = r.userId != null ? doerMap.get(r.userId) ?? null : null;
        return {
          bounty,
          role: r.role,
          amount: r.amount,
          paidAt: r.paidAt,
          doer,
          gratitude: tally.get(r.bountyId) ?? { total: 0, count: 0 },
        };
      });
    }),

  // ── Public: run the real valuation engine for the mechanics-page simulator ──
  // A server query, not client math, so the shown number can never drift from
  // what the engine actually computes.
  simulateValuation: publicProcedure
    .input(z.object({
      scopeTier: TierSchema,
      impactLevel: ImpactSchema,
      circle: z.string().max(128).optional(),
      priority: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      return await computeBountyAmount({
        scopeTier: input.scopeTier,
        impactLevel: input.impactLevel,
        priority: input.priority ?? false,
        circle: input.circle ?? null,
      });
    }),

  // ── Public: learned demand factors + season budget for the mechanics page ──
  valuationInfo: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { demandFactors: [], committed: 0, seasonBudget: null as number | null };
    const demandFactors = await db
      .select()
      .from(bountyDemandFactors)
      .orderBy(bountyDemandFactors.circle, bountyDemandFactors.scopeTier);
    const committed = await getCommittedEmission();
    let seasonBudget: number | null = null;
    try {
      const v = await getGameVariable("bounty.season_budget");
      seasonBudget = Number.isFinite(v) && v > 0 ? v : null;
    } catch { seasonBudget = null; }
    return { demandFactors, committed, seasonBudget };
  }),
});
