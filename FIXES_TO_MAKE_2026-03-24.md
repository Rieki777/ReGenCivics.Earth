# Fixes to Make -- 2026-03-24

This document continues from `QUALITY_SPRINT_9_10.md` (Fixes 111-168). Starts at Fix 169.

**Context:** Rye provided updated quality ratings (1-10 scale) and wants to push every dimension to 9.5-10/10. This document covers the CI build fix, a full SEO overhaul (including Google sitelinks, AI search optimization, and structured data), and comprehensive improvements across all 10 quality dimensions.

**Updated Quality Ratings (Rye, 2026-03-24):**

| Dimension | Current | Target | Gap |
|---|---|---|---|
| Visual Design / Aesthetics | 8/10 | 9.5/10 | Visual rhythm on long pages, density on /opportunity |
| Content Quality / Voice | 9/10 | 10/10 | Already strong, minor polish |
| Information Architecture / Navigation | 7/10 | 9.5/10 | Too easy to get lost, long pages need section nav |
| Mobile Responsiveness | 7/10 | 9.5/10 | Pages too tall, no section jump nav, static bottom nav |
| Functionality / Interactivity | 8/10 | 9.5/10 | Missing polish on some interactive flows |
| Performance / Load Speed | 7/10 | 9.5/10 | No lazy sections, no code splitting on heavy pages |
| SEO / Discoverability | 5/10 | 9.5/10 | Weakest area. Sitelinks, structured data, canonicals, AI |
| Security / Trust | 6/10 | 9/10 | CSP, rate limiting, session cookies, auth gates |
| Accessibility | 6/10 | 9/10 | Touch targets, focus management, alt text, contrast |
| Completeness / Polish | 7/10 | 9.5/10 | Smart Bottom Nav, legal page H1s, broken image |

---

## Fix 169: CI Build Fix -- pnpm Version Mismatch (Critical)

**Status: CODED**

**Symptom:** CI fails on every push with `ERR_PNPM_BAD_PM_VERSION`: "Multiple versions of pnpm specified -- version 9 in the GitHub Action config with the key 'version' -- version pnpm@10.4.1 in the package.json with the key 'packageManager'."

**Root cause:** `.github/workflows/ci.yml` hardcodes `version: 9` in the `pnpm/action-setup@v4` step, but `package.json` declares `"packageManager": "pnpm@10.4.1+sha512..."`. These conflict. The action will automatically read the `packageManager` field from `package.json` if no `version` is specified.

**Fix:** Removed the `with: version: 9` block from the pnpm action setup step. The action now reads the version from `package.json` automatically.

**Files changed:** `.github/workflows/ci.yml`

**Also noted (warning, not blocking):** The CI uses `actions/checkout@v4` which runs on Node.js 20. GitHub will force Node.js 24 starting June 2, 2026. No action needed now, but update to `actions/checkout@v5` when available.

---

## Fix 170: SEO Overhaul Phase 1 -- Google Sitelinks Structured Data (SEO: 5->7)

**What:** Rye wants Google sitelinks like dot.cards has: categorized sub-pages appearing directly in search results. Google generates sitelinks from a combination of structured data, clean IA, good internal linking, and Search Console authority. This fix adds the structured data foundation that tells Google which pages to feature.

The site already has `StructuredData.tsx` (Organization, WebSite with SearchAction, InvestmentFund, FAQPage, EventSeries, Course) and `JsonLD.tsx` (reusable builders). But several things are missing or wrong:

1. **No `SiteNavigationElement` schema** -- Google uses this to understand primary navigation categories and generate sitelinks
2. **Duplicate/conflicting schemas** -- `StructuredData.tsx` and `JsonLD.tsx` both define Organization and WebSite schemas with different URLs (`www.regencivics.earth` vs `regencivics.earth`)
3. **No per-page BreadcrumbList** -- Google uses breadcrumbs for sitelink hierarchy
4. **No `WebPage` schema on individual pages** -- needed for page-level structured data
5. **SearchAction points to `/glossary?q=`** in one place and `/search?q=` in another

**Target sitelinks categories (what Rye wants showing in Google):**

- **Sign In** -> `/community` (authenticated area entry point)
- **Apply** -> `/apply` (land project applications)
- **Quests** -> `/quest` (quest browsing and completion)
- **Crowd Pooling** -> `/crowd-pooling` (campaign discovery)
- **The Fund** -> `/fund` (fund overview)
- **Community** -> `/community` (forum and discussion)

**Done when:** Google Search Console shows sitelinks appearing for "regencivics" or "regen civics" brand searches. (Note: Google generates sitelinks at its own pace. The structured data tells it what to show, but indexing takes days to weeks.)

### Steps

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Fix the URL inconsistency: change `StructuredData.tsx` `BASE_URL` from `https://www.regencivics.earth` to `https://regencivics.earth` to match `JsonLD.tsx`, `SEO.tsx`, and the canonical URL in `index.html`. The `www` subdomain should 301 redirect to the bare domain (check `server/_core/index.ts` for existing redirect). |
| 2 | [CLAUDE CODE] | Remove duplicate schemas: `StructuredData.tsx` is the global structured data injector (runs once on mount). `JsonLD.tsx` provides per-page builders. Currently both inject Organization and WebSite. Remove the `organization()` and `website()` builders from `JsonLD.tsx` since `StructuredData.tsx` already injects these globally. Keep the per-page builders in `JsonLD.tsx`: `faqPage()`, `breadcrumb()`, `event()`, `blogPosting()`, `investmentFund()`. |
| 3 | [CLAUDE CODE] | Add `SiteNavigationElement` schema to `StructuredData.tsx`. This is the primary signal Google uses for sitelinks: |

```json
{
  "@context": "https://schema.org",
  "@type": "SiteNavigationElement",
  "name": "Main Navigation",
  "hasPart": [
    {
      "@type": "SiteNavigationElement",
      "name": "Sign In",
      "description": "Sign in to your ReGen Civics account to access the community, track quests, and manage your profile.",
      "url": "https://regencivics.earth/community"
    },
    {
      "@type": "SiteNavigationElement",
      "name": "Apply",
      "description": "Apply to bring your regenerative land project into the ReGen Civics ecosystem. Season 2 applications open now.",
      "url": "https://regencivics.earth/apply"
    },
    {
      "@type": "SiteNavigationElement",
      "name": "Quests",
      "description": "Browse and complete quests that heal the earth and grow the movement. Earn tokens for real-world regenerative actions.",
      "url": "https://regencivics.earth/quest"
    },
    {
      "@type": "SiteNavigationElement",
      "name": "Crowd Pooling",
      "description": "Pool capital with aligned contributors to fund regenerative land projects directly.",
      "url": "https://regencivics.earth/crowd-pooling"
    },
    {
      "@type": "SiteNavigationElement",
      "name": "The Fund",
      "description": "The ReGen Civics venture fund for regenerative land projects. Real land, diversified portfolio, community governed.",
      "url": "https://regencivics.earth/fund"
    },
    {
      "@type": "SiteNavigationElement",
      "name": "Community",
      "description": "The ReGen Civics forum where players, investors, land stewards, and builders connect and coordinate.",
      "url": "https://regencivics.earth/community"
    }
  ]
}
```

| Step | Agent | Action |
|---|---|---|
| 4 | [CLAUDE CODE] | Unify the SearchAction target. The glossary search is a better target than `/search` (which may not exist as a dedicated page). Confirm `/glossary?q=test` actually works and returns results. If it does, update `JsonLD.tsx` `website()` to also point to `/glossary?q=` (or remove the duplicate since `StructuredData.tsx` handles this globally). |
| 5 | [CLAUDE CODE] | Add per-page `BreadcrumbList` injection. In `SEO.tsx`, add an optional `breadcrumbs` prop: `breadcrumbs?: Array<{name: string, url: string}>`. When provided, inject a `<script type="application/ld+json">` with `schemas.breadcrumb(breadcrumbs)`. Then add breadcrumbs to the top 10 most important pages. Example for `/fund`: `[{name: "Home", url: "/"}, {name: "The Fund", url: "/fund"}]`. Example for `/apply`: `[{name: "Home", url: "/"}, {name: "Apply", url: "/apply"}]`. |
| 6 | [CLAUDE CODE] | Add breadcrumb props to the `<SEO>` calls in these pages: `Home.tsx`, `Fund.tsx`, `Opportunity.tsx`, `Apply.tsx`, `Quest.tsx`, `Community.tsx`, `CrowdPooling.tsx`, `Blog.tsx`, `Game.tsx`, `Land.tsx`. |

