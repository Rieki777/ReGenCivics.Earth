# How I Build ReGen Civics with Claude (and How You Can Too)

I build regencivics.earth almost entirely with Claude. Two interfaces: Cowork for design decisions and specs, Claude Code for writing and shipping the actual code. The site has 50+ pages, a game system, a forum, crowd-pooling campaigns, an incubator pipeline, a tools library, and a token claim flow. One person. Two Claudes.

This post explains exactly how I do it, and gives you everything you need to start doing it yourself. Your first pull request could be merged today.

## How the workflow actually works

I use Cowork (Claude's desktop app) as my design partner. I drop in screenshots, describe what I want, and we go back and forth until the spec is right. Cowork produces execution prompts: detailed, step-by-step build documents that tell Claude Code exactly what to do.

Then I hand those prompts to Claude Code (the terminal tool). Claude Code reads the prompt, reads the codebase, and builds the feature. It writes the code, runs the TypeScript checker, and commits. My job is to review the diff, test it in the browser, and push.

The whole system runs on three things:

**CLAUDE.md** sits at the root of the repo. It tells Claude everything about the project: what it is, how the tech stack works, what the writing rules are (no em-dashes, no AI-speak, no rhetorical question openers), where the planning docs live, how to run migrations. Every Claude session reads this file first.

**Skills** are reusable instruction sets that live in `.claude/skills/`. They teach Claude how to do specific things well: build quests, design forms, generate background images, write outreach emails, handle database migrations. When Claude encounters a task that matches a skill, it reads the skill file and follows those patterns instead of guessing.

**Execution prompts** are the build specs. They live in the repo root as markdown files like `CLAUDE_CODE_PROMPT_2026-04-02_FORM_READABILITY.md`. Each one is a complete, self-contained set of instructions: what to change, which files to touch, what the code should look like, and how to verify it works. Claude Code reads one and executes it top to bottom.

## What you need

**Required:**
- A Claude account with Claude Code access (Pro, Team, or API key). If you don't have one yet, [get a free week of Claude Cowork here](https://claude.ai/referral/v8oHxjZJxg?s=cowork&v=apps) and start building today.
- Git and Node.js 20+
- A GitHub account for pull requests

**Optional (for specific features):**
- A Google Gemini API key (free tier works) for image generation
- Your own MySQL database if you want to run the full stack locally

**About costs:** You use your own Claude account and API key. ReGen Civics doesn't cover API costs for contributors. The free tier for Gemini works for image generation. Most contributions cost very little in API usage. [A free Cowork week](https://claude.ai/referral/v8oHxjZJxg?s=cowork&v=apps) is enough to ship your first contribution and see how the whole workflow feels.

## Setup in 10 minutes

### 1. Clone the repo and install

```bash
git clone https://github.com/regen-civics/regen-civics.git
cd regen-civics
npm install
```

### 2. Set up your environment

```bash
cp .env.example .env
```

Edit `.env` with your database connection string. If you don't have a MySQL instance, you can use a free Railway or PlanetScale database, or run MySQL locally with Docker.

### 3. Run database migrations

```bash
npx tsx scripts/run-migration.ts --all
```

This applies all SQL migrations in order and tracks what's been applied so nothing runs twice.

### 4. Start the dev server

```bash
npm run dev
```

The site runs at `http://localhost:5000`.

### 5. Install the project skills

The repo includes project-specific skills in `.claude/skills/`. These are automatically available to Claude Code when you run it from the project directory. The skills that matter most:

- `regen-form-design` teaches Claude the site's form readability standards (dark theme, WCAG contrast, glass panel patterns)
- `regen-background-design` teaches Claude how to generate and composite page backgrounds using Gemini
- `regen-quest-builder` teaches Claude how to create complete quests from concept to code
- `regen-do-everything` teaches Claude the autonomous fix/upgrade workflow

### 6. Verify Claude Code can read the project

```bash
claude "Read CLAUDE.md and tell me what the current priorities are"
```

If Claude responds with the project context, you're ready.

## The one prompt

This is all you need. After cloning the repo and running npm install, paste this into Claude Code:

```
Read CLAUDE.md, CONTRIBUTING.md, and the skills in .claude/skills/. Then check the FIXES_TO_MAKE_*.md files in the repo root and the Feature Suggestions at https://regencivics.earth/features. Pick one task that's appropriate for a first contribution (something scoped small, low-to-medium priority). Walk me through what you found, what you recommend, and then build it. Follow the project's writing rules and conventions. Run npx tsc --noEmit before committing.
```

Claude reads the project context, the writing rules, the available skills, and the open task list. Then it picks something, explains its plan, and builds it. Your job is to review the code, test it locally, and push the PR.

If you want to build a tool for the Tools Library instead, try this:

```
Read CLAUDE.md, CONTRIBUTING.md, and REGEN_TOOLS_LIBRARY_SPEC.md. I want to submit a new tool to the ReGen Civics Tools Library. The tool is [name and URL]. Analyze the URL, fill out the submission data, and prepare the PR with the tool entry following the schema in the spec. Follow all writing rules.
```

The Tools Library at regencivics.earth/tools is a community-curated directory of tools used by regenerative projects. Submitting a tool you know and use is one of the fastest first contributions. The submission form at /tools/submit even has AI-powered auto-fill from the tool's URL.

Your first PR could be merged within 30 minutes of cloning.

## Your first contribution

### Path A: Guided build quests

Go to the [Feature Suggestions page](https://regencivics.earth/features) and pick something the community has voted on. Or check the `FIXES_TO_MAKE_*.md` files in the repo for open tasks.

Here's the workflow:

1. Create a branch: `git checkout -b fix/your-feature-name`
2. Write an execution prompt (or ask Claude to help you write one based on the feature description)
3. Hand it to Claude Code: `claude "Read and execute my-prompt.md"`
4. Review what Claude built, test it locally
5. Push and open a PR

### Path B: Pick your own

See something on the site that could be better? Take a screenshot, drop it into Claude Code with a description of what you'd fix, and let Claude propose a solution. The pattern I use constantly:

```bash
claude "Look at this screenshot [paste path]. The contrast on the form labels is too low and the radio buttons are hard to see. Fix the readability following the regen-form-design skill."
```

## How to write an execution prompt

This is the core of the workflow. A good execution prompt has:

**Context** at the top: what problem this solves, which files are involved, any relevant specs.

**Numbered steps** with specific code changes: find this string, replace with this string. Or: create this new component with these props and this behavior.

**Verification checklist** at the bottom: run tsc, check these pages visually, test these interactions.

Here's a simplified example:

```markdown
# Execution Prompt: Fix Glossary Search

## Context
The glossary search input doesn't filter results as the user types.
File: client/src/pages/Glossary.tsx

## Steps

### 1. Add search state
Add a useState for the search query at the top of the component.

### 2. Filter the glossary entries
Filter the entries array by checking if the term name or definition
includes the search string (case-insensitive).

### 3. Wire up the input
Connect the existing search Input to the state setter.

## Verification
1. Run `npx tsc --noEmit`
2. Navigate to /glossary
3. Type in the search box, verify results filter in real time
4. Clear the search, verify all entries return
```

Claude Code reads this and does exactly what it says. The more specific you are, the better the output.

## How to write a skill

Skills live in `.claude/skills/your-skill-name/SKILL.md`. They follow this format:

```markdown
---
name: your-skill-name
description: Use when [specific triggering conditions]. Triggers on: "keyword1", "keyword2", etc.
---

# Skill Name

## Overview
What this skill teaches, in 1-2 sentences.

## Quick Reference
Table or pattern for the most common operations.

## Common Mistakes
What goes wrong and how to fix it.
```

If you build a skill that helps you contribute better, submit it as a PR. Skills are contributions too.

## The writing rules

Every piece of text on the site follows these rules. Claude knows them from CLAUDE.md, but you should know them too:

1. **No em-dashes.** Zero. Replace with commas, periods, colons, or rewrite.
2. **No contrast-framing.** Don't define things by what they aren't.
3. **No AI word patterns.** No "delve," "foster," "leverage," "seamless," "robust," "comprehensive," or any of the other banned words.
4. **No rhetorical question openers.** Start with the thing itself.
5. **No passive inspiration.** "Join us on this journey" means nothing. Say something specific.

The voice is direct, grounded, specific. First person is fine. Contractions are fine. Short sentences are fine.

## Running database migrations

If your feature needs schema changes:

```bash
# Create your migration file
# Name it with the next number: drizzle/0102_your_feature.sql

# Run it
npx tsx scripts/run-migration.ts drizzle/0102_your_feature.sql

# Check status
npx tsx scripts/run-migration.ts --status
```

The migration runner tracks what's been applied in a `_migrations_applied` table, so it's safe to run repeatedly.

## The PR process

1. Branch from `main`
2. Make your changes (manually or via Claude Code)
3. Run `npx tsc --noEmit` to check for type errors
4. Test locally at `http://localhost:5000`
5. Push your branch and open a PR on GitHub
6. Describe what you changed and why
7. Include screenshots if it's a visual change
8. PRs are reviewed weekly. Rye and the security reviewer check code for quality and vulnerabilities before merging.

We review PRs on a weekly cycle. If Claude Code wrote the code, mention that in the PR description. It helps reviewers know what to look for.

## Building with your own Claude

You don't need to use the same workflow I do. Some people will prefer writing code by hand and using Claude for review. Some will use Cursor or Windsurf. Some will use the API directly. All of that works.

What matters is that the code is clean, the types check, and the feature works. How you get there is up to you.

But if you want to try the execution prompt workflow, it's the fastest path I've found from "idea" to "shipped feature." And the skills in this repo give your Claude the same context mine has.

## Next steps

The community forum at [regencivics.earth/community](https://regencivics.earth/community) has a pinned Builders thread where you can share what you're working on, ask questions, and coordinate with other contributors.

The Feature Suggestions page shows what the community wants built. Pick something, build it, ship it. That's the whole process.

We're actively looking for a **Security Reviewer** to join the team. Right now Rye reviews all PRs weekly with AI security scanning tools, but this role needs a dedicated person. If you have security experience (or want to build it), this is a high-impact way to contribute. The role: review community PRs for vulnerabilities, maintain security scanning workflows, and help establish secure development practices for the project. Post in the Builders forum thread if you're interested.

Every contribution to ReGen Civics is tracked in the game system. Code contributions count toward your seasonal Harvest, which determines your share of $ReGen tokens. The more you build, the more you earn. And the tools and skills you create help everyone else build faster too.
