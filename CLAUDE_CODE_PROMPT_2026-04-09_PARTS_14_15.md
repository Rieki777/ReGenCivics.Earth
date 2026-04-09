# Claude Code Prompt: Parts 14 and 15

**Date:** 2026-04-09
**Source of truth:** `COMMUNITY_AGREEMENTS_PLAN.md`
**Context:** Parts 1-13 are all DONE. This session implements Parts 14 and 15 only.

---

## Before you start

Read these two files in full before touching any code:

1. `COMMUNITY_AGREEMENTS_PLAN.md` - parts 14 and 15 are at the bottom. The STATUS SUMMARY at the top confirms what is done.
2. `CLAUDE.md` at the project root - writing rules apply to all user-facing copy you write.

Key writing rules (enforced hard):
- No em-dashes anywhere. Zero. Use commas, colons, or split the sentence.
- No AI-isms: no "delve", "tapestry", "foster", "leverage", "vibrant", "transformative", "unlock", "empower", "seamless", "robust", "comprehensive", "utilize", "navigate" (as metaphor).
- No contrast-framing ("not X, but Y"). Lead with the affirmative.

---

## DB state (do not re-run these)

All migrations 0086-0107 have been applied. Specifically:
- `communityAgreements` and `communityAgreementVotes` tables exist and are seeded with 6 ratified agreements.
- `forumCategories.imageUrl` column exists.
- Threads have been moved: `active-projects` -> `land-projects`, `active-organisations` -> `alliance-partners`.
- `land-general` (id 11) and `alliance-general` (id 10) categories are live in DB.
- Migration 0107 (`drizzle/0107_roles_dialogue_forum_post.sql`) creates the Roles Dialogue forum post in `air-conversations`. Apply it if it has not been applied yet.

To check:
```bash
npx tsx scripts/run-migration.ts --status
```

---

## Part 14: Roles Dialogue Card, Forum Post, and Team Link

Three connected pieces. Do them in order.

### 14A. Generate the card image

Run:
```bash
pip install google-genai --break-system-packages
python3 scripts/generate-roles-dialogue-image.py
```

Output: `client/public/images/quests/roles-dialogue.png`

The script already exists. It uses GEMINI_API_KEY from `.env`. If the key is missing, check `.env` for GEMINI_API_KEY and add it if needed. If the image generation fails, create a placeholder using a simple canvas script so the card still renders.

### 14B. Apply migration 0107

```bash
npx tsx scripts/run-migration.ts drizzle/0107_roles_dialogue_forum_post.sql
```

Then get the forum post ID:
```bash
npx tsx scripts/run-migration.ts --status
```

Or query it directly:
```sql
SELECT id FROM forumPosts WHERE title = 'Roles Dialogue: what roles are missing from the game?' LIMIT 1;
```

You need this ID for 14C and 14D.

### 14C. Add the Roles Dialogue card to Community.tsx

In `client/src/pages/Community.tsx`, inside the Air panel (after the "Community Agreements" card around line 1090), add a third card:

```tsx
{/* Roles Dialogue */}
<Link href="/community/post/FORUM_POST_ID">
  <div className="relative rounded-xl overflow-hidden border border-slate-200/60 hover:border-slate-400/60 hover:shadow-md transition-all cursor-pointer group h-36">
    <img src="/images/quests/roles-dialogue.png" alt="Roles dialogue" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-55 transition-opacity" width={800} height={600} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
    <div className="absolute bottom-0 left-0 right-0 p-3">
      <p className="text-white font-semibold text-sm leading-tight" style={{ fontFamily: 'var(--font-display)' }}>Roles Dialogue</p>
      <p className="text-white/70 text-xs mt-0.5">What roles are missing?</p>
    </div>
  </div>
</Link>
```

Replace `FORUM_POST_ID` with the real ID from 14B. The Air section uses `grid grid-cols-2 gap-3 mb-4`. Adding a third card is fine; it wraps to a new row. Only change to `grid-cols-3` or `col-span-2` if it looks wrong after a visual check.

### 14D. Update the Team/Roles section

Find the "See a role missing?" text:
```bash
grep -rn "role missing\|Let us know in our community\|missing.*role" client/src --include="*.tsx"
```

Update it to link to the forum post:

```tsx
{/* before */}
<p>See a role missing? Let us know in our community!</p>

{/* after */}
<p>See a role missing? <Link href="/community/post/FORUM_POST_ID" className="underline hover:text-[#1a472a] transition-colors">Let us know in our community!</Link></p>
```

Replace `FORUM_POST_ID` with the real ID from 14B. If the text does not exist yet, add it near the bottom of the roles listing section.

---

## Part 15: Governance Page Fixes + Nav Highlights

Six independent items. Complete in any order.

### 15A. Site readability audit

Scan all pages and components in `client/src/` for:
- Text contrast below WCAG AA: `text-white/40`, `text-white/30`, `text-gray-400` on light backgrounds, `text-slate-400` on dark backgrounds.
- Placeholder text on low-contrast inputs.
- `text-xs` used for meaningful content (not decorative).
- Long lines without wrapping in body copy.

