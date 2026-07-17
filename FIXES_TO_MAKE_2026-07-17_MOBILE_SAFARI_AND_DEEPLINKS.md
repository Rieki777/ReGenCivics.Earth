# Fixes to Make — 2026-07-17 — Mobile Safari + Notification Deep Links

Ecosystem-wide audit: core (church site), main regencivics site, and ship section, focused on iPhone Safari. Plus a full inventory of every notification deep link. Audit method: three parallel code sweeps (core: 22 files, ship: 38 files, main: ~300 files) against an 11-point iOS pitfall checklist, plus a link-by-link trace of every server-side notification writer to its client destination.

The big picture is good: the base Input/Textarea already render 16px on mobile with 44px heights, the base Dialog is a proper bottom sheet with keyboard lift and safe-area padding, the mobile tab bars honor safe-area, and Messages/Map/GlobeMap already use dvh. The fixes below close the gaps that bypassed those foundations.

---

## Fix 1 — Notification links to bounties pointed at anchors that never existed (Critical)

**Status:** CODED

**Symptom:** Tapping "Bounty paid", "Bounty reversed", "Bounty accepted", claim-release, or nudge notifications landed on a page top; the promised jump to the bounty silently failed. Five active writers emitted `#bounty-{id}` anchors, and no element with `id="bounty-N"` exists anywhere in the client.

**Root cause:** Links written before BountyDetail existed; the anchor target was never rendered.

**Fix:** All five writers now link to `/bounties/{id}` (BountyDetail, the one place the bounty is guaranteed to render). `resolveNotificationLink` also rewrites any historical `#bounty-N` row to `/bounties/N` at click time, so old notifications work without a data migration.

**Files changed:** `server/db/bounties.ts` (paid + reversed), `server/jobs/coordinationFlywheel.ts` (release + nudge), `server/routes/bounties.ts` (accepted), `client/src/components/NotificationBell.tsx`.

---

## Fix 2 — claim_complete / claim_failed landed on profile Overview instead of tokens (High)

**Status:** CODED

**Symptom:** "Your tokens have claimed to your wallet" notifications dropped users on the profile Overview tab; balances and claim state live on the Contributions tab.

**Fix:** `legacyNotificationLink` in `server/db.ts` now returns `/profile?tab=contributions` for both types; client fallback and click-time normalization added in `NotificationBell.tsx` for historical rows.

---

## Fix 3 — campaign_milestone links 404ed (High, latent)

**Status:** CODED

**Symptom:** Links went to `/campaigns/{id}` and `/crowdpooling`; the router has `/campaign/:id` (singular) and `/crowd-pooling` (hyphenated). Both fell through to NotFound. No active writer emits this type today, but legacy rows dead-ended.

**Fix:** Corrected in `server/db.ts` and the client fallback; click-time rewrite for stored rows.

---

## Fix 4 — Messages composer: iOS zoom + home-indicator overlap (High)

**Status:** CODED

**Symptom:** Composing a DM on iPhone zoomed the whole page (14px textarea font) and the send bar sat under the home indicator.

**Fix:** `text-base md:text-sm` on the textarea, 44px min height, send button to 44px, `pb-[max(0.75rem,env(safe-area-inset-bottom))]` on the input bar. `client/src/pages/Messages.tsx`.

---

## Fix 5 — Raw form fields under 16px zoomed iOS Safari on focus (Medium, 20 fields)

**Status:** CODED

Hand-rolled inputs that bypassed the base components: Community admin category forms (16 inputs across 5 blocks), FeatureSuggestions (input, textarea, select), Glossary propose-term (input, textarea), ship selects (Inner Compass poster size, Galley category + source, GearManifest condition). All now `text-base md:text-sm` (and 44px heights where they were shorter).

**Files changed:** `client/src/pages/Community.tsx`, `FeatureSuggestions.tsx`, `Glossary.tsx`, `client/src/pages/ship/shipInnerCompass.tsx`, `client/src/components/ship/GalleyRemixer.tsx`, `client/src/components/ship/GearManifest.tsx`.

---

## Fix 6 — AdminModeration tab strip went icon-only below 640px (Medium)

**Status:** CODED

Same defect class as the profile tab bug fixed earlier today (`hidden sm:inline`). Labels now always visible, 44px min height. `client/src/pages/AdminModeration.tsx`.

---

## Fix 7 — Ship map + Inner Compass touch targets (Medium)

**Status:** CODED

