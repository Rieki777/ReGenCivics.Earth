# SPEC 05: Quest card progressive disclosure v2

**Status:** SPEC READY
**Supersedes:** SPEC_04 Idea 14 (shipped as skeleton in commit e6f7c2d)
**Content source:** `QUEST_MASTER_SHEET.md` is the canonical content for every quest. All tier content maps to fields in that document.
**Scope:** `client/src/pages/Quest.tsx`, `client/src/components/QuestDetailModal.tsx`, `client/src/index.css`, `client/src/data/questData.ts`, one new content data file, one new media component, and a route for deep-linking tier 3.

---

## Goal

Three-tier disclosure on every unlocked quest card with details.

Tier 1 is a Netflix-style poster. Visual-first, almost no text. The job of tier 1 is to draw the eye and signal "this is worth opening."

Tier 2 is "About this quest." Reader-oriented. Rewards, time, a teaser from the story card, forum link, endorsements, players in the field. The job of tier 2 is context, not completion.

Tier 3 is "Do this quest." Actor-oriented. Video walkthrough, full story card, step-by-step how-to, tips, resources, deliverable spec, and every action button a player needs to claim their tokens. The job of tier 3 is commitment.

## Interaction model

Tap-card-once pattern with an explicit CTA as a belt-and-suspenders path.

| From | Action | Result |
|------|--------|--------|
| Tier 1 (collapsed) | Tap anywhere on the card | Expand to tier 2 |
| Tier 1 (collapsed) | Tap the ⓘ pill | Expand to tier 2 |
| Tier 1 (collapsed) | Keyboard: focus card + Enter/Space | Expand to tier 2 |
| Tier 2 (expanded) | Tap the header region (image or title block) | Navigate to tier 3 |
| Tier 2 (expanded) | Tap "Do this quest →" CTA at bottom of tier 2 | Navigate to tier 3 |
| Tier 2 (expanded) | Keyboard: focus card body + Enter/Space | Navigate to tier 3 |
| Tier 2 (expanded) | Keyboard: Escape | Collapse to tier 1 |
| Tier 2 (expanded) | Tap outside any card | Collapse to tier 1 |
| Tier 2 (expanded) | Tap a different card | That card opens, this one collapses |
| Tier 2 (expanded), hover-only | Mouse leaves card without clicking | Collapses back to tier 1 (preview mode) |
| Tier 2 (expanded), hover-to-commit | Mouse leaves card after a click | Stays expanded |
| Any inner action button (forum link, active-quest toggle) | Tap | Button fires. Event does not bubble. Tier state does not change. |

The header region at tier 2 is the image plus the title+subtitle block. Everything below that block is the interactive zone where inner buttons own their own clicks.

## Tier content

### Tier 1 (Netflix poster)

**Image layer (full-bleed):**
- Quest poster at 16:9 aspect ratio (`aspect-[16/9]`), `object-cover`, rounded-xl
- Bottom-half dark gradient overlay (`bg-gradient-to-t from-black/70 via-black/30 to-transparent`) for title legibility
- Title overlay bottom-left, 2-line clamp, white, display font, font-semibold
- Floating chip: completion badge top-right (circle + check) when quest is completed
- Floating chip: "Trailer" pill top-left when `videoUrl` is set. Pill style: small rounded-full, `bg-black/60 text-white backdrop-blur px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider`, with a small `<Play className="w-3 h-3" />` icon before the label. Only Quest 0 and Quest 1 today.
- Floating chip: "Good for right now" pill bottom-right when seasonally recommended

**Metadata row (below image):**
- Single line: `quest.time` string (e.g., "2 to 4 hours")
- Right-aligned small ⓘ pill ("See details" aria-label)

That's tier 1. No subtitle, no rewards, no description, no buttons. Card height roughly 220-260px.

### Tier 2 (About this quest)

**Header strip:**
- Smaller poster thumbnail (h-20 aspect-square on the left) that shrinks via height transition
- Quest number + title (larger)
- Subtitle (italic, accent color)
- Experience text line (small italic, when present)

**Rewards row:**
- Two reward pills (`+N $ReGen`, `+N RGVoice`) at full size
- Time estimate pill next to them (`⏱ 2 to 4 hours`)

