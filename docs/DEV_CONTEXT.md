# ReGen Civics: Development Context

How this site has been built. Read this before touching any code so you build consistently with what exists.

---

## Tech Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Frontend | React + TypeScript | Single-page app, lazy-loaded pages |
| Routing | wouter | Lightweight. Uses `<Link href="...">`, `useRoute`, `useLocation`. NOT react-router. |
| Styling | Tailwind CSS v4 | Via `@tailwindcss/vite` plugin. Inline utility classes everywhere. |
| UI Components | shadcn/ui + Radix | `@/components/ui/*`. Import from `@/components/ui/button`, etc. |
| State / Data | tRPC + React Query | `trpc.routerName.procedureName.useQuery()` / `.useMutation()` |
| Backend | Express + tRPC | Express serves static + catch-all SPA. tRPC handles all `/api/trpc/*` calls. |
| ORM | Drizzle ORM | MySQL dialect. Schema in `drizzle/schema.ts`. |
| Database | MySQL on Railway | Connection pool via `mysql2/promise` in `server/db.ts`. |
| File Storage | Cloudflare R2 (S3-compatible) | Upload via `server/storage.ts`, accessed through `STORAGE_PUBLIC_URL`. |
| Auth | JWT cookie (Google OAuth, Apple OAuth, Email Magic Link) | `server/_core/oauth.ts`, client hook `useAuth()` from `client/src/_core/hooks/useAuth.ts`. |
| Build | Vite | `vite build` outputs to `dist/public`. Server bundled with esbuild. |
| Deploy | Railway | `nixpacks.toml` + `railway.toml`. `npm run build && npm run start`. |
| Serialization | superjson | tRPC transformer. Handles Date objects automatically. |

## Project Structure

```
client/
  src/
    _core/hooks/     # useAuth, core hooks
    components/      # Reusable components (AnimatedSection, SEO, FileUpload, etc.)
    components/ui/   # shadcn/ui primitives (button, dialog, card, etc.)
    contexts/        # ThemeContext, AudioContext, ReGenGuideContext
    data/            # Static data arrays (questData, gameRoles, seasonConstants)
    hooks/           # Custom hooks (useGlobalScrollReveal, useReducedMotion, etc.)
    lib/             # trpc.ts, utils.ts
    pages/           # One file per route (Community.tsx, Schedule.tsx, etc.)
    utils/           # Helpers (pdfExport, etc.)
  public/
    images/          # Static images served at /images/*

server/
  _core/             # Framework plumbing
    index.ts         # Express app setup, middleware, port binding
    trpc.ts          # tRPC init, procedure types, rate limiting middleware
    context.ts       # tRPC context (req, res, user from JWT)
    oauth.ts         # Google/Apple OAuth + email magic link flows
    security.ts      # CSP, CSRF, sanitization, rate limiting
    email.ts         # Resend email sending
    notification.ts  # Push/email notification dispatch
    env.ts           # Typed environment variable access
    llm.ts           # Anthropic SDK for AI features
  routes/            # tRPC routers, one file per domain
  routers.ts         # Central router composition (imports all routes/*)
  db.ts              # All database helper functions (2800+ lines)
  storage.ts         # Cloudflare R2 upload/stream helpers
  cache.ts           # Redis cache helpers (falls back to in-memory)
  webhooks/          # Riverside, Resend, Loomio webhook handlers
  jobs/              # Scheduled jobs (digest, glossary, draft cleanup)
  lib/hypha-bridge/  # ReGen Civics to Hypha DAO handoff module

drizzle/
  schema.ts          # All table definitions (Drizzle ORM)
  0001_*.sql ...     # Sequential SQL migration files
  0117_*.sql         # Latest migration (as of writing)

shared/              # Types/constants shared between client and server
scripts/             # Seed scripts, migration runner, image optimization
```

## Path Aliases

Defined in `vite.config.ts`:
- `@` maps to `client/src/`
- `@shared` maps to `shared/`
- `@assets` maps to `attached_assets/`

## How the Backend Works

### tRPC Procedure Types

Defined in `server/_core/trpc.ts`:

- `publicProcedure`: No auth required. Anyone can call.
- `protectedProcedure`: Requires authenticated user. `ctx.user` is available.
- `adminProcedure`: Requires user with `role: 'admin'` or `'superadmin'`.
- `rateLimited({ windowMs, max })`: Middleware. Attach to any procedure to rate limit.

