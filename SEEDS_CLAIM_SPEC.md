# SEEDS Token Claim for $ReGen -- Full Spec

**Created:** 2026-04-01
**Status:** Ready to build
**Priority:** Urgent, needs to be live ASAP

---

## Overview

People who bought SEEDS tokens on the Telos blockchain can claim $ReGen tokens on Base (via Hypha). The conversion rate is **100 $ReGen per $1 USD contributed**. Claims are open from now until the **September 2026 equinox** (September 22, 2026). After the deadline, unclaimed tokens are forfeited.

We have a CSV of 1,372 transactions across 801 unique accounts totaling ~$845,427 USD. This data comes from the `tlosto.seeds` contract on Telos. After the claim window closes, Rye will verify all claims against the live blockchain, then mint $ReGen in one batch.

---

## User Flow

### Step 1: Enter SEEDS Account Name

The user lands on `/claim-seeds`. They see:

- Brief explanation of what this is and why (SEEDS is being honored in the new system, your contributions carry forward)
- Input field for their 12-character SEEDS/Telos account name
- Helper text: "This is the account name you created when you signed up for SEEDS. Open your SEEDS wallet to find it in your profile."
- Link to the blockchain explorer for people who need to search: https://eosauthority.com/tokens/token.seeds/SEEDS?network=telos
- Deadline notice: Claims close September 22, 2026

User enters their account name and clicks "Look Up My Account."

### Step 2: Show Contribution Summary

**If found in our database:**

We display:

- Their total USD contribution (sum of all transactions)
- The equivalent $ReGen they'd receive (total USD x 100)
- A breakdown table showing each individual transaction: date, transaction ID (linked to Telos explorer), and USD amount
- This lets them audit the number themselves

Then we ask: **"Did you sell, spend, or transfer any of the SEEDS tokens you purchased?"**

- **No, I still hold all my SEEDS** -- proceed to Step 3
- **Yes, I used some** -- proceed to Step 2b (Spent Tokens)

**If NOT found:**

We show a message: "We don't have a record of purchases from this account. If you believe this is an error, you can submit a claim with evidence below."

This routes them to the Dispute flow (Step 6).

### Step 2b: Spent Tokens Adjustment

If the user says they spent some tokens, we show:

- Their original total USD amount
- An input field: "Approximate USD value of SEEDS you sold, spent, or transferred"
- The adjusted claim amount updates live as they type: (original - spent) x 100 $ReGen
- A clear notice: **"We will verify all claims against the Telos blockchain before minting. The full transaction history for your account is public. Any claim that doesn't match the on-chain record will be denied, and you will lose your ability to claim entirely."**

They can then proceed to Step 3 with the adjusted amount.

### Step 3: Prove You Own This Account

This is the identity verification step. The user chooses one of two paths:

**Path A: Video Introduction (recommended, doubles as Welcome Aboard Quest)**

Record a 30-60 second video. The prompt:

> "Say your name, your SEEDS account name, and share a memory from your time in SEEDS or what drew you to regenerative economics."

- Upload via the R2 upload system (same as land project applications)
- Toggle: **"Share this in the SEEDS Reunion thread so the community can get to know you"** (defaults off)
  - If ON: video gets posted to the SEEDS Reunion forum thread in General. This also completes their Welcome Aboard introduction quest.
  - If OFF: video is visible only to the core team during claim review. Still counts as identity verification.
- Either way, this doubles as the introduction quest in the Welcome Aboard series if they have a regencivics.earth account.

**Path B: On-Chain Verification**

For people who still have access to their SEEDS wallet and private keys:

- Send exactly **0.001 SEEDS** to the account `thealchemist` from the account they are claiming
- The memo field must contain the reference code displayed on screen (format: `claim-[seedsAccountName]`)
- The system can verify this transaction on the Telos blockchain
- This is a cryptographic proof of ownership that requires no video

**Path C: Both**

Users who verify on-chain can still record a video introduction to share with the community. The video is optional in this case but encouraged. "You've already proven ownership. Want to introduce yourself to the community too?"

### Step 4: Join the Community (Account Required)

Before proceeding to wallet entry and submission, the user must create a regencivics.earth account or log in. This is the commitment gate.

**The framing here is important.** This distribution is specifically for people who are joining and building now. The copy should communicate that clearly, while also acknowledging that people who aren't ready to join yet aren't being left behind. Something like:

> This contribution distribution is for people who are joining us now to build this together. Your $ReGen tokens are part of how we meet our needs and thrive on this earth together, and claiming them means becoming part of the community that's making this real.
>
> If you're not ready to join right now, that's okay. Depending on how SEEDS 3.0 develops, we may do a full airdrop to every SEEDS account holder in the future, whether or not they're active in ReGen Civics. If that happens, you'll have the chance to do what you want with your tokens then, including selling them once there are buyers. So there's no pressure to claim now if this isn't your moment.

