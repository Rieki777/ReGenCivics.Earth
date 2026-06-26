# Fixes to Make — 2026-06-25 (Field Report Batch)

Source: Rye's walkthrough screenshots and notes from regencivics.earth on mobile, June 25.

This document is a research-grounded handoff for Claude Code. Every fix below has been traced to concrete files and line numbers by reading the current source. Where the static read could not fully prove the runtime cause, that is called out explicitly and a diagnostic step is included so Claude Code reproduces in a real mobile browser before claiming VERIFIED. Run the Ship Gate (`scripts/audit-truncation.py`, className grep, `pnpm typecheck`) before marking anything VERIFIED.

Priority order: Fix 9 (investor buttons) and Fix 10 (alliance accordions) are Critical because they block the investor and partner funnels. Fix 4 (Explore button), Fix 6 (mobile overflow), and Fix 7 (mobile tap lag) are High. The rest are Medium, except the two ideation sections (editor overhaul, dialogue process) which are design directions to choose from.

---

## Fix 1 — Quest Stories card video autoplay (Medium)

**Status:** PARTIALLY CODED. Playback is already wired. The capture pipeline that feeds it is missing.

**Symptom:** Rye expects that clicking a Quest Stories card auto-plays his video, and any player's uploaded video, once that footage is captured.

**Root cause:** The display side already works. `QuestCompletionFeed.tsx` (card render + `onClick={() => onOpen(entry)}`, lines 76-180) opens `QuestStoryDetailModal.tsx`, which renders a `<video autoPlay controls poster={story.videoThumbnailUrl} src={story.artifactUrl}>` (line ~103-111). So a card with `artifactType="video"` and a populated `artifactUrl` will autoplay today. The gap is upstream:

- The `quest_completions` table (`drizzle/schema.ts` lines 2018-2039) already has `artifactType` (enum includes `"video"`), `artifactUrl`, `videoThumbnailUrl`, `videoDurationSeconds`.
- The submit procedure `quest.logCompletion` (`server/routes/players.ts` lines 1333-1361) accepts `artifactUrl` but does NOT accept or store `videoThumbnailUrl` or `videoDurationSeconds`, and the submission UI (`SubmitToDAOModal.tsx`) only collects a single URL string. No file upload, no thumbnail, no duration, no artifactType detection. So real video records are never created, which is why the feed looks inert.

**DECISION (Rye, 2026-06-25):** No upload pipeline. Quest completion already requires the player to paste a URL (video, article, etc). Quest Stories should link to that URL, and each story card should carry a small badge/button stating the media type (Video, Article, Photo, Link). Video stories autoplay on open; article/link stories open the URL.

**Fix (Claude Code):**
1. Use the existing `artifactUrl` captured at completion. Set `artifactType` correctly at submit time: in `SubmitToDAOModal.tsx`, auto-detect from the URL (YouTube / Riverside / `.mp4` etc. => `video`; otherwise `link`/`text` for an article), and offer a small type selector the player can override. Store it via `quest.logCompletion` (`artifactType` already exists in the input and the `quest_completions` enum: photo/text/link/video).
2. Add a media-type badge/button on each card in `QuestCompletionFeed.tsx`, driven by `artifactType` (Video, Article, Photo, Link), so a player can see at a glance what the media is. This is the button Rye asked for.
3. Routing on card open in the modal: if `artifactType === "video"`, render the autoplaying `<video>` (already wired in `QuestStoryDetailModal.tsx`); if article/link, render a clear "Open article" affordance to `artifactUrl` (target=_blank, rel=noopener); if photo, show the image.
4. `videoThumbnailUrl` / `videoDurationSeconds` are optional polish, not required for this. Leave them nullable; a poster falls back to the quest hero image.
5. Confirm the feed query `quest.getCompletionFeed` (`server/routes/players.ts` lines 1653-1690) returns `artifactType` and `artifactUrl`. It does.

**Files:** `server/routes/players.ts`, `client/src/components/SubmitToDAOModal.tsx`, `client/src/components/QuestCompletionFeed.tsx` (no change needed for autoplay), `client/src/components/QuestStoryDetailModal.tsx` (confirm autoplay + add `playsInline` and `muted` so iOS Safari allows autoplay, see note).