### Adding a New Router

1. Create `server/routes/myFeature.ts`
2. Export a router: `export const myFeatureRouter = router({ ... })`
3. Register in `server/routers.ts`: import and add to `appRouter`
4. Client calls it as `trpc.myFeature.procedureName.useQuery()`

### Router File Pattern

Every router file follows this structure:

```typescript
import { protectedProcedure, publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { getDb } from "../db";

export const myRouter = router({
  list: publicProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input }) => {
      return db.listMyThings(input.limit);
    }),

  create: protectedProcedure
    .input(z.object({ title: z.string().min(3).max(300) }))
    .mutation(async ({ ctx, input }) => {
      return db.createMyThing({ authorId: ctx.user.id, title: input.title });
    }),
});
```

All Zod validation happens in the `.input()` chain. All database work is in `server/db.ts` helper functions, not inline SQL in the route file.

### Database Helper Pattern (server/db.ts)

All DB operations are abstracted as exported async functions. The pattern:

```typescript
export async function listMyThings(limit: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(myTable).orderBy(desc(myTable.createdAt)).limit(limit);
}
```

Every function starts with `const db = await getDb(); if (!db) return ...;` as a guard for when the database is unavailable. This is a strict convention, never skip it.

## How the Frontend Works

### Routing (wouter)

All routes are in `App.tsx` inside the `Router()` function. The pattern:

```tsx
<Route path={"/my-page"}><EB><MyPage /></EB></Route>
```

`EB` is a wrapper that provides `ErrorBoundary` + `Suspense` with a loading spinner. Every page is lazy-loaded via `React.lazy()`.

For pages that should redirect on error (auth-gated): use `EBRedirect`:
```tsx
<Route path={"/protected"}><EBRedirect to="/connect"><ProtectedPage /></EBRedirect></Route>
```

wouter uses `<Link href="/path">` (not `to=`). Route params are accessed via `useRoute("/path/:id")`.

### Page Structure Pattern

Most pages follow this layout:

```tsx
export default function MyPage() {
  return (
    <PageWrapper>
      <SEO title="Page Title" description="Meta description for social sharing" />
      <BackButton />
      {/* Hero section */}
      <section className="relative py-20 text-center">
        <AnimatedSection animation="fade-in">
          <h1 className="text-4xl font-bold text-white">Title</h1>
        </AnimatedSection>
      </section>
      {/* Content sections */}
      <AnimatedSection animation="slide-up" delay={200}>
        {/* ... */}
      </AnimatedSection>
    </PageWrapper>
  );
}
```

Key wrapper components:
- `PageWrapper`: Mount-fade transition to prevent FOUC
- `SEO`: Sets `<title>`, Open Graph, Twitter Card meta tags
- `AnimatedSection`: Intersection Observer scroll reveal (fade-in, slide-up, slide-left, slide-right, scale-in, blur-in)
- `BackButton`: Standard back navigation link

### Color Palette

The site uses a dark forest green theme. Key hex values used throughout:

- `#0d2818`: Darkest background
- `#1a472a`: Primary dark green (headers, hero backgrounds)
- `#2d5a3d`: Mid-dark green
- `#4a7c59`: Medium green (borders, secondary elements)
- `#7dd87d`: Bright/accent green (links, highlights, interactive elements)
- `#f0ebe3`: Warm cream/parchment (light backgrounds, contrast text areas)
- `#4a5568`: Muted gray for secondary text

Common gradient: `bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]`

### Data Fetching Pattern

```tsx
const { data, isLoading, error } = trpc.myFeature.list.useQuery({ limit: 50 });
const createMutation = trpc.myFeature.create.useMutation({
  onSuccess: () => {
    utils.myFeature.list.invalidate(); // Refetch list after create
  },
});
```

Always get `utils` via `const utils = trpc.useUtils();` for cache invalidation.

### Auth on the Client

```tsx
const { user, isAuthenticated, loading, logout } = useAuth();
```

`user` contains `{ id, name, email, role, handle, ... }`. Check `isAuthenticated` before showing protected UI. The `useAuth` hook reads from `trpc.auth.me` query.

## Key Patterns to Know

### The Propose-and-Vote Pattern

Used by Quest Suggestions, Community Agreements, Feature Suggestions, and Economic Suggestions. Two tables, one page, consistent UX.

