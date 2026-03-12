export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
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
};
