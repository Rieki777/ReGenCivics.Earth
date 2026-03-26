# Final Push to V1 - March 2026

**Date:** 2026-03-22
**Auditor:** CTO-level deep audit of regencivics.earth
**Goal:** Identify every fix, improvement, and blocker standing between current state and a site ready for public announcement
**Continues from:** `QUALITY_SPRINT_9_10.md`

---

## Priority Legend

| Tag | Meaning |
|-----|---------|
| P0-BLOCKER | Site is broken/unusable. Must fix before any traffic. |
| P1-CRITICAL | Major functionality broken. Fix within 24h. |
| P2-HIGH | Visible quality issue. Fix before announcement. |
| P3-MEDIUM | Should fix soon. Acceptable for soft launch. |
| P4-LOW | Nice to have. Can follow up post-launch. |

---

## SECTION A: SITE-DOWN BLOCKERS (P0)

### Fix 1 - Vite Circular Dependency + Missing cdnImg Import: SITE CRASH (P0-BLOCKER)

**Status:** FIXED (commits af9c01f, 309eb23, b843bee)

**Root cause (actual):** Two separate issues combined:
1. Vite manualChunks circular dependency: `recharts -> utils -> radix-ui -> react-vendor -> recharts` cycle caused React to be undefined at call time
2. `ReferenceError: cdnImg is not defined` in `client/src/data/blogPosts.ts` (missing import)

**What was done:**
- Added missing `import { cdnImg } from "@/lib/utils"` to blogPosts.ts
- Simplified vite.config.ts manualChunks to only `react-vendor` (removed recharts, radix-ui, utils, sentry, icons, framer-motion, trpc-vendor chunks that caused circular deps)
- Added ErrorBoundary component for future crash protection

**Current status:** Site is back up and rendering. ErrorBoundary is deployed.

---

### Fix 2 - Cloudflare R2 Images: PARTIALLY RESOLVED (P2-HIGH, downgraded from P0)

**Status:** MOSTLY WORKING - some images still 404

**What changed:** After the site crash fix (Fix 1), most images are now loading correctly. The `cdnImg()` function in `client/src/lib/utils.ts` proxies images through `/api/img` and this is now working for most assets. Homepage hero images, path cards, quest cards, map page, team page all loading images.

**Remaining issues:**
1. Some R2 bucket files are still suspiciously small (70B, 506B) and may be corrupt placeholders
2. The `assets.regencivics.earth/DUOLILquhPlWMUAF.webp` URL returns "Not Found" when accessed directly (confirmed: tab is open showing 404)
3. Image fallback/error handling still needed in OptimizedImage component

**Fix (remaining):**
- Audit R2 bucket for corrupt/placeholder files and re-upload actual images
- Add `onError` fallback to OptimizedImage component
- Verify all CDN image proxy URLs resolve correctly

---

## SECTION B: CRITICAL ISSUES (P1)

### Fix 3 - Sentry Error: Dynamic require of "cookie" not supported (P3-MEDIUM, downgraded from P1)

**Status:** CHECKED 2026-03-23 -- NO LONGER APPEARING

**Symptom (original):** Server-side error on `GET /api/csrf-token`. Only unresolved Sentry issue in last 24h.

**Current state (verified via Sentry dashboard, 24h view):**
- The "Dynamic require of cookie" error is **no longer showing** in Sentry unresolved issues
- Only unresolved issue in 24h: "Extension context invalidated" on /create-campaign (1 event, browser extension error, not server-side)
- Likely resolved by the recent deploy fixes or the error was transient

**Root cause (for reference):** ESM/CJS compatibility issue with the `cookie` package. May still need a proper ESM import if the error resurfaces.

**Files:** `server/_core/security.ts`

---

### Fix 4 - No React Error Boundary (P1-CRITICAL)

**Status:** FIXED (commit b843bee)

**What was done:** ErrorBoundary component added, wrapping the app. Shows "ponder the TAO" fallback UI when React errors are caught. Has componentDidCatch logging.

---

### Fix 5 - Deploy Instability: Rapid Churn in Railway (P3-MEDIUM, downgraded from P1)

**Status:** CHECKED 2026-03-23 -- STABLE

**Symptom (original):** 4+ deployments created and REMOVED in the last 2 hours on Mar 22.

**Current state (verified via Railway dashboard):**
- Service: **Online**, 2/2 replicas active, deployment successful
- Active deploy: "fix: add missing cdnImg import to blogPosts.ts" (Mar 22 21:14 GMT)
- 9 removed deploys from Mar 22 confirm the churn, but it has fully stabilized
- No new deploys have failed since the active one went live

**Remaining recommendation (P3):**
- Add a GitHub Actions CI gate (build + lint) before Railway auto-deploys to prevent future churn
- Build in a comprehensive audit before pushing each build to live to ensure there's no errors that would break a live site. 

---

### Fix 6 - Redis Warning on Railway (P4-LOW, downgraded from P1)

**Status:** CHECKED 2026-03-23 -- CLEAR

**Symptom (original):** Redis service shows a yellow warning triangle with "1" on Railway dashboard.

**Current state (verified via Railway dashboard):**
- Redis: **Online**, no warning triangle visible
- The "1" was the redis-volume count indicator, not a warning badge
- No error state, no memory warnings detected

---

### Fix 7 - regencivics.com Domain Warning in Cloudflare (P4-LOW, downgraded from P1)

**Status:** BLOCKED/DEFERRED -- Rye cannot change nameservers at registrar

**Symptom:** The `regencivics.com` domain shows a warning in Cloudflare (pending status, no SSL).

**Current state (verified via Cloudflare DNS page):**
- Domain is in "pending" status, nameservers not pointed to Cloudflare
- 7 DNS records configured but domain not active
- Registrar access not available to change NS records

**Impact:** Low. All traffic uses regencivics.earth which works fine. The .com domain is cosmetic. Can revisit when registrar access becomes available.

---

## SECTION C: SECURITY ISSUES (P2)

### Fix 8 - CSP Header Contains unsafe-inline and unsafe-eval (P2-HIGH)

**Status:** CODE FIX NEEDED

**Symptom:** Content Security Policy allows `unsafe-inline` for scripts and `unsafe-eval`, which defeats CSP protection against XSS.

**Fix:** Remove `unsafe-eval`, replace `unsafe-inline` with nonce-based CSP or hash-based approach.

**File:** `server/_core/security.ts`

---

### Fix 9 - Session Cookie Missing SameSite=Strict (P2-HIGH)

**Status:** CODE FIX NEEDED

**Symptom:** Session cookies don't set `SameSite=Strict`, making them vulnerable to CSRF even with CSRF tokens.

**Fix:** Add `sameSite: 'strict'` to all cookie options.

**File:** `server/_core/oauth.ts`

---

### Fix 10 - Path Traversal Prevention Incomplete (P2-HIGH)

**Status:** CODE FIX NEEDED

