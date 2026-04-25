# Claude Code Prompt: 2026-04-07 POST-CTO Residual

**Updated end of day 2026-04-07 after an audit pass found most of the
original sprint was already shipped. This is now the ACTUAL remaining
work going into Earth Day launch (2026-04-22).**

For everything already done, see
`REMAINING_WORK_2026-04-07.md` section "Already shipped this week."

For new findings from the CTO visual audit on 2026-04-07, see
`CTO_VISUAL_AUDIT_2026-04-07.md`.

---

## Launch Blockers (must ship before Earth Day)

### LB-1. C2 GCP Maps API key restriction
**Owner:** Rye.
**Why:** Unrestricted Maps key is billable to anyone who scrapes it.
**Steps:**
1. Open Google Cloud Console => APIs & Services => Credentials
2. Find the Maps JavaScript API key currently used by regencivics.earth
3. Set Application restrictions to HTTP referrers and add:
   - `https://regencivics.earth/*`
   - `https://*.regencivics.earth/*`
   - `http://localhost:*/*`
4. Set API restrictions to Maps JavaScript API + Static Maps API only
5. Save. Verify the site still loads the map on /map.

### LB-2. CTO Visual Audit fixes
See `CTO_VISUAL_AUDIT_2026-04-07.md` for the full list. The three that
block launch:

1. **`/tools` page React crash** (PATCHED in this repo but not
   deployed). Claude Code: rebuild and deploy.
2. **Missing per-route OG images** for 7 pages (Bionomics, Land,
   Quests, Forum, Tools, Hymn Book, Features). Users sharing these
   routes on social currently get the default og-default.jpg. Spec in
   `SOCIAL_SHARING_SPEC.md`. Fix: add the 7 routes to the OG static
   file generator (or to `server/routes/og.ts`) and generate the
   webp/jpg files.
3. **Tokenomics duplicate sections** ("How Returns Flow" and "How to
   Acquire" each appear twice). Rye decides which of the two versions
   to keep. Claude Code then deletes the losers.

---

## High

### H-1. H3 Wire `.ink-reveal` and `.blur-up` animations
**Owner:** Claude Code in a live `npm run dev` session.
**Why:** The CSS classes exist in `index.css` but the DOM placements
were deferred so a human could review each one in the browser.
**Steps:**
1. `npm run dev`
2. For each hero section (Home, Bionomics, Fund, Game, Tokenomics,
   Land, Team), add `.blur-up` to the hero image and `.ink-reveal` to
   the h1.
3. Refresh and verify the animations fire on mount and respect
   `prefers-reduced-motion`.
4. No blind wiring: eyeball each placement.

### H-2. H8 Sentry DSN and source maps
**Owner:** Rye.
**Steps:**
1. Railway dashboard => Variables => set `SENTRY_DSN` and
   `VITE_SENTRY_DSN` to the production DSN.
2. Confirm the Sentry release upload step is in `vite.config.ts` build
   pipeline (look for `sentryVitePlugin`).
3. After next deploy, trigger a test error in prod and confirm it
   appears in Sentry with source-mapped stack traces.

### H-3. R2-21 Heal-the-land seed scripts
**Owner:** Rye (needs local `.env` with `DATABASE_URL` and Rye's user
ID).
**Steps:**
1. `npx tsx scripts/seed-heal-the-land.ts` (or equivalent). Confirm the
   script exists; if not, ask Claude Code to write it using
   `regen-database-sql` skill.
2. Verify on prod that the new Heal-the-Land entries render in the
   Quest page's Anytime/Routine section.

---

## Medium (nice to ship before launch, but not blocking)

### M-1. Citizenship tier nightly batch verification
**Owner:** Claude Code.
**Why:** `checkCitizenshipTiers` exists in `batchJobs.ts` and is
supposedly running nightly. Needs an end-to-end test that confirms (a)
the cron fires, (b) demotions actually happen on real users, (c)
grace-period notifications go out.
**Steps:**
1. Write a test user with an expired grace period in seed data.
2. Manually invoke `checkCitizenshipTiers` via a one-off tsx script.
3. Assert the user's tier dropped and a notification row was created.
4. Confirm the scheduled cron is registered in `server/_core/index.ts`
   or wherever the batch scheduler lives.

### M-2. Recording flow Zapier mapping verification (verified 2026-04-07)
**Status:** VERIFIED DONE. `server/webhooks/riverside.ts` lines 229-237
flat-key normalization handles both `data_title`/`data_youtube_url`
and nested `data.title`. HMAC-SHA256 verification in place. Nothing to
do.

### M-3. `notifyRecordings` opt-in toggle (verified 2026-04-07)
**Status:** VERIFIED DONE. `RecordingEmailToggle` component at
`client/src/components/UserNotificationPreferences.tsx` lines 107-147
is already mounted, wired to
`trpc.newsletter.recordingNotifyStatus.useQuery` and
`trpc.newsletter.toggleRecordingNotify.useMutation`. Nothing to do.

### M-4. Track 7 Social Sharing verification
**Owner:** Claude Code.
**Why:** Endpoint + SharePrompt component exist, but the 11 static OG
images per the spec have NOT been generated for every route. See
LB-2 item 2 above.

---

## Post-launch (out of scope for Earth Day)

### PL-1. C1 CSP nonce migration
Complex multi-touch refactor: per-request nonce middleware, audit
every inline script (GA, Sentry, GoogleTranslate, YouTube, Calendly,
Vimeo, Wistia, Cloudflare beacon), drop `'unsafe-inline'` from
script-src. Needs its own staged rollout session with live
verification across all embeds. Do not drive-by. Track as a dedicated
post-launch ticket.

### PL-2. M10 Admin.tsx refactor
The original CTO spec explicitly scoped this as out-of-scope for
launch week. 4,769 line file => split into file-per-section. Track as
tech debt.

### PL-3. M11 depcheck unused dependencies
Mostly false positives. Needs a careful manual review to avoid
removing a package that's dynamically imported. Not blocking anything.

### PL-4. REGEN_GAMES_SPEC_V1 phases 4-5
Mycelium Network visualization, advanced Seasonal mechanics,
Bioregional identity. Long-horizon. Build incrementally after launch.

---

## Git State

`.git/index` was corrupted mid-session with a `^~7` extension error.
The sandbox refuses to `rm` it. Recovery steps for Rye:

```
cd regen-civics-clean
rm -f .git/index .git/index.lock
git reset
git status
```

Then stage and commit the ToolsLibrary + HymnBook fixes from
`2026-04-07` along with:
- `FIX_17_QUEST_LOCKING_AUDIT_2026-04-07.md`
- `CTO_VISUAL_AUDIT_2026-04-07.md`
- `CLAUDE_CODE_PROMPT_2026-04-07_POST_CTO.md` (this trimmed rewrite)
- Any tokenomics de-duplication

Suggested commit message:

```
fix(tools): unbreak ToolsLibrary render crash + schema mismatch

ToolsLibrary.tsx was destructuring tool.categories/summary/pricing/
clickCount but the tools.list tRPC endpoint returns
tool.categories (as {name,slug,color}[]), shortSummary, pricingModel,
totalClicks. Rendering {cat} where cat is an object threw
"Objects are not valid as a React child" and triggered the error
boundary on every /tools visit.

Also fix Writing Rule 1 violation in HymnBook SEO title
(em-dash -> colon).

Also add:
- FIX_17_QUEST_LOCKING_AUDIT_2026-04-07.md (PASS verdict)
- CTO_VISUAL_AUDIT_2026-04-07.md (full pre-launch findings)
- Trimmed POST_CTO prompt to actual residual work

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```
