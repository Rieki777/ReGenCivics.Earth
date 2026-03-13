# Fixes to Make — 2026-03-12

This document continues from `FIXES_TO_MAKE_2026-03-11.md`. All fixes below are new findings from the 2026-03-12 session.

---

## Fix 50 — Admin Dashboard Shows 0 For All Data (Critical)

**Status:** CODED (scripts ready) — HUMAN steps required

**Symptom:** `/admin` shows "0 total · 0 awaiting review" for applications, 0 investor inquiries, 0 general inquiries — even though the globe map correctly shows submitted applications ("Living University Network", "Aquarella").

**Root cause:** `OWNER_OPEN_ID` in both the local `.env` and likely Railway is still set to the placeholder value `google:your-google-user-id` instead of your real Google account ID. Because no real ID ever matches, `upsertUser()` never assigns `role='admin'` to your account. Every admin tRPC endpoint (`applications.list`, `investorInquiries.list`, `generalInquiries.list`) checks `ctx.user.role === 'admin'` and throws `FORBIDDEN` when it doesn't match — React Query silently returns `undefined`, and the UI shows 0.

The map works because `applications.mapData` is a `publicProcedure` with no role check.

**Why the data is there:** The map is showing real DB records (not hardcoded). Those records exist. The admin just can't see them yet.

**Fix — two steps, do them in this order:**

### Step 1: Set your role to admin in the DB (run on Windows)

```powershell
# From project root — load .env vars into PowerShell session
$env = Get-Content .env | Where-Object { $_ -match '=' -and $_ -notmatch '^#' }
foreach ($line in $env) { $k,$v = $line -split '=',2; [System.Environment]::SetEnvironmentVariable($k,$v) }

# Run the fix script with your Google login email
$Env:TARGET_EMAIL="rieki.cordon@gmail.com"; npx tsx scripts/fix-admin-role.ts
```

The script will print something like:

```
Found user:
  id:      3
  email:   rieki.cordon@gmail.com
  role:    user
  open_id: google:123456789012345678901

Updated role to 'admin' for user id=3

👉  Set OWNER_OPEN_ID in Railway to: google:123456789012345678901
```

### Step 2: Update OWNER_OPEN_ID in Railway

1. Go to your Railway project
2. Select the backend service → Variables
3. Find `OWNER_OPEN_ID` → change it to the `google:NUMERIC_ID` printed by the script
4. Railway will redeploy automatically

### Step 3: Sign out and back in

Sign out of `regencivics.earth` and sign back in with your Google account. The `upsertUser` function runs on every login and will re-confirm your admin role going forward.

**Files added:** `scripts/fix-admin-role.ts`, `scripts/check-db.ts`

---

## Fix 51 + 52 — Remove All Tripetto Forms

**Status:** CODED — needs deploy

**What Tripetto was:** An early prototype approach using an external third-party form service. Submissions went to Tripetto's servers and never touched the Railway DB, admin dashboard, or any site logic. Not used anymore. Everything is now handled with native tRPC forms writing directly to Railway MySQL.

**What was removed:**

- `client/src/pages/InvestmentForm.tsx` — gutted to a deprecation stub. Route `/investmentform` now redirects to `/investor` (the real DB-backed investor form).
- `client/src/pages/Form.tsx` — gutted to a deprecation stub. Route `/form` now redirects to `/connect` (the real DB-backed contact/newsletter form).
- `client/src/components/NewsletterSignup.tsx` — "Subscribe" button changed from `/form` to `/connect` directly.
- `client/src/App.tsx` — lazy imports for both Tripetto pages removed. Redirect routes added.
- `client/src/pages/Connect.tsx` — removed stale "Based on Tripetto form structure" comment in the file header.

The two stub files (`Form.tsx`, `InvestmentForm.tsx`) can be deleted from the repo once you push. They contain no code that runs.

**Files changed:** `client/src/App.tsx`, `client/src/components/NewsletterSignup.tsx`, `client/src/pages/Form.tsx`, `client/src/pages/InvestmentForm.tsx`, `client/src/pages/Connect.tsx`

---

## Fix 53 — All Active Forms Now Wired to DB

**Status:** VERIFIED

Every form on the site writes to Railway MySQL via tRPC and will appear in `/admin` once Fix 50 (admin role) is resolved:

| Route | Component | tRPC endpoint | DB table | Admin tab |
|---|---|---|---|---|
| `/apply` | Apply.tsx | `applications.create/submit` | `applications` | Applications |
| `/investor` | InvestorForm.tsx | `investorInquiries.submit` | `investor_inquiries` | Investors |
| `/connect` | Connect.tsx | `generalInquiries.submit` | `general_inquiries` | Inquiries |
| `/connect` | Connect.tsx | `newsletter.subscribe` | `newsletter_subscribers` | Newsletter |

