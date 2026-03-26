# Claude Code Handoff: Final Push to V1

**Date:** 2026-03-23
**Context:** Full CTO-level audit completed. 215 fixes identified. This document is your execution plan.
**Source:** `FINAL_PUSH_V1_MARCH_2026.md` has all fix details. This doc tells you HOW to execute them.
**Permissions:** Full autonomy. Do as much as possible without asking Rye. Only surface tasks when you literally cannot proceed.

---

## Before You Start

Read these files first:
1. `FINAL_PUSH_V1_MARCH_2026.md` (the audit, all 215 fixes with details)
2. `CLAUDE.md` (project conventions, writing rules, tech stack)
3. `QUALITY_SPRINT_9_10.md` (prior sprint context)
4. `CONTEXT_THE_TWO_GAMES.md` (Fund vs Game distinction, affects all copy)

## Tech Stack Quick Reference

- **Frontend:** React SPA, Wouter routing, tRPC client, Vite build
- **Backend:** Node.js/Express, tRPC server, Drizzle ORM
- **Database:** MySQL on Railway
- **Cache:** Redis on Railway
- **Storage:** Cloudflare R2 bucket `regen-civics-assets`, images served via `assets.regencivics.earth`
- **Image proxy:** `cdnImg()` in `client/src/lib/utils.ts` routes through `/api/img`
- **Hosting:** Railway (us-west2, europe-west4), 2 replicas
- **DNS/CDN:** Cloudflare
- **Error tracking:** Sentry
- **Prerendering:** Prerender.io (for SEO on SPA)

## Key Files Map

| Area | Files |
|------|-------|
| Routing | `client/src/App.tsx` (all routes) |
| Image data | `client/src/data/blogPosts.ts` |
| Image util | `client/src/lib/utils.ts` (cdnImg function) |
| Image component | `client/src/components/OptimizedImage.tsx` |
| Auth hook | `client/src/_core/hooks/useAuth.ts` |
| Auth dialog | `client/src/components/AuthDialog.tsx` |
| SEO component | `client/src/components/SEO.tsx` |
| Navigation | `client/src/components/Navigation.tsx` |
| tRPC server | `server/_core/trpc.ts` (procedure types) |
| Env validation | `server/_core/env.ts` |
| Admin page | `client/src/pages/Admin.tsx` (password pattern: "333") |
| Admin moderation | `client/src/pages/AdminModeration.tsx` (password pattern: "222") |
| Pages | `client/src/pages/*.tsx` (each route has its own page component) |

---

## Execution Plan: 6 Phases

Work through these phases in order. Each phase is designed to be a self-contained batch.

---

### PHASE 1: BROKEN IMAGES (The #1 Blocker)
**Fixes:** 184, 2, 164-167, 168-171
**Why first:** 42+ broken images across 8 pages. Nothing else matters if the site looks broken.

**Strategy:** Claude Code generated these images and stored them in R2 previously. Many R2 files may be corrupt (70B, 506B placeholders). The approach:

1. **Audit every image reference in the codebase** against R2 availability. Run a script that hits each `assets.regencivics.earth/{filename}` URL and checks HTTP status + content-length. Any file returning 404 or under 1KB is broken.

2. **For each broken image, regenerate it** using the `regen-content-image` skill. The skill is at `~/.claude/skills/regen-content-image/`. It contains:
   - The BASE_THEME prompt (solarpunk regenerative world)
   - Content-type prefixes (blog, quest, campaign, etc.)
   - The prompt building formula
   - Upload instructions

3. **Upload regenerated images to R2** using wrangler CLI:
   ```bash
   npx wrangler r2 object put regen-civics-assets/{filename} --file path/to/{filename}
   ```

4. **Image inventory (84 total referenced in codebase):**

   Blog images (in `client/src/data/blogPosts.ts`):
   - aVsQKWGuwteoFgZN.jpg, FKGvozofwEQExNFn.jpg, oOytrvQMLUZiZzfH.jpg
   - VeoRFkowiirBeXAr.jpg, qdJyCSVJGfSsRmxE.jpg, tqNnBHJUPspoSTxQ.jpg
   - blog-games-quests.jpg, tDFZAkfngdZZObWl.jpg, peaZcxlEiltihAJB.jpg
   - cqDpxrSObQEpPwSd.jpg, AMrdBIATsoXcSZbO.jpg, yFrwKokjZNoFvXuz.jpg
   - QoeFynHfnqeZcjzN.jpg, ptLdEEmSgyEQKzmF.jpg, wwnJXOsxkrlwtDre.jpg

   Quest images (dynamic: `quest-{padded-id}-{slug}.webp` in `quests/` directory)

   Page background/feature images: Referenced across 20 page components (Home, Fund, Game, Governance, Quest, Blog, Land, Play, Ally, Team, Seasons, Schedule, Connect, etc.)

   Full list of 84 filenames is in the codebase audit. Check each one.

