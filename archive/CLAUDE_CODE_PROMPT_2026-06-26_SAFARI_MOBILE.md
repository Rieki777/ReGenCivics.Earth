# Claude Code Prompt: Safari + Mobile Fixes (2026-06-26)

## Context

Safari and iOS are the primary user experience for ReGen Civics. A four-pass static audit found the issues below. The full findings, with reasoning and file:line for every item, are in `SAFARI_MOBILE_AUDIT_2026-06-26.md` in the repo root. Read that audit first, then work the batches here in order. Batch 0 was added after the final sweep and is the highest priority.

Almost everything here is pure frontend code you can do autonomously. The only thing you cannot do is confirm the fixes on a real iPhone; that verification is Rye's, and it is listed in the Handoff Breakdown at the bottom. Do all the code first.

## Ground rules

- Follow the writing rules in `CLAUDE.md`: no em-dashes anywhere, including code comments.
- Run the Ship Gate (below) before marking any batch done. No "VERIFIED" without evidence.
- Keep changes surgical. Do not refactor unrelated code.
- For any new CSS class or `@keyframes` you add, grep that it exists in `client/src/` before claiming done (Ship Gate gate 2).
- Work batch by batch. Commit per batch with a clear message. Stop and report if a fix needs a product decision (the two flagged below).

## Ship Gate (run before each "done" claim)

```bash
python3 scripts/audit-truncation.py            # gate 1: no truncated/NUL-padded files
rg -g '*.css' '<new-class-you-added>' client/src/   # gate 2: per new className / @keyframes
pnpm typecheck                                  # gate 3: exit 0
```

---

## Batch 0 — Highest priority (found in the final sweep)

0a. **Hypha bridge `window.open` after `await` is blocked on iOS.** In `client/src/pages/BridgeHypha.tsx:78` (`handleContinue`) and `client/src/components/profile/TokenDetailDialog.tsx:137` (`runClaim`), the `window.open(url, "_blank", ...)` runs after an awaited mutation, so iOS Safari blocks the popup and the user is stranded (and in the claim case, already debited). Fix: open a placeholder synchronously on tap, then set its location after the await:
   ```ts
   const w = window.open("about:blank", "_blank", "noopener,noreferrer");
   try { const res = await mutateAsync(...); if (w && res.url) w.location.href = res.url; else if (w) w.close(); }
   catch { if (w) w.close(); }
   ```
   Or render the resolved URL as a real `<a target="_blank" rel="noopener">` the user taps. Verify on iOS that the Hypha tab opens.

0b. **Wire `useFocusTrap` into every hand-rolled overlay** (VoiceOver cannot operate them today). The hook at `client/src/hooks/useFocusTrap.ts` is complete but imported nowhere. Attach `useFocusTrap(isOpen)` to the dialog container, and mark the app root `inert` while open, for: `components/ExitIntentCapture.tsx:228`, `components/game/GratitudeDrawer.tsx:34`, `components/QuestStoryDetailModal.tsx`, `components/RegenIntroGate.tsx`, `components/ShortcutHelpOverlay.tsx`, `components/NavCustomizeSheet.tsx`, and the other non-Radix `role="dialog"` overlays. This is the same overlay set as Batch 1 item 4 (scroll-lock), so do both together, ideally via shared hooks.
   Evidence: each overlay imports `useFocusTrap`; focus enters on open and restores on close.

0c. **Hero pages preload both desktop and mobile backgrounds on phones.** `client/src/components/HeroPageLoader.tsx:44` preloads every image in the array. Pick the single correct one with `window.matchMedia("(max-width:767px)")` before preloading. Affects `Home.tsx:195`, `Fund.tsx:138`, `Land.tsx`, `Ally.tsx`, `Play.tsx`.
   Evidence: on a <768px viewport only the mobile hero is fetched.

0d. **Service worker caches authenticated `/api/` under `NetworkFirst`.** In `vite.config.ts:37`, change the `/api/` rule so authenticated traffic is `NetworkOnly` (`/api/trpc`, `/api/csrf-token`, `/api/oauth`, `/api/auth`, `/api/sse`), or narrow caching to a read-only `/api/public/` prefix, and add `cacheableResponse: { statuses: [200] }`. Prevents stale logged-in/out UI on iOS.

