# Fixes to Make: 2026-04-18 (World-Class Polish Sprint 4)

This document continues from `FIXES_TO_MAKE_2026-04-17.md` and
`CLAUDE_CODE_PROMPT_2026-04-17_SPRINT3_WORLD_CLASS.md`.

## What's in this doc

1. **Part 0 (NEW, top priority):** Three screenshot-driven fixes from Rye's April 17 walkthrough, each with a dedicated SPEC doc. Do these first.
2. **Part 1:** Verified status of Sprint 3 Part A items (A1 through A5).
3. **Part 2:** Status of the original 25 Sprint 3 polish ideas.
4. **Part 3:** The 18 remaining NEW polish ideas from the world-class research pass. Ideas 8, 9, 15, 16, 21, 22 moved to `FUTURE_EVOLUTION_IDEAS.md` on 2026-04-17.
5. **Part 4:** Consolidated execution plan.
6. **Handoff Breakdown** at the bottom.

## Linked spec docs (action these before anything else)

- `SPEC_01_MUSIC_EXPERIENCE.md`: shareable song URLs, inline playlist in mobile More menu, "Add your song" button
- `SPEC_02_MOBILE_MENU_POLISH.md`: radial menu button spacing fix, More menu logo swap
- `SPEC_03_SIGNATURE_VISUALS_H1_H5.md`: the five highest-impact visual upgrades (oklch hero, map bloom, bento grid, scroll story, skeletons)
- `SPEC_04_POLISH_IDEAS_6_24.md`: compact specs for the remaining polish ideas
- `FUTURE_EVOLUTION_IDEAS.md`: parked ideas (8, 9, 15, 16, 21, 22)

---

## Part 0: Priority screenshot fixes (do first)

Rye sent three annotated screenshots on April 17. All three have dedicated spec docs.

### F1: Music experience overhaul (screenshot 2)

**Status:** SPEC READY (`SPEC_01_MUSIC_EXPERIENCE.md`)

Each song becomes shareable via `/hymn-book/:slug`. Visiting a share URL loads the home page and auto-plays the shared song. The mobile More menu gets two side-by-side buttons under the audio player: "Show playlist" (expands an inline list of all songs) and "Add your song" (links to the Hymn Book form). The expanded playlist ends with "Add your song" as its final row.

### F2: Mobile radial menu button spacing (screenshot 1)

**Status:** SPEC READY (`SPEC_02_MOBILE_MENU_POLISH.md` section 2)

Current radial menu cramps 5 buttons into a 90 degree arc at radius 92. Widen to 135 degree arc at radius 110, container size 208 x 208. Buttons stop overlapping.

### F3: More menu header logo swap (screenshot 3)

**Status:** SPEC READY (`SPEC_02_MOBILE_MENU_POLISH.md` section 3)

Replace the `TreeOfLifeIcon` at the top of the mobile More menu with the main ReGen Civics logo (the one in the footer), served from `/images/logos/regencivics-logo-light-transparent-rounded.webp`.

---

## Part 1: Verified status of Sprint 3 Part A (A1 to A5)

Walked the code after the `c9f66b7` commit to verify each item.

### A1. Tool logo monogram fallback

**Status:** FIXED

The monogram fallback landed in `client/src/pages/ToolsLibrary.tsx` around
line 136. Broken logos now replace themselves with a spring-green square
containing the first letter of the tool name. Spec matches.

### A2. `<main>` landmark on every page

**Status:** PENDING

Ran the audit script from the Sprint 3 doc. Most pages are still missing a
`<main id="main-content">` wrapper. First 20 offenders:

`Admin`, `AdminApplicationDetail`, `AdminApplications`, `AdminModeration`,
`Ally`, `Apply`, `ApplyStatus`, `ApplySuccess`, `Bionomics`, `Blog`,
`BlogPost`, `BridgeHypha`, `Calculator`, `CampaignAnalytics`,
`CampaignDetail`, `CampaignManage`, `Checkin`, `ClaimSeeds`, `Community`.

The skip link cannot focus a target that does not exist. Wrap each top-level
page container in `<main id="main-content" tabIndex={-1}>`.

