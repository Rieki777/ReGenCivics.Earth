# Claude Code Execution Prompt: Form Readability Overhaul

**Created:** 2026-04-02
**Priority:** HIGH - forms are currently unreadable in dark mode
**Skill reference:** Read `.claude/skills/regen-form-design/SKILL.md` before starting

## Context

The site runs in dark mode (`.dark` class on html). CSS variables change card backgrounds to dark green, but forms were built with hardcoded light-mode colors (`text-gray-700`, `bg-amber-50`, `border-gray-200`). Result: text is nearly invisible against dark card backgrounds. Every form on the site has this problem.

The root cause is in `client/src/index.css` where `.dark` sets:
- `--card: oklch(0.18 0.04 145)` (dark green)
- `--card-foreground: oklch(0.95 0.01 85)` (near-white)
- `--background: oklch(0.12 0.03 145)` (very dark green)

Forms that use `text-gray-600`, `bg-amber-50`, `border-amber-200` etc. ignore these theme variables entirely.

## Part A: ClaimSeeds.tsx Full Overhaul

File: `client/src/pages/ClaimSeeds.tsx`

### A1. Remove forced light page background

**Find:**
```tsx
<div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12 px-4 sm:px-6 lg:px-8">
```

**Replace with (all 2 instances - success screen and main form):**
```tsx
<div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
```

### A2. Fix step indicator colors

**Find the step indicator section and replace colors:**

Active step: `bg-amber-600 text-white` -> `bg-primary text-primary-foreground`
Completed step: `bg-green-600 text-white` -> `bg-primary/80 text-primary-foreground`
Future step: `bg-gray-300 text-gray-600` -> `bg-muted text-muted-foreground`
Step labels: `text-xs text-gray-600 mt-2` -> `text-xs text-muted-foreground mt-2`

### A3. Fix all Card borders

**Find (all instances):**
```tsx
<Card className="border-amber-400">
```
and
```tsx
<Card className="border-amber-400 shadow-lg">
```

**Replace with:**
```tsx
<Card className="border-primary/30">
```
and
```tsx
<Card className="border-primary/30 shadow-lg">
```

### A4. Fix CardDescription (already uses theme class, verify it works)

CardDescription should use `text-muted-foreground` by default from shadcn. Verify this.

### A5. Fix all hardcoded text colors

Do a full sweep of ClaimSeeds.tsx. Every instance must change:

| Find | Replace With |
|------|-------------|
| `text-gray-600` | `text-muted-foreground` |
| `text-gray-700` | `text-foreground` |
| `text-gray-900` | `text-foreground` |
| `text-amber-600` (links) | `text-primary hover:text-primary/80` |
| `text-amber-700` (links/text) | `text-primary` |
| `text-amber-900` | `text-foreground` |
| `text-green-600` (success icon) | `text-primary` |
| `text-red-600` | `text-destructive` |
| `text-red-700` | `text-destructive` |
| `text-blue-900` | `text-foreground` |

### A6. Fix all hardcoded background boxes

| Find | Replace With |
|------|-------------|
| `bg-amber-50 border border-amber-200` | `bg-muted border border-border` |
| `bg-blue-50 border border-blue-200` | `bg-primary/10 border border-primary/20` |
| `bg-red-50 border border-red-200` | `bg-destructive/10 border border-destructive/20` |
| `bg-gray-50` (summary panel) | `bg-muted` |
| `bg-white rounded-lg` (adjusted amount box) | `bg-muted rounded-lg` |

### A7. Fix table styling

In the transactions table:

```tsx
// Table header row
<tr className="border-b border-border">
  <th className="text-left py-2 font-medium text-foreground">Date</th>
  <th className="text-left py-2 font-medium text-foreground">Transaction ID</th>
  <th className="text-right py-2 font-medium text-foreground">Amount</th>
</tr>

// Table body rows
<tr className="border-b border-border/50">
  <td className="py-3 text-muted-foreground">{date}</td>
  <td className="py-3">
    <a className="text-primary hover:text-primary/80 underline text-xs font-mono flex items-center gap-1">
      ...
    </a>
  </td>
  <td className="py-3 text-right text-foreground">${amount}</td>
</tr>
```

