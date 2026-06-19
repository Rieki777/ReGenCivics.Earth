# Mobile-First Audit and Upgrade Plan, 2026-06-18

A focused round on the phone experience, because that is where most first-time visitors will arrive and where the fundraising and incubator links will get shared. This is a complete, standalone doc: a mobile scorecard, the one real blocker, 10 ways to make the phone experience world class, and 15 prioritized fixes with file references and effort. Findings are grounded in the actual code.

This round sits on top of two things already done today: the five screenshot fixes (Epic Quest cards, Quest Arc map placement, the vertical command menu, the Hymns player, and the "On the Cloud" copy), and the full CTO and CDO audit in `SITE_AUDIT_2026-06-18_CTO_CDO.md`. Where they overlap, this doc is the mobile-specific source of truth.

## The verdict in one paragraph

The mobile foundation is strong. The viewport and PWA setup are close to exemplary (`viewport-fit=cover`, a real manifest with maskable icons, mobile-specific image preloads). Inputs use a 16px base so iOS does not zoom on focus, typography scales with `clamp()`, images ship mobile-specific URLs, and the bottom tab bar plus the new command menu are genuinely thumb-friendly. One thing drags the experience down more than anything else: dialogs render as centered desktop modals with no internal scroll, so any form in a modal is awkward on a phone. Fix the modals, tighten a handful of touch and safe-area details, add sticky thumb-zone CTAs, and the phone experience moves from "works well" to "feels native."

## Mobile scorecard

| Area | Rating | One-line finding |
|---|---|---|
| Viewport and PWA | Strong | `client/index.html:8` uses `viewport-fit=cover`, `maximum-scale=5`; `manifest.json` has maskable icons and standalone display |
| Input zoom and forms | Strong | Inputs use `text-base` (16px) and `min-h-[44px]`, so no iOS zoom-on-focus; IME handled |
| Horizontal overflow | Strong | `min-w-0`, `.safe-prose` with `overflow-wrap: anywhere`; no fixed-width traps in key paths |
| Responsive images | Strong | `PageBackground.tsx` serves mobile-specific URLs, blur placeholder, parallax disabled on mobile |
| Gestures and affordances | Strong | Haptics in the command menu, green tap-highlight, no hover-only traps |
| Typography | Strong | `clamp()` heading scale, 14px body minimum, constrained line length |
| Safe-area insets | Adequate | Tab bar and FAB handle `env(safe-area-inset-bottom)`; modals, sticky headers, and toasts do not |
| Touch targets | Adequate | 44px minimums met; tab bar labels at `text-[10px]` are cramped under 375px |
| Navigation ergonomics | Adequate | Bottom nav and command menu are thumb-reachable; the top hamburger forces an unnatural reach, and three nav surfaces coexist |
| Modals, dialogs, sheets | Weak | `dialog.tsx` centers modals with no internal scroll; `AuthDialog` is `w-[400px]` and can trap overflow on a phone |

## The one real blocker

Modal dialogs. `client/src/components/ui/dialog.tsx` (around line 127) positions content at `top-[50%] left-[50%]` with a translate, which is a centered desktop modal. On a 360px phone with a tall form, the top is empty and the bottom is cut off, and there is no `overflow-y: auto`, so the content is trapped. `AuthDialog.tsx` (around line 91) is `w-[400px]`, wider than many phones, and leans on the dialog max-width to shrink. Sign-in and any in-modal form are the first thing many visitors touch, so this is worth fixing first.

---

# 10 ways to make the mobile experience world class

1. **Turn dialogs into bottom sheets on phones.** Below the `md` breakpoint, render modals as a sheet anchored to the bottom of the screen with a drag handle, internal scroll, and a safe-area-aware footer. This is the single biggest lever. Sign-in, the forum composer, gratitude, and any quick form go from awkward to native in one change.

2. **Make it a real installable app.** The manifest is already good. Add iOS startup images so the home-screen launch does not flash a blank screen, confirm the maskable icon crops well, and add a gentle, dismissible "Add to Home Screen" nudge for returning mobile visitors. An installed PWA changes how committed players treat the site.

3. **Commit to thumb-first navigation.** The bottom tab bar and the command menu are reachable; the top hamburger is not, and having three navigation surfaces on one screen is one too many. On phones, demote the top bar to a logo and the current page title, and let the bottom nav plus command menu carry primary navigation.

4. **Give every key page a sticky thumb-zone CTA.** On `/fund`, `/land`, `/play`, and `/apply`, pin a single primary action to the bottom of the viewport (Invest, Bring my land, Start questing, Apply) so the next step is always one thumb-tap away while reading. This is the mobile version of the homepage CTA gap flagged in the main audit.

5. **Pace long pages for a scrolling thumb.** Phone visitors scan. Add a short "what this is" summary to the top of the long pages (Seasons, Team, Fund), break dense sections with clear anchors, and keep paragraphs short. The copy is already strong; the structure can do more for a small screen.

6. **Make forms a one-thumb job.** Add the right mobile keyboards (`type="email"`, `type="tel"`, `inputMode="url"`), `autocomplete` hints, 48px targets, and inline validation, and keep the multi-step Apply flow showing clear progress. Forms are the conversion moment for both investors and land projects.

