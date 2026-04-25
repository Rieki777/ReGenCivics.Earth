# Fixes to Make — 2026-03-15

This document continues from `FIXES_TO_MAKE_2026-03-14.md`.

---

## Fix 102 — Add logo to site footer (Medium)

**Status:** PENDING — waiting on logo files from Rye

**What's needed from Rye first:**
Save these two files:
- `client/public/images/logos/regencivics-logo-dark.png` — for dark backgrounds (phoenix on black/dark bg)
- `client/public/images/logos/regencivics-logo-light.png` — for light backgrounds (full colour phoenix on white)

**Then Claude Code does:**

In `client/src/components/SiteFooter.tsx`, add the logo above the existing footer content:

```tsx
<div className="flex flex-col items-center mb-6">
  <img
    src="/images/logos/regencivics-logo-dark.png"
    alt="ReGen Civics"
    width={120}
    height={120}
    loading="lazy"
    decoding="async"
    className="rounded-2xl opacity-90"
  />
</div>
```

Use the dark version (Logo A) in the footer since the footer is dark-background. Size ~120px. Round corners via `rounded-2xl`.

**No DB changes.**

---

## Fix 104 — Quest card endorsement badges from DB (Medium)

**Status:** DONE — 2026-03-15

**Context:** Fix 100 shipped the steward endorsement UI. Now quest cards should show live endorsement badges pulled from the DB instead of using empty `questQualifiers.ts`.

**What to build:**

In `Quest.tsx`, add a query for endorsements:
```tsx
const endorsementsQuery = trpc.quest.getEndorsementsForQuest.useQuery(
  { questId: selectedQuestId ?? "" },
  { enabled: !!selectedQuestId }
);
```

Or better: batch-fetch all endorsements once and pass to cards. The `quest.myEndorsements` endpoint returns the calling steward's endorsements. For the public view on quest cards we need a different endpoint.

**Option A (simplest):** Add a `quest.allEndorsements` public endpoint that returns all endorsements grouped by questId:
```ts
allEndorsements: publicProcedure.query(async () => {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db.select().from(questEndorsements);
}),
```

Then in Quest.tsx group by questId and show org names as badges on cards.

**UI:** Small badges below the quest title: "Recommended by Finca Sagrada" or "Required by Traditional Dream Factory". Use amber for required, green for recommended.

**No new DB changes. No pnpm db:push needed.**

---

## Fix 105 — Community page: show real land project data from DB (Medium)

**Status:** DONE — 2026-03-15. Added `community.activeLandProjects` tRPC endpoint; Community.tsx merges DB location/country/websiteUrl into PROJECT_META at runtime. Note: `applications` table has no `imageUrl` column so images remain static in STATIC_PROJECT_META.

**Context:** The Community page currently shows land projects from a hardcoded array in `Community.tsx`. Now that `seed-active-entities.ts` has been run, the DB has real project records in the `applications` table. The page should pull from DB via tRPC.

**What to build:**

Add a tRPC endpoint `community.activeLandProjects` that returns approved/active applications with their images:
```ts
activeLandProjects: publicProcedure.query(async () => {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db
    .select({
      id: applications.id,
      projectName: applications.projectName,
      location: applications.location,
      country: applications.country,
      vision: applications.vision,
      websiteUrl: applications.websiteUrl,
      imageUrl: applications.imageUrl,
    })
    .from(applications)
    .where(sql`${applications.status} IN ('active', 'approved')`)
    .orderBy(sql`${applications.projectName} ASC`);
}),
```

Then update `Community.tsx` to use `trpc.community.activeLandProjects.useQuery()` and fall back to the static array if empty.

**No new DB schema changes.**

---

## Fix 106 — Fix quest card "N in the field" display (Low)

**Status:** DONE — 2026-03-15. Verified: `activePlayers` flows correctly from `activeCountsData[questId]` to QuestCard and renders `🌿 N in the field` pill when N > 0. No code changes needed.

**Context:** The `activePlayers` count is being passed to QuestCards from `activeCountsQuery`. Verify it's displaying correctly. If no one has used "I'm doing this" yet, counts will be 0. That's fine. Just confirm it renders correctly and isn't showing stale or broken values.

Check: `client/src/pages/Quest.tsx` around `activeCountsData`.

**No code changes likely needed — just verify.**

---

## Fix 107 — Steward listing: show endorsements on project/org pages (Low)

**Status:** DONE — 2026-03-15. Added `quest.getEndorsementsByOrgName` endpoint; CommunityPost.tsx detects entity forum spaces by `categorySlug` and shows endorsed quests in a panel.

**Context:** When viewing a land project's community profile or forum space, show which quests they've endorsed. Pull from `questEndorsements` table using the project's orgId.

**No DB changes needed.**

---

## Fix 76A — Quest PDF field guides (Low)

**Status:** PENDING

**Context:** Use the `/pdf` skill to generate field guide PDFs for each quest. The QuestDetailModal already has a PDF download button (Fix 76B). The PDFs just need to be generated and placed at `public/quest-guides/quest-XX-name.pdf`.

Use the QUEST_MASTER_SHEET.md as source content for each quest.

---

## Handoff Summary — State at start of 2026-03-15

### CLAUDE CODE — remaining in priority order

| Fix | Task | Priority | Status |
|---|---|---|---|
| Fix 102 | Footer logo (after Rye saves logos) | Medium | PENDING — blocked on Rye |
| Fix 104 | Quest card endorsement badges from DB | Medium | DONE |
| Fix 105 | Community page: real land projects from DB | Medium | DONE |
| Fix 106 | Verify "N in the field" displays correctly | Low | DONE (verified) |
| Fix 107 | Endorsements on project pages | Low | DONE |
| Fix 76A | Quest PDF field guides | Low | PENDING |

### RYE — actions needed

| Task | Command / Action |
|---|---|
| Save logos | Put `regencivics-logo-dark.png` and `regencivics-logo-light.png` in `client/public/images/logos/` |
| Confirm quest qualifier data | Review questQualifiers.ts with stewards before re-enabling |