### A3. Heading hierarchy promotions (h3 → h2 at section level)

**Status:** PARTIAL

Audit by page:

- `Home.tsx`: h1=1, h2=3, h3=4: clean
- `Community.tsx`: h1=1, h2=7, h3=6: clean
- `Tokenomics.tsx`: h1=1, h2=9, h3=7: clean
- `Quest.tsx`: h1=1, h2=8, h3=12: clean
- `Marketplace.tsx`: h1=1, no h2 or h3: clean
- `Bionomics.tsx`: h1=1, h2=1, h3=5. likely one skip from h1→h3 after the
  first section. Inspect and promote.

Remaining action: inspect `Bionomics.tsx` and walk the other 15 pages the
Sprint 3 doc flagged. Promote section-level h3s that sit directly under h1
with no intermediate h2.

### A4. 44px hit-area pseudo-element CSS

**Status:** FIXED

Block landed in `client/src/index.css` at line 1168 inside
`@media (pointer: coarse)`. The `::after` pseudo-element extends all
non-disabled buttons, role=button, and anchor tags to a 44px minimum hit
area on touch devices without changing visual size. Spec matches.

### A5. useLayoutEffect for SEO title update

**Status:** FIXED

`client/src/components/SEO.tsx` imports `useLayoutEffect` on line 6 and uses
it on line 43. Title, meta description, and canonical updates now run
synchronously before paint. Spec matches.

---

## Part 2: Status of the 25 Sprint 3 world-class ideas

All 25 are still PENDING. None have been wired up in code yet. They remain
scheduled per the Week 1 through Week 4 plan in
`CLAUDE_CODE_PROMPT_2026-04-17_SPRINT3_WORLD_CLASS.md` Part C.

No change.

---

## Part 3: 24 new world-class polish ideas

Research pass drew from current best practice in regenerative movement sites
(Kiss the Ground, Regen Network, Commonland), DAO and crypto UX (Gitcoin,
Optimism, Rainbow Wallet, Zora, Arc browser), editorial magazine design
(NYT, Are.na, Pitchfork), and fund landing pages (a16z crypto, Paradigm).

### Top 5 highest-impact if we only had a week

If this sprint only gets one week, prioritize these five. They create the
most immediate sensory and emotional impact and align with the regenerative
identity.

**H1. Color-shifting hero gradient (oklch)** · Beauty & atmosphere · Small · High
Use `oklch()` color space (Tailwind v4 native) to animate the home hero
gradient across spring-green, warm gold, and alliance teal on a 30-second
loop. Pauses under `prefers-reduced-motion`. Feels alive, reads as signature.

**H2. Live player bloom on the map** · Motion & interaction · Medium · Signature
When a quest completes or a seed is claimed, a small generative SVG flower
blooms at the player's bioregion on `/map`. Uses existing bioregion data on
profile. Flower fades after 90 seconds, or pools into a soft cluster if
multiple fire in a bioregion. Emotional gut-punch.

**H3. Bento-card explorer for land projects** · Navigation & wayfinding · Large · High
Replace the current uniform grid on `/apply` and `/map` with a responsive
bento layout. Each project card has a different weight (hero, mid, small)
based on stage, funding progress, or recency. Cards expand in place on hover
to reveal 15 second video or a mini map. 2025 and 2026's most-copied design
pattern, and elevates the incubator instantly.

**H4. Scroll-driven story animations** · Motion & interaction · Medium · High
Use CSS `animation-timeline: scroll()` on long-form pages (Bionomics,
Tokenomics, Fund, Heal the Land) to tie story beats to animations in the
page: a tree that grows as you scroll through its restoration story, a
river that flows as you read about watershed work. Graceful fallback to
static for older browsers.

**H5. Skeleton loading that mirrors final shape** · Performance & perceived speed · Small · Medium
Replace every spinner on the site with skeleton placeholders that mirror the
exact shape of the incoming content (quest card, forum thread, profile tier
badge). Progressive reveal in waves: shape first, then image, then text,
then CTA. Makes the site feel 300ms faster than it is.

### Beauty & atmosphere (6-9)

