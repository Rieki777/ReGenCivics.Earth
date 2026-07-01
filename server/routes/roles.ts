/**
 * Roles catalog router. The `roles` table is the source of truth for the
 * sociocratic roles (seeded from client/src/data/gameRoles.ts via
 * scripts/seed-roles.ts). The Team page reads `list`; admin edits via CRUD.
 * slug is derived from title and matches roleHolders.roleSlug.
 */
import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { roles } from "../../drizzle/schema";
import { asc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

const RoleInput = z.object({
  title: z.string().min(1).max(128),
  characterName: z.string().max(128).optional(),
  tagline: z.string().max(500).optional(),
  emoji: z.string().max(16).optional(),
  circle: z.string().max(128).optional(),
  kind: z.enum(["game", "fund"]).default("game"),
  purpose: z.string().max(5000).optional(),
  band: z.number().int().min(0).max(20).optional(),
  tokenAward: z.string().max(128).optional(),
  maxTokenAward: z.string().max(128).optional(),
  hoursPerWeek: z.number().int().min(0).max(80).optional(),
  assignment: z.string().max(255).optional(),
  color: z.string().max(32).optional(),
  characterImage: z.string().max(512).optional(),
  sceneImage: z.string().max(512).optional(),
  aliases: z.array(z.string().max(80)).max(30).optional(),
  powers: z.array(z.string().max(500)).max(30).optional(),
  rights: z.array(z.string().max(500)).max(30).optional(),
  responsibilities: z.array(z.string().max(500)).max(30).optional(),
  deliverables: z.array(z.string().max(500)).max(30).optional(),
  seasons: z.array(z.string().max(40)).max(8).optional(),
});

export const rolesRouter = router({
  // Public: the active role catalog for the Team page + anywhere roles render.
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(roles).where(eq(roles.active, 1)).orderBy(asc(roles.kind), asc(roles.band));
  }),

  // Admin: every role including deactivated.
  adminList: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(roles).orderBy(asc(roles.kind), asc(roles.band));
  }),

  create: adminProcedure.input(RoleInput).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
    const slug = toSlug(input.title);
    if (!slug) throw new TRPCError({ code: "BAD_REQUEST", message: "Title produces an empty slug" });
    const [existing] = await db.select({ id: roles.id }).from(roles).where(eq(roles.slug, slug)).limit(1);
    if (existing) throw new TRPCError({ code: "CONFLICT", message: "A role with that slug already exists" });
    await db.insert(roles).values({ ...input, slug, active: 1 });
    return { ok: true, slug };
  }),

  update: adminProcedure
    .input(z.object({ slug: z.string().max(64), patch: RoleInput.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const [existing] = await db.select({ id: roles.id }).from(roles).where(eq(roles.slug, input.slug)).limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(roles).set(input.patch).where(eq(roles.slug, input.slug));
      return { ok: true };
    }),

  setActive: adminProcedure
    .input(z.object({ slug: z.string().max(64), active: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      await db.update(roles).set({ active: input.active ? 1 : 0 }).where(eq(roles.slug, input.slug));
      return { ok: true };
    }),
});
