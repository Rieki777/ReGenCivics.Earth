# Fixes and Overhaul — 2026-04-09 (Governance Launch + Loomio Overhaul)

This document covers: Push 2 code tracks (A-H), screenshot bugs, and the full gov.regencivics.earth visual overhaul.

---

## Fix 1 — Truncated source files (Critical)

**Status:** FIXED

**Symptom:** Four server/client files were truncated mid-line, causing TypeScript compilation errors: `governance.ts`, `gratitude.ts`, `players.ts`, `PlayerProfile.tsx`.

**Root cause:** Previous session ran out of context during file writes. Files had incomplete function bodies, dangling template literals, and orphaned JSX fragments.

**Fix:** Completed all four files with proper closing braces, return statements, and function bodies. Verified via `tsc --noEmit --skipLibCheck` that no code errors remain in any changed file.

**Files changed:** `server/routes/governance.ts`, `server/routes/gratitude.ts`, `server/routes/players.ts`, `client/src/pages/PlayerProfile.tsx`

---

## Fix 2 — PromotionModal: picture-in-picture layout on desktop (High)

**Status:** FIXED

**Symptom:** The "Promote to decision" dialog opens as a narrow overlay on desktop. Users cannot reference the thread and fill out the form at the same time.

**Root cause:** Modal was a single `max-w-2xl` column with no thread preview.

**Fix:** Rewrote `PromotionModal.tsx` to use split-screen layout: left panel shows thread title, OP content, and first 8 replies; right panel has the form. On mobile, thread context is a collapsible section. Desktop uses `md:flex-row` with `md:w-[45%]` for the thread and `flex-1` for the form. Both panels independently scroll.

**Files changed:** `client/src/components/governance/PromotionModal.tsx`

---

## Fix 3 — PromotionModal: submit allowed when readiness gates fail (High)

**Status:** FIXED

**Symptom:** The "Open dual-key promotion" button was clickable even when only 2 of 3 required citizens had replied. User could fill out the full form and submit, then the form just vanished with no feedback.

**Root cause:** `cannotSubmit` only checked `decisionQuestion.length < 10` and `mutation.isPending`. It did not check whether `readiness.ageOk` and `readiness.voicesOk` passed.

**Fix:** Added `readinessGatesFailed` check that disables submit when age or voice count gates fail. Added explanatory text below the readiness panel: "The thread needs to meet the minimum requirements above before it can be promoted." Footer text changes to "Minimum requirements must be met before submitting" when gates are failed.

**Files changed:** `client/src/components/governance/PromotionModal.tsx`

---

## Fix 4 — PromotionModal: no confirmation after submit (High)

**Status:** FIXED

**Symptom:** After clicking "Open dual-key promotion", the modal closed silently. No confirmation, no record visible, no next-step guidance.

**Root cause:** `onSuccess` callback immediately called `onClose()`. No success state.

**Fix:** Added a `submitState` state machine (idle/submitting/success/error). On success, shows a dedicated confirmation view with party-popper icon, explanation of the 24h co-sign window, and the submitted decision question. On error, shows inline error banner with the server's error message. Modal only auto-closes when user clicks "Done".

**Files changed:** `client/src/components/governance/PromotionModal.tsx`

---

## Fix 5 — Gratitude sendable to system accounts (Medium)

**Status:** FIXED

**Symptom:** Users could send gratitude to the "ReGen Civics Team" account, which is a system/team account that should not receive gratitude.

**Root cause:** Neither client nor server checked whether the recipient was a system account.

**Fix:**
- **Client:** `GratitudeButton.tsx` now checks recipient handle against a `SYSTEM_HANDLES` list (`regen-civics-team`, `regen-guide`, `regen-guide-system`, `system`, `admin`) and returns null (hides the button) for matches.
- **Server:** `gratitude.ts` `send` mutation checks the same list plus the `openId === "regen-guide-system"` field. Returns a clear error message: "Gratitude can only be sent to other players, not to team accounts."

**Files changed:** `client/src/components/GratitudeButton.tsx`, `server/routes/gratitude.ts`

---

## Fix 6 — Gratitude sendable twice for same content (Medium)

**Status:** FIXED

**Symptom:** Users could send gratitude twice for the same forum post or reply.

**Root cause:** No duplicate check existed for (sender, recipient, sourceType, sourceId) tuples.

**Fix:** Added duplicate guard in `gratitude.ts`: before inserting, queries `gratitudeLog` for an existing row matching the same sender, recipient, sourceType, and sourceId. If found, throws `CONFLICT` error: "You've already sent gratitude for this. Each contribution gets one thank-you."

**Files changed:** `server/routes/gratitude.ts`

---

## Fix 7 — Push 2 Tracks A-H governance pipeline code (High)

**Status:** CODED

**Summary of all tracks completed:**

| Track | Description | Status |
|-------|-------------|--------|
| A | Wire `new_comment` Loomio webhook to forum replies | Already done (verified) |
| B | `reconcileHyphaBridges` real Base RPC check via viem | CODED |
| C | Storyteller opt-in toggle on PlayerProfile | CODED |
| D | Token ledger entries on quest completion + gratitude | CODED (quest was already done, gratitude added) |
| E | Claim threshold query + banner on BridgeHypha | CODED |
| F | Sync Loomio bioregion subgroup removals | CODED |
| G | Rate limits for governance + bridge endpoints | CODED |
| H | Governance nav link (desktop + mobile) | CODED |