### A8. Fix button colors

| Find | Replace With |
|------|-------------|
| `bg-amber-600 hover:bg-amber-700` | `bg-primary text-primary-foreground hover:bg-primary/90` |

### A9. Fix divider lines

| Find | Replace With |
|------|-------------|
| `border-gray-200` | `border-border` |
| `border-gray-100` | `border-border/50` |
| `bg-gray-200` (divider) | `bg-border` |
| `border-t` (without color) | `border-t border-border` |

### A10. Fix the confirmation checkbox label

```tsx
// Find
<label htmlFor="confirm" className="text-sm leading-relaxed text-gray-700">

// Replace
<label htmlFor="confirm" className="text-sm leading-relaxed text-foreground">
```

### A11. Fix success screen colors

In the isSubmitted return block:
- `text-amber-900` -> `text-foreground`
- `text-amber-700` -> `text-primary`
- `font-mono text-lg text-amber-700` -> `font-mono text-lg text-primary`
- `text-gray-700` -> `text-muted-foreground`
- `text-gray-900` -> `text-foreground`
- `bg-amber-50 border border-amber-200` -> `bg-muted border border-border`
- `bg-blue-50 border border-blue-200` -> `bg-primary/10 border border-primary/20`
- `text-blue-900` -> `text-foreground`
- `bg-amber-600 hover:bg-amber-700` -> `bg-primary text-primary-foreground hover:bg-primary/90`

### A12. Fix external link colors

```tsx
// Find
className="text-amber-600 hover:text-amber-700 underline"

// Replace
className="text-primary hover:text-primary/80 underline"
```

All instances throughout the file.

### A13. Fix Continue button disabled logic (ALREADY DONE - DO NOT REVERT)

The Continue button on step 2 (non-dispute) had broken disabled logic. It was `disabled={!formData.hasSpentTokens && step === 2}` which blocked users who selected "No, I still hold all my SEEDS." This has been fixed to `disabled={formData.hasSpentTokens && formData.spentAmount <= 0}` which only blocks when they said yes to spending but haven't entered an amount. **Do not change this line.**

### A14. Update Step 1 copy and link text

The "View SEEDS token information" link currently just points to token info. Update it to also help people find their account name. Replace the link section in step 1:

**Find:**
```tsx
<div className="flex gap-2 text-sm">
  <ExternalLink className="w-4 h-4 text-amber-600 flex-shrink-0" />
  <a
    href="https://eosauthority.com/tokens/token.seeds/SEEDS?network=telos"
    target="_blank"
    rel="noopener noreferrer"
    className="text-amber-600 hover:text-amber-700 underline"
  >
    View SEEDS token information
  </a>
</div>
```

**Replace with:**
```tsx
<div className="flex flex-col gap-2 text-sm">
  <div className="flex gap-2">
    <ExternalLink className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
    <a
      href="https://eosauthority.com/tokens/token.seeds/SEEDS?network=telos"
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:text-primary/80 underline"
    >
      View SEEDS token information and look up account names
    </a>
  </div>
</div>
```

Also update the helper text below the input to mention looking up account names:

**Find:**
```tsx
<p className="text-sm text-gray-600">
  This is the account name you created when you signed up for SEEDS. Check
  your SEEDS wallet profile to find it.
</p>
```

**Replace with:**
```tsx
<p className="text-sm text-muted-foreground">
  This is the account name you created when you signed up for SEEDS. Check
  your SEEDS wallet profile to find it, or use the link below to look up
  different account names on the Telos blockchain if you forgot yours.
</p>
```

---

## Part B: Add SEEDS Amount Option for Spent Tokens

