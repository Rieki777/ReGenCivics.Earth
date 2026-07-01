# Second Brain / Executive Assistant Spec

Status: Draft v1, 2026-06-26. Author: Rye + Claude (Cowork).

## What this is

A personal executive assistant for Rye, built on Rye's own messages and writing, that lives in two places and shares one brain:

1. **In the admin section** of regencivics.earth. When Rye is logged in as admin, the assistant can take an uploaded conversation or a pasted dialogue and return sorted ideas, actionable next steps, drafts in Rye's voice, and article starts.
2. **In Cowork** (this environment). The same brain shapes how Cowork drafts, organizes, and writes across all ReGen Civics work.

The point is one consistent voice and one consistent memory whether Rye is in the app or in Cowork.

## The core: one voice + context profile

There is a single source of truth both surfaces read: the **voice + context profile**. It holds:

- How Rye writes (sentence rhythm, openers, vocabulary, the hard writing rules already in CLAUDE.md: no em-dashes, no contrast-framing, no AI filler).
- What Rye cares about right now (the live priorities: website, fundraising, incubator).
- The map of people, projects, and open threads the assistant should track.

The in-app admin assistant loads this profile as its system prompt. Cowork loads it as a skill plus instructions. Update the profile once, both surfaces change together.

The profile starts from two inputs: the writing rules and project context that already exist in the repo, and the patterns distilled from Rye's Telegram messages once ingested.

## The codebase already gives us most of the plumbing

The admin AI assistant is not a greenfield build. The exploration of the repo found:

- `client/src/components/admin/` holds an `AdminAIAssistant` panel already wired to `trpc.adminAI.chat`.
- `server/_core/llm.ts` wraps Anthropic Claude (Sonnet 4.6) with `invokeLLM` and `streamLLM`, retry and backoff included. API key from `ANTHROPIC_API_KEY`.
- `server/routes/admin.ts` holds the `adminAI.chat` mutation pattern to mirror.
- `adminProcedure` in `server/_core/trpc.ts` gates by role (`admin` / `superadmin`). Access is role-based, so Rye's user row needs `role = 'admin'` (or `superadmin`) set in the database. There is no hardcoded email gate today.
- `admin_automations` table (`drizzle/0137_admin_automations.sql`) already exists for standing admin routines (briefing, digests) on a cadence.
- File upload to Cloudflare R2 runs through `trpc.files.upload` with the `/api/img` proxy for images.

So the work is extension, not invention.

## Data pipeline: Telegram to sorted notes

Source: Rye's Telegram export, machine-readable JSON. Saved Messages is the first and most important chat to ingest, since Rye has been using it as a capture inbox for ideas, article seeds, ReGen upgrades, and to-dos.

Pipeline stages:

1. **Parse.** Read the JSON export. Separate Rye's own messages from others. Pull text, timestamps, and any links or attachments.
2. **Recency weighting.** Older messages count for less. Recent messages count for more. A simple decay on message age so the assistant leans on what Rye is thinking about now.
3. **Signal ranking.** Across the 928 chats, rank by signal. Rye's own writing, real one-on-one conversations, and Saved Messages float to the top. Channels, bots, and one-off noise get parked.
4. **Sort into buckets.** For Saved Messages specifically, classify each entry into: ideas, article seeds, ReGen Civics upgrades, things to do, and reference. This is the first deliverable Rye asked for.
5. **Write to the vault.** Sorted entries become atomic, linked notes. This is the retrievable knowledge base.

The assistant answers and drafts by retrieving the relevant notes and generating from them, with citations back to the source note. No model fine-tuning. Retrieval plus generation is more private, updates the moment new messages land, and is better at organizing thoughts and producing next steps.

## The ten capabilities

The brain delivers these. Early phases ship the first cluster; later phases add the rest.

1. Voice model: draft replies, posts, emails, and articles that sound like Rye.
2. Relationship notes: one note per person, last contact, open threads, what was promised.
3. Commitment tracker: surface things Rye said he would do.
4. Daily briefing: replies needed, commitments due, calendar, top priority.
5. Idea and insight capture: extract half-formed ideas and good lines into atomic notes.
6. Decision log: capture decisions made in conversation and the reasoning.
7. Fundraising pipeline view: investor and donor conversations by stage with next action.
8. Ask-my-past retrieval: answer questions from the message history with citations.
9. Weekly review: what moved, what stalled, who went quiet, what is next.
10. Privacy and tiering: Rye chose all-in on a single private vault, so no wall is built. The vault stays local and private.

## Storage model

For the vault and the knowledge base, in priority order:

- Reuse the `admin_automations` pattern for standing routines (daily briefing, weekly review).
- Add a focused table for sorted notes and drafts: `id`, `ownerId`, `kind` (idea / article_seed / upgrade / todo / reference / draft / relationship), `title`, `content`, `sourceRef` (which message it came from), `weight`, `status`, `createdAt`, `updatedAt`, `tags`.
- Reuse `trpc.files.upload` plus R2 for the raw export files.

Any new table and tRPC procedure follows the security build playbook in `.ai/docs/security/BUILD-PLAYBOOK.md`, and any LLM-driven feature follows `.ai/docs/security/AI-AUTOMATION-RISKS.md` (sanitize input, rate-limit output, mark bot provenance). A load-bearing choice here gets an ADR in `.ai/docs/DECISIONS.md`.

## Phasing

**Phase 0, now, in Cowork.** Ingest the Telegram JSON. Sort Saved Messages into the five buckets. Stand up the vault structure and the first version of the voice + context profile. This needs no app deploy and delivers the sorting Rye asked for first.

**Phase 1, the profile.** Distill the voice + context profile from the sorted data plus the existing writing rules. Wire it into Cowork as a skill so all Cowork work picks up the voice.

**Phase 2, the admin surface.** Extend the existing `AdminAIAssistant` so logged-in-as-admin Rye can upload a conversation or paste a dialogue and get the sorted output, next steps, and drafts in voice. Mirror the `adminAI.chat` pattern, add the upload-and-process flow, load the profile as the system prompt. Add the new notes table.

**Phase 3, the standing routines.** Daily briefing and weekly review on a cadence via `admin_automations`, pulling from the vault, Gmail, and Calendar.

## What is needed from Rye

1. The Telegram export as machine-readable JSON, zipped, uploaded. The cover page alone has no message content.
2. Confirmation to set Rye's user row to `role = 'admin'` or `superadmin` in the production database when Phase 2 starts (this is the only access gate).

## Open questions

- Vault home: a folder inside the repo, a separate Obsidian vault folder on Rye's machine, or both with a sync. Phase 0 can start in the repo and move later.
- How much of the 928 chats to ingest beyond Saved Messages, and in what order.
- Whether the daily briefing posts into the admin panel, an email, or both.
