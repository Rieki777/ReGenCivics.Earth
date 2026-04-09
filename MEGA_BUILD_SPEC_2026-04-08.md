# MEGA BUILD SPEC: 2026-04-08

**Audience:** Claude Code
**Authored by:** Claude (Cowork research + spec session, 2026-04-08)
**Companion doc:** `COMMUNITY_AGREEMENTS_PLAN.md` (read first; this extends it)
**Writing rules:** Follow `CLAUDE.md` hard rules. No em-dashes. No contrast-framing. No AI words. Direct and grounded.

## Why this doc exists

Rye approved a batch of ten mobile-menu ideas, ten game-mechanics ideas, a gratitude wiring, unique human-readable handles, the P2P food image replacement, four tool integrations, and a food-producers article rewrite. This spec weaves all of that into a single coherent build so the pieces reinforce each other rather than arrive as loose fragments.

Read it top to bottom before touching any code. Several parts share schema changes and shared components. Build in the order given.

## Table of contents

1. Unique human-readable handles (foundational, blocks gratitude and command search)
2. Gratitude wiring on forum posts + Command Center search
3. Mobile menu rebuild (bottom tab bar + full-screen More + context + search + radial + season tint)
4. Family-of-wizards quest icon across every menu
5. Game Mechanics simulator rebuild (scenario presets, compare, plain-English impact, guardrails, undo, permalinks, ghost curve, role impact, copy-as-forum-post, inline explainers)
6. P2P food system watercolor image replacement (2 placements in Bionomics.tsx)
7. Tool links integration (hypha.earth, localscale.org, gitcoin.co, hylo.com)
8. Food producers article (blog post + redirect from SEEDS article URL)
9. Verification checklist
10. Handoff breakdown (Claude Code vs Rye)

Parts 1 and 2 are coupled. Parts 3 and 5 are the biggest visible changes. Part 6 and 8 need assets from Rye (see Handoff).

---

## 1. Unique human-readable handles

### Why

Gratitude and Command Center search need a stable way to identify a person publicly without leaking email. The `playerProfiles.displayName` field is not unique and there is no `username` / `handle` column. We are adding one.

### Schema change

New migration `drizzle/0091_user_handles.sql`:

```sql
-- Add unique human-readable handle to users table
ALTER TABLE users ADD COLUMN handle VARCHAR(40) DEFAULT NULL;
ALTER TABLE users ADD UNIQUE INDEX users_handle_unique (handle);
```

Also update `drizzle/schema.ts` (`users` table) to add:

```ts
handle: varchar("handle", { length: 40 }).unique(),
```

### Generation rules

A handle is:

- 3 to 40 characters
- lowercase letters, numbers, and hyphens only (regex: `^[a-z0-9-]{3,40}$`)
- cannot start or end with a hyphen
- must be unique across the `users` table
- displayed as `@handle` everywhere in the UI

### Auto-generation for existing users

Create `scripts/backfill-handles.ts`:

1. Select every user with `handle IS NULL`.
2. For each user, build a base slug from `name` (lowercased, non-alphanumerics replaced with hyphens, trimmed, collapsed).
3. If the slug is empty, fall back to `player-{id}`.
4. If the slug is taken, append `-2`, `-3`, etc. until unique.
5. UPDATE the row.

Run it after the migration. Report how many handles were backfilled.

### Auto-generation on new signup

In `server/routes/auth.ts` (or wherever new users are created, likely `createUser` in `server/db.ts`), after inserting the user row, generate a handle using the same rule and update the row in the same transaction. Do not surface an error if the first candidate is taken; loop with a suffix until success.

### User-editable handle in profile

In `client/src/pages/PlayerProfile.tsx` (or the existing profile edit form), add a "Handle" field to the edit modal:

- Shows current `@handle`.
- Input validates live against the regex.
- On submit, calls a new tRPC route `players.updateHandle({ handle })` which:
  - Re-validates the regex server-side.
  - Checks uniqueness.
  - Returns a friendly error if taken ("that handle is taken, try another").
  - Updates `users.handle` for the logged-in user.
- Rate limit: one change per 30 days per user. Store `handleLastChangedAt` on users. Add to migration.

Updated migration:

```sql
ALTER TABLE users ADD COLUMN handle VARCHAR(40) DEFAULT NULL;
ALTER TABLE users ADD COLUMN handleLastChangedAt DATETIME DEFAULT NULL;
ALTER TABLE users ADD UNIQUE INDEX users_handle_unique (handle);
```

### Display rules

Everywhere in the UI that currently shows `displayName` or `user.name` alone for a public profile, append `@handle` below in smaller muted text. Examples:

- Forum post authors
- Forum reply authors
- Community member lists
- Player profile headers
- Gratitude sends / receives
- Command Center search results

Use a shared `<UserHandle user={u} />` component in `client/src/components/UserHandle.tsx` so we only format it in one place.

---

## 2. Gratitude wiring on forum posts + Command Center search

### Scope clarification

`GRATITUDE_SYSTEM_SPEC.md` already describes the full lunar-cycle gratitude budget system. This spec ships the **forum surface** and the **Command Center search** for it. The lunar-cycle budget and $ReGen distribution batch jobs stay in that spec; treat them as a separate phase. For now we wire:

1. A simple "Send gratitude" button on every forum post and reply.
2. A search box in Command Center and in CommandPalette that finds users by handle.
3. Sending gratitude writes to an existing `gratitudeLog` table (create if missing).