**iOS note:** Mobile Safari blocks autoplay of videos with sound. For reliable autoplay on the card open, add `muted` and `playsInline` to the `<video>` element, then let the user unmute. Without `muted`, iOS will refuse to autoplay and the card will look broken on the exact device Rye is testing on.

---

## Fix 2 — Epic Quests section renders empty (High)

**Status:** FIXED is achievable, root cause identified.

**Symptom:** The "Epic Quests / LONG-FORM CHALLENGES" locked section shows the header, the "0/13 Rites" progress, and the lock message, then a large empty area below where the cards should be.

**Root cause:** The data is NOT empty. `client/src/data/epicQuestsData.ts` defines 10 epic quests. They are meant to render as locked "moss ruin" cards inside `QuestCarousel`. The carousel has a left and right fade overlay (`client/src/components/QuestCarousel.tsx` lines ~130 and ~133) hard-coded to the light theme color `from-[#f0ebe3]`. The Epic section background is dark (`#0a1f0f`). On the dark section these light gradients paint cream bands over the card area. Combined with the locked-state `opacity-80` wrapper (`EpicQuestSection.tsx` line ~295), the cards are washed out to near-invisible, so the section reads as empty.

**Fix (Claude Code):**
1. Make the fade gradient color a prop on `QuestCarousel` (default to the current light color so other carousels are unaffected), and pass the dark section color `#0a1f0f` from `EpicQuestSection`. Or simplest: in `EpicQuestSection`'s carousel, render with a `dark` variant that uses `from-[#0a1f0f]`.
2. Verify `reveal.locked` actually contains the 10 quests when locked (`EpicQuestSection.tsx` around line 203). If `reveal.visible.length + reveal.locked.length` is 0, the gradient is not the cause and the unlock/reveal logic in `useQuestUnlocks.ts` is filtering everything out. Add a console check during dev, then remove it.
3. Confirm `LockedQuestCard` renders with `aspect-[3/4]` so cards have height even with empty content. It does (line ~131).

**Verification:** On a narrow mobile viewport, the locked moss-ruin cards should be visible and horizontally scrollable, grayed but legible, with no cream bands.

**Files:** `client/src/components/QuestCarousel.tsx`, `client/src/components/EpicQuestSection.tsx`.

---

## Fix 3 — Capitalize "Game" when used as a noun (Medium)

**Status:** CODED list ready below.

**Symptom:** Rye wants "Game" capitalized everywhere it is the noun for The Game (the in-real-life Infinite Game). Compounds like "in-game", "gameplay", "game mechanics" stay lowercase.

**Root cause:** Body copy was written with mixed casing.

**Fix (Claude Code):** Apply these specific edits. Each is a noun reference to The Game. Read the surrounding sentence first to avoid changing a compound or verb.

| # | File | Line | Change |
|---|------|------|--------|
| 1 | `client/src/pages/Game.tsx` | ~329 | "infinite game" to "Infinite Game" |
| 2 | `client/src/pages/Game.tsx` | ~1711 | "...the community, and the game." to "...and the Game." |
| 3 | `client/src/pages/Governance.tsx` | ~140 | "contributing to the game ecosystem" to "the Game ecosystem" |
| 4 | `client/src/pages/Play.tsx` | ~204 | "every action in the game" to "in the Game" (leave "in-game currency" and "premium game features") |
| 5 | `client/src/pages/Play.tsx` | ~222 | "the evolution of the game itself" to "the Game itself" |
| 6 | `client/src/data/blogPosts.ts` | ~165 | "the first to play this game with us" to "this Game" |
| 7 | `client/src/data/questMasterContent.ts` | ~117 | "our game's infrastructure" to "our Game's infrastructure" |
| 8 | `client/src/data/questMasterContent.ts` | ~410 | "the collective intelligence of this game" to "of this Game" |
| 9 | `client/src/data/seasonalQuestsData.ts` | ~242 | "others in this game to understand" to "in this Game" |
| 10 | `client/src/data/epicQuestsData.ts` | ~142 | "This is the long game." Leave as is if it reads as the idiom "the long game"; capitalize to "the long Game" only if Rye wants the pun. FLAG for Rye. |
| 11 | `client/src/data/pageCopy.ts` | ~57 | "during their Crowd Pooling game" to "Crowd Pooling Game" |