**6. Generative landscape SVG in section backgrounds** · Medium · High
Render a slowly-shifting parametric SVG landscape (rolling hills, distant
forests, water lines) behind specific sections. Seeded by page slug so each
page gets a stable-but-unique backdrop. Pure SVG, no image bandwidth. Ties
to regen brand immediately. Reference: Framer marketing site.

**7. Sacred geometry dividers, animated** · Small · High
Upgrade the vine, river, and stars dividers from Sprint 3 idea 5 with a
parametric variant: each divider draws itself on scroll-into-view using
`stroke-dasharray` animation. Feels hand-drawn in real time. Respects
reduced-motion.

**8.** Moved to `FUTURE_EVOLUTION_IDEAS.md` (Bioregion-aware theming).

**9.** Moved to `FUTURE_EVOLUTION_IDEAS.md` (Seasonal background texture swap).

### Motion & interaction (10-13)

**10. CSS View Transitions between pages** · Medium · High
Use the View Transitions API to morph between routes. Clicking a quest card
morphs the card into the quest page view. Going back morphs it back. Feels
native on Chromium and Safari 18+. Graceful degradation on older browsers.

**11. Tier promotion confetti burst with solarpunk palette** · Small · Medium
When a player's citizenship tier promotes (Seeker → Cultivator → Steward →
Elder), trigger a tasteful confetti burst in spring green, warm gold, and
warm white. Use `canvas-confetti`, respect reduced-motion. Celebration with
taste.

**12. Profile tier badge living glow** · Small · Medium
The citizenship tier badge on the profile page has a slow, organic glow
animation that intensifies slightly on hover. Breathing, not pulsing. 4
second loop, 5 percent opacity shift. Reads as earned and alive.

**13. Toast notification garden** · Medium · Medium
Notifications do not slide in as rectangular toasts. They grow from the
bottom of the screen as small sprouts, cluster near the corner, and fade
as they are dismissed or timed out. Whimsical, specific to ReGen Civics,
hard to copy.

### Content depth (14-16)

**14. Three-tier progressive disclosure on quest cards** · Medium · Medium
Quest cards have three states. Level 1: title and hook. Level 2 (tap or hover):
adds description, tier badge, time estimate, first-person testimonial.
Level 3: full quest page. Reduces cognitive load while rewarding curiosity.

**15.** Moved to `FUTURE_EVOLUTION_IDEAS.md` (Voice-witness clips on quest pages).

**16.** Moved to `FUTURE_EVOLUTION_IDEAS.md` (Player contribution calendar grid).

### Navigation & wayfinding (17-19)

**17. Forum category color-coded accent bars** · Small · Medium
Give each forum category a unique accent color pulled from your palette, and
display it as a 3px left border on category tabs and thread cards. Players
find categories by color muscle-memory within a week. Reference: Discord
channel list.

**18. Floating "for you" labels on personalized sections** · Small · Medium
Any feed section that is personalized (by bioregion, tier, or history) gets
a subtle floating label above it saying "For You" or "Your Bioregion" or
"Your Tier." Helps newer players understand the site responds to them
without heavy-handed personalization UX.

**19. Breadcrumbs with bioregion context** · Small · Medium
On land-project and map pages, breadcrumbs include the bioregion node
(`Land Projects → Cascadia → Willamette Headwaters`). Makes spatial hierarchy
legible and clickable. Strong for SEO too.

### Data visualization (20-21)

**20. Micro-sparklines on map markers** · Medium · Medium
Each land-project or campaign pin on `/map` shows a tiny funding or quest
completion sparkline on hover. 30 pixels wide, 10 pixels tall. Reads as a
data-dense editorial map, not a brochure map. Reference: Mapbox animated
markers, Bloomberg data graphics.

**21.** Moved to `FUTURE_EVOLUTION_IDEAS.md` (Seasonal stamina bar on the dashboard).

### Accessibility & inclusion (22-23)

**22.** Moved to `FUTURE_EVOLUTION_IDEAS.md` (Reading comfort side-panel).