7. **Budget for cellular.** Set a per-route JavaScript budget, serve image widths sized to the device through the `/api/img` proxy, and defer anything non-critical so first paint is fast on a phone on a train. Measure on throttled 4G, not office wifi.

8. **Use motion that delights without draining battery.** The new command menu (springy, staggered, haptic, with a focus scrim) is the template. Extend that quality to reveals and skeletons, and gate all of it behind `prefers-reduced-motion` so it stays kind to people who need it off.

9. **Build share-from-phone loops.** Add the native Web Share sheet to quest completion and to project and fund pages, give each page a guaranteed OG image, and add a "share your quest" button. Phones are where sharing actually happens, so make it one tap.

10. **Get safe areas right everywhere, in both orientations.** Every fixed or sticky element (headers, modals, sheets, toasts, the FAB) should respect the top and bottom insets, in portrait and in landscape. The tab bar and FAB already do this; bring the rest up to the same standard so nothing hides behind the notch or the home indicator.

---

# 15 mobile-first fixes, prioritized

P0 = do before sharing widely, P1 = high impact, P2 = polish. Effort is rough engineering time.

| # | Pri | Fix | Where | Effort |
|---|-----|-----|-------|--------|
| 1 | P0 | Render dialogs as bottom sheets under `md`; add `max-h-[calc(100dvh-2rem)]` and `overflow-y-auto` so content never gets trapped | `client/src/components/ui/dialog.tsx`, `AuthDialog.tsx` | 0.5-1 day |
| 2 | P0 | Add safe-area padding to modal and sheet footers, toasts, and any sticky header so controls clear the notch and home indicator | `dialog.tsx`, toast, sticky headers | 2-3 hrs |
| 3 | P0 | Add a sticky thumb-zone CTA bar on `/fund`, `/land`, `/play`, `/apply` (single primary action, safe-area aware) | those pages | 3-4 hrs |
| 4 | P0 | Real-device pass on iOS Safari and Android Chrome at 360 and 390px: confirm the five shipped screenshot fixes render, and check the "Two Spaces, One Vision" blank-render risk | `Home.tsx`, mobile components | 0.5 day |
| 5 | P1 | Bump MobileTabBar labels from `text-[10px]` to `text-[12px]`; fall back to 4 slots under 375px | `client/src/components/mobile/MobileTabBar.tsx` | 1-2 hrs |
| 6 | P1 | Demote the top hamburger on phones to logo plus page title; let the bottom nav and command menu carry navigation | `Navigation.tsx` | 3-4 hrs |
| 7 | P1 | Set correct mobile keyboards and autocomplete on all forms (`type=email/tel`, `inputMode=url`, `autocomplete`) | `Apply.tsx`, `InvestorForm.tsx`, `LOI.tsx`, `AuthDialog.tsx`, forum composer | 3-4 hrs |
| 8 | P1 | Generate iOS startup (splash) images and a dismissible install nudge for returning mobile visitors | `client/index.html`, `public/`, manifest | 0.5 day |
| 9 | P1 | Serve device-sized image widths through the `/api/img` proxy (srcset or width params); confirm no phone fetches a desktop-resolution hero | image components, `PageBackground.tsx` | 0.5 day |
| 10 | P1 | Raise form-label contrast on light backgrounds to an accent-on-light token and standardize CTA and input targets to 48px | `design-tokens.ts`, form components | 3-4 hrs |
| 11 | P1 | Add the native Web Share sheet to quest completion and to project and fund pages | quest completion, project and fund pages | 3-4 hrs |
| 12 | P2 | Gate all mobile motion behind `prefers-reduced-motion` (tab bar spring, reveals, ambient loops) | `index.css`, motion components | 2-3 hrs |
| 13 | P2 | Suppress desktop scrollbar styling on touch devices via `@media (hover: hover)` and confirm momentum scrolling on scroll regions | `index.css` | 1-2 hrs |
| 14 | P2 | Preserve scroll position on back navigation and add a back-to-top control on long lists (community, quests) | community and quest lists | 2-3 hrs |
| 15 | P2 | Document the supported width matrix (320, 360, 375, 390, 430px) and fix any overflow or truncation found at the edges | layout, test notes | 0.5 day |

---

## Suggested sequence

Ship the four P0s first; they are what a phone visitor notices in the first thirty seconds (modal forms, notch overlap, a missing next-step button, and anything that broke on a real device). Then take the P1s in this order: tab-bar and nav ergonomics, then forms and keyboards, then install polish and responsive images, then sharing. Fold the three P2s into the next quality sprint.

## What is already strong on mobile, keep it

The viewport and manifest setup, the 16px input base and 44px input height, the `clamp()` type scale, the mobile-specific image loading with blur placeholders and no parallax, the haptics and tap highlights, and the bottom nav plus command menu as a thumb-first system. None of this needs rework.

## Verification for this round

Findings came from reading `client/index.html`, `manifest.json`, `client/src/components/ui/dialog.tsx`, `AuthDialog.tsx`, `client/src/components/mobile/MobileTabBar.tsx`, `WizardRadialMenu.tsx`, `Navigation.tsx`, `PageBackground.tsx`, `index.css`, and `button.tsx` / `input.tsx`. The two claims worth confirming on a real device before the P0 sprint closes: the modal overflow behavior on a 360px phone, and the "Two Spaces, One Vision" render on iOS Safari.
