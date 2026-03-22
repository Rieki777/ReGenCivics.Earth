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

### Fix 1 - React 19 / Radix UI Crash: ENTIRE SITE IS DOWN (P0-BLOCKER)

**Status:** SITE DOWN - NEEDS IMMEDIATE FIX

**Symptom:** Every single page on regencivics.earth renders as a blank dark green screen. No content loads. No navigation, no text, no images. The React app fails to mount.

**Console error:** `TypeError: Cannot read properties of undefined (reading 'forwardRef')` from `radix-ui-BTqXMQ-o.js`

**Root cause:** React 19.2.4 (`^19.2.1` in package.json) removed `forwardRef` as a named export. All @radix-ui packages are pinned to v1.x/v2.x versions that depend on the old React 18 `forwardRef` API. When Radix UI tries to call `forwardRef`, it gets `undefined` and the entire React tree crashes.

**Fix:** Either:
- (A) Downgrade React to `^18.3.1` and react-dom to `^18.3.1` (safest, fastest)
- (B) Upgrade ALL @radix-ui packages to their React 19-compatible versions (riskier, more work)

**Files changed:** `package.json`, `pnpm-lock.yaml`

**Railway context:** The last deploy was "rollforward phase 4: riverside webhook fix" 38 minutes ago. History shows 4+ REMOVED deployments in the last 2 hours including manual chunk fixes, vite.config.ts rollbacks, and circular dependency fixes. This rapid churn likely caused or contributed to the crash.

---

### Fix 2 - Cloudflare R2 Images: ALL Assets 404ing (P0-BLOCKER)

**Status:** ALL IMAGES BROKEN SITE-WIDE

**Symptom:** Every image served from `assets.regencivics.earth` returns "Error 404 Object not found." Affects every page: homepage (10 broken), /quest (17 broken), /land (10 broken), etc.

**Investigation findings:**
- R2 bucket `regen-civics-assets` exists with 116 objects, 462MB
- Custom domain `assets.regencivics.earth` is Active and Enabled in R2 settings
- Public Access is Enabled

**Root cause (multiple issues):**
1. **Extension mismatch:** Code references `.webp` files (e.g., `DUOLILquhPlWMUAF.webp`) but R2 bucket contains `.png` files (e.g., `DUOLILquhPlWMUAF.png` at 70 bytes)
2. **Corrupt/placeholder files:** Many image files are suspiciously small (70B, 506B, 510B, 782B) - likely empty placeholders or failed uploads, not actual images
3. **Possible path prefix issue:** R2 bucket has a `regen-civics-assets/` subdirectory inside the bucket - objects may be stored there but accessed at root level

**Fix:**
- Audit every image reference in the codebase vs what actually exists in R2
- Re-upload all images with correct extensions and actual image data
- Verify the STORAGE_PUBLIC_URL env var matches the R2 custom domain path
- Add image fallback/error handling in the OptimizedImage component

**Files changed:** Multiple component files, R2 bucket contents

---

## SECTION B: CRITICAL ISSUES (P1)

### Fix 3 - Sentry Error: Dynamic require of "cookie" not supported (P1-CRITICAL)

**Status:** ACTIVE IN PRODUCTION

**Symptom:** Server-side error on `GET /api/csrf-token`. Only unresolved Sentry issue in last 24h.

**Root cause:** ESM/CJS compatibility issue. The `cookie` package is being dynamically required in an ESM context, which Node.js doesn't support.

**Fix:** Replace `require('cookie')` with proper ESM `import` statement, or use a CJS-compatible wrapper.

**Files:** `server/_core/security.ts` or wherever the cookie import happens

---

### Fix 4 - No React Error Boundary (P1-CRITICAL)

**Status:** CODED (needs deploy)

