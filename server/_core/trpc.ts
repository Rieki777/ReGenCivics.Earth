import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { validateCSRFToken } from "./security";
import { cacheGet, cacheSet, isCacheAvailable } from "../cache";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;

/**
 * Per-procedure rate limit middleware. Buckets by (procedure path, userId|ip).
 *
 * Use this instead of Express path-based rate limiting for tRPC routes,
 * because the httpBatchLink can pack multiple procedures into a single HTTP
 * request whose URL is `/api/trpc/proc1,proc2`. Path prefix matching at the
 * Express layer can be bypassed when the rate-limited procedure is not first.
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
    const now = Date.now();
    const windowSec = Math.ceil(opts.windowMs / 1000);

    const reject = () => {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests, please slow down.',
      });
    };

    if (isCacheAvailable()) {
      try {
        const current = await cacheGet<{ count: number; resetTime: number }>(key);
        if (current && now < current.resetTime) {
          if (current.count >= opts.max) reject();
          await cacheSet(key, { count: current.count + 1, resetTime: current.resetTime }, windowSec);
        } else {
          await cacheSet(key, { count: 1, resetTime: now + opts.windowMs }, windowSec);
        }
        return next();
      } catch {
        // fall through to in-memory fallback
      }
    }

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
      if (!csrfHeader || !validateCSRFToken(sessionId, csrfHeader)) {
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

    if (!ctx.user || (ctx.user.role !== 'admin' && ctx.user.role !== 'superadmin')) {
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