**23. Accessibility statement and live self-test page** · Medium · Medium
Dedicated `/accessibility` page with current WCAG compliance status,
documented keyboard shortcuts, color-blind mode toggle, and a small
self-test widget ("try navigating by keyboard," "try zoom to 200 percent,"
"try with screen reader emulator"). Signals care. Reference: gov.uk
accessibility page.

### Delight & easter eggs (24)

**24. Seasonal tap easter eggs on the TreeOfLife icon** · Small · Low
Tapping the TreeOfLife icon (in the radial menu or on the mobile more menu
header) triggers a seasonal effect. Spring: a single flower blooms. Summer:
fireflies spark briefly around the icon. Autumn: a leaf drifts across the
screen. Winter: frost crystallizes on the icon for a second. Reward for
repeat visits. Respects reduced-motion (effect shrinks to a brief color
flash instead).

---

## Part 4: Consolidated execution plan

Build order across all work. Screenshot fixes come first.

### Week 0: Screenshot fixes (4 to 6 hours, first)

1. F2 radial menu geometry (`SPEC_02` section 2). 1 hour
2. F3 More menu logo swap (`SPEC_02` section 3). 30 minutes
3. F1 music experience overhaul (`SPEC_01`). 3 to 4 hours

### Week 1: Finish A items + quick wins (6 to 10 hours)

1. A2: Wrap every page in `<main id="main-content">`. 2 hours
2. A3: Promote h3 to h2 on Bionomics + 15 flagged pages. 1 hour
3. H5 skeleton loading (`SPEC_03` section H5). 2 hours
4. H1 oklch color-shift hero (`SPEC_03` section H1). 1 hour
5. Idea 11 tier promotion confetti (`SPEC_04`). 1 hour
6. Idea 12 tier badge living glow (`SPEC_04`). 1 hour

### Week 2: Signature visual polish (8 to 12 hours)

1. H2 live player bloom on map (`SPEC_03` section H2). 3 hours
2. H4 scroll-driven story animations (`SPEC_03` section H4). 3 hours
3. Idea 6 generative landscape SVG (`SPEC_04`). 2 hours
4. Idea 7 animated sacred geometry dividers (`SPEC_04`). 2 hours

### Week 3: Navigation and depth (6 to 10 hours)

1. H3 bento-card explorer (`SPEC_03` section H3). 4 hours
2. Idea 10 CSS View Transitions (`SPEC_04`). 2 hours
3. Idea 14 three-tier progressive disclosure on quest cards (`SPEC_04`). 2 hours
4. Idea 17 forum category color-coded bars (`SPEC_04`). 1 hour
5. Idea 18 floating "For You" labels (`SPEC_04`). 1 hour
6. Idea 19 breadcrumbs with bioregion (`SPEC_04`). 1 hour

### Week 4: Depth and belonging (4 to 8 hours)

1. Idea 20 map marker sparklines (`SPEC_04`). 2 hours
2. Idea 23 accessibility statement page (`SPEC_04`). 2 hours

### Week 5: Signature and sensory (3 to 5 hours)

1. Idea 13 toast notification garden (`SPEC_04`). 2 hours
2. Idea 24 TreeOfLife seasonal tap easter eggs (`SPEC_04`). 1 hour

### Parallel track (pick up in gaps)

Sprint 3 Part B ideas 1 through 25 can be interleaved across any of the
above weeks. The Week 1 through Week 4 plan in the Sprint 3 doc still
stands for those.

Parked ideas (8, 9, 15, 16, 21, 22) live in `FUTURE_EVOLUTION_IDEAS.md`.

---

## Handoff Breakdown: Who Does What

### YOU (Rye): things only you can do

| # | Task | Why only you | Command / Where |
|---|---|---|---|
| 1 | `git add -A && git commit && git push` after each batch | Claude Code's session holds the working tree | Terminal in `regen-civics-clean` |
| 2 | Confirm each Railway deploy succeeded | Railway dashboard | railway.app |
| 3 | Physical iPhone and desktop walk after each major batch | Real-device feel check | iPhone Safari + desktop Chrome |
| 4 | Visual taste calls on H2 (bloom style), new idea 7 (divider style), new idea 13 (toast sprite style) | Design direction | Review in PR screenshots |
| 5 | Smoke test the site after each deploy: `/`, `/fund`, `/community`, `/governance`, `/map`, `/quest` | Real-user walk | Browser |