Fix all found issues in-place. Do not produce a report without also fixing. After fixing, add a short `READABILITY_NOTES.md` in the project root listing what was found, what was changed, and one rule to prevent recurrence.

### 15B. Seasonal Voting Process image

In `client/src/pages/Governance.tsx`, find the broken image in the Seasonal Voting Process section.

Generate a replacement:
```bash
python3 scripts/generate-seasonal-cycle-image.py
```

If the script does not exist, create it at that path. Prompt concept: a circular seasonal cycle diagram, 4 seasons arranged in a ring (Winter at top, clockwise through Spring, Summer, Fall). At the Fall-to-Winter transition: a "Seasonal Ceremony" callout. Earthy colors: greens, ochre, deep blue for winter. Style: regenerative, grounded, not corporate. Save output to `client/public/images/governance/seasonal-cycle.png`.

Wire it up in Governance.tsx:
```tsx
<img
  src="/images/governance/seasonal-cycle.png"
  alt="Seasonal cycle showing the four seasons and the Seasonal Ceremony that begins each new cycle"
  className="w-full rounded-xl"
  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
/>
```

### 15C. Remove "Governance Evolution: Three Phases" section

In `client/src/pages/Governance.tsx`:
```bash
grep -n "Governance Evolution\|Three Phases\|three.*phase\|phase.*three" client/src/pages/Governance.tsx -i
```

Delete the entire section block: heading, descriptive text, broken image, surrounding container divs that exist solely for this section. Do not leave empty wrappers.

### 15D. "Who Holds the Vote" image

First check if a file already exists:
```bash
ls client/public/images/governance/
```

Look for `who-holds-vote.png`, `vote-distribution.png`, `voting-weights.png`, or similar. If it exists and is not corrupt, wire it up. If not, generate:

```bash
python3 scripts/generate-who-holds-vote-image.py
```

If the script does not exist, create it. Prompt concept: a clean pie chart or proportional diagram showing 4 groups: Stewardship Council 40%, Investors 20%, Land Projects 20%, Alliance Partners 20%. Style: dark greens, earthy tones, minimal. Save to `client/public/images/governance/who-holds-vote.png`.

Wire it up in Governance.tsx wherever the "Who Holds the Vote" section lives:
```tsx
<img
  src="/images/governance/who-holds-vote.png"
  alt="Vote distribution: Stewardship Council 40%, Investors 20%, Land Projects 20%, Alliance Partners 20%"
  className="w-full rounded-xl"
  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
/>
```

### 15E. "Four Voice-Holder Groups" node diagram image

Find the broken node diagram in `client/src/pages/Governance.tsx`. Generate a replacement:

```bash
python3 scripts/generate-voice-holders-image.py
```

If the script does not exist, create it. Prompt concept: a hub-and-spoke node diagram. Center node: "ReGen Civics Fund". Four outer nodes: Council of Domain Experts (top left), Land Project Stewards (top right), Alliance Partners (bottom right), Investor Voice (bottom left). Each outer node connects to the center. Style: clean, minimal, deep greens and warm earth tones, white labels, ecosystem diagram feel. Save to `client/public/images/governance/voice-holders-diagram.png`.

Wire it up in Governance.tsx:
```tsx
<img
  src="/images/governance/voice-holders-diagram.png"
  alt="Four voice-holder groups connected to the ReGen Civics Fund: Council of Domain Experts, Land Project Stewards, Alliance Partners, Investor Voice"
  className="w-full rounded-xl"
  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
/>
```

### 15F. Nav highlights

**File:** `client/src/components/Navigation.tsx`

First, understand the existing styling:
```bash
grep -n "Participate\|play.*game\|Play.*Game\|Explore.*Quest\|explore.*quest" client/src/components/Navigation.tsx -i
```

**Change 1:** In the "Play the Game" dropdown, find the "Explore Quests" link. Give its container a subtle highlight so it reads as the primary action. Use:
```tsx
className="... bg-[#7dd87d]/10 border border-[#7dd87d]/30 rounded-lg"
```
on the link container, and make the text `text-[#7dd87d]` or slightly bolder.

**Change 2:** Find how "Participate" is styled in the main nav (it likely has a colored background, border, or distinct visual weight). Apply the same or equivalent treatment to the "Play the Game" nav item. If they need to be distinct (primary vs secondary), make "Play the Game" a ghost/outline variant of the same color. Do not make them identical if they serve different roles in the nav hierarchy.

---

## After all parts

Run:
```bash
pnpm build
```

Fix any TypeScript or build errors before finishing. The build must pass cleanly.

Then update the STATUS SUMMARY table at the top of `COMMUNITY_AGREEMENTS_PLAN.md`:
- Mark Part 14 as DONE.
- Mark Parts 15A-F as DONE (or note any that are blocked).

---

## Human steps (do not block on these)

- [HUMAN] Verify GEMINI_API_KEY is set in `.env` before running image generation scripts.
- [HUMAN] Review generated images before deploying to production.
- [HUMAN] Turn ON the Zapier automation: "New YouTube videos to Riverside webhook POST" (currently OFF in Zapier dashboard).
- [HUMAN] Verify Riverside Pro plan has enough hours for Season 2 (13 episodes x 2 hours = 26 hours).
