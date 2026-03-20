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
| Performance | 8/10 (↑ after 2026-03-19 full optimization pass) | 9/10 | Medium |
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

### Already done (2026-03-19):
- ✅ `Navigation.tsx`: both logo `<img>` tags now have `width="40" height="40"` (CLS prevention)
- ✅ `SiteFooter.tsx`: switched to `.webp` logo (84KB vs 211KB PNG saved per load), added `width="56" height="56"`
- ✅ `fetchpriority="high"` on hero preload links in `index.html` — already done

### Still remaining:

**a) srcset on images (mobile savings: 50–80% per image)**

No image on the site uses `srcset` or `sizes`. Mobile users on poor connections download 1920px hero images.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | In `PageBackground.tsx`: already uses separate mobile/desktop images via CSS — no srcset needed. |
| 2 | [CLAUDE CODE] | In `PathCardImage.tsx`: CDN path card illustrations (`assets.regencivics.earth/...`) served at 2048×2048 but displayed at 237×237px. Add `width="237" height="237"` to prevent CLS. |
| 3 | [CLAUDE CODE] | Grep for remaining `<img ` tags missing `width`/`height` across all TSX — add them (prevents Lighthouse CLS penalty). |

**Done when:** All img tags have width+height. Lighthouse CLS score is 0 on homepage.

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

## ~~Fix 113: Image Optimization~~ — DONE (2026-03-19)

**Status: Done.** PWA icons converted to WebP, all images recompressed, video compressed, lazy loading applied consistently.

### Already done:
- ✅ All PWA icons (`icon-512`, `icon-192`, `apple-touch-icon`) converted to WebP — `index.html` and `manifest.json` already reference them
- ✅ All quest/return-card/OG/hero images recompressed (avg ~70% savings each)
- ✅ Hero video compressed 74%, preload="none", poster frame added
- ✅ `PathCardImage` hover image is now `loading="lazy"`

- ✅ All PWA icons (`icon-512`, `icon-192`, `apple-touch-icon`) converted to WebP
- ✅ All quest/return-card/OG/hero images recompressed (avg ~70% savings each)
- ✅ Hero video compressed 74%, `preload="none"`, poster frame added
- ✅ `PathCardImage` hover image: `loading="lazy"`
- ✅ Community.tsx: 9 decorative background images now `loading="lazy"`
- ✅ Blog.tsx images inside `aspect-video` containers (no CLS, already lazy)
- ✅ `OptimizedImage.tsx` and `LazyImage.tsx` already use `loading="lazy"` + `decoding="async"`
- ✅ Width/height on img tags: covered by Fix 111b (nav/footer done; PathCardImage remaining)

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

---

## CTO Review Notes (2026-03-19)

Before executing, read these. Several items have dependencies that affect order.

**On CSRF (Fix 114):** tRPC mutations already reject unauthenticated requests via `protectedProcedure`. The real risk surface is the handful of `publicProcedure` mutations (newsletter.subscribe, application.submit, investor.submit, inquiry.submit) that do not require login. These already have rate limiting, which reduces — but does not eliminate — CSRF exposure. Browsers block cross-origin JSON POSTs with content-type `application/json` without a CORS preflight, so the attack surface is narrower than traditional form CSRF. Still implement tokens; just know this is medium not critical severity.

**On Admin.tsx split (Fix 117):** Do NOT extract tab content into files while also changing state management in the same commit. Two-step: first extract to components with props passed down (no new context yet), run tests, commit. Second pass: introduce AdminContext if prop-drilling becomes a problem. Combining both steps in one commit is how you get a three-day debugging session.

**On Tiptap (Fix 137):** Tiptap outputs HTML by default. The existing ForumMarkdown renderer reads Markdown. Before switching editors, decide on one storage format for all new content: either Markdown (install `@tiptap/extension-markdown`) or HTML (update renderer). Do not mix formats in the same table — posts created with the old editor will break if the renderer changes. Safest path: keep Markdown as storage format, use Tiptap with the markdown extension, keep ForumMarkdown as the renderer unchanged.

**On emoji reactions (Fix 134):** This requires a new DB table and migration. The migration must be deployed before the frontend ships or the feature will 500 on first click. Tag this migration with a distinctive name and confirm it ran in Railway before merging the UI code.

**On land project forum posts (Fix 135):** The `seed-land-project-threads.ts` script created posts directly in the DB bypassing the approval hook. The auto-creation in `routers.ts` (lines 387-398) already works correctly for newly approved projects. The cleanup is a DB-level delete of the script-created posts followed by re-approval of those projects through the admin UI to trigger the hook properly. Claude Code can write the cleanup SQL; execution requires Railway DB access.

**On numbered lists in BlogPost.tsx:** Root cause is confirmed. `BlogPost.tsx` renders blog body line-by-line using `renderInlineMarkdown()` which is an inline-only renderer — it has no concept of block-level list context. Every `<li>` gets its own `<ol>` starting at 1. Fix is in the renderer, not the editor. The renderer needs to be replaced with ReactMarkdown + remark-gfm before the editor upgrade is even relevant.

---

## Fix 131: ReGenGuide — Button Label Rename

**What:** The floating guide button's `aria-label` says `"Show Me Around"` when closed. The label inside the open panel already says "Your ReGen Guide." They should match.

**Done when:** The button aria-label reads "Your ReGen Guide" in both open and closed states. No visual change — this is accessibility text only.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | In `client/src/components/ReGenGuide.tsx` line ~201: change `aria-label={isOpen ? "Close guide" : "Show Me Around"}` to `aria-label={isOpen ? "Close Your ReGen Guide" : "Your ReGen Guide"}` |
| 2 | [CLAUDE CODE] | Confirm the button tooltip text (if any) also says "Your ReGen Guide" |

---

## Fix 132: QuestGameIntro — Rewrite First-Visit Copy

**What:** The 4-panel cinematic intro shown to first-time visitors to /quests is too vague. "The earth is calling" and "Land projects need players" sound evocative but don't explain what quests actually are or how they work. New players leave confused.

**Done when:** The `PANELS` array in `QuestGameIntro.tsx` reflects the approved copy below. Intro plays correctly on fresh localStorage.

**APPROVED COPY — implement as-is:**

```
Panel 1 (pulse heading only):
"Questing our way into a growing diversity of regenerative economic systems."

Panel 2 (heading + body):
Heading: "Acts that heal and grow you and us."
Body: "Every quest is something you do in the world. Regenerate your body. Build soil. Plant abundance. Read something that shifts how you see and from where you create. Each quest grows your capabilities and increases our capabilities as a movement, improving our collective health and connecting you to the living world around you. Go at your own pace. The key is thriving."

Panel 3 (heading + body):
Heading: "Do the work. Earn the tokens."
Body: "When you complete a quest, you earn tokens. Both to distribute the currency of the economic system we're co-creating together, and to distribute governance voice in our Infinite Game. This is your actual share of an economy built around healing, growth, and care. Your contribution is logged. Other players see it. Land projects see it. The record builds, quest by quest, person by person. This is the foundation from which we raise investment, seek donors, and bring real financial value into the movement — as well as build the financial systems of the future, today."

Panel 4 (heading + body + CTA button):
Heading: "Our Game Remembers."
Body: "Quests can be qualifiers and signals. A land project might prioritize applicants who've completed the Non-Violent Communication course and the Healing Trauma Masterclass. One focused on food might look for those who've done Seed Saving, Food Foresting, and Healing Wholes. An intentional ecovillage might use the whole Rites of Passage series as its 13-quest requirement to apply. Quests are something we co-create together as tools to learn, evolve, and become better players of our Infinite Game."
Button: "Start Your First Quest"
```

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Update the `PANELS` array in `client/src/components/QuestGameIntro.tsx` with the approved copy above. Match the existing TypeScript structure exactly — do not change animation timing, panel count, or component structure. Panel 1 is heading-only (no body). Panels 2 and 3 have heading + body. Panel 4 has heading + body + CTA button. |
| 2 | [CLAUDE CODE] | Run `localStorage.removeItem("regen_game_entered")` in browser DevTools to verify the updated intro plays correctly from scratch. Confirm all 4 panels display without truncation — the Panel 3 body is long, check it wraps properly on mobile widths. |

---

## Fix 133: Forum Post ID Audit — Stale Hardcoded Links

**What:** `client/src/data/blogPosts.ts` contains three hardcoded links to `/community/post/560` (the contributions discussion thread). That post ID was assigned by the DB on original seeding. After the forum reset and re-seed, the ID is almost certainly different. These links will 404.

**Done when:** All hardcoded `/community/post/[ID]` links in `blogPosts.ts` and `welcomeAboardQuests.ts` resolve to real, live posts.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | In `scripts/`, write a one-off diagnostic script `check-post-links.mjs` that connects to DB and queries: `SELECT id, title FROM forumPosts WHERE title LIKE '%contribution%' OR title LIKE '%seeds%' OR title LIKE '%quest%' ORDER BY id` — print results |
| 2 | [HUMAN] | Run `node scripts/check-post-links.mjs` with DATABASE_URL set. Paste the output here or into a comment on this fix. |
| 3 | [CLAUDE CODE] | Once real post IDs are confirmed, update the three `/community/post/560` references in `blogPosts.ts` to the correct IDs |
| 4 | [CLAUDE CODE] | Grep entire `client/src/` for any other hardcoded `/community/post/[number]` links and audit each one the same way |

---

## Fix 134: Emoji Reactions on Forum Posts and Comments

**What:** Posts and replies currently have a single "like" counter. Discord-style emoji reactions (👍 ❤️ 🌱 🔥 💡 🌍) let people express more nuance without posting a reply. High engagement value, low effort to consume.

**Done when:** Every forum post and every reply has a reaction row. Clicking an emoji adds/removes your reaction. Counts are shown per emoji. Logged-in only; guests see counts but cannot react.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Write migration `drizzle/0057_emoji_reactions.sql`: `CREATE TABLE postReactions (id INT AUTO_INCREMENT PRIMARY KEY, userId INT NOT NULL, postId INT, replyId INT, emoji VARCHAR(8) NOT NULL, createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY unique_reaction (userId, postId, replyId, emoji), FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (postId) REFERENCES forumPosts(id) ON DELETE CASCADE, FOREIGN KEY (replyId) REFERENCES forumReplies(id) ON DELETE CASCADE)` |
| 2 | [HUMAN] | Apply migration in Railway: `npx tsx apply-migrations.mjs` or run the SQL directly in Railway DB console |
| 3 | [CLAUDE CODE] | Add `postReactions` table definition to `drizzle/schema.ts` using Drizzle ORM syntax |
| 4 | [CLAUDE CODE] | In `server/routers.ts`, add to forum router: `reactions.toggle` (protectedProcedure, input: `{postId?: number, replyId?: number, emoji: string}`, upsert/delete pattern), `reactions.get` (publicProcedure, input: `{postId?: number, replyId?: number}`, returns `{emoji: string, count: number, userReacted: boolean}[]`) |
| 5 | [CLAUDE CODE] | Create `client/src/components/EmojiReactions.tsx`: row of 6 emoji buttons (👍 ❤️ 🌱 🔥 💡 🌍), each shows count, highlights if current user reacted, calls `reactions.toggle` on click, requires auth (shows auth dialog if not logged in) |
| 6 | [CLAUDE CODE] | In `client/src/pages/CommunityPost.tsx`: add `<EmojiReactions postId={post.id} />` below the post content and `<EmojiReactions replyId={reply.id} />` below each reply |
| 7 | [CLAUDE CODE] | Write test in `server/forum.test.ts`: toggle reaction on a post, verify count, toggle again (remove), verify count returns to 0 |

**Allowed emoji set:** `['👍', '❤️', '🌱', '🔥', '💡', '🌍']` — hardcoded, not user-configurable. Keep it tight.

---

## Fix 135: Land Project + Organisation Forum Posts — Clean Up and Automate

**What:** `scripts/seed-land-project-threads.ts` was run manually and created forum posts directly in the DB, bypassing the approval hook. The auto-creation in `server/routers.ts` (lines 387-398) already works correctly for new approvals. The script-created posts need to be identified, removed, and re-created through the proper approval flow so they have the right structure, author, and category.

Additionally, the auto-creation hook does not yet run for organisations, only for land project applications.

