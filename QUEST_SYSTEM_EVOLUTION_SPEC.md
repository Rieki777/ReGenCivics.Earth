# Quest System Evolution Spec: The Living Quest Board

Version 1.2. Drafted 2026-07-06. v1.1 added Rye's cold-start, attention, and seeding directives. v1.2 hardened the plan against a three-perspective adversarial review (a first-time visitor on a phone, a staff engineer verifying every technical claim against the code, and a movement-integrity reviewer). The review record is section 10.

This document builds on `QUEST_PAGE_AND_PATH_PROGRESSION_SPEC.md`, which stays authoritative for paths, portals, citizenship tiers, the three rings, and the /quest page visual redesign (its Phase 3). This spec covers the layers that one leaves open: quests as shareable living pages, playing together, quests as governed content inside the Evolution Engine, and the rhythm that binds it into one walk.

Three facts govern every choice below:

1. **Nobody is playing yet.** The quests are brand new and about to be announced. Every surface must be beautiful at population zero and must never advertise emptiness.
2. **The world this launches into has thin attention and thinner time.** A stranger arriving from a shared link decides in about thirty seconds. The path from first sight to first real action has to fit inside fifteen minutes.
3. **The announcement is imminent.** The board cannot feel empty on day one, so it gets seeded with life before the doors open.

And one law that arbitrates every conflict the review surfaced: **when growth mechanics and the depth of a rite pull in opposite directions, the rite wins.** The 48-hour conversion metric is diagnostic, never optimized for. No first-step copy, share card, or notification gets tuned by engagement experimentation. The quests exist to transform lives; the funnel exists to bring people to that doorway honestly.

---

## 0. North star

Every quest becomes a place, and the quest board becomes a commons.

A place: each quest gets its own URL, its own story page, its own party of players, its own feed of completions, its own share card that travels well on the open internet.

A commons: the community that plays the quests also authors, tunes, and retires them, through the same Assembly and ratification machinery that already governs the game's variables. The board stops being a page we write and becomes a garden the players grow.

The measure of success, revised for the cold start: a stranger clicks a quest link someone shared, reads a story that moves them in under a minute, does a real first step the same evening, and joins in one tap. Six months later they vote on a quest another player authored. (The movement framing belongs to that six-month arc, never to screen one: a first-time visitor is invited to do one small real thing, not to join anything.)

---

## 1. Where we are (as-built, verified 2026-07-06)

What already exists and works:

| Surface | Status | Where |
|---|---|---|
| 52-quest universe (14 Rites, 18 Seasonal, Epics, Welcome Aboard) | Live, static TS data | `client/src/data/questData.ts`, `questMasterContent.ts`, `seasonalQuestsData.ts`, `epicQuestsData.ts` |
| /quest page: seasonal carousels, Netflix-style cards, filters, Quest 0 flip card | Live | `client/src/pages/Quest.tsx` (1,753 lines) |
| `/quest/:slug` route | Registered, unused: `App.tsx:231` routes it to the generic board; the param is never read | `client/src/App.tsx` |
| Start signal ("in the field", 90-day expiry) | Live | `activeQuestSignals` table, `quest.signalActive` |
| Completion with artifact (photo/text/link/video, public/private) | Live | `questCompletions`, `quest.logCompletion` |
| Completion feed + spotlight | Live | `quest.getCompletionFeed` (already filters by quest), `quest.spotlight` |
| Party flag + avatar strip + DM link | Live, minimal | `lookingForParty` on signals, `LookingForParty.tsx` |
| Token credit on Hypha on-chain confirmation only | Live; but the reward amount is client-supplied at submission (see 10.3, flagged for immediate fix) | `hyphaBridge.createFromQuest`, `cascadeQuestPassed` |
| Quest suggestions with votes + auto forum thread | Live | `questSuggestions`, `questSuggestionVotes` |
| Org endorsements (recommended/required per quest) | Live | `questEndorsements` |
| Nine-capital scores | Live | `playerCapitalScores` |
| Tier detector + path progression (Phase 1 of path spec) | Live | `server/lib/tierDetector.ts`, tier-detector cron |
| Satori OG image generator | Live; gratitude real, `type=quest` exists as a hardcoded placeholder | `server/routes/og.ts` |
| Per-route OG meta injection | Live, but a static route map + one forum special case; per-quest needs a new dynamic branch | `server/_core/vite.ts:177-290` |
| Lunar cycle machinery | Live (gratitude economy) | `shared/lunar.ts`, `server/lib/gratitude-cycles.ts` |
| Evolution Engine Rung 1 (variable + bounds changes, machine ratification) | Live; `governance_executions.kind` enum already reserves a `'content'` value | `server/lib/evolution.ts`, `server/lib/ratification.ts`, migration 0172 |
| Multi-participant conversations | Schema is N-party and push fan-out works; the API and Messages UI above it are hard-coded 1:1 | `conversations`, `conversationParticipants`, `server/routes/messages.ts:29-53` |
| OAuth returnTo deep-link preservation | Live for Google/Apple (signed HMAC state); magic link always redirects to `/` | `server/_core/oauth.ts` |
| Forum seed-persona pattern | Established | `regen-quest-builder` skill Phase 5, `scripts/seed-quest-forum-posts.ts` |
| Next-quest suggestion logic | Live | `client/src/hooks/useNextQuest.ts`, `ContinueYourJourneyRow.tsx` |

