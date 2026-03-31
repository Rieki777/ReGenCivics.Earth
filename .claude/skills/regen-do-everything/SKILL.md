---
name: regen-do-everything
description: >
  Autonomous end-to-end fix/upgrade execution for ReGen Civics. Given a fix or
  upgrade task, Claude does everything possible without asking: diagnose, code,
  test via browser, verify live, and report results. Rye only handles commits,
  pushes, Railway deploys, and DB access. The skill ends once live verification
  passes. Triggers on: "do everything", "fix this autonomously", "handle it",
  "run the fix", "execute this fix", "take care of it", "ship it".
---

# ReGen Do-Everything Skill

## Purpose

Execute fixes and upgrades with maximum autonomy. Rye is holding a lot. The goal
is: Rye describes the problem, Claude does everything except what physically
requires Rye's machine (git push, Railway deploy, DB scripts, browser sign-in).

## Execution Protocol

### Phase 1: Diagnose

1. Read the relevant fixes doc (`FIXES_TO_MAKE_*.md`) if one exists
2. Read `CLAUDE.md` for project conventions and writing rules
3. Trace the bug from symptom to root cause:
   - Grep for the component/feature mentioned
   - Read the relevant files end-to-end
   - Check the data flow: client component -> tRPC call -> server handler -> DB query -> schema
   - Check the asset flow: upload -> storage -> DB URL -> client display -> proxy/CDN
4. Do not ask Rye to confirm the diagnosis. State what you found and move to fixing.

### Phase 2: Fix

1. Make all code changes needed
2. Fix related issues discovered during diagnosis (don't leave adjacent broken things)
3. Check for the same pattern elsewhere in the codebase (e.g., if one component
   had a broken image URL, grep for all components with the same pattern)
4. Preserve existing optimizations. If images were being Sharp-optimized, keep
   them Sharp-optimized. If there was caching, keep caching. Don't simplify
   away performance work.
5. Keep changes minimal and focused. Don't refactor unrelated code.

### Phase 3: Stage for Deploy

1. Report what changed and why, file by file
2. Tell Rye exactly what to commit:
   - Which files to `git add`
   - Suggested commit message
3. If there are Railway env var changes needed, list them with exact key=value
4. Wait for Rye to confirm deploy is live before proceeding to verification

### Phase 4: Verify Live

1. Use Claude in Chrome to navigate to the affected pages
2. Run JavaScript checks to verify:
   - Images load (naturalWidth > 0, no broken img elements)
   - Components render expected content (no fallback states like initial letters)
   - No console errors related to the fix
   - Network requests return 200 for proxied/CDN assets
3. Check adjacent pages that share the same components
4. If verification fails, diagnose why and loop back to Phase 2
5. The skill is NOT done until live verification passes

### Phase 5: Report

1. Mark todo items complete
2. Update the fixes doc with final status
3. List any new issues discovered during the process (add to fixes doc)
4. Update the Handoff Breakdown table per the regen-fixes-handoff skill

## Decision Rules

### When to ask Rye vs. just do it

**Just do it (don't ask):**
- Code changes of any size
- Fixing adjacent bugs found during diagnosis
- Choosing between implementation approaches (pick the simpler one)
- Reading any file in the repo
- Running JS in the browser to test things
- Creating or updating docs/fixes files
- Adding sync logic, proxy routes, or other server-side plumbing

**Ask Rye (must have human input):**
- Git commit and push
- Railway deploy confirmation
- Running scripts that need DATABASE_URL (Railway DB)
- Changing Railway environment variables
- Uploading files from Rye's machine
- Architecture decisions that change how the product works for users
- Anything that needs Rye to interact with the live site (sign in, submit forms)

### When to keep going vs. stop

**Keep going:**
- You found more broken things related to the fix
- The fix works in one place but the same pattern is broken elsewhere
- Verification failed and you know why
- There's a data issue you can fix with a server-side change

**Stop and report:**
- Verification passes on all affected pages
- You hit something that requires Rye's machine (DB access, env vars)
- The fix requires a product decision (not a technical one)

## Common Patterns in This Codebase

### R2 Image Proxy Chain
Upload -> R2 bucket -> `assets.regencivics.earth` URL stored in DB -> client
reads URL -> `resolveAssetUrl()` or `cdnImg()` rewrites to `/api/img?url=...` ->
server fetches from R2 via S3 client -> Sharp optimizes -> serves to browser.

If images are broken, check each link in this chain.

### Two Profile Tables
`userProfiles` = forum/auth identity (reputation, posts, onboarding path).
`playerProfiles` = game identity (wallet, tokens, quests, location, streaks).
Shared fields (avatarUrl, displayName, bio) are synced bidirectionally in
`server/db.ts` via `upsertUserProfile()` and `updatePlayerProfile()`.
If profile data looks wrong, check which table the component reads from.

### Auth System
`openId` string in `users` table: `google:<id>`, `email:<address>`, `apple:<id>`.
Session via JWT cookie. `sdk.createSessionToken(openId)` creates the token.
Login routes in `server/_core/oauth.ts`.

### Asset URL Helpers
- `cdnImg(url, width?, quality?)` -- for blog/content images with explicit sizing
- `resolveAssetUrl(url)` -- for avatars, banners, user-uploaded images with default quality
- Both route through `/api/img` which handles R2 fetch + Sharp optimization

## Skill Checklist (use as todo template)

For each fix:
- [ ] Read fixes doc and CLAUDE.md
- [ ] Diagnose root cause
- [ ] Implement fix
- [ ] Check for same pattern elsewhere
- [ ] Report changes, stage for commit
- [ ] Wait for deploy
- [ ] Verify live via browser
- [ ] Update fixes doc with final status
