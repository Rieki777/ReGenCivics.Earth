# Fixes to Make - 2026-07-16 - Ship Voyage Covenant + Rental Terms

Wire the ReGen Ship rental terms into the booking flow: a hosted terms page, a required acceptance at checkout that is recorded per booking with a version, the 500-mile travel radius (with per-week extension and core-team permission), the meat/alcohol/smoke rule aboard, and the red permission ring on the voyage map.

Source of truth for the copy: `ReGen_Ship_Voyage_Covenant_and_Rental_Terms.md` (repo root). Keep the page text in sync with that file; the doc is v1.0.

**Ship gate is mandatory before any VERIFIED/DONE claim** (STEERING §3): `python3 scripts/audit-truncation.py`, `rg` for each new className, `pnpm check` exit 0. Run `pnpm test` for the server change. Every CLAUDE CODE row needs an Evidence entry (file:line, grep, or command output) before its status moves past CODED.

---

## Fix 1 - Terms page at `/ship/terms` (High)

**Status:** CODED (needs ship gate)

**What:** New page `client/src/pages/ship/ShipTerms.tsx` renders the covenant. Register the route and add it to the ship nav where legal/footer links live.

**New file:** `client/src/pages/ship/ShipTerms.tsx`

```tsx
/**
 * /ship/terms - The ReGen Ship Voyage Covenant and Rental Terms (v1.0).
 * Source of truth for the copy: ReGen_Ship_Voyage_Covenant_and_Rental_Terms.md.
 * Bump SHIP_TERMS_VERSION in shared/shipTerms.ts when the wording changes.
 */
import { SEO } from "@/components/SEO";
import { PageWrapper } from "@/components/PageWrapper";
import { ShipSection, ShipEyebrow, ShipNavRow } from "./shipShared";
import { SHIP_TERMS_VERSION } from "@shared/shipTerms";

export default function ShipTerms() {
  return (
    <PageWrapper>
      <SEO title="Voyage Covenant and Rental Terms" description="The terms every Crew agrees to before sailing the ReGen Ship: travel radius, clean-vessel rule, and care of the Vessel." url="/ship/terms" />
      <ShipNavRow current="/ship/terms" />
      <ShipSection>
        <ShipEyebrow>Voyage covenant</ShipEyebrow>
        <h1 className="text-3xl font-bold mb-2">Voyage Covenant and Rental Terms</h1>
        <p className="text-sm text-muted-foreground mb-6">Version {SHIP_TERMS_VERSION}. These terms apply to every voyage aboard the ReGen Ship.</p>

        <div className="prose prose-neutral dark:prose-invert max-w-2xl">
          {/* Keep in sync with ReGen_Ship_Voyage_Covenant_and_Rental_Terms.md.
              Render the sections as headings + paragraphs. Do NOT truncate;
              audit-truncation.py must pass. Full body follows the master doc:
              §1 parties, §2 Outdoorsy layering, §3 drivers, §4 voyage/turnovers,
              §5 miles + overage, §6 travel radius, §7 diet/alcohol/smoke,
              §8 water doctrine, §9 prohibited uses, §10 orientation/return,
              §11 payment/deposit/charges, §12 liability + uncovered loss,
              §13 breakdowns/recovery, §14 changes/recall, §15 GPS/privacy,
              §16 assumption of risk, §17 default/remedies, §18 Oregon law,
              §19 general, §20 acceptance. */}
        </div>
      </ShipSection>
    </PageWrapper>
  );
}
```

Implementation note: paste the section bodies from the master doc as JSX `<h2>`/`<p>` inside the prose div. Emphasize §6 (radius), §7 (diet), and §12 (liability). The travel-radius table in §6 renders as a small `<table>` or a definition list.

**New file:** `shared/shipTerms.ts`

```ts
/** The active terms version. Bump on any wording change; bookings record the
 *  version accepted so old acceptances stay auditable. */
export const SHIP_TERMS_VERSION = "1.0";

/** Travel radius policy (STEERING deterministic-first; the map + copy read these). */
export const RADIUS_BASE_MILES = 500;              // one-week voyage
export const RADIUS_PER_EXTRA_WEEK_MILES = 250;    // each added week
/** Permitted straight-line radius from Ashland for a voyage of `weeks` weeks. */
export function permittedRadiusMiles(weeks: number): number {
  const w = Math.max(1, Math.min(4, Math.floor(weeks)));
  return RADIUS_BASE_MILES + (w - 1) * RADIUS_PER_EXTRA_WEEK_MILES;
}
```