### Schema

If `gratitudeLog` does not already exist per `GRATITUDE_SYSTEM_SPEC.md`, create it. Migration `drizzle/0092_gratitude_log.sql`:

```sql
CREATE TABLE IF NOT EXISTS gratitudeLog (
  id INT AUTO_INCREMENT PRIMARY KEY,
  senderId INT NOT NULL,
  recipientId INT NOT NULL,
  message VARCHAR(500) NOT NULL,
  sourceType VARCHAR(32) DEFAULT NULL, -- 'forum_post' | 'forum_reply' | 'profile' | 'command_center'
  sourceId INT DEFAULT NULL,            -- post id, reply id, etc.
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX grat_sender (senderId, createdAt),
  INDEX grat_recipient (recipientId, createdAt)
);
```

Also add to `drizzle/schema.ts`.

### Backend route

In `server/routes/gratitude.ts` (create if missing), add:

```ts
sendGratitude: protectedProcedure
  .input(z.object({
    recipientHandle: z.string().min(3).max(40),
    message: z.string().min(3).max(500),
    sourceType: z.enum(['forum_post','forum_reply','profile','command_center']).optional(),
    sourceId: z.number().int().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const recipient = await db.query.users.findFirst({ where: eq(users.handle, input.recipientHandle) });
    if (!recipient) throw new TRPCError({ code: 'NOT_FOUND', message: 'No one with that handle' });
    if (recipient.id === ctx.user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot send gratitude to yourself' });
    await db.insert(gratitudeLog).values({
      senderId: ctx.user.id,
      recipientId: recipient.id,
      message: input.message,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
    });
    return { ok: true };
  }),

searchUsers: protectedProcedure
  .input(z.object({ query: z.string().min(2).max(40) }))
  .query(async ({ input }) => {
    const q = `%${input.query.toLowerCase()}%`;
    const rows = await db.execute(sql`
      SELECT u.id, u.handle, u.name, pp.displayName, pp.avatarUrl
      FROM users u
      LEFT JOIN playerProfiles pp ON pp.userId = u.id
      WHERE u.handle LIKE ${q} OR LOWER(u.name) LIKE ${q} OR LOWER(pp.displayName) LIKE ${q}
      LIMIT 12
    `);
    return rows;
  }),
```

Register the router in `server/routes/index.ts`.

### Forum post UI

In `client/src/pages/CommunityPost.tsx`, next to the existing Heart / EmojiReactions row (around line 601 for posts, 781 for replies), add a small "Send gratitude" button:

```tsx
<GratitudeButton
  recipientHandle={post.author.handle}
  sourceType="forum_post"
  sourceId={post.id}
/>
```

Create `client/src/components/GratitudeButton.tsx`:

- Icon: `Sparkles` from lucide-react, amber color.
- Clicking opens a small inline popover (not a full modal) with:
  - A textarea, placeholder "What are you grateful for?"
  - A "Send" button
  - Character counter (max 500)
- On success: button briefly animates and shows "Sent".
- If user is not logged in: button prompts sign-in.
- If `recipientHandle` is the current user's own handle: button is hidden.

Reuse this component on profile pages and anywhere else someone can be thanked.

### Command Center search

In `client/src/components/CommandPalette.tsx`, extend the existing `trpc.globalSearch.query` hook to also run `trpc.gratitude.searchUsers.query(q)` in parallel when the query is at least 2 characters. Add a new `<Command.Group heading="People">` section that renders each match as:

```
  [avatar]  Display Name
            @handle
  [Send gratitude button]
```

Clicking the row navigates to `/profile/{handle}`. Clicking the button opens the GratitudeButton popover inline.

In `client/src/components/CommandPanel.tsx` (the bottom-nav expandable panel), add a "Find a person" section above the music player. Same search input, same rendering. Keep it collapsed by default behind a small "Find a person" button so it does not crowd the music player.

### Profile route by handle

The `/profile/{handle}` route: currently profiles are keyed by `id` or `openId`. Add a new route `client/src/pages/PlayerProfileByHandle.tsx` that reads `:handle` from the URL, calls `trpc.players.getByHandle.query({ handle })`, and renders the existing PlayerProfile view. Add the tRPC procedure.

Register the route in `App.tsx` wouter config: `<Route path="/profile/:handle" component={PlayerProfileByHandle} />`.

---

## 3. Mobile menu rebuild

### The woven design

Nine ideas (1, 3, 4, 5, 6, 7, 8, 9, 10) become **one** coherent mobile experience built from three layers.

**Layer A: Persistent bottom tab bar** (idea 3). Always visible on mobile below 768px. Five slots:

1. Home (house icon)
2. Quests (family-of-wizards icon, primary style: filled, accent color, slightly larger)
3. Community (users icon)
4. Profile (avatar)
5. More (sparkle icon, opens Layer B)

This replaces the current hamburger header on mobile. The header becomes a slim top bar with logo only.

**Layer B: Full-screen More menu** (ideas 1, 4, 5, 7, 8, 9, 10). Tapping "More" opens a full-screen overlay (not a drawer). Structure top to bottom:

1. **Header band**: family-of-wizards watercolor illustration as a hero strip. Close button top-right.
2. **Search input** (idea 8): large pill input, placeholder "Jump to anything". Autocompletes pages and people using the same tRPC calls as CommandPalette. When focused, the rest of the menu fades behind the results list.
3. **Next-quest card** (idea 5): a context-aware card pulled from the player's actual progression via `trpc.quests.nextForUser.query()`. Shows the quest name, a one-line description, and a "Continue" button that deep-links to the quest page. If no logged-in user or no next quest, show a "Start your first quest" card that links to `/quest`.
4. **Primary section: Play** (idea 10 icon+label cards):
   - Quests (family-of-wizards icon, accent background that matches the bottom-tab primary)
   - Command Center
   - Game
   - Game Mechanics
   - Tools
5. **Secondary section: Learn** (collapsed by default, idea 7 progressive reveal). Tap to expand. Cards for Bionomics, Tokenomics, Governance, Team, Glossary.
6. **Tertiary section: Invest & Apply** (collapsed by default):
   - Fund overview
   - Investor form
   - Apply (land projects, alliance partners)
7. **Footer strip**: small row with Blog, Forum, Contact, Privacy.

Each card uses idea 10's format: an icon, a one-line label, and a single sub-line description, so first-time visitors understand what each page is before tapping.

**Layer C: Floating wizard shortcut** (idea 6). A small floating wizard icon pinned to the bottom-right corner (above the bottom tab bar, inset 16px). Tapping it opens a **radial menu** with four action shortcuts: Next Quest, Command Center, Forum, Profile. This is the playful escape hatch. It matches the solarpunk-aesthetic note from the original idea. The radial menu uses a simple SVG ring; see implementation detail below.

**Season tint** (idea 9): the header band of the full-screen menu and the floating wizard button read from a shared `useSeasonTint()` hook that returns an accent color based on the current season (e.g., Season 1 deep green, Season 2 amber, Season 3 plum, Season 4 sky). Store the season → color map in `client/src/config/seasonTints.ts`. The hook reads the current season from the existing seasons context or query.

### Idea 2 (two-tier Play/Learn menu) and idea 1 (Quests as primary button)

We are not using idea 2 as a standalone design, but the Play/Learn split lives on as the section grouping in Layer B. Idea 1 lives on as the Quests tab in the bottom bar and the accent Quests card in the More menu.

### Files to create / change

Create:

- `client/src/components/mobile/MobileTabBar.tsx`: the bottom tab bar.
- `client/src/components/mobile/MobileMoreMenu.tsx`: the full-screen More overlay.
- `client/src/components/mobile/WizardRadialMenu.tsx`: the floating wizard + radial menu.
- `client/src/components/mobile/NextQuestCard.tsx`: pulls `trpc.quests.nextForUser` and renders the card.
- `client/src/components/mobile/MenuCard.tsx`: the icon + label + sub-line card used across sections.
- `client/src/hooks/useSeasonTint.ts`: reads current season and returns tint color + class.
- `client/src/config/seasonTints.ts`: season → { primary, bgGradient } map.
- `client/src/config/mobileMenu.ts`: the menu data (sections, cards, icons, href, sub-line). Edit here to change the menu.

Change:

- `client/src/components/Navigation.tsx`: at mobile breakpoint, hide the current hamburger + drawer and render the new MobileTabBar + MobileMoreMenu + WizardRadialMenu instead. Desktop layout stays unchanged.
- `client/src/components/SmartBottomNav.tsx`: either retire or fold into MobileTabBar. If any logic there (icon preference, page-aware slot) is useful, port it into MobileTabBar. Otherwise delete.
- `App.tsx` or layout shell: add bottom padding equal to the tab bar height on mobile so content is not hidden behind it.

### Implementation notes

- Bottom tab bar must be visible on all routes. Fixed position, `bottom: 0`, `z-index: 40`. Safe-area-inset-bottom aware for iOS notched devices: `padding-bottom: env(safe-area-inset-bottom)`.
- The Quests tab is visually larger than the other tabs and uses the accent color. Icon: family-of-wizards (see Part 4).
- Full-screen More menu: use a portal so it sits above everything. Animate from the More button position using Framer Motion if already installed, otherwise a CSS fade-scale.
- When the More menu is open, disable body scroll.
- Search results: reuse the `CommandPalette` search hook. On result tap, navigate and close the menu.
- Radial menu: four buttons arranged on a 90px radius arc in the upper-left quadrant from the wizard button. Tap outside to close. Keyboard accessible (focus trap optional, the radial is secondary).
- `useSeasonTint` returns `{ primary: string, bgGradient: string, seasonName: string }`. Primary is the CSS color; bgGradient is a Tailwind class string.

---

## 4. Family-of-wizards quest icon

### Where

The current quest icon is inconsistent across menus (🌲, 🧙, `BookOpen`, dynamic). Unify to a single family-of-wizards SVG icon used everywhere Quests appears.

### Asset

Ask Rye for a final family-of-wizards SVG. If not yet provided, ship with a placeholder that pulls from `/client/public/images/icons/wizards-family.svg` and add a `[HUMAN]` note in the Handoff section.

Create `client/src/components/icons/WizardsFamilyIcon.tsx` as a React component that imports the SVG and accepts `className` and `size` props.

### Replacements

Grep for every existing Quest link icon and swap in `<WizardsFamilyIcon />`:

- `client/src/components/Navigation.tsx`: desktop dropdown "Explore Quests" (line ~240)
- `client/src/components/Navigation.tsx`: mobile menu "Explore Quests" (line ~787)
- `client/src/components/mobile/MobileTabBar.tsx`: Quests tab (new file from Part 3)
- `client/src/components/mobile/MobileMoreMenu.tsx`: Quests primary card (new file from Part 3)
- `client/src/components/CommandPalette.tsx`: Quests entry (line ~37, currently 🧙)
- `client/src/components/SiteFooter.tsx`: Quests link (line ~44, currently no icon; add the small icon)

Keep `BookOpen` on "Personal Quests" (`/profile?tab=quests`) because that is a different affordance (personal progress log, not the game entry).

---

## 5. Game Mechanics simulator rebuild

### Where

`client/src/pages/GameMechanics.tsx`. The current page is a basic variables dashboard with a simple simulator. All ten upgrades ship together because several share plumbing.

### Shared plumbing

Add a single `SimulatorState` object in React state holding:

```ts
type SimulatorState = {
  variables: Record<string, number>;  // current edited values
  baseline: Record<string, number>;   // what the server returned at page load
  history: Array<{ label: string, variables: Record<string, number>, at: number }>;
  cursor: number; // position in history for undo/redo
};
```

Every change pushes a new history entry. Undo moves the cursor back. The baseline never changes during a session.

### 5.1 Scenario presets (idea 1)

Above the variables panel, a row of buttons: "Double Harvest multiplier", "Halve quest cost", "Triple gratitude budget", "Explorer-friendly season", "Steward-dominant season", etc. Each preset is a delta map applied on top of baseline. Click to apply; applies a new history entry with label matching the preset name.

Store presets in `client/src/config/simulatorPresets.ts`:

```ts
export const PRESETS = [
  { id: 'double-harvest', label: 'Double Harvest multiplier', delta: { harvestMultiplier: 2.0 }, asMultiplier: true },
  { id: 'half-quest-cost', label: 'Halve quest cost', delta: { questCost: 0.5 }, asMultiplier: true },
  // ...
];
```

Presets render as a scrollable horizontal row of pill buttons on mobile, a grid on desktop.

### 5.2 Compare mode (idea 2)

A toggle labeled "Compare to baseline". When on, the variables panel splits into two columns: left shows baseline values, right shows current. Under each row, a tiny sparkline shows the trajectory of that variable across history entries for the current session. Use `recharts` if already installed, else a 60-line inline SVG sparkline component in `client/src/components/simulator/Sparkline.tsx`.

### 5.3 Impact summary in plain English (idea 3): HOW

This is the piece Rye asked me to explain. We ship a **declarative rule table**, not an LLM. It works like this:

**Step 1**: Define an `ImpactRule` type:

```ts
type ImpactRule = {
  variable: string;
  threshold: (delta: number) => boolean;
  template: string; // supports {pct}, {delta}, {absolute}
  severity: 'info' | 'warn' | 'positive';
};
```

**Step 2**: Create `client/src/config/impactRules.ts` with an array of rules per variable. Example entries:

```ts
export const IMPACT_RULES: ImpactRule[] = [
  {
    variable: 'harvestMultiplier',
    threshold: d => d >= 0.5,
    template: 'This would make quest rewards {pct} larger, which makes reaching Citizen Tier 3 roughly {tierImpact} faster in the first season.',
    severity: 'positive',
  },
  {
    variable: 'harvestMultiplier',
    threshold: d => d <= -0.3,
    template: 'This would cut quest rewards by {pct}, which roughly doubles the time to Citizen Tier 2.',
    severity: 'warn',
  },
  // ... one or more rules per variable
];
```

**Step 3**: Write a `computeImpactSummaries(state: SimulatorState)` function that:

1. Computes the delta for each variable.
2. For each variable with a non-zero delta, walks its rules in order.
3. Returns the first rule whose threshold returns true, with `{pct}`, `{delta}`, `{absolute}` substituted.
4. For `{tierImpact}` and other derived placeholders, run a small helper that approximates the effect (e.g., "40%", "roughly twice as", "slightly") using arithmetic on the baseline tier cost.

**Step 4**: Render impact summaries as a stack of chips below each edited variable, and a combined "Overall impact" paragraph at the top of the simulator.

The rule table is extensible: adding a new variable means adding rules, not rewriting logic. This is lightweight, deterministic, testable, and ships today. If we later want nuance, we can swap the template engine for a richer one.

Add a short Jest (or vitest) test in `client/src/config/__tests__/impactRules.test.ts` that feeds three sample deltas and asserts the expected rendered strings.

### 5.4 Guardrails (idea 4)

Define `SimulatorInvariant` type:

```ts
type SimulatorInvariant = {
  id: string;
  test: (s: SimulatorState) => boolean; // returns true if VIOLATED
  message: string;
  severity: 'error' | 'warn';
};
```

In `client/src/config/simulatorInvariants.ts`, ship initial invariants:

- `harvestMultiplier` must be `> 0` (no negative harvest)
- `questCost` must be `>= 0`
- `tier3ReqPoints > tier2ReqPoints > tier1ReqPoints`
- `gratitudeBudget.steward > gratitudeBudget.coCreator > gratitudeBudget.explorer`

When any invariant is violated, show a red banner at the top of the simulator listing the violated rules. Disable the "Copy as forum post" and "Copy as DAO proposal" buttons while any error-severity invariant is violated.

### 5.5 Revert / history (idea 5)