**Done when:** No script-seeded land project posts exist in the forum. Every active land project and organisation has a properly auto-created forum thread (triggered by admin approval, not by a script). When a user claims a land project or organisation, if no thread exists yet, one is auto-created at claim time.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Write `scripts/cleanup-land-project-threads.mjs`: query `SELECT id, title FROM forumPosts WHERE authorId = (SELECT id FROM users WHERE email = 'team@regencivics.earth') AND categoryId = (SELECT id FROM forumCategories WHERE slug = 'active-projects')` — print list of posts that would be deleted |
| 2 | [HUMAN] | Review the list from Step 1. If it looks correct (only script-seeded posts), confirm. Then run with `--execute` flag to delete them. |
| 3 | [CLAUDE CODE] | In `server/routers.ts`, find the block at ~line 387 where `db.createForumPost()` is called on approval. Confirm it runs for `type: 'land_project'`. Then duplicate the same block for `type: 'organisation'` in the org approval handler (search for where org applications change status to `approved`). |
| 4 | [CLAUDE CODE] | In the org/land-project claim handler (`orgClaims.submit` or similar in routers.ts): after a claim is accepted (`status: 'accepted'`), check if a forum thread already exists for that entity. If not, auto-create one using the same pattern as the approval hook. |
| 5 | [HUMAN] | In Railway admin UI: for each active land project and organisation that doesn't yet have a forum thread, trigger a status update through the Admin panel to re-fire the approval hook, OR run a one-time backfill script (Claude Code can write this as `scripts/backfill-forum-threads.mjs`). |
| 6 | [CLAUDE CODE] | Write `scripts/backfill-forum-threads.mjs`: query all active applications without a corresponding forum post, create posts for them using the same template as the approval hook |
| 7 | [HUMAN] | Run backfill script: `DATABASE_URL=... node scripts/backfill-forum-threads.mjs --dry-run` then `--execute` |

---

## Fix 136: Weekly Digest — Fix "Manage Preferences" Link

**What:** Somewhere on the site (CommunityCategory.tsx, PlayerProfile.tsx, and newsletter components), there is a "Get the weekly digest / Manage Preferences" CTA that links to `/connect`. It should link directly to `/profile?tab=settings` (which contains the Email Digest Frequency section in `DigestPreferences.tsx`). The `/connect` link should be a separate, secondary CTA with different label text.

**Done when:** "Manage preferences" links go to `/profile?tab=settings#email-digest`. A separate "Connect with us on something specific" link points to `/connect`. No digest-related CTA sends users to `/connect`.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Grep for all instances of `manage.*preferences\|Manage Preferences\|/connect` within digest/newsletter context across `client/src/` |
| 2 | [CLAUDE CODE] | In `client/src/pages/CommunityCategory.tsx` (~line 362): find the digest CTA. Change "manage preferences" href from `/connect` to `/profile?tab=settings`. Add a second link: `<a href="/connect">Connect with us on something specific</a>` |
| 3 | [CLAUDE CODE] | In `client/src/components/NewsletterSignup.tsx`: if a "Manage Preferences" link exists, update it the same way |
| 4 | [CLAUDE CODE] | In `client/src/pages/PlayerProfile.tsx`: if the "Stay in the Loop" section has a manage preferences link, update it |
| 5 | [CLAUDE CODE] | In `client/src/components/DigestPreferences.tsx`: add `id="email-digest"` to the outer wrapper `<div>` so the `#email-digest` anchor hash works |

---

## Fix 137: Rich Editor for Blog + Forum — Fix Numbered Lists and Add Keyboard Shortcuts

**What:** Two confirmed bugs: (1) numbered lists in blog posts all display as "1." instead of incrementing — root cause is `BlogPost.tsx` renders body line-by-line via `renderInlineMarkdown()`, an inline-only renderer with no block-level list awareness, creating a new `<ol>` for each `<li>`. (2) Ctrl+B, Ctrl+I, Ctrl+K shortcuts exist in `MarkdownToolbar.tsx` but are only wired to the forum textarea — the blog editor in Admin.tsx does not use `MarkdownToolbar` at all.

**Recommended approach:** Replace the blog textarea in Admin.tsx and the forum post/reply textareas with **Tiptap** (tiptap.dev) — the most capable open-source WYSIWYG editor. Used by Linear, Vercel, GitLab. Natively supports Ctrl+B/I/K, proper numbered lists, slash commands, and can be configured to output Markdown (keeping the existing storage format intact via `@tiptap/extension-markdown`). This fixes both bugs and upgrades the entire editing experience in one pass.

**Best-in-class alternatives considered:**
- **Tiptap** (ProseMirror-based) — recommended. React-native, Markdown output, actively maintained, extensible
- **Lexical** (Meta) — excellent but requires more custom extension work for Markdown output
- **Quill** — older, no longer actively developed, not recommended
- **Slate.js** — lower-level, requires building everything from scratch
- **Discourse/Flarum** — full forum platforms, not worth the migration cost given the existing custom forum is solid

**Critical prerequisite:** Fix the blog renderer first (Step 1-2). The Tiptap editor (Steps 3+) is an enhancement; the renderer bug is a live production issue.