---

## Batch 1 — Critical (breaks on iOS today)

1. **`client/src/components/QuestHowToVideoModal.tsx:103`** — add `playsInline` to the `<video>`. It currently has `controls autoPlay preload="metadata"` with no `playsInline` and no `muted`, so on iOS it is either blocked or forced fullscreen. Add `playsInline`; also add `muted` if it must start on open, otherwise drop `autoPlay` and let the user tap play.
   Evidence: grep shows `playsInline` present on the element.

2. **`client/src/components/QuestTier3Media.tsx:55`** — add `playsInline` to the direct `<video>`.
   Evidence: grep shows `playsInline` on the element.

3. **`client/src/pages/CrowdPoolingProjects.tsx:321`** — fix `parseDeadline`. Replace the `new Date(\`1 ${deadline}\`)` fallback (returns Invalid Date on Safari) with explicit "Month YYYY" parsing: split into month name and year, map the month to an index, build `new Date(year, monthIndex, 1)`. Reuse the safe pattern already in `Schedule.tsx` / `AMABanner.tsx`.
   Evidence: a quick unit check that `parseDeadline("June 2026")` returns a valid Date; no `new Date(\`1 ${...}\`)` remains.

4. **Body scroll-lock on hand-rolled full-screen overlays.** Add a mount/unmount `useEffect` that sets `document.body.style.overflow = "hidden"` and restores it on close, for each of:
   - `client/src/components/game/GratitudeDrawer.tsx:34`
   - `client/src/components/ProgressMap/ProgressMap.tsx:32`
   - `client/src/components/QuestHowToVideoModal.tsx:65`
   - `client/src/components/ExitIntentCapture.tsx:220`
   - `client/src/components/CommandPalette.tsx:133`
   - `client/src/components/QuestDetailModal.tsx:497`
   - `client/src/components/OnboardingWizard.tsx:373`

   Copy the working pattern from `client/src/components/MobileMoreMenu.tsx:75`. Consider extracting a small `useBodyScrollLock(isOpen)` hook in `client/src/hooks/` and using it in all seven plus MobileMoreMenu.
   Evidence: each overlay imports/uses the lock; typecheck passes.

---

## Batch 2 — High (crashes, device hangs, core-flow breaks)

5. **`client/src/components/ForumMarkdown.tsx:169`** — remove the negative lookbehind `/(?<!\]\(|<)(...)/`. It throws a SyntaxError at module load on iOS 16.3 and earlier, which can white-screen the forum. Rewrite without lookbehind: tokenize markdown links first, then linkify the remaining bare URLs; or capture the preceding character in a group and re-emit it.
   Evidence: no `(?<` remains in the file; auto-linking still skips URLs already inside `](...)` and `<...>`.

6. **`client/src/components/GlobeMap.tsx:1044`** — clamp the renderer pixel ratio after globe init: `globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 2))`. Prevents WebGL context loss / tab crash on retina iPhones.
   Evidence: grep shows the setPixelRatio clamp.

7. **iOS input focus-zoom on raw `text-sm` fields.** Give these 16px on mobile (`text-base` with optional `md:text-sm`, or inline `style={{ fontSize: 16 }}`):
   - `client/src/components/AuthDialog.tsx:200` (the email sign-in field; also add `autoComplete="email"` and `enterKeyHint="go"`)
   - `client/src/components/game/GratitudeDrawer.tsx:77` (the message textarea)
   Evidence: neither field renders below 16px on a <768px viewport.

