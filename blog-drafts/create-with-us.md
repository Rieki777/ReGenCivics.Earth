# Create with Us: Contributing to ReGen Civics Without Writing Code

You don't have to be a developer to build ReGen Civics. Half the work is writing, designing, and organizing. Quest cards. Forum posts. Outreach emails. Game mechanics. Economic models. Community onboarding flows. Content that brings people in and keeps them rooted.

This post shows you how to use Claude (the desktop app or Claude Code) with the same skills and processes I use to produce all of that content. You get the same tools. You follow the same process. And what you create goes directly into the live project.

## What kind of work needs doing

Here's what the project needs beyond code:

**Quest design.** Each quest has a card (title, description, objectives, rewards), a forum post body where players share their work, and seed comments that model the kind of responses we want. Designing a good quest means understanding the game, the community, and the kind of real-world action we're trying to encourage.

**Forum content.** Seed posts that kick off real discussions. Welcome threads. Guides for new players. Responses that model the tone we want. The forum is the community's living room, and it needs furniture.

**Outreach writing.** Emails to potential land projects. Investor cultivation sequences. Incubator recruitment. Newsletter content. Each audience needs a different approach, but all of it needs to sound like a real person from inside the movement wrote it.

**Fundraising copy.** Grant applications. Campaign page copy. Pitch materials. One-pagers for different audiences. The fund is live and raising capital, and every piece of writing that explains what we're doing and why it matters is a contribution.

**Game design.** New game mechanics. Economic models for the token system. Seasonal event structures. Contribution scoring proposals. The game spec is open and evolving, and good ideas backed by clear thinking get built.

**Onboarding flows.** The first quest a new player sees, the path through their first week, the moment they understand what this place is. Designing these experiences is design work, even if no code gets written in the process.

## The tools

Claude has skills built specifically for this work. When you use Claude (either the desktop app or Claude Code) inside the ReGen Civics project, these skills activate automatically:

| Skill | What it does |
|-------|-------------|
| `regen-community-onboarding` | Designs welcome sequences, quest flows, player journeys, first-week experiences |
| `regen-content-repurposing` | Turns long-form content into tweets, LinkedIn posts, Instagram captions, newsletter sections |
| `regen-outreach-sequences` | Writes email sequences for investors, land projects, community recruitment |
| `regen-fundraising-copy` | Writes grant applications, pitch content, campaign pages, investor materials |
| `regen-quest-builder` | Builds complete quests: card data, forum post, seed comments, implementation spec |
| `avoid-ai-writing` | Audits any content for AI patterns and rewrites to sound human |

## How to use them

### Option 1: Claude desktop app (Cowork)

If you have the Claude desktop app, you can work in Cowork mode with the project folder open. Claude reads the CLAUDE.md file and the skills automatically. If you don't have Cowork yet, [grab a free week here](https://claude.ai/referral/v8oHxjZJxg?s=cowork&v=apps) and try it with the project folder open. That's enough time to design a quest, write outreach emails, or submit a tool to the library.

Tell Claude what you want to create:

> "I want to design an onboarding quest for new players who just signed up. It should get them to introduce themselves on the forum and explore two existing quests."

Claude reads the `regen-community-onboarding` and `regen-quest-builder` skills and produces the full quest spec: card content, forum post body, seed comments, and implementation notes.

### Option 2: Claude Code (terminal)

Clone the repo and use Claude Code:

```bash
git clone https://github.com/regen-civics/regen-civics.git
cd regen-civics
claude "I want to write 3 outreach emails for land projects that might apply to our incubator. Use the regen-outreach-sequences skill."
```

### Option 3: Claude.ai with manual context

If you don't have Claude Code, you can still use Claude on the web. Copy the relevant skill file contents into your conversation as context. The skills are plain markdown, and they work in any Claude interface.

## The one prompt

If you have Claude Code or the Claude desktop app, this is the fastest way to start. Open the project folder and paste:

```
Read CLAUDE.md, CONTRIBUTING.md, and the skills in .claude/skills/. I want to contribute content to ReGen Civics. Show me the content skills available (onboarding, outreach, fundraising, content repurposing, quest building). Then help me pick a first task: either a forum seed post, a quest design, an outreach email, or a tool submission for the Tools Library. Walk me through what you recommend based on the project's current needs.
```

