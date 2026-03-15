# Skill: ReGen Quest Builder

## When to use this skill
Use this skill whenever Rye gives you a quest concept to develop into a full quest card for the ReGen Civics site. Triggers on: "new quest", "quest idea", "quest concept", "add a quest", "build a quest", "quest for [topic]", or any message that includes quest ingredients (concept + season + deliverable).

## What this skill produces
A complete quest package ready for Rye's review, then a Claude Code prompt to add it to the site:

1. **Quest card data** (all fields for `seasonalQuestsData.ts` or the numbered quest array)
2. **Story card copy** (the narrative voice, game-like and inspiring)
3. **How-to steps** (numbered, practical, progressively deeper)
4. **Deliverable statement** (clear, specific, game-language)
5. **Token amounts** (based on complexity scale in this doc)
6. **Image prompt** (for nano-banana-pro image generation)
7. **PDF field guide outline** (section headers + brief content for each)
8. **Forum post** (the seeded opening post for this quest's thread)
9. **Quest connections** (how this quest links to others in the arc)
10. **Claude Code implementation prompt** (ready to paste)

---

## Step 1: Gather ingredients

Before writing anything, confirm you have:
- Quest concept (what is it about?)
- Proposed season (Spring / Summer / Fall / Winter / Anytime)
- Proposed deliverables (what does the player submit?)
- Any links, videos, books, or resources that are part of it

If any are missing, make your best judgment based on the concept and note your assumptions.

---

## Step 2: Read context before writing

Before drafting, pull these for context:

1. Read `QUEST_MASTER_SHEET.md` Parts 1 and 2 (The Arc) to understand how the quest connects to the larger arc
2. Identify which existing quests this new quest relates to (prereqs, companions, followups)
3. Note whether the quest is individual practice, relational, or collective
4. Check the season -- does it align with the energy of that season? (Spring = renewal/planting, Summer = growth/connection, Fall = harvest/depth, Winter = rest/vision, Anytime = internal/perennial)

---

## Step 3: Assess complexity and set token reward

Use this scale to determine $ReGen reward. 1 RGVoice is always 1 per quest regardless of complexity.

| Complexity | Description | $ReGen |
|---|---|---|
| Gentle | Brief, low-effort, one-time or light practice | 33 |
| Easy | A few hours or one-day practice, simple output | 66 |
| Accessible | One week of practice or a focused project | 99 |
| Standard (baseline) | 2-4 weeks of practice, meaningful output | 111 |
| Deep | One full month or ongoing practice with real documentation | 144 |
| Significant | Multi-month, community coordination, or lasting creation | 177 |
| Advanced | Requires skill, sustained effort, and high-quality output | 222 |
| Transformative | Multi-month, real-world impact, leadership required | 333 |
| Hero Quest | Life-stage commitment (years, profound sacrifice or dedication) | 444+ |

For repeatable quests (like Food Foresting), note that it earns tokens each completion with no cap.

For book/series quests with multiple volumes: each volume earns tokens individually, full series earns a bonus. Use 33 per book as standard, with whole-series bonus bringing the total to a round number (e.g. 9 books x 33 = 297, round up to 333 for completing all).

---

## Step 4: Write the quest card

Write in the voice of the ReGen Civics game: warm, alive, slightly poetic, grounded in real practice. Not a lecture. Not a press release. Not AI writing. Sound like someone in the movement who has actually done this thing and wants to share it.

Rules:
- No em-dashes and no double-dashes (never use `--` or `—`). Use a single dash `-`, a comma, or a period instead.
- No AI-isms: no "delve", "tapestry", "foster", "leverage", "it's worth noting", "in conclusion"
- Use second person ("you") throughout
- Game language: "quest", "earn tokens", "claim your reward", "field guide", "the arc"
- Keep the story card to 3-5 sentences of genuine inspiration, then move to practical steps
- Steps should build on each other: start accessible, move toward something real

### Quest card format

```
## Quest Title
**Subtitle:** [short evocative phrase]
**Season:** [Spring / Summer / Fall / Winter / Anytime]
**Rewards:** [X $ReGen + 1 RGVoice]
**Time:** [honest time estimate]
**Element:** [fire / water / earth / air / aether -- pick the one that fits best]
**Deliverable:** [one sentence, specific and concrete]

### Story Card
[3-5 sentences of genuine inspiration. Why does this matter? What does it open?
What has been forgotten that this quest recovers? Write from the heart.]

### How To Do This Quest
**Step 1: [action title].** [Description -- specific and practical]
**Step 2: [action title].** [Description]
...
[4-7 steps, ending with documentation and sharing]

### Deliverable
[Expanded deliverable -- what exactly does the player submit or share?]

### Tips
- [Practical insight from someone who has done this]
- [Common sticking point and how to move through it]
- [Optional extension for those who want to go deeper]

### Resources
- [Primary resource with link if available]
- [Secondary resource]

### Connected To
- Comes after: [Quest X] -- [why]
- Pairs with: [Quest Y] -- [why]
- Unlocks: [Quest Z] -- [why]
- Qualifier for: [if applicable]
```

---

## Step 5: Write the image prompt

Use the photorealistic style of existing quest card images: close-up photography of nature, hands, food, or people in natural settings. Warm light. Real environments.

Format: `[Subject/scene], [lighting], [mood/detail], no text, photorealistic`

Example: `Hands holding an open book beside a small fire outdoors, golden late-afternoon light, pine trees in background, one dried flower pressed in the pages, photorealistic`

---

## Step 6: Write the PDF field guide outline

The field guide is a printable 1-2 page companion to the quest. Sections:

1. **What This Quest Is** (2-3 sentences from the story card)
2. **Why Now** (1-2 sentences on why this matters in this moment in history)
3. **How To Do It** (abbreviated step list from the quest card)
4. **The Deliverable** (exactly what to submit)
5. **Resources** (links/books from quest card)
6. **A Place to Write** (blank lined section for notes/journal)

---

## Step 7: Write the forum post

The forum post seeds the discussion thread for this quest. It should:
- Open with a genuine question that invites real responses
- Give 2-3 sentences of context for why this thread exists
- End with a specific prompt (not just "share your thoughts")
- Sound like ReGen Civics Team is a real person who cares
- No em-dashes, no AI language
- 150-250 words

---

## Step 8: Note quest connections

Write a short paragraph connecting this quest to others in the arc. Where does it sit? What does it follow? What does it open? What communities or qualifications does it connect to?

---

## Step 9: Present for Rye's review

Present the full quest package clearly labeled. Tell Rye:
- Your complexity rating and why
- Any assumptions you made
- Any questions about the deliverable or resources
- Whether you see any connections to existing quests that strengthen it

Wait for Rye's edits and confirmation before proceeding to Step 10.

---

## Step 10: Generate the Claude Code implementation prompt

Once Rye confirms the quest, write a prompt for Claude Code that includes:

1. The full quest data object to add to `seasonalQuestsData.ts` (or numbered quests array if it's a core quest)
2. The forum seed post to add to `seed-forum-posts.ts`
3. The image prompt to pass to nano-banana-pro (note the save path: `public/quest-images/seasonal/[slug].webp`)
4. The PDF field guide content to generate using the pdf skill
5. Any DB changes needed (usually none for new quests)
6. Where in the carousel to insert it (after which existing quest)

Format the prompt so Claude Code can execute it autonomously.
