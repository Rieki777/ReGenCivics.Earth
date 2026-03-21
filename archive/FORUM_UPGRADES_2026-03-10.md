# Forum Upgrades

---

## Fix 1 — Forum Content Overhaul + Welcome Aboard Quests

**Status:** Ready for implementation

**Context:**

The forum is where the ReGen Civics community comes alive. Two source documents shape this work:

1. Community Forum Content doc (ReGen Civics) — rewrites for all existing Gathering Grove posts plus 40+ pre-population thread ideas across 9 topics
2. `ReGenCivics_WelcomeAboard_Brief` (DOCX) — developer brief for the Welcome Aboard Quests series: 10 quest cards with UI spec, forum post bodies, and seed comments

The Welcome Aboard Quests invite new players to root themselves in regenerative values and connect with others walking the same path. Each quest is a small, meaningful act — sharing a story, mapping a bioregion, pledging a gift, finding a friend. Together they help players understand who they are, what they bring, and how to show up for the Regenerative Renaissance.

**Key constraints:**

- Remove ALL em-dashes (—) from any content before writing to DB or UI. Replace ` — ` with `: ` or restructure the sentence. No exceptions.
- Remove AI-centric phrases: "delve into", "it's worth noting", "in conclusion", "it's important to", "dive in", "game-changing", "let's explore". Plain human voice throughout.
- Quest 10 forum link must point to `https://regencivics.earth/community/quests` (not `/dream-quest`)
- Quest cards have two display modes: always-visible header zone, collapsible "About this quest" body (hidden by default, tap/click to expand)
- After-profile-setup popup and nav entry point are required (see UX Entry Points below)

---

### Part A: Quest Card UI in PlayerProfile.tsx

**Source:** Welcome Aboard Quests Developer Brief, Section 2

The Quests tab in `PlayerProfile.tsx` gets a new card layout. Each quest card is compact by default and expands on demand. Two zones per card:

**Always visible:**
- Quest number badge (Q1, Q2, etc.)
- Quest title
- Tagline (one line, plain text)
- Reward badge: "33 $ReGen + 0.1 RGVoice"
- Forum link button: "Go to forum post" (opens forum URL in new tab)
- Status indicator: completed / in-progress / locked (if applicable)

**Collapsible (hidden by default, chevron toggle):**
- Label: "About this quest" with a down-chevron icon
- Full quest description (2–4 sentences from the brief)
- Numbered how-to steps
- Bonus reward line (if quest has one)

**TypeScript interface:**

```ts
interface QuestCardProps {
  number: number;        // 1–10
  title: string;
  tagline: string;
  reward: string;        // "33 $ReGen + 0.1 RGVoice"
  forumUrl: string;
  about: string;
  steps: string[];       // ordered steps
  bonus?: string;        // optional bonus reward text
  completed?: boolean;
}
```

Create `client/src/components/QuestCard.tsx` with this interface and create `client/src/data/quests.ts` with all 10 quest data objects. The 10 quests and their details are in the attached Welcome Aboard Quests Developer Brief (Section 2).

**Quest forum URLs:**

Quests are displayed in this order — Q-number is the canonical identifier:

| Quest | Tagline | Forum URL |
|-------|---------|-----------|
| Q1: Share Your Experience & Give Constructive Feedback | Your perspective makes the site better for everyone. | `/community/feedback` |
| Q2: Write Your Regenerative Origin Story | What woke you up? How did you get here? | `/community/origin-story` |
| Q3: Do a Regenerative Act | Bring the Game into the physical world. | `/community/regen-act` |
| Q4: Connect with Your Bioregion | Know where you are. Know what you belong to. | `/community/bioregion` |
| Q5: Make Friends and Support | New here? Someone needs you. Already settled in? Someone needs you too. | `/community/make-friends` |
| Q6: Pledge Your Gift | What do you bring to the Regenerative Renaissance? | `/community/pledge-gift` |
| Q7: Explore Our Foundations | 11+ years of exploration, distilled into a short playlist of videos. | `/community/foundations` |
| Q8: Refer an Organisation Project | Who helps land regenerate? Bring them too. | `/community/refer-org` |
| Q9: Refer a Land Project | Know someone stewarding land? Bring them in. | `/community/refer-land` |
| Q10: Dream Up a Regenerative Quest | Step from player to co-creator of the Game. | `https://regencivics.earth/community/quests` ← **override** |

---

### Part B: UX Entry Points

Players discover their quests in three places. Each entry point should feel like an invitation, not a notification:

**1. After-profile-setup popup**

Create `client/src/components/QuestStartPopup.tsx`:
- Fires once after a player completes their profile for the first time
- Uses a `localStorage` flag `hasSeenQuestPrompt` — set it to `"true"` on dismiss; never show again
- Modal with a warm welcome into the Welcome Aboard Quests series and a "View Quests" button that routes to the Quests tab in PlayerProfile
- Dismiss (X) also sets the flag

**2. Profile area link**

