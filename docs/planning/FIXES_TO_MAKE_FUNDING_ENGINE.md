# Fixes to Make: Funding Engine (Phase 0 and the application kit)

Started 2026-09-27. Follows the funding engine handoff and plan v1.3 (both private, in the lead session's gitignored `docs/private/`; copies in `C:/Users/taren/Downloads/funding-engine-kit/` and the vault). Status vocabulary per the regen-fixes-handoff SOP; every DONE or VERIFIED row carries evidence.

---

## Phase 0: the public site stops describing a fund

Merged as 6183af17 (PR #165), CI green on main (run 36381158685), deployed as Railway 6c59fa4b (SUCCESS). Live checks ran against regencivics.earth on 2026-09-27 after the deploy.

| # | Fix | Status | Evidence |
|---|---|---|---|
| P0-1 | Return, IRR, yield, appreciation, listing and offer language removed from every public surface; fund copy rewritten to the cooperative in design (`COOP` in `shared/fund.ts`) | VERIFIED | Live: llms.txt, llms-full.txt and the server HTML of 11 routes scanned with the gate's rules, 0 G5 or retired hits. Rendered /fund, /opportunity and /loi carry no upside words; the one "investment" is the FAQ "Is this an investment?", answered "The cooperative accepts no money today, and nothing on this site is an offer." Source: `node scripts/check-fund-claims.mjs` clean on main (1944 files) |
| P0-2 | Claims checker extended (G5 phrase rules, traction numbers, README and context docs) and failing CI | VERIFIED | `server/fund-claims-guard.test.ts` passes; the checker is a blocking step in `.github/workflows/ci.yml`, green on main |
| P0-3 | Crowdpooling described as coordination with money through outside partners each project holds (not "direct investment") | VERIFIED | live llms files and crawler HTML: 0 "direct investment" hits |
| P0-4 | One `metrics` source; public pages show no traction numbers until Rye confirms and publishes them | VERIFIED | Live: `stats.getPublicStats` refuses anonymous callers; `metrics.public` returns an empty set. Migration 0275 applied in production |
| P0-5 | Treasury demo with real organizations as payouts removed from /fund | VERIFIED | live /fund text has no treasury, payout or disbursement content; `TreasuryDashboard.tsx` deleted |
| P0-6 | Campaign cards and the total-value bar | DONE (crowdpool lane) | live since 6d7f070e (two-line bar, nine-capital sheet, Example labels) |
| P0-7 | Positioning kernel out of the public repo, into the versioned `funding_prompts` table | VERIFIED | production `funding_prompts` versions 1 and 2 seeded by `scripts/seed-funding-prompts.ts`; `server/funding/positioning-kernel.ts` holds only a neutral fallback |
| P0-8 | /investor-contact, /crowdpool, /projects, /about redirect | VERIFIED | Live 301s: /about to /team, /projects to /campaigns, /crowdpool to /crowd-pooling, /investor-contact to /investor/contact, /investor to /loi, /risk-disclosure to /disclaimers, /investmentform to /loi |
| P0-9 | Storage docs say Cloudflare R2; 100 root planning docs moved to docs/planning/, docs/ and archive/ | DONE | commit 974f4e41 records 100 renames; STEERING section 8 amended; CLAUDE.md 148 lines (ADR-63) |
| P0-10 | Investor funnel retired: qualification form, pledge form, drip emails, return calculator | VERIFIED | Live: /investor redirects to /loi; /loi has no amount field; `coop.submitInterest` rejects bad input with 400. Production `scheduled_emails` has no pending investor rows |
| P0-11 | Surfaces the original list missed: index.html JSON-LD, AI chat prompts, emails, Team roles, blog posts, the public deck PDF, fund-text images, CONTEXT_THE_TWO_GAMES.md, DOMAIN-LANGUAGE.md | VERIFIED | live index.html JSON-LD and meta scanned with each page's HTML: 0 hits; line-by-line log in the private counsel review; ADR-62 |
| P0-12 | Home banner text (database row) | VERIFIED | migration 0276 applied to production (1 statement); the live landing page banner reads "A cooperative regenerative society is in design: land projects and people buying and stewarding land together." with links to /fund and /seasons |
| P0-13 | Team page role copy (database `roles` rows) synced to the rewritten `gameRoles.ts` | VERIFIED | `UPDATED: 25 roles, 135 fields`; a second dry run reports 0 differences. Token awards are no longer priced in dollars ("500,000 $ReGen ($5,000)" is now "500,000 $ReGen"); `skills-builder.specialContent` preserved |
| P0-14 | Five deleted public files still reachable: the July investor deck PDF, three governance images and one return card. The origin returns 404 for all five; Cloudflare's edge serves its cached copy (`cf-cache-status: HIT`, `cache-control: immutable`, up to a year) | HUMAN STEP REQUIRED | R-14 |
| P0-15 | The contrast audit could not read `oklab()`/`oklch()` colors (Tailwind 4 opacity modifiers and theme tokens). It measured the /loi form's dark text against the dark page instead of its white card (21 false failures, also counted under /investor, which redirects there) and skipped every oklch-colored text. Parser fixed, gradient stops keep their alpha, /loi required-field asterisks darkened (red-600 measured 4.35:1), /fund breadcrumb reads "The Cooperative" | VERIFIED | Merged as 9ee3f77a (PR #166), deploy 651f0011 SUCCESS. Live: the /fund breadcrumb reads "Home The Cooperative"; all four /loi asterisks compute to red-700 (oklch 0.505 0.213 27.5). CI's audit with the fixed parser on both sides: 6 resolved, none added |
| P0-16 | Three shared contrast misses the old parser hid, on every route: the footer "Send gratitude" gold heading (4.08:1), the command search placeholder (3.97:1), the ⌘K hint (4.37:1) | flagged as a follow-up task | live re-audit, 2026-09-27 |

One live check reads as a miss and is not: "43 land projects" on /opportunity is the dated Season One record (2022: 43 applied, 16 presented, 13 selected; confirmed by Rye 2026-09-24), rendered from `SEASON_ONE` in `shared/regenYear.ts`. The traction gate is for live counts.

## Phase 1: the application kit

Plan v1.3 section 9: the linter by Oct 1 (done in the kit folder), the tables and the packet view by Oct 12. The tables stay unmerged through the Sep 30 to Oct 5 merge freeze.

| # | Fix | Status | Evidence |
|---|---|---|---|
| K-1 | Draft linter: portal character and word limits, G5, retired claims, dashes, leftover placeholders (`[VERIFY]`, `[DECIDE]`, `$X`, `[N]`), unconfirmed numbers, AI words, contrast framing | DONE for Cowork, CODED in the repo | The kit folder's `lint-application-draft.mjs` is a standalone bundle of the repo code, tested from that folder on a PearX test draft: it failed the placeholder, both G5 phrases, the em-dash, the over-limit answer and the unknown heading (exit 1), and listed the 55 empty required questions on one line. `server/application-lint.test.ts` 12 pass |
| K-2 | Exact questions for 500 Global, PearX, YC, Techstars and Emergent Ventures | DONE | `app_questions_seed.json` (private): 66, 72, 49, 27 and 23 questions |
| K-3 | One rulebook: G5 rules and retired claims move to `shared/g5Rules.mjs`, read by the site gate, the draft linter and the admin packet view | CODED | `check-fund-claims.mjs` re-exports the shared rules; a test asserts the gate and the linter hold the same rule objects; the gate's exemption list is exported and imported by its test, so the two cannot drift |
| K-4 | Question bank, answer bank and answer versions in the database (migration 0277); deadlines, track and stage on the pipeline; the Applications packet view and the Answer bank in /admin/funding; seed, backfill and import scripts (ADR-64) | CODED, merges after the freeze (Oct 5) | Scratch MariaDB (127.0.0.1): 0277 applied; 237 questions over five programs seeded, a second run reports no change; 11 starter answers seeded, 7 flagged as not approvable until their placeholders go; a test draft imported as versions, re-import wrote nothing. Tests: `server/funding-kit.test.ts` 18, `shared/fundingKit.test.ts` 9, `server/funding-kit.integration.test.ts` 6 (refuses any database that is not local). Full unit suite 3256 pass. Harness stories funding-applications, funding-packet and funding-answer-bank render clean at desktop and mobile widths |
| K-5 | After the Phase 1 deploy: apply 0277, then seed questions, backfill deadlines and seed the answer bank in production | SCRIPTS READY | `npx tsx scripts/run-migration.ts drizzle/0277_funding_application_kit.sql`, then `npx tsx scripts/seed-app-questions.ts --write`, `npx tsx scripts/backfill-funding-deadlines.ts --write`, `npx tsx scripts/seed-answer-bank.ts --write` (each dry-runs first without `--write`) |

## Phase 2: deadline pings

Plan v1.3 section 9: "every row with a deadline_at gets its 21-, 7- and 2-day pings exactly once, and no deadline is missed", by Oct 9. Stacked on Phase 1 (it needs `deadlineAt`), so it merges after Phase 1.

| # | Fix | Status | Evidence |
|---|---|---|---|
| D-1 | A `funding_deadlines` automation on the hourly admin-automations cron: each funder row with a deadline in the next 21 days gets one Telegram ping at 21, 7 and 2 days, in one message per tick with its packet counts; rows submitted, in review, decided or parked get none. Migration 0278: the enum value and `funding_deadline_pings`, whose unique key (row, deadline, threshold) makes each ping go out once even if two ticks overlap; a failed send releases its claim so the next tick retries | CODED | `server/funding-deadlines.test.ts` 7 pass; `server/funding-deadlines.integration.test.ts` 4 pass against scratch (a failed send records nothing, due pings go out once in one message, the next tick sends nothing, a moved deadline pings again); `scripts/seed-funding-deadlines-automation.ts` seeds once and is a no-op on re-run |
| D-2 | Production cron auth: four Railway cron services send the literal text `$CRON_SECRET` and get 401 every run, so their jobs have not run since at least Aug 31 (R-15) | HUMAN STEP REQUIRED | `railway logs`: cron-admin-automations, cron-governance-jobs and cron-nightly-batch return {"error":"Unauthorized"} on every run; production admin_automations show one run each, on Aug 31. The web service and these crons hold the same CRON_SECRET (hashes match); each failing command is a bare `curl ... $CRON_SECRET` with no shell to expand it, and every cron wrapped in `sh -c` authenticates. cron-operator-pulse-ping also has an empty CRON_SECRET |

## Phase 5: grants for land projects (the Network Grant Engine, first slice)

Plan v1.3 section 9: "a steward completes the seven-field form and sees each matched program with its deadline and the one criterion the project misses", by Oct 16. Stacked on Phase 2 (it extends the pings), so it merges after Phases 1 and 2 (ADR-65).

| # | Fix | Status | Evidence |
|---|---|---|---|
| N-1 | Program fields on `funding_pipeline` (audience, programKey, applicant types, geography, match, advisor, partners, status); `project_funding_profiles` keyed by application; `network_grant_matches` with no fee column; a rules matcher (`shared/grantMatcher.ts`) naming the one fixable criterion a near miss lacks; the steward section "Grants this project can apply to" on the project page; Project matches in /admin/funding; the admin Pipeline limited to ReGen's own funders | CODED | `shared/grantMatcher.test.ts` 11, `server/project-funding.test.ts` 9 (steward gate on every procedure, consent required, no fee, commission or percentage column), `server/project-funding.integration.test.ts` 4 against scratch (matches and near misses stored, a decision survives a recompute, profile deletion removes every match). Migration 0279 applies on scratch. Full unit suite 3292 pass; build passes. Harness stories project-grants-form, project-grants-matches and funding-project-matches render clean |
| N-2 | Deadline pings for programs a land project is pursuing or drafting, once per project; programs nobody is working on are never pinged, and a program either ReGen or a project could apply to (audience both) pings as ReGen's own only once Rye moves it past not started (two fall due in October, one outside ReGen's region) | CODED | `server/funding-deadlines.test.ts` 8 (including one program pinged once per project), and the integration suites above; a funder row deleted mid-run is skipped instead of failing the tick |
| N-3 | After the Phase 5 deploy: apply 0279 and load the 34 programs | SCRIPTS READY | `npx tsx scripts/run-migration.ts drizzle/0279_network_grant_engine.sql`, then `npx tsx scripts/seed-grant-programs.ts --write` (dry-runs first without `--write`) |

---

## Handoff Breakdown: Who Does What

### YOU (Rye): things only you can do

| # | Task | Why only you | Where |
|---|---|---|---|
| R-1 | File the Delaware C-corp (Clerky), then EIN and SAM.gov UEI. 500 Global asks for a legal name, country of incorporation and a cap table; neither 500 Global nor PearX says it accepts "incorporation in progress". | legal filing in your name | clerky.com, irs.gov, sam.gov |
| R-2 | Confirm the numbers applications will use: land projects applied (live count 66 = 43 in 2022 + 23 since Feb 2026: confirm the definition), revenue to date (amount, date, whether it can be said), alliance organizations, SEEDS lineage, founder years | only you know which are true | /admin/funding, Metrics view |
| R-3 | Send the SELC email (Gmail draft ready; add the three new questions in the private legal research) and join an online Legal Café (Sep 30 or Oct 1) | sending as you | Gmail drafts; theselc.org/cafe |
| R-4 | Set the ask (plan v1.3 section 2) | a decision | plan v1.3 |
| R-5 | Frame the Gathering camp as a readiness camp (no offering terms, no introduction fees) and ask counsel about Rule 148 by Oct 9 | legal judgment | counsel |
| R-6 | Review the private counsel review file and decide the open judgment calls (design principles published, token swap wording, $RCivics claim bridge, notice to the 85 people who received the old investor drip) | legal judgment | docs/private/COUNSEL_REVIEW.md |
| R-7 | Decide whether to scrub git history of the old kernel and fund copy (you deferred it until after Oct 4) | force-push rewrites every SHA | revisit Oct 5 |
| R-8 | Migration 0262 (Ally Steward + Sage) is merged to main but not applied in production; it belongs to that lane | not this build's migration | `npx tsx scripts/run-migration.ts drizzle/0262_ally_steward_sage_wiring.sql` once that lane confirms |
| R-9 | Provide a real postal address (PO box or private mailbox) for the email legal footer before any bulk email; `HARVEST_POSTAL_ADDRESS` is city-level today | your address | Railway variables |
| R-10 | Create a Simpler.Grants.gov API key (needs a Login.gov sign-in) for grant discovery | account in your name | simpler.grants.gov |
| R-11 | DNS: SPF, DKIM and DMARC for outreach from the Workspace mailbox (start DMARC at p=none) | DNS access | domain registrar |
| R-12 | Create the YC and Techstars portal accounts so Cowork can verify their questions | accounts in your name | ycombinator.com/apply, apply.techstars.com |
| R-13 | Small calls: founding year (index.html says 2023, Season One ran in 2022); the "4 Paths" home video may say "Investors" on screen; the July deck copy on CloudFront and two fund token logos on the assets domain still exist outside the repo | your content | n/a |
| R-15 | Fix four Railway cron services that have failed auth on every run since at least Aug 31 (D-2). In each service's Settings, Deploy, Custom Start Command, wrap the curl in `sh -c '...'` so `$CRON_SECRET` expands, e.g. `sh -c 'curl -sS -X POST -H "Authorization: Bearer $CRON_SECRET" https://regencivics.earth/api/cron/admin-automations'`. For cron-operator-pulse-ping, also set its CRON_SECRET variable to `${{ReGenCivics.Earth.CRON_SECRET}}`. Decide first about the catch-up: governance jobs will expire promotions, assign storytellers, create renewal threads and reconcile Hypha bridges four weeks late; the nightly batch will run citizenship tiers, the event sweep, crowdpool claim expiry, partner progress and the gratitude cycle close; admin automations resume your 8am second-brain message (and, after Phase 2, the deadline pings) | dashboard access, and the catch-up is a judgment call | Railway dashboard: cron-admin-automations, cron-governance-jobs, cron-nightly-batch, cron-operator-pulse-ping |
| R-16 | Confirm or change the seven questions on the project funding profile (plan 11.2 marks them [DECIDE]). The build asks: who would apply (legal wrapper, plus a church or religious-sponsor box), whether the project sells farm or ranch products, where the land is (country and US state), what it does, whether it can bring a cost match, whether it has an independent technical advisor, and how many partner farms. Beginning farmer, veteran and BIPOC-led are optional, opt-in and private | a product decision | `client/src/components/project/ProjectFundingSection.tsx`; harness story project-grants-form |
| R-14 | Purge five URLs from Cloudflare's cache. The old investor deck is the one that matters: anyone holding the link (the 85 drip recipients, search engines) still gets it. URLs: `https://regencivics.earth/regen-civics-investor-deck.pdf`, `/images/governance/who-holds-vote.png`, `/images/governance/voice-holders-diagram.png`, `/images/governance/rcvoice-vs-rgvoice.webp`, `/images/return-cards/opportunity.webp` | Cloudflare account access; no API token in the repo | Cloudflare dashboard, regencivics.earth zone, Caching, Configuration, Custom Purge (purge by URL) |

### CLAUDE CODE: done or doable without you

| # | Task | Status |
|---|---|---|
| C-1 | Phase 0 rewrite, gate, metrics, interest form, kernel store, redirects, docs move (PR #165) | VERIFIED (merged 6183af17, deploy 6c59fa4b SUCCESS, live checks above) |
| C-2 | Apply migration 0276 and the roles copy sync after the deploy; verify the live site | VERIFIED |
| C-3 | Application kit: shared rulebook, question and answer tables, packet view with live counts, answer bank, scripts (plan v1.3 Phase 1) | CODED; merge and production seeding after Oct 5 (K-5) |
| C-4 | Deadline pings on the hourly admin-automations cron (Telegram, 21/7/2 days) | CODED (D-1); merges after Phase 1; fires only once R-15 fixes the cron's auth |
| C-5 | Event quick-add for The Gathering (contacts and touches) | planned by Oct 14 |
| C-6 | Project funding profiles and a rules-based grant matcher over the 23 applicant projects | CODED (N-1, N-2); merges after Phases 1 and 2; production steps in N-3 |
| C-7 | Rename the five fund roles with explicit slugs (after the deadlines, with your OK) | planned |
| C-8 | Contrast audit reads oklab and oklch colors; /loi asterisks; /fund breadcrumb (P0-15) | DONE: merged as 9ee3f77a (PR #166); CI's audit on both sides with the fixed parser: PR 241 against main 247, 6 resolved, none added |

### WAITING ON YOU before Claude Code can proceed

- R-15 (cron start commands) before any deadline ping can reach you, and before the second-brain morning message, the governance jobs and the nightly batch run again.
- R-2 (confirmed metrics) before any application states a number, and before the linter can pass numbers.
- R-10 (API key) before automated federal grant discovery.
- R-7 (history scrub decision) after Oct 4.