When a user says "Yes, I used some" on step 2, currently they can only enter USD value. Add the option to enter the amount in SEEDS tokens instead.

### B1. Add spentUnit to form data type

```tsx
type ClaimFormData = {
  seedsAccount: string;
  totalUsd: number;
  adjustedUsd: number;
  spentAmount: number;
  spentUnit: "usd" | "seeds";  // NEW
  hasSpentTokens: boolean;
  transactions: Transaction[];
  baseWalletAddress: string;
  email: string;
  disputeExplanation: string;
  disputeEvidence: UploadedFile[];
  isOnDisputePath: boolean;
};
```

### B2. Update INITIAL_FORM_DATA

```tsx
const INITIAL_FORM_DATA: ClaimFormData = {
  seedsAccount: "",
  totalUsd: 0,
  adjustedUsd: 0,
  spentAmount: 0,
  spentUnit: "usd",  // NEW
  hasSpentTokens: false,
  transactions: [],
  baseWalletAddress: "",
  email: "",
  disputeExplanation: "",
  disputeEvidence: [],
  isOnDisputePath: false,
};
```

### B3. Update handleSpentAmountChange to handle both units

```tsx
const handleSpentAmountChange = (amount: number) => {
  updateField("spentAmount", amount);
  // Convert SEEDS to USD if needed for the adjusted calculation
  const usdDeduction = formData.spentUnit === "seeds"
    ? amount * 0.01  // 100 SEEDS = $1 USD (inverse of the 100:1 ratio)
    : amount;
  updateField("adjustedUsd", Math.max(0, formData.totalUsd - usdDeduction));
};
```

**Important:** Also add a `useEffect` or handler so that when `spentUnit` changes, the adjustedUsd recalculates with the current spentAmount:

```tsx
const handleUnitChange = (unit: "usd" | "seeds") => {
  updateField("spentUnit", unit);
  // Recalculate with current amount but new unit
  const usdDeduction = unit === "seeds"
    ? formData.spentAmount * 0.01
    : formData.spentAmount;
  updateField("adjustedUsd", Math.max(0, formData.totalUsd - usdDeduction));
};
```

### B4. Update the spent amount input section (step 2, inside `formData.hasSpentTokens` block)

Replace the current spent amount input with a unit toggle + input:

```tsx
{formData.hasSpentTokens && (
  <div className="space-y-4 bg-primary/10 border border-primary/20 rounded-lg p-4">
    <div className="space-y-3">
      <Label htmlFor="spentAmount" className="text-sm font-medium text-foreground">
        Amount you sold, spent, or transferred
      </Label>

      {/* Unit toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleUnitChange("usd")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            formData.spentUnit === "usd"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          USD ($)
        </button>
        <button
          type="button"
          onClick={() => handleUnitChange("seeds")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            formData.spentUnit === "seeds"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          SEEDS
        </button>
      </div>

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
          {formData.spentUnit === "usd" ? "$" : ""}
        </span>
        <Input
          id="spentAmount"
          type="number"
          min="0"
          step={formData.spentUnit === "usd" ? "0.01" : "1"}
          value={formData.spentAmount || ""}
          onChange={(e) => handleSpentAmountChange(parseFloat(e.target.value) || 0)}
          placeholder={formData.spentUnit === "usd" ? "0.00" : "0"}
          className={`text-lg ${formData.spentUnit === "usd" ? "pl-7" : ""}`}
        />
      </div>

      {formData.spentUnit === "seeds" && formData.spentAmount > 0 && (
        <p className="text-xs text-muted-foreground">
          Equivalent to ~${(formData.spentAmount * 0.01).toFixed(2)} USD
        </p>
      )}
    </div>

    {/* Adjusted Amount */}
    <div className="bg-muted rounded-lg p-3 space-y-2">
      <p className="text-xs text-muted-foreground">Adjusted USD Amount</p>
      <p className="text-2xl font-bold text-foreground">
        ${formData.adjustedUsd.toFixed(2)}
      </p>
      <p className="text-xs text-muted-foreground">
        {(formData.adjustedUsd * 100).toLocaleString()} $ReGen tokens
      </p>
    </div>

    {/* Fraud Warning */}
    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mt-4">
      <p className="text-xs font-medium text-foreground flex gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-destructive" />
        <span>
          We will verify all claims against the Telos blockchain before minting.
          The full transaction history for your account is public. Any claim that
          doesn't match the on-chain record will be denied, and you will lose your
          ability to claim entirely.
        </span>
      </p>
    </div>
  </div>
)}
```

