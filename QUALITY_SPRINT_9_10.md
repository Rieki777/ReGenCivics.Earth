# Quality Sprint — 9/10 Minimum Across All Dimensions

**Date:** 2026-03-19
**Goal:** Bring regencivics.earth from its current quality scores to 9/10 minimum, 10/10 where achievable.
**Context:** A full audit was run on 2026-03-19. The site scores 7.5/10 overall — strong on features and infrastructure, with specific gaps in performance, security, and code quality.

---

## Current Scores vs. Targets

| Dimension | Current | Target | Priority |
|---|---|---|---|
| Feature completeness | 9/10 | 10/10 | Low — one gap |
| Code quality | 7/10 | 9/10 | High |
| Security | 7.5/10 | 10/10 | High |
| Performance | 7/10 (↑ after 2026-03-19 image/video pass) | 9/10 | High |
| Design/UX | 8/10 | 9/10 | Medium |
| Infrastructure | 8/10 | 9/10 | Medium |

---

## ~~Fix 111: Route-Based Code Splitting~~ — DONE

**Status: Already implemented.** All 61 pages use `React.lazy()` in `App.tsx`. `vite.config.ts` already has `manualChunks` splitting: `react-vendor`, `router`, `trpc-vendor`, `icons`, `framer-motion`, `recharts`, `streamdown`, `radix-ui`, `utils`, `sentry`, `visualization`. No action needed.

---

## Fix 111b: Remaining Performance Fixes (Performance: 6→8.5)

**What:** A full performance audit on 2026-03-19 identified these remaining issues after the initial image/video optimization pass (which compressed ~8MB from assets, cut video 74%, and deferred Sentry):

### Already done (2026-03-19):
- ✅ Video `clip-01-welcome.mp4`: 5.96MB → 1.53MB (H.264 CRF 28, `-movflags +faststart`)
- ✅ `VideoPreviewCard`: `preload="auto"` → `preload="none"`, poster frame, Network Information API skip on 2G/save-data
- ✅ `PathCardImage`: hover/activated image changed from `loading="eager"` to `loading="lazy"`
- ✅ Sentry: moved from static import to `window.load` dynamic import (removes 128KB from critical path)
- ✅ All images recompressed: quest WebPs ~70% smaller, OG images ~75% smaller, hero-bg-desktop 1.63MB→696KB, globe textures 90%+ smaller
- ✅ `clip-01-poster.webp` created (133KB) — poster frame shown while video buffers

### Still remaining:

**a) srcset on images (mobile savings: 50–80% per image)**

No image on the site uses `srcset` or `sizes`. Mobile users on poor connections download 1920px hero images. Fix:

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | In `PageBackground.tsx`: already uses separate mobile/desktop images via CSS — confirm this is working correctly (it is). No srcset needed here. |
| 2 | [CLAUDE CODE] | In `PathCardImage.tsx`: the CDN path card illustrations (`assets.regencivics.earth/...`) are served at 2048×2048 but displayed at 237×237px. Add `width="237" height="237"` attributes to prevent CLS. For srcset, would need smaller CDN variants — skip for now, width/height is the immediate win. |
| 3 | [CLAUDE CODE] | In `Navigation.tsx`: nav logo is a CDN PNG at 512×512 shown at 40×40px. Switch both logo `<img>` tags to use local WebP variants: `/images/logos/regencivics-logo-dark-transparent-rounded.webp` and add `width="40" height="40"` |
| 4 | [CLAUDE CODE] | In `SiteFooter.tsx`: footer logo uses `/images/logos/regencivics-logo-dark-transparent-rounded.png` — switch to `.webp` version (already exists at 84KB vs 211KB PNG). Add `width="56" height="56"`. |
| 5 | [CLAUDE CODE] | Grep for `<img ` across all TSX files — add `width` and `height` to any tag missing them (prevents CLS score penalty in Lighthouse). |

**b) fetchpriority on hero image — ALREADY DONE**
`index.html` already has `fetchpriority="high"` on both hero preload links. No action needed.

