# Shipped log

Rolling reference index of past sprints, fixes batches, and execution prompts. Each entry summarizes what landed; full source docs live in `archive/` if you need the original spec or item-by-item detail.

When picking up new work, the recent entries here are usually the relevant context. The git log is the authoritative source of what actually shipped per file; this doc is the human-readable map.

Add new entries to the top. Format per entry:

- Date and theme on one line
- 3-6 bullet summary of what was in scope
- Pointer to the archived source doc(s)
- Open carryover items noted at the end if any (otherwise omit)

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