**Story teaser:**
- First 2-3 paragraphs of `storyCard` (pulled from QUEST_MASTER_SHEET, capped at ~80 words total)
- "Read full story in the guide →" link that opens tier 3

**Context chips row:**
- Connected To chips (e.g., "Comes before Quest 1", "Referenced by Air-season"). Clickable, jumps to the referenced card.
- Endorsement badges when present (existing pattern)

**Social proof row:**
- "🌿 N in the field" pill (active players)
- Forum link ("Discuss in Forum") when `forumUrl` exists

**Primary CTA:**
- "Do this quest →" button (primary, bottom of tier 2, arrow-right icon)

The "I'm on this quest" toggle, Mark Complete button, how-to-claim accordion, Submit Proposal, and Download Image button all move to tier 3. They are action-layer, not about-layer.

### Tier 3 (Do this quest)

Tier 3 is the `QuestDetailModal`, with content restructured from the master sheet.

**Top of modal:**
- `<QuestTier3Media>` hero (video when `videoUrl` exists, otherwise the quest poster with a centered "Video walkthrough coming soon" overlay)
- Quest number + title + subtitle
- Rewards row + time pill
- Completion banner across top when completed ("✓ You completed this on [date]")

**Full story card:**
- All paragraphs from `storyCard` in the master sheet
- Typography: `prose` class, larger line height

**How to do this quest:**
- Numbered steps from `howToSteps`
- Each step gets its own card with the step number in a circle, the bold lead (e.g., "Step 1: Sit with fire."), and the supporting body

**Deliverable:**
- Callout box: "What you'll share" with the `deliverable` text

**Tips:**
- Bulleted list from `tips`

**Resources:**
- List of external links from `resources` (intro video, PDF guide, SEEDS links, etc.)

**Connected To:**
- "Comes before" and "Referenced by" navigation links

**Action bar (sticky bottom on mobile, sidebar on desktop):**
- "I'm on this quest" toggle
- How to claim tokens (inline accordion: copy proposal name, copy reward values, download quest image, download PDF guide)
- Submit Proposal on DAO button
- Mark Complete button

Close button top-right. Escape collapses back to the tier 2 expanded card underneath.

### Hypha Bridge preservation (non-negotiable)

The "Submit Proposal on DAO" button lives at tier 3 and must route through the existing `SubmitToDAOModal` component. That modal already talks to `trpc.hyphaBridge.createFromQuest` and redirects to `/bridge/hypha/:key`. The tier refactor must not introduce a direct `window.open('https://app.hypha.earth/...')` from the card or the modal. Per `CLAUDE.md`, the only module allowed to construct Hypha URLs is `server/lib/hypha-bridge`.

Wiring requirements inside `QuestDetailModal.tsx` action bar:

```tsx
<SubmitToDAOModal
  isOpen={submitModalOpen}
  onClose={() => setSubmitModalOpen(false)}
  questId={quest.id}
  questTitle={quest.title}
  questDescription={quest.description}
  questDeliverable={quest.deliverable}
  regenReward={quest.rewards.regen}
  leadImageUrl={quest.imageUrl}
/>
```

`leadImageUrl` was previously omitted. The modal's prop interface accepts it but the parent never passed it, so Hypha receives no lead image when the searchParams PR lands. Fix this during the refactor.

Additional cleanup:

- Remove the unused `import { SubmitToDAOModal } from "@/components/SubmitToDAOModal"` at the top of `client/src/pages/Quest.tsx`. The modal only renders inside `QuestDetailModal`. The dead import is a leftover from a previous wiring attempt.
- After writing to `Quest.tsx` or `QuestDetailModal.tsx`, run `python3 scripts/audit-truncation.py --clean-nul`. Both files currently carry trailing NUL padding (1173 bytes on `Quest.tsx`, padding on `QuestDetailModal.tsx`) that the ship gate tolerates but should be scrubbed.

## Tier 3 as a shareable route

Tier 3 is also reachable via canonical URL `/quest/:slug`.

