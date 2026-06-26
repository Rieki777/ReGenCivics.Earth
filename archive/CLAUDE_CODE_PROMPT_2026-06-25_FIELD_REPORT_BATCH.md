# Claude Code Prompt — 2026-06-25 Field Report Batch

You are picking up a batch of fixes and two feature builds for regencivics.earth, captured from Rye's mobile walkthrough on June 25. Everything is researched and grounded already. Two companion docs hold the detail:

- `FIXES_TO_MAKE_2026-06-25_field-report-batch.md` — the 10 fixes, each with file:line, root cause, and concrete instructions, plus the Handoff Breakdown.
- `DIALOGUE_PROCESS_SPEC_2026-06-25.md` — the full spec for the five proposal and dialogue improvements (Fix 8 process work).

Read both before writing code. Read `CLAUDE.md`, `.ai/docs/STEERING.md`, and for the dialogue work `FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md` and `.ai/docs/security/AI-AUTOMATION-RISKS.md`.

## Hard rules (non-negotiable)

- Writing rules apply to every string you touch: no em-dashes, no contrast-framing, capitalize "Game" when it is the noun for The Game, plain language for community members.
- Ship Gate before any VERIFIED or DONE claim: `python3 scripts/audit-truncation.py`, then a className grep for any new CSS class or keyframe you add (`rg -g '*.css' '<class>' client/src/`), then `pnpm typecheck` exit 0. Every fix row needs evidence (file:line, grep output, or screenshot) or its status stays CODED.
- Deterministic-first (STEERING 11): any recurring or automated behavior splits into a deterministic part that runs without an LLM and a nondeterministic part called only on user action or a schedule. The dialogue spec already states the split per improvement; honor it.
- Migrations: write numbered SQL into `drizzle/`. Do not run it against Railway from your environment, it cannot reach the DB. Rye runs `npx tsx scripts/run-migration.ts --all`. Leave a clear note when a migration is pending.
- Do not push or deploy. Stage commits with clear messages and stop. Rye pushes and approves the Railway deploy.

## Locked decisions (Rye, 2026-06-25)

- Editor overhaul: build the Recommended 5 only (full toolbar with headings/link/code, slash-command menu, inline image/drag-drop upload to R2, markdown preview toggle and retire the stale "Markdown supported" hint, mobile sticky toolbar with 44px targets). Items 4, 5, 7, 9, 10 from Fix 5 are deferred.
- Quest Stories: no upload pipeline. Use the URL already captured at quest completion (`artifactUrl`). Set `artifactType` correctly at submit time (auto-detect video vs article/link, with an override). Add a media-type badge/button on each story card. Video autoplays on open (add `muted` and `playsInline` for iOS); article/link opens the URL; photo shows the image.
- Dialogue process: build all five improvements per the spec.
- Sensing stage entry: auto-suggest with a human confirm, thresholds in `game_variables`. Never auto-flip without confirm.
- Decision receipt: templated deterministic post plus one opt-in AI "what this means for the land project" line per decision, never blocking.

## Execution order

Work in this order. Commit after each numbered group with a `type(scope): subject` message and a body explaining the why.

1. Diagnose the click failures first, in the browser, before editing. Load `/fund` and `/ally` in Claude in Chrome at 375px width. Tap each dead button and accordion. Use `document.elementFromPoint` at the tap coordinates to learn whether a transparent overlay is intercepting, or whether the click reaches the control and state simply is not toggling. Write down the finding for Fix 9 and Fix 10 before changing anything.

2. Fix 9 (investor buttons, Critical). Replace every `<Link><Button/></Link>` on `Fund.tsx` and `InvestorJourney.tsx` with a single interactive element (Button `asChild` rendering an anchor, or a styled `<Link>`). For external links (Pitch Deck, Book a Call) use a real `<a target="_blank" rel="noopener noreferrer">`, not `window.open`. Point "Review Investment Thesis" and "View Investment Thesis" at `/opportunity`, not `/investor`. Reconcile the InvestorJourney step 4 label and destination. Note: the deck PDF is missing from `public/` (see Pending inputs); wire the button to the correct path and flag it.

3. Fix 10 (alliance accordions, Critical). Apply whatever the step 1 diagnosis showed. If an overlay intercepts, add `pointer-events-none` to the offending `PageBackground` decorative layers (several full-bleed `absolute inset-0 z-[1]` / `z-[3]` layers lack it) or raise the content wrapper above them, and check `/fund` shares the cause. Lift the `useState` out of the `.map()` in the "How to Join" block into parent state keyed by index. Verify every accordion opens and closes on mobile and desktop.

4. Fix 4 (Tools Explore button), Fix 6 (forum grid mobile overflow), Fix 7 (forum tap lag). All in the community and tools surface. Details and line numbers in the fixes doc.

5. Fix 2 (Epic Quests). Make the `QuestCarousel` fade gradient dark on the Epic section (`from-[#0a1f0f]` instead of the light `from-[#f0ebe3]`), as a variant or prop so other carousels are unaffected. Confirm the 10 locked cards render.

6. Fix 3 (Game capitalization, 11 edits) and Fix 8 rename (Discussion to Dialogue, labels only, keep the `"discussion"` enum value). Both are in the fixes doc as exact file:line tables. Re-grep `\bgame\b` after editing.

7. Fix 1 (Quest Stories media). Set `artifactType` at submit in `SubmitToDAOModal.tsx`, add the media-type badge/button in `QuestCompletionFeed.tsx`, route video vs article vs photo in `QuestStoryDetailModal.tsx`, add `muted` and `playsInline` to the video element.

8. Fix 5 (editor Recommended 5). Build on the existing Tiptap `RichEditor.tsx`. Add toolbar items, slash menu, inline upload to R2 (mirror the existing `/api/img` pattern), preview toggle, and the mobile sticky toolbar. Retire the stale hint in `ForumMarkdown.tsx`.

9. Dialogue process (DIALOGUE_PROCESS_SPEC). Build in the spec's order: Improvement 2 (perspectives) and Improvement 4 (lifecycle strip) first, then Improvement 1 (Sensing), then Improvement 3 (drafting assist), then Improvement 5 (loop-back receipt). Write the three migrations (`governanceStage` plus sensing fields, the `forumPerspectives` table, the reply `isOpenQuestion` flag) into `drizzle/` and leave them for Rye to run. Sanitize and rate-limit every LLM endpoint.

## Verification

- Fix 9 and Fix 10 must be reproduced fixed in Claude in Chrome at mobile width, not on a typecheck alone. Screenshot before and after.
- Run the Ship Gate after each group. No VERIFIED without evidence in the fixes-doc table.
- Update the Handoff Breakdown statuses in `FIXES_TO_MAKE_2026-06-25_field-report-batch.md` as you complete each item (CODED to FIXED to VERIFIED). When the batch is done, move both companion docs and this prompt to `archive/` and add a one-paragraph entry to the top of `SHIPPED_LOG.md`.

## Pending inputs from Rye (do not block on these; build around them)

- Investor deck PDF: missing from `public/`. Wire the Pitch Deck button to `/regen-civics-investor-deck.pdf` and leave a TODO note; Rye will drop the file in or provide a hosted URL.
- The three dialogue migrations: write them, Rye runs them against Railway.
- Push and Railway deploy and the live-phone re-test: Rye does these.
- Optional: the "long game" idiom in `epicQuestsData.ts` line ~142 stays lowercase unless Rye says otherwise.
