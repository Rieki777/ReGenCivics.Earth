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

## Fix 3 -- Blockchain/Wallet Login Option (High)

**Status:** READY FOR CLAUDE CODE

**Symptom:** Only Google and email magic link login exist. No way to authenticate with an Ethereum/Base wallet address.

**Root cause:** Auth system only supports `google`, `apple`, and `email` strategies via `openId` strings (e.g. `google:12345`, `email:user@example.com`). The `playerProfiles` table already has `baseAccountName`, `walletAddress`, and blockchain verification fields, but no login flow connects to them.

### MVP Approach: Paste-Address Login

No wallet signing, no MetaMask dependency. User pastes their Ethereum/Base public address (0x...) into a text field. Server creates a session based on it. This is fast to ship and appropriate for a community game where the threat model is low. Full signature verification can be added later when token balances carry real financial weight.

### Auth Flow (Server)

**New Express route: `POST /api/auth/wallet/login`**

```
Request body: { address: string }
```

1. Validate the address format: must match `/^0x[a-fA-F0-9]{40}$/`
2. Normalize to lowercase: `address.toLowerCase()`
3. Create `openId = "wallet:<normalized_address>"`
4. Call existing `db.upsertUser({ openId, loginMethod: "wallet", lastSignedIn: new Date() })`
   - This creates a row in the `users` table if one doesn't exist, or updates `lastSignedIn` if it does
5. Look up or create `playerProfiles` row:
   - Query `playerProfiles` by `walletAddress = normalized_address`
   - If found and it has no `userId`, link it: set `userId` to the user's id from step 4
   - If found and already linked, good, nothing to do
   - If not found, create new `playerProfiles` row with `walletAddress`, `displayName` = truncated address (e.g. "0xaAaF...354e"), `userId` = user id
6. Create session token: `sdk.createSessionToken(openId, { name: "", expiresInMs: ONE_YEAR_MS })`
7. Set cookie, return `{ success: true }`

**File:** `server/_core/oauth.ts` (add to `registerOAuthRoutes`)

### Auth Flow (Client)

**Update `AuthDialog.tsx`:**

After the email form, add a second divider ("or") and a wallet section:
- Text input: placeholder "0x..." with paste-friendly styling
- Button: "Continue with Wallet Address"
- Validation: show error if address doesn't match `0x` + 40 hex chars
- On submit: `POST /api/auth/wallet/login` with `{ address }`
- On success: redirect to `/` (same as Google/email flows)
- On error: show error message inline

Visual order in the dialog: Google button > divider > Email form > divider > Wallet input

### Account Merge Flow

This is the critical scenario: a player logs in with their wallet first (creating `wallet:0xABC...` in `users` and a `playerProfiles` row). Later, they want to also connect Google or email to the same account.

**Scenario A: Wallet-first player adds Google/email later**

In the Settings page, add a "Connected Accounts" section showing:
- Which login methods are linked to this account (wallet, google, email)
- Buttons to "Link Google Account" and "Link Email" (and "Link Wallet" if they logged in via Google/email first)

When a user clicks "Link Google Account":
1. Redirect to `/api/oauth/google?link=true` (add a `link` query param)
2. In the Google callback, instead of creating a new user, look up the currently logged-in user (from session cookie)
3. Add the Google openId as an additional login method for the same user

**This requires a schema change:** The current `users` table has a single `openId` column. One user = one openId. To support multiple auth methods per user, we need either:
- **Option A (simple, MVP):** New table `user_auth_methods` with columns: `id`, `userId`, `openId`, `loginMethod`, `createdAt`. Move the auth lookup here. The `users` table keeps `openId` as the primary/original method for backward compat.
- **Option B (simpler, even more MVP):** Don't support linking yet. If someone logs in with wallet they get a wallet account. If they log in with Google they get a Google account. They're separate identities. This is what most web3 apps do initially.

**Recommendation for MVP:** Go with Option B. Wallet login works as a standalone auth method. Account linking is a later feature. The `playerProfiles` table already handles the game identity side, so a wallet-only player still gets their full game profile. The only thing they miss is forum features (since `userProfiles` is tied to auth `userId`), but that's acceptable for an MVP where wallet users are primarily game players.

### Scenario B: Google/email player adds wallet later

Already partially handled. The Settings page or profile page has fields for `walletAddress` and `baseAccountName` via the `playerProfiles.update` mutation. When they save a wallet address, it gets stored on their `playerProfiles` row. They can still log in with Google/email. The wallet address becomes a display/verification field.

If they later try to log in with that wallet address directly, Option B means they'd get a separate account. That's fine for MVP. Document this clearly in the UI: "Logging in with a wallet creates a separate player profile."