**Done when:** Numbered lists in blog posts display correctly. Blog editor and forum composer both respond to Ctrl+B (bold), Ctrl+I (italic), Ctrl+K (link). Forum renders all existing Markdown correctly after switch.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | In `client/src/pages/BlogPost.tsx`: replace the custom line-by-line body parser with `ReactMarkdown` + `remark-gfm` plugin. `pnpm add react-markdown remark-gfm` if not already installed. Use: `<ReactMarkdown remarkPlugins={[remarkGfm]} components={{ ol: ({children}) => <ol className="list-decimal ml-6 mb-4 space-y-1">{children}</ol>, ul: ({children}) => <ul className="list-disc ml-6 mb-4 space-y-1">{children}</ul>, ... }}>{post.body}</ReactMarkdown>` |
| 2 | [CLAUDE CODE] | Test with an existing blog post that has a numbered list — confirm 1, 2, 3 render correctly. Confirm bold, italic, links, headings, and blockquotes also render. |
| 3 | [CLAUDE CODE] | `pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-markdown @tiptap/extension-link @tiptap/extension-image` |
| 4 | [CLAUDE CODE] | Create `client/src/components/RichEditor.tsx`: Tiptap editor configured with StarterKit (bold, italic, headings, lists, code, blockquote), Link extension, Markdown extension (storage format: Markdown, not HTML). Accept `value: string` (Markdown) and `onChange: (markdown: string) => void` props. Style to match existing textarea appearance. |
| 5 | [CLAUDE CODE] | In `Admin.tsx`: find the blog post body textarea. Replace with `<RichEditor value={blogBody} onChange={setBlogBody} />`. The stored value remains Markdown — no migration needed. |
| 6 | [CLAUDE CODE] | In `client/src/pages/CommunityNewPost.tsx` and the reply composer in `CommunityPost.tsx`: replace the textarea + MarkdownToolbar combo with `<RichEditor>`. Remove `MarkdownToolbar` imports from these files (keep the component file in case it's used elsewhere). |
| 7 | [CLAUDE CODE] | In `client/src/components/ForumMarkdown.tsx`: add `remark-gfm` to the ReactMarkdown plugins list if not already present — ensures GFM tables, task lists, and strikethrough render correctly for existing posts |
| 8 | [CLAUDE CODE] | Verify: create a test forum post with a numbered list, bold text, and a link — confirm they render correctly in both edit and view modes |

---

## Fix 138: Forum Fire Section — Rites of Passage Category + Correct Routing

**What:** In `Community.tsx`, the "Rites of Passage" card (lines 783-793) links to `/community/c/quests-gameplay` — the same destination as the "General Discussion" card. The Rites of Passage card should link to a dedicated forum category containing discussion threads for each of the 13 rites. Currently no `rites-of-passage` category exists in the forum. The `seed-quest-forum-posts.ts` script seeds quest threads into `quests-gameplay`, not a dedicated category.

**Done when:** Clicking "Rites of Passage" goes to `/community/c/rites-of-passage`, a category containing threads for all 13 quests. Clicking "All Quests" goes to `/community/c/quests-gameplay` (general quest discussion). The two are distinct.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Write migration to add the `rites-of-passage` category: `INSERT INTO forumCategories (slug, name, description, icon, color, sortOrder) VALUES ('rites-of-passage', 'Rites of Passage', 'Discussion threads for each of the 13 Rites of Passage quests — share completions, ask questions, and connect with others on the same quest.', 'Flame', '#c77dba', 6)` — add to `drizzle/schema.ts` and a new migration file |
| 2 | [HUMAN] | Apply migration in Railway |
| 3 | [CLAUDE CODE] | Update `scripts/seed-quest-forum-posts.ts`: change the category lookup from `quests-gameplay` to `rites-of-passage` so the 13 quest threads seed into the correct category |
| 4 | [HUMAN] | Run `DATABASE_URL=... npx tsx scripts/seed-quest-forum-posts.ts --reset` to re-seed quest threads into the correct category. Confirm threads appear at `/community/c/rites-of-passage`. |
| 5 | [CLAUDE CODE] | In `client/src/pages/Community.tsx` line ~784: change `href="/community/c/quests-gameplay"` on the Rites of Passage card to `href="/community/c/rites-of-passage"` |
| 6 | [CLAUDE CODE] | On the "All Quests" card (line ~795): confirm it links to `/community/c/quests-gameplay` (general quest discussion). If it links to `/quest`, change to `/community/c/quests-gameplay` — the Quest page is for browsing/doing quests, not discussing them. |
| 7 | [CLAUDE CODE] | In `client/src/data/welcomeAboardQuests.ts`: check any `forumUrl` values that reference `quests-gameplay` to see if they should now point to `rites-of-passage` instead (quests 1-13 discussions) |

---

## Fix 139: Epic Quests — "Coming Soon" Badge + Suggest a Quest in Fire Section

**What (Part A):** The "Epic Quests" card links to `/community/c/epic-quests`. Epic Quests content is not ready. Clicking the card should show a "Coming Soon" state rather than an empty or broken category page.

**What (Part B):** The "Suggest a Quest" feature (`/community/quests` → `QuestSuggestions.tsx`) is not visible anywhere in the Fire section of the forum or on the Quest page. It should be prominent in both places. The final quest in the Welcome Aboard sequence (`welcomeAboardQuests.ts` line 157) already links to it — confirm that wiring is correct.

**Done when:** Epic Quests card shows a "Coming Soon" overlay and does not navigate. A "Suggest a Quest" card is visible and prominent in the Fire section. Quest page has a visible "Suggest a Quest" CTA. Welcome Aboard final quest links to `/community/quests`.

### Part A — Epic Quests Coming Soon

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | In `Community.tsx` on the Epic Quests card: wrap the `<Link>` in a `<div>` with `relative` positioning. Remove the `<Link>` navigation. Add an overlay: `<div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl z-10"><span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Coming Soon</span></div>` — keep the card visual but block navigation |
| 2 | [CLAUDE CODE] | Update the subtitle text from "Long-form challenges" to "Long-form challenges — coming soon" |

### Part B — Suggest a Quest Placement

| Step | Agent | Action |
|---|---|---|
| 3 | [CLAUDE CODE] | In `Community.tsx` Fire section: add a 5th card (below the 2×2 grid, full-width or 2-col spanning) for "Suggest a Quest" → `/community/quests`. Use a distinct style: green border, leaf or lightbulb icon, text "Got an idea for a quest? Propose it here — the community votes and the best ones get built." |
| 4 | [CLAUDE CODE] | In `client/src/pages/Quest.tsx`: add a prominent CTA section (after the Seasonal Quests list, before the footer). Heading: "Got a Quest Idea?" Body: "If you've discovered a practice worth spreading, propose it. The community votes — the best ones become official quests." Link button: "Suggest a Quest →" → `/community/quests` |
| 5 | [CLAUDE CODE] | In `client/src/data/welcomeAboardQuests.ts`: confirm the final quest entry (quest 10 or whichever is last) has `forumUrl: "/community/quests"` or `actionUrl: "/community/quests"`. If it points to the full URL with domain, change to a relative path. |
| 6 | [CLAUDE CODE] | In `client/src/pages/QuestSuggestions.tsx`: confirm the page title and description clearly explain what this is — "Suggest a Quest" heading, subtitle explaining that community votes determine which become official quests, and that the top-voted idea each season earns 1,111 $ReGen for the proposer |

---

## Fix 142: Quest Page — Generate and Add 3 Hero Images

**What:** The Quest page (`/quests`) and QuestGameIntro panels have no illustrated imagery. Three on-brand WebP images are needed: a journey/forest hero, a hands-in-soil acts image, and an aerial patchwork-land "game remembers" image. Generated via nano-banana-pro (Gemini 3 Pro Image) at 2K resolution, saved to `client/public/images/quests/`.

**Done when:** Three WebP files exist in `client/public/images/quests/`. Each is under 300KB. They are wired into the Quest page or QuestGameIntro panels at appropriate locations.

### Image Generation Instructions

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Run `uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py` with the prompts below. Use `--resolution 2K`. Save initial output as PNG. |
| 2 | [CLAUDE CODE] | Install WebP tools if not present: `apt-get install -y webp`. Convert each PNG: `cwebp -q 85 input.png -o output.webp`. |
| 3 | [CLAUDE CODE] | Move final WebP files to `client/public/images/quests/`. Create the directory if it does not exist. |
| 4 | [CLAUDE CODE] | Report final file sizes for all three. If any exceeds 300KB, re-run conversion at `-q 75`. |
| 5 | [CLAUDE CODE] | Wire images into the Quest page: add `quest-hero.webp` as a full-width hero at the top of `client/src/pages/Quest.tsx`. Add `quest-acts.webp` and `quest-remembers.webp` as section illustrations alongside the relevant content blocks, if the page structure supports it. Use `loading="lazy"` on all three. |

**Image prompts:**

```
Image 1 — quest-hero.webp
Prompt: "Wide cinematic landscape of a person walking along a forest path at golden hour,
dappled light through tall trees, sense of journey and purpose, painterly illustration
style, warm greens and amber tones, no text"
Resolution: 2K
Filename: quest-hero.webp

Image 2 — quest-acts.webp
Prompt: "Close-up of hands pressing a seedling into dark rich soil, afternoon light, food
forest in soft focus behind, warm earthy palette, painterly illustration style, intimate
and purposeful, no text"
Resolution: 2K
Filename: quest-acts.webp

Image 3 — quest-remembers.webp
Prompt: "Aerial view of a diverse patchwork of regenerative land plots connected by
glowing threads of light, organic shapes, illustrated map aesthetic, deep greens and
warm gold accent lines, no text"
Resolution: 2K
Filename: quest-remembers.webp
```

---

## Fix 140: Welcome Aboard Quest Forum Rewiring + All-Quests Auto-Thread Creation

**What:** Several Welcome Aboard quest `forumUrl` fields point to broken or mismatched destinations. Quests 5 and 6 link to non-existent category slugs (`/community/c/make-friends`, `/community/c/pledge-gift`). Quest 9 links to `/community/c/refer-land` which does not exist. Quest 10 uses an absolute URL instead of a relative path. Quest 2 (the origin story / introduce yourself quest) should go to the Introductions category in General, not a quests category. Quest 7 should link to an existing resources thread in the General section (not the Resources & Learning category). A new `onboarding-quests` category needs to be created to house the Welcome Aboard threads that don't belong elsewhere.

Additionally, every time a new quest is created in the admin panel, a corresponding forum thread should be auto-created in the `quests-gameplay` category. This ensures every quest on the site has a discussion thread from day one.

**Done when:** All 10 Welcome Aboard quests have valid, live `forumUrl` destinations. A new `onboarding-quests` category exists and contains seeded threads for quests 1, 3, 5, and 6. Quest 2 threads are in the `introductions` category. Quest 7 links to the specific resources thread in General. Creating a new quest in Admin auto-creates a forum thread in `quests-gameplay`.

### Part A — New Category and DB Migration

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Write migration `drizzle/0058_onboarding_quests_category.sql`: `INSERT INTO forumCategories (slug, name, description, icon, color, sortOrder) VALUES ('onboarding-quests', 'Welcome Aboard Quests', 'Discussion threads for the 10 Welcome Aboard quests — share your completions, reflections, and social posts here.', 'Compass', '#f0a35e', 7)` — this becomes the default home for Welcome Aboard quest threads that are not categorized elsewhere |
| 2 | [HUMAN] | Apply migration in Railway: run the migration SQL in the Railway DB console or via `npx tsx apply-migrations.mjs` |
| 3 | [CLAUDE CODE] | Add `onboarding-quests` category to `seed-forum.mjs` so it persists through future re-seeds |

### Part B — Welcome Aboard forumUrl Remapping

Current broken/mismatched `forumUrl` values in `client/src/data/welcomeAboardQuests.ts`:

| Quest | Current forumUrl | New forumUrl | Reason |
|---|---|---|---|
| 1 (Site Feedback) | `/community/quests-gameplay` | `/community/c/onboarding-quests` | Move to dedicated onboarding category |
| 2 (Origin Story) | `/community/general` | `/community/c/introductions` | Rye confirmed: this IS the intro quest, goes in Introductions |
| 3 (Regen Act) | `/community/quests-gameplay` | `/community/c/onboarding-quests` | Move to dedicated onboarding category |
| 4 (Bioregion) | `/community/land-projects` | `/community/land-projects` | Already correct — no change |
| 5 (Make Friends) | `/community/c/make-friends` | `/community/c/onboarding-quests` | `/c/make-friends` does not exist |
| 6 (Pledge Gift) | `/community/c/pledge-gift` | `/community/c/onboarding-quests` | `/c/pledge-gift` does not exist |
| 7 (Foundations) | `/community/resources-learning` | See Step 4 below (needs specific post ID) | Points to existing resources thread in General |
| 8 (Refer Org) | `/community/alliance-partners` | `/community/alliance-partners` | Already correct — no change |
| 9 (Refer Land Project) | `/community/c/refer-land` | `/community/land-projects` | `/c/refer-land` does not exist |
| 10 (Dream Up Quest) | `https://regencivics.earth/community/quests` | `/community/quests` | Absolute URL should be relative |

| Step | Agent | Action |
|---|---|---|
| 4 | [CLAUDE CODE] | Write diagnostic script `scripts/find-resources-thread.mjs`: `SELECT id, title, createdAt FROM forumPosts WHERE categoryId = (SELECT id FROM forumCategories WHERE slug = 'general') AND (title LIKE '%resource%' OR title LIKE '%book%' OR title LIKE '%learn%' OR title LIKE '%read%') ORDER BY createdAt DESC LIMIT 10` — print results so we can get the correct post ID for Quest 7 |
| 5 | [HUMAN] | Run `node scripts/find-resources-thread.mjs` with DATABASE_URL set. Reply with the post ID of the resources thread. |
| 6 | [CLAUDE CODE] | Once Quest 7 post ID is confirmed by Rye: update all 10 quest `forumUrl` values in `welcomeAboardQuests.ts` using the mapping table above, substituting the real post ID for Quest 7 as `/community/post/[ID]` |

### Part C — Seed Onboarding Quest Threads and Auto-Remap forumUrls

| Step | Agent | Action |
|---|---|---|
| 7 | [CLAUDE CODE] | Write `scripts/seed-onboarding-quest-threads.mjs`. When run with `--execute`: for each of quests 1, 3, 5, 6 in `welcomeAboardQuests.ts`, create a forum post in the `onboarding-quests` category (title = quest title, body = quest `about` text + steps as a prompt for players to reply, categoryId = `onboarding-quests` slug lookup, authorId = team account). After each INSERT, capture the new post ID. **After all posts are created, the script must automatically patch `welcomeAboardQuests.ts`**: read the file, find each quest entry by `id`, and replace its `forumUrl` value with `/community/post/[newId]`. Write the updated file back. This eliminates any manual ID-copy step. When run with `--dry-run`, print what would be created and what forumUrl changes would be made, but write nothing. |
| 8 | [HUMAN] | Run `DATABASE_URL=... node scripts/seed-onboarding-quest-threads.mjs --dry-run` to review. Then run `DATABASE_URL=... node scripts/seed-onboarding-quest-threads.mjs --execute` to create threads and auto-patch `welcomeAboardQuests.ts`. |
| 9 | [CLAUDE CODE] | After the script runs, verify the four updated `forumUrl` entries in `welcomeAboardQuests.ts` are `/community/post/[ID]` format (not category URLs). Commit the change. |

### Part D — Auto-Create Forum Thread on New Quest Creation

**Decision (confirmed by Rye): site-level automation.** When a new quest is created in Admin, automatically create a corresponding forum thread in `quests-gameplay`. This ensures every quest has a dedicated discussion thread without any manual steps.

| Step | Agent | Action |
|---|---|---|
| 10 | [CLAUDE CODE] | In `server/routers.ts`, find the `quests.create` or `admin.createQuest` mutation handler. After the quest is successfully inserted into the DB, add: create a forum post in `quests-gameplay` with title = quest title, body = a standard template ("This is the discussion thread for [Quest Title]. Complete the quest and share your experience here. Questions, reflections, and completions all welcome."), authorId = team admin account ID, categoryId = `quests-gameplay` slug lookup. Use a try/catch so a forum post failure does not roll back the quest creation. |
| 11 | [CLAUDE CODE] | Add a `questForumThreadId` column (nullable INT) to the quests table in `drizzle/schema.ts` + write migration `drizzle/0059_quest_forum_thread_id.sql`. Store the created forum post ID so the quest card can link directly to its thread. |
| 12 | [HUMAN] | Apply migration `0059_quest_forum_thread_id.sql` in Railway |
| 13 | [CLAUDE CODE] | In `client/src/data/welcomeAboardQuests.ts` and wherever quest cards are rendered: if a quest has a `questForumThreadId`, generate the `forumUrl` as `/community/post/[questForumThreadId]` dynamically instead of the hardcoded value. For Welcome Aboard quests (which are static data, not DB quests), keep using the hardcoded `forumUrl` from Part B. |
| 14 | [CLAUDE CODE] | Write `scripts/backfill-quest-forum-threads.mjs`: query all quests in the DB where `questForumThreadId IS NULL`. For each, create a forum thread in `quests-gameplay`. After each INSERT, immediately `UPDATE quests SET questForumThreadId = [newPostId] WHERE id = [questId]` so the link is stored in the same transaction. Print a report of every thread created. `--dry-run` prints what would happen; `--execute` runs it. |
| 15 | [HUMAN] | Run `DATABASE_URL=... node scripts/backfill-quest-forum-threads.mjs --dry-run` to review. Then `--execute`. The quests table is updated automatically — no manual ID copying needed. |

---

## Fix 141: Banner System — Seed DB Content + Fix Hardcoded Season Text

**What:** The site has a mix of DB-driven and hardcoded banners. `BannerDisplay` (used on Home, Apply, Community, Map pages) reads from DB via `trpc.banners.getByKey` — but the DB has no rows yet, so those banners render nothing. Separately, Home.tsx has a fully hardcoded "Fund Launch Announcement" banner (lines 221-240) that is not connected to the DB at all and says "Apply for Season 3" instead of "Apply for Season 2".

The fix has two parts: (1) seed the DB with current banner content so AdminBannerEditor is functional, and (2) convert the hardcoded Fund Launch Banner into a DB-controlled banner so Rye can update it from the Admin panel without a code deploy.

**Done when:** All 5 banner slots (main, apply, community, map, fund-launch) have content in the DB. AdminBannerEditor in Admin.tsx shows and edits real content for each. The Fund Launch Banner on Home.tsx reads from DB (no more hardcoded text). "Apply for Season 2" is correct everywhere.

### Part A — Fix the Immediate Season Text Bug

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | In `Home.tsx` line 236: change `Apply for Season 3` to `Apply for Season 2` — this is a one-line fix, do it immediately regardless of the banner system work below |

### Part B — Seed DB with Current Banner Content

| Step | Agent | Action |
|---|---|---|
| 2 | [CLAUDE CODE] | Write `scripts/seed-banners.mjs`: insert the following banner rows (using `INSERT ... ON DUPLICATE KEY UPDATE`). Each row: `key`, `title`, `content` (Markdown), `isActive: 1`, `createdAt: NOW()`. Banner rows to seed: |

```
key: "main-banner"
title: "Main Site Banner"
content: "" (empty — currently not in use, admin can populate)
isActive: 0

key: "apply-banner"
title: "Apply Page Banner"
content: "" (empty — currently not in use, admin can populate)
isActive: 0

key: "community-banner"
title: "Community Page Banner"
content: "" (empty — currently not in use, admin can populate)
isActive: 0

key: "map-banner"
title: "Map Page Banner"
content: "" (empty — currently not in use, admin can populate)
isActive: 0

key: "fund-launch-banner"
title: "Fund Launch Announcement Banner"
content: "🌱 Fund Launches Late 2026 — Accepting Letters of Intent Now | [Investor Info →](/investor) or [Apply for Season 2](/seasons)"
isActive: 1
```

| Step | Agent | Action |
|---|---|---|
| 3 | [HUMAN] | Run `DATABASE_URL=... node scripts/seed-banners.mjs` to insert the banner rows into Railway DB |

### Part C — Convert Hardcoded Fund Launch Banner to DB-Driven

| Step | Agent | Action |
|---|---|---|
| 4 | [CLAUDE CODE] | Check what columns the `siteBanners` (or whatever the banner table is called) has in `drizzle/schema.ts`. The `BannerDisplay` component already uses `trpc.banners.getByKey` so the tRPC route and table exist. Check if there is a `backgroundColor` or `style` column — if not, we will use inline CSS on the wrapper. |
| 5 | [CLAUDE CODE] | In `client/src/components/BannerDisplay.tsx`: add an optional `className` prop that is already there. The green gradient styling will be applied as a wrapper class from the call site, not stored in DB. Only the text content is DB-controlled. |
| 6 | [CLAUDE CODE] | In `Home.tsx` lines 221-240: replace the entire hardcoded `<div className="bg-gradient-to-r ...">` block with: `<BannerDisplay bannerKey="fund-launch-banner" className="bg-gradient-to-r from-[#7dd87d] via-[#4a9f4a] to-[#7dd87d] text-[#1a472a] py-3 px-4 text-center" />`. The BannerDisplay component renders the content using `renderInlineMarkdown()`, which handles links, so `[Investor Info →](/investor)` and `[Apply for Season 2](/seasons)` in the DB content will render as clickable links. |
| 7 | [CLAUDE CODE] | In `client/src/pages/Admin.tsx`: find the banner editor section (around line 4895). Add `fund-launch-banner` to the list of banner keys with label `"Fund Launch Announcement"` so it appears in the Admin banner editor panel. |
| 8 | [CLAUDE CODE] | Verify that `BannerDisplay` renders the `fund-launch-banner` content correctly when the DB row is active. The animate-pulse emoji and `|` separator are part of the content string and will render inline. The two links render as `<a>` tags via `renderInlineMarkdown`. |

**Note for Claude Code on the migration:** If the `siteBanners` table does not yet have a `key` column or the `trpc.banners.getByKey` route does not exist yet, check `server/routers.ts` for the banners router and `drizzle/schema.ts` for the table definition before writing the seed script. The seed script's INSERT statement must match the actual schema columns exactly.

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

**Wave 5 — Feature fixes (UX bugs and missing connections):**
Fix 131 (ReGenGuide label) → Fix 132 (QuestGameIntro copy — approved, implement now) → Fix 136 (digest link) → Fix 138 (Rites of Passage category + routing) → Fix 139 Part A (Epic Quests coming soon) → Fix 139 Part B (Suggest a Quest placement) → Fix 137 Step 1-2 (blog renderer — numbered lists, do this first) → Fix 137 Steps 3-8 (Tiptap editor upgrade) → Fix 141 Part A (Season 3 → Season 2, one line, do this immediately) → Fix 142 (quest page images — generate, convert, wire in)

**Wave 6 — DB-dependent features (require Railway access):**
Fix 134 (emoji reactions — migration first, then UI) → Fix 135 (land project forum cleanup + backfill) → Fix 140 Parts A+C (new onboarding-quests category + seed threads) → Fix 141 Parts B+C (seed banners to DB, convert fund-launch banner to DB-driven)

**Wave 7 — Copy and human review:**
Fix 132 (QuestGameIntro — Rye edits copy, then Claude Code implements) → Fix 133 (forum post ID audit — requires DB query output from Rye) → Fix 140 Part B Steps 5-6 (Quest 7 resources thread ID from Rye, then update forumUrls)

**Wave 8 — Auto-quest thread creation:**
Fix 140 Part D (auto-create forum thread on new quest creation — after DB migrations are applied)

**Wave 9 — Human steps:**
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

## Fix 143: Admin Panel — World-Class Redesign

**What:** The admin panel has grown organically to cover 13+ tabs, two navigation rows, a flat visual hierarchy, no bulk actions, no keyboard navigation, and several empty/broken data states. It works, but it doesn't reflect the sophistication of what it manages. This fix brings it to world-class: fast, beautiful, role-aware, and built for running a fund + incubator + community governance operation daily.

**Done when:** The admin panel has a persistent sidebar, a priority-first home view, wired Impact Stats, bulk actions on all list views, keyboard shortcuts, an application timeline, a season/cohort view, a token ledger, and a smart notification center. All improvements below are addressed.

---

### The 25 Improvements (15 + 10 new from research)

#### Category 1 — Navigation and Structure

**Fix 143-1: Replace dual tab rows with a persistent left sidebar.**
Current: 2 rows of 13+ tabs. Target: Collapsible sidebar with 3 grouped domains:
- **Ecosystem** (Overview, Applications/Projects, Alliance, Roles)
- **Fund** (Investors, LOIs, Crowd Pooling)
- **Community** (Players, Forum, Quests, Newsletter, Broadcast)
- **Operations** (Banners, Kanban, Images, Custom Games, Settings, Analytics)

Sidebar collapses to icon-only "mini mode" via toggle — adds back ~200px of working space. Top bar keeps Search + Shortcuts + Logout only.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | In `Admin.tsx`, replace the two-row tab bar with a `<AdminSidebar>` component. Groups defined as a config array. Use `react-router` or tab state to drive active section. Icons from `lucide-react`. Sidebar state (expanded/collapsed) persisted in `localStorage`. |
| 2 | [CLAUDE CODE] | Add keyboard shortcut `[` to toggle sidebar collapse. |

**Fix 143-2: Promote urgent alerts to top of Overview, above the stat cards.**
Current: "Today's Focus" with 2 red alerts sits below the fold. Target: A sticky `<AdminAlertBanner>` rendered above everything else, showing only items that are red/overdue. Items due within 48h show in amber below it. Green = hidden from the top. Clicking an alert takes you directly to the relevant record.

| Step | Agent | Action |
|---|---|---|
| 3 | [CLAUDE CODE] | Create `<AdminAlertBanner>` component. Query: overdue inquiries (>48h), stale investors (>48h new status), applications pending >7 days. Color: red background for overdue, amber for approaching. Each alert is a link. Max 5 alerts shown; "View all" expands. |

**Fix 143-3: Consolidate the Overview bottom half — remove restatements, add a 7-day activity sparkline.**
"Submissions This Month" restates what the 4 stat cards already say. Replace with: a 7-day applications trend sparkline, a "Response rate (rolling 7 days)" metric, and a "Last action taken" timestamp per pipeline.

| Step | Agent | Action |
|---|---|---|
| 4 | [CLAUDE CODE] | Remove "Submissions This Month" card. Add a `<ActivitySparkline>` component using recharts `<AreaChart>` pulling from existing submissions data, filtered to last 7 days. Shows applications + inquiries on the same axis. |

---

#### Category 2 — Data and Metrics

**Fix 143-4: Wire up Impact Stats (Total Acres, Families, Humans) from application form data.**
The 4 cards show 15 Projects Applied but 0 Acres, 0 Families, 0 Humans. The application form collects this data but it isn't aggregated into the admin stats query.

| Step | Agent | Action |
|---|---|---|
| 5 | [CLAUDE CODE] | In `server/routers.ts`, find the admin stats query (the one returning `totalApplications`, etc.). Add SUM queries: `SUM(CAST(acreage AS UNSIGNED))`, `SUM(CAST(families AS UNSIGNED))`, `SUM(CAST(humanCount AS UNSIGNED))` across all applications. Check the exact column names in `drizzle/schema.ts` — the form fields map to the application table. |
| 6 | [CLAUDE CODE] | In `Admin.tsx` Impact Stats section: replace `0` hardcodes with the real values from the query response. |
| 7 | [CLAUDE CODE] | If the form fields are stored as strings (common in application forms), use `CAST(... AS UNSIGNED)` and filter out NULL/empty. Add a note in the UI: "Based on self-reported application data." |

**Fix 143-5: Season/Cohort Management view.**
Applications are currently mixed into one pipeline with no concept of season. Add a Season filter + a dedicated Season Overview card showing: Season 1 projects (count + status), Season 2 applications (count + status), Season 3 (applications open/closed).

| Step | Agent | Action |
|---|---|---|
| 8 | [CLAUDE CODE] | Add a `season` field to the Applications list filter (dropdown: All / Season 1 / Season 2 / Season 3). Query already returns application data — just filter by `season` column if it exists, or by date range if not. |
| 9 | [CLAUDE CODE] | Add a `<SeasonOverview>` card to the Overview page showing season breakdown. If season column doesn't exist in schema, derive from `createdAt` date ranges (Season 1: before X, Season 2: X–Y, Season 3: Y+). Hardcode the date ranges from the actual season launch dates. |

**Fix 143-6: Token and Contribution Ledger view.**
The admin has no visibility into token distribution. Add a "Governance" section (under Ecosystem) showing: total RGVoice in circulation, total REGEN in circulation, top 10 token holders, total contribution value logged, verified vs. unverified split.

| Step | Agent | Action |
|---|---|---|
| 10 | [CLAUDE CODE] | In `server/routers.ts`, add `admin.getTokenStats` query: count players with walletAddress, sum `rvoiceBalance` and `rgenBalance` across all profiles, count contributions by status (verified/pending). |
| 11 | [CLAUDE CODE] | Create `<AdminGovernancePanel>` component in Admin.tsx: shows the above stats as 4 KPI cards + a table of top 10 token holders (player name, rvoice, rgen, last sync date). |

---

#### Category 3 — Usability and Workflow

**Fix 143-7: Add "Verify", "Unverify", "Ban", and "Delete" actions to the Roles/Players section.**
No verify action exists in the UI. Every player row needs a full action set: verify, unverify, ban (with email blocklist), and delete.

| Step | Agent | Action |
|---|---|---|
| 12 | [CLAUDE CODE] | In the Players/Roles tab in `Admin.tsx`: add an action menu (3-dot or inline buttons) to each player row with: "Verify" (calls `trpc.playerProfiles.verify`), "Unverify" (calls new `trpc.playerProfiles.unverify` mutation that sets `isVerified: 0`), "Ban Player" (opens a confirmation modal with an optional reason field, calls new `trpc.playerProfiles.banPlayer` mutation), "Delete Profile" (confirmation required, calls new `trpc.playerProfiles.deleteProfile` mutation). Show a Verified/Unverified/Banned filter toggle at the top of the player list. |
| 13 | [CLAUDE CODE] | In `server/routers.ts`, add the following admin-only mutations: `playerProfiles.unverify` — sets `isVerified: 0` on profile. `playerProfiles.banPlayer` — takes `{ profileId, reason? }`, sets `isBanned: 1` on the player profile, and inserts a row into a `bannedEmails` table with the player's email + reason + `bannedAt` timestamp (so the email cannot re-register). `playerProfiles.deleteProfile` — hard-deletes the player profile row; also inserts into `bannedEmails` so re-registration with the same email is blocked. |
| 14 | [CLAUDE CODE] | Add `bannedEmails` table to schema: `id, email (UNIQUE), reason TEXT nullable, bannedBy INT (adminUserId), bannedAt DATETIME`. Migration: `drizzle/0063_banned_emails.sql`. In the auth signup flow (wherever new user registration happens), check `bannedEmails` before creating the account and return a generic "Unable to create account" error if the email is found — do not reveal that the email is banned. |
| 15 | [HUMAN] | Apply migration `0063` in Railway. |

**Fix 143-8: Bulk actions on all list views.**
No list in the admin supports multi-select. Add checkbox column + sticky bulk action bar to: Applications list, Inquiries list, Players list.

| Step | Agent | Action |
|---|---|---|
| 16 | [CLAUDE CODE] | Create `<BulkActionBar>` component: appears at bottom of screen when 1+ items are checked. Shows "X selected" + action buttons. For Applications: "Move to Reviewed", "Send template email", "Export CSV". For Inquiries: "Mark reviewed", "Archive". For Players: "Verify selected", "Unverify selected", "Ban selected" (opens single modal to enter one reason applied to all). |
| 17 | [CLAUDE CODE] | Add checkbox to the first column of each list table. "Select all" checkbox in header. Selected state managed in local component state. |

**Fix 143-9: Application timeline / audit trail.**
Every application should show a chronological log of every status change, email sent, note added, and admin action taken. This is critical for fund-level accountability.

| Step | Agent | Action |
|---|---|---|
| 18 | [CLAUDE CODE] | Add an `applicationEvents` table to schema: `id, applicationId, eventType (status_change|email_sent|note_added|admin_action), description, adminUserId, createdAt`. Write migration `drizzle/0060_application_events.sql`. |
| 19 | [HUMAN] | Apply migration in Railway. |
| 20 | [CLAUDE CODE] | In `server/routers.ts`: log an event whenever an application status changes, an email is sent to an applicant, or a note is saved. |
| 21 | [CLAUDE CODE] | In the application detail view in Admin.tsx: add a `<ApplicationTimeline>` component below the main details. Shows events in reverse chronological order. Each event has icon (status dot, email envelope, note icon), description, admin name, timestamp. |

**Fix 143-10: Keyboard navigation throughout.**
Admin is mouse-only. Add:

| Step | Agent | Action |
|---|---|---|
| 22 | [CLAUDE CODE] | In `Admin.tsx`, add a `<KeyboardShortcutsProvider>` using a `useEffect` + `keydown` listener. Shortcuts: `?` → show shortcut overlay, `[` → toggle sidebar, `/` → focus search (already works), `j/k` → next/prev row in active list, `Enter` → open selected row, `r` → reply/respond to selected inquiry, `v` → verify selected player, `Escape` → close modal/drawer. |
| 23 | [CLAUDE CODE] | Create `<ShortcutHelpOverlay>` component: a modal triggered by `?` that shows a clean two-column grid of all shortcuts, styled like Linear's shortcut panel. |

---

#### Category 4 — Intelligence and Relationship Views

**Fix 143-11: Smart Notification Center with snooze.**
Replace the static "19 items pending review" count with a notification center drawer that has: priority-sorted items, per-item snooze (1 day, 3 days, 1 week), "mark handled", and a notification history log.

| Step | Agent | Action |
|---|---|---|
| 24 | [CLAUDE CODE] | Create `<AdminNotificationCenter>` drawer component (slides in from right). Sections: "Needs Action Now" (red), "Coming Up" (amber), "Recently Handled" (grey). Each notification: title, context, age, action buttons inline (Reply, Archive, Snooze). |
| 25 | [CLAUDE CODE] | Add `adminNotifications` table: `id, type, entityId, entityType, message, snoozedUntil, handledAt, createdAt`. Migration `drizzle/0061_admin_notifications.sql`. |
| 26 | [HUMAN] | Apply migration. |
| 27 | [CLAUDE CODE] | Wire notification bell icon in Admin top bar to the drawer. Show unhandled count as badge. |

**Fix 143-12: Inline CRM notes on applications, investors, and inquiries.**
Any record should support timestamped notes written by admins, visible in the list view as a "Last note: X days ago — [preview]" field.

| Step | Agent | Action |
|---|---|---|
| 28 | [CLAUDE CODE] | Add `notes` field (TEXT) to applications, investors, and inquiries tables if not present. Migration `drizzle/0062_entity_notes.sql`. |
| 29 | [HUMAN] | Apply migration. |
| 30 | [CLAUDE CODE] | In each detail view: add a `<CRMNotes>` component — a small textarea + "Save note" button at the bottom. Show the last 3 notes in reverse order with timestamp and admin name. Show "Last note: X days ago" preview text in the list row. |

**Fix 143-13: Email draft queue for batch responding to inquiries.**
With 19 pending inquiries, the admin needs a "Batch Respond" mode: auto-draft a response to each inquiry (using email templates), Rye reviews and edits each draft in a queue, then sends all with one click.

| Step | Agent | Action |
|---|---|---|
| 31 | [CLAUDE CODE] | Add a "Batch Respond" button to the Inquiries tab. Opens a `<BatchResponseQueue>` fullscreen modal showing all unresponded inquiries in a vertical list. Each has: inquiry text on left, pre-filled response (from closest matching email template) on right as an editable textarea. "Send All" button at top sends all. "Skip" removes one from the batch. |

**Fix 143-14: Bioregion intelligence in the admin Overview.**
The public Globe shows where projects are. The admin should show: a small inline map or table of applications by region, highlighting which bioregions have zero activity and which are most active. Strategic for knowing where to focus outreach.

| Step | Agent | Action |
|---|---|---|
| 32 | [CLAUDE CODE] | In the Overview page, below the stat cards: add a `<BioregionBreakdown>` component. Shows a simple bar chart (using recharts) of application count by region (extracted from `location` field on applications). Bars colored green for active projects, amber for in-review, grey for no activity. |

**Fix 143-15: Visual density toggle (comfortable vs. compact).**
Some sessions (quick morning check) need compact tables. Others (deep review) need comfortable spacing. A density toggle lets Rye switch without a code change.

| Step | Agent | Action |
|---|---|---|
| 33 | [CLAUDE CODE] | Add a density toggle (icon button: lines-compact vs. lines-comfortable) to the top-right of the admin panel. Persisted in `localStorage`. When "compact": reduce table row padding from `py-3` to `py-1.5`, reduce font size in tables from `text-sm` to `text-xs`. When "comfortable": current default. Apply via a CSS class on the admin root element. |

---

---

## Fix 144: Token Balance — Debug, Logging, and Manual Refresh Fix

**What:** Token balances are showing 0 on Rye's profile despite having 1,112 RGVOICE and 111 REGEN on-chain. The Alchemy `BASE_RPC_URL` was set in Railway and deployed, but there are two compounding problems: (1) the 5-minute server-side rate limit is silently blocking manual refresh attempts because the broken RPC already ran and stored `lastTokenSync = now` with `rvoice = 0`, and (2) `ethCall` swallows all errors silently — RPC failures produce no logs anywhere, making it impossible to diagnose.

**Also:** Rye can't find the "Refresh balances" button. It exists in `ProfileCard` but is hidden when `isOwner` is false or when viewing the token stats section lower on the page that doesn't pass `onSyncTokens`.

**Done when:** Token balances show correctly for Rye. Manual refresh always hits the blockchain. RPC errors appear in Railway logs. The refresh button is visible in all token display locations.

**Fix 144-1: Add error logging to `ethCall` in `blockchain.ts`.**
Silent errors make RPC failures invisible in Railway logs.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | In `server/blockchain.ts`, change the `catch` in `ethCall` to log before returning null: `console.error('[blockchain] ethCall failed:', { to, error: e instanceof Error ? e.message : String(e) })`. Also log a warning if `json.error` is present: `console.warn('[blockchain] eth_call returned error:', json.error, 'to:', to)`. This makes RPC failures visible in Railway logs without changing the fallback behavior. |

**Fix 144-2: Separate manual refresh from rate-limited auto-sync.**
The "Refresh balances" button should always hit the blockchain, not return a rate-limited cache. Only the automatic page-load sync should be rate-limited.

| Step | Agent | Action |
|---|---|---|
| 2 | [CLAUDE CODE] | In `server/routers.ts`, add a new mutation `playerProfiles.forceSync` (protected, no rate limit). It calls `fetchTokenBalances`, saves results, returns `{ rvoice, rgen, cached: false }`. This is what the manual button calls. The existing `syncTokens` mutation keeps its 5-minute rate limit for auto-syncs. |
| 3 | [CLAUDE CODE] | In `client/src/pages/PlayerProfile.tsx`, update the "Refresh balances" button's `onClick` to call `trpc.playerProfiles.forceSync.useMutation` instead of `syncTokens`. The auto-sync `useEffect` on page load continues to call `syncTokens` (rate-limited). |

**Fix 144-3: Make the refresh button visible everywhere tokens are displayed.**
The button is inside `ProfileCard` and passes `isOwner` correctly, but the token display section lower on the page (the `TokenStats` or similar component around line 1684) does not have a refresh button at all.

| Step | Agent | Action |
|---|---|---|
| 4 | [CLAUDE CODE] | Find all locations in `PlayerProfile.tsx` that display `rvoiceBalance` or `rgenBalance`. Ensure that any token display section that is visible to the profile owner also has a small "Refresh" icon button (using `RefreshCw` from lucide-react) that calls `forceSync`. The button should show a spinner while pending and display "Updated [time]" after success. |

**Fix 144-4: Admin force-sync in the Players section.**
Admins should be able to trigger a fresh on-chain read for any player without waiting for their auto-sync window.

| Step | Agent | Action |
|---|---|---|
| 5 | [CLAUDE CODE] | In the Players section of `Admin.tsx`, add a "Sync Tokens" action to each player row's action menu (alongside Verify/Ban/Delete). Calls the existing `trpc.playerProfiles.adminSyncTokens.mutate({ profileId })`. Shows last sync time and current balances in the row. |

**Fix 144-5: Log the active RPC URL on server startup.**
Makes it trivial to confirm in Railway logs whether the env var took effect.

| Step | Agent | Action |
|---|---|---|
| 6 | [CLAUDE CODE] | In `server/blockchain.ts`, add a one-time startup log at module load: `console.log('[blockchain] BASE_RPC:', process.env.BASE_RPC_URL ? 'custom (Alchemy)' : 'fallback (public mainnet.base.org)')`. This prints once on deploy and confirms the right URL is active. |

**Fix 144-6: Wallet address null — clearer UX and admin shortcut.**
Root cause of tokens showing 0: the profile UI shows "Add your wallet address in Settings to sync balances" which means `walletAddress` is null on the player profile row in the DB. The wallet exists on-chain but has never been saved to the profile. The refresh button is gated on `walletAddress` being set, so it never appears.

**Immediate action for Rye (not a code change):** Go to `/profile?tab=settings`, paste in your wallet address (`0xaAaFEF50DF2db72AB25457746C8adAC91FB5354e`), and save. Tokens should sync on the next page load.

| Step | Agent | Action |
|---|---|---|
| 7 | [CLAUDE CODE] | In `ProfileCard`, the "Add your wallet address in Settings" message is text-only. Replace it with a button that navigates directly to `/profile?tab=settings`. This removes the dead-end for users who don't know where Settings is. |
| 8 | [CLAUDE CODE] | In the Settings tab form, make the wallet address field more prominent: add a label "Your Base wallet address" with helper text "Required to sync RGVoice and REGEN token balances." Currently it may be buried in a generic form. |
| 9 | [CLAUDE CODE] | In the admin Players list, add `walletAddress` as a visible column (truncated to `0xAbCd...1234` format). Rows with no wallet address should show a "No wallet" badge in amber. This makes it easy to spot profiles that can never sync tokens. |

---

### Implementation Order for Fix 143

**Phase 1 (Claude Code autonomous, high impact, no DB):**
143-1 (sidebar), 143-2 (alert banner top), 143-3 (sparkline), 143-4 (Impact Stats wiring), 143-8 (bulk actions), 143-10 (keyboard nav), 143-15 (density toggle)

**Phase 2 (requires DB migrations):**
143-7 (verify/unverify/ban/delete + bannedEmails table — migration 0063), 143-9 (application timeline — migration 0060), 143-11 (notification center — migration 0061), 143-12 (inline notes — migration 0062)

**Phase 3 (intelligence features, build after Phase 2):**
143-5 (season view), 143-6 (token ledger), 143-13 (batch email queue), 143-14 (bioregion breakdown)

---

---

## Fix 145: Remove "Total Contribution Value" from Profile Card

**What:** The ProfileCard shows a "Total Contribution Value: $0" card at the bottom of the token section. This will read $0 for everyone for a long time, looks broken, and clutters the card. Remove it entirely.

**Done when:** The ProfileCard no longer renders the Total Contribution Value row. No broken layout gaps remain.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | In `client/src/pages/PlayerProfile.tsx`, find the "Total Contribution Value" card/row in `ProfileCard` (around line 527-550 based on screenshots) and remove it. Also remove any associated `totalContributionValue` prop from the component interface if it's not used elsewhere. Check that removing it doesn't leave a visual gap (adjust padding/spacing if needed). |

---

---

## Fix 146: Remove Quest Journal Form + Collapse Quest Duplication on Profile Overview

**What:** Two problems on the profile overview tab:

1. The "Quest Journal" section has a "+ Log a completion" button that opens a form with Quest ID, Quest title, and Artifact URL fields. Quest completions happen through the forum — not through a standalone form. This form is disconnected from the actual completion flow, confusing, and should be removed.

2. The overview tab shows all the quests again even though there is a dedicated "Quests" tab. This duplicates content and makes the overview cluttered. Remove the inline quest list from the overview.

Replace both with a single CTA box: "Explore Onboarding Quests" that switches the active tab to the quests tab when clicked.

**Done when:** The Quest Journal completion form is gone. The overview tab has no inline quest list. A clean CTA box sits where the quest section was, and clicking it navigates to the quests tab.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | In `PlayerProfile.tsx`, find the "Quest Journal" section on the overview tab. Remove the `<QuestJournal>` or equivalent component, including the `+ Log a completion` button, the form (Quest ID / Quest title / Artifact URL fields), and the `Log completion` / `Cancel` buttons. Also remove any `logCompletion` mutation and state it relies on, if not used elsewhere. |
| 2 | [CLAUDE CODE] | Find where the quests are listed inline on the overview tab (likely a `questsCompleted` map or a static list of quest cards). Remove the inline quest list. |
| 3 | [CLAUDE CODE] | In the space where the quest section was, add a simple CTA box: a rounded card with a book or compass icon, the text "Explore Onboarding Quests", a short subtext line ("Complete quests to earn tokens, deepen your practice, and root yourself in the game."), and a button "View Quests" that calls `setActiveTab("quests")` (using the existing tab state). Style it to match the contribution/token section aesthetic. |

---

## Fix 147: Form Memory — Server-Side Truth for Newsletter and Investor Gate

**What:** Three related problems, one root cause.

**Problem 1 — "Learn About Investing" popup is circular on `/investor`.** The `ExitIntentCapture` component fires its "investor" context on the `/investor` page itself. The popup button does `window.location.href = '/investor'` — it just reloads the page you're already on. This is a useless loop. The popup should be suppressed on `/investor` entirely (you're already there).