8. **Guard all `navigator.clipboard.writeText` calls.** Create one shared helper `client/src/lib/clipboard.ts` exporting `copyToClipboard(text): Promise<boolean>` with try/catch and a `document.execCommand('copy')` textarea fallback (copy the logic from `CopyLinkButton.tsx:17`). Route these unguarded call sites through it:
   - `pages/EventDetail.tsx:86`, `pages/CrowdPoolingProjects.tsx:565` and `:648`, `pages/GameMechanics.tsx:754`/`:774`/`:1272`, `pages/CommunityPost.tsx:275`, `pages/Quest.tsx:132`, `components/RolePortalCard.tsx:92`, `components/SharePanel.tsx:32`/`:39`
   - Admin (lower priority, same helper): `pages/BionomicsEdit.tsx:109`, `components/AdminImageStudio.tsx:82`, `admin/AdminEventsTab.tsx:379`, `pages/Admin.tsx:4336`, `components/AdminSimpleTabs.tsx:80`, `components/EmailSettings.tsx:328`
   Evidence: no bare `navigator.clipboard.writeText` remains outside the helper.

9. **`client/src/components/game/GratitudeDrawer.tsx:42`** — change `maxHeight: "60vh"` to `dvh`, and add a `visualViewport` keyboard lift mirroring `client/src/components/ui/dialog.tsx:111`, so the textarea and Send button stay above the iOS keyboard.
   Evidence: uses `dvh`; keyboard handling present.

10. **`client/src/index.css:274`** — remove the dead `min-font-size: 14px` rule (not a real property). Then enforce the intended floor where it matters: bump the genuinely tiny info-bearing labels (`text-[10px]`/`text-[11px]`) on mobile in the components listed in the audit (Bionomics, BridgeHypha, Community pages, AllocationCalculator) to at least 12-13px.
    Evidence: rule removed; spot-check that key small labels are >=12px on mobile.

---

## Batch 3 — Touch interaction (tooltips, hover-only, sticky-hover)

11. **Add `aria-label` to icon-only buttons whose only label is `title=`** (invisible on touch and to screen readers). Highest-traffic first:
    - `pages/CommunityPost.tsx`: `:494`, `:532`, `:541`, `:627`, `:667`, `:856`, `:887`
    - `components/CampaignImageUpload.tsx:302` and `:312`
    - `pages/Community.tsx:688`, `components/AdminAIAssistant.tsx:221`, `components/KnowledgeMapAdminPanel.tsx:112`, `admin/AdminAutomationsPanel.tsx:82` and `:85`, `components/QuestProgressTracker.tsx:261`, `components/CalculatorWeightsSheet.tsx:850`
    Keep `title` for desktop; the `aria-label` restores the label on touch.

12. **Surface hover-only explanatory text on mobile** (the `title`/hover content carries info shown nowhere else):
    - `components/governance/GovernanceLifecycleStrip.tsx:137` reversibility explanation
    - `components/profile/TokenDetailDialog.tsx:216`/`:248`/`:258` claim and gas-saving guidance
    - `pages/GameMechanics.tsx:839`–`:881` simulator toolbar button explanations
    Convert each to a tap-to-open Popover (shadcn) or render the sentence inline on `<md` screens.

13. **Hover-only revealed controls/info with no touch path:**
    - `pages/Apply.tsx:886` — the `cursor-help` bubble is `opacity-0 group-hover:opacity-100 pointer-events-none`; make it a tap-toggle popover or render inline.
    - `components/HoverPreview.tsx:22` — add `onTouchStart`/tap handling, or accept it as a desktop-only enhancement and ensure nothing critical is only there.
    - `components/QuestProgressTracker.tsx:234` — make the Reset label visible on touch (`opacity-100 md:opacity-0 md:group-hover:opacity-100`).
    - `pages/Messages.tsx:713` and `profile/PlayerProfile.tsx:2267` — apply the same `md:` pattern used in `CampaignImageUpload.tsx:301` so delete controls are visible on touch.

