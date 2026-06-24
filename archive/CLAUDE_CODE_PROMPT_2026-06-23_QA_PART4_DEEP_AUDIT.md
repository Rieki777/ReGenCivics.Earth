# Claude Code Execution Prompt: QA Part 4 (Deep Design + Build Audit)

The final comprehensive audit across six dimensions no earlier batch touched: accessibility, SEO/social/PWA, performance/Core Web Vitals, security/data integrity, game design/player experience, and design-system consistency, plus runtime checks. Nothing here overlaps Parts 1 to 3. Every item is verified in source with file:line. Work top-down: the Priority 0 block first, then the decisions that gate code, then by domain.

Read `CLAUDE.md`, `.ai/docs/STEERING.md`, and `.ai/docs/security/` first. Apply the writing rules. Run the four-gate ship gate before any VERIFIED claim. You cannot push or deploy.

Note for the record: the running stack is React 19 + Vite 6 + Tailwind 4, but `CLAUDE.md` says React 18 + Vite. Update CLAUDE.md when convenient.

---

# PRIORITY 0: fix first (security + game economy + privacy)

## SEC-1 (P0): Unauthenticated PII exposure of campaign contributors
`server/routes/campaigns.ts:147-157` (`getContributions`) is a `publicProcedure` and returns `select()` of full `campaignContributions` rows via `server/db.ts:1515-1523`, including `contributorName`, `contributorEmail`, `contributorPhone`, `contributorBio`. Any anonymous user can enumerate `campaignId` and harvest contributor PII.
Fix: make it `protectedProcedure` restricted to the campaign owner/admin, or return only non-PII aggregate fields to the public.

## SEC-2 (P1, financial path): Webhook signatures verified over re-serialized JSON, not raw bytes
`server/lib/hypha-bridge/webhook-receiver.ts:426-427`, `server/webhooks/loomio.ts:494-495`, `server/webhooks/resend.ts:167-170` compute the HMAC over `JSON.stringify(req.body)` after global `express.json()` already parsed and discarded the raw bytes. Re-serialization does not reproduce the signed byte stream, so verification is brittle and the Loomio `outcome_created` path (which moves tokens and auto-creates a Hypha bridge from webhook-supplied `tokenAmount`/`recipient`, `loomio.ts:168-201`) has direct financial consequence.
Fix: capture the raw body per webhook route with `express.raw({ type: 'application/json' })` (as `server/webhooks/riverside.ts:159` already does correctly) and HMAC over those exact bytes.

## GAME-1 (P0): "No sign-up required" is false at the friction point
`client/src/pages/Play.tsx:610` promises "Jump straight into your first quest. No sign-up required." But the quest start toggle only renders when authenticated (`Quest.tsx:353`), token credit only fires when authenticated (`QuestProgressTracker.tsx:148`), and the submit modal hard-returns on `if (!user) return;` with a silent dead button (`SubmitToDAOModal.tsx:74`). A logged-out player who follows the promise clicks a button that does nothing.
Fix: make `SubmitToDAOModal` show an explicit "Sign in to earn and submit" CTA when `!user`, and adjust the Play.tsx copy to "Browse free, sign in to earn."

## GAME-2 (P0, economy integrity + feel): quest completion has no feedback and a self-credit path that diverges from rewards
`QuestProgressTracker.tsx` fires no toast/celebration/next-quest prompt on completion. The local "Mark Complete" path flips localStorage and credits tokens (`server/routes/players.ts:1268-1277`) with no deliverable submitted, decoupled from the real DAO submission flow. Advertised rewards (e.g. "+111 $ReGen", `Quest.tsx:442`) diverge about 10x from the flat `amount: 10` actually credited (`players.ts:1271`).
Fix (per D1): remove the local token credit so completion credits zero tokens; add an on-completion toast that says the deliverable is recorded and the reward arrives when the Hypha proposal is confirmed; fire the celebration + token feedback from the `cascadeClaimPassed` confirmation path, not from the local checkbox; add a next-quest prompt. Keep the advertised numbers as shown on the site.

---

# DECISIONS (resolved by Rye, now actionable)

