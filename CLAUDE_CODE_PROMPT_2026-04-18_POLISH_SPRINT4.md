# Claude Code Prompt: Polish Sprint 4 (send-off)

**Date:** 2026-04-18
**From:** Rye (via Cowork planning pass)
**For:** Claude Code working in `regen-civics-clean`
**Purpose:** kick off the full Polish Sprint 4 build and finish what
`CLAUDE_CODE_PROMPT_2026-04-17_SPRINT3_WORLD_CLASS.md` started.

---

## Read these docs before touching code

All six live at the repo root. Read them in this order.

1. `FIXES_TO_MAKE_2026-04-18.md`: master index. Part 0 is the three
   screenshot fixes (do first). Part 4 is the execution plan across 5 weeks.
2. `SPEC_01_MUSIC_EXPERIENCE.md`: F1. Shareable song URLs at
   `/hymn-book/:slug`, mobile More menu 3-button row (Playlist / Add song /
   Copy link), desktop CommandPanel Sound tab parallel 3-button row, full
   `CopyLinkButton` component code included.
3. `SPEC_02_MOBILE_MENU_POLISH.md`: F2 + F3. Radial menu geometry fix and
   More menu header logo swap.
4. `SPEC_03_SIGNATURE_VISUALS_H1_H5.md`: H1 oklch hero, H2 map bloom,
   H3 bento explorer, H4 scroll story, H5 skeleton loading.
5. `SPEC_04_POLISH_IDEAS_6_24.md`: the rest of the polish ideas (6, 7, 10,
   11, 12, 13, 14, 17, 18, 19, 20, 23, 24). Each has affected files,
   acceptance criteria, and a short implementation sketch.
6. `FUTURE_EVOLUTION_IDEAS.md`: parked ideas (8, 9, 15, 16, 21, 22). Do
   not build these. They are here so you know not to ask about them.

If any spec disagrees with the execution plan in `FIXES_TO_MAKE_2026-04-18.md`,
the individual SPEC doc is the source of truth for that feature. The fixes
doc is the source of truth for ordering and handoff.

---

## Order of operations

Follow the execution plan in `FIXES_TO_MAKE_2026-04-18.md` Part 4.

### Week 0: screenshot fixes (do these first, before anything else)

These came straight from Rye's April 17 walkthrough. They are the most
visible things a new visitor will see or hit on mobile today.

1. **F2 radial menu geometry** (`SPEC_02` section 2). ~1 hour.
2. **F3 More menu logo swap** (`SPEC_02` section 3). ~30 min.
3. **F1 music experience overhaul** (`SPEC_01`). ~3 to 4 hours. Covers:
   - `/hymn-book/:slug` slug route + auto-play on arrival
   - Mobile More menu 3-button row: Playlist / Add song / Copy link
   - Desktop CommandPanel Sound tab parallel 3-button row
   - `CopyLinkButton` component with inline "Copied" state (1.8s)
   - All three buttons must pass 44px hit-area at 320px viewport

Run verification after Week 0 and commit before moving to Week 1.

### Week 1 to Week 5

Follow `FIXES_TO_MAKE_2026-04-18.md` Part 4 week-by-week. Each week's line
items cite the SPEC doc to read for that feature.

### Parallel track

Sprint 3 Part B ideas 1 through 25 can be interleaved across any of the
above weeks if you find yourself waiting on Rye to verify a deploy. The
Week 1 through Week 4 plan in
`CLAUDE_CODE_PROMPT_2026-04-17_SPRINT3_WORLD_CLASS.md` still governs those
items.

---

## Verification (run after every feature, before Rye commits)

```bash
# Palette drift
npx tsx scripts/check-palette.ts

# Type check
npm run check

# Build
npm run build
```

If any of these fail, fix before moving on. Do not ship broken builds into
Rye's commit queue.

Live-site smoke test after each Railway deploy (Rye will do this):

1. Load `/`, `/fund`, `/community`, `/governance`, `/map` with no console
   errors
2. Tab through the home page with every focus ring in spring green
3. Toggle reduced-motion on and verify all animations stop
4. Walk the mobile More menu, radial menu, and path cards on a real phone
5. Load a `/hymn-book/:slug` URL cold and confirm auto-play fires
6. Tap "Copy link" on mobile and desktop, confirm the clipboard works and
   the inline "Copied" state shows for 1.8s

---

## Writing rules (apply to every string the user can read)

These are hard rules for any copy you add or change. Every button label,
toast text, tooltip, empty state, error message, and doc update must pass.

1. **No em-dashes.** Zero. Use a comma, a period, a colon, or a rewrite.
2. **No contrast-framing.** Do not define a thing by what it is not. Lead
   with the affirmative.
3. **No AI word patterns.** Banned: delve, tapestry, foster, leverage,
   unlock, unleash, seamless, robust, comprehensive, empower, utilize,
   embark, journey (as metaphor), nurture (as metaphor), beacon, testament,
   crucial, groundbreaking, transformative, vibrant, navigate (as metaphor).
4. **No rhetorical question openers.** Start with the thing.
5. **Voice:** direct, grounded, specific. Write as Rye. Contractions fine.
   Short sentences fine.

Full ruleset lives in `CLAUDE.md` under `## Writing Rules`.

---

## Commit policy

Rye owns commits. When a feature is ready to ship:

1. Stop. Do not run `git add` or `git commit`.
2. Announce: "Feature X is ready. Files touched: [list]. Verification ran
   clean. Ready for Rye to commit."
3. Wait.

Rye will run `git add -A && git commit && git push` locally from Windows.
He will confirm the Railway deploy and run the live-site smoke test.

Batch related features into a single commit where it makes sense. One
commit per week of the execution plan is a reasonable rhythm.

---

## Database work