**Edit:** `client/src/App.tsx`
- Add `const ShipTerms = lazy(() => import("./pages/ship/ShipTerms"));` beside the other ship lazies (~line 226).
- Add `<Route path={"/ship/terms"}><EB><ShipTerms /></EB></Route>` in the ship route block (~line 271).

**Edit:** `client/src/pages/ship/shipShared.tsx` - if `ShipNavRow` renders a fixed link set, add a "Terms" link to `/ship/terms` (footer/secondary group). Confirm `current="/ship/terms"` is accepted.

**Evidence:** ______ (route grep + `pnpm check`)

---

## Fix 2 - Record terms acceptance per booking (High)

**Status:** CODED (needs migration + ship gate)

**What:** Add acceptance columns to `ship_bookings`, a migration, and require acceptance in `requestBooking`.

**New file:** `drizzle/0191_ship_agreement_acceptance.sql`

```sql
-- Terms acceptance recorded at booking time, with the version accepted.
ALTER TABLE `ship_bookings`
  ADD COLUMN `agreementAcceptedAt` timestamp NULL,
  ADD COLUMN `agreementVersion` varchar(16) NULL;
```

**Edit:** `drizzle/schema.ts` - in `shipBookings` (after `waterDoctrineCommitmentAt`, ~line 4292):

```ts
  agreementAcceptedAt: timestamp("agreementAcceptedAt"),
  agreementVersion: varchar("agreementVersion", { length: 16 }),
```

**Edit:** `server/routes/ship.ts` `requestBooking`:
- Input: add `agreementAccepted: z.literal(true)` and `agreementVersion: z.string().max(16)` beside `dietCommitment`/`waterDoctrineCommitment` (~line 390).
- Insert: add `agreementAcceptedAt: now,` and `agreementVersion: input.agreementVersion,` to the `d.insert(shipBookings).values({...})` block (~line 440).

Server import for the version if you want to validate it matches: `import { SHIP_TERMS_VERSION } from "@shared/shipTerms";` and optionally `.refine(v => v.agreementVersion === SHIP_TERMS_VERSION, ...)`.

**Evidence:** ______ (`pnpm check`, `pnpm test` ship.test.ts, migration `--status`)

---

## Fix 3 - Acceptance checkbox at checkout (High)

**Status:** CODED (needs ship gate)

**What:** Add a third required checkbox to `ShipBook.tsx` and send it.

**Edit:** `client/src/pages/ship/ShipBook.tsx`
- State: `const [terms, setTerms] = useState(false);` (beside `diet`, `water`, ~line 82).
- Import: `import { SHIP_TERMS_VERSION } from "@shared/shipTerms";`
- Guard in `submit`: change `if (!diet || !water)` to `if (!diet || !water || !terms) return toast.error("All three commitments are required to sail.");` (~line 161).
- Mutation payload: add `agreementAccepted: true, agreementVersion: SHIP_TERMS_VERSION,` (~line 176).
- `submitReason`: extend the diet/water branch to also require `terms`.
- Reset in success: `setTerms(false);`.
- New checkbox after the water checkbox (~line 464):

```tsx
<div className="flex items-start gap-3">
  <Checkbox id="terms" checked={terms} onCheckedChange={(v) => setTerms(Boolean(v))} />
  <p className="font-normal leading-snug text-sm">
    <Label htmlFor="terms" className="font-normal">I have read and agree to the Voyage Covenant and Rental Terms, including the 500-mile travel radius, the meat, alcohol, and smoke-free rule aboard, and my responsibility for loss that insurance does not cover.</Label>{" "}
    <Link href="/ship/terms" className="underline text-[#2f5d3a] dark:text-[#7dd87d] font-medium">Read the terms</Link>.
  </p>
</div>
```

Also update the diet checkbox copy (~line 454) to name the rule directly: "I will keep the Ship meat-free, alcohol-free, and smoke-free inside for the whole voyage, unless the core team gives me written permission otherwise."

**Evidence:** ______ (grep the new className usage; `pnpm check`)

---

## Fix 4 - Red permission ring on the voyage map (Medium)

**Status:** CODED (needs ship gate)

**What:** The map already centers on `ASHLAND` and has a `rangeRing(center, radiusMiles)` helper (`shipMapConfig.ts`) and uses react-leaflet. Draw the permitted zone and the locked ring.

