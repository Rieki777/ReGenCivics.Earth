# STEERING: Hard Constraints

Load this file first on every agent session. Everything here is non-negotiable. If a request appears to conflict with a constraint here, surface the conflict to Rye before proceeding.

Last reviewed: 2026-04-25.

---

## 1. Writing rules (apply to ALL user-facing copy)

These are reproduced from `/CLAUDE.md` Writing Rules section. They apply to forum posts, page copy, emails, marketing, social, every string a player will read. They DO NOT apply to JSDoc comments or internal logs (those are technical, not user-facing).

### 1.1 No em-dashes
Em-dashes (`-`) are banned in all user-facing content. Zero. Replace with comma, period, or rewrite. This is also Rye's user-global rule (`~/.claude/CLAUDE.md`).

### 1.2 No contrast framing
Banned: "not X, but Y", "not just X, it's Y", "less X, more Y", "this isn't about X, it's about Y", parallel contrast implying lesser/greater. Lead with the affirmative.

### 1.3 No AI word patterns
Banned vocabulary: delve, tapestry, foster, leverage, "it's worth noting", "in conclusion", embark, vibrant, crucial, groundbreaking, "transformative journey", "testament to", "beacon of", nurture (as metaphor), unlock, unleash, seamless, robust, comprehensive, "cutting-edge", empower, utilize, navigate (as metaphor), genuinely (hedge), honestly (hedge), straightforward.

### 1.4 No rhetorical question openers
Don't open with "What if we could…?" or "Have you ever wondered…?". Start with the thing itself.

### 1.5 No passive inspiration
Banned: "join us on this journey", "be part of something bigger", "together we can". Say something specific instead.

### 1.6 Voice
Direct, grounded, specific. Rye's voice. First person + contractions are fine. Short sentences are fine.

---

## 2. Maximum autonomy default

Project-level rule from `/CLAUDE.md`: "Do as much as possible without asking. Only surface tasks to Rye when there is literally no way to proceed without human input."

Concrete:
- Don't ask about token-mapping decisions when context makes the answer obvious. ($ReGen for gratitude credits, not RGVoice. RGVoice is the votes token.)
- Don't ask about architectural choices with one clearly-correct option (use existing `hyphaBridges` table; don't invent a new one).
- Don't ask about tool recovery (FUSE git lock blocks commit → use plumbing path).

Times TO ask (use `AskUserQuestion`, max 4 questions, mark recommended option `(Recommended)`):
- 3+ defensible architectural options exist
- A choice would meaningfully shape the data model
- Voice direction has a stylistic fork that needs Rye's call

---

## 3. Ship gate: MANDATORY before any "VERIFIED" or "DONE" claim

Three gates from `/CLAUDE.md`:

```bash
pnpm gate                                           # gates 1 + 3, on any platform
rg -g '*.css' '<className-you-added>' client/src/   # gate 2: any new className must have CSS
```

`pnpm gate` (scripts/gate.mjs) runs the truncation audit and the typecheck, and
locates a working Python itself. By hand it is `py scripts/audit-truncation.py`
on Windows / `python3 …` on the cowork VM, plus `pnpm check`.

Until 2026-07-16 this block read `python3 …` + `pnpm typecheck`. `typecheck` was
a script that had never existed (the real one is `check`), and on Windows
`python3` is a Store stub that exits 0 *without running the audit*. Both were
copied into 30+ prompt docs from here, and both failed silently for three months
because each session quietly substituted a working command instead of fixing the
source. Third trap for the list below: **a gate you must translate before running
is a gate that eventually gets skipped.** The `typecheck` line entered `CLAUDE.md`
in 619190f (2026-04-18), written from assumption without checking package.json.
`package.json` now carries a real `typecheck` alias, so the old prompt docs run as
written. (This history moved here from `CLAUDE.md` on 2026-09-27.)

