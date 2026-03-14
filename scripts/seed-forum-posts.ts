/**
 * Seed script: Forum posts + seed comments for ReGen Civics Gathering Grove.
 *
 * Part A: 8 Gathering Grove anchor posts (one per category, pinned)
 * Part B: 40+ thread stubs across all categories
 * Part C: Quest seed content seeded into relevant threads
 *
 * Usage:
 *   npx tsx scripts/seed-forum-posts.ts [--dry-run] [--reset]
 *
 *   --reset  Delete all forumReplies + forumPosts, then re-seed everything fresh.
 *            This is the standard workflow for a clean re-seed.
 *   --dry-run  Show what would happen without writing to the DB.
 *
 * Requires DATABASE_URL env var pointing to your MySQL connection string.
 */

import * as mysql from "mysql2/promise";

const DRY_RUN = process.argv.includes("--dry-run");
const CLEAR_FIRST = process.argv.includes("--clear") || process.argv.includes("--reset");

// ─── Part A: Anchor Posts ─────────────────────────────────────────────────────

const ANCHOR_POSTS: { categorySlug: string; title: string; body: string }[] = [
  {
    categorySlug: "general",
    title: "Welcome to The Gathering Grove!",
    body: `Something major is shifting in our world. You can feel it. It's why you're here.

The old systems are showing their cracks: degenerative, isolated, built for extraction-at-all-costs. And in those cracks, something extraordinary is growing: communities of people choosing a different way. Land being healed. Governance being rethought. Economies being redesigned from the soil up, connected to the soil, the web of life, and the more than human world.

This is why ReGen Civics exists. And this forum (The Gathering Grove) is where that community lives.

You're invited to treat this less as a comment section and more as a council fire. A place where regenerators from land projects and bioregions all across our Earth can think out loud, share what we're learning, ask hard questions, and celebrate what's working. Every voice here matters. Every question is a contribution. Every story of real change is a seed.

**A few things we hold here:**

- **Generosity over gatekeeping.** Share what you know. Someone else needs exactly what you've learned.
- **Questions over certainty.** We're all figuring this out. The best threads start with honest not-knowing.
- **Celebration over performance.** Big wins and tiny ones both belong here.
- **Kindness as a practice.** We're building the culture of regenerative societies together, starting in how we speak to each other.

**Where to start:**

Head to the **Introductions** topic and tell us who you are. Then wander wherever calls to you. There are threads on land projects, governance, quests, financing, alliance partners, and resources.

This is an infinite game. There's no finish line: only deeper understanding, stronger relationships, and more life flourishing because we played together.

Welcome to the Infinite Game.

Rieki`,
  },
  {
    categorySlug: "land-projects",
    title: "Is Your Land Ready to Be Part of Something Bigger?",
    body: `Land is the foundation of everything we're building.

Not metaphorically. Literally. The ReGen Civics vision is of regenerative villages and land projects spread across every bioregion on Earth, each one a living demonstration that people can live well while restoring ecosystems.

If you steward land in a regenerative way (or are working toward it), we want your project on the map.

**What we're looking for:**

It doesn't have to be perfect. It has to be honest. We're looking for projects that are genuinely oriented toward ecological healing, that hold some form of community governance (or are building toward it), and that have a sustainable financial model (or the willingness to develop one with the network's support).

**How to join the network:**

1. Visit the Land Projects page on the site and explore what's already there
2. Fill out the application form (it's substantive, and we take it seriously)
3. Our review team will engage with your project, ask questions, and give real feedback
4. If accepted, your project appears on our global map and becomes part of the living network

**This thread is your space.** Share what you're building. Ask questions about the application. Tell us what your land needs. Tell us what it's taught you.

We're building a constellation of living places. Is yours one of them?`,
  },
  {
    categorySlug: "investment-finance",
    title: "How Money Moves in a Regenerative Economy",
    body: `Most of us have been taught that money is neutral: that it just flows where returns are highest. But money is never neutral. It always reflects values. It always creates the world it touches.

ReGen Civics operates at two levels of the economy simultaneously.

**Two economic systems, one mission**

The **ReGen Civics Fund** is rooted in the Dominant Game by design. It uses a venture capital structure to move serious capital into regenerative land projects. This isn't a compromise. It's a strategy.

The **ReGen Civics Game** runs a parallel economy: one we're building together, rooted in contribution rather than capital. $ReGen tokens are earned through participation. What $ReGen becomes is something we're co-creating.

These two systems are designed to work together without collapsing into each other. The Fund is the bridge to the old world. The Game is the beginning of the new one.

**Here's what makes the Fund different:**

- **Land-backed security.** The fund holds actual land: real, tangible, ecologically valuable land.
- **RCVoice governance.** Major decisions governed by RCVoice tokens earned through contribution.
- **On-chain transparency via Hypha DAO.** Every significant transaction and decision is recorded on-chain.
- **Diversified across bioregions.** Resilience through diversity, exactly as nature does.
- **Impact metrics via HEIST framework.** Returns measured in ecological and social outcomes alongside financial yield.

**This thread is for real questions.** Ask about the investment thesis. Ask how returns work. Ask about impact measurement. Ask the uncomfortable things.

We believe in transparent conversation about money, because that's the only way to build a financial system that actually serves life.`,
  },
  {
    categorySlug: "governance-dao",
    title: "You Have a Voice Here: Here's How to Use It",
    body: `Most governance systems are designed to concentrate power. ReGen Civics is built on a different premise: that the people participating in an ecosystem are the ones best positioned to govern it.

**Two spaces, two governance systems**

The **ReGen Civics Fund** is anchored in the Dominant Game. Its governance is held by **RCVoice tokens**, which determine how the Fund's profits and distributions are allocated.

The **ReGen Civics Game** is anchored in the new Games we're building together. Its governance is held by **RGVoice tokens**, earned through genuine participation. RGVoice shapes how the Game evolves.

These two systems are separate by intention. The Fund needs to operate by rules the old Game recognizes. The Game is free to become something genuinely new.

**How RGVoice works:**

RGVoice is earned through participation: completing quests, contributing to the community, engaging with the ecosystem. This is a contribution-weighted system, not a plutocracy.

**The 90% Unity Model:**

For major decisions, we require 90% agreement. Consequential decisions can't be steamrolled. Genuine alignment has to be built.

**Seasonal Cycles:**

Major reviews and decisions are aligned with equinoxes and solstices. A commitment to living in time with the earth.

**Hypha DAO Infrastructure:**

The technical backbone is Hypha DAO: tested since 2019, transparent, and built for decentralized organizations.

This thread is for questions, proposals, critiques, and ideas. How do we make governance more accessible? More effective? More genuinely representative?

You're not a user here. You're a participant in the governance of a new kind of society.`,
  },
  {
    categorySlug: "quests-gameplay",
    title: "The Game Is Real. Your First Quest Awaits.",
    body: `What if changing the world felt less like a burden and more like an adventure?

That question is at the heart of how ReGen Civics is designed. We've borrowed the architecture of games (quests, rewards, seasons, progression) and applied it to something that actually matters: building regenerative civilization, together.

**Why quests?**

Because most of us know what needs to happen. What's hard isn't the knowing. It's the doing. Quests give you a specific, meaningful action to take right now, with a community doing it alongside you, and real recognition when you complete it.

**What you earn:**

Completing a quest earns you **$ReGen tokens** and **RGVoice governance weight**. $ReGen is a real token on the Base blockchain. RGVoice is real governance weight in a real DAO making real decisions.

**How it works:**

1. Visit the Quests page on your profile
2. Browse the available quests: we have a whole series called Welcome Aboard designed for people just getting started
3. Choose a quest that resonates
4. Complete the requirements (each quest tells you exactly what to do)
5. Submit proof of completion: usually a forum comment and a social post linking back

**The Welcome Aboard Quests** are the best starting point if you're new. Ten quests that root you in the platform, connect you with the community, and earn you real tokens while you learn.

**This thread is for everything quest-related:** questions, celebrations, suggestions, and stories from the field.

The game is real. And it's just getting started.`,
  },
  {
    categorySlug: "alliance-partners",
    title: "The Network Behind the Network",
    body: `ReGen Civics doesn't exist in isolation. No ecosystem does.

What we're building depends on a web of partnerships: organizations, tools, communities, and minds that each bring something the whole needs. Our alliance partners are not sponsors or vendors. They're co-builders of the same vision.

**A spotlight on Hypha DAO:**

Hypha DAO provides the governance infrastructure that makes ReGen Civics genuinely decentralized. Without Hypha, our 90% unity model, our on-chain transparency, and our RGVoice token system would be promises rather than realities.

Every time you vote on a proposal, earn RGVoice, or see a governance decision recorded transparently, that's Hypha working in the background.

**Who else belongs in this alliance?**

We're looking for partners who:

- Share the regenerative values animating this whole project
- Bring specific capabilities that strengthen the ecosystem
- Want genuine co-creation, not just a logo on a page
- Are building for the long term: the infinite game, not the next funding cycle

If you know an organization that should be here (a bioregional network, a land trust, an impact investment firm, an educational institution, a DAO), this thread is the place to name them. Tell us why they fit. Make an introduction if you can.

The stronger the alliance, the more resilient the whole network becomes.`,
  },
  {
    categorySlug: "introductions",
    title: "Who Are You, and What Are You Building?",
    body: `Every regenerative project starts with a relationship.

Before we collaborate, invest, govern, or grow together, we need to know each other. Not just names and credentials. The real stuff: what brought you here, what you care about, what you're actually trying to do in the world.

This is your invitation to show up as you are.

**Tell us:**

- **Who you are:** your name, or whatever you go by here
- **Where you're rooted:** your bioregion, your landscape, your place (or the place you're seeking)
- **What drew you to regenerative work:** the moment, the book, the experience, the heartbreak, the wonder that pointed you this direction
- **What you're building or learning:** a land project, a governance model, a financial instrument, a practice, a question
- **What you're hoping for here:** what would make joining this community feel worthwhile six months from now?
- **One thing that's alive in you right now:** what are you excited about, worried about, or working through?

There are no wrong answers. There is no minimum qualification for being part of this.

**We're building a community of regenerators.** The first step is knowing who's here.

What's your story?`,
  },
  {
    categorySlug: "resources-learning",
    title: "The Map Into This World: Resources That Have Shaped Us",
    body: `Understanding how to build regenerative societies is a genuine intellectual challenge. It asks you to hold ecology, economics, governance, culture, spirituality, and systems thinking all at once, and then make it practical enough to actually do.

Nobody comes to this fully formed. We learn from each other, from the land, and from the thinkers who've been working these questions longest.

**Books worth reading:**

- *Sand Talk* by Tyson Yunkaporta: Indigenous systems thinking that reframes knowledge, community, and time.
- *Braiding Sweetgrass* by Robin Wall Kimmerer: reciprocity, gratitude, and what it means to be in relationship with the living world.
- *Doughnut Economics* by Kate Raworth: economics around planetary boundaries and human flourishing.
- *Governing the Commons* by Elinor Ostrom: how communities manage shared resources sustainably.
- *Finite and Infinite Games* by James Carse: the philosophical foundation of the infinite game design underlying everything here.
- *Designing Regenerative Cultures* by Daniel Christian Wahl: how systems thinking and ecological design can reshape culture and economics.
- *Reinventing Organizations* by Frederic Laloux: organizations that have evolved beyond hierarchy.

**Video resources:**

- **The Foundational Series** by ReGen Civics: our video series introducing the ReGen Civics game and vision. Watch before diving in: [Foundational Series playlist](https://www.youtube.com/playlist?list=PL3Xi8vZSmBTStS0BoFItW8389HJLypX0E)
- **NVC Workshop with Marshall Rosenberg** (YouTube): a full workshop recording from the creator of Nonviolent Communication.

**This list is just the beginning.**

What have you read, watched, or encountered that cracked something open for you? What's the resource you keep recommending to people?

Add below. Let's build the map together.`,
  },
];