5. **Optimize all regenerated images:**
   - Convert to WebP format
   - Resize to appropriate dimensions (hero: 1920px wide, card: 800px wide, thumbnail: 400px wide)
   - Target file size: hero < 200KB, card < 100KB, thumbnail < 50KB

---

### PHASE 2: CRITICAL MOBILE UX
**Fixes:** 161, 162, 163, 172, 70, 194, 196, 199, 214

These fixes have the highest impact on the mobile experience.

**Fix 161 - Path cards 2x2 grid:** NOTE: Screenshots show the path cards are ALREADY in a 2x2 grid on mobile. Verify this is working and mark as done if confirmed. Check `client/src/pages/Home.tsx` for the grid styles.

**Fix 162 - /opportunity empty on mobile:** The page has 2,332 lines of content in `client/src/pages/Opportunity.tsx` but renders with 0 height at 400px. Debug the CSS/JS that causes this. Check for:
- Conditional rendering based on viewport
- CSS overflow:hidden cutting off content
- JS initialization that fails on small viewports
- Collapsible sections that default to collapsed with no toggle visible

**Fix 163 - /investor-form 404:** Add a redirect from `/investor-form` to `/investor` in `client/src/App.tsx`. The pattern already exists for `/investmentform` -> `/investor` on line 168. Duplicate it for `/investor-form`.

**Fix 172 - Map SVG 0x0 on mobile:** Check `client/src/components/GlobeMap.tsx` or the map page component. The SVG likely has fixed width/height attributes instead of viewBox + responsive CSS.

**Fix 70 - Mobile nav:** Previous audit said broken at 375px. Verified working at 400px. Test at 375px specifically. The nav drawer is 320px wide with 50px items. Close button is 28px (Fix 175).

**Fix 194 - Floating buttons overlap:** Multiple floating elements stack at the bottom of the page on mobile. Consolidate into a single floating action area or use a stacking layout with proper spacing.

**Fix 196 - UNDER CONSTRUCTION banner on /quest:** Remove the banner. The quest page has real content.

**Fix 199 - Newsletter subscribe is a link:** Replace the "Subscribe to Newsletter" link with an inline email input + submit button. Use the existing newsletter API endpoint.

**Fix 214 - Section navigation for long pages:** Add a sticky section nav or "jump to" component for pages that require 5+ scrolls on mobile (Fund, Opportunity, Governance).

---

### PHASE 3: TOUCH TARGETS + ACCESSIBILITY
**Fixes:** 173-176, 178-180, 109, 114, 144, 145, 167 (touch targets part)

WCAG 2.5.5 and Apple HIG require minimum 44x44px touch targets.

**Batch approach:** Create a CSS utility class and apply it globally:
```css
.touch-target {
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

**Specific fixes:**
- Fix 173: Footer links (27/28 below 44px). Increase padding on `<a>` tags in footer.
- Fix 174: Footer social icons (20x20px). Increase to 44x44px clickable area with padding.
- Fix 175: Mobile menu close button (28px). Increase to 44px.
- Fix 176: /fund "Submit LOI" button (28px). Increase to 44px height.
- Fix 178: /play CTAs (20-21px). Increase button height.
- Fix 179: /game 29 tiny targets. Systematic pass through Game.tsx.
- Fix 180: /apply form inputs (36px). Set min-height: 44px on all form inputs.
- Fix 109: All form inputs site-wide below 44px. Global CSS fix.
- Fix 114: Select/dropdown elements on mobile.
- Fix 144: Icon-only buttons missing aria-labels. Add aria-label to every icon button.
- Fix 145: Add skip-to-content link in Navigation.tsx.

---

### PHASE 4: SEO + SOCIAL SHARING
**Fixes:** 129, 134, 135-137, 148-152, 18, 100, 203

**Fix 129 (P1) - OG images relative paths:** In `client/src/components/SEO.tsx`, ensure all `og:image` meta tags use absolute URLs starting with `https://regencivics.earth/` or `https://assets.regencivics.earth/`.