Already correct (do not touch): `Game.tsx` ~372 ("the best Game"), `Economy.tsx` ~533 ("Play the Game"), "ReGen Game tokens" everywhere, all "in-game" adjectives.

After editing, run a final case-sensitive grep for `\bgame\b` across `client/src/pages` and `client/src/data` to catch any new copy and confirm no noun usage slipped through.

**Files:** the 7 files above.

---

## Fix 4 — Tools Library "Explore" button does nothing useful (High)

**Status:** root cause identified.

**Symptom:** On the Tools page (Localscale, Hylo, BioFi), clicking "Explore" does not behave like the external-link icon promises, and "0 views" never moves.

**Root cause:** In `client/src/pages/ToolsLibrary.tsx` (cards lines ~322-382), the whole card is a wouter `<Link href={`/tools/${tool.slug}`}>` and "Explore" is a plain `<span>` with an `ExternalLink` icon, no handler. So clicking navigates to the internal detail page (`ToolDetail.tsx`), not the tool's website, even though the icon signals "leave the site." Separately, the `tools.trackClick` mutation exists (`server/routes/tools.ts` lines 112-122) but is never called from the client, so `totalClicks` stays 0 and the card shows "0 views" forever. The destination URLs are present and correct in the DB (`localscale.org`, `hylo.com`, `biofi.earth`), so data is not the problem.

**Fix (Claude Code):** Decide the intended behavior with Rye in mind (the icon says external). Recommended:
1. Make "Explore" a real anchor to the tool's `websiteUrl` with `target="_blank" rel="noopener noreferrer"`, and keep the rest of the card linking to the internal detail page. Avoid nesting an `<a>` inside the `<Link>` `<a>` (invalid). Restructure so the card body is the internal link and the Explore action is a sibling, not a descendant, of the outer anchor.
2. Call `trpc.tools.trackClick` on Explore click (fire and forget) so views increment.
3. Make Explore a `<button>` or `<a>`, not a `<span>`, for keyboard and screen-reader access.

**Files:** `client/src/pages/ToolsLibrary.tsx`, possibly `client/src/pages/ToolDetail.tsx` (add tracking on the "Visit Website" button too, lines ~162-168).

---

## Fix 5 — Community editor overhaul: 10 directions (Medium, design choice)

**Status:** RESEARCH DONE. The current editor is better than the screenshot suggests, and there are 10 concrete upgrades.

