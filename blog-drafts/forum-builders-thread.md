# Builders Thread: Build ReGen Civics With Us

**Category:** Builders
**Pinned:** Yes
**Author:** Rye

---

This is the coordination thread for everyone building ReGen Civics. Code, content, quests, tools, game design, outreach. All of it.

## How building works here

The entire codebase is open and set up so that anyone with Claude (desktop app, Claude Code, or the web interface) can start contributing within 30 minutes. The repo includes project context, reusable skills, and execution prompts that give your Claude the same working knowledge mine has.

Two blog posts explain the full process:

- **Build with Us** covers code contributions: cloning the repo, running one prompt, and shipping your first PR.
- **Create with Us** covers everything else: quest design, forum content, outreach writing, fundraising copy, game mechanics, onboarding flows.

Both posts include a single copy-paste prompt that gets Claude reading the project and working on a real task immediately.

## Get started for free

If you don't have a Claude account yet, [get a free week of Claude Cowork here](https://claude.ai/referral/v8oHxjZJxg?s=cowork&v=apps). That's the desktop app I use to design specs and build features. One week is enough to ship your first contribution, submit a tool to the library, or design a quest.

## The fastest first contribution

Clone the repo. Run `npm install`. Paste this into Claude Code:

```
Read CLAUDE.md, CONTRIBUTING.md, and the skills in .claude/skills/. Then check the FIXES_TO_MAKE_*.md files in the repo root and the Feature Suggestions at https://regencivics.earth/features. Pick one task that's appropriate for a first contribution (something scoped small, low-to-medium priority). Walk me through what you found, what you recommend, and then build it. Follow the project's writing rules and conventions. Run npx tsc --noEmit before committing.
```

Or submit a tool to the Tools Library at regencivics.earth/tools. If you know a tool that helps regenerative communities, write up the submission. That's a real contribution and it takes 15 minutes.

## What to post in this thread

Share what you're working on. Ask questions about the codebase. Coordinate if you're working on the same area as someone else. Post your first PR link here so the community can see it.

If something in the setup process is confusing, say so here. The docs get better every time someone reports friction.

## Roles we need filled

**Security Reviewer** is the most urgent. Right now Rye reviews all PRs weekly with AI security scanning, but this needs a dedicated person. If you have security experience (or want to build it in a real project), reply to this thread.

Other open roles are on the Team page at regencivics.earth/team. Every role is a real contribution tracked in the game system.

## Weekly review cycle

PRs are reviewed weekly. Rye and the security reviewer check submitted code for quality and vulnerabilities. If your PR needs changes, you'll get feedback in GitHub. Small, well-scoped PRs get merged fastest.

## Ground rules

Follow the writing rules in CLAUDE.md. No em-dashes. No AI-speak. No rhetorical question openers. Run the `avoid-ai-writing` skill on anything you write before submitting.

If Claude Code wrote the code, mention that in your PR description. It helps reviewers know what patterns to check.

Every contribution counts toward your seasonal Harvest. The more you build, the more you earn. And the tools and skills you create make it easier for everyone who comes after you.

---

**First quest:** Reply to this thread with what you want to build or where you want to contribute. Even if you're just exploring, say hello. We'll point you toward something that fits.
