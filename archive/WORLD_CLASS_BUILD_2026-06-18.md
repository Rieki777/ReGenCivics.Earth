# World-Class Build, 2026-06-18 — shipped + Claude Code handoff

Execution pass on the 10 world-class moves from `SITE_AUDIT_2026-06-18_CTO_CDO.md`, skipping #2 (investor trust layer) because the fund is in formation with no team or history yet. This doc lists what shipped in code this session and gives one Claude Code prompt for the big items (backend, assets, ops, deep wiring) plus the secret-dependent steps.

The codebase turned out to be further along than the audit implied: onboarding is already wired (`WelcomeAboardQuests` mounts in `PlayerProfile.tsx`), the funnels already carry end CTAs (`Play` -> "Start Your Quest", `Fund` -> investor journey + LOI), and an admin analytics view and share components already exist. So this pass filled the real gaps and avoided duplicating what worked.

## Shipped this session (in the working tree)

| Move | What shipped | File(s) | Verify (grep) |
|---|---|---|---|
| #1 Homepage decides | A primary CTA directly under the hero ("Start your journey" -> `/connect`, "Play the game" -> `/play`), 52px targets, analytics on click | `client/src/pages/Home.tsx` | `home_hero_primary` |
| #4 Instrument the funnel | Rewrote analytics from a dead `window.umami` shim to a first-party transport that POSTs every event to `/api/analytics/collect`. Kept the entire `analytics.*` API, so all existing call sites (apply, loi, investor, quest, forum) now produce data. Honors Do Not Track / GPC, anonymous 30-day session id, CSRF, keepalive | `client/src/lib/analytics.ts` | `api/analytics/collect` |
| #4 / #10 | Existing `SharePrompt` now feeds first-party analytics on every share | `client/src/components/SharePrompt.tsx` | `analytics.shareClicked` |
| #10 Shareable | New `ShareButton` using the native Web Share sheet with copy-link fallback and analytics, ready to drop on quest completion and project cards | `client/src/components/ShareButton.tsx` | file exists |
| #5 Funnels | New reusable `CtaBand` (forest/cream tones, ambient glow, 48px targets, analytics) for any end-of-page next step | `client/src/components/CtaBand.tsx` | file exists |
| #6 Proof | New `TractionStrip`: count-up stats, IntersectionObserver trigger, reduced-motion aware, fully config-driven (never invents numbers) | `client/src/components/TractionStrip.tsx` | file exists |
| #8 Reliability | New `SmartImage`: never renders a broken box, swaps to a branded gradient placeholder on error, lazy + async decode | `client/src/components/SmartImage.tsx` | file exists |
| #9 Polish | Empty states now reveal with a staggered, reduced-motion-safe entrance | `client/src/components/ui/empty.tsx` | `fadeInUp` |
| #7 Onboarding | Verified already live: `WelcomeAboardQuests` mounts in `PlayerProfile.tsx` | n/a | `WelcomeAboardQuests` |

All new components use 44 to 52px touch targets, focus-visible rings, and `prefers-reduced-motion` guards, matching the "insanely beautiful and readable" bar.

## Sentry (secret-dependent, do this yourself)

The code is ready. `client/src/main.tsx` already inits Sentry, gated on `VITE_SENTRY_DSN`. To turn it on:

1. At sentry.io create a project (platform: React). Copy its DSN.
2. In Railway, open the web service, Variables, add `VITE_SENTRY_DSN` = the DSN. (It must be a build-time `VITE_` var, so a redeploy is required.)
3. Redeploy. Then trigger a test error and confirm it appears in Sentry.

---

# Claude Code prompt (paste this to build the big items)

