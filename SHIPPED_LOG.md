# Shipped log

Rolling reference index of past sprints, fixes batches, and execution prompts. Each entry summarizes what landed; full source docs live in `archive/` if you need the original spec or item-by-item detail.

When picking up new work, the recent entries here are usually the relevant context. The git log is the authoritative source of what actually shipped per file; this doc is the human-readable map.

Add new entries to the top. Format per entry:

- Date and theme on one line
- 3-6 bullet summary of what was in scope
- Pointer to the archived source doc(s)
- Open carryover items noted at the end if any (otherwise omit)

---

## 2026-07-10: The ReGen Ship

- New CORE program: a regenerative pirate ship + the ReGen Fleet. 15-table `ship_*` family (migrations 0175, 0176) plus `applications` referral columns; `server/routes/ship.ts` tRPC router (bookings, treasure map, Maiden Voyage Quest, OpenRouter concierge, seed plantings, voyage log, digital passport, position pings, full admin surface) with `server/ship.test.ts` (16 tests: overlap, 7-night voyage length, pricing split, quest finish-order + top-3, itinerary location-id validation, program tagging, tRPC guards).
- 13 pages under `client/src/pages/ship/` wired into `App.tsx` (`/ship`, `/ship/book`, `/ship/map`, `/ship/concierge`, `/ship/quest`, `/ship/quest/rules`, `/ship/nominate`, `/ship/fleet`, `/ship/keeper`, `/ship/winter`, `/ship/log`, `/ship/guide`, `/admin/ship`), a Play-menu nav entry, and a CORE Programs card. Treasure map is Leaflet + react-leaflet v5 (ADR-32) with emoji divIcons, live ship position, and seed-planting layers.
- Money flow: hybrid platform rental + suggested voyage offering reusing `churchDonations` program tags `regen_ship` / `regen_ship_gift` (ADR-31). Quest rewards credit `$ReGen` via `creditPrivateTokens` source `ship_quest`; referrals `ship_referral` (ADR-33). Every env-dependent feature (concierge, Zeffy forms, Outdoorsy listing, GPS tracker) is behind an isConfigured guard so nothing blocks.
- Ship's Manifest six-email sequence + operational emails (`server/lib/ship-emails.ts`). Seed scripts `scripts/seed-ship-locations.ts` (30 Cascadia locations) + `scripts/seed-ship-quest.ts` (7 actions), both run. 7 real exterior photos processed + 16 concept images generated into `client/public/images/ship/`. New reference doc `SHIP_VARIABLES.md` maps every price, policy, env var, and admin-editable setting.
- Source spec: `CLAUDE_CODE_PROMPT_2026-07-10_REGEN_SHIP.md`. Companion human tasks: `RYE_BROWSER_TASKS_REGEN_SHIP.md`. Domain terms + ADR-31/32/33 recorded.

## 2026-07-04 (later): The Evolution Engine on the page

- New Assembly section between Deciding and Record (`client/src/components/assembly/EvolutionEngine.tsx`): the autonomy tier as a 0-3 ladder with plain-language meaning per tier, the three guardrails at a glance (launch window hours, human-approval requirement, circuit breaker threshold), in-flight machine ships with a Steward pause control, recently shipped features. Reads `assembly.evolutionStatus` (now includes `launchRequireApproval`). Governance transparency: the community watches its own machine.
- Deciding proposals carry the one-paste `HyphaLinkRow` for the proposer/admins — the missing UI for `assembly.recordHyphaProposal`, which arms machine ratification per proposal.

---

## 2026-07-04: Ratification arrives machine-to-machine — Rung 1's last human relay is now optional

- Confirmed on-chain reality from hypha-dao/hypha-web: Hypha's DAOProposals contract on Base (`0x001bA7a00a259Fb12d7936455e292a60FC2bef14`) emits `ProposalExecuted(proposalId indexed, passed, yesVotes, noVotes)` when a binding vote concludes. The proposal title (and our `[rc:key]` marker) never touches the chain, so matching is by numeric id.
- `webhook-receiver.ts` now decodes DAO-contract logs with viem (Alchemy GraphQL custom-webhook shape, address-filtered, never throws), matches bridges by `hyphaProposalId`, and a new `cascadeAssemblyRatified` applies the outcome. `passed=false` normalizes to a decline. A bare token Transfer can never ratify.
- New shared `server/lib/ratification.ts`: one `applyRatificationOutcome` used by BOTH the webhook and the admin `confirmRatification` (now the documented fallback, no longer a stub) — status transitions, dispatch, provenance (`relay: admin | alchemy-webhook`, txHash), and the governance notification can't drift between paths. Idempotent end to end.
- New `assembly.recordHyphaProposal`: the proposer pastes the Hypha proposal URL once after launching; the parsed numeric id lands on the bridge row and arms the machine path. Admin relay covers anything unlinked.
- 7 new tests (`server/ratification.test.ts`): full machine loop against the live DB (ratify -> implemented + applied + provenance; redelivery no-op; decline path) plus viem round-trip decoding with foreign-contract and malformed-log rejection. Suite: 300 green.
- Operational remainder (dashboard-side): point the existing Alchemy webhook (`ALCHEMY_WEBHOOK_ID`, signing key already on Railway) at the DAO proposals contract's logs. Then Rung 1 runs with zero humans.

