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

## Fix 51 — `/investmentform` Uses Tripetto (Not Wired to DB or Admin)

**Status:** CODED — needs deploy

**Symptom:** The `/investmentform` page loads a Tripetto Studio embed (third-party form service). Submissions go to Tripetto's servers — they do NOT appear in `/admin`, the DB, or anywhere else in the site.

**Root cause:** `client/src/pages/InvestmentForm.tsx` uses a hardcoded Tripetto JWT token (`eyJhbGci...`) to load an external form widget. This was an early prototype approach.

**The correct page already exists:** `/investor` (InvestorForm.tsx) is the full investor journey form, properly wired to `trpc.investorInquiries.submit` → Railway MySQL `investor_inquiries` table → visible in `/admin` → triggers welcome email + drip sequence.

**What was done:** `/investmentform` now redirects to `/investor` in App.tsx. The `InvestmentForm` lazy import removed. No internal links pointed to this route so no other files needed updating.

**Files changed:** `client/src/App.tsx`

`client/src/pages/InvestmentForm.tsx` is now dead code and can optionally be deleted.

---

## Fix 52 — `/form` Uses Tripetto (Not Wired to DB or Admin)

**Status:** CODED — needs deploy

**Symptom:** The `/form` page (`client/src/pages/Form.tsx`) is also a Tripetto embed — different token, different form definition. Submissions do not appear anywhere in the site's DB or admin.

**What is this form?** It appears to be a general/catch-all form that predates the `/connect` page. Check if it's still linked anywhere:

```bash
grep -rn '"/form"\|href.*"/form"' client/src/ public/
```

**What was done:** `/form` redirected to `/connect` in App.tsx. `NewsletterSignup.tsx` updated to link directly to `/connect` (it was the only internal caller of `/form`). The Tripetto `Form` component import removed from App.tsx.

**Files changed:** `client/src/App.tsx`, `client/src/components/NewsletterSignup.tsx`

The `client/src/pages/Form.tsx` file itself is now dead code and can be deleted, but this is optional.

---

## Fix 53 — Confirm All Active Form → DB Wiring

**Status:** VERIFIED (for reference)

The following forms are correctly wired to Railway MySQL and will appear in `/admin` once Fix 50 (admin role) is resolved:

| Route | Component | tRPC endpoint | DB table | Admin tab |
|---|---|---|---|---|
| `/apply` | Apply.tsx | `applications.create/submit` | `applications` | Applications |
| `/investor` | InvestorForm.tsx | `investorInquiries.submit` | `investor_inquiries` | Investors |
| `/connect` | Connect.tsx | `generalInquiries.submit` | `general_inquiries` | Inquiries |
| `/connect` | Connect.tsx | `newsletter.subscribe` | `newsletter_subscribers` | Newsletter |

The two Tripetto pages (`/investmentform`, `/form`) are the only ones NOT wired to the DB.

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
