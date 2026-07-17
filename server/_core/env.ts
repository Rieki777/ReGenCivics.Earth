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
  // AI. OPENROUTER_API_KEY routes all LLM calls through OpenRouter's
  // Anthropic-compatible endpoint; ANTHROPIC_API_KEY is the direct-to-Anthropic
  // fallback when no OpenRouter key is set. AI_MODEL only applies on the
  // OpenRouter path (direct Anthropic keeps its pinned Claude model).
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  openrouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  aiModel: process.env.AI_MODEL ?? "openrouter/auto",
  // Model used when a call fails over from first-party Anthropic to OpenRouter
  // (e.g. Anthropic is out of credits). It must route to a provider this
  // OpenRouter account can reach, so it is NOT a claude/anthropic model by
  // default. Override with OPENROUTER_MODEL (any OpenRouter model slug).
  openrouterModel: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
  // Conversational Companion voice layer (all optional; browser SpeechRecognition
  // + speechSynthesis are the free v1 default). STT_API_KEY lights up the server
  // fallback transcription endpoint for browsers without SpeechRecognition
  // (notably some iOS versions). STT_PROVIDER picks the vendor (groq | openai),
  // both of which serve a Whisper transcription endpoint. TTS_API_KEY is the v2
  // hosted-voice upgrade path (e.g. ElevenLabs), read as a flag for now.
  sttApiKey: process.env.STT_API_KEY ?? "",
  sttProvider: process.env.STT_PROVIDER ?? "groq",
  ttsApiKey: process.env.TTS_API_KEY ?? "",
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