- **D1 Token economy: no tokens are credited until the player's proposal is confirmed in Hypha.** The advertised numbers on the site are correct; do not change displayed rewards. The bug is the crediting, not the number. Remove the immediate local self-credit in `server/routes/players.ts` `quest.complete` (the `creditPrivateTokens({ amount: 10, source: "quest_completion" })` block around line 1268). Quest completion should record the completion (questsCompleted JSON, artifact) but credit zero tokens. Tokens are credited only when the quest's Hypha proposal is confirmed, via the existing `cascadeClaimPassed` path (`server/lib/hypha-bridge/webhook-receiver.ts:258`), and the amount credited there must be the advertised reward (verify the quest-completion bridge payload carries the real per-quest reward, not a flat number). See GAME-2 for the matching UI change.
- **D2 Glossary: do not restore the removed entries, and remove the remaining RGVoice entry too.** All four tokens are explained accurately on their dedicated pages, so the glossary should not carry token definitions at all. Remove the RGVoice entry from `Glossary.tsx:117-121`. For the GAME P1 "token earn-explainer," link players to the existing token pages instead of adding glossary copy.
- **D3 Theme: dark-only. Delete the dead light branch.** Remove the switchable-theme scaffolding, delete the `:root` light palette and the `:root:not(.dark)` glass-panel block in `client/src/index.css` (around 222-267), and migrate `bg-white` surfaces (1,559 uses) to `bg-card`/`bg-popover` with the matching `text-card-foreground`. Make the dark tokens the single load-bearing source.
- **D4 Profile panels: wire them up (do not hide).** The data model already exists for all three; some TODOs are stale.
  - **VouchSection** (`PlayerProfile.tsx:2975`): the component already calls `trpc.playerProfiles.listVouches` + `hasVouched`, and those procedures exist (`players.ts:939,961`) with a `vouches` table (`schema:2578`). The TODO is stale. Verify it renders real vouches end to end, then remove the stale TODO comment.
  - **QuestJournalLog** (`PlayerProfile.tsx:3090`, currently `entries={[]}`): the `quest_journal` table and `QuestJournalEntry` type already exist (`schema:2551,2561`). Add a `protectedProcedure` (for example `playerProfiles.getQuestJournal`) that returns the player's `questJournal` rows newest-first, and pass them to the component.
  - **ContributionTimeline** (`PlayerProfile.tsx:2978`, currently `data={[]}`): needs a GitHub-style `DayData[]` (date + activity count). Add a query (for example `playerProfiles.getActivityTimeline`) that buckets the player's activity by day from `questJournal` plus forum replies over a trailing window (about 26 weeks), and map it to the component's `DayData` shape.

---

# ACCESSIBILITY

P1:
- Five hand-rolled modals bypass Radix (no Escape, no focus trap, no focus return, no `role="dialog"`/`aria-modal`): `governance/PromotionModal.tsx:139`, `game/GratitudeDrawer.tsx:35`, `NavCustomizeSheet.tsx:41`, `admin/AdminNotificationCenter.tsx:102`, `pages/Team.tsx:247`. Highest-leverage fix: migrate them to the existing shadcn `Dialog`/`Sheet` (also fixes the close-button labels below and the design-system z-index drift in one move).
- Icon-only close/action buttons missing `aria-label`: `game/GratitudeDrawer.tsx:~42`, `QuestArtifactsGallery.tsx:~62`, `pages/Team.tsx:254`, `admin/AdminNotificationCenter.tsx:112`, `pages/Admin.tsx:~641,~752`.
- Low-contrast body text below WCAG AA: `command/RecentFavoritesTab.tsx:18,48` (`text-white/30`), `CitizenshipTierSidebar.tsx:149,166,167` (`/30`, `/20`), `command/SearchTab.tsx:12,14` (`/40`), `admin/AdminEventsTab.tsx:421,436`, `LinkPreviewCard.tsx:48`. Raise body text to `text-white/80` minimum.

P2:
- Search inputs are placeholder-only (no label/aria-label): `Community.tsx:373,720`, plus several admin inputs and `GlobeMap.tsx:1268,1419,1614`, `CrowdPoolingCampaigns.tsx:125`, `CreateCampaign.tsx:716`. Add `aria-label`.
- Custom disclosure toggles missing `aria-expanded`/`aria-controls` (Radix ones are fine).
- Nested `<main>`: `CrowdPooling`, `ProjectComparison`, `Socials` emit a second `<main>` inside the app-level one (`App.tsx:436`). Remove the inner one.

Confirmed healthy (no action): skip-link, reduced-motion handling, the `aria-live` announcer, the CommandPalette, the main Navigation, and all Radix primitives.

---

# SEO / SOCIAL / PWA

