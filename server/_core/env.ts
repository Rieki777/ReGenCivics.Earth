// ── Required env var validation ──────────────────────────────────────────────
// Fail fast at startup with a clear error rather than silently using empty
// strings that cause cryptic runtime failures mid-request.
const isProduction = process.env.NODE_ENV === "production";

const REQUIRED: Record<string, string | undefined> = {
  JWT_SECRET: process.env.JWT_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
};

// In production, APP_URL must also be set (needed for OAuth callbacks & emails)
if (isProduction) {
  REQUIRED.APP_URL = process.env.APP_URL;
}

const missing = Object.entries(REQUIRED)
  .filter(([, v]) => !v)
  .map(([k]) => k);

// Skip in test environments, tests mock DB/auth and don't need real secrets
const isTest = process.env.VITEST !== undefined || process.env.NODE_ENV === "test";

if (missing.length > 0 && !isTest) {
  console.error(`\n❌ Missing required environment variables: ${missing.join(", ")}`);
  console.error("Set these in your Railway dashboard (or .env for local dev) and restart.\n");
  process.exit(1);
}

// ── ENV object ───────────────────────────────────────────────────────────────
export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET!,
  databaseUrl: process.env.DATABASE_URL!,
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction,
  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  // Apple OAuth
  appleClientId: process.env.APPLE_CLIENT_ID ?? "",
  appleTeamId: process.env.APPLE_TEAM_ID ?? "",
  appleKeyId: process.env.APPLE_KEY_ID ?? "",
  applePrivateKey: process.env.APPLE_PRIVATE_KEY ?? "",
  // App URL
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  // AI. OPENROUTER_API_KEY is the PRIMARY LLM path (Anthropic-compatible
  // endpoint, per-task model tiers below); ANTHROPIC_API_KEY is the
  // direct-to-Anthropic fallback when OpenRouter errors or has no key.
  // AI_MODEL only applies on the direct Anthropic path (bare claude-* id).
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  openrouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  aiModel: process.env.AI_MODEL ?? "openrouter/auto",
  // Global LLM cost circuit-breaker (see server/_core/llm.ts). Site-wide daily
  // ceilings across EVERY invokeLLM/streamLLM call, so one runaway feature (or
  // a bot hammering a public AI surface) cannot burn unbounded spend. Tokens
  // are estimated at ~4 chars/token. Set to 0 to disable a given ceiling.
  llmDailyCallBudget: Number.parseInt(process.env.LLM_DAILY_CALL_BUDGET ?? "4000", 10) || 0,
  llmDailyTokenBudget: Number.parseInt(process.env.LLM_DAILY_TOKEN_BUDGET ?? "8000000", 10) || 0,
  // Per-task OpenRouter model tiers (cheapest model that does the job; see
  // server/_core/llm.ts and ADR-43 + its amendment). All slugs must route to
  // providers this OpenRouter account can reach (NOT anthropic/*). Tiers that
  // receive images (standard: ship cook + shipwright) need a multimodal model.
  // HARD RULE: never change a default (or set a tier var) to a model that has
  // not passed `npx tsx scripts/eval-llm-candidates.ts --model <slug> --tier all`.
  // Kimi k2.5/k3 FAILED that harness through OpenRouter's Anthropic-protocol
  // endpoint (no tool_use blocks, empty persona replies, hangs), which is why
  // the moonshot defaults were reverted on 2026-07-17. Legacy OPENROUTER_MODEL,
  // when set, still pins the standard tier so an existing Railway var keeps
  // its old meaning.
  // Optional FREE lane for the light tier (opt-in, empty = off). When set to a
  // `:free` OpenRouter variant that passed the harness, light-tier calls try it
  // first and fall through to the paid light model on 429/no-providers (free
  // variants are hard rate-limited: ~20 req/min, 1000/day with $10+ credits).
  // PRIVACY GATE: only enable after setting the OpenRouter account data policy
  // to exclude providers that train on inputs; light-tier traffic includes
  // Rye's private quick-notes. See ADR-45 + the monthly model review.
  llmModelLightFree: process.env.LLM_MODEL_LIGHT_FREE ?? "",
  llmModelLight:
    process.env.LLM_MODEL_LIGHT ?? "google/gemini-2.5-flash-lite",
  llmModelStandard:
    process.env.LLM_MODEL_STANDARD ?? process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
  llmModelComplex:
    process.env.LLM_MODEL_COMPLEX ?? "openai/gpt-4o-mini",
  // Conversational Companion voice layer (all optional; browser SpeechRecognition
  // + speechSynthesis are the free v1 default). STT_API_KEY lights up the server
  // fallback transcription endpoint for browsers without SpeechRecognition
  // (notably some iOS versions). STT_PROVIDER picks the vendor (groq | openai),
  // both of which serve a Whisper transcription endpoint. TTS_API_KEY is the v2
  // hosted-voice upgrade path (e.g. ElevenLabs), read as a flag for now.
  sttApiKey: process.env.STT_API_KEY ?? "",
  sttProvider: process.env.STT_PROVIDER ?? "groq",
  ttsApiKey: process.env.TTS_API_KEY ?? "",
  // Master switch for the signature character voices. The TTS_API_KEY can sit
  // in Railway unspent until this is "1"/"true": pickers hide the voices and
  // companion.speak refuses, so nothing can bill DeepInfra until Rye says go.
  ttsVoicesLive: /^(1|true)$/i.test(process.env.TTS_VOICES_LIVE ?? ""),
  // Signature-voice cloning overrides: JSON mapping a registry key from
  // server/lib/ttsVoices.ts to a DeepInfra voice_id created via /v1/voices/add,
  // e.g. {"first-mate/marin":"abcd1234"}. Empty means every signature voice
  // speaks through its preset+instruct fallback.
  ttsVoiceMap: ((): Record<string, string> => {
    try {
      const parsed: unknown = JSON.parse(process.env.TTS_VOICE_MAP ?? "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return Object.fromEntries(
          Object.entries(parsed as Record<string, unknown>).filter(([, v]) => typeof v === "string"),
        ) as Record<string, string>;
      }
    } catch {
      console.warn("[env] TTS_VOICE_MAP is not valid JSON; ignoring it");
    }
    return {};
  })(),
  // Cloudflare Workers AI image generation
  imageGenWorkerUrl: process.env.IMAGE_GEN_WORKER_URL ?? "",
  imageGenSecret: process.env.IMAGE_GEN_SECRET ?? "",
  // Buffer social media scheduling
  bufferAccessToken: process.env.BUFFER_ACCESS_TOKEN ?? "",
  // Farcaster
  farcasterHandle: process.env.FARCASTER_HANDLE ?? "",
  // GitHub OAuth (for bounty shipper identity linking)
  githubClientId: process.env.GITHUB_CLIENT_ID ?? "",
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
  // GitHub webhook secret (for merge automation)
  githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET ?? "",
  // Riverside.fm webhook signing secret
  riversideWebhookSecret: process.env.RIVERSIDE_WEBHOOK_SECRET ?? "",
  // Movement Coordination Engine trigger: the YouTube channel whose
  // upload RSS feed the worker polls every 10 min to discover new
  // recordings. Default is @SEEDSRegenerativeEconomies (confirmed in
  // CLAUDE_CODE_BUILD_PROMPT_MOVEMENT_ENGINE.md). Override via Railway
  // when the canonical channel handle changes.
  youtubeChannelId: process.env.YOUTUBE_CHANNEL_ID ?? "UCzuomEZ3aNbr2LEreGlvWGQ",
  // Transcription fallback worker (FastAPI + yt-dlp + faster-whisper).
  // Leave unset to skip Whisper transcription. Set both to enable:
  //   TRANSCRIPTION_WORKER_URL  -> full base URL of the worker (e.g. https://worker.railway.app)
  //   TRANSCRIPTION_API_KEY     -> matches WORKER_API_KEY on the worker service
  transcriptionWorkerUrl: process.env.TRANSCRIPTION_WORKER_URL ?? "",
  transcriptionApiKey: process.env.TRANSCRIPTION_API_KEY ?? "",

  // The Harvest (capture + bridge, Phase 1). OWNER_USER_ID is Rye's users.id;
  // every quick-note procedure gates on it (ownerProcedure fails closed when
  // unset). HARVEST_BRIDGE_TOKEN authenticates the local second brain's pull
  // over HTTPS; the NEXT slot allows zero-downtime rotation. GEMINI_API_KEY is
  // the capture-transcription fallback when no Whisper STT_API_KEY is set.
  ownerUserId: Number(process.env.OWNER_USER_ID ?? 0) || 0,
  harvestBridgeToken: process.env.HARVEST_BRIDGE_TOKEN ?? "",
  harvestBridgeTokenNext: process.env.HARVEST_BRIDGE_TOKEN_NEXT ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  // CAN-SPAM postal address for the Harvest announcement footer (Phase 4).
  // Set the real mailing address in Railway before the first send.
  harvestPostalAddress: process.env.HARVEST_POSTAL_ADDRESS ?? "ReGen Civics Alliance, Ashland, Oregon, USA",

  // The Mycelium (M1): the Worldview Pack. WORLDVIEW_UPLOAD_TOKEN gates
  // POST /api/worldview/upload (NEXT is the rotation slot); the pack lands at
  // WORLDVIEW_R2_KEY_PREFIX in the PRIVATE R2 area (never the public assets
  // prefix, never served by /api/img). Loader and endpoint fail soft when
  // unset: every getter returns null and agents keep their current behavior.
  worldviewUploadToken: process.env.WORLDVIEW_UPLOAD_TOKEN ?? "",
  worldviewUploadTokenNext: process.env.WORLDVIEW_UPLOAD_TOKEN_NEXT ?? "",
  worldviewR2KeyPrefix: process.env.WORLDVIEW_R2_KEY_PREFIX ?? "worldview",

  // Church of the Regenerative Earth (CORE) - core.regencivics.earth
  // Stripe (server-side only for the secret + webhook signing secret). The
  // hosted Checkout redirect flow does not need the publishable key on the
  // client, so it is intentionally not exposed here. Rye sets these on Railway.
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  coreDonationSuccessUrl:
    process.env.CORE_DONATION_SUCCESS_URL ?? "https://core.regencivics.earth/donate/thank-you",
  coreDonationCancelUrl:
    process.env.CORE_DONATION_CANCEL_URL ?? "https://core.regencivics.earth/donate",
  // Voyage AI embeddings for the elder retrieval corpus (Phase 4, optional).
  voyageApiKey: process.env.VOYAGE_API_KEY ?? "",

  // Zeffy: preferred donation processor (zero platform fees for nonprofits).
  // Zeffy forms are built and hosted in the Zeffy dashboard, not created via
  // API, so integration is: embed the dashboard-generated form URL, and
  // reconcile via Zeffy's webhook. ZEFFY_WEBHOOK_TOKEN is a shared secret we
  // choose ourselves and put in the webhook URL path, since Zeffy's webhook
  // does not document HMAC signature verification.
  zeffyEmbedUrl: process.env.ZEFFY_EMBED_URL ?? "",
  zeffyApiKey: process.env.ZEFFY_API_KEY ?? "",
  zeffyWebhookToken: process.env.ZEFFY_WEBHOOK_TOKEN ?? "",

  // ReGen Ship (CORE program). Every ship feature is built behind an
  // isConfigured guard (see server/lib/ship-config.ts) so the whole system
  // ships and each feature lights up when its var lands on Railway.
  //  - The two Zeffy form URLs are dashboard-generated share links (public,
  //    same class as any <iframe src>), one for the suggested voyage offering
  //    and one for Gift a Voyage (2x). Stripe fallback renders when unset.
  //  - The Outdoorsy listing URL is shown on the booking page and in the
  //    approved-booking email that instructs the guest through the platform.
  //  - The GPS tracker vars power the live position pin v2; manual pings work
  //    without them.
  shipZeffyOfferingUrl: process.env.SHIP_ZEFFY_OFFERING_URL ?? "",
  shipZeffyGiftUrl: process.env.SHIP_ZEFFY_GIFT_URL ?? "",
  shipOutdoorsyListingUrl: process.env.SHIP_OUTDOORSY_LISTING_URL ?? "",
  shipGpsTrackerApiUrl: process.env.SHIP_GPS_TRACKER_API_URL ?? "",
  shipGpsTrackerApiKey: process.env.SHIP_GPS_TRACKER_API_KEY ?? "",
};
