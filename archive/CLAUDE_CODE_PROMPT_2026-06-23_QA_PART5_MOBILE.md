# Claude Code Execution Prompt: QA Part 5 (Mobile Deep Audit)

A full mobile pass using real device emulation (Playwright, iPhone 13: 390x844, touch, iOS user agent, fresh logged-out context) across 13 routes, plus a static mobile-CSS audit. Nothing here overlaps Parts 1 to 4. The mobile foundation is strong; the actionable items are concentrated in a few systemic fixes. Every item has file:line.

Read `CLAUDE.md` and `.ai/docs/STEERING.md` first. Apply the writing rules. Run the four-gate ship gate before VERIFIED. You cannot push or deploy.

## What the mobile pass confirmed STRONG (record this, no action)

- Zero horizontal overflow on all 13 emulated routes (home, fund, land, play, apply, community, bionomics, governance, connect, tokenomics, marketplace, newsletter, heal-the-land).
- Viewport meta is correct: `width=device-width, initial-scale=1.0, maximum-scale=5, viewport-fit=cover` (allows pinch-zoom for a11y, opts into safe areas).
- Mobile image variants exist: `index.html:54-55` preloads `home-mobile.webp` under `(max-width:767px)` and `PageBackground.tsx:745-814` swaps to it; `Community.tsx:288` uses `<picture>` with a mobile `srcSet`. Phones do not download the desktop hero.
- Global tap-highlight + `touch-action: manipulation` are set (`index.css:250-252`).
- Bottom tab bar, FABs, toasts, and dialogs apply `env(safe-area-inset-bottom)` (`mobile/MobileTabBar.tsx:46`, `WizardRadialMenu.tsx:213`, `StickyThumbCta.tsx:57`, `ui/dialog.tsx:132`).
- 21 of 22 `<table>` elements are wrapped in `overflow-x-auto` (the tokenomics table included).
- `Apply.tsx:247` correctly shows a "Sign in to apply" CTA to logged-out users (not a dead end).

---

# P1 (systemic, high impact on phones)

## MOB-1: Every input triggers iOS auto-zoom on focus
On iOS Safari, focusing an input whose font-size is under 16px zooms the whole page (jarring, and the user must pinch back out). Runtime measured inputs rendering at 15px across every page (the global newsletter email field, marketplace selects, and more).
Root cause: `client/src/index.css:283` sets `font-size: 0.9375rem !important;` (15px) on inputs, and the `!important` overrides shadcn `ui/input` (which is correctly `text-base` = 16px on mobile). 
Fix: change that rule to `16px` (`1rem`) on mobile, or scope the 15px down-size to `min-width: 768px` only so phones keep 16px. Verify by focusing the newsletter field on a phone: no zoom.

## MOB-2: Touch targets below the 44px minimum
Apple HIG is 44x44pt, Material is 48dp. Runtime measured several interactive controls under that on mobile:
- Header search icon button: 32x32 (`Navigation.tsx`, the `Search (Ctrl+K)` button).
- Header pill buttons "Participate" / "Sign In" / "Apply": 36px tall (default `ui/button` height `h-9`).
- Bottom-nav "More" items: about 16px tall label hit area (`mobile/MobileTabBar.tsx` / `SmartBottomNav.tsx`).
- Breadcrumb "Home" link: 14x14 (`Breadcrumbs`).
Fix: enforce a 44px minimum on interactive controls on touch. Options: bump the default `ui/button` to `min-h-[44px]` on mobile (it already works for `ui/input` which has `min-h-[44px]`); give the search icon button and breadcrumb links `min-h-[44px] min-w-[44px]` (padding, not visible size); enlarge the bottom-nav item hit area to the full cell height.

## MOB-3: Hover-only actions unreachable on touch
Touch devices have no hover, so actions revealed only on `:hover`/`group-hover` with no focus/tap fallback cannot be triggered on a phone:
- `client/src/components/CampaignImageUpload.tsx:301` and `:311`: the edit and delete buttons for an uploaded campaign image are `opacity-0 group-hover:opacity-100`. A campaign owner on mobile cannot edit or remove an image.
- `client/src/components/EmailSettings.tsx:894`: a dropdown menu is `hidden group-hover:block` with no click/focus toggle (admin surface).
Fix: make these visible on touch (`opacity-100 md:opacity-0 md:group-hover:opacity-100`) or add a tap/focus toggle. (The ~25 `group-hover:` patterns in `Community.tsx` are decorative and gate no actions; leave them.)

---

# P2 (mobile correctness)

