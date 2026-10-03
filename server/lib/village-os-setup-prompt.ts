/**
 * The founder setup prompt for /village-os's "Copy the setup guide" button
 * (ADR-69). The words live in the Village OS repo, read at the pinned
 * release's commit (VILLAGE_OS_SETUP_PROMPT_RAW_URL), so the text a founder
 * pastes is the one reviewed for that release and cannot change under a moved
 * tag (what it then tells the assistant to read is the repo's own; see
 * VILLAGE_OS_RELEASE_COMMIT). The page copies only the part meant for that
 * assistant (setupPromptBody).
 *
 * Bounded by construction: the only URL fetched is a constant, with a short
 * timeout, no redirects and a size cap, and the answer is cached for an hour
 * (a minute after a failure). Any doubt reads as null, and the page then
 * links to the guide instead of copying it.
 */
import { logger } from "../_core/logger";
import { assertSafeExternalUrl } from "../_core/ssrf";
import { VILLAGE_OS_SETUP_PROMPT_RAW_URL, setupPromptBody } from "@shared/villageOsOffer";

const log = logger("village-os-setup-prompt");

const CACHE_TTL_MS = 60 * 60 * 1000;
const FAILURE_TTL_MS = 60 * 1000;
const FETCH_TIMEOUT_MS = 4000;
const MAX_BYTES = 64 * 1024;

let cache: { at: number; ttl: number; value: string | null } | null = null;
let inFlight: Promise<string | null> | null = null;

/** For tests: forget the cached prompt. */
export function resetSetupPromptCache() {
  cache = null;
  inFlight = null;
}

async function load(): Promise<string | null> {
  const url = VILLAGE_OS_SETUP_PROMPT_RAW_URL;
  try {
    await assertSafeExternalUrl(url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        redirect: "error",
        headers: { accept: "text/plain", "user-agent": "ReGenCivicsVillageOs/1.0" },
      });
      if (!res.ok) {
        void res.body?.cancel().catch(() => {});
        return null;
      }
      if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) {
        void res.body?.cancel().catch(() => {});
        return null;
      }
      const text = await res.text();
      if (text.length > MAX_BYTES) return null;
      return setupPromptBody(text);
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    log.warn(`setup prompt fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/** The setup prompt's body for a founder's AI assistant, or null. Never throws. */
export async function villageOsSetupPrompt(now: number = Date.now()): Promise<string | null> {
  if (cache && now - cache.at < cache.ttl) return cache.value;
  if (inFlight) return inFlight;
  inFlight = load()
    .then((value) => {
      cache = { at: now, ttl: value ? CACHE_TTL_MS : FAILURE_TTL_MS, value };
      return value;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
