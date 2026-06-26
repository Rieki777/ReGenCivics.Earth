# Safari + Mobile Compatibility Audit (2026-06-26)

Static code audit of the ReGen Civics frontend (`client/src`, 533 TS/TSX files, Vite + React 19, build target `es2020`) for how the site behaves on Safari and iOS, which is the primary user experience. Method: full read of the global stylesheets plus two exhaustive ripgrep-driven sweeps of the component tree (JS/Web-API compatibility, and mobile UX / media / forms). Every finding below was confirmed against source. No code was changed.

## How to read this

Severity reflects real impact on a current iOS Safari user, not theoretical spec deviation:

- **Critical**: breaks a visible feature for users on current iOS.
- **High**: breaks for a meaningful slice (older iOS, specific devices) or degrades a core flow.
- **Medium**: degraded experience, lost optimization, or fragile pattern.
- **Low / informational**: inert-but-guarded, or only affects very old iOS.

Each item has file:line, what happens on Safari/iOS, and the recommended fix. A "Verified good" section at the end lists patterns that are already correct so they do not get re-litigated.

The headline: the foundation is genuinely Safari-aware. The viewport meta is correct, the shadcn `Input`/`Textarea` primitives already use 16px on mobile to avoid focus-zoom, the main dialog has real `visualViewport` keyboard handling with safe-area insets, native autoplay videos mostly carry `muted playsInline`, the globe has a WebGL fallback, and `superjson` on the tRPC wire means the hundreds of `new Date(record.createdAt)` calls receive real `Date` objects rather than Safari-fragile strings. The genuine risks are narrow and concentrated in the items below.

---

## Critical

### CR-1. Walkthrough video has no `playsInline` and no `muted` (autoplay blocked / fullscreen hijack)

`client/src/components/QuestHowToVideoModal.tsx:103` renders `<video controls autoPlay preload="metadata">` with no `playsInline` and no `muted`. On iOS, autoplay without `muted` is blocked outright, and a `<video>` that does begin playing without `playsInline` is forced into the native fullscreen player, throwing the user out of the modal. The "how to play" walkthrough either never starts or yanks the user fullscreen.

Fix: add `playsInline`. If it must start on open, add `muted`; otherwise drop `autoPlay` and let the user tap play, which is the safest iOS pattern.

### CR-2. Quest media video missing `playsInline` (forces fullscreen on play)

`client/src/components/QuestTier3Media.tsx:55` renders a direct `<video src controls preload="metadata" poster>` with no `playsInline`. On iOS, tapping play forces fullscreen instead of inline playback inside the quest media block.

Fix: add `playsInline`.

### CR-3. Crowd-pooling deadline parse returns Invalid Date on Safari

`client/src/pages/CrowdPoolingProjects.tsx:321`, inside `parseDeadline`, falls back to `new Date(\`1 ${deadline}\`)` for "June 2026"-style strings. `new Date("1 June 2026")` is a non-standard format: V8/Chrome tolerates it, Safari/iOS frequently returns `Invalid Date`. The countdown badge (`daysLeft`, line 326) then renders nothing or NaN on iPhones. This is the single most likely real Safari date breakage because the input is a free-form display string, not a `superjson` `Date`.

Fix: parse "Month YYYY" explicitly (map month name to index, build with `new Date(year, monthIndex, 1)`). The codebase already uses this safe pattern in `lib`/`Schedule.tsx` and `AMABanner.tsx`.

### CR-4. Hand-rolled full-screen overlays do not lock body scroll (iOS scroll-bleed)

iOS Safari scrolls the page behind a `position: fixed` overlay when the user drags on the backdrop. The Radix-based dialogs/sheets handle this, but these hand-rolled `fixed inset-0` overlays do not set `body { overflow: hidden }` on mount:

- `client/src/components/game/GratitudeDrawer.tsx:34`
- `client/src/components/ProgressMap/ProgressMap.tsx:32` (full-screen map, `z-[100]`)
- `client/src/components/QuestHowToVideoModal.tsx:65`
- `client/src/components/ExitIntentCapture.tsx:220`
- `client/src/components/CommandPalette.tsx:133`
- `client/src/components/QuestDetailModal.tsx:497`
- `client/src/components/OnboardingWizard.tsx:373`

Good reference already in the codebase: `client/src/components/MobileMoreMenu.tsx:75` locks and restores correctly.

Fix: add a mount/unmount `useEffect` that sets `document.body.style.overflow = "hidden"` and restores it on close (ideally preserving scroll position). The most user-facing are GratitudeDrawer and ProgressMap.

---

## High

### H-1. Forum auto-linker uses regex lookbehind: SyntaxError crash on iOS 16.3 and earlier

`client/src/components/ForumMarkdown.tsx:169` uses `/(?<!\]\(|<)(https?:\/\/[^\s\)\]>]+)/g`. Negative lookbehind shipped in Safari 16.4 (March 2023). A regex literal is parsed at module-evaluation time, so on iOS 15.x and 16.0 to 16.3 this throws a `SyntaxError` when the module loads, which can white-screen the forum (and anything importing `ForumMarkdown`). This is a hard parse error, not a runtime fallback. Given Safari is the primary platform and a slice of users may still be on iOS 15 / early 16, this is worth removing.

Fix: rewrite without lookbehind. Tokenize markdown links first, then linkify the remainder; or capture the preceding character in a group and re-emit it.

### H-2. Globe canvas never clamps `devicePixelRatio` (can crash iPhones)

`client/src/components/GlobeMap.tsx:1044` sizes the globe.gl / three.js renderer via `.width(w).height(h)` with no DPR clamp. On a retina iPhone (DPR 3) the backing store renders at 9x the pixel count. Combined with iOS Safari's roughly 16M-pixel canvas cap and tight WebGL memory budget, the globe on `/connect` can blank out, lose its WebGL context, or crash the tab.

Fix: clamp the renderer after init, for example `globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 2))`.

### H-3. Raw inputs with `text-sm` trigger iOS focus-zoom (including the sign-in field)

The project bumps `.text-sm` to 15px to dodge iOS focus-zoom, but that override is scoped to `min-width: 768px` only (`client/src/index.css:282`). So any raw input/textarea that sets `text-sm` (14px) zooms the viewport on focus on phones:

- `client/src/components/AuthDialog.tsx:200` is the primary email sign-in field, inside a bottom-sheet dialog, with `text-sm`. It zooms on focus. It also lacks `autoComplete="email"` and `enterKeyHint="go"`.
- `client/src/components/game/GratitudeDrawer.tsx:77` is the message `<textarea>` with `text-sm`. It zooms, and this modal has no keyboard handling (see H-5), so the keyboard also covers the field.

