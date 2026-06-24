# Fixes to Make — 2026-03-31

This document continues from `FIXES_TO_MAKE_2026-03-29.md`. Includes quest page overhaul from Rye's screenshots and new progression rules.

---

## Fix 1 — Fire + Food Forest Quest Cards Need Hero Images (High)

**Status:** CODED

**Symptom:** The main Fire and Food Foresting quest cards at the top of /quest show no background images.

**Root cause:** The hero images exist (`quest-fire-hero.webp`, `quest-food-foresting-hero.webp`) but the card components don't use them as backgrounds.

**Fix:** Update the Fire and Food Foresting card sections in Quest.tsx to use hero background images with dark gradient overlays for text readability.

---

## Fix 2 — Remove "Quest 14:" Numbering from Love to Heal Your Body (Quick)

**Status:** CODED

**Symptom:** The routine quest card says "Quest 14: Love to Heal Your Body" but routine quests should not be numbered.

**Root cause:** Card template copied from the numbered Fasting card pattern.

**Fix:** Remove "Quest 14:" prefix from the h4 in Quest.tsx. Going forward, no quests are numbered unless Rye specifically says so.

---

## Fix 3 — Spring Quests Locked Behind Fire, Sequential Season Unlock (High)

**Status:** CODED

**Symptom:** All seasonal rites are visible and interactive regardless of progression.

**Root cause:** Quest locking UI not yet implemented for the Rites of Passage carousel.

**Fix:** Add locked state bars to each season section:
- Spring: "Complete the Fire quest to unlock Spring Rites"
- Summer: "Complete one quest in Spring to unlock Summer"
- Fall: "Complete one quest in Summer to unlock Fall"
- Winter: "Complete one quest in Fall to unlock Winter"
Uses existing `useQuestUnlocks` hook. Visual: greyed cards with lock overlay + banner text.

---

## Fix 4 — Epic Quests Require ALL Rites (Not 1 Per Season) (High)

**Status:** CODED

**Symptom:** Progression spec says 1 rite per season unlocks epics. Rye wants ALL rites completed.

**Root cause:** Spec change from Rye.

**Fix:** Update `useQuestUnlocks.ts` logic: Epic quests unlock only after ALL 13 numbered rites (quests 0-12) are completed. Update the epic section banner text: "Complete all Rites of Passage to unlock Epic Quests."

---

## Fix 5 — Other Quests (Routine, Seasonal, Anytime) Unlock After 1 Per Season (Medium)

**Status:** CODED

**Symptom:** Routine quests (Fasting, Love to Heal Your Body) and seasonal practice quests show even when player hasn't progressed.

**Root cause:** No gating applied to non-rite quests.

**Fix:** After completing 1 rite per season (4 total, 1 from each), unlock all routine, anytime, elemental, and seasonal practice quests. This is the existing "4-season gate" from the progression spec.

---

## Fix 6 — Move "Got a Quest Idea?" Above Epic Quests, Restyle (Medium)

**Status:** CODED

**Symptom:** The "Got a Quest Idea?" section sits below the epic quests section and looks plain.

**Fix:** Move the section to appear before the EpicQuestSection component. Restyle with a more visually appealing treatment (gradient background, better spacing, icons).

---

## Fix 7 — Replace Bottom CTA Buttons with Tokenomics/Governance Info (Medium)

**Status:** CODED

**Symptom:** Bottom CTA has "Explore All Quests" and "Explore Knowledge Base" buttons that aren't useful.

**Fix:** Replace with a header: "Want to learn more about the tokens you're earning in quests?" Then two info cards:
- "$ReGen Tokenomics" linking to /tokenomics with copy about in-game currency
- "RGVoice Governance" linking to /governance with copy about governance voice

---

## Handoff Breakdown — Who Does What

### YOU (Rye) -- things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 1 | Generate hero images via Claude Code (if nano-banana-pro needed) | API key in Claude Code env | Run prompt from `docs/quest-14-image-prompt.md` |

### CLAUDE CODE -- already done or can be done without you

| # | Task | Status |
|---|------|--------|
| 1 | Add hero images to Fire + Food Forest cards | CODED |
| 2 | Remove Quest 13 + 14 numbering | CODED |
| 3 | Season locking UI + progression bars | CODED |
| 4 | Epic quest gate (ALL 12 rites required) | CODED |
| 5 | Routine/seasonal/anytime gating (1 per season) | CODED |
| 6 | Move + restyle "Got a Quest Idea" | CODED |
| 7 | Replace bottom CTA with tokenomics/governance | CODED |
| -- | Update QUEST_PROGRESSION_SPEC.md | DONE |
| -- | Update QUEST_MASTER_SHEET.md (Quest 14 added) | DONE |
| -- | Update QUEST_ORGANIZATION_PLAN.md (Quest 14 + epic rules) | DONE |
| -- | Update quest builder skill to reference master sheets | DONE |

### WAITING ON YOU before Claude Code can proceed

None. All fixes can proceed autonomously.
