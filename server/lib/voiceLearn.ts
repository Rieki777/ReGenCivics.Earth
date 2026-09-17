/**
 * Outbound Write → voice_rules learning bridge.
 *
 * Harvest already learns via processEdit on creation_items edits.
 * Outbound letters have no ai_body column; the Write UI passes the last
 * AI-applied draft body. We reuse extractRules + storeRules (same path as
 * Harvest / loadTopRules) with fail-soft try/catch so send/save never breaks.
 */
import { ENV } from "../_core/env";
import { logger } from "../_core/logger";
import {
  extractRules,
  isLargeRewrite,
  storeRules,
} from "./voice-learning";

const log = logger("voice-learn");

export type LearnFromOutboundResult =
  | { ok: true; stored: number }
  | { ok: false; skipped: string };

/**
 * Extract style rules from AI draft vs final outbound body and upsert into
 * voice_rules (near-duplicate reinforcement + decay via storeRules).
 */
export async function learnFromOutboundEdit(params: {
  ownerId?: number | null;
  aiDraftBody: string;
  finalBody: string;
  /** Default style — large rewrites are forced to content (no learn). */
  editKind?: "style" | "content";
}): Promise<LearnFromOutboundResult> {
  try {
    const ownerId = params.ownerId ?? ENV.ownerUserId ?? null;
    if (!ownerId) return { ok: false, skipped: "no_owner" };

    const ai = (params.aiDraftBody ?? "").trim();
    const final = (params.finalBody ?? "").trim();
    if (!ai || !final) return { ok: false, skipped: "empty" };
    if (ai === final) return { ok: false, skipped: "no_diff" };

    let editKind = params.editKind ?? "style";
    if (editKind === "style" && isLargeRewrite(ai, final)) {
      log.info("outbound edit forced to content (large rewrite)");
      editKind = "content";
    }
    if (editKind !== "style") return { ok: false, skipped: "content_edit" };

    const candidates = await extractRules(ai, final);
    const stored = await storeRules(ownerId, candidates);
    log.info(`outbound learn: ${candidates.length} candidates, ${stored} stored`);
    return { ok: true, stored };
  } catch (err) {
    log.warn("learnFromOutboundEdit failed (fail-soft)", err);
    return { ok: false, skipped: "error" };
  }
}

/** Fire-and-forget wrapper for route handlers. */
export function fireOutboundVoiceLearn(opts: {
  ownerId: number;
  aiDraftBody?: string | null;
  finalBody: string;
}): void {
  const ai = opts.aiDraftBody?.trim();
  if (!ai || ai === opts.finalBody.trim()) return;
  void learnFromOutboundEdit({
    ownerId: opts.ownerId,
    aiDraftBody: ai,
    finalBody: opts.finalBody,
  }).catch(() => undefined);
}