Right-side (or bottom on mobile) collapsible "Your changes" panel. Shows the history stack. Each entry has its label and a "Revert to here" button. There is also a single Undo button in the simulator toolbar.

Undo moves `cursor` back one. The panel highlights the current cursor position. A "Reset to baseline" button at the bottom clears history and restores baseline.

### 5.6 Permalink every configuration (idea 6)

Serialize the current variables (only deltas from baseline) into a base64 URL hash:

```
/game-mechanics#v1:eyJoYXJ2ZXN0TXVsdGlwbGllciI6MiwiZ3JhdGl0dWRlQnVkZ2V0Ijp7ImV4cGxvcmVyIjoxNTB9fQ
```

On page load, if the hash is present, decode and apply it to the SimulatorState as a single history entry labeled "Loaded from link".

Add a "Copy link" button in the toolbar that builds and copies the current hash URL.

### 5.7 Seasonal ghost curve (idea 7)

Each variable's sparkline also renders a dashed "ghost" line showing the previous season's actual value (read from a new tRPC call `trpc.seasons.previousVariables.query()`, which reads from `seasons` / `seasonSnapshots` table). If no previous season exists, skip the ghost.

This needs a one-time seed: at the end of each season, write the final variable state into a `seasonSnapshots` table. Migration `drizzle/0093_season_snapshots.sql`:

```sql
CREATE TABLE IF NOT EXISTS seasonSnapshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  seasonId INT NOT NULL,
  variables JSON NOT NULL,
  snapshotAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (seasonId)
);
```

Backfill one row for Season 1 from the existing game variables as they stand today.

### 5.8 "Who does this affect?" role impact (idea 8)

For each edited variable, look up which player roles it touches via a static map in `client/src/config/variableRoleMap.ts`:

```ts
export const VARIABLE_ROLE_MAP: Record<string, string[]> = {
  harvestMultiplier: ['harvester', 'citizen-tier-1'],
  gratitudeBudget: ['all'],
  questCost: ['explorer', 'co-creator'],
  // ...
};
```

Render small role icons next to each impact summary chip. Role icons already exist in `client/public/images/roles/`. Use a `<RoleIcon slug={role} size={20} />` component.

### 5.9 Copy as forum post (idea 9)

Replace the current "Copy as DAO proposal" with two buttons side by side:

- "Copy as forum post": copies a markdown block titled "Proposed game variable change" with the baseline vs current delta table, the impact summary paragraph, and the permalink from 5.6.
- "Copy as DAO proposal": current behavior, unchanged but label becomes "Copy for Hypha".

### 5.10 Inline explainers (idea 10)

Each variable row has an `ⓘ` button. Clicking opens a small popover with:

- A short "Why this exists" paragraph
- A link to the relevant section in `/tokenomics` or `/bionomics` if applicable
- A "See related rules" toggle that highlights the rules from 5.3 and 5.4 that reference this variable

Explainer copy lives in `client/src/config/variableExplainers.ts`:

```ts
export const VARIABLE_EXPLAINERS: Record<string, { why: string, learnMore?: string }> = {
  harvestMultiplier: {
    why: 'Harvest multiplier scales all quest rewards. We use it to tune how fast players can cross tiers during a season.',
    learnMore: '/tokenomics#harvest',
  },
  // ...
};
```

### Page layout

Top to bottom on `/game-mechanics`:

1. Hero + one-line explanation (keep existing copy)
2. Presets row (5.1)
3. Toolbar: Compare toggle, Undo, Copy link, Copy as forum post, Copy for Hypha
4. Guardrail banner (5.4, only when violations)
5. Overall impact paragraph (5.3)
6. Variables panel (split if compare on, with sparklines and ghost curves)
7. Your changes history panel (5.5, collapsible on mobile)

Responsive: on mobile, the variables panel becomes a single column, the history panel collapses behind a "History" button, the presets row scrolls horizontally.

---

## 6. P2P food system watercolor image replacement

### Current state

`client/src/pages/Bionomics.tsx` renders an inline React SVG component `P2PFoodEconomySVG()` (lines 411–493) in two places: line 611 and line 1312. Both captions reference "The 2017 sketch."

### Change

Replace both inline usages with an `<img>` tag pointing to the original watercolor image from Rye.

Expected asset path: `client/public/images/economy/p2p-food-system-2017.webp`

```tsx
<figure className="my-8">
  <img
    src="/images/economy/p2p-food-system-2017.webp"
    alt="Peer-to-peer food economy sketch from 2017: grower, courier, cook, eater, neighbor cycling back to grower, with $ReGen circulating alongside the food."
    className="w-full max-w-2xl mx-auto rounded-lg"
    loading="lazy"
  />
  <figcaption className="mt-2 text-sm text-center text-muted-foreground">
    The 2017 sketch. Local food systems as the energy backing a regenerative currency.
  </figcaption>
</figure>
```

Delete the `P2PFoodEconomySVG` function body. It is no longer referenced.

### Asset needed from Rye

The watercolor image itself. See Handoff. Put it in `client/public/images/economy/p2p-food-system-2017.webp`. Also generate a 2x variant if the source resolution allows.

Also search `BIONOMICS_PAGE_SPEC.md` and `SEEDS_VISION_IMPLEMENTATION_SPEC.md` for references to the SVG diagram and update them to reference the watercolor image path instead.

---

## 7. Tool links integration

### What

Four external tools need native placements in the ReGen Civics site:

1. **Hypha** (`https://app.hypha.earth/`): governance and DAO tooling
2. **LocalScale** (`https://localscale.org/`): local bioregional scaling
3. **Gitcoin** (`https://gitcoin.co/`): public goods funding
4. **Hylo** (`https://www.hylo.com/`): community coordination

### Where they appear

Add a new "Tools we use" section to `client/src/pages/Tools.tsx` (create if missing; otherwise extend `REGEN_TOOLS_LIBRARY_SPEC.md`-linked page). Four cards in a grid, each with:

- Logo (fetch favicon as placeholder if no logo asset)
- Name
- One-line description
- "What we use it for" (2 sentences max)
- "Visit tool" button with `rel="noopener noreferrer"` target="_blank"
- "Read our take" link to a short `/tools/{slug}` subpage if we have one

Also add each tool as a menu card in the Mobile More menu Play section after "Game Mechanics" (but inside a "Tools" subsection that expands progressively per idea 7).

Tool data lives in `client/src/config/externalTools.ts`:

```ts
export const EXTERNAL_TOOLS = [
  {
    slug: 'hypha',
    name: 'Hypha',
    url: 'https://app.hypha.earth/',
    tagline: 'Governance and DAO tooling',
    description: 'Where ReGen Civics proposals and votes live. We use Hypha for the Fund governance and for ratifying game variable changes.',
    logo: '/images/tools/hypha.webp',
  },
  {
    slug: 'localscale',
    name: 'LocalScale',
    url: 'https://localscale.org/',
    tagline: 'Bioregional coordination',
    description: 'Helps us map and activate bioregional cohorts. We are watching LocalScale closely as a potential partner for the Land Projects network.',
    logo: '/images/tools/localscale.webp',
  },
  {
    slug: 'gitcoin',
    name: 'Gitcoin',
    url: 'https://gitcoin.co/',
    tagline: 'Public goods funding',
    description: 'Quadratic-funding rounds for open public goods. We run and support rounds relevant to regenerative projects.',
    logo: '/images/tools/gitcoin.webp',
  },
  {
    slug: 'hylo',
    name: 'Hylo',
    url: 'https://www.hylo.com/',
    tagline: 'Community coordination',
    description: 'Group hosting for regen communities. Several land projects run their internal coordination on Hylo and we link out for that.',
    logo: '/images/tools/hylo.webp',
  },
];
```

Add a small `server/utils/externalLinkAudit.ts` that logs (not blocks) when an external tool link is clicked, via a `/api/click-log` endpoint. This gives us signal on which tools people actually follow. Low priority, ship if time remains.

Logo assets: ship the four files as placeholders (greyscale circles with letter glyph) and ask Rye for final logos in Handoff.

---

## 8. Food producers article

### Where it lives

Blog posts live in `client/src/data/blogPosts.ts` as a TypeScript array. Add a new entry with:

```ts
{
  id: 'food-producers-first',
  slug: 'food-producers-first',
  title: 'Why Food Producers First',
  excerpt: '...',
  content: '...',
  author: 'Rieki Cordon',
  date: '2026-04-08',
  readTime: '8 min',
  image: '/images/blog/food-producers-first.webp',
  tags: ['Food Systems', 'Local Economy', 'Regenerative Producers'],
  featured: true,
}
```

### Source text

Rye provided a SEEDS-era article ("Food System Change-Makers Unite!" on Medium) to rewrite. That text was lost between conversation compactions and did not make it into this context. The draft article skeleton below is what Claude Code should populate. The `[HUMAN]` marker in Handoff asks Rye to paste the source again so Claude Code can do a full rewrite in one pass.

### Draft article skeleton

Claude Code should write the full rewrite using the existing ReGen Civics voice (see `BLOG_SEEDS_CONTRIBUTIONS.md` and `Blog_TwoGames.md` for tonal reference) and the current mechanics in `DRAFT_GAME_AND_ECONOMY_PAGES.md` Section 3 "Why Food Producers First" and `SEEDS_VISION_IMPLEMENTATION_SPEC.md`. The rewrite must:

- Drop every reference to SEEDS-specific mechanics (Harvest contribution scores in SEEDS terms, Rainbow Seeds, the old Citizenship tiers)
- Replace with ReGen Civics current system: Explorer / Co-Creator / Steward / Sage citizenship tiers, $RCivics (Fund) vs $ReGen (Game), the Crowd Pool, Land Projects and Alliance Partners, the Living Tree visualization
- Keep the core thesis: food producers are where a regenerative economy anchors, because food is the daily, local, repeatable transaction that couples a currency to real regenerative work
- Reference the 2017 watercolor sketch with the new image path from Part 6
- Follow CLAUDE.md writing rules (no em-dashes, no contrast-framing, no AI words)
- Include three concrete examples: a farmer, a courier-cook, an eater/neighbor. Walk each through a single day on the system.
- End with a "What a farmer joining today actually does" numbered list (sign up, claim handle, connect to nearest bioregion node, complete onboarding quest, list first offering, receive first gratitude, appear on the Living Tree)

Target length: 1600–2200 words. Seven sections with H2 headings. Pull-quote roughly halfway.

### Redirect

If the old SEEDS article URL pattern exists as a blog entry or if there are existing links to `/blog/food-system-change-makers`, set up a 301 redirect to `/blog/food-producers-first` in `server/middleware/redirects.ts` (create if missing). Add an entry to any sitemap generation.

