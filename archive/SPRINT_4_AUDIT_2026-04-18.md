# Sprint 4 Shipment Audit — 2026-04-18

Audit of what Claude Code actually shipped vs. what the specs required. Every finding below has file:line evidence. No vibes.

Specs audited: SPEC_01_MUSIC_EVERYWHERE, SPEC_03_SIGNATURE_VISUALS_H1_H5, SPEC_04_POLISH_IDEAS_6_24, CLAUDE_CODE_PROMPT_2026-04-17_SPRINT3_WORLD_CLASS Part B, CLAUDE_CODE_PROMPT_2026-04-18_FINISH.

---

## Summary

| Bucket | Count |
|--------|-------|
| Solid PASS | 10 |
| PARTIAL (component exists but not fully wired or missing CSS) | 9 |
| FAIL (spec line not shipped) | 11 |

Total spec line-items audited: 30. About a third shipped clean. About a third shipped a component file but stopped short of wiring or CSS. About a third were not shipped at all even though the table Claude Code returned marked them done.

---

## SOLID PASSES

| # | Spec | Evidence |
|---|------|----------|
| 1 | SPEC_01 slug routes + auto-play + redirect | `client/src/pages/HymnPlayer.tsx` lines 1-36 |
| 2 | SPEC_01 shared CopyLinkButton with clipboard + execCommand fallback + inline Copied state | `client/src/components/audio/CopyLinkButton.tsx` lines 1-49 |
| 3 | SPEC_01 mobile 3-button grid (Playlist, Add song, Copy link) with aria-expanded | `client/src/components/mobile/MobileMoreMenu.tsx` lines 120-179 |
| 4 | F2 WizardRadialMenu geometry (135 degree arc, 110px radius) | `client/src/components/mobile/WizardRadialMenu.tsx` lines 85-91 |
| 5 | Idea 6 LandscapeSVG wired to 4+ pages | Home, Bionomics, Tokenomics, Community all import |
| 6 | Accessibility page is real content not a stub (WCAG commitment, shortcuts, self-test, feedback) | `client/src/pages/Accessibility.tsx` lines 1-76 |
| 7 | Accessibility page uses `<main id="main-content">` properly | `client/src/pages/Accessibility.tsx` line 10 |
| 8 | Skeleton shimmer keyframe exists | `client/src/index.css` line 522 |
| 9 | TierPromotionConfetti component (pure-DOM, no new deps) | `client/src/components/TierPromotionConfetti.tsx` |
| 10 | Writing rules held: 0 em-dashes across `client/src/pages/` and `client/src/components/`, no banned words in prose (unlock/unleash appear only in variable names) | grep confirmed |

---

## PARTIAL SHIPS (component or piece exists, full spec not met)

| # | Spec | Evidence | Gap |
|---|------|----------|-----|
| 1 | SPEC_04 Idea 7 dividers (VineDivider, RiverDivider, StarsDivider) | All 3 files in `client/src/components/dividers/` | Only imported on Quest.tsx. SPEC said wire to Home, Community, Bionomics, Tokenomics. Sprint 3 Idea 5 (base dividers) also said wire across sections. Dividers are orphans on 8+ pages. |
| 2 | Idea 11 Tier promotion confetti | `TierPromotionConfetti.tsx` component exists | No `confetti-fall` `@keyframes` in `client/src/index.css`. Component uses inline animation style. Need keyframe to actually animate. |
| 3 | Idea 19 Breadcrumbs with bioregion context | `client/src/components/Breadcrumbs.tsx` exists | Not imported into any page layout. Component is orphaned. |
| 4 | Idea 18 ForYouLabel | `client/src/components/ForYouLabel.tsx` exists, imported Home.tsx and Quest.tsx | Spec expected broader coverage (Community, recommendations, feed). Narrow wiring. |
| 5 | Idea 20 Marker sparklines | `client/src/components/map/Sparkline.tsx` exists | Not confirmed to render inside Map.tsx BloomMarker tooltips. Need to verify or wire. |
| 6 | Spec H2 BloomMarker | `client/src/components/map/BloomMarker.tsx` exists | Wiring to quest/seed completion events unclear. |
| 7 | Spec H5 Skeleton loading suite | `client/src/components/ui/skeleton.tsx` exists, shimmer keyframe at index.css:522 | Minimal. Full suite of page-specific skeletons (card, list, profile, quest) not built out. |
| 8 | SPEC_04 heading hierarchy (A3) | Most pages fine | 6 pages still have multiple h1 tags or skip levels: BridgeHypha, CreateCampaign, GovCreate, GovTenant, LOI, PlayerProfileByHandle. |
| 9 | Spec H4 scroll-driven story animations | `story-grow` class referenced in HealTheLand.tsx lines 108 and 136 | No `animation-timeline: scroll()` in `client/src/index.css`. No matching `@keyframes`. Class is a no-op. |