What is missing, in one honest list: no per-quest pages, no quest share cards or share buttons, no real parties, no group-chat UI (schema yes, UI no), no teammate suggestions, quests live in TypeScript files so governance cannot touch them, no path from a community suggestion to a live quest, no rhythm connecting quests to the lunar cycles, and no design anywhere for what a stranger with four spare minutes sees.

Every one of those gaps sits next to infrastructure that is already built or nearly built. The quest system's next chapter is mostly wiring. The review confirmed the wires are live, and identified exactly which three junction boxes need real work (messaging UI, magic-link returnTo, OG dynamic branch).

---

## 2. The five moves

### Move 0: Light the fires before the guests arrive

Ships before the announcement. Everything else is worthless if the first hundred visitors walk into an empty hall.

**The Companions.** In-world characters become the game's first walkers. Each is a real account with a special flag, and together they populate the board with completed quests and living conversation before launch.

- A `is_companion` flag on `playerProfiles`. Companion accounts render with a distinct visual identity everywhere, every time: painterly portrait art (the `regen-character-art` skill), a golden chip, and a different card treatment from real-player content so the distinction survives a skim on quest three, not just a first encounter.
- **Disclosure that survives a screenshot.** The chip alone is not enough: chips get cropped, and screenshots are how this content will actually travel. Every Companion completion story and forum comment carries a one-line footer in the content itself: "Anastasia is a character of the game, walking these quests as a guide." The bio says the same in the first sentence. And Companion completions are excluded from `type=quest-story` share cards entirely, so the highest-virality artifact in the system can never be a character testimonial detached from its label.
- **Casting is a Rye decision, not a content default.** The review flagged this hard: a character named Yeshua leaving a first-person account of a Medicine Journey or a Rite of Love is a screenshot that reads as sacrilege-bait or worse once it leaves the site, no matter how well labeled. Recommendation: Anastasia (already grounded in the Ringing Cedars material, `QUEST_RINGING_CEDARS_DRAFT.md`) carries the land-facing quests; the psychoactive-, fasting-, and intimacy-adjacent Rites (Medicine Journey, Rites of Love, Fasting) get either Anastasia, a third less-loaded Companion, or vetted non-character guidance instead of a character story. Yeshua, if cast, walks the quests with no drug, intimacy, or purity framing: Fire, Healing Circles, Communication Patterns, Tree Talk. Casting sheet goes to Rye before a word is written (open question 1).
- **Completed quests with real artifacts.** Each of the 14 Rites gets at least one Companion completion: a written story (300 to 600 words, in voice, following the writing rules) and where fitting an image. These flow through the existing `questCompletions` table with `visibility: public`, so the feed, spotlight, and every quest page's example slot fill through the normal pipes.
- **Forum conversation.** Each quest's thread gets 2 to 4 Companion comments in dialogue: a moment from the walk, something practical, and a question that invites the reader to reply. One rule from the review: **no safety-adjacent advice in a character's voice.** On the risky Rites, practical guidance ("electrolytes", "have a sitter") appears only in vetted, clearly non-character copy (see the risk tiers in Move 1); Companion comments there stay in the territory of story and encouragement. Seed script per the existing `scripts/seed-quest-forum-posts.ts` pattern, idempotent, dry-run first.
- **Companions never touch the numbers.** No `creditPrivateTokens` calls, no active signals. All public counts and aggregate surfaces exclude them; the concrete touch list is `quest.spotlight`, `quest.getCompletionFeed` (companion-last ordering), `quest.activeCountPerQuest`, the leaderboard, and `quest.stats`. Tier math needs no change (it is per-user; Companion accounts simply earn hidden tiers nobody sees).

**Empty-state law.** A rule for every surface this spec touches, and a pass over the surfaces that already exist:

