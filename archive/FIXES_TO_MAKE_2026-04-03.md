# Fixes to Make -- 2026-04-03

This document continues from `FIXES_TO_MAKE_2026-04-01.md`. Fixes from Rye's WhatsApp screenshots + Cowork session.

---

## Fix 1 -- Crowdpooling buttons need better visibility (Medium)

**Status:** CODED

**Symptom:** The "Submit Proposal to Projects" and "View Projects Crowd Pooling" buttons at `/crowd-pooling` are hard to see. Low contrast, small, don't stand out.

**Root cause:** The submit button uses `bg-[#1a472a]` (very dark green on dark background) and the view button uses `variant="outline"` with a faint border `border-[#1a472a]/30`. Both blend into the page.

**Fix:** Make both buttons larger and more visible:
- Submit button: use `bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]` (bright green, dark text) with `text-lg py-3 px-6` for size
- View Projects button: use `bg-white/10 hover:bg-white/20 text-white border-[#7dd87d]/40` with matching size
- Add a subtle glow or ring to the submit button: `ring-2 ring-[#7dd87d]/30`
- Increase icon size to `w-5 h-5`

**File:** `client/src/pages/CrowdPooling.tsx` (lines ~182-199)

---

## Fix 2 -- ClaimSeeds signup step should be an inline form (High)

**Status:** SHIPPED 2026-04-07

**Symptom:** Step in the ClaimSeeds flow shows "Sign up at regencivics.earth for updates and to start playing" as a static text link. Users have to leave the flow, sign up separately, and come back. This breaks the experience.

**Root cause:** The step was built as a simple callout box with a link rather than an inline registration form.

**Fix:** Replace the static text with an inline signup form:
- Email input field (pre-filled if user is logged in)
- "I already have an account" checkbox that auto-detects logged-in state and skips this step
- If not logged in: show email + password fields for quick registration, or a "Sign in" link
- On successful signup/login, auto-advance to the next step
- Keep the flow contained, no redirecting to a separate page

**File:** `client/src/pages/ClaimSeeds.tsx` (lines ~682-695)

---

## Fix 3 -- ClaimSeeds form readability overhaul (High)

**Status:** CODED

**Symptom:** The ClaimSeeds form is hard to read. Orange text on dark background, low contrast labels, question text hard to parse. This is a recurring issue across all forms on the site.

**Root cause:** Form uses amber/orange colors for labels and options (`text-amber-800`, `text-foreground` on dark bg) that don't meet WCAG AA contrast. The `CLAUDE_CODE_PROMPT_2026-04-02_FORM_READABILITY.md` execution prompt was written to fix this but may not have been fully executed yet.

**Fix:** Apply the form readability standards from `CLAUDE_CODE_PROMPT_2026-04-02_FORM_READABILITY.md`:
- All form labels: white or near-white (`text-white` or `text-white/90`)
- Question text: `text-white text-lg font-medium`
- Radio button labels: `text-white/80`
- Input fields: dark background (`bg-[#0d2818]`) with light text, visible borders (`border-[#7dd87d]/30`)
- Transaction table: improve header contrast, use `text-white/70` for data rows
- Selected radio: green highlight ring, not just a dot color change

**File:** `client/src/pages/ClaimSeeds.tsx` (entire form)

---

## Fix 4 -- Landing page first video should play inline (Medium)

**Status:** CODED

**Symptom:** The first video on the landing page ("Welcome to the Regenerative Renaissance") opens YouTube in a new browser tab when clicked. The second video ("4 Paths to Play") plays inline on the page. Users expect both to play inline.

**Root cause:** The first video uses `VideoPreviewCard` which opens a `youtubeUrl` in a new tab. The second uses `AutoplayVideo` which embeds the YouTube iframe inline.

**Fix:** Replace the first video's `VideoPreviewCard` with `AutoplayVideo`:
```tsx
// Before:
<VideoPreviewCard
  mp4Url="/images/clip-01-welcome.mp4"
  posterUrl="/images/clip-01-poster.webp"
  youtubeUrl="https://youtu.be/G-6ZpxvZ3qM"
  title="Welcome to the Regenerative Renaissance"
  playLabel="Watch Full Video"
/>

// After:
<AutoplayVideo
  videoId="G-6ZpxvZ3qM"
  title="Welcome to the Regenerative Renaissance"
  thumbnailUrl="/images/clip-01-poster.webp"
  thumbnailAlt="Welcome to the Regenerative Renaissance"
/>
```

