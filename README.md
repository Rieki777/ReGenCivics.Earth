# ReGen Civics

A fund and a game for regenerative land projects. Players do quests, earn
tokens, and fund real-world regeneration. Land projects get capital, community,
and coordination infrastructure. The whole thing runs on a local-food-backed
economy with open governance.

Live site: [regencivics.earth](https://regencivics.earth)

---

## What this is

ReGen Civics is two things running as one system:

**The Fund** backs regenerative land projects with real capital, governed by
the community through proposals and trust-weighted voting.

**The Game** is how the community forms — players complete quests, earn
contribution scores and $ReGen tokens, and build the bioregional food
economies that back the currency's value.

The codebase covers the full platform: quest system, forum, player profiles,
citizenship tiers, campaign/crowdfunding, event management, admin dashboard,
and the economic layer (contribution scoring, gratitude tokens, harvest
distribution, governance proposals).

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, TailwindCSS 4, Radix UI |
| Backend | Express, tRPC 11, TypeScript |
| Database | MySQL 8 (Railway), Drizzle ORM |
| Auth | Google OAuth, Apple OAuth, JWT (jose) |
| Email | Resend |
| Storage | AWS S3 |
| Cache | Redis |
| AI | Anthropic Claude (content generation, admin assistant) |
| Monitoring | Sentry |
| Analytics | Umami |
| Background jobs | Custom (digest, glossary, cleanup) |

Full TypeScript throughout. ESM modules (`"type": "module"`). Node 20+.

---

## Local Development

### Prerequisites

- Node 22+ (matches the Railway runtime; pinned in `.node-version`)
- pnpm 10+ (the repo uses `packageManager` to pin a version via Corepack)
- Docker + Docker Compose (recommended) OR a local MySQL 8 install

### First-time setup (Docker, recommended)

```bash
git clone https://github.com/Rieki777/ReGenCivics.Earth.git
cd ReGenCivics.Earth

# Boot MySQL 8 + Redis 7 in the background.
docker compose up -d

# Use the example as a starting point. The values it ships with already
# point at the docker MySQL on port 3307 and Redis on port 6380.
cp .env.example .env
# At minimum, set DATABASE_URL=mysql://regen:regenpw@127.0.0.1:3307/regen_civics
#                 REDIS_URL=redis://127.0.0.1:6380
#                 JWT_SECRET=<any long random string>

pnpm install
pnpm db:push       # generate + apply the Drizzle schema to docker MySQL
pnpm dev           # start the dev server on http://localhost:5000
```

### First-time setup (without Docker)

If you'd rather run MySQL natively, point `DATABASE_URL` at your local
instance and skip `docker compose`. The `pnpm db:push` step is the same.

The server starts on `http://localhost:5000`. Vite HMR runs on the same port
via the Express dev middleware.

### Database

The project uses Drizzle ORM with MySQL. Schema lives in `drizzle/schema.ts`.
Migrations live in `drizzle/` (numbered `0000_...sql` through `0100_...sql`).

```bash
# Push schema changes to your database
npm run db:push

# Generate a new migration after schema changes
npx drizzle-kit generate

# Seed the forum
npm run seed:forum
```

**Running migrations manually** (if `db:push` isn't enough for data migrations):
Write a `.mjs` script and run it directly against the database. See
`run_0100.mjs` for the pattern. Always strip SQL comment lines before
splitting on semicolons — see `SKILL_regen-database-sql` for why.

### Running tests

```bash
npm test
```

Tests use Vitest. Test files live alongside their source files with `.test.ts`
suffix.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | MySQL connection string |
| `JWT_SECRET` | Yes | Secret for JWT signing |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth app ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth app secret |
| `RESEND_API_KEY` | Yes | Transactional email |
| `ANTHROPIC_API_KEY` | Yes | Claude API for AI features |
| `OWNER_OPEN_ID` | Yes | Google sub ID for the admin account |
| `OWNER_EMAIL` | Yes | Email for the admin account |
| `PORT` | No | Server port (default: 5000) |
| `REDIS_URL` | No | Redis for caching (optional) |
| `AWS_*` | No | S3 for image/file storage |
| `SENTRY_DSN` | No | Error monitoring |
| `GOOGLE_MAPS_API_KEY` | No | Maps on land project pages |
| `BUFFER_ACCESS_TOKEN` | No | Social media scheduling |

See `.env.example` for the full list.

---

## Project Structure

```
regen-civics/
├── client/src/
│   ├── pages/          # 77 page components
│   ├── components/     # Shared components + admin/ game/ profile/ ui/
│   ├── hooks/          # Custom React hooks
│   ├── contexts/       # React context providers
│   ├── _core/          # App-wide utilities
│   └── lib/            # Helper utilities
├── server/
│   ├── _core/          # Express setup, auth, email, security, LLM
│   ├── routes/         # REST routes (OG images, embeds, presence, etc.)
│   ├── game/           # Game system logic (scoring, harvest, tiers)
│   ├── jobs/           # Background jobs (digest, glossary, cleanup)
│   ├── webhooks/       # Webhook handlers (Resend, Riverside)
│   ├── db.ts           # All database queries (~113KB)
│   ├── routers.ts      # tRPC router definitions
│   ├── storage.ts      # S3 file storage
│   └── cache.ts        # Redis caching
├── drizzle/
│   ├── schema.ts       # 101-table database schema
│   └── 0000_...sql     # Numbered migration files
├── shared/             # Types shared between client and server
├── scripts/            # One-off seed and data scripts
└── docs/               # Planning docs, specs, game design
```

### Key architectural patterns

**tRPC for all client-server communication.** The API is type-safe end to end.
Routers are in `server/routers.ts`. Client calls via `@trpc/react-query`.

**Drizzle for the database layer.** All queries in `server/db.ts`. Schema
changes go through migrations — do not hand-edit production tables.

**Single schema file.** `drizzle/schema.ts` contains all 101 tables. Large,
but keeps the whole data model in one place.

**Game logic is server-side.** Contribution scoring, harvest calculations,
citizenship tier checking, and the percentile ranking system all live in
`server/game/`. Never trust the client for game state.

---

## Database Schema Overview

101 tables across these domains:

- **Users & auth:** `users`, `userProfiles`, `emailTokens`
- **Forum:** `forumCategories`, `forumPosts`, `forumReplies`, `forumLikes`, `postReactions`
- **Quests:** `questCompletions`, `questSuggestions`, `questJournal`, `questUnlockTiers`
- **Citizenship:** `citizenshipTierHistory`, `seasonalCouncils`, `playerAlliances`, `vouches`
- **Contributions:** `playerContributions`, `seedsContributions`, `game_variables`
- **Campaigns:** `campaigns`, `campaignItems`, `campaignContributions`
- **Events:** `events`, `eventSignups`, `recordings`
- **Economy:** `regenTokenLedger`, `proposals`, `referrals`
- **Land projects:** `applications`, `reviews`, `organisations`, `bioregions`
- **Admin:** `adminAuditLog`, `siteSettings`, `siteBanners`

The `game_variables` table is the admin-configurable parameter store for the
entire game system — contribution weights, citizenship requirements, harvest
ratios, gratitude budgets. Everything tunable without a code deploy.

---

## Contributing

Read `CONTRIBUTING.md` before opening a PR.

The short version:

1. Check `docs/` for relevant specs before starting work. There are detailed
   specs for the game system, citizenship tiers, quest progression, and more.
2. Follow the writing rules in `CLAUDE.md` for any user-facing copy.
3. Game logic changes need tests. The game is the product.
4. Never modify migration files after they've been applied to production.
   Write a new migration.
5. Run `npm run check` (TypeScript) and `npm test` before opening a PR.

### Earning tokens for your contributions

Every season, the community reviews all code contributions and creates
proposals on Hypha to track them. Contributors earn $ReGen tokens through
the contribution scoring system. Go to the
[ReGen Games contribution page](https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution)
to propose your contributions at the end of each season.

Your commits, PRs, reviews, and community support all count. The more you
contribute to the health of the project and the community, the larger your
share of the seasonal Harvest.

### Using AI to contribute

If you use Claude, Cursor, or another AI coding tool, paste the contents of
`AI_BUILDER_PROMPT.md` into your AI before starting work. It gives the AI
the full context it needs to contribute well: architecture, writing rules,
game system concepts, and what not to break.

---

## Architecture Decisions

**Why tRPC?** The team is small and full-stack TypeScript. tRPC eliminates
the API contract layer entirely. No OpenAPI, no code gen, no drift between
client and server types.

**Why MySQL over Postgres?** Railway's MySQL offering was the most reliable
option at the time the project started. The schema is MySQL-compatible
throughout (note: backtick-quote the `key` column in `game_variables` — it's
a reserved word in MySQL).

**Why a single `db.ts` file?** All database logic in one place makes it easy
to find queries and spot patterns. It's large but navigable with search.

**Why `game_variables`?** The game needs to be tunable by admins without code
deploys. Contribution weights, harvest ratios, tier requirements — all
configurable via the admin dashboard. This is the mechanism.

---

## Docs

| File | What it covers |
|------|----------------|
| `CONTRIBUTING.md` | How to contribute code, writing rules, PR process |
| `AI_BUILDER_PROMPT.md` | Full context prompt for AI coding assistants |
| `docs/ARCHITECTURE.md` | System architecture diagram and data flow |
| `docs/GLOSSARY_OF_TERMS.md` | Definitions of all project-specific terms |
| `docs/REGEN_GAMES_SPEC_V1.md` | Complete game system spec (24 features) |
| `docs/CITIZENSHIP_TIERS_SPEC.md` | Tier requirements, powers, DB schema |
| `SECURITY_AUDIT_2026-04-01.md` | Pre-open-source security findings |

---

## License

AGPL-3.0. See `LICENSE`.

This means: you can use, modify, and distribute this code freely. If you run
a modified version as a network service, you must make the source code of
your modifications available to users of that service.

---

## Community

Forum: [regencivics.earth/community](https://regencivics.earth/community)

This codebase is built with the community. If you build something good, share
it in the forum.
