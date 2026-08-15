/**
 * Governance fork registry (ADR-46): which forks of the village platform the
 * hub relays on-chain governance outcomes to.
 *
 * A fork registers with its name, callback URL (its
 * /api/webhooks/mechanics-governance receiver) and the shared secret its
 * founder set as GOVERNANCE_HUB_SECRET / Admin → Integrations on their side.
 * The relay itself lives in server/lib/hypha-bridge/fork-relay.ts and is
 * driven by the Alchemy webhook; this router only manages the roster.
 *
 * Secrets: write-only toward the client. List responses mask to last4 — the
 * hub needs the value to SIGN deliveries, admins only need to recognize it.
 */
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { adminProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { governanceForkRelays, governanceRelayDeliveries } from "../../drizzle/schema";
import { flushForkRelays } from "../lib/hypha-bridge/fork-relay";

const mask = (secret: string) => (secret.length > 4 ? `…${secret.slice(-4)}` : "…");

export const governanceForksRouter = router({
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(governanceForkRelays).orderBy(desc(governanceForkRelays.createdAt));
    return rows.map((f: any) => ({
      id: f.id,
      instanceId: f.instanceId,
      name: f.name,
      callbackUrl: f.callbackUrl,
      secretLast4: mask(f.secret),
      active: f.active,
      createdAt: f.createdAt,
      lastRelayAt: f.lastRelayAt,
      lastStatus: f.lastStatus,
    }));
  }),

  register: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120),
        callbackUrl: z.string().url().startsWith("https://", "Fork callbacks must be https"),
        secret: z.string().min(16, "Use at least 16 characters — this signs governance outcomes"),
        instanceId: z.string().max(80).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No database" });
      await db.insert(governanceForkRelays).values({
        name: input.name,
        callbackUrl: input.callbackUrl,
        secret: input.secret,
        instanceId: input.instanceId ?? null,
      });
      return { ok: true };
    }),

  setActive: adminProcedure
    .input(z.object({ id: z.number(), active: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No database" });
      await db
        .update(governanceForkRelays)
        .set({ active: input.active })
        .where(eq(governanceForkRelays.id, input.id));
      return { ok: true };
    }),

  /** Undelivered + recent deliveries for one fork — the operator's view of
   *  whether outcomes are actually arriving. */
  deliveries: adminProcedure
    .input(z.object({ forkId: z.number(), limit: z.number().min(1).max(200).default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(governanceRelayDeliveries)
        .where(and(eq(governanceRelayDeliveries.forkId, input.forkId)))
        .orderBy(desc(governanceRelayDeliveries.createdAt))
        .limit(input.limit);
    }),

  /** Manual flush — an operator retrying a stuck queue without waiting for
   *  the next on-chain event to tick it. */
  flush: adminProcedure.mutation(async () => flushForkRelays()),
});