This framing does two things: it makes clear that claiming now is an act of participation (you're joining the community), and it gives people who aren't ready a reason to wait rather than feeling excluded. No guilt, no pressure, just honesty about what each path means.

- "Create Account" button (routes to registration flow, then returns to claim form)
- "Log In" button (for people who already have accounts)
- The claim form saves progress to localStorage so nothing is lost during account creation

**This step also means:**
- The claim gets linked to their user account in the database
- They can receive notifications about their claim status through their profile
- The video introduction (if they did one publicly) can be auto-posted to the forum under their account
- Their Welcome Aboard quest can be marked complete

### Step 5: Hypha/Base Wallet + Confirm + Submit (Happy Path)

**Wallet entry:**

- "ReGen Civics has upgraded to Base (Coinbase's blockchain). Your $ReGen tokens will be sent to your Hypha account on Base."
- "If you already have a Hypha account, enter your Base wallet address below."
- "If you don't have one yet, go to [app.hypha.earth](https://app.hypha.earth) to create a free Base blockchain account, then come back and enter it here."
- Input field for their Base wallet address (0x format). Validated as 0x + 40 hex characters.

**Confirmation summary:**

- SEEDS account name
- Verification method (video / on-chain / both)
- Original USD contribution
- Any spent/sold adjustment
- Final claim amount in USD
- Final $ReGen amount (USD x 100)
- Hypha/Base wallet where tokens will be sent
- Checkbox: "I confirm this information is accurate. I understand that claims are verified against the blockchain and fraudulent claims result in permanent disqualification."

Submit button. On success: confirmation message with a reference number and expected timeline ("Claims will be verified and $ReGen tokens minted after September 22, 2026").

**Re-submission:** Users can come back and update their claim anytime before the September equinox. If they look up an account that already has a claim, we show their existing claim data and let them edit and resubmit.

### Step 6: Dispute Path (Claiming a Different Amount)

If the user was not found, or wants to claim more than our records show, they enter the dispute flow:

- Input: SEEDS account name (pre-filled if they already entered it)
- Input: USD amount they're claiming
- Textarea: Explanation of why their claim differs from our records
- File upload: Evidence (screenshots of wallet, transaction receipts, blockchain explorer links)
- Same fraud warning as above
- Same identity verification step (Step 3)
- Same account requirement (Step 4)
- Same Hypha/Base wallet field

On submit: goes into the admin review queue. The user sees: "Your claim has been submitted for review. You'll be notified of the outcome."

### SEEDS Reunion Forum Thread

A pinned thread in the General category: **"SEEDS Reunion: Faces Behind the Accounts"**

This is where public video introductions land. When a user opts to share their video with the community, a forum reply is auto-posted under their account in this thread containing their video and a short intro. The community can welcome them, respond, start conversations.

This thread also serves as a historical archive of the people who carried their contributions forward from SEEDS into ReGen Civics.

---

## Database Schema

### Table: `seedsContributions` (pre-loaded from CSV)

This is the lookup table. Populated once from the CSV, never edited by users.

| Column | Type | Description |
|--------|------|-------------|
| id | int, PK, auto | Row ID |
| recipientAccount | varchar(12) | SEEDS/Telos account name |
| transactionId | varchar(16) | Telos transaction hash (first 8 chars) |
| date | timestamp | Transaction date |
| usdValueRaw | int | Raw value from CSV (multiply by 10000 = actual cents representation) |
| usdValue | double | Actual USD value (usdValueRaw / 10000) |
| createdAt | timestamp | When we imported this row |

Index on `recipientAccount` for fast lookups.

### Table: `seedsClaims` (user submissions)

| Column | Type | Description |
|--------|------|-------------|
| id | int, PK, auto | Claim ID |
| seedsAccount | varchar(12) | Their SEEDS/Telos account name |
| userId | int, nullable, FK | Link to their regencivics.earth user account (set when they log in/register in Step 4) |
| email | varchar(320) | Contact email (from their account) |
| originalUsdTotal | double | The total USD we have on record for them |
| spentUsdAmount | double | USD value of tokens they say they spent/sold (0 if none) |
| claimedUsdAmount | double | Final USD amount they're claiming (original - spent, or custom amount for disputes) |
| regenAmount | double | $ReGen to receive (claimedUsdAmount x 100) |
| baseWalletAddress | varchar(42) | Their 0x Base/Hypha wallet address |
| verificationMethod | enum | "video", "onchain", "both" |
| videoUrl | varchar(512), nullable | R2 URL of their uploaded video introduction |
| videoPublic | boolean, default false | Whether they opted to share the video in the SEEDS Reunion thread |
| onchainTxVerified | boolean, default false | Whether the 0.001 SEEDS transaction to thealchemist has been confirmed |
| onchainTxId | varchar(64), nullable | Telos transaction ID of the verification transfer |
| isDispute | boolean | True if they're claiming a different amount than our records |
| disputeReason | text, nullable | Why their claim differs (dispute path only) |
| evidenceUrls | text, nullable | JSON array of uploaded file URLs (dispute path only) |
| status | enum | pending, approved, denied, flagged |
| adminNotes | text, nullable | Notes from admin review |
| reviewedAt | timestamp, nullable | When admin reviewed this claim |
| reviewedBy | int, nullable | Admin user ID who reviewed |
| createdAt | timestamp | When claim was submitted |
| updatedAt | timestamp | Last update |

Unique index on `seedsAccount` (one claim per SEEDS account). Index on `status` for admin filtering. Index on `userId`.

---

## API Routes (tRPC)

New router: `seedsClaimsRouter` in `server/routes/seedsClaims.ts`

### Public Procedures

**`seedsClaims.lookup`** -- `publicProcedure`
- Input: `{ seedsAccount: string }` (validated: exactly 12 chars, lowercase alphanumeric + dots)
- Returns: `{ found: boolean, totalUsd: number, transactions: Array<{ transactionId, date, usdValue }> }` or `{ found: false }`
- Queries `seedsContributions` table grouped by account

**`seedsClaims.submit`** -- `protectedProcedure` (requires login)
- Input: full claim data (seedsAccount, spentUsdAmount, baseWalletAddress, verificationMethod, videoUrl?, videoPublic?, onchainTxId?, etc.)
- Validates: account format, amounts make sense (spent <= original), wallet address format, at least one verification method provided
- Links claim to the logged-in user's ID and email
- Creates row in `seedsClaims` with status `pending`
- If videoPublic is true, auto-posts a reply in the SEEDS Reunion forum thread with embedded video
- If video was submitted, marks Welcome Aboard introduction quest as complete
- Returns: `{ claimId, regenAmount }`

**`seedsClaims.submitDispute`** -- `protectedProcedure` (requires login)
- Input: claim data + disputeReason + evidenceUrls
- Same validation + requires reason text
- Creates row with `isDispute: true`, status `pending`
- Returns: `{ claimId }`

**`seedsClaims.checkExisting`** -- `publicProcedure`
- Input: `{ seedsAccount: string }`
- Returns: `{ exists: boolean, status?: string }` so we can tell the user if they already claimed

### Admin Procedures

**`seedsClaims.adminList`** -- `adminProcedure`
- Input: `{ status?: string, isDispute?: boolean, page, limit }`
- Returns paginated list of claims with stats

**`seedsClaims.adminReview`** -- `adminProcedure`
- Input: `{ claimId, status: 'approved' | 'denied' | 'flagged', adminNotes? }`
- Updates claim status, records reviewer and timestamp

**`seedsClaims.adminStats`** -- `adminProcedure`
- Returns: total claims, total $ReGen committed, claims by status, disputes count

**`seedsClaims.adminExport`** -- `adminProcedure`
- Returns all approved claims as a flat list for the September batch mint

---

## Admin Panel

New tab: **"SEEDS Claims"** in the admin panel.

**Dashboard view:**
- Stats cards: Total claims, Approved, Pending, Disputes, Denied, Total $ReGen committed
- Filter by status (all / pending / approved / denied / flagged / disputes only)
- Searchable by SEEDS account name or email

**Claim detail view:**
- Full claim data
- Side-by-side: "Our records" vs "Their claim" for easy comparison
- Verification status: which method they used (video / on-chain / both), with embedded video player if applicable
- For on-chain verification: link to the Telos transaction showing the 0.001 SEEDS transfer
- For disputes: show their explanation and uploaded evidence
- Action buttons: Approve / Deny / Flag
- Notes field for admin comments
- Link to Telos blockchain explorer for their account
- Link to their regencivics.earth profile

**Export button:**
- Downloads all approved claims as CSV for the September batch mint
- Columns: seedsAccount, email, baseWalletAddress, verificationMethod, approvedUsdAmount, regenAmount

---

## Frontend Page: `/claim-seeds`

Single page, multi-step form following the existing pattern from Apply.tsx:

- Step indicator at top (like the existing forms)
- Glass card styling consistent with the rest of the site
- Login required at Step 4 (but Steps 1-3 work without login, so people can look up their account and start the process before committing)
- LocalStorage draft saving (so if they leave and come back, their progress is preserved)
- Mobile responsive

**Steps rendered conditionally:**
1. Account Lookup
2. Contribution Review + Spent Tokens Question
3. Prove Ownership (video intro / on-chain verification / both)
4. Join the Community (create account or log in, with commitment framing)
5. Base Wallet + Confirm + Submit

The dispute path branches from Step 2 if account is not found, but still requires Steps 3-5.

---

## Data Import

One-time seed script to import the CSV into `seedsContributions`:

- Read `tlosto_seeds_transactions.csv`
- Parse each row: map `recipientAccount`, `transactionId`, `date`, `multipliedUsdValue`
- Store raw value and computed USD value (raw / 10000)
- Run as `npm run seed:seeds-claims` or similar

---

## Verification (Post-Deadline, Manual)

This happens in September, outside the app:

1. Export all approved claims
2. For each SEEDS account, check the Telos blockchain for current token balance
3. Cross-reference with their original purchase amounts and claimed spent amounts
4. Flag any accounts where the math doesn't add up
5. Batch mint $ReGen to all verified Hypha/Base accounts

This is a Rye task, not automated in the app.

---

## Copy Notes

All user-facing text should follow the ReGen Civics voice rules:
- No em-dashes
- No contrast-framing
- No AI word patterns
- Direct, grounded, specific
- First person where appropriate

The page should feel welcoming to people who might not have heard from the SEEDS community in a while. This is a homecoming. The tone is: "Your early contributions matter. We're honoring them in the new system."

---

## Resolved Questions

1. **Hypha account format:** Validate as a 0x Ethereum/Base wallet address (0x followed by 40 hex chars).
2. **Notification emails:** Users have regencivics.earth accounts (required in Step 4), so they get notified through their profile. Batch email updates in Fall 2026 for status changes.
3. **Page placement:** Direct link only. Linked from the Game page contributions section and the SEEDS blog post.
4. **Evidence uploads:** Yes, use the same R2 file upload system as land project applications.
5. **Existing claim edits:** Users can resubmit and change their claim anytime until the September equinox event.
6. **Account required:** Yes. Creating a regencivics.earth account is required before submitting a claim. This is a commitment gate: the distribution is for people who intend to stay and build.
7. **Identity verification:** Three paths: (A) video introduction, (B) on-chain proof via 0.001 SEEDS transfer to `thealchemist` with memo `claim-[accountName]`, (C) both.
8. **Video sharing:** Optional toggle to share publicly in the SEEDS Reunion forum thread. Private videos are visible only to core team during review. Public videos auto-post as a reply in the SEEDS Reunion thread.
9. **Quest integration:** The video introduction doubles as the Welcome Aboard introduction quest. Completing the claim flow with a video marks that quest as done on their profile.
10. **Commitment framing:** Step 4 (account creation) makes clear this distribution is for people joining now. For those not ready, we mention the possibility of a future full SEEDS airdrop (depending on SEEDS 3.0), where they could sell tokens once there are buyers. No guilt, just clarity about what each path means.
11. **SEEDS 3.0 airdrop:** If ReGen Civics becomes what SEEDS is doing (SEEDS 3.0), a 100% airdrop to all SEEDS accounts is possible regardless of whether they joined ReGen Civics. This is mentioned as a future possibility in the Step 4 copy, giving non-joiners a reason to wait rather than feel excluded.

## Site Integration Points

These links to `/claim-seeds` need to be added:

1. **Game.tsx contributions section** (id="seeds-legacy"): Make the intro text collapsible. Add a "Claim Financial Contributions" button with golden glow. Fix "Join the discussion" link from /community/post/560 to /community/post/625. (DONE)
2. **Blog post "Your SEEDS Contributions Live On"**: Add a claim button at top and bottom of the post content. (DONE)
3. **SEEDS Reunion forum thread**: Pinned thread in General category where public video introductions are posted. Needs to be seeded.

---

## File Inventory (to create)

| File | Purpose |
|------|---------|
| `drizzle/schema.ts` | Add `seedsContributions` + `seedsClaims` tables |
| `drizzle/relations.ts` | Add relations if needed |
| `server/routes/seedsClaims.ts` | tRPC router with all endpoints |
| `server/routers.ts` | Register the new router |
| `client/src/pages/ClaimSeeds.tsx` | The claim form page |
| `client/src/components/admin/AdminSeedsClaimsTab.tsx` | Admin panel tab |
| `client/src/pages/Admin.tsx` | Add the new tab |
| `server/seeds/seedsClaims.ts` | CSV import script |
| `App.tsx` or routing config | Add `/claim-seeds` route |
| `scripts/seed-seeds-reunion-thread.ts` | Create the SEEDS Reunion pinned forum thread |