14. **Gate custom hover classes behind `@media (hover: hover) and (pointer: fine)`** in `client/src/index.css` so they do not stick after a tap on iOS. Wrap: `.game-card:hover` (`:343`), `.btn-game:hover` (`:356`), `.hover-lift:hover` (`:653`, `:1957`), `.hover-scale:hover` (`:662`), `.hover-glow:hover` (`:670`), `.glass-panel-interactive:hover` (`:1104`), `.card-tilt:hover` (`:2252`), and the `::before`/`::after` hover sweeps (`.card-shine`, `.hover-shine`, `.link-underline`, `.hover-underline-gradient`, `.vine-corner`, `.quest-card-gold:hover`, `.role-card-shimmer:hover`). Leave the reduced-motion blocks as they are.
    Evidence: the hover rules sit inside a `@media (hover: hover)` block; reduced-motion still overrides.

---

## Batch 4 — Contrast and readability

15. **Raise faint information-bearing text** to about `text-white/70` (form labels and empty-state instructions to `/80`). Check against the project `CONTRAST_AUDIT` standard. Targets from the audit:
    - `components/governance/GovernanceLifecycleStrip.tsx:115` (future-stage labels, `/30`), `:136`/`:143` (`/50` chips)
    - `components/governance/PerspectiveControl.tsx:159`/`:167` (tally counts, `/40`)
    - `components/CitizenshipTierSidebar.tsx:149`/`:161`/`:166`
    - `command/RecentFavoritesTab.tsx:18`/`:48`, `CommandPanel.tsx:166` (empty states)
    - `pages/PathPortalsSelector.tsx:155` ("tap to add")
    - `components/profile/TokenDetailDialog.tsx:285`, plus the `pages/PlayDetail.tsx` / `pages/PlaysLibrary.tsx` metadata and the `pages/PlaySubmit.tsx:569`/`:587`/`:600`/`:685` form labels (`/50`)
    Leave purely decorative icons/placeholders/dividers, or bump them one tier only.

16. **`client/src/index.css`** — add the iOS landscape text-inflation reset to the `html` rule: `-webkit-text-size-adjust: 100%; text-size-adjust: 100%;`.

---

## Batch 5 — Forms and inputs

17. **Add mobile keyboard affordances** to raw email/tel/text inputs that lack them: `autoComplete` (`email`/`tel`/`name`), `inputMode`, and `enterKeyHint`. Drop the no-op `autoFocus` on `pages/Checkin.tsx:97`. Cover `pages/LOI.tsx:181`/`:194`, `pages/Checkin.tsx:97`, and confirm `pages/Connect.tsx`, `pages/Schedule.tsx`, `pages/InvestorForm.tsx`.

18. **Add `autoCapitalize`/`autoCorrect`/`spellCheck` control** to identifier-style text fields (codes, slugs, handles, addresses, URLs, search): `autoCapitalize="none" autoCorrect="off" spellCheck={false}` (use `autoCapitalize="characters"` for all-caps codes). There are currently zero in the codebase; audit the apply/connect/admin forms and any "enter code" field.

19. **`datetime-local` value normalization** (admin): ensure the bound value is exactly `YYYY-MM-DDTHH:mm` before passing to `<Input type="datetime-local">`, or iOS shows an empty picker. Sites: `admin/AdminEventsTab.tsx:183`/`:188`/`:459`, `AdminBroadcastPanel.tsx:466`, `EmailTemplateSelector.tsx:422`, `pages/Admin.tsx:648`/`:4138`/`:4143`/`:4416`.

---

## Batch 6 — CSS polish and performance

20. **`client/src/index.css:2048`** — gate `.season-tint`'s `background-attachment: fixed` behind `@media (min-width: 768px)` (iOS renders fixed attachment poorly), matching how `.parallax-bg` is already scoped.
21. **`client/src/index.css:773`** — scope `content-visibility: auto` to specific long lists instead of all `img`, and ensure those images carry intrinsic `width`/`height`.
22. **`client/src/index.css:1292`** — reduce the mobile `.glass-panel` backdrop blur (currently `blur(28px)`), or cap how many glass panels render at once on small screens, to ease GPU load on older iPhones.
23. **The 2 `h-screen` usages** — change to `min-h-[100svh]` or `h-dvh` so content is not cut off under the iOS URL bar. (Leave the 149 `min-h-screen`; optional later migration to `min-h-[100dvh]`.)
24. **Clean `pages/Governance.tsx`** — it carries trailing NUL-byte padding. Re-save the file without the padding so `scripts/audit-truncation.py` passes. This is gate 1 of the Ship Gate anyway.