Plus, for any FIXES_TO_MAKE row marked DONE / VERIFIED, the Evidence column must contain file:line, grep result, screenshot path, or script output line. No evidence = stays `CODED`.

Two traps when the gate involves tests:

- **The DB-backed suites need a real `DATABASE_URL`**, or `skipIfNoDb` skips them and vitest still reports green. "4 passed" can mean "4 skipped the part you changed". Check the skip count, not just the exit code. Also unset `NODE_ENV` first (`NODE_ENV= pnpm vitest ...`).
- **They run against the shared dev database, so they flake when two sessions run at once.** They create and delete real rows. On 2026-07-16 two contribution tests failed mid-session and passed on a clean re-run with no code change in between. Before believing a DB-suite failure, re-run it alone; before believing a pass, make sure it wasn't skipped.

This exists because on 2026-04-18 an audit of commit `b06b7aa` found 5 of 13 fixes marked "resolved" were false (className added, CSS missing) and 15 source files on disk were truncated mid-statement. Don't ship that pattern again.

---

## 4. Verify on production after every load-bearing deploy

Working-style memory has the canonical version. Summary:

- "Code looks right" / "tests pass" is not enough. Multiple times fixes have landed in code but not taken effect for Rye on iPhone Safari (FAB position, sign-in OAuth). Always navigate to the live URL via Claude in Chrome and reproduce the user flow.
- For load-bearing changes (auth, tokens, payments, webhooks): mandatory.
- For visual tweaks: recommended.
- Pattern: `mcp__Claude_in_Chrome__navigate` to regencivics.earth → perform user action → screenshot → confirm fix is live. If broken in production despite correct code: diagnose (deploy rebuilt? CDN cache? file truncated? deeper bug?) before more code lands on top.

---

## 5. Token model: private-first, claim bridge to public

**Rule zero, and read it before the other four: the hub MINTS ON TRANSFER.** A private
token comes into existence at the moment somebody is credited. No account is debited to
fund it, no supply is drawn down, and there is no pre-issued treasury. A "pool"
(`pool.regen_per_cycle`, `gratitude_cycles.poolPerCycle`, `bounty.season_budget`) is a
ceiling on issuance and never a balance, so what it leaves unspent is never minted and
never lost. On chain the hub mints nothing: it holds no key, and issuance on Base happens
when a Hypha space executes a proposal. The two halves join at the claim bridge. A treasury
holding already-issued tokens is a **later, optional setting**; build nothing that assumes
one. Founder ruling R92, 2026-08-29. Full argument: ADR-52. Asserted by
`server/tokenMintModel.test.ts`.

From `/CLAUDE.md`. Four absolute rules for every economic feature:

1. **Reads (game logic) use TOTAL = private + public.** Contribution scores, voice weight, citizenship tiers. Use `playerProfiles.getMyTokens` (`{ public, private, total }`).
2. **Writes (credits AND debits) only touch the private ledger.** Through `db.creditPrivateTokens({ userId, tokenType, amount, source, sourceRef, description })`. Public balance is never written from server code; it changes only when chain emits a Transfer that the Alchemy webhook reconciles.
3. **Spend limit checks use PRIVATE only.** Even if user has plenty on-chain, public can't be deducted by server (one-way flow).
4. **One-way flow private → public.** Tokens move private→public when user claims via Hypha redeem-tokens. Once on chain, they live there. No re-entry to private.

Before building any earning, spending, scoring or burning feature, read this section and copy an existing `source`-tag pattern (`gratitude_received`, `harvest`, `quest_completion`, `seeds_claim`, `call_task_bounty`, `manual`, ...).