### CLAUDE CODE: already done or can be done without you

| # | Task | Status |
|---|---|---|
| F1 | Music experience overhaul (SPEC_01) | SPEC READY |
| F2 | Radial menu geometry (SPEC_02 section 2) | SPEC READY |
| F3 | More menu logo swap (SPEC_02 section 3) | SPEC READY |
| A1 | Tool logo monogram fallback | FIXED |
| A4 | 44px hit-area pseudo-element CSS | FIXED |
| A5 | useLayoutEffect for SEO title update | FIXED |
| A2 | `<main>` landmark wrap on all pages | PENDING |
| A3 | Heading hierarchy promotions | PARTIAL. only Bionomics + ~15 pages remaining |
| 1-25 | Sprint 3 Part B 25 enhancement ideas | PENDING (scheduled per Sprint 3 Part C) |
| H1 | Color-shifting hero gradient (oklch) | SPEC READY (SPEC_03) |
| H2 | Live player bloom on the map | SPEC READY (SPEC_03) |
| H3 | Bento-card explorer for land projects | SPEC READY (SPEC_03) |
| H4 | Scroll-driven story animations | SPEC READY (SPEC_03) |
| H5 | Skeleton loading that mirrors final shape | SPEC READY (SPEC_03) |
| 6 | Generative landscape SVG | SPEC READY (SPEC_04) |
| 7 | Animated sacred geometry dividers | SPEC READY (SPEC_04) |
| 8 | Bioregion-aware theming | PARKED (FUTURE_EVOLUTION_IDEAS.md) |
| 9 | Seasonal background texture swap | PARKED (FUTURE_EVOLUTION_IDEAS.md) |
| 10 | CSS View Transitions between pages | SPEC READY (SPEC_04) |
| 11 | Tier promotion confetti burst | SPEC READY (SPEC_04) |
| 12 | Profile tier badge living glow | SPEC READY (SPEC_04) |
| 13 | Toast notification garden | SPEC READY (SPEC_04) |
| 14 | Three-tier progressive disclosure on quest cards | SPEC READY (SPEC_04) |
| 15 | Voice-witness clips on quest pages | PARKED (FUTURE_EVOLUTION_IDEAS.md) |
| 16 | Player contribution calendar grid | PARKED (FUTURE_EVOLUTION_IDEAS.md) |
| 17 | Forum category color-coded accent bars | SPEC READY (SPEC_04) |
| 18 | Floating "For You" labels | SPEC READY (SPEC_04) |
| 19 | Breadcrumbs with bioregion context | SPEC READY (SPEC_04) |
| 20 | Map marker micro-sparklines | SPEC READY (SPEC_04) |
| 21 | Seasonal stamina bar | PARKED (FUTURE_EVOLUTION_IDEAS.md) |
| 22 | Reading comfort side-panel | PARKED (FUTURE_EVOLUTION_IDEAS.md) |
| 23 | Accessibility statement and self-test page | SPEC READY (SPEC_04) |
| 24 | Seasonal TreeOfLife tap easter eggs | SPEC READY (SPEC_04) |

### WAITING ON YOU before Claude Code can proceed

None at the code level. Everything above is unblocked and can be picked up
by Claude Code.

Human-dependent items (design taste on idea 7 and 13) are only blocking the
final visual polish of those specific features. Claude Code can still
implement a working version with placeholder assets, and you can swap those
out in a follow-up commit.

---

## Verification after each batch

Run before committing:

```bash
# Palette drift
npx tsx scripts/check-palette.ts

# Lint
pnpm lint

# Type check (run on Windows, flaky in VM)
pnpm typecheck

# Build
pnpm build
```

Live-site smoke test after each deploy:

1. Load `/`, `/fund`, `/community`, `/governance`, `/map` with no console errors
2. Tab through the home page with every focus ring in spring green
3. Toggle reduced-motion on and verify all animations stop
4. Walk the mobile More menu, radial menu, and path cards on a real phone
5. Confirm the `<main>` skip link actually focuses content on every page
   that got an A2 wrap