Claude reads the project context, loads the right skills, and helps you create something specific. The output goes directly to the forum, into a PR, or to Rye for the next campaign.

For tool submissions specifically:

```
I want to submit a tool to the ReGen Civics Tools Library at regencivics.earth/tools. The tool is [name and URL]. Help me write the submission: name, description, categories, what problems it solves for regenerative communities, and a getting-started guide. Follow the writing rules in CLAUDE.md.
```

Submitting a tool you already use to the Tools Library is one of the easiest first contributions. The library is community-curated and every good tool helps land projects find what they need.

## The writing rules

This is the part that matters most. Every piece of content for ReGen Civics follows strict rules. If you're going to contribute content, you need to know these:

**No em-dashes.** The long dash character is banned entirely. Use commas, periods, colons, or rewrite.

**No contrast-framing.** Don't define things by what they aren't. "This isn't marketing, it's genuine participation" is banned. Say what the thing IS.

**No AI word patterns.** The banned list includes: delve, tapestry, foster, leverage, seamless, robust, comprehensive, cutting-edge, empower, utilize, navigate (as metaphor), and about 20 more. The full list is in CLAUDE.md.

**No rhetorical question openers.** Don't start with "What if we could...?" Start with the thing itself.

**No passive inspiration.** "Join us on this journey" says nothing. Be specific about what the person will actually do.

The voice is Rye's voice: direct, grounded, first-person when it fits, warm without being vague. Read a few pages on regencivics.earth to hear it.

After you write anything, run it through the `avoid-ai-writing` skill. This catches patterns you didn't notice.

## Submitting your work

Content contributions can go through several channels:

**Forum posts:** Just post them directly at [regencivics.earth/community](https://regencivics.earth/community). If you've written a seed post, discussion starter, or guide, publish it.

**Quest designs:** Write them up as a markdown file and submit a PR to the repo, or post the spec in the Builders forum thread for review.

**Email sequences and outreach copy:** Share in the Builders thread or send directly to Rye. If it's good, it goes into the next campaign.

**Game design proposals:** Post in the forum with the "Feature Suggestion" flow at [regencivics.earth/features](https://regencivics.earth/features), or write a detailed spec and submit as a PR.

**Skills:** If you write a new skill that helps with content creation (SEO, social media strategy, grant writing, etc.), submit it as a PR to `.claude/skills/`.

**We need a Security Reviewer.** All code PRs go through a weekly review cycle where Rye checks for quality and security. This role needs a dedicated person. If you have security experience, this is a high-impact team role. See the Team page at regencivics.earth/team or post in the Builders forum thread.

## What good contributions look like

The best content contributions share a few qualities:

They're specific. "We should have better onboarding" is a comment. A full quest spec with card text, forum post body, three seed comments, and notes on where it fits in the progression chain is a contribution.

They follow the voice. Read the site. Match the tone. Run the AI audit. If it sounds like a press release or a marketing brochure, it needs another pass.

They're ready to use. The closer your contribution is to "copy-paste into the codebase" or "publish to the forum," the faster it ships. Include the exact TypeScript data structure in your quest spec. That's the difference between a spec that ships today and one that sits in a backlog.

They fill a gap. A tool submission to the Tools Library that helps land projects solve a real problem is a contribution. You can curate tools you use and trust. Curation is work. Writing a clear description of what a tool does and who should use it saves everyone else time.

## Getting started today

Pick one of these and do it right now:

1. Go to the forum and write a real response to an existing thread. Match the voice. Say something specific.
2. Pick a feature from the [suggestions page](https://regencivics.earth/features) and write the copy for it: what it does, why it matters, how a player would use it.
3. Design a quest. Use the quest builder skill or just write it from scratch. Title, description, 3 objectives, reward description, forum post body.
4. Write an outreach email for a specific type of land project (permaculture farm, community land trust, food forest cooperative). Make it personal and real.

Every piece of content you create for ReGen Civics counts as a contribution. It's tracked in the game system the same as code. And the tools and skills you build help everyone else create better content faster.