Keep the MP4 preview clip as a poster/thumbnail if `AutoplayVideo` supports it. If the component needs the short preview clip before the user clicks play, extend `AutoplayVideo` to accept an optional `previewMp4` prop that autoplays the short clip and switches to the full YouTube embed on click.

**File:** `client/src/pages/Home.tsx` (lines ~233-241)

---

## Fix 5 -- Forum post image not loading (High)

**Status:** CODED

**Symptom:** In the Investment & Finance forum category, the "Historical Contributions to the ReGenerative Renaissance" post shows a broken image placeholder. The alt text is visible but the image doesn't render.

**Root cause:** The post's `generatedImageUrl` is either pointing to an invalid URL, an expired/inaccessible image host, or the R2 image proxy isn't working for this image. The image tag at `CommunityCategory.tsx` line 278 uses `post.generatedImageUrl` directly.

**Fix:**
1. Check the `generatedImageUrl` value in the database for this specific post. If it's pointing to an external host that's down, re-upload the image to R2 or regenerate it.
2. Add a fallback: if the image fails to load (`onError`), hide the image container or show a gradient placeholder with the category icon instead of a broken image icon.
3. Add `onError` handler to the img tag in `CommunityCategory.tsx`:
```tsx
<img
  src={post.generatedImageUrl}
  alt={post.title}
  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
  width={800} height={128} loading="lazy"
  onError={(e) => { e.currentTarget.style.display = 'none'; }}
/>
```

**Files:** `client/src/pages/CommunityCategory.tsx` (line ~278), possibly database fix needed

---

## Fix 6 -- "community socials" should say "community" and link to forum (Low)

**Status:** CODED (may already be fixed in source, check deployed version)

**Symptom:** On the Team page, the "See a role missing?" callout links to "community socials" instead of the forum.

**Root cause:** Text may have been updated in source but not deployed. Current source (Team.tsx line 603-604) shows `community` linking to `/community`. If the deployed version still says "community socials" linking to `/socials`, the fix is already coded and just needs a deploy.

**Fix:** Verify the deployed version matches the source. If not, it's already fixed and needs a push. If source still says "community socials", update to:
```tsx
<a href="/community" className="text-[#7dd87d] underline hover:text-[#9de89d] transition-colors">community</a>
```

**File:** `client/src/pages/Team.tsx` (line ~603)

---

## Fix 7 -- Add Cowork referral link to "Build with Us" touchpoints (Medium)

**Status:** CODED

**Symptom:** The site encourages people to build tools and contribute but doesn't mention that they can get a free week of Claude Cowork to do it. The referral link `https://claude.ai/referral/v8oHxjZJxg?s=cowork&v=apps` should be integrated into all builder-facing content.

**Root cause:** The referral link didn't exist when the content was written.

**Fix:** Add the Cowork referral link to these locations:
1. **Blog: build-with-us.md** -- In the "What you need" section, add: "Get a free week of Claude Cowork to start building" with the referral link
2. **Blog: create-with-us.md** -- Same placement, adapted for content creators
3. **Forum: forum-builders-thread.md** -- Add to the "fastest first contribution" section
4. **Skills Builder role card** -- Add to the `specialContent` section in `CLAUDE_CODE_PROMPT_2026-04-02_TEAM_ROLES.md`, mentioning you can get a free Cowork week
5. **Tools Library page** -- Add a banner or note encouraging tool submissions with the Cowork link
6. **CONTRIBUTING.md** -- Add to prerequisites section

**Files:** `blog-drafts/build-with-us.md`, `blog-drafts/create-with-us.md`, `blog-drafts/forum-builders-thread.md`, `CLAUDE_CODE_PROMPT_2026-04-02_TEAM_ROLES.md`, `CONTRIBUTING.md`

---

## Priority Order

1. Fix 3 -- ClaimSeeds form readability (high impact, user-facing flow)
2. Fix 2 -- ClaimSeeds signup inline form (high impact, user-facing flow)
3. Fix 5 -- Forum post image not loading (high, broken content)
4. Fix 4 -- Landing page video inline (medium, first impression)
5. Fix 1 -- Crowdpooling buttons visibility (medium, usability)
6. Fix 7 -- Cowork referral link integration (medium, growth)
7. Fix 6 -- "community socials" text (low, may already be fixed)