**Fix 134 - NotFound page:** Add `<meta name="robots" content="noindex">` and proper SEO tags.

**Fix 135-137 - Dynamic titles:** Community posts, campaigns, and blog posts need `<title>` tags set dynamically from their content. Check that `SEO.tsx` receives the right props.

**Fix 148 - Structured data:** Add JSON-LD to homepage (Organization), blog posts (Article), and fund page (FinancialProduct or similar).

**Fix 149 - Sitemap:** Already exists at `/sitemap.xml` with 70+ URLs. Verified working. Rye will submit to Google Search Console manually.

**Fix 150 - robots.txt:** Create or verify `/robots.txt` allows crawling and references the sitemap.

**Fix 151 - Preconnect hints:** Add `<link rel="preconnect">` for `assets.regencivics.earth` and `fonts.googleapis.com` in the HTML head.

**Fix 152 - PWA manifest:** Create or verify `manifest.json` with app name, icons, theme color.

**Fix 203 - /loi missing title:** Add page title and SEO meta tags to the LOI form page.

---

### PHASE 5: SECURITY + AUTH
**Fixes:** 8-14, 130, 95, 15-16, 208

**Fix 130 (P1) - Admin localStorage bypass:** Replace the client-side password check with proper role-based auth using the existing `adminProcedure` / `superadminProcedure` from `server/_core/trpc.ts`. The admin page (`Admin.tsx`) currently uses password "333" stored client-side.

**Fix 95 - /create-campaign auth gate:** This page needs BOTH:
1. User must be logged in (use `useAuth()` hook with redirect)
2. User must enter password "222" (same pattern as AdminModeration.tsx)

Implementation: Copy the password gate pattern from `client/src/pages/AdminModeration.tsx` into `client/src/pages/CreateCampaign.tsx`. The moderation page already uses password "222" with a simple `useState` flow. Add this at the top of the component, before the main form renders.

**Fix 208 - Admin Panel link in mobile drawer:** The "Admin Panel" link in the nav drawer should only show for users with admin/superadmin role. Check `Navigation.tsx` and gate the link with `user?.role === 'admin' || user?.role === 'superadmin'`.

**Fixes 8-14 - Security hardening:**
- Fix 8: Tighten CSP headers (remove unsafe-inline, unsafe-eval where possible)
- Fix 9: Set Secure, HttpOnly, SameSite on all cookies
- Fix 10: Add input sanitization on all user inputs
- Fix 11: Add rate limiting on auth endpoints
- Fix 12: CSRF token validation (may already exist via protectedProcedure)
- Fix 13: Content-Security-Policy frame-ancestors
- Fix 14: X-Content-Type-Options, X-Frame-Options headers

---

### PHASE 6: POLISH + CODE QUALITY
**Fixes:** All remaining P2-P4 items

Work through these in priority order:
1. **Error handling:** Fix 34 (image fallbacks), Fix 131 (newsletter errors), Fix 25-28
2. **Code cleanup:** Fix 39-42 (dead code), Fix 53-58 (code quality)
3. **Performance:** Fix 106 (hero lazy loading), Fix 108 (100dvh), Fix 96-97 (redundant loads)
4. **Mobile refinements:** Fix 110, 121, 124-128
5. **Accessibility:** Fix 138-139, 146, 153-157, 159-160
6. **Empty pages:** Fix 59-62, 88-89, 103 (add ComingSoonPlaceholder)

---

## /ally Page Image Generation (Fix 197)

The /ally page has zero images. Generate these using the `regen-content-image` skill:

**Image 1: Alliance Partners Hero**
```
A wide panoramic view of a regenerative landscape where diverse alliance partners gather at a great circular table grown from living wood, set in a forest clearing, representatives from indigenous communities, permaculture farms, regenerative businesses, and tech cooperatives sitting together, each bringing artifacts of their work, the table's surface shows a living map with glowing mycorrhizal connections between their territories, massive ancient trees ring the clearing with bioluminescent mycelium threading up their trunks, golden amber light pours through the canopy from distant golden-spired cities, birds circle overhead, abundant gardens surround the clearing with dozens of food species visible, solarpunk regenerative world where ancient golden-age civilizations are overgrown with cascading life, deep forest green tones, golden accents and highlights, hyperrealistic magical realism, detailed fantasy concept art, photorealistic texture and specificity, ultra detailed, 4K, the scene feels real but more alive than reality
```
Resolution: 2K. Use as hero background.

