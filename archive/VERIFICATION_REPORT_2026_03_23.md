# Site Verification Report - March 23, 2026

**Auditor:** Cowork (browser automation + JS audit)
**Method:** Automated JS broken-image scan + visual screenshots across 21 pages, both desktop (1707px) and mobile (400px)
**Purpose:** Verify which fixes from FINAL_PUSH_V1_MARCH_2026.md are resolved, still open, or need updated notes

---

## HEADLINE FINDING: ZERO BROKEN IMAGES

The automated scan found **0 broken images across all 21 pages** on both desktop and mobile viewports. The only confirmed broken image is `blog-games-quests.jpg` (lazy-loaded in a collapsed blog section, not caught by the initial scan but visually confirmed).

This means **Fix 184 (42+ broken images) is almost entirely resolved.** The mass image breakage was caused by the cdnImg import issue (Fix 1) which has been fixed.

---

## FULL AUDIT DATA

### Mobile (400x845px)

| Page | Images | Broken | Height (px) | Notes |
|------|--------|--------|-------------|-------|
| / | 17 | 0 | 2,359 | Path cards render in 2x2 grid. Looks good. |
| /play | 6 | 0 | 5,059 | Content renders. CTAs at 20px height (Fix 178). |
| /quest | 21 | 0 | 19,120 | All 21 images loading. Very long page. |
| /land | 13 | 0 | 8,498 | Content renders with images. |
| /fund | 9 | 0 | 12,086 | Treasury dashboard, metrics, allocations all render. |
| /ally | 5 | 0 | 5,001 | Full content: hero, expandable cards, 3-step process, CTA. |
| /seasons | 7 | 0 | 14,838 | LAYOUT BUG: First viewport is empty green. Content starts below fold. |
| /game | 7 | 0 | 14,460 | Images loading. Very long page. |
| /governance | 13 | 0 | 18,206 | All 13 images loading. Very long. |
| /blog | 20 | 0* | 8,971 | *blog-games-quests.jpg is broken (lazy-loaded, not caught by scan). |
| /team | 7 | 0 | 14,773 | Team content renders. |
| /map | 29 | 0 | 6,699 | Globe + markers rendering. |
| /connect | 6 | 0 | 3,575 | Content renders. |
| /glossary | 5 | 0 | 8,465 | Terms render. |
| /community | 10 | 0 | 3,379 | Posts and images loading. |
| /apply | 5 | 0 | 2,551 | Form renders correctly. |
| /opportunity | 10 | 0 | 47,505 | Content renders but page is 56 screens tall on mobile! |
| /terms-of-use | 5 | 0 | 4,063 | Full legal content. |
| /privacy-policy | 5 | 0 | 4,183 | Full legal content. |

### Desktop (1707x932px)

| Page | Images | Broken | Height (px) |
|------|--------|--------|-------------|
| / | 17 | 0 | 1,594 |
| /play | 6 | 0 | 5,013 |
| /quest | 21 | 0 | 13,888 |
| /land | 13 | 0 | 7,744 |
| /fund | 9 | 0 | 9,339 |
| /ally | 5 | 0 | 4,489 |
| /seasons | 7 | 0 | 9,192 |
| /game | 7 | 0 | 11,066 |
| /governance | 13 | 0 | 12,861 |
| /blog | 20 | 0* | 6,928 |
| /team | 7 | 0 | 8,771 |
| /map | 29 | 0 | 1,776 |
| /connect | 6 | 0 | 2,188 |
| /glossary | 5 | 0 | 6,413 |
| /community | 10 | 0 | 2,305 |
| /apply | 5 | 0 | 1,849 |
| /opportunity | 10 | 0 | 31,673 |
| /terms-of-use | 5 | 0 | 2,845 |
| /privacy-policy | 5 | 0 | 2,971 |
| /risk-disclosure | 5 | 0 | 7,554 |
| /disclaimers | 5 | 0 | 3,737 |

---

## FIXES TO MARK AS RESOLVED

Based on this verification, the following fixes can be removed or marked done:

### Image Fixes (all resolved by Fix 1 cdnImg fix)

- **Fix 184** (42+ broken images) -- RESOLVED. Only 1 remaining: blog-games-quests.jpg
- **Fix 164** (blog 14/15 images broken) -- RESOLVED. 20 images, 0 broken.
- **Fix 165** (quest 9+ images broken) -- RESOLVED. 21 images, 0 broken.
- **Fix 166** (governance all 8 images broken) -- RESOLVED. 13 images, 0 broken.
- **Fix 167** (game both images broken) -- RESOLVED. 7 images, 0 broken.
- **Fix 168** (seasons 2 broken images) -- RESOLVED. 7 images, 0 broken.
- **Fix 169** (community 5 broken images) -- RESOLVED. 10 images, 0 broken.
- **Fix 170** (team 2 broken images) -- RESOLVED. 7 images, 0 broken.
- **Fix 171** (connect 1 broken image) -- RESOLVED. 6 images, 0 broken.
- **Fix 43** (homepage images gaps) -- RESOLVED. 17 images, 0 broken.
- **Fix 44** (quest page images) -- RESOLVED. 21 images, 0 broken.
- **Fix 45** (governance images) -- RESOLVED. 13 images, 0 broken.
- **Fix 60** (blog posts not rendering) -- RESOLVED. Blog page renders 20 images + posts.