// ─── Part B: Thread Stubs ─────────────────────────────────────────────────────

const THREAD_STUBS: { categorySlug: string; title: string; body: string }[] = [
  // General Discussion
  {
    categorySlug: "general",
    title: "What Does 'Regenerative' Actually Mean to You?",
    body: `The word "regenerative" is everywhere now. But what does it mean when it stops being a label and becomes a lived practice? Share your working definition: the one you'd give to a friend or a skeptic. What does regenerative look like in your daily life, in your work, in your community? And where do you think the word is being misused or diluted? Open thread: all answers welcome.`,
  },
  {
    categorySlug: "general",
    title: "The Moment Everything Shifted: Your Origin Story",
    body: `There's usually a moment: the book, the experience, the conversation, the place that opened the door into regenerative work. What was yours? This thread is for origin stories: honest, specific, and human. Not your polished LinkedIn summary. The real moment when you understood something that you couldn't un-understand.`,
  },
  {
    categorySlug: "general",
    title: "What Is the Hardest Thing About Doing This Work?",
    body: `Regenerative work is meaningful. It's also difficult, slow, underfunded, and often lonely. What's the hardest part for you right now? Burnout? Skeptics? Funding gaps? The gap between vision and reality? This is a space for honest conversation, not performance of resilience. What do you actually need more support with?`,
  },
  {
    categorySlug: "general",
    title: "Where in the World Is Regeneration Actually Winning?",
    body: `Sometimes we need reminders that it's working. Share the places, projects, and communities that give you genuine hope. Not just inspiring stories: specific examples of ecosystems healing, communities thriving, or economic models that actually work. This thread is a living map of what's possible.`,
  },
  // Land Projects
  {
    categorySlug: "land-projects",
    title: "What Does Your Land Actually Need Right Now?",
    body: `Beyond funding (though that too), what does your land project need this season? Skills? Mentors? Connections to specific communities? Design input? Equipment? Market access? Let's be specific. This thread is for real needs, not polished pitches. Someone in this network might have exactly what you need.`,
  },
  {
    categorySlug: "land-projects",
    title: "The Hardest Season: Stories of Struggle and Persistence",
    body: `Land projects fail. Or nearly fail. Or face seasons so hard you wonder why you started. This thread is for those stories: told honestly, with enough detail to be actually useful to others. What went wrong? What saved it? What would you do differently? The lessons in the hard seasons are worth more than the highlight reel.`,
  },
  {
    categorySlug: "land-projects",
    title: "Bioregional Wisdom: What Does Your Land Teach That Others Should Know?",
    body: `Every bioregion has knowledge that took generations to develop: about water, soil, season, community, and the specific way life organizes itself in that place. What does your land teach that people elsewhere need to understand? This thread is a gathering of bioregional intelligence.`,
  },
  {
    categorySlug: "land-projects",
    title: "Land Tenure and Sovereignty: How Are You Holding Your Land?",
    body: `One of the deepest challenges in regenerative land work is legal and structural: who owns the land, how is it protected from sale, and how do communities maintain sovereignty over it long-term? Share your legal structures, your experiments, your questions. Land trusts, ministries, CLTs, DAOs, cooperatives, indigenous frameworks: what's working?`,
  },
  {
    categorySlug: "land-projects",
    title: "Show Us Your Land",
    body: `Photos, videos, sketches, maps: share a view of where you're working. A field at dawn. A food forest in its third year. A watershed recovering. Earthworks in progress. A seed saving session. Let us see the places that are changing because people showed up for them.`,
  },
  // Investment & Finance
  {
    categorySlug: "investment-finance",
    title: "What Would Regenerative Capital Actually Look Like?",
    body: `Not just impact investing with better branding: genuinely different. What would a financial system look like if it was designed to serve ecological and community health first? What would it measure? How would returns work? What would it refuse to fund? Open philosophical thread: all frameworks welcome.`,
  },
  {
    categorySlug: "investment-finance",
    title: "How Are You Funding Your Work Right Now?",
    body: `Grants, crowdfunding, revenue, investment, barter, community support: regenerative projects have found many paths. What's working for you? What's the most underrated funding model you've encountered? What would you never do again? Practical, honest, specific answers most valuable here.`,
  },
  {
    categorySlug: "investment-finance",
    title: "The Problem with Impact Investing (and What to Do About It)",
    body: `Impact investing has a marketing problem and an accountability problem. Greenwashing is rampant. Metrics can be gamed. Returns often still take priority over impact. Does the ReGen Fund model actually solve these problems? What are its real risks? This thread is for critical, rigorous conversation about regenerative finance.`,
  },
  {
    categorySlug: "investment-finance",
    title: "What Should the ReGen Fund Prioritize? Your Input Matters",
    body: `The fund is governed by the community, which means you have real input into its direction. What types of projects, bioregions, or ecological outcomes should receive priority? What should the fund never touch? This is a genuine invitation to shape investment strategy.`,
  },
  // Governance & DAO
  {
    categorySlug: "governance-dao",
    title: "Have You Experienced Good Governance? What Made It Good?",
    body: `Most of us have experienced governance that felt frustrating, captured, or meaningless. But some of us have been part of something that actually worked: where decisions felt fair, participation felt worthwhile, and the community felt genuinely represented. What made it good? What can we learn from that?`,
  },
  {
    categorySlug: "governance-dao",
    title: "The 90% Unity Model: Do You Believe It Can Work?",
    body: `Skeptics welcome. The 90% unity model sounds beautiful in theory. In practice, can it actually work? What happens when communities are deeply divided? When bad actors hold a blocking position? When decisions genuinely need to be made quickly? Bring your sharpest critiques and your best defenses. This conversation makes the governance better.`,
  },
  {
    categorySlug: "governance-dao",
    title: "How Should RGVoice Be Earned?",
    body: `Currently, RGVoice is earned through quest completion and community participation. Is that the right model? What kinds of contribution should earn the most governance weight? How do we prevent gaming? How do we ensure people closest to the land have meaningful voice? This is an open governance design question.`,
  },
  {
    categorySlug: "governance-dao",
    title: "What Should the Community Decide vs. What Should Leadership Decide?",
    body: `Not everything needs a DAO vote. And some things absolutely do. Where's the line? What decisions are best made by the whole community, and which are best delegated, and to whom? This tension is real in every decentralized organization. How do we get it right?`,
  },
  // Quests & Gameplay
  {
    categorySlug: "quests-gameplay",
    title: "Which Quest Changed Something for You?",
    body: `Not just "I did the quest." Which one actually shifted something: in how you see the platform, in a relationship you made, in an action you took in the world? Quest stories are how others understand what's possible. Share yours.`,
  },
  {
    categorySlug: "quests-gameplay",
    title: "Quest Ideas: What Should Be a Quest That Isn't Yet?",
    body: `The quest library grows through community input. What action, if it were a quest, would you actually want to do? What meaningful contribution to the ecosystem isn't being recognized and rewarded yet? Drop your ideas here. Specific is better. The best suggestions may become the next quest series.`,
  },
  {
    categorySlug: "quests-gameplay",
    title: "Quest 3, Do a Regenerative Act: Show Us What You Did",
    body: `This is our collective log of real regenerative actions taken by ReGen Civics players in the physical world. Every act counts. Every act is a vote for the world we want.

To complete Quest 3:
1. Do one real, intentional regenerative act today, however small.
2. Share what you did below. A photo, a description, anything real.
3. Post about it on social media and link to your post in your comment.

When we witness each other doing, something shifts.`,
  },
  {
    categorySlug: "quests-gameplay",
    title: "The Welcome Aboard Quests: How Are You Finding It?",
    body: `This is the place to share your experience on the ReGen Civics site and give constructive feedback. There are no wrong answers here. Whether you loved it, found it confusing, or have big ideas for how to make it better, we want to hear it all.

To complete Quest 1:
1. Leave a comment below sharing your honest thoughts about the site. What is working? What could be improved? What excited you?
2. Post your thoughts on social media too (link to your post in your comment here).

Your voice helps us build something extraordinary together.`,
  },
  {
    categorySlug: "quests-gameplay",
    title: "What Would Make Quests More Meaningful to You?",
    body: `Quests are a design question as much as a content question. What would make you more likely to attempt a quest? More excited to complete it? More proud to share it? What's the difference between a quest that feels like a checkbox and one that feels like a genuine contribution? Help design the next generation of quests.`,
  },
  // Alliance Partners
  {
    categorySlug: "alliance-partners",
    title: "Who Should Be in the Alliance? Make Your Nominations",
    body: `You know organizations doing extraordinary work in regenerative land, finance, governance, education, and culture. Name them here. Tell us what they do and why they belong in the network. If you have a relationship with them, say so. Warm introductions move faster than cold outreach.`,
  },
  {
    categorySlug: "alliance-partners",
    title: "What Has Hypha DAO Made Possible That Wasn't Possible Before?",
    body: `For people who have used Hypha DAO in other contexts, or who are learning about it through ReGen Civics: what does this governance infrastructure actually unlock? What decisions, what transparency, what coordination becomes possible that wasn't before? Practical answers are most valuable.`,
  },
  {
    categorySlug: "alliance-partners",
    title: "How Can Alliance Partners Serve Land Projects Better?",
    body: `This thread is for land project stewards to speak directly to what they need from the broader network. What would make the difference between a land project struggling alone and one that's genuinely supported? What does alliance actually need to look like in practice?`,
  },
  // Introductions
  {
    categorySlug: "introductions",
    title: "Introduce Your Land: Tell Us About Your Place",
    body: `Sometimes a person's introduction isn't complete without their place. Share your bioregion: its climate, its ecology, its history, its particular challenges and gifts. What does the land where you live or work need most right now? What is it teaching you?`,
  },
  {
    categorySlug: "introductions",
    title: "One Year In: What's Changed?",
    body: `For community members who have been part of ReGen Civics for a season or longer: what has changed? In your projects, your understanding, your relationships, your work? What did you expect when you joined that turned out to be different? This thread is for honest reflection on what the community has actually done for people.`,
  },
  // Learning & Resources
  {
    categorySlug: "resources-learning",
    title: "What Are You Reading Right Now?",
    body: `Share what's on your desk, in your earbuds, or on your screen. One sentence about what you're engaging with and why it matters to your work. This is an ongoing thread: add to it anytime. Let's build a living reading list.`,
  },
  {
    categorySlug: "resources-learning",
    title: "The Resource That Changed Everything: One Recommendation, Maximum Passion",
    body: `You're allowed one. The book, video, course, podcast, essay, or experience that most shifted how you understand regenerative work. Tell us what it is and what it changed. One recommendation, but make it count.`,
  },
  {
    categorySlug: "resources-learning",
    title: "What Should ReGen Civics Teach That It Doesn't Yet?",
    body: `Education is core to this platform. What knowledge, skills, or frameworks do regenerators need that the platform isn't providing? Soil science? Legal structures for land? DAO governance for newcomers? Financial modeling for impact projects? This thread informs what gets built next.`,
  },
  {
    categorySlug: "resources-learning",
    title: "Foundational Series Watch Party: Questions and Reactions",
    body: `For people watching the Foundational Series video playlist: share what surprised you, what confirmed something you already knew, and what questions came up. Watch the series here: [Foundational Series playlist](https://www.youtube.com/playlist?list=PL3Xi8vZSmBTStS0BoFItW8389HJLypX0E)

This is a place to process and discuss together.`,
  },
];