In the profile page header or sidebar, add a persistent link/button: "Personal Quests" that navigates to the Quests tab.

**3. Nav menu entry**

Add "Personal Quests" as a nav menu item (authenticated users only) that routes to the Quests tab in PlayerProfile.

---

### Part C: Series Header in Profile Quests Tab

At the top of the Quests tab, above the quest cards, render a series summary block. This sets the tone — players should feel welcomed and excited, not overwhelmed:

- Series name: "Welcome Aboard Quests"
- Subtitle (optional, plain text): "Ten ways to root yourself in the Regenerative Renaissance."
- Total quests: 10
- Per-quest reward: 33 $ReGen + 0.1 RGVoice
- Completion bonus text: "Complete all 10 to earn 330 $ReGen + 1 RGVoice total"
- Claim threshold note: You can claim after completing all 10 quests

---

### Part D: Forum Content Updates (8 Existing Post Rewrites)

The Gathering Grove posts are the first thing many members read. They should sound like a real person who cares about this work.

Create `scripts/seed-forum-posts.ts` that updates the bodies of the 8 existing Gathering Grove forum posts to match the new content strategy.

Put the post body data in `scripts/data/forum-posts.ts` (exported array of `{ slug: string; title: string; body: string }`).

The 8 rewritten post bodies are defined in the Community Forum Content document (the "Gathering Grove rewrites" section). Apply all key constraints: no em-dashes, no AI-isms, plain human voice.

The script must support a `--dry-run` flag that prints all posts to console without writing to DB.

---

### Part E: Pre-Population Thread Stubs (40 Threads)

A living forum needs voices. These 40 threads seed the space so new members arrive somewhere warm and active, not blank.

Create `scripts/seed-forum-threads.ts` that inserts 40 pre-population thread stubs across 9 topic areas.

Put thread data in `scripts/data/forum-threads.ts` (exported array of `{ topicSlug: string; title: string; body: string; authorNote?: string }`).

Thread content is defined in the Community Forum Content document (the "pre-population thread ideas" section — all 40 threads across the 9 topics). Same constraints: no em-dashes, no AI-isms.

The script must support a `--dry-run` flag.

---

### Part F: Quest Forum Posts + Seed Comments (10 Posts)

Each quest has its own dedicated forum thread where players share how they completed it. Seed comments model the kind of honest, grounded responses the community should feel invited to give.

Create `scripts/seed-quest-forum-posts.ts` that:

1. Creates 10 dedicated forum posts (one per quest, at the slugs defined in Part A)
2. Adds 3 seed comments per post, marked as EXAMPLE, posted from an admin/moderator account with a note that they are example contributions

The post bodies and seed comments are defined in the Welcome Aboard Quests Developer Brief, Section 3. Use them verbatim (after applying em-dash and AI-ism rules). Example usernames in seed comments (Solange Beaumont, Tobias Wrenfield, Yemi Adeyinka, etc.) are fictional.

For Quest 10's forum post: the completion CTA must link to `https://regencivics.earth/community/quests`.

The script must support a `--dry-run` flag.

---

### Part G: Em-Dash Audit

After all content is written, run a final grep audit:

```bash
grep -r " — \|—" client/src/ server/ scripts/data/ --include="*.ts" --include="*.tsx" | grep -v node_modules
```

Any match is a bug. Fix before committing.

---

### Files to Create / Modify

| Action | Path | Description |
|--------|------|-------------|
| CREATE | `client/src/components/QuestCard.tsx` | Collapsible quest card component |
| CREATE | `client/src/data/quests.ts` | All 10 quest data objects |
| MODIFY | `client/src/pages/PlayerProfile.tsx` | Render QuestCard list in Quests tab; add series header; add after-setup popup; add "Personal Quests" profile link |
| CREATE | `client/src/components/QuestStartPopup.tsx` | One-time popup modal after profile setup |
| CREATE | `scripts/seed-forum-posts.ts` | Updates 8 existing forum post bodies |
| CREATE | `scripts/data/forum-posts.ts` | Post body data |
| CREATE | `scripts/seed-forum-threads.ts` | Inserts 40 pre-population thread stubs |
| CREATE | `scripts/data/forum-threads.ts` | Thread stub data |
| CREATE | `scripts/seed-quest-forum-posts.ts` | Creates 10 quest forum posts with seed comments |

---

### Verify

1. `pnpm check` passes with no TypeScript errors
2. Quest cards render in PlayerProfile Quests tab, expand/collapse correctly
3. All quest forum URLs correct (Q10 → `https://regencivics.earth/community/quests`, others as specified)
4. Em-dash grep returns zero matches in tracked files
5. `npx ts-node scripts/seed-forum-posts.ts --dry-run` prints all 8 posts without error
6. `npx ts-node scripts/seed-forum-threads.ts --dry-run` prints all 40 threads without error
7. `npx ts-node scripts/seed-quest-forum-posts.ts --dry-run` prints all 10 quest posts without error
8. After-setup popup fires once on new profile completion, not again on reload