**Problem 2 — Newsletter popup shows again after browser data clears.** The `isNewsletterSubscribed()` function in `newsletter.ts` only reads `localStorage.getItem("newsletter_subscribed")`. When a user clears browser data or hard-refreshes with devtools open (which can clear site data), that flag is gone and the popup fires again. The newsletter subscriber data lives in the DB — the client never consults it.

**Problem 3 — Investor gate at `/opportunity` redirects even when the user is logged in and has already submitted.** The gate checks ONLY `localStorage.getItem('investor_verified')`. Clearing browser data (which happens routinely when viewing new deploys) wipes that flag. The redirect then fires synchronously in `useEffect` before any server check can run — so a logged-in user who submitted 6 months ago still gets bounced. localStorage alone is not acceptable as the gate mechanism.

**The fix:** The server is the source of truth. localStorage is a fast-path cache only. For logged-in users, the gate MUST wait for a server response before deciding to redirect. If the server says the user submitted, they pass — full stop, regardless of localStorage state.

**Done when:** A logged-in user who has submitted the investor form is never redirected to `/investor` again under any circumstances, including after clearing browser data, switching browsers, or opening the page in a new device. Anonymous users fall back to localStorage as before. The investor popup is gone from `/investor`. Newsletter popups respect DB state for logged-in users.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | In `ExitIntentCapture.tsx`, update `getPageContext` (or add a guard in `triggerModal`) to suppress the exit intent popup entirely when `pathname === '/investor'`. The investor popup only makes sense on pages like `/fund`, `/opportunity`, `/loi` — not on the form page itself where the user is actively filling it out. |
| 2 | [CLAUDE CODE] | In `server/routers.ts`, add `newsletter.hasSubscribed`: a `protectedProcedure` query (no input) that checks whether `ctx.user.email` exists in the `newsletterSubscribers` table. Returns `{ subscribed: boolean }`. |
| 3 | [CLAUDE CODE] | In `server/routers.ts`, add `investorInquiries.hasSubmitted`: a `protectedProcedure` query (no input) that checks whether `ctx.user.email` exists in the `investorInquiries` table. Returns `{ submitted: boolean }`. |
| 4 | [CLAUDE CODE] | In `ExitIntentCapture.tsx`, call `trpc.newsletter.hasSubscribed.useQuery(undefined, { enabled: !!user })` (skip if not logged in). In the `triggerModal` guard, also check this server result. When the query returns `subscribed: true`, call `markNewsletterSubscribed()` to resync localStorage, and suppress the popup. |
| 5 | [CLAUDE CODE] | Rewrite the gate logic in `Opportunity.tsx` as follows. Get `user` from auth context. Call `trpc.investorInquiries.hasSubmitted.useQuery(undefined, { enabled: !!user })`. Gate decision logic: (a) If user is logged in AND query is loading → show "Verifying access..." spinner, do NOT redirect yet. (b) If user is logged in AND `hasSubmitted.data?.submitted === true` → allow access, resync localStorage with `localStorage.setItem('investor_verified', 'true')`. (c) If user is logged in AND `hasSubmitted.data?.submitted === false` → check localStorage as fallback, then redirect to `/investor` only if localStorage also says no. (d) If user is NOT logged in → use current localStorage-only logic (no change for anonymous users). This makes the server check decisive for authenticated users and eliminates the race condition where redirect fires before the server responds. |
| 6 | [CLAUDE CODE] | In `InvestorForm.tsx`, after `onSuccess`, if the user is logged in, invalidate the `investorInquiries.hasSubmitted` query so any open `/opportunity` gate re-checks immediately without needing a page reload. |