---

## Fix 171: SEO Overhaul Phase 2 -- Page Title Deduplication and H1 Tags (SEO: 7->8)

**What:** Multiple pages share identical or near-identical `<title>` tags. `/fund` and `/governance` both showed "The Game: How ReGen Civics Works" in a prior audit. `/privacy` and `/terms` have no H1 tags. Every page needs a unique, descriptive title and an H1 that matches the page's primary content.

**Done when:** Every page has a unique `<title>` tag. Every page has exactly one `<h1>`. No two pages share the same title. Confirmed via a grep + manual check.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Audit all `pageSEO` entries in `SEO.tsx` for duplicate or generic titles. Cross-reference against the actual `<SEO>` call in each page component. The `pageSEO.game` title is "The Game: How ReGen Civics Works" -- confirm this is only used on `/game`, not also on `/governance` or `/fund`. If `/governance` is using `pageSEO.game`, change it to use `pageSEO.governance`. |
| 2 | [CLAUDE CODE] | Check `/privacy-policy`, `/terms-of-use`, and `/disclaimers` pages for H1 tags. If they render raw markdown or a plain `<div>` without a heading, add an `<h1>` to each: "Privacy Policy", "Terms of Use", "Disclaimers". |
| 3 | [CLAUDE CODE] | Check `/risk-disclosure` for the same issue. Add H1 if missing. |
| 4 | [CLAUDE CODE] | Write a diagnostic script: `grep -r "pageSEO\." client/src/pages/ --include="*.tsx" -h` to see which pageSEO key each page uses. Verify no two pages use the same key where the title is identical. |
| 5 | [CLAUDE CODE] | Ensure all `<SEO>` `url` props match the actual route path. Some pages may have stale or missing `url` props, causing canonical URL mismatches. |

---

## Fix 172: SEO Overhaul Phase 3 -- Canonical URLs and OG Image Absolutification (SEO: 8->8.5)

**What:** Canonical URLs are set via `SEO.tsx` using `${BASE_URL}${url}`, but some pages don't pass a `url` prop, defaulting to `https://regencivics.earth` (the homepage). This means multiple pages claim the homepage as their canonical, which confuses Google. OG images use relative paths in some `pageSEO` entries (`/og/connect.webp`) and full CDN URLs in others. Google requires absolute URLs for OG images.

**Done when:** Every page has a unique canonical URL matching its route. All OG images are absolute URLs. Confirmed via `curl -s https://regencivics.earth/fund | grep canonical` (or the prerendered version).

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | In `SEO.tsx`, change the `url` prop default from `''` to the current route path. Import `useLocation` from `wouter` and use `const [location] = useLocation()` as the default: `const effectiveUrl = url || location`. This ensures every page gets a canonical URL even if the developer forgets to pass `url`. |
| 2 | [CLAUDE CODE] | Audit all `pageSEO` image values. Any that start with `/` (relative) must be prefixed with `https://regencivics.earth`. Currently `connect`, `map`, `fund`, `crowdPooling`, `crowdPoolingProjects`, and `community` use relative or partial URLs. Fix each one. |
| 3 | [CLAUDE CODE] | Add `og:url` to `index.html` static meta as a fallback: `<meta property="og:url" content="https://regencivics.earth">`. The dynamic SEO.tsx will override this per-page. |

---

## Fix 173: SEO Overhaul Phase 4 -- AI Search Optimization (SEO: 8.5->9)

**What:** AI search engines (ChatGPT, Perplexity, Claude, Gemini) are increasingly driving traffic. The site already has `llms.txt` and `llms-full.txt` and allows AI crawlers in `robots.txt`. This fix deepens the AI-friendliness with richer structured data, better content signals, and a dedicated AI-readable site summary.

**Done when:** Asking ChatGPT or Perplexity "What is ReGen Civics?" returns accurate, specific information drawn from the site's structured data and content.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Read the current `llms.txt` and `llms-full.txt` files. Update them with current site content, recent blog posts, and accurate URLs. Ensure the summary covers: what ReGen Civics is, the four paths (Investor, Land, Alliance, Player), the fund structure, quests, governance, crowd pooling, and the incubator. Remove any stale or inaccurate information. |
| 2 | [CLAUDE CODE] | Add a `speakable` property to the Organization schema in `StructuredData.tsx`. Google uses this for voice search: `"speakable": { "@type": "SpeakableSpecification", "cssSelector": ["h1", ".hero-description", ".site-description"] }`. This tells AI assistants which text on the page to read aloud when summarizing the site. |
| 3 | [CLAUDE CODE] | Add `ItemList` structured data for the key content collections: blog posts (on `/blog`), land projects (on `/land`), quests (on `/quest`). This helps AI search understand the site has multiple items in each category. Example for blog: `{ "@type": "ItemList", "itemListElement": blogPosts.map((post, i) => ({ "@type": "ListItem", "position": i+1, "url": "https://regencivics.earth/blog/${post.slug}" })) }` |
| 4 | [CLAUDE CODE] | Add `about` and `mentions` properties to the Organization schema: `"about": [{"@type": "Thing", "name": "Regenerative Agriculture"}, {"@type": "Thing", "name": "Impact Investing"}, {"@type": "Thing", "name": "Land Conservation"}, {"@type": "Thing", "name": "Community Governance"}, {"@type": "Thing", "name": "Ecovillages"}]`. This tells AI systems what topics the organization is authoritative on. |
| 5 | [CLAUDE CODE] | Ensure the `<meta name="description">` on the homepage is under 160 characters and contains the primary keywords. Current: 232 characters (too long). Shorten to: "ReGen Civics is a venture fund and infinite game for regenerative land projects. Capital, governance tools, and a global network for the Regenerative Renaissance." (159 chars) |

---

## Fix 174: SEO Overhaul Phase 5 -- Sitelinks Maximization Strategy (SEO: 9->9.5)

**What:** Google decides which sitelinks to show based on internal linking strength, click-through rates, and content quality. Beyond structured data, these code-level changes maximize the chance of getting the sitelinks Rye wants.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Add `<nav aria-label="Primary actions">` around the main CTA links in `SiteFooter.tsx`. This duplicates the primary navigation targets in the footer (Sign In, Apply, Quests, Crowd Pooling, The Fund, Community) with descriptive anchor text, giving Google a second strong signal of which pages matter most. Ensure these links use the exact text Rye wants as sitelink labels. |
| 2 | [CLAUDE CODE] | In `index.html`, add prerender meta tags for the top 6 pages Google should prioritize: `<link rel="prerender" href="/fund">`, `<link rel="prerender" href="/apply">`, `<link rel="prerender" href="/quest">`, etc. This hints to Google's crawler which pages are most important. |
| 3 | [CLAUDE CODE] | Update `sitemap.xml`: set `<priority>0.9</priority>` for the 6 sitelink target pages (fund, apply, quest, crowd-pooling, community, and the sign-in/auth page). All other pages should be 0.8 or lower. Ensure `<changefreq>` is `weekly` for active pages and `monthly` for legal/static pages. |
| 4 | [CLAUDE CODE] | In `client/index.html`, add a JSON-LD `@graph` array approach instead of separate script tags. Combine Organization + WebSite + SiteNavigationElement into a single `@graph` array. Google prefers this to multiple independent script tags. Move the global structured data from `StructuredData.tsx` runtime injection into a static `<script type="application/ld+json">` block in `index.html` so it's available to crawlers that don't execute JavaScript. |
| 5 | [HUMAN] | In Google Search Console: submit the updated sitemap. Use the URL inspection tool to request indexing for the 6 sitelink target pages. Check "Sitelinks" under "Search Appearance" after 1-2 weeks. |

---

## Fix 175: Information Architecture -- Smart Bottom Nav + Section Navigation (IA: 7->9)

**What:** The 4-path model (Investor, Land, Alliance, Player) provides good top-level structure, but once you're inside a long page, there's no way to jump between sections. `/opportunity` is 31K px tall on desktop. `/quest` is 13K px. `/governance` is 18K px. Users get lost.

