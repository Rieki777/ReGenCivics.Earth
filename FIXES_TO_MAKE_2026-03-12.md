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

## Fix 55 — Commit and Push 117 Modified Files

**Status:** HUMAN step required

117 files are sitting uncommitted locally. Until they're pushed, the live site is running old code.

```powershell
git add -A
git commit -m "feat: Implement fixes 1-49 + admin tooling scripts"
git push origin main
```

If push is rejected (diverged history):

```powershell
git pull origin main --rebase
git push origin main
```

---

## Summary: Priority Order

1. **Fix 50** (admin role) — run `fix-admin-role.ts` + update Railway `OWNER_OPEN_ID` — unblocks admin visibility for all existing data
2. **Fix 55** (git push) — gets all coded fixes live
3. **Fix 54** (run import scripts) — imports CSV data into DB
4. **Fix 51** (redirect `/investmentform` → `/investor`) — stops investor data going to Tripetto void
5. **Fix 52** (decide what to do with `/form`) — either redirect or delete