- Never render a zero. "0 players in the field" becomes no badge at all. An empty party list becomes "Start the first party for this quest." An empty feed becomes the Companion stories.
- Every empty state is an invitation with a verb, never an apology.
- The spotlight and feed fall back to Companion stories until real public completions exist; ordering is companion-last, date desc, so real players take precedence automatically and permanently.

**The Winter Rites content pass moves here.** The audit found quests 9-13 thinner than the rest in `questMasterContent.ts`. Per-quest pages make every story page-one visible at the moment of highest scrutiny, so the content pass is a Phase 0 deliverable, not an open question.

**Effort.** Content is the bulk: 14+ completion stories and ~40 forum comments in distinct voices, portraits, the Winter Rites pass, plus one flag migration, the seed script, and the count-query touch list above. Three to four days. Ships independently of everything below, and first.

### Move 1: Every quest is a place, reachable in one breath

**What.** Wire the dormant `/quest/:slug` route to a full quest page built for two readers at once: the stranger with four minutes and the player going deep. Give every quest a share card and a share button in the moments people want to share.

**The first fifteen minutes.** The page is designed top-down for the arrival from a shared link, on a phone, with thin attention:

- **Screen one is the whole pitch, in plain language.** Quest art, title, one-sentence story hook, and a single button: "See your first step." The time framing leads with the first step ("First step: 15 minutes tonight") with the full quest shape stated honestly right beside it ("The full quest unfolds over weeks, at your pace"). One promise, no bait-and-switch: the small step is real, and so is the long walk it opens.
- **No token chips on the stranger's screen one.** To someone who has never heard of the game, "+111 $ReGen" reads as a points scheme and repels exactly the person the share reached. First-visit-from-outside sees plain language; the token reward appears further down the page with one sentence of context, and in full glory for signed-in players. (Heuristic: referred visits and logged-out visits get the gentle screen one.)
- **No movement framing in the first session.** Screen one, the auth gate, and the first-step flow ask a person to do one small real thing. "Join the movement," the Assembly, governance, and tokens-as-ownership enter after a first step is logged, when there is something real to belong to.
- **Every quest gets a `first_step`, honest to its risk.** A concrete action doable tonight in fifteen minutes or less, authored for all 14 Rites as part of this move. Fire's is "Tonight, write down one story you tell about yourself that no longer serves you. One sentence is enough." And for the physiologically or psychologically weighty Rites, the first step is never the risky act: Fasting's first step is learning your relationship to hunger for one skipped snack and reading the preparation note, never "start a fast tonight." Medicine Journey's is research and finding experienced support, never the medicine.
- **Risk tiers.** Quests classify into two tiers. Tier G (behavioral, creative, relational): the default flow. Tier R (Fasting, Medicine Journey, Honey Moon, Breathplay, and kin): the first-step card is preceded by a short, calm, unskippable preparation note: contraindications in plain language, a "walk this with support, never alone" line, and for Medicine Journey an explicit statement that the game offers story and community, never medical or therapeutic supervision. This note is vetted copy, never character voice, and it is part of the rite (preparation is how these traditions actually begin), so it can be written to deepen the quest rather than bureaucratize it.
- **Read everything without an account.** Story, steps, tips, video, Companion stories, forum thread: all public. The gate appears only at the moment of logging action, and it is one tap. OAuth (Google/Apple) is the visually primary option because it genuinely is one tap; magic link is the fallback with honest copy ("we'll email you a door"). Two build items make the promise true: extend magic-link verify with the same signed `returnTo` pattern OAuth already has (today it hard-redirects to `/`), and preserve any half-composed first-step text through the auth round trip verbatim (a draft in localStorage keyed by quest, restored after redirect). Signup IS starting the quest.
- **A reason to return, from day one.** The stranger who logs a first step gets one calm next invitation on the completion moment and on their next visit: the existing `useNextQuest` logic surfaced as a "walk this next" card on the quest page. No lunar machinery needed in Phase 1; the full rhythm layer arrives in Move 4.

**The quest page, full form.**

- Hero: existing quest art full-bleed, title, subtitle, season and element marks.
- First-step card (with risk-tier preparation note where applicable), then the story: full `storyCard` and description from `questMasterContent.ts`, steps as a skimmable checklist with time chips, tips, video above the fold when it exists, PDF guide link. The long story lives under a "The full story" fold.
- Life signs: real-player field count when 1 or more, this quest's completion feed, the Companion example completion (visually distinct, disclosed), org endorsements, and the forum thread's latest replies inline.
- Action rail: See Your First Step / Start This Quest / Submit Completion / Form a Party (Move 2) / Share.
- Cards on /quest link here. The modal stays as the quick view; the page is the deep view and the link target.