---

## Fix 148: `/opportunity` Page Performance

**What:** The `/opportunity` page runs slow due to several compounding issues found in the code:

1. **4+ unthrottled scroll event listeners running simultaneously.** `FundStatusBanner`, `TableOfContents`, `MobileTableOfContents`, and `ReadingProgress` each attach their own `window.addEventListener('scroll', handler)` with no throttle or debounce. On a long investor page with heavy content, this fires hundreds of setState calls per scroll and causes cascading re-renders across all four components.

2. **Gate adds a redirect round-trip before page renders.** Currently, if localStorage is cleared, the gate redirects synchronously on mount — the user sees a flash and a redirect instead of the page. With Fix 147 landing, this improves for logged-in users, but the "Verifying access..." spinner must be fast and non-jarring.

3. **1,896-line single component with many simultaneous `AnimatedSection` wrappers.** Every section on the page is wrapped in an `AnimatedSection` (`slide-up`, `fade-in`, `scale-in`). If `AnimatedSection` uses scroll-position checks rather than `IntersectionObserver`, all of these trigger recalculations on scroll, stacked on top of the 4 listener problem above.

4. **`CollapsibleSection` height measurement triggers layout thrashing.** The component uses `useRef` + `contentRef.current.scrollHeight` in a `useEffect` on mount and resize. If there are many collapsible sections (and there are), all measuring simultaneously, this can block the main thread during initial render.