// ─── Part C: Quest Seed Content ───────────────────────────────────────────────

// Quest seed content that goes INTO existing Gathering Grove threads
const QUEST_THREAD_SEEDS: {
  targetTitle: string;
  seeds: { author: string; handle: string; body: string }[];
}[] = [
  {
    targetTitle: "The Welcome Aboard Quests: How Are You Finding It?",
    seeds: [
      {
        author: "Solange Beaumont",
        handle: "@solange_regen",
        body: "I found the quests section a bit hard to find at first. Took me a while to realise it was in the profile section. Once I found it though, I was hooked. The token reward structure is really clever. Would love to see a brief onboarding flow that introduces first-time visitors to the Game concept right away. Shared this on my Instagram: [Solange's Instagram post](https://instagram.com/p/example1)",
      },
      {
        author: "Tobias Wrenfield",
        handle: "@tobias_earthwise",
        body: "Really impressed by the scope of what is being built here. My main feedback is that the 'How It Works' section on the home page could be even more visual, maybe a short animated explainer. The vision is big and new visitors need to feel it quickly before they commit to exploring further. Posted a thread on X about it: [Tobias's X thread](https://x.com/tobias_earthwise/status/example)",
      },
      {
        author: "Yemi Adeyinka",
        handle: "@yemi_soilandstars",
        body: "As someone who has been in the regenerative agriculture space for years, it is refreshing to see governance and game mechanics applied to ecosystem stewardship. Two suggestions: clearer explanations of what $ReGen and RGVoice tokens actually do on-chain, and a map view of all the land projects. Would draw me back daily. LinkedIn post here: [Yemi's LinkedIn post](https://linkedin.com/posts/example)",
      },
    ],
  },
  {
    targetTitle: "The Moment Everything Shifted: Your Origin Story",
    seeds: [
      {
        author: "Amara Diallo",
        handle: "@amara_soilstories",
        body: "I grew up watching my grandmother tend her garden in Dakar with a kind of attention I did not understand until much later. She never called it regenerative but she was composting before I knew the word. I came to this work after a decade in finance, realising the money was flowing everywhere except toward the land. ReGen Civics is the first place I have seen both things held together. Post: [Amara's Instagram post](https://instagram.com/p/example_origin1)",
      },
      {
        author: "Luca Andersson",
        handle: "@luca_regen_north",
        body: "Mine is embarrassingly simple: I watched a documentary about soil microbes at 2am and could not sleep for three days after. Something just clicked. I started reading everything, quit a comfortable job, and spent two years on a farm in southern Sweden. I still do not know where I am going but I know what direction I am facing. Shared on X: [Luca's X post](https://x.com/luca_regen_north/status/example_origin)",
      },
      {
        author: "Fatimah Osei",
        handle: "@fatimah_ecosystems",
        body: "I came to this through grief, honestly. A river I grew up swimming in ran dry when I was 22. I needed somewhere to put that grief that was not just rage. Regenerative work gave me somewhere to put it that also builds something. That is the whole answer. Post: [Fatimah's LinkedIn post](https://linkedin.com/posts/example_origin)",
      },
    ],
  },
  {
    targetTitle: "Quest 3, Do a Regenerative Act: Show Us What You Did",
    seeds: [
      {
        author: "Mireille Fontenot",
        handle: "@mireille_jardinage",
        body: "I planted six native wildflowers along the verge outside my building. Had to check first that it was not illegal in my council (it nearly was). But it is done. My small act of guerrilla rewilding. Post: [Mireille's Instagram post](https://instagram.com/p/example6). Already inspired my neighbour to do the same.",
      },
      {
        author: "Josue Ramirez",
        handle: "@josue_tierra_libre",
        body: "I spent an hour picking up plastic along a 300-metre stretch of the river near my house. It is something I walk past every day and look away from. Not anymore. Post: [Josue's X post](https://x.com/josue_tierra_libre/status/example6). And a commitment to do it monthly.",
      },
      {
        author: "Hana Kowalczyk",
        handle: "@hana_ferments",
        body: "My regenerative act was starting my first compost bin. I have wanted to do this for two years and Quest 3 made me actually do it. It is just a box in the corner of my balcony for now, but it is alive. Shared the setup on TikTok: [Hana's TikTok video](https://tiktok.com/@hana_ferments/example6).",
      },
    ],
  },
  {
    targetTitle: "Bioregional Wisdom: What Does Your Land Teach That Others Should Know?",
    seeds: [
      {
        author: "Astrid Bergholm",
        handle: "@astrid_nordmark",
        body: "I am in the Angermanälven watershed in northern Sweden. A river system I had never thought about even though I drink from it. Discovered that the area has one of Scandinavia's last wild salmon runs. And that three centuries ago, this whole hillside was open pasture with 40+ farm families. Now it is mostly spruce monoculture. Shared: [Astrid's Instagram post](https://instagram.com/p/example7)",
      },
      {
        author: "Emmanuel Kariuki",
        handle: "@emmanuel_mtaro",
        body: "I live in Nairobi but I learned I am in the Nairobi River watershed. A river so degraded most residents do not know it flows beneath them. Found a local restoration group I am now volunteering with. Three things: I live in the Ngong Hills bioregion, the area was historically Maasai grazing territory, and there are 600+ bird species within 50km of where I sit. Post: [Emmanuel's X post](https://x.com/emmanuel_mtaro/status/example7)",
      },
      {
        author: "Siobhan Ni Mhurchu",
        handle: "@siobhan_bogland",
        body: "I am in the west of Ireland in the Connaught blanket bog ecoregion. One of the rarest habitats on Earth and largely destroyed in the 20th century. What surprised me: intact bogs in my county store more carbon per hectare than tropical rainforest. I had no idea. Post: [Siobhan's LinkedIn post](https://linkedin.com/posts/example7)",
      },
    ],
  },
  {
    targetTitle: "Foundational Series Watch Party: Questions and Reactions",
    seeds: [
      {
        author: "Dario Marchetti",
        handle: "@dario_regen_it",
        body: "Just finished all four videos and my biggest takeaway is the concept of 'coordinating at the speed of trust.' We have all the solutions. What we lack is the governance layer to connect them. ReGen Civics is proposing exactly that. Wrote a summary article: [Dario's Medium article](https://medium.com/@dario_regen/example5)",
      },
      {
        author: "Fatimah Osei",
        handle: "@fatimah_ecosystems",
        body: "Video 3 shifted something in me. The idea that we are not building an organisation but an ecosystem hit differently. I have been in too many movements that became institutions and lost their aliveness. The game framing could be the antidote. Shared on Instagram: [Fatimah's Instagram post](https://instagram.com/p/example5)",
      },
      {
        author: "Luca Andersson",
        handle: "@luca_regen_north",
        body: "I wrote a short invitation post for my network after watching: 'If you have been wondering what regenerative civilisation actually looks like in practice, start here.' Three friends have already reached out asking how to join. Post: [Luca's X post](https://x.com/luca_regen_north/status/example5)",
      },
    ],
  },
  {
    targetTitle: "Who Should Be in the Alliance? Make Your Nominations",
    seeds: [
      {
        author: "Nkechi Okonkwo",
        handle: "@nkechi_regenlaw",
        body: "I work adjacent to environmental law and shared this with two firms specialising in land trusts and commons governance. Also reached out to a regenerative agriculture certification body. These are exactly the kinds of organisations the Alliance needs. Post: [Nkechi's Instagram post](https://instagram.com/p/example3)",
      },
      {
        author: "Sven Lindqvist",
        handle: "@sven_regenfinance",
        body: "Shared with a Nordic regenerative finance organisation and a circular economy accelerator. The concept of organisations earning tokens for contributing is exciting to them. Post: [Sven's LinkedIn post](https://linkedin.com/posts/example3)",
      },
      {
        author: "Amara Diallo",
        handle: "@amara_agroforestry",
        body: "I am part of an agroforestry technical assistance network and shared this across our whole community. Probably 30+ organisations. The referral bonus really motivates people to follow through. Post: [Amara's X post](https://x.com/amara_agroforestry/status/example3)",
      },
    ],
  },
  {
    targetTitle: "Quest Ideas: What Should Be a Quest That Isn't Yet?",
    seeds: [
      {
        author: "Izabela Nowak",
        handle: "@iza_regen",
        body: "My dream quest (had this idea at 3am): 'The Mycelium Quest.' Players map every connection they have to someone doing regenerative work, visualise their personal network as a mycelium diagram, and share it. The value: making invisible connective tissue visible. Post: [Izabela's Instagram post](https://instagram.com/p/example4)",
      },
      {
        author: "Kweku Mensah",
        handle: "@kweku_earthgames",
        body: "Quest idea: 'The Seed Sovereignty Quest.' Save seeds from something you grew, document it, and gift them to someone else in the community. Creates living chains of seed stewardship across the Alliance. Post: [Kweku's X post](https://x.com/kweku_earthgames/status/example4). Already getting traction.",
      },
      {
        author: "Rosa Villareal",
        handle: "@rosa_tierra_viva",
        body: "I woke up with this one: 'The Ancestor Quest.' Interview an elder in your community about how land was cared for when they were young. Record a few minutes, transcribe the wisdom, and share it in the forum. Our elders carry irreplaceable ecological knowledge. We are losing it fast. Post: [Rosa's LinkedIn post](https://linkedin.com/posts/example4)",
      },
    ],
  },
];