---

## Handoff Breakdown -- Who Does What

### YOU (Rye) -- things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 5 | Check the generatedImageUrl in DB for the broken forum post | Railway DB access | Query: `SELECT id, title, generatedImageUrl FROM forumPosts WHERE title LIKE '%Historical Contributions%';` |
| 5 | Re-upload or regenerate forum post image if URL is dead | Railway DB + R2 access | Update the URL in DB after uploading to R2 |
| ALL | Git push after Claude Code commits | Git push to remote | `git add -A && git commit -m "..." && git push` |
| ALL | Verify fixes on live site after Railway deploy | Browser access | Check each page on regencivics.earth |

### CLAUDE CODE -- already done or can be done without you

| # | Task | Status |
|---|------|--------|
| 1 | Improve crowdpooling button styling | CODED |
| 2 | Replace ClaimSeeds signup text with inline form | CODED |
| 3 | ClaimSeeds form readability overhaul (all labels, inputs, contrast) | CODED |
| 4 | Replace VideoPreviewCard with AutoplayVideo on Home page | CODED |
| 5 | Add onError fallback to forum post images | CODED |
| 6 | Verify "community socials" is already fixed in source | CODED |
| 7 | Add Cowork referral link to blog posts, forum thread, CONTRIBUTING.md, role card | CODED |

### WAITING ON YOU before Claude Code can proceed

| # | What's needed | Why |
|---|--------------|-----|
| 5 | DB query result for broken forum post image | Need to know if the URL is dead or just slow to load, to decide whether to fix the URL or just add fallback |
| 8 | Run migration 0102_add_video_pitch_url.sql | Railway DB access | `npx tsx scripts/run-migration.ts drizzle/0102_add_video_pitch_url.sql` |

---

## Fix 8 -- Connect form: video pitch field + role prefill from Team page (Medium)

**Status:** CODED

**Symptom:** When someone clicks "Apply for This Role" on the Team page, the Connect form doesn't pre-fill with that role's info. The form also has no field for the 3-minute video pitch that the "How to Apply" section tells people to record.

**Root cause:** The RolePortalCard linked to bare `/connect` without URL params. The Connect form had role-related fields but no video field.

**Fix (already applied):**
1. RolePortalCard "Apply" button now sends `?path=role&role=...&circle=...&purpose=...` URL params
2. HowToApplySection Step 3 now has a "Go to Application Form" link to `/connect?path=role`
3. New "3-Minute Video Pitch" URL field added to the role application form in Connect.tsx
4. Zod schema updated in server/routes/investors.ts
5. Drizzle schema updated in drizzle/schema.ts
6. Migration: `drizzle/0102_add_video_pitch_url.sql`

**Files changed:** `client/src/components/HowToApplySection.tsx`, `client/src/components/RolePortalCard.tsx`, `client/src/pages/Connect.tsx`, `server/routes/investors.ts`, `drizzle/schema.ts`, `drizzle/0102_add_video_pitch_url.sql`

---

## Fix 9 -- Quest card Repeatable tag overlaps title (Medium)

**Status:** CODED

**Symptom:** The "Repeatable" badge on featured quest cards overlaps the quest title text.

**Root cause:** Badge uses `absolute top-4 right-4` in a card with no right padding on the title.

**Fix:** Added `pr-24` padding to the title/header flex containers on all 3 featured repeatable quest cards. Added `flex-1` to text content divs. Improved subtitle opacity from `text-white/60` to `text-white/70`.

**Files changed:** `client/src/pages/Quest.tsx`

---

## Fix 10 -- Download Quest Image broken (High)

**Status:** CODED

**Symptom:** "Download Quest Image" button shows "File wasn't available on site." Image never downloads.

**Root cause:** The `<a download>` attribute doesn't work cross-origin. Images are served from `assets.regencivics.earth` CDN, and the browser cannot trigger a download from a different origin.

**Fix:** Added `downloadImage()` helper function that fetches the image as a blob, creates a blob URL, and triggers the download programmatically. Falls back to opening in a new tab if fetch fails. Replaced the `<a>` tag with a `<button>` calling this function.

**Files changed:** `client/src/pages/Quest.tsx`

---

## Fix 11 -- Print button broken on quest detail modal (High)

**Status:** SHIPPED 2026-04-07

