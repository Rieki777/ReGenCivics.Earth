/**
 * Hypha Bridge: the single module every ReGen Civics -> Hypha handoff goes through.
 *
 * Public API:
 *   - createHyphaBridge(payload)         create a new bridge row, get key + URL
 *   - bridgeToHypha(intentName, payload) convenience wrapper that uses a known intent
 *   - getBridge(bridgeKey)               read a bridge by its short key
 *   - markBridgeHandoffSent(bridgeKey)   update status when the user clicks Continue
 *   - buildHyphaTargetUrl(bridge)        construct the app.hypha.earth URL with marker
 *
 * Rule (enforced by CLAUDE.md): never construct an `app.hypha.earth` URL anywhere
 * outside this module. New touchpoints add a new intent in `intents.ts` and call
 * one of the public functions above.
 */
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { hyphaBridges } from "../../../drizzle/schema";
import type {
  HyphaBridgePayload,
  CreateBridgeResult,
  HyphaBridgeStatus,
} from "./types";
import { KNOWN_INTENTS, type IntentName } from "./intents";
import { buildTitleWithMarker, payloadToSearchParams } from "./prefill";

const HYPHA_APP_BASE = process.env.HYPHA_APP_BASE_URL ?? "https://app.hypha.earth";
const REGEN_CIVICS_BASE = process.env.PUBLIC_BASE_URL ?? "https://regencivics.earth";

/** kebab-case form kind for Hypha URL segments. The DB stores underscores. */
const FORM_KIND_URL: Record<string, string> = {
  propose_contribution: "propose-contribution",
  deploy_funds: "deploy-funds",
  pay_for_expenses: "pay-for-expenses",
  membership_exit: "membership-exit",
  buy_hypha_tokens: "buy-hypha-tokens",
  redeem_tokens: "redeem-tokens",
  activate_spaces: "activate-spaces",
  change_entry_method: "change-entry-method",
  change_voting_method: "change-voting-method",
  space_settings_transparency: "space-settings-transparency",
  space_to_space_membership: "space-to-space-membership",
};

/** 8-char base32 key. ~40 bits of entropy is plenty for the bridge use case. */
function generateBridgeKey(): string {
  const bytes = crypto.randomBytes(5);
  // Crockford base32 alphabet without I, L, O, U for readability
  const alphabet = "0123456789abcdefghjkmnpqrstvwxyz";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += alphabet[bytes[i % bytes.length] % alphabet.length];
  }
  return out;
}

/** Create a new Hypha Bridge row and return its key + bridge page URL. */
export async function createHyphaBridge(payload: HyphaBridgePayload): Promise<CreateBridgeResult> {
  const db = await getDb();
  if (!db) throw new Error("Hypha Bridge: database unavailable");

  // Retry on the rare base32 collision
  for (let attempt = 0; attempt < 5; attempt++) {
    const bridgeKey = generateBridgeKey();
    try {
      await db.insert(hyphaBridges).values({
        bridgeKey,
        source: payload.source,
        sourceId: payload.sourceId,
        targetDhoSlug: payload.targetDhoSlug,
        formKind: payload.formKind,
        initiatorUserId: payload.initiatorUserId,
        payload: JSON.stringify(payload),
        status: "created",
      } as any);
      return {
        bridgeKey,
        bridgeUrl: `${REGEN_CIVICS_BASE}/bridge/hypha/${bridgeKey}`,
      };
    } catch (err: any) {
      if (err?.code === "ER_DUP_ENTRY" && attempt < 4) continue;
      throw err;
    }
  }
  throw new Error("Hypha Bridge: failed to allocate a unique bridge key");
}

/** Convenience wrapper: pick a known intent by name and build the bridge from it. */
export async function bridgeToHypha(intentName: IntentName, payload: Omit<HyphaBridgePayload, "source" | "formKind">): Promise<CreateBridgeResult> {
  const intent = KNOWN_INTENTS[intentName];
  if (!intent) throw new Error(`Unknown intent: ${intentName}`);
  return createHyphaBridge({
    ...payload,
    source: intent.source,
    formKind: intent.formKind,
  });
}

export async function getBridge(bridgeKey: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(hyphaBridges).where(eq(hyphaBridges.bridgeKey, bridgeKey)).limit(1);
  if (rows.length === 0) return null;
  const row = rows[0] as any;
  // Hydrate the JSON payload
  let parsedPayload: HyphaBridgePayload | null = null;
  try {
    parsedPayload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
  } catch { /* ignore */ }
  return { ...row, payload: parsedPayload as HyphaBridgePayload | null };
}

export async function updateBridgeStatus(bridgeKey: string, status: HyphaBridgeStatus, extras: Partial<Record<string, unknown>> = {}) {
  const db = await getDb();
  if (!db) return;
  await db.update(hyphaBridges).set({ status, ...(extras as any) }).where(eq(hyphaBridges.bridgeKey, bridgeKey));
}

export async function markBridgeHandoffSent(bridgeKey: string) {
  return updateBridgeStatus(bridgeKey, "handoff_sent");
}

/** Construct the app.hypha.earth URL with the title marker pre-encoded.
 * This is the ONLY place a hypha.earth URL gets built. */
export function buildHyphaTargetUrl(bridge: { bridgeKey: string; targetDhoSlug: string; formKind: string; payload: HyphaBridgePayload | null }, lang: string = "en"): string {
  const formSegment = FORM_KIND_URL[bridge.formKind] ?? bridge.formKind.replace(/_/g, "-");
  const base = `${HYPHA_APP_BASE}/${lang}/dho/${encodeURIComponent(bridge.targetDhoSlug)}/agreements/create/${formSegment}`;
  if (!bridge.payload) return base;
  const params = payloadToSearchParams(bridge.payload, bridge.bridgeKey);
  return `${base}?${params.toString()}`;
}

export { buildTitleWithMarker, stripTitleMarker } from "./prefill";
export { KNOWN_INTENTS } from "./intents";
export * from "./types";
