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
  // AI
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
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
};
