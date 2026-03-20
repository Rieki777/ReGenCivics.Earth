import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { validateCSRFToken } from "./security";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;

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

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
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

export const superadminProcedure = t.procedure.use(
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