### B5. Update the dispute path amount field too

In the dispute path (step 2, `formData.isOnDisputePath`), add the same unit toggle for the "USD Amount Claiming" field. Same pattern: toggle between USD and SEEDS, with conversion display.

### B6. Update the confirmation summary (step 4)

If the user entered the spent amount in SEEDS, show both values:

```tsx
{formData.hasSpentTokens && formData.spentAmount > 0 && (
  <>
    <div className="flex justify-between items-start">
      <span className="text-sm text-muted-foreground">Spent/Transferred</span>
      <span className="font-medium text-foreground">
        {formData.spentUnit === "seeds"
          ? `${formData.spentAmount.toLocaleString()} SEEDS (~$${(formData.spentAmount * 0.01).toFixed(2)})`
          : `-$${formData.spentAmount.toFixed(2)}`
        }
      </span>
    </div>
    <div className="h-px bg-border"></div>
  </>
)}
```

### B7. Update submit mutation payload

Add `spentUnit` to the submit call so the backend knows what unit was used:

```tsx
submitMutation.mutate({
  seedsAccount: formData.seedsAccount,
  email: formData.email,
  originalUsdTotal: formData.totalUsd,
  spentUsdAmount: formData.spentUnit === "seeds"
    ? formData.spentAmount * 0.01
    : formData.spentAmount,
  spentSeedsAmount: formData.spentUnit === "seeds"
    ? formData.spentAmount
    : undefined,
  claimedUsdAmount: formData.adjustedUsd,
  regenAmount: formData.adjustedUsd,
  baseWalletAddress: formData.baseWalletAddress,
  isDispute: formData.isOnDisputePath,
  disputeReason: formData.disputeExplanation || undefined,
});
```

Note: The tRPC router `seedsClaims.submit` input schema may need updating to accept `spentSeedsAmount` as an optional number. Check `server/routes/seedsClaims.ts` and add the field if needed.

---

## Part C: Site-Wide Form Audit

After completing Parts A and B, audit these other form files for the same hardcoded color problems. Apply the same theme-aware replacements from Part A:

### Priority files (user-facing forms):

1. **`client/src/pages/Apply.tsx`** - Land project application
2. **`client/src/pages/InvestorForm.tsx`** - Investor form
3. **`client/src/pages/LOI.tsx`** - Letter of intent
4. **`client/src/pages/CreateCampaign.tsx`** - Crowd pooling campaign creation
5. **`client/src/components/AuthDialog.tsx`** - Login/signup dialog
6. **`client/src/components/NewsletterSignup.tsx`** - Newsletter form
7. **`client/src/components/CustomGameWaitlistForm.tsx`** - Waitlist form

### For each file:

1. Search for hardcoded color classes: `text-gray-`, `text-amber-`, `text-blue-`, `bg-amber-`, `bg-blue-`, `bg-gray-`, `bg-red-`, `border-gray-`, `border-amber-`
2. Replace with theme-aware equivalents per the table in Part A5/A6
3. Verify buttons use `bg-primary text-primary-foreground` instead of `bg-amber-600`
4. Verify info/warning boxes use `bg-muted` or `bg-primary/10` instead of hardcoded colors

### DO NOT touch:

- `client/src/components/ProfileEditForm.tsx` - This one already uses the glass panel pattern (`bg-white/8 text-white`) and works correctly on dark backgrounds.

