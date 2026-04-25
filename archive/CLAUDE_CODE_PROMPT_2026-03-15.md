# Claude Code Briefing — ReGen Civics
*2026-03-15 — Start here for this session*

---

## What this project is

ReGen Civics is a fund and in-real-life game for regenerative land projects and the Regenerative Renaissance. The site is regencivics.earth.

**Tech stack:**
- Frontend: React + TypeScript + Wouter routing + Tailwind CSS v4 (via @tailwindcss/vite) + Radix UI (shadcn)
- Backend: Node.js + tRPC
- Database: MySQL on Railway via Drizzle ORM
- Hosting: Railway (Pro, 4 global replicas)
- Assets CDN: assets.regencivics.earth

**Key constraints — read these before writing anything:**
- No em-dashes anywhere in any file (use commas, periods, or rewrite)
- No AI writing patterns in any user-facing copy: no "delve", "tapestry", "foster", "leverage", "it's worth noting", "in conclusion"
- All copy should sound like a real person in the regen movement wrote it
- Accessibility: text must always be readable — never light text on light backgrounds
- `getDb()` is async — always `await getDb()` and add a null guard `if (!db) throw new TRPCError(...)`
- Tailwind v4 uses `@custom-variant dark (&:is(.dark *))` — dark mode requires `.dark` class on `<html>`
- Dynamic Tailwind classes (e.g. `` `bg-${season}` ``) get purged — always use static lookup objects

---

## Primary reference document

**`FIXES_TO_MAKE_2026-03-15.md`** — active fixes for this session. Read this first.

---

## Fully shipped as of end of 2026-03-14

| Fix | What |
|---|---|
| Fix 86 | Dark mode restored (ThemeProvider defaultTheme dark) |
| Fix 87 | Button stack + Footprints icon |
| Fix 88A | questQualifiers.ts cleared |
| Fix 89 | Why Quests? arc/tokens/qualifiers panels |
| Fix 90 | 18 new seasonal quests + images |
| Fix 70 | 7 community card images (WebP) |
| Fix 69 | 43 content fixes (em-dashes, AI patterns) |
| Fix 72 | Fire + Air sections on /community |
| Fix 73 | RSS feed router + steward UI |
| Fix 74 | Two-level severity flagging |
| Fix 75 | Community pulse strip + welcome card |
| Fix 76B | PDF download button in QuestDetailModal |
| Fix 77imp1-19 | All quest page improvements (gallery, filters, seasonal feed, journal, spotlight, toggles, arc map, etc.) |
| Fix 78A/B | PlayerProfile contrast + check-contrast.ts scanner |
| Fix 81 | Play page second video |
| Fix 83 | Connect forms dark styling |
| Fix 85 | Seed scripts markdown links + EPIC quest thread |
| Fix 91 | Language auto-detection removed (Russian stays, not auto-applied) |
| Fix 92 | Community card onError fallback |
| Fix 93-94 | Seed script team user + location fixes |
| Fix 95 | Community page Radix Accordion sections |
| Fix 96 | Lazy loading (already present, confirmed) |
| Fix 97 | Bundle splitting 663KB → 233KB |
| Fix 98 | Image compression (8MB → 100KB WebP) |
| Fix 99 | CLS prevention via width/height on card images |
| Fix 100 | Steward quest endorsements (DB + tRPC + UI) |
| Fix 101 | JS parallax backgrounds (translateY rAF, GPU-accelerated) |
| Fix 103 | Nav icon ⛰️ → 🌲 |
| Seed scripts | seed-active-entities.ts + seed-organisations.ts — DONE by Rye |
| DB migrations | All schema pushed, questEndorsements table live |

---

## Key gotchas for this codebase

1. **Tailwind v4** — no `tailwind.config.ts`. Config is in `@theme inline {}` block in `index.css`. Dark mode via `@custom-variant dark (&:is(.dark *))`.

2. **getDb() is async** — always `await getDb()` then null-guard.

3. **Dynamic class purging** — never construct Tailwind class names dynamically. Use static lookup objects.

4. **DB schema** — Drizzle ORM. Schema in `drizzle/schema.ts`. Run `pnpm db:push` to apply changes. Only Rye can run this (needs Railway DATABASE_URL).

5. **No em-dashes** — check before every commit.

6. **PageBackground parallax** — `scrollWithPage=false` (default) uses JS translateY parallax at `parallaxSpeed` (default 0.3) on desktop. `scrollWithPage=true` scrolls 1:1. Mobile always scrolls 1:1.

---

## Before finishing each wave

- No em-dashes introduced in any user-facing copy
- No light text on light backgrounds introduced
- No `console.log` statements left in
- Run `pnpm build` to confirm TypeScript compiles clean