**Share cards.** Extend `server/routes/og.ts` (the `type=quest` placeholder becomes real) with:

- `type=quest&slug=...`: quest art, title, the first-step hook line. This is what a shared quest link unfurls to.
- `type=quest-story&id=...`: the completion story card. Player name, quest title, their caption, "the Nth completion of this quest" (count excludes Companions; Companion completions are excluded from this card type entirely). Public completions only, validated server-side, editable caption before posting.

Per-quest OG meta needs a new dynamic branch in `server/_core/vite.ts` (the existing injection is a static route map plus one forum special case), and the server needs quest data before Move 3a lands: import the quest TS data modules into the server bundle, which is safe (pure data) and precedented (the blog prerender script already imports `blogPosts.ts`).

**The share moment.** Reuse the `ShareButton` pattern (native Web Share + copy fallback) and the gratitude `ShareCard` flow (live preview, editable caption, platform buttons). The post-completion toast gains one line: "Share your story." Log shares to `shareEvents` (`entityType='quest'`).

**Tracking.** Starts from `activeQuestSignals`, completions from `questCompletions`, shares from `shareEvents`, first-step logs, plus a small `quest_page_views` counter table (the one new table this move adds). One `quest.stats` procedure aggregates. The launch-season headline number: share-link visits that become a logged first step within 48 hours. Diagnostic, never optimized for (see the law in the preamble).

**Also:** quest URLs into the sitemap (standing carryover), per-quest OG meta (standing carryover, closed by this move).

**Effort.** Two weeks, honestly (the review corrected the one-week estimate): page assembly, two OG card types from the placeholder, the vite.ts dynamic branch, magic-link returnTo, draft preservation, view counter, stats procedure, sitemap. Plus the authoring pass: 14 first steps and the Tier R preparation notes, drafted against `QUEST_MASTER_SHEET.md`, approved by Rye.

### Move 2: Nobody quests alone

**What.** Grow the `lookingForParty` flag into real parties: named groups walking a quest together, with a group chat. Matchmaking waits for a crowd; bring-your-own-party does not.

**Cold-start honesty.** A matchmaker with nobody in the pool proves the place is empty. Two stages:

- **Stage A (launch-ready): parties you bring.** Form a party from the quest page, name it, invite by link or email: friends, family, your circle. The invite link unfurls with the quest card plus "Maya invited you to walk this together." Most early parties will be people who already know each other, which is how movements actually start, and it works at population two. An invited non-member flows through the same one-tap join as Move 1, landing inside the party chat.
- **Stage B (density-gated): the matchmaker.** `quest.suggestedTeammates` ranked by same-quest signals with `lookingForParty` on, then coarse region affinity, then complementary nine-capital profiles, then vouches and forum affinity. It renders only with 3 or more genuine candidates; below that, the slot shows the invite-by-link card. Same rule for the weekly kindling digest ("2 players near you are walking Healing Circles this cycle"): it sends only when true.

**Schema.**

```sql
CREATE TABLE quest_parties (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quest_id VARCHAR(100) NOT NULL,        -- the existing canonical string key ("quest-5")
  name VARCHAR(120) NULL,
  creator_id INT NOT NULL,
  conversation_id INT NOT NULL,          -- FK conversations: the party IS a group chat
  invite_code VARCHAR(24) NOT NULL UNIQUE,
  status ENUM('forming','active','completed','disbanded') DEFAULT 'forming',
  max_size INT DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quest_party_members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  party_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('founder','member') DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_party_member (party_id, user_id)
);
```

**The messaging truth (from the review).** The conversations schema is genuinely N-party and push fan-out already reaches all participants, but everything above it is hard-coded 1:1: the list procedure returns a singular `otherUser`, `Messages.tsx` renders around it, and there is no conversation name or system-message concept. So Stage A includes a scoped messaging rework: `type` and `name` columns on conversations, a group-aware list procedure, a group header in the thread view. The party's opening message is a normal message from the founder (auto-composed, editable) carrying the quest title, first step, and link, which sidesteps inventing a system-message type entirely.

**Party completion.** Verification does not change: each member submits their own artifact, tokens credit only on Hypha confirmation. The feed groups party completions into one entry ("The Ember Circle completed Healing Circles: 4 stories") and the shared story card carries all their names. A party completion bonus stays deferred; if it comes, it arrives as a game variable.

