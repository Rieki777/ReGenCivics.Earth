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
| P0-6 | Campaign cards and the total-value bar | DONE (crowdpool lane) | live since 6d7f070e (two-line bar, nine-capital sheet, Example labels); the demo money share fix is 4961f715 (migration 0263, applied to production by the crowdpool lane: demo campaigns 79 to 82 now ask 21,000, 21,000, 14,000 and 33,000, about 20% of each whole ask, with example route figures scaled so none reads as landed) |
| P0-7 | Positioning kernel out of the public repo, into the versioned `funding_prompts` table | VERIFIED | production `funding_prompts` versions 1 and 2 seeded by `scripts/seed-funding-prompts.ts`; `server/funding/positioning-kernel.ts` holds only a neutral fallback |
| P0-8 | /investor-contact, /crowdpool, /projects, /about redirect | VERIFIED | Live 301s: /about to /team, /projects to /campaigns, /crowdpool to /crowd-pooling, /investor-contact to /investor/contact, /investor to /loi, /risk-disclosure to /disclaimers, /investmentform to /loi |
| P0-9 | Storage docs say Cloudflare R2; 100 root planning docs moved to docs/planning/, docs/ and archive/ | DONE | commit 974f4e41 records 100 renames; STEERING section 8 amended; CLAUDE.md 148 lines (ADR-63) |
| P0-10 | Investor funnel retired: qualification form, pledge form, drip emails, return calculator | VERIFIED | Live: /investor redirects to /loi; /loi has no amount field; `coop.submitInterest` rejects bad input with 400. Production `scheduled_emails` has no pending investor rows |
| P0-11 | Surfaces the original list missed: index.html JSON-LD, AI chat prompts, emails, Team roles, blog posts, the public deck PDF, fund-text images, CONTEXT_THE_TWO_GAMES.md, DOMAIN-LANGUAGE.md | VERIFIED | live index.html JSON-LD and meta scanned with each page's HTML: 0 hits; line-by-line log in the private counsel review; ADR-62 |
| P0-12 | Home banner text (database row) | VERIFIED | migration 0276 applied to production (1 statement); the live landing page banner reads "A cooperative regenerative society is in design: land projects and people buying and stewarding land together." with links to /fund and /seasons |
| P0-13 | Team page role copy (database `roles` rows) synced to the rewritten `gameRoles.ts` | VERIFIED | `UPDATED: 25 roles, 135 fields`; a second dry run reports 0 differences. Token awards are no longer priced in dollars ("500,000 $ReGen ($5,000)" is now "500,000 $ReGen"); `skills-builder.specialContent` preserved |
| P0-14 | Five deleted public files still reachable: the July investor deck PDF, three governance images and one return card. The origin returns 404 for all five; Cloudflare's edge serves its cached copy (`cf-cache-status: HIT`, `cache-control: immutable`, up to a year) | HUMAN STEP REQUIRED | R-14 |
| P0-15 | The contrast audit could not read `oklab()`/`oklch()` colors (Tailwind 4 opacity modifiers and theme tokens). It measured the /loi form's dark text against the dark page instead of its white card (21 false failures, also counted under /investor, which redirects there) and skipped every oklch-colored text. Parser fixed, gradient stops keep their alpha, /loi required-field asterisks darkened (red-600 measured 4.35:1), /fund breadcrumb reads "The Cooperative" | CODED | live re-audit with the fixed parser: /loi 21 to 7 before the asterisk fix; the four left after it are the shared items in P0-16 |
| P0-16 | Three shared contrast misses the old parser hid, on every route: the footer "Send gratitude" gold heading (4.08:1), the command search placeholder (3.97:1), the ⌘K hint (4.37:1) | flagged as a follow-up task | live re-audit, 2026-09-27 |

One live check reads as a miss and is not: "43 land projects" on /opportunity is the dated Season One record (2022: 43 applied, 16 presented, 13 selected; confirmed by Rye 2026-09-24), rendered from `SEASON_ONE` in `shared/regenYear.ts`. The traction gate is for live counts.

## Phase 1: the application kit