---

## Part D: Base UI Component Improvement

### D1. Update Input component placeholder color

File: `client/src/components/ui/input.tsx`

In the className string, find:
```
placeholder:text-[#1a472a]/50
```

Replace with:
```
placeholder:text-muted-foreground/70
```

This ensures placeholders are readable in both light and dark mode. The current 50% opacity dark green is invisible on dark backgrounds.

### D2. Update Textarea component placeholder color

File: `client/src/components/ui/textarea.tsx`

Same change:
```
placeholder:text-[#1a472a]/50
```
->
```
placeholder:text-muted-foreground/70
```

### D3. Update Input text color

In input.tsx, find:
```
text-[#1a472a]
```

Replace with:
```
text-foreground
```

This makes the input text follow the theme instead of being hardcoded dark green.

### D4. Update Textarea text color

Same in textarea.tsx:
```
text-[#1a472a]
```
->
```
text-foreground
```

### D5. Update Label text color

File: `client/src/components/ui/label.tsx`

Find:
```
text-[#1a472a]
```

Replace with:
```
text-foreground
```

---

## Part E: Post-Submit Notification for Signed-In Users

When a signed-in user submits a SEEDS claim, they should get an in-app notification (the bell icon system) confirming their claim was received.

### E1. Add optional userId to seedsClaims table

File: `drizzle/schema.ts`

Find the `seedsClaims` table definition. Add a `userId` column (nullable) so claims can be linked to accounts:

```tsx
userId: int("userId"),  // Optional - links claim to signed-in user account
```

Add it after the `id` field. Generate a migration for this column addition.

### E2. Update the submit endpoint to accept userId and create notification

File: `server/routes/seedsClaims.ts`

The `submit` procedure is currently `publicProcedure`. Change it to accept an optional userId. The form can be submitted by non-logged-in users too, so keep it public but pass userId if available.

Update the submit input schema to add:
```tsx
userId: z.number().int().optional(),
```

In the mutation handler, after the insert/update succeeds, if `input.userId` is provided, create a notification:

```tsx
import { createUserNotification } from "../db";

// After successful insert or update:
if (input.userId) {
  // Store userId on the claim
  if (!isUpdate) {
    await db.update(seedsClaims)
      .set({ userId: input.userId })
      .where(eq(seedsClaims.id, insertId));
  } else {
    await db.update(seedsClaims)
      .set({ userId: input.userId })
      .where(eq(seedsClaims.seedsAccount, input.seedsAccount));
  }

  // Create in-app notification
  await createUserNotification({
    userId: input.userId,
    type: "system",
    title: isUpdate ? "SEEDS Claim Updated" : "SEEDS Claim Received",
    message: isUpdate
      ? `Your SEEDS claim for ${input.seedsAccount} has been updated. Claimed amount: $${input.claimedUsdAmount.toFixed(2)} (${(input.claimedUsdAmount * 100).toLocaleString()} $ReGen). We'll review it within 7-10 business days.`
      : `Your SEEDS claim for ${input.seedsAccount} has been received! Claimed amount: $${input.claimedUsdAmount.toFixed(2)} (${(input.claimedUsdAmount * 100).toLocaleString()} $ReGen). We'll verify against the Telos blockchain and process within 7-10 business days.`,
  });
}
```

### E3. Pass userId from the client form

File: `client/src/pages/ClaimSeeds.tsx`

Import useAuth:
```tsx
import { useAuth } from "@/_core/hooks/useAuth";
```

Inside the component, get the user:
```tsx
const { user } = useAuth();
```

Update the submit mutation call to include userId:
```tsx
submitMutation.mutate({
  // ...existing fields...
  userId: user?.id,
});
```

### E4. Also notify when admin reviews a claim

File: `server/routes/seedsClaims.ts`

In the `adminReview` mutation, after updating the claim status, if the claim has a userId, send a notification:

```tsx
// After updating claim status:
const claim = existing[0];
if (claim.userId) {
  const statusMessages: Record<string, string> = {
    approved: `Your SEEDS claim for ${claim.seedsAccount} has been approved! ${(claim.regenAmount * 100).toLocaleString()} $ReGen tokens will be sent to your Base wallet.`,
    denied: `Your SEEDS claim for ${claim.seedsAccount} has been denied.${input.adminNotes ? ` Reason: ${input.adminNotes}` : ''} If you believe this is an error, please reach out in the community forum.`,
    flagged: `Your SEEDS claim for ${claim.seedsAccount} has been flagged for additional review. We may reach out for more information.`,
  };

  await createUserNotification({
    userId: claim.userId,
    type: "system",
    title: `SEEDS Claim ${input.status.charAt(0).toUpperCase() + input.status.slice(1)}`,
    message: statusMessages[input.status] || `Your SEEDS claim status has been updated to: ${input.status}`,
  });
}
```

---

## Part F: Profile SEEDS Claim Section

Add a SEEDS claim status card to the profile's Game & Wallet settings section. Users can see their claim status and edit it if needed.

### F1. Add a getMyClaim endpoint

File: `server/routes/seedsClaims.ts`

Add a new protected procedure to get the current user's claim:

```tsx
import { protectedProcedure } from "../_core/trpc";