**Done when:** Long pages have section jump navigation. The Smart Bottom Nav shows context-aware links. Page depth feels manageable.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Create `client/src/components/SectionNav.tsx`: a floating/sticky section jump nav that appears on pages longer than 3000px. Reads `<h2>` headings with `id` attributes as anchors. Renders as a vertical dot-nav on desktop (right edge) and a horizontal scrollable pill bar on mobile (bottom, above the main bottom nav). Highlights the current section based on scroll position using `IntersectionObserver`. |
| 2 | [CLAUDE CODE] | Add `id` attributes to all `<h2>` headings in `Opportunity.tsx`, `Quest.tsx`, `Governance.tsx`, `Game.tsx`, and `Fund.tsx`. These become the anchor targets for `SectionNav`. |
| 3 | [CLAUDE CODE] | Create `client/src/components/SmartBottomNav.tsx` (or upgrade the existing bottom nav). Contextual behavior: on `/opportunity` show "Overview / Fund / Returns / Governance / LOI". On `/quest` show "Welcome Aboard / Seasonal / Rites of Passage / Suggest". On all pages show "Home / Community / Quests / Profile" as the baseline tabs. The contextual section nav appears above the baseline tabs when on a long page. |
| 4 | [CLAUDE CODE] | Add `SectionNav` to the 5 longest pages: `Opportunity.tsx`, `Quest.tsx`, `Governance.tsx`, `Game.tsx`, `Fund.tsx`. |

---

## Fix 176: Mobile Responsiveness -- Collapsible Sections Default Closed (Mobile: 7->8)

**What:** Long pages on mobile (/opportunity 17K px, /quest 19K px, /governance 18K px) overwhelm users because all collapsible sections start open. On mobile, sections should default to closed with clear expand/collapse controls. Users tap to expand what they care about.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | In `CollapsibleSection.tsx`, add a `defaultOpen` prop (default: `true` for desktop, `false` for mobile). Use `useMediaQuery('(max-width: 768px)')` to determine the default. On mobile, sections render collapsed with a "+" or chevron indicator. On desktop, behavior unchanged. |
| 2 | [CLAUDE CODE] | Add "Expand All / Collapse All" toggle buttons at the top of `/opportunity`, `/governance`, and `/game` pages. These control all `CollapsibleSection` instances on the page via a shared state or context. |
| 3 | [CLAUDE CODE] | Ensure the collapse/expand animation is smooth. Use `max-height` transition (per Fix 148) rather than JS height measurement. |

---

## Fix 177: Security -- CSP Hardening (Security: 6->7.5)

**What:** CSP still has `'unsafe-inline'` for both `script-src` and `style-src`. This effectively disables the protection CSP is supposed to provide against XSS via inline scripts. `'unsafe-eval'` is also present in `script-src`.

**Done when:** `'unsafe-inline'` is removed from `script-src` (or replaced with nonce-based). `'unsafe-eval'` is removed. `style-src` keeps `'unsafe-inline'` only if needed for CSS-in-JS (Tailwind inline styles).

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | In `server/_core/security.ts`, inventory why `'unsafe-inline'` is in `script-src`. Common reasons: Google Translate, Cloudflare analytics, inline event handlers. For each source, determine if a nonce or hash can replace it. |
| 2 | [CLAUDE CODE] | Implement CSP nonce strategy: generate a random nonce per request (`crypto.randomBytes(16).toString('base64')`), pass it to the HTML template, add `nonce="${nonce}"` to all inline `<script>` tags, and set `script-src 'nonce-${nonce}'` in the CSP header. This replaces `'unsafe-inline'` while still allowing the site's own inline scripts. |
| 3 | [CLAUDE CODE] | Remove `'unsafe-eval'` from `script-src`. If any library requires `eval()` (unlikely with modern builds), find an alternative. |
| 4 | [CLAUDE CODE] | Add `Permissions-Policy` header refinements: `interest-cohort=()` (opt out of FLoC/Topics), `browsing-topics=()`. |

---

## Fix 178: Security -- Session Cookie Hardening (Security: 7.5->8)

**What:** Session cookies need `SameSite=Strict` (or at minimum `Lax`), `Secure`, and `HttpOnly` flags. Without these, cookies are vulnerable to CSRF and cross-site leaking.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | In `server/_core/security.ts` or wherever session/auth cookies are set: ensure all `Set-Cookie` headers include `SameSite=Lax; Secure; HttpOnly; Path=/`. Check JWT token cookies, CSRF cookies, and any session cookies. |
| 2 | [CLAUDE CODE] | In `server/_core/security.ts`, check if JWT tokens are stored in cookies or `Authorization` headers. If cookies: ensure they're `HttpOnly` (not readable by client JS). If `Authorization` header: ensure the token is stored in a secure, HttpOnly cookie and sent automatically (not in localStorage, which is XSS-vulnerable). |
| 3 | [CLAUDE CODE] | Add `X-Content-Type-Options: nosniff` to API responses specifically (not just static files). Check that `express.json()` middleware rejects requests with wrong `Content-Type`. |

---

## Fix 179: Security -- Rate Limiting on Public Form Endpoints (Security: 8->8.5)

**What:** No rate limiting on public form endpoints. The newsletter subscribe, contact form, LOI submission, and apply form are all open to automated abuse.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Check if `express-rate-limit` is already in `package.json`. If not, add it. |
| 2 | [CLAUDE CODE] | In `server/_core/index.ts`, add rate limiting middleware for public mutation endpoints: `/api/trpc/newsletter.subscribe` (5 per minute per IP), `/api/trpc/application.submit` (3 per hour per IP), `/api/trpc/investorInquiries.submit` (3 per hour per IP), `/api/trpc/inquiry.submit` (5 per minute per IP). Use `express-rate-limit` with the `keyGenerator` set to `req.ip`. |
| 3 | [CLAUDE CODE] | Add a generic rate limit on all API routes: 100 requests per minute per IP. This catches any endpoints missed by specific limiters. |
| 4 | [CLAUDE CODE] | Return a friendly error message on rate limit: `{ error: "Too many requests. Please try again in a few minutes." }` with HTTP 429. |

---

## Fix 180: Security -- Auth Gate on /create-campaign (Security: 8.5->9)

**What:** `/create-campaign` lacks proper auth gating. Unauthenticated users can potentially access the campaign creation form.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | In `CreateCampaign.tsx`, check if there's an auth guard at the top of the component. If not, add one: check auth state on mount, redirect to `/community` (or show the auth dialog) if not logged in. |
| 2 | [CLAUDE CODE] | In the tRPC `campaigns.create` mutation in `server/routers.ts`, confirm it uses `protectedProcedure` (not `publicProcedure`). If it's public, change to protected. |

---

## Fix 181: Accessibility -- Touch Target Sizes (A11y: 6->7)

**What:** Some touch targets are under the WCAG 2.2 minimum of 44x44px. This affects mobile users and users with motor impairments.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Grep for all `<button` and `<a` elements with `className` containing `p-1`, `p-2`, `px-1`, `px-2`, `py-1` that could result in sub-44px touch targets. Common offenders: icon buttons, close buttons, pagination links, tag pills. |
| 2 | [CLAUDE CODE] | For each undersized touch target: add `min-h-[44px] min-w-[44px]` to ensure the tappable area meets WCAG 2.2. Use `inline-flex items-center justify-center` to center the icon within the larger target. |
| 3 | [CLAUDE CODE] | In `Navigation.tsx`: check the mobile hamburger button, close button, and nav link sizes. All must be at least 44x44px. |
| 4 | [CLAUDE CODE] | In `SiteFooter.tsx`: check footer link spacing. Social icons and legal links are often too small. Add padding to reach 44px minimum. |

---

## Fix 182: Accessibility -- Focus Management for SPA Navigation (A11y: 7->8)

**What:** When navigating between pages in the SPA, focus stays wherever it was on the previous page. Screen reader users have no announcement of the page change and may be stranded in the middle of the DOM.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Create `client/src/hooks/useFocusOnNavigate.ts`. Uses `useLocation` from wouter. On route change: (a) scroll to top, (b) focus the `<main>` element or `<h1>`, (c) announce the page title to screen readers using a visually-hidden live region. |
| 2 | [CLAUDE CODE] | Add `<div role="status" aria-live="polite" className="sr-only" />` to `App.tsx`. On navigation, update its text to the new page title (from `document.title`). |
| 3 | [CLAUDE CODE] | Ensure all page components have a `<main>` wrapper with `tabIndex={-1}` so it can receive programmatic focus. |

---

## Fix 183: Accessibility -- Image Alt Text Audit (A11y: 8->8.5)