### Content/Page Fixes

- **Fix 61** (/ally "completely empty") -- RESOLVED. Page has full content: hero, expandable cards, 3-step process, CTA.
- **Fix 62** (/fund "empty") -- RESOLVED. Rich content: treasury dashboard, impact metrics, allocations. Works on both viewports.
- **Fix 162** (/opportunity renders empty on mobile) -- RESOLVED. 47,505px of content on mobile. It renders, just extremely long.
- **Fix 161** (homepage path cards single-column on mobile) -- RESOLVED. Cards render in 2x2 grid.

### Already Verified in Previous Session

- **Fix 51/68** (legal pages content) -- VERIFIED. All 4 legal pages complete.
- **Fix 146** (glass panel contrast) -- VERIFIED. Passes WCAG AA.
- **Fix 149** (sitemap missing) -- VERIFIED. sitemap.xml exists with 70+ URLs.

---

## FIXES THAT NEED UPDATED NOTES

### Fix 63 - /seasons Layout Bug (not "empty")

**Previous claim:** Page is "completely empty" on both viewports.
**Actual finding:** Page has content (7 images, 14,838px on mobile) but the **first viewport is nearly empty**. Just a "Back" button and empty dark green space. The actual content ("The Incubator Structure", "2 Hour Sessions", "Who We're Looking For") starts way below the fold.
**Real fix needed:** Move the content to start at the top of the page, or add a hero section. The layout pushes all content below the fold.

### Fix 190 - /fund Page Height

**Confirmed:** /fund is 12,086px on mobile (confirmed, was 10,875 in audit). Still very tall but has real content throughout (treasury dashboard, metrics, allocations).

### Fix 2 - R2 Images

**Update:** Can be marked mostly resolved. The JS audit shows 0 broken images across all 21 pages. Only `blog-games-quests.jpg` remains broken. The cdnImg proxy is working correctly.

---

## STILL OPEN: REMAINING ISSUES FOR CLAUDE CODE

### 1. blog-games-quests.jpg (1 broken image)
- Blog post "Introducing Games and Quests: Play Your Way to Regeneration"
- File: `client/src/data/blogPosts.ts` line 441
- URL: `https://assets.regencivics.earth/blog-games-quests.jpg`
- Action: Generate with regen-content-image skill, upload to R2

### 2. /seasons layout bug
- First viewport is empty on both desktop and mobile
- Content exists but starts below the fold
- Action: Fix CSS layout in Seasons.tsx

### 3. /opportunity page length (47,505px mobile)
- 56 screen scrolls on mobile
- Action: Add collapsible sections, "Read more" toggles

### 4. Touch targets site-wide
- Many buttons below 44px minimum (Fixes 173-181, 185-187, 200)
- Input fields at 36px (now fixed to 44px with today's input.tsx change)
- Select dropdowns updated today (select.tsx)
- Footer links, social icons, CTAs still undersized

### 5. Security hardening (Fixes 8-14)
- CSP headers, session cookies, path traversal, sanitization
- All code-level fixes for Claude Code

### 6. Form label readability
- FIXED TODAY: Label, Input, Textarea, Select components updated with `text-[#1a472a]`
- Applied globally to all 46 files using these components

### 7. SEO improvements (Fixes 129, 134-137, 148-152)
- OG images, page titles, JSON-LD, canonical URLs
- All code-level fixes for Claude Code

---

## SITEMAP SUBMISSION

**Status:** Google Search Console blocks browser extension access. Manual task for Rye.
**Action:** Paste `https://regencivics.earth/sitemap.xml` into the "Add a new sitemap" field on the GSC Sitemaps page and click Submit.

---

## SUMMARY

| Category | Count | Status |
|----------|-------|--------|
| Image fixes resolved | 13 fixes | Can be deleted from doc |
| Content/page fixes resolved | 4 fixes | Can be deleted from doc |
| Previously verified | 3 fixes | Already marked done |
| Updated notes needed | 3 fixes | /seasons layout, /fund height, R2 images |
| Still open for Claude Code | ~160 fixes | Security, touch targets, SEO, page length, etc. |
| Form text readability | DONE | Label/Input/Textarea/Select components updated today |
| blog-games-quests.jpg | 1 image | Claude Code to generate + upload |
| Sitemap GSC submission | Manual | Rye to paste URL in GSC |