// Add to the router:
getMyClaim: protectedProcedure.query(async ({ ctx }) => {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database unavailable",
    });
  }

  const claims = await db
    .select()
    .from(seedsClaims)
    .where(eq(seedsClaims.userId, ctx.user.id))
    .limit(1);

  return claims.length > 0 ? claims[0] : null;
}),
```

Note: `protectedProcedure` requires the user to be logged in. Check how it's imported in other route files (e.g., forum.ts) for the correct import path.

### F2. Create SeedsClaimCard component

File: `client/src/components/SeedsClaimCard.tsx` (NEW)

This is a glass panel card shown in Settings > Game & Wallet, after the wallet section, before OrgClaimSection. It shows:

- Claim status with colored badge (pending = amber, approved = green, denied = red, flagged = orange)
- SEEDS account name
- Claimed USD amount and $ReGen token equivalent
- Base wallet address (truncated)
- "Edit Claim" button that links to /claim-seeds (the form pre-fills from localStorage draft)
- If no claim exists, show a CTA to file one

```tsx
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Coins, ExternalLink, AlertCircle, CheckCircle2, Clock, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_CONFIG = {
  pending: { label: "Pending Review", color: "text-amber-400", bg: "bg-amber-400/20", icon: Clock },
  approved: { label: "Approved", color: "text-green-400", bg: "bg-green-400/20", icon: CheckCircle2 },
  denied: { label: "Denied", color: "text-red-400", bg: "bg-red-400/20", icon: AlertCircle },
  flagged: { label: "Under Review", color: "text-orange-400", bg: "bg-orange-400/20", icon: Flag },
};