P0:
- Public indexable routes render no per-route meta, so they inherit the home title/description: `/co-creators-guide`, `/create-campaign` (in sitemap), `/community/chains` (in sitemap), `/community/seeking-team`, `CommunityCategory`, `CommunityTagFilter`, `ClaimSeeds`, `ApplySuccess`. Add `<SEO>` to each (pageSEO already has unused entries ready in `SEO.tsx:369-382`).
- Every quest detail page shares one title: `Quest.tsx:861` uses generic `pageSEO.quest` for `/quest/:slug`. Build per-quest title/description/image from the loaded quest (copy `BlogPost.tsx:114-118`).

P1:
- WebP Open Graph images do not render on Facebook/LinkedIn/Slack: `SEO.tsx` points `quest.webp`(163), `connect.webp`(205), `map.webp`(212), `fund.webp`(219), `crowd-pooling.webp`(226,233), `community.webp`(275), `tools.webp`(402) at `.webp`. The `.jpg` variants exist in `client/public/og/`. Point these at the `.jpg`.
- `SEO.tsx:70-84` omits `og:image:width`/`og:image:height`. Add 1200x630.
- Admin and private routes are indexable: only `NotFound.tsx` sets noindex. `/admin*`, `/profile`, `/messages`, `/my-applications`, `/apply/status`, `/checkin/:token`, `/bridge/hypha/:bridgeKey` default to index,follow and robots.txt only disallows `/admin` and `/api`. Add a `noindex` path for these.

P2:
- `sitemap.xml` is hand-maintained and drifting: lists `/investmentform` (redirects away) and `/profile` (should be noindex); omits live public routes `/tools`, `/plays`, `/marketplace`, `/hymn-book`, `/heal-the-land`, `/bionomics`, `/governance`, `/features`, `/co-creators-guide`, `/accessibility`. Generate it from the App.tsx route table.
- `ServiceWorkerRegister.tsx` is defined but never mounted, and would conflict with VitePWA's auto-registration. Delete it.
- `offline.html` ships but is never used as the SW offline fallback (`vite.config.ts:29` `navigateFallback: null`). Either wire it up with a `navigateFallbackDenylist` for `/api/`, or document the intentional no-offline trade-off.
- JSON-LD `SearchAction` targets `/search?q=` but there is no `/search` route. Remove it or build `/search`.

Confirmed healthy: manifest, favicons, `<html lang>`, canonical URLs.

---

# PERFORMANCE

P1:
- 29 MB of orphaned multi-MB JPGs ship in the build, never referenced by code (only the `.webp` are used): delete `client/public/images/opportunity/opp-investment-journey.jpg` (8.1MB), `opp-three-tier-strategy.jpg` (8.0MB), `opp-vision-2040.jpg` (7.3MB), `opp-network-effect.jpg` (6.6MB).
- `/community` LCP image missing priority + intrinsic size: `Community.tsx:290` is `loading="eager"` but lacks `fetchPriority="high"` and `width`/`height` inside an `absolute inset-0` `<picture>` (CLS risk). Add both.

P2:
- Homepage preloaded LCP background is 1.7MB: `client/public/images/backgrounds/home-desktop.webp` (`index.html:54`). Re-encode under 500KB via the existing `npm run optimize:images`.
- 13 raw `assets.regencivics.earth` image refs bypass the `/api/img` resize proxy (`resolveAssetUrl`/`cdnImg` in `lib/utils.ts`); user-uploaded R2 avatars/banners get no resize. Route them through the proxy.
- `Community.tsx:181-197` fires about 9 forum queries on mount (batched by httpBatchLink, so not a waterfall, but a large server fan-out). Optional: a single `forum.communityOverview` aggregate procedure.

Confirmed excellent (no action): route-level code splitting everywhere, heavy libs (globe.gl, recharts, framer-motion, jspdf) all isolated, textbook font loading, static asset caching `max-age=1y immutable`, image components handle CLS/lazy/decode correctly, animations are transform/opacity + reduced-motion aware.

---

# SECURITY (remaining, after SEC-1/SEC-2)

P2:
- `campaigns.ts:545-560` `setCoverImage` checks campaign ownership but not that `imageId` belongs to the campaign. Verify the image row's `campaignId` matches.
- `forum.ts:725` `incrementTriedThis` has no per-actor guard; any authed user can inflate the counter repeatedly. Dedupe per (userId, replyId) or rate-limit.

