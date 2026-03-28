# Claude Code: Final Polish Round

**Context:** A full-site audit was just completed across 21 pages on both desktop (1707px) and mobile (400px). Zero broken images were found across the entire site (the Fix 1 cdnImg import fix resolved the mass image breakage). Form components (label, input, textarea, select) have already been updated with dark text colors and 44px minimum heights. These changes are in the working tree, uncommitted.

**Reference files:**
- `FINAL_PUSH_V1_MARCH_2026.md` -- master audit doc (Rye is actively editing, don't overwrite)
- `VERIFICATION_REPORT_2026_03_23.md` -- latest verification results
- `CLAUDE_CODE_HANDOFF.md` -- tech stack context and phase plan

---

## PHASE 1: COMMIT PENDING CHANGES + GENERATE BLOG IMAGE

### 1a. Commit the form component updates
These files were already edited and are in the working tree:
- `client/src/components/ui/label.tsx` -- added `text-[#1a472a]`
- `client/src/components/ui/input.tsx` -- added `text-[#1a472a]`, `placeholder:text-[#1a472a]/50`, `min-h-[44px] h-11`
- `client/src/components/ui/textarea.tsx` -- added `text-[#1a472a]`, `placeholder:text-[#1a472a]/50`
- `client/src/components/ui/select.tsx` -- added `text-[#1a472a]`, `data-[placeholder]:text-[#1a472a]/50`, `data-[size=default]:h-11 data-[size=default]:min-h-[44px]`

Commit message: "fix: darken form labels/inputs for readability, increase touch targets to 44px"

### 1b. Generate blog-games-quests.jpg
The only broken image on the entire site. Blog post: "Introducing Games and Quests: Play Your Way to Regeneration" (post ID 7 in `client/src/data/blogPosts.ts` line 441).

Use the `regen-content-image` skill to generate an image for this blog post about the ReGen Games and Quests system -- quest cards, token mechanics, player progression. Upload to R2 as `blog-games-quests.jpg`.

---

## PHASE 2: LAYOUT FIXES (HIGH IMPACT)

### 2a. /seasons -- SKIP, Rye verified this is fine as-is

### 2b. /opportunity collapsible sections start open on mobile
**File:** `client/src/pages/Opportunity.tsx`
**Problem:** The page is 47,505px on mobile (56 screens). It already has collapsible sections, but they all default to open. On mobile, they should default to closed so the user can scan section headers and expand what they need.
**Fix:** Find the collapsible/expandable section state and set `defaultOpen={false}` (or equivalent) when viewport is mobile. On desktop they can stay open. Use a media query or `useMediaQuery` hook to differentiate. Key info (fund overview, LOI CTA, key metrics) should remain visible without expanding anything.

### 2c. Touch targets -- REMOVED (acceptable for now)

---

## PHASE 3: SECURITY HARDENING

### Fix 8 - CSP Header
**File:** `server/_core/security.ts`
Remove `unsafe-inline` and `unsafe-eval` from CSP. Use nonces for inline scripts if needed.

### Fix 9 - Session Cookie
**File:** `server/_core/oauth.ts`
Add `SameSite=Strict` (or `Lax` if cross-origin OAuth requires it) to session cookies.

### Fix 10 - Path Traversal
**File:** `server/_core/security.ts`
Validate file paths don't contain `..` sequences. Use `path.resolve()` and verify the resolved path is within allowed directories.

### Fix 11 - Sanitization
**File:** `server/_core/security.ts`
Add `style`, `iframe`, `object`, `embed` to sanitized tags.

### Fix 12 - File Upload MIME
**File:** `server/_core/security.ts`
Validate MIME type against allowed list (image/jpeg, image/png, image/webp) on file uploads.

### Fix 13 - JWT Secret
**File:** `server/webhooks/riverside.ts`
Remove fallback to weak JWT secret. Require the env var or fail loudly.

### Fix 14 - Rate Limiting
**Files:** `server/routes/investors.ts`, `server/routes/newsletter.ts`, `server/routes/applications.ts`
Add rate limiting to public form submission endpoints.

### Fix 95 - /create-campaign auth gate
**File:** `client/src/pages/CreateCampaign.tsx`
Add auth redirect (like other protected pages) AND a password gate requiring "222" (copy pattern from `AdminModeration.tsx`).

---

## PHASE 4: SEO + META

### Fix 129 - OG Images
**File:** `client/src/lib/seo.ts` or wherever pageSEO is defined
Change OG image URLs from relative to absolute (prefix with `https://regencivics.earth`).

### Fix 134 - 404 Page
Add `<meta name="robots" content="noindex">` and a proper page title to the NotFound component.

### Fix 137 - Missing pageSEO
Add pageSEO entries for: /loi, /calculator, /crowd-pooling, /socials, /showcase, /shape-next-session, /messages

### Fix 148 - JSON-LD Structured Data
Add Organization schema to homepage, WebSite schema, BreadcrumbList to key pages.

### Fix 156 - Canonical URLs
Add `<link rel="canonical">` to all public pages.

---

## PHASE 5: SMART MOBILE BOTTOM NAV (Feature)

This is a new feature, not a bug fix. The current bottom nav has 4 static tabs (Fund, Land, Ally, Play). Replace with a dynamic, personalized nav bar.

### Design Spec

**Read the full spec: `SMART_BOTTOM_NAV_SPEC.md`** -- contains the complete design, all path defaults, the adaptive learning algorithm, contextual CTA priority list, current-page awareness rules, edge cases, and implementation architecture.

**Quick summary:** 4 slots. Slot 1 is always Quests. Slots 2-3 start with path defaults then learn from visit behavior (blend kicks in after 2nd visit). Slot 4 is a contextual CTA that resolves itself (Submit LOI, Apply, Complete Profile, etc.). Never shows the current page. Long-press customization ships with v1.

**Files to create:**
- `client/src/hooks/useNavVisits.ts` -- visit tracking
- `client/src/hooks/useSmartNav.ts` -- slot computation + blend formula
- `client/src/hooks/useContextualCTA.ts` -- contextual action logic
- `client/src/components/SmartBottomNav.tsx` -- the nav component + long-press detection
- `client/src/components/NavCustomizeSheet.tsx` -- bottom sheet for slot customization

**Important:** Keep the current visual style (dark green bar, icon + label, active state highlight). The change is in WHAT shows up, not how it looks.

---

## PHASE 6: OTHER UX POLISH

### Fix 199 - Newsletter subscribe button
The newsletter "Subscribe" button in the footer is just a link to /connect. Make it an inline email input + submit button that actually subscribes.

### Fix 214 - Section navigation on long mobile pages
For pages over 10,000px on mobile (/quest, /governance, /game, /team, /opportunity, /fund), add a floating "jump to section" nav or sticky section headers.

### Fix 82 - Auth-gated pages show loading quotes
When a user hits a protected page while not logged in, show a clear "Please log in to access this page" message with a login button instead of generic loading quotes.

### Fix 104 - Back button on wrong pages
The "Back" button appears on pages where it shouldn't. Review which pages show BackButton and remove it from top-level navigation pages.

---

## VERIFICATION CHECKLIST

After making changes, verify:
1. `npm run build` succeeds with no errors
2. Site loads on both desktop and mobile
3. /blog page -- blog-games-quests.jpg now loads
4. /opportunity -- collapsible sections closed by default on mobile
5. /apply form -- labels are dark and readable
6. Footer links -- tap targets are 44px+
7. /create-campaign -- requires login + password "222"
8. Bottom nav -- shows correct defaults per path, visit tracking works

---

## WHAT NOT TO TOUCH

- Don't edit FINAL_PUSH_V1_MARCH_2026.md (Rye is actively editing it)
- Don't change /opportunity routing (/investor correctly redirects to /opportunity)
- Don't regenerate images that are already working (0 broken across 21 pages)
- Don't change the /fund page content structure (it works, just long)
- Don't change /seasons layout (Rye verified it's fine as-is)