---

## 2026-07-04: The dark Rung 3 pipeline is complete — docs, CI gates, builder workflow, human approval gate

- `docs/EVOLUTION-ENGINE.md`: canonical explainer of the whole flow for any human or LLM — what is live (Rung 1), what is built dark (Rung 3), and the exact remaining steps to full autonomy in dependency order.
- `assembly-gates` CI job (ci.yml): runs only on `assembly/*` PRs, fetches the ratified scope from the production server via the new public `assembly.proposalScope` query (never from a file on the branch — the machine cannot write its own permission slip), runs the fail-closed protected-paths check, applies `gates-passed`.
- `.github/workflows/assembly-builder.yml`: the builder agent, triple-locked dark (tier < 3, GITHUB_GOVERNANCE_TOKEN unset, ASSEMBLY_BUILDER_ENABLED unset). Treats ratified specs as untrusted data, builds only in scope, never merges.
- `evolution.launch_require_approval` (migration 0173_evolution_provenance_and_approval, applied): even at tier 3 a machine PR needs a human `approved-for-launch` label until the community votes that requirement off. `game_variable_history.proposalId` links every governed change to its vote.
- Note: two 0173 migrations exist (this one + gratitude budget vars from the parallel session). Both applied; the runner tracks full filenames so this is benign. Next migration is 0174.
- Evolution suite now 20 tests. Remaining for full autonomy: ratification webhook (blocked on confirming what Hypha/Alchemy emit), secrets (Rye), tier-3 rehearsal, community vote.

---

## 2026-07-03 (later): Gratitude tab — urgency band, real claim button, shareable summary card