---

## Batch 7 — Lower priority

25. **Touch targets <44px** — wrap the icon controls listed in audit M-4 in a `min-h-11 min-w-11 inline-flex items-center justify-center` hit area (`NotificationBell.tsx:143`, `CampaignImageUpload.tsx:263`, `AMABanner.tsx:72`, `ExitIntentCapture.tsx:239`, `GratitudeDrawer.tsx:47`, `GlobeMap.tsx:1526`, `MarkdownToolbar.tsx:250`, `QuestHowToVideoModal.tsx:81`).
26. **Radix tooltips on touch** (audit M-5) — where a Radix tooltip is the only source of a label (`HelpTooltip.tsx`), provide a tap-to-open Popover on touch.
27. **`.webp` images** (audit M-9) — optionally wrap the few hero/critical images in `<picture>` with a PNG/JPG fallback for iOS 13.
28. **Admin date literals** (audit M-10) — only if touched, use `new Date(2024, 0, 1)` or format with `timeZone: 'UTC'`.
29. **`requestIdleCallback` fallback** (audit Low) — add a `setTimeout` fallback in `pages/Home.tsx:185` so the preload still fires on older iOS.

---

## Batch 8 — Final-sweep items (performance, gestures, forms, controls)

30. **Cap animated particles on mobile.** In `client/src/components/PageBackground.tsx` (particle arrays at `:77`, `:179`, `:251`, `:309`, `:365`, `:426`), reduce count on small viewports (for example `innerWidth < 768 ? Math.round(count/3) : count`) and drop the per-particle `box-shadow` glow on mobile. In `components/MycelialBackground.tsx`, disable the SVG `blur` filter below 768px. Eases GPU/battery load on iPhones.
31. **Virtualize long lists.** `pages/CommunityCategory.tsx:277` (and member directory, leaderboards, project lists) render every row. Add `@tanstack/react-virtual` or cursor-based infinite scroll so only a page mounts at a time.
32. **CreateCampaign range sliders.** `pages/CreateCampaign.tsx:2593` and `:2659` use `appearance-none` with no thumb. Add `::-webkit-slider-thumb` (and `::-moz-range-thumb`) with a >=24px hit area, or switch to `accent-color` like `AllocationCalculator.tsx:134`.
33. **QuestCarousel left-edge bleed.** `components/QuestCarousel.tsx:102` reaches viewport x=0 and conflicts with iOS back-swipe (arrows are desktop-only). Keep a small left inset on mobile, or set `touch-action: pan-x` on the track.
34. **Add `color-scheme: dark`.** Add `<meta name="color-scheme" content="dark">` to `client/index.html` head and `:root { color-scheme: dark; }` to `index.css`, so iOS renders native `<select>` popovers, spinners, and autofill in dark mode. Consider migrating the highest-traffic public native selects (`Proposals.tsx:204`/`:214`, `LOI.tsx`, `Marketplace.tsx`, `ToolsLibrary.tsx`, `FeatureSuggestions.tsx`) to the shadcn `Select`.
35. **globe.gl scroll trap.** `components/GlobeMap.tsx` rotates on one-finger vertical drag, trapping page scroll on `/map`. Require two fingers to rotate, or let vertical drags pass through.
36. **Responsive images.** Use `<picture>` with `media`-scoped `<source>` for breakpoint-specific images (the `hidden md:block` village map in `Home.tsx:340` is a 792 KB desktop image that phones may still fetch), and add `srcset`/`sizes` or a mobile `w=` to full-bleed content images. Set intrinsic `width`/`height` to curb CLS. Pairs with Batch 6 item 21.
37. **PageBackground full-screen glass blur.** `PageBackground.tsx:894` adds a full-viewport `backdrop-filter` over the hero. Drop it below 768px and keep the gradient tint.
38. **Address/amount wrapping (preventive).** Add `break-all`/`overflow-wrap: anywhere` to any element that renders a contract/wallet address or raw token amount outside a horizontally-scrolling table.
39. **YouTube inline (minor).** Add `&playsinline=1` to the `?autoplay=1` embed URLs in `RegenIntroGate.tsx:64` and `CrowdPoolingProjects.tsx:801`/`:1049`.