Key surfaces (moved here from `CLAUDE.md` on 2026-09-27):
- `db.creditPrivateTokens(...)`: the only legitimate write to private balances
- `playerProfiles.getMyTokens`: total/public/private reads for the four tokens
- `playerProfiles.requestClaim({ tokens })`: starts a claim, debits private at request time
- `cancelClaim` / nightly `cancelStaleClaimBridges`: refund flows
- `webhook-receiver.cascadeClaimPassed`: on-chain confirm reconciliation
- `user_token_ledger`: append-only, source-tagged audit table
- `player_profiles.{regen,rgvoice,rcvoice,rcivics}Private`: private cache (written by `creditPrivateTokens`)
- `player_profiles.{rvoiceBalance,rgenBalance,rcvoicePublic,rcivicsPublic}`: public cache (written by `syncTokens`)
- `game_variables.governance.claim_threshold_{regen,rgvoice,rcivics,rcvoice}`: per-token thresholds

Token contracts on Base (chain id 8453):
- `$REGEN`: `0x4E617cd113364193d215d107AdD6fa50418AA2E4`
- `$RCivics`: `0x72e9B17a2F93A923D63666eC0a1c096B1443ef26`
- `RGVoice`: `0x4d848B3f2D74D1D2f6c75c55d0751DAB8FC7D707`
- `RCVoice`: not yet deployed

---

## 6. Hypha bridge: only one path off-platform

Anytime a player moves from ReGen Civics to Hypha to act on-chain, the handoff MUST go through the Hypha Bridge module (`apps/web/src/lib/hypha-bridge/`). Don't hand-roll redirect logic. Extend the bridge with the new intent type instead.

Spec: `FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md`.

---

## 7. Cowork VM quirks

From `~/.claude/memories/cowork-vm-quirks.md`. Top issues:

- **FUSE silent truncation**: after Edit/Write on long files, content can be cut. Always run `python3 scripts/audit-truncation.py` after meaningful edits. Restore via `git show HEAD:path > /tmp/restore && cp /tmp/restore path` (NOT `git checkout`: FUSE blocks unlink).
- **Stuck `.git/index.lock`**: bypass with `GIT_INDEX_FILE=/tmp/index-X` workaround. Commit via `git commit-tree` plumbing.
- **`tsx` broken on the VM**: pnpm-installed esbuild is Windows-only binary. Use `npm install mysql2` in `/tmp/migrate-tool/` and a `.cjs` runner (pattern in `scripts/run-riverside-migration.cjs`).
- **Push from VM fails**: no GitHub credentials. Always commit locally; Rye pulls + pushes from Windows.
- **Mixed line endings**: ~600 files show as modified due to CRLF/LF mismatch. Real changes are spotted via `git diff <file>` showing actual content diff vs whole-file rewrite.

---

## 8. Where docs live, and the auto-archive rule

- **Root:** only the standard repo files (`README.md`, `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`), `CLAUDE.md`, `SHIPPED_LOG.md`, and the canonical docs `CLAUDE.md` names. Code, scripts and skills read several of those canonical docs by root path, so they stay put. New docs start in `docs/planning/` or `docs/`.
- **`docs/planning/`:** planning, spec, plan, audit, brief, research and outreach docs, flat, filenames unchanged. Active implementation prompts (`CLAUDE_CODE_PROMPT_*.md`) and fixes docs (`FIXES_TO_MAKE_*.md`) are written here too.
- **`docs/`:** developer reference docs: setup, dev context, design system, deployment, worktrees, the image pipeline, and as-built maps such as `docs/EVOLUTION-ENGINE.md` and `docs/COORDINATION_ENGINE_WORKFLOW.md`.
- **`archive/`:** dated implementation prompts, fixes docs, task lists and handoffs move here one week after their date (`CLAUDE_CODE_PROMPT_YYYY-MM-DD_*.md`, `FIXES_TO_MAKE_YYYY-MM-DD*.md`, `REMAINING_WORK_YYYY-MM-DD.md`). A spec that captures style direction, design rules, or canonical reference material stays in `docs/planning/` at any age. Heuristic: opens with "Generate / produce / build with these rules" → spec, keep. Opens with "READ THIS FIRST / Pick up from Push 1 / Skip nothing" → implementation prompt, archive after a week.
- **Moving a doc:** grep the repo for its filename (skip `archive/` and applied `drizzle/*.sql`), update every reference you can reach in the same change, and list the rest in the handoff.
- **Transitional:** the `CROWDPOOL*.md` and `CROWDPOOLING*.md` docs stay in the root while the crowdpool lane has them open, then move to `docs/planning/`.

