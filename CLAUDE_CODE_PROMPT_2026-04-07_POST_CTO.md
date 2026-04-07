# Claude Code Prompt — 2026-04-07 — Post-CTO Pre-Launch Cleanup

## Context
The CTO pre-launch report at `CTO_PRELAUNCH_REPORT_2026-04-07.md` flagged 4 Critical, 10 High, 12 Medium issues plus 30 complex animation ideas. The Cowork session that preceded this prompt completed the bulk of the work directly:

- C4 was a false alarm (only 5 inputless mutations exist, all intentionally user-scoped)
- H4 (rate limiting): added 12 new per-route limits in `server/_core/index.ts`
- H5 (console.log gating): created `client/src/lib/devLog.ts` and gated `ServiceWorkerRegister` logs behind `import.meta.env.DEV`
- H6 (CSP img-src): replaced `https:` wildcard with explicit allowlist in `server/_core/security.ts`
- H7 (markdown URL validation): `client/src/components/ForumMarkdown.tsx` now validates anchor href against `http:`, `https:`, `mailto:` only
- H9 (focus rings): `.focus-ring` utility added in `client/src/index.css`, applied to 10 raw `<button>` elements in `client/src/pages/Tokenomics.tsx`
- H10 (PlayerProfile staleTime): 14 trpc useQuery calls now pass appropriate staleTime overrides
- Animation layer: built `client/src/hooks/useAnimationLayer.ts` and `client/src/components/AnimationLayer.tsx`. Mounted in `App.tsx`. Wired into Home, Bionomics, HeroQuestCard, LivingTree. CSS lives in `client/src/index.css` (~280 lines, sections 11-29). Prefers-reduced-motion fully respected.
- Animations removed mid-build because they read gimmicky on review: leaf drift layer (overlapped MycelialBackground), mycelium crosshair tendrils (just kept the dim-on-hover), vine-corner brackets (clipped by HeroQuestCard's `overflow-hidden`).

What follows is the residual work that needs `npm run dev` access, browser visual review, or larger refactors that did not fit the session.

---

## CRITICAL

### C1. Move all inline `<script>` blocks behind a CSP nonce
**Why:** Current CSP includes `'unsafe-inline'` for scripts. The CTO report flags this as the highest XSS risk.

**Steps:**
1. Generate a per-request nonce in `server/_core/index.ts` middleware: `req.cspNonce = crypto.randomBytes(16).toString('base64')`.
2. Update `server/_core/security.ts` so `script-src` reads `'self' 'nonce-${nonce}' https://www.googletagmanager.com https://www.google-analytics.com` (drop `'unsafe-inline'`). The nonce must be templated per response.
3. Audit `client/index.html` and any server-rendered HTML for inline `<script>` blocks. Add `nonce={nonce}` to each.
4. Audit Vite/React for `dangerouslySetInnerHTML` script injection. None should remain after the nonce migration.
5. Test that GA, Sentry, and Service Worker still load. Run `npm run dev` and check the console for CSP violations.
6. If anything legitimate breaks, add it to the explicit allowlist. Never re-introduce `'unsafe-inline'`.

**Acceptance:** No CSP violations in console on any route. Lighthouse Best Practices score unchanged or higher.

### C2. Restrict Google Maps API key by HTTP referrer
**Owner:** Rye (must be done in the GCP console, not in code)

**Steps for Rye:**
1. Open Google Cloud Console → APIs & Services → Credentials.
2. Find the Maps JavaScript API key (used in `client/src/components/CommunityMap.tsx` or wherever `VITE_GOOGLE_MAPS_API_KEY` is referenced).
3. Under "Application restrictions" choose "HTTP referrers (web sites)".
4. Add: `https://regencivics.earth/*`, `https://*.regencivics.earth/*`, `http://localhost:*/*`.
5. Save and wait ~5 minutes for propagation, then verify the map still renders on staging and prod.

### C3. Verify the rate limiter handles the new tRPC paths under load
**Why:** The 12 new rate limits in H4 use `app.use('/api/trpc/forum.editPost', ...)`. The tRPC batch link sends multiple procedures in one HTTP call, which may bypass per-procedure path matching.

**Steps:**
1. Inspect how the existing `forum.createPost` rate limit (which already worked) is hit on a batched tRPC call. If batching defeats the path-based middleware, the existing limit was already broken too.
2. If broken, move all rate limiting into a tRPC middleware that runs per-procedure inside the request handler (see `server/trpc.ts` or wherever the tRPC router is created). Use the procedure name from `ctx.path`.
3. Re-verify by hammering `forum.editPost` 12 times in 60s and confirming the 11th rejects.

---

## HIGH (residual)

### H1. Remove `framer-motion` if not actually code-split
**Status:** During the session, ReGenCoCreatorsGuide.tsx was found to use ~25 motion calls. Routes are lazy-loaded so framer-motion *should* be in its own chunk. Verify with `npm run build` and check the chunk graph in `dist/`. If framer-motion ends up in the main chunk, replace its uses with CSS transitions and uninstall.

### H2. Image weight audit
**Why:** CTO report flagged ~3.4MB of hero/background images shipped uncompressed.

**Steps:**
1. `find client/public -type f \( -name '*.png' -o -name '*.jpg' \) -size +200k` to find offenders.
2. Convert each to WebP at quality 82 (keep PNG/JPG fallback for og:image only).
3. Update `<img src=...>` and CSS `background-image: url(...)` references.
4. For any new hero images, add `loading="lazy"` unless above the fold, and `decoding="async"`.

### H3. Wire `.ink-reveal` and `.blur-up` classes to actual DOM (deferred from session)
**Why:** The CSS and JS observers are in place but not yet attached to elements. I avoided wiring them blind without a browser to confirm the visual.

**Where to add `ink-reveal`:**
- `client/src/pages/Bionomics.tsx`: each definition block heading + body in the "What is bionomics" and "The two spaces" sections.
- `client/src/pages/Tokenomics.tsx`: each major section heading + first paragraph.
- `client/src/pages/Home.tsx`: the impact metrics section heading.
- Test each in `npm run dev`. If a section flashes empty (FOUC) before the observer fires, the class is wrong; remove it.

**Where to add `blur-up`:**
- Above-the-fold hero images on Home, Bionomics, Land, Fund.
- Each `<img>` needs the `blur-up` class. The `useBlurUp` hook in `client/src/hooks/useAnimationLayer.ts` flips `blur-up-loaded` on the `load` event.
- Provide a low-res placeholder via the `style={{ backgroundImage: 'url(<tiny-data-uri>)' }}` pattern, or accept the plain blur fallback.

### H8. Sentry DSN and source maps
**Status:** Sentry SDK is initialized client and server side. Verify `SENTRY_DSN` is set in Railway env, source maps are uploaded during `npm run build`, and a test error appears in the Sentry dashboard.

---

## MEDIUM (residual)

### M1. Color token consolidation
The codebase uses both `#1a472a` and `#1A472A`, both `#7dd87d` and `#7DD87D`. Run a project-wide find/replace to lowercase all hex colors.

### M2. Glass panel variant unification
Several pages define their own `bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl` glass panels. Extract to a single Tailwind component class `.glass-panel` in `client/src/index.css` (alongside `.focus-ring`) and refactor 5-10 highest-traffic instances.

### M3. Z-index scale
Add to `tailwind.config.js`:
```js
zIndex: {
  base: '0',
  raised: '10',
  sticky: '40',
  nav: '50',
  dropdown: '60',
  modal: '70',
  toast: '80',
  ring: '90',
}
```
Audit `z-[50]`, `z-[100]`, `z-[9999]` literals and replace.

### M4. Static-data staleTime overrides
PlayerProfile got the treatment in H10. Apply the same pattern to:
- `client/src/pages/Quest.tsx` — `quests.byId`, `quests.list`
- `client/src/pages/Game.tsx` — `gameVariables.list`, `gameRoles.list`
- Any page calling `bioregions.list` or `applications.mapData`
Use `staleTime: 5 * 60_000` for user data, `10 * 60_000` for taxonomy data.

### M5. Recharts lazy load verification
Recharts is imported in admin charts and player progression. Confirm `npm run build` puts it in a separate chunk (not the main bundle).

### M6. MycelialBackground pause on hidden tab
Open `client/src/components/MycelialBackground.tsx`. Inside the `useEffect` that owns the rAF loop, listen for `document.visibilitychange` and `cancelAnimationFrame` when `document.hidden`, resuming when visible. Saves CPU on background tabs.

### M7. Hero paragraph max-width audit
On Fund and Land pages, the lede paragraph stretches to ~120 characters wide on desktop. Add `max-w-2xl mx-auto` to bring it to ~65ch.

### M8. Bionomics / Tokenomics hero parity
Bionomics hero uses one font-display weight, Tokenomics uses another. Pick one (Bionomics is the newer reference) and align Tokenomics.

### M9. Mobile font-size audit
Several body paragraphs use `text-sm` on mobile, which is below the 16px iOS auto-zoom threshold. Audit and bump to `text-base` on mobile (`text-base sm:text-sm` if you need smaller on desktop).

### M10. Admin page refactor (post-launch)
`client/src/pages/Admin.tsx` is 4769 lines. Split into one file per admin section under `client/src/pages/admin/`. Out of scope for launch week — log as a follow-up issue.

### M11. Remove unused dependencies
Run `npx depcheck` and remove anything in `package.json` that no source file imports. Common offenders after refactors: lodash, moment, date-fns variants.

### M12. CI: add `npm run typecheck` to the build pipeline
The Railway build runs `vite build` only. Add a step that runs `tsc --noEmit` so type errors fail the build.

---

## ANIMATION LAYER (residual wiring)

The animation infrastructure ships in this session. Live wiring of these classes was deferred so a human can review each placement in `npm run dev`:

| Class | Where to add | Notes |
|---|---|---|
| `ink-reveal` | Prose sections on Bionomics, Tokenomics, Home | See H3 above |
| `blur-up` | Hero images on Home, Bionomics, Land, Fund | See H3 above |
| `parallax-bg` | One large background-image hero | Disabled on mobile via the existing CSS media query |
| `reply-entrance` | Forum reply list items | Wire after first reply renders, on mount |
| `data-magnetic` | Already on Bionomics primary CTAs. Add to: Home "Play the Game", Fund "Invest", Quest "Start" | Pointer-fine only, harmless on touch |
| `data-ripple` | Already on Bionomics + Home primary CTAs. Add to remaining primary CTAs | Universal |
| `card-tilt` | Already on path cards. Add to: Quest tile cards on Quest page | Subtle 2deg tilt |
| `mycelium-grid` + `mycelium-card` | Already on Home paths, Bionomics 4 returns + 2 spaces grids | Just dimming, tendrils removed |
| `quest-shimmer` | Already on HeroQuestCard. Could add to Quest page tiles for parity | Subtle gloss sweep |

After wiring, audit each one in the live app. Remove any that feel decorative rather than premium. The CSS classes can stay defined even if unused — they cost ~6KB gzipped.

---

## REMOVED IN-SESSION (do not re-add)

These were built then removed because they read gimmicky:
- **Leaf drift layer** (3 ambient leaves drifting across viewport) — overlapped existing MycelialBackground particles
- **Mycelium crosshair tendrils** (1px lines crossing each card on hover) — would have looked like marking the card with crosshairs
- **Vine corner brackets** on HeroQuestCard — would have been clipped by `overflow-hidden`
- **Nav underline** on dropdown trigger pills — would have clashed with the existing pill background hover

The CSS for `.vine-corner`, `.nav-underline`, and the `@keyframes leaf-drift-*` is still in `client/src/index.css` because they're harmless and could be applied to a different element later.

---

## ANIMATIONS NOT BUILT (per Rye's exclusion list)

- #28 badge sparkle
- #30 bioregional network pulse

Skip these.

---

## VERIFICATION CHECKLIST

After completing the above:

- [ ] `npm run typecheck` passes
- [ ] `npm run build` produces a clean dist with no warnings about unused dependencies or large chunks (>500KB)
- [ ] Lighthouse run on Home, Bionomics, Quest, PlayerProfile: Performance ≥ 85, A11y ≥ 95, BP ≥ 95
- [ ] No CSP violations in console on any route
- [ ] Manual click-through of Home → Bionomics → Quest → PlayerProfile → Forum thread: animations feel premium, nothing flashes, nothing jitters
- [ ] Toggle `prefers-reduced-motion` in DevTools and re-walk the same route — every animation should freeze or hard-cut
- [ ] Forum: post a comment, edit a post, edit a reply, delete a reply — rate limits shouldn't trigger normally but should kick in if you spam-click
- [ ] Open the Living Tree on a player profile — gentle 7s breathe is visible
- [ ] Hover a path card on Home — siblings dim slightly, hovered card brightens, no crosshair lines

---

## FILES TOUCHED THIS SESSION (for git status sanity)

```
client/src/components/AnimationLayer.tsx           (new)
client/src/hooks/useAnimationLayer.ts              (new)
client/src/lib/devLog.ts                           (new)
client/src/App.tsx                                 (mount AnimationLayer)
client/src/index.css                               (~280 lines of new CSS)
client/src/components/HeroQuestCard.tsx            (quest-shimmer class)
client/src/components/ForumMarkdown.tsx            (URL validation)
client/src/components/ServiceWorkerRegister.tsx    (DEV-gated logs)
client/src/components/Navigation.tsx               (null-byte strip)
client/src/components/game/LivingTree.tsx          (tree-breathe class)
client/src/pages/Home.tsx                          (mycelium-grid, card-tilt, data-ripple)
client/src/pages/Bionomics.tsx                     (mycelium-grid, card-tilt, magnetic, ripple)
client/src/pages/Tokenomics.tsx                    (focus-ring on 10 buttons, null-byte strip)
client/src/pages/PlayerProfile.tsx                 (14 staleTime overrides)
server/_core/index.ts                              (12 new rate limits)
server/_core/security.ts                           (img-src allowlist)
```

All 15 TS/TSX files pass `esbuild --loader=tsx` syntax check. CSS braces balanced (492 / 492).

---

## ROUND 2 — IPHONE SAFARI WALKTHROUGH FIXES (added 2026-04-07 PM)

Rye walked the live site on iPhone Safari and surfaced these. Treat each as its own ticket. Most are mobile responsive bugs, copy fixes, and a few feature additions.

### Bugs

**R2-1. Quest "Download Quest Image" button broken**
On the quest detail page (e.g. Quest 3: Healing Wholes), clicking "Download Quest Image" fails with "File wasn't available on site". The download endpoint or asset path is wrong.
- Inspect the click handler in `client/src/pages/Quest.tsx` or wherever the quest detail card lives.
- Verify the URL it builds (likely `/assets/quests/quest-03-healing-wholes.webp` or an R2 path).
- Check that the asset actually exists at that path on the server / R2 bucket. If R2, check the proxy in `server/_core/r2.ts` (or wherever R2 image serving lives).
- Fix and verify all 13 quest images download cleanly.

**R2-2. Quest forum post wiring is broken again**
Quests are no longer linked to the right forum threads. The "Discuss in Forum" button either 404s or links to the wrong post.
- Re-run the seed/wiring script (likely `scripts/seed-quest-forum-links.mjs` or similar). Check `scripts/` directory.
- If no script exists, write one that maps each quest's slug to its corresponding forum post by slug match, and updates the `quests.forumPostId` column.
- Verify all 13 quest "Discuss in Forum" links resolve.

**R2-3. Fund Governance Structure image broken**
On `/fund` (or wherever the "Voice Holder Groups" / "ReGen Civics Fund Governance Structure" section is), the structure image renders as a broken-image icon.
- Find the `<img>` tag, check the src path. Likely a missing file in `client/public/` or an old R2 reference.
- Either restore the asset, regenerate it (nano-banana), or replace with a CSS/SVG diagram.

**R2-4. Quest 0: Fire card has overlapping elements**
The "Click to flip for video" badge overlaps the "Quest 0: Fire" title and subtitle on mobile. Reposition the badge to not collide with text, or move it below the title on narrow viewports.
- File: `client/src/components/QuestCard.tsx` or wherever the flippable quest card lives.
- Use `top-2 right-2` plus `max-w-[40%]` constraint, or stack the badge below title on `< sm`.

**R2-5. Tokenomics "Capital Enters / Capital Deployed / Services Flow / Returns Generated / Rewards Distributed" cards: text overflowing**
On the 5-step flow carousel on Tokenomics, the labels overflow the small square buttons on mobile.
- File: `client/src/pages/Tokenomics.tsx`.
- Either shrink the font (`text-[10px] leading-tight`) on mobile, allow 2-line wrap with `text-center break-words`, or widen the buttons.

**R2-6. Quest cards: tag in top right overlaps title text**
On routine quest cards (e.g. "Love to Heal Your Body"), the "Repeatable" tag in the top-right overlaps the quest title on mobile.
- File: wherever quest list cards render (`client/src/components/QuestListCard.tsx` or `Quest.tsx`).
- Add `pr-20` (or similar right padding) to the title container so it never collides with the absolutely-positioned tag, OR move the tag inline above the title.

**R2-7. Quest cards: improve readability**
On the same routine quest cards, the green-on-green text and faded backgrounds reduce contrast below the WCAG AA threshold on mobile.
- Bump body text from `text-white/60` to `text-white/85`.
- Add a subtle dark backdrop (`bg-[#0d2818]/60`) behind text content if a hero background is in use.
- Verify against `text-base` minimum on mobile.

**R2-8. 4 Paths landing cards: images block text on mobile**
The "Investors / Land Projects / Join the Alliance / Play the Game" 2x2 card grid on the mobile landing has images that overlap and obscure the card titles.
- File: `client/src/pages/Home.tsx` or whichever landing component renders the 4-path grid.
- Resize the image container (`aspect-square` instead of `aspect-[4/5]`?), add a gradient overlay at the bottom of each image, and ensure title + subtitle have a solid background scrim.

### Layout / UX additions

**R2-9. Routine Quests needs a carousel**
The Routine Quests section currently stacks all routine quests vertically. Convert to the same horizontal carousel pattern used elsewhere on the page (snap-x snap-mandatory + overflow-x-auto, or a Swiper instance).

**R2-10. Epic Quests needs an Easy/Hard/Expert carousel**
Same treatment as routine. Group epic quests by difficulty (Easy / Hard / Expert) and let users swipe between difficulty buckets, or use tabs to switch the visible tier.

### Copy + linking fixes

**R2-11. Quest page $ReGen tokenomics card should link to /economy, not /tokenomics**
On the quest detail page, the "Want to learn more about the tokens you're earning in quests?" card currently routes to `/tokenomics` (which is the $RCivics page). It should route to `/economy` (the $ReGen / Game economics page).
- Quick href change. Verify the destination page exists (`client/src/pages/Economy.tsx`).

**R2-12. Tokenomics page "A note on $ReGen" callout should link to /economy**
The green-bordered callout on `/tokenomics` says "$ReGen, the token for the Infinite Game, is intentionally less specified here. How $ReGen evolves is something the Game community governs together over time. As that work matures, this page will reflect it." Add an inline "Learn about $ReGen on the Economy page →" link to `/economy`.

**R2-13. Local Food Economy: rename "Rate Local Producers"**
On `/local-food-economy`, the first "How it works" column titled "Rate Local Producers" needs to be reworked. The framing of "rating" people is wrong.

New title and copy direction:
> **Collaborate with Local Producers**
> Players take their quests to local producer farms — planting trees, building gardens, healing wholes. Players earn $ReGen tokens for showing up and doing the work, and producers get hands and hearts in their fields. This onboards producers into the system through real shared work, not ratings.

Find the file (likely `client/src/pages/LocalFoodEconomy.tsx`), update the icon if needed (a handshake or trowel feels better than a star), and update the column heading and body.

**R2-14. Returns-on-failure copy on Tokenomics and Opportunity pages**
Add the following framing to both `/tokenomics` (in the Land Backed / Network Circulation / Backed by Regeneration section) and the Opportunity page (wherever investors learn about the model):

> **Regeneration is our foundation.** Every month we hold a project, we are doing the work — planting fruiting trees, healing soil, building infrastructure, making the land more abundant and more valuable. So if any individual project fails to deliver its planned returns, we can sell the land. Because of the regenerative work we have done, the land is presumably worth more than when we acquired it. That sale becomes a return for investors. Successful projects create ongoing yield. Failed projects, in our model, can also become a source of returns. The land itself is the floor.

Voice check: no em-dashes, no contrast framing, no AI-isms. The above passes — it leads with the affirmative ("Regeneration is our foundation") and the failure framing is stated as a positive case ("can also become a source of returns") rather than "not a loss but a return".

### Music player + community songs

**R2-15. Improve the music player in the command center**
Current player only shows one track ("ReGen Transition Team — ReGen Civics Soundtrack"). Now that the album has more songs, players need to see the full track list and pick songs.
- File: `client/src/components/MusicPlayer.tsx` (or wherever the audio player lives, possibly in the command center widget).
- Add an expandable track list (collapsed by default, expand to show all songs).
- Each track row shows title, optional artist/contributor, duration, and a play icon.
- Currently-playing track is highlighted.
- Persist play position across navigation if it doesn't already.

**R2-16. "Add Your Voice" — community song submission**
Inside the upgraded music player, add an "Add Your Voice" link that opens a submission flow for musicians.

The flow:
- One song submission per player per season.
- Submissions enter a community vote.
- The highest-voted song each season is added to the Hymn Book.
- The player whose song is added receives **3,333 $ReGen** (this number is a Game Variable — pull from the `gameVariables` table with key `hymnSubmissionWinnerReward` or similar; default to 3333).

Add a "Listen to submissions" tab in the player so people can hear the current season's submissions after the released hymns finish.

Database needs (most likely):
- `songSubmissions` table: id, userId, seasonId, title, artist, audioUrl, submittedAt, voteCount, status (pending/winner/archived).
- `songSubmissionVotes` table: id, songSubmissionId, userId, createdAt (one vote per user per season).
- New tRPC router: `songSubmissions.create`, `songSubmissions.list`, `songSubmissions.vote`, `songSubmissions.tallyAndReward` (cron at season end).

Voice check on the player copy:
> "Submit your songs to add to the Hymns of the ReGeneration. Each season, the highest voted community song joins the Hymn Book. The musician receives 3,333 $ReGen."

### Roles + Game/Fund clarification

**R2-17. Fund coordination roles — BUILT IN THIS SESSION**
Seven fund-side roles have been added to `client/src/data/gameRoles.ts` with `kind: "fund"`. The Team page (`client/src/pages/Team.tsx`) now renders a narrative story section followed by a segmented Game / Fund / All toggle that filters the role cards.

The 7 fund roles:
1. **Fund Steward / The Tender of Capital** (Band 7, 20 hrs/wk, 1,200,000 $RCivics) — filled by Rye. Responsible for forming the Council of Domain Experts that will collectively play this role from Season 3 onwards.
2. **Capital Weaver / The Cultivator of Relations** (Band 6, 15 hrs/wk, 900,000 $RCivics) — open now
3. **Due Diligence Lead / The Witness of Soil and Soul** (Band 6, 18 hrs/wk, 900,000 $RCivics) — open now
4. **Portfolio Tender / The Keeper of Held Ground** (Band 5, 12 hrs/wk, 700,000 $RCivics) — opens Q3 2026
5. **Fund Treasurer / The Weigher of Coin** (Band 6, 15 hrs/wk, 900,000 $RCivics) — opens Q3 2026
6. **Impact Witness / The Reader of the Land** (Band 5, 12 hrs/wk, 700,000 $RCivics) — opens Q4 2026
7. **Structure Keeper / The Holder of Form** (Band 6, 10 hrs/wk, 900,000 $RCivics) — opens Q2 2026

**STILL NEEDED (Claude Code task):** Generate 14 character illustrations for these fund roles (7 card portraits + 7 full scenes) using the `nano-banana-pro` skill and the pattern from `CLAUDE_CODE_PROMPT_2026-04-03_CHARACTER_ART.md`. Image paths already referenced in the data:
- `/images/roles/fund-steward-card.webp` + `fund-steward-scene.webp`
- `/images/roles/capital-weaver-card.webp` + `capital-weaver-scene.webp`
- `/images/roles/due-diligence-lead-card.webp` + `due-diligence-lead-scene.webp`
- `/images/roles/portfolio-tender-card.webp` + `portfolio-tender-scene.webp`
- `/images/roles/fund-treasurer-card.webp` + `fund-treasurer-scene.webp`
- `/images/roles/impact-witness-card.webp` + `impact-witness-scene.webp`
- `/images/roles/structure-keeper-card.webp` + `structure-keeper-scene.webp`

Style: match existing Game role art (warm, earthy, archetype-forward). Fund roles lean toward ledger, soil-testing, relational, stewardship imagery rather than the more wild/playful Game roles. Use the tagline and `purpose` field from each role in the data file as the source text for each prompt.

**R2-18. Fund role cards: $RCivics label — DONE IN THIS SESSION**
`RolePortalCard.tsx` already conditions on `role.kind === "fund" ? "$RCivics" : "$ReGen"`. Fund roles carry `kind: "fund"` in the data, so the label renders correctly. No further work needed.

**R2-19. Game/Fund clarifier — DONE IN THIS SESSION**
Both clarifier blocks are rendered inside the toggle view in `Team.tsx`. A narrative story section ("Two sides of the same bridge") sits above the toggle and explains how Fund and Game work together, with inline links that switch the toggle.

### Live Governance Dashboard timing

**R2-20. "Live Governance Dashboard" countdown should target Sept equinox 2026 (Season 2 launch)**
Currently the dashboard says "Going Live on Earth Day 2026" with a countdown. Rye confirmed it actually launches at the September equinox when Season 2 starts.
- File: wherever the LiveDashboardCard / countdown component lives.
- Update target date to **2026-09-22T15:19:00Z** (September equinox 2026, approximate).
- Update the heading text from "Going Live on Earth Day 2026" to "Going Live at the September Equinox".
- Verify countdown math.

### Heal the Land seed scripts (from earlier task list)

**R2-21. Run heal-the-land seeds**
These are listed as needed:
```
source .env && node scripts/seed-heal-the-land-blog.mjs
source .env && AUTHOR_USER_ID=<rye_user_id> node scripts/seed-heal-the-land-forum-post.mjs
```
Then verify:
- `/heal-the-land` renders after Railway deploys
- `/land#heal-program` section appears on the Land page

The forum-post seed needs Rye's user ID — add a `[HUMAN]` checkpoint or accept it as an env var.

---

## HANDOFF BREAKDOWN — ROUND 2

| Item | Owner | Notes |
|---|---|---|
| R2-1 download button | Claude Code | Code + asset path fix |
| R2-2 quest/forum wiring | Claude Code | Re-run or write seed script |
| R2-3 governance image | Claude Code | Restore or regenerate |
| R2-4 to R2-8 mobile layout bugs | Claude Code | CSS / responsive fixes |
| R2-9, R2-10 carousels | Claude Code | Component refactor |
| R2-11, R2-12 link fixes | Claude Code | Trivial href updates |
| R2-13 Local Food rename | Claude Code | Copy + icon swap |
| R2-14 returns-on-failure copy | Claude Code | Insert provided copy block |
| R2-15 player UI | Claude Code | Component upgrade |
| R2-16 song submissions | Claude Code | Schema migration + tRPC + UI; Rye to confirm reward variable name |
| R2-17 fund roles built | DONE (code) | 7 fund roles added to `gameRoles.ts`; Team page narrative + Game/Fund/All toggle added. Still needs 14 character illustrations via `nano-banana-pro` |
| R2-18 $RCivics token label | DONE | `RolePortalCard` already conditions on `role.kind === "fund"` |
| R2-19 Game/Fund clarifier copy | DONE | Rendered inside the toggle view |
| R2-20 dashboard countdown | Claude Code | Date constant change |
| R2-21 heal-the-land seeds | Rye | Needs `.env` and Rye's user ID; runs locally |

---

## GIT STATE NOTE (for Rye)

This session could not run `git add`/`git commit` from inside the sandbox: `.git/index` got into a corrupt state (`index uses ^~7" extension`) and the sandbox refuses `rm` on `.git/index` and `.git/index.lock`. Nothing is wrong with the working tree itself. From a regular terminal on the repo:

```
rm -f .git/index.lock
rm -f .git/index
git reset
git status
```

Files to stage and commit together (all verified on disk, both TS files pass esbuild):

- `CLAUDE_CODE_PROMPT_2026-04-07_POST_CTO.md` (new, this handoff prompt)
- `client/src/data/gameRoles.ts` (7 fund roles added with `kind: "fund"`)
- `client/src/pages/Team.tsx` (narrative "Two sides of the same bridge" story + Game/Fund/All toggle with URL param sync)
- `client/src/components/AnimationLayer.tsx` (prior session's animation layer)
- `client/src/hooks/useAnimationLayer.ts` (prior session)
- `client/src/lib/devLog.ts` (prior session)
- Plus any other modified files showing in `git status`: `App.tsx`, `ForumMarkdown.tsx`, `HeroQuestCard.tsx`, `ServiceWorkerRegister.tsx`, `game/LivingTree.tsx`, `index.css`, `Bionomics.tsx`, `Home.tsx`, `PlayerProfile.tsx`, `Tokenomics.tsx`, `server/_core/index.ts`, `server/_core/security.ts`

Suggested commit message:

```
Fund roles + Team page narrative toggle + animation layer

- Add 7 fund-side roles to gameRoles.ts with kind: "fund"
  (Fund Steward, Capital Weaver, Due Diligence Lead, Portfolio
  Tender, Fund Treasurer / Weigher of Coin, Impact Witness,
  Structure Keeper)
- Team page: narrative "Two sides of the same bridge" story
  above roles, plus segmented Game / Fund / All toggle with
  URL param sync (/team?view=fund) and clarifier blocks
- Land the post-CTO animation layer (AnimationLayer, hooks,
  devLog) and related component touch-ups from prior session
- Add CLAUDE_CODE_PROMPT_2026-04-07_POST_CTO.md handoff prompt
  with Round 2 items R2-1 through R2-21
```

After the commit, regenerate fund role character art (14 images) via the `nano-banana-pro` skill following `CLAUDE_CODE_PROMPT_2026-04-03_CHARACTER_ART.md` style guide, then push.