---

## CRITICAL FAILURES (spec item not shipped at all)

| # | Spec | What was required | What exists |
|---|------|-------------------|-------------|
| 1 | **SPEC_01 section 8 desktop CommandPanel Sound tab 3-button row** | Desktop parallel of mobile: Playlist button, Add song, CopyLinkButton in a row | `CommandPanel.tsx` Sound tab lines 149-233 still has old "+ Add Your Voice" anchor and "Hymns of the ReGeneration (N)" toggle. Does not import CopyLinkButton. Desktop users cannot copy a song link. |
| 2 | **A2 main landmark on every page** | `<main id="main-content">` wrapper on every page so skip-link works | Only 6 of 90 pages have it. 84 pages failing. Accessibility page has it; most others do not. Skip-to-content link is therefore broken on 93% of site. |
| 3 | **Spec H1 hero color-shifting oklch gradient with 30s loop** | Hero background uses oklch and `heroDrift` 30s animation | No `heroDrift` keyframes, no `hero-drift` class in `client/src/index.css`. |
| 4 | **Spec H3 Bento-card explorer layout** | Wire BentoGrid/BentoCard to /apply or /map | `BentoGrid.tsx` exists but is not placed on those pages. Orphaned component. |
| 5 | **Spec H4 scroll-driven story animations** | Use `animation-timeline: scroll()` + `view-timeline` | No such CSS anywhere in client/src/index.css. `story-grow` class is declared in JSX but has no animation behind it. |
| 6 | **Idea 10 View Transitions API helper** | A `startViewTransition`-based helper wrapping wouter navigation | Grep for `startViewTransition`, `view-transition`, `viewTransition` returns zero results across client/src. No helper exists. |
| 7 | **Idea 12 tier badge living glow** | Breathing / pulsing glow on `TierBadge` and `CitizenshipBadge` | `TierBadge.tsx` has no animation className. Only `client/src/index.css` line 1916 exists, and that is a `prefers-reduced-motion` override for a class that never gets set anywhere. Inert. |
| 8 | **Idea 13 toast notifications as a garden** | Toast variants themed as seed/sprout/bloom with custom styling | `client/src/components/ui/toaster.tsx` is stock shadcn. No variant themes. |
| 9 | **Idea 14 quest card three-tier disclosure** | Quest cards expand to show deeper detail with `grid-template-rows` pattern | No disclosure pattern found in quest card components. |
| 10 | **Idea 17 forum category color bars** | Each forum category card gets a left color bar keyed to category | Community.tsx forum category cards have no color-coded accents. |
| 11 | **Phase 5 misc items that were bundled into the prompt but not visibly shipped** | Various Sprint 3 Part B ideas | Multiple marked "done" in return table but no file evidence. |

---

## Biggest blockers on quality

1. **Desktop music sharing is broken.** SPEC_01 is the flagship feature of this sprint. Mobile shipped clean. Desktop CommandPanel still shows the old UI. A desktop user cannot share a song URL at all. This alone warrants a Fix 1 push.
2. **Skip-to-content is broken on 93% of pages.** The link exists but has nowhere to land. This is a real a11y regression, not a nit.
3. **Six components shipped with no supporting CSS.** TierPromotionConfetti, tier badge glow, hero drift, story-grow scroll animations, and toast garden variants are all empty classes. The JSX is in place but nothing animates.
4. **Four components shipped and orphaned.** BentoGrid, Breadcrumbs, and dividers (3 files) are built but not placed on the pages that need them.

