# Claude Code Prompt: Finish the Crowdpooling Platform

Paste everything below the line into Claude Code from the repo root. It is scoped, grounded in the as-built code, and ordered so each task ships green on its own.

Context for whoever is pasting: the crowdpooling core is complete and live (unified campaign system + needs registry, claim lifecycle with delivery-triggered payoffs, 9-capital taxonomy shared across both calculators, recommended-funders block + capital stack bar, deterministic + AI design coach, visual polish, mobile audit, one-click Hypha formalization, and the `cascadeCrowdpoolPassed` on-chain reconciliation). What is left are Phase 4/6 enhancements and two cron jobs that were specced but never built. Full design lives in `CROWDPOOLING_PLATFORM_SPEC.md`, `CROWDPOOLING_COACH_SPEC.md`, and `CROWDPOOLING_MASTER_PLAN.md`.

---

You are finishing the crowdpooling platform. Read `CLAUDE.md`, `.ai/docs/STEERING.md`, `CROWDPOOLING_PLATFORM_SPEC.md`, and `CROWDPOOLING_COACH_SPEC.md` first. Hard rules that apply to every task: no em-dashes, no contrast framing, Rye's direct voice in all copy; use the migration runner (`npx tsx scripts/run-migration.ts`), never drizzle-kit generate; run the ship gate (`pnpm gate`) before any DONE claim; commit only the files you touch (a second session may be editing this repo concurrently, so use targeted `git add`, `git pull --rebase --autostash origin main` before pushing, and never `git add -A`); crowdpooling never mints or moves platform tokens (issuance is on-chain in Hypha DHOs).

Known-good patterns to copy, do not reinvent:
- Server read/write procedures live in `server/routes/campaigns.ts` on `campaignsRouter`. Ownership gate: `campaign.userId !== ctx.user.id && ctx.user.role !== 'admin'`.
- Nightly work is `expireCrowdpoolClaims(db)` in `server/routes/batchJobs.ts`, dispatched from the nightly batch (`runNightly`) and from `server/_core/index.ts`. Add new steps the same way.
- Emails go through `server/_core/email.ts` (`sendEmail`, honors the EMAIL_HOLD kill switch and `player_profiles.emailDigestFrequency`). The weekly digest slot is `runDigestJob`.
- Tables already exist: `campaign_partner_links` (partner enum maearth/gosteward/grant/other, url, cachedRaised, cachedContributorCount, cachedPercent, lastFetchedAt), `campaign_followers` (email-only followers), `user_follows` with `targetType:'campaign'` (account followers), `campaign_contributions` (has `contributorEmail`, `userId` nullable, `status`, `hyphaBridgeKey`, `hyphaConfirmedAt`).
- The recommended-funders read is `campaigns.getPartnerLinks`. The capital colors are `CAPITAL_COLORS` in `shared/crowdpoolingTaxonomy.ts`.

## Task 1: Partner-progress hydration nightly job (highest value)

Right now `campaign_partner_links.cachedRaised / cachedContributorCount / cachedPercent` are only ever set by the demo seed. Real campaigns show nothing. Build a nightly job that refreshes them.

- Add `hydrateCampaignPartnerLinks(db)` to `server/routes/batchJobs.ts`, dispatched as a new numbered step in `runNightly` and wired in `server/_core/index.ts` next to the crowdpool claim sweep.
- For each `campaign_partner_links` row on an `active` or `funded` campaign, server-side `fetch()` the `url` (Ma Earth project page or GoSteward campaign page), parse the raised amount, contributor/backer count, and percent from the server-rendered HTML, and write them plus `lastFetchedAt = now`.
- Be defensive: wrap each fetch in try/catch, cap concurrency (batch of ~5), time out at ~10s, and on any failure leave the existing cached values and `lastFetchedAt` untouched (never zero them). Parsing is fragile; write small per-partner extractors with clear fallbacks and unit-test them against a saved HTML fixture in `server/`.
- Acceptance: a fresh run updates a real link's cached numbers; a forced fetch failure leaves the old numbers intact; `pnpm gate` green; a unit test covers both partner parsers. Evidence: test output + a manual run log.

Note for Rye: this reads public Ma Earth and GoSteward pages. If either blocks server fetches or changes markup, the extractor degrades to stale cache, which is acceptable. A cleaner long-term path is asking those teams for a small JSON endpoint.

## Task 2: Weekly steward digest email

The claim-expiry sweep and reminders exist; the weekly steward digest does not.