Fix: give these raw fields `text-base` (16px) on mobile, or inline `style={{ fontSize: 16 }}`, matching the shadcn primitive pattern. The shadcn `Input`/`Textarea` primitives are already correct.

### H-4. Unguarded `navigator.clipboard.writeText` rejects on iOS (unhandled rejection, silent copy failure)

iOS Safari requires a secure context and an unbroken user-gesture chain for `clipboard.writeText`, otherwise the promise rejects. These user-facing call sites have no try/catch and no feature-detect, so they fail silently and throw unhandled rejections when the gesture chain breaks:

- `client/src/pages/EventDetail.tsx:86`
- `client/src/pages/CrowdPoolingProjects.tsx:565` and `:648`
- `client/src/pages/GameMechanics.tsx:754`, `:774`, `:1272`
- `client/src/pages/CommunityPost.tsx:275`
- `client/src/pages/Quest.tsx:132`
- `client/src/components/RolePortalCard.tsx:92`
- `client/src/components/SharePanel.tsx:32`, `:39`

(Admin-only, lower real-user impact: `BionomicsEdit.tsx:109`, `AdminImageStudio.tsx:82`, `admin/AdminEventsTab.tsx:379`, `Admin.tsx:4336`, `AdminSimpleTabs.tsx:80`, `EmailSettings.tsx:328`.)

The correct pattern already exists in `client/src/components/CopyLinkButton.tsx:17` (try/catch plus `document.execCommand('copy')` fallback). Several components already do this right: `PlayerProfile.tsx`, `ShareButton.tsx`, `ShareButtons.tsx`, `ContributionCalculator.tsx`, `SharePrompt.tsx`, `SoundPlayer.tsx`.

Fix: route all copy actions through one shared `copyToClipboard()` helper with the execCommand fallback.

### H-5. GratitudeDrawer uses `60vh` and has no keyboard handling

`client/src/components/game/GratitudeDrawer.tsx:42` caps the panel with `style={{ maxHeight: "60vh" }}`. On iOS, `vh` is the large viewport height and does not shrink when the keyboard appears, so when the user types the gratitude message the panel does not lift and the textarea plus Send button hide behind the keyboard.

Fix: use `dvh` and add a `visualViewport` lift, mirroring what `client/src/components/ui/dialog.tsx:111` already does correctly.

### H-6. `min-font-size: 14px` is not a real CSS property (the readable-size floor is not enforced)

`client/src/index.css:274` declares `p, li, span, td, th, label, a { min-font-size: 14px; }`. `min-font-size` is not a standard property and does nothing in any browser. The intended "nothing below 14px" floor is therefore not enforced, so the many `text-[10px]` and `text-[11px]` labels across the app (Bionomics, BridgeHypha, Admin, Community pages, AllocationCalculator) render at their literal tiny sizes on phones.

Fix: remove the dead rule and set real minimum sizes on the specific small-label utilities that need them.

---

## Medium

### M-1. OKLCH theme colors have no fallback (iOS below 15.4 renders unstyled)

The entire color system in `client/src/index.css:154` onward, plus `.hero-gradient-shift` at `:2349`, is defined in `oklch()`. Safari added `oklch()` in 15.4 (March 2022). On iOS 15.0 to 15.3 every color token resolves to nothing, so text, buttons, and surfaces lose their color. Modern iOS is fine; this only matters if you support pre-15.4.

Fix (only if older iOS matters): provide hex fallbacks before the `oklch()` declarations, or accept 15.4 as the floor and document it.

### M-2. `content-visibility: auto` on every image

`client/src/index.css:773` sets `img { content-visibility: auto; }`. Safari only shipped `content-visibility` in 18, so on older iOS it is a no-op. On Safari 18+ it applies to all images, and `content-visibility: auto` on images that lack explicit `width`/`height` can cause layout shift and occasional blank frames during fast scroll.

Fix: scope it to specific long lists rather than all `img`, and make sure those images carry intrinsic dimensions.

### M-3. `background-attachment: fixed` on `.season-tint` is unguarded on mobile

`client/src/index.css:2048` applies `background-attachment: fixed` to `.season-tint` with no viewport guard. iOS Safari has long-standing broken and janky behavior for fixed background attachment: it does not actually fix and can cause repaint jank. The parallax hero at `:2163` is correctly scoped to `min-width: 768px`, but `.season-tint` is not.

Fix: gate `.season-tint`'s fixed attachment behind `min-width: 768px` as well, or use a fixed-position pseudo-element layer instead.

### M-4. Touch targets below 44x44px on frequently-tapped icon controls

iOS guideline is 44x44px. These are smaller:

- `client/src/components/NotificationBell.tsx:143` delete button, roughly 20px
- `client/src/components/CampaignImageUpload.tsx:263` dismiss X, roughly 24px
- `client/src/components/AMABanner.tsx:72` dismiss, roughly 24px
- `client/src/components/ExitIntentCapture.tsx:239` close X, roughly 20px
- `client/src/components/game/GratitudeDrawer.tsx:47` close X, roughly 20px
- `client/src/components/GlobeMap.tsx:1526` sidebar toggle, roughly 32px
- `client/src/components/MarkdownToolbar.tsx:250` a full row of format buttons, roughly 28px (22px compact)
- `client/src/components/QuestHowToVideoModal.tsx:81` close, roughly 32px

Note: the global `@media (pointer: coarse)` rule at `index.css:1165` adds a 44px `::after` hit area to `button` and `[role="button"]`, which helps, but it does not apply where the control is an icon inside a non-button element, and it can also cause adjacent small buttons to overlap and mis-tap.

Fix: wrap small icon controls in a `min-h-11 min-w-11 inline-flex items-center justify-center` hit area; the icon can stay visually small.

### M-5. Radix tooltips have no touch equivalent

`client/src/components/ui/tooltip.tsx` uses Radix Tooltip, which is hover/focus driven and does not open on a plain tap on iOS. Anywhere a tooltip is the only source of a label or explanation (for example `HelpTooltip.tsx`), touch users cannot reach it.

Fix: on touch, use a tap-to-open Popover, or render the same text inline.

### M-6. Missing mobile-keyboard affordances on key forms

Several raw email/tel inputs have the correct `type` but omit `autoComplete` and `enterKeyHint`, which weakens iOS autofill and the keyboard submit affordance:

- `client/src/pages/LOI.tsx:181` (email), `:194` (tel)
- `client/src/pages/Checkin.tsx:97` email (also `autoFocus`, which on iOS will not raise the keyboard without a user gesture, so the field looks focused but no keyboard appears)
- Confirm the same on `client/src/pages/Connect.tsx`, `Schedule.tsx`, `InvestorForm.tsx`