### Implementation Checklist

1. **Server: wallet login route** (`server/_core/oauth.ts`)
   - `POST /api/auth/wallet/login`
   - Address validation (0x + 40 hex chars)
   - `upsertUser` with `openId = "wallet:<address>"`
   - Look up or create `playerProfiles` row with that wallet address
   - Set session cookie, return success

2. **Client: AuthDialog wallet section** (`client/src/components/AuthDialog.tsx`)
   - New state: `walletAddress`, `walletLoading`, `walletError`
   - Input field + submit button below email form
   - `POST /api/auth/wallet/login` on submit
   - Redirect on success

3. **Client: AuthDialog address validation**
   - Reject if not 42 chars or doesn't start with `0x`
   - Show inline error

4. **DB: wallet lookup helper** (`server/db.ts`)
   - `getPlayerProfileByWalletAddress(address: string)` - may already exist or be easy to add
   - Used by the wallet login route to find/link playerProfiles

5. **Settings page: show login method** (`client/src/components/ProfileEditForm.tsx`)
   - Display which auth method the user logged in with (from `users.loginMethod`)
   - Show wallet address if present on their playerProfile
   - Future: "Link additional account" buttons (post-MVP)

6. **No new npm dependencies required** - pure string validation, no ethers/viem needed

### Security Notes (MVP-Acceptable Tradeoffs)

- Anyone can claim any wallet address. This is a known tradeoff for the paste-address MVP. It's acceptable because:
  - ReGen Civics is a community game, not a DeFi protocol
  - No financial transactions happen through the login
  - Token balances ($RCivics, $ReGen) are display-only cached values, not spendable
  - The `isVerified` flag on `playerProfiles` stays at 0 for unverified addresses
- When token balances carry real weight, upgrade to signature verification: server generates a nonce, user signs it with their wallet, server verifies with `ethers.verifyMessage()` or `viem.verifyMessage()`
- Rate-limit the `/api/auth/wallet/login` endpoint to prevent brute-force address enumeration

### Files to Change

| File | Change |
|------|--------|
| `server/_core/oauth.ts` | Add `POST /api/auth/wallet/login` route |
| `server/db.ts` | Add `getPlayerProfileByWalletAddress()` helper |
| `client/src/components/AuthDialog.tsx` | Add wallet address input section |
| `client/src/components/ProfileEditForm.tsx` | Show connected auth method |

---

## Fix 4 -- Two-Table Architecture: Keep and Document (Low)

**Status:** DONE

**Symptom:** Confusion about why `playerProfiles` and `userProfiles` both exist with overlapping fields.

**Root cause:** The two tables serve different identity layers:
- `playerProfiles` = game identity (blockchain, tokens, quests, badges, location, streaks). Can exist without auth account. Wallet-only players live here.
- `userProfiles` = forum/community identity (reputation, post count, onboarding path, language preference). Always tied to an auth user.

**Fix:** Bidirectional sync (Fix 1) keeps shared fields consistent. The two-table design is validated by the wallet login feature (Fix 3), which creates `playerProfiles` entries for users who may never have a traditional auth account. Document this in CLAUDE.md or a schema doc.

---

## Handoff Breakdown -- Who Does What

### YOU (Rye) -- things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| ALL | `git add server/db.ts FIXES_TO_MAKE_2026-03-30.md && git commit && git push` | Git push requires your machine | Terminal in `C:\Users\taren\Downloads\regen-civics-clean` |
| 1 | Re-save profile from Settings after deploy | Triggers avatar sync to playerProfiles | Visit regencivics.earth/profile, Settings tab, click Save |
| 3 | Test wallet login flow after implementation | Browser-based testing | Visit regencivics.earth, try logging in with a wallet address |

### CLAUDE CODE -- already done or can be done without you

| # | Task | Status |
|---|------|--------|
| 1 | Bidirectional profile sync in db.ts | CODED |
| 1 | Restore truncated functions in db.ts | CODED |
| 2 | resolveAssetUrl routing through /api/img | CODED (prior session) |
| 2 | SmartImagePicker preview fix | CODED (prior session) |
| 2 | CampaignImageGallery, Community, AdminCampaignApproval fixes | CODED (prior session) |
| 3 | Wallet login route (server) | READY |
| 3 | AuthDialog wallet section (client) | READY |
| 3 | getPlayerProfileByWalletAddress helper (db) | READY |
| 3 | Settings page: show auth method | READY |
| 4 | Document two-table architecture | DONE |

### WAITING ON YOU before Claude Code can proceed

- **Fix 1 (Profile Sync):** Needs git push + deploy, then re-save profile to trigger backfill