**Done when:** Navigation and footer logos use local WebP. All img tags have width+height. Lighthouse CLS score is 0 on homepage.

---

## ~~Fix 112: Animation Performance~~ — DONE (2026-03-19)

**Status: Done.** `useReducedMotion` hook created at `client/src/hooks/useReducedMotion.ts`. Applied to:
- ✅ `MycelialBackground.tsx`: returns null when reduced motion
- ✅ `MyceliumAnimation.tsx`: skips animation loop and canvas render
- ✅ `AnimatedSection.tsx` + `StaggeredContainer`: renders with final visible styles immediately (no transition)
- ✅ `ParallaxSection.tsx`: `backgroundAttachment: "scroll"` instead of `"fixed"` when reduced motion
- ✅ `useGlobalScrollReveal.ts`: immediately reveals all `data-reveal` elements when reduced motion

Animations still run on healthy mobile connections. Disabled only for `prefers-reduced-motion: reduce` or 2G/save-data connections. WCAG 2.1 criterion 2.3.3 satisfied.

---

## Fix 113: Image Optimization (Performance: +0.5)

**Status: Mostly done (2026-03-19).** PWA icons already converted to WebP. Video and images all compressed. Remaining items: width/height on img tags, LazyImage usage consistency, logo WebP swap (see Fix 111b above).

### Already done:
- ✅ All PWA icons (`icon-512`, `icon-192`, `apple-touch-icon`) converted to WebP — `index.html` and `manifest.json` already reference them
- ✅ All quest/return-card/OG/hero images recompressed (avg ~70% savings each)
- ✅ Hero video compressed 74%, preload="none", poster frame added
- ✅ `PathCardImage` hover image is now `loading="lazy"`

### Still needed:

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Add `width`/`height` to all `<img>` tags missing them (covered in Fix 111b step 5) |
| ~~2~~ | ~~DONE~~ | ~~In Blog.tsx, Community.tsx, Seasons.tsx~~ — Community.tsx: all 9 decorative background images now have `loading="lazy"` (2026-03-19). Blog.tsx images are inside `aspect-video` containers (no CLS). Seasons.tsx hero is `absolute inset-0` (no CLS). |
| 3 | [CLAUDE CODE] | Confirm `OptimizedImage.tsx` and `LazyImage.tsx` set `loading="lazy"` and `decoding="async"` by default (they already do per codebase inspection) |

---

## Fix 114: Security — CSRF Token Integration (Security: 7.5→9)

**What:** `generateCSRFToken()` and `validateCSRFToken()` exist in `server/_core/security.ts` but are wired to nothing. All forms (Apply, InvestorForm, Newsletter, LOI, CustomGameWaitlist, QuestSuggestions) are unprotected against cross-site request forgery.

**Done when:** All public form submissions validate a CSRF token. Token is set as a cookie on page load and validated server-side on mutation routes.

### Steps

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | In `server/_core/security.ts`, confirm `generateCSRFToken()` and `validateCSRFToken()` are exported and functional |
| 2 | [CLAUDE CODE] | Add `GET /api/csrf-token` endpoint in `server/index.ts` that sets an `HttpOnly, SameSite=Strict` cookie and returns the token in the response body |
| 3 | [CLAUDE CODE] | Create `client/src/hooks/useCsrfToken.ts` that fetches `/api/csrf-token` on mount and returns the token |
| 4 | [CLAUDE CODE] | Add tRPC middleware in `server/_core/trpc.ts` that validates the `x-csrf-token` header on all `mutation` procedures — skip validation for GET-equivalent queries |
| 5 | [CLAUDE CODE] | In `Apply.tsx`, `InvestorForm.tsx`, `Newsletter.tsx`, `LOI.tsx`, `CustomGames.tsx`, `QuestSuggestions.tsx`: call `useCsrfToken()` and pass token as `x-csrf-token` header in the tRPC client options |
| 6 | [CLAUDE CODE] | Write a test in `server/forms.test.ts` that submits a mutation without a token and expects a 403 |

---

## Fix 115: Security — Forum Content Sanitization (Security: 9→10)

