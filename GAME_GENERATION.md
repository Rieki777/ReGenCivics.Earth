# GAME_GENERATION.md

The standing prompt a Claude Code session runs **inside a freshly scaffolded
custom game** to turn a blueprint plus an intake transcript into a working first
draft. `CUSTOM_GAMES_MASTER_PLAN.md` B3 #18.

**Where this file lives.** It belongs to `Custom-Game-Foundation` and moves there
at the Phase 2 extraction, along with `shared/foundationCredit.ts` and
`scripts/emit-foundation-credit.ts`. It sits in regen-civics for now because the
blueprint schema does (`shared/customGameBlueprint.ts`, the Phase 0 deliverable)
and because `game-amora` is under an active parallel session that no other
session edits until its queue lands.

**Status.** Section 3 (the foundation credit) is built and runnable today.
Sections 1, 2, and 4 are the shape the Phase 3 session fills in; the credit does
not wait on them, because a credit added later is a credit added to a game the
client already accepted.

---

## Inputs

| Input | Where it comes from |
|---|---|
| `blueprint.json` | The Sylva intake, validated by `blueprintSchema` |
| Intake transcript | Saved with the application. The voice everything is written in |
| Uploads | Logo, land photos, vision docs, governance agreements, master plans |

Everything written in this session comes from those three. Nothing is invented.
Where the blueprint has a gap, say so in the handoff notes rather than filling it
with something plausible.

## 1. Scaffold (deterministic, before any writing)

`create-land-game` consumes the blueprint and emits the repo: `brand.json`,
`theme.json`, config overrides, empty seed shells, the Railway checklist, and the
foundation credit (section 3). Minutes, zero AI.

## 2. Content generation (the session's real work)

Persona journeys, quest ladders derived from their stated problems and goals,
stage names, FAQs, milestones, welcome copy, email templates, and their guide's
prompt seed. All in their voice, from the transcript. Writing rules from
`STEERING.md` section 1 apply to every string a player will read.

## 3. The foundation credit (built, do not skip)

Every delivered game credits ReGen Civics and links back. Default on,
owner-removable, and it ships with the scaffold rather than as a later add.

### 3.1 Run the emitter

```bash
npx tsx scripts/emit-foundation-credit.ts emit <blueprint.json> <game-repo-dir>
```

Writes four files into the game:

| File | What it is |
|---|---|
| `data/foundation-credit.json` | The owner-editable config. `enabled: false` turns everything off |
| `data/foundation-credit.html` | The prerendered injection block, `<noscript>` plus an off-screen div |
| `shared/foundationCredit.ts` | The renderer, so the React footer and the server render one source |
| `docs/FOUNDATION_CREDIT.md` | What it says, how to remove it, why it exists. Folds into `OWNER_GUIDE.md` |

### 3.2 Wire the server (this is the part that matters)

Custom games are SPAs. GPTBot, ClaudeBot, and PerplexityBot fetch HTML and do
not run JavaScript, so a footer that only exists in React is invisible to exactly
the systems the credit is for. That was the single biggest gap on
regencivics.earth itself before Layer 1 (`LLM_DISCOVERABILITY_PLAN.md` section
3), and a generated game starts with the same shape.

So the game's HTML handler splices the credit into the response before
`<div id="root">`, the same way `server/_core/vite.ts` does here:

```ts
import { readFileSync } from "node:fs";

const creditHtml = readFileSync("data/foundation-credit.html", "utf-8");

// ...in the catch-all HTML handler, before serving the shell:
html = html.replace(/<div id="root">/i, `${creditHtml}<div id="root">`);
```

A game that already imports the module can call
`renderCreditInjection(config, ["footer"])` instead and skip the file read. Both
produce identical HTML.

The about/story route additionally injects the `about` placement. Everything
else gets `footer` only.

### 3.3 Wire the footer and the guide

The visible footer renders `creditParts(config, "footer")` as real `<a>`
elements, so humans and crawlers read the same line and it can never drift:

```tsx
{creditParts(config, "footer").map((part, i) =>
  part.type === "text"
    ? <span key={i}>{part.value}</span>
    : <a key={i} href={part.href}>{part.anchor}</a>,
)}
```

If `guideMention` is on, append `guidePromptLine(config)` to the guide's system
prompt seed. It gives the guide one sentence, in its own voice, for when someone
asks where the game came from. It says it once, when asked, and never as a pitch.

### 3.4 Prove it

```bash
npx tsx scripts/emit-foundation-credit.ts check https://<their-domain>
```

Fetches the deployed page with a ClaudeBot user agent, no JavaScript, and fails
if the credit links are not in the bytes that come back. Also fails on
`rel=nofollow` and warns when `?ref=` is missing. Run it against the game's home
page and its about page before handoff, and paste the output into the evidence
column. A green typecheck proves nothing here: only the fetched HTML does.

### 3.5 The rules that make this honest

These are the reason the links are plain dofollow rather than nofollow, and they
only stay true if nobody bends them:

- **One clean sentence per placement**, at most two links. Enforced by
  `assertCleanAnchors()`, which runs in the test suite and inside the emitter.
- **Anchors are hand-written and reviewed**, never generated from a project's
  keywords. Adding a variant is an edit to `CREDIT_VARIANTS` in
  `shared/foundationCredit.ts`, reviewed like page copy.
- **The owner can remove it.** They paid for 100% of the game. If they turn it
  off, it stays off, and nothing in a later update turns it back on.
- **Anchor text varies by placement** and points at the query clusters ReGen
  Civics is trying to own (`LLM_DISCOVERABILITY_PLAN.md` section 3, Layer 2),
  rather than repeating the brand name in three places.

### 3.6 Add the game to the network

The credit is one direction. The return link is `regencivics.earth/network`,
which lists every live game and links out to it. After the game goes live, add an
entry to `shared/networkRegistry.ts` in regen-civics (`listed: true` only with
the owner's yes) and ship it. That is also the freshness signal: a new entry on
`/network` and a new sitemap `lastmod` every time a game launches.

While you are in the new game, serve its own federation feed at
`/api/federation/projects.json` (ADR-41 shape: `network`, `description`, `docs`,
`generatedAt`, `projects[]`). `/network` reads it for a project count, and
partner networks read the whole network in one format.

## 4. Self-checks before handoff

- `pnpm check` exits 0
- The app boots and every persona journey clicks through
- Zero foundation-brand leakage: no ReGen Civics or Amora string anywhere except
  the foundation credit itself
- `emit-foundation-credit.ts check` passes on the home page and the about page
- Writing rules pass on every seeded string
- Gaps in the blueprint are listed in the handoff notes, not papered over