**Database layer** (two tables):
```sql
CREATE TABLE myItems (
  id INT AUTO_INCREMENT PRIMARY KEY,
  authorId INT NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  status ENUM('open','ratified','in_review','declined') DEFAULT 'open',
  voteCount INT DEFAULT 0,
  forumThreadId INT,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);

CREATE TABLE myItemVotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  itemId INT NOT NULL,
  userId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  UNIQUE KEY unique_vote (itemId, userId)
);
```

**Key mechanics:**
- `voteCount` is denormalized on the items table for fast sorting
- Toggle vote: if vote exists, delete it and decrement; if not, insert and increment
- Auto-create a forum thread when a new item is submitted (in try/catch, non-fatal)
- Sort by "votes" (highest voteCount) or "newest" (most recent createdAt)
- Status transitions: open -> in_review -> ratified/declined

**Reference implementation:** `QuestSuggestions.tsx` (page), `server/routes/players.ts` (questsRouter), `server/db.ts` (listQuestSuggestions, toggleQuestVote, etc.)

### Forum Category System

The Community page (`Community.tsx`) has dedicated section panels for specific category slugs and a General section for everything else.

```typescript
const SECTION_SLUGS = new Set([
  'quests-gameplay', 'epic-quests', 'alliance-partners', 'air-conversations',
  'land-projects', 'rites-of-passage', 'welcome-aboard-quests',
]);
```

Categories whose slug is in `SECTION_SLUGS` get their own styled section panel on the Community page. All other categories appear in the General section grid.

To add a new dedicated section: add the slug to `SECTION_SLUGS` and create the visual panel in the JSX.

### Entity Auto-Thread Pattern

When a land project or alliance org is approved, the system automatically creates a pinned forum thread for them.

```typescript
// server/db.ts
ensureEntityForumThread('land_project', 'Project Name', authorId)
// Routes to 'land-projects' category for land_project
// Routes to 'alliance-partners' category for alliance_org
```

This function is idempotent. It checks by title + category before creating. Called from:
- `server/routes/applications.ts` when `updateStatus` sets status to "approved"
- `server/routes/applications.ts` in `orgClaims.claim` and `orgClaims.approve`

### Image Upload Flow

1. Client uses `<FileUpload>` component which converts file to base64
2. Calls `trpc.files.upload.mutate({ data: base64String, filename, contentType })`
3. Server in `server/routes/global.ts` decodes base64, calls `storagePut()` from `server/storage.ts`
4. `storagePut()` uploads to Cloudflare R2 via S3 API
5. Returns the public URL (from `STORAGE_PUBLIC_URL` env var)

### Webhook Handler Pattern

Webhook routes are registered as raw Express routes (not tRPC) in `server/_core/index.ts`:

```typescript
registerRiversideWebhookRoutes(app);
registerResendWebhookRoutes(app);
registerHyphaWebhookRoutes(app);
```

Each webhook handler file exports a `register*Routes(app: Express)` function that sets up `app.post('/api/webhooks/...')` endpoints with signature verification.

## Database Migrations

Migration files are sequential SQL files in `drizzle/`: `0001_description.sql` through `0117_description.sql` (and growing).

**Running migrations:**

```bash
# Via the migration runner script (preferred, tracks applied state):
npx tsx scripts/run-migration.ts drizzle/0118_my_migration.sql
npx tsx scripts/run-migration.ts --all       # Run all unapplied
npx tsx scripts/run-migration.ts --status    # Check what's applied

# Via Railway SQL console (for manual one-offs):
# Open Railway dashboard > Database tab > SQL editor
```

The migration runner uses a `_migrations_applied` tracking table. It's idempotent.

**Creating new migrations:**
1. Pick the next number: check `ls drizzle/*.sql | tail -1`
2. Create `drizzle/NNNN_description.sql`
3. Write plain SQL (CREATE TABLE, ALTER TABLE, INSERT, UPDATE, etc.)
4. Also update `drizzle/schema.ts` to match (the Drizzle schema is the source of truth for TypeScript types)

Apply migrations with `npm run db:push` (an alias for `scripts/run-migration.ts --all`). Migrations are hand-written SQL; do NOT run `drizzle-kit generate` / `migrate`. See `drizzle/README.md`.

## Build and Run

```bash
npm run dev          # Dev server with hot reload (tsx watch)
npm run build        # Production build (tsc check + vite build + esbuild server)
npm run start        # Run production build
npm run check        # TypeScript type check only
npm run test         # Unit tests (vitest)
npm run test:all     # All tests including integration
```