**What:** User-generated content in forum posts and replies is rendered without running through `sanitizeInput()`. A user can post `<script>alert(1)</script>` or event handlers in post content.

**Impact:** XSS vulnerability. Flagged in the Feb 2026 security audit as a known remaining issue.

**Done when:** All forum post and reply content is sanitized before rendering. The sanitization function strips script tags and event handlers. Existing posts are safe because the sanitization happens at render time, not write time.

### Steps

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | In `client/src/components/ForumMarkdown.tsx`: import `sanitizeInput` from `server/_core/security` — or duplicate the sanitize logic client-side (stripping `<script>`, `on*=` attributes, `javascript:` hrefs) since server utils can't be imported directly on the client |
| 2 | [CLAUDE CODE] | Create `client/src/utils/sanitize.ts` with a client-safe version: strip `<script>...</script>`, remove `on\w+=` attributes, replace `javascript:` hrefs with `#` |
| 3 | [CLAUDE CODE] | In `ForumMarkdown.tsx`: run content through `sanitizeForClient()` before passing to the markdown renderer |
| 4 | [CLAUDE CODE] | In `CommunityPost.tsx`, `CommunityNewPost.tsx`: sanitize displayed content at render |
| 5 | [CLAUDE CODE] | In `server/routers.ts` on `forumPosts.create` and `forumReplies.create` mutations: also sanitize on write using the existing `sanitizeInput()` from `security.ts` — defense in depth |
| 6 | [CLAUDE CODE] | Write test: post content with `<script>alert(1)</script>` via the mutation and assert the stored/returned value has no script tag |

---

## Fix 116: Security — Fix innerHTML Clearing in Forms (Security: +0.5)

**What:** Two form files use `innerHTML = ''` to clear elements, which is a potential XSS vector. Should be `textContent = ''` or React state management.

**Done when:** No form file uses `innerHTML` for clearing. All form resets use React state.

### Steps

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Grep for `innerHTML` across all client TSX/TS files |
| 2 | [CLAUDE CODE] | For each instance used to clear/reset: replace with `textContent = ''` if DOM-direct, or refactor to React `useState('')` reset if it's a controlled component |
| 3 | [CLAUDE CODE] | For any `dangerouslySetInnerHTML` remaining in the codebase: audit each one — if the content is user-generated, run it through `sanitizeForClient()` first |

---

## Fix 117: Code Quality — Split Admin.tsx (Code Quality: 7→8.5)

**What:** `Admin.tsx` is 4,982 lines. It contains 8+ tabs: Overview, Applications, Moderation, Analytics, Newsletter, Settings, Broadcast, Knowledge Map. Each tab is a self-contained feature. The file is unmaintainable at this size.

**Done when:** Admin.tsx is under 300 lines (routing shell only). Each tab is its own component file imported lazily.

### Steps

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Identify the 8 tab content sections in `Admin.tsx` by their `<TabsContent value="...">` boundaries |
| 2 | [CLAUDE CODE] | Extract each tab into `client/src/components/admin/AdminOverviewTab.tsx`, `AdminApplicationsTab.tsx`, `AdminModerationTab.tsx`, `AdminAnalyticsTab.tsx`, `AdminNewsletterTab.tsx`, `AdminSettingsTab.tsx` — existing `AdminBroadcastPanel.tsx` and `KnowledgeMapAdminPanel.tsx` are already extracted, just ensure they're imported |
| 3 | [CLAUDE CODE] | Move all shared admin state (selected application, filters, etc.) to a `client/src/contexts/AdminContext.tsx` so tabs can share state without prop-drilling |
| 4 | [CLAUDE CODE] | In `Admin.tsx`, replace the tab bodies with lazy-loaded `<Suspense>` wrapped imports of each tab component |
| 5 | [CLAUDE CODE] | Confirm Admin loads correctly after refactor. Run `pnpm test` to verify no regressions |

---

## Fix 118: Code Quality — Split PlayerProfile.tsx and CreateCampaign.tsx (Code Quality: 8.5→9)