**Abuse resistance (from the review).** Party names are user content rendered to others: sanitize like display names. Parties inherit the conversation-level report path; party names get their own report affordance. Founders can remove members and transfer foundership; invite codes are unguessable and revocable. And party completions only count toward any public or governance-feeding metric (commons stats, future ember curation) when members are distinct established accounts, so a sockpuppet party cannot manufacture social proof. Run `/security-review` before shipping.

**Effort.** Stage A: 1.5 to 2 weeks (the messaging rework is real work the v1.1 estimate hid). Stage B: a few days, whenever density justifies it.

### Move 3: The board governs itself

**What.** Move quests from TypeScript files into the database, then give the Evolution Engine a quest-content execution payload, so the community can create, tune, and retire quests through the same propose-deliberate-ratify-execute loop that already changes game variables with zero humans in the relay.

This is the move that makes the whole thing an infinite game. The Evolution Engine's autonomy ladder names Tier 2 as "content auto-applies" and marks it not implemented; the `governance_executions.kind` enum even reserves a `'content'` value already. Quests are the content. This is Tier 2 made real, with the quest board as its first citizen.

**Step 3a: the canonical quests table.** As specced in v1.1 (slug, title, story, `first_step`, steps JSON, rewards, pool, path, season, element, `max_party_size`, status, version, `author_id`, `source_proposal_id`), with the identity correction from the review: **the existing string `questId` ("quest-5", "healing-five-bodies") is the canonical join key**, carried as a unique column; the INT id stays internal. `questCompletions`, `activeQuestSignals`, bridge metadata, and image filename conventions all already speak that string, and inventing a second public key invites a dual-key mess. Migration seeds from the four TS data files. Cutover is gradual: `quests.list` serves the client with TS fallback, **a parity snapshot test (DB seed vs TS export, field by field) is the cutover gate**, and the review's effort correction stands: the table is days, but six client modules consume the TS shape (`Quest.tsx`, `useNextQuest`, `SeasonalQuestFeed`, `SeasonalDepthCard`, `EpicQuestSection`, `ContinueYourJourneyRow`) plus JSON-LD and image-URL conventions, so 3a in full is roughly a week.