**Image 2: Alliance Network Card**
```
A detailed magical realism scene depicting a network of regenerative land projects connected by glowing golden threads across a lush landscape seen from above, each project site is a burst of abundant life, orchards, food forests, community gardens, with tiny photorealistic people working the land, the connections between sites pulse with teal bioluminescent energy like mycorrhizal networks scaled up to landscape size, massive ancient trees anchor each node, golden-spired living architecture visible at key intersections, warm amber sunset light, solarpunk regenerative world, deep forest green tones, golden accents, hyperrealistic magical realism, ultra detailed, 4K
```
Resolution: 2K. Use as feature card image.

**Image 3: Join the Alliance CTA**
```
A richly illustrated scene showing a real-looking diverse group of people stepping through a golden archway made of living vines and ancient carved stone into a regenerative paradise, their expressions show wonder and determination, the world beyond the arch is explosively abundant with towering fruiting trees, cascading flowers, bioluminescent mushrooms lining the path, a golden orb of light at the center draws them forward, birds and butterflies fill the air, the arch itself is covered in glowing mycelium, solarpunk regenerative world, warm golden amber light, deep forest green tones, photorealistic humans within detailed fantasy concept art world, ultra detailed, 4K
```
Resolution: 2K. Use as CTA section background.

After generating, upload to R2 and wire into `client/src/pages/Ally.tsx`.

---

## Glass Panel Contrast Assessment (Fix 146)

Verified via live screenshots on 2026-03-23:

**PASSES WCAG AA:**
- Homepage path cards: White text over dark gradient overlays on images. Adequate contrast.
- Top navigation: Gold/dark green with white text. Good contrast.
- Bottom navigation: Dark background with light icons/labels. Good contrast.
- Fund page banner: Dark text on amber gradient. Good contrast.
- "Go" links: Green/gold on dark card backgrounds. Readable.

**BORDERLINE (recommend improvement):**
- Path card subtitles ("FUND THE RENAISSANCE", "EVOLVE YOUR PROJECT"): Small, light gray text on semi-transparent dark background. Passes AA at current size but barely. Recommend increasing font-weight from 400 to 500, or using `rgba(255,255,255,0.85)` instead of the current lighter gray.
- "View Full Landing Page" text: Thin white text on dark forest. Passes but thin font hurts readability. Recommend font-weight: 500.

**Action for Claude Code:** Increase font-weight on path card subtitles and "View Full Landing Page" text. No WCAG AA failures found, but these two areas should be improved for better mobile readability. Mark Fix 146 as PASSES with minor improvements needed.

---

## Rye's Remaining Manual Tasks

These are the ONLY things Rye must do. Everything else in this doc is for Claude Code.

1. **Submit sitemap to Google Search Console.** The sitemap exists at `https://regencivics.earth/sitemap.xml`. Go to https://search.google.com/search-console > Sitemaps > Add sitemap > enter `sitemap.xml` > Submit. Takes 30 seconds.

2. **Verify Season 2 schedule dates** on /schedule page (Fix 91). Content accuracy check.

3. **Re-upload broken R2 images** if Claude Code cannot regenerate them via wrangler (Fix 184). Claude Code should attempt to regenerate and upload all broken images first. Only escalate to Rye if wrangler CLI is not configured or R2 access fails.

4. **regencivics.com domain** (Fix 7). Blocked until registrar access is available. Low priority since .earth works.

---

## Execution Tips

1. **Run the broken image audit FIRST.** Everything else looks worse when images are broken.
2. **Test at 400px width after every mobile fix.** The viewport was 400x845 during the audit.
3. **Batch CSS fixes together.** Touch targets (Phase 3) can mostly be done in one CSS pass.
4. **Don't touch working pages.** The homepage, /connect, /apply, /loi, /land all work on mobile. Focus on broken ones.
5. **Use the existing patterns.** Password gate pattern is in AdminModeration.tsx. Auth redirect pattern is in useAuth.ts. Image fallback needs to go in OptimizedImage.tsx.
6. **Commit after each phase.** Don't batch everything into one giant commit.
7. **Zero em-dashes in any content.** Writing rule #1. Check every string you write.