### Blog image

Cover image needed. Placeholder at `client/public/images/blog/food-producers-first.webp`. Ask Rye for a final cover. For MVP, use the 2017 watercolor from Part 6 as the cover.

---

## 9. Verification checklist

Run every item before declaring done. Screenshot or paste terminal output into the fixes doc for each.

### Build + typecheck

- `npm run typecheck` clean
- `npm run build` clean
- `npm run lint` clean

### Database

- `npx tsx scripts/run-migration.ts --status` shows 0091, 0092, 0093 applied
- `npx tsx scripts/backfill-handles.ts` reports N users updated, 0 errors
- Spot-check 3 random users in MySQL: all have non-null unique handles

### Handles

- `/profile/@rye` (or whatever Rye's handle resolves to) loads the profile page
- Editing handle in profile form works; duplicate rejects; rate limit after second change rejects
- Forum post author row shows `Name @handle`

### Gratitude

- From a logged-in second account, click "Send gratitude" on one of Rye's forum posts, submit a message, see confirmation
- Row appears in `gratitudeLog` with sourceType `forum_post` and correct `sourceId`
- Cannot send gratitude to self (button hidden)
- Unauthenticated click prompts sign-in

### Command Center search

- Open Command Palette with Cmd+K, type first three chars of Rye's handle, see the People group with the row
- Click the row, land on `/profile/{handle}`
- Click inline Send gratitude from the result, popover works

### Mobile menu

- Open on iPhone-sized viewport (375px): bottom tab bar visible on every page
- Quests tab is visually primary and uses the family-of-wizards icon
- Tap More: full-screen menu animates in, wizard hero visible, search focuses on tap
- Search "forum": results include the Forum page, tapping navigates and closes menu
- Next Quest card shows the current user's next quest or the signed-out fallback
- Tap Learn to progressively reveal; tap Play cards to navigate
- Floating wizard bottom-right: tap opens radial menu with 4 actions; tap outside closes
- Season tint visible on header band and wizard button
- Bottom padding on content means no tab bar overlap on scroll

### Family of wizards icon

- Every Quest entry across Navigation, mobile tab bar, mobile More menu, CommandPalette, footer uses WizardsFamilyIcon
- Personal Quests retains BookOpen

### Game Mechanics simulator

- Presets row applies correctly; each preset adds a history entry with its label
- Compare mode splits into baseline/current with sparklines
- Impact summaries render for each edited variable and for the overall change
- Guardrails banner fires when `harvestMultiplier` is set to 0 or tier ordering is violated
- Undo reverts; Reset to baseline clears
- Copy link copies a URL hash; pasting the URL loads the same state
- Ghost curve renders a dashed line from Season 1 snapshot
- "Who does this affect?" icons appear next to relevant variables
- Copy as forum post copies a valid markdown block; Copy for Hypha still works
- Inline ⓘ explainers open on tap and show the "why" copy

### P2P food image

- `/bionomics` renders the watercolor in both the "Original Question" section and the later section
- Image path: `/images/economy/p2p-food-system-2017.webp`
- `P2PFoodEconomySVG` function deleted

### Tool links

- `/tools` page shows the four tool cards
- All four links open in new tab with `rel="noopener noreferrer"`
- Mobile More menu's Tools subsection shows the four tools under Play

### Food producers article

- `/blog/food-producers-first` loads
- Shows cover image, title, excerpt, content
- Featured flag makes it appear on `/blog` landing as featured
- Old URL (if any) redirects with 301

### Writing rules

- Grep the full new article and the spec for em-dashes (`—`): zero matches in shipped content
- Grep for banned words (delve, tapestry, foster, leverage, vibrant, crucial, transformative, unlock, seamless, robust, comprehensive, utilize, navigate): zero matches
- Spot-read each new copy block for contrast-framing patterns; rewrite if found

---

## 10. Handoff breakdown

### Claude Code can do autonomously

- All schema migrations (0091, 0092, 0093)
- `scripts/backfill-handles.ts` and running it
- `server/routes/gratitude.ts` including `sendGratitude`, `searchUsers`, router registration
- `client/src/components/GratitudeButton.tsx`
- `client/src/components/UserHandle.tsx`
- `client/src/pages/PlayerProfileByHandle.tsx` and wouter route wiring
- All new mobile components (MobileTabBar, MobileMoreMenu, WizardRadialMenu, NextQuestCard, MenuCard)
- `useSeasonTint`, `seasonTints.ts`, `mobileMenu.ts`
- Wiring Navigation.tsx to render the new mobile layout at mobile breakpoint
- Creating `WizardsFamilyIcon.tsx` with a placeholder SVG and swapping it into every Quest entry
- Full Game Mechanics simulator rebuild with all ten features and config files
- Deleting `P2PFoodEconomySVG` and swapping in `<img>` tags with the expected path
- `client/src/config/externalTools.ts`, tool cards in `/tools`, mobile menu Tools subsection
- Food producers article skeleton with rewritten voice (if source text pasted) or a well-marked `TODO: paste source` if not
- 301 redirect middleware for old article URL
- Running the full Verification checklist in Part 9
- Updating BIONOMICS_PAGE_SPEC.md and SEEDS_VISION_IMPLEMENTATION_SPEC.md to reference the watercolor image path
- Committing to a feature branch and opening a PR titled `feat: mega build 2026-04-08`

### Rye must do

- **Paste the SEEDS food producers article source text** (it was lost in a context compaction; Claude Code cannot rewrite without it). Once pasted, Claude Code finishes the rewrite in one pass.
- **Provide the watercolor P2P food system image** and save it to `client/public/images/economy/p2p-food-system-2017.webp`. Without this asset, the image swap ships a broken path.
- **Provide the family-of-wizards SVG** (or approve Claude Code's placeholder). Save at `client/public/images/icons/wizards-family.svg`.
- **Provide the four tool logos** (Hypha, LocalScale, Gitcoin, Hylo) or approve the greyscale-glyph placeholders. Save to `client/public/images/tools/{slug}.webp`.
- **Provide the food producers article cover image** or approve using the 2017 watercolor as cover.
- **Set a personal handle** once the feature ships (auto-generated from name, then editable in profile).
- **Approve the rate-limit window** for handle changes (spec proposes 30 days; adjust if different).
- Run `git push` and merge the PR after review.

### Handoff table

| Item | Who | Status after this spec |
|---|---|---|
| Migrations 0091-0093 | Claude Code | Pending |
| Handle backfill | Claude Code | Pending |
| Gratitude backend + UI | Claude Code | Pending |
| Unique handle UI | Claude Code | Pending |
| Mobile menu rebuild | Claude Code | Pending |
| Wizards icon swap | Claude Code | Pending (placeholder SVG) |
| Wizards SVG final | Rye | Needed |
| Game Mechanics rebuild | Claude Code | Pending |
| Season snapshot backfill (Season 1) | Claude Code | Pending |
| P2P image swap | Claude Code | Pending (needs asset) |
| P2P watercolor asset | Rye | Needed |
| Tool links integration | Claude Code | Pending |
| Tool logo assets | Rye | Needed (placeholders OK) |
| Food producers article skeleton | Claude Code | Pending |
| Food producers source text | Rye | Needed |
| Food producers cover image | Rye | Optional (fallback: 2017 watercolor) |
| Verification run | Claude Code | Pending |
| `git push` + PR merge | Rye | Needed |

---

## Appendix A: Dependencies between parts

Part 1 (handles) blocks Parts 2 (gratitude) and Part 2's Command Center search. Build Part 1 first.

Part 3 (mobile menu) and Part 4 (wizards icon) share the WizardsFamilyIcon component. Build Part 4's component first, then Part 3 can import it.

Part 5 (game mechanics) is standalone and can be built in parallel with Parts 1-4.

Part 6 (P2P image) is standalone but the watercolor asset is a hard dependency.

Part 7 (tool links) references Part 3's mobile menu config. Build the `externalTools.ts` config early so Part 3 can wire it in.

Part 8 (food producers article) is standalone but references Part 6's image path and the source text is blocked on Rye.

## Appendix B: File inventory (net new)

```
drizzle/0091_user_handles.sql
drizzle/0092_gratitude_log.sql
drizzle/0093_season_snapshots.sql
scripts/backfill-handles.ts
server/routes/gratitude.ts                 (or extend if exists)
server/middleware/redirects.ts             (if new)
client/src/components/UserHandle.tsx
client/src/components/GratitudeButton.tsx
client/src/components/icons/WizardsFamilyIcon.tsx
client/src/components/mobile/MobileTabBar.tsx
client/src/components/mobile/MobileMoreMenu.tsx
client/src/components/mobile/WizardRadialMenu.tsx
client/src/components/mobile/NextQuestCard.tsx
client/src/components/mobile/MenuCard.tsx
client/src/components/simulator/Sparkline.tsx
client/src/hooks/useSeasonTint.ts
client/src/config/seasonTints.ts
client/src/config/mobileMenu.ts
client/src/config/simulatorPresets.ts
client/src/config/impactRules.ts
client/src/config/simulatorInvariants.ts
client/src/config/variableRoleMap.ts
client/src/config/variableExplainers.ts
client/src/config/externalTools.ts
client/src/pages/PlayerProfileByHandle.tsx
client/public/images/economy/p2p-food-system-2017.webp   (asset from Rye)
client/public/images/icons/wizards-family.svg            (asset from Rye)
client/public/images/tools/hypha.webp                    (asset from Rye)
client/public/images/tools/localscale.webp               (asset from Rye)
client/public/images/tools/gitcoin.webp                  (asset from Rye)
client/public/images/tools/hylo.webp                     (asset from Rye)
client/public/images/blog/food-producers-first.webp      (asset from Rye, fallback available)
```

## Appendix C: Files touched (existing)

```
drizzle/schema.ts
server/db.ts
server/routes/auth.ts (or createUser path)
server/routes/index.ts
server/routes/players.ts
client/src/App.tsx
client/src/components/Navigation.tsx
client/src/components/SiteFooter.tsx
client/src/components/CommandPalette.tsx
client/src/components/CommandPanel.tsx
client/src/components/SmartBottomNav.tsx (retire or fold)
client/src/pages/Bionomics.tsx
client/src/pages/CommunityPost.tsx
client/src/pages/GameMechanics.tsx
client/src/pages/PlayerProfile.tsx
client/src/pages/Tools.tsx (create if missing)
client/src/data/blogPosts.ts
BIONOMICS_PAGE_SPEC.md
SEEDS_VISION_IMPLEMENTATION_SPEC.md
```

End of spec.