These raw inputs set no font-size class, so they inherit the 16px base and do not zoom: the issue here is autofill and keyboard quality, not zoom. Good reference: `CrowdPoolingTool.tsx` and `LocationPicker.tsx` already use `inputMode="numeric"/"decimal"` correctly.

Fix: add `autoComplete` (`email`, `tel`, `name`), `inputMode`, and `enterKeyHint` to these fields; drop the no-op `autoFocus` on Checkin.

### M-7. Heavy `backdrop-filter` blur on glass panels is a mobile performance drain

`client/src/index.css:1231` and the mobile media query at `:1292` push `.glass-panel` to `blur(28px) saturate(1.3)`. Backdrop blur is GPU-expensive on iOS, especially on older iPhones and when the panel is large or animated. The prefixing is correct (`-webkit-backdrop-filter` is present everywhere); the concern is scroll/animation jank, not breakage.

Fix: reduce blur radius on mobile, or cap how many glass panels render at once on small screens.

### M-8. `overflow-x: hidden` on `html, body` can disable `position: sticky` descendants

`client/src/index.css:2198` sets `html, body { overflow-x: hidden }` (and an earlier rule at `:235` uses `overflow-x: clip`). Setting overflow on the root can establish a scroll container that silently disables `position: sticky` on descendants in Safari. This is a deliberate horizontal-overflow safety net, but it is worth confirming no sticky headers or sticky sub-navs depend on the document scroller.

Fix: verify sticky elements still stick on iOS; if any break, move the overflow guard to a wrapper rather than `html, body`.

### M-9. `.webp` images without a `<picture>` fallback

Widespread bare `<img src="...webp">` (role and season art, tool logos, economy diagrams in `gameRoles.ts`, `seasons.ts`, `Bionomics.tsx`). Safari 14+ supports webp, so this is fine for the stated target, but it is a hard floor: iOS 13 and earlier show broken images. No `.avif`-without-fallback was found, which is good (that would have been higher severity).

Fix (optional): wrap the few hero/critical images in `<picture>` with a PNG/JPG source.

### M-10. Date-only ISO literals in admin views (timezone display fragility)

`client/src/components/admin/AdminApplicationsTab.tsx:133` and `admin/AdminOverviewTab.tsx:467` use `new Date("2024-01-01")`-style literals for season boundaries. These parse as UTC midnight consistently across browsers, and here they feed `getTime()` comparisons so they are internally consistent and safe. The fragility is only if anyone later `.toLocaleDateString()`s them (a viewer west of UTC sees the prior day). Admin-only, low user impact.

Fix (if touched): use `new Date(2024, 0, 1)` for local intent, or format with `timeZone: 'UTC'`.

---

## Low / informational

- **Smooth scroll** (`scrollIntoView`/`scrollTo({behavior:'smooth'})`, ~40 sites): supported on Safari 15.4+. On iOS 15.0 to 15.3 it falls back to an instant jump, no break. `ScrollToTop.tsx:24` uses `behavior:"instant"`, which is fine.
- **`navigator.connection`** (`hooks/useReducedMotion.ts:13`, `VideoPreviewCard.tsx:48`): the Network Information API does not exist on Safari. Both sites guard with a null check, so no break; the "skip on slow connection" optimization simply never fires on iOS. Use the `prefers-reduced-data` media query if that behavior matters.
- **`navigator.vibrate`** (`SmartBottomNav.tsx:67`): absent on iOS, correctly guarded, no haptic on iOS and no web workaround exists.
- **`requestIdleCallback`** (`pages/Home.tsx:185`): guarded; Safari only added it in 18.4, so a preload does not fire on older iOS. Consider a `setTimeout` fallback so the preload still happens.
- **`fetch({ keepalive: true })`** (`lib/analytics.ts:79`): Safari 16.4+; wrapped in try/catch, degrades silently on iOS 16.3 and earlier.
- **`crypto.randomUUID`** (`lib/analytics.ts:36`): uses optional chaining with a `Math.random` fallback. Safe.
- **Scroll-driven animations** (`index.css:2493`, `animation-timeline: scroll()/view()`): not yet in stable Safari. Correctly gated behind `@supports not (animation-timeline: scroll())` plus reduced-motion, so they no-op gracefully.
- **`@property --quest-angle`** (`index.css:568`) and **`@view-transition`** (`:2408`): Safari 16.4+ and 18+ respectively; both degrade to a static no-op on older iOS.
- **`100vh` static spots**: `main.tsx:211` (no-JS error fallback) and the `index.html` loading placeholder. Low impact, both are pre-app static screens. The app body otherwise uses `min-h-screen` and `dvh`.
- **YouTube `autoplay=1` iframes** (`BlogPost.tsx:306`, `RegenIntroGate.tsx:64`, `CrowdPoolingProjects.tsx:801`/`:1049`): iOS ignores the autoplay param for unmuted iframe video. These are click-to-load, so impact is minor; the autoplay param is effectively a no-op on iOS.
- **Hover-reveal affordances**: `QuestProgressTracker.tsx:234` reveals a remove control via `hidden group-hover:block`, which is unreachable on touch. Provide an always-visible or tap-toggled control.
- **`pages/Governance.tsx`** carries trailing NUL-byte padding after its valid closing brace (the truncation artifact `scripts/audit-truncation.py` checks for). Not a Safari issue, but flagged because the file is dirty and the ship gate cares about it.

---

## Verified good (already correct, do not re-litigate)

