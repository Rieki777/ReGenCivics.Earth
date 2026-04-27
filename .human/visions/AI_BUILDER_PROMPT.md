# Give This to Your AI Builder

Paste this entire document into any Claude instance, Cursor session, or other
AI coding tool before starting work on this codebase. It gives the AI the
context it needs to contribute well without breaking things.

---

## What This Project Is

ReGen Civics is a fund and a game for regenerative land projects. Two systems
running together:

**The Fund** backs regenerative land projects. Capital governed by the
community through proposals and trust-weighted voting.

**The Game** is how the community forms. Players complete quests, earn
contribution scores and $ReGen tokens, and grow the bioregional food economies
that back the currency's value. The more people play, the more real it becomes.

The thesis: food systems are the physical foundation of the new economy. Food
forests appreciate in land value AND increase in annual production every year.
The $ReGen token is backed by verified food production across the network.
That is what makes it different from every other regenerative project built on
belief alone.

Live: [regencivics.earth](https://regencivics.earth)

---

## Tech Stack

- **Frontend:** React 19, Vite, TailwindCSS 4, Radix UI
- **Backend:** Express, tRPC 11, TypeScript (ESM throughout)
- **Database:** MySQL 8 on Railway, Drizzle ORM
- **Auth:** Google OAuth, Apple OAuth, JWT
- **Email:** Resend
- **Storage:** AWS S3
- **Cache:** Redis
- **AI:** Anthropic Claude (admin assistant, content gen)
- **Monitoring:** Sentry, Umami analytics
- **Node:** 20+ required (`"type": "module"` in package.json — everything is ESM)

---

## Project Structure

```
client/src/pages/       # 77 page components
client/src/components/  # Shared + admin/ game/ profile/ ui/
server/_core/           # Express, auth, email, LLM, security
server/game/            # Game logic (scoring, harvest, tiers)
server/routes/          # REST endpoints (OG, embed, presence)
server/db.ts            # All database queries (~113KB, single file)
server/routers.ts       # tRPC router definitions
drizzle/schema.ts       # 101-table database schema
drizzle/0000_...sql     # Migration files (numbered, never edit after applied)
shared/                 # Types shared client/server
docs/                   # Specs, planning docs, game design
```

---

## Hard Rules — Read Before Writing Anything

### Code rules

1. **Never edit migration files after they've been applied to production.**
   Write a new migration. Drizzle generates them: `npx drizzle-kit generate`.

2. **The `key` column in `game_variables` is a MySQL reserved word.**
   Always backtick-quote it: `` `key` `` in all SQL.

3. **Game logic lives server-side.** Contribution scoring, harvest
   calculations, citizenship tier checking — never trust the client.

4. **`db.ts` is the only place for database queries.** No inline SQL in
   route handlers or components. Add queries to `db.ts`.

5. **tRPC for all client-server calls.** No new REST endpoints unless there's
   a specific reason (webhooks, OG image generation, etc. are REST by
   necessity). Everything else goes through the tRPC router.

6. **ESM throughout.** Use `import`/`export`. Never `require()`. Use `.mjs`
   for standalone scripts that need top-level `await`.

7. **TypeScript strict mode is on.** Run `npm run check` before completing
   any task. Type errors block the build.

### Writing rules — applies to ALL user-facing copy

These rules apply to every string a user sees: UI labels, page copy, emails,
forum posts, quest descriptions, error messages. No exceptions.

**RULE 1: No em-dashes. Zero.**
Replace with a comma, colon, period, or rewrite the sentence.
- Wrong: "This is the seed thread — share what you made."
- Right: "This is the seed thread. Share what you made."

**RULE 2: No contrast-framing.**
Never define something by what it isn't.
- Wrong: "This is not marketing. It's genuine participation."
- Wrong: "Not just a game, but a movement."
- Right: State what it IS. Lead with the affirmative.

**RULE 3: No AI word patterns.**
Banned: delve, tapestry, foster, leverage, vibrant, crucial, groundbreaking,
transformative journey, testament to, beacon of, nurture (as metaphor),
unlock, unleash, seamless, robust, comprehensive, cutting-edge, empower,
utilize, navigate (as metaphor), embark on, it's worth noting.

**RULE 4: No rhetorical question openers.**
Don't start sections with "What if we could...?" or "Have you ever wondered...?"

**RULE 5: No passive inspiration.**
"Join us on this journey", "be part of something bigger", "together we can"
— vague filler. Say something specific instead.

**Voice:** Direct, grounded, specific. Write as if a thoughtful person inside
the regen movement wrote it. Contractions fine. Short sentences fine.
First person fine. The site sounds like Rye. Keep it sounding like Rye.

---

## The Game System — Key Concepts

Read `docs/REGEN_GAMES_SPEC_V1.md` before touching game logic.

**Contribution scores** are ranked on a 0-99 percentile scale across all
players. Score determines Harvest share and governance weight. Scores decay
each season so active contributors always earn more than inactive ones.

**Gratitude tokens** are sent player-to-player each lunar cycle (~29.5 days).
At cycle end, a token pool distributes to players who received gratitude.
Budget per cycle depends on citizenship tier.

**Citizenship tiers** (Explorer / Co-Creator / Steward / Sage) gate
governance powers and Harvest multipliers. Requirements are in `game_variables`
table, checked by the nightly batch job.

**The Harvest** is the seasonal $ReGen distribution. 30% to contributors
(by score), 20% to bioregional financing facilities, 20% to organisations,
30% to shared treasury. All ratios are in `game_variables` and changeable
by governance proposal.

**Bioregional game mechanic:** Players join a bioregion. Growing local food
economy activity (via LocalScale and partner networks) increases your
bioregion's share of the Harvest pool.

**`game_variables` table** is the admin-configurable parameter store.
Never hardcode game parameters in code — they all come from here.

---

## The Two Games Distinction

**Critical context:** There are two financial instruments.

- **$RCivics** (RCVoice) — The Fund. Anchored in the old game. For investors
  and the capital layer.
- **$ReGen** (RGVoice) — The Game token. Earned through quests and
  contributions. Backed by food production.

These work together as two sides of a bridge. Read
`docs/CONTEXT_THE_TWO_GAMES.md` before writing anything about governance,
finance, tokens, or the two-sided structure.

---

## Database — Working with Migrations

The database is MySQL 8 on Railway. Public proxy:
`nozomi.proxy.rlwy.net:46413`.

**Applying migrations from a local machine (not from the VM/sandbox):**

Write a `.mjs` script. Strip comment lines before splitting on semicolons
(critical — comment lines above INSERT blocks will cause statements to be
silently skipped):

```js
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const raw = readFileSync('./drizzle/your_migration.sql', 'utf8');
const stripped = raw.split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
const stmts = stripped.split(';').map(s => s.trim()).filter(s => s.length > 20);

for (const stmt of stmts) {
  try {
    const [r] = await conn.query(stmt);
    console.log(`OK (${r.affectedRows ?? 0}): ${stmt.slice(0, 60)}...`);
  } catch (e) { console.error(`FAIL: ${e.message}`); }
}
await conn.end();
```

Run from the project root: `cd project-root && node your_script.mjs`

**`ON DUPLICATE KEY UPDATE` only fires on PRIMARY KEY or UNIQUE index.**
If a column lacks a UNIQUE constraint, re-running a seed will create
duplicate rows. Check the schema before assuming idempotency.

---

## Active Planning Docs

Read these before starting any significant work:

| File | What it covers |
|------|----------------|
| `docs/REGEN_GAMES_SPEC_V1.md` | THE game spec. All 24 game features, 5 phases, DB schema. Start here for game work. |
| `docs/CITIZENSHIP_TIERS_SPEC.md` | Four-tier system (Explorer/Co-Creator/Steward/Sage), requirements, powers, DB schema. |
| `docs/SEEDS_VISION_IMPLEMENTATION_SPEC.md` | 33 features translating SEEDS economic design into ReGen Civics. |
| `docs/FOOD_FOUNDATION_SPEC.md` | How the food-as-foundation thesis should appear across all pages. |
| `docs/PROGRESS_MAP_DESIGN.md` | Interactive progress map component spec. |
| `docs/QUEST_PROGRESSION_SPEC.md` | Quest locking and unlock chain. |
| `FIXES_TO_MAKE_2026-04-01.md` | Active fix queue (12 fixes). Check this before starting. |
| `CLAUDE_CODE_PROMPT_2026-04-01_UNIFIED_BUILD.md` | Current main build prompt. 7 tracks. |

---

## What's Currently Being Built

As of 2026-04-01, active work covers:

1. **Citizenship tier system** — schema done (migration 0098), seed data done
   (0099, 0100). UI and batch job still needed.
2. **Food foundation copy** — new copy for Economy, Game, Fund, Home, and
   Incubator pages. Spec in `docs/FOOD_FOUNDATION_SPEC.md`.
3. **UI fixes** — 12 fixes in `FIXES_TO_MAKE_2026-04-01.md` including mobile
   readability, error page buttons, gold banner, OG image.
4. **Background and OG images** — generation spec in
   `CLAUDE_CODE_PROMPT_2026-04-01_BACKGROUND_AND_OG.md`.

---

## Skills Available (Claude Code / Claude Desktop)

These skills are in `~/.claude/skills/` and `[project]/.claude/skills/`:

| Skill | When to use |
|-------|-------------|
| `regen-database-sql` | Any DB work — migrations, seeds, queries, schema changes |
| `regen-fixes-handoff` | Creating or updating any FIXES_TO_MAKE_*.md file |
| `regen-community-onboarding` | Quest flows, player journeys, welcome sequences |
| `regen-content-repurposing` | Turning long-form content into social posts, emails |
| `regen-outreach-sequences` | Writing emails for investors, land projects, community |
| `regen-fundraising-copy` | Pitch content, grant applications, investor materials |
| `avoid-ai-writing` | Auditing copy for AI-isms before it ships |
| `nano-banana-pro` | Image generation via Gemini 3 Pro Image API |
| `webapp-testing` | Playwright testing and screenshot verification |
| `implementing-code` | Writing clean, well-structured new features |
| `debugging` | Systematic root cause analysis |

Always check available skills before starting a task. Read the relevant
`SKILL.md` file first.

---

## What Not to Break

These are the things that will cause the most pain if they go wrong:

- **Auth flow** (`server/_core/oauth.ts`, `server/_core/context.ts`) — users
  get logged out or can't log in, and it's invisible until someone reports it.
- **tRPC router** (`server/routers.ts`) — a type error here breaks the entire
  client-server interface.
- **`game_variables` table** — the parameter store for the whole game system.
  Deleting or renaming keys breaks the game without an obvious error.
- **Migration files** — once applied to production, never edit. Write a new one.
- **Forum category slugs** — quest cards link to forum categories by slug.
  Changing a slug breaks those links silently.
- **`drizzle/schema.ts`** — single source of truth for all 101 tables. Changes
  here need a migration before they work in production.

---

## Running the Project

```bash
npm install
cp .env.example .env   # fill in credentials
npm run dev            # starts on localhost:5000
npm run check          # TypeScript type check
npm test               # run Vitest tests
```

---

## Contribution Guidelines

1. Check `docs/` for the relevant spec before writing code.
2. Follow the writing rules above for any user-facing copy.
3. Run `npm run check` before opening a PR.
4. Add a test for any game logic changes.
5. Never modify applied migrations.
6. Keep PRs focused — one thing per PR.
7. If something is ambiguous, ask in the forum before building it.

---

## The Bigger Picture

The goal is a network of communities with clean food, clean water, and enough
energy — so that regardless of what happens in the broader world, everyone's
kids are fed. The game is how we coordinate to build that, together, at scale.

Dr. King said those who love peace must learn to organize as effectively as
those who love war. This is that organizing, applied to food and community.

Every feature you build is part of that. Build accordingly.