| # | Fix | Status | Evidence |
|---|---|---|---|
| K-1 | Draft linter: portal character and word limits, G5, retired claims, dashes, unconfirmed numbers, AI words, contrast framing | CODED | `scripts/lint-application-draft.mjs` over `shared/applicationLint.mjs`; `server/application-lint.test.ts` passes; guide in the kit folder |
| K-2 | Exact questions for 500 Global, PearX, YC, Techstars and Emergent Ventures | DONE | `app_questions_seed.json` (private): 66, 72, 49, 27 and 23 questions |
| K-3 | One rulebook: G5 rules and retired claims move to `shared/g5Rules.mjs`, read by the site gate, the draft linter and the admin packet view | CODED | `check-fund-claims.mjs` re-exports the shared rules; a test asserts the gate and the linter hold the same rule objects; the gate's exemption list is exported and imported by its test, so the two cannot drift |
| K-4 | Question bank, answer bank and answer versions in the database; deadlines, track and stage on the pipeline; packet view with live counts | IN PROGRESS | |

---

## Handoff Breakdown: Who Does What

### YOU (Rye): things only you can do

| # | Task | Why only you | Where |
|---|---|---|---|
| R-1 | File the Delaware C-corp (Clerky), then EIN and SAM.gov UEI. 500 Global asks for a legal name, country of incorporation and a cap table; neither 500 Global nor PearX says it accepts "incorporation in progress". | legal filing in your name | clerky.com, irs.gov, sam.gov |
| R-2 | Confirm the numbers applications will use. The live counts were computed for the first time on 2026-09-28 (the admin Metrics view's Refresh, run once); land projects applied reads 66 (43 in 2022 + 23 since Feb 2026: confirm the definition). Still empty and yours to enter: revenue to date (amount, date, whether it can be said), paying customers, alliance organizations, SEEDS lineage (people and organizations), founder years | only you know which are true | /admin/funding, Metrics view |
| R-3 | Send the SELC email: a Gmail draft to communications@theselc.org was created 2026-09-28 from plan section 12.2 (the v1.3 text plus a question on equal membership); resolve its two [VERIFY] markers before sending. RSVP for the Online Legal Café on Oct 1 at 12:00 PM Pacific; Sep 30 is sold out | sending as you | Gmail drafts; theselc.org/legalcafe_20261001 |
| R-4 | Set the ask (plan v1.3 section 2) | a decision | plan v1.3 |
| R-5 | Frame the Gathering camp as a readiness camp (no offering terms, no introduction fees) and ask counsel about Rule 148 by Oct 9 | legal judgment | counsel |
| R-6 | Review the private counsel review file and decide the open judgment calls (design principles published, token swap wording, $RCivics claim bridge, notice to the 85 people who received the old investor drip) | legal judgment | docs/private/COUNSEL_REVIEW.md |
| R-7 | Decide whether to scrub git history of the old kernel and fund copy (you deferred it until after Oct 4) | force-push rewrites every SHA | revisit Oct 5 |
| R-8 | DONE 2026-09-28: the crowdpool lane applied migration 0262 (Ally Steward + Sage, additive) to production; nothing left for you | n/a | n/a |
| R-9 | Provide a real postal address (PO box or private mailbox) for the email legal footer before any bulk email; `HARVEST_POSTAL_ADDRESS` is city-level today | your address | Railway variables |
| R-10 | Create a Simpler.Grants.gov API key (needs a Login.gov sign-in) for grant discovery | account in your name | simpler.grants.gov |
| R-11 | DNS for outreach email. regencivics.earth has no Workspace mailbox today: its MX records point to Namecheap email forwarding (`eforward1-5.registrar-servers.com`) and its SPF lists only the forwarder (checked 2026-09-28). Decide whether to move the domain's mail to Google Workspace (MX to Google, SPF `include:_spf.google.com`, DKIM from the Admin console) or send outreach from Gmail. Safe to add now either way: a TXT record at `_dmarc` reading `v=DMARC1; p=none; rua=mailto:dmarc@regencivics.earth`, plus a Namecheap forward for dmarc@. Resend already signs as regencivics.earth (`resend._domainkey`) and sends from `send.regencivics.earth` | DNS access, and a mail-hosting choice | Namecheap, Domain List, Advanced DNS |
| R-12 | Create the YC and Techstars portal accounts so Cowork can verify their questions | accounts in your name | ycombinator.com/apply, apply.techstars.com |
| R-13 | Small calls: founding year (index.html says 2023, Season One ran in 2022); the "4 Paths" home video may say "Investors" on screen; two fund token logos (RCVoice `cSiqeQzVeKFgrJHp.png`, $RCivics `MhyYoMLbeOhEHQLm.png`) are still public on assets.regencivics.earth and no page uses them: delete them from R2 unless Hypha shows them as token icons. The CloudFront deck copy is gone (403, checked 2026-09-28) | your content | R2 bucket |
| R-15 | Fix four Railway cron services that have failed auth on every run since at least Aug 31 (D-2). In each service's Settings, Deploy, Custom Start Command, wrap the curl in `sh -c '...'` so `$CRON_SECRET` expands, e.g. `sh -c 'curl -sS -X POST -H "Authorization: Bearer $CRON_SECRET" https://regencivics.earth/api/cron/admin-automations'`. For cron-operator-pulse-ping, also set its CRON_SECRET variable to `${{ReGenCivics.Earth.CRON_SECRET}}`. Decide first about the catch-up: governance jobs will expire promotions, assign storytellers, create renewal threads and reconcile Hypha bridges four weeks late; the nightly batch will run citizenship tiers, the event sweep, crowdpool claim expiry, partner progress and the gratitude cycle close; admin automations resume your 8am second-brain message (and, after Phase 2, the deadline pings) | dashboard access, and the catch-up is a judgment call | Railway dashboard: cron-admin-automations, cron-governance-jobs, cron-nightly-batch, cron-operator-pulse-ping |
| R-14 | Purge five URLs from Cloudflare's cache. The old investor deck is the one that matters: anyone holding the link (the 85 drip recipients, search engines) still gets it. URLs: `https://regencivics.earth/regen-civics-investor-deck.pdf`, `/images/governance/who-holds-vote.png`, `/images/governance/voice-holders-diagram.png`, `/images/governance/rcvoice-vs-rgvoice.webp`, `/images/return-cards/opportunity.webp`. Rechecked 2026-09-28: the site answers 404 for all five, and Cloudflare still serves every one from its cache (`cf-cache-status: HIT`) | Cloudflare account access; no API token in the repo | Cloudflare dashboard, regencivics.earth zone, Caching, Configuration, Custom Purge (purge by URL) |

### CLAUDE CODE: done or doable without you

| # | Task | Status |
|---|---|---|
| C-1 | Phase 0 rewrite, gate, metrics, interest form, kernel store, redirects, docs move (PR #165) | VERIFIED (merged 6183af17, deploy 6c59fa4b SUCCESS, live checks above) |
| C-2 | Apply migration 0276 and the roles copy sync after the deploy; verify the live site | VERIFIED |
| C-3 | Application kit: shared rulebook (done), question and answer tables, packet view with live counts (plan v1.3 Phase 1) | IN PROGRESS |
| C-4 | Deadline pings on the hourly admin-automations cron (Telegram, 21/7/2 days) | planned Oct 5 to 11 |
| C-5 | Event quick-add for The Gathering (contacts and touches) | planned by Oct 14 |
| C-6 | Project funding profiles and a rules-based grant matcher over the 23 applicant projects | planned by Oct 16 |
| C-7 | Rename the five fund roles with explicit slugs (after the deadlines, with your OK) | planned |
| C-8 | Contrast audit reads oklab and oklch colors; /loi asterisks; /fund breadcrumb (P0-15) | DONE: merged as 9ee3f77a (PR #166); CI's audit on both sides with the fixed parser: PR 241 against main 247, 6 resolved, none added |

### WAITING ON YOU before Claude Code can proceed

- R-15 (cron start commands) before any deadline ping can reach you, and before the second-brain morning message, the governance jobs and the nightly batch run again.
- R-2 (confirmed metrics) before any application states a number, and before the linter can pass numbers.
- R-10 (API key) before automated federal grant discovery.
- R-7 (history scrub decision) after Oct 4.