- Viewport meta in `index.html`: `width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover`, plus `apple-mobile-web-app-capable` and `black-translucent` status bar. Correct, and `maximum-scale=5` preserves accessibility zoom.
- shadcn `Input`/`Textarea`/`SelectTrigger` use `text-base` (16px) with `md:text-sm`, plus `min-h-[44px]`: no focus-zoom, good touch height.
- `client/src/components/ui/dialog.tsx` has real `visualViewport` keyboard lift, `max-h-[calc(100dvh-2rem)]`, and `pb-[max(1.5rem,env(safe-area-inset-bottom))]`. This is the exemplary iOS pattern.
- `SmartBottomNav`, `MobileTabBar`, and `StickyThumbCta` all honor `env(safe-area-inset-bottom)` for the notch/home-indicator.
- Native autoplay videos in `Land.tsx`, `Play.tsx`, `QuestStoryDetailModal.tsx`, `ViewportTriggeredVideo.tsx`, `VideoPreviewCard.tsx`, `VideoEmbed.tsx` all carry `muted playsInline` and `.catch()` the play promise. (The two exceptions are CR-1 and CR-2 above.)
- `contexts/AudioContext.tsx` only autoplays after a user gesture and `.catch()`es every `.play()`. `SoundPlayer.tsx` handles the iOS "audio.volume is read-only" quirk explicitly.
- `GlobeMap` feature-detects WebGL and renders an accessible fallback table. (Only gap is the DPR clamp, H-2.)
- `superjson` transformer on the tRPC client means timestamp columns arrive as real `Date` objects, so the large volume of `new Date(record.createdAt)` calls is not a Safari liability.
- `matchMedia` listeners use the modern `addEventListener('change')`; `ParallaxSection.tsx` even falls back to `addListener` for old Safari.
- IntersectionObserver / ResizeObserver / MutationObserver usages are feature-detected.
- `navigator.share`, `navigator.geolocation`, `serviceWorker`, and `EventSource` are all feature-detected with fallbacks.
- `index.css` is not truncated (the ripgrep "binary file" warning is a false positive from a multibyte unicode-range sequence; a byte scan confirmed zero NUL bytes). Confirmed independently by both audit passes.
- `prefers-reduced-motion` is respected comprehensively across the animation layer, and `touch-action: manipulation` plus `-webkit-tap-highlight-color` are set globally.

---

## Suggested fix order

1. CR-1, CR-2: add `playsInline` to the two videos (one-line each, breaks playback today).
2. CR-3: fix the deadline parser (visible broken countdown on iPhones).
3. CR-4: add body scroll-lock to the seven overlays (GratitudeDrawer and ProgressMap first).
4. H-2: clamp the globe DPR (can crash iPhones on `/connect`).
5. H-3: 16px on the AuthDialog sign-in field and GratitudeDrawer textarea.
6. H-1: remove the lookbehind regex (hard crash on iOS 16.3 and earlier).
7. H-4: route clipboard copies through one guarded helper.
8. H-5, H-6, then the Medium items as capacity allows.

Items M-1 through M-10 are degradations or fragile patterns rather than live breakages; address them by impact. The Low list is mostly inert-but-guarded code that needs no change.

---

## Supplementary sweep (round 2)

The first pass focused on CSS, JS/Web APIs, video, and forms, and it caught Radix tooltips (M-5) but missed three touch-interaction patterns that a parallel audit surfaced in the governance components. This round swept the whole tree for those patterns. They are real gaps, added here.

### Three categories the first pass under-covered

The first pass treated "tooltips on touch" as a Radix-only problem. The bigger version is the plain HTML `title` attribute used as a tooltip, which shows only on mouse hover and is therefore invisible on every phone. The first pass also did not look at faint-text contrast or hover-only reveal of controls at all. Both matter on a phone, especially outdoors, and this project already audits contrast.

### S-CR-1. Admin Kanban drag-and-drop does not work on touch at all

`client/src/components/AdminKanban.tsx` (drag wiring at `:55`, `:81`, `:101`, `:143`, `:177`, `:211`) uses native HTML5 drag-and-drop (`draggable`, `onDragStart`, `onDragOver`, `onDrop`, `dataTransfer`). HTML5 DnD does not fire on iOS Safari touch, so cards cannot be moved on a phone or tablet, and there is no tap-to-move fallback. Admin-only, so user impact is limited, but it is fully broken on touch.

Fix: add a pointer/touch DnD library (for example dnd-kit) or a tap-select-then-tap-column fallback.

### S-H-1. HTML `title=` as the only tooltip (invisible on touch), 41 native-element usages

The `title` attribute only appears on hover. On a phone, any information conveyed only through `title=` is unreachable. The worst cases are icon-only buttons whose `title` is the only label and which also lack an `aria-label`, so the control is unlabeled for both touch users and screen readers.

Highest-traffic unlabeled icon buttons (add `aria-label`, several are destructive):

- `client/src/pages/CommunityPost.tsx`: `:494` "Flag this content", `:532` "Edit post", `:541` "Delete post", `:627` "Promote this thread to a formal Loomio decision" (the only explanation of that governance action), `:667` "Copy link to post", `:856` "Mark that you tried this", `:887` "Flag this reply"
- `client/src/components/CampaignImageUpload.tsx:302` "Set as cover image", `:312` "Remove image"
- `client/src/pages/Community.tsx:688` "Edit category"
- `client/src/components/AdminAIAssistant.tsx:221`, `KnowledgeMapAdminPanel.tsx:112`, `admin/AdminAutomationsPanel.tsx:82` and `:85`, `QuestProgressTracker.tsx:261`, `CalculatorWeightsSheet.tsx:850`

Tooltips that carry unique instructional or financial info that is lost on touch even where `aria-label` exists (surface this text inline or as a tap-reveal popover on mobile):

- `client/src/pages/GameMechanics.tsx:839`, `:851`, `:859`, `:866`, `:874`, `:881` simulator toolbar buttons with long "what this does" titles
- `client/src/components/profile/TokenDetailDialog.tsx:216`, `:248`, `:258` claim-cancel, gas-saving bundle, and claim-threshold explanations (financial guidance, hover-only)
- `client/src/components/governance/GovernanceLifecycleStrip.tsx:137` reversibility explanation (the original finding)
- `client/src/components/governance/PerspectiveControl.tsx:123` per-segment percentage on the tally bar

Info-bearing `title` on non-button elements (heat-map cells, rings, chips) where the data is hover-only: `ContributionTimeline.tsx:47`, `pages/CampaignAnalytics.tsx:215`, `SeasonProgressRing.tsx:33`, `RolePortalCard.tsx:47` and `:58`, `VouchSection.tsx:75`, `pages/CrowdPoolingProjects.tsx:460`, `profile/TokenBox.tsx:66`.

Correct usage, no action: iframe `title=` is an accessibility attribute, not a hover tooltip (`VideoEmbed.tsx`, `RegenIntroGate.tsx:65`, `QuestTier3Media.tsx:46`, the blog/crowd-pooling embeds). Component props named `title` (`<SEO title>`, `<Section title>`) are also not HTML titles.

Fix: give every icon-only control a matching `aria-label`; keep `title` for desktop if you like, but `aria-label` is what restores the label for touch and screen readers. Where the `title` carries explanation not shown anywhere else, render that text inline on mobile or behind a tap-to-open popover.

### S-H-2. Faint low-contrast text on dark and translucent surfaces

Counts across the tree: `text-white/30` 13 occurrences, `text-white/40` 42 (about 16 are placeholders), `text-white/50` 18. At 30 to 40 percent white on the project's dark green and `bg-white/[0.02-0.05]` surfaces, informational text falls below WCAG AA and is much worse on a phone outdoors.