- When a user clicks "Do this quest →" on an expanded card, open the modal and push `/quest/:slug` via shallow routing (wouter's `setLocation` with the existing page scroll preserved).
- When a user lands on `/quest/:slug` cold, render the Quest page with the corresponding card pre-expanded at tier 2 and the modal open at tier 3.
- When the modal closes, push back to `/quest` and the card stays expanded at tier 2.
- Back button on mobile closes the modal (normal browser back).

Benefit: land projects and alliances can link directly to required quests in their application flows, emails, and forum posts.

## State model

### Expansion state (parent-coordinated)

State lives in the parent that renders the quest grid (in `Quest.tsx`, the component that maps over `questData.{spring,summer,...}`).

```tsx
const [expandedQuestId, setExpandedQuestId] = useState<string | null>(null);
const [expandedCommitted, setExpandedCommitted] = useState(false); // true after click; false for hover-preview

const handleExpand = (questId: string, committed: boolean) => {
  setExpandedQuestId(questId);
  setExpandedCommitted(committed);
};
const handleCollapse = (questId: string) => {
  if (expandedQuestId === questId) {
    setExpandedQuestId(null);
    setExpandedCommitted(false);
  }
};
const handleNavigate = (questId: string) => {
  setExpandedQuestId(null);
  setExpandedCommitted(false);
  onOpenDetails?.(questId); // opens the modal AND updates the URL
};
```

Each `<QuestCard>` receives `isExpanded = expandedQuestId === questId` and the handlers.

### Hover vs commit (desktop only)

Mouseenter fires `handleExpand(id, committed=false)`. Click fires `handleExpand(id, committed=true)`. Mouseleave only collapses if `!committed`. Tap on touch always goes through click.

### Outside click

The grid parent listens for `mousedown` on `document` and clears `expandedQuestId` when the target is not inside any quest card. Detect by adding `data-quest-card="true"` to each card root and checking `e.target.closest('[data-quest-card="true"]')`.

### Escape key

Parent listens for `keydown` and clears state on Escape.

### URL state

Use a `useEffect` that syncs the URL to the modal state:

```tsx
const [location, setLocation] = useLocation();
useEffect(() => {
  if (modalQuestId) {
    setLocation(`/quest/${questSlug(modalQuestId)}`, { replace: false });
  } else if (location.startsWith('/quest/')) {
    setLocation('/quest', { replace: false });
  }
}, [modalQuestId]);
```

Then on initial mount, read the URL and open the matching card at tier 2 + modal at tier 3.

## Image transitions

Tier 1 → Tier 2: the poster shrinks from `aspect-video` full-bleed to `h-20 w-20` thumbnail over 0.3s ease-out. Implement via `style={{ height: isExpanded ? '5rem' : 'auto' }}` on the wrapper and `aspect-ratio` toggle, or via two separate rendered instances that cross-fade.

Simpler alternative (recommended): two image wrappers, one with `tier-1-image` class and one with `tier-2-image` class, swapped visually via `opacity` + `display` at different tier states. Less jank than animating aspect-ratio.

## Tier 2 body transition

Continue using `grid-template-rows: 0fr → 1fr`. Change the trigger from `:hover` to a data attribute:

```css
.quest-card[data-expanded="true"] .quest-card-tier2 {
  grid-template-rows: 1fr;
  opacity: 1;
}
```

Drop the `:hover` / `:focus-within` CSS rules. State drives the class.

## Accessibility

- Card root: `role="button"`, `tabIndex={0}`, `aria-expanded={isExpanded}`, `aria-controls={'quest-'+id+'-tier2'}`.
- Tier 2 wrapper: `id={'quest-'+id+'-tier2'}`, `aria-hidden={!isExpanded}`.
- Accessible label changes with state: collapsed label is "Quest N: Title. Tap to see details." Expanded label is "Quest N: Title expanded. Tap again to open full quest, press Escape to close."
- Inner buttons keep their own labels.
- Focus ring on the card itself, not suppressed by `outline-none`.
- When card collapses via Escape or outside click, focus returns to the card.
- When card navigates to tier 3, focus moves into the modal's first focusable element (existing modal behavior).
- Modal close returns focus to the card body.

## Motion

Default transitions: 0.3s ease-out for `grid-template-rows`, `height`, `opacity`, and the image-wrapper cross-fade.

Respect `prefers-reduced-motion: reduce`. Wrap transitions:

```css
@media (prefers-reduced-motion: no-preference) {
  .quest-card-tier2 {
    transition: grid-template-rows 0.3s ease-out, opacity 0.3s ease-out;
  }
  .quest-card-image-wrapper {
    transition: opacity 0.3s ease-out, height 0.3s ease-out;
  }
}
```

Under `prefers-reduced-motion: reduce`, state still toggles. Image swaps. Body appears. No intermediate animation.

## Scroll-into-view on expand

After tier 2 opens on mobile, if the card's bottom edge is below the viewport, smooth-scroll so the full expanded card is visible.

```tsx
useEffect(() => {
  if (!isExpanded) return;
  const rect = cardRef.current?.getBoundingClientRect();
  if (!rect) return;
  const overflow = rect.bottom - window.innerHeight;
  if (overflow > 0) {
    window.scrollBy({ top: overflow + 16, behavior: 'smooth' });
  }
}, [isExpanded]);
```

Skip the scroll on desktop when the whole card is already in view.

## Video placeholder component

New file: `client/src/components/QuestTier3Media.tsx`

```tsx
interface Props {
  questId: number;
  slug: string;
  videoUrl?: string;
  title: string;
}

export function QuestTier3Media({ questId, slug, videoUrl, title }: Props) {
  const [imgError, setImgError] = useState(false);

  if (videoUrl) {
    // YouTube embed for URLs pointing at youtube.com/watch?v=...
    const ytId = extractYouTubeId(videoUrl);
    if (ytId) {
      return (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${ytId}`}
          title={`${title} walkthrough`}
          className="w-full aspect-video rounded-xl bg-black"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
    // Direct video file
    return (
      <video
        src={videoUrl}
        controls
        preload="metadata"
        poster={questImageUrl(questId, slug)}
        className="w-full aspect-video rounded-xl bg-black"
        aria-label={`${title} walkthrough video`}
      />
    );
  }

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#1a472a]/10">
      <img
        src={imgError ? questImageFallback(questId, slug) : questImageUrl(questId, slug)}
        alt={title}
        className="w-full h-full object-cover opacity-70"
        onError={() => setImgError(true)}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30">
        <Play className="w-12 h-12 text-white/70" aria-hidden="true" />
        <span className="text-white text-sm font-semibold tracking-wide">
          Video walkthrough coming soon
        </span>
      </div>
    </div>
  );
}
```

## Data: `client/src/data/questMasterContent.ts` (NEW, GENERATED)

The file is generated by `scripts/sync-quest-content.ts` (see Content sync workflow section below). Never hand-edit. Typed shape that the parser emits:

```ts
export interface QuestMasterContent {
  id: number;
  subtitle: string;
  timeEstimate: string;       // e.g., "2 to 4 hours"
  videoUrl?: string;
  pdfUrl?: string;            // when a PDF guide exists
  storyCard: string[];        // array of paragraphs
  storyTeaser: string[];      // first 2-3 paragraphs, ~80 words total (derive from storyCard if not explicitly set)
  howToSteps: { heading: string; body: string }[];
  deliverable: string;
  tips: string[];
  resources: { label: string; url: string }[];
  connections: {
    comesBefore?: number[];   // quest ids
    referencedBy?: string[];  // descriptive strings
  };
}