**Symptom:** Security middleware removes `../` and `..\` but misses URL-encoded variants (`%2e%2e`, `..%252f`) and null byte attacks.

**Fix:** Decode URL before path validation, add null byte stripping.

**File:** `server/_core/security.ts`

---

### Fix 11 - Sanitization Misses Style/Iframe/Object Tags (P2-HIGH)

**Status:** CODE FIX NEEDED

**Symptom:** `sanitizeInput` removes `<script>` tags but not `<style>`, `<iframe>`, `<object>`, `<embed>` tags. CSS injection and iframe embedding still possible.

**Fix:** Extend sanitization regex to cover all dangerous HTML tags, or use a proper sanitization library like DOMPurify server-side.

**File:** `server/_core/security.ts`

---

### Fix 12 - File Upload MIME Type Not Validated (P2-HIGH)

**Status:** CODE FIX NEEDED

**Symptom:** File upload validation checks file extension but not MIME type. An attacker could rename a `.exe` to `.png` and bypass validation.

**Fix:** Validate both file extension and MIME type. Read magic bytes to verify actual file type.

**File:** `server/_core/security.ts`

---

### Fix 13 - JWT Secret Fallback to Weak Value (P2-HIGH)

**Status:** CODE FIX NEEDED

**Symptom:** `ADMIN_WEBHOOK_SECRET` falls back to `JWT_SECRET` if undefined, creating a single point of failure.

**Fix:** Require `ADMIN_WEBHOOK_SECRET` to be explicitly set. Fail loudly if missing rather than falling back.

**File:** `server/webhooks/riverside.ts`

---

### Fix 14 - Missing Rate Limiting on Public Forms (P2-HIGH)

**Status:** CODE FIX NEEDED

**Symptom:** Public-facing forms (investor signup, newsletter, apply) lack rate limiting. Vulnerable to spam and abuse.

**Fix:** Add rate limiting middleware to all public form submission endpoints.

**Files:** `server/routes/investors.ts`, `server/routes/newsletter.ts`, `server/routes/applications.ts`

---

## SECTION D: ROUTING & NAVIGATION (P2)

### Fix 15 - /game and /play Render Same Content (P2-HIGH)

**Status:** Fixed


---

### Fix 16 - Admin Routes Lack Route-Level Access Control (P2-HIGH)

**Status:** CODE FIX NEEDED

**Symptom:** Admin routes (/admin, /admin/applications, /admin/moderation) rely only on component-level auth checks. No route guard prevents unauthorized access at the router level.

**Fix:** Add a route guard wrapper component that checks admin role before rendering admin pages.

**File:** `client/src/App.tsx`

---

## SECTION E: SEO & META (P2-P3)

### Fix 18 - Blog Posts Missing Dynamic OG Tags (P2-HIGH)

**Status:** CODE FIX NEEDED

**Symptom:** All blog posts share generic meta tags. No dynamic Open Graph tags generated from post content. Shared links on social media show generic site info instead of post-specific titles and images.

**Fix:** Generate dynamic OG meta tags from blog post title, excerpt, and featured image and build in a process that creates this with every subsequent blog

**File:** `client/src/pages/BlogPost.tsx`

---

### Fix 19 - Community Pages Missing Canonical URLs (P3-MEDIUM)

**Status:** CODE FIX NEEDED

**Symptom:** Forum pagination creates duplicate content without canonical URL tags, hurting SEO.

**Fix:** Add `<link rel="canonical">` to community pages.

---

### Fix 20 - Missing JSON-LD Structured Data on Key Pages (P3-MEDIUM)

**Status:** CODE FIX NEEDED

**Symptom:** `JsonLD.tsx` component exists but is unused on Fund, Land, and Campaign pages.

**Fix:** Add JSON-LD structured data to Fund (Organization), Land (Product), and Campaign (Event) pages.

---

### Fix 21 - Admin Pages Missing noindex Meta Tag (P3-MEDIUM)

**Status:** CODE FIX NEEDED

**Symptom:** Admin dashboard could be crawled by search engines.

**Fix:** Add `<meta name="robots" content="noindex, nofollow">` to all admin pages.

---

## SECTION F: FORM & INPUT ISSUES (P2-P3)

### Fix 22 - Weak Email Validation Regex (P3-MEDIUM)

**Status:** CODE FIX NEEDED

**Symptom:** Email validation allows single-character domains and no TLD length validation.

**Fix:** Use a stricter email validation pattern or a library like `validator.js`.

**File:** `server/_core/security.ts`

---

### Fix 23 - Form Resubmission on Page Reload (P3-MEDIUM)

**Status:** CODE FIX NEEDED

**Symptom:** Newsletter and application forms lack POST-redirect-GET pattern. Reloading the page after submission re-submits the form.

**Fix:** Implement redirect after successful form submission.

---

### Fix 24 - Missing File Size Limit on Campaign Uploads (P2-HIGH)

**Status:** CODE FIX NEEDED

**Symptom:** Campaign image uploads have no file size limit check before storage.

**Fix:** Add max file size validation (e.g., 10MB) before upload.

**File:** `server/routes/campaigns.ts`

---

## SECTION G: ERROR HANDLING (P2)

### Fix 25 - Image Generation Fires Without Await (P2-HIGH)

**Status:** CODE FIX NEEDED

**Symptom:** In campaigns route, image generation is called without `await`. Errors are never caught or logged. Silent failures.

**Fix:** Add proper `await` and try/catch to image generation calls.

**File:** `server/routes/campaigns.ts`

---

### Fix 26 - Email Send Failures Silently Lost (P2-HIGH)

**Status:** CODE FIX NEEDED

**Symptom:** Failed email sends log a warning but don't retry. Notifications are permanently lost on transient failures.

**Fix:** Add retry logic with exponential backoff for email sending.

**File:** `server/_core/notification.ts`

---

### Fix 27 - Lazy Route Imports Not Wrapped in Error Boundaries (P2-HIGH)

**Status:** CODE FIX NEEDED

**Symptom:** All 61 lazy-loaded pages share a single Suspense boundary. If one route's chunk fails to load, the entire app crashes.

**Fix:** Wrap each lazy route in its own error boundary with retry capability.

**File:** `client/src/App.tsx`

---

### Fix 28 - Image Gen Worker Exposes Stack Traces (P2-HIGH)

**Status:** CODE FIX NEEDED

**Symptom:** Error responses from the image generation worker include the full error object, exposing internal stack traces to the client.

**Fix:** Return generic error messages to client, log full errors server-side.

**File:** `workers/image-gen/src/index.ts`

---

## SECTION H: MOBILE RESPONSIVENESS (P2)

### Fix 29 - No Hamburger Menu on Mobile (P2-HIGH)

**Status:** CODE FIX NEEDED

**Symptom:** Navigation links stack horizontally on mobile without a hamburger/drawer menu. Content overflows on small screens.

**Fix:** Implement responsive navigation with hamburger menu for mobile viewports.

**File:** `client/src/components/Navigation.tsx`

---

### Fix 30 - Admin Table Overflows on Mobile (P3-MEDIUM)

**Status:** CODE FIX NEEDED

**Symptom:** Admin tables use pixel-based widths that overflow mobile screens.

**Fix:** Use responsive table patterns (horizontal scroll wrapper or card layout on mobile).

**File:** `client/src/pages/Admin.tsx`

---

### Fix 31 - Modal Dialogs Unresponsive on Mobile (P3-MEDIUM)

**Status:** CODE FIX NEEDED

**Symptom:** Fixed-width modals don't account for mobile viewport. Content gets cut off in landscape mode.

**Fix:** Use max-width with viewport-relative units, add scroll within modal body.

**File:** `client/src/components/ContributionModal.tsx`

---

### Fix 32 - No srcset on Any Image (P2-HIGH)

**Status:** CODE FIX NEEDED (continuing from QUALITY_SPRINT_9_10.md Fix 111b)

**Symptom:** Mobile users download 1920px hero images on 375px screens. 50-80% bandwidth waste per image.

**Fix:** Add `srcset` and `sizes` attributes to all images, generate multiple resolution variants.

**File:** `client/src/components/OptimizedImage.tsx` and all image references

---

## SECTION I: PERFORMANCE (P3)

### Fix 33 - Cache Rate Only 37.6% on Cloudflare (P3-MEDIUM)

**Status:** CHECKED 2026-03-23 -- 1 rule exists, could add more

**Symptom:** Cloudflare shows 37.6% cache rate. Most requests bypass cache and hit Railway origin.

**Current state (verified via Cloudflare cache rules page):**
- 1 of 10 available cache rules is in use: **"Cache static assets"** (URI Full match)
- This single rule covers basic static asset caching but misses API responses, HTML pages, fonts, and other cacheable content

**Recommendation:** Add 2-3 more cache rules (post-launch, P3):
1. Cache `/assets/*` and font files with long TTL (30d)
2. Cache HTML pages with short TTL (5min) for repeat visitors
3. Bypass cache for `/api/*` endpoints that need fresh data

---

### Fix 34 - No Image Error Fallbacks (P2-HIGH)

**Status:** CODE FIX NEEDED

**Symptom:** When images fail to load (as with the R2 404s), broken image icons appear everywhere with no graceful fallback.

**Fix:** Add `onError` handlers to OptimizedImage component that show a branded placeholder or gradient on failure.

**File:** `client/src/components/OptimizedImage.tsx`

---

### Fix 35 - Missing Sentry Source Maps (P3-MEDIUM)

**Status:** CODE FIX NEEDED

**Symptom:** Sentry errors show minified stack traces (`radix-ui-BTqXMQ-o.js:0:2343`) making debugging difficult.

**Fix:** Configure Vite to upload source maps to Sentry during build.

**Files:** `vite.config.ts`, possibly add `@sentry/vite-plugin`

---

## SECTION J: ENVIRONMENT & INFRASTRUCTURE (P2-P3)

### Fix 36 - Railway Has 32 of 71 Expected Env Vars (P3-MEDIUM, downgraded from P2)

**Status:** CHECKED 2026-03-23 -- 32 service vars + 8 Railway auto vars = 40 total

**Symptom (original):** Codebase references 71 environment variables. Railway only has 32 set.

**Current state (verified via Railway variables page):**
Railway has **32 service variables** confirmed present:
ANTHROPIC_API_KEY, DATABASE_URL, REDIS_URL, JWT_SECRET, VITE_APP_ID, APP_URL, OWNER_EMAIL, EMAIL_DOMAIN, AWS_BUCKET_NAME, AWS_REGION, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, OWNER_OPEN_ID, NIXPACKS_NODE_VERSION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, RESEND_API_KEY, AWS_ENDPOINT_URL, STORAGE_PUBLIC_URL, SENTRY_DSN, VITE_SENTRY_DSN, GOOGLE_MAPS_API_KEY, VITE_GOOGLE_MAPS_API_KEY, BUFFER_ACCESS_TOKEN, IMAGE_GEN_SECRET, IMAGE_GEN_WORKER_URL, APP_BASE_URL, BASE_RPC_URL, PRERENDER_TOKEN

Plus **8 Railway auto-generated vars** (PORT, RAILWAY_*, etc.) and **1 shared variable** available (ANTHROPIC_API_KEY).

**Assessment:** All critical vars for auth, storage, email, maps, Sentry, image gen, and prerendering are present. The gap between 32 and 71 is mostly VITE_* vars that have sensible defaults or are dev-only. Site is running without errors from missing vars.

**Low-priority missing (P4):**
- ADMIN_WEBHOOK_SECRET (webhook auth falls back to JWT_SECRET, which works)
- VITE_ANALYTICS_ENDPOINT / VITE_ANALYTICS_WEBSITE_ID (analytics not yet set up)
- VITE_MAINTENANCE_MODE (maintenance toggle, not needed pre-launch)

---

### Fix 37 - No Build-Time Env Validation (P3-MEDIUM)

**Status:** CODE FIX NEEDED

**Symptom:** Environment validation only runs at runtime. Builds succeed with missing vars, then crash in production.

**Fix:** Add build-time env validation that fails the build if required vars are missing.

**File:** `server/_core/env.ts`

---

### Fix 38 - Workers Invocations at 0 (P3-MEDIUM)

**Status:** NEEDS INVESTIGATION

**Symptom:** Cloudflare shows `Workers invocations: 0` despite `regen-civics-image-gen` Worker being deployed 11 days ago.

**Fix:** Verify the Worker is properly configured and routing requests. If not in use, remove to avoid confusion.

---

## SECTION K: DEAD CODE & CODE QUALITY (P3-P4)

### Fix 39 - Buffer Integration Route is Dead Code (P3-MEDIUM)

**Status:** CODE FIX NEEDED

**Symptom:** `server/routes/buffer.ts` exists but is not included in the main router. Dead code.

**Fix:** Either wire it into the router or remove the file.

---

### Fix 40 - Unused Analytics Function (P4-LOW)

**Status:** CODE FIX NEEDED

**Symptom:** `trackCustomEvent()` in analytics.ts is exported but never called anywhere.

**Fix:** Either use it or remove it.

---

### Fix 41 - Orphaned Component Props (P4-LOW)

**Status:** CODE FIX NEEDED

**Symptom:** ProfileHeader has props for "badges" and "achievements" that are defined but never rendered.

**Fix:** Remove unused props or implement the UI.

---

### Fix 42 - Unused useQuestProgress Hook (P4-LOW)

**Status:** CODE FIX NEEDED

**Symptom:** Hook defined but imported in only 1 of 12 quest pages.

**Fix:** Review usage and report back on what this compoenent should and could be doing to check if we want it. 

---

## SECTION L: CONTENT & DESIGN OBSERVATIONS (P2-P3)

*Visual audit completed 2026-03-22 after Fix 1 resolved site crash. Image counts below updated to reflect current state (most images now load after cdnImg fix).*

### Fix 43 - Homepage: Most Images Now Loading, Some Gaps Remain (P3-MEDIUM, downgraded from P0)

**Status:** MOSTLY RESOLVED after Fix 1

**Previous:** 10 of 18 images broken. **Current:** Hero image, path card images, and section images now load correctly. A few background/decorative images in the expanded landing section may still be missing (hard to distinguish from intentionally empty sections per Fix 64).

---

### Fix 44 - /quest Page: Images Now Loading (P3-MEDIUM, downgraded from P0)

**Status:** MOSTLY RESOLVED after Fix 1

**Previous:** 17 of 22 images broken. **Current:** Quest card images are loading. Page renders content after scroll. Remaining issue is the empty above-the-fold area (see Fix 66).

---

### Fix 45 - /governance Page: Images Now Loading (P4-LOW, downgraded from P0)

**Status:** RESOLVED after Fix 1

**Current:** Governance page renders correctly with content and images. One of the better-structured pages on the site.

---

### Fix 46 - /land Page: Still Has Content Issues (P1-CRITICAL, reclassified)

**Status:** CONTENT ISSUE (not just images)

**Previous:** 10 of 14 images broken. **Current:** Images may load, but the entire page below the banner is empty (see Fix 59). This is a content rendering issue, not an image issue.

---

### Fix 47 - /fund Page: Still Has Content Issues (P1-CRITICAL, reclassified)

**Status:** CONTENT ISSUE (not just images)

**Previous:** 6 of 10 images broken. **Current:** Background images load (floating islands, waterfall), but informational text content is invisible (see Fix 62). This is a content rendering issue.

---

### Fix 48 - Recurring Broken Images in Nav/Footer (P2-HIGH, downgraded from P0)

**Status:** PARTIALLY RESOLVED

**Symptom:** `DUOLILquhPlWMUAF.webp` still returns 404 when accessed directly (confirmed: tab open showing "Not Found" at assets.regencivics.earth). This file may be referenced in shared components. `MlOLFSvIBeiOvIFd.webp` status needs verification. Nav/footer images appear to load on most pages, so these may be non-critical decorative assets.

**Fix:** Audit which components reference these specific R2 keys. Re-upload the actual files to R2 or remove the references.

---

### Fix 49 - /fund Banner: "Fund Not Yet Active" (P2-HIGH)

**Symptom:** Fund page shows "Fund Not Yet Active - Currently Accepting LOIs Only" banner. Change to "Fund In Formation - Currently Accepting LOIs"

---

### Fix 50 - Page Title Inconsistency (P3-MEDIUM)

**Symptom:** Some pages set proper titles (e.g., "The ReGen Civics Fund | Regenerative Land Investment") while others use generic "regencivics.earth/[path]" format (e.g., /terms-of-use, /apply).

**Fix:** Ensure all 43 pages have proper, descriptive title tags.

---

## SECTION M: LEGAL & COMPLIANCE (P2)

---

### Fix 52 - Cookie Consent Integration (P2-HIGH)

**Status:** CODE REVIEW NEEDED

**Symptom:** Analytics loaded conditionally via cookie consent (per index.html comment) but cookie consent UI not verified.

**Fix:** Verify cookie consent banner appears for new visitors and properly gates tracking.

---

## SECTION N: ADDITIONAL CODE QUALITY (P3-P4)

### Fix 53 - CSRF Validation Only on Mutations (P3-MEDIUM)

**Symptom:** CSRF protection middleware only validates mutations, not state-changing GET requests.

**File:** `server/_core/trpc.ts`

---

### Fix 54 - CSRF Token Expiration Too Long (P3-MEDIUM)

**Symptom:** CSRF tokens expire in 1 hour. Should be shorter for sensitive operations.

**File:** `server/_core/security.ts`

---

### Fix 55 - Prerender Middleware Error Suppression (P3-MEDIUM)

**Symptom:** Catch block logs "not installed yet" warning but continues execution silently.

**File:** `server/_core/index.ts`

---

### Fix 56 - Hardcoded Feature Flags (P3-MEDIUM)

**Symptom:** Feature toggles like AI assistant, custom games are hardcoded in Admin page instead of using env vars.

**File:** `client/src/pages/Admin.tsx`

---

### Fix 57 - ENV Object Exported with Sensitive Keys (P3-MEDIUM)

**Symptom:** ENV object export includes all API keys, visible in console logs during dev mode.

**Fix:** Create a sanitized ENV export that excludes secrets.

**File:** `server/_core/env.ts`

---

### Fix 58 - Missing Viewport user-scalable for PWA (P4-LOW)

**Symptom:** Viewport meta present but missing `user-scalable=no` for PWA consistency on mobile.

**File:** `client/index.html`

---

## SECTION O: VISUAL AUDIT FINDINGS (Site Now Live - 2026-03-22)

*Visual audit completed after Fix 1 resolved the site crash. All pages inspected on desktop (1062px) and mobile (375px).*

### Fix 59 - SYSTEMIC: Multiple Pages Show Massive Empty/Blank Sections (P1-CRITICAL)

**Status:** NEEDS INVESTIGATION + FIX

**Symptom:** At least 6 core pages have enormous blank dark-green areas where content should be. The content may exist in the DOM but is invisible (wrong z-index, hidden overflow, CSS opacity, or failed lazy-load). Affected pages:
- `/fund` - Banner shows, then ~2 full viewport heights of empty space before background images appear, then more empty space
- `/land` - Banner shows, then completely empty below
- `/ally` - Completely empty page (no banner, no content, just dark green and faint blurred spots)
- `/blog` - Hero banner renders, then blog post cards do NOT render at all (entire page is empty below hero)
- `/seasons` - Mostly empty, only "Who We're Looking For" card appears near bottom
- Homepage (expanded) - Has a ~1.5 viewport-height empty dark green section between the path cards and the footer area

**Root cause hypothesis:** Likely one or more of: (a) content sections have background images set but text/card elements are not rendering, (b) parallax/scroll animation sections have fixed heights with no content, (c) lazy-loaded sections are failing silently, (d) CSS transforms/opacity animations are stuck at their initial invisible state.

**Fix:** Investigate each page's component tree. Check for elements with `opacity: 0`, `visibility: hidden`, `transform: translateY(100%)` that never animate in. Check Suspense boundaries for silently failed lazy loads. Check IntersectionObserver-based animations.

**Files:** Page components for Fund, Land, Ally, Blog, Seasons, and the homepage expanded landing section

---

### Fix 60 - /blog: Blog Post Cards Not Rendering (P1-CRITICAL)

**Status:** NEEDS FIX

**Symptom:** The /blog page shows the "ReGen Civics BRIDGING WORLDS" hero banner with phoenix art, but ZERO blog post cards appear below it. The page title is "Blog: Stories & Updates | ReGen Civics" confirming the route loads, but the post listing component renders nothing. No console errors.

**Root cause hypothesis:** The blogPosts data file was recently fixed (cdnImg import). The data may be loading but the rendering component may have a conditional that hides content, or the blog list component may have a display bug.

**Fix:** Check the BlogPage component's rendering logic. Verify blogPosts data is being passed to the card list. Check for empty-state logic that incorrectly triggers.

**File:** `client/src/pages/Blog.tsx`, `client/src/data/blogPosts.ts`

---



---



---

### Fix 64 - Homepage Expanded Landing: Large Empty Section (P2-HIGH)

**Status:** NEEDS FIX

**Symptom:** When clicking "View Full Landing Page" on the homepage, the expanded view shows: hero > video > title > 4 path cards > forest background > **~1.5 viewport heights of empty dark green space** > tree roots background > footer. The empty section has faint firefly particle animations but no content.

**Fix:** Either remove the empty section or add the content that belongs there. This may be a placeholder for a section that was never built.

**File:** `client/src/pages/Home.tsx` or the landing page component

---

### Fix 65 - /play Page: Text Readability Over Background Images (P2-HIGH)

**Status:** NEEDS FIX

**Symptom:** The /play page shows "Easy Mode" heading and description text directly overlaid on a busy background image. White text on complex forest/village scene is hard to read. No text shadow, no backdrop blur, no dark overlay for contrast.

**Fix:** Add a semi-transparent dark overlay behind text sections, or add `text-shadow`, or use a backdrop-blur effect to ensure readability. Apply to all pages with text over background images.

**File:** `client/src/pages/Play.tsx` and related CSS

---

### Fix 66 - /quest Page: Initial Load Shows Empty Light Area (P2-HIGH)

**Status:** NEEDS FIX

**Symptom:** The /quest page initially loads showing a mostly empty light-beige/green area at the top before scrolling reveals content. The first viewport is nearly blank with just a small dark-green header section. Content (quest cards, "What's alive this Spring") only appears after scrolling down. First impression is an empty page.

**Fix:** Either bring the "What's alive this Spring" section to the top, or add hero content in the initial viewport. The current above-the-fold area gives a bad first impression.

**File:** `client/src/pages/Quest.tsx`

---

### Fix 67 - Community Forum: Looks Good, Minor Issues (P3-MEDIUM)

**Status:** MOSTLY WORKING

**Findings:** The /community page ("Gathering Grove") is one of the best-structured pages on the site. It correctly shows 16 threads, 14 topics, search, activity feed, "Trending This Week" section.

**Minor issues:**
- "16 posts this week / 30 replies" counter may be stale or auto-updating
- Claude in Chrome banner overlaps some bottom content

---

### Fix 68 - Legal Pages: Content Verified, Well Structured (P4-LOW)

**Status:** VERIFIED - GOOD

**Findings:** Privacy Policy page verified with full content: 13 sections, table of contents sidebar, "Last Updated: February 2026" date. Well-formatted, readable, and comprehensive. Other legal pages (/terms-of-use, /risk-disclosure, /disclaimers) have proper titles set and should have similar content.

---

### Fix 69 - /map Page: Globe Works, Title Overlap Issue (P2-HIGH)

**Status:** MOSTLY WORKING, minor fix needed

**Findings:** The 3D globe map works excellently. Shows 31 projects and organizations, tree markers sized by acreage, project cards in sidebar (Ubuntu, Finca Sagrada, Tabi Regenerativo), search, filters, and "Apply as a New Land Project" CTA.

**Issue:** The "Back" button overlaps the page title "Network" in the top left, cutting off the heading. The title likely says "Global Network" but the left portion is hidden behind the Back button.

**Fix:** Add left padding/margin to the page title to clear the Back button, or remove the Back button.

**File:** `client/src/pages/Map.tsx`

---

### Fix 70 - MOBILE: Navigation Completely Broken at 375px (P1-CRITICAL)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** At 375px viewport width, the navigation bar shows all 7 menu items horizontally with NO hamburger menu. Only "4 Paths" and "Play the Game" are visible; all other items ("Seasons + Schedule", "Map", "Team", "Participate", "Learn + Connect") extend beyond the viewport and are inaccessible. Users cannot reach Team, Map, Participate, or Learn + Connect links on mobile.

**Additional mobile issues observed:**
- "From the Field" button and user badge icon overlap the search icon in bottom right on /quest
- "Your ReGen Guide" button takes significant space in bottom left on all pages
- No horizontal scroll indicator - users may not realize nav items exist off-screen
- Footer columns likely stack but need width audit

**Fix:** Implement hamburger/drawer menu at `max-width: 768px`. Hide horizontal nav items, show hamburger icon, open slide-out or dropdown drawer.

**File:** `client/src/components/Navigation.tsx`

---

### Fix 70b - MOBILE: Multiple Floating Buttons Compete for Bottom Space (P2-HIGH)

**Status:** NEEDS FIX

**Symptom:** On mobile, the bottom of the screen has up to 4 competing floating elements: "Your ReGen Guide" (bottom left), search icon (bottom right), "From the Field" button (bottom right, /quest page), and a user badge icon with notification count. These overlap each other and obscure content.

**Fix:** Consolidate floating elements on mobile. Consider a single FAB (floating action button) with expandable menu, or move some items into the hamburger menu.

**File:** Navigation component, layout wrapper

---

## SECTION P: INFRASTRUCTURE IMPROVEMENTS (P3-P4)

### Fix 71 - Add CI/CD Build Gate Before Railway Deploy (P2-HIGH)

**Fix:** Add GitHub Actions workflow that runs build + lint + type-check before allowing deploy.

---

### Fix 72 - Enable Sentry Source Map Uploads (P3-MEDIUM)

**Fix:** Add `@sentry/vite-plugin` to upload source maps during build.

---

### Fix 73 - Improve Cloudflare Cache Hit Rate (P3-MEDIUM)

**Fix:** Add cache rules for static assets, set proper Cache-Control headers.

---

### Fix 74 - Add Health Check Endpoint (P3-MEDIUM)

**Fix:** Create `/api/health` endpoint that checks DB, Redis, and R2 connectivity. Use for Railway health checks.

---

### Fix 75 - Add Uptime Monitoring (P3-MEDIUM)

**Fix:** Set up external uptime monitoring (e.g., UptimeRobot, Better Uptime) to alert when site goes down.

---

## SECTION Q: PREVIOUS SPRINT CARRYOVER (from QUALITY_SPRINT_9_10.md)

### Fix 76 - srcset on Images (continuing Fix 111b) (P2-HIGH)

**Status:** NOT STARTED from previous sprint

---

### Fix 77 - Font Display Swap (continuing Fix 111b) (P3-MEDIUM)

**Status:** NOT STARTED from previous sprint

---

### Fix 78 - Third-Party Script Optimization (P3-MEDIUM)

**Status:** NOT STARTED from previous sprint

---

## SECTION R: RIVERSIDE WEBHOOK PIPELINE (P3)

### Fix 79 - Verify Riverside Webhook Duration Filter Works (P3-MEDIUM)

**Status:** CODED, awaiting test

**Context:** Duration filter was added to skip videos < 3 minutes. Needs end-to-end test with actual Zapier trigger.

---

### Fix 80 - Verify Individual Email Sending is Deployed (P3-MEDIUM)

**Status:** CODED, verify after Fix 1 is deployed

**Context:** Email sending was changed from batch (BCC, privacy risk) to individual sends. Need to verify the deployed version has this fix.

---

## SECTION S: REMAINING PAGE AUDIT (2026-03-22, continued)

*Pages audited after Section O. Covers all remaining routes not yet inspected.*

### Fix 81 - /admin: Auth-Gated Loading Screen, No Descriptive Title (P3-MEDIUM)

**Status:** VERIFIED - CORRECT BEHAVIOR (partially)

**Findings:** The /admin route correctly redirects unauthenticated users to a loading screen with a Rumi quote. However, the page title falls back to the generic "ReGen Civics: Fund and Game for Regenerative Land Projects" instead of showing something like "Admin Panel | ReGen Civics" or "Sign In Required."

**Fix:** Set a descriptive page title even for the auth-gated state (e.g., "Admin | ReGen Civics"). This improves browser tab identification.

---

### Fix 82 - Auth-Gated Pages Show Generic Loading Quotes Instead of Login Prompt (P2-HIGH)

**Status:** NEEDS FIX

**Symptom:** Multiple auth-gated pages (/admin, /crowd-pooling, /crowd-pooling-projects, /co-creators-guide) show a centered seed-of-life icon with a random Tao/Rumi/Muir quote on a blank dark green background. There is NO sign-in button, NO login prompt, NO explanation of why the page is empty. A first-time visitor will think the page is broken.

**Affected routes:** /admin, /crowd-pooling, /crowd-pooling-projects, /co-creators-guide

**Fix:** Replace the loading quote screen with a proper "Sign in to access this page" prompt with a login button. Or redirect to a login page. The current experience gives zero signal about what to do.

**File:** Auth guard / route protection wrapper component

---

### Fix 83 - /compare-projects: Back Button Overlaps Breadcrumb Text (P3-MEDIUM)

**Status:** VERIFIED - MINOR FIX NEEDED

**Findings:** Compare Projects page renders correctly with 3 empty "Add Project" slots and "No Projects Selected" empty state. However, the "Back" button overlaps the "Back to Projects" breadcrumb text beneath it, making the breadcrumb partially hidden.

**Fix:** Add vertical spacing between the Back button and the breadcrumb, or consolidate them into one element.

**File:** `client/src/pages/CompareProjects.tsx`

---

### Fix 84 - /calculator: Works Well, Initial Viewport Empty (P3-MEDIUM)

**Status:** MOSTLY WORKING

**Findings:** The Contribution Calculator is one of the most polished interactive tools on the site. All 8 Forms of Capital tabs work (Financial, Material, Living, Social, Intellectual, Experiential, Spiritual, Cultural), dollar inputs render, running total updates, Previous/Next navigation present. "Experimental Tool" warning is appropriate.

**Minor issue:** The initial viewport shows only the header and warning banner. The actual calculator inputs require scrolling to reach. The above-the-fold area is mostly empty.

**Fix:** Reduce top padding or move the first input section higher so users see the interactive form on first load.

---

### Fix 85 - /showcase: Looks Great, No Issues Found (P4-LOW)

**Status:** VERIFIED - GOOD

**Findings:** Hero with "Regenerative Projects & Partners", two clear CTAs ("Apply as a Land Project", "Join as Alliance Partner"), search box, location/focus filters, tabbed view showing Land Projects (7) and Alliance Partners (8), project cards with status badges. One of the best-designed pages on the site.

---

### Fix 86 - /glossary: Terms Render But Initial Viewport Appears Empty (P3-MEDIUM)

**Status:** MOSTLY WORKING

**Findings:** Glossary has 27 terms across 6 categories (Governance & Technology, Core Concepts, Program & Community, Land & Ecology, Fund & Investment, Historical). Search works. Term cards show definitions, category tags, and cross-reference links.

**Issue:** After the category filter pills, there's a large gap before the first term card appears. The initial viewport looks like the page is empty even though content exists below.

**Fix:** Reduce spacing between filter section and first glossary entry, or add a visible transition.

---

### Fix 87 - /socials: Different Nav Layout Than Rest of Site (P3-MEDIUM)

**Status:** MOSTLY WORKING

**Findings:** The /socials page uses a completely different navigation layout: "Back to Home" link + "ReGen Civics" logo in header, instead of the standard 7-item nav bar. Content is good (WhatsApp, Discord, YouTube links with "Recommended" badges).

**Issue:** Navigation inconsistency. Visitors navigating here from the main site will see a jarring layout change. The standard nav disappears entirely.

**Fix:** Either use the standard nav on this page too, or at minimum add a way to access other site sections from /socials.

**File:** Socials page component

---



---

### Fix 90 - /loi: LOI Form Works Well (P4-LOW)

**Status:** VERIFIED - GOOD

**Findings:** "Fund Not Yet Active" banner is clear with milestones ($20M+ LOIs, governance and council established, 13+ ideal land projects and 20+ alliance partners). Letter of Intent form has all fields: Full Name, Email, Phone, Organization, Role/Title, Investment Interest Range, Investment Timeline, Additional Notes, "How did you hear about us?". Two CTAs: "Submit Letter of Intent" and "View Investment Thesis."

**One note:** The page has no descriptive page title (falls back to generic). Should be "Letter of Intent | ReGen Civics" or similar.


---

### Fix 92 - /shape-next-session: Works Well (P4-LOW)

**Status:** VERIFIED - GOOD

**Findings:** Clean form page. Shows next session date (Sunday, March 29, 2026 at 1:00 PM CDT), optional Name/Email fields, topic suggestion textarea, attendance radio buttons ("Yes, I'll be there" / "Wouldn't miss it"). Good community engagement tool.

---

### Fix 93 - /marketplace: Works, Empty State (P4-LOW)

**Status:** VERIFIED - GOOD

**Findings:** "Gifts + Needs Marketplace" renders correctly with header, description, "Add your gifts + needs" CTA, category/status filter dropdowns, and "No entries yet" empty state. API (`marketplace.list`) returns 200.

---

### Fix 94 - /newsletter: Works Well (P4-LOW)

**Status:** VERIFIED - GOOD

**Findings:** "Stay Connected" hero with envelope icon, email input, "Subscribe to Newsletter" button, three value props (Monthly Updates, No Spam, Exclusive Content). Clean design.

---

### Fix 95 - /create-campaign: Needs Auth + Password Gate (P2-HIGH)

**Status:** DECISION MADE by Rye -- auth-gated with password 222

**Requirement:** /create-campaign must require BOTH:
1. User must be logged in (authenticated via Google/Apple/email)
2. User must enter password **222** to access the page

**Implementation:** Copy the password gate pattern from `client/src/pages/AdminModeration.tsx` (which already uses password "222"). Add it to the top of `client/src/pages/CreateCampaign.tsx`. Also add auth redirect using `useAuth({ redirectOnUnauthenticated: true })`.

The `applicantsForCampaign.list` tRPC endpoint already uses `protectedProcedure` (requires auth). The page just needs the client-side gates added.

**File:** `client/src/pages/CreateCampaign.tsx` (add auth + password gate from AdminModeration.tsx pattern)

---

## SECTION T: NETWORK & API FINDINGS (2026-03-22)

### Fix 96 - DUOLILquhPlWMUAF.png and MlOLFSvIBeiOvIFd.png Loaded on EVERY Page (P2-HIGH)

**Status:** NEEDS FIX

**Symptom:** Network monitoring shows that `/api/img?url=...DUOLILquhPlWMUAF.png` and `/api/img?url=...MlOLFSvIBeiOvIFd.png` are requested on EVERY SINGLE page navigation. Across 12 page navigations, these two images appeared 24+ times in the network log. Both return 200 via the image proxy, but `DUOLILquhPlWMUAF.webp` returns 404 when accessed directly at the CDN.

**Impact:** Two unnecessary image requests on every page load. These are likely in a shared layout component (nav, footer, or background).

**Fix:** Identify which component references these images. If they're decorative/background, consider inlining or removing. If they're logos/icons, ensure they're cached properly and not re-fetched on every SPA navigation. The `.webp` version is missing from R2 but the `.png` version exists.

**Files:** Shared layout component, Navigation, or Footer

---

### Fix 97 - Excessive API Calls on Every Page Navigation (P2-HIGH)

**Status:** NEEDS FIX

**Symptom:** Every SPA page navigation triggers a batch of 4-5 API calls:
1. `/api/csrf-token` (GET)
2. `/api/trpc/amas.getNext,auth.me` (batched GET)
3. `/api/trpc/userProfiles.getMe,newsletter.hasSubscribed,notifications.unreadCount,messages.unreadCount` (batched GET)
4. Two image proxy requests (Fix 96)

For an unauthenticated user, calls 2 and 3 always return the same "not authenticated" response. These are wasted round trips.

**Fix:** Cache the auth.me response and don't re-fetch on every navigation. Use React Query's staleTime/cacheTime settings to avoid refetching data that hasn't changed. For unauthenticated users, skip user-specific API calls entirely after the first check.

**Files:** tRPC client config, React Query setup, auth context

---

### Fix 98 - All API Endpoints Return 200 (No Server Errors Detected) (P4-LOW)

**Status:** VERIFIED - GOOD

**Findings:** Across 91 network requests monitored during the page audit, every single API call returned HTTP 200. No 4xx or 5xx errors from the tRPC endpoints. The server is stable. Endpoints working: csrf-token, auth.me, amas.getNext, userProfiles.getMe, newsletter.hasSubscribed, notifications.unreadCount, messages.unreadCount, crowdPoolingProjects.list, glossary.list, events.list, marketplace.list, applicantsForCampaign.list, applications.myApplications, savedContributions.list, community.activeLandProjects.

---

### Fix 99 - Console Clean of Application Errors (P4-LOW)

**Status:** VERIFIED - GOOD

**Findings:** Console monitoring across multiple page navigations showed zero application-level errors. The only console noise was from browser extensions (MetaMask's "SES Removing unpermitted intrinsics"). The client-side code runs without throwing.

---

### Fix 100 - Multiple Pages Missing Descriptive Page Titles (P2-HIGH)

**Status:** NEEDS FIX

**Symptom:** Several pages fall back to the generic "ReGen Civics: Fund and Game for Regenerative Land Projects" title instead of having descriptive titles. Confirmed pages with generic/missing titles:
- /admin (auth-gated)
- /co-creators-guide (auth-gated)
- /marketplace
- /loi
- /create-campaign

Other pages correctly set descriptive titles (e.g., /schedule: "Schedule: Community Sessions & Events", /glossary: "Glossary | ReGen Civics", /showcase: "Project Showcase | ReGen Civics").

**Fix:** Add proper `document.title` or `useEffect` title setting for all routes. Important for SEO, browser tab navigation, and bookmarking.

**File:** Each page component, or the route config if using a centralized title system

---

### Fix 101 - /crowd-pooling Has Title Set But Content is Auth-Gated (P3-MEDIUM)

**Status:** NOTED

**Findings:** The /crowd-pooling page correctly sets its title to "Crowd Pooling Tool | ReGen Civics" and /crowd-pooling-projects sets "Land Project Campaigns | ReGen Civics Crowd Pooling." These pages properly resolve titles even in the auth-gated state. The inconsistency is that some auth-gated pages set titles (crowd-pooling) while others don't (admin, co-creators-guide).

**Fix:** Standardize: all pages should set their title regardless of auth state.

---

### Fix 102 - Sentry Sending Events During Normal Browsing (P3-MEDIUM)

**Status:** NEEDS INVESTIGATION

**Findings:** Sentry envelope POST requests were captured on multiple page navigations, even though no console errors were visible. This suggests Sentry is capturing warnings, performance data, or breadcrumb events.

**Fix:** Review Sentry configuration. If only error tracking is desired, ensure `tracesSampleRate` and `replaysSessionSampleRate` are set appropriately to avoid excessive Sentry usage/billing. If performance monitoring is intentional, this is fine.

**File:** Sentry init config in client entry point

---

### Fix 104 - "Back" Button Appears on Pages Where It Shouldn't (P3-MEDIUM)

**Status:** NEEDS REVIEW

**Findings:** Many pages show a "Back" button in the top-left that uses browser history navigation. On pages like /regen-games and /custom-games (which are empty), the Back button is the ONLY visible element. On /compare-projects, it overlaps the breadcrumb. On /showcase, it overlaps the hero layout.

**Fix:** Review the Back button component. It should only appear on sub-pages where it makes contextual sense (e.g., inside a quest detail, inside a project page). It should not appear on top-level section pages that are accessible from the main nav unless the user navigated there using a page and not the menu then the back button would take them back to the section of the last page they were on. 

**File:** Layout or Back button component

---

## SECTION U: MOBILE RESPONSIVENESS CODE AUDIT (Fixes 106-133)

### Fix 106 - Hero Images Use loading="lazy" Above the Fold (P2-HIGH)

**Status:** NEEDS FIX

**Symptom:** In Home.tsx (lines 444-462), the hero section's desktop image (`width={1200} height={675}`) and mobile image (`width={800} height={1200}`) both use `loading="lazy"`. These are the first images a visitor sees. Lazy-loading above-the-fold images delays LCP (Largest Contentful Paint) and makes the hero feel slow on first load.

**Fix:** Change both hero images to `loading="eager"` or remove the loading attribute entirely (browser default is eager). Keep `decoding="async"`.

**File:** `client/src/pages/Home.tsx` lines 444-462

---

### Fix 107 - Hero Images Missing Explicit Dimensions Cause Layout Shift (P2-HIGH)

**Status:** NEEDS FIX

**Symptom:** Hero images in Home.tsx set width/height as props but may not translate to explicit HTML width/height attributes depending on the image component used. Without explicit intrinsic dimensions in the HTML, the browser cannot reserve space before the image loads, causing Cumulative Layout Shift (CLS).

**Fix:** Ensure the rendered `<img>` tags have explicit `width` and `height` attributes (or use `aspect-ratio` in CSS). Verify with Lighthouse that CLS score is below 0.1.

**File:** `client/src/pages/Home.tsx` hero section

---

### Fix 108 - Map Page Uses 100vh Which Breaks on Mobile Browsers (P2-HIGH)

**Status:** NEEDS FIX

**Symptom:** Map.tsx line 15 uses `style={{ minHeight: "calc(100vh - 64px)" }}`. On mobile browsers (iOS Safari, Chrome Android), `100vh` includes the area behind the browser's address bar and toolbar. When the address bar is visible, the map container extends below the visible area, causing content to be cut off or requiring scroll on what should be a full-screen map.

**Fix:** Replace `100vh` with `100dvh` (dynamic viewport height), which accounts for the browser UI. Fallback for older browsers: `min-height: calc(100vh - 64px); min-height: calc(100dvh - 64px);`

**File:** `client/src/pages/Map.tsx` line 15

---

### Fix 109 - Form Input Touch Targets Below 44px Minimum (P2-HIGH)

**Status:** NEEDS FIX

**Symptom:** The base input component in `client/src/components/ui/input.tsx` (line 57) uses `h-9` (36px height). Apple's Human Interface Guidelines and WCAG 2.5.5 require a minimum 44x44px touch target. At 36px, mobile users will mistype and struggle with form fields across every form on the site: /apply, /investor-form, /connect, /create-campaign, newsletter signup, login, and all admin forms.

**Fix:** Change `h-9` to `h-11` (44px) or add `min-h-[44px]` to the input component. Also check select dropdowns, textareas, and checkboxes for the same issue.

**File:** `client/src/components/ui/input.tsx` line 57

---

### Fix 110 - BackButton Fixed Positioning Conflicts on Mobile (P2-HIGH)

**Status:** NEEDS FIX

**Symptom:** BackButton.tsx (line 31) uses `fixed top-20 left-4 z-40` when not inline. On mobile, `top-20` (80px) may overlap with the sticky header (z-50) or content. On pages like /compare-projects and /showcase, the button overlaps breadcrumbs and hero layouts. The z-index of 40 sits below the nav (z-50) but above page content, creating a confusing layering.

**Fix:** Default BackButton to inline mode on mobile (`md:fixed md:top-20 md:left-4`, relative on mobile). Or better: remove fixed positioning entirely and make it part of the page layout flow.

**File:** `client/src/components/BackButton.tsx` line 31

---

### Fix 111 - Hero Section min-h-[60vh] May Cut Content on Small Screens (P3-MEDIUM)

**Status:** NEEDS REVIEW

**Symptom:** Home.tsx line 245 sets `min-h-[60vh]` on the hero section. On a 667px tall iPhone SE screen, 60vh = 400px. If the hero text + CTA + image exceed 400px, content stacks correctly, but on landscape orientation or very small screens, the min-height constraint may cause awkward spacing.

**Fix:** Test hero section on iPhone SE (375x667) and Galaxy Fold (280x653). Consider using `min-h-[50vh] md:min-h-[60vh]` to give mobile more breathing room.

**File:** `client/src/pages/Home.tsx` line 245

---

### Fix 112 - Mobile Bottom Nav safe-area-pb Class Needs Verification (P3-MEDIUM)

**Status:** NEEDS VERIFICATION

**Symptom:** Navigation.tsx line 1023 uses a `safe-area-pb` class on the mobile bottom nav bar. This class is intended to add padding for the home indicator on iPhones with notches. If this class is not defined in the CSS (or if `env(safe-area-inset-bottom)` is not set), the bottom nav may be partially hidden behind the home indicator on notched devices.

**Fix:** Verify `safe-area-pb` is defined in index.css. If using Tailwind, the standard approach is `pb-[env(safe-area-inset-bottom)]`. Also ensure the HTML has `<meta name="viewport" content="..., viewport-fit=cover">` to enable safe area insets.

**File:** `client/src/components/Navigation.tsx` line 1023, `client/src/index.css`, `index.html`

---

### Fix 113 - Mobile Drawer Width May Be Too Narrow on Small Devices (P3-MEDIUM)

**Status:** NEEDS REVIEW

**Symptom:** Navigation.tsx line 551 sets the mobile drawer to `w-[min(85vw,320px)]`. On a 280px-wide Galaxy Fold, 85vw = 238px, which may feel cramped for navigation items with longer text. On standard 375px phones, 85vw = 319px, which is fine.

**Fix:** Test on Galaxy Fold (280px width). Consider `w-[min(90vw,360px)]` for slightly more room on narrow devices. Low priority since Galaxy Fold is a rare device.

**File:** `client/src/components/Navigation.tsx` line 551

---

### Fix 114 - Select/Dropdown Components Missing Mobile Touch Target Size (P2-HIGH)

**Status:** NEEDS FIX

**Symptom:** If custom select/dropdown components share the same `h-9` sizing as inputs, they also fail the 44px touch target requirement. Select triggers are particularly hard to tap on mobile because they're narrow and users expect them to respond instantly.

**Fix:** Audit all `<Select>`, `<SelectTrigger>`, and custom dropdown components for mobile touch target compliance. Apply `min-h-[44px]` consistently.

**File:** `client/src/components/ui/select.tsx` and related UI primitives

---

### Fix 115 - Textarea Components May Need Mobile Optimization (P3-MEDIUM)

**Status:** NEEDS REVIEW

**Symptom:** Multi-line textareas (used in /apply, forum post creation, campaign creation) may use default browser styling that doesn't account for mobile keyboard behavior. When the mobile keyboard opens, textareas can get pushed off-screen or become too small to see what's being typed.

**Fix:** Ensure textareas have `min-h-[120px]` on mobile, and test the scroll behavior when the mobile keyboard is active. Add `scroll-margin-bottom` so the cursor stays visible.

**File:** `client/src/components/ui/textarea.tsx`, form pages

---

### Fix 116 - Sticky Header Backdrop Blur Performance on Mobile (P3-MEDIUM)

**Status:** NEEDS REVIEW

**Symptom:** Navigation.tsx line 94 uses a sticky header with backdrop-blur. On older mobile devices (especially mid-range Android), `backdrop-filter: blur()` causes significant jank during scroll because it requires compositing on every frame.

**Fix:** Test scroll performance on a mid-range Android device. If janky, consider replacing backdrop-blur with a solid semi-transparent background on mobile: `md:backdrop-blur-md bg-black/80 md:bg-black/60`.

**File:** `client/src/components/Navigation.tsx` line 94

---

### Fix 117 - PathCardImage Animations May Cause Jank on Mobile (P3-MEDIUM)

**Status:** NEEDS REVIEW

**Symptom:** PathCardImage.css has complex CSS animations (.ally-beam with `top: -150%`, .land-spark particles). While the component correctly uses `@media (hover: none)` to disable hover effects on touch devices (line 352), the tap-triggered animations still run. On low-end mobile devices, absolute-positioned animated elements with gradients can cause frame drops.

**Fix:** Consider using `will-change: transform` on animated elements, or `@media (prefers-reduced-motion: reduce)` to disable animations entirely for users who prefer it. Verify the animations are using GPU-accelerated properties (transform, opacity) rather than top/left.

**File:** `client/src/components/PathCardImage.css` lines 150-230

---

### Fix 118 - Community Page Project Images Have Empty Alt Text (P2-HIGH)

**Status:** NEEDS FIX

**Symptom:** Community.tsx lines 507, 523, 539 have images with `alt=""`:
- `/game-infinite-forest.webp` alt=""
- `/community/finca-sagrada.webp` alt=""
- `/community/liminal-village.webp` alt=""

These are community land project images that convey meaning (project names/locations). Empty alt text tells screen readers to skip them entirely, making the page incomprehensible for visually impaired users.

**Fix:** Add descriptive alt text: `alt="Infinite Forest game"`, `alt="Finca Sagrada land project"`, `alt="Liminal Village land project"`.

**File:** `client/src/pages/Community.tsx` lines 507, 523, 539

---

### Fix 119 - Glass Panel Backgrounds Need Higher Opacity on Mobile (P3-MEDIUM)

**Status:** PARTIALLY ADDRESSED

**Symptom:** index.css lines 1137-1180 already include mobile-specific adjustments for glass panels (higher opacity, boosted text shadows). This is good. However, verify that all glass-panel components actually use the CSS classes targeted by these media queries. If some components use inline Tailwind classes instead, they won't benefit from these mobile overrides.

**Fix:** Audit all components using glass/frosted effects. Ensure they use the CSS classes from index.css rather than inline Tailwind backdrop-blur/bg-opacity classes that bypass the mobile overrides.

**File:** `client/src/index.css` lines 1137-1180, all components using glass effects

---

### Fix 120 - Mobile Landscape Orientation Not Tested (P3-MEDIUM)

**Status:** NEEDS TESTING

**Symptom:** No landscape-specific media queries found in the codebase. When users rotate their phone to landscape, pages with `min-h-[60vh]` or `100vh` calculations may produce awkward layouts. The hero section, map page, and full-screen sections are most at risk.

**Fix:** Test key pages in landscape orientation (667x375 for iPhone). Consider adding `@media (orientation: landscape) and (max-height: 500px)` rules to reduce hero heights and adjust layouts for landscape mobile.

**File:** `client/src/index.css`, hero sections in Home.tsx

---

### Fix 121 - Font Sizes in Hero May Be Too Large on Mobile (P2-HIGH)

**Status:** NEEDS FIX

**Symptom:** Hero headings likely use large responsive font sizes (text-4xl, text-5xl, text-6xl). On a 375px screen, `text-5xl` (3rem / 48px) can cause text to wrap awkwardly or overflow. Need to verify the hero text fits cleanly on a 375px viewport without horizontal overflow or breaking mid-word.

**Fix:** Ensure hero headings use `text-2xl md:text-4xl lg:text-5xl` progression. Test that no text causes horizontal overflow on 320px (smallest viable mobile width).

**File:** `client/src/pages/Home.tsx` hero section headings

---

### Fix 122 - Mobile Tap Delay on Interactive Elements (P3-MEDIUM)

**Status:** NEEDS VERIFICATION

**Symptom:** Modern browsers have eliminated the 300ms tap delay when `<meta name="viewport" content="width=device-width">` is set. Verify this meta tag is present in index.html. Without it, every button and link on mobile will feel sluggish.

**Fix:** Confirm `<meta name="viewport" content="width=device-width, initial-scale=1">` exists in index.html. Also add `touch-action: manipulation` to clickable elements if tap delay persists.

**File:** `index.html`

---

### Fix 123 - Collapsible Sections Accessibility (P3-MEDIUM)

**Status:** LIKELY OK

**Symptom:** Home.tsx uses Radix UI Collapsible components (lines 489, 562). Radix automatically handles `aria-expanded` and keyboard navigation. However, if the trigger doesn't have a descriptive `aria-label`, screen readers won't know what the collapsible reveals.

**Fix:** Verify that CollapsibleTrigger elements have descriptive text or `aria-label` (e.g., "Expand Fund details" rather than just a ChevronDown icon). Check both Fund and Game collapsibles.

**File:** `client/src/pages/Home.tsx` lines 489, 562

---

### Fix 124 - Horizontal Scroll Prevention on Mobile (P2-HIGH)

**Status:** NEEDS VERIFICATION

**Symptom:** Any element wider than the viewport causes a horizontal scrollbar on mobile. Common culprits: tables without `overflow-x: auto`, images without `max-w-full`, absolute-positioned elements extending beyond bounds. If any page allows horizontal scroll on mobile, it destroys the native feel.

**Fix:** Add `overflow-x: hidden` to the body or root element. Then audit all pages for elements that might cause horizontal overflow: wide tables (glossary, admin), wide images, absolute-positioned decorations.

**File:** `client/src/index.css`, `index.html`

---

### Fix 125 - /apply Form Multi-Step Layout on Mobile (P2-HIGH)

**Status:** NEEDS REVIEW

**Symptom:** The /apply page is a multi-step form that likely uses horizontal stepper navigation. On mobile, horizontal step indicators with text labels may overflow or become unreadable. The form is critical for attracting land projects to the incubator.

**Fix:** Test the full /apply flow on 375px width. Step indicators should stack vertically or use a compact format (e.g., "Step 2 of 5") on mobile. Form fields should be full-width. File upload controls need mobile-friendly touch targets.

**File:** `client/src/pages/Apply.tsx`

---

### Fix 126 - /investor-form Layout on Mobile (P2-HIGH)

**Status:** NEEDS REVIEW

**Symptom:** The investor form is a fundraising-critical page. If multi-column layouts, wide inputs, or complex select dropdowns don't adapt properly to mobile, potential $40M fund investors using their phones will bounce.

**Fix:** Test the full /investor-form flow on 375px. Ensure all fields are single-column, all selects/dropdowns open properly on mobile, and the submit flow completes without layout issues.

**File:** `client/src/pages/InvestorForm.tsx`

---

### Fix 127 - Blog Post Content May Overflow on Mobile (P3-MEDIUM)

**Status:** NEEDS REVIEW

**Symptom:** Blog posts render markdown/rich content that may include wide code blocks, tables, or embedded content. Without `overflow-x: auto` on content containers, these can cause horizontal scroll on mobile.

**Fix:** Add `overflow-x: auto` and `max-w-full` to the blog post content container. Ensure images in blog posts have `max-w-full h-auto`.

**File:** `client/src/pages/BlogPost.tsx` content rendering section

---

### Fix 128 - Glossary Page Table/List May Not Be Mobile-Optimized (P3-MEDIUM)

**Status:** NEEDS REVIEW

**Symptom:** The glossary page lists terms and definitions. If rendered as a table, it won't fit mobile screens. If rendered as a definition list, it should stack naturally but may have spacing issues.

**Fix:** Verify the glossary renders well at 375px. If it uses a table, convert to a stacked card layout on mobile. Each term should be full-width with the definition below it.

**File:** `client/src/pages/Glossary.tsx`

---

## SECTION V: UX, ACCESSIBILITY & SEO CODE AUDIT (Fixes 129-160)

### Fix 129 - OG Images Use Relative Paths, Will 404 on Social Sharing (P1-CRITICAL)

**Status:** NEEDS FIX

**Symptom:** SEO.tsx (lines 228-252) defines OG images with relative paths for multiple pages:
- `/og/connect.webp`
- `/og/map.webp`
- `/og/fund.webp`
- `/og/crowd-pooling.webp`
- `/og/community.webp`

When someone shares these pages on Twitter, LinkedIn, or Facebook, the social platform's crawler requests these as relative URLs. Without the full domain prefix, the images return 404. This means every social share of these pages shows a blank preview card. For a site trying to raise $40M, broken social cards are a major credibility hit.

**Fix:** Prefix all OG image paths with `https://regencivics.earth` or use cdnImg() to generate absolute URLs. Update the SEO component to always output absolute URLs for og:image meta tags.

**File:** `client/src/components/SEO.tsx` lines 228-252

---

### Fix 130 - Admin Page Uses localStorage Password Instead of Role-Based Auth (P1-CRITICAL)

**Status:** NEEDS FIX

**Symptom:** Admin.tsx (lines 4741-4754) authenticates admin access using a localStorage flag (`admin_authenticated`) set to "true" rather than checking the user's role via `useAuth()`. Anyone can open browser DevTools, run `localStorage.setItem("admin_authenticated", "true")`, and gain full admin access. This bypasses all server-side authentication.

**Fix:** Replace the localStorage password gate with proper `useAuth()` hook that verifies the user has 'admin' or 'superadmin' role. Redirect unauthorized users to login. Remove the password input entirely. Server-side: ensure all admin tRPC endpoints also verify admin role.

**File:** `client/src/pages/Admin.tsx` lines 4741-4754

---

### Fix 131 - Newsletter Signup Silently Fails on Error (P2-HIGH)

**Status:** NEEDS FIX

**Symptom:** NewsletterSignup.tsx line 55 has an empty `onError` handler:
```
onError: () => {
  // Silently fail
},
```
When the newsletter API call fails (network error, server error, duplicate email), the user gets zero feedback. They think they subscribed but didn't. For a community-building site, losing newsletter signups to silent errors directly hurts growth.

**Fix:** Add an error state that shows a message like "Something went wrong. Please try again." or "You may already be subscribed." Use a toast notification or inline error message.

**File:** `client/src/components/NewsletterSignup.tsx` line 55

---

### Fix 132 - CookieConsent Banner Not Keyboard Dismissible (P3-MEDIUM)

**Status:** NEEDS FIX

**Symptom:** CookieConsent.tsx has no ESC key handler. Keyboard users and screen reader users cannot dismiss the cookie banner without tabbing to and activating a button. Standard accessibility practice requires modal/dialog overlays to support ESC key dismissal.

**Fix:** Add a `useEffect` keydown listener for the Escape key that calls the dismiss/accept function. Also add `role="alertdialog"` and `aria-label="Cookie consent"` to the banner container.

**File:** `client/src/components/CookieConsent.tsx`

---

### Fix 133 - Service Worker Registers console.log Statements in Production (P3-MEDIUM)

**Status:** NEEDS FIX

**Symptom:** ServiceWorkerRegister.tsx has 6 console.log statements (lines 7, 10, 24, 45, 51, 62) all prefixed with `[SW]`. These log on every page load in production, cluttering the browser console. Professional sites don't leave debug logging in production.

**Fix:** Remove all console.log statements, or wrap them in a `if (import.meta.env.DEV)` check so they only appear during development.

**File:** `client/src/components/ServiceWorkerRegister.tsx` lines 7, 10, 24, 45, 51, 62

---

### Fix 134 - NotFound Page Missing SEO, Title, and noindex Meta (P2-HIGH)

**Status:** NEEDS FIX

**Symptom:** NotFound.tsx does not use the `<SEO>` component, does not set `document.title`, and does not add a `<meta name="robots" content="noindex, nofollow">` tag. Without noindex, search engines may index 404 pages (if they're linked from anywhere), diluting SEO. Without a title, the browser tab shows the generic site title, and users can't tell from their tabs that they hit a dead end.

**Fix:** Add `<SEO title="Page Not Found" description="..." robots="noindex, nofollow" />` to the NotFound component. Set document.title to "Page Not Found | ReGen Civics".

**File:** `client/src/pages/NotFound.tsx`

---

### Fix 135 - CommunityPost Page May Not Set Dynamic Title (P2-HIGH)

**Status:** NEEDS VERIFICATION

**Symptom:** CommunityPost.tsx may not set `document.title` to include the post title. When a user opens a community post, their browser tab should show the post title, not the generic site title. This matters for bookmarking, tab navigation, and SEO.

**Fix:** Add a `useEffect` that sets `document.title` to the post title once loaded. Or use the SEO component with dynamic title/description props from the post data.

**File:** `client/src/pages/CommunityPost.tsx`

---

### Fix 136 - CampaignDetail Page May Not Set Dynamic Title (P2-HIGH)

**Status:** NEEDS VERIFICATION

**Symptom:** Same issue as Fix 135 but for CampaignDetail.tsx. Campaign pages are shared by land projects seeking funding. When shared, the browser tab and OG metadata should reflect the campaign name, not the generic site title.

**Fix:** Add SEO component with dynamic title and description from campaign data.

**File:** `client/src/pages/CampaignDetail.tsx`

---

### Fix 137 - Missing pageSEO Entries for 7+ Routes (P2-HIGH)

**Status:** NEEDS FIX

**Symptom:** SEO.tsx's `pageSEO` object is missing entries for: PlayerProfile, Admin, AdminApplications, AdminModeration, CreateCampaign, CommunityNewPost, Checkin. These pages fall back to the generic default SEO, which means social shares and search results show the same generic title/description for all of them.

**Fix:** Add unique pageSEO entries for each missing route. Each should have a descriptive title, relevant description, and appropriate OG image.

**File:** `client/src/components/SEO.tsx`

---

### Fix 138 - Focus Styles Use :focus Instead of :focus-visible (P3-MEDIUM)

**Status:** NEEDS FIX

**Symptom:** Navigation.tsx (lines 160-227) uses `focus:bg-[#ffd700]/20` for interactive elements. This shows focus rings on mouse clicks, which looks wrong to sighted users. The modern accessibility pattern is `focus-visible:` which only shows focus indicators for keyboard navigation.

**Fix:** Replace `focus:` with `focus-visible:` across navigation buttons and links. Also ensure the global CSS has a `:focus-visible` ring style defined for all interactive elements.

**File:** `client/src/components/Navigation.tsx` lines 160-227, global CSS

---

### Fix 139 - BlogPost Uses Array Index as React Key (P3-MEDIUM)

**Status:** NEEDS FIX

**Symptom:** BlogPost.tsx line 162-165 uses `key={index}` for table of contents items, and line 411-425 uses `key={i}` for segments. Using array indices as keys can cause React to incorrectly reuse DOM elements when lists reorder, leading to visual glitches and stale state.

**Fix:** Use stable unique identifiers: `key={header.id}` for table of contents, `key={seg.id || 'segment-' + i}` for segments.

**File:** `client/src/pages/BlogPost.tsx` lines 162, 411

---

### Fix 140 - Community Page Missing Loading Skeleton (P2-HIGH)

**Status:** NEEDS FIX

**Symptom:** Community.tsx shows no loading placeholder while data fetches. Users see blank space or a flash of empty content before posts appear. On slow mobile connections, this can last 2-5 seconds, making the page feel broken.

**Fix:** Add a loading skeleton that mirrors the layout of community posts (card shapes, text line placeholders). Show it while `isLoading` is true from the data query.

**File:** `client/src/pages/Community.tsx`

---

### Fix 141 - PlayerProfile Page Missing Loading Skeleton (P2-HIGH)

**Status:** NEEDS FIX

**Symptom:** PlayerProfile.tsx shows no loading state while fetching profile data. The profile page is the first thing a user sees after login. A blank loading state gives no confidence that anything is happening.

**Fix:** Add a profile skeleton with avatar placeholder, name line, bio lines, and stat blocks. Show while profile data is loading.

**File:** `client/src/pages/PlayerProfile.tsx`

---

### Fix 142 - CampaignDetail Page Missing Loading Skeleton (P2-HIGH)

**Status:** NEEDS FIX

**Symptom:** CampaignDetail.tsx has no loading skeleton. Campaign pages are shared externally to attract investment. If a potential investor clicks a link and sees blank content for 3 seconds on mobile, they may leave.

**Fix:** Add a campaign detail skeleton with hero image placeholder, title, description lines, and funding progress bar placeholder.

**File:** `client/src/pages/CampaignDetail.tsx`

---

### Fix 143 - Admin Broadcast Panel Image Has Generic Alt Text (P4-LOW)

**Status:** NEEDS FIX

**Symptom:** AdminBroadcastPanel.tsx line 541 uses `alt="Preview"` for broadcast images. While this is an admin-only page, proper alt text improves accessibility for admin users using screen readers.

**Fix:** Change to `alt="Broadcast image preview"` or dynamically reference the broadcast content.

**File:** `client/src/components/AdminBroadcastPanel.tsx` line 541

---

### Fix 144 - Missing aria-labels on Icon-Only Buttons (P2-HIGH)

**Status:** NEEDS FIX

**Symptom:** Throughout the codebase, icon-only buttons (close buttons, menu toggles, action buttons) may lack `aria-label` attributes. Screen readers announce these as "button" with no context. This affects ChevronDown toggles, close (X) buttons, social media icon links, and the mobile bottom nav icons.

**Fix:** Audit all icon-only `<button>` and `<a>` elements. Add descriptive `aria-label` attributes: "Close menu", "Toggle section", "Visit Twitter", etc. The mobile bottom nav bar icons in Navigation.tsx are a priority.

**File:** Multiple components, priority: `Navigation.tsx`, `SiteFooter.tsx`, `Home.tsx`

---

### Fix 145 - Missing Skip-to-Content Link for Keyboard Navigation (P3-MEDIUM)

**Status:** NEEDS FIX

**Symptom:** No "Skip to main content" link exists. Keyboard users and screen reader users must tab through the entire navigation on every page before reaching the content. This is a WCAG 2.4.1 Level A requirement.

**Fix:** Add a visually hidden link as the first focusable element in the DOM: `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to main content</a>`. Add `id="main-content"` to the main content wrapper.

**File:** `client/src/App.tsx` or root layout component, main content wrapper

---

### Fix 146 - Color Contrast on Glass Panels May Fail WCAG (P3-MEDIUM, downgraded from P2)

**Status:** CHECKED 2026-03-23 via live screenshots -- PASSES AA, minor improvements needed

**Verified via screenshots at 400px viewport:**
- Homepage path cards: White text over dark gradient overlays. **PASSES AA.**
- Top/bottom navigation: Good contrast throughout. **PASSES AA.**
- Fund page banner: Dark text on amber gradient. **PASSES AA.**

**Borderline areas (improve but not blocking):**
- Path card subtitles ("FUND THE RENAISSANCE" etc.): Small light gray text on semi-transparent dark. Passes but barely. Increase font-weight to 500 or use rgba(255,255,255,0.85).
- "View Full Landing Page" text: Thin white on dark. Passes but thin font hurts readability. Increase font-weight to 500.

**Fix for Claude Code:** Bump font-weight on path card subtitles and "View Full Landing Page". Minor CSS change, not a blocker.

**File:** `client/src/index.css`, `client/src/pages/Home.tsx`

---

### Fix 147 - No Error State for Failed Image Loads Site-Wide (P2-HIGH)

**Status:** NEEDS FIX

**Symptom:** When images fail to load (404, timeout, corrupt), the default browser behavior shows a broken image icon. This looks unprofessional. Related to Fix 2/34 but broader: every `<img>` on the site should handle load failures gracefully.

**Fix:** Create a global image error handler or update the OptimizedImage component with `onError` that replaces broken images with a branded placeholder (site logo, gradient background, or a themed "image unavailable" state).

**File:** `client/src/components/OptimizedImage.tsx` or a new ImageWithFallback component

---

### Fix 148 - Missing Structured Data / JSON-LD for SEO (P3-MEDIUM)

**Status:** NEEDS FIX

**Symptom:** No `<script type="application/ld+json">` structured data found. Google uses structured data to create rich search results (sitelinks, breadcrumbs, organization info). Without it, the site appears as plain blue links in search results. Competitors with structured data will have richer, more clickable search listings.

**Fix:** Add JSON-LD structured data for: Organization (name, logo, social profiles), WebSite (search action), BreadcrumbList (for nested pages), and Article (for blog posts). Start with Organization and WebSite as they apply globally.

**File:** `client/src/components/SEO.tsx` or a new StructuredData component

---

### Fix 149 - Sitemap.xml: EXISTS, needs GSC submission (P4-LOW, downgraded)

**Status:** CHECKED 2026-03-23 -- SITEMAP EXISTS AND IS COMPREHENSIVE

**Verified:** `https://regencivics.earth/sitemap.xml` returns valid XML with 70+ URLs including all pages, blog posts, community posts, one-pagers, and legal pages. Proper priorities and change frequencies set.

**Remaining:** Rye must submit sitemap URL to Google Search Console manually (GSC > Sitemaps > Add > "sitemap.xml" > Submit). Takes 30 seconds.

---

### Fix 150 - No robots.txt File (P3-MEDIUM)

**Status:** NEEDS VERIFICATION

**Symptom:** Without robots.txt, search engines will crawl everything including admin pages, auth-gated pages, and API endpoints. This wastes crawl budget and may expose URLs that shouldn't be indexed.

**Fix:** Create a robots.txt that allows crawling of public pages, disallows /admin, /api, and other non-public paths, and references the sitemap.xml URL.

**File:** `public/robots.txt`

---

### Fix 151 - Preconnect/Prefetch Hints Missing for Critical Resources (P3-MEDIUM)

**Status:** NEEDS FIX

**Symptom:** The site loads images from `assets.regencivics.earth` (Cloudflare R2) and API calls from the same origin. Without `<link rel="preconnect">` for the CDN domain, the browser doesn't establish the connection until it discovers the first image, adding latency to LCP.

**Fix:** Add to index.html `<head>`:
- `<link rel="preconnect" href="https://assets.regencivics.earth">`
- `<link rel="dns-prefetch" href="https://assets.regencivics.earth">`

**File:** `index.html`

---

### Fix 152 - No Web App Manifest or PWA Metadata (P3-MEDIUM)

**Status:** NEEDS VERIFICATION

**Symptom:** If a manifest.json exists but is incomplete, or doesn't exist at all, the site can't be "installed" as a PWA on mobile home screens. The ServiceWorkerRegister.tsx suggests PWA was intended. A proper manifest with icons, theme color, and display mode makes the site feel like a native app when added to home screen.

**Fix:** Verify manifest.json exists and includes: name, short_name, start_url, display (standalone), background_color, theme_color, and properly sized icons (192x192, 512x512).

**File:** `public/manifest.json`, `index.html`

---

### Fix 153 - Console.log Statements Across Codebase (P3-MEDIUM)

**Status:** NEEDS CLEANUP

**Symptom:** Beyond ServiceWorkerRegister.tsx (Fix 133), there may be additional console.log statements scattered across the codebase from development. These clutter the production console and can leak debug information.

**Fix:** Search the entire client/src for `console.log` and `console.warn`. Remove or gate behind `import.meta.env.DEV`. Exceptions: error boundary componentDidCatch logging is acceptable.

**File:** All client source files

---

### Fix 155 - Form Validation Errors Not Announced to Screen Readers (P3-MEDIUM)

**Status:** NEEDS FIX

**Symptom:** When form validation fails (required field empty, invalid email), error messages appear visually but may not be announced to screen readers. Without `aria-live="polite"` on error message containers or `aria-invalid="true"` on the failed inputs, screen reader users won't know what went wrong.

**Fix:** Add `aria-invalid="true"` to inputs with errors. Add `aria-describedby` linking to the error message. Wrap error messages in a container with `role="alert"` or `aria-live="polite"`.

**File:** Form components, `client/src/components/ui/input.tsx`, validation logic in form pages

---

### Fix 156 - No Canonical URL Meta Tags (P3-MEDIUM)

**Status:** NEEDS FIX

**Symptom:** Without `<link rel="canonical">` tags, search engines may index duplicate URLs (with/without trailing slash, with query parameters, www vs non-www). This splits SEO authority across multiple URLs for the same content.

**Fix:** Add canonical URL generation to the SEO component. Each page should output `<link rel="canonical" href="https://regencivics.earth/[path]">` with the normalized URL.

**File:** `client/src/components/SEO.tsx`

---

### Fix 157 - Missing Open Graph Type Tags (P3-MEDIUM)

**Status:** NEEDS VERIFICATION

**Symptom:** OG tags should include `og:type` (website, article, profile) for proper social card rendering. Blog posts should use `og:type=article` with `article:published_time` and `article:author`. Other pages should use `og:type=website`.

**Fix:** Verify og:type is set in the SEO component. Add article-specific OG tags for blog posts.

**File:** `client/src/components/SEO.tsx`

---

### Fix 158 - High Contrast Mode Partially Supported (P4-LOW)

**Status:** NOTED

**Symptom:** index.css line 1178 includes `@media (prefers-contrast: more)` support, which is ahead of most sites. Verify this covers all text, buttons, and form elements. High-contrast mode users are a small but important accessibility audience.

**Fix:** Test the site in Windows High Contrast mode and with `prefers-contrast: more` enabled. Ensure all interactive elements remain visible and functional.

**File:** `client/src/index.css`

---

### Fix 159 - Link Elements Missing Descriptive Text (P3-MEDIUM)

**Status:** NEEDS REVIEW

**Symptom:** Links that say "Learn more", "Click here", or just use an icon without text are inaccessible. Screen readers announce "link: learn more" with no context about the destination. Social media icon links in the footer are common offenders.

**Fix:** Audit all `<a>` tags. Ensure each has descriptive link text or an `aria-label`. For icon links: `<a href="..." aria-label="ReGen Civics on Twitter">`. For "Learn more" links, change to "Learn more about the Fund" or similar.

**File:** `SiteFooter.tsx`, throughout page components

---

### Fix 160 - No 404 Handling for Dynamic Routes (P2-HIGH)

**Status:** NEEDS VERIFICATION

**Symptom:** Dynamic routes like /blog/:slug, /community/:id, /campaign/:id may not properly handle invalid IDs. If someone visits /blog/nonexistent-post, the page might show an infinite loading state or crash instead of a clean "Post not found" message.

**Fix:** Verify that all dynamic route pages handle the "data not found" case. Each should show a friendly "not found" state with navigation back to the parent page, rather than a blank screen or error.

**File:** `client/src/pages/BlogPost.tsx`, `CommunityPost.tsx`, `CampaignDetail.tsx`, `EventDetail.tsx`

---

## SECTION W: LIVE MOBILE BROWSER AUDIT at 400px (Fixes 161-215)

*Audited 2026-03-23 at 400x845px viewport (2x DPR). Every finding below was confirmed visually in a live browser session.*

### Fix 161 - Homepage Path Cards Are Single-Column, Need 2x2 Grid on Mobile (P1-CRITICAL)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** The "Four Paths to Play" section renders each path card at 368px wide x 564px tall in a single column. Users must scroll through 2,256px (nearly 3 full screens) just to see all four paths. This is the most important section on the homepage for a first-time visitor, and forcing them to scroll past 3 screens of cards before seeing anything else is a conversion killer.

**Fix:** On mobile, switch to a 2x2 grid: `grid-cols-2` at `sm:` breakpoint or below. Reduce card height to ~280px on mobile by hiding or collapsing the description text (show only icon + title + subtitle). Consider a horizontal swipe carousel as an alternative.

**File:** `client/src/pages/Home.tsx`, path cards section container. Current container uses `display: block` with no grid or flex.

---

### Fix 162 - /opportunity Renders Empty on Mobile Despite Having Content (P1-CRITICAL, downgraded from P0)

**Status:** INVESTIGATED -- /opportunity has 2,332 lines of content, rendering issue on mobile

**Original symptom:** During 400px mobile audit, /opportunity appeared completely empty (mainHeight: 0).

**Actual state (verified via codebase):**
- /investor is a separate route rendering InvestorJourneyForm (multi-step investor form) -- this is CORRECT
- /opportunity is a separate route rendering a full 2,332-line investment memorandum page with collapsible sections, calculators, case studies, LP dispatch, TOC, etc.
- There is NO redirect from /investor to /opportunity. They are independent routes.
- The issue is that /opportunity was rendering empty at 400px viewport, likely a CSS/JS rendering bug on mobile

**Fix for Claude Code:** Debug why /opportunity renders with 0 height on mobile at 400px. Check for conditional rendering, CSS overflow issues, or JS initialization that fails on small viewports. The content exists, it just does not display.

**File:** `client/src/pages/Opportunity.tsx`

---

### Fix 163 - /investor-form Returns 404 (P1-CRITICAL)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** Navigating to /investor-form shows the custom 404 page: "This path hasn't been cleared yet." If any internal link, old email, or search result points to /investor-form, investors get a dead end.

**Fix:** delete the investor-form page as /investor replaces it or redirect investor-form to investor
**File:** Route config

---

### Fix 164 - Blog Page: 14 of 15 Images Broken (P1-CRITICAL)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** On /blog at 400px, 14 out of 15 blog post thumbnail images have `naturalWidth === 0` (failed to load). Only 1 image loaded successfully. Every blog post card shows a broken image or placeholder. This makes the blog look abandoned and unprofessional.

**Fix:** Audit all blog post image URLs. These are likely R2 bucket references that are missing or corrupted. Re-upload the actual images. Also add the global image error fallback (Fix 147) so broken images show a branded placeholder instead of broken icons.

**File:** Blog post image data, R2 bucket, `client/src/data/blogPosts.ts`

---

### Fix 165 - Quest Page: 9+ Quest Card Images Broken (P1-CRITICAL)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** On /quest, at least 9 quest card images failed to load (naturalWidth === 0). Cards for "Healing the Five Bodies", "Study Natural Hygiene", "Launch a Community", and all Season 1 quests (Quest 1-5+) show broken images. The quest page is 17,910px tall, and broken images throughout make it look like the game isn't real.

**Fix:** Re-upload quest card images to R2. Verify the image URLs in quest data. Same root cause as Fix 164 (R2 bucket missing files).

**File:** Quest card data/component, R2 bucket

---

### Fix 166 - Governance Page: All 8 Images Broken (P1-CRITICAL)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** On /governance, all 8 images have naturalWidth === 0. The page is 16,996px tall and every visual is broken. Governance is a key trust-building page for investors.

**Fix:** Re-upload governance page images to R2.

**File:** Governance page component, R2 bucket

---

### Fix 167 - Game Page: Both Images Broken, 29 Tiny Touch Targets (P1-CRITICAL)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** On /game, both images failed to load. The page also has **29 interactive elements below 44px height**. This is the worst touch target score of any page audited. Many of these are likely inline text links styled at body font size with no padding.

**Fix:** (1) Re-upload game page images. (2) Audit all links and buttons on /game. Inline text links need at minimum `py-2` padding or larger tap area wrappers to reach 44px.

**File:** `client/src/pages/Game.tsx`, R2 bucket

---

### Fix 168 - Seasons Page: 2 Broken Images (P2-HIGH)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** On /seasons, 2 images failed to load. The page is 13,628px tall and otherwise has good content.

**Fix:** Re-upload seasons page images to R2.

**File:** Seasons page component, R2 bucket

---

### Fix 169 - Community Page: 5 Broken Images (P2-HIGH)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** On /community, 5 images failed to load. These are likely community land project images or user avatars.

**Fix:** Re-upload or regenerate community page images. Check if these are user-uploaded avatars vs static assets.

**File:** `client/src/pages/Community.tsx`, R2 bucket

---

### Fix 170 - Team Page: 2 Broken Images, First Avatar 0px Height (P2-HIGH)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** On /team, 2 images broken. The first image renders at 400px wide but 0px height, meaning the `<img>` element exists but the image data is missing. Team member cards are in single-column grids (336px wide) which is fine for mobile, but broken avatars hurt credibility.

**Fix:** Re-upload team member images. Check if the first image URL is pointing to a missing R2 file. Add image error fallback.

**File:** `client/src/pages/Team.tsx`, R2 bucket

---

### Fix 171 - Connect Page: 1 Broken Image (P3-MEDIUM)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** On /connect, 1 image failed to load. Lower priority since the page is text-focused.

**Fix:** Identify and re-upload the broken image.

**File:** `client/src/pages/Connect.tsx`

---

### Fix 172 - Map SVG Renders at 0x0 on Mobile (P1-CRITICAL)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** On /map at 400px viewport, the interactive map SVG renders at 0x0 pixels. The map is invisible. The page is 5,698px tall so there IS content below the map area, but the main interactive feature (the global network map) is completely missing on mobile.

**Fix:** The SVG map likely has a fixed width or is using viewport units that break at narrow widths. Check the SVG viewBox and container sizing. Ensure the map container has `width: 100%` and the SVG has a responsive viewBox. May need a completely different map approach for mobile (e.g., a list view of locations instead of interactive map).

**File:** `client/src/pages/Map.tsx`, map SVG component

---

### Fix 173 - Footer Links: 27 of 28 Below 44px Touch Target (P2-HIGH)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** The footer contains 28 interactive elements (links and buttons). 27 of them are below the 44px minimum touch target height. Footer links are packed tight with insufficient vertical padding. On mobile, users will tap wrong links constantly.

**Fix:** Add `py-2` (8px vertical padding) to all footer link elements, bringing the total touch area to ~36+16 = approximately 44px. Alternatively, increase `leading-relaxed` or `gap` in the footer link lists.

**File:** `client/src/components/SiteFooter.tsx`

---

### Fix 174 - Footer Social Icons Only 20x20px (P2-HIGH)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** WhatsApp, Discord, and YouTube social icons in the footer are 20x20px. This is less than half the required 44px touch target. Users on mobile will struggle to tap these, especially side-by-side. Social links are important for community building.

**Fix:** Increase icon sizes to at least 24px with 44px tap area wrappers. Use `p-3` on the link element wrapping each icon to create a 44px+ touch target.

**File:** `client/src/components/SiteFooter.tsx` social link section

---

### Fix 175 - Mobile Menu Close Button Only 28x28px (P2-HIGH)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** The hamburger drawer menu's close (X) button is 28x28px. Users need to close the menu after navigating. A 28px target is too small, especially in the corner of the screen where thumb accuracy is lowest.

**Fix:** Increase the close button to at least 44x44px. Use padding around the icon to expand the tap area without making the icon visually larger.

**File:** `client/src/components/Navigation.tsx` mobile drawer close button

---

### Fix 176 - /fund "Submit LOI" Button Only 28px Tall (P2-HIGH)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** The primary CTA on the /fund page, "Submit LOI", is only 28px tall. This is the most important action an investor can take. On mobile, it's hard to tap and doesn't feel like a real button.

**Fix:** Make the "Submit LOI" button at least 48px tall with clear styling (full-width on mobile, prominent color). This is a money button, literally.

**File:** `client/src/pages/Fund.tsx` or the component rendering the LOI CTA

---

### Fix 177 - /fund "View on BaseScan" Link Only 24px Tall (P3-MEDIUM)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** The "View on BaseScan" link on /fund is 24px tall. While less critical than Submit LOI, it's still below minimum touch target.

**Fix:** Add padding to reach 44px touch target.

**File:** `client/src/pages/Fund.tsx`

---

### Fix 178 - /play CTAs ("Explore the Game", "Start Your Quest") Only 20-21px Tall (P2-HIGH)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** On /play, the key CTAs are only 20-21px tall:
- "Explore the Game": 20px
- "Start Your Quest": 20px
- "Join an Open Session": 21px

These are text links styled without padding. On mobile, they're nearly impossible to tap accurately.

**Fix:** Convert these to proper button components with at least 44px height, or add `py-3 px-6` padding to make them tappable.

**File:** `client/src/pages/Play.tsx`

---

### Fix 179 - /game Has 29 Tiny Touch Targets (P2-HIGH)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** /game has 29 interactive elements below 44px. This is likely a combination of inline text links, small icon buttons, and unstyled anchor tags throughout the long page (13,226px). The game overview page is content-rich with many cross-links.

**Fix:** Audit all links on /game. Text links inside body copy should have at least `py-1.5` padding. CTA links should be styled as buttons with 44px+ height.

**File:** `client/src/pages/Game.tsx`

---

### Fix 180 - /apply Form Inputs 36px (Below 44px Touch Target) (P2-HIGH)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** Application form inputs (text, textarea) are 36px tall and 303px wide. The 36px height fails the 44px touch target requirement. The textarea starts at 65px which is fine. The multi-step form ("Step 1 of 5") works correctly on mobile.

**Fix:** Increase input height to 44px (`h-11` or `min-h-[44px]`). The 303px width on 400px viewport is good (leaves proper margins).

**File:** `client/src/components/ui/input.tsx` (global fix applies here)

---

### Fix 181 - /loi Form Select Dropdowns 40px (Close But Below 44px) (P3-MEDIUM)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** On /loi, text inputs are 43px (just barely under), select dropdowns are 40px. The LOI form is the primary investor conversion path.

**Fix:** Bump select dropdown height to 44px. Text inputs at 43px are borderline but should also be bumped to 44px for consistency.

**File:** `client/src/components/ui/select.tsx`, LOI form component

---

### Fix 182 - Announcement Bar Takes 75px on Mobile (P3-MEDIUM)

**Status:** CONFIRMED - NEEDS REVIEW

**Symptom:** The announcement bar ("Fund Launches Late 2026...") is 75.5px tall at 400px width. Combined with the 64px nav header, that's 139.5px of fixed/sticky chrome before users see any content. On a 667px iPhone screen, 21% of the viewport is navigation and announcements.

**Fix:** Consider making the announcement bar collapsible (with a small X to dismiss) or reducing its height on mobile. The text wraps to multiple lines because it contains two CTAs. Could show only one CTA on mobile, or stack the two CTAs vertically with smaller text.

**File:** Announcement bar component, `client/src/pages/Home.tsx`

---

### Fix 183 - Google Translate Widget Overlapping Footer Content (P3-MEDIUM)

**Status:** CONFIRMED - NEEDS REVIEW

**Symptom:** A Google Translate widget appears at the bottom of the page with a language dropdown (Select Language, Arabic, Chinese, French, etc.) and translation rate feedback buttons. This third-party widget overlaps with footer content and floats over page content. It wasn't intentionally placed.

**Fix:** If Google Translate integration is intentional, style and position it properly (e.g., in the footer or a settings panel). If it was added by a browser extension or script tag, remove the integration. Third-party widgets that overlay page content look unprofessional.

**File:** `index.html` (check for Google Translate script tag), or browser extension issue

---

### Fix 184 - Broken Images Summary: 42+ Images Broken Across Site (P0-BLOCKER)

**Status:** CONFIRMED - AGGREGATE ISSUE

**Symptom:** Live mobile audit confirmed the following broken image counts:
- /blog: 14 of 15 broken
- /quest: 9+ broken
- /governance: 8 of 8 broken
- /community: 5 broken
- /game: 2 of 2 broken
- /seasons: 2 broken
- /team: 2 broken
- /connect: 1 broken
- **Total: 42+ broken images across 8 pages**

This is a site-wide crisis. More than half of all images on the site are broken. The root cause is almost certainly missing files in the R2 bucket. This single issue alone makes the site look abandoned.

**Fix:** This is a Rye-only task. Run through the R2 bucket and identify all missing or corrupt files. Cross-reference with the image URLs used in the codebase. Re-upload every missing image. This is the single highest-impact fix for the site's visual quality.

**File:** Cloudflare R2 bucket `regen-civics-assets`

---

### Fix 185 - Homepage "Details" Disclosure Button Only 20px Tall (P3-MEDIUM)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** The disclosure "Details" toggle button at the top of the homepage (below announcement bar) is only 62px wide x 20px tall. Too small to tap on mobile.

**Fix:** Add padding to bring height to 44px minimum.

**File:** `client/src/pages/Home.tsx`

---

### Fix 186 - Homepage "Read more" Buttons Only 20px Tall (P3-MEDIUM)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** The "From Scarcity to Regeneration" section has 3 "Read more" buttons, each only 83px wide x 20px tall. These expand content sections. They're un-tappable at 20px on mobile.

**Fix:** Style as proper expandable buttons with `py-2 px-4` minimum.

**File:** `client/src/pages/Home.tsx` "From Scarcity to Regeneration" section

---

### Fix 187 - Footer "Manage Cookies" Button Only 20px Tall (P3-MEDIUM)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** The "Manage Cookies" button in the footer's Preferences section is only 114px x 20px. Along with the "Install App" button (also in Preferences), these are text-styled buttons with no padding.

**Fix:** Add `py-2` padding to footer buttons to match the 44px touch target.

**File:** `client/src/components/SiteFooter.tsx`

---

### Fix 188 - Quest Page Grids Are Single-Column on Mobile (P2-HIGH)

**Status:** CONFIRMED - NEEDS REVIEW

**Symptom:** All quest card grids render as single-column on mobile (gridTemplateColumns: "368px" or "336px"). With 10+ quest cards at 387-479px each, users scroll for 4,000+ pixels just through quest listings. Similar to the path cards issue (Fix 161), this makes the quest catalog feel endless.

**Fix:** Consider a 2-column grid for quest cards on mobile, with smaller card heights. Or implement a "show more" pattern: show 4 quests initially, with a "See all quests" button. The current layout shows everything in a massive scroll or consider how netflix does video searching and learn from them. 

**File:** `client/src/pages/Quest.tsx` grid containers

---

### Fix 189 - Team Member Cards Single-Column, 17 Cards = Massive Scroll (P3-MEDIUM)

**Status:** CONFIRMED - NEEDS REVIEW

**Symptom:** Team page has 3 grid sections with 6, 6, and 5 team member cards, all single-column at 336px wide. Total: 17 cards in a single-column layout. The page is 13,562px tall. Consider that a user on mobile scrolling through 17 individual team member cards may lose interest.

**Fix:** Use a 2-column grid for team member cards on mobile. Show name + role + small avatar. Full bio can expand on tap. Or show "Core Team" (6 cards) and collapse the rest behind "View Full Team" button.

**File:** `client/src/pages/Team.tsx` grid sections

---

### Fix 190 - /fund Page 10,875px Tall on Mobile (P3-MEDIUM)

**Status:** CONFIRMED - NEEDS REVIEW

**Symptom:** The /fund page is nearly 11,000px tall on mobile. That's ~13 full screen scrolls. For an investor on their phone reviewing the fund, this is excessive. Key information may be buried.

**Fix:** Consider collapsing non-essential sections behind "Read more" toggles on mobile. The most important content (fund overview, LOI CTA, key metrics) should be in the first 2 screens.

**File:** `client/src/pages/Fund.tsx`

---

### Fix 191 - /governance 16,996px Tall on Mobile (P3-MEDIUM)

**Status:** CONFIRMED - NEEDS REVIEW

**Symptom:** The governance page is nearly 17,000px on mobile (20+ screen scrolls). This is the longest page on the site. Combined with all 8 images being broken, the page feels like an infinite scroll of text.

**Fix:** Add a table of contents or quick-jump navigation at the top of the page. Collapse sections behind disclosure toggles. On mobile, no single page should require more than 8-10 screen scrolls.

**File:** `client/src/pages/Governance.tsx`

---

### Fix 192 - /quest 17,910px Tall on Mobile (P3-MEDIUM)

**Status:** CONFIRMED - NEEDS REVIEW

**Symptom:** The quest page is the tallest at nearly 18,000px. It shows all quests across all seasons in a single scroll. The "UNDER CONSTRUCTION" banner at top adds to the unfinished feel.

**Fix:** Add category tabs or filters (e.g., "Spring Quests", "Routine Quests", "EPIC Quests") that show one section at a time instead of all at once. Remove or rework the "UNDER CONSTRUCTION" banner for launch - quests should be organised into seasons and then scroll horizontally under each season to explore more quests...

**File:** `client/src/pages/Quest.tsx`

---

### Fix 193 - Floating "Your ReGen Guide" Button May Obscure Content on Mobile (P3-MEDIUM)

**Status:** CONFIRMED - NEEDS REVIEW

**Symptom:** A fixed "Your ReGen Guide" button floats over page content. Combined with the "Scroll to top" button and "Open search" button, there may be 3 floating action buttons competing for bottom-right screen space on mobile.

**Fix:** On mobile, consolidate floating buttons. Keep only one FAB (Floating Action Button) visible at a time. Hide "Scroll to top" until user has scrolled down significantly. Consider putting the ReGen Guide in the nav drawer instead of a floating button.

**File:** Floating button components, layout wrapper

---

### Fix 194 - Homepage Bottom Nav + Floating Buttons + Footer = Cluttered Bottom Zone (P2-HIGH)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** At the bottom of the mobile viewport, there are: (1) sticky bottom nav bar with path icons, (2) floating "Scroll to top" button, (3) floating "Your ReGen Guide" button, (4) floating "Open search" button, (5) Google Translate widget. This creates a cluttered, overlapping bottom zone where buttons compete for tap space.

**Fix:** Audit all fixed/absolute positioned elements at the bottom of the viewport. On mobile: move search into the nav drawer, hide scroll-to-top unless scrolled 2+ screens, move ReGen Guide into the drawer. The bottom nav should be the only persistent bottom element.

**File:** Navigation.tsx, floating button components, layout wrapper

---

### Fix 195 - Path Nav Bar (Fund/Land/Ally/Play) Tabs Are Only 100x64px (P3-MEDIUM)

**Status:** CONFIRMED - NEEDS REVIEW

**Symptom:** The secondary path navigation bar (showing Fund, Land, Ally, Play tabs) renders each tab at 100x64px. While the height (64px) is fine for touch targets, the 100px width means all 4 tabs total 400px, leaving zero margin. On screens slightly narrower than 400px, these could overflow.

**Fix:** Test on 360px and 320px widths. If overflow occurs, switch to `flex-1` instead of fixed widths so tabs distribute evenly.

**File:** Path navigation component

---

### Fix 196 - /quest "UNDER CONSTRUCTION" Banner (P2-HIGH)

**Status:** CONFIRMED - NEEDS REVIEW

**Symptom:** The quest page starts with "UNDER CONSTRUCTION: Quests are in pre-launch mode!" This messaging is inappropriate for a public site announcement. If the quests are working (they are, to some degree), either remove this banner or change it to something more positive like "Quests in Beta: Help us shape the quest experience."

**Fix:** Remove or reword the UNDER CONSTRUCTION banner. For a site trying to raise $40M, "under construction" signals the project isn't ready.

**File:** `client/src/pages/Quest.tsx`

---

### Fix 197 - /ally Page Has Zero Images (P2-HIGH)

**Status:** PROMPTS WRITTEN -- Claude Code can generate and upload

**Symptom:** The Alliance Network page (/ally) has no images. Every other path page has visuals.

**Fix:** Generate 3 images using the `regen-content-image` skill (prompts in `CLAUDE_CODE_HANDOFF.md` under "/ally Page Image Generation"). Upload to R2 via wrangler CLI, wire into `Ally.tsx`.

**Images needed:**
1. Alliance Partners Hero (wide panoramic, council scene, 2K)
2. Alliance Network Card (aerial network view, 2K)
3. Join the Alliance CTA (archway scene, 2K)

**File:** `client/src/pages/Ally.tsx`, R2 bucket

---

### Fix 198 - Community Posts Missing Thumbnails/Preview Images (P3-MEDIUM)

**Status:** CONFIRMED - NEEDS REVIEW

**Symptom:** Community forum posts appear as text-only list items without preview images or author avatars. On mobile, a wall of text links is harder to scan than cards with visual hierarchy (thumbnail + title + meta).

**Fix:** Add author avatars and post category icons to community post list items. If posts have attached images, show a small thumbnail.

**File:** `client/src/pages/Community.tsx` post list rendering

---

### Fix 199 - Newsletter Subscribe Button Is Just a Link to /connect (P2-HIGH)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** The homepage newsletter section shows "Subscribe" as a button that links to /connect instead of being an inline email subscription form. Users have to navigate to a separate page just to sign up for the newsletter. This adds friction and reduces conversion.

**Fix:** Replace the link-to-/connect pattern with an inline email input + submit button directly on the homepage. Capture email right where the CTA is.

**File:** `client/src/components/NewsletterSignup.tsx`, homepage newsletter section

---

### Fix 200 - /fund Page Has a "Refresh" Button at 32px Height (P3-MEDIUM)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** The /fund page has a "Refresh" button at 32px height and 104px width. Below 44px touch target.

**Fix:** Increase to 44px or remove if not essential.

**File:** `client/src/pages/Fund.tsx`

---

### Fix 201 - Mobile Bottom Nav Path Icons Need Labels (P2-HIGH)

**Status:** CONFIRMED - NEEDS REVIEW

**Symptom:** The secondary path navigation bar at the top (Fund, Land, Ally, Play) uses small icons with short labels, but verify these labels are visible and readable at 400px. If the labels are truncated or the icons are too small, users won't understand the navigation.

**Fix:** Verify labels are fully visible. If not, increase font size or use icon-only with tooltips on tap.

**File:** Path navigation component

---

### Fix 202 - Homepage Hero Section Could Use Stronger Mobile CTA (P2-HIGH)

**Status:** CONFIRMED - NEEDS REVIEW

**Symptom:** The hero section on mobile shows the title "ReGen Civics", a description, and a video play button. There's no clear primary CTA button visible in the hero itself (like "Get Started", "Explore the Fund", or "Apply Now"). The main action is buried below the fold. For a fundraising site, the hero should have an unmissable CTA.

**Fix:** Add a prominent CTA button in the hero section on mobile. Something like "Explore the Fund" or "Start Your Journey" that scrolls to or navigates to the most important page for the target audience.

**File:** `client/src/pages/Home.tsx` hero section

---

### Fix 203 - /loi Form Has No Page Title Set (P3-MEDIUM)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** The /loi page shows the generic title "ReGen Civics: Fund and Game for Regenerative Land Projects" instead of a descriptive title like "Letter of Intent | ReGen Civics Fund". The LOI form is the investor conversion endpoint and needs proper SEO and browser tab identification.

**Fix:** Add a proper document.title and SEO component for /loi.

**File:** `client/src/pages/LOI.tsx`, `client/src/components/SEO.tsx`

---

### Fix 204 - /connect Page "APPLY FOR NEXT SEASON" Text Looks Like a Button But Isn't (P3-MEDIUM)

**Status:** CONFIRMED - NEEDS REVIEW

**Symptom:** On /connect, the text "APPLY FOR NEXT SEASON" appears in all-caps styling that suggests it's a clickable button or heading. Verify whether this is actually a link/button or just styled text. If it's just text, the uppercase styling is misleading.

**Fix:** If it's a label, restyle to look like a label. If it's a link, ensure it has proper button styling and 44px touch target.

**File:** `client/src/pages/Connect.tsx`

---

### Fix 205 - Homepage "How It Works" Steps Are Accordion Buttons (P3-MEDIUM)

**Status:** CONFIRMED - OK BUT REVIEW

**Symptom:** The "How It Works" section uses expandable buttons for each of the 5 steps. This is a good mobile pattern (saves space). However, the step buttons need to clearly indicate they're expandable (chevron icon, "+" icon, or visual hint). Verify the expand/collapse interaction works smoothly on mobile.

**Fix:** Ensure each step button has a visible expand indicator and that the animation is smooth on mobile.

**File:** `client/src/pages/Home.tsx` "How It Works" section

---

### Fix 206 - Homepage "Start Your Journey" Cards Are Good But Need Verification (P4-LOW)

**Status:** CONFIRMED - LOOKS GOOD

**Symptom:** The "Start Your Journey" section has 3 CTA cards (Play Quests, Join the Network, Invest or Partner). These stack well in single column on mobile. Mark as verified working.

**File:** `client/src/pages/Home.tsx`

---

### Fix 207 - Homepage "Two Spaces, One Vision" Section Cards Need Mobile Review (P3-MEDIUM)

**Status:** NEEDS REVIEW

**Symptom:** The "Two Spaces" section shows Venture Fund and Infinite Game as two expandable cards with "Explore Seasons" and "Play the Game" CTAs. Verify these stack properly and the expand interaction works on mobile.

**Fix:** Test the expand/collapse on both cards. Ensure the CTAs are full-width on mobile for easy tapping.

**File:** `client/src/pages/Home.tsx` "Two Spaces" section

---

### Fix 208 - Mobile Drawer Shows "Admin Panel" to Logged-In User (P3-MEDIUM)

**Status:** CONFIRMED - NEEDS REVIEW

**Symptom:** The mobile nav drawer shows "Admin Panel" and "Sign Out" for authenticated users. "Admin Panel" should only appear for admin/superadmin roles, not all logged-in users. If the admin panel link is role-gated correctly, this is fine. But given Fix 130 (admin uses localStorage password), this may expose the admin link to everyone.

**Fix:** Verify the "Admin Panel" drawer link only appears for admin role users. If it appears for all authenticated users, gate it behind a role check.

**File:** `client/src/components/Navigation.tsx` mobile drawer

---

### Fix 209 - /fund Page: Multiple Token/Blockchain Elements May Confuse Investors (P3-MEDIUM)

**Status:** CONFIRMED - NEEDS REVIEW

**Symptom:** The /fund page includes "View on BaseScan" links and "Refresh" buttons suggesting live blockchain data. For traditional investors on mobile, seeing blockchain jargon and tiny technical links may be confusing or off-putting. The page mixes high-level fund narrative with low-level blockchain details.

**Fix:** Consider separating the blockchain details into an expandable section or separate page. The main fund page should focus on the investment thesis, metrics, and LOI CTA. Technical details can be in a "Token Details" sub-section.

**File:** `client/src/pages/Fund.tsx`

---

### Fix 210 - Mobile: Text Opacity at 0.8 May Reduce Readability (P3-MEDIUM)

**Status:** CONFIRMED - NEEDS REVIEW

**Symptom:** Several text elements use `opacity: 0.8` or similar (e.g., on /play: "oklab(0.999994 ... / 0.8)"). On mobile screens in bright sunlight, 80% opacity white text on dark backgrounds can be hard to read. Full opacity (1.0) is recommended for body text.

**Fix:** Audit text elements using reduced opacity. Body text and important content should use full opacity. Only decorative or secondary text should use reduced opacity.

**File:** Multiple page components, especially /play

---

### Fix 211 - Homepage Video Thumbnail Needs Mobile Optimization (P3-MEDIUM)

**Status:** CONFIRMED - NEEDS REVIEW

**Symptom:** The hero video thumbnail ("4 Paths to Play") and the "Welcome to the Regenerative Renaissance" video button are key engagement elements. Verify: (1) video play button is large enough to tap on mobile (44px+), (2) video opens in a proper mobile-friendly player (not a tiny inline embed), (3) the 2:07 duration badge is readable.

**Fix:** Test video playback on mobile. Ensure it opens fullscreen or in a large modal, not an inline tiny player.

**File:** `client/src/pages/Home.tsx` video components

---

### Fix 212 - "Live Community" Section Posts Need Better Mobile Touch Targets (P3-MEDIUM)

**Status:** CONFIRMED - NEEDS REVIEW

**Symptom:** The "Live Community" section on the homepage shows 6 recent forum posts as a list. Each post link needs adequate touch target spacing. If posts are too tightly packed, users will tap the wrong one.

**Fix:** Ensure each post list item has at least 48px total height (text + padding). Add visible dividers between items for visual separation.

**File:** `client/src/pages/Home.tsx` Live Community section

---

### Fix 213 - /connect Page Path Cards Are Good (P4-LOW)

**Status:** CONFIRMED - LOOKS GOOD

**Symptom:** The /connect page shows path cards (Land Partner, Investor, Alliance, Player) that appear to stack properly on mobile. This is the main Participate page and it works.

**File:** `client/src/pages/Connect.tsx`

---

### Fix 214 - Site-Wide: Pages Extremely Long on Mobile Need Section Navigation (P2-HIGH)

**Status:** CONFIRMED - NEEDS FIX

**Symptom:** Multiple pages exceed 10,000px on mobile:
- /quest: 17,910px (21 screens)
- /governance: 16,996px (20 screens)
- /game: 13,226px (16 screens)
- /seasons: 13,628px (16 screens)
- /team: 13,562px (16 screens)
- /fund: 10,875px (13 screens)

On mobile, users lose their place in these massive scrolls. There's no way to jump to a specific section.

**Fix:** Add a floating or collapsible table of contents / section navigation for pages longer than 5,000px. On mobile, a "sticky section indicator" showing which section the user is in, with the ability to jump to others, dramatically improves navigation.

**File:** Create a `SectionNav` or `TableOfContents` component, apply to long pages

---

### Fix 215 - Hamburger Menu Drawer Works But Missing "Participate" CTA (P3-MEDIUM)

**Status:** CONFIRMED - NEEDS REVIEW

**Symptom:** The mobile drawer menu shows: 4 Paths, Play the Game, Seasons + Schedule, Map, Team, Learn + Connect, My Profile, Admin Panel, Sign Out. The main header shows a "Participate" button that links to /connect. But "Participate" or "Connect" doesn't appear in the drawer menu. Users who open the menu to find how to participate won't see it.

**Fix:** Add "Participate" or "Get Involved" as a prominent item in the mobile drawer, ideally styled differently (highlighted/colored) as the primary CTA.

**File:** `client/src/components/Navigation.tsx` mobile drawer items

---

---

## Priority Order for Execution (Updated 2026-03-23)

### DONE:
1. ~~**Fix 1** - Vite circular dependency + cdnImg import~~ FIXED
2. ~~**Fix 4** - ErrorBoundary~~ FIXED

### IMMEDIATE (Before any traffic):
3. **Fix 184** - 42+ BROKEN IMAGES ACROSS SITE (P0-BLOCKER, Rye must re-upload to R2)
4. **Fix 162** - /investor redirects to empty /opportunity page (P0-BLOCKER, fundraising link dead)
5. **Fix 59** - SYSTEMIC: Multiple pages show massive empty/blank sections (P1-CRITICAL)
6. **Fix 161** - Homepage path cards need 2x2 grid on mobile (P1-CRITICAL)
7. **Fix 164** - Blog: 14/15 images broken (P1-CRITICAL)
8. **Fix 165** - Quest: 9+ images broken (P1-CRITICAL)
9. **Fix 166** - Governance: 8/8 images broken (P1-CRITICAL)
10. **Fix 167** - Game: 2/2 images broken + 29 tiny targets (P1-CRITICAL)
11. **Fix 172** - Map SVG renders 0x0 on mobile (P1-CRITICAL)
12. **Fix 163** - /investor-form is a 404 (P1-CRITICAL)
13. **Fix 70** - Mobile navigation completely broken at 375px (P1-CRITICAL)
14. **Fix 129** - OG images use relative paths, broken social sharing (P1-CRITICAL)
15. **Fix 130** - Admin uses localStorage password instead of role auth (P1-CRITICAL)
16. **Fix 60** - /blog posts not rendering (P1-CRITICAL)
17. **Fix 61** - /ally page completely empty (P1-CRITICAL)
18. **Fix 62** - /fund page content invisible (P1-CRITICAL)
19. **Fix 88** - /regen-games completely empty (P1-CRITICAL)
20. **Fix 89** - /custom-games completely empty (P1-CRITICAL)
21. **Fix 82** - Auth-gated pages show no login prompt (P2-HIGH)
22. **Fix 103** - Empty pages need "Coming Soon" placeholders (P2-HIGH)
23. **Fix 5** - Stabilize deploys / CI gate

### WITHIN 24 HOURS:
15. Fix 3 - Cookie ESM/CJS error
16. Fix 6 - Redis warning
17. Fix 7 - regencivics.com domain warning
18. Fix 109 - Form input touch targets below 44px (mobile critical)
19. Fix 106 - Hero images loading="lazy" above fold (LCP)
20. Fix 108 - Map page 100vh breaks on mobile browsers
21. Fix 121 - Hero font sizes may overflow on mobile
22. Fix 124 - Horizontal scroll prevention on mobile
23. Fix 34 - Image error fallbacks
24. Fix 147 - No error state for failed image loads site-wide
25. Fix 36 - Missing env vars audit
26. Fix 97 - Excessive API calls on every navigation
27. Fix 96 - Two images loaded on every single page
28. Fix 100/137 - Pages missing descriptive titles and SEO entries
29. Fix 105 - Footer links include non-working routes
30. Fix 131 - Newsletter signup silently fails on error
31. Fix 173 - Footer links 27/28 below 44px touch target
32. Fix 174 - Footer social icons only 20x20px
33. Fix 175 - Mobile menu close button only 28px
34. Fix 176 - /fund "Submit LOI" button only 28px
35. Fix 178 - /play CTAs only 20-21px tall
36. Fix 179 - /game 29 tiny touch targets
37. Fix 180 - /apply form inputs 36px tall
38. Fix 194 - Cluttered bottom zone: floating buttons overlap
39. Fix 196 - /quest "UNDER CONSTRUCTION" banner needs removal
40. Fix 199 - Newsletter subscribe is just a link, not an inline form
41. Fix 214 - Long pages need section navigation on mobile

### BEFORE ANNOUNCEMENT:
31. Fixes 8-14 - Security hardening
32. Fixes 15-16 - Routing fixes
33. Fix 18 - Blog OG tags
34. Fix 29/70 - Mobile hamburger menu (P1-CRITICAL)
35. Fix 32 - srcset on images
36. Fix 51-52 - Legal/compliance verification
37. Fix 110 - BackButton fixed positioning conflicts on mobile
38. Fix 114 - Select/dropdown mobile touch targets
39. Fix 118 - Community page images missing alt text
40. Fix 125-126 - Apply and investor forms mobile layout
41. Fix 134 - NotFound missing SEO and noindex
42. Fix 135-136 - Dynamic titles for community posts and campaigns
43. Fix 140-142 - Loading skeletons for Community, PlayerProfile, CampaignDetail
44. Fix 144 - Icon-only buttons missing aria-labels
45. Fix 145 - Skip-to-content link for keyboard nav
46. Fix 146 - Glass panel color contrast WCAG check
47. Fix 160 - 404 handling for dynamic routes
48. Fix 63 - /seasons content missing
49. Fix 64 - Homepage expanded empty section
50. Fix 65 - /play text readability
51. Fix 66 - /quest empty initial viewport
52. Fix 70b - Mobile floating buttons
53. Fix 71 - CI/CD gate
54. Fix 95 - /create-campaign public access review
55. Fix 168-171 - Broken images on seasons, community, team, connect
56. Fix 188 - Quest grids single-column on mobile (2-col or show-more)
57. Fix 197 - /ally page has zero images
58. Fix 201-202 - Path nav labels + hero mobile CTA
59. Fix 203 - /loi missing page title
60. Fix 208 - Admin Panel link in drawer needs role gating
61. Fix 215 - Mobile drawer missing "Participate" CTA

### POST-LAUNCH:
55. Fixes 19-21, 50 - SEO improvements
56. Fixes 22-24, 30-31 - Form/mobile polish
57. Fixes 33, 35, 37-38 - Performance/infra
58. Fixes 39-42, 53-58 - Code quality cleanup
59. Fix 48 - R2 missing image files
60. Fixes 81, 83-84, 86-87, 91, 101-102, 104 - Polish and consistency
61. Fix 111-113, 115-117, 119-120, 122-123 - Mobile refinements and testing
62. Fix 127-128 - Blog/glossary content overflow on mobile
63. Fix 132-133 - Cookie consent keyboard support, SW console cleanup
64. Fix 138-139 - Focus-visible styles, React key fixes
65. Fix 148-152 - Structured data, sitemap, robots.txt, preconnect, PWA manifest
66. Fix 153-159 - Console cleanup, reduced motion, form validation a11y, canonical URLs, OG types, high contrast, link text
67. Fix 181-183 - LOI selects, announcement bar height, Google Translate widget
68. Fix 185-187 - Homepage tiny buttons (Details, Read more, Manage Cookies)
69. Fix 189-193 - Team/fund/governance/quest page length, floating buttons
70. Fix 198, 200, 204-213 - Community thumbnails, misc polish, content review

---

## Handoff Breakdown - Who Does What

### YOU (Rye) - things only you can do

**CHECKED ON 2026-03-23 via browser dashboards. Items marked DONE were verified and resolved.**

| # | Task | Status | Notes |
|---|------|--------|-------|
| 184, 2 | **REGENERATE + UPLOAD 42+ BROKEN IMAGES** | **CLAUDE CODE** | Claude Code generated these images originally. Regenerate via regen-content-image skill, upload via wrangler CLI. Escalate to Rye only if R2 access fails. |
| 162 | Debug /opportunity rendering empty at 400px | **CLAUDE CODE** | Page has 2,332 lines of content but renders 0 height on mobile. CSS/JS debug needed. |
| 197 | Generate /ally page images | **CLAUDE CODE** | Prompts written in CLAUDE_CODE_HANDOFF.md. Generate via nano-banana-pro, upload to R2. |
| 95 | Add auth + password 222 gate to /create-campaign | **CLAUDE CODE** | Copy pattern from AdminModeration.tsx. Decision made by Rye. |
| 146 | Glass panel contrast improvements | **CLAUDE CODE** | PASSES AA. Minor CSS tweak: bump font-weight on path card subtitles + "View Full Landing Page". |
| 7 | Fix regencivics.com DNS | **BLOCKED** | Rye can't access registrar. Low impact, .earth works. Deferred indefinitely. |
| 5 | Stabilize deploys / CI gate | **DONE** (verified) | Service Online, 2/2 replicas, deploy successful. CI gate still recommended (P3). |
| 6 | Check Redis warning | **DONE** (verified) | Redis Online, no warning. The "1" was volume count. |
| 33 | Improve Cloudflare cache rules | **DONE** (checked) | 1 of 10 rules exists. Could add more post-launch (P3). |
| 36 | Check Railway env vars | **DONE** (verified) | 32 service + 8 auto = 40 vars. All critical vars present. |
| 3 | Sentry cookie error | **DONE** (verified) | No longer appearing. Resolved by recent deploys. |
| 149 | Submit sitemap to Google Search Console | **RYE** (30 sec) | Sitemap exists at /sitemap.xml. GSC > Sitemaps > Add > "sitemap.xml" > Submit. |
| 91 | Verify Season 2 schedule dates | **RYE** | Content accuracy check on /schedule |

### CLAUDE CODE - already done or can do autonomously

| # | Task | Status |
|---|------|--------|
| 1 | Fix Vite circular dependency + cdnImg import | DONE |
| 4 | Add ErrorBoundary component | DONE |
| 3 | Fix cookie ESM/CJS import | CAN DO |
| 8-14 | Security fixes (CSP, cookies, sanitization, rate limiting) | CAN DO |
| 15-16 | Routing fixes (/game, admin guards) | CAN DO |
| 18-21 | SEO/meta tag improvements | CAN DO |
| 22-24 | Form validation improvements | CAN DO |
| 25-28 | Error handling improvements | CAN DO |
| 29-32 | Mobile responsiveness code fixes | CAN DO |
| 34 | Image error fallbacks | CAN DO |
| 37 | Build-time env validation | CAN DO |
| 39-42 | Dead code cleanup | CAN DO |
| 50, 100 | Page title consistency across all routes | CAN DO |
| 53-58 | Code quality fixes | CAN DO |
| 59-62, 88-89 | Investigate empty page content (check component rendering logic) | CAN DO |
| 70 | Implement mobile hamburger menu | CAN DO |
| 70b | Consolidate mobile floating buttons | CAN DO |
| 71-75 | CI/CD, health check, monitoring setup | CAN DO |
| 79-80 | Riverside webhook verification | CODED |
| 82 | Auth-gated pages: add login prompt instead of loading quote | CAN DO |
| 96-97 | Fix redundant image loads + excessive API calls on navigation | CAN DO |
| 103 | Create ComingSoonPlaceholder component for empty pages | CAN DO |
| 104 | Review Back button placement on top-level pages | CAN DO |
| 105 | Audit and fix footer links | CAN DO |
| 106-107 | Hero image loading/dimensions fixes | CAN DO |
| 108 | Map page 100dvh fix | CAN DO |
| 109, 114 | Input/select touch target sizing | CAN DO |
| 110 | BackButton responsive positioning | CAN DO |
| 118 | Community page image alt text | CAN DO |
| 121, 124 | Hero font sizes + horizontal scroll prevention | CAN DO |
| 129 | OG image absolute URL fix | CAN DO |
| 130 | Admin role-based auth replacement | CAN DO |
| 131 | Newsletter signup error feedback | CAN DO |
| 132-133 | Cookie consent keyboard, SW console cleanup | CAN DO |
| 134 | NotFound SEO + noindex | CAN DO |
| 135-137 | Dynamic titles + missing pageSEO entries | CAN DO |
| 138-139 | Focus-visible styles, React key fixes | CAN DO |
| 140-142 | Loading skeletons for 3 pages | CAN DO |
| 144-145 | Aria-labels + skip-to-content link | CAN DO |
| 147 | Global image error fallback | CAN DO |
| 148-152 | Structured data, sitemap, robots.txt, preconnect, PWA | CAN DO |
| 153-157 | Console cleanup, reduced motion, form a11y, canonical, OG types | CAN DO |
| 159-160 | Link text audit, dynamic route 404 handling | CAN DO |
| 161 | Path cards 2x2 grid on mobile | CAN DO |
| 163 | /investor-form redirect to /loi | CAN DO |
| 172 | Map SVG responsive fix | CAN DO |
| 173-176 | Footer/nav touch target fixes | CAN DO |
| 178-180 | Play/game/apply touch target fixes | CAN DO |
| 188 | Quest grid mobile layout | CAN DO |
| 194 | Floating buttons consolidation | CAN DO |
| 196 | Remove UNDER CONSTRUCTION banner | CAN DO |
| 199 | Inline newsletter signup form | CAN DO |
| 203 | /loi page title + SEO | CAN DO |
| 208, 215 | Mobile drawer role gating + Participate CTA | CAN DO |
| 214 | Section navigation component for long pages | CAN DO |

### WAITING ON YOU before Claude Code can proceed

**Almost nothing.** Most "human step required" items were resolved via dashboard checks or given clear specs by Rye. Claude Code can now proceed autonomously on nearly everything.

| Blocked Fix | What's needed | Why |
|---|---|---|
| Fix 7 (DNS) | Registrar access for regencivics.com | Rye can't access registrar. DEFERRED. |
| Fix 91 (schedule dates) | Rye verifies dates are accurate | Content decision only Rye can make |
| Fix 149 (sitemap) | Rye submits URL to GSC | GSC blocked for browser automation. 30-second manual task. |

**Everything else is unblocked for Claude Code.** See `CLAUDE_CODE_HANDOFF.md` for full execution plan.

---

## Summary Stats (Updated 2026-03-23, after dashboard verification)

| Category | Count | Fixes |
|---|---|---|
| FIXED / VERIFIED CLEAR | 7 | Fixes 1, 4 (code), 3, 5, 6, 33, 36 (verified via dashboards) |
| P0-BLOCKER | 2 | Fixes 162 (/investor dead), 184 (42+ broken images site-wide) |
| P1-CRITICAL | 15 | Fixes 46-47, 59-62, 88-89, 129-130, 161, 163-167, 172 |
| P2-HIGH | 55 | Fixes 8-18, 22, 24-29, 32, 34, 36, 48-49, 51-52, 63-66, 70, 70b, 82, 95-97, 100, 103, 105-110, 114, 118, 121, 124-126, 131, 134-137, 140-142, 144, 146-147, 160, 168-170, 173-176, 178-180, 188, 194, 196-197, 199, 201-202, 214 |
| P3-MEDIUM | 48 | Fixes 19-21, 23, 30-31, 33, 35, 37-38, 43-44, 50, 53-57, 69, 72-80, 81, 83-84, 86-87, 91, 101-102, 104, 111-113, 115-117, 119-120, 122-123, 127-128, 132-133, 138-139, 145, 148-157, 159, 171, 177, 181-183, 185-187, 189-193, 195, 198, 200, 203-205, 207-212, 215 |
| P4-LOW | 14 | Fixes 40-42, 45, 58, 68, 85, 90, 92-94, 98-99, 143, 158, 206, 213 |
| **TOTAL** | **215 fixes** | (7 done/verified, 208 remaining) |

### Breakdown by Area (Updated)
| Area | Count | Key Issues |
|---|---|---|
| Broken images (R2 bucket) | 42+ images | Blog 14, Quest 9, Governance 8, Game 2, Seasons 2, Community 5, Team 2 |
| Mobile touch targets (<44px) | 100+ elements | /game 29, footer 27, /play 3, /fund 3, nav close 1, forms site-wide |
| Mobile layout / UX | 20 fixes | Path cards, quest grids, page lengths, floating buttons, section nav |
| Empty / broken pages | 8 pages | /opportunity, /investor-form, /regen-games, /custom-games, /ally (no images) |
| Security | 8 fixes | Admin localStorage bypass, CSP, cookies, rate limiting |
| SEO / social sharing | 16 fixes | OG relative URLs, missing titles, no sitemap, no structured data |
| Accessibility | 16 fixes | Aria labels, skip nav, focus styles, keyboard support, contrast |
| Performance / infra | 10 fixes | Hero lazy load, 100vh, redundant API calls, preconnect |
| Code quality | 12 fixes | Console logs, React keys, dead code |
| Content / design | 25 fixes | UNDER CONSTRUCTION banner, page lengths, missing CTAs |

### Pages Verified Working on Mobile (400px)
/apply (form works, inputs too small), /loi (form works), /connect (good layout), /ally (works but no images), /fund (works but images broken + tiny buttons), /land (works), /play (works but tiny CTAs)

### Pages With Critical Issues on Mobile
/blog (14/15 images broken), /quest (9+ images broken, UNDER CONSTRUCTION), /governance (8/8 images broken), /game (all images broken, 29 tiny targets), /map (SVG invisible), /opportunity (empty), /investor-form (404)

### Pages Auth-Gated (Cannot Audit Without Login)
/admin, /crowd-pooling, /crowd-pooling-projects, /co-creators-guide

### Execution Estimate
| Category | Count |
|---|---|
| Claude Code can do autonomously | ~150 fixes |
| Rye must do (R2 images, dashboard, content decisions) | ~15 items |
| Blocked pending Rye input | 5 fixes |
| Needs live device testing | ~20 fixes |