**Files changed:** `server/jobs/governanceJobs.ts`, `server/routes/game.ts`, `server/_core/index.ts`, `server/webhooks/loomio.ts`, `client/src/components/StorytellerToggle.tsx` (new), `client/src/pages/PlayerProfile.tsx`, `client/src/pages/BridgeHypha.tsx`, `client/src/components/Navigation.tsx`, `client/src/config/mobileMenu.ts`, `package.json` (added viem)

---

## Fix 8 — gov.regencivics.earth Loomio visual overhaul (Critical)

**Status:** HUMAN STEP REQUIRED (Railway env vars) + CLAUDE CODE PROMPT READY

**Symptom:** Loomio at gov.regencivics.earth uses stock Loomio design. Feels disconnected from ReGen Civics. Needs to feel like "ReGen Gov. Powered by Loomio."

**What has been done:**
- Created `regen_icon.svg` and `regen_logo.svg` in `loomio Governance Tools/public/brand/`
- Created full Claude Code prompt: `CLAUDE_CODE_PROMPT_2026-04-09_LOOMIO_OVERHAUL.md`

**What remains (see separate prompt doc):**
- Set ~30 THEME_* environment variables on the Loomio Railway service
- Rebuild Loomio Docker image with ReGen brand assets baked in
- Deep Vue component surgery (sidebar, header, decision pages)
- Custom CSS injection for dark forest theme
- OIDC shared auth fix (session not carrying over)

---

## Fix 9 — OIDC session not carrying over to Loomio (High)

**Status:** HUMAN STEP REQUIRED

**Symptom:** Rye was logged into regencivics.earth but had to log in again when visiting gov.regencivics.earth.

**Root cause:** The OIDC flow requires the user to click "Continue with OAUTH" on Loomio's login page. This is by design (Loomio is a separate app), but the cookie domain `.regencivics.earth` should allow the session check to happen automatically. Need to verify `COOKIE_DOMAIN` is set correctly on both services and that Loomio's OIDC client is configured.

**Fix needed:** Verify these Loomio env vars are set:
- `OAUTH_ENABLED=true`
- `OIDC_ISSUER_URL=https://regencivics.earth/api/auth/oidc`
- `OIDC_CLIENT_ID=loomio-gov`
- `OIDC_CLIENT_SECRET=<the secret from Railway regencivics service>`
- `OIDC_REDIRECT_URI=https://gov.regencivics.earth/auth/oidc/callback`

---

## Fix 10 — Loomio organization structure (Medium)

**Status:** HUMAN STEP REQUIRED

**Symptom:** Loomio shows flat structure. Should have "ReGen Civics" as the global org, with "Bioregions" and "Land Projects" as categories, and subgroups forming under those.

**Fix needed:** In Loomio admin (gov.regencivics.earth):
1. Rename the default organization to "ReGen Civics"
2. Create two subgroups: "Bioregions" and "Land Projects"
3. Set group descriptions explaining what each is for

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 1 | Git commit and push all changes | Git access | `git add -A && git commit -m "Push 2: governance pipeline + bug fixes" && git push` |
| 2 | Run pending migrations 0108-0111 | Railway DB access | Load .env then: `npx tsx scripts/run-migration.ts --all` |
| 3 | Install viem dependency | Railway npm install | After push, Railway will auto-install on deploy |
| 4 | Set ~30 THEME_* env vars on Loomio Railway service | Railway dashboard | See `CLAUDE_CODE_PROMPT_2026-04-09_LOOMIO_OVERHAUL.md` section "Phase 1" |
| 5 | Set LOOMIO_API_KEY on ReGenCivics Railway service | Loomio admin dashboard | Go to gov.regencivics.earth, Settings > API, generate key |
| 6 | Configure Loomio OIDC env vars | Railway dashboard | See Fix 9 above |
| 7 | Set up Loomio org structure | gov.regencivics.earth admin | See Fix 10 above |
| 8 | Run Loomio overhaul Claude Code prompt | Claude Code on your machine | Feed `CLAUDE_CODE_PROMPT_2026-04-09_LOOMIO_OVERHAUL.md` to Claude Code |
| 9 | Restrict GCP Maps API key | Google Cloud Console | ~5 min, see REMAINING_WORK |
| 10 | Verify Sentry source maps | Sentry dashboard | See REMAINING_WORK |

### CLAUDE CODE — already done or can be done without you

| # | Task | Status |
|---|------|--------|
| 1 | Fix truncated source files (4 files) | FIXED |
| 2 | PromotionModal split-screen layout | FIXED |
| 3 | PromotionModal readiness gating | FIXED |
| 4 | PromotionModal success confirmation | FIXED |
| 5 | Block gratitude to system accounts | FIXED |
| 6 | Prevent duplicate gratitude sends | FIXED |
| 7 | Push 2 Track A (new_comment webhook) | Already done |
| 8 | Push 2 Track B (reconcileHyphaBridges viem) | CODED |
| 9 | Push 2 Track C (Storyteller toggle) | CODED |
| 10 | Push 2 Track D (Token ledger entries) | CODED |
| 11 | Push 2 Track E (Claim threshold + BridgeHypha banner) | CODED |
| 12 | Push 2 Track F (Loomio subgroup removal sync) | CODED |
| 13 | Push 2 Track G (Rate limits) | CODED |
| 14 | Push 2 Track H (Governance nav link) | CODED |
| 15 | ReGen brand SVGs for Loomio | DONE |
| 16 | Loomio overhaul Claude Code prompt | DONE |

### WAITING ON YOU before Claude Code can proceed

- All code changes are written. After `git push`, Railway will deploy automatically.
- Migrations 0108-0111 need to be run against Railway DB (from your Windows machine).
- The Loomio overhaul prompt can be fed to Claude Code immediately.