**What:** `PlayerProfile.tsx` is 2,902 lines and `CreateCampaign.tsx` is 2,617 lines — same problem as Admin.tsx.

**Done when:** Both files are under 400 lines (shell + section imports). Each major section is its own component.

### Steps

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | In `PlayerProfile.tsx`: identify major sections (Profile Header, Stats/Badges, Activity Timeline, Contributions, Quests, Forum Posts, Settings) — extract each to `client/src/components/profile/ProfileHeader.tsx`, `ProfileStats.tsx`, etc. |
| 2 | [CLAUDE CODE] | In `CreateCampaign.tsx`: identify the multi-step form sections (Basic Info, Media, Goals, Preview, Submission) — extract each to `client/src/components/campaign/CampaignStep1.tsx`, etc. Use shared form state via React context or react-hook-form's `FormProvider` |
| 3 | [CLAUDE CODE] | After extraction, run the app and verify both pages work end-to-end |

---

## Fix 119: Code Quality — Frontend Component Tests (Code Quality: 9→9.5)

**What:** Server has 2,829 lines of tests across 13 files. Frontend has essentially none (1 test file: `ImagePreloader.test.tsx`). Critical UI paths have no safety net.

**Done when:** At minimum 5 component test files covering the highest-risk interactive flows. Vitest + React Testing Library is already configured.

### Steps

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Add `@testing-library/react` and `@testing-library/user-event` if not already in `package.json` — check `vitest.config.ts` for jsdom environment config |
| 2 | [CLAUDE CODE] | Write `client/src/components/AuthDialog.test.tsx` — test: dialog renders, email input accepts input, form submits, error state shows |
| 3 | [CLAUDE CODE] | Write `client/src/pages/Apply.test.tsx` — test: form renders all required fields, validation fires on empty submit, success state renders after mock submission |
| 4 | [CLAUDE CODE] | Write `client/src/components/ContributionModal.test.tsx` — test: modal opens, amount input validates, submit fires mutation |
| 5 | [CLAUDE CODE] | Write `client/src/components/QuestDetailModal.test.tsx` — test: renders quest title and description, close button works, progress tracker renders |
| 6 | [CLAUDE CODE] | Write `client/src/components/Navigation.test.tsx` — test: nav links render, mobile menu opens/closes, auth state shows correct items |
| 7 | [CLAUDE CODE] | Run `pnpm test` — all new tests must pass |

---

## Fix 120: UX — Keyboard Navigation + Focus Styles + ARIA Labels (UX: 8→9)

**What:** Interactive elements (icon buttons, custom dropdowns, quest cards) are missing focus-visible styles and aria-labels. Keyboard-only users can't navigate several key flows. This is a WCAG 2.1 AA requirement.

**Done when:** Every interactive element has a visible focus ring. Every icon-only button has an `aria-label`. The quest modal, auth dialog, and navigation are fully keyboard-navigable.

