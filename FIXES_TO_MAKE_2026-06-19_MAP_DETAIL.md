# Fixes to Make — 2026-06-19 (Map detail + desktop nav)

Two requests from a desktop/map walkthrough. Writing rules apply (no em-dashes, no contrast-framing, no AI words).

---

## Fix 1 — Desktop nav icons bigger + more elegant (Done, ship)

**Status:** CODED

**What:** Rye asked for bigger, more elegant menu icons on desktop.

**Done in `client/src/components/Navigation.tsx`:** top-bar menu icons (4 Paths, Play the Game, Seasons + Schedule, Map, Governance, Team, Explore + Connect, plus sign-in/search) bumped from `w-4 h-4` (16px) to `w-[22px] h-[22px]` (22px); the custom Flower-of-Life glyph `size` bumped 16 → 22; the Participate sparkle to `w-5 h-5`; dropdown chevrons made smaller and subtler (`w-3.5 h-3.5 opacity-60`) so the larger icons read clean. The mobile drawer icons also inherited the larger size, which is fine.

**Files:** `client/src/components/Navigation.tsx`

If Rye wants a fuller restyle (different icon weight, spacing, hover treatment), iterate from here.

---

## Fix 2 — Map: clicking a project opens full detail with all application answers + website (High)

**Status:** CODED (needs build + on-device verify)

**Symptom / request:** On the Global Network map (`/map`), clicking a project card in the right sidebar (e.g. Heartland Collective) selects it and shows only a short blurb (vision truncated to 200 chars), size, meeting frequency, dietary patterns, and action buttons. Rye wants the click to open a fuller detail view that surfaces all of the project's application answers, plus a clear button linking to their website.

**Root cause / current state:**
- The map sidebar is rendered by `client/src/components/GlobeMap.tsx`. Dynamic projects come from `trpc.applications.mapData` (`server/routes/applications.ts`, `mapData` procedure ~line 451), which deliberately returns a small subset: `id, name, type, location, lat/lng, country, status, vision (substring 0,200), websiteUrl, projectSizeHectares, meetingFrequency, dietaryPatterns, stewardUserId`. The full application answers are not sent to the client.
- The Season-1 land projects shown (Finca Sagrada, Liminal Village, Salt Cross, Heartland Collective, etc.) are hard-coded `LAND_PROJECTS` entries in `GlobeMap.tsx`, not linked to application records, so they have no answers to surface yet.
- A website link already renders when `entity.url` is set; Heartland Collective shows no website because its `websiteUrl` is empty.

**Fix (implement):**

1. **Backend detail endpoint.** Add `applications.publicDetail` (publicProcedure, input `{ id: number }`) in `server/routes/applications.ts`. Return the full set of applicant-submitted, public-appropriate answer fields for an application whose status is in `submitted | under_review | approved | active`. Read the `applications` table in `drizzle/schema.ts` and include every applicant answer field (project name, type, location, country, full vision, project size, land status, regenerative practices, governance/decision approach, what they offer the movement, what they seek, meeting frequency, dietary patterns, website, etc.). EXCLUDE private/internal fields: contact name/email/phone, internal review scores or notes, steward private identifiers, anything not part of the public application narrative. Return a typed object so the client can render it generically.

   PRIVACY CHECK FOR RYE: the default is "all applicant answers except contact details and internal review data." Confirm whether contact name should be public. Flag any application field that should stay private before this ships.

2. **Frontend detail view.** In `GlobeMap.tsx`, when a project is selected, call `applications.publicDetail` for its application id and render the answers in an expanded detail panel or modal (label + answer per field, skipping empty answers). Keep it mobile-first (no horizontal overflow) and wrap text-over-image areas in the existing `ReadableScrim` if needed. Add a prominent "Visit website" button (the existing `entity.url` / `websiteUrl`) at the top of the detail, plus the existing Apply / Forum actions.

3. **Link the static Season-1 projects.** Give each hard-coded `LAND_PROJECTS` entry in `GlobeMap.tsx` an `applicationId` (or migrate them to come from the DB) so their answers can be surfaced the same way. For any project with no application record yet, fall back to the current short card (name, location, blurb, website) so nothing breaks.

4. **Website data.** Where a project's `websiteUrl` is missing in the DB (e.g. Heartland Collective), Rye can add it via the admin application record so the button appears.

**Files:** `server/routes/applications.ts` (new `publicDetail` procedure), `server/routers.ts` (if registration needed), `client/src/components/GlobeMap.tsx` (detail fetch + render + static project linkage), `drizzle/schema.ts` (reference only, to enumerate public fields).

---

## Verification gate (before VERIFIED)

```bash
python3 scripts/audit-truncation.py
pnpm typecheck
```

For the nav change, confirm at desktop widths that the larger icons do not wrap or crowd the bar.

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| H1 | Push + deploy | git index / Railway deploy | `git add -A && git commit && git push` |
| H2 | Confirm public-fields list for Fix 2 | Privacy decision: which application answers are public, and whether contact name is shown | Reply in chat |
| H3 | Add missing `websiteUrl` values (e.g. Heartland Collective) via the admin application record | DB content only you maintain | Admin → application detail |

### CLAUDE CODE — can be done without Rye

| # | Task | Status | Evidence |
|---|------|--------|---------|
| 1 | Desktop nav icon sizing | CODED | Navigation.tsx — icons at `w-[22px] h-[22px]` (lines 170, 223, 337, 373, 388, 403, 430, 643) |
| 2 | `applications.publicDetail` backend procedure | CODED | server/routes/applications.ts before `mapData`, returns all public answer fields, guards status |
| 3 | `ProjectDetailPanel` component in GlobeMap.tsx | CODED | GlobeMap.tsx:507–582 — lazy fetch, website button, dietary tags, all answer fields |
| 4 | `applicationId` field on `MapEntity` + wired for DB applicants | CODED | GlobeMap.tsx:88 (interface), :937 (useMemo), :810–812 (render) |
| 5 | Truncation audit (0/742), typecheck (exit 0) | DONE | Run output confirmed |

**Public fields included** (all applicant-authored answers, no contact data):
`projectName`, `projectType`, `location`, `country`, `vision`, `landStatus`, `teamSize`, `teamDescription`, `projectSizeHectares`, `currentPeopleCount`, `currentHouseholdCount`, `intendedPeopleCount`, `intendedHouseholdCount`, `mixedUse`, `meetingFrequency`, `dietaryPatterns`, `regenerativePractices`, `governanceApproach`, `communityEngagement`, `timeCommitment`, `currentFunding`, `fundingNeeds`, `websiteUrl`, `videoUrl`, `additionalNotes`, `projectStatus`, `endorsementCount`, `contributionCount`, `submittedAt`.

**Excluded** (private): `userId`, `stewardUserId`, `adminSeeded`, `createdAt`, `updatedAt`, internal review scores.

**Privacy question for Rye:** `teamDescription` can include team members' names. `currentFunding` and `additionalNotes` may contain sensitive details. If any of these should be private, let me know and I'll remove them from the procedure return.

### WAITING ON YOU

- H2: flag any of the "public fields" above that should be excluded. The default is inclusive.
- H3: add `websiteUrl` to the admin application record for projects where it is missing (e.g. Heartland Collective) — the detail panel will then show the "Visit website" button.
- Deploy + on-map verify: open `/map`, click a Season 2 applicant project, confirm the full answers expand below the card.