All DB scripts must be run by Rye locally on Windows. The VM cannot reach
Railway MySQL (`getaddrinfo EAI_AGAIN nozomi.proxy.rlwy.net`).

If a feature needs a schema change:

1. Write the migration file in `drizzle/NNNN_description.sql`
2. Tell Rye: "Run `npx tsx scripts/run-migration.ts drizzle/NNNN_description.sql`
   locally, then confirm."
3. Wait for confirmation before writing code that depends on the new
   schema.

Polish Sprint 4 is mostly front-end. The only items that need a DB touch
are SPEC_01 (a `hymn_songs.slug` column + unique index, if songs are not
already keyed by slug) and H2 (a `bioregion_bloom_events` table, if we go
with a persistent queue).

---

## What you are NOT building this sprint

Do not build any of these, even if you see a clean path. They are parked
in `FUTURE_EVOLUTION_IDEAS.md` on purpose.

- Idea 8: Bioregion-aware theming
- Idea 9: Seasonal background texture swap
- Idea 15: Voice-witness audio clips on quest pages
- Idea 16: Player contribution calendar grid
- Idea 21: Seasonal stamina bar on dashboard
- Idea 22: Reading comfort side-panel

Also:

- Community-submitted Hymn Book songs do not get share URLs. Only the top
  voted song at the end of a season is promoted into the PLAYLIST and
  given a `/hymn-book/:slug` URL. Submissions live at `/hymn-book` where
  players listen, vote, and watch the leaderboard. (Ref: SPEC_01
  section 12 edge cases.)
- Social sharing scaffold (OG image, Twitter card meta) for
  `/hymn-book/:slug` is covered by the existing social sharing plumbing.
  No new work needed there in Sprint 4.

---

## Autonomy bar

Rye is holding a lot. Follow the project's max-autonomy rule (CLAUDE.md):

- Try things before asking permission.
- When a `[HUMAN]` step is unavoidable (DB script, Railway env var, visual
  taste call on idea 7 or 13), finish everything else first, then surface
  a single consolidated ask with the exact command or the exact question.
- Prefer attempting and reporting over asking whether to attempt.

---

## Handoff Breakdown: Who Does What

### YOU (Rye): things only you can do

| # | Task | Why only you | Command / Where |
|---|---|---|---|
| 1 | `git add -A && git commit && git push` after each batch | Claude Code's session holds the working tree | Terminal in `regen-civics-clean` |
| 2 | Confirm each Railway deploy succeeded | Railway dashboard | railway.app |
| 3 | Run any DB migration Claude Code writes | VM cannot reach Railway MySQL | `npx tsx scripts/run-migration.ts ...` locally |
| 4 | Physical iPhone + desktop walk after each batch | Real-device feel check | iPhone Safari + desktop Chrome |
| 5 | Visual taste calls on idea 7 (divider style) and idea 13 (toast sprite style) | Design direction | Review Claude Code's placeholder commit, then commit a taste follow-up |
| 6 | Decide whether to collapse Weeks 4 and 5 if time permits | Product direction | This doc |
| 7 | Smoke test the site after each deploy: `/`, `/fund`, `/community`, `/governance`, `/map`, `/quest`, `/hymn-book`, `/hymn-book/:slug` | Real-user walk | Browser |

### CLAUDE CODE: can be done without Rye

| # | Task | Status |
|---|---|---|
| Read all 6 planning docs before touching code | IN PROGRESS |
| Week 0: F2 radial menu geometry | SPEC READY |
| Week 0: F3 More menu logo swap | SPEC READY |
| Week 0: F1 music experience overhaul (desktop + mobile + CopyLinkButton) | SPEC READY |
| Week 1: A2 `<main>` landmark wrap on all pages | PENDING |
| Week 1: A3 heading hierarchy promotions (Bionomics + ~15 pages) | PARTIAL |
| Week 1: H5 skeleton loading | SPEC READY |
| Week 1: H1 oklch color-shift hero | SPEC READY |
| Week 1: Idea 11 tier promotion confetti | SPEC READY |
| Week 1: Idea 12 tier badge living glow | SPEC READY |
| Week 2: H2 live player bloom on map | SPEC READY |
| Week 2: H4 scroll-driven story animations | SPEC READY |
| Week 2: Idea 6 generative landscape SVG | SPEC READY |
| Week 2: Idea 7 animated sacred geometry dividers | SPEC READY |
| Week 3: H3 bento-card explorer | SPEC READY |
| Week 3: Idea 10 CSS View Transitions | SPEC READY |
| Week 3: Idea 14 three-tier progressive disclosure on quest cards | SPEC READY |
| Week 3: Idea 17 forum category accent bars | SPEC READY |
| Week 3: Idea 18 floating "For You" labels | SPEC READY |
| Week 3: Idea 19 breadcrumbs with bioregion | SPEC READY |
| Week 4: Idea 20 map marker sparklines | SPEC READY |
| Week 4: Idea 23 accessibility statement page | SPEC READY |
| Week 5: Idea 13 toast notification garden | SPEC READY |
| Week 5: Idea 24 TreeOfLife seasonal tap easter eggs | SPEC READY |

### WAITING ON YOU before Claude Code can proceed

None at the code level. Everything in the table above is unblocked and can
be picked up now.

Soft-blocked items (idea 7 divider style, idea 13 toast sprite style) can
ship a working placeholder version that you swap out in a follow-up
commit. Do not hold up the sprint waiting on those taste calls.

---

## First message back to Rye

When you start, reply with:

1. "Read. I have the 6 docs loaded."
2. A one-line commitment to the Week 0 first, Week 1 through 5 in order.
3. Any clarifying question you absolutely cannot proceed without.

Then begin Week 0: F2 first (fastest win), F3 second, F1 third.

Good luck.