export const QUEST_MASTER_CONTENT: Record<number, QuestMasterContent> = {
  0: {
    id: 0,
    subtitle: "Letting Burn What No Longer Serves",
    timeEstimate: "2 to 4 hours",
    videoUrl: "https://www.youtube.com/watch?v=U5ZTTy0SCaA",
    storyCard: [
      "We start with the fire.",
      "Fire is an element that can transmute toxicity immediately. A log that has sat for centuries becomes light and warmth and ash in minutes. Stories that have shaped our entire identity can be released in a single ceremony if we are willing.",
      // ... rest from QUEST_MASTER_SHEET.md lines 83-95
    ],
    storyTeaser: [
      "We start with the fire.",
      "Fire is an element that can transmute toxicity immediately. A log that has sat for centuries becomes light and warmth and ash in minutes.",
    ],
    howToSteps: [
      { heading: "Step 1: Sit with fire.", body: "Literally if you can. A candle works. A firepit is better. If you have access to an open fire, spend at least 20 to 30 minutes just watching it..." },
      // ... rest
    ],
    deliverable: "A video, article, or voice recording sharing your fire and what you released.",
    tips: [
      "Be real. The community can tell the difference between a genuine fire and a performance. Nobody needs a performance.",
      "If you find it hard to name what to release, start with something small. The fire takes what you give it.",
      "You can return to this quest. Burning is not a one-time act. Many players do a fire ceremony each season.",
    ],
    resources: [
      { label: "Watch intro video", url: "https://www.youtube.com/watch?v=U5ZTTy0SCaA" },
      { label: "SEEDS Quest Guide", url: "https://explore.joinseeds.earth/regen-civics-infinite-game/play-the-game/quest" },
    ],
    connections: {
      comesBefore: [1],
      referencedBy: ["All seasonal quests that involve letting go or transition (Air season)"],
    },
  },
  // Repeat for quests 1 through 13 + 9b, pulling content verbatim from QUEST_MASTER_SHEET.md
};
```

**Source authority:** `QUEST_MASTER_SHEET.md` lines 77 onward. Every field above maps directly to a section in that doc. When content changes, update the master sheet first, then sync to this file.

**Videos currently live (per master sheet):**
- Quest 0 (Fire): `https://www.youtube.com/watch?v=U5ZTTy0SCaA`
- Quest 1 (Potions): `https://www.youtube.com/watch?v=pbhGgg2GZUM`