## MOB-4: Modals do not contain scroll (iOS rubber-band / scroll chaining)
Only the menu drawers and one modal set `overscroll-behavior: contain` (`MobileMoreMenu.tsx:82`, `Navigation.tsx:709,729`, `QuestDetailModal.tsx:563`). The many full-screen `fixed inset-0 ... overflow-y-auto` overlays and dialogs (`CampaignImageGallery.tsx:182`, `ui/dialog.tsx`, the lightbox in `CampaignDetail.tsx:932`) lack it, so scrolling to the end of a modal chains to the page behind or triggers iOS rubber-banding. Fix: add `overscroll-contain` to scrollable modal/dialog bodies (ideally once in `ui/dialog.tsx`).

## MOB-5: Content can tuck under the bottom tab bar on notched phones
`App.tsx:436` uses `<main className="pb-20">` (5rem) to clear the tab bar, but the bar's real height is `4rem + env(safe-area-inset-bottom)` (about 5.1rem on notched iPhones), so the last line of content/footer can sit under it. Fix: `pb-[calc(5rem+env(safe-area-inset-bottom))]` on mobile.

## MOB-6: EmailSettings email table overflows horizontally
`EmailSettings.tsx:998-999`: the email-list `<table>` is in an `overflow-y-auto` container with no `overflow-x-auto`, and the Email/Name columns are unbounded, so long addresses force horizontal overflow inside that box on a 390px screen (admin surface). Fix: wrap in `overflow-x-auto` or `truncate` the email cell.

## MOB-7: Phone inputs likely do not use the numeric keypad
Confirm the phone fields in `InvestorForm.tsx` and `Apply.tsx` use `type="tel"` (and email fields `type="email"`, numeric fields `inputMode="numeric"`) so mobile shows the right keyboard. Runtime found only 2 `type="tel"` inputs in the whole app against many phone/number fields.

---

# P3 (iOS polish)

## MOB-8: One true `h-screen` clips on iOS
`Admin.tsx:3323` `flex h-screen overflow-hidden` clips by the iOS URL-bar height. Switch to `h-[100dvh]` (the codebase already uses `100dvh` in `ui/dialog.tsx:132` and deliberately avoids `min-h-screen` in `Bionomics.tsx:630`). The ~140 `min-h-screen` page wrappers are harmless (min-height, content flows past).

## MOB-9: Sticky header has no top safe-area (landscape on notched)
`Navigation.tsx:118` `sticky top-0` has no `padding-top: env(safe-area-inset-top)`, so in landscape on notched devices the left of the header can sit under the notch. Portrait is fine. Low priority.

## MOB-10: Very long mobile pages
`/tokenomics` renders about 35,000px tall on a phone. Content-heavy by nature, but consider a sticky in-page jump nav or collapsible sections on mobile so players are not scrolling through ten screens. Product call, not a defect.

---

# Note: real-device sign-off still recommended

This pass used Playwright iPhone emulation, which is accurate for layout, overflow, touch-target geometry, and font sizing, but real iOS Safari and Android Chrome can still differ on momentum scroll, the URL-bar resize, input zoom, and PWA install. Do a final real-device pass (or Chrome DevTools device mode) on home, apply, the multi-step apply form with the keyboard open, community, quest, and profile before launch.

---

# Ship gate (run before VERIFIED)

```bash
python3 scripts/audit-truncation.py
rg -g '*.css' '<className-you-added>' client/src/
pnpm typecheck
node scripts/audit-links.mjs
```

# Handoff Breakdown: Who Does What

## YOU (Rye)

| # | Task |
|---|------|
| 1 | Decide MOB-10 (long tokenomics page): leave as is, or add mobile jump-nav/collapse |
| 2 | Real-device pass on key pages + the apply form with keyboard open |
| 3 | Deploy after Claude Code stages the fixes |

## CLAUDE CODE

| # | Task | Priority |
|---|------|----------|
| 1 | MOB-1: input font-size to 16px on mobile (`index.css:283`) | P1 |
| 2 | MOB-2: 44px min touch targets (default button, search icon, bottom-nav items, breadcrumb) | P1 |
| 3 | MOB-3: fix hover-only actions in CampaignImageUpload + EmailSettings | P1 |
| 4 | MOB-4: overscroll-contain on dialog/modal bodies | P2 |
| 5 | MOB-5: bottom padding with safe-area in `App.tsx` main | P2 |
| 6 | MOB-6: EmailSettings table horizontal scroll/truncate | P2 |
| 7 | MOB-7: confirm phone/email/number input types + inputMode | P2 |
| 8 | MOB-8: `Admin.tsx` `h-screen` to `h-[100dvh]` | P3 |
| 9 | MOB-9: sticky header top safe-area | P3 |
| 10 | Run the four ship-gate checks, attach evidence | gate |

## WAITING ON YOU

- Only MOB-10 (product call) and the real-device pass gate anything. Every code task proceeds now.