5. **Both `TableOfContents` AND `MobileTableOfContents` mount and attach listeners simultaneously** even though only one is visible at a time.

**Done when:** Scroll performance is smooth on `/opportunity`. No unthrottled scroll listeners. Collapsible sections don't cause layout thrash on load. The page scores 90+ on Lighthouse performance.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Create a shared `useThrottledScroll(handler, delay = 100)` hook in `client/src/hooks/useThrottledScroll.ts`. Uses `requestAnimationFrame` for throttling (more precise than `setTimeout`). Replace all raw `window.addEventListener('scroll', ...)` calls in `FundStatusBanner`, `TableOfContents`, `MobileTableOfContents`, and `ReadingProgress` with this hook. This collapses 4 scroll handlers into throttled RAF callbacks that don't compete. |
| 2 | [CLAUDE CODE] | In `Opportunity.tsx`, render only one of `TableOfContents` / `MobileTableOfContents` based on a `useMediaQuery('(min-width: 1024px)')` hook. Currently both mount, both attach scroll listeners, and CSS hides one. Make the hidden one not mount at all. |
| 3 | [CLAUDE CODE] | In `AnimatedSection`, confirm it uses `IntersectionObserver` (not scroll position). If it currently uses scroll position to trigger animations, rewrite it to use `IntersectionObserver` with `threshold: 0.1`. This removes all animation-related scroll calculations entirely — IO fires once per element, not on every scroll event. |
| 4 | [CLAUDE CODE] | In `CollapsibleSection`, remove the `useEffect` that measures `contentRef.current.scrollHeight` on mount. Instead, use CSS `max-height` transition: closed = `max-height: 0`, open = `max-height: none` (or a large value like `9999px`) with `overflow: hidden` and `transition: max-height 300ms ease`. This eliminates JS layout measurement entirely and achieves the same animation with pure CSS. |
| 5 | [CLAUDE CODE] | In `Opportunity.tsx`, wrap the heaviest below-the-fold sections (everything past the first 3 content sections) in `<Suspense>` with a skeleton fallback, using `React.lazy` to defer their render. The first screen (hero + fund status + first CollapsibleSection) should render immediately; the rest can hydrate as the user scrolls down. |

---

---

## Fix 149: `/opportunity` Visual Upgrades — 20 Investor WOW Items

**What:** The `/opportunity` page functions well but doesn't yet signal the level of craft and institutional credibility that a serious fund page needs. These 20 upgrades — drawn from research on top-tier fund pages (Generation IM, Moonfare, Obvious Ventures, iCapital, Republic) plus performance-safe animation patterns — bring it to world-class. All animations use `IntersectionObserver` or CSS-only patterns and avoid scroll listeners.

**Done when:** All 20 items implemented. The page feels like a Bloomberg terminal crossed with a regenerative prospectus — serious, living, confident.

---

### First 10 (already approved)

**149-1: Count-up animation on Fund Snapshot stats.**
When the Fund Snapshot scrolls into view, key numbers roll up from zero (`0 → $25M–$50M`, `0% → 12–18%`). Implement `useCountUp(target, duration)` hook using `requestAnimationFrame`, triggered by `IntersectionObserver`. Fires once per session.

**149-2: $RCivics column glow entrance on comparison table.**
When the comparison table scrolls into view, the `$RCivics` column header pulses once with a gold shadow (`box-shadow: 0 0 20px rgba(255,215,0,0.4)`), and each green cell in that column fades in 80ms staggered after the others. Pure CSS + `IntersectionObserver`.

**149-3: Alliance network scrolling marquee strip.**
A full-width CSS-only infinite horizontal marquee of alliance org names beneath the hero: Hypha, SEEDS, Kinship Earth, Closer.earth, Impact Hub, OASA.earth, New Earth Summit, Planetary Party, Holomovement, and others from the existing list on the page. `animation: marquee 40s linear infinite`. Zero JS. Signals real ecosystem scale immediately.

**149-4: Animated allocation donut chart.**
Replace the static "60 / 30 / 10" allocation text with a recharts `PieChart` (already imported) that draws in on mount with `isAnimationActive={true}`. Each slice labelled. Hover states expand slice and show tooltip. Investors read charts faster than text.

**149-5: Investor Document Vault section.**
Replace the lone "Download Slides" header button with a 3-card section near the bottom: "Pitch Deck" (downloadable), "Executive Summary" (downloadable), "Term Sheet" (lock icon — "Available after LOI submission"). Each card shows file type badge, last-updated date, and file size. Signals institutional-grade preparation.

**149-6: Sticky mobile LOI bar.**
On screens below 768px, after 400px scroll, a bar slides up from the bottom: gold background, "Ready to move forward? Submit LOI →" with one button. Currently mobile investors have no visible CTA after passing the header. This is a direct conversion fix.

**149-7: Reading progress bar (premium styling).**
Upgrade `ReadingProgress` to gold (`#ffd700`), 3px height, subtle glow (`box-shadow: 0 0 6px rgba(255,215,0,0.5)`). Add a small pill in the top-right showing "Section 3 of 9" as the user scrolls through `CollapsibleSection` anchors. Feels like a serious document reader.

**149-8: Testimonial / signal strip.**
2–3 short quote cards from advisors, early contributors, or community leaders. Name, 1-sentence quote, small avatar. If real quotes aren't confirmed yet, add placeholder cards with a lock overlay labeled "Early Investor, Q1 2026." Showing social proof from insiders is the highest-trust signal a fund page can display.