Information-bearing text at `/30` or `/40` to raise to about `/70`:

- `client/src/components/governance/GovernanceLifecycleStrip.tsx:115` future-stage labels (the original finding), and `:136`/`:143` at `/50` for the reversibility chip and "Revisits {date}"
- `client/src/components/governance/PerspectiveControl.tsx:159`, `:167` per-perspective tally counts
- `client/src/components/CitizenshipTierSidebar.tsx:149`, `:161`, `:166` tier description copy
- Empty-state instructions: `command/RecentFavoritesTab.tsx:18` and `:48`, `CommandPanel.tsx:166`
- `client/src/pages/PathPortalsSelector.tsx:155` the "tap to add" affordance text itself
- `client/src/components/profile/TokenDetailDialog.tsx:285`, `pages/PlayDetail.tsx` and `pages/PlaysLibrary.tsx` metadata, form helpers in `PlaySubmit.tsx` and `InvestorContact.tsx:221`

Form `<label>` elements rendered at `text-white/50` (should be at least `/70`): `client/src/pages/PlaySubmit.tsx:569`, `:587`, `:600`, `:685`.

Decorative icons, placeholders, and dividers at these tiers are lower priority but worth a light bump for outdoor legibility.

Fix: reserve `/30` to `/50` for genuine decoration; raise informational text to `/70` and body copy and form labels to `/80`. Worth checking against the project's `CONTRAST_AUDIT` standard.

### S-H-3. Hover-only reveal of controls and info (no tap or focus fallback)

- `client/src/pages/Apply.tsx:886` a `cursor-help` help bubble uses `opacity-0 group-hover:opacity-100` with `pointer-events-none` and no focus or tap handler, so the dietary-alignment explanation is completely unreachable on a phone.
- `client/src/components/HoverPreview.tsx:22` pure `onMouseEnter`/`onMouseLeave` with a 600ms timer and no touch handler, so the nav preview is dead on mobile.
- `client/src/components/QuestProgressTracker.tsx:234` the Reset control's label uses `hidden group-hover:block`, so on touch the button shows no label.
- `client/src/pages/Messages.tsx:713` and `profile/PlayerProfile.tsx:2267` delete buttons use `opacity-0 group-hover:opacity-100 focus:opacity-100`; reachable only after a focusing tap.

Good template already in the codebase: `client/src/components/CampaignImageUpload.tsx:301` uses `opacity-100 md:opacity-0 md:group-hover:opacity-100`, which keeps the control visible on mobile and only hides it behind hover on desktop. `SiteFooter.tsx`, `GratitudeButton.tsx`, and `MyceliumNetwork.tsx` (which adds `onTouchStart`/`onTouchEnd`) also handle this correctly.

Fix: make functional hover-revealed controls and info visible on touch (the `md:` pattern above), or convert to a tap-toggle.

### S-low. Default-on governance UI feels heavy on casual threads

`client/src/components/governance/GovernanceLifecycleStrip.tsx:71` does `governanceStage ?? "dialogue"`, so the four-stage strip and the "Ready to sense the room?" prompt render on every thread, including chit-chat. Not a bug, but it may feel heavy on ordinary threads. Consider keeping the strip quiet or hidden until a thread is actually near governance. (This is a product call, not a compatibility issue.)

### Checked and clean

No `onDoubleClick`-only or right-click-only affordances exist. Clickable card divs wrap real `<a>`/`<button>` elements rather than trapping clicks on bare divs. Interactive SVG nodes (`QuestArcMap.tsx`) correctly add `role="button"`, `tabIndex`, and `onKeyDown`. File-upload dropzones all expose a click-to-upload input, so they degrade gracefully on touch.

### Note on the first-pass miss

This round exists because the first pass scoped "tooltip on touch" too narrowly (Radix only) and did not audit contrast or hover-reveal at all. With this supplement the audit now covers HTML `title` tooltips, faint-text contrast, hover-only reveals, and touch-incompatible drag-and-drop alongside the original CSS/JS/video/forms findings.

---

## Supplementary sweep (round 3)

A third pass over categories none of the earlier passes touched: iOS sticky-hover, the iOS landscape text-inflation reset, viewport-height units in Tailwind, sticky positioning under the global overflow guard, input auto-capitalization, and native date pickers.

### S3-H-1. Custom hover classes are not gated behind `@media (hover: hover)` (iOS sticky-hover)

Tailwind 4 (this project is on `tailwindcss ^4.3.0`) already wraps its own `hover:` utilities in `@media (hover: hover)` by default, so the ~2189 `hover:` utility classes in TSX are fine. The problem is the hand-written hover rules in `client/src/index.css`, which are not gated: `.game-card:hover` (`:343`), `.btn-game:hover` (`:356`), `.hover-lift:hover` (`:653` and `:1957`), `.hover-scale:hover` (`:662`), `.hover-glow:hover` (`:670`), `.glass-panel-interactive:hover` (`:1104`), `.card-tilt:hover` (`:2252`), `.hover-shine:hover::before` (`:1726`), plus the `::before`/`::after` shine and underline sweeps (`.card-shine`, `.link-underline`, `.vine-corner`, `.hover-underline-gradient`, `.quest-card-gold:hover`, `.role-card-shimmer:hover`).

On iOS there is no hover, so tapping any element with these classes fires the `:hover` state and it sticks (the card stays lifted, scaled, or tilted) until the user taps elsewhere. The transform-based ones (`hover-lift`, `hover-scale`, `card-tilt`) are the most visible because the element stays displaced after a tap.

Fix: wrap these custom hover rules in `@media (hover: hover) and (pointer: fine) { ... }` so they only apply to devices with a real pointer. This matches what Tailwind already does for utilities.

### S3-M-1. Missing `text-size-adjust` reset (iOS inflates text in landscape)

`client/src/index.css` sets `-webkit-font-smoothing` on `body` but never sets `text-size-adjust`. On iOS Safari, rotating to landscape triggers automatic text inflation, so body copy can balloon to an unexpected size in landscape on iPhone.

Fix: add to the `html` rule: `-webkit-text-size-adjust: 100%; text-size-adjust: 100%;`.

### S3-M-2. No `autoCapitalize` / `autoCorrect` / `spellCheck` control on any text input

Zero occurrences of `autoCapitalize` or `autoCorrect` across the tree. iOS auto-capitalizes the first letter and runs autocorrect on `type="text"` inputs by default, which mangles identifier-style fields: invite/referral codes, slugs, usernames or handles, wallet addresses, URLs, and search queries. Email and tel inputs are handled by their `type`, but any free-text field that expects exact input is affected.