---

## Handoff Breakdown — Who Does What

### CLAUDE CODE — can finish autonomously, no Rye action needed

| # | Task | Status |
|---|------|--------|
| A1 | Fix CommandPanel Sound tab: replace old inline form with 3-button row (Playlist toggle, Add song, CopyLinkButton) matching MobileMoreMenu pattern | SPEC'D, NEEDS CODE |
| A2 | Wrap every non-compliant page body in `<main id="main-content">` so skip-link works. Script can do all 84 pages in one pass | SPEC'D, NEEDS CODE |
| A3 | Fix 6 pages with multiple h1 tags (BridgeHypha, CreateCampaign, GovCreate, GovTenant, LOI, PlayerProfileByHandle) | SPEC'D, NEEDS CODE |
| A4 | Add `@keyframes heroDrift` and `.hero-drift` class to `client/src/index.css`, apply to Home hero | SPEC'D, NEEDS CODE |
| A5 | Add `@keyframes confetti-fall` to index.css so TierPromotionConfetti actually animates | SPEC'D, NEEDS CODE |
| A6 | Add `@keyframes tierBreathe` + `.tier-badge-glow` class and apply in TierBadge/CitizenshipBadge | SPEC'D, NEEDS CODE |
| A7 | Wire dividers into Home, Community, Bionomics, Tokenomics section breaks | SPEC'D, NEEDS CODE |
| A8 | Place BentoGrid on /apply or /map page per Spec H3 | SPEC'D, NEEDS CODE |
| A9 | Wire Breadcrumbs into layout above page content across site | SPEC'D, NEEDS CODE |
| A10 | Add `animation-timeline: scroll()` + `@keyframes storyGrow` and confirm `story-grow` class is scoped correctly on HealTheLand.tsx | SPEC'D, NEEDS CODE |
| A11 | Build `client/src/lib/viewTransition.ts` helper wrapping `document.startViewTransition` and use it on wouter Link clicks | SPEC'D, NEEDS CODE |
| A12 | Add garden-themed toast variants (seed / sprout / bloom) to `toaster.tsx` | SPEC'D, NEEDS CODE |
| A13 | Implement quest card three-tier disclosure with `grid-template-rows: 0fr` to `1fr` pattern | SPEC'D, NEEDS CODE |
| A14 | Add forum category color bars in Community.tsx category cards | SPEC'D, NEEDS CODE |
| A15 | Verify Sparkline renders inside BloomMarker tooltips; wire if not | SPEC'D, NEEDS CODE |

### YOU (Rye) — only if you want to

| # | Task | Why only you | Command / Where |
|---|------|--------------|-----------------|
| B1 | Decide whether to push a follow-up Claude Code prompt covering A1-A15, or split into two waves (a11y critical first, then visual polish) | Scoping call | You choose |
| B2 | After Claude Code ships A1-A15, visual spot-check on desktop and mobile | Subjective QA | Browser |

### WAITING ON YOU — nothing

No migrations, no Railway env vars, no DB access needed. Everything in this audit is pure frontend code and CSS that Claude Code can ship without your machine.

---

## Recommended next prompt structure

Give Claude Code a single follow-up prompt with the 15 tasks A1-A15 above, ordered by priority:

1. **Accessibility critical** (A2, A3) — skip-link and h1 fixes are real a11y regressions
2. **SPEC_01 desktop coverage** (A1) — flagship sprint feature incomplete
3. **CSS keyframes for shipped components** (A4, A5, A6, A10) — make the already-shipped components actually animate
4. **Component wiring** (A7, A8, A9, A15) — place the orphans
5. **New small features** (A11, A12, A13, A14) — build the remaining Sprint 3 Part B items

That is one focused session for Claude Code. Around two hours of work. No human blockers.
