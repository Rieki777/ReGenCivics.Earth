# Claude Code Prompt — 2026-07-18 — Mobile-First: Phase 5 + remaining tail

READ THIS FIRST. The mobile-first migration (`MOBILE_FIRST_MASTER_PLAN.md`) shipped in two batches on 2026-07-18. This prompt covers only what could not be done in that session: work gated on a production week, work that needs Rye's iPhone, and a low-priority accessibility tail. Do not redo the shipped work.

## What already shipped (do not touch, for context only)

Both are live and deploy-green on production:

- **regencivics.earth** (commits `c3a739c`, `5528181`, `50c7d57`, `a12a00a`, `d29e37c`, `24557cd`): base ui primitives carry `pointer-coarse:` 44px floors; admin sidebar is a Sheet drawer on phones with a header hamburger; 6 modals migrated to base Dialog; ~40 raw targets floored; Connect + InvestorForm selection cards made keyboard-operable; `scripts/audit-touch-targets.py` runs as gate 1c; STEERING.md section 12 codifies the standard.
- **play.amora.cr** (commits `6880c1c`, `9beaff7`, on `Rieki777/Amora-Game`): viewport zoom unblocked, touch foundation ported, all raw modals migrated to base Dialog.

The key architectural fact for Phase 5: `client/src/index.css` still contains the OLD blanket rescue that the migration is meant to retire. Phase 1-3 moved the sizing into the components, so the rescue is now redundant. Phase 5 removes it. This is the payoff of the whole migration and the only structural piece left.

---

## Fix 1 — Phase 5: delete the index.css touch hacks (Medium, GATED)

**Status:** BLOCKED until (a) the shipped floors have run on production for about a week and (b) Rye confirms on iPhone that buttons still feel right. Do not start before both. Deleting the safety net the same week it shipped is how a silent sub-44 regression reaches a phone.

**What to remove from `client/src/index.css`:**

1. The `@media (max-width: 767px)` block that forces `min-height: 44px !important` on `[data-slot="button"]`, `button`, `[role=button]`, `select`, `summary` (currently around the "Touch targets: iPhone/Safari is the primary platform" comment). Keep the `input/textarea/select { font-size: 16px !important }` iOS zoom guard directly above it, and keep the `.leaflet-bar a` and breadcrumb/footer link rules. Only the button min-height blanket goes.
2. Re-evaluate the `@media (pointer: coarse)` `::after` hit-area expander (the "Touch target: ensure 44px minimum hit area" block). The components now own their sizing, so the expander's only remaining job is (a) elements that stay visually small on purpose, checkbox/radio/switch, and (b) any raw target not yet floored. Do NOT delete it wholesale. Instead: confirm every checkbox/radio/switch and every intentionally-small control still gets a 44px zone from it, and only then consider narrowing its selector list. Safer target for this pass: keep the expander, delete only the button min-height blanket. Removing the expander is a separate, later decision.

**After removing:** run the full gate (`pnpm gate` on Windows, or `py scripts/audit-truncation.py` + `py scripts/audit-touch-targets.py` + `pnpm check`). STRONG must stay 0. Then re-audit on a 390px viewport across main, ship, core, and admin: spot-check that no button, menu row, select item, tab, or close control regressed below 44px now that the blanket is gone. Any that did means a component or call site is missing its `pointer-coarse:` floor; add it (that is the correct fix, not restoring the blanket).

**Evidence required before marking VERIFIED:** the three gate outputs (exit 0, STRONG 0), plus a screenshot or DOM check at 390px of admin, one dropdown menu, one Dialog, and the gratitude/settings switches showing >= 44px tap zones.

---

## Fix 2 — Custom Games template: fold in the mobile foundation (Medium)

**Status:** CODED-ready (not blocked).

The Amora port proved the foundation applies nearly clean to a spinoff. Fold it into the Custom Games blueprint so every future $20k game ships at this standard by default instead of being retrofitted. Per `CUSTOM_GAMES_MASTER_PLAN.md` and the one-session-generation flow (see the `custom-games-product-plan` memory): the generated `button.tsx`, `input.tsx`, `dialog.tsx`, the index.css touch block, and the viewport tag should all carry the shipped patterns. Add a short `MOBILE_STANDARD.md` to the template documenting the bar (mirror STEERING.md section 12) for anyone hand-editing later.

**Files:** wherever the Custom Games blueprint/template lives (search `CUSTOM_GAMES_MASTER_PLAN.md` and `blueprint.json` references). Do not invent a new template location.

---

## Fix 3 — Accessibility tail: remaining role-less onClick elements (Low)

**Status:** CODED-ready, multi-session, low priority.

Gate 1c reports ~53 WARN-level `<div onClick>` / `<span onClick>` elements with no button semantics (down from 65 after the Connect/InvestorForm pass). These are not touch-target failures (the shipped fixes cleared STRONG to 0); they are keyboard-accessibility follow-ups. Work through them in small batches, converting each to `role="button"` + `tabIndex={0}` + an Enter/Space `onKeyDown` firing the same handler, exactly like the Connect.tsx pattern from commit `24557cd`. Skip genuine non-interactive wrappers and modal backdrops. Run `py scripts/audit-touch-targets.py` after each batch and watch the WARN count drop. No deadline; do a batch whenever a session has slack.

Do NOT convert `<div>` to `<button>` (breaks nesting/styling). Role + tabIndex + keydown is the correct minimal fix.

---

## Fix 4 — Amora deploy verification (Low)

**Status:** HUMAN STEP (browser).

Amora deploys from `Rieki777/Amora-Game`, which this repo's Railway CLI cannot check. Confirm the `9beaff7` build went green on `play.amora.cr` and that the two migrated modals (investor pack, schedule call) open and submit correctly.

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Where |
|---|------|-------------|-------|
| 1 | iPhone spot-check of the shipped work | Real WebKit hit-testing cannot be simulated | On your phone: admin drawer + hamburger, a dropdown menu, any Dialog (CrowdPooling save/load, onboarding wizard, Messages compose), the gratitude Sent + settings switches, a Connect role card via keyboard-less tap |
| 2 | Green-light Phase 5 after ~1 week live | Removing the safety net needs your on-device confirmation first | Tell Claude Code "Phase 5 is clear" |
| 3 | Confirm Amora deploy + modals on play.amora.cr | Separate repo, not pin-checkable from here; browser action | play.amora.cr investor journey |

### CLAUDE CODE — can be done without you

| # | Task | Status |
|---|------|--------|
| 1 | Phase 5 hack deletion + re-audit (Fix 1) | BLOCKED on Rye rows 1+2 |
| 2 | Custom Games template mobile fold-in + MOBILE_STANDARD.md (Fix 2) | CODED-ready |
| 3 | Accessibility tail, remaining ~53 onClick WARNs (Fix 3) | CODED-ready, low priority |

### WAITING ON YOU before Claude Code can proceed

Fix 1 (Phase 5) is the only blocked item: it needs the production week to elapse and your iPhone confirmation (rows 1 + 2). Everything else can proceed any time.

### Explicitly deferred (not in this prompt)

The governance app (`apps/gov/`) mobile audit is parked per Rye's 2026-07-18 call. Pick it up only when Rye reopens it.