Changed 2026-09-27 (Rye, funding engine Phase 0): root planning docs moved to docs/planning/.

---

## 9. Commit + push protocol

- Commit per logical batch with descriptive messages. Don't pile every fix into one commit.
- **Commit by pathspec, not by index: `git commit -m "..." -- path/one path/two`.** "Targeted `git add`" is NOT enough protection when a concurrent session is running. The index is shared: another session can stage its own files at any moment, and `git commit` then sweeps them into your commit no matter how careful your own `git add` was. This is not hypothetical, it happened on 2026-07-16: a db.ts refactor commit silently swallowed 12 unrelated files (webp assets, CustomGames.tsx, a docs manifest) that the other session had staged. Caught before the push; the fix was `git reset --soft HEAD~1` then re-commit with a pathspec, which also leaves the other session's staged files exactly as they were.
- Always print `git show --stat --oneline HEAD` after committing and confirm the file list is only yours. Do it before pushing, while `reset --soft` is still cheap.
- Cowork VM cannot push. Always end with the unpushed commit list (sha + subject) and the Windows push command for Rye.
- After commit, run `git fetch origin && git log origin/main..main --oneline` to verify what's actually unpushed (Rye pushes between turns; local view goes stale).
- Per `~/.claude/memories/rye-working-style.md`: unpushed list goes in chronological order, oldest first, in the Claude Code handoff prompt.

---

## 10. Skills are first-class

When making a deliverable that has a matching skill, USE the skill. Skills are in:
- `.claude/skills/` (project-specific, committed)
- `~/.claude/skills/` (cross-project user skills)

Most-used:
- `regen-fixes-handoff`: produce FIXES_TO_MAKE docs
- `regen-ship-gate`: the audit-truncation + className grep + typecheck protocol
- `regen-do-everything`: autonomous end-to-end fix execution
- `regen-database-sql`: MySQL on Railway, Drizzle patterns
- `regen-fundraising-copy`, `regen-outreach-sequences`, `regen-content-repurposing`, `regen-community-onboarding`: voice-matched writing
- `regen-seo-audit`, `regen-release-notes`, `regen-comparison-pages`, `regen-landing-copy`, `regen-event-blast`, `regen-investor-deck`, `regen-incubator-review`, `regen-character-art`: added 2026-04-25
- `regen-form-design`, `regen-background-design`: visual / UX work
- `hypha-pr-workflow`: for hypha-web PR contributions

Full list: `.ai/docs/SKILLS-INDEX.md`.

---

## 11. Deterministic-first for autonomous behavior

Before building any autonomous or recurring behavior (agent, automation, cron, scheduled task, anything that runs more than once), split it into deterministic and nondeterministic parts.

- Deterministic part: write a plain tool that runs without an LLM. Spend tokens once to build it, then run it forever at zero token cost. Wire it to a schedule yourself.
- Nondeterministic part: the only place an agent or LLM call belongs. Keep it as small as possible. Call it on a schedule, only for the judgment it needs.

Default to the tool. If the whole task is deterministic, there is no agent, just a tool that runs free. If a step is left unattended, the deterministic tool keeps running on its own; the agent only wakes on its schedule for the part that truly cannot be deterministic.

The coordination engine already follows this: the YouTube poll, role reconciliation, stale-claim sweep, upload, and publish writes are deterministic crons and server code at zero token cost; only the transcript-understanding step spends tokens.

Full reasoning and the decision checklist: the `regen-deterministic-first` skill.

---

## 12. Mobile touch standard