Fix: on code, slug, handle, address, and URL fields add `autoCapitalize="none" autoCorrect="off" spellCheck={false}` (and `autoCapitalize="characters"` where an all-caps code is expected). Audit the text inputs in the apply/connect/admin forms and any "enter code" field.

### S3-M-3. `position: sticky` usages should be verified against the global overflow guard

Thirteen `sticky top-*` usages, including the main nav (`client/src/components/Navigation.tsx:118`), `DashboardLayout.tsx:247`, `MobileTableOfContents.tsx:130`, `TableOfContents.tsx:60`, `CrowdPoolingProjects.tsx:742`, `CreateCampaign.tsx:858`, and others. Because `index.css:2198` sets `html, body { overflow-x: hidden }` (see M-8), there is a risk that sticky elements inside an intermediate `overflow-x: hidden` wrapper stop sticking on Safari. The root-level ones (nav) are generally fine; the in-page ones nested inside layout wrappers are the ones to confirm.

Fix: this is a verification item rather than a known break. On a real iPhone, confirm each sticky header/sidebar still sticks; if any fail, the cause is an overflow-clipping ancestor, and the fix is to remove overflow from that specific ancestor (not from `html, body`).

### S3-L-1. Tailwind viewport-height units use `vh`, never `dvh`/`svh`

149 `min-h-screen` and 2 `h-screen`, and zero `min-h-dvh`/`h-dvh`. `min-h-screen` resolves to `min-height: 100vh` (the large viewport on iOS), which is mostly harmless for a minimum height since content can exceed it. The 2 `h-screen` (fixed `height: 100vh`) are the real risk: on iOS the bottom of the content can sit under the URL bar or be cut off.

Fix: change the 2 `h-screen` usages to `min-h-[100svh]` or `h-dvh`. Optionally migrate full-page `min-h-screen` wrappers to `min-h-[100dvh]` for exactness; low priority.

### S3-L-2. `datetime-local` / `date` inputs need exact value format on iOS

The admin event and broadcast forms (`client/src/components/admin/AdminEventsTab.tsx:183`/`:188`/`:459`, `AdminBroadcastPanel.tsx:466`, `EmailTemplateSelector.tsx:422`, `pages/Admin.tsx:648`/`:4138`/`:4143`/`:4416`) bind `<Input type="datetime-local">` directly to a stored string. iOS renders the native picker and requires the value to be exactly `YYYY-MM-DDTHH:mm`; if the stored string carries seconds, a `Z`, or an offset, iOS shows an empty picker even though desktop Chrome fills it. Admin-only.

Fix: normalize the bound value to `YYYY-MM-DDTHH:mm` before passing it to the input.

### S3-L-3. No PWA standalone external-link handling

No `navigator.standalone` or `display-mode: standalone` link handling. In an installed iOS PWA, tapping an external link can break out of the standalone window. Low impact (installed-PWA users only).

### Checked and clean (round 3)

No native CSS nesting, `:has()`, or container queries in the stylesheet (nothing to polyfill). `overscroll-behavior` is used correctly in the modals (`MobileMoreMenu`, `QuestDetailModal`, `dialog.tsx`, `Navigation`). No `user-select: none` or `-webkit-touch-callout` traps on interactive elements. Mouse-move and parallax effects (`magnetic`, `card-tilt`, `PageBackground`, `ReadingProgressBar`) are desktop-only enhancements that simply do not fire on touch, which is acceptable.

### Coverage note

Across three passes the audit now covers: CSS layout and viewport units, OKLCH and feature-gated CSS, animations and reduced-motion, JS/Web-API compatibility (dates, observers, navigator APIs, clipboard, regex), video and audio autoplay, images and formats, forms and inputs (zoom, keyboard, autofill, native pickers, auto-capitalization), touch targets, scroll-lock and overscroll, sticky and fixed positioning, safe-area insets, HTML `title` tooltips, faint-text contrast, hover-only reveals and iOS sticky-hover, drag-and-drop on touch, the service worker, and PWA standalone behavior. Round 4 below adds the remaining surface.

---

## Final comprehensive sweep (round 4)

A four-agent parallel sweep over domains none of the earlier passes touched: auth/cookies/Safari ITP, mobile performance/memory/images, gestures/carousels/focus/VoiceOver/i18n, and CSS form-controls/embeds/security-headers. This round found two new Critical iOS breaks (the on-chain bridge popup and the missing focus traps) and a hero-image memory issue, alongside a large "verified Safari-correct" surface. Every load-bearing item below was confirmed against source.

### R4-CR-1. Hypha bridge opens the new tab after an `await`, which iOS Safari blocks

`client/src/pages/BridgeHypha.tsx:78` (`handleContinue`) and `client/src/components/profile/TokenDetailDialog.tsx:137` (`runClaim`) both `await` a tRPC mutation and then call `window.open(url, "_blank", ...)`. iOS Safari only honors `window.open` when it runs synchronously inside the original tap. After an `await` the gesture token is gone, so Safari silently blocks the popup. The user taps "Continue to Hypha" or "Claim", the mutation succeeds, and nothing opens. In the claim case the private balance is already debited at request time, so the user is left debited and stranded mid-bridge with no Hypha tab. This is the most consequential iOS break found, because the Hypha handoff is the primary on-chain path.

Fix: open a placeholder synchronously on tap and set its location after the await (`const w = window.open('about:blank'); ... if (w) w.location = url;`), or render the destination as a real `<a target="_blank" rel="noopener">` the user taps once the mutation resolves, or navigate in the same tab. The codebase's other `window.open` calls (Calendly, socials, share) fire directly in the click handler and are fine; only these two post-`await` cases break.

### R4-CR-2. `useFocusTrap` exists but is wired into zero overlays (VoiceOver cannot operate them)

`client/src/hooks/useFocusTrap.ts` is a complete, correct focus-trap hook, but a tree-wide search finds no component that imports it. Every hand-rolled overlay therefore opens without moving focus in, without trapping Tab, and without restoring focus on close, and the background is not marked `inert`/`aria-hidden`. Affected: `ExitIntentCapture.tsx:228` (auto-opens after 60s on mobile, `role="dialog" aria-modal="true"`), `game/GratitudeDrawer.tsx:34`, `QuestStoryDetailModal.tsx`, `RegenIntroGate.tsx`, `ShortcutHelpOverlay.tsx`, `NavCustomizeSheet.tsx`, and the other non-Radix `role="dialog"` overlays.

On iOS VoiceOver, opening one of these leaves the VO cursor on the inert page behind the scrim, so the user swipes through hidden background content and never reaches the dialog; on close, focus is lost to the top of the page. The Radix-based dialogs handle this correctly; these hand-rolled ones do not.