### Steps

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | In `index.css`, confirm `focus-visible` ring styles exist globally — add if missing: `.focus-visible:focus-visible { outline: 2px solid #4ade80; outline-offset: 2px; }` (using the site's green) |
| 2 | [CLAUDE CODE] | Grep for `<button` and `<Button` across all pages/components — find any with only icon children and no `aria-label` — add `aria-label="Description"` to each |
| 3 | [CLAUDE CODE] | In `Navigation.tsx`: ensure mobile menu toggle button has `aria-expanded`, `aria-controls`, and `aria-label="Open menu"` / `"Close menu"` |
| 4 | [CLAUDE CODE] | In `QuestDetailModal.tsx`: add `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the quest title heading. Ensure `Escape` key closes it |
| 5 | [CLAUDE CODE] | In `AuthDialog.tsx`: same dialog role pattern. Ensure focus is trapped inside when open (Radix Dialog already handles this if used correctly — verify) |
| 6 | [CLAUDE CODE] | Run `npx axe-core` or `pnpm dlx @axe-core/cli https://localhost:5000` against the home page and quest page — fix any critical/serious violations |

---

## Fix 121: UX — Loading Skeletons on Heavy Data Pages (UX: 9→9.5)

**What:** `PageSkeleton.tsx` and `DashboardLayoutSkeleton.tsx` exist but aren't used consistently. Pages like Community, Map, and CrowdPoolingProjects show blank/flash states while data loads.

**Done when:** All data-heavy pages show a skeleton while loading. No page shows a blank white flash.

### Steps

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | In `Community.tsx`: wrap the forum post list in a skeleton (repeat `<div class="animate-pulse bg-white/10 h-20 rounded-lg mb-3">` while `isLoading`) |
| 2 | [CLAUDE CODE] | In `CrowdPoolingProjects.tsx`: show card-shaped skeletons (3 in a grid) while campaign data loads |
| 3 | [CLAUDE CODE] | In `Map.tsx`: show a flat green placeholder div at the globe's dimensions while the Three.js scene initializes |
| 4 | [CLAUDE CODE] | In `PlayerProfile.tsx`: show profile header skeleton (avatar circle + two lines) while user data loads |
| 5 | [CLAUDE CODE] | In `AdminApplications.tsx`: show table row skeletons while applications list loads |

---

## Fix 122: Infrastructure — Error Boundaries on All Routes (Infrastructure: 8→9)

**What:** `ErrorBoundary.tsx` exists but isn't applied to individual routes — a crash in any one page component will take down the whole app. Each route should be independently sandboxed.

**Done when:** Every route is wrapped in an ErrorBoundary. A crash on /admin doesn't affect /community. Each boundary shows a helpful "Something went wrong — refresh or go home" message.

### Steps

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | In `ErrorBoundary.tsx`: ensure it accepts a `fallback` prop and has a sensible default UI (page title, error message, "Go home" button) |
| 2 | [CLAUDE CODE] | In `App.tsx`: wrap each route's `<Suspense>` with `<ErrorBoundary>` — or wrap the Suspense+lazy combination together |
| 3 | [CLAUDE CODE] | Verify by temporarily throwing an error in a page component and confirming only that route shows the error boundary, not the whole app |

---

## Fix 123: Infrastructure — Service Worker Cache Strategy (Infrastructure: 9→9.5)

**What:** `ServiceWorkerRegister.tsx` exists but the service worker strategy isn't defined. Static assets aren't cached, meaning repeat visits re-download everything.

**Done when:** A workbox-based service worker is configured with: cache-first for static assets, network-first for API calls, stale-while-revalidate for pages.

### Steps

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Add `vite-plugin-pwa` to `package.json` if not already present |
| 2 | [CLAUDE CODE] | In `vite.config.ts`, configure the PWA plugin with a workbox strategy: `{ strategies: 'generateSW', workbox: { globPatterns: ['**/*.{js,css,html,ico,png,webp,svg}'], runtimeCaching: [{ urlPattern: /\/api\//, handler: 'NetworkFirst' }, { urlPattern: /\.(png|jpg|webp|svg)$/, handler: 'CacheFirst', options: { cacheName: 'images', expiration: { maxAgeSeconds: 30 * 24 * 60 * 60 } } }] } }` |
| 3 | [CLAUDE CODE] | Update `ServiceWorkerRegister.tsx` to use the generated service worker from the PWA plugin |
| 4 | [CLAUDE CODE] | Verify in browser DevTools > Application > Service Workers that the SW is registered and assets are being cached on second visit |

---

## Fix 124: Feature Completeness — Farcaster Account + Handle (Feature: 9→10)

**What:** `FARCASTER_HANDLE` is unset in Railway because there's no Farcaster account yet. This is a genuine human step.

**Done when:** Rye has created a Farcaster account and the handle is set in Railway.

### Steps

| Step | Agent | Action |
|---|---|---|
| 1 | [HUMAN] | Create account at farcaster.xyz — claim handle (suggested: `@regencivics`) |
| 2 | [HUMAN] | In Railway dashboard > ReGenCivics.Earth > Variables: add `FARCASTER_HANDLE=@yourhandle` |
| 3 | [CLAUDE CODE] | In `AdminBroadcastPanel.tsx`: confirm the Farcaster section renders the handle when the env var is set — test in development with `FARCASTER_HANDLE=@test` |

---

## Fix 125: Critical Rendering Path — Font Loading (Performance: +0.3)

**What:** Google Fonts loads via a `<link rel="preload">` + print-media trick. This works but still requires a round-trip to Google's servers before text renders, causing a flash of unstyled text (FOUT). The fonts are Quicksand and Nunito — both commonly requested and stable.

**Done when:** Fonts are self-hosted in `/public/fonts/`. No Google Fonts requests on load. FOUT is eliminated. Font files served with `Cache-Control: max-age=31536000, immutable`.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Download Quicksand (wght 400–700) and Nunito (wght 400–700) and Righteous from Google Fonts as WOFF2. Tool: `npx google-fonts-helper` or download from fonts.google.com |
| 2 | [CLAUDE CODE] | Place in `client/public/fonts/`. Add `@font-face` declarations to `client/src/index.css` with `font-display: swap` |
| 3 | [CLAUDE CODE] | Remove the Google Fonts `<link>` tags from `index.html`. Add `<link rel="preload" as="font" crossorigin href="/fonts/quicksand-variable.woff2">` |
| 4 | [CLAUDE CODE] | Verify fonts render identically. Check Network tab — no fonts.googleapis.com requests |

---

## ~~Fix 126: HTTP Response Headers~~ — ALREADY DONE

**Status: Already implemented.** Confirmed 2026-03-19:
- ✅ `server/_core/vite.ts`: `express.static(distPath, { maxAge: "1y", immutable: true })` — hashed assets cached 1 year
- ✅ HTML served with `Cache-Control: no-cache` via `setHeaders` override
- ✅ `server/_core/security.ts`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security` all present
- ✅ Slow-changing tRPC endpoints get `Cache-Control: public, max-age=N, stale-while-revalidate=2N` headers
- ✅ Gzip compression at level 6 for all responses > 1KB (server/_core/index.ts)

---

## ~~Fix 127: Database Query Performance — N+1 Queries~~ — DONE (2026-03-19)

**Status: Done.** Added `getUsersByIds()` and `getCampaignImagesForMany()` batch helpers to `server/db.ts`. Fixed N+1 in:
- ✅ `forumPosts.list`: batch-fetch all authors in 1 query (was N queries per post)
- ✅ `forumPosts.replies`: batch-fetch authors + profiles in 2 total queries (was 2N)
- ✅ `forumPosts.getTaggedPosts`, `chainPosts`, `postsByType`, `chainFeed`, `postsByBioregion`: all now batch
- ✅ `quests.suggestions`: batch author lookup
- ✅ `forum.reports`, `forum.moderators`, `forum.bans`: batch admin queries
- ✅ `campaigns.list`: single bulk image fetch instead of N per campaign

---

## ~~Fix 128: Largest Contentful Paint — API Response Time~~ — ALREADY DONE

**Status: Already implemented with Redis (better than in-memory LRU).** Confirmed 2026-03-19:
- ✅ `server/cache.ts`: full Redis caching layer with `cacheGetOrSet()`, TTL constants (SHORT=5min, MEDIUM=30min, LONG=1hr)
- ✅ `server/cachedQueries.ts`: cached versions of blog posts, opportunities, campaigns, seasons, team
- ✅ `server/_core/index.ts`: HTTP `Cache-Control` headers on slow-changing tRPC endpoints (forum categories 5min, glossary 1hr, seasons 1hr, etc.)
- ✅ Redis gracefully falls back to no-cache when `REDIS_URL` is not set — Railway add-on optional

**Remaining:** [HUMAN] Add `REDIS_URL` in Railway environment if not already set (Railway Redis add-on or Upstash).

---

## Fix 129: Core Web Vitals — Cumulative Layout Shift (Performance: +0.3)

**What:** Multiple sources of layout shift identified: images without `width`/`height`, fonts loading after paint (FOUT), dynamic content inserting above the fold. CLS above 0.1 fails Core Web Vitals.

**Done when:** Lighthouse CLS score is 0 on homepage and quest page. No elements jump during load.

### Already done (2026-03-19):
- ✅ Nav logo: `width="40" height="40"` added to both img tags (mobile + desktop)
- ✅ Footer logo: `width="56" height="56"` added + switched to WebP

### Still needed:
| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Add `width` and `height` to remaining `<img>` tags missing them (Blog.tsx, Opportunity.tsx, Connect.tsx, Schedule.tsx, Seasons.tsx hero images) |
| 2 | [CLAUDE CODE] | In `Navigation.tsx`: confirm the nav bar has `h-16` — check it doesn't shrink before auth loads |
| 3 | [CLAUDE CODE] | In `PageBackground.tsx`: confirm background container has explicit `min-height` before image loads |
| 4 | [CLAUDE CODE] | Run Lighthouse on homepage — CLS should be < 0.05. Fix any remaining sources |

---

## ~~Fix 130: Preconnect to All Critical Third-Party Domains~~ — DONE (2026-03-19)

**Status: Done.** `index.html` now has:
- ✅ `preconnect` to `fonts.googleapis.com`, `fonts.gstatic.com`, `assets.regencivics.earth`
- ✅ NEW: `preconnect` to `d2xsxph8kpxj0f.cloudfront.net` (CloudFront CDN serving Opportunity page images)
- `dns-prefetch` meta tag already present for general third-party resolution

Note: If Fix 125 (self-hosted fonts) is done, remove `fonts.googleapis.com` and `fonts.gstatic.com` preconnects at that time.

---

## Execution Order (what to run first)

**Wave 1 — Performance (highest ROI, do this first):**
~~Fix 111 (code splitting)~~ DONE → ~~Fix 111b~~ PARTIAL (logo WebP done, nav width/height done; srcset remaining) → ~~Fix 112 (animations/prefers-reduced-motion)~~ DONE → ~~Fix 113 (images)~~ DONE → Fix 125 (self-hosted fonts) → ~~Fix 126 (cache headers)~~ DONE → Fix 129 (CLS — remaining img dimensions) → ~~Fix 130 (preconnect)~~ DONE → ~~Fix 127 (N+1 queries)~~ DONE → ~~Fix 128 (API cache/TTFB)~~ DONE

**Wave 2 — Security (closes known audit gaps):**
Fix 114 (CSRF) → Fix 115 (forum sanitization) → Fix 116 (innerHTML)

**Wave 3 — Code quality (enables everything else to be maintainable):**
Fix 117 (Admin split) → Fix 118 (PlayerProfile/CreateCampaign split) → Fix 119 (frontend tests)

**Wave 4 — UX + Infrastructure (polish):**
Fix 120 (keyboard/ARIA) → Fix 121 (skeletons) → Fix 122 (error boundaries) → Fix 123 (service worker)

**Wave 5 — Human step:**
Fix 124 (Farcaster) — whenever Rye has bandwidth

---

## Projected Scores After This Sprint

| Dimension | Current | After Sprint |
|---|---|---|
| Feature completeness | 9/10 | 10/10 |
| Code quality | 7/10 | 9/10 |
| Security | 7.5/10 | 10/10 |
| Performance | 7/10 (↑ after 2026-03-19 image/video pass) | 9.5/10 |
| Design/UX | 8/10 | 9/10 |
| Infrastructure | 8/10 | 9.5/10 |
| **Overall** | **7.5/10** | **9.5/10** |

---

## Notes for Claude Code

- Run `pnpm test` after each wave — don't proceed to the next wave if tests are red
- Fix 117 (Admin split) is the riskiest refactor — do it last in Wave 3, test thoroughly
- All security fixes (Fixes 114-116) should be deployed together in a single commit so there's no window where CSRF is partially implemented
- Fix 126 (cache headers): be careful not to cache `/api/` routes or HTML — only static assets
- Fix 128 (server-side cache): only cache public data, never per-user responses — mixing these would be a serious data leak
- The Lighthouse hard gate should be re-run after Wave 1 to confirm 90+ scores across Home, Fund, and Community