iPhone Safari is the primary platform. Every user-facing surface (main site, Ship, CORE, and every Custom Games spinoff cloned from the template) meets one bar. Adopted 2026-07-18 after the ecosystem migration; full rationale and phase history in `docs/planning/MOBILE_FIRST_MASTER_PLAN.md`.

- **44px minimum touch targets on touch devices.** Anything tappable (buttons, links, menu rows, list options, chips, close controls, map pins) is at least 44x44 for a coarse pointer. This is Apple HIG 44pt / WCAG 2.5.5.
- **Size by input capability, not viewport width.** Use Tailwind `pointer-coarse:` min-h/min-w floors on the element (`pointer-coarse:min-h-11`, plus `pointer-coarse:min-w-11` on icon-only controls). This catches iPads and touch laptops at desktop widths, which a `max-width` media query never will. Never widen or heighten with plain `h-`/`w-` when a caller might override it; floors are `min-*` so overrides and multi-line content stay safe. Desktop pointer density is left exactly as designed.
- **Small visual, big tap zone when needed.** Where a control must stay visually small (toggle, tiny remove X), keep the visual and grow only the hit area: a `pointer-coarse:after` inset overlay or `pointer-coarse:-m-*` negative margins. The base components already do this.
- **16px input font on mobile.** Text-entry controls render 16px under 767px so iOS never zooms on focus. Base Input/Textarea/Select handle this; raw fields must carry `text-base md:text-sm`.
- **Modals are the base Dialog.** `DialogContent` is the only modal shell. It provides the bottom sheet, visualViewport keyboard lift, safe-area padding, portal, focus trap, and Esc. Do not hand-roll a `fixed inset-0` overlay; gate 1c and code review reject new ones.
- **Zoom is never blocked.** `maximum-scale=1` is banned in every viewport tag in every codebase we own.
- **Enforced by gate 1c.** `scripts/audit-touch-targets.py` runs inside `pnpm gate` and fails interactive elements that cap below 44px without a floor or a reviewed `touch-ok` comment. It complements gate 1b (`audit-tap-blockers.py`, invisible tap occlusion). Neither replaces a real iPhone pass on load-bearing UI changes (section 4): hit-testing on device is the only thing that catches what static analysis cannot.

---

## 13. Typing, clicks and scrolling stay instant

Adopted 2026-10-14 after people reported typing lag across the site, and widened 2026-10-15 to every interaction. With the CPU slowed to a mid-range phone's speed, keystrokes took 50 to 100ms, the first one on any page about 350ms while Google Translate loaded, and about 330ms each in a forum reply box under 40 replies; opening a nav menu took over a second; some forms re-rendered 400 to 500 components per keystroke. Nothing in the JavaScript was slow on its own; the main thread was busy with work nobody could see. These rules keep it fast:

