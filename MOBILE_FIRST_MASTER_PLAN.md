# Mobile-First Master Plan (ecosystem-wide)

Date: 2026-07-17. Status update 2026-07-18: Rye approved execution (gov app excluded for now). Phases 1-4, the admin mobile overhaul (section 1b below), and gate 1c are CODED and shipping; Phase 5 (hack deletion) waits for a production week; Phase 6 (Amora) next. Companion to `FIXES_TO_MAKE_2026-07-17_MOBILE_SAFARI_AND_DEEPLINKS.md`, which shipped the quick wins and deferred the structural work. This doc is the structural work.

Execution notes 2026-07-18: mechanism is Tailwind `pointer-coarse:` min-h/min-w floors (verified present in tailwindcss 4.3 dist). Two live bugs the blanket CSS hack was causing got fixed on the way: Radix switches/checkboxes (which render as `<button>`) were being stretched to 44px-tall pills on phones (index.css now excludes `[role=checkbox|radio|switch]` and the ::after expander covers them instead), and the tabs list clipped its CSS-lifted triggers. Six modals migrated to base Dialog, one more than planned: Messages ComposeModal was a raw `fixed inset-0` overlay the original audit missed. Gate 1c fixed 27 additional small targets and suppressed 5 with reviewed `touch-ok` comments.

Scope: main site + Ship + CORE church site (all in this repo's `client/`), the governance app (`apps/gov/`), Amora (`play.amora.cr`, separate codebase on Rye's Desktop), and every future Custom Games spinoff (which inherit whatever template we bless).

---

## 1b. Admin mobile overhaul (added 2026-07-18, Rye's screenshot)

On phones the admin rendered its fixed `w-56` sidebar as a static column beside the content, crushing the dashboard into roughly half of a 390px screen: header buttons stacked one per line, truncated title, unusable. Fix shipped with this batch: `AdminSidebar.tsx` renders the static aside only from `md` up and puts the same nav (shared `NavList`, 44px rows, safe-area padding) in a left Sheet drawer on phones; `Admin.tsx` gained a 44px hamburger in the header (`md:hidden`) that opens it, item taps close it, and content now gets the full viewport width. The notification bell also got true 44px min sizes.

## 1. The real starting point

The deferred item said "base Button caps at 40px." That's true of the component classes, and misleading about what phones actually see. Two blocks in `client/src/index.css` already paper over it:

| Mechanism | Where | What it does |
|---|---|---|
| Blanket 44px floor | `index.css:326-338`, `@media (max-width:767px)` | `min-height:44px !important` on `[data-slot="button"]`, `button`, `[role=button]`, `select`, `summary` |
| Hit-area expander | `index.css:1237-1252`, `@media (pointer:coarse)` | `::after` overlay stretches every button's tap zone to at least 44x44 (opt-out: `.no-touch-extend`) |

So on a phone today, most buttons already render 44px tall. The debt is architectural, and it leaks in six places the hacks can't reach:

1. **Width.** The min-height rule fixes height only. `size="icon"` buttons stay 36px wide visually; the `::after` expander covers the tap zone but two icon buttons in a `gap-2` row have overlapping invisible hit areas (32px buttons + 8px gap, 44px zones). Overlapping zones cause mis-taps. This is the same bug class as the dead-tap FAB, in miniature.
2. **Elements the selectors miss.** `<a>` links (pagination renders `PaginationLink` as `<a>`), `role=menuitem` dropdown rows (~32px, `dropdown-menu.tsx`), `role=option` select items (~32px, `select.tsx`), badge-as-link, 43 `<div onClick>` and 8 `<a onClick>` across `client/src`.
3. **Containers that clip the lifted content.** `tabs.tsx` list is `h-9`; the CSS forces its trigger buttons to 44px inside a 36px rail. `calendar.tsx` cells are 32px wide (`--cell-size: spacing(8)`), so lifted heights misalign the grid.
4. **Controls with the wrong axis.** `switch.tsx` gets lifted to 44px tall and stays 32px wide. Checkbox and radio are `size-4` and deliberately excluded.
5. **`!important` fights every future component.** Padding, radius, and icon centering were designed for 36px and get inflated to 44. That's why some mobile buttons look subtly off: the height is a rescue, the proportions never followed.
6. **None of it exists in Amora.** The separate `game-amora` codebase has stock shadcn sizes (36px), no safe-area handling, no touch CSS, and a viewport tag with `maximum-scale=1` that blocks pinch zoom (accessibility failure on its own). Every Custom Games spinoff cloned from that pattern inherits the same debt.

