# User Workflows: What Integration Feels Like

The bottom line requirement: the integration has to make sense from a user workflow perspective, and be as easy as humanly possible. This doc walks through the actual people at Amora and what changes for them. The governing rule for every workflow below:

> **Write where you act. Read anywhere. Never enter anything twice.**

Members act in the game. Meetings happen in Google Meet. Email happens in inboxes. Nobody should have to visit a second system to record what they already did in the first one.

## Persona 1: A resident / member (the majority)

**Today, without integration:** they live in the game (quests, gratitude, forum, map). Saberra is invisible to them; the Notion workspace is something stewards look at. If they miss a meeting, they ask someone what happened.

**After Phase 1-2:**
- They still live in the game. Nothing they use moves or changes.
- The morning after a circle meeting, the game shows the meeting's outcomes: a summary thread in the forum (posted through the draft queue, approved by a steward), and any task that names them appears as a suggestion, not an assignment.
- They can ask Maia things Maia previously could not answer: "what did we decide about the greywater system?", "who committed to fixing the pump?", "when did we last review the land lease?" Maia quietly asks Sera and cites the sources.
- If someone thanked them in a meeting, they may get a gentle prompt: another member is nudged to send them Gratitude in-game. The token event stays a human act.

**Never asked to do:** open Notion, learn a second login, re-enter anything.

## Persona 2: A steward / circle lead

**Today:** they run meetings, and either take notes or lose the content. If Amora uses Saberra's dashboard, decisions/tasks/risks appear there for review, in a separate tool from where the community coordinates.

**After integration:**
- They hold the meeting as usual (Google Meet with transcript on, or Riverside). Zero new meeting hygiene.
- Within minutes, extraction lands as *proposals in the game's admin queues*: suggested tasks, a decision record, a meeting summary ready to post, maybe a flagged risk or tension. They accept, edit, or reject from the same admin surface where they already review quest claims and org drafts. One review habit, one place.
- Org changes discussed in meetings ("let's move the nursery under the Land circle") arrive as suggestions referencing the transcript, next to their existing org-draft workflow. The org chart itself stays theirs.
- For deeper questions they use Sera directly (dashboard chat, or Claude with the MCP connector): governance audits, risk summaries, transition briefs when a seat changes hands, the org health score.

**Key workflow win:** the steward's review queue becomes the single funnel for both human proposals (quest claims) and machine observations (extractions). The trust model is identical, so the UI concept already exists.

## Persona 3: An admin / founder (you and Rick's counterparts)

- Everything stewards get, plus: Saberra's Control Center for extraction settings, review dials, and data export; the game's admin for modules, brand, economy.
- Their Claude (Claude.ai or Claude Code) connects to Sera via MCP, so operational questions about the community are answerable from wherever they work.
- When they change the org chart and publish, Saberra's mirror updates on the next sync; Sera answers from the new structure without anyone telling it.

## Persona 4: An investor or external partner

- They appear in Saberra Profiles (CRM side) from email and meeting traffic, with Interactions history. They never see the game unless invited.
- Protected parties remain codenames everywhere, including in anything surfaced in-game. The game must simply display whatever name Saberra provides and never attempt re-identification.

## Persona 5: A prospective community (the other 41 land projects)

The joint offering, eventually: fork the game platform (your documented white-label path), provision a Saberra tenant (one API call), connect the two with one shared secret. Day one they have: a living map, quests and progression, an org chart, meeting memory, and an assistant that knows their history from the first captured email.

## Workflow anti-patterns we are explicitly designing out

1. **Double entry**: a decision made in a meeting must never need manual re-typing into the game, and a quest completed in the game must never need re-logging for memory. Extraction covers the first; a webhook or capture-address email covers the second.
2. **Two assistants with two memories**: members should not learn "ask Maia for game things, ask Sera for history things." Maia fronts, Sera backs. Stewards and admins can use Sera directly; members never need to know it exists.
3. **Notion as a member-facing UI**: it is not one. Notion is the steward-visible memory store and the client's ownership guarantee. The game is the front of house.
4. **Silent cross-system writes**: nothing ever appears in one system as confirmed fact because an AI in the other system said so. Everything crosses as a proposal in the receiving side's existing queue.
5. **A second identity system**: no new logins anywhere. Game accounts stay game accounts; Saberra dashboard users stay per-user; the join is email, server-side.
