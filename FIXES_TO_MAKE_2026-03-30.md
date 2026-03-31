# Fixes to Make -- 2026-03-30

This document continues from `FIXES_TO_MAKE_2026-03-29.md`. Items from today's session plus new feature requests.

**Priority order:** Critical (launch-blockers) first, then High, Medium, Low.

---

## Fix 1 -- Profile Avatar/Banner Sync Between Tables (Critical)

**Status:** CODED

**Symptom:** Profile Overview card shows "R" initial fallback instead of Rye's uploaded photo. Settings tab shows it fine.

**Root cause:** Two profile tables (`userProfiles` and `playerProfiles`) both store `avatarUrl`, `displayName`, and `bio` but had zero sync between them. The Settings form saves to `userProfiles`. The Overview card reads from `playerProfiles`. After uploading a photo, `playerProfiles.avatarUrl` stayed null.

**Fix:** Added bidirectional sync in `server/db.ts`:
- `upsertUserProfile()` now pushes `avatarUrl`, `displayName`, `bio` to `playerProfiles` after saving
- `updatePlayerProfile()` now pushes the same fields back to `userProfiles` after saving
- Both sync operations wrapped in try/catch so they never break the main save
- Also restored 5 functions that were truncated from the end of `db.ts` in a prior session (`getTokenLeaderboard`, `listCommunityAgreements`, `createCommunityAgreement`, `toggleCommunityAgreementVote`, `getUserCommunityAgreementVotes`)

**To trigger the backfill for existing data:** Re-save profile from Settings tab. The sync kicks in and copies avatarUrl to `playerProfiles`.

**Files changed:** `server/db.ts`

---

## Fix 2 -- R2 Image Proxy: resolveAssetUrl Through /api/img (Critical)

**Status:** CODED (from prior session, same commit batch)

**Symptom:** All R2-hosted images (avatars, banners, campaign photos, community category images) showed broken/404 because `assets.regencivics.earth` custom domain returns 404 at Cloudflare's level.

**Root cause:** Cloudflare R2 custom domain misconfiguration. The R2 bucket has the files, the public dev URL returns 401, the custom domain returns 404.

**Fix:**
- `resolveAssetUrl()` in `client/src/lib/utils.ts` now routes `assets.regencivics.earth` URLs through `/api/img` with Sharp optimization (was previously routing to `/storage/*` which had no optimization)
- `SmartImagePicker.tsx` preview image now uses `resolveAssetUrl(value)` instead of raw URL
- 3 additional components fixed: `CampaignImageGallery.tsx`, `Community.tsx`, `AdminCampaignApproval.tsx`
- `/api/img` route on server fetches from R2 via S3 client, runs Sharp optimization, serves result

**Files changed:** `client/src/lib/utils.ts`, `client/src/components/SmartImagePicker.tsx`, `client/src/components/CampaignImageGallery.tsx`, `client/src/pages/Community.tsx`, `client/src/components/AdminCampaignApproval.tsx`

---

## ~~Fix 3 -- Blockchain/Wallet Login Option~~ (STRUCK -- revisit later)

Parked for now. The paste-address MVP wasn't the right approach. When we come back to this, consider full wallet signature verification (MetaMask/WalletConnect) so addresses are actually proven. The `playerProfiles` table already has `walletAddress`, `baseAccountName`, and verification fields ready for it.

---

## Fix 3 -- Two-Table Architecture: Keep and Document (Low)

**Status:** DONE

**Symptom:** Confusion about why `playerProfiles` and `userProfiles` both exist with overlapping fields.

**Root cause:** The two tables serve different identity layers:
- `playerProfiles` = game identity (blockchain, tokens, quests, badges, location, streaks). Can exist without auth account. Wallet-only players live here.
- `userProfiles` = forum/community identity (reputation, post count, onboarding path, language preference). Always tied to an auth user.

**Fix:** Bidirectional sync (Fix 1) keeps shared fields consistent. The two-table design is correct for the future blockchain login path. Document this in CLAUDE.md or a schema doc.

---

## Handoff Breakdown -- Who Does What

### YOU (Rye) -- things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| ALL | `git add server/db.ts FIXES_TO_MAKE_2026-03-30.md && git commit && git push` | Git push requires your machine | Terminal in `C:\Users\taren\Downloads\regen-civics-clean` |
| 1 | Re-save profile from Settings after deploy | Triggers avatar sync to playerProfiles | Visit regencivics.earth/profile, Settings tab, click Save |

### CLAUDE CODE -- already done or can be done without you

| # | Task | Status |
|---|------|--------|
| 1 | Bidirectional profile sync in db.ts | CODED |
| 1 | Restore truncated functions in db.ts | CODED |
| 2 | resolveAssetUrl routing through /api/img | CODED (prior session) |
| 2 | SmartImagePicker preview fix | CODED (prior session) |
| 2 | CampaignImageGallery, Community, AdminCampaignApproval fixes | CODED (prior session) |
| 3 | Document two-table architecture | DONE |

### WAITING ON YOU before Claude Code can proceed

- **Fix 1 (Profile Sync):** Needs git push + deploy, then re-save profile to trigger backfill