**149-9: "The Track Record" animated timeline.**
A vertical timeline revealing on scroll, showing 7 milestones. Each step uses `IntersectionObserver` staggered CSS reveal — the connector line draws downward as you scroll. Content:
- **2017** — Published the SEEDS whitepaper: a PhD-level dissertation on regenerative economic systems for the blockchain age. The intellectual foundation.
- **2019** — Launched SEEDS: a live digital economy and governance system on the blockchain.
- **2020** — SEEDS grows to 10,000 people across 40+ countries and 300+ organizations. Launched Hypha, the DAO and governance tooling powering the ecosystem.
- **2021** — Launched Season 1 of ReGen Civics. The game begins.
- **2021–2025** — Four years building relationships, refining technology, and conducting research. Preparing for the right window.
- **2026** — Fund I opens. The window is now.

Framing copy at the top: "You're not joining the start of something. You're joining an active train with 9 years of track behind it."

**149-10: Subtle grain texture + depth on hero.**
Add a 2–3% opacity SVG noise texture overlay as a `::before` pseudo-element on the hero section. Add `backdrop-filter: blur(0.5px)` on the stat cards. 15-line CSS change. Makes the page feel like a printed prospectus. Signals craft at the micro-detail level.

---

### Next 10 (from deep research on institutional fund pages)

**149-11: Upgrade the existing governance section visually — don't duplicate it.**
The page already has a strong governance section covering LP vs GP roles, the 40/20/20/20 council breakdown, GP carry, and time commitment. The content is right. The presentation isn't yet pulling its weight. Upgrade it in place: replace the flat percentage pill boxes with an animated arc/donut that draws in on scroll, add a subtle SVG connector showing the four seat types converging on a center "Fund" node, and give the "YOU vote on how carry funds are deployed" line a gold highlight — because for an investor, that sentence is the whole argument.

| Step | Agent | Action |
|---|---|---|
| (see implementation note below) | [CLAUDE CODE] | Find the existing "Who is the GP?" section in `Opportunity.tsx`. Replace the static percentage pill boxes (40% Council, 20% Land Projects, 20% Alliance, 20% Investors) with an animated SVG arc/donut visualization that draws in on `IntersectionObserver` trigger. Each arc segment labeled with percentage and constituency. Add a subtle CSS-animated connector SVG below it: lines from each seat type converging at a center "Fund Treasury" node, drawing in sequentially on scroll. Give the "YOU vote on how carry funds are deployed through governance proposals." line `text-[#ffd700]` color with a gentle glow. No new content — visual upgrade only. |

**149-12: Live fund deal flow ticker — defer until traction.**
*(Deferred — implement once inquiry/application counts are meaningful enough to signal momentum. Premature display of low numbers weakens rather than strengthens trust. Revisit when: 50+ inquiries, 30+ applications, or at first close.)*

**149-13: Investor journey steps — merge into existing step-by-step.**
The page already has a step-by-step section at the bottom. Rather than a second component, extend that existing section with the full LOI → Accreditation → Term Sheet → Capital Call → Distributions flow. Each step gets a numbered circle, connecting line, and 1-sentence description. Staggered CSS reveal on scroll. The goal is one clean investor journey, not two separate sections covering overlapping ground.

| Step | Agent | Action |
|---|---|---|
| (see implementation note below) | [CLAUDE CODE] | Find the existing step-by-step or "how it works" section at the bottom of `Opportunity.tsx`. Extend it to include all 5 investor journey steps (Submit LOI → Accreditation → Term Sheet → Capital Call → Quarterly Distributions) with numbered circles connected by a line. Add `IntersectionObserver` staggered CSS reveal. Do not create a new component — expand the existing one. |

**149-14: Case study section — placeholder now, real content later.**
The page needs a case study slot. Build the component shell now with a placeholder project: "Project name in review — Costa Rica" with the structure (problem, investment thesis, projected IRR, impact metrics) shown as a card with a lock overlay reading "Full case study available to LOI holders." This signals to investors that the depth is coming, without requiring real content yet. Rye will provide the real case study when ready.

| Step | Agent | Action |
|---|---|---|
| (see implementation note below) | [CLAUDE CODE] | Create `<CaseStudyCard>` component. Props: `project`, `location`, `status: "preview" \| "full"`. When `status === "preview"`, render the card structure with placeholder data and a semi-transparent lock overlay showing "Full case study available after LOI submission." Wire into Opportunity.tsx with one placeholder card. |

**149-15: "LP Dispatch" email signup.**
A quarterly update newsletter positioned for capital partners: "Get quarterly updates on fund progress, portfolio developments, and co-investment opportunities." Name + email form, no friction. Builds the qualified investor list before close, signals ongoing LP communication. Add a subtle shimmer animation on the card border on hover (`background: linear-gradient(90deg, transparent, rgba(255,215,0,0.15), transparent)` moving left-to-right).

**149-16: SEC/compliance confidence strip.**
A single clean bar positioned just above the risk disclosure section: "Regulation D 506(c) · Accredited Investors Only · SEC-Exempt Offering." Small text, unobtrusive. Institutional LPs notice when it's missing. Its presence signals the team has done this before and understands the regulatory landscape.

**149-17: Animated progress bars for market size data.**
Replace the static market size table ($2.3T urban regeneration, $1.4T green building, $35T+ sustainable assets) with horizontal progress bars that draw in left-to-right on scroll. The $35T bar fills nearly the full container width. CSS `transition: width 1.2s ease-out` triggered by `IntersectionObserver`. The visual scale of the capital gap becomes visceral in a way text can't match.

**149-18: Parallax depth on the network effect image.**
Add CSS `transform: translateY(calc(var(--scroll-offset) * 0.15))` to the `opp-network-effect.jpg` image using the shared throttled scroll value from Fix 148. The image moves at 15% of page scroll speed, creating depth. GPU-accelerated via `will-change: transform`. Near-zero performance cost. One of the strongest premium craft signals in modern investment site design.

**149-19: "Comparable Funds" performance benchmarking bar chart.**
Add a section titled "How We Position in the Field": a recharts `BarChart` showing private equity sustainable real assets average IRR 2020–2025, venture returns over the same period, and ReGen Civics target IRR. The ReGen Civics bar is gold and has a "Target" label. Sources: BCG, Bain, AgFunder data already cited on the page. Shows competitive awareness and invites the comparison rather than avoiding it.

**149-20: Magnetic hover on LOI button.**
The "Submit LOI" button is the page's primary conversion. Add a magnetic hover effect: as the cursor approaches within 80px, the button subtly moves toward the cursor by 6–8px using `mousemove` delta calculation. ~20 lines of vanilla JS in the component. Pair with a gold `box-shadow` pulse on hover (`animation: pulse-gold 1.5s ease-in-out infinite`). Used by Stripe and Linear for primary CTAs. Signals this action matters more than every other element on the page.

---

### Implementation Note for Fix 149

All items except 149-12 (deferred) are Claude Code autonomous. Implement in this order:

**Phase 1 (CSS/visual, no new data — ship fast, high impact):**
149-3 (marquee), 149-10 (grain texture), 149-2 (table glow), 149-7 (reading progress), 149-16 (compliance strip), 149-6 (mobile LOI bar)

**Phase 2 (IO-triggered animations):**
149-1 (count-up), 149-4 (donut chart), 149-17 (progress bars), 149-18 (parallax), 149-9 (timeline), 149-13 (extend existing step-by-step)

**Phase 3 (new content sections):**
149-11 (council governance), 149-14 (case study placeholder shell), 149-15 (LP Dispatch), 149-5 (document vault), 149-8 (testimonials)

**Phase 4 (data + interactions):**
149-19 (benchmarking chart), 149-20 (magnetic LOI button)

**Deferred (revisit at traction milestone):**
149-12 (deal flow ticker — implement when 50+ inquiries or 30+ applications)

---

## Fix 150: `/crowd-pooling-projects` — World-Class Revamp (20 Upgrades)

**What:** The crowd pooling page functions but doesn't yet feel alive or match the production quality of the rest of the site. Research across Kickstarter, Indiegogo, Republic, GoFundMe, and IOBY informs this full revamp. The button fix (View Details border too light) is already deployed directly in the file.

**Done when:** The page has an epic dark background, animated project cards, a polished Kickstarter-style detail experience, and all 20 upgrades below implemented.

---

### 150-1: Epic dark forest background + hero image

**Image generation — for Claude Code using nano-banana-pro:**

Generate a tall vertical panoramic hero image (`crowd-pooling-hero.webp`) using the nano-banana-pro skill. Use this exact prompt:

> "Epic ultra-wide vertical panoramic hero image for a regenerative land project crowdfunding page. Six landscape scenes seamlessly stitched top to bottom into one continuous scroll. Each scene flows naturally into the next. Scene 1: Aerial view of a solarpunk village in a lush valley, earthen cob homes with living roofs and integrated solar panels, golden hour, community gathering in central courtyard. Scene 2: Diverse villagers building earthen structures together, bamboo scaffolding, food forest behind them, warm community energy. Scene 3: Wide food forest and permaculture garden, villagers harvesting, terraced hillsides, abundant tropical vegetation. Scene 4: Communal outdoor kitchen under a bamboo shade structure, people sharing a meal, solarpunk aesthetic. Scene 5: Regenerative landscape at dusk, earthen homes glowing warm, winding path through community, first stars appearing, mystical and peaceful. Scene 6: Full community at twilight from a distance, surrounded by ancient forest, river running through, lights twinkling in the dark. Overall: solarpunk, organic futurism, earthen architecture, deep forest greens and warm ambers, cinematic illustration quality, no text, seamless vertical composition for website hero background."

Resolution: 4K. Save to `public/images/crowd-pooling-hero.webp`. Then apply it as a `background-image` on the page root with `bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]` layered over it at 60% opacity so the image shows through without overwhelming the dark theme. Convert all white project cards to dark treatment: `bg-white/5 border border-[#7dd87d]/20 backdrop-blur-sm`. Match the homepage's particle/constellation overlay component if available.

---

### 150-2: Animated progress bars on scroll-into-view

Both the total value bar and financial bar start at 0 and animate to their target width when the card enters viewport. `IntersectionObserver` + CSS `transition: width 1.2s ease-out`. Percentage number counts up simultaneously using `useCountUp` hook (same one from Fix 149-1 — extract it to a shared hook). Projects at 80%+ get a gold glow pulse at the end of animation.

---

### 150-3: "Momentum" activity badge

A small badge on each card showing recent contribution activity derived from contribution timestamps. Format: "8 contributions this week" with a pulsing green dot. When no recent activity: hide the badge rather than showing zero. This is the #1 pattern that moves passive browsers to active contributors in crowdfunding research.

---

### 150-4: Platform-wide stats bar — DEFERRED

*(Hold until stats are worth sharing. Implement when 50+ total contributors or $100k+ raised across all projects. Premature stats undermine rather than build trust.)*

---

### 150-5: Map view toggle

Toggle between Grid view and Map view. Map view shows a world map with project location dots. Each dot: hover shows project name + funding %. Use `react-simple-maps` (lightweight, ~30KB gzipped) or a simple SVG world map with plotted coordinates. Investors with regional focus — very common in impact investing — find this immediately useful. Add `{ lat, lng }` to each project object.

---

### 150-6: Sort and filter bar

A filter row above the cards: tag pills (Permaculture, Housing, Food Forest, Water Systems, Energy, Governance) toggle on/off, sort dropdown (Most Funded, Ending Soon, Newest, Most Contributors), region filter. All client-side. Add a "Clear filters" link when any filter is active. Reduces choice paralysis on a growing project list.

---

### 150-7: "Almost funded" urgency treatment

When `currentAmount / targetAmount >= 0.8`: gold card border glow, "Almost There" badge in amber, progress bar shifts to gold, framing text "Only $X more needed." Kickstarter data shows 80%+ funded projects convert 3x more. Pure CSS conditional class — no DB changes needed.

---

### 150-8: Avatar stack of contributors

Above the contributor count, show 4–5 overlapping avatar circles (initials or identicons generated from contributor IDs/indices using a consistent color algorithm). On hover: tooltip "Rye, Jordan, and 21 others are contributing." People are more convincing than a number.

---

### 150-9: Video-first "Story" card mode

A toggle between "Card" view and "Story" view at the top of the page. Story view: the image area becomes a 16:9 video thumbnail with a play button overlay. Clicking plays the video inline in a lightbox. Projects without video fall back to their image. Indiegogo's highest-converting layout.