Fix: attach `useFocusTrap(isOpen)` to each custom dialog container and mark the app root `inert` while open, or migrate these overlays to the Radix Dialog/Sheet primitives already in the project. This pairs naturally with CR-4 (the same overlays also need body scroll-lock).

### R4-CR-3. Hero pages preload both the desktop and mobile background on phones

`client/src/components/HeroPageLoader.tsx:44` calls `images.forEach(src => { new Image().src = src })`, fetching every image in the array on every device. `client/src/pages/Home.tsx:195` passes both `home-desktop.webp` (1.77 MB) and `home-mobile.webp` (747 KB), so a phone downloads the 1.77 MB desktop image it never displays. This is also redundant with `index.html:54`, which already preloads the correct hero per breakpoint. The same pattern is on `Fund.tsx:138`, `Land.tsx`, `Ally.tsx`, `Play.tsx`.

On iOS this is the LCP path on the most-visited pages: roughly 2.5 MB of hero imagery on Home, and iOS decodes the full-resolution desktop bitmap into memory only to discard it, inflating the tab's footprint and making it a prime target for iOS's background-tab reload killer.

Fix: pick the single correct image with `window.matchMedia("(max-width:767px)")` before preloading; do not pass both variants into the loader.

### R4-H-1. Service worker caches authenticated `/api/` responses (`NetworkFirst`), including auth state

`vite.config.ts:37` runtime-caches `urlPattern: /\/api\//` with `NetworkFirst` and a 10s timeout, with no `cacheableResponse` filter. This matches `/api/trpc`, which carries the `auth.me` query that determines logged-in state, plus every other authenticated call. iOS Safari backgrounds tabs aggressively and has flaky cellular, so the 10s fallback to cache fires far more often than on desktop. A cached `me`/profile response can then replay a stale state: a user who logged out or whose cookie was purged by ITP can briefly see logged-in UI, or vice versa. Auth-state correctness on the primary platform.

Fix: do not runtime-cache authenticated API traffic. Switch `/api/trpc`, `/api/csrf-token`, `/api/oauth`, `/api/auth`, `/api/sse` to `NetworkOnly`, or narrow the cached pattern to a read-only `/api/public/` prefix. At minimum add `cacheableResponse: { statuses: [200] }`.

### R4-H-2. Animated particle layers are uncapped on mobile

`client/src/components/PageBackground.tsx` renders 20 to 30 absolutely-positioned particle divs per theme, each with an infinite CSS animation (ForestParticles 30 at `:77`, MagicParticles 30 at `:365`, and similar), and the comment at `:922` notes they were re-enabled on mobile and are gated only by `prefers-reduced-motion`. On top of that, `MycelialBackground` (13 pulsing SVG nodes with a `blur(1.5px)` filter) and `AnimationLayer` mount globally on every non-admin route (`App.tsx:432`). `index.css` carries 51 `infinite` animations. Many particles also animate `box-shadow` glow, which with `filter: blur` is among the most expensive things for the iOS compositor.

A default iPhone user (no reduced-motion) runs all of it at once: continuous GPU compositing, battery drain, scroll jank, and raised odds of a compositor/WebGL context loss or tab reload on older devices.

Fix: cap particle count on small viewports (for example one third below 768px), drop the per-particle `box-shadow` on mobile, and disable the `MycelialBackground` SVG blur below 768px.

### R4-H-3. No list virtualization; long lists render every row

No `react-window`/`react-virtual`/`useVirtualizer` anywhere. `client/src/pages/CommunityCategory.tsx:277` maps every post with `limit: 50` and no pagination, so 50 full post cards (each with avatars, badges, and images routed through `/api/img` plus IntersectionObservers) mount at once. Member directory, leaderboards, and project lists follow the same pattern. On iOS this is a heavy DOM with many live observers held in memory, which raises the background-tab reload risk and loses scroll position and in-memory state on reload.

Fix: virtualize the forum and directory lists (for example `@tanstack/react-virtual`) or switch to cursor-based infinite scroll that mounts a page at a time.

### R4-H-4. CreateCampaign range sliders have no `::-webkit-slider-thumb` (invisible thumb on iOS)

`client/src/pages/CreateCampaign.tsx:2593` (percent) and `:2659` (duration) set `appearance-none` plus `WebkitAppearance: 'none'` with a custom gradient track but define no `::-webkit-slider-thumb`. Once `-webkit-appearance: none` is set on a range input, Mobile Safari removes the native thumb and draws nothing unless you supply the webkit thumb pseudo-element, so the user sees a colored bar with no visible handle and a near-zero hit target. The percent slider has no numeric fallback. (`AllocationCalculator.tsx:134` uses `accent-color` and keeps the native thumb, which is the correct pattern.)

Fix: add `::-webkit-slider-thumb` (and `::-moz-range-thumb`) with a 24px-plus hit target, or switch these two to `accent-color`.

### R4-H-5. QuestCarousel bleeds to the left screen edge, colliding with iOS back-swipe

`client/src/components/QuestCarousel.tsx:102` gives the scroll row `-mx-4 px-4 overflow-x-auto snap-x`, so the track reaches viewport x=0, with `w-[85vw]` items and the arrows `hidden md:flex` (swipe is the only mobile nav). A horizontal scroller flush against the left edge competes with Safari's interactive back-swipe: swiping from the left edge can trigger browser-back instead of advancing the carousel.

Fix: keep a small left inset on mobile so the track does not reach x=0, or set `touch-action: pan-x` on the track and accept that the leftmost card edge is harder to swipe.

### R4-M-1. No `color-scheme` declared, so iOS renders native controls in light mode on the dark UI

No `color-scheme` (CSS property or meta) anywhere, while the UI is permanently dark. Without `color-scheme: dark`, iOS renders the intrinsic chrome of native `<select>` popovers, date/number spinners, scrollbars, and autofill bubbles assuming light mode, which looks mismatched and can be low-contrast. There are 35-plus raw native `<select>` elements (`Proposals.tsx:204`/`:214`, `LOI.tsx`, `Marketplace.tsx`, `PlayerProfile.tsx`, `ToolsLibrary.tsx`, `FeatureSuggestions.tsx`, and more), all styled `text-white bg-white/10` with `<option className="bg-[#1a472a]">`, and iOS ignores option-level colors in the native popover.

Fix: add `<meta name="color-scheme" content="dark">` to `index.html` and `:root { color-scheme: dark; }` in `index.css`. For the highest-traffic public selects, consider migrating to the shadcn `Select` (Radix popover), which renders identically on iOS.

### R4-M-2. globe.gl traps one-finger vertical scroll on the map page