- Add `sendStewardWeeklyDigest(db)` and dispatch it from `runDigestJob` (the existing weekly slot), guarded so it runs at most weekly per steward.
- For each `active` campaign, email the steward (campaign.userId's email) a short digest: unfilled needs (from `campaign_items` where quantityClaimed < quantityWanted), claims expiring in the next 3 days (accepted contributions with `claimExpiresAt` soon), new followers this week (`campaign_followers` + `user_follows` targetType campaign), and pending reviews (contributions with status `pending`). Plain, warm, scannable. Link each section to `/campaign/:id/manage`.
- Honor `sendEmail`'s hold switch and the steward's digest frequency preference. Skip a campaign with nothing to report.
- Acceptance: a dry run composes a correct digest for demo campaign 79; nothing sends when a campaign is quiet; `pnpm gate` green. Evidence: the composed digest logged for campaign 79.

## Task 3: Link anonymous contributions on signup (`claimMyContributions`)

Anonymous claiming is open, but a person who later makes an account never gets their past contributions attributed.

- Add `campaigns.claimMyContributions` (protectedProcedure, no input) that sets `campaign_contributions.userId = ctx.user.id` for every row where `userId IS NULL AND contributorEmail = ctx.user.email`, and back-creates the verified `player_contributions` Living Tree rows for any that were already `fulfilled`/`thanked` (mirror the fulfilled-side logic already in `updateContributionStatus`). Idempotent.
- Call it once right after account creation / first login in the auth flow (`server/routes/auth.ts` or `server/_core`), best-effort and non-blocking.
- Acceptance: an anonymous fulfilled contribution made under an email, then an account created with that email, shows up on the new player's profile/Living Tree. Evidence: an integration test in `server/contributions.test.ts` following the existing createCaller + skipIfNoDb pattern.

## Task 4: Eligibility quiz that routes projects to the right funder

Phase 4 item. On the campaign creation flow or the campaign detail recommended-funders block, add a 3-question quiz (gift-stage vs revenue-generating; community breadth; capital need size) that recommends Ma Earth (donations + matching, community breadth), GoSteward (loans, established revenue, $100k+ need), or both. Deterministic mapping, no AI needed. Keep copy as recommendations, never "partners", and never imply we arrange financing. Mount it in `client/src/pages/CampaignDetail.tsx` near the recommended-funders block or as a small step in `CreateCampaign.tsx`. Acceptance: each answer combination yields a sensible recommendation; `pnpm check` green.

## Task 5: Pledge simulator on the campaign page

Phase 4 item. A small interactive widget on `CampaignDetail.tsx`: the visitor picks a need or drags an hours/value slider and sees, live, what it unlocks (which capital it fills, how close it moves that capital to solid on the balance meter, the fair-market value). Reuse `analyzeCoverage` and the `valuationFor*` helpers from `shared/crowdpoolCoach.ts` and `CAPITAL_COLORS`. Pure client, no server call. Acceptance: adjusting the slider updates the capital meter and value live; matches the coach's numbers.

## Task 6: Projects map view

Phase 6 item. `campaigns` has `location` text but lat/lng are unset. Add optional `lat`/`lng` columns (migration) populated from `location` via a geocode step at campaign creation (or a one-shot backfill script), then add a Leaflet map to the gallery (`CrowdPoolingProjects.tsx`) showing active campaigns as pins linking to `/campaign/:id`. The repo already uses `react-leaflet` + `leaflet` (see other map pages). Acceptance: demo campaigns 79-82 appear as pins at roughly their real locations.

## Task 7: Live QA of the wizard design coach (needs a logged-in session)

The coach UI (Capital Balance meter, teaching tips, valuation helpers, Design coach panel) is behind login + the campaign password (`222`) + application-select, so it was never walked live. In a browser session, log in, open `/create-campaign`, pick an application, and verify: the meter fills as needs are added and matches "N of 9"; the Design coach panel opens, returns coaching plus add-able suggestions, and adds them to the right list; the "suggest a fair value" helpers return sane bands; nothing blocks submit; on mobile width the coach launcher clears the bottom nav. Fix anything that misbehaves. Evidence: screenshots at desktop and mobile widths.

## Out of scope (Rye decides, not code)

- Ma Earth and GoSteward relationship conversations and logo permission.
- Confirming the production `AI_MODEL` the Design Companion should use (it inherits whatever is configured).
- Real campaign photography for the demo campaigns.
- The app-wide sub-44px button tap-target migration is deferred by prior decision; leave crowdpooling consistent with the app rather than a one-off.

## Handoff Breakdown

| Work | Owner | Notes |
|---|---|---|
| Tasks 1-6 code, migrations, tests, deploy | Claude Code | Standard flow: migration runner, `pnpm gate`, `/ship`, targeted commit, rebase, push, verify Railway green |
| Task 7 live QA (login required) | Claude Code with a browser session, or Rye | Needs real auth; report screenshots |
| Ma Earth / GoSteward outreach + logo permission | Rye | Blocks nothing in code |
| Confirm prod `AI_MODEL` for the coach | Rye | Config only |
| Demo campaign photography | Rye | Or leave AI-generated, labeled |

Ship each task independently. After all land, delete this prompt doc (auto-archive per STEERING section 8).
