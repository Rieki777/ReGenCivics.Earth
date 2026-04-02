# Contributing to ReGen Civics

This project is built by a distributed community. Your contributions matter. Here's how to get involved.

## Picking Up Work

Start with one of these sources:

1. Check `FIXES_TO_MAKE_*.md` files in the docs folder. These are organized by priority and ready to implement.
2. Look at GitHub Issues. Issues are tagged with difficulty (`low`, `medium`, `hard`) and category.
3. Ask in the forum if you're unsure what to work on. The community can point you toward high-impact tasks.

Low-priority fixes are the best place to start if you're new. They're scoped small and let you learn the codebase.

## Branch Naming

Keep it simple:

- `feature/short-description` for new features
- `fix/short-description` for bug fixes

Example: `feature/add-progress-ring` or `fix/forum-image-loading`.

## Pull Request Checklist

Before you open a PR, make sure:

- [ ] `npm run check` passes (linting and type-checking)
- [ ] `npm test` passes (unit tests)
- [ ] Writing rules followed (see below)
- [ ] No hardcoded credentials, API keys, or secrets
- [ ] No modified applied migrations (migrations are immutable once deployed)
- [ ] Brief description of what changed and why

We review all PRs with the community. Feedback happens in GitHub. Be kind to yourself and to reviewers. Iteration is normal.

## Writing Rules

All user-facing copy, docs, code comments, and forum content must pass these rules:

### No em-dashes. Zero.
Em-dashes (the long dash: —) are banned everywhere. Replace with a comma, period, colon, or rewrite the sentence.

Right: "This is the seed thread. Share what you made."
Wrong: "This is the seed thread — share what you made."

### No contrast framing.
Never define something by what it isn't. All of these are banned:
- "This is not X, this is Y."
- "Not just X, but Y."
- "Less X, more Y."

Rewrite to state what the thing IS. Lead with the affirmative.

Right: "The best seed content comes from someone who has actually done the quest and written something real about it."
Wrong: "Seed content is not marketing. It's genuine participation."

### No AI writing patterns.
Banned words and phrases: "delve", "tapestry", "foster", "leverage", "it's worth noting", "in conclusion", "embark on", "vibrant", "crucial", "groundbreaking", "transformative journey", "testament to", "beacon of", "nurture" (as metaphor), "unlock", "unleash", "seamless", "robust", "comprehensive", "cutting-edge", "empower", "utilize", "navigate" (as metaphor).

### No rhetorical question openers.
Don't start sections with "What if we could...?" or "Have you ever wondered...?" Start with the thing itself.

### Voice
Write direct, grounded, specific. Sound like a thoughtful person inside the regen movement. Short sentences are fine. Contractions are fine. First person is fine.

## Code Review Process

The core team reviews all PRs. We aim to respond within 2-3 days. If you haven't heard back, bump the PR with a comment.

We look for:
- Does the code solve the problem it claims to solve?
- Are there edge cases we should handle?
- Does it follow the project's patterns and conventions?
- Is it understandable by someone new to the codebase?

We're not here to be harsh. We're here to ship quality work together.

## How Contributions Get Rewarded

Every season, the community reviews all code contributions and creates proposals on Hypha to track them. You earn $ReGen tokens through the contribution scoring system.

To claim your contributions:

1. Collect the PR links and describe what you built.
2. Go to https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution
3. Submit a proposal. Include the work you did and why it mattered.

The community votes on proposals. If approved, your contributions are tracked in the game and you earn $ReGen on the next Harvest.

## First-Time Contributor Tips

- Start with a Low priority fix. You'll get momentum and learn the codebase at the same time.
- Read the relevant spec before coding. Check the CLAUDE.md file to see which spec docs are active.
- Ask in the forum or GitHub if you're stuck. We'd rather help than see you frustrated.
- Small PRs are better than big ones. Ship, get feedback, iterate.
- Look at existing code for patterns. We have conventions for database queries, API routes, React components. Copy the pattern, don't reinvent.

## What Not to Touch Without Discussion

Some parts of the system are core and risky to change alone:

- `game_variables` table. Tuning the game's numbers is a decision. Ask before you change anything here.
- Auth flow. If you're thinking about changing how login or OAuth works, talk to the core team first.
- Migration files. Once a migration is applied to the database, it's locked. Mistakes here are expensive.

If you're unsure whether something is risky, ask. There's no penalty for caution.

## Questions?

Ask in the forum. That's what it's there for. We're building this together.