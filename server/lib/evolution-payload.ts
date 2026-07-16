/**
 * Canonical shape schema for Evolution Engine execution payloads.
 *
 * Used twice: at raise time (assembly.raiseFromThread) and again at
 * execution time (dispatchExecution), so a payload that round-trips through
 * the proposals table is structurally re-checked before the engine acts on
 * it, no matter which path wrote it.
 *
 * Deliberately a leaf module: zod only, no imports from db/evolution, so any
 * server module can consume it without creating an import cycle.
 */
import { z } from "zod";

export const executionPayloadSchema = z.union([
  z.object({
    kind: z.literal("variable_change"),
    variableKey: z.string().min(3).max(120),
    newValue: z.number(),
  }),
  z.object({
    kind: z.literal("bounds_change"),
    variableKey: z.string().min(3).max(120),
    newMin: z.number(),
    newMax: z.number(),
  }),
  z.object({
    kind: z.literal("feature"),
    specMarkdown: z.string().min(20).max(20000),
    acceptanceCriteria: z.array(z.string().min(3).max(300)).min(1).max(20),
    scopePaths: z.array(z.string().min(1).max(200)).min(1).max(40),
  }),
]);

export type ExecutionPayloadShape = z.infer<typeof executionPayloadSchema>;