No Tripetto embeds remain anywhere in the codebase.

---

## Fix 54 — Run Pending Scripts (Previously Fix 44)

**Status:** SCRIPTS READY — HUMAN step required

All 4 CSV files are confirmed present in `scripts/data/`. Run all 5 scripts in one PowerShell session:

```powershell
# From project root — load .env first
$env = Get-Content .env | Where-Object { $_ -match '=' -and $_ -notmatch '^#' }
foreach ($line in $env) { $k,$v = $line -split '=',2; [System.Environment]::SetEnvironmentVariable($k,$v) }

# Check DB state first (optional but recommended)
npx tsx scripts/check-db.ts

# Import CSV data
npx tsx scripts/import-users.ts
npx tsx scripts/import-applications.ts
npx tsx scripts/import-general-inquiries.ts
npx tsx scripts/import-video-suggestions.ts

# Seed quest comments (requires your user ID from check-db.ts output)
$Env:RYE_USER_ID=1; npx tsx scripts/seed-quest-comments.ts
```

Note: Run `check-db.ts` first to get your user ID for the `RYE_USER_ID` variable.

---

## Fix 55 — Commit and Push All Modified Files

**Status:** BLOCKED — Claude Code is running concurrently in this repo, holding `.git/index.lock`

**What happened:** Running `git add -A && git commit` fails with:
```
fatal: Unable to create '.git/index.lock': File exists.
Another git process seems to be running in this repository.
```

Claude Code is actively working in `regen-civics-clean` at the same time. The git index is locked while it runs.

**Fix:** Wait until Claude Code finishes its current task, then run:

```powershell
git add -A
git commit -m "feat: Implement fixes 1-55 — remove Tripetto, redirect to DB forms, fix admin role scripts"
git push origin main
```

If the lock file is stale (Claude Code crashed or finished but didn't clean up):
```powershell
Remove-Item .git\index.lock
git add -A
git commit -m "feat: Implement fixes 1-55 — remove Tripetto, redirect to DB forms, fix admin role scripts"
git push origin main
```

If push is rejected (diverged history):
```powershell
git pull origin main --rebase
git push origin main
```

---

## Fix 56 — Script Column Name Bug (`open_id` vs `openId`)

**Status:** FIXED

Both `scripts/fix-admin-role.ts` and `scripts/check-db.ts` used `open_id` (snake_case) in raw SQL queries. The actual MySQL column name is `openId` (camelCase) as defined in `drizzle/schema.ts`. This caused:
```
DB error: Unknown column 'open_id' in 'field list'
```

**Fixed in both scripts:** all SQL queries now use `openId` and `createdAt` (camelCase to match schema).

---

## Summary: Priority Order

1. **Fix 50** (admin role) — run `fix-admin-role.ts` + update Railway `OWNER_OPEN_ID` — unblocks admin visibility for all existing data
2. **Fix 55** (git push) — wait for Claude Code to finish, then commit + push all changes live
3. **Fix 54** (run import scripts) — imports CSV data into DB
4. Fix 51+52+53 already coded and waiting in the commit above

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 50a | Run `fix-admin-role.ts` | Needs Railway DB access from Windows | `$Env:TARGET_EMAIL="rieki.cordon@gmail.com"; npx tsx scripts/fix-admin-role.ts` |
| 50b | Update `OWNER_OPEN_ID` in Railway | Requires Railway dashboard login | Railway → your service → Variables |
| 50c | Sign out and back in to site | Browser session | regencivics.earth |
| 54 | Run all 5 import scripts | Needs Railway DB access from Windows | Load `.env` in PowerShell, then run scripts one by one (see Fix 54) |
| 55 | `git add -A && git commit && git push` | Git index locked while Claude Code runs — wait for it to finish | Run when Claude Code is idle |

### CLAUDE CODE — already done or can be done without you

| # | Task | Status |
|---|------|--------|
| 51+52 | Remove all Tripetto code, redirect routes | CODED |
| 53 | Verify all forms wired to DB | VERIFIED |
| 56 | Fix `open_id` → `openId` column name in scripts | FIXED |
| 50-scripts | Write `fix-admin-role.ts` and `check-db.ts` | DONE |
| Any new code fixes | Anything in the fixes doc marked CODED | Ready to deploy once you push |

### WAITING ON YOU before Claude Code can proceed

Any new fixes that require knowing your Railway `OWNER_OPEN_ID` or confirming DB state (user IDs, row counts) are blocked until you run the scripts above and share the output.