export function SeedsClaimCard() {
  const { data: claim, isLoading } = trpc.seedsClaims.getMyClaim.useQuery();

  if (isLoading) {
    return (
      <div className="glass-panel p-6 rounded-xl animate-pulse">
        <div className="h-5 bg-white/10 rounded w-1/3 mb-3" />
        <div className="h-4 bg-white/10 rounded w-2/3" />
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="glass-panel p-6 rounded-xl">
        <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
          <Coins className="w-4 h-4 text-[#7dd87d]" /> SEEDS Token Claim
        </h2>
        <p className="text-white/50 text-sm mb-4">
          If you purchased SEEDS tokens, you can claim $ReGen tokens based on your USD contribution.
          Claims are open until September 22, 2026.
        </p>
        <Link href="/claim-seeds">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            File a Claim
          </Button>
        </Link>
      </div>
    );
  }

  const config = STATUS_CONFIG[claim.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const StatusIcon = config.icon;
  const regenTokens = (claim.claimedUsdAmount * 100).toLocaleString();

  return (
    <div className="glass-panel p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Coins className="w-4 h-4 text-[#7dd87d]" /> SEEDS Token Claim
        </h2>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
          <StatusIcon className="w-3 h-3" />
          {config.label}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-white/50">SEEDS Account</span>
          <span className="text-white font-mono">{claim.seedsAccount}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/50">Claimed USD</span>
          <span className="text-white font-medium">${claim.claimedUsdAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/50">$ReGen Tokens</span>
          <span className="text-[#7dd87d] font-medium">{regenTokens}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/50">Wallet</span>
          <span className="text-white/70 font-mono text-xs">
            {claim.baseWalletAddress.slice(0, 6)}...{claim.baseWalletAddress.slice(-4)}
          </span>
        </div>
        {claim.isDispute && (
          <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-400/10 rounded-lg px-3 py-2">
            <AlertCircle className="w-3 h-3" />
            This claim is filed as a dispute
          </div>
        )}
      </div>

      {claim.status === "pending" && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <Link href="/claim-seeds">
            <Button variant="outline" size="sm" className="text-white border-white/20 hover:bg-white/10">
              Edit Claim
            </Button>
          </Link>
        </div>
      )}

      {claim.status === "denied" && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <Link href="/claim-seeds">
            <Button variant="outline" size="sm" className="text-white border-white/20 hover:bg-white/10">
              Resubmit Claim
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
```

### F3. Add SeedsClaimCard to PlayerProfile

File: `client/src/pages/PlayerProfile.tsx`

Import at top:
```tsx
import { SeedsClaimCard } from "@/components/SeedsClaimCard";
```

In the `settingsSection === "game"` block (around line 3005-3043), add the SeedsClaimCard between the wallet section and the OrgClaimSection:

```tsx
{/* Game & Wallet section */}
{settingsSection === "game" && (
  <>
    <AnimatedSection animation="slide-up">
      {/* Existing wallet section */}
      <div id="wallet-section" className="glass-panel p-6 rounded-xl">
        ...existing wallet code...
      </div>
    </AnimatedSection>

    {/* NEW: SEEDS Claim Section */}
    <AnimatedSection animation="slide-up">
      <SeedsClaimCard />
    </AnimatedSection>

    <AnimatedSection animation="slide-up">
      <div id="org-section">
        <OrgClaimSection userId={user!.id} questsCompleted={profile?.questsCompleted ?? undefined} />
      </div>
    </AnimatedSection>
    ...rest...
  </>
)}
```

### F4. Also show a toast on successful submission

File: `client/src/pages/ClaimSeeds.tsx`

Import toast:
```tsx
import { toast } from "sonner";
```

In the `submitMutation` onSuccess callback, add a toast alongside the existing success state:

```tsx
onSuccess: (result) => {
  setSubmittedClaimId(String(result.claimId));
  setIsSubmitted(true);
  toast.success(
    result.isUpdate ? "Claim updated successfully" : "Claim submitted successfully",
    { description: "You'll receive updates via email and in your notifications." }
  );
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // ignore
  }
},
```

---

## Part G: Navigation Menu Updates

### G1. Add "Local Food Economy" to Play the Game dropdown (desktop)

File: `client/src/components/Navigation.tsx`

In the "Play the Game" DropdownMenuContent (around line 200-300), add a "Local Food Economy" item after the "Contribution Calculator" item and before the separator that leads to "The ReGen Games":

```tsx
<DropdownMenuItem
  className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
  onClick={() => window.location.href = '/local-food-economy'}
>
  <Sprout className="w-5 h-5 mr-3 text-green-400" />
  <span style={{ fontFamily: 'var(--font-accent)' }}>Local Food Economy</span>
</DropdownMenuItem>
```

Make sure `Sprout` is imported from lucide-react. If not available, use `Leaf` or `Wheat`.

### G2. Add "Economy" to Explore + Connect dropdown (desktop)

In the "Explore + Connect" DropdownMenuContent (around line 369-440), add an "Economy" item after the "Tokenomics" item:

```tsx
<DropdownMenuItem
  className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
  onClick={() => window.location.href = '/economy'}
>
  <TrendingUp className="w-5 h-5 mr-3 text-[#d4a574]" />
  <span style={{ fontFamily: 'var(--font-accent)' }}>Economy</span>
</DropdownMenuItem>
```

Make sure `TrendingUp` is imported from lucide-react.

### G3. Add both items to mobile navigation

Find the mobile "Play the Game" collapsible section (around line 688+) and add "Local Food Economy" in the same position as desktop.

Find the mobile "Explore + Connect" collapsible section (around line 920+) and add "Economy" in the same position as desktop.

Mobile menu items use this pattern:
```tsx
<Link href="/local-food-economy">
  <button
    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors min-h-[44px] ${
      location === '/local-food-economy'
        ? 'bg-[#7dd87d]/20 text-[#7dd87d]'
        : 'text-white/80 hover:bg-white/5'
    }`}
    onClick={() => setMobileMenuOpen(false)}
  >
    <Sprout className="w-5 h-5 text-green-400" />
    <span style={{ fontFamily: 'var(--font-accent)' }}>Local Food Economy</span>
  </button>
</Link>
```

### G4. Add both items to the footer

File: `client/src/components/SiteFooter.tsx`

In the "Game" column (around line 130-175), add after the "Tokenomics" link:

```tsx
<li>
  <Link href="/local-food-economy" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
    Local Food Economy
  </Link>
</li>
```

In the "Explore" column (around line 66-128), add after an appropriate item (e.g., after "Seasons"):

```tsx
<li>
  <Link href="/economy" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
    Economy
  </Link>
</li>
```

### G5. Update isPlayGameActive check

In Navigation.tsx, update the `isPlayGameActive` constant to include the local-food-economy route:

```tsx
const isPlayGameActive = location === '/game' || location === '/play' || location === '/calculator' || location === '/profile' || location === '/quest' || location === '/crowd-pooling-projects' || location === '/crowd-pooling' || location === '/create-campaign' || location.startsWith('/campaign/') || location === '/local-food-economy';
```

Also update the `isSocialsBlogActive` (or whatever tracks Explore + Connect active state) to include `/economy`.

---

## Verification Checklist

After all changes:

1. Run `npx tsc --noEmit` - verify no TypeScript errors
2. Run the dev server and visually check `/claim-seeds` in browser
3. Verify step 1 (account lookup) is readable: labels, input, description, button
4. Verify step 2 (contribution review) is readable: table, amounts, radio buttons, question text
5. Verify the SEEDS/USD toggle works: switching units recalculates correctly
6. Verify step 3 (wallet) is readable: labels, inputs, info box
7. Verify step 4 (confirm) is readable: summary panel, checkbox, submit button
8. Check the success screen after submit
9. Spot-check `/apply`, `/loi`, `/investor-form` for improved readability
10. Verify ProfileEditForm still looks correct (should be untouched)
11. Sign in and submit a claim, check that a notification appears in the bell icon
12. Go to Profile > Settings > Game & Wallet, verify the SEEDS Claim card appears
13. Verify "Local Food Economy" appears in Play the Game dropdown (desktop + mobile)
14. Verify "Economy" appears in Explore + Connect dropdown (desktop + mobile)
15. Verify both new items appear in the site footer
16. Run the database migration for the new `userId` column on `seedsClaims`

---

## Handoff Breakdown

| Task | Who |
|------|-----|
| All code changes (Parts A-G) | Claude Code |
| TypeScript compilation check | Claude Code |
| Database migration (userId column) | Claude Code (generate) + Rye (run against Railway) |
| Visual verification in browser | Rye |
| Git commit and push | Rye |
| If tRPC schema needs `spentSeedsAmount` field | Claude Code (check + add) |