**Symptom:** Print button calls `window.print()` which prints 19 screenshots of the entire site.

**Root cause:** `window.print()` prints the full page, not just the modal. No print-specific CSS was set up.

**Fix:** Removed the Print button entirely. PDF field guides already exist for all 15 quests in `/public/quest-guides/`. The "Download Field Guide" button serves the same purpose better. Also removed unused `Printer` import.

**Files changed:** `client/src/components/QuestDetailModal.tsx`

---

## Fix 12 -- Quest-to-forum post wiring check (Medium)

**Status:** VERIFIED (no code change needed)

**Symptom:** Quests may not link to their correct forum posts.

**Root cause:** Checked all 15 quests in questData.ts. Forum URLs are sequential from /community/post/607 through /community/post/623 (gap at 622). Mappings appear correct and consistent.

**Fix:** No code change. If specific posts are wrong, Rye should verify by visiting each /community/post/607-623 in the browser.

---

## Fix 13 -- Connect form already has video field + role prefill (Low)

**Status:** VERIFIED (no code change needed)

**Symptom:** Rye asked for video upload spot on connect form and role prefill.

**Root cause:** Already implemented in Fix 8. Connect.tsx has `videoPitchUrl` field. Reads `?role=`, `?circle=`, `?purpose=` query params. HowToApplySection Step 3 already links to `/connect?path=role`. RolePortalCard already passes role info via URL params.

---

## Fix 14 -- Admin dashboard readability: 13 contrast/accessibility fixes (High)

**Status:** SHIPPED 2026-04-07

**Symptom:** Multiple text elements fail WCAG AA contrast requirements. 6 critical failures, 4 serious failures.

**Root cause:** Heavy reliance on opacity-based color variants that produce contrast ratios well below 4.5:1.

**Fix:** Applied fixes across 5 files:
- AdminAlertBanner.tsx: `text-amber-300` to `text-amber-200`
- AdminSidebar.tsx: `text-white/30` to `text-white/50` on group labels
- AdminGovernancePanel.tsx: token holder index `text-[#1a472a]/40` to `/70`, wallet address `text-[10px]` to `text-xs` + `/40` to `/60`, KPI labels `/60` to `/80`, RV token `text-[#7dd87d]` to `text-[#2d7a3a]`
- Admin.tsx: header subtitle `text-white/70` to `/85`, search placeholder `/65` to `/80`, added `aria-label`, border `/20` to `/40`
- AdminOverviewTab.tsx: stats subtitle `text-white/70` to `/80`

**Files changed:** `client/src/components/admin/AdminAlertBanner.tsx`, `client/src/components/admin/AdminSidebar.tsx`, `client/src/components/admin/AdminGovernancePanel.tsx`, `client/src/pages/Admin.tsx`, `client/src/components/admin/AdminOverviewTab.tsx`

---

## Updated Handoff Breakdown -- Who Does What

### YOU (Rye) -- things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 5 | Check generatedImageUrl in DB for broken forum post | Railway DB access | `SELECT id, title, generatedImageUrl FROM forumPosts WHERE title LIKE '%Historical Contributions%';` |
| 8 | Run migration for video pitch URL column | Railway DB access | `npx tsx scripts/run-migration.ts drizzle/0102_add_video_pitch_url.sql` |
| 12 | Verify forum post IDs match quest mappings | Browser check | Visit /community/post/607 through /community/post/623 |
| ALL | Git push after review | Git access | `git add -A && git commit -m "fixes batch 2026-04-03" && git push` |

### CLAUDE CODE -- already done or can be done without you

| # | Task | Status |
|---|------|--------|
| 1 | Crowdpooling button styling | CODED |
| 2 | ClaimSeeds inline signup form | CODED |
| 3 | ClaimSeeds form readability | CODED |
| 4 | Landing page video inline | CODED |
| 5 | Forum post image fallback | CODED |
| 6 | "community socials" text fix | CODED |
| 7 | Cowork referral link integration | CODED |
| 8 | Connect form video field + role prefill | CODED |
| 9 | Quest card Repeatable tag overlap fix | CODED |
| 10 | Quest image download (blob fetch) | CODED |
| 11 | Print button removed from quest modal | CODED |
| 12 | Quest-to-forum wiring verified | VERIFIED |
| 13 | Connect form video + prefill verified | VERIFIED |
| 14 | Admin dashboard 13 contrast fixes | CODED |
