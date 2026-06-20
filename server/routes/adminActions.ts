/**
 * adminActions: the executive-assistant action registry.
 *
 * A typed catalog of admin actions the AI assistant (or the Overview's
 * recommended-action chips) can execute on the CEO's behalf. Every action
 * declares a safety tier:
 *
 *   - "safe"    reversible, low-stakes (status flips, archives, toggles). Runs
 *               immediately.
 *   - "confirm" meaningful side effects (pipeline moves that may trigger
 *               follow-up). Requires `confirmed: true`.
 *   - "blocked" irreversible / high-stakes (deletes, bans, money, mass email,
 *               public broadcasts). Never executed here; the EA must hand these
 *               back to a human. This is the hard safety floor.
 *
 * Every execution is written to the admin audit log, and reversible actions
 * return an `undo` descriptor the client can replay via the `undo` mutation.
 *
 * Extend by adding entries to ACTIONS, each wired to an existing, verified db
 * helper. Keep new high-stakes actions at tier "blocked" unless explicitly
 * designed to be reversible.
 */
import { adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { toggleBannerActive } from "../bannerHelpers";

type Tier = "safe" | "confirm" | "blocked";

interface ActionResult {
  summary: string;
  undo?: { actionId: string; input: Record<string, unknown> };
}

interface ActionDef {
  id: string;
  label: string;
  tier: Tier;
  description: string;
  input: z.ZodTypeAny;
  run: (input: any, ctx: { adminUserId: number }) => Promise<ActionResult>;
}

const ACTIONS: ActionDef[] = [
  {
    id: "inquiry_mark_reviewed",
    label: "Mark inquiry reviewed",
    tier: "safe",
    description: "Set a general inquiry's status to contacted. Reversible.",
    input: z.object({ id: z.number().int().positive() }),
    run: async ({ id }) => {
      const all = await db.getAllGeneralInquiries();
      const prevStatus = ((all.find((i) => i.id === id)?.status as string) ?? "new");
      await db.updateGeneralInquiry(id, { status: "contacted" as never });
      return {
        summary: `Inquiry #${id} marked reviewed.`,
        undo: { actionId: "inquiry_set_status", input: { id, status: prevStatus } },
      };
    },
  },
  {
    id: "inquiry_archive",
    label: "Archive inquiry",
    tier: "safe",
    description: "Archive a general inquiry. Reversible.",
    input: z.object({ id: z.number().int().positive() }),
    run: async ({ id }) => {
      const all = await db.getAllGeneralInquiries();
      const prevStatus = ((all.find((i) => i.id === id)?.status as string) ?? "new");
      await db.updateGeneralInquiry(id, { status: "archived" as never });
      return {
        summary: `Inquiry #${id} archived.`,
        undo: { actionId: "inquiry_set_status", input: { id, status: prevStatus } },
      };
    },
  },
  {
    id: "inquiry_set_status",
    label: "Set inquiry status",
    tier: "safe",
    description: "Set a general inquiry to a specific status. Backs undo.",
    input: z.object({ id: z.number().int().positive(), status: z.string().max(40) }),
    run: async ({ id, status }) => {
      await db.updateGeneralInquiry(id, { status: status as never });
      return { summary: `Inquiry #${id} status set to ${status}.` };
    },
  },
  {
    id: "investor_set_status",
    label: "Set investor pipeline stage",
    tier: "confirm",
    description: "Move an investor inquiry to a new stage. May prompt follow-up, so confirm first. Reversible.",
    input: z.object({ id: z.number().int().positive(), status: z.string().max(40) }),
    run: async ({ id, status }) => {
      const all = await db.getAllInvestorInquiries();
      const prevStatus = ((all.find((i) => i.id === id)?.status as string) ?? "new");
      await db.updateInvestorInquiry(id, { status: status as never });
      return {
        summary: `Investor #${id} moved to ${status}.`,
        undo: { actionId: "investor_set_status", input: { id, status: prevStatus } },
      };
    },
  },
  {
    id: "banner_toggle",
    label: "Toggle site banner",
    tier: "safe",
    description: "Turn a site banner on or off. Reversible.",
    input: z.object({ key: z.string().max(80) }),
    run: async ({ key }) => {
      const result = await toggleBannerActive(key);
      return {
        summary: `Banner '${key}' is now ${result?.isActive ? "active" : "inactive"}.`,
        undo: { actionId: "banner_toggle", input: { key } },
      };
    },
  },
];

const ACTION_MAP = new Map(ACTIONS.map((a) => [a.id, a]));

function adminId(ctx: { user?: { id?: number } }): number {
  const id = ctx.user?.id;
  if (!id) throw new TRPCError({ code: "FORBIDDEN", message: "Admin identity required." });
  return id;
}

export const adminActionsRouter = router({
  // Catalog the EA / UI can read to know what it may execute.
  list: adminProcedure.query(() =>
    ACTIONS.map((a) => ({ id: a.id, label: a.label, tier: a.tier, description: a.description })),
  ),

  // Execute an action. Honors the safety tier and writes to the audit log.
  execute: adminProcedure
    .input(z.object({ actionId: z.string(), input: z.record(z.string(), z.any()).default({}), confirmed: z.boolean().optional() }))
    .mutation(async ({ input, ctx }) => {
      const def = ACTION_MAP.get(input.actionId);
      if (!def) throw new TRPCError({ code: "NOT_FOUND", message: `Unknown action: ${input.actionId}` });

      if (def.tier === "blocked") {
        throw new TRPCError({ code: "FORBIDDEN", message: `${def.label} is high-stakes and must be done by a human.` });
      }
      if (def.tier === "confirm" && !input.confirmed) {
        return { ok: false as const, needsConfirm: true, label: def.label, description: def.description };
      }

      const parsed = def.input.safeParse(input.input);
      if (!parsed.success) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid action input." });
      }

      const adminUserId = adminId(ctx);
      const result = await def.run(parsed.data, { adminUserId });

      await db.logAdminAction({
        adminUserId,
        action: `ea_execute:${def.id}`,
        description: result.summary,
        metadata: { input: parsed.data, tier: def.tier },
      });

      return { ok: true as const, summary: result.summary, undo: result.undo ?? null };
    }),

  // Replay a reversible action's undo descriptor.
  undo: adminProcedure
    .input(z.object({ actionId: z.string(), input: z.record(z.string(), z.any()).default({}) }))
    .mutation(async ({ input, ctx }) => {
      const def = ACTION_MAP.get(input.actionId);
      if (!def || def.tier === "blocked") {
        throw new TRPCError({ code: "FORBIDDEN", message: "This action cannot be undone here." });
      }
      const parsed = def.input.safeParse(input.input);
      if (!parsed.success) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid undo input." });

      const adminUserId = adminId(ctx);
      const result = await def.run(parsed.data, { adminUserId });
      await db.logAdminAction({ adminUserId, action: `ea_undo:${def.id}`, description: result.summary });
      return { ok: true as const, summary: result.summary };
    }),

  // Self-learning, phase 3 seed: read the audit log and surface actions the
  // team runs often enough to be worth turning into a standing automation.
  // Read-only; no new tables. Threshold-gated so it only fires on real habits.
  suggestAutomations: adminProcedure.query(async () => {
    const log = await db.getAdminAuditLog({ limit: 500 });
    const counts = new Map<string, number>();
    for (const row of log) {
      const action = (row as { action?: string }).action;
      if (typeof action === "string" && action.startsWith("ea_execute:")) {
        const id = action.slice("ea_execute:".length);
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .filter(([, c]) => c >= 3)
      .map(([id, count]) => {
        const def = ACTION_MAP.get(id);
        return { actionId: id, label: def?.label ?? id, tier: def?.tier ?? "safe", count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }),
});