---

## Product decisions (do NOT code without Rye's call)

- **Governance strip default-on** (`components/governance/GovernanceLifecycleStrip.tsx:71`, `governanceStage ?? "dialogue"`): the four-stage strip and the "Ready to sense the room?" prompt show on every thread, including casual ones. Whether to keep it quiet/hidden until a thread is near governance is a product call. Flag it, do not change it.
- **`components/AdminKanban.tsx`** native HTML5 drag-and-drop does not work on iOS touch at all. Adding a touch DnD library (dnd-kit) or a tap-to-move fallback is a real change with design implications. Admin-only, so lower urgency. Flag and confirm scope before building.
- **Arabic / RTL** (`contexts/LanguageContext.tsx:55`, `lib/i18n.ts:26`): `dir="rtl"` is set but the layout is hard-coded LTR, so Arabic renders mirrored-broken. Either drop Arabic from the switcher until RTL is built, or invest in logical-property layout. Rye's call on which.
- **Client storage lost under ITP** (`useQuestProgress.ts`, the `*_authenticated` flags, investor context): whether to mirror quest progress and investor context to the server so they survive Safari's 7-day storage purge, or accept the re-prompt. Product call.

## Disk-integrity note

`index.css` is NOT truncated; an earlier sandbox read said so but the real file is complete. The only disk-integrity item to actually check is `pages/Governance.tsx` (Batch 6 item 24): confirm with `python3 scripts/audit-truncation.py` against the real working tree before assuming it needs a fix, since the audit's sandbox copy can lag the repo.

---

## OKLCH note (optional, only if supporting iOS < 15.4)

The whole color system uses `oklch()` with no fallback (audit M-1). iOS 15.0 to 15.3 would render unstyled. If that population matters, add hex fallbacks before the `oklch()` declarations; otherwise document 15.4 as the floor and skip.

---

## Handoff Breakdown

| Item | Owner | Why |
|---|---|---|
| Batches 0-8 code changes | Claude Code | Pure frontend edits, all autonomous. |
| Batch 0a Hypha popup fix | Claude Code | Code is autonomous; Rye must device-test the actual Hypha tab open on iOS. |
| Batch 0d service-worker cache rule | Claude Code | `vite.config.ts` edit, autonomous; verify auth state on a flaky connection. |
| Ship Gate (audit-truncation, className grep, `pnpm typecheck`) | Claude Code | Must pass before any "done" claim. Evidence in commit. |
| New `useBodyScrollLock` hook + `lib/clipboard.ts` helper | Claude Code | Standard refactor, autonomous. |
| Governance strip default-on decision | Rye `[HUMAN]` | Product call on when the strip should appear. |
| AdminKanban touch DnD scope | Rye `[HUMAN]` | Design decision (library vs tap-to-move); admin-only. |
| OKLCH fallback yes/no | Rye `[HUMAN]` | Depends on whether iOS <15.4 is supported. |
| Real-iPhone verification of every fix | Rye `[HUMAN]` | Static review and typecheck cannot confirm iOS rendering, scroll-lock, keyboard lift, sticky behavior, globe stability, or video playback. Test on a physical device (or BrowserStack) after each batch. |
| Deploy to Railway | Rye `[HUMAN]` | Requires repo push / Railway access. |

## Suggested commit sequence

One commit per batch, message form `fix(safari): <batch summary>`. Start with Batch 0 (the Hypha popup and focus traps are the most consequential iOS breaks), then push after Batch 0-2 so the critical fixes can be device-tested while you continue. After all batches, update `SHIPPED_LOG.md` with a one-paragraph entry pointing at `SAFARI_MOBILE_AUDIT_2026-06-26.md`, and move this prompt to `archive/` per the repo convention.