Filter pills were 24 to 30px tall; every drawer's close X had a ~24px hit area. Pills now `min-h-11`; all six close buttons got a 44px hit area (`min-h-11 min-w-11 -m-2`); photo-chip remove buttons enlarged; First Mate drawer got safe-area bottom padding. `ShipMap.tsx`, `shipInnerCompass.tsx`, `GalleyRemixer.tsx`, `AskShipwright.tsx`, `GearManifest.tsx`.

---

## Fix 8 — CORE church site mobile polish (Medium)

**Status:** CODED

Hamburger menu links were text-height (~25px) with no padding: now 44px rows. Reconciliation inputs had no font-size (iOS zoom): now 16px. Added `-webkit-backdrop-filter` for the sticky nav on older iOS, `overflow-wrap: anywhere` on chat messages and transparency facts (long emails/URLs), and 8px vertical padding on footer links. `client/src/pages/core/core.css`, `Reconciliation.tsx`.

---

## Documented, deliberately NOT changed (design decisions or larger refactors)

| Item | Where | Why deferred |
|---|---|---|
| Base `Button` sizes cap at 40px (`h-9` default, `size-9` icon) | `components/ui/button.tsx` | Changing the base component reflows every button on the site; needs a visual pass, not a mechanical fix. Recommendation: `min-h-[44px] min-w-[44px]` on the icon variants at least. |
| Custom modals lack keyboard lift + safe-area (CrowdPoolingTool ×2, RaiseModal, CustomGames form, OnboardingWizard) | various | Right fix is migrating them to the base `DialogContent` (which already does this), not copy-pasting viewport code. Medium refactor each. |
| Leaflet map pins 24 to 28px | `shipMapLayers.tsx:254`, `ShipMap.tsx:65` | Visual density tradeoff on the treasure map; bumping pin size changes the map's look. |
| Bounty notifications typed `"mention"` | `bounties.ts`, `coordinationFlywheel.ts` | They show the @ glyph and pollute the Mentions filter. Fixing means a new enum value in the schema (migration) + glyph + filter wiring. |
| `quest_complete` links to `/quest` hub, not the specific quest | `webhook-receiver.ts:236` | Needs the quest slug plumbed through the webhook payload. |
| "Work ready for review" links to bare `/admin` | `routes/bounties.ts:471` | No bounty-review deep view exists in admin yet. |
| Hero `vh` heights (ship + core, ~8 spots) | various | `min-h` + centered content, so worst case is a slightly low fold; cosmetic. `svh` swap is safe if wanted. |
| Inner Compass 24x36 poster exceeds iOS canvas limits | `shipInnerCompass.tsx:173` | Already caught with a friendly error; a real fix caps DPI on iOS. |
| 32px admin inputs (`ShipAdmin.tsx`) | admin-only | Cosmetic, admin-only surface. |
| Horizontal-scroll pill strips with no edge-fade hint (5 components) | CitizenshipTierSidebar, CommandPanel, ContributionAggregation, GlobeMap, ProgressMap | They scroll correctly; adding an affordance is polish. |

## Verified clean (no action needed)

Forum notification links (`/community/post/{id}#reply-{id}`) scroll to the exact comment; gratitude deep links bloom the exact note; email/digest links preserve hash fragments through UTM wrapping; no `h-screen` scroll containers in ship/core; mobile bottom navs honor safe-area; Radix tab lists wrap; nav dropdowns are tap-based; contribution accepted/rejected links land on the right tab.

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 1 | Real-device spot check on your iPhone after deploy | Simulators and code sweeps cannot fully reproduce iOS Safari (keyboard, home indicator, URL bar) | On your phone: DM composer on /messages, ship map filter pills, CORE hamburger menu, tap a bounty notification |
| 2 | Decide: bump base Button icon variants to 44px? | Site-wide visual change, your call | Say the word and Claude codes it |

### CLAUDE CODE — already done or can be done without you

| # | Task | Status |
|---|------|--------|
| 1 | Bounty notification links → /bounties/{id} (5 writers) | CODED |
| 2 | claim_complete/failed → /profile?tab=contributions | CODED |
| 3 | campaign_milestone route corrections | CODED |
| 4 | Click-time normalization of all historical bad links | CODED |
| 5 | Messages composer zoom + safe-area | CODED |
| 6 | 20 sub-16px form fields → 16px on mobile | CODED |
| 7 | AdminModeration tab labels restored | CODED |
| 8 | Ship pills/close buttons/photo chips → 44px targets | CODED |
| 9 | CORE nav/footer/input/CSS fixes | CODED |
| 10 | Migrate 5 custom modals to base DialogContent | Can do on request (deferred, see table above) |

### WAITING ON YOU before Claude Code can proceed

Nothing blocking. All CODED items ship with this commit; the deferred table items wait on your design calls, not on any missing access.