All other quests render the "video coming soon" placeholder until a video URL is added to the master sheet and synced here.

## Data: extend existing `questData.ts`

No change to existing `Quest` type fields. Add a single optional field:

```ts
interface Quest {
  // existing fields stay the same
  slug: string;
}
```

Slug was already added elsewhere; if not present on every quest, add it now and use it for the `/quest/:slug` route.

## Edge cases

1. **Locked quests.** `LockedQuestCard` stays as-is. The disclosure pattern does not apply.
2. **No master content yet.** If `QUEST_MASTER_CONTENT[quest.id]` is undefined, tier 2 shows title, rewards, time, forum link, endorsements, active players. Tier 3 CTA is hidden. Card still opens tier 2 but not tier 3.
3. **No video.** Tier 3 renders the placeholder. Tier 1 does not show the "trailer" chip.
4. **No forum URL.** Skip the forum link.
5. **No endorsements.** Skip the endorsement row.
6. **No active players.** Skip the pill.
7. **Unauthenticated user.** Tier 1 and tier 2 behave identically for all users. "I'm on this quest" toggle in tier 3 is hidden when not signed in (existing pattern).
8. **Reduced motion.** Everything toggles instantly. No animation.
9. **Keyboard user on a card with tier 3 content.** Enter expands, second Enter navigates. Tab moves focus to the first inner button (forum link or Context chip). Escape collapses.
10. **Direct URL to `/quest/:slug` on cold load.** Page renders, matching card pre-expands at tier 2, modal opens at tier 3 with focus on the close button.
11. **Completed quest.** Tier 1 completion chip. Tier 2 shows a small "✓ completed" label near the rewards. Tier 3 shows a completion banner and any re-do affordances.

## Files to touch