**Current state:** Both the new-post composer (`CommunityNewPost.tsx`) and the reply box (`CommunityPost.tsx` lines ~961-993) already use `client/src/components/RichEditor.tsx`, a Tiptap WYSIWYG editor (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`). Its toolbar (lines ~137-144) has Bold, Italic, bullet list, numbered list, blockquote. It serializes to markdown via `serializeToMarkdown()` on every update, stores markdown, and renders with `ForumMarkdown` (react-markdown + remark-gfm). The "Markdown supported" helper line Rye photographed comes from `MarkdownHints` in `ForumMarkdown.tsx` (lines ~187-193), which is a leftover hint that no longer matches the WYSIWYG reality.

**10 ways to make it next-level (pick the set Rye wants, top 5 give the biggest jump):**

1. Full formatting toolbar with headings (H2/H3), link, inline code, code block, and horizontal rule, plus a visible active state on each button. Today only five marks are exposed.
2. Slash command menu. Type `/` to insert headings, lists, quotes, dividers, images, embeds. This is the single biggest "feels modern" upgrade and Tiptap has a community suggestion extension for it.
3. Inline image and file paste/drag-drop straight into the body, uploaded to R2, instead of the separate Attachments box. The composer already has an attachments concept to build on.
4. Link previews and oEmbed embeds for YouTube, Riverside, and X, so a pasted video URL renders as a player in the thread. This ties directly into the Quest Stories video work in Fix 1.
5. Mentions. `@player` and `#tag` autocomplete backed by the forum's existing tag system (`#lesson`, `#seeking-support`, `#offering-support` already exist in the UI). Drives connection and notifications.
6. Live markdown preview toggle, or a true split view, so power users who think in markdown still see the rendered result. Remove the stale "Markdown supported" hint once the toolbar covers it.
7. Draft autosave to localStorage keyed by thread, with a "restore draft" prompt. Losing a long post on a mobile tab switch is the most common forum frustration.
8. Mobile-first toolbar that sticks above the keyboard with large 44px touch targets, so formatting is reachable one-thumbed. The current toolbar is desktop-sized.
9. Accessibility and polish: focus ring, ARIA labels on toolbar buttons, character count that matches the 300/limit fields, and a calm empty-state placeholder that reflects the dialogue voice.
10. Sentiment-aware send. A gentle, optional "this reads sharp, want to soften it?" nudge using a cheap inference call before posting, matching the dialogue-over-debate ethos in Fix 8. Strictly opt-in and never blocking.

**DECISION (Rye, 2026-06-25): build the Recommended 5 = items 1, 2, 3, 6, 8.** Full toolbar (headings, link, code), slash-command menu, inline image/drag-drop upload to R2, markdown preview toggle (retire the stale hint), and a mobile sticky toolbar with 44px targets. This converts the existing Tiptap base into something next level on mobile without a rebuild. Items 4, 5, 7, 9, 10 are deferred, not dropped.

**Files:** `client/src/components/RichEditor.tsx`, `client/src/components/MarkdownToolbar.tsx` (legacy, can be retired or merged), `client/src/components/ForumMarkdown.tsx` (retire the stale hint), `CommunityNewPost.tsx`, `CommunityPost.tsx`.

---

## Fix 6 — Forum category cards overflow / cut off on mobile (High)

**Status:** root cause identified.

**Symptom:** On the forum index on a phone, category rows and the element tiles (General, Earth, Water, Fire, Air) bleed past the right edge and text is clipped.

**Root cause:** The section picker grid in `client/src/pages/Community.tsx` (lines ~487-574) is `grid grid-cols-2 sm:grid-cols-5 gap-3`. "General" is `col-span-2 sm:col-span-1` so it fills the row on mobile, but Earth/Water/Fire/Air have no responsive `col-span`, so they sit two-per-row at a fixed height (`h-44`) with `p-4` padding and no `truncate` or `min-w-0` on the inner text. Long labels like "Water Alliance Partners" exceed the cell and push width, and a `min-w-0` is missing so the grid track refuses to shrink, producing horizontal overflow on a 375px screen. The category list rows above also lack `min-w-0` / truncation on the title.

**Fix (Claude Code):**
1. Add `min-w-0` to the grid items and the inner flex/text containers so tracks can shrink.
2. Apply `truncate` (or `line-clamp-2`) to card titles and subtitles.
3. Reconsider the mobile span: either keep two-up with shorter labels and smaller text (`text-xs` on mobile), or go one-up (`grid-cols-1 sm:grid-cols-5`) for breathing room. Confirm the container itself has `overflow-x-hidden` and no stray negative margins wider than padding.
4. Test at 320px, 375px, and 414px widths.

**Files:** `client/src/pages/Community.tsx`.

---

## Fix 7 — Forum buttons feel laggy/unresponsive on mobile (High)

**Status:** root cause identified, multiple contributors.

**Symptom:** Tapping category cards on mobile feels slow and unresponsive.

**Root cause:** In `Community.tsx`, `handleSectionClick` (lines ~112-121) does `setActiveSection(next)` then a `setTimeout(50ms)` followed by `scrollIntoView({ behavior: 'smooth' })`. The smooth scroll animation (300-500ms) plus the artificial 50ms delay makes the tap feel delayed. Compounding it: tapping triggers a re-render of a very large component (~1371 lines) that holds several tRPC queries, an IntersectionObserver infinite scroll (lines ~205-216), a 300ms search debounce, and derived computations (`trendingPosts`, `filteredCategories`) recomputed each render (lines ~224-255). There is also no `touch-action: manipulation`, so some mobile browsers add their own tap delay.

**Fix (Claude Code):**
1. Add `touch-action: manipulation` (Tailwind `touch-manipulation`) to the tappable category buttons to remove browser tap delay.
2. Drop the 50ms `setTimeout`; scroll on the next animation frame instead, and consider `behavior: 'auto'` or a shorter custom scroll so the response feels immediate.
3. Memoize the derived lists (`useMemo` for `trendingPosts`, `filteredCategories`) and the category card component (`React.memo`) so a section toggle does not re-render the whole page tree.
4. Guard against double-taps with a simple in-flight check.
5. Verify on a real device that first-tap registers immediately.

**Files:** `client/src/pages/Community.tsx` (and extract a memoized `SectionCard` if helpful).

---

## Fix 8 — Rename "Discussion" to "Dialogue" + improve the proposal/dialogue process (Medium)

**Status:** rename list ready; 5 process directions below.

**Symptom:** Rye wants the word "Discussion" replaced with "Dialogue" across the community UI. Dialogue carries the calmer, more open, perspective-sharing tone he wants, versus the harder edge of "discussion."

**Rename targets (user-facing strings, file:line):**

| # | File | Line | Current | New |
|---|------|------|---------|-----|
| 1 | `CommunityNewPost.tsx` | ~239 | "Start a Discussion" (heading) | "Start a Dialogue" |
| 2 | `CommunityNewPost.tsx` | ~284 | Post Type label "Discussion" | "Dialogue" |
| 3 | `CommunityCategory.tsx` | ~52 | badge label "Discussion" | "Dialogue" |
| 4 | `CommunityCategory.tsx` | ~128 | "read and reply to forum discussions" | "forum dialogues" |
| 5 | `CommunityCategory.tsx` | ~170 | "This discussion topic doesn't exist." | "This dialogue topic doesn't exist." |
| 6 | `CommunityPost.tsx` | ~376 | "This discussion thread doesn't exist..." | "This dialogue thread..." |
| 7 | `Community.tsx` | ~352 | hero CTA "Start a Discussion" | "Start a Dialogue" |
| 8 | `Community.tsx` | ~607 | "No discussions match your search yet." | "No dialogues match your search yet." |
| 9 | `Community.tsx` | ~612 | button "Start a Discussion" | "Start a Dialogue" |

Keep the internal enum value `"discussion"` as the stored post-type key to avoid a data migration; only change the display label. The code references at `CommunityNewPost.tsx` ~315-316 and `CommunityCategory.tsx` ~89 and `CommunityPost.tsx` ~418 compare against the value `"discussion"`, not the label, so they stay as is. Note this clearly so Claude Code does not rename the enum.

**Current proposal/dialogue process (for context):** A thread can be promoted to a decision via `client/src/components/governance/PromotionModal.tsx`, which gates on thread age and number of voices, then asks for a decision question, a track (Fund / Game / Both), reversibility (Reversible / Semi-reversible / One-way door), an optional sunset date, and a ReGen Guide template. It writes a `forumPromotionRequests` row and waits for a co-signer, then shows a decision banner (`ForumThreadDecisionBanner`). It follows `FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md`. There is no live external Loomio API call today; promotion is internal, with Hypha as the on-chain destination via the Hypha Bridge.

**5 ways to improve the proposal and dialogue process:** (Rye approved all 5 on 2026-06-25. Fully fleshed out, grounded in the existing schema and flow spec, in `DIALOGUE_PROCESS_SPEC_2026-06-25.md`. Summaries below.)

1. Reframe the whole flow around dialogue before decision. Add an explicit "sensing" stage between a dialogue and a proposal where people post perspectives and the system surfaces points of convergence and open questions, so a proposal only forms once the dialogue has matured. This matches the yin, perspective-gathering tone Rye described.
2. Make perspectives first-class. Add lightweight reaction types beyond a like: "I see it differently," "I need to understand more," "I can live with this," "I support." This invites range instead of for/against and feeds a readiness signal for promotion.
3. Add a proposal drafting assist that summarizes the dialogue so far into a neutral problem statement and two or three option framings, which a human then edits. Cheap inference, human in the loop, never auto-posted.
4. Show the decision lifecycle visibly on the thread: Dialogue, Sensing, Proposal, Decision, with the reversibility and sunset fields from the existing PromotionModal rendered as a calm status strip rather than a hidden modal. People should see where a conversation is in its arc.
5. Close the loop back to the land. When a decision passes through the Hypha Bridge, post an automatic dialogue-thread reply recording what was decided and what changed, so governance outcomes return to the conversation that birthed them instead of disappearing on-chain.

**Files:** the rename files above; for process work, `client/src/components/governance/PromotionModal.tsx`, the forum schema, and the Hypha Bridge module.

---

## Fix 9 — Investor Journey buttons do nothing (Critical)

**Status:** root cause identified; needs in-browser confirmation of the primary suspect.

**Symptom:** On the Fund page on mobile, the orange "Pitch Deck" and "Book a Call" buttons, the yellow "View Investment Thesis" button, and the journey step links (Read the Thesis, View Schedule, See Projects) do not navigate. Rye: "Take me anywhere."

**Root causes (three distinct, all present):**

1. **Invalid interactive nesting (primary suspect for the dead taps).** Throughout `Fund.tsx` and `InvestorJourney.tsx`, internal navigation uses `<Link href={...}><Button>...</Button></Link>` (for example `Fund.tsx` lines ~248, ~682, ~701; the journey buttons render the same way; the step buttons array renders a `<Link><Button/></Link>` at `Fund.tsx` ~470-481). wouter's `<Link>` renders an `<a>`, so this nests a `<button>` inside an `<a>`. That is invalid HTML, and mobile Safari in particular often lets the inner button swallow the tap so the anchor never navigates. This is the most likely reason multiple unrelated buttons all feel dead on the exact device Rye tested.
2. **Wrong destination.** The step "02 Review Investment Thesis" button points to `/investor` (`Fund.tsx` ~403), which is the investor application form (`InvestorJourneyForm`), not the thesis. The thesis lives at `/opportunity` (route confirmed in `App.tsx` line 219). So even when it does navigate, it lands on the wrong page. The same label-vs-destination mismatch exists for `InvestorJourney.tsx` step 4 "Express Interest" pointing at `/investor`.
3. **iOS popup blocking on external buttons.** "Pitch Deck" and "Book a Call" use `onClick={() => window.open(btn.href, '_blank')}` (`Fund.tsx` ~463). `window.open` from a React onClick is frequently blocked by iOS Safari's popup blocker, so nothing happens. Targets themselves are valid: `/regen-civics-investor-deck.pdf` and the Calendly link `https://calendly.com/rieki-cordon/30min` (confirm the PDF actually exists in `public/`).

**Fix (Claude Code):**
1. Replace `<Link><Button/></Link>` with a single interactive element. Use the Button's `asChild` pattern to render an anchor, or render a `<Link>` styled as a button, so there is exactly one interactive node. Apply this fix to every investor button on `Fund.tsx` and `InvestorJourney.tsx`.
2. For external links (Pitch Deck, Book a Call), use a real `<a href target="_blank" rel="noopener noreferrer">` styled as a button instead of `window.open`, so iOS does not block it.
3. Fix the thesis destination: point "Review Investment Thesis" and the "View Investment Thesis" button to `/opportunity`, not `/investor`. Reconcile the `InvestorJourney` step 4 label and destination with Rye's intended order (read thesis, then express interest).
4. Confirm `public/regen-civics-investor-deck.pdf` exists; if not, that is a missing-asset issue for Rye.
5. **Diagnostic first:** load `/fund` in Claude in Chrome at a mobile width, tap each button, and watch the console/network to confirm whether navigation fires. This separates the nesting bug from any overlay/stacking issue before editing.

**Files:** `client/src/pages/Fund.tsx`, `client/src/components/InvestorJourney.tsx`, possibly the shared `Button` component to support `asChild` cleanly.

---

## Fix 10 — Alliance / Connect accordions do not expand (Critical)

**Status:** root cause(s) identified; needs in-browser confirmation.

**Symptom:** On the Ally/Connect page, the accordion rows "Fundraise Together," "Shared Infrastructure," "Governance and Voice," and the numbered "How to Join" rows (Apply, Onboard, Collaborate, Equity/Service/Token Swap, Grow Together), and "Explore Alliance Categories," do not open when tapped.

**Root causes:** Two different accordion implementations on the same page both fail, which points at a shared cause plus a local code smell:

1. **Local code smell in "How to Join."** `Ally.tsx` (lines ~393-395) calls `const [isOpen, setIsOpen] = useState(false)` inside a `.map()` callback. With a fixed-length array this does not crash, but it violates the Rules of Hooks and is fragile under re-render. It should be lifted to parent state keyed by index (the pattern `Fund.tsx` already uses: `openSteps` record + `toggleStep`). Refactor it regardless.
2. **The "Fundraise Together" group uses the custom `CollapsibleSection`** (`Ally.tsx` lines ~46-94), a plain `<button onClick={() => setIsOpen(!isOpen)}>` with conditional content. That logic is correct in isolation, so the fact that it also fails suggests a shared runtime cause rather than its own bug.
3. **Likely shared cause: click interception / stacking.** Both accordion groups are wrapped in `<AnimatedSection animation="slide-up" delay={...}>`. `AnimatedSection` (`client/src/components/AnimatedSection.tsx`) applies `transform: translateY(...)` and `willChange` during animation, which creates a new stacking context. If a decorative `PageBackground` layer or a section overlay sits above the content without `pointer-events-none`, taps get swallowed. Note: several `PageBackground` layers correctly set `pointer-events-none` (lines 91, 150, 195, ...), but several full-bleed layers do NOT (for example `absolute inset-0 z-[1]` at lines ~558, ~829, ~845 and `absolute inset-0 z-[3]` at lines ~697, ~714). Whether any of these overlap the Ally content depends on z-index of the content wrapper, which must be checked in the browser.

**Fix (Claude Code):**
1. **Diagnose in Claude in Chrome at mobile width on `/ally`.** Tap a "Fundraise Together" header and a "How to Join" row. In devtools, inspect what element is on top at the tap point (elementFromPoint). This tells you immediately whether a transparent overlay is intercepting, or whether the click reaches the button and the state simply is not toggling.
2. If an overlay is intercepting: add `pointer-events-none` to the offending `PageBackground` decorative layers (the ones missing it), or raise the content wrapper's stacking/z-index above them. Apply the same check to `/fund`, since Fix 9's buttons may share this cause.
3. Refactor the "How to Join" `useState`-in-map to parent-level state keyed by index.
4. Re-test every accordion opens and closes on mobile and desktop.

**Files:** `client/src/pages/Ally.tsx`, `client/src/components/PageBackground.tsx`, `client/src/components/AnimatedSection.tsx` (only if it needs a pointer-events guard after animation).

**Cross-link:** Fix 9 and Fix 10 may share the overlay/stacking root cause. Diagnose both on the same pass.

---

## Suggested execution order

1. Diagnose Fix 9 + Fix 10 together in Claude in Chrome (overlay/stacking vs nesting). Critical funnels.
2. Apply Fix 9 (investor buttons) and Fix 10 (alliance accordions).
3. Fix 4 (Explore button), Fix 6 (mobile overflow), Fix 7 (mobile tap lag). High, all in the community/tools surface.
4. Fix 2 (Epic Quests gradient). High-visibility, small change.
5. Fix 3 (Game capitalization) and Fix 8 rename (Discussion to Dialogue). Fast copy passes.
6. Fix 1 (Quest Stories video pipeline). Larger, depends on the chosen upload path.
7. Ideation: Fix 5 (editor) and Fix 8 process improvements, once Rye picks which directions to build.

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 1 | RESOLVED 2026-06-25: editor = Recommended 5 (items 1,2,3,6,8) | Product/design call | Done |
| 2 | RESOLVED 2026-06-25: build all 5 dialogue improvements (DIALOGUE_PROCESS_SPEC) | Governance design call | Done |
| 3 | RESOLVED 2026-06-25: no uploads; use the completion URL + media-type badge, video autoplays, articles link out | Infra/scope decision | Done |
| 4 | Provide the investor deck PDF (CONFIRMED MISSING: no deck-named PDF exists in `public/`, so the Pitch Deck button points at a 404). Drop the file in `public/` as `regen-civics-investor-deck.pdf` or give Claude Code the hosted URL | Asset only you have | `public/` folder or R2 |
| 5 | After Claude Code commits, `git add -A && git commit && git push` | Claude Code may hold index.lock; deploy auth is yours | Repo root in PowerShell |
| 6 | Approve the Railway deploy and re-test on your phone | Railway login + your device | Railway dashboard, then regencivics.earth |
| 7 | (Optional) Insert one real video row to prove Fix 1 autoplay before the upload UI ships | Needs DATABASE_URL (Railway reachable only from your Windows machine) | See script block below |
| 8 | Decide on Fix 3 item #10 ("the long game" idiom). Default: leave lowercase as the idiom unless you want the pun | Voice call | Reply in chat (optional) |

### CLAUDE CODE — can be done without you

| # | Task | Status |
|---|------|--------|
| 1 | Fix 2: make QuestCarousel fade color dark on Epic section | FIXED achievable |
| 2 | Fix 3: apply the 11 Game capitalization edits | CODED list ready |
| 3 | Fix 4: wire trackClick + make Explore a real external link/button | FIXED achievable |
| 4 | Fix 6: add min-w-0 / truncate / responsive spans to forum grid | FIXED achievable |
| 5 | Fix 7: touch-manipulation, drop 50ms delay, memoize derived lists | FIXED achievable |
| 6 | Fix 8: rename Discussion to Dialogue (labels only, keep enum) | CODED list ready |
| 7 | Fix 9: replace Link>Button nesting, fix thesis href, replace window.open | FIXED after diagnosis |
| 8 | Fix 10: diagnose overlay, add pointer-events-none, lift useState out of map | FIXED after diagnosis |
| 9 | Fix 1: set artifactType at submit, add media-type badge/button to story cards, route video (autoplay, muted/playsInline) vs article (open URL) | READY |
| 10 | Fix 5: implement the Recommended 5 editor upgrades | READY |
| 11 | Fix 8 process: implement all 5 per DIALOGUE_PROCESS_SPEC_2026-06-25.md (write the 3 migrations; Rye runs them) | READY (3 micro-decisions below) |
| 12 | Run Ship Gate (audit-truncation, className grep, typecheck) before VERIFIED | required each fix |

### WAITING ON YOU before Claude Code can proceed

- All scope decisions are RESOLVED (2026-06-25). Editor, dialogue improvements, video approach, sensing trigger, and decision-receipt AI line are all decided.
- The only remaining inputs from you: the investor deck PDF (HUMAN #4), running the 3 dialogue migrations against Railway after Claude Code writes them, and the push + Railway deploy + live-phone verification (HUMAN #5, #6). The "long game" idiom (HUMAN #8) is optional.
- Dialogue spec choices locked: Sensing stage = auto-suggest with human confirm; decision receipt = templated plus one opt-in AI "what this means" line per decision.

### Script block — HUMAN #7 (optional, prove Fix 1 autoplay)

```powershell
# Load .env into PowerShell session first
$env = Get-Content .env | Where-Object { $_ -match '=' -and $_ -notmatch '^#' }
foreach ($line in $env) { $k,$v = $line -split '=',2; [System.Environment]::SetEnvironmentVariable($k,$v) }

# Then run a one-off insert script Claude Code will write, e.g.:
# npx tsx scripts/seed-one-video-completion.ts
# It inserts a quest_completions row with artifactType="video",
# a real artifactUrl (mp4/hosted), videoThumbnailUrl, and visibility="public".
```

---

## Notes for Claude Code on verification

- Fix 9 and Fix 10 are the only two where the static read could not fully prove the runtime click failure. Reproduce both in Claude in Chrome at a 375px width before editing, then again after. Do not mark either VERIFIED on a typecheck alone.
- The Ship Gate is mandatory before any VERIFIED/DONE claim: `python3 scripts/audit-truncation.py`, a className grep for any new CSS class added, and `pnpm typecheck` exit 0.
- Writing rules apply to all copy touched here: no em-dashes, no contrast-framing, capitalize Game as a noun.