The dev server entry is `server/_core/index.ts`. Vite handles HMR for the client in dev mode.

Production build: Vite outputs client to `dist/public/`, esbuild bundles server to `dist/index.js`. Express serves static files from `dist/public/` and falls back to `index.html` for SPA routing.

## Code Conventions

### Input Sanitization

All user-submitted text goes through `sanitizeInput()` from `server/_core/security.ts` before storage:

```typescript
title: sanitizeInput(input.title),
description: sanitizeInput(input.description),
```

### Error Handling in Routes

Non-critical operations (like auto-creating a forum thread on submission) are wrapped in try/catch so they don't break the main operation:

```typescript
// Auto-create forum thread (non-fatal)
try {
  const threadId = await createForumThread(...);
} catch (err) {
  console.error('[agreements.create] Failed to create forum thread:', err);
}
```

### Caching

`server/cache.ts` provides Redis-backed caching with in-memory fallback:

```typescript
import { cacheGet, cacheSet, cacheDel } from "../cache";

const cached = await cacheGet<MyType>('cache:key');
if (cached) return cached;
const fresh = await db.fetchSomething();
await cacheSet('cache:key', fresh, 300); // TTL in seconds
return fresh;
```

Forum categories are cached in-memory for 5 minutes. Other expensive queries use Redis when available.

### Component Imports

shadcn/ui components: `import { Button } from "@/components/ui/button"`
Custom components: `import { AnimatedSection } from "@/components/AnimatedSection"`
Icons: `import { ArrowLeft, Star, Plus } from "lucide-react"`

### Writing Rules (applies to ALL copy)

These are hard rules in the CLAUDE.md. The critical ones:
1. **Zero em-dashes.** Replace with commas, periods, or colons.
2. **No contrast-framing.** Never define something by what it isn't.
3. **No AI word patterns.** Banned: "delve", "tapestry", "foster", "leverage", "transformative", "beacon", "unlock", "seamless", "robust", "comprehensive", "empower", etc.
4. **No rhetorical question openers.**
5. **No passive inspiration.** ("Join us on this journey" type filler.)

Voice: Direct, grounded, specific. Rye's voice. First person fine. Contractions fine.

## Environment Variables

Key env vars (set in Railway, `.env` locally):

- `DATABASE_URL`: MySQL connection string
- `JWT_SECRET`: For signing auth tokens
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: OAuth
- `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET`: OAuth
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_BUCKET_NAME` / `AWS_ENDPOINT_URL` / `STORAGE_PUBLIC_URL`: Cloudflare R2
- `RESEND_API_KEY`: Email sending
- `ANTHROPIC_API_KEY`: AI features
- `SENTRY_DSN`: Error tracking
- `REDIS_URL`: Cache (optional, falls back to in-memory)
- `RIVERSIDE_WEBHOOK_SECRET`: Webhook signature verification

## Common Operations Cheat Sheet

**Add a new page:**
1. Create `client/src/pages/MyPage.tsx` (use PageWrapper + SEO + AnimatedSection)
2. Lazy import in `App.tsx`: `const MyPage = lazy(() => import("./pages/MyPage"));`
3. Add route: `<Route path={"/my-page"}><EB><MyPage /></EB></Route>`

**Add a new tRPC procedure:**
1. Add DB helper to `server/db.ts`
2. Add procedure to existing router in `server/routes/*.ts` or create new router file
3. If new router: register in `server/routers.ts`
4. Call from client: `trpc.routerName.procedureName.useQuery()` or `.useMutation()`

**Add a new DB table:**
1. Define in `drizzle/schema.ts` using Drizzle ORM syntax
2. Create migration SQL file: `drizzle/NNNN_description.sql`
3. Run migration: `npx tsx scripts/run-migration.ts drizzle/NNNN_description.sql`
4. Add helpers to `server/db.ts`

**Add a forum category section:**
1. Create the category in DB (INSERT into forumCategories)
2. Add slug to `SECTION_SLUGS` in `Community.tsx`
3. Build the visual section panel in the Community page JSX

**Replicate propose-and-vote:**
1. Create two tables (items + votes) following the pattern above
2. Add 4 DB helpers: list, create, toggleVote, getUserVotes
3. Add 4 tRPC procedures: list (public), myVotes (protected), create (protected), toggleVote (protected)
4. Copy the page structure from `QuestSuggestions.tsx`