The migration, then: make the components tell the truth, delete the hacks, close the gaps, and package the result so every surface (current and future) starts world-class instead of getting rescued by CSS.

## 2. The standard we're adopting

One bar for every surface, written down once:

- **Touch targets: 44px minimum on touch devices** (Apple HIG 44pt; WCAG 2.5.5 AAA. WCAG 2.2 AA only requires 24px, we're building past AA). Applies to anything tappable: buttons, links, menu rows, list options, chips, close X's, map pins players must hit.
- **Mechanism: capability, viewport as fallback.** Tailwind 4 ships `pointer-coarse:` variants. Sizing by input capability catches iPads at desktop widths and touch laptops, which the 767px media query never did. Desktop pointer density stays exactly as designed.
- **Inputs: 16px font on mobile** (kills iOS zoom-on-focus). Already the base component standard here; hold the line on raw fields.
- **Safe areas + keyboard:** every fixed bottom element pads `env(safe-area-inset-bottom)`; every modal is the base Dialog bottom sheet with visualViewport keyboard lift.
- **Zoom never blocked.** `maximum-scale=1` is banned in every codebase we touch.
- **Hit-testing honesty:** nothing invisible intercepts taps (gate 1b already enforces), and no two targets' tap zones overlap.

## 3. Phase 1: Button tells the truth (this repo)

Change `client/src/components/ui/button.tsx` size variants to carry the mobile size themselves:

```
default:  "h-9 pointer-coarse:h-11 px-4 py-2 has-[>svg]:px-3"
sm:       "h-8 pointer-coarse:h-11 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5"
lg:       "h-10 pointer-coarse:h-12 rounded-md px-6 has-[>svg]:px-4"
icon:     "size-9 pointer-coarse:size-11"
icon-sm:  "size-8 pointer-coarse:size-11"
icon-lg:  "size-10 pointer-coarse:size-11"
```

Reach: 811 `<Button>` usages update automatically (443 default, 290 sm, 66 lg, 8 icon, 4 dynamic; icon-sm/icon-lg are defined and currently unused). Plus 5 external `buttonVariants()` consumers: `pagination.tsx`, `calendar.tsx` (x2), `alert-dialog.tsx` (x2).

What this fixes that the CSS hack never did: icon button **width**, proportions designed for the size actually rendered, and correctness on coarse-pointer devices above 767px.

**The visual pass (why this was deferred, and how we do it without a redesign):** on phones the heights barely move (CSS already forced 44), so the visible delta is concentrated where width changes or where the `!important` inflation was hiding layout pressure. The prior sweep mapped the hotspots. Review these on a 390px viewport after the change:

| Hotspot | Where | Watch for |
|---|---|---|
| Paired sm buttons in card footers | `AdminTasksTab.tsx:127-206` | wrap on narrow cards |
| Leaflet popup button cluster (6+ sm) | `ShipMap.tsx:569-621` | overflow in fixed-width popup |
| sm buttons inside raw tables | `EmailSettings.tsx:464-476`, `Opportunity.tsx:610-623`, `RoleSubmissionsView.tsx:289`, `Admin.tsx:1462-1470` | row height jumps |
| Share button row (8 sm) | `ShareButtons.tsx:69-96` | wrap |
| Pagination pair | `AdminSeedsClaimsTab.tsx:588-605` | fine, just confirm |
| Admin.tsx generally (47 sm buttons) | `pages/Admin.tsx` | admin-only, accept density changes |

Also audit `<Button>` calls that override height via `className` (e.g. `h-7`, `h-8`): after Phase 5 removes the CSS rescue, those overrides become real. Grep, review each, add `pointer-coarse:` pairs or drop the override.

Effort: the diff is 10 minutes; the visual pass is 2-3 hours across main/ship/core breakpoints. One commit, one deploy, Rye spot-checks on iPhone per the standing protocol.

## 4. Phase 2: the primitives the hack never reached (this repo)

From the ui/ sweep, in priority order:

| Primitive | Today | Fix |
|---|---|---|
| `dropdown-menu.tsx` items | `py-1.5 text-sm`, ~32px, `role=menuitem` uncovered | `pointer-coarse:min-h-11 pointer-coarse:py-2.5` on items (same for context-menu if used) |
| `select.tsx` items | `py-1.5`, ~32px, `role=option` uncovered | same treatment; also `sm` trigger is 36px, give it `pointer-coarse:h-11` |
| `tabs.tsx` | list `h-9` clips CSS-lifted 44px triggers | list `h-9 pointer-coarse:h-auto pointer-coarse:min-h-11`, triggers `pointer-coarse:min-h-11` |
| `switch.tsx` | ~18x32px, width never lifted | `pointer-coarse:h-6 pointer-coarse:w-11` visual + extend tap zone to 44 via padding/pseudo |
| `checkbox.tsx` / `radio-group.tsx` | `size-4`, excluded by design | keep 16px visual, wrap in a 44px label/hit area at call sites that lack one; audit which do |
| `calendar.tsx` | 32px cells | `--cell-size` to 44px under `pointer-coarse` |
| `pagination.tsx` | renders `<a>`, escapes every hack; 0 usages today | inherits Phase 1 via `buttonVariants`; verify before first real usage |
| `badge.tsx` as link | ~20px | interactive badges get `pointer-coarse:min-h-11` + padding, or stop making badges tappable |
| `sheet.tsx` close X | icon `size-4`, no min | explicit `pointer-coarse:size-11` like the Dialog close fix pattern |

Effort: half a day including visual checks. All mechanical except the checkbox/radio call-site audit.

## 5. Phase 3: raw elements sweep (this repo)

The base migration covers `<Button>` and `buttonVariants`. Still exposed: 812 raw `<button>` tags (18 with explicit h-5 through h-8, 22 with p-0/p-1 icon padding), 43 `<div onClick>`, 8 `<a onClick>`.

Worst offenders, from the sweep: `CommandPanel.tsx:95,105` (28px header controls), `DashboardLayout.tsx:164` (32px sidebar toggle), `SmartImagePicker.tsx:185` (24px remove X), `StorytellerToggle.tsx:58` (custom 24px-tall switch), `GameMechanics.tsx:806-833` (pill chip row), `CampaignDetail.tsx:1476,1482` (carousel arrows), `Messages.tsx:613`, `QuestBadges.tsx:255`, `PlayerProfile.tsx:1761,1770`, `Quest.tsx:140`, `CustomGames.tsx:942` (20px modal close).

Approach: convert to `<Button>`/`buttonVariants` where the styling allows (most icon buttons), otherwise add explicit `pointer-coarse:min-h-11 pointer-coarse:min-w-11` with negative margins where visual size must stay small (the `-m-2` trick already used on ship close buttons). `<div onClick>` additionally needs `role="button"` + keyboard handling or conversion to a real button; fold that into the same pass since a11y and touch targets are the same visit.

Effort: 1-2 days, spread fine across sessions. Each file is independent.

## 6. Phase 4: modal unification (this repo)

Five custom modals bypass the base Dialog and its keyboard lift + safe-area + bottom-sheet behavior. Verified construction: all five are raw `fixed inset-0` overlays, none use a portal, none trap focus.

| Modal | File | Effort |
|---|---|---|
| CrowdPooling save | `CrowdPoolingTool.tsx:874-921` | ~30 min |
| CrowdPooling load | `CrowdPoolingTool.tsx:926-1001` | ~45 min |
| CustomGames waitlist | `CustomGames.tsx:934-960` | ~20 min |
| RaiseModal | `assembly/RaiseModal.tsx:70-238` | ~1-1.5 h (largest, manual aria to replace) |
| OnboardingWizard | `OnboardingWizard.tsx:378-431` | ~1.5-2 h (multi-step, z-[9998] stacking, test step nav + focus) |

Do the first three in one session, RaiseModal and OnboardingWizard each as their own commit with a phone check. After this phase, "modal" means `DialogContent` in this codebase, full stop; add a gate grep for new `fixed inset-0` outside ui/.

## 7. Phase 5: delete the hacks (the payoff)

Once Phases 1-3 land and survive a production week:

1. Remove the `min-height:44px !important` block (`index.css:326-338`) for buttons (keep the input 16px zoom guard and the leaflet-bar rule).
2. Remove or sharply scope the `::after` hit-area expander (`index.css:1237-1252`). Components now own their sizes; the expander's only remaining value is third-party widgets, so scope it to those or delete it. This also ends the overlapping-hit-zone problem in tight rows.
3. Re-run the full audit checklist on main/ship/core to confirm nothing regressed to sub-44.

This phase is the point of the whole migration: designed sizes instead of rescued sizes, and no `!important` fighting future work.

## 8. Phase 6: Amora + the Custom Games template

Amora is live, phone-facing, and has none of this. In `C:\Users\taren\Desktop\Amora\game-amora`:

1. **Viewport fix first, it's one line and it's an a11y failure today:** drop `maximum-scale=1`, adopt the main repo's tag (`maximum-scale=5, viewport-fit=cover`).
2. Port the Phase 1/2 component sizes (same shadcn structure, diffs apply nearly clean).
3. Port the index.css touch block (tap-highlight, touch-action, 16px zoom guard, text floors) minus the 44px `!important` hacks we're deleting at home; Amora gets the honest components directly and skips the hack era entirely.
4. Add safe-area padding to fixed bottom elements; add a manifest + icons if Rye wants installability there.

Then the multiplier: fold the resulting `button.tsx`, `input.tsx`, `dialog.tsx`, index.css touch block, and viewport tag into the Custom Games blueprint template (`CUSTOM_GAMES_MASTER_PLAN.md` flow), so every $20k spinoff ships at this standard by default. A one-page `MOBILE_STANDARD.md` in the template documents the bar for anyone hand-editing later.

Effort: Amora ~1 day including verification on the live Railway deploy; template fold-in ~2 hours.

## 9. Phase 7: governance app audit (DEFERRED, Rye's call 2026-07-18: "forget the gov app for now")

`apps/gov/` is a separate Next.js 14 app (Privy + tRPC) serving gov.regencivics.earth, and it has had zero mobile passes. Unknown debt. Run the same 11-point checklist the 07-17 audit used (touch targets, input zoom, safe-area, viewport units, hit-testing, modals, viewport tag) as a standalone sweep, then apply the standard. Budget a session for the audit before estimating fixes. Governance is where citizens vote; it should feel as good on a phone as the main site.

## 10. Phase 8: enforcement, so this never rots

The gate today checks truncation, invisible tap-blockers (gate 1b), and types. Nothing checks sizes, which is exactly how 40px buttons shipped for months.

1. **New gate 1c, `scripts/audit-touch-targets.py`:** static scan flagging interactive elements (button, role=button, onClick handlers) carrying explicit small sizing (`h-5` through `h-8`, `size-5` through `size-8`, `p-0`/`p-1` icon patterns) without a `pointer-coarse:` counterpart or a reviewed `touch-ok` suppression comment. Same design language as `audit-tap-blockers.py`: STRONG fails, WARN lists, comment suppresses. Note: `scripts/mobile-tap-audit.mjs` already exists and is wired to nothing; evaluate it first and either wire it or fold its ideas into the new script and delete it. One orphaned audit script is how gates quietly stop meaning things.
2. **Gate grep for new raw modals:** `fixed inset-0` outside `components/ui/` fails without a suppression comment (post Phase 4).
3. **Device verification protocol stays human:** the FAB dead-zone bug proved static analysis misses what only hit-testing on a real phone finds. After each phase ships: Rye's iPhone on the affected flows, per STEERING section 4. The sandbox cannot run WebKit; do not pretend otherwise.
4. Add the standard (section 2) to `.ai/docs/STEERING.md` as a numbered constraint once Phase 5 completes, so future agents inherit it as a hard rule.

## 11. Backlog absorbed from the 07-17 audit

Deferred items from the FIXES doc that belong to this plan's later phases rather than their own effort:

| Item | Phase | Note |
|---|---|---|
| Leaflet map pins 24-28px | 3 | visual density call, Rye decides pin size; tap zone can grow without the icon growing |
| Hero `vh` to `svh` (~8 spots, ship + core) | 3 | safe, cosmetic |
| ShipAdmin 32px inputs | 3 | admin-only, do in the same sweep |
| Horizontal pill strips lacking edge-fade affordance (5 components) | 3 | polish, one shared CSS mask |
| Inner Compass iOS canvas DPI cap | backlog | already fails gracefully |
| Bounty notifications typed `mention` (enum migration) | separate | data model change, not mobile |
| `quest_complete` deep link to specific quest | separate | needs webhook payload plumbing |
| Admin bounty-review deep view | separate | new page, not mobile debt |

## 12. Sequencing

Order is dependency-driven: 1 → 2 → 3 → 4 → 5 in this repo (5 requires 1-3; 4 is parallel-safe any time). 6 (Amora) can start any time after 1-2 exist to port. 7 (gov) is independent, schedule when a session frees up. 8.1 (gate 1c) lands with Phase 3 so the sweep's gains lock in immediately.

Rough total: 5-7 working sessions to a state where every live surface meets the standard and the gate defends it.

---

## Handoff Breakdown: Who Does What

### YOU (Rye): things only you can do

| # | Task | Why only you | Where |
|---|------|-------------|-------|
| 1 | Green-light Phase 1 (the button diff in section 3) | Site-wide visual change, your standing call from the 07-17 handoff | Say the word and Claude codes it |
| 2 | iPhone spot-check after each phase deploys | Real WebKit hit-testing can't be simulated from the sandbox | Flows listed per phase; Claude names them in each ship report |
| 3 | Decide leaflet pin visual size | Treasure map look is a design call | Section 11; tap zones grow either way |
| 4 | Decide if Amora gets a PWA manifest | Product call for play.amora.cr | Section 8, item 4 |

### CLAUDE CODE: can be done without you

| # | Task | Status |
|---|------|--------|
| 1 | Phase 1 button diff + hotspot visual pass + ship | Ready on go-ahead |
| 2 | Phase 2 primitive fixes (dropdown, select, tabs, switch, calendar, badge, sheet) | Ready |
| 3 | Phase 3 raw-element sweep + `<div onClick>` a11y conversion | Ready |
| 4 | Phase 4 modal migrations (5 modals, effort table in section 6) | Ready |
| 5 | Phase 5 hack deletion + re-audit | Blocked on 1-3 shipping + a production week |
| 6 | Amora port + viewport fix | Ready (folder access confirmed) |
| 7 | Custom Games template fold-in + MOBILE_STANDARD.md | After 1-2 |
| 8 | Gov app 11-point audit | Ready |
| 9 | Gate 1c touch-target audit script (evaluate mobile-tap-audit.mjs first) | Done 2026-07-18: `scripts/audit-touch-targets.py` wired as gate 1c; mobile-tap-audit.mjs deleted (superseded) |
| 10 | STEERING.md standard entry | After Phase 5 |

### WAITING ON YOU before Claude Code can proceed

Only row 1: the Phase 1 go-ahead. Everything else queues behind it or runs independent of it.