**Symptom:** Any uncaught React error crashes the entire app with a blank screen (as we're seeing now). There's no error boundary to catch component-level failures and show a fallback UI.

**Fix:** Add a top-level `<ErrorBoundary>` component wrapping the app that catches render errors, shows a user-friendly error page, and reports to Sentry.

**Files:** `client/src/App.tsx`, new `client/src/components/ErrorBoundary.tsx`

---

### Fix 5 - Deploy Instability: Rapid Churn in Railway (P1-CRITICAL)

**Status:** HUMAN STEP REQUIRED

**Symptom:** 4+ deployments created and REMOVED in the last 2 hours. Includes failed fixes for: circular dependencies, sentry manual chunks, vite.config.ts rollbacks, and an "all-15-improvements-events-flow" deploy that was rolled back.

**Root cause:** Automated deploys from GitHub pushes without proper CI/CD validation. Broken builds reach production.

**Fix:**
- Add a build verification step before Railway deploy (CI gate)
- Pin the last known working commit and deploy from that
- Consider Railway's "manual deploy" mode during active development

---

### Fix 6 - Redis Warning on Railway (P1-CRITICAL)

**Status:** HUMAN STEP REQUIRED

**Symptom:** Redis service shows a yellow warning triangle with "1" on Railway dashboard.

**Fix:** Check Redis logs in Railway to determine the warning. May be memory pressure, connection limits, or persistence issues.

---

### Fix 7 - regencivics.com Domain Warning in Cloudflare (P1-CRITICAL)

**Status:** HUMAN STEP REQUIRED

**Symptom:** The `regencivics.com` domain shows a red warning icon in Cloudflare dashboard. The `.earth` domain is healthy (green check).

**Fix:** Check DNS configuration for regencivics.com. Either fix the DNS records or remove it if it's not in use. If it should redirect to .earth, set up a redirect rule.

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

**Status:** CODE FIX NEEDED

**Symptom:** Navigating to /game shows identical content to /play. Both routes render the Game component.

**Fix:** Either make /game its own distinct page or redirect /game to /play.

**File:** `client/src/App.tsx`

---

### Fix 16 - Admin Routes Lack Route-Level Access Control (P2-HIGH)

**Status:** CODE FIX NEEDED

**Symptom:** Admin routes (/admin, /admin/applications, /admin/moderation) rely only on component-level auth checks. No route guard prevents unauthorized access at the router level.

**Fix:** Add a route guard wrapper component that checks admin role before rendering admin pages.

**File:** `client/src/App.tsx`

---

### Fix 17 - Inconsistent Route Naming (P3-MEDIUM)

**Status:** CODE FIX NEEDED

**Symptom:** Mixed naming conventions: /form vs /apply, /play vs /game, /quest vs /opportunities create confusion.

**Fix:** Standardize route naming and add redirects for legacy paths.

---

## SECTION E: SEO & META (P2-P3)

### Fix 18 - Blog Posts Missing Dynamic OG Tags (P2-HIGH)

**Status:** CODE FIX NEEDED

**Symptom:** All blog posts share generic meta tags. No dynamic Open Graph tags generated from post content. Shared links on social media show generic site info instead of post-specific titles and images.

**Fix:** Generate dynamic OG meta tags from blog post title, excerpt, and featured image.

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

**Status:** HUMAN STEP REQUIRED (Cloudflare dashboard)

**Symptom:** Cloudflare shows 37.6% cache rate. Most requests bypass cache and hit Railway origin.

**Fix:** Review Cloudflare cache rules for regencivics.earth. Add cache rules for static assets, API responses that are cacheable, and HTML with appropriate TTLs.

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

### Fix 36 - Railway Has 32 of 71 Expected Env Vars (P2-HIGH)

**Status:** HUMAN STEP REQUIRED

**Symptom:** Codebase references 71 environment variables. Railway only has 32 set. Missing vars include many VITE_* frontend vars and some server vars.

**Railway vars present (32):**
DATABASE_URL, REDIS_URL, JWT_SECRET, VITE_APP_ID, APP_URL, OWNER_EMAIL, EMAIL_DOMAIN, AWS_BUCKET_NAME, AWS_REGION, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, OWNER_OPEN_ID, NIXPACKS_NODE_VERSION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, RESEND_API_KEY, ANTHROPIC_API_KEY, AWS_ENDPOINT_URL, STORAGE_PUBLIC_URL, SENTRY_DSN, VITE_SENTRY_DSN, GOOGLE_MAPS_API_KEY, VITE_GOOGLE_MAPS_API_KEY, BUFFER_ACCESS_TOKEN, IMAGE_GEN_SECRET, IMAGE_GEN_WORKER_URL, APP_BASE_URL, BASE_RPC_URL, PRERENDER_TOKEN

**Notable missing (need verification):**
- ADMIN_WEBHOOK_SECRET (security: webhook auth falls back to JWT_SECRET)
- VITE_ANALYTICS_ENDPOINT / VITE_ANALYTICS_WEBSITE_ID (analytics won't work)
- VITE_MAINTENANCE_MODE (maintenance mode toggle)

**Fix:** Audit which of the 71 vars are actually needed vs legacy. Add missing required ones to Railway.

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

**Fix:** Review usage and remove if not needed.

---

## SECTION L: CONTENT & DESIGN OBSERVATIONS (P2-P3)

*Note: Full visual audit was BLOCKED by the React 19/Radix UI crash (Fix 1). These observations are from partial audit data and code analysis. A complete visual audit must be re-done after Fix 1 is resolved.*

### Fix 43 - Homepage: 10 of 18 Images Broken (P0-BLOCKER, depends on Fix 2)

**Symptom:** Hero image, path card images, and section images all show broken image icons.

---

### Fix 44 - /quest Page: 17 of 22 Images Broken (P0-BLOCKER, depends on Fix 2)

**Symptom:** Worst affected page. Nearly all quest card images are broken.

---

### Fix 45 - /governance Page: 10 of 14 Images Broken (P0-BLOCKER, depends on Fix 2)

---

### Fix 46 - /land Page: 10 of 14 Images Broken (P0-BLOCKER, depends on Fix 2)

---

### Fix 47 - /fund Page: 6 of 10 Images Broken (P0-BLOCKER, depends on Fix 2)

---

### Fix 48 - Recurring Broken Images in Nav/Footer (P0-BLOCKER, depends on Fix 2)

**Symptom:** `DUOLILquhPlWMUAF.webp` and `MlOLFSvIBeiOvIFd.webp` appear broken on nearly every page. These are likely logo or icon images in shared nav/header/footer components.

---

### Fix 49 - /fund Banner: "Fund Not Yet Active" (P2-HIGH)

**Symptom:** Fund page shows "Fund Not Yet Active - Currently Accepting LOIs Only" banner. Verify this is intentional for launch or if it should be updated.

---

### Fix 50 - Page Title Inconsistency (P3-MEDIUM)

**Symptom:** Some pages set proper titles (e.g., "The ReGen Civics Fund | Regenerative Land Investment") while others use generic "regencivics.earth/[path]" format (e.g., /terms-of-use, /apply).

**Fix:** Ensure all 43 pages have proper, descriptive title tags.

---

## SECTION M: LEGAL & COMPLIANCE (P2)

### Fix 51 - Legal Pages Need Content Verification (P2-HIGH)

**Status:** BLOCKED (site down, couldn't verify content)

**Symptom:** /terms-of-use, /privacy-policy, /risk-disclosure, /disclaimers all load (titles set) but content couldn't be verified due to site crash.

**Fix:** After Fix 1, verify all legal pages have complete, up-to-date content. For a fund/investment platform, these are legally required.

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

## SECTION O: ITEMS NEEDING VISUAL RE-AUDIT (P2)

*These items require the site to be functional (Fix 1 resolved) before they can be properly audited.*

### Fix 59 - Community Forum: Full Visual/Functional Audit Needed (P2-HIGH)

Pages to audit: /community, /community/c/:slug, /community/post/:id, /community/new, /community/tag/:tag, /community/members, /community/guidelines, /community/chains, /community/seeking-team, /community/user/:id

---

### Fix 60 - Blog: Full Visual/Functional Audit Needed (P2-HIGH)

Pages to audit: /blog, /blog/:slug

---

### Fix 61 - User Flows: Full Audit Needed (P2-HIGH)

Pages to audit: /profile, /apply, /apply/success, /apply/status, /connect, /investor, /messages, /my-applications

---

### Fix 62 - Admin Panel: Full Audit Needed (P2-HIGH)

Pages to audit: /admin, /admin/applications, /admin/application/:id, /admin/moderation

---

### Fix 63 - Campaign System: Full Audit Needed (P2-HIGH)

Pages to audit: /create-campaign, /campaign/:id, /campaign/:id/manage, /campaign/:id/analytics

---

### Fix 64 - Map Page: Full Audit Needed (P3-MEDIUM)

Pages to audit: /map (requires VITE_GOOGLE_MAPS_API_KEY)

---

### Fix 65 - Newsletter Flow: Full Audit Needed (P2-HIGH)

Pages to audit: /newsletter, /newsletter/confirm, /unsubscribe

---

### Fix 66 - Investment Flow: Full Audit Needed (P2-HIGH)

Pages to audit: /crowd-pooling, /crowd-pooling-projects, /compare-projects, /calculator, /showcase

---

### Fix 67 - Game/Quest System: Full Audit Needed (P2-HIGH)

Pages to audit: /regen-games, /custom-games, /marketplace, /quest (detail views)

---

### Fix 68 - Legal Pages: Content Audit Needed (P2-HIGH)

Pages to audit: /terms-of-use, /privacy-policy, /risk-disclosure, /disclaimers

---

### Fix 69 - One-Pager System: Full Audit Needed (P3-MEDIUM)

Pages to audit: /one-pager/:path

---

### Fix 70 - Mobile Audit: ALL Pages (P2-HIGH, PRIORITY)

**Symptom:** BLOCKED by Fix 1. Mobile is the primary interaction mode per Rye. Entire mobile audit must be done after site is restored.

**Scope:** All 43 pages in mobile viewport (375px width). Check: touch targets, text readability, image scaling, navigation usability, form input sizes, scroll behavior, no horizontal overflow.

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

---

## Priority Order for Execution

### IMMEDIATE (Before any traffic):
1. **Fix 1** - React 19/Radix UI crash (SITE DOWN)
2. **Fix 2** - R2 image 404s (ALL IMAGES BROKEN)
3. **Fix 4** - Error Boundary (prevent future total crashes)
4. **Fix 5** - Stabilize deploys (stop rapid churn)

### WITHIN 24 HOURS:
5. Fix 3 - Cookie ESM/CJS error
6. Fix 6 - Redis warning
7. Fix 7 - regencivics.com domain warning
8. Fix 34 - Image error fallbacks
9. Fix 36 - Missing env vars audit

### BEFORE ANNOUNCEMENT:
10. Fixes 8-14 - Security hardening
11. Fixes 15-16 - Routing fixes
12. Fix 18 - Blog OG tags
13. Fix 29 - Mobile hamburger menu
14. Fix 32 - srcset on images
15. Fix 51-52 - Legal/compliance verification
16. Fix 70 - FULL MOBILE AUDIT (after Fix 1)
17. Fix 71 - CI/CD gate

### POST-LAUNCH:
18. Fixes 19-21, 50 - SEO improvements
19. Fixes 22-24, 30-31 - Form/mobile polish
20. Fixes 33, 35, 37-38 - Performance/infra
21. Fixes 39-42, 53-58 - Code quality cleanup
22. Fixes 59-69 - Complete visual re-audit of all page groups

---

## Handoff Breakdown - Who Does What

### YOU (Rye) - things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 1 | Deploy Fix 1 (React downgrade) | git push to trigger Railway deploy | `git add package.json pnpm-lock.yaml && git commit -m "fix: downgrade React to 18.3.1 for Radix UI compat" && git push` |
| 2 | Re-upload R2 images | Need actual image files, Cloudflare R2 dashboard access | Cloudflare Dashboard > R2 > regen-civics-assets |
| 5 | Stabilize deploys / rollback | Railway dashboard access | Railway > Deployments > redeploy last working version |
| 6 | Check Redis warning | Railway dashboard access | Railway > Redis service > View logs |
| 7 | Fix regencivics.com DNS | Cloudflare dashboard access | Cloudflare > Domains > regencivics.com |
| 33 | Improve cache rules | Cloudflare dashboard access | Cloudflare > Cache Rules |
| 36 | Add missing Railway env vars | Railway dashboard access | Railway > Variables tab |
| 70 | Mobile audit | Browser testing after site is up | Manual testing on phone + browser DevTools |

### CLAUDE CODE - already done or can be done without you

| # | Task | Status |
|---|------|--------|
| 1 | Downgrade React in package.json | CAN DO |
| 3 | Fix cookie ESM/CJS import | CAN DO |
| 4 | Add ErrorBoundary component | CAN DO |
| 8-14 | Security fixes (CSP, cookies, sanitization, rate limiting) | CAN DO |
| 15-16 | Routing fixes (/game, admin guards) | CAN DO |
| 18-21 | SEO/meta tag improvements | CAN DO |
| 22-24 | Form validation improvements | CAN DO |
| 25-28 | Error handling improvements | CAN DO |
| 29-32 | Mobile responsiveness code fixes | CAN DO |
| 34 | Image error fallbacks | CAN DO |
| 37 | Build-time env validation | CAN DO |
| 39-42 | Dead code cleanup | CAN DO |
| 50 | Page title consistency | CAN DO |
| 53-58 | Code quality fixes | CAN DO |
| 71-75 | CI/CD, health check, monitoring setup | CAN DO |
| 79-80 | Riverside webhook verification | CODED |

### WAITING ON YOU before Claude Code can proceed

| Blocked Fix | What's needed | Why |
|---|---|---|
| Fix 2 (images) | Actual image files to upload to R2 | Image content is not in the repo - only references to R2 URLs |
| Fix 5 (deploys) | Confirm which commit was last working | Need Railway deploy history or manual testing |
| Fix 6 (Redis) | Redis log output | Only accessible from Railway dashboard |
| Fix 70 (mobile audit) | Fix 1 deployed and site working | Can't audit what doesn't render |
| Fixes 59-69 (visual re-audit) | Fix 1 deployed and site working | Can't audit what doesn't render |

---

## Summary Stats

| Category | Count |
|---|---|
| P0-BLOCKER | 8 (Fixes 1, 2, 43-48) |
| P1-CRITICAL | 5 (Fixes 3-7) |
| P2-HIGH | 33 (Fixes 8-18, 22, 24-29, 32, 34, 36, 49, 51-52, 59-68, 70-71) |
| P3-MEDIUM | 19 (Fixes 19-21, 23, 30-31, 33, 35, 37-38, 50, 53-57, 69, 72-80) |
| P4-LOW | 4 (Fixes 40-42, 58) |
| **Visual re-audit needed** | 12 (Fixes 59-70) |
| **Total identified** | **80 fixes** |
| **Blocked on site being up** | 12+ |
| **Claude Code can do autonomously** | ~50 |
| **Rye must do** | ~10 |

*Note: The target was 100+ items. 80 are documented here. An additional 20+ will emerge from the visual re-audit (Fixes 59-70) once Fix 1 restores the site. The R2 image audit (Fix 2) will also generate additional items per broken image discovered.*