P3:
- OAuth callback has no random CSRF state nonce (`_core/oauth.ts:212-284`); `state` carries only `returnTo`. Mint a random nonce in a short-lived HttpOnly cookie at init and validate on callback.
- CSRF token store is in-process memory (`_core/security.ts:173,237-254`); breaks on multi-instance/horizontal scaling. Move to a shared store if the app scales out.

Confirmed correct (no action): token-ledger writes via `creditPrivateTokens`, private-balance spend/claim checks, magic-link entropy + single-use, open-redirect blocking, parameterized SQL, CSP/HSTS, CSRF on mutations, CORS allowlist, no hardcoded secrets, `investors.getById`/`gratitude.send`/`players.requestClaim`/`claims.ts` authorization. Prompt-injection on LLM inputs is a documented, monitored open item per `AI-AUTOMATION-RISKS.md`.

---

# GAME / PLAYER EXPERIENCE (after GAME-1/GAME-2)

P1:
- No query-error handling across player data views: list/detail queries destructure only `isLoading`, never `isError`, so a failed fetch shows a misleading empty state with no retry: `Proposals.tsx:76,287`, `MemberDirectory.tsx:173,276`, `Marketplace.tsx:45,127`, `DecisionsDashboard.tsx:32-36`. Add a shared `<QueryError onRetry={refetch} />` (CampaignDetail/EventDetail already grab `error`/`refetch` as the pattern).
- Locked quest cards never show how to unlock: `Quest.tsx:156-164` calls `LockedQuestCard` without `unlockHint`/`glyph`, so `LockedQuestCard.tsx:161` renders no tooltip. Pass `unlockHint={unlocks.getSeasonLockReason(season)}`.
- Token jargon with no newcomer explanation: the token grid shows bare zeros with no "how to earn" (`profile/TokenBox.tsx:64-75`, `PlayerProfile.tsx:590-599`). Per D2, add a one-line explainer when total is 0 that links to the existing token pages (do not add glossary copy).
- Quest 3 (Healing Wholes) is a content dead-end: single "Details Coming Soon" step (`QuestDetailModal.tsx:145`) despite being a required Spring Rite (`seasonConstants.ts:14`). Author its steps.

P2:
- Two parallel gratitude implementations with inconsistent feedback: `GratitudeButton.tsx` (no budget shown, inline "Sent!") vs `GratitudeDrawer.tsx:21-29` (budget + toast). Unify on one; always show remaining budget.
- Token name inconsistency RVoice vs RGVoice: `QuestProgressTracker.tsx:337` ("+N RVoice") vs `Quest.tsx:250,305` ("RGVoice"). Pick one per DOMAIN-LANGUAGE.
- Flat empty states: `NotificationBell.tsx:118-122`, `MemberDirectory.tsx:276-286` give no next-step; MemberDirectory loading is a bare text line, not a skeleton.

P3:
- Onboarding is three uncoordinated systems (`RegenIntroGate`, `OnboardingWizard`, `ProgressiveOnboarding`) gating on separate localStorage keys; role selection only persists to localStorage (`OnboardingWizard.tsx:316-318`), lost on device change. Coordinate into one funnel and persist role server-side.

Confirmed good: loading states + null-safety are disciplined site-wide, the quest unlock chain matches its spec, Messages and MyApplications have genuinely good empty states, navigation IA is well organized.

---

# DESIGN SYSTEM (mostly one root cause: tokens exist, adoption is the gap)

P1:
- Raw hex instead of semantic tokens: ~9,742 arbitrary-value hex uses across 298 of 521 files. The four brand colors (`#7dd87d` 3,947x, `#1a472a` 3,494x, `#4a7c59` 654x, `#0d2818` 315x) all map to existing tokens (`--primary`, `--foreground`, `--accent`, `--primary-foreground`). Worst offenders: `Game.tsx`(313), `CreateCampaign.tsx`(305), `Admin.tsx`(304), `PlayerProfile.tsx`(244), `Opportunity.tsx`(214). Script-replace the top ~8 hexes with `bg-primary`/`text-foreground`/`text-accent`/`border-border` to kill most of it.
- Palette drift: 268 distinct hexes, 77 of them one-off greens (`#4caf50`, `#22c55e`, `#16a34a`, etc.). Define 2-3 sanctioned green tokens and collapse onto them; move social brand colors into a `social.*` group.
- z-index scale exists (`index.css:88-96`) but has zero adoption: five independent overlays sit at `z-[9999]` (`CampaignImageGallery.tsx:182`, `CookieConsent.tsx:113`, `GratitudeButton.tsx:140`, `HeroPageLoader.tsx:90`, `ReGenGuide.tsx:150`) with no ordering; modals split arbitrarily between `z-[100]` and `z-[200]`. Adopt `z-nav`/`z-modal`/`z-toast`.
- Dark-mode tokens are dead: `bg-white` appears 1,559x across 216 files while only 21 files use `dark:`. The light palette is maintained but never rendered. Resolve via decision D3.