**Step 3b: the quest-content payload kind.** Reuse the reserved `'content'` enum value (or ALTER the enum, one migration either way; the spec's v1.1 silence on this was a gap):

```ts
{
  kind: 'content',
  contentType: 'quest',
  action: 'create' | 'update' | 'retire',
  questId: string,
  fields?: Partial<QuestFields>   // validated field whitelist, absolute values only
}
```

Per the house rules: validate at raise AND execution (id collision on create, quest exists on update/retire, reward bounds sane, required fields present including `first_step` and, for Tier R quests, the preparation note; copy fields sanitized), idempotent under concurrent dispatch via the existing UNIQUE on proposalId, plus the review's retry-hole guard: the version bump is conditional (`SET version = version + 1, source_proposal_id = :p WHERE quest_id = :q AND source_proposal_id != :p` or equivalent) so a retried execution after a partial failure cannot double-apply. Extend `server/evolution.test.ts` with the full matrix including the retry case. Execution stamps the quest's constitutional record: "Reward changed from 111 to 144 by proposal #82, ratified June 2027."

**Step 3c: the authoring pipeline.**

1. Anyone suggests a quest (`questSuggestions`, live, with votes and a forum thread).
2. A steward promotes it: "Draft as proposal" opens the Assembly raise flow with the content payload pre-filled plus a guided authoring form (first step, steps, story, deliverable, risk tier), following the `regen-quest-builder` content standards. **Conflict-of-interest rule from the review: the promoting steward cannot be the suggestion's author.**
3. Normal Assembly life: signal, synthesis, objections, lazy consent or binding Hypha vote. **Reward sanity rule: a proposed reward more than a bounded distance from the median of live quest rewards (bound itself a game variable) cannot take the lazy-consent path and requires the full vote.**
4. Ratification executes. The quest goes live with `author_id` set, the author's name on the page, and an authorship credit via `creditPrivateTokens` (`source: 'quest_authorship'`, amount a game variable). **Audit affordance: author-completion pairs are queryable, so "did the author's own network disproportionately complete this quest" is a report, not an investigation.**

**Step 3d: the governance demo, corrected.** The v1.1 claim of "zero new code" was wrong, and the truth is better. Rewards today are client-supplied at submission and frozen into the Hypha proposal (`hyphaBridge.createFromQuest`), which is both why a game variable would connect to nothing and a real vulnerability (a modified client can request an inflated reward, human vote as only backstop; flagged for immediate fix independent of this plan). The demo becomes: resolve the reward server-side from a `quest_reward.<questId>.regen` game variable (fallback to the TS data), ignore the client value, sync the displayed number. Two to three days, closes the trust gap, and THEN the Assembly's vote on a reward changes what players actually receive. A lever connected to something.

**Effort.** 3d: 2-3 days. 3a: ~1 week. 3b: ~1 week including tests. 3c: ~1 week. All after launch: governance of the board matters once people are on the board.

### Move 4: One seamless walk

**What.** Execute the standing spec's Phase 3 page redesign (portals, rings, tier sidebar, moss-ruin reveals: all specced, all approved) and add the two connective layers this spec owns: lunar rhythm and the unbroken flow from stranger to steward.

**The rhythm layer.** The economy already breathes on lunar cycles. Quests join the same breath:

- A "This cycle" band at the top of /quest: two or three quests featured as this lunation's embers, chosen deterministically (season-appropriate, rotation seeded by cycle id, later curated by the Assembly; ember selection never reads party-completion social proof, per the Move 2 abuse rule). Copy pattern: "This cycle the game turns toward Wild Foraging."
- No streaks, no FOMO, no expiry guilt. A skipped ember rotates back around. The band creates a shared moment; our clock is the moon and the gathering is a forest.
- Cycle close already runs a distribution job; the digest gains a soft cycle-turn note naming the new embers.

**The unbroken flow.**

1. Stranger clicks a shared quest story card (Move 1) and lands on a quest page with life in it (Move 0).
2. Reads the story in plain language, does the first step tonight, joins in one tap.
3. Declares a path through the portal (path spec, live tier detector); Welcome Aboard ring, then the Rites, each with its own page, party invitations arriving from friends (Move 2).
4. Completes, shares a story card, which recruits the next stranger. The loop closes.
5. Tier earned, single Hypha claim button (path spec section 5).
6. Open Universe reveals two at a time; among the reveals, quests other players authored (Move 3).
7. The player suggests, then authors, then governs. Stranger to steward, one walk. The movement framing arrives here, earned, never on screen one.

**The map.** Public completions, region-coarse and opt-in, land on the existing ProgressMap as small lights. The regeneration becomes visible geography. Trails everything else.

**Effort.** Phase 3 per the path spec: 2-3 weeks. Rhythm band: 2-3 days on live lunar machinery.

---

## 3. What we borrow, and from whom

The standing spec's borrow list (Hollow Knight shimmer, Hades mirror, Spiritfarer invitations, Stardew calm) stays in force; these are additions:

| Source | The pattern | Where it lands |
|---|---|---|
| Wordle / NYT Games | The result is a beautiful shareable artifact; sharing is the growth engine | Quest story cards via satori OG (Move 1) |
| Duolingo's first lesson | You do the thing before you build the account | Read everything logged out; signup is one tap at the moment of action (Move 1) |
| Spiritfarer / Hades | Named characters make an empty world feel inhabited and teach by example | The Companions (Move 0) |
| Strava | Real-world effort becomes a feed with kudos; segments give every place its own page | Per-quest pages with their own feeds; gratitude sends as our kudos |
| Habitica | Parties as the retention spine; accountability is the mechanic | Quest parties as group chats (Move 2) |
| chess.com daily puzzle | One shared focal challenge creates a common conversation | Cycle embers on the lunar clock (Move 4) |
| Pokémon GO community days | Synchronized play windows concentrate the community | Same, plus cycle-close notes |
| Duolingo path map | One visible line of progression, always showing the next step | The ring structure + "walk this next" card, minus every guilt mechanic |
| Minecraft / Roblox | The players who build the world own the game | Community-authored quests through the Assembly (Move 3) |
| GitHub | Contribution history as identity; authorship permanently attributed | Quest pages carry their author and constitutional record (Move 3) |

And the anti-patterns stay banned (path spec 9.10), now with one addition from the review: no conversion-rate experimentation on rite content, ever. Calm is the brand, and the rites are not content-marketing units.

---

## 4. The seams: how this holds the whole system

- **Two Games discipline.** Everything here lives on the Game side: $ReGen and RGVoice only, warm voice, quests as invitations. The Fund is untouched.
- **Token model.** No new write paths. Authorship credit and any future party bonus go through `creditPrivateTokens` with new source tags (`quest_authorship`, later `party_bonus`). Companion accounts never touch the ledger. The Move 3d rewiring makes the server, not the client, the source of truth for reward amounts.
- **Evolution Engine.** The quest-content payload is the first Tier 2 kind, built to the existing law: validate twice, idempotent dispatch (including the conditional version bump), tests in `server/evolution.test.ts`, protected paths untouched.
- **Paths and tiers.** Untouched. Completions of community-authored quests count toward the same Steward math because they land in the same tables. Tier detector unchanged (per-user math; Companions earn hidden tiers that surface nowhere).
- **Security.** Five review points: party names and authored quest copy are user content (sanitize like display names); the OG endpoint validates server-side and serves only public, non-Companion completions for story cards; location stays coarse; invite codes unguessable and revocable; reward amounts server-resolved. Run `/security-review` on Moves 2 and 3 per the Golden Rule.
- **Duty of care.** Risk tiers and preparation notes (Move 1) are a launch requirement, not polish. The game invites people into real rites; the invitation carries real preparation.

---

## 5. Sequencing, re-cut for the cold start

The announcement date is the organizing fact. Phases 0 and 1 land before it; everything else follows the players.

| Phase | Contents | Effort | What it buys |
|---|---|---|---|
| 0 · before announcement | Move 0: Companion casting decision, then stories, forum dialogue, portraits, disclosure footers; empty-state pass; Winter Rites content pass; first steps + Tier R preparation notes authored | 3-4 days, mostly authoring | The board is alive, honest, and safe on day one |
| 1 · before or at announcement | Move 1: quest pages with the first-fifteen-minutes design, plain-language screen one, share cards, one-tap join (incl. magic-link returnTo + draft preservation), "walk this next" card, stats. Plus Move 3d: server-resolved rewards wired to game variables | ~2 weeks | Every share is a working front door with a return path; the Assembly's first lever connects to something real |
| 2 · first weeks after | Move 2 Stage A: bring-your-own parties, group-chat rework, invite links, abuse guards | 1.5-2 weeks | The warmest growth channel: players invite people they love |
| 3 · when density arrives | Move 2 Stage B (matchmaker + kindling digest, gated on 3+ real candidates) and Move 4 rhythm band + Phase 3 redesign | 2-3 weeks | The board breathes and the walk becomes seamless |
| 4 · when the community is walking | Move 3a-3c: quests table + parity gate, content payload kind, authoring pipeline with COI and reward-sanity rules | ~3 weeks | The commons opens; the game starts growing itself |

Every phase ends with the standard ship gate and deploy verification. Phases 3 and 4 can run in parallel worktrees.

---

## 6. Metrics of aliveness

Deterministic, readable from existing tables plus `shareEvents`, all excluding Companion accounts. All diagnostic: none of these numbers may drive experimentation on rite content.

- **The launch metric: first-visit to first-step.** Share of /quest/:slug visitors from shared links who log a first step within 48 hours.
- Share-to-visit: story cards shared, and outside visits landing on quest pages.
- Public-story rate: share of completions marked public.
- Party warmth: invites sent, invite-to-join rate, completion rate in parties versus solo.
- Return pulse: share of first-step loggers who take any second action within one lunar cycle.
- Commons growth (later): suggestions promoted, proposals ratified, community-authored quests live and completed, author-completion audit clean.
- Cycle pulse (later): ember starts versus baseline.

---

## 7. What we're not doing

- No verification bureaucracy. Self-reported completion with public artifacts and on-chain token confirmation is the trust model.
- No streaks, leaderboard shame, engagement-bait notifications, or A/B testing of rite content, ever.
- No unlabeled seeding. Companions are visibly characters, disclosed in the content itself, excluded from share cards and all counts.
- No risky first steps. Tier R quests begin with preparation, never the act.
- No separate chat product. Parties ride the existing conversations system (with the honest group-chat rework named in Move 2).
- No quest authoring outside governance. No admin CMS bypasses the Assembly; even founding-team edits eventually route through the content payload so the constitutional record is complete.
- No paid or gated quests. The board is a commons.

---

## 8. Open questions for Rye

1. **Companion casting (decide before any Phase 0 writing).** The review's strong recommendation: Yeshua does not walk Medicine Journey, Rites of Love, or Fasting; those go to Anastasia, a third Companion, or non-character guidance. Approve the casting sheet, and confirm you want the name Yeshua at all given how screenshots travel (a name change costs nothing now).
2. **Companion voices.** Anastasia close to the Ringing Cedars register; Yeshua's register is yours to set. Write the first story for each yourself and let Claude match, or approve Claude drafts?
3. **Companion label word and footer copy.** Recommendation: chip reads "Companion · a character of the game"; every story/comment carries the one-line footer. Confirm the wording.
4. **Tier R quest list.** Proposed: Fasting, Medicine Journey, Your Honey Moon, Breathplay, Hermetic Seal. Confirm or amend, and approve the preparation-note template.
5. **Party size default.** `max_party_size` column, default 5, per-quest override (Healing Circles wants 10+). Confirm.
6. **Promotion threshold.** Stewards only at first, promoting steward never the author. Confirm.
7. **Authorship credit seed.** Proposed 144 $ReGen as a game variable. Pick the number.
8. **First-step format.** One action, one sentence of why, 15 minutes or less, full-quest shape always shown beside it. Claude drafts against `QUEST_MASTER_SHEET.md`, you approve. Confirm.

---

## 9. Cross-references

- `QUEST_PAGE_AND_PATH_PROGRESSION_SPEC.md`: paths, tiers, rings, page redesign. This spec extends it.
- `CONTEXT_THE_TWO_GAMES.md`: Fund/Game token discipline honored throughout.
- `docs/EVOLUTION-ENGINE.md` + ADR-27/28/29: the machinery the content payload extends.
- `.ai/docs/STEERING.md` sections 1, 3, 5, 6: writing rules, ship gate, token model, Hypha bridge rule.
- `.ai/docs/security/BUILD-PLAYBOOK.md`: checklists for the new procedures, user content, and OG endpoint.
- `regen-quest-builder` skill: content standards and the seed-script pattern Move 0 extends.
- `regen-character-art` skill: Companion portraits.
- `QUEST_RINGING_CEDARS_DRAFT.md` (`.human/copy/`): Anastasia source material.
- `SHIPPED_LOG.md` 2026-07-03: the gratitude share card, the direct ancestor of quest story cards.

---

## 10. Review record (v1.2)

Three independent adversarial reviews ran against v1.1 on 2026-07-06. What each found and what changed:

**10.1 The stranger (first-time visitor, phone, four minutes).** Token chips on screen one read as a points scheme (fixed: plain-language screen one for outside arrivals); a uniform 15-minute promise on months-long quests reads as bait-and-switch (fixed: full quest shape always shown beside the first step); the Companion chip alone does not disclose fast enough (fixed: in-content footer, distinct card treatment everywhere); movement framing is too big an ask for a first session (fixed: scoped out of screen one and signup); no return hook in Phase 1 (fixed: "walk this next" card via existing `useNextQuest`); magic link is not truly one tap (fixed: OAuth primary, magic link honest fallback); half-composed first steps must survive the auth round trip (fixed: draft preservation requirement). Confirmed right: one-tap join at the moment of action, the first-step mechanic itself, labeling Companions rather than hiding them.

**10.2 The integrity elder.** Yeshua on Medicine Journey / Rites of Love is a viral-screenshot liability regardless of labels (fixed: casting rules + escalated to open question 1); labels must survive screenshots (fixed: content footers, Companions excluded from story share cards); a low-friction on-ramp to physiologically risky rites is a duty-of-care gap, the biggest in v1.1 (fixed: risk tiers, preparation notes, first-steps-are-never-the-act rule); the suggest-promote-ratify-author loop invites self-dealing (fixed: COI rule, reward sanity bound, author-completion audit); parties can manufacture social proof (fixed: distinct-established-accounts rule before any metric or ember curation counts them, report/transfer affordances); growth metrics will quietly reshape sacred content unless arbitrated (fixed: the preamble law, the A/B ban); no safety advice in character voice (fixed: Move 0 rule). Confirmed right: Companions excluded from ledger and counts by construction; governance sequenced after population.

**10.3 The engineer (claims verified against code).** The "zero new code" reward-governance demo was refuted: rewards are client-supplied and frozen into Hypha metadata (`hyphaBridge.createFromQuest`), so the demo became the 2-3 day server-side rewiring in Move 3d, and the underlying client-supplied-reward vulnerability was flagged for immediate fix independent of this plan. "Existing Messages UI carries the rest" was overstated: the schema is N-party but the API/UI is 1:1 (fixed: Move 2 re-scoped to include the group-chat rework, founder message instead of a system-message type). Magic link has no returnTo today (fixed: named build item). Per-quest OG needs a dynamic vite.ts branch and server-side quest data (fixed: import the TS data modules server-side, precedented by the blog prerender). The `governance_executions.kind` enum needs the reserved `'content'` value or an ALTER (fixed: payload reuses `'content'`). Version bump had a retry double-increment hole (fixed: conditional bump). Quest identity: the string `questId` is the live foreign key everywhere (fixed: canonical key decision + parity snapshot test as cutover gate). Effort corrections applied throughout (Move 1 to two weeks, Move 2 Stage A to 1.5-2 weeks, Move 3a to a week). Confirmed clean: the dormant route claim, party-as-conversation at the schema level, every Evolution Engine ground-truth statement.

End of spec. Recommendations stand unless overridden; open question 1 blocks Phase 0 writing.