`client/src/components/GlobeMap.tsx` mounts globe.gl with no `touch-action` or scroll passthrough, so a one-finger vertical drag that lands on the globe rotates it instead of scrolling the page. The globe is `50vh` on the full-page map, so a user scrolling past it can get stuck. Bounded (the page continues below) and there is a WebGL-off fallback table, so not Critical.

Fix: require two fingers to rotate, or constrain the globe so vertical drags pass through to the page.

### R4-M-3. RTL is set on `<html>` for Arabic but the layout is hard-coded LTR

`client/src/contexts/LanguageContext.tsx:55` sets `document.documentElement.dir` and Arabic is `dir:'rtl'` (`lib/i18n.ts:26`), but `isRTL` is never consumed and the UI uses directional Tailwind utilities (`-left-12`/`-right-12`, `right-0`, `pl-4`) with no logical `ps-`/`pe-`/`start-`/`end-` variants. A user who switches to Arabic on a phone gets RTL text inside an un-mirrored LTR layout (icons on the wrong side, drawers misplaced, arrows reversed).

Fix: either drop Arabic from the switcher until RTL is supported, or convert directional utilities to logical properties and consume `isRTL` for absolutely-positioned controls.

### R4-M-4. Responsive images: `srcset` is barely used, and some hidden desktop images are still fetched

The `/api/img` proxy is correct (it negotiates avif/webp from the `Accept` header, sets `Vary: Accept`, clamps width, resizes without enlarging). The gap is client-side: `srcset`/`sizes` appear in only 5 files, while ~133 `cdnImg(...)` call sites request a single width, so phones often receive desktop-sized images. Two concrete cases: `Home.tsx:340` renders a 792 KB desktop `village-map-scroll.webp` inside `hidden md:block`, and Tailwind `hidden` is `display:none`, which Safari does not reliably stop from fetching, so a phone may download it anyway; and many bare `<img>` lack `width`/`height`, which combines with the global `content-visibility: auto` (M-2) to cause layout shift.

Fix: use `<picture>` with `media`-scoped `<source>` for the breakpoint-specific images so only the matching one is fetched, add `srcset`/`sizes` (or a mobile `w=`) on full-bleed content images, and set intrinsic dimensions.

### R4-M-5. Client-side convenience state in storage is lost under ITP, causing surprise re-prompts on iOS

Several `*_authenticated` flags and pre-fill context live in localStorage/sessionStorage: `AdminModeration.tsx` (`moderation_authenticated`), `CreateCampaign.tsx` (`campaign_authenticated`), `Admin.tsx` (`admin_authenticated`), `InvestorContact.tsx`/`InvestorForm.tsx` (`investor_verified` split across both stores), and quest progress in `hooks/useQuestProgress.ts` with no server mirror. Safari ITP purges script-writable storage after 7 days of no interaction, so on iOS these vanish: admins and campaign creators get re-prompted, verified investors lose context and get bounced, and a returning player's quest history and game-intro reset. This is a UX degradation, not a security hole, because the sensitive surfaces also gate server-side on role and the real economic state lives in the server ledger.

Fix: treat these as ephemeral and acceptable to lose, and for the experiences that matter (investor context, quest progress) derive state from the server so storage is a cache rather than the source of truth.

### R4-M-6. Stacked backdrop-filter blur over large backgrounds

Beyond the `.glass-panel` blur in M-7, `PageBackground.tsx:894` applies a full-viewport `backdrop-filter: blur(2px) saturate(0.92)` glass layer over the multi-MB hero background when `glassOverlay` is set. Multiple stacked backdrop-filters over a large painted background are a known iOS GPU drain.

Fix: drop the full-screen glass overlay below 768px and keep only the gradient tint the code already computes.

### R4-low. Lower priority

- Contract and wallet addresses or raw token amounts rendered outside a horizontally-scrolling table have no global `overflow-wrap: anywhere`/`break-all` default; preventive, since the project's contract addresses may surface in cards (`Tokenomics.tsx`, future address displays).
- YouTube embeds at `?autoplay=1` lack `&playsinline=1` (`RegenIntroGate.tsx:64`, `CrowdPoolingProjects.tsx:801`/`:1049`); click-to-mount, so minor.
- `accent-color` is the styling mechanism for all raw checkboxes/radios/ranges (Safari 15.4+ floor); fine given the floor, controls remain functional below it.

### Verified Safari-correct (round 4, important)

- **Auth architecture is Safari-correct.** The JWT lives in an HttpOnly cookie and is never written to JS storage, so ITP purges cannot log a user out. Cookies use `SameSite=Lax` plus `Secure` with a production `Secure` fallback for the Apple `form_post` case (`server/_core/cookies.ts`), `Domain=.regencivics.earth` for correct session sharing across `regencivics.earth` and `gov.regencivics.earth`, and multi-variant clearing. OAuth `returnTo` round-trips through the server-side `state` param rather than sessionStorage, Apple `form_post` is handled server-side, and there is no popup-based OAuth, so Safari popup-blocking and storage partitioning are avoided. tRPC and SSE are same-origin with credentials.
- **CSP and headers are Safari-safe.** Per-request nonce with dynamic script injection reading `window.__NONCE__`; `frame-src`, `connect-src` (including `wss:`), and `img-src` cover every embed and origin actually used; `Permissions-Policy` does not disable any API the client needs; `COOP: same-origin-allow-popups` is correct for OAuth. No `strict-dynamic` reliance.
- **Bundle and code-splitting are strong.** Roughly 90 routes are `React.lazy`, globe.gl/three is dynamically imported only on `/map` and only after mount, recharts is lazy behind section expansion, and `manualChunks` is deliberate. None of the heavy libraries touch first paint for a typical mobile user.
- **Other good signals.** Fonts are unicode-range subset with `font-display: swap`; the image proxy does real format negotiation; embla carousel and the Radix `Slider` are touch-safe; wide data tables are wrapped in `overflow-x-auto`; the globe ships an accessible WebGL-off fallback table; native `<video>` in `VideoEmbed.tsx` sets `playsInline`.

### Correction: `index.css` is NOT truncated, and a note on disk-integrity findings

One round-4 agent reported `index.css` as truncated mid-file. That was a stale workspace-mount artifact: reading the real file (through line 2640-plus) shows it complete, with the Apply-form contrast override fully closed. No action needed. The same caveat applies to the earlier `Governance.tsx` NUL-padding note (M-5): the sandbox mount used for this audit can lag the real repo, so any disk-integrity finding here should be confirmed by running the project's own `python3 scripts/audit-truncation.py` against the actual working tree rather than trusted from this document. The functional Safari/mobile findings (CSS rules, component code, headers) were read from the real files and stand.