> Work through the items below on the regencivics.earth repo. Each is grounded in components already shipped in `WORLD_CLASS_BUILD_2026-06-18.md`. Run the ship gate (`python3 scripts/audit-truncation.py`, `pnpm typecheck`) before any commit, follow `.ai/docs/security/BUILD-PLAYBOOK.md` for the new endpoint, and do not touch `CommandPanel.tsx`. Commit in logical batches and push.
>
> **1. Backend sink for first-party analytics (makes #4 real).**
> The client already POSTs events to `POST /api/analytics/collect` via `client/src/lib/analytics.ts`. Build the receiver:
> - Drizzle table `analytics_events` (id, event varchar, props json, path varchar, ref varchar null, sid varchar, ua varchar null, created_at). Add a numbered SQL migration in `drizzle/`; apply with `npx tsx scripts/run-migration.ts`.
> - An Express route (or tRPC public mutation) at `/api/analytics/collect`: validate with zod, cap body size, sanitize strings, rate-limit per IP (reuse the existing form limiter), drop unknown event names, never echo input. No auth (public ingest), but admin-only on read.
> - Extend the admin analytics surface: add an "Events" view (reuse `AdminEventsTab.tsx` / `AdminAnalytics.tsx` patterns) showing event volume over time, top events, and the conversion funnel (page_view -> cta_click -> apply_submitted / loi_submitted / signup_completed). Read via an admin-only tRPC query that aggregates `analytics_events`.
>
> **2. Kill broken images (move #8).**
> Audit `IMAGE_ARCHITECTURE.md`: most hardcoded R2 URLs 404. Either restore the R2 objects or finish the migration to local `/images`. Then roll out the shipped `SmartImage` component to the highest-risk surfaces (Showcase, Blog, Team, Governance, CrowdPooling, project cards) so nothing renders a broken box. Verify the default OG image `/og-default.jpg` and every per-page `/og/*` referenced in `SEO.tsx` actually resolve.
>
> **3. Live traction (move #6).**
> Wire the shipped `TractionStrip` with honest, real counts only (the fund is in formation, so no AUM or returns): projects on the map, quests completed, community members, bioregions touched. Source them from existing tRPC queries or a small aggregate endpoint. Place it on `/` (Home) and `/fund`. If a number is not real yet, omit that stat.
>
> **4. Share loop (move #10).**
> Drop the shipped `ShareButton` (native Web Share) onto the quest-completion surface (`QuestCompletionFeed.tsx` / quest detail) and onto project cards, with a "share your quest" message. Keep `SharePrompt` for the social-target grid.
>
> **5. Funnel orphan (move #5).**
> Surface the orphaned `/loi` from `/land` and `/apply` ("Early-stage? Send a Letter of Intent"). Use the shipped `CtaBand` where a page lacks a clear end CTA.
>
> **6. Character art (move #3).**
> Generate the 13 role illustrations (card portrait + full scene each, 26 images) per `CLAUDE_CODE_PROMPT_2026-04-03_CHARACTER_ART.md` using the `nano-banana-pro` skill, optimize to WebP into `client/public/images/roles/`, and place them on the Team and role surfaces via `SmartImage`.
>
> **7. Mobile P0s (from `MOBILE_FIRST_AUDIT_2026-06-18.md`).**
> Render `dialog.tsx` as a bottom sheet under `md` with `max-h-[calc(100dvh-2rem)] overflow-y-auto`; add safe-area padding to modal footers and toasts; add a sticky thumb-zone CTA on `/fund`, `/land`, `/play`, `/apply`.
>
> **8. CI guard (move #9).**
> Flip the contrast-audit CI from warn-only to fail-on-regression in `scripts/contrast-audit.mjs`, and lower ESLint `max-warnings` from 9999 toward a real number.

## Handoff Breakdown

| Step | Who |
|---|---|
| Items 1-8 above (code, assets, migration) | Claude Code |
| Apply the analytics migration against Railway DB | Claude Code (has DB access) or Rye |
| Create Sentry project + set `VITE_SENTRY_DSN` in Railway | **Rye** |
| Confirm Railway deploys are green and spot-check on a phone | **Rye** |

## Verify what shipped this session

```bash
grep -c "home_hero_primary" client/src/pages/Home.tsx                 # 1
grep -c "api/analytics/collect" client/src/lib/analytics.ts           # 1
grep -c "analytics.shareClicked" client/src/components/SharePrompt.tsx # 1
ls client/src/components/CtaBand.tsx client/src/components/ShareButton.tsx \
   client/src/components/SmartImage.tsx client/src/components/TractionStrip.tsx
grep -c "fadeInUp" client/src/components/ui/empty.tsx                  # 3
```