- **No endless animation the compositor cannot run.** Only `transform`, `opacity` and `filter` on an ordinary element animate off the main thread. Never animate a shape inside an SVG, and never animate `background-position`, `box-shadow`, colours or sizes forever: slide a pseudo-element with a transform, or pulse the opacity of a layer that holds a fixed shadow. One such animation anywhere on the page makes the browser restyle every frame, and every keystroke waits behind it. `pnpm ui:audit` fails them ("main thread").
- **Decorative motion holds still while someone types.** Put purely decorative animation (particles, ambient backgrounds) inside a `.decor-layer`; it pauses while a text field has focus (`client/src/lib/stillWhileTyping.ts`), and a canvas loop checks `isTyping()` and stops when off screen. Even a compositor animation is restyled on the main thread whenever a keystroke forces a style update: the home page's 46 leaves and stars doubled each key's delay.
- **Third-party scripts load on intent, not on first interaction.** Google Translate loads when the language menu opens. Loading it on everyone's first keypress froze that keystroke for about 300ms and left Google's spinner animating forever.
- **A field's state lives in the smallest component that needs it.** Typing in a reply box must not re-render the thread, the message list or the page. Move the draft into a composer child, memoize markdown rendering, and never declare components inside render.
- **Debounce whatever a keystroke triggers beyond the field**: a server query, a storage write, a link preview, a map or list rebuild. Use `useDebouncedValue` (`client/src/hooks/useDebouncedValue.ts`) and keep previous results while the next ones load.
- **Lists render rows as memoized components with stable props.** Liking one reply, opening one menu or a query resolving must re-render that row, not all forty. Pass primitives and `useCallback` handlers keyed by id.
- **A ticking clock lives in its own small component.** A countdown or timer at a page's root re-renders everything under it on every tick; the session board re-rendered the stage people typed on twice a second until its clocks moved into leaf components (`client/src/components/session-board/useBoardClock.ts`). An end time gets one timer for that moment, not polling.
- **Scrolling runs no layout reads and no React state per frame.** Reading `scrollY`, `scrollHeight` or a rect in a scroll handler makes the browser finish its layout inside every scroll event. Use an IntersectionObserver, read once per frame inside `requestAnimationFrame`, and write progress straight to the element.
- **Menus that do not need to block the page are not modal.** A Radix `DropdownMenu` is modal by default, which disables pointer events on `<body>` and marks the rest of the page `aria-hidden`: every element restyles before the menu shows. Nav menus use `modal={false}`.
- **Small toggles answer on the tap.** Likes, follows, votes and mark-as-read update the cache in `onMutate` and settle in `onSettled`, so nobody waits a round trip to see their own click. Roll back inside `onSettled` when it carries an error: a mutation's own `onError` replaces the app-wide one in `client/src/main.tsx`, and with it the too-many-requests toast. A toggle the server flips (follow) ignores a second tap while the first is in flight.
- **Search boxes keep their own text.** A box that filters a list is a `DebouncedSearchInput` (`client/src/components/DebouncedSearchInput.tsx`): the box re-renders alone on each key, and the list follows once typing pauses. Search text held in a page (or in Admin's root) re-rendered the whole page per key.
- **Keep Selects, tooltips and toolbars out of the typing path.** A closed Radix `Select` still renders every item, and each shadcn `Tooltip` brings its own provider, so a form that re-renders them per key pays for dozens of components it never shows. Put them in memoized components with stable handlers (`usePersistFn`, `client/src/hooks/usePersistFn.ts`).
- **Build what nobody sees only when it is shown.** The email composer turned the whole body into a finished HTML letter on every keystroke for a preview tab that was closed.
- **Hand-made widgets are destroyed on unmount.** A globe, map or canvas loop created with `new` keeps drawing every frame on every later page unless its cleanup tears it down (globe.gl's `_destructor()`).
- **Splash moments greet once per visit.** The hero quote loader shows on the first hero page of a visit only; a forced wait on every return trip is lag.

Measure, do not guess:
- `pnpm perf:renders` counts React component renders per interaction on every page (idle, scroll, per keystroke, toggle clicks) through the DevTools commit hook. Counts do not wobble with machine load, so it finds waste reliably (`harness/perf-renders.mjs`; run against `pnpm dev` for readable names). `--forms` also types into every field on the page and into the forms behind Propose, Edit and Reply buttons; a signed-in run refuses to start with a dead session.
- `pnpm perf:live` times clicks, keystrokes, scroll frames and page-to-page navigation with the CPU slowed 4x (`harness/perf-live.mjs`).
- `pnpm perf:typing` measures keystroke delay on chosen fields (`harness/typing-bench.mjs`). Under 50ms per key is the bar.

---

## What is NOT a hard constraint

The following are preferences, not steering rules. They live in `.ai/docs/DECISIONS.md` (architectural choices) or in skills (process):

- Choice of UI library (shadcn/ui via Radix). Documented in DECISIONS, not steering.
- Forum schema specifics. Documented in CLAUDE.md.
- Deploy target (Railway). Documented in DECISIONS.
- Color palette / brand colors. Documented in skills + design specs, not steering.