- **Cycle urgency band** under the hero (`CycleBand` in `GratitudeTab.tsx`): a prominent full-width strip with the moon, a cycle-aware line ("3 full-power sends left before the new moon" / budget-reset / spent-all), a "new moon / cycle closes in N days" countdown that turns amber inside 3 days, and a Send button right there.
- **Claim button that unlocks**: the $ReGen ring now fills toward the real threshold and, when eligible, shows a gold "Claim your $ReGen on Hypha" button that calls `playerProfiles.requestClaim({ tokens: ['regen'] })` (same window-open-on-gesture pattern as `TokenDetailDialog`). Surfaces whenever a claim would actually succeed (`canClaimNow` = total private $ReGen ≥ live gate), not only when gratitude-earned crosses the bar.
- **Settings-alignment fix**: `getGratitudeVars` was reading nonexistent `gratitude.regen_distribution.*` keys and silently defaulting the claim threshold to 333. Now reads the seeded keys — claim threshold is **1000** (matching the live `governance.claim_threshold_regen` gate), pool 10000. Budget multipliers moved to new `gratitude.budget_multiplier.*` keys (1/2/3/5) so they don't collide with the trust-graph `gratitude.multiplier.*` (1.2/1.5/2.0). Migration `drizzle/0173_gratitude_budget_vars.sql` (applied to prod) seeds budget vars for the Game Mechanics page.
- **Shareable summary card** — aggregate and anonymous by construction: a summary of *what people keep thanking you for* as recurring themes, never a quote and never a sender name. Deterministic extraction from a curated lexicon (`shared/gratitude-themes.ts`, Rye's call — no LLM, injection-proof), rendered via the existing satori OG route (`GET /api/og?type=gratitude&id=<uid>&themes=...`, themes validated server-side against the lexicon so only earned themes can appear). The tab (`ShareCard`) shows a live preview, toggleable theme chips, an editable caption, and X/LinkedIn/Bluesky/Facebook/copy/download actions. No minimum message count; user edits before sharing.
- Backlog change: **preset phrases dropped** (Rye: no preset phrases). 11 new theme-extraction unit tests (`server/gratitudeThemes.test.ts`); full suite 299 green.

---

## 2026-07-03: Gratitude tab + lunar-cycle proportional economy (ADR-30)

- Built the profile **Gratitude tab** (`client/src/components/profile/GratitudeTab.tsx`, wired into `PlayerProfile.tsx` as `?tab=gratitude`): hero band with live moon phase + lifetime signature line, glass stat trio (power meter with golden full-power notch, received + per-cycle sparkline, $ReGen progress ring toward the claim threshold), and the Gratitude Wall — parchment note cards with sender avatar, message, source chip, search and received/sent filters. Mobile-first single-column; all motion respects reduced-motion. Deliberately **no reciprocity affordances** (no send-back, no exchange counts) per Rye's call — spec §12.5.
- **Economy cutover**: `gratitude.send` no longer credits a flat 5 $ReGen. Sends are free acknowledgments tagged with a lunar `cycleId` (one per recipient per cycle, `uniq_ack_per_cycle`); recipients earn from a per-cycle pool at cycle close, proportional to sender-budget-weighted gratitude received. Deterministic lunation math in `shared/lunar.ts`; engine in `server/lib/gratitude-cycles.ts`; distribution runs as Step 8 of the nightly batch job + `gratitude.closeCycles` admin mutation. Full rationale in ADR-30.
- New read procedures `gratitude.myOverview` / `myJournal` / `publicJournal` (public wall shows kind messages only — totals and $ReGen stay private, spec visibility rule).
- Gratitude notifications now actually exist: `gratitude.send` writes a `user_notifications` row (new `gratitude` enum value) with a `link` deep link to `/profile?tab=gratitude&highlight=<id>`; the bell navigates straight there on click and the target note blooms gold (`.gratitude-bloom`).
- Migration `drizzle/0163_gratitude_cycles.sql` (applied to prod): `gratitude_cycles`, `gratitude_cycle_budgets`, `gratitude_distributions`, `gratitudeLog.cycleId/weight` + unique key, `user_notifications` enum + `link` column. 12 new unit tests (`server/gratitudeCycles.test.ts`) verify the spec's tier/streak/split/pool tables and lunar math; full suite 240 green.
- Specs: `GRATITUDE_TAB_BUILD_SPEC.md` (build plan + Part II experience design), extends `GRATITUDE_SYSTEM_SPEC.md`.
- Carryover: bounty gratitude (`game.sendGratitude`, 1–5 amounts) still credits at send time — folding it into acknowledgments needs a GratitudeDrawer UI change; preset phrases in SendGratitudeModal; celebratory moments (send bloom, full-power burst, cycle-close reveal); satori share cards; Game Mechanics page exposure of `gratitude.*` variables.

---

## 2026-07-03 (evening): Crash recovery hardening — profile sync made symmetric, Evolution Rung 1 tested, ADRs 27-29

- Recovered work from the crashed 2026-07-03 sessions was consolidated to main earlier in the day (profile unification Phase 2B, Evolution autonomy prep). This batch finishes it honestly.
- Profile sync (0169) was asymmetric: forward mirrored 7 shared fields, reverse mirrored 3, bannerUrl was covered by neither, and forumLastActiveAt was back-filled once then never written. All fixed; both paths now mirror the same set and the lastActiveAt ping lands on both tables. New `server/profile-sync.test.ts` (integration lane) covers both directions, round-trip, the unified read/write model, and the reputation dual-write.
- Evolution Rung 1 got its first test coverage: `server/evolution.test.ts` (integration) proves raise-time bounds validation, the shared applyVariableChange path (bounds + history + cache bust), dispatcher idempotency, and that a ratified FEATURE parks in `paused` at tier 1 with zero GitHub side effects. `server/evolution-guard.test.ts` (fast lane, pure) locks the fail-closed protected-paths checker and the config's teeth.
- Migration 0170 (evolution.* autonomy variables) confirmed applied; the three variables are live with tier at the default 1.
- ADR-27 (Assembly one-door), ADR-28 (the Signal), ADR-29 (Evolution Engine + community-governed autonomy) added to `.ai/docs/DECISIONS.md` per the spec's section 16 requirement.
- Phase 7 (Rung 3 auto-ship) remains NOT built beyond the recovered dark prep, by design: no builder Action, no CI wiring, no webhook, no UI. Hard stop for human go-ahead stands.
- Hardening pass (same evening, after a fresh critical review): (1) `governance_executions.proposalId` is now UNIQUE (migration 0172) and the dispatcher defers to the winner on a concurrent insert, closing a double-apply race in the SELECT-then-INSERT idempotency check. (2) New `bounds_change` execution payload closes the democratic loop the engine only gestured at: "propose a bounds change first" now has a real door. Validated at raise + execution; the current value must sit inside the new bounds; `evolution.*` bounds are code-owned and refused at both layers (the leash geometry is never governed, per ADR-29). (3) The migration runner strips full-line comments BEFORE splitting on semicolons, retiring the 0163-class comment-semicolon bug; inline comments must still stay semicolon-free. (4) `confirmRatification` stamps `confirmedBy` (+ optional `hyphaAgreementUrl`) into the execution detail so the Record's audit trail covers the human relay, not just the machine. 6 new tests (24 total across the evolution suites).

## 2026-07-03: Forum governance evolution + Assembly Phases 1-6 (Evolution Rung 1)

- Forum on-ramp reshaped per `FIXES_TO_MAKE_2026-07-02_forum-governance-evolution.md`: lifecycle strip gated to sensing+, two quiet entry doors under the post, confirm + participation-aware undo (`forum.returnToDialogue`, silent while the starter is alone, visible reply once others weighed in), light-surface restyle of the strip and PerspectiveControl (they were dark-surface components on the white card), consent copy, concerns-vs-objections legibility, and coSignPromotion now advances `governanceStage` to proposal. Migration 0163 opened Sensing to any signed-in member (Rye's call).
- `/assembly` shipped as the Game's community-governed space (spec `ASSEMBLY_PAGE_SPEC.md`), replacing `/proposals` and `/community/decisions` (permanent redirects, nav updated, old pages retired from routing). The Signal (-3..+3, aggregate-only, migration 0164), AI synthesis with cooldown + daily caps + `ASSEMBLY_SYNTHESIS_ENABLED` kill switch, lifecycle lanes (aim line required, minor lazy-consent lane, 48h last call, resting strip; migration 0165), governance email subscriptions batched to one per person per day, digest Assembly block, and Evolution Rung 1 (migration 0167): ratified variable changes execute through the same bounds-checked path as `game.updateVariable`, attributed to the provisioned "The Evolution Engine" bot user, recorded append-only in `governance_executions`, and shown in Record with before/after.
- Game Mechanics page is fully database-driven (migration 0166): `VARIABLE_HELP` and `SIM_DEFAULTS` deleted, 151 descriptions moved into `game_variables.description`, unit column added, bounds filled for all 214 rows (these are also the governance auto-apply hard bounds), phantom gratitude simulator keys seeded for real.
- Open-item decisions made in flight (spec section 16): the Hypha handoff uses a new bridge intent `assembly-proposal-to-contribution` with source `other` (no enum migration needed); the ratification event does NOT arrive by webhook today, so `assembly.confirmRatification` is an admin-gated stub that records the Hypha outcome and runs the dispatcher — wire the real event when Hypha/Alchemy carries it; last-call launch is owner-initiated through the bridge (any member after 7 idle days) rather than automatic, per AI-AUTOMATION-RISKS Risk 7; notification prefs live on `player_profiles.notificationPrefs` (not `users`) because that is where the existing prefs live.
- Known quirks: the migration runner splits on every semicolon including inside comments and string literals, so migration files must avoid embedded semicolons entirely; `MAXVALUE` is a MySQL reserved word and needs backticks; `game_variables.value` DECIMAL arrives as a string over the wire (Number() everywhere).
- Phase 7 (Rung 3 feature auto-ship) is NOT built, by design. Hard stop for human go-ahead.

Migrations applied to prod: 0163, 0164, 0165, 0166, 0167. Still deliberately pending: 0149 (DO-NOT-RUN note), 0162_forum_notifications (belongs to unshipped work stranded in the WSL2 ~/regen-civics working copy).

Source specs: `ASSEMBLY_PAGE_SPEC.md`, `FIXES_TO_MAKE_2026-07-02_forum-governance-evolution.md` (both in root).

## 2026-07-01: Redis cache wiring + profile sanitization + yt-dlp hardening

- Wired `initCacheOnStartup()`/`setupCacheShutdownHandlers()` (`server/cacheInit.ts`) into the server bootstrap, called before `server.listen()`. The functions existed but were never invoked, so Redis never connected even after `REDIS_URL` was set on Railway; CSRF tokens, webhook-failure buckets, and rate limits silently ran on the in-memory fallback. Same `isCacheAvailable()` gating everywhere else made this a safe no-op when unset.
- Fixed `userProfiles.updateProfile` in `server/routes/auth.ts` (Settings > Edit Profile): `displayName`/`bio`/`location`/`investmentRange`/`projectName`/`organizationName`/`questInterests` were written to the DB with no sanitization. Confirmed live with a stored `<script>` payload in the location field. Added the same `cleanText()`/`sanitizeInput()` wrapper `players.ts` already used; URL fields left untouched.
- Root cause on the Redis side was two-fold: the missing bootstrap wiring above, and separately the Redis container itself had exited on Railway and needed a manual redeploy. Confirmed live 2026-07-01 via `/health` returning `cache:connected`.
- Hardened `transcription-worker/`: unpinned `yt-dlp` in `requirements.txt` (YouTube bot-detection fixes ship faster than any pin), dropped `--no-warnings` so failures surface real stderr, and wrapped the `download_audio()` call in `main.py`'s transcribe endpoint so failures return a clean 502 instead of crashing.
- Updated `.ai/docs/security/OWASP-TOP10.md` (A07) and `.ai/docs/security/CHECKLIST.md` to reflect Redis confirmed live in production.

Commits: `5cefb8f`, `6e082f0`, `97f6a76`, `e15ef33`.

Source: `archive/claude-code-prompt-redis-and-sanitization-fix.md`.

## 2026-07-01: Reprocess path + Whisper worker + CI green (commit c1a3fde)

- Added `reprocessRecording(id)` to `coordinationPipeline.ts`: runs the full transcript + synthesize + extract-tasks + finalize path for one existing recording so admins can force-understand any of the 15 caption-less production recordings once the Whisper worker is deployed.
- Extracted `loadHolders(db)` from the main loop so both paths share one query and cannot drift.
- Added `recordings.reprocess` admin mutation in the tRPC router (dynamic import).
- Added `TRANSCRIPTION_WORKER_URL` and `TRANSCRIPTION_API_KEY` to `ENV` (previously read raw from `process.env`).
- Committed `transcription-worker/` (FastAPI + yt-dlp + faster-whisper, Groq/OpenAI optional backends) so Railway can deploy it as a standalone service.
- Added `scripts/cleanup-test-data-2026-07-01.ts` to delete the Cowork verification throwaway rows from production (id-guarded, Rye runs).
- Stopped CI failure emails: 4 test patches (package.json excludes, scrollIntoView stub, MobileTabBar mock, logout assertion) + action version bumps (checkout/setup-node v5, lighthouse-ci v12).

**Rye still needs to:** deploy `transcription-worker/` on Railway, set `WORKER_API_KEY` + `TRANSCRIPTION_WORKER_URL` + `TRANSCRIPTION_API_KEY`, run `npx tsx scripts/cleanup-test-data-2026-07-01.ts`, then trigger `recordings.reprocess({ id: 9 })` to verify.

Source: `archive/FIXES_TO_MAKE_2026-07-01_reprocess-and-whisper.md`.

---

## 2026-07-01: Movement Coordination Engine (pipeline live, workflow canonicalized)

- YouTube-poll recording pipeline and daily flywheel are live on Railway as `cron-coordination-pipeline` (every 10 min) and `cron-coordination-flywheel` (09:00 UTC). Both are curl crons, `sh -c` wrapped, sending `${{"ReGenCivics.Earth".CRON_SECRET}}`. Also fixed the pre-existing tier-detector cron, which had been silently returning 401 on every run.
- Canonical workflow doc: `COORDINATION_ENGINE_WORKFLOW.md` (renamed from the old Riverside pipeline prompt, now a stub). Vision: `MOVEMENT_COORDINATION_ENGINE_SPEC_2026-06-23.md`. Active build for remaining work: `CLAUDE_CODE_PROMPT_2026-07-01_COMPLETE_COORDINATION_ENGINE.md`.
- New skills: `regen-railway-crons` (the `sh -c` shell-expansion and silent-401 traps) and `regen-deterministic-first` (also STEERING section 11).
- Retired the old Riverside-webhook framing. The recording pipeline is YouTube-poll-primary, webhook secondary. Updated `docs/EVENT_FLOW_OVERVIEW.md` and neutralized the old kickoff prompt `CLAUDE_CODE_BUILD_PROMPT_MOVEMENT_ENGINE.md`.
- Carryover: remaining work sections A to F in the workflow doc (community publish, task lifecycle to reward, roles-in-database plus invite flow, Whisper fallback). Handed to Claude Code via the 2026-07-01 build prompt.

---

## 2026-06-26: Safari + Mobile Compatibility Sprint (SHIPPED)

Commits `b30a2e1` (CI green) + `98405e2` (Batch 0+1) + `459ba57` (Batch 2) + `021f761` (Batch 3) + `99230f7` (Batches 4-8). Source doc: `archive/SAFARI_MOBILE_AUDIT_2026-06-26.md`. Prompt: `archive/CLAUDE_CODE_PROMPT_2026-06-26_SAFARI_MOBILE.md`.

- Critical popup + video: Hypha claim popup fixed for iOS (synchronous `window.open` before `await` in BridgeHypha; `about:blank` placeholder in TokenDetailDialog); `playsInline`+`muted` on GratitudeDrawer video and QuestTier3Media; YouTube iframes get `playsinline=1`.
- Scroll-lock + focus-trap: new `useBodyScrollLock` hook; `useFocusTrap` wired to 7 hand-rolled overlays (GratitudeDrawer, QuestHowToVideoModal, ExitIntentCapture, CommandPalette, ProgressMap, QuestDetailModal, OnboardingWizard); `60dvh` max-height on GratitudeDrawer.
- Safari compat: negative-lookbehind regex in ForumMarkdown replaced with capture-group; `new Date("1 June 2026")` deadline parse replaced with explicit month-index parse in CrowdPoolingProjects; `copyToClipboard` fallback helper created and wired to 8 copy sites; DPR clamped to 2 on GlobeMap.
- CSS: `-webkit-text-size-adjust: 100%` + `text-size-adjust: 100%` on `html`; `color-scheme: dark` on `:root` and `<meta>`; `season-tint` `background-attachment: fixed` gated to `min-width: 768px`; custom hover classes (`.game-card`, `.hover-lift`, `.card-tilt`, etc.) gated behind `@media (hover: hover) and (pointer: fine)`; mobile `glass-panel` blur reduced from 28px to 12px; `h-screen` to `h-dvh` in Messages.
- Contrast: raised faint info-bearing text across 10 components from /20-/50 to /50-/70 range.
- Forms: `autoComplete`/`inputMode`/`enterKeyHint` added to email+tel inputs in LOI, Checkin, Connect, Schedule, InvestorForm. Drop `autoFocus` from Checkin + Schedule reminder.
- Accessibility: `aria-label` added to all icon-only buttons in CommunityPost, CampaignImageUpload, Community; GovernanceLifecycleStrip tooltip inline on mobile; Apply help bubble keyboard-accessible via `group-focus-within`; delete/reset controls visible on touch in Messages, PlayerProfile, QuestProgressTracker.
- Performance: PageBackground particle count cut to 1/3 on mobile across all 6 particle functions; MycelialBackground blur disabled on mobile; QuestCarousel `touchAction: pan-x` prevents iOS back-swipe conflict.
- CI: three broken test assertions fixed (Element guard in test-setup, missing `hyphaBridge` tRPC mock, stale logout cookie assertion).

Pending (Rye verify on physical device): Hypha tab popup, scroll-lock behavior, video playback inline, keyboard lift in GratitudeDrawer.

---

## 2026-06-25: Field Report Batch — 10 fixes + editor + dialogue process (SHIPPED)

Commits `b30a2e1` (prior session) + `8b15ad2` (this session). Source docs: `archive/CLAUDE_CODE_PROMPT_2026-06-25_FIELD_REPORT_BATCH.md`, `archive/FIXES_TO_MAKE_2026-06-25_field-report-batch.md`, `archive/DIALOGUE_PROCESS_SPEC_2026-06-25.md`.

- Fix 9 (investor buttons): `Button asChild` pattern on Fund.tsx + InvestorJourney.tsx; external links via real `<a>` tags; corrected thesis href.
- Fix 10 (alliance accordions): lifted `useState` out of `.map()` in Ally.tsx; also fixed hero + bottom CTA nesting.
- Fix 4/6/7 (Tools Explore, forum overflow, tap lag): Explore is a real external `<a>`; `overflow-x-hidden` on grid; `touch-manipulation` + rAF scroll.
- Fix 2 (Epic Quests gradient): `fadeColor` prop on QuestCarousel, passed dark value from EpicQuestSection.
- Fix 3 (Game capitalization): 11 edits across 7 files. Fix 8 rename: Discussion replaced with Dialogue in UI labels.
- Fix 1 (Quest Stories media): artifactType auto-detection in SubmitToDAOModal; labeled media badges in QuestCompletionFeed; muted+playsInline on video.
- Fix 5 (editor overhaul): RichEditor rebuilt with full toolbar, slash-command menu, image upload to R2, preview toggle, mobile sticky toolbar.
- Fix 8 process (dialogue improvements): 3 migrations (0146/0147/0148); forumRouter procedures (sensing, perspectives); GovernanceLifecycleStrip + PerspectiveControl UI; Loomio receipt reply on close.

All 146 migrations applied to Railway. Pending: verify governance lifecycle UI on device. Investor deck PDF still missing from `public/`.

---

## 2026-06-25: Bounty Engine (SHIPPED)

Migration 0145 applied. Commits `4e2b2f2` + `30053a2`.

- Unified bounty engine replaces the pre-launch `callTasks` flow. Bounties have one or more payable roles; two-sided code-contribution bounties pay `proposer` and `shipper` separately on merge.
- Single payout path (`payRole`) with DB-level idempotency key on `user_token_ledger`, GitHub webhook delivery dedup via `webhook_deliveries`, separation of duties, and a one moon cycle (29.5 day) settlement hold with admin reversal before tokens claim to Base.
- GitHub OAuth profile linking (`/api/oauth/github`); merge-triggered auto-payout via GitHub `pull_request` webhook at `/api/webhooks/github`.
- `bounty_permissions` table seeds `rieki.cordon@gmail.com` with `canAccept` and `canReverse` via `scripts/seed-bounty-config.ts`. Season budget and citizenship tier gates built but permissive at launch.
- All client surfaces migrated: AdminTasksTab, AdminEditsTab, OpenToCircleCallTasks, ProfileCallTasksTab now use `trpc.bounties.*`. `callTasks` router and schema table deleted.
- Migration fixed: `ADD COLUMN IF NOT EXISTS` not supported in MySQL 8; changed to plain `ADD COLUMN`.

Source: `CLAUDE_CODE_PROMPT_2026-06-24_BOUNTY_ENGINE.md`, `BOUNTY_ENGINE_SPEC.md`. Decision: ADR-17.

**Follow-up (Rye):** seed bounty-permissions row: `npx tsx scripts/seed-bounty-config.ts`. Connect GitHub webhook in Repo Settings → Webhooks → `/api/webhooks/github`, subscribe to Pull requests, add `GITHUB_WEBHOOK_SECRET` to Railway env.

---

## 2026-06-24 — QA Sprint Part 5 (Mobile audit, commit d286279)

**Mobile QA MOB-1 through MOB-9** (commit `d286279`):
- MOB-1: `.text-sm` font-size bump scoped to `@media (min-width:768px)` — prevents iOS input auto-zoom across all form fields
- MOB-2: Navigation search icon button gets `min-h/min-w 44px` (WCAG 2.5.5 touch target)
- MOB-3: CampaignImageUpload edit/delete always visible on mobile (`opacity-100 md:opacity-0`); EmailSettings DB-load dropdown tap-accessible via `group-focus-within:block`
- MOB-4: `DialogContent` gains `overscroll-contain` — prevents scroll chaining when bottom sheet hits its boundary
- MOB-5: App `<main>` bottom padding accounts for `env(safe-area-inset-bottom)` above iPhone home indicator
- MOB-6: EmailSettings recipient table wrapper gets `overflow-x-auto`
- MOB-7: InvestorForm phone field gets `type="tel"` for mobile dial-pad
- MOB-8: Admin layout root uses `h-[100dvh]` (dynamic viewport) instead of `h-screen`
- MOB-9: Navigation sticky header gets `[padding-top:env(safe-area-inset-top)]` for landscape-notch devices
- Also: Season2 "slots" → "seats" copy fix; dedicated `/og/season2.jpg` OG image wired up
- TypeScript fix: `CampaignDetail.tsx` unique-contributor count switched from `contributorEmail` (now stripped by SEC-1) to `contributorName`

**Carryover (Rye + next sprint):**
- MOB-10: product call on tokenomics long-page navigation (Rye decides)
- Real-device mobile pass (Rye)

Source: `archive/CLAUDE_CODE_PROMPT_2026-06-23_QA_PART5_MOBILE.md`.

---

## 2026-06-24 — QA Sprint Parts 1–4 (Parts 1–3 in prior session; Part 4 this session)

**Season2 page shipped** (`/season2`): incubator invitation landing page with final approved copy — real Season One stats (46 applied, 21 shortlisted, 13 chosen), confirmed timeline (applications close September 1st rolling, pitch videos by September 10th, selection day on the Equinox), cost FAQ noting this may be the last free-to-participate season.

**QA Part 4 P0–P1 fixes** (commit `934ea78`):
- SEC-1: `campaigns.getContributions` now strips PII (email, phone, bio, notes) for anonymous callers; added `getContributionsForOwner` protectedProcedure for the manage page with ownership check
- SEC-2: webhook HMAC signatures (loomio, resend, hypha-alchemy) now computed over raw bytes via `verify` callback on global `express.json()`, not re-serialized JSON
- GAME-1: SubmitToDAOModal shows sign-in CTA for logged-out users instead of silently failing; Play.tsx copy updated
- GAME-2/D1: removed immediate hardcoded +10 token credit from `quest.complete`; tokens now only credit via `cascadeQuestPassed` on Hypha confirmation; added completion toast
- D2: removed RGVoice Token entry from Glossary
- D3: deleted dead `:root:not(.dark)` light-mode CSS blocks from index.css
- A11Y P1: added `role="dialog"`, `aria-modal`, `aria-labelledby`, and Escape handlers to 5 hand-rolled modals
- SEO P0: added `<SEO>` to CreateCampaign, CoCreatorsGuide, ApplySuccess; added noindex to Admin; added `og:image:width/height` (1200×630); fixed 8 OG images from .webp to .jpg
- PERF P1: deleted 29 MB of orphaned JPGs from client/public/images/opportunity/

**Carryover for next sprint (not yet done):**
- D4: wire up VouchSection, QuestJournalLog, ContributionTimeline in PlayerProfile
- D3 remaining: migrate 1,559 `bg-white` uses to `bg-card`/`bg-popover` (requires visual verification)
- Quest 3 (Healing Wholes) content authored
- DESIGN P1: script-replace top hex values with semantic tokens; adopt z-index scale
- Per-quest OG meta in Quest.tsx
- SEO: auto-generate sitemap.xml from App.tsx route table
- Real-device mobile pass

Source: `archive/CLAUDE_CODE_PROMPT_2026-06-23_QA_PART4_DEEP_AUDIT.md`.

---

## 2026-06-19 — Mobile screenshot round (Fixes A-E + 1-17)

Walked the live site on a phone, picked up 22 fixes spanning readability, broken CTAs, navigation polish, and one cross-cutting component. Already-coded set (A-E): hook banner reworded ("The more we Play the Game the more fun and real this new world becomes."), Home hero primary-CTA section removed, Epic-filter chip emoji swapped to mountain, Governance card moved from Water to Air panel (re-themed slate), Land-page LOI nudge dropped. New cross-cutting piece: `ReadableScrim` component — a hug-the-content rgba(13,40,24,0.72) + backdrop-blur-sm backing for every text-over-image block, applied to Land (3 headers), Play (token header + note), Seasons (hero), HealTheLand (You Bring / We Bring), and Home (mirrored-map parchment band replacing the old white intro card). Form contrast: ContributionCalculator inputs forced dark on white. Role cards: head-crop fixed (h-[140px] → h-[180px], objectPosition default 50% 18%). Carousel: QuestCarousel forced flex-nowrap. Play.tsx ActionCard wired to programmatic navigation via wouter useLocation so Start Questing / Claim Contributions / Find Your Community all navigate reliably; Claim Contributions now points at /calculator and Find Your Community at /map. Quest page: w-full max-w-full overflow-x-clip on root so it can't horizontally scroll on arrival. Apply / Land collapsibles scroll their header to top on expand. usePageTools dedupes by href and filters out the current path so the command bar never offers to navigate to the page you're on. Community remembers visit state and scrolls repeat visitors to #community-section-picker. CommunityNewPost placeholders driven by selected topic (Alliance, Earth, Water, Fire, Air, Seeking-Team). QuestStartPopup card redesigned (44px close chip, 48px Start Questing + Later tap targets, real list bullets). WizardRadialMenu trigger icon swapped to lucide MapPinned. HymnBook gains a per-song ShareButton (native Web Share + copy fallback). HealTheLand You Bring / We Bring lists centered with bullet dots, wrapped in ReadableScrim. Home intro paragraph now sits on a seamless parchment band built from the village-map-scroll image + a mirrored copy (`scaleX(-1)`) so it reads as one continuous wide map with no white card.

Source: `archive/FIXES_TO_MAKE_2026-06-19_MOBILE_ROUND.md`.

## 2026-04-23 — Batch 3 UI follow-ups

Sixteen fixes from a screenshot batch. Six shipped directly by Cowork agent: governance "Contribution Scores" card removed (system not built yet), season label hard-set to "winter" until the Sept 2026 equinox, Schedule "Episode day/time may be adjusted" caveat hidden under the Past Events tab, forum Weekly Digest card recolored for forest-bg readability, "Create Account" routes to OAuth instead of `/connect`, Apply-page login gate restyled to forest theme, More tab logo swapped to phoenix-circle crest. Nine specced for Claude Code (gratitude mobile clipping verify, Safari FAB position, music player mobile dedupe, mobile menu horizontal scroll, Apply button audit on map, volume slider iOS, sign-in debug, plus two human-only items). One Rye-only: Earth Day Google Cal Zoom→Riverside swap.

Source: `archive/FIXES_TO_MAKE_2026-04-23_BATCH3.md`.

## 2026-04-21 — UI batch (15 fixes) + Batch 2 (5 fixes)

Two waves of screenshot-driven UI fixes. Batch 1: forum editor toolbar (TipTap mousedown preventDefault + click-anywhere-to-focus + serializer carries list context for ordered numbering), removed the High contrast button, Continue-to-Hypha opens in new tab, comets spawn from upper 27% only, welcome map cropped + text box narrowed, footer Game column condensed 11→5. Plus 9 complex items specced into the doc for Claude Code: vouches, focus areas multi-select, season intention server-backed, Epic Quests locked-by-default, river/bridge/scales image swap, mobile playlist parity, Cowork onboarding download. Batch 2: Who Holds the Vote PNG replaces SVG pie, gratitude dialog escapes card clipping via Portal + fixed positioning, forum forest theme on all three forum pages, Tools Library matcher repositioned, Promote-to-decision modal body scroll lock + single inner scroll.

Source: `archive/FIXES_TO_MAKE_2026-04-21_UI_BATCH.md`, `archive/FIXES_TO_MAKE_2026-04-21_BATCH2.md`.

## 2026-04-19 — Quest progressive disclosure v2 + Hypha bridge fixes + Mobile Safari carryover

Three doc set. (a) Quest Card Progressive Disclosure v2 build (rewriting the CSS-only Tier 2 hover into a full three-tier disclosure, content sourced from `QUEST_MASTER_SHEET.md`). (b) Three Hypha bridge bugs found in pre-refactor audit + status of the upstream Hypha PRs. (c) Six items that Claude Code couldn't close from the 2026-04-08 mobile Safari batch, listed as a shipping checklist (everything else from that batch is VERIFIED or waiting only on git push + iPhone device testing).

Source: `archive/CLAUDE_CODE_PROMPT_2026-04-19_QUEST_DISCLOSURE.md`, `archive/FIXES_TO_MAKE_2026-04-19_HYPHA_BRIDGE.md`, `archive/FIXES_TO_MAKE_2026-04-19_CARRYOVER.md`.

## 2026-04-18 — Polish Sprint 4 + Sprint 3 close-out

Sprint 4 polish build (the `_POLISH_SPRINT4.md` send-off) plus Sprint 4 close-out + Sprint 3 Part B (the `_FINISH.md` follow-up). Took the site from "shipping-quality" toward world-class on Tier 1 + Tier 3 routes. Plus a screenshot-driven Part 0 in the fixes doc with three SPEC docs (top-priority items from Rye's April 17 walkthrough).

Source: `archive/CLAUDE_CODE_PROMPT_2026-04-18_POLISH_SPRINT4.md`, `archive/CLAUDE_CODE_PROMPT_2026-04-18_FINISH.md`, `archive/FIXES_TO_MAKE_2026-04-18.md`.

## 2026-04-17 — Sprint 3 World-Class Polish + Visual Audit

Beauty, readability, and seamlessness layer on top of the V5 retry sprint (drift sweep, pre-commit guards, exotic hex cleanup). Visual audit was a route-by-route pass on desktop + iPhone emulator, normalizing color palette around the locked dark-forest tokens. Pairs with `client/src/lib/design-tokens.ts` and `DESIGN_SYSTEM.md` (both still in repo root as standing references).

Source: `archive/CLAUDE_CODE_PROMPT_2026-04-17_SPRINT3_WORLD_CLASS.md`, `archive/FIXES_TO_MAKE_VISUAL_AUDIT.md`.

## 2026-03-27 — Community Agreements feature + forum UI polish

Full build plan for the interactive Community Agreements page plus several forum UI changes. Long-running plan that was reviewed by CTO 2026-04-08 and verified 2026-04-09. The companion `COMMUNITY_AGREEMENTS_IMPLEMENTATION_LOG.md` (still in repo root) tracks the actual implementation work as it shipped.

Source: `archive/COMMUNITY_AGREEMENTS_PLAN.md`. Implementation log: `COMMUNITY_AGREEMENTS_IMPLEMENTATION_LOG.md`.

---

## How to add a new entry

When you ship a sprint or close a fixes batch:

1. Add a new section at the top of this file with date, theme, summary, and source pointer.
2. Move the source `CLAUDE_CODE_PROMPT_*.md` and `FIXES_TO_MAKE_*.md` files to `archive/`.
3. Note any open carryover items at the end of the entry so the next session knows what's still pending.

The auto-archive convention from `~/.claude/memories/rye-working-style.md` says any dated doc older than 1 week migrates to `archive/`. This log is the place those entries land before they fall off the working-list radar.