---

### 150-10: Project milestone tracker inside card

A compact row below the progress bars: 3 small circles showing "Phase 1: Planning ✓ | Phase 2: Infrastructure (current) | Phase 3: Occupation." Current phase highlighted in green. Add `currentPhase` and `phases` array to each project object. Takes 1 data field, immediately contextualises where the investment goes.

---

### 150-11: Per-project social sharing

Share icon on each card opens a sheet with: pre-written Twitter/X text, WhatsApp message, and a copy-link button. Pre-written text uses the project name, description, and funding percentage. Format: "I'm contributing to [Name] — [description]. They're [X]% funded. regencivics.earth/crowd-pooling-projects." Uses `navigator.share` on mobile, custom sheet on desktop.

---

### 150-12: Season designation + "Coming Soon" featured treatment

**Note from Rye:** Only Season 2 projects will be featured. Replace the "Season 2 Featured" badge concept with a "Season 2" label on active project cards, and add a placeholder card at the end of the grid with a lock overlay that reads: "Our first round of Season 2 projects is live — more coming as the season progresses. Want to see your project here? Apply." Style the placeholder with a subtle shimmer/pulse animation on the border. No "staff pick" badge until Season 2 is complete.

---

### 150-13: Contribution impact preview

On card hover (desktop) / after 2s scroll pause (mobile): a subtle overlay slides up from the bottom of the card image. Shows: "Contributing $5,000 ≈ 3 acres protected + 2 families housed (estimated)." Impact-per-dollar framing. Needs a simple formula per project type stored in the project data. No DB changes — add to the static project objects.

---

### 150-14: "Get notified" email capture at bottom

Below all project cards: "More projects join each season. Get notified when the next one opens." Email + name form feeding into the existing newsletter system. Standard on every serious crowdfunding platform. Add `source: "crowd-pooling"` tag to distinguish these subscribers.

---

### 150-15: Countdown timer for deadline proximity

Replace static "June 2026" deadline text with a live countdown: "87 days left" in white/default when > 90 days, amber when < 90 days, red when < 30 days. Calculated client-side from deadline string parsed to a date. Add a small hourglass icon from lucide-react. Directly proven to increase conversion in every crowdfunding A/B test.

---

### 150-16: "How Crowd Pooling Works" explainer with video

A collapsible section above the project grid. Collapsed by default for returning visitors. When expanded: show the 3-step process (Explore → Contribute via Hypha → Project deploys), then embed the YouTube video explaining crowd pooling: `https://youtu.be/jxKR-WneJp0`. Use a YouTube facade (show thumbnail + play button, only load the iframe on click) so the page doesn't load the full YouTube embed on mount. This keeps performance clean while making the video accessible.

---

### 150-17: "Total combined impact" footer stat strip

Below all project cards, a dark green strip: "Across all active projects: X acres · Y families · Z countries." Aggregated from project data (acreage, family count, location). Animated count-up on scroll. Shows the collective scale.

---

### 150-18: Card hover depth effect

On hover: `transform: translateY(-4px)` + `box-shadow: 0 20px 40px rgba(0,0,0,0.4)`. The card image applies `scale(1.03)` with `overflow: hidden`. `transition: all 0.2s ease`. ~8 lines of CSS. Makes cards feel physical and interactive instead of flat.

---

### 150-19: Active / Upcoming / Funded tabs

Above the project grid: "Active (2)" | "Upcoming — Season 3 Applications Open" | "Funded (0 — first closes coming)". Upcoming tab shows 1–2 placeholder cards with "Applications open. Know a land project? Apply now →" linking to `/apply`. Structures the page as a living marketplace.

---

### 150-20: Polished Kickstarter-style card detail modal

The current detail modal is functional but sparse. Full revamp:
- Opens as a full-screen overlay (not a small dialog) with a smooth slide-up animation
- Left column (60%): hero image at full width with video thumbnail below if available, project title, location with map pin, description, full application details in collapsible sections
- Right column (40%, sticky on scroll): funding progress bars (animated), contributor avatar stack, deadline countdown, "Contribute via Hypha" primary button (green, large), "Share This Project" secondary button, key stats (acres, families, phase), tags
- Header: project name + "Season 2" badge + status badge + close (X) button
- Bottom of left column: full vision statement, governance model, food/water/energy systems in collapsible sections (already in `applicationData`)
- Mobile: single column, right-column content stacks below hero
- Animation: backdrop fade in + modal slides up from bottom on mobile, scale-in from center on desktop
- Close on backdrop click or Escape key

---

### Performance Safety Note for Fixes 149 and 150

**All new animations in Fix 149 and Fix 150 must follow these rules — do not ship any animation that violates them:**

- All scroll-triggered animations use `IntersectionObserver` only. No `scroll` event listeners.
- All parallax effects use CSS `transform` + `will-change: transform` only (GPU layer). No JS layout reads on scroll.
- All count-up animations use `requestAnimationFrame`. No `setInterval`.
- YouTube embeds (150-16) must use a facade — thumbnail + play button, iframe only loads on user click. Never load the YouTube iframe on mount.
- `react-simple-maps` (150-5) must be lazy-loaded with `React.lazy` — don't add it to the main bundle.
- The hero background image (150-1) must be served as `.webp`, include explicit `width` and `height` attributes, and use `fetchpriority="high"` with a `<link rel="preload">` in the page head.
- The particle/constellation overlay (if reused from homepage) must use `requestAnimationFrame` with a frame skip (run every 2nd frame) and pause when `document.hidden`.
- All new `IntersectionObserver` instances must be disconnected in the cleanup function of their `useEffect`.
- The card hover depth effect (150-18) must use `will-change: transform` to prevent paint during transition.
- Run Lighthouse on `/crowd-pooling-projects` after implementing Fix 150 Phase 1 before proceeding to Phase 2. Target: 90+ performance score maintained throughout.

---

### Implementation Order for Fix 150

**Phase 1 — Background + CSS (no new data, ship fast):**
150-1 (background + image), 150-18 (card hover depth), 150-7 (almost-funded treatment), 150-15 (countdown timer), 150-12 (season label + coming soon card)

**Phase 2 — Animations + interactions:**
150-2 (progress bar animation), 150-6 (sort + filter bar), 150-20 (Kickstarter modal revamp), 150-16 (how it works + video)

**Phase 3 — Social + discovery:**
150-11 (sharing), 150-8 (avatar stack), 150-10 (milestone tracker), 150-13 (impact preview), 150-5 (map view), 150-9 (story/video view), 150-19 (tabs)

**Phase 4 — Data + community:**
150-3 (momentum badge), 150-14 (notify me email capture), 150-17 (total impact strip)

**Deferred:**
150-4 (stats bar — until 50+ contributors or $100k+ raised)

---

## Notes for Claude Code

- **Fix all failing tests before moving to the next wave.** The test suite reported 27 pre-existing failures at the start of Wave 2. These are not acceptable to carry forward — they mask real regressions. Before completing any wave, run `pnpm test`, identify every failing test, and fix or skip (with a `// TODO:` comment explaining why) each one. A wave is not done until the test run shows 0 unexpected failures. If a test is failing because of a missing DB connection in CI, add a guard at the top of the test file (`if (!process.env.DATABASE_URL) { test.skip(...) }`) rather than letting it red-flag silently.
- Run `pnpm test` after each wave — don't proceed to the next wave if tests are red
- Fix 117 (Admin split) is the riskiest refactor — do it last in Wave 3, test thoroughly
- All security fixes (Fixes 114-116) should be deployed together in a single commit so there's no window where CSRF is partially implemented
- Fix 126 (cache headers): be careful not to cache `/api/` routes or HTML — only static assets
- Fix 128 (server-side cache): only cache public data, never per-user responses — mixing these would be a serious data leak
- The Lighthouse hard gate should be re-run after Wave 1 to confirm 90+ scores across Home, Fund, and Community
- Fix 140 Part D (auto-quest thread creation): use try/catch so a forum post failure never blocks quest creation
- Fix 141: check the actual `siteBanners` schema before writing the seed script — the column names must match exactly
- Fix 144: do Fix 144-5 (startup log) and Fix 144-1 (error logging) first — deploy them, then check Railway logs after the next token sync to confirm the Alchemy RPC is active and calls are succeeding before writing the rest of Fix 144

---

## Handoff Breakdown

### What Claude Code does autonomously (no Rye input needed):

- Fix 141 Part A: change "Season 3" → "Season 2" in Home.tsx (one line)
- Fix 131: rename "Show Me Around" → "Your ReGen Guide" in ReGenGuide.tsx
- Fix 132: update QuestGameIntro.tsx PANELS with approved copy (copy confirmed by Rye, no review needed)
- Fix 142: generate 3 quest images via nano-banana-pro, convert to WebP, wire into Quest page
- Fix 136: update "Manage Preferences" links to `/profile?tab=settings`
- Fix 138 Step 5-6: update Community.tsx card hrefs (Rites of Passage, All Quests)
- Fix 139: Epic Quests coming-soon overlay + Suggest a Quest card + Quest page CTA
- Fix 137 Steps 1-2: replace BlogPost.tsx line-by-line renderer with ReactMarkdown
- Fix 137 Steps 3-8: install Tiptap, create RichEditor, wire into Admin + forum
- Fix 134 Steps 1, 3-5: write migration SQL, add schema, build EmojiReactions component, add tRPC routes
- Fix 135 Steps 1, 3-4, 6: write cleanup/backfill scripts, extend org approval hook
- Fix 140 Parts A and C: write migration + seed script for onboarding-quests category
- Fix 140 Part B Step 4: write find-resources-thread.mjs diagnostic script
- Fix 140 Part B Step 6: update all forumUrl values in welcomeAboardQuests.ts (after Rye provides Quest 7 post ID)
- Fix 140 Part D Steps 10-11, 13-14: wire auto-thread creation into quest creation handler, write backfill script
- Fix 141 Parts B-C: write seed-banners.mjs, convert hardcoded banner to BannerDisplay, add fund-launch-banner to Admin
- Fix 133 Step 1: write check-post-links.mjs diagnostic script
- Fixes 114-123, 125, 129: all waves 1-4 (performance, security, code quality, UX)
- Fix 144: all 5 steps (blockchain logging, forceSync mutation, button wiring, admin sync button, startup log)

### What Rye must do (Railway DB, env vars, browser actions, approvals):

| Step | Fix | What to do |
|---|---|---|
| Apply DB migration | Fix 138 Step 2 | Run rites-of-passage category migration in Railway |
| Apply DB migration | Fix 140 Step 2 | Run onboarding-quests category migration in Railway |
| Apply DB migration | Fix 134 Step 2 | Run emoji reactions table migration in Railway |
| Apply DB migration | Fix 140 Part D Step 12 | Run quest_forum_thread_id column migration in Railway |
| Run seed script | Fix 138 Step 4 | `DATABASE_URL=... npx tsx scripts/seed-quest-forum-posts.ts --reset` |
| Run seed script | Fix 140 Step 8 | `DATABASE_URL=... node scripts/seed-onboarding-quest-threads.mjs --execute` |
| Run seed script | Fix 141 Step 3 | `DATABASE_URL=... node scripts/seed-banners.mjs` |
| Run seed script | Fix 135 Step 7 | `DATABASE_URL=... node scripts/backfill-forum-threads.mjs --execute` |
| Run seed script | Fix 140 Step 15 | `DATABASE_URL=... node scripts/backfill-quest-forum-threads.mjs --execute` |
| DB query | Fix 133 Step 2 | Run `node scripts/check-post-links.mjs`, paste output back |
| DB query | Fix 140 Step 5 | Run `node scripts/find-resources-thread.mjs`, reply with resources thread ID |
| Review + confirm | Fix 135 Step 2 | Review cleanup script output before running with `--execute` |
| Farcaster | Fix 124 | Create Farcaster account, set FARCASTER_HANDLE env var in Railway |
| Apply DB migration | Fix 143-7 Step 15 | Run bannedEmails migration `0063` in Railway |
| Apply DB migration | Fix 143-9 Step 19 | Run application_events migration `0060` in Railway |
| Apply DB migration | Fix 143-11 Step 26 | Run admin_notifications migration `0061` in Railway |
| Apply DB migration | Fix 143-12 Step 29 | Run entity_notes migration `0062` in Railway |
