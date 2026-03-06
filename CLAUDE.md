# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev           # Start dev server (Express + Vite HMR on port 3000)
pnpm build         # Build client (Vite) + server (esbuild) to dist/
pnpm start         # Run production build

# Type checking & formatting
pnpm check         # TypeScript type check (no emit)
pnpm format        # Prettier format all files

# Testing (server-side only via Vitest)
pnpm test                                  # Run all tests
pnpm vitest run server/campaign.test.ts    # Run a single test file

# Database
pnpm db:push       # Generate + apply Drizzle migrations
```

## Environment Setup

Copy `.env.example` to `.env`. Required vars:
- `DATABASE_URL` — MySQL connection string
- `JWT_SECRET` — session signing key
- `OWNER_OPEN_ID` — your Google user ID, grants admin role
- `VITE_APP_ID` — app identifier (e.g. `regen-civics`)
- `REDIS_URL` — for caching and rate limiting

Optional: `RESEND_API_KEY` (email), AWS S3/R2 vars (file storage), Google/Apple OAuth vars.

## Architecture

This is a full-stack TypeScript monorepo with three layers:

```
client/src/    # React 19 SPA (Vite, Tailwind v4, wouter routing)
server/        # Express + tRPC API server (tsx in dev, esbuild in prod)
shared/        # Types and constants shared between client and server
drizzle/       # MySQL schema and migration SQL files
```

**Server entry**: `server/_core/index.ts` — registers middleware, OAuth routes, tRPC, and Vite/static serving.

**tRPC setup**: All API routes are defined in `server/routers.ts` and mounted at `/api/trpc`. Three procedure types:
- `publicProcedure` — no auth required
- `protectedProcedure` — requires valid session cookie (JWT)
- `adminProcedure` — requires `user.role === 'admin'`

**Auth flow**: `server/_core/sdk.ts` handles JWT session creation/verification via `jose`. `server/_core/context.ts` attaches the authenticated user to every tRPC request. OAuth (Google/Apple) routes live in `server/_core/oauth.ts`.

**Database**: Drizzle ORM with MySQL2. All DB operations are in `server/db.ts` (single large file of query functions). Schema is in `drizzle/schema.ts`. The DB connection is lazily initialized so local tooling works without a live DB.

**Client routing**: `wouter` for client-side routing. All pages are lazy-loaded via `React.lazy()` in `client/src/App.tsx`.

**Path aliases**:
- `@/` → `client/src/`
- `@shared/` → `shared/`
- `@assets/` → `attached_assets/`

**Caching**: Redis-backed cache via `server/cache.ts` and `server/cachedQueries.ts`. Cache is initialized in `server/cacheInit.ts`.

**File storage**: S3-compatible (AWS or Cloudflare R2) via `server/storage.ts`.

**Email**: Resend API via `server/_core/email.ts`. Webhook handler in `server/webhooks/resend.ts`.

**Deployment**: Railway (`railway.toml`, `nixpacks.toml`). Build output goes to `dist/public` (client) and `dist/index.js` (server).
