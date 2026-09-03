import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { validateCSRFToken } from "./security";
import { ENV } from "./env";
import { isCacheAvailable, redisRateLimit } from "../cache";
import { getBountyPermission } from "../db/bounties";
import { isAdminRole } from "@shared/adminRole";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;

/**
 * Per-procedure rate limit middleware. Buckets by (procedure path, userId|ip).
 *
 * Per-procedure: tRPC's `t.middleware` runs once per procedure invocation,
 * including for each entry in a batched `httpBatchLink` request. So a
 * client batching `forum.createPost,forum.createPost,...` into one HTTP
 * request triggers this middleware once per repeat, not once per request.
 *
 * Atomic via Redis sorted-set: `redisRateLimit` uses ZADD/ZCARD inside a
 * MULTI so concurrent batch entries cannot race the count read/write. The
 * earlier get-then-set implementation was racey under batched fire (two
 * concurrent calls both read count=0, both wrote count=1, bypass).
 *
 * In-memory fallback (no Redis) uses a per-key counter on the single
 * Node thread; the if/then/else block runs atomically per event-loop tick
 * since there's no true preemption in JS. Good enough for development.
 *
 * Example:
 *   submit: protectedProcedure
 *     .use(rateLimited({ windowMs: 60_000, max: 5 }))
 *     .mutation(...)
 */
const rateLimitFallback = new Map<string, { count: number; resetTime: number }>();
export function rateLimited(opts: { windowMs: number; max: number }) {
  return t.middleware(async ({ ctx, path, next }) => {
    const userId = ctx.user?.id;
    const bucket = userId ? `u:${userId}` : `ip:${ctx.req?.ip || 'unknown'}`;
    const key = `trpc-rl:${path}:${bucket}`;

    const reject = () => {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests, please slow down.',
      });
    };

    if (isCacheAvailable()) {
      const { allowed } = await redisRateLimit(key, opts.max, opts.windowMs);
      if (!allowed) reject();
      return next();
    }

    const now = Date.now();
    const record = rateLimitFallback.get(key);
    if (record && now < record.resetTime) {
      if (record.count >= opts.max) reject();
      record.count++;
    } else {
      rateLimitFallback.set(key, { count: 1, resetTime: now + opts.windowMs });
    }
    return next();
  });
}

/**
 * CSRF validation middleware for mutations.
 * Reads the x-csrf-token header and the session_id cookie,
 * then validates the token. Throws FORBIDDEN if invalid.
 */
const csrfProtection = t.middleware(async ({ ctx, next, type }) => {
  if (type === "mutation") {
    const req = ctx.req;
    const csrfHeader = req.headers["x-csrf-token"] as string | undefined;
    const sessionId = req.cookies?.["session_id"] as string | undefined;

    // Only enforce CSRF when a session cookie is present.
    // Without a session cookie there is no credential to hijack, so no CSRF risk.
    // This also allows server-to-server calls and test contexts that have no cookie.
    if (sessionId) {
      if (!csrfHeader || !(await validateCSRFToken(sessionId, csrfHeader))) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Invalid or missing CSRF token",
        });
      }
    }
  }
  return next();
});

export const publicProcedure = t.procedure.use(csrfProtection);

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Chain CSRF protection into all authenticated procedures so mutations on
// protected/admin/superadmin endpoints are also validated.
export const protectedProcedure = t.procedure.use(csrfProtection).use(requireUser);

export const adminProcedure = t.procedure.use(csrfProtection).use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || !isAdminRole(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

export const superadminProcedure = t.procedure.use(csrfProtection).use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'superadmin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

/**
 * Owner procedure: Rye and only Rye. Deliberately NOT adminProcedure (that
 * passes for any admin or superadmin); Harvest captures are the owner's
 * private data. Compares ctx.user.id to ENV.ownerUserId and fails closed
 * when OWNER_USER_ID is unset, so a missing env var can never widen access.
 */
export const ownerProcedure = t.procedure.use(csrfProtection).use(requireUser).use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ENV.ownerUserId || ctx.user!.id !== ENV.ownerUserId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Owner access required" });
    }
    return next({ ctx: { ...ctx, user: ctx.user! } });
  }),
);

/**
 * Maintainer procedure: requires canAccept in bounty_permissions.
 * Any signed-in user empowered by the owner to accept/decline proposals.
 */
export const maintainerProcedure = t.procedure.use(csrfProtection).use(requireUser).use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    const perm = await getBountyPermission(ctx.user!.id);
    if (!perm || !perm.canAccept) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Bounty maintainer access required" });
    }
    return next({ ctx: { ...ctx, user: ctx.user! } });
  }),
);

/**
 * Reverser procedure: requires canReverse in bounty_permissions.
 * Used for reversing payouts during the settlement hold window.
 */
export const reverserProcedure = t.procedure.use(csrfProtection).use(requireUser).use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    const perm = await getBountyPermission(ctx.user!.id);
    if (!perm || !perm.canReverse) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Bounty reverser access required" });
    }
    return next({ ctx: { ...ctx, user: ctx.user! } });
  }),
);