// Quest standalone posts (Q5, Q6, Q9)
const QUEST_STANDALONE_POSTS: {
  slug: string;
  title: string;
  body: string;
  seeds: { author: string; handle: string; body: string }[];
}[] = [
  {
    slug: "make-friends",
    title: "Quest 5: Make Friends and Support",
    body: `This is where we build the connective tissue of the Alliance. Not projects, not tokens, just people finding each other and choosing to show up.

To complete Quest 5:
1. Find someone in the community you have not connected with yet. Reach out: leave a comment, respond to their origin story, answer a question they asked, or just introduce yourself.
2. Share the connection below. Who did you reach out to, and why?
3. Post something on social media about the value of real community in regenerative work, and link to it in your comment here.

A community that notices its members is a community worth belonging to.`,
    seeds: [
      {
        author: "Baraka Njoroge",
        handle: "@baraka_systems",
        body: "I read Valentina's origin story and sent her a message because she mentioned translation between indigenous land knowledge and policy language. That is exactly the gap I keep running into in my systems design work. We ended up on a 90-minute call. That call would not have happened without this quest. Post: [Baraka's X post](https://x.com/baraka_systems/status/example_friends)",
      },
      {
        author: "Clara van den Berg",
        handle: "@clara_storytells",
        body: "I welcomed three people who posted their origin stories this week. One of them is a filmmaker in Lagos working on exactly the kind of land documentation I want to do. We are already planning a collaboration. This is what the platform is for. Post: [Clara's LinkedIn post](https://linkedin.com/posts/example_friends)",
      },
      {
        author: "Dario Marchetti",
        handle: "@dario_regen_it",
        body: "I answered a question in the forum that had been sitting unanswered for four days. Small thing. But the person replied saying it was the first time they felt like someone had actually seen them on the platform. That is everything. Post: [Dario's Instagram post](https://instagram.com/p/example_friends)",
      },
    ],
  },
  {
    slug: "pledge-gift",
    title: "Quest 6: Pledge Your Gift",
    body: `This is our community gift registry: a living document of what ReGen Civics players bring to the Regenerative Renaissance.

To complete Quest 6:
1. Write your Gift Pledge (1-5 sentences): What gift do you bring? What would you contribute if you knew it was needed?
2. Share it below.
3. Post it publicly on social media and link to it in your comment here.

When we name our gifts, they become real. When we witness each other's gifts, a network activates.`,
    seeds: [
      {
        author: "Valentina Cruz",
        handle: "@vale_regen_mx",
        body: "My gift is translation. Not just language (I speak Spanish, English, and Nahuatl) but translation between worlds. Between indigenous land knowledge and policy language. Between local wisdom and global movements. I pledge to spend at least 2 hours a week using this gift for the Alliance. Post: [Valentina's Instagram post](https://instagram.com/p/example8)",
      },
      {
        author: "Baraka Njoroge",
        handle: "@baraka_systems",
        body: "I am a systems designer and I pledge to apply that lens to the governance challenges that regenerative land projects face. How do you make equitable decisions across a distributed land alliance? That is my question and my gift. Post: [Baraka's X post](https://x.com/baraka_systems/status/example8)",
      },
      {
        author: "Clara van den Berg",
        handle: "@clara_storytells",
        body: "I am a filmmaker and I pledge to document three land projects in the ReGen Civics Alliance over the next year. Real stories, told with care. Stories are how movements move. This is my contribution. Post: [Clara's LinkedIn post](https://linkedin.com/posts/example8)",
      },
    ],
  },
  {
    slug: "refer-land",
    title: "Quest 9: Refer a Land Project",
    body: `Land is where healing begins. This is where we celebrate every land project that finds its way into the Alliance through one of us.

To complete Quest 9:
1. Share [regencivics.earth](https://regencivics.earth) with any land project stewards you know: farms, rewilding initiatives, food forests, regenerative homesteads, community gardens, you name it.
2. Come back and comment below: share who you reached out to and why, or link to a social post inviting land projects in.

If a project you referred joins the Alliance, you earn a 2,222 $ReGen bonus.`,
    seeds: [
      {
        author: "Marisela Vega-Torres",
        handle: "@marisela_tierra",
        body: "I sent the link to the folks running Bosque de Luz, a 40-acre food forest project in Costa Rica I have been volunteering with. Also messaged three permaculture groups. Post: [Marisela's Instagram post](https://instagram.com/p/example2). Fingers crossed they apply.",
      },
      {
        author: "Callum Ashford",
        handle: "@callum_rewild",
        body: "Shared this with the Dartmoor Wilder Grazing project in the UK. They are doing incredible work with mob-grazing and native tree planting. Also sent to two community land trust networks I am part of. Post: [Callum's X post](https://x.com/callum_rewild/status/example2)",
      },
      {
        author: "Preethi Sundaram",
        handle: "@preethi_farmcircles",
        body: "I run a network connecting small-scale organic farmers across South India and shared this with about 15 project leads in our WhatsApp group. Posted on LinkedIn about the referral bonus too. That alone got a lot of interest. Post: [Preethi's LinkedIn post](https://linkedin.com/posts/example2)",
      },
    ],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (DRY_RUN) {
    console.log("=== DRY RUN: no changes will be written ===\n");

    console.log("--- WILL CLEAR: forumReplies + forumPosts (all existing rows) ---\n");

    console.log("--- PART A: Anchor Posts ---");
    for (const p of ANCHOR_POSTS) {
      console.log(`[${p.categorySlug}] ${p.title}`);
    }

    console.log("\n--- PART B: Thread Stubs ---");
    for (const t of THREAD_STUBS) {
      console.log(`[${t.categorySlug}] ${t.title}`);
    }

    console.log("\n--- PART C: Quest Thread Seeds ---");
    for (const q of QUEST_THREAD_SEEDS) {
      console.log(`Thread: "${q.targetTitle}" -> ${q.seeds.length} seed comments`);
    }

    console.log("\n--- PART C: Standalone Quest Posts ---");
    for (const q of QUEST_STANDALONE_POSTS) {
      console.log(`[/${q.slug}] ${q.title} -> ${q.seeds.length} seed comments`);
    }

    const totalPosts = ANCHOR_POSTS.length + THREAD_STUBS.length + QUEST_STANDALONE_POSTS.length;
    const totalComments = QUEST_THREAD_SEEDS.reduce((s, q) => s + q.seeds.length, 0)
      + QUEST_STANDALONE_POSTS.reduce((s, q) => s + q.seeds.length, 0);
    console.log(`\nTotal posts: ${totalPosts}, Total seed comments: ${totalComments}`);
    return;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL env var is required");

  const conn = await mysql.createConnection(dbUrl);

  // Optionally wipe existing forum content (pass --clear to enable)
  if (CLEAR_FIRST) {
    console.log("Clearing existing forum posts and replies...");
    await conn.execute("DELETE FROM forumReplies");
    await conn.execute("DELETE FROM forumPosts");
    console.log("Forum cleared.\n");
  }

  // Ensure team author exists
  const [existingTeamUsers] = await conn.execute(
    "SELECT id FROM users WHERE email = 'team@regencivics.earth' LIMIT 1"
  ) as any;

  let TEAM_USER_ID: number;
  if (existingTeamUsers.length > 0) {
    TEAM_USER_ID = existingTeamUsers[0].id;
    console.log(`Using existing team user id=${TEAM_USER_ID}`);
  } else {
    const [insertRes] = await conn.execute(
      "INSERT INTO users (openId, name, email, role) VALUES (?, ?, ?, 'admin')",
      ["team@regencivics.earth", "ReGen Civics Team", "team@regencivics.earth"]
    ) as any;
    TEAM_USER_ID = insertRes.insertId;
    console.log(`Created team user id=${TEAM_USER_ID}`);
  }

  const adminId = TEAM_USER_ID;

  let postsCreated = 0;
  let commentsCreated = 0;

  // ── Part A: Anchor posts ──────────────────────────────────────────────────

  console.log("\n=== Part A: Anchor Posts ===");
  const anchorPostIds: Record<string, number> = {}; // title -> postId

  for (const post of ANCHOR_POSTS) {
    const [cats] = await conn.execute(
      "SELECT id FROM forumCategories WHERE slug = ? LIMIT 1",
      [post.categorySlug]
    ) as any;
    const catId: number = cats[0]?.id;
    if (!catId) {
      console.warn(`Skipped (no category): ${post.categorySlug}`);
      continue;
    }

    const [existing] = await conn.execute(
      "SELECT id FROM forumPosts WHERE title = ? LIMIT 1",
      [post.title]
    ) as any;

    let postId: number;
    if (existing.length > 0) {
      postId = existing[0].id;
      console.log(`Skipped (exists): ${post.title}`);
    } else {
      const [res] = await conn.execute(
        "INSERT INTO forumPosts (categoryId, authorId, title, content, isPinned) VALUES (?, ?, ?, ?, 1)",
        [catId, adminId, post.title, post.body]
      ) as any;
      postId = res.insertId;
      postsCreated++;
      console.log(`Created post #${postId}: ${post.title}`);
    }
    anchorPostIds[post.title] = postId;
  }

  // ── Part B: Thread stubs ──────────────────────────────────────────────────

  console.log("\n=== Part B: Thread Stubs ===");
  const threadPostIds: Record<string, number> = {}; // title -> postId

  for (const thread of THREAD_STUBS) {
    const [cats] = await conn.execute(
      "SELECT id FROM forumCategories WHERE slug = ? LIMIT 1",
      [thread.categorySlug]
    ) as any;
    const catId: number = cats[0]?.id;
    if (!catId) {
      console.warn(`Skipped (no category): ${thread.categorySlug}`);
      continue;
    }

    const [existing] = await conn.execute(
      "SELECT id FROM forumPosts WHERE title = ? LIMIT 1",
      [thread.title]
    ) as any;

    let postId: number;
    if (existing.length > 0) {
      postId = existing[0].id;
      console.log(`Skipped (exists): ${thread.title}`);
    } else {
      const [res] = await conn.execute(
        "INSERT INTO forumPosts (categoryId, authorId, title, content, isPinned) VALUES (?, ?, ?, ?, 0)",
        [catId, adminId, thread.title, thread.body]
      ) as any;
      postId = res.insertId;
      postsCreated++;
      console.log(`Created thread #${postId}: ${thread.title}`);
    }
    threadPostIds[thread.title] = postId;
  }

  // ── Part C: Quest seed content into existing threads ─────────────────────

  console.log("\n=== Part C: Quest Thread Seeds ===");

  for (const questSeed of QUEST_THREAD_SEEDS) {
    const postId = threadPostIds[questSeed.targetTitle] ?? anchorPostIds[questSeed.targetTitle];
    if (!postId) {
      console.warn(`Skipped quest seeds (thread not found): ${questSeed.targetTitle}`);
      continue;
    }

    for (const seed of questSeed.seeds) {
      const commentBody = `[EXAMPLE contribution - fictional account]\n\n**${seed.author}** (${seed.handle})\n\n${seed.body}`;
      const [existingReply] = await conn.execute(
        "SELECT id FROM forumReplies WHERE postId = ? AND content LIKE ? LIMIT 1",
        [postId, `%${seed.author}%`]
      ) as any;

      if (existingReply.length > 0) {
        continue;
      }

      await conn.execute(
        "INSERT INTO forumReplies (postId, authorId, content) VALUES (?, ?, ?)",
        [postId, adminId, commentBody]
      );
      commentsCreated++;
    }
    console.log(`Seeded quest comments into: ${questSeed.targetTitle}`);
  }

  // ── Part C: Standalone quest posts (Q5, Q6, Q9) ──────────────────────────

  console.log("\n=== Part C: Standalone Quest Posts ===");

  // Look up a suitable category for standalone posts (use general as fallback)
  const [generalCats] = await conn.execute(
    "SELECT id FROM forumCategories WHERE slug = 'general' LIMIT 1"
  ) as any;
  const generalCatId: number = generalCats[0]?.id;

  for (const qPost of QUEST_STANDALONE_POSTS) {
    const [existing] = await conn.execute(
      "SELECT id FROM forumPosts WHERE title = ? LIMIT 1",
      [qPost.title]
    ) as any;

    let postId: number;
    if (existing.length > 0) {
      postId = existing[0].id;
      console.log(`Skipped (exists): ${qPost.title}`);
    } else {
      const [res] = await conn.execute(
        "INSERT INTO forumPosts (categoryId, authorId, title, content, isPinned) VALUES (?, ?, ?, ?, 1)",
        [generalCatId, adminId, qPost.title, qPost.body]
      ) as any;
      postId = res.insertId;
      postsCreated++;
      console.log(`Created standalone post #${postId}: ${qPost.title} (/community/${qPost.slug})`);
    }

    for (const seed of qPost.seeds) {
      const commentBody = `[EXAMPLE contribution - fictional account]\n\n**${seed.author}** (${seed.handle})\n\n${seed.body}`;
      const [existingReply] = await conn.execute(
        "SELECT id FROM forumReplies WHERE postId = ? AND content LIKE ? LIMIT 1",
        [postId, `%${seed.author}%`]
      ) as any;

      if (existingReply.length > 0) continue;

      await conn.execute(
        "INSERT INTO forumReplies (postId, authorId, content) VALUES (?, ?, ?)",
        [postId, adminId, commentBody]
      );
      commentsCreated++;
    }
  }

  // ── Part D: Seasonal Quest Posts ─────────────────────────────────────────

  console.log("\n=== Part D: Seasonal Quest Posts ===");

  const SEASONAL_QUEST_POSTS: { season: string; title: string; body: string }[] = [
    // Spring
    {
      season: "spring",
      title: "Seasonal Quest: Healing the Five Bodies",
      body: `Most healing traditions recognize multiple layers of who we are: Soul, Physical, Emotional, Mental, and Spiritual. This quest invites you to design a daily and seasonal practice that tends to all five, with both masculine and feminine lenses.

What practice are you building? What has surprised you about working with all five bodies at once?`,
    },
    {
      season: "spring",
      title: "Seasonal Quest: Study Natural Hygiene",
      body: `Natural hygiene is the tradition that argues human health is created by clean air, pure water, vital foods, rest, sunlight, and right relationship. Spend one month studying this tradition and documenting how your understanding of your own body shifts.

What are you discovering? What contradicts what you were taught?`,
    },
    {
      season: "spring",
      title: "Seasonal Quest: Launch a Community Currency",
      body: `Research existing community currencies (SEEDS, Sarafu, Bristol Pound, BerkShares). Design and help coordinate the launch of a currency for your community or bioregion. Document the design process and the launch.

What currency are you drawing inspiration from? What does your community need that money doesn't provide?`,
    },
    // Summer
    {
      season: "summer",
      title: "Seasonal Quest: Friendship with a Free Animal",
      body: `Build a genuine friendship with a wild or semi-wild animal. Not taming. A real friendship built on mutual trust, where the animal chooses to be in relationship with you. Document the relationship as it develops.

What animal have you chosen to build a relationship with? What are you learning about attention and patience?`,
    },
    {
      season: "summer",
      title: "Seasonal Quest: Your Honey Moon",
      body: `For one full moon cycle, reduce your diet to primarily raw honey and bee pollen, supplemented with water, herbal teas, and small amounts of whole foods as needed. Document what changes in your body, mind, mood, and clarity over the lunar cycle.

What are you noticing in the first days of the practice?`,
    },
    {
      season: "summer",
      title: "Seasonal Quest: Singing to Your Food Forest",
      body: `Plants respond to sound. Develop a regular practice of singing to your garden, food forest, or the woods near you. Invent songs. Use songs you know. Document what it does to your relationship to the land and to yourself.

What are you singing? What has changed in how you relate to the plants you tend?`,
    },
    {
      season: "summer",
      title: "Seasonal Quest: Animal Spirit Totems and Bioregional Clan",
      body: `Research the animals, plants, fungi, and elements most significant in your bioregion. Identify which ones you feel most called to. Learn about them deeply and create something that expresses this connection.

Which animals or plants are you drawn to? What are you discovering about your bioregional identity?`,
    },
    // Fall
    {
      season: "fall",
      title: "Seasonal Quest: Future Casting",
      body: `Travel forward in time to a thriving regenerative future. Experience it fully. Come back and write a sensory, specific story of a real day in that future. Share your account so together we build a living collective vision of what we are moving toward.

What did you see in your future? What surprised you about where life had gone?`,
    },
    {
      season: "fall",
      title: "Seasonal Quest: Eating Sunlight",
      body: `For one full month, eat at least one item daily that goes directly from a living plant into your mouth with no processing, cooking, or storage in between. Document what you notice about the difference.

What are you eating directly from the source? What does it feel like to close that loop?`,
    },
    {
      season: "fall",
      title: "Seasonal Quest: Becoming Trauma Informed",
      body: `Watch [Gabor Mate's trauma masterclass](https://www.youtube.com/playlist?list=PL3Xi8vZSmBTRlD8Dnx6a16yeBTaSxKNdS) in full. Apply what you learn to your understanding of yourself, your family history, and the communities you are part of. Write a reflection on how this changes your understanding and practice.

What shifted for you in watching this? What does this change about how you show up in your work?`,
    },
    // Winter
    {
      season: "winter",
      title: "Seasonal Quest: Write a Children's Book",
      body: `Write a children's book about a day in the life of a regenerative civilization. Not a utopian lecture. A story. What does a child experience in a world where food grows everywhere and communities are designed around flourishing?

What story are you telling? Share your drafts and we'll help you make it real.`,
    },
    {
      season: "winter",
      title: "Seasonal Quest: Make a Song for the ReGeneration",
      body: `Write and record a song about regeneration for our shared Hymns for the ReGeneration album. It does not need to be polished. It needs to be real. Any instrument, any genre, any length.

What are you making? Share your song here and in the audio threads.`,
    },
    {
      season: "winter",
      title: "Seasonal Quest: Recreate Your Personal Cycles",
      body: `Study the natural cycles that govern life: lunar, solar, seasonal, circadian, the 13-moon calendar. Map your own energy across at least one full lunar cycle and design a personal calendar that aligns with natural rhythms.

What cycles are you working with? What did you discover about when your energy is strongest?`,
    },
    // Anytime
    {
      season: "anytime",
      title: "Anytime Quest: Decrease Expenses, Increase Joy",
      body: `Track your spending for one month. Identify purchases that did not actually increase your joy or wellbeing. Replace at least three of them with alternatives that cost less and feel better.

What are you discovering about your spending? What did you replace and how did it feel?`,
    },
    {
      season: "anytime",
      title: "Anytime Quest: Hermetic Seal",
      body: `A period of conscious redirection of sexual energy into creative work, projects, healing, or spiritual practice. An experiment in energy direction, not a moral judgment. Document what changes in your focus, creativity, and vitality.

What are you channeling this energy toward? What is opening up as a result?`,
    },
    {
      season: "anytime",
      title: "Anytime Quest: Start a Friend Pool",
      body: `Gather 3 to 10 friends and pool some resources toward meeting your group's shared needs. A shared grocery run, a skill swap circle, a tool library, or a shared savings fund. Practice collective resource management at a small scale.

What kind of pool did you start? How did you set up the agreements?`,
    },
    {
      season: "anytime",
      title: "Anytime Quest: Present Parenting",
      body: `If you have a child in the first three years of life, this is an invitation to prioritize presence over productivity. Whatever it takes, give your child at least 8 hours per day of genuine attentive presence. This is a Hero Quest: significant, demanding, and deeply meaningful.

What systems and support are you building to make this possible? What are you observing in your child and yourself?`,
    },
    {
      season: "anytime",
      title: "Anytime Quest: The Fifth Agreement",
      body: `Read [The Fifth Agreement](https://www.donmiguelruiz.com/the-fifth-agreement/) by Don Miguel Ruiz and Don Jose Ruiz. Join the monthly book club on the forum to discuss how it applies to the Regenerative Renaissance. Then share your perspective as an article, video, or voice recording.

What agreements did you discover you were already living under? What do you want to change?`,
    },
  ];

  // We'll put seasonal quest posts in the "quests-gameplay" category
  const [questsCats] = await conn.execute(
    "SELECT id FROM forumCategories WHERE slug = 'quests-gameplay' LIMIT 1"
  ) as any;
  const questsCatId: number = questsCats[0]?.id;

  if (questsCatId) {
    for (const sPost of SEASONAL_QUEST_POSTS) {
      const [existing] = await conn.execute(
        "SELECT id FROM forumPosts WHERE title = ? LIMIT 1",
        [sPost.title]
      ) as any;

      if (existing.length > 0) {
        console.log(`Skipped (exists): ${sPost.title}`);
      } else {
        const [res] = await conn.execute(
          "INSERT INTO forumPosts (categoryId, authorId, title, content, isPinned) VALUES (?, ?, ?, ?, 0)",
          [questsCatId, adminId, sPost.title, sPost.body]
        ) as any;
        postsCreated++;
        console.log(`Created seasonal quest post #${res.insertId}: ${sPost.title}`);
      }
    }
  } else {
    console.warn("Skipped seasonal quest posts: quests-gameplay category not found");
  }

  // ── Part E: EPIC Quest Posts ──────────────────────────────────────────────

  console.log("\n=== Part E: EPIC Quest Posts ===");

  // Create epic-quests category if it doesn't exist
  let epicCatId: number | null = null;
  const [epicCats] = await conn.execute(
    "SELECT id FROM forumCategories WHERE slug = 'epic-quests' LIMIT 1"
  ) as any;

  if (epicCats.length > 0) {
    epicCatId = epicCats[0].id;
  } else {
    const [epicCatRes] = await conn.execute(
      "INSERT INTO forumCategories (slug, name, description, sortOrder) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)",
      ["epic-quests", "Epic Quests", "Collective transformation acts. These quests change landscapes.", 99]
    ) as any;
    epicCatId = epicCatRes.insertId;
    console.log(`Created epic-quests category #${epicCatId}`);
  }

  const EPIC_QUEST_POSTS: { tier: string; title: string; body: string }[] = [
    // Intro post
    {
      tier: "intro",
      title: "EPIC Quests -- Long-form challenges for committed regenerators",
      body: `EPIC Quests are multi-month commitments. They are not for everyone, and that is intentional.

They come in three tiers: Easy, Hard, and Expert. Easy mode still requires real coordination and commitment. Hard mode involves transforming land, buildings, or communities. Expert mode is the long game: settlement design, systemic change, civilisation-level work.

These quests are designed primarily for land stewards, community builders, and dedicated practitioners who are ready to take on something that will stretch them. But anyone with the drive and the right circumstances can attempt one.

Check the [Quest page](/quests) for the full EPIC Quest section, with all tiers laid out. Come back here to share your progress, ask questions, and connect with others working on similar challenges.

What are you considering attempting?`,
    },
    // Easy Mode
    {
      tier: "easy",
      title: "EPIC Quest (Easy): Block Food Forest",
      body: `Coordinate the overnight transformation of a street in your city. Host an event where neighbours each bring potted plants, fruit trees, and garden beds, and together you redesign a street as a forest garden for a day.

Who is interested in coordinating something like this in their city? Share your location and let's connect people who are ready to do this together.`,
    },
    {
      tier: "easy",
      title: "EPIC Quest (Easy): Networked Community Garden",
      body: `Coordinate with neighbours for each household to offer some space on their property for a collective garden. Multiple small plots connected into one shared network. Or adopt a vacant lot. Design the shared governance from the start.

What does your neighbourhood look like for this kind of coordination? What governance model are you considering?`,
    },
    {
      tier: "easy",
      title: "EPIC Quest (Easy): Bioregional Currency Launch",
      body: `Design and launch a community currency for your neighbourhood or bioregion. Host a launch party. Invite people to transact in it. Document the design, the launch, and the first real uses.

What currencies are you researching? What does your community's economy need that existing systems are not providing?`,
    },
    // Hard Mode
    {
      tier: "hard",
      title: "EPIC Quest (Hard): Cornfield to Cloud Forest",
      body: `Transform a conventional agricultural field into a functioning food forest ecosystem. Full documentation from start to finish: soil testing, design, planting plan, community involvement, and before and after.

Where is the land? What is the timeline? Who else needs to be involved for this to work?`,
    },
    {
      tier: "hard",
      title: "EPIC Quest (Hard): Pasture to Paradise",
      body: `Transform degraded pasture land into a diverse, productive, thriving food forest and wildlife habitat. A multi-year project. Document the whole arc.

What is the land like now? What does the final vision look like? Who is stewarding it?`,
    },
    {
      tier: "hard",
      title: "EPIC Quest (Hard): HOA to Village",
      body: `Transform a conventional homeowners association into a functioning village with shared resources, governance, food production, and care networks. Document the governance design and the transition process.

What HOA or neighbourhood community are you working with? What is the biggest obstacle to making this shift?`,
    },
    {
      tier: "hard",
      title: "EPIC Quest (Hard): Retreat Center",
      body: `Design and build a retreat center on or near a land project in the network. The center serves as a base for quests, ceremonies, community gatherings, and healing work.

What land are you working with? What design principles are guiding the center? Who is the community it will serve?`,
    },
    {
      tier: "hard",
      title: "EPIC Quest (Hard): Golf Course Transformation",
      body: `Coordinate the transformation of a golf course into a food forest, wildlife corridor, or community land project. This requires coalition building with local government and community groups. Document everything.

What golf course are you working with? What coalition do you need to build? What is the timeline?`,
    },
    {
      tier: "hard",
      title: "EPIC Quest (Hard): Apartment Building Transformation",
      body: `Transform a conventional apartment building into a regenerative living community with shared food growing, governance, and mutual support. Document the process and the agreements.

What building or housing community are you working with? What does the governance model look like?`,
    },
    // Expert Mode
    {
      tier: "expert",
      title: "EPIC Quest (Expert): Startup Town",
      body: `Coordinate the design and establishment of a new settlement built from the ground up on regenerative principles. Land access, governance design, food systems, energy systems, waste systems, cultural life. The long game. Document every step.

Where is this happening? Who is the founding group? What is the land situation? This thread is for serious conversations about building new settlements from scratch.`,
    },
  ];

  if (epicCatId) {
    for (const ePost of EPIC_QUEST_POSTS) {
      const [existing] = await conn.execute(
        "SELECT id FROM forumPosts WHERE title = ? LIMIT 1",
        [ePost.title]
      ) as any;

      if (existing.length > 0) {
        console.log(`Skipped (exists): ${ePost.title}`);
      } else {
        const [res] = await conn.execute(
          "INSERT INTO forumPosts (categoryId, authorId, title, content, isPinned) VALUES (?, ?, ?, ?, 0)",
          [epicCatId, adminId, ePost.title, ePost.body]
        ) as any;
        postsCreated++;
        console.log(`Created EPIC quest post #${res.insertId}: ${ePost.title}`);
      }
    }
  }

  await conn.end();
  console.log(`\nDone. Posts created: ${postsCreated}, Comments added: ${commentsCreated}`);
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