**Edit:** `client/src/pages/ship/ShipMap.tsx`
- Import `Polygon` (or `Circle`) from `react-leaflet` and `permittedRadiusMiles`, `RADIUS_BASE_MILES` from `@shared/shipTerms`, plus `rangeRing`, `ASHLAND` from `shipMapConfig`.
- Compute the permitted radius from the current selection length (default 1 week / 500 mi when nothing selected).
- Render:
  - a **green** ring at the permitted radius (`stroke #2f5d3a`, faint green fill) labeled "Permitted range";
  - a **red** ring at the base 500-mile boundary when the permitted radius is larger, and a red boundary at the outer edge of the map beyond the permitted zone, labeled "Locked - core-team permission required."
- Popup / legend copy: "Beyond this line, contact the core team for written permission. Longer voyages unlock a wider range." Link to the request in §6.4.

Use `rangeRing(ASHLAND, permittedRadiusMiles(weeks))` for the polygon points so it stays round at Cascadia latitudes. Keep it deterministic (no LLM).

**Evidence:** ______ (`pnpm check`; screenshot of `/ship/map` showing both rings)

---

## Fix 5 - Keep the master doc and page in sync (Low)

**Status:** DONE (doc written)

The master copy lives at `ReGen_Ship_Voyage_Covenant_and_Rental_Terms.md`. When the wording changes, bump `SHIP_TERMS_VERSION` and update `ShipTerms.tsx`. Old bookings keep their recorded version.

---

## Handoff Breakdown - Who Does What

### YOU (Rye) - things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| A | **Legal review before go-live.** Have an Oregon attorney review the master doc, especially §11, §12, §17, §18, and how it layers with Outdoorsy's rental agreement and protection plan. | Legal sign-off is a human decision; I am not a lawyer. | Send `ReGen_Ship_Voyage_Covenant_and_Rental_Terms.md` to counsel. |
| B | **Fill the bracketed values** in the master doc: legal entity name, vehicle year/make/model, deposit amount, late fee, roadside number, core-team email, pet policy, mediation choice. | Business facts only you hold. | Edit the master doc, then Claude Code mirrors them into the page. |
| C | **Confirm the radius policy numbers** (default 500 base + 250/week → 500/750/1000/1250). | Your call on the economics. | Tell Claude Code; it sets them in `shared/shipTerms.ts`. |
| D | **Apply migration 0191 to Railway DB.** Deploys do not run migrations, and the VM cannot reach Railway MySQL. | DATABASE_URL only resolves on your Windows machine. | See PowerShell block below. |
| E | **Confirm the Railway deploy is green** after Claude Code pushes (or let Claude Code poll it per the standard deploy flow). | Railway dashboard / approval. | `pnpm railway:deploys` |

```powershell
# Apply migration 0191 (run from repo root on Windows)
$env = Get-Content .env | Where-Object { $_ -match '=' -and $_ -notmatch '^#' }
foreach ($line in $env) { $k,$v = $line -split '=',2; [System.Environment]::SetEnvironmentVariable($k,$v) }

npx tsx scripts/run-migration.ts drizzle/0191_ship_agreement_acceptance.sql
npx tsx scripts/run-migration.ts --status
```

### CLAUDE CODE - already done or can be done without you

| # | Task | Status |
|---|------|--------|
| 1 | Write `ShipTerms.tsx`, `shared/shipTerms.ts`, register route + nav | CODED |
| 2 | Add acceptance columns to schema + migration 0191; wire `requestBooking` | CODED |
| 3 | Add the required acceptance checkbox + payload in `ShipBook.tsx`; update diet copy | CODED |
| 4 | Draw the green permitted ring + red locked ring on `ShipMap.tsx` | CODED |
| 5 | Run the ship gate, `pnpm check`, `pnpm test`; fix any red; commit + push; poll the deploy to green | PENDING |

### WAITING ON YOU before Claude Code can proceed

- Fix 2 acceptance recording is only live after **migration 0191 is applied** (Task D). The code deploys fine without it, but writes to `agreementAcceptedAt` will fail until the columns exist, so apply the migration in the same window as the deploy.
- Bracketed values (Task B) and radius numbers (Task C) should be confirmed before you publish the page, though the flow works with the defaults.

---

## Priority order

1. Fix 2 + migration (records acceptance - the legal protection)
2. Fix 1 (the page the checkbox links to)
3. Fix 3 (the checkbox itself)
4. Fix 4 (the map ring)
5. Fix 5 (sync discipline)