| File | Change |
|------|--------|
| `client/src/pages/Quest.tsx` | Refactor `QuestCard` into three render modes (tier 1, tier 2, tier 3-trigger). Move expansion state up to the grid parent. Add outside-click and Escape handlers. Implement Netflix-style tier 1 layout. Wire URL sync for tier 3. Split content between tier 1 and tier 2. |
| `client/src/components/QuestDetailModal.tsx` | Replace existing hero image with `<QuestTier3Media>`. Restructure content to pull from `QUEST_MASTER_CONTENT`. Add action bar (I'm on this quest, Mark Complete, Submit Proposal, Download Image, Download PDF). Add completion banner. |
| `client/src/components/QuestTier3Media.tsx` | NEW. Renders video, YouTube embed, or "coming soon" placeholder. |
| `client/src/data/questMasterContent.ts` | NEW. Typed content for all quests. GENERATED by the parser script. Do not hand-edit. |
| `scripts/sync-quest-content.ts` | NEW. Parser that reads `QUEST_MASTER_SHEET.md` and writes `questMasterContent.ts`. See Content sync workflow section. |
| `package.json` | Add `"sync:quest-content": "tsx scripts/sync-quest-content.ts"`. |
| `client/src/data/questData.ts` | Ensure every quest has `slug`. No other shape change. |
| `client/src/index.css` | Replace `:hover`-driven `.quest-card-tier2` rule with `[data-expanded="true"]`-driven rule. Add `prefers-reduced-motion` wrapper. Add Netflix gradient overlay utility. |
| `client/src/App.tsx` or router | Add `/quest/:slug` route. Points to the same `<Quest />` page, which reads the slug and pre-opens the corresponding card + modal. |

## Ship criteria

Before marking VERIFIED, run the three gates from repo root:

```bash
python3 scripts/audit-truncation.py                                   # gate 1
rg -g '*.css' 'quest-card-tier2' client/src/                          # gate 2
rg -g '*.tsx' 'data-expanded' client/src/pages/Quest.tsx              # gate 2
rg -g '*.tsx' 'QuestTier3Media' client/src/                           # gate 2 (new component wired)
rg -g '*.ts'  'QUEST_MASTER_CONTENT' client/src/                       # gate 2 (content file wired)
rg -g '*.tsx' 'SubmitToDAOModal' client/src/components/QuestDetailModal.tsx  # gate 2 (bridge preserved)
rg -g '*.tsx' 'leadImageUrl=\{quest' client/src/components/QuestDetailModal.tsx  # gate 2 (leadImage wired)
rg -g '*.tsx' "SubmitToDAOModal" client/src/pages/Quest.tsx           # gate 2 (MUST return no matches: dead import removed)
rg -g '*.tsx' "window\\.open\\('https://app.hypha.earth" client/src/components/QuestDetailModal.tsx  # gate 2 (MUST return no matches: bridge not bypassed)
pnpm sync:quest-content                                               # parser runs clean
git diff --exit-code client/src/data/questMasterContent.ts            # parser output stable (zero diff on second run)
pnpm typecheck                                                        # gate 3
pnpm build                                                            # gate 3 (belt-and-suspenders)
```

All eleven checks must pass before the fixes doc row gets VERIFIED. The two "MUST return no matches" greps are negative checks: `rg` returns non-zero on zero matches, so wrap those lines with `|| true` if you run them in a script, but interpret a zero-match outcome as pass.

Manual checks on desktop + a real phone (or Chrome devtools mobile emulation):

1. Tap a card (Quest 3). Tier 1 poster shrinks, tier 2 slides open with story teaser + rewards + context chips.
2. Tap again. Tier 3 modal opens. URL updates to `/quest/healing-whole`.
3. Close modal. URL returns to `/quest`. Card stays expanded at tier 2.
4. Tap another card (Quest 5). Quest 3 collapses, Quest 5 expands.
5. Tap outside all cards. Open card collapses.
6. Keyboard: Tab to a card, Enter to open, Enter to navigate.
7. Keyboard: Tab to a card, Enter to open, Escape to close.
8. Hover a card on desktop. Tier 2 previews. Move mouse away without clicking. Collapses. Click it this time. Tier 2 commits. Move mouse away. Stays open.
9. Enable `prefers-reduced-motion`. Tap a card. No animation. State still toggles.
10. Open tier 3 for Fire (Quest 0). YouTube embed plays.
11. Open tier 3 for Potions (Quest 1). YouTube embed plays.
12. Open tier 3 for any other quest. "Video walkthrough coming soon" placeholder renders.
13. Tab through an expanded card. Focus lands on the forum link, the context chips, the primary CTA in order.
14. A locked card still renders as locked with no disclosure behavior.
15. Visit `/quest/fire` directly. Page loads, Fire card is pre-expanded at tier 2, modal is open at tier 3, focus is on the close button.
16. Tier 1 shows the "Trailer" pill (black/60 backdrop, play-icon + TRAILER label) on Fire and Potions cards only.
17. Open tier 3 on any quest. Click "Submit Proposal on DAO" in the action bar. Enter a YouTube URL. Continue. URL should land on `/bridge/hypha/<8-char-key>` showing the quest title, description, and `$ReGen` payout. Click "Continue to Hypha". Browser should redirect to `app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution?bridgeKey=...&title=...&description=...&payouts=...&attachments=...` with the quest card image included in the `leadImage` param.

All 17 checks plus the automated gates before the row flips to VERIFIED.

## Out of scope

1. Autoplaying trailers on desktop hover. Follow-up once static disclosure is solid.
2. Swipe gestures.
3. Recording and uploading quest walkthrough videos. Content work Rye owns.
4. Rolling the pattern to `HeroQuestCard`, `WelcomeAboardQuests`, `SeasonalQuestFeed`, `ProfileQuests`. Scope this spec to the main Quest page only.
5. Analytics on expand events.
6. Tier 2 "Save to later" / "My List" functionality.

## Follow-ups after ship

1. Roll the pattern to `HeroQuestCard`, `WelcomeAboardQuests`, `SeasonalQuestFeed`, `ProfileQuests`. Pull state coordination into a shared hook.
2. Shoot remaining quest walkthrough videos. Sync URLs into the master sheet and `questMasterContent.ts`.
3. Generate PDF guide files for quests without videos per master sheet Part 3 and reference them in the master sheet via `**PDF:** url`. Re-run `pnpm sync:quest-content` to surface the buttons at tier 3.
4. Add autoplay-on-hover trailer behavior for desktop.
5. Add "My List" tier-2 affordance so players can save quests to come back to.
6. Instrument expansion and navigation events so we can measure which tier 2 teasers convert to tier 3 opens.

## Content sync workflow (IN SCOPE for v1)

Build the parser up front. Manual copy-paste drifts. Pull once, parse forever.

### `scripts/sync-quest-content.ts` (NEW, IN SCOPE)

Node/TSX script that parses `QUEST_MASTER_SHEET.md` and writes `client/src/data/questMasterContent.ts`.

**Parsing rules:**

- Each quest block starts with a heading matching `/^### Quest (\d+|\d+b): (.+)$/`. Capture the id (as number if numeric, as string for `9b`) and the title.
- After the heading, key-value metadata lines: `**Subtitle:** ...`, `**Rewards:** ...`, `**Time:** ...`, `**Video:** ...`. Optional: `**PDF:** ...`.
- `#### Story Card` section: collect paragraphs (blank-line separated) until the next `####` heading. Store as `storyCard: string[]`.
- `storyTeaser` is derived: take the first paragraph in full, plus the second paragraph truncated to get the combined total under 80 words. Never include more than 3 paragraphs.
- `#### How To Do This Quest` section: parse `**Step N: heading.** body` patterns into `{ heading, body }[]`. Heading is the bolded lead (with trailing period stripped). Body is the remaining text.
- `#### Deliverable` section: single paragraph, store as `deliverable: string`.
- `#### Tips` section: bulleted list (`- ...`), store as `tips: string[]`.
- `#### Resources` section: bulleted list of markdown links `- [label](url)`, parse into `{ label, url }[]`.
- `#### Connected To` section: parse bullets like `- Comes before: Quest N ...` into `comesBefore: number[]`. Any non-"Comes before" bullets go into `referencedBy: string[]` verbatim (minus the leading bullet marker and any `- Referenced by:` prefix).
- Rewards line parses to `{ regen: number, rvoice: number }` but the existing `questData.ts` already holds reward numbers. The parser should validate consistency but write only the non-reward fields to `questMasterContent.ts`.

**Output shape:** writes to `client/src/data/questMasterContent.ts` as a single exported const `QUEST_MASTER_CONTENT: Record<number | string, QuestMasterContent>` with a banner comment:

```ts
// GENERATED FILE. Edit QUEST_MASTER_SHEET.md instead, then run:
//   npx tsx scripts/sync-quest-content.ts
// Do not edit this file by hand.
```

**Idempotent.** Running twice on unchanged input produces byte-identical output. Sort keys deterministically, use stable formatting (single quotes, trailing commas, 2-space indent).

**Failures:**

- If parsing fails for a quest block, log the quest id and the line number, continue parsing others, and exit non-zero at the end.
- If `pdfUrl` or `videoUrl` appears malformed (not a URL), warn but don't fail.

**Usage:**

```bash
npx tsx scripts/sync-quest-content.ts
# writes client/src/data/questMasterContent.ts
```

**Wire into `package.json`:** add a script entry:

```json
"sync:quest-content": "tsx scripts/sync-quest-content.ts"
```

Called manually for now. Future: add a git pre-commit hook that runs it if `QUEST_MASTER_SHEET.md` is in the staged set.

### Sync workflow for humans

1. Edit `QUEST_MASTER_SHEET.md`. Single source of truth.
2. Run `pnpm sync:quest-content`.
3. Commit the `.md` and the regenerated `.ts` together.