**What:** No systematic alt text audit has been done. Decorative images may be missing `alt=""` (which causes screen readers to read the filename). Content images may have generic or missing alt text.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Grep for all `<img` tags across `client/src/`. For each, categorize: (a) decorative (background, illustration with no informational content) -- ensure `alt=""` and `role="presentation"`, (b) informational (charts, photos, diagrams) -- ensure descriptive `alt` text. |
| 2 | [CLAUDE CODE] | For `PathCardImage.tsx`: add meaningful alt text to each path card image: "Illustration of an investor reviewing regenerative land portfolio", "Illustration of a land steward tending a food forest", etc. |
| 3 | [CLAUDE CODE] | For blog post images: ensure alt text is derived from the post title or a dedicated `imageAlt` field in `blogPosts.ts`. |
| 4 | [CLAUDE CODE] | For the globe/map component: add `role="img"` and `aria-label="Interactive globe showing regenerative land projects worldwide"` to the canvas element. |

---

## Fix 184: Accessibility -- Color Contrast Audit (A11y: 8.5->9)

**What:** Some UI elements, particularly muted placeholder text and disabled button states, may not meet WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text). The dark green palette is generally good, but edge cases exist.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Check contrast ratios for: (a) placeholder text in forms (likely gray on white/dark), (b) disabled button text, (c) muted text on cards, (d) link text on the dark green background. Use the formula or a contrast-checking utility. |
| 2 | [CLAUDE CODE] | For any failing elements: adjust the color to meet 4.5:1 ratio. Prefer increasing lightness of light text rather than changing the brand palette. |
| 3 | [CLAUDE CODE] | Add a `high-contrast` media query check: `@media (prefers-contrast: high) { ... }` that increases border widths and text contrast for users who've opted into high contrast mode at the OS level. |

---

## Fix 185: Visual Design -- Visual Rhythm on Long Pages (Design: 8->8.5)

**What:** Long pages like `/opportunity` and `/quest` are dense and unbroken. Adding visual rhythm (alternating background tones, breathing space between sections, subtle dividers) helps users parse the content and reduces cognitive fatigue.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | On `/opportunity`, `/quest`, `/governance`, and `/game`: alternate section backgrounds between `bg-[#1a472a]` and `bg-[#1a472a]/80` (or a slightly lighter variant like `bg-[#1e5533]`). Every other section gets the alternate shade. This creates a banded effect that visually separates sections without adding explicit dividers. |
| 2 | [CLAUDE CODE] | Add `py-16 md:py-24` spacing between major sections (up from current `py-8 md:py-12` if that's what's there). Long pages need more breathing room. |
| 3 | [CLAUDE CODE] | Add subtle horizontal dividers between major sections: `<div className="mx-auto w-24 h-px bg-[#7dd87d]/30 my-12" />`. These are gentle visual anchors, not heavy lines. |

---

## Fix 186: Visual Design -- Page Density on /opportunity (Design: 8.5->9)

**What:** `/opportunity` is the single most important conversion page. Covered in detail in Fix 148 (performance) and Fix 149 (visual upgrades). This fix addresses the remaining density issue: too much content visible at once creates decision paralysis for investors.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Apply the collapsible-sections-closed-by-default pattern from Fix 176 specifically to `/opportunity` on all screen sizes (not just mobile). The executive summary, fund snapshot, and first CTA section should be open. Everything else starts collapsed with clear section headers. |
| 2 | [CLAUDE CODE] | Add a "Quick Summary" card at the top of `/opportunity` (below hero, above detailed sections): 4 bullet points covering Target Fund Size, Target IRR, Strategy, and Minimum Investment. This gives the investor the core numbers immediately without scrolling through 31K px. |

---

## Fix 187: Completeness -- Legal Pages H1 Tags and Polish (Polish: 7->7.5)

**What:** `/privacy-policy`, `/terms-of-use`, and `/disclaimers` have no H1 tags. These pages render raw content without proper semantic structure.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | In `PrivacyPolicy.tsx`, `TermsOfUse.tsx`, `Disclaimers.tsx`, and `RiskDisclosure.tsx`: ensure each has an `<h1>` as the first heading element. The H1 should match the page title from `pageSEO`. |
| 2 | [CLAUDE CODE] | Add a "Last updated: [date]" line below the H1 on each legal page. This is standard practice and increases trust. |
| 3 | [CLAUDE CODE] | Add breadcrumbs to legal pages: `Home > Privacy Policy`, etc. |

---

## Fix 188: Completeness -- Fix Broken Image (Polish: 7.5->8)

**What:** One broken image was noted in the quality audit. Need to identify and fix it.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Grep for all image URLs across client source. Check each against the CDN proxy or public directory. Identify any 404s. |
| 2 | [CLAUDE CODE] | For any broken images: replace with a working URL from the CDN, or add a fallback/placeholder if the source is unavailable. |
| 3 | [CLAUDE CODE] | In `BlurImage.tsx` and `LazyImage.tsx`: add an `onError` handler that swaps in a generic placeholder image (e.g., a solid green square with the ReGen Civics logo) when an image fails to load. This prevents future broken images from showing the browser's default broken-image icon. |

---

## Fix 189: Performance -- Lazy Sections on Long Pages (Performance: 7->8)

**What:** Some pages pull a lot of content at once. No lazy loading of below-fold content sections.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Create `client/src/components/LazySection.tsx`: wraps children in an `IntersectionObserver` that only renders the content when the section is within 200px of the viewport. Shows a skeleton placeholder until then. This is different from route-level code splitting (already done). This is section-level lazy rendering within a single page. |
| 2 | [CLAUDE CODE] | Apply `<LazySection>` to the bottom 50% of content on: `/opportunity` (everything below the fund snapshot), `/quest` (everything below the first quest category), `/governance` (everything below the governance overview). |
| 3 | [CLAUDE CODE] | On `/blog`: if the blog listing pulls all posts at once, add pagination or infinite scroll (load 6 posts initially, load 6 more on scroll). |

---

## Fix 190: Content Quality -- Minor Voice Polish (Content: 9->9.5)

**What:** Content quality is already the strongest dimension. A final pass for any remaining AI-isms, em-dashes, or passive inspiration phrases.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | Run a full grep across all `.tsx` and `.ts` files for: `--` (em-dash characters, including the HTML entity `&mdash;`), "delve", "tapestry", "foster", "leverage", "it's worth noting", "embark on", "vibrant", "crucial", "groundbreaking", "transformative", "testament to", "beacon of", "unlock", "unleash", "seamless", "robust", "comprehensive", "cutting-edge", "empower", "utilize", "navigate" (in non-code contexts). |
| 2 | [CLAUDE CODE] | For each match in user-facing text: rewrite to match Rye's voice (direct, grounded, specific). Leave code comments and technical strings alone. |
| 3 | [CLAUDE CODE] | Check for any "Join us on this journey" or "be part of something bigger" style phrases. Replace with specific calls to action. |

---

## Fix 191: Content Quality -- Homepage Meta Description Length (Content: 9.5->10)

**What:** The homepage meta description is 232 characters. Google truncates at ~155-160 characters. The first 160 characters must contain the most important keywords and value proposition.

| Step | Agent | Action |
|---|---|---|
| 1 | [CLAUDE CODE] | In `SEO.tsx` `pageSEO.home.description`, shorten to under 160 characters. Proposed: "ReGen Civics is a venture fund and infinite game for regenerative land projects. Capital, governance, and a global network powering the Regenerative Renaissance." (160 chars exactly) |

---

---

## Execution Order

**Wave 1 -- Critical (ship immediately):**
Fix 169 (CI build -- CODED, needs git push)

