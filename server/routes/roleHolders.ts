/**
 * roleHolders router (Phase 1, Movement Coordination Engine).
 *
 * Admin-side read + update of who currently holds each sociocratic role
 * defined in `client/src/data/gameRoles.ts`. The seed script populates
 * rows with `userId = NULL`; Rye fills them via the admin form so a task
 * mentioned in a recorded call can route to a real person.
 *
 * No public read of userId here yet; that surface lives on the Team
 * page and the holder's profile in later phases.
 */
import { z } from "zod";
import { eq, asc, desc, or, like, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { roleHolders, users, roles, pendingMembers, roleAssignmentLog } from "../../drizzle/schema";
import { sendEmail, APP_BASE_URL } from "../_core/email";
import { nanoid } from "nanoid";

const TokenKind = z.enum(["game", "fund"]);

// Link any pending invites for this email to the now-real user: stamp the
// pending row accepted + point its roleHolders assignments at the user. Called
// on login (oauth email verify) and via the claimInvites fallback mutation.
export async function linkPendingMembersByEmail(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  userId: number,
  email: string,
): Promise<number> {
  const pend = await db
    .select()
    .from(pendingMembers)
    .where(and(eq(pendingMembers.email, email), eq(pendingMembers.status, "pending")));
  let linked = 0;
  for (const p of pend) {
    await db.update(pendingMembers)
      .set({ status: "accepted", userId, acceptedAt: new Date() })
      .where(eq(pendingMembers.id, p.id));
    await db.update(roleHolders)
      .set({ userId, pendingMemberId: null })
      .where(eq(roleHolders.pendingMemberId, p.id));
    linked += 1;
  }
  return linked;
}

export const roleHoldersRouter = router({
  // List every roleHolders row with the matched user (if any) for the
  // admin UI. Ordered kind then title so game-side roles render first.
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select({
        id: roleHolders.id,
        roleSlug: roleHolders.roleSlug,
        roleTitle: roleHolders.roleTitle,
        kind: roleHolders.kind,
        circle: roleHolders.circle,
        userId: roleHolders.userId,
        season: roleHolders.season,
        isActive: roleHolders.isActive,
        notifyEmail: roleHolders.notifyEmail,
        notifyInApp: roleHolders.notifyInApp,
        aliases: roleHolders.aliases,
        userName: users.name,
        userEmail: users.email,
        userHandle: users.handle,
        updatedAt: roleHolders.updatedAt,
      })
      .from(roleHolders)
      .leftJoin(users, eq(users.id, roleHolders.userId))
      .orderBy(asc(roleHolders.kind), asc(roleHolders.roleTitle));
    return rows;
  }),

  // Assign / unassign a holder. Pass userId=null to mark the role open.
  setHolder: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      userId: z.number().int().positive().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      let label: string | null = null;
      if (input.userId !== null) {
        // Verify the user exists before stamping the role holder row,
        // so the leftJoin in `list` never resolves to a ghost row.
        const [u] = await db.select({ id: users.id, name: users.name, email: users.email })
          .from(users).where(eq(users.id, input.userId)).limit(1);
        if (!u) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        label = u.name ?? u.email ?? `user ${input.userId}`;
      }
      const [row] = await db.select({ roleSlug: roleHolders.roleSlug })
        .from(roleHolders).where(eq(roleHolders.id, input.id)).limit(1);
      await db
        .update(roleHolders)
        .set({ userId: input.userId })
        .where(eq(roleHolders.id, input.id));
      if (row) {
        await db.insert(roleAssignmentLog).values({
          roleSlug: row.roleSlug,
          action: input.userId === null ? "removed" : "assigned",
          targetUserId: input.userId,
          targetLabel: label,
          actorUserId: ctx.user.id,
        });
      }
      return { ok: true };
    }),

  // Toggle notification preferences for a holder so a person who's
  // overloaded can mute in-app or email pings without losing the role.
  setNotificationPrefs: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      notifyEmail: z.boolean().optional(),
      notifyInApp: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const patch: Record<string, number> = {};
      if (input.notifyEmail !== undefined) patch.notifyEmail = input.notifyEmail ? 1 : 0;
      if (input.notifyInApp !== undefined) patch.notifyInApp = input.notifyInApp ? 1 : 0;
      if (Object.keys(patch).length === 0) return { ok: true };
      await db
        .update(roleHolders)
        .set(patch)
        .where(eq(roleHolders.id, input.id));
      return { ok: true };
    }),

  // Update circle / season / kind / active flag. Useful when a role
  // moves between game-side and fund-side or rotates by season.
  updateMeta: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      kind: TokenKind.optional(),
      circle: z.string().max(128).nullable().optional(),
      season: z.string().max(50).nullable().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const patch: Record<string, unknown> = {};
      if (input.kind !== undefined) patch.kind = input.kind;
      if (input.circle !== undefined) patch.circle = input.circle;
      if (input.season !== undefined) patch.season = input.season;
      if (input.isActive !== undefined) patch.isActive = input.isActive ? 1 : 0;
      if (Object.keys(patch).length === 0) return { ok: true };
      await db
        .update(roleHolders)
        .set(patch)
        .where(eq(roleHolders.id, input.id));
      return { ok: true };
    }),

  // Admin-side user lookup by email or handle, used by the assign UI
  // in AdminRoleHoldersTab. Returns at most 8 matches; the query must
  // be at least 2 characters so we never list everyone on an empty box.
  findUsers: adminProcedure
    .input(z.object({ q: z.string().min(2).max(120) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const needle = `%${input.q}%`;
      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          handle: users.handle,
        })
        .from(users)
        .where(or(like(users.email, needle), like(users.handle, needle), like(users.name, needle)))
        .limit(8);
      return rows;
    }),

  // Replace the aliases list (the LLM matches transcript text against
  // these alongside roleTitle to attribute a task to the right role).
  setAliases: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      aliases: z.array(z.string().min(1).max(80)).max(20),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      await db
        .update(roleHolders)
        .set({ aliases: input.aliases })
        .where(eq(roleHolders.id, input.id));
      return { ok: true };
    }),

  // Coverage summary: filled vs total active roles, and which circles are
  // entirely uncovered, so gaps are visible at a glance.
  coverage: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, filled: 0, open: 0, uncoveredCircles: [] as string[] };
    const rows = await db.select({
      circle: roleHolders.circle,
      userId: roleHolders.userId,
      pendingMemberId: roleHolders.pendingMemberId,
    }).from(roleHolders).where(eq(roleHolders.isActive, 1));
    const total = rows.length;
    const filled = rows.filter((r) => r.userId !== null || r.pendingMemberId !== null).length;
    const circleFilled = new Map<string, boolean>();
    for (const r of rows) {
      const c = r.circle ?? "Unassigned";
      const has = r.userId !== null || r.pendingMemberId !== null;
      circleFilled.set(c, (circleFilled.get(c) ?? false) || has);
    }
    const uncoveredCircles = [...circleFilled.entries()].filter(([, has]) => !has).map(([c]) => c);
    return { total, filled, open: total - filled, uncoveredCircles };
  }),

  // Pending (invited-but-not-yet-joined) members.
  listPending: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(pendingMembers).orderBy(asc(pendingMembers.status), asc(pendingMembers.createdAt));
  }),

  // Invite a new member by name + email: create a pending profile, optionally
  // assign to a role immediately, and email a magic sign-in link. On login the
  // pending profile links to the real account (see linkPendingMembersByEmail).
  invite: adminProcedure
    .input(z.object({
      name: z.string().min(1).max(160),
      email: z.string().email().max(255),
      roleHolderId: z.number().int().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const token = nanoid(32);
      const [res] = await db.insert(pendingMembers).values({
        name: input.name,
        email: input.email.toLowerCase(),
        inviteToken: token,
        status: "pending",
        invitedBy: ctx.user.id,
      });
      const pendingId = (res as unknown as { insertId: number }).insertId;

      if (input.roleHolderId) {
        const [rh] = await db.select({ roleSlug: roleHolders.roleSlug })
          .from(roleHolders).where(eq(roleHolders.id, input.roleHolderId)).limit(1);
        if (rh) {
          await db.update(roleHolders).set({ pendingMemberId: pendingId }).where(eq(roleHolders.id, input.roleHolderId));
          await db.insert(roleAssignmentLog).values({
            roleSlug: rh.roleSlug, action: "invited", targetPendingId: pendingId, targetLabel: input.name, actorUserId: ctx.user.id,
          });
        }
      }

      const signInUrl = `${APP_BASE_URL}/signin?invite=${token}`;
      await sendEmail({
        to: [input.email],
        subject: "You're invited to ReGen Civics",
        html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
          <h2 style="color:#1a472a">You're invited, ${input.name.replace(/[<>]/g, "")}</h2>
          <p style="color:#444;line-height:1.6">You've been invited to hold a role in ReGen Civics. Sign in with this email to accept and pick up your role.</p>
          <p><a href="${signInUrl}" style="display:inline-block;background:#1a472a;color:#7dd87d;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Accept your invite</a></p>
          <p style="color:#888;font-size:12px">If you didn't expect this, you can ignore it.</p>
        </div>`,
        template: "role_invite",
      }).catch(() => { /* email failure must not lose the invite record */ });

      return { ok: true, pendingId };
    }),

  // Assign an existing pending member to a role.
  assignPending: adminProcedure
    .input(z.object({ roleHolderId: z.number().int().positive(), pendingMemberId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const [p] = await db.select().from(pendingMembers).where(eq(pendingMembers.id, input.pendingMemberId)).limit(1);
      if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Pending member not found" });
      const [rh] = await db.select({ roleSlug: roleHolders.roleSlug }).from(roleHolders).where(eq(roleHolders.id, input.roleHolderId)).limit(1);
      if (!rh) throw new TRPCError({ code: "NOT_FOUND", message: "Role holder row not found" });
      if (p.status === "accepted" && p.userId) {
        await db.update(roleHolders).set({ userId: p.userId, pendingMemberId: null }).where(eq(roleHolders.id, input.roleHolderId));
      } else {
        await db.update(roleHolders).set({ pendingMemberId: input.pendingMemberId }).where(eq(roleHolders.id, input.roleHolderId));
      }
      await db.insert(roleAssignmentLog).values({
        roleSlug: rh.roleSlug, action: "invited", targetPendingId: input.pendingMemberId, targetLabel: p.name, actorUserId: ctx.user.id,
      });
      return { ok: true };
    }),

  // Recent role-assignment audit log (who assigned/removed/invited, when).
  auditLog: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(30) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(roleAssignmentLog).orderBy(desc(roleAssignmentLog.createdAt)).limit(input?.limit ?? 30);
    }),

  // The authed user claims any invites sent to their email. This is the fallback
  // for the auto-link on login; safe to call repeatedly.
  claimInvites: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
    const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
    if (!u?.email) return { linked: 0 };
    const linked = await linkPendingMembersByEmail(db, ctx.user.id, u.email);
    return { linked };
  }),
});