P2:
- 646 raw `<button>` across 186 files bypass `ui/button.tsx`; 16 hand-rolled `fixed inset-0` overlays re-implement modal scaffolding (this is the root of the z-index drift). Route through `Dialog`/`Sheet` and `ui/button`.
- Dead components implying a standard that is not followed: `ui/regen-button.tsx` (0 usages), `.btn-game` / `.game-card` CSS classes (unused). Adopt or delete.
- 525 inline `style={{ fontFamily: 'var(--font-...)' }}` across 62 files; the `font-display`/`font-accent` utilities already exist, and headings get `--font-display` globally. Replace with classes, drop the redundant ones.

P3:
- 342 arbitrary micro font-sizes (`text-[10px]` 250x, down to `text-[8px]`) undercut the deliberate a11y floor at `index.css:322`. Map to `text-xs` or one micro token.
- Hero heading sizes are ad-hoc one-offs (`text-[72px]`, `text-[64px]`) instead of the `--font-size-hero` clamp tokens. Consolidate.

Confirmed clean: spacing scale, radius, shadow, transition durations, responsive breakpoints, and iconography (single lucide source) are all consistent.

---

# RUNTIME NOTES

- Command palette (`Ctrl+K`) works: opens, moves focus into the input, categorized results, keyboard hints. Healthy.
- 404 returns the "Page Not Found" page (soft-404 with noindex, standard SPA behavior).
- Mobile emulation was not reliably available in this harness (the window resize did not constrain the viewport). The design-system audit confirmed responsive breakpoints are used consistently in code, but a real-device or Chrome DevTools device-mode pass on the key pages (home, fund, apply, community, quest, profile) is still recommended before launch.

---

# Ship gate (run before VERIFIED)

```bash
python3 scripts/audit-truncation.py
rg -g '*.css' '<className-you-added>' client/src/
pnpm typecheck
node scripts/audit-links.mjs
```

# Handoff Breakdown: Who Does What

All four decisions (D1 to D4) are resolved above and are now Claude Code tasks. Nothing in this batch is blocked on Rye except the two items below.

## YOU (Rye)

| # | Task |
|---|------|
| 1 | Author Quest 3 (Healing Wholes) content, or approve a placeholder |
| 2 | Real-device / DevTools mobile pass on key pages |
| 3 | Deploy after Claude Code stages the fixes |

## CLAUDE CODE

| # | Task | Priority |
|---|------|----------|
| 1 | SEC-1 PII leak: lock down `getContributions` | P0 |
| 2 | SEC-2 webhook raw-body signatures (3 files) | P0 |
| 3 | GAME-1 logged-out submit CTA + copy | P0 |
| 4 | GAME-2 + D1: remove local token credit, credit only on Hypha confirm, add completion feedback | P0 |
| 5 | SEO P0: per-route meta + per-quest meta | P1 |
| 6 | PERF P1: delete 29MB orphan JPGs, fix Community LCP img | P1 |
| 7 | A11Y P1: migrate 5 modals to Dialog/Sheet, add aria-labels, raise contrast | P1 |
| 8 | GAME P1: query-error component, locked-quest hints, token earn-explainer (links per D2) | P1 |
| 9 | D4: wire up VouchSection, QuestJournalLog, ContributionTimeline (new journal + activity queries) | P1 |
| 10 | D3: dark-only, delete dead light branch, migrate `bg-white` to tokens | P1 |
| 11 | D2: remove RGVoice glossary entry | P2 |
| 12 | DESIGN P1: script-replace top hexes, adopt z-index scale | P1 |
| 13 | All remaining P2/P3 by domain | P2/P3 |
| 14 | Run the four ship-gate checks, attach evidence | gate |

## WAITING ON YOU

- Only Quest 3 content (YOU item 1) and the mobile pass gate anything. Every code task above proceeds now.