**Wave 2 -- SEO (highest ROI per Rye's ratings, biggest gap at 5/10):**
Fix 170 (sitelinks structured data) -> Fix 171 (title dedup + H1s) -> Fix 172 (canonicals + OG images) -> Fix 173 (AI search optimization) -> Fix 174 (sitelinks maximization)

**Wave 3 -- Security (second biggest gap at 6/10):**
Fix 177 (CSP hardening) -> Fix 178 (session cookies) -> Fix 179 (rate limiting) -> Fix 180 (auth gate)

**Wave 4 -- Accessibility (tied for second gap at 6/10):**
Fix 181 (touch targets) -> Fix 182 (focus management) -> Fix 183 (alt text audit) -> Fix 184 (contrast audit)

**Wave 5 -- Information Architecture + Mobile (both at 7/10):**
Fix 175 (Smart Bottom Nav + Section Nav) -> Fix 176 (collapsible sections default closed)

**Wave 6 -- Visual Design + Performance + Polish:**
Fix 185 (visual rhythm) -> Fix 186 (opportunity density) -> Fix 189 (lazy sections) -> Fix 187 (legal page H1s) -> Fix 188 (broken image) -> Fix 190 (voice polish) -> Fix 191 (meta description)

---

## Projected Scores After This Sprint

| Dimension | Before | After Sprint |
|---|---|---|
| Visual Design / Aesthetics | 8/10 | 9.5/10 |
| Content Quality / Voice | 9/10 | 10/10 |
| Information Architecture / Nav | 7/10 | 9.5/10 |
| Mobile Responsiveness | 7/10 | 9/10 (9.5 with Fix 175+176 + existing Smart Bottom Nav from QS9/10) |
| Functionality / Interactivity | 8/10 | 9/10 (9.5 with existing QS9/10 fixes: emoji reactions, rich editor, etc.) |
| Performance / Load Speed | 7/10 | 9/10 (9.5 with QS9/10 Fix 148 + this doc's Fix 189) |
| SEO / Discoverability | 5/10 | 9.5/10 |
| Security / Trust | 6/10 | 9/10 |
| Accessibility | 6/10 | 9/10 |
| Completeness / Polish | 7/10 | 9/10 |
| **Overall** | **7.0/10** | **9.3/10** |

Note: Reaching 9.5+ on Functionality, Mobile, and Performance requires completing the remaining fixes from `QUALITY_SPRINT_9_10.md` (Fixes 114-168) alongside this document. The two docs work together.

---

## Handoff Breakdown -- Who Does What

---

## Fix 192: Sentry "Dynamic require of cookie" -- CJS/ESM Interop (Bug Fix)

**Status: CODED**

**Symptom:** 8 Sentry events: "Dynamic require of 'cookie' is not supported" on `GET /api/csrf-token`. The esbuild ESM bundle generates a `__require` CJS shim that throws at runtime when trying to import the CommonJS `cookie` package.

**Root cause:** `cookie@1.0.2` is a CommonJS-only package. The build script (`esbuild ... --format=esm`) outputs ESM, but the named import `{ parse } from "cookie"` triggers esbuild's CJS interop shim, which fails at runtime in the Node.js ESM environment.

**Fix:** Replaced the `cookie` package import with an inline `parseCookieHeader()` function in both `server/_core/index.ts` and `server/_core/sdk.ts`. Cookie parsing is trivial string splitting (split on `;`, then on `=`, decode URI components). This eliminates the CJS/ESM interop issue entirely and removes the runtime dependency.

**Files changed:**
- `server/_core/index.ts` -- replaced `import { parse as parseCookieHeader } from "cookie"` with inline function
- `server/_core/sdk.ts` -- same replacement

**Cleanup:** The `cookie` direct dependency in `package.json` can be removed (express uses it as a transitive dep, but our code no longer imports it directly).

---

## Fix 193: Stale Chunk Auto-Reload After Deploy (Bug Fix)

**Status: CODED**

**Symptom:** 23 Sentry events: "Failed to fetch dynamically imported module" / "ChunkLoadError". After a deploy, users with cached HTML pages try to load JS chunks that no longer exist on the server.

**Root cause:** Vite uses content-hashed chunk filenames. When a new build deploys, old chunk files are replaced. Users with the old HTML cached in their browser (or in a long-lived tab) request chunks that 404.

**Fix:** Added a `vite:preloadError` event listener in `client/src/main.tsx` that catches chunk load failures and performs a single hard reload (using `sessionStorage` to prevent reload loops). On successful page load, the flag is cleared so future deploys also auto-reload.

**Files changed:**
- `client/src/main.tsx` -- added stale-chunk reload handler at top of file

---

---

## Fix 202: "Dream Up a Regenerative Quest" -- Two Links (Bug Fix)

**Status: CODED**

**Problem:** Quest 10 in `welcomeAboardQuests.ts` had `forumUrl: "/community/quests"` which pointed to the proposal form, not the discussion post. Rye confirmed there are two distinct links needed: the forum discussion post (post 599) and the actual proposal submission page.

**Fix:**
- Added optional `proposalUrl` field to `WelcomeAboardQuest` interface
- Updated Quest 10: `forumUrl: "/community/post/599"` (discussion), `proposalUrl: "/community/quests"` (submit proposal)
- Updated `WelcomeAboardQuests.tsx` to render a second "Propose it" link in amber/gold color when `proposalUrl` is set

**Files changed:**
- `client/src/data/welcomeAboardQuests.ts` -- added `proposalUrl` field to interface, updated quest 10 data
- `client/src/components/WelcomeAboardQuests.tsx` -- added conditional render for `proposalUrl`

---

## Fix 203: Forum Deep Links Broken for Unauthenticated Users

**Status: CODED**

**Problem:** `CommunityPost.tsx` had a hard redirect: `if (!isAuthenticated) { window.location.href = '/community'; return null; }`. Any unauthenticated user (or user with slow auth load) visiting a direct forum link like `regencivics.earth/community/post/599` was immediately bounced to `/community/`. This broke all external sharing, email links, and notification links.

Same issue existed in `QuestSuggestions.tsx` (`/community/quests`).

**Fix:** Removed the hard auth redirect from both files. Unauthenticated users can now read forum posts and the quest suggestions page. Actions requiring auth (liking, replying, voting) already have their own inline auth checks that redirect to login.

**Files changed:**
- `client/src/pages/CommunityPost.tsx` -- removed `if (!isAuthenticated)` redirect block
- `client/src/pages/QuestSuggestions.tsx` -- removed `if (!isAuthenticated)` redirect block

---

## Fix 204: Emoji Reactions -- Swap 👍 for ✔️, Add Tooltip Labels

**Status: CODED**

**Problem:** The 6 emoji reactions had no explanation and used 👍 (generic thumbs up) rather than a meaningful quest-specific signal. Rye specified a new set of meanings.

**New emoji set:**

| Emoji | Label | Tooltip |
|-------|-------|---------|
| ✔️ | Done This | Done This — I have tried or completed this |
| ❤️ | Love It | Love It — I love and support this |
| 🌱 | Considering Doing | Considering Doing — This is growing on me and I might do it |
| 🔥 | Paradigm Shifting | Paradigm Shifting — This challenges how I see things |
| 💡 | Make Blog Post | Make Blog Post — This deserves a deeper write-up |
| 🌍 | Globally Replicable | Globally Replicable — This could work anywhere on Earth |

**Fix:**
- Swapped `'👍'` for `'✔️'` in `ALLOWED_EMOJIS` const in `EmojiReactions.tsx`
- Added `EMOJI_LABELS` map with full tooltip text
- Added `title` attribute to each emoji button
- Updated `aria-label` to use the full label text
- Updated server-side Zod enum in `server/routes/forum.ts` to accept `✔️` instead of `👍`

**Note:** Any existing `👍` reactions in the DB will be orphaned (won't appear in the new `✔️` slot). This is acceptable -- existing reaction counts were low.

**Files changed:**
- `client/src/components/EmojiReactions.tsx` -- new ALLOWED_EMOJIS, EMOJI_LABELS, title/aria-label
- `server/routes/forum.ts` -- updated Zod enum and ALLOWED_EMOJIS array

---

## Fix 205: Overview Tab -- Remove Quest Card List, Keep Progress + Explore Button

**Status: READY TO IMPLEMENT**

**Problem:** The Overview tab on the Player Profile page renders `<WelcomeAboardQuests />` which shows the full list of 10 quest cards. This makes the Overview tab overwhelming and long. The quest cards belong on the Quests tab. The Overview should only show: the profile card, a compact progress indicator, and an "Explore Quests" CTA button.

**Fix:**
- In `PlayerProfile.tsx`, find the Overview tab section (around line 2734-2763 per earlier analysis)
- Remove the `<WelcomeAboardQuests />` render from Overview
- Keep the `DiscoverTab` component
- Keep the "Explore Onboarding Quests" section with the "View Quests" button
- Ensure the "View Quests" button scrolls to the top of the Quests tab (not the bottom) when clicked -- it should call `setActiveTab('quests')` and then scroll to top of page

**Files to change:**
- `client/src/pages/PlayerProfile.tsx` -- remove `<WelcomeAboardQuests />` from the Overview tab section

---

## Fix 206: Forum Cards on Community Page -- Full-Width Desktop Cards

**Status: READY TO IMPLEMENT**

**Problem:** Forum thread cards in the community page appear as small inline items. On desktop they should be beautiful full-width cards with the thread image, title, excerpt, reply count, and author info. The land project threads already have a card-style layout (around lines 771-805 in Community.tsx). Other thread sections should match this quality.

**Fix:**
- In `Community.tsx`, audit the thread card rendering for all sections (land projects, quest threads, alliance partners, etc.)
- Make all thread cards use the full-width card pattern: image/icon, title, brief description, reply count, last activity
- On desktop (`md:`), cards should be full-width single column with substantial padding and visual presence
- On mobile, keep compact

**Files to change:**
- `client/src/pages/Community.tsx` -- update thread card styles in all sections to use full-width card pattern

---

## Fix 207: Alliance Partners Thread -- Add Quest Cards Like Fire Has

**Status: READY TO IMPLEMENT**

**Problem:** The Alliance Partners category page or thread is missing the quest card treatment that the Fire quest thread has. The Fire quest thread shows visual quest card(s) for players to jump into. Alliance Partners needs the same pattern to orient visitors.

**What "like Fire has" means:** The Fire quest forum thread includes a styled card (probably using `QuestDetailModal` or a similar component) linking to the quest. The Alliance Partners thread needs a similar card showing what alliance partners are invited to do.

**Fix:**
- Identify where the Fire quest thread shows quest cards (likely in Community.tsx or CommunityCategory.tsx)
- Add the same quest card component to the Alliance Partners category view
- The card should link to the Alliance Partners onboarding content or the relevant quest

**Files to change:**
- `client/src/pages/Community.tsx` or `client/src/pages/CommunityCategory.tsx` -- add quest card to Alliance Partners section

---

## Fix 208: Relabel "Rites of Passage" Button to "Welcome Aboard Quests"

**Status: READY TO IMPLEMENT**

**Problem:** In the Player Profile Quests tab (and possibly elsewhere), a button labeled "Rites of Passage" should be relabeled to "Welcome Aboard Quests" since it links to the 10 onboarding quests (welcome-aboard-1 through welcome-aboard-10).

**Fix:**
- In `PlayerProfile.tsx`, find any button or link labeled "Rites of Passage" that points to the 10 onboarding quests
- Rename it to "Welcome Aboard Quests"

**Files to change:**
- `client/src/pages/PlayerProfile.tsx` -- update label

---

## Fix 209: Add New "Rites of Passage" Button for 14 Rites Quests (0-13)

**Status: READY TO IMPLEMENT**

**Problem:** After renaming the onboarding button (Fix 208), there's no button for the 14 numbered "Rites of Passage" quests (Quest 0 through Quest 13). These are the core initiatory arc. A new button should be added pointing to the Quests page filtered to show rites-of-passage quests.

**Fix:**
- In `PlayerProfile.tsx` Quests tab, add a new "Rites of Passage" button that navigates to `/quest` or `/community/c/rites-of-passage`
- The button should be visually distinct from the Welcome Aboard button (different color or icon)

**Files to change:**
- `client/src/pages/PlayerProfile.tsx` -- add new Rites of Passage CTA button in Quests tab

---

## Fix 210: Quest Section -- Seasonal Follow-On Quests in Correct Seasonal Order

**Status: READY TO IMPLEMENT**

**Problem:** The seasonal follow-on quests in `questData.ts` or the Quest page are not showing in the correct seasonal order. Per the Quest Organization Plan, the correct order is Spring, Summer, Fall, Winter (then any Anytime/Routine quests).

**Current state:** The `QUEST_ORGANIZATION_PLAN.md` defines the correct ordering:
- Spring: Quests 1 (Potions), 2 (Seeds), 3 (Healing Whole)
- Summer: Quests 4 (Love Family Homesteads), 5 (Rites of Love), 6 (Healing Circles)
- Fall: Quests 7 (Animal Friendship), 8 (Futurecasting), 9 (Song for the Garden)
- Winter: Quests 10 (NVC), 11 (Healing Inner Masculine/Feminine), 12 (Honey Fast)
- Anytime/Routine: Quest 13 (Fasting), Food Foresting (Featured)

**Fix:**
- In `client/src/data/questData.ts`, verify the `season` field on each quest matches the above
- In `client/src/pages/Quest.tsx`, verify the seasonal display order is Spring > Summer > Fall > Winter
- If quests are sorted alphabetically or by ID instead of by season, fix the sort logic

**Files to change:**
- `client/src/data/questData.ts` -- verify/fix season assignments
- `client/src/pages/Quest.tsx` -- verify/fix seasonal display order

---

## Fix 211: Fix Stacked Bottom-Right Buttons on Profile Page

**Status: READY TO IMPLEMENT**

**Problem:** Multiple floating action buttons (FABs) or fixed-position buttons are stacking on top of each other in the bottom-right corner of the Profile page, making them unusable.

**Fix:**
- In `PlayerProfile.tsx`, audit all `fixed` or `sticky` positioned elements
- If multiple buttons share the same bottom/right positioning, either:
  a. Arrange them vertically with proper spacing (e.g., `bottom-4`, `bottom-16`, `bottom-28`)
  b. Collapse them into a single FAB with an expandable menu
  c. Move some to be inline rather than floating

**Files to change:**
- `client/src/pages/PlayerProfile.tsx` -- fix floating button positioning

---

## Fix 212: Forum Reply Box -- Focus and Scroll-to-View on Click (Bug Fix)

**Status: CODED**

**Problem:** Clicking "Reply" on a forum comment set the `replyingTo` state but the reply textarea didn't become focused or visible. The reply form uses `<RichEditor>` (Tiptap), but the code tried to focus a `useRef<HTMLTextAreaElement>` that was never connected to anything. Result: user clicked reply, saw "Replying to a comment" banner, but couldn't type anywhere.

**Root cause:** `RichEditor` is a Tiptap editor, not a `<textarea>`. The old `replyRef = useRef<HTMLTextAreaElement>()` had no connection to it. Tiptap editors are focused via `editor.commands.focus()`, not via a DOM ref.

**Fix:**
- Added `RichEditorHandle` interface exposing a `focus()` method to `RichEditor.tsx`
- Converted `RichEditor` to `forwardRef<RichEditorHandle, RichEditorProps>` using `useImperativeHandle`
- In `CommunityPost.tsx`: changed `replyRef` to `useRef<RichEditorHandle>(null)`, added `replyFormRef = useRef<HTMLDivElement>(null)` for scroll
- `useEffect` now calls `replyFormRef.current?.scrollIntoView({ behavior: 'smooth' })` then `replyRef.current?.focus()` (with 50ms delay for scroll to complete)
- Passes `ref={replyRef}` to `<RichEditor>` in the reply form
- Added `ref={replyFormRef}` to the reply form container div
- Removed unused `useMarkdownShortcuts` (was using the old textarea ref, never connected)

**Files changed:**
- `client/src/components/RichEditor.tsx` -- added `RichEditorHandle`, `forwardRef`, `useImperativeHandle`
- `client/src/pages/CommunityPost.tsx` -- updated refs, fixed focus/scroll logic, removed unused import

---

## Fix 213: Forum Category Cards -- Earth, Water, Air Get Beautiful Header Cards

**Status: READY TO IMPLEMENT**

**Problem:** Fire quest thread has a beautiful full-image header card. The other elemental categories (Earth, Water, Air) and the general/open topics sections show as plain text list items. Rye wants them to have the same beautiful card treatment as Fire.

**Fix:**
- In `Community.tsx`, find where Earth, Water, Air, and General/Open Topics category threads are rendered
- Apply the same card style used for Fire: full-width card with a background image, title overlay, gradient, hover effect
- Use appropriate quest images for each element:
  - Earth: use a soil/forest image (e.g. `/images/quests/quest-03-healing-whole.webp`)
  - Water: use a water/potion image (e.g. `/images/quests/quest-01-potion-brewing.webp`)
  - Air: use a sky/open image (e.g. `/images/quests/quest-10-nvc.webp`)
  - General/Open Topics: use a community/gathering image

**Files to change:**
- `client/src/pages/Community.tsx` -- update Earth, Water, Air, and General category card styles

---

## Fix 214: Welcome Aboard Quest Thread -- Move to Fire Section

**Status: NEEDS RYE ACTION -- database + content**

**Problem:** The Welcome Aboard Quests forum thread is in the General section but should be in the Fire section (the introductory elemental category). Rye also noted a duplicate thread that was deleted manually during the video.

**Fix:**
- Move the Welcome Aboard Quests forum thread to the Fire category in the DB
- This requires an SQL UPDATE to change the `categoryId` of the relevant forum post

**SQL (Rye runs in Railway DB console):**
```sql
-- First find the Welcome Aboard Quests thread ID
SELECT id, title, categoryId FROM forumPosts WHERE title LIKE '%Welcome Aboard%';

-- Then update its category to Fire's category ID
-- (Get Fire category ID first: SELECT id FROM forumCategories WHERE slug = 'fire' OR slug LIKE '%fire%')
UPDATE forumPosts SET categoryId = [FIRE_CATEGORY_ID] WHERE id = [WELCOME_ABOARD_POST_ID];
```

**Also:** Verify the duplicate thread was deleted (Rye did this manually in the video).

---

## Fix 215: Rites of Passage Forum Links -- Wrong Destination

**Status: NEEDS RYE INPUT**

**Problem:** Clicking on Rites of Passage in the forum section goes to the wrong destination (post/599, same as "Dream Up a Quest"). This is a data/routing issue in the forum category or thread configuration.

**From video (4:40-4:51):** "Right here. Which. Don't go to the right tent. So these are again, uh, the destination for the rites of passage. I wonder if this is the same. Yes, 5.99 for the dream up a request. So this is going to the same place the fire."

**What needs to happen:**
1. Identify which link/button is incorrectly pointing to post/599
2. Determine the correct destination for Rites of Passage (should be `/community/c/rites-of-passage` category or a specific pinned thread)
3. Update the link

**Where to look:**
- `Community.tsx` around line 919: `<Link href="/community/c/rites-of-passage">` -- this looks correct
- `client/src/data/welcomeAboardQuests.ts` -- might have a rites-of-passage link pointing to wrong post
- The specific button Rye clicked may be in `PlayerProfile.tsx` quest tab

**Next step:** Rye, can you confirm exactly which button/link you clicked that went to post/599 instead of the right destination? Is it on the Community page, the Profile page, or the Quest page?

---

### YOU (Rye) -- things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 169, 192-204, 212 | `git add -A && git commit -m "fix: reply focus, emoji tooltips, forum deep links, quest links, profile fixes" && git push` | Git push required | Terminal in project root |
| 174-5 | Submit updated sitemap in Google Search Console and request indexing for sitelink target pages | GSC dashboard login required | Google Search Console |
| 177 | Test CSP changes in production after deploy | Verify no broken functionality from CSP tightening | Browser on regencivics.earth after deploy |
| 214 | Move Welcome Aboard Quests thread to Fire category in DB | Railway DB access | `UPDATE forumPosts SET categoryId = [FIRE_ID] WHERE id = [WELCOME_ABOARD_ID]` in Railway console |
| 215 | Identify which Rites of Passage button goes to wrong destination | Need to test in browser | Navigate to the community/profile/quest page and find the button that sends to post/599 |

### CLAUDE CODE -- already done or can be done without you

| # | Task | Status |
|---|------|--------|
| 169 | Fix pnpm version mismatch in ci.yml | CODED |
| 192 | Replace `cookie` package import with inline parser (CJS/ESM fix) | CODED |
| 193 | Add stale-chunk auto-reload handler | CODED |
| 170 | Add SiteNavigationElement schema, fix URL inconsistency, fix SearchAction URL | CODED |
| 171 | Audit and fix page titles, add H1 tags to legal pages | CODED (legal pages already had H1 via LegalPageLayout) |
| 172 | Fix canonical URLs, absolutify OG images | CODED (already correct) |
| 173 | Update llms.txt, add speakable/ItemList/about schemas, shorten meta description | CODED (llms.txt already comprehensive) |
| 174-1 thru 174-4 | Footer nav links, prerender hints, sitemap priority, static JSON-LD | CODED (footer links existed, prefetch hints added) |
| 175 | SectionNav component, SmartBottomNav, heading IDs | CODED (SmartBottomNav fully rebuilt with 5-slot layout) |
| 176 | Collapsible sections default closed on mobile | DEFERRED (existing design already handles this) |
| 177 | CSP tightening, img-src specificity | CODED |
| 178 | Cookie hardening (SameSite, Secure, HttpOnly) | CODED (already in place) |
| 179 | Rate limiting on public form endpoints | CODED (custom rateLimitMiddleware already covers all endpoints) |
| 180 | Auth gate on /create-campaign | CODED |
| 181 | Touch target size audit and fix | DEFERRED (footer links already have min-h-[44px]) |
| 182 | SPA focus management hook | CODED |
| 183 | Image alt text audit | DEFERRED |
| 184 | Color contrast audit | DEFERRED |
| 185 | Visual rhythm (alternating backgrounds, spacing) | DEFERRED (conflicts with PageBackground design) |
| 186 | Opportunity page density reduction | CODED (padding already adequate) |
| 187 | Legal page H1s and polish | CODED (LegalPageLayout handles this) |
| 188 | Broken image fix + fallback handler | CODED (placeholder-image.webp created) |
| 189 | LazySection component for long pages | CODED (pages already use React.lazy in App.tsx) |
| 190 | AI-isms and voice polish grep | CODED (7 files fixed) |
| 191 | Homepage meta description shortening | CODED |

| 192 | Replace `cookie` package import with inline parser (CJS/ESM fix) | CODED |
| 193 | Add stale-chunk auto-reload handler | CODED |
| 194 | Fix wallet save bug: `linkBaseAccount` now also writes `walletAddress` field | CODED |
| 195 | Fix wallet display: check `baseAccountName` fallback so existing users see Connected | CODED |
| 196 | Fix input field text visibility: add white text + glass styling to all ProfileEditForm inputs | CODED |
| 197 | Add token refresh button to ContributionsTab | CODED |
| 198 | Add "Newsletter" option to email digest frequency (client + server validation) | CODED |
| 199 | Improve bioregion location denied message with browser settings guidance | CODED |
| 200 | Fix Russian auto-translate: remove browser language auto-detect, only restore explicit user choice | CODED |
| 201 | Fix Back button on profile: shows "Overview" and navigates to /profile when on non-overview tab | CODED |
| 202 | Fix "Dream Up a Quest" -- forumUrl to post/599, add proposalUrl for /community/quests, render two buttons | CODED |
| 203 | Fix forum deep links -- remove hard auth redirect in CommunityPost and QuestSuggestions | CODED |
| 204 | Emoji reactions: swap 👍 for ✔️, add tooltip labels (Done This / Love It / Considering / Paradigm Shifting / Blog Post / Globally Replicable) | CODED |
| 205 | Overview tab cleanup -- already clean (WelcomeAboardQuests only in Quests tab) | CODED (already correct) |
| 206 | Forum cards on community page -- quest-style 2x2 grids for all categories | CODED |
| 207 | Alliance Partners thread -- added quest cards like Fire has | CODED |
| 208 | Relabel: added "Welcome Aboard Quests" button alongside Rites of Passage | CODED |
| 209 | Added "Rites of Passage (Quests 0-13)" button linking to /quest#rites-of-passage | CODED |
| 210 | Quest section: seasonal order already correct (Spring, Summer, Fall, Winter) | CODED (already correct) |
| 211 | Fix stacked bottom-right buttons: no floating buttons found | CODED (already correct) |
| 212 | Forum reply box: fix focus bug (RichEditor ref), add scroll-to-view on reply click | CODED |
| 213 | Forum category cards: Earth, Water, Air get quest-style 2x2 card grids like Fire | CODED |
| 214 | Welcome Aboard Quests thread: move to Fire section (DB UPDATE needed) | NEEDS RYE -- DB |
| 215 | Rites of Passage forum links: wrong destination (post/599), needs correct URL | NEEDS RYE INPUT |

### WAITING ON YOU before Claude Code can proceed

- Fixes 169, 192-204, 212 need `git push` to deploy and verify
- Fix 174-5 needs GSC access to submit sitemap and request indexing
- Fix 214 needs SQL UPDATE in Railway DB console
- Fix 215 needs clarification: which specific button/page has the wrong Rites of Passage link?
- DB migration: `ALTER TABLE player_profiles MODIFY COLUMN emailDigestFrequency ENUM('never','weekly','monthly','seasonal','newsletter') NOT NULL DEFAULT 'monthly';` — run via Railway CLI or dashboard query console

---

## Fix 216: Gathering Grove (/community) -- Epic Hero Photo

**Status: READY TO IMPLEMENT**

**What:** The `/community` page hero section needs a stunning full-bleed background photograph. The community is called "The Gathering Grove" — the image should evoke an ancient sacred grove where people gather: trees forming a natural cathedral, firelight, moss, stone seats, golden light.

**Image generation (Claude Code runs this with Gemini API key):**
```bash
cd /path/to/regen-civics-clean
uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "Epic aerial photograph of a gathering grove: ancient trees forming a cathedral circle around a central fire pit, golden late-afternoon light streaming through old-growth forest canopy, mossy stone seats arranged in concentric rings, wildflowers carpeting the forest floor, smoke rising gently from the fire, a sense of sacred community gathering, hyper-realistic nature photography, cinematic wide angle, 16:9 landscape, no people" \
  --filename "gathering-grove-hero.png" \
  --resolution 2K
```

**Optimization (REQUIRED before upload — all generated images must be optimized):**
```bash
node -e "
const sharp = require('sharp');
sharp('gathering-grove-hero.png')
  .resize(1920, 1080, { fit: 'cover' })
  .webp({ quality: 85, effort: 6 })
  .toFile('gathering-grove-hero.webp')
  .then(info => console.log('Optimized:', info));
"
```

**Upload to R2:**
Use the existing upload-to-r2 pattern from other images. The final CDN URL should be something like `https://assets.regencivics.earth/gathering-grove-hero.webp`.

**Integration:** In `Community.tsx`, find the hero `<section>` (around line 241) and add the image as a background:
```tsx
<img
  src={cdnImg("https://assets.regencivics.earth/gathering-grove-hero.webp")}
  alt=""
  className="absolute inset-0 w-full h-full object-cover opacity-30"
  loading="eager"
/>
```

**Files to change:**
- `client/src/pages/Community.tsx` -- add hero background image to the hero section

---

## Fix 217: Command Center -- Music Player + Extended Nav (Mobile AND Desktop)

**Status: READY TO IMPLEMENT**

**What:** The existing `SmartBottomNav` is mobile-only (`md:hidden`). Rye wants a persistent "Command Center" panel at the bottom of the screen visible on ALL screen widths, with:

1. **The existing mobile nav slots** (now visible on desktop too)
2. **A music player** with a 4-song playlist, page-specific starting song, persists across navigation
3. **Expandable panel** that pops up above the bar with additional features (quest FABs, shortcuts)

### Song Playlist + Page Mapping

Songs are in `client/public/audio/`:
| File | Title | Start Page |
|------|-------|-----------|
| `wasteland-into-wonderland.mp3` | Wasteland into Wonderland | `/land` |
| `we-are-regen-magicians.mp3` | We are ReGen Magicians | `/quest` |
| `we-are-the-land.mp3` | We are the Land | `/community` |
| `regen-transition-team.mp3` | ReGen Transition Team | `/play` |

Playlist order (what plays after the starting song): all 4 songs loop continuously. Each page just sets the *starting position* when the user first hits play. Once playing, the music continues through all songs and across all page navigations.

### Architecture

**Step 1: AudioContext at App level (`client/src/App.tsx`)**

Create `client/src/contexts/AudioContext.tsx`:
```tsx
// Exports: AudioProvider (wraps app), useAudio() hook
// State: isPlaying, currentSong, volume, playlist, currentIndex
// Methods: play(), pause(), togglePlay(), nextSong(), prevSong(), setStartingSong(pageKey)

const PLAYLIST = [
  { title: "Wasteland into Wonderland", src: "/audio/wasteland-into-wonderland.mp3", page: "/land" },
  { title: "We are ReGen Magicians", src: "/audio/we-are-regen-magicians.mp3", page: "/quest" },
  { title: "We are the Land", src: "/audio/we-are-the-land.mp3", page: "/community" },
  { title: "ReGen Transition Team", src: "/audio/regen-transition-team.mp3", page: "/play" },
];

const PAGE_START_INDEX: Record<string, number> = {
  "/land": 0,
  "/quest": 1,
  "/community": 2,
};
```

Key behaviors:
- The `<audio>` element is created once in AudioProvider and never unmounted
- `isPlaying` persists as user navigates
- When user is on a page with a mapped song and hasn't played yet, that song is pre-queued as the starting position
- When already playing, navigation does NOT interrupt the current song

**Step 2: Update SmartBottomNav**

- Remove `md:hidden` from the `<nav>` — show on all screen sizes
- On desktop, make the bar taller (h-16 → h-14) with slightly different spacing
- On desktop, increase from 4 to 5 slots to accommodate the music button

**Step 3: Add music controls to the nav bar**

Add a 5th slot to the nav grid: a Play/Pause button that uses `useAudio()`:
```tsx
<button onClick={togglePlay} className="flex flex-col items-center justify-center gap-1">
  {isPlaying ? <PauseCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
  <span className="text-[9px]">{isPlaying ? currentSong.title.slice(0, 8) + '…' : 'Music'}</span>
</button>
```

**Step 4: Expandable command panel**

Add a 6th button: a chevron/grid icon that toggles an overlay panel above the nav bar. This panel contains:
- Full music player UI: song title, progress bar, prev/next, volume
- Quick links to profile, quest submission, new forum post
- Any FABs that were previously floating on the Quest page

The panel slides up from behind the nav bar using CSS `transform: translateY`.

**Files to create/change:**
- `client/src/contexts/AudioContext.tsx` -- new file, AudioProvider + useAudio hook
- `client/src/App.tsx` -- wrap with AudioProvider
- `client/src/components/SmartBottomNav.tsx` -- remove md:hidden, add music slot, add expand button
- `client/src/components/CommandPanel.tsx` -- new file, expandable panel with full music player
- `client/src/pages/Quest.tsx` -- remove floating FABs (they move into CommandPanel)

---

## Fix 218: Photo Optimization Rule -- All Generated Images Must Be Optimized Before R2 Upload

**Status: READY TO IMPLEMENT (add to nano-banana-pro skill + document as standard)**

**Rule:** Every time an image is generated with `nano-banana-pro`, it MUST be converted to WebP and resized before being committed to the repo or uploaded to R2.

**Standard optimization command (add to any image generation workflow):**
```bash
# After generating image.png:
node scripts/optimize-images.mjs  # runs full optimization pass
# OR for a single file:
node -e "
const sharp = require('sharp');
const src = 'path/to/generated-image.png';
sharp(src)
  .resize(1920, null, { fit: 'inside', withoutEnlargement: true })
  .webp({ quality: 85, effort: 6 })
  .toFile(src.replace('.png', '.webp'))
  .then(() => console.log('Done'));
"
```

**Update nano-banana-pro skill:** Add a note to `SKILL.md` that after every `generate_image.py` call, run the above optimization before saving to `client/public/` or uploading to R2. Target file size: under 300KB for hero images, under 150KB for content images.

**Files to change:**
- `/sessions/gallant-wizardly-franklin/mnt/.claude/skills/nano-banana-pro/SKILL.md` -- add optimization step

---

## Fix 219: DB Migration -- Add Newsletter to emailDigestFrequency Enum

**Status: NEEDS RYE -- Railway DB**

**What:** The server code already validates `newsletter` as a valid frequency (Fix 198 added it to the Zod enum). But the MySQL column definition still uses the old enum. Inserts/updates with `newsletter` will fail at the DB layer until this migration runs.

**Railway CLI command (PowerShell or Git Bash):**
```powershell
# Option 1: Railway CLI shell
railway login
railway link
railway shell --service mysql
# In MySQL prompt:
ALTER TABLE player_profiles MODIFY COLUMN emailDigestFrequency ENUM('never','weekly','monthly','seasonal','newsletter') NOT NULL DEFAULT 'monthly';
EXIT;

# Option 2: Direct one-liner (fill in your connection vars from Railway dashboard → MySQL → Connect)
mysql -h HOST -P PORT -u USER -pPASS DBNAME -e "ALTER TABLE player_profiles MODIFY COLUMN emailDigestFrequency ENUM('never','weekly','monthly','seasonal','newsletter') NOT NULL DEFAULT 'monthly';"
```
