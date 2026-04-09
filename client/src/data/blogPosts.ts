/**
 * Blog Posts Data
 * Contains all blog post content for the ReGen Civics blog
 */
import { cdnImg } from "@/lib/utils";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  readTime: string;
  image: string;
  tags: string[];
  featured?: boolean;
  isVideo?: boolean;
  videoUrl?: string;
  videoDuration?: string;
}

export const blogPosts: BlogPost[] = [
  {
    id: 'food-producers-first',
    slug: 'food-producers-first',
    title: 'Why Food Producers First',
    excerpt: 'Food producers are where a regenerative economy actually anchors. Food is the daily, local, repeatable transaction that couples a currency to real regenerative work.',
    content: `Food producers are where a regenerative economy actually anchors.

Food is the daily, local, repeatable transaction that couples a currency to real regenerative work. Every meal a household eats is a vote for a soil practice, a labor relationship, a watershed, a way of being on land. Money that flows alongside food flows through every layer of the regenerative stack: the seed saver, the grower, the courier, the cook, the eater, and the neighbor who comes back tomorrow.

This is why ReGen Civics begins with food producers.

## The 2017 sketch

A sketch from 2017 still holds up. A grower sells food to a courier. The courier delivers to a cook. The cook feeds an eater. The eater is also a neighbor who comes back. The cycle repeats. Alongside the food, $ReGen circulates with each handoff. The currency is not separate from the food. The currency tracks the food.

![The 2017 sketch of a peer-to-peer food economy](/images/economy/p2p-food-system-2017.webp)

## A farmer joining today

Here is what a farmer who finds ReGen Civics today actually does, in order:

1. Sign up. Two minutes. No wallet required for the first step.
2. Claim a handle. Pick a short name. This is how the rest of the community thanks you.
3. Connect to your nearest bioregion node. We list active land projects on the map. Find the one closest to you. Send a message.
4. Complete the Welcome Aboard quest. Ten short steps. Each one teaches you a piece of how the system works.
5. List your first offering. Could be a CSA share, a market day, a single jar of honey. The size doesn't matter.
6. Receive your first gratitude. Someone will thank you in the forum or on your profile. That's not just a nice gesture. It writes to the gratitude log and counts toward the season harvest.
7. Appear on the Living Tree. Once you have a few completed quests and one offering listed, your project shows up on the visualization that maps the whole network.

## Three days, three people

**The grower (Maya, near Asheville).** Wakes up, checks the day's harvest, posts the available shares to her local channel. By afternoon she's packed three CSA boxes for couriers and one bulk order for a co-op kitchen. Each transaction is logged. At the end of the cycle, the gratitude she received from eaters compounds into her contribution score for the season.

**The courier-cook (Jordan, in Detroit).** Picks up boxes from three growers in a single morning loop, drops them at the kitchen, and starts prep for tonight's communal dinner. Jordan is paid in dollars for the transport and in $ReGen for the regenerative work the meal enables. The meal feeds twenty people who would otherwise eat industrial food.

**The eater and neighbor (Priya, in Brooklyn).** Eats dinner at the community kitchen. Sends gratitude to Jordan and to Maya. Picks up next week's CSA box. Comes back the following week with a friend. Her gratitude budget compounds when she shows up consistently, so her thanks carries more weight.

## Why this works

The reason food producers go first is structural.

Food is daily. The transaction repeats. A currency that circulates with food gets exercised constantly. The demand is already there. People are already eating. Food is already happening.

Food is local. The regenerative gain is real. Soil that holds more carbon, water that runs cleaner, livelihoods that stay in the watershed. None of this is speculative. It is observable.

Food is shared. The supply chain is short and visible. Every link in the chain knows the others. That is the social fabric a regenerative currency needs to be honest.

Start where the economy is already real. Build out from there.

## What's next

If you grow food, list your project. If you cook food, find a grower. If you eat food, find a community kitchen and start showing up. Each role plugs into the same system from a different angle.

The grower's path: [/land](/land)
The cook and courier path: [/play](/play)
The eater and neighbor path: [/community](/community)

This is how a regenerative economy actually anchors. One meal at a time.`,
    author: 'Rieki Cordon',
    date: '2026-04-08',
    readTime: '8 min',
    image: '/images/economy/p2p-food-system-2017.webp',
    tags: ['Food Systems', 'Local Economy', 'Regenerative Producers'],
    featured: true,
  },
  {
    id: '1',
    slug: 'what-makes-regen-civics-different',
    title: 'What Makes ReGen Civics Different: 7 Unique Features of Our Regenerative Platform',
    excerpt: 'When we set out to build ReGen Civics, we knew we were not just creating another investment platform. Here are seven features that set our approach apart.',
    content: `When we set out to build ReGen Civics, we knew we were not just creating another investment platform or another incubator program. We were designing an entirely new way for humans to organize, fund, and grow regenerative land projects together.

Here are seven features that set ReGen Civics apart from anything else in the regenerative space.

## 1. The Infinite Game Framework

Most programs have a beginning and an end. You apply, you participate, you graduate, and then you are on your own. ReGen Civics flips this model entirely.

We designed our platform around the concept of an "Infinite Game," inspired by James P. Carse's philosophy. In finite games, players compete to win and the game ends. In infinite games, players play to keep playing, and the goal is to continue the game forever evolving into growing diversity of more beautiful and regenerative societies.

## 2. Dual Token Economy: Voice and Value

Traditional investment models force a false choice: either you have money and therefore power, or you contribute time and energy but have no say. ReGen Civics solves this with our dual token system.

**RVoice Tokens** represent your voice in governance. You earn them by showing up, contributing, completing quests, and participating in the community.

**ReGen Tokens** represent regenerative value creation. These flow to projects and participants who demonstrate measurable positive impact on land, community, and ecosystems.

## 3. Seasonal Rhythm Aligned with Nature

We do not operate on arbitrary fiscal quarters or academic semesters. ReGen Civics follows the rhythm of the seasons, beginning each major cycle at an Equinox or Solstice.

Season 2 begins at the September Equinox 2026, offering 13 weeks of intensive support that mirrors the growing season.

## 4. Quest-Based Learning and Contribution

Instead of passive webinars or one-way content delivery, ReGen Civics uses a quest system inspired by role-playing games. Each quest is a real-world challenge that advances both your personal growth and your project's development.

## 5. Alliance Network Architecture

ReGen Civics is not a single organization but an alliance of interconnected entities including Land Projects, Alliance Partners, Impact Investors, and ReGen Players.

## 6. Transparent, Participatory Governance

Every decision in ReGen Civics happens through our Decentralized Human Organization (DHO). This is not governance theater; it is real participatory democracy.

## 7. SEEDS Legacy Recognition & 10+ Years

Many of our community members participated in the SEEDS ecosystem before ReGen Civics emerged. We believe that contribution should be honored, not forgotten. We learned a lot on that journey that started June Solstice 2017. Explore more about this journey in the next blog post!

Welcome to the Infinite Game.`,
    author: 'ReGen Civics Team',
    date: 'Jan 30, 2025',
    readTime: '7 min read',
    image: cdnImg('https://assets.regencivics.earth/aVsQKWGuwteoFgZN.jpg'),
    tags: ['Platform Features', 'Regenerative Finance', 'Infinite Game'],
    featured: true,
    isVideo: false
  },
  {
    id: '2',
    slug: 'remembering-season-1',
    title: 'Remembering Season 1: The First 16 Regenerative Land Projects',
    excerpt: 'A look back at the pioneering land projects that launched the ReGen Civics movement, from California to Costa Rica, Portugal to Ecuador.',
    content: `In the spring of 2022, something remarkable began. Sixteen regenerative land projects from around the world came together for what would become the first season of ReGen Civics.

Watch the full video to hear the stories of these pioneering projects and the lessons they learned along the way.

## The Pioneers

The Season 1 cohort represented an incredible diversity of approaches to regenerative land stewardship across North America, Central America, South America, and Europe.

## What We Learned

Season 1 was as much about learning as it was about doing. We discovered that diversity is strength, trust takes time, governance matters, and nature sets the pace.

## The Legacy

Many Season 1 projects continue to thrive today. Some have become mentors for newer projects. All of them contributed to the collective wisdom that now informs ReGen Civics.

To all the Season 1 land stewards: thank you for being the first to play this game with us.`,
    author: 'ReGen Civics Team',
    date: 'Jan 30, 2025',
    readTime: '1 hr 22 min watch',
    image: cdnImg('https://assets.regencivics.earth/FKGvozofwEQExNFn.jpg'),
    tags: ['Season 1', 'Land Projects', 'Video'],
    featured: false,
    isVideo: true,
    videoUrl: 'https://www.youtube-nocookie.com/embed/AJZI0OiRPeU',
    videoDuration: '1:22:00'
  },
  {
    id: '3',
    slug: 'remembering-our-roots',
    title: 'Remembering Our Roots: A Brief History of SEEDS',
    excerpt: 'From a bold question to a global movement. The story of how SEEDS began, crashed, and rose again with a new vision for regenerative economics.',
    content: `Every movement has an origin story. Ours begins with a question that seemed almost naive in its ambition: What if we could design an economic system that rewards regeneration instead of extraction?

Watch the short video above or enjoy the [whole journey here](https://youtu.be/YrNw_PdJd68?si=RipVLOIHSq5VZVYE) to learn about the journey of SEEDS and how it evolved into ReGen Civics.

## The Birth of SEEDS

SEEDS (Sowing Ecological, Economic, and Democratic Systems) emerged from the intersection of several movements: cryptocurrency innovation, regenerative agriculture, local food systems, permaculture philosophy, and participatory governance.

## The Experiment

At its peak, SEEDS had thousands of members across dozens of countries. People were earning tokens by planting trees, cleaning rivers, teaching permaculture, and building community and over 400 democratic community formed and governed proposals in a massive learning journey in large scale decentralised governance.

## Our Renewed Focus

Rather than abandoning the mission, the SEEDS community evolved. We shifted to the foundations, once SEEDS had built the tools we needed to ground those tools in the "on the ground" communities that needed them most and that's where we come in. The lessons learned became the foundation for ReGen Civics. The relationships built became the network. The vision refined itself through failure.

## The Continuation

ReGen Civics is not a replacement for SEEDS. It is part of the wider mission with a more focused commitment to regenerative land projects and food systems. We carry forward the dream of an economy that serves life.

To everyone who was part of SEEDS: your contributions matter. Your vision lives on. The seeds you planted are still growing and we invite you to [claim some ReGen Game tokens following the process here](/game).`,
    author: 'ReGen Civics Team',
    date: 'Jan 30, 2025',
    readTime: '27 min watch',
    image: cdnImg('https://assets.regencivics.earth/oOytrvQMLUZiZzfH.jpg'),
    tags: ['SEEDS', 'History', 'Video'],
    featured: false,
    isVideo: true,
    videoUrl: 'https://www.youtube-nocookie.com/embed/h2K_f-E4hJM',
    videoDuration: '27:00'
  },
  {
    id: '4',
    slug: 'regen-civics-runs-on-base',
    title: 'ReGen Civics Runs on Base: Why We Chose Coinbase\'s Blockchain via Hypha DAO',
    excerpt: 'Our governance and treasury now live on Base, Coinbase\'s Layer 2 blockchain. Here\'s why this matters for regenerative finance and transparent decision-making.',
    content: `When building infrastructure for a regenerative economy, every choice matters. That is why we are excited to share that ReGen Civics now runs on Base, Coinbase's Layer 2 blockchain, through our partnership with Hypha DAO.

## Why Blockchain for Regeneration?

Some might wonder: why does a regenerative land project alliance need blockchain technology? The answer lies in three core values that blockchain enables better than any traditional system.

**Transparency**: Every proposal, every vote, every treasury movement is visible on-chain. No backroom deals. No hidden agendas. Just open, verifiable governance.

**Participation**: With Hypha's intuitive interface, anyone can submit proposals, vote on decisions, and track the flow of resources. You do not need to be a crypto expert to participate.

**Permanence**: Decisions made on-chain cannot be erased or altered. This creates an immutable record of our collective journey, a living history that future generations can learn from.

## Why Base?

Base is a Layer 2 blockchain built by Coinbase, one of the most trusted names in cryptocurrency. Here is why it is perfect for ReGen Civics:

**Low Fees**: Layer 2 technology means transaction costs are a fraction of what they would be on Ethereum mainnet. This makes participation accessible to everyone, not just those who can afford high gas fees.

**Speed**: Transactions settle in seconds, not minutes. When you vote on a proposal or submit a contribution, you see the results immediately.

**Security**: Base inherits Ethereum's security while adding Coinbase's institutional-grade infrastructure. Your governance tokens and treasury funds are protected by battle-tested technology.

**Mainstream Bridge**: Coinbase's involvement means easier onboarding for newcomers. It provides a direct path from national currencies into the currencies of our Regenerative Renaissance.

## How Hypha Makes It Work

Hypha DAO provides the governance layer that sits on top of Base. Think of it as the user-friendly interface that makes blockchain participation accessible to everyone.

Through Hypha, you can:

- **Submit Proposals**: Have an idea for improving ReGen Civics? Write it up and submit it for community review.
- **Vote on Decisions**: Use your RVoice tokens to support or oppose proposals. Every voice matters.
- **Track Treasury**: See exactly where funds are flowing, from investor contributions to land project support.
- **Earn Recognition**: Your contributions are recorded on-chain, building a permanent record of your participation.

## The 90% Unity Threshold

One unique aspect of our governance is the 90% unity requirement for major decisions. This is not about majority rule; it is about building genuine (near)consensus.

When 90% of active participants agree on a direction, we know we have achieved something close to collective wisdom. This high bar ensures that decisions truly serve the whole community, not just a vocal minority.

## What This Means for You

Whether you are an investor, a land project steward, an alliance partner, or a ReGen player, blockchain governance means:

- Your voice is heard and recorded
- Your contributions are recognized permanently
- Your trust is earned through transparency
- Your participation shapes the future

## Explore Our DAO

Ready to see blockchain governance in action? Visit our Hypha dashboard to explore proposals, view treasury movements, and understand how decisions are made.

[Visit ReGen Games on Hypha](https://app.hypha.earth/en/dho/regen-games/)

The future of regenerative finance is transparent, participatory, and built on technology that serves life. Welcome to governance that actually works.`,
    author: 'ReGen Civics Team',
    date: 'Jan 31, 2025',
    readTime: '6 min read',
    image: cdnImg('https://assets.regencivics.earth/VeoRFkowiirBeXAr.jpg'),
    tags: ['Blockchain', 'Governance', 'Hypha DAO', 'Technology'],
    featured: false,
    isVideo: false
  },
  {
    id: '5',
    slug: 'what-if-organizations-met-needs',
    title: 'What If Organizations Were Actually Designed to Meet Human Needs?',
    excerpt: 'Too often we hear "that doesn\'t belong at work." But what if organizations started with the express goal of meeting their members\' needs together?',
    content: `What if organizations were actually designed to meet the needs of people?

Too often we hear the phrase "that doesn't belong at work" when human needs are being expressed in our organizational environments. Most organizations are designed to meet the needs of an "economy" with the singular goal of providing a product or service for profit, often to the detriment of the people involved.

## Imagine Something Different

Picture this: An organization starts when a group of humans come together with the express goal of meeting their needs together.

For example, seven friends who already love being and creating things together decide they want to start a "village organization." It begins with them collectively identifying all their shared:

1. **NEEDS**
2. **RESOURCES**
3. **POTENTIAL**

Let's take these one at a time.

## 1. NEEDS: The Foundation

Needs are the most simple starting point because, objectively, humans share a set of biological needs. We can start with this universal list and augment it to meet the specific nuances of each group.

Now the group can visualize and identify what their actual needs are and what they are working to meet together. This is not about profit margins or market share. It is about water, food, shelter, belonging, purpose, and growth.

When needs are visible, they become addressable. When they are hidden, they fester.

## 2. RESOURCES: Beyond Money

One powerful tool here is the "8/9/10 forms of capital" framework, where financial capital (stocks, money, etc.) is simply one form among many.

Consider the full spectrum:

- **Financial Capital**: Money, investments, credit
- **Material Capital**: Tools, buildings, land, infrastructure
- **Living Capital**: Soil, water, ecosystems, biodiversity
- **Social Capital**: Relationships, trust, community connections
- **Intellectual Capital**: Knowledge, skills, ideas, patents
- **Experiential Capital**: Wisdom from lived experience
- **Spiritual Capital**: Meaning, purpose, connection to something greater
- **Cultural Capital**: Traditions, stories, shared practices

Now the group can visualize a much fuller extent of the resources they share together. Suddenly, the person who "only" brings deep community connections is recognized as wealthy. The elder who "only" brings decades of wisdom is seen as a vital resource.

## 3. POTENTIAL: Dreams Made Visible

What are the unique skills, passions, and dreams each member brings? What could this group become if everyone's potential was nurtured and expressed?

This is where the magic happens. When needs are clear and resources are mapped, potential becomes achievable. Dreams stop being fantasies and start being plans.

## Why This Matters for ReGen Civics

This needs-based approach is exactly what we are building at ReGen Civics. Our Contribution Calculator recognizes eight forms of capital. Our governance ensures every voice is heard. Our seasonal structure creates space for both doing and being.

We are not just funding land projects. We are prototyping a new way of organizing human activity, one that starts with what people actually need and builds from there.

## The Invitation

What would your organization look like if it started with needs instead of profits? What resources does your community already have that go unrecognized? What potential is waiting to be unlocked?

These are not rhetorical questions. They are design prompts for a different kind of future.

The regenerative renaissance begins when we remember that organizations exist to serve people, not the other way around.`,
    author: 'Rieki Cordon',
    date: 'Jan 31, 2025',
    readTime: '5 min read',
    image: cdnImg('https://assets.regencivics.earth/qdJyCSVJGfSsRmxE.jpg'),
    tags: ['Organization Design', 'Human Needs', 'Forms of Capital', 'Philosophy'],
    featured: false,
    isVideo: false
  },
  {
    id: '6',
    slug: 'great-american-chestnut-abundance',
    title: 'The Great American Chestnut: A Story of Abundance Lost and Hope Restored',
    excerpt: 'What if I told you that a single tree species once provided more food than all of modern American agriculture combined? This is the story of the American Chestnut.',
    content: `My entire worldview just shifted, and I need to share.

While researching bioregional-scale regenerative economies, I learned something absolutely mind-boggling. I intuitively knew this truth; I just did not realize how extreme it was.

## The Comparison That Changed Everything

I was comparing human-designed food production systems versus systems designed by humans working with animals, microbiology, and natural processes.

## The Mind-Blowing Discovery

[FOOD_PRODUCTION_INFOGRAPHIC]

**What really blew my mind** was learning that a single mature American Chestnut Tree (which used to dominate the forests of Eastern US) produces around 3,000 pounds of chestnut fruit per acre. These chestnuts are an incredibly nutritious and complete food source.

Then I learned there were once 3-4 BILLION of these trees in US forests.

I did the math. I had to do it three times to verify.

And this is before we even consider the oaks (acorns), paw paws (an epic mango-like fruit), and hundreds of other food-producing species thriving in these ancient forests.

## What Happened?

There are fewer than 10,000 Great American Chestnut trees alive today. How did we go from 4 billion to near extinction?

**The Salmon**: We dammed the rivers and stopped the salmon from bringing ocean nutrients (like nitrogen, which fruiting plants need) deep into forests. Native Americans said the salmon were once "so numerous you could cross the river on their backs."

**The Beavers**: We hunted them for their fur (colonizers loved those fancy fur hats). This stopped them from managing the water cycles. Beavers created slower, flatter water terrain that allowed salmon to travel even deeper into forests, meadows, and landscapes. Population then: 300+ million. Population now: fewer than 13 million.

**The Bears**: We hunted them for their skin, flesh, sport, and because we saw them as competition (eating "our" salmon!). This stopped them from carrying salmon deep into the forests from the rivers and nurturing those chestnut trees. Bears are natural food foresters, and they do an epic job! If a bear can eat it, we can too. Population then: 2+ million. Population now: fewer than 300,000.

**The Whales, Deer, Foxes, Eagles, Birds**: So many others came together to co-create food abundance and ecosystem health.

[ANIMAL_POPULATION_INFOGRAPHIC]

## The Truth We Already Knew

The abundance of nature, with her billions of years of technological evolution, does a better job than our few centuries of "progress."

Nature is billions of years of perfected evolution. Human egos like to think they know best, but they do not, and then trillions of beings pay for it. Half of all life has disappeared since industrialization. This is proof positive that humans do not know what they are doing and should be looking to nature to see how things should be done.

## The Hope

Here is the beautiful part: restoration is possible. The American Chestnut Foundation and other organizations are working to bring back blight-resistant chestnuts. Beaver reintroduction programs are restoring watersheds. Salmon runs are being revived.

And regenerative land projects, like those in the ReGen Civics alliance, are demonstrating that humans can work WITH nature instead of against it.

## What This Means for ReGen Civics

This is why we do what we do. Every land project in our alliance is working to restore the kind of abundance that once existed naturally. Not through more technology and control, but through partnership with the living systems that know how to create abundance.

We are not alone in our quest to heal Earth. The salmon, the beavers, the bears, the chestnuts, they are all waiting for us to remember how to be good partners.

The question is not whether we CAN restore abundance. The question is whether we WILL.

**Then vs Now:**
- Bears: 2 Million+ THEN, fewer than 300k NOW
- Beavers: 300 Million+ THEN, fewer than 13 Million NOW
- Salmon: Abundant THEN, Endangered NOW
- Chestnut: 3-4 Billion THEN, fewer than 10k NOW (Near Extinction)

The seeds of restoration are already planted. Will you help them grow?`,
    author: 'Rieki Cordon',
    date: 'Jan 31, 2025',
    readTime: '6 min read',
    image: cdnImg('https://assets.regencivics.earth/tqNnBHJUPspoSTxQ.jpg'),
    tags: ['Ecology', 'Abundance', 'Restoration', 'Nature'],
    featured: false,
    isVideo: false
  },
  {
    id: '7',
    slug: 'introducing-games-and-quests',
    title: 'Introducing Games and Quests: Play Your Way to Regeneration',
    excerpt: 'Discover how ReGen Civics transforms regenerative action into an engaging game experience. Learn about quests, tokens, and how playing can change the world.',
    content: `Welcome to the Infinite Game! In this video, we introduce you to the heart of ReGen Civics: our Games and Quests system.

Watch the video above to discover how we have transformed regenerative action into an engaging, playful experience that rewards participation and creates real-world impact.

## What Are ReGen Games?

ReGen Games is not just a metaphor. It is a fully designed game system where your actions in the real world earn you recognition, tokens, and influence in our regenerative alliance.

Think of it like a role-playing game, but instead of fighting dragons, you are:

- **Planting trees** and restoring ecosystems
- **Building community** and strengthening connections
- **Learning skills** that serve regeneration
- **Contributing capital** in its many forms
- **Governing together** through participatory democracy

## The Quest System

Quests are structured challenges that guide your journey through the ReGen Civics ecosystem. Each quest has clear objectives, rewards, and learning outcomes.

**Starter Quests** help newcomers understand the basics:
- Create your player profile
- Connect your Base blockchain account
- Attend your first community call
- Complete the Contribution Calculator

**Season Quests** align with our 13-week seasonal cycles:
- Submit a land project application
- Complete due diligence on a project
- Participate in governance votes
- Mentor a fellow player

**Epic Quests** represent major achievements:
- Launch a Minimum Viable Economy
- Bring a new alliance partner into the network
- Complete a full seasonal journey

## Earning Tokens Through Play

As you complete quests and contribute to the alliance, you earn two types of tokens:

**RVoice Tokens** represent your voice in governance. The more you participate, the more say you have in how ReGen Civics evolves.

**RGen Tokens** represent regenerative value creation. These flow to those who demonstrate measurable positive impact.

## Why Games?

Why did we design ReGen Civics as a game? Because games are one of humanity's oldest technologies for:

- **Learning** complex systems through play
- **Motivating** sustained engagement over time
- **Building** community through shared experiences
- **Celebrating** achievements and milestones
- **Making friends** (many games are cooperative, getting outside, going on grand adventures)

The challenges facing our planet are serious, but that does not mean the solutions have to be joyless. We believe that play and purpose can coexist, and that the most effective movements are also the most engaging. Also explore the rites of passage quests that can be found at [/quest](/quest).

## Join the Game

Ready to start playing? Here is how to begin:

1. **Create your Player Profile** at [/profile](/profile)
2. **Connect your Base account** through Hypha DAO
3. **Complete your first quest** by attending an Open Session
4. **Explore the Quest Board** at [/quest](/quest) to see available challenges

The Infinite Game has already begun. The only question is: will you play?

See you in the game!`,
    author: 'ReGen Civics Team',
    date: 'Feb 2, 2026',
    readTime: '6 min watch',
    image: cdnImg('https://assets.regencivics.earth/blog-games-quests.jpg'),
    tags: ['Games', 'Quests', 'Tokens', 'Video', 'How-To'],
    featured: false,
    isVideo: true,
    videoUrl: 'https://www.youtube-nocookie.com/embed/U5ZTTy0SCaA',
    videoDuration: '6 min'
  },
  {
    id: '8',
    slug: 'how-to-apply-for-season-2',
    title: 'How to Apply for Season 2: Complete Application Guide',
    excerpt: 'Step-by-step tutorial on submitting your land project application for ReGen Civics Season 2. Learn what information you need and how to present your project effectively.',
    content: `Ready to apply for Season 2? This guide walks you through every step of the application process.

## What You Will Need

Before starting your application, gather:

- **Project Details**: Name, location, size (hectares/acres), current and intended community size
- **Vision Statement**: A clear description of your regenerative goals
- **Team Information**: Who is leading this project and what experience do they bring
- **Financial Overview**: Current funding status and capital needs
- **Supporting Documents**: Photos, site plans, or other relevant materials (optional)

## The Application Process

Our application form is designed to be completed in one sitting, though you can save drafts and return later.

**Step 1: Project Basics** - Enter your project name, location, and size. Use our built-in hectares-to-acres converter if needed.

**Step 2: Community Details** - Tell us about your current community (number of people and households) and your vision for full build-out.

**Step 3: Vision and Goals** - Describe what you are creating and why it matters. Be specific about your regenerative practices.

**Step 4: Team and Experience** - Introduce your core team members and highlight relevant experience.

**Step 5: Financial and Timeline** - Share your current funding status, capital needs, and project timeline.

**Step 6: Mixed Use (if applicable)** - Indicate if your project includes residential, commercial, or industrial components.

**Step 7: Review and Submit** - Double-check everything before submitting.

## After You Apply

Once submitted, you will receive a confirmation email. Our review team evaluates applications on a rolling basis. Projects that pass our initial quality check will be invited to participate in the community governance process.

Remember: passing our quality check does not guarantee selection. Final participation is determined by community governance, typically requiring 90% unity among active participants.

## Tips for a Strong Application

- **Be specific**: Vague descriptions make it hard to evaluate your project
- **Show your work**: If you have already started, share photos and progress
- **Be realistic**: We value honest assessments over overpromising
- **Highlight regeneration**: Make clear how your project serves ecological and social healing

## Questions?

If you have questions during the application process, join one of our Open Sessions or reach out through our contact form.

Ready to begin? [Start Your Application](/apply)

We look forward to learning about your project!`,
    author: 'ReGen Civics Team',
    date: 'Feb 2, 2026',
    readTime: '8 min read',
    image: cdnImg('https://assets.regencivics.earth/tDFZAkfngdZZObWl.jpg'),
    tags: ['How-To', 'Season 2', 'Applications', 'Tutorial'],
    featured: false,
    isVideo: false
  },
  {
    id: '9',
    slug: 'how-to-use-contribution-calculator',
    title: 'How to Use the Contribution Calculators: Measure Your Full Value',
    excerpt: 'Learn how to use our 8 Forms of Capital calculator to measure and communicate your complete contribution potential beyond just money.',
    content: `The Contribution Calculator helps you recognize and quantify all the ways you contribute value, not just financial capital.

## Why 8 Forms of Capital?

Traditional economics only recognizes financial capital. But humans contribute value in many forms:

1. **Financial Capital** - Money, investments, credit
2. **Material Capital** - Tools, equipment, buildings, land
3. **Living Capital** - Soil health, water, ecosystems, biodiversity
4. **Social Capital** - Relationships, networks, trust, community connections
5. **Intellectual Capital** - Knowledge, skills, education, expertise
6. **Experiential Capital** - Wisdom from lived experience, practical know-how
7. **Spiritual Capital** - Purpose, meaning, connection to something greater
8. **Cultural Capital** - Traditions, stories, shared practices, artistic expression

## How to Use the Calculator

**Step 1: Choose Your Perspective**

What project are you tracking your contributions for?

- Land project?
- Alliance organisation (tech company, etc)?

**Step 2: Work Through Each Capital Type**

For each of the 8 forms, you will:
- Describe what you bring
- Estimate the impact (in some cases that aren't easy to quantify)

**Step 3: Review Your Total Contribution**

The calculator shows your complete contribution profile across all 8 forms. You might be surprised by how much value you bring beyond money!

**Step 4: Download Your PDF**

Generate a professional PDF summary that you can:
- Share with land projects you're working with to show how much you've contributed
- Include in funding proposals
- Use in governance discussions
- Keep for your own records

## Crowd Pooling Tool

Next tool: Imagine you are launching a land project and seeking funding. You might think "I only have $10,000 to contribute, that is not enough."

But when you fill out the [crowd pool calculator](https://www.regencivics.earth/crowd-pooling), you discover:

- **Financial**: $10,000 cash
- **Material**: A tractor worth $15,000 you can bring
- **Living**: Knowledge of permaculture worth $20,000 in consulting fees
- **Social**: Connections to 3 potential funders (invaluable)
- **Intellectual**: 10 years of construction experience
- **Experiential**: Lived on an ecovillage for 5 years
- **Spiritual**: Deep commitment to regeneration
- **Cultural**: Fluent in Spanish, can bridge communities

Suddenly, your contribution is worth far more than $10,000. You are bringing $45,000+ in tangible value plus immeasurable intangible assets.

## Tips for Accurate Assessment

- **Be honest**: Overestimating helps no one
- **Think broadly**: That "hobby" might be valuable expertise
- **Include time**: Your labor has value, even if unpaid
- **Consider networks**: Who you know matters
- **Value wisdom**: Life experience is a form of capital

## Using Your Results

Once you have completed your calculator:

1. **Share with projects**: Send your PDF when applying to land projects
2. **Update regularly**: Your capital changes over time
3. **Compare with needs**: See how your capital matches project needs
4. **Negotiate fairly**: Use your full profile in contribution discussions

## Try It Yourself

Ready to discover your full contribution potential?

[Open the Contribution Calculator](/calculator)

You might be wealthier than you think.

Learn more about the [Crowd Pooling Tool](https://www.regencivics.earth/crowd-pooling) for launching land projects.`,
    author: 'ReGen Civics Team',
    date: 'Feb 2, 2026',
    readTime: '10 min read',
    image: cdnImg('https://assets.regencivics.earth/peaZcxlEiltihAJB.jpg'),
    tags: ['How-To', 'Calculator', 'Forms of Capital', 'Tutorial'],
    featured: false,
    isVideo: false
  },
  {
    id: '10',
    slug: 'how-to-set-up-player-profile',
    title: 'How to Set Up Your Player Profile: Connect to the Game',
    excerpt: 'Complete guide to creating your ReGen Games player profile and linking your Base blockchain account through Hypha DAO.',
    content: `Your Player Profile is your identity in the ReGen Games ecosystem. It tracks your quests, badges, tokens, and contributions. Here is how to set it up.



## Why You Need a Player Profile

Your profile serves multiple purposes:

- **Identity**: Your unique presence in the ReGen Civics community
- **Progress Tracking**: See which quests you have completed
- **Token Balance**: View your RGVoice and ReGen tokens and other tokens you earn in ReGen Civics.
- **Badge Collection**: Display your achievements
- **Governance**: Your profile links to your voting power

## Step 1: Create Your Profile

Navigate to [/profile](/profile) and click "Create Profile."

You will need:
- **Display Name**: How you want to be known in the community
- **Email**: For notifications and updates
- **Bio** (optional): Tell us about yourself
- **Profile Photo** (optional): Help others recognize you

## Step 2: Connect Your Base Blockchain Account

This is the most important step. Your Base account is where your tokens live and how you participate in governance.

**What is Base?**

Base is Coinbase's Layer 2 blockchain. It is fast, cheap, and secure. You do not need to be a crypto expert to use it.

**Getting a Base Account Through Hypha**

1. Visit [Hypha DAO](https://app.hypha.earth)
2. Click "Sign Up" or "Connect Wallet"
3. Follow the prompts to create your account
4. Once created, you will see your blockchain account name listed right under your name on the top right with a "copy text" button next to it.

**Linking to Your Profile**

1. Copy your blockchain account (long string of random numbers and letters)
2. Return to your ReGen Civics player profile
3. Paste your account name in the "Base Blockchain Account" field
4. That's it!

## Step 3: Complete Your First Quest

Now that your profile is set up, it is time to start playing. Your first quest is simple:

[View Open Session Schedule](/schedule)

## Understanding Your Tokens

**RGVoice Tokens** represent your voice in governance. You earn them by:
- Attending community calls
- Completing quests
- Contributing to discussions
- Helping other players

More RGVoice = more voting power in governance decisions.

**ReGen Tokens** represent regenerative value creation. You earn them by:
- Demonstrating measurable impact
- Completing major projects
- Contributing to land project success
- Advancing the alliance mission

ReGen tokens may have future economic value as the ecosystem grows.

## Troubleshooting

**"I can't verify my Base account"**
- Make sure you copied the exact account name from Hypha
- Check for extra spaces or typos
- Try refreshing the page

**"I don't see my tokens"**
- Token balances update every 24 hours
- Make sure your Base account is properly linked

**"I forgot my password"**
- Use the "Forgot Password" link on the login page
- Check your email for reset instructions

## Next Steps

Once your profile is set up:

1. **Explore the Quest Board**: See available quests at [/quest](/quest)
2. **Join the DAO**: Participate in governance at [Hypha](https://app.hypha.earth/en/dho/regen-games/)
3. **Connect with Players**: Introduce yourself in our community channels
4. **Start Contributing**: Complete quests and earn tokens

## Welcome to the Game!

Your profile is your passport to the Infinite Game. Keep it updated, [complete quests](/quest), earn tokens, and help build the regenerative renaissance.

See you in the game!

[Create Your Profile Now](/profile)`,
    author: 'ReGen Civics Team',
    date: 'Feb 2, 2026',
    readTime: '3 min read',
    image: cdnImg('https://assets.regencivics.earth/cqDpxrSObQEpPwSd.jpg'),
    tags: ['How-To', 'Player Profile', 'Blockchain', 'Tutorial', 'Hypha'],
    featured: false,
    isVideo: false
  },
  {
    id: '11',
    slug: 'getting-investment-through-regen-civics',
    title: 'Getting Investment Into Your Land Project Through ReGen Civics',
    excerpt: 'Instead of investors doing all the due diligence themselves, ReGen Civics performs this function while giving investors the safety of diversification.',
    content: `## Win Win Win

Investors get a better investment while also supporting the project they care about! Land projects get a broader support network, and support in preparing their project to receive additional capital.

With ReGen Civics we also remove the challenges that come from minority groups (investors) holding large equity or debt stakes in your land project.

## The Traditional Challenge

When an investor considers putting money into a land project, they face significant hurdles:

- **Due Diligence Burden**: Investors must verify land ownership, assess environmental conditions, evaluate the team, review financials, and understand local regulations. This takes months and costs thousands in legal and consulting fees.

- **High Risk, Single Project**: Putting all their capital into one project means if that project fails, they lose everything.

- **Limited Expertise**: Most investors are not experts in regenerative agriculture, community governance, or sustainable development. They cannot properly evaluate what makes a regenerative project successful.

## How ReGen Civics Changes the Game

ReGen Civics offers a fundamentally different approach. Instead of each investor doing their own due diligence on individual projects, we perform this function collectively.

### Here is How It Works

**Step 1: Investor Contributes to the Fund**

An impact investor puts capital into the ReGen Civics fund. For example, let us say an investor contributes $1,000,000.

**Step 2: Earmarking for Specific Projects**

The investor can earmark up to 90% of their contribution to support a specific land project they care about. Perhaps they have a personal connection to a project in Costa Rica, or they are passionate about a particular bioregion.

**Step 3: ReGen Civics Performs Due Diligence**

Our team of experienced regenerative practitioners evaluates the land project across multiple dimensions:

- **Land Ownership**: Is the title clear? Are there any encumbrances?
- **Location Quality**: Is the land in a stable real estate market?
- **Regenerative Potential**: Can this land be restored and enhanced?
- **Game Structure**: Does the project have a clear Minimum Viable Economy?
- **Team Assessment**: Are the right people in place?
- **Legal Framework**: Is the governance structure sound?
- **Community Readiness**: Are quality participants ready to engage?

**Step 4: Verification of the "Game"**

We ensure the land project has all the pieces of their Infinite Game in place. This means:

- Clear organizational structure
- Transparent economics and financials
- Proper legal entities
- Governance mechanisms that work
- A pathway to sustainability

**Step 5: Council Vote & Fund Release**

Even if the land project passes all of our verifications listed above, the final check is passing the collective intelligence of our network. Our fund only makes investment decisions if a project receives a 90%+ vote from the council, which is governed by representatives of other successful land projects and alliance organizations. This brings the collective wisdom to assess project potential.

If the project passes both our due diligence and the council vote, we release 90% of the earmarked funds to the project in exchange for equity. The remaining 10% stays in the diversified fund. If not, we return the majority of the funds to the potential investor (keeping either 3% or $20,000 whichever is less as a fee for our due diligence work).

## Benefits for Investors

### Safety Through Diversification

Even when supporting a specific project, investors receive equity in the broader ReGen Civics fund. This means:

- If their preferred project struggles, they still have exposure to the success of other projects in the alliance
- The fund spreads risk across multiple land projects, regions, and approaches
- Professional management of the overall portfolio

### Professional Due Diligence

Investors benefit from:

- Our years of experience evaluating regenerative projects
- Established criteria and evaluation frameworks
- Ongoing monitoring and support for funded projects
- Network effects from connecting projects together

### Direct Impact

Unlike traditional diversified funds where you have no say in where money goes, ReGen Civics lets investors:

- Support specific projects they care about
- See direct impact from their contribution
- Build relationships with land stewards
- Visit and engage with their supported projects

## Benefits for Land Projects

### Reduced Fundraising Burden

Instead of pitching to dozens of individual investors, land projects can:

- Focus on building their project rather than constant fundraising
- Access capital through a single relationship with ReGen Civics
- Benefit from our investor network and credibility

### Credibility and Validation

Passing our due diligence process signals to the broader community that:

- The project has been professionally evaluated
- The fundamentals are sound
- The team is capable
- The vision is achievable

### Ongoing Support

Funded projects receive:

- Connection to the alliance network
- Access to shared resources and knowledge
- Mentorship from experienced land stewards
- Visibility through our platform

## Not a Traditional Fund

Unlike traditional venture funds with a managing partner making investment decisions, ReGen Civics is fundamentally different. We are not a traditional fund with centralized decision-making.

Instead, all major funding decisions require a 90%+ approval vote from the council of projects that govern the fund. This council is made up of representatives from other successful land projects and alliance organizations.

This means:

- Funding decisions reflect collective wisdom, not individual judgment
- Projects are evaluated by peers who deeply understand regenerative work
- The network maintains high standards through collective intelligence
- Accountability is built into the system through distributed governance
- Every voice in the alliance has a say in where capital flows

## Ready to Explore?

Whether you are an investor looking to support regenerative land projects with reduced risk, or a land project seeking funding with less friction, ReGen Civics offers a path forward.

**For Investors**: [Schedule a call](/schedule) to discuss how you can contribute to the fund while supporting specific projects you care about.

**For Land Projects**: [Apply for Season 2](/seasons) to begin the evaluation process and potentially access funding through our network.

The regenerative renaissance needs capital to flow to the land. ReGen Civics is building the infrastructure to make that happen safely and effectively.

[Access Investment Thesis](/investor)`,
    author: 'ReGen Civics Team',
    date: 'Feb 5, 2026',
    readTime: '8 min read',
    image: cdnImg('https://assets.regencivics.earth/AMrdBIATsoXcSZbO.jpg'),
    tags: ['Investment', 'Land Projects', 'Due Diligence', 'Fund Structure', 'Foundation'],
    featured: false,
    isVideo: false
  },
  {
    id: '12',
    slug: 'what-makes-land-project-good-investment',
    title: 'What Makes a Land Project a Good Investment: The Four Pillars',
    excerpt: 'Before investing in any regenerative land project, we look for four essential elements. Here is what makes the difference between a good investment and a risky one.',
    content: `Not all land projects are created equal. Some will thrive and generate returns for decades. Others will struggle and eventually fail. At ReGen Civics, we have learned to identify the difference.

After years of working with regenerative land projects around the world, we have identified four essential pillars that separate good investments from risky ones.

## Pillar 1: Own the Land in a Good Market

This might seem obvious, but it is the foundation everything else builds upon.

### Clear Ownership

The project must have clear, unencumbered title to the land. This means:

- No disputed ownership claims
- No hidden liens or mortgages
- Proper legal documentation
- Clear chain of title

We have seen promising projects derailed by ownership disputes that emerged years after initial investment. Due diligence on title is non-negotiable.

### Good Real Estate Market

The land should be in a traditionally strong real estate market. This information is readily available online through:

- Regional real estate reports
- Land value trends
- Development patterns
- Economic indicators

Why does this matter for regenerative projects? Because even if the primary goal is regeneration, the underlying land value provides a safety net. If the project needs to pivot or wind down, the land itself retains value.

**Key Questions:**
- Is the land in a region with stable or growing property values?
- Are there comparable sales that establish fair market value?
- What are the long-term development trends in the area?

## Pillar 2: Land is Being Regenerated

A regenerative land project should be actively improving the land, not just maintaining it.

### Growing in Value

Regeneration means the land becomes more valuable over time through:

- **Soil Health**: Building topsoil, increasing organic matter, improving water retention
- **Biodiversity**: More species, healthier ecosystems, natural pest control
- **Water Systems**: Restored watersheds, clean water, proper drainage
- **Carbon Sequestration**: Trees, perennial plants, healthy soil storing carbon
- **Productive Capacity**: More food, fiber, or other outputs per acre

### Measurable Progress

Good projects track their regenerative impact with:

- Baseline assessments before starting
- Regular monitoring and measurement
- Third-party verification when possible
- Clear metrics for success

**Key Questions:**
- What was the land condition when the project started?
- What measurable improvements have been made?
- What is the plan for continued regeneration?
- How is progress being tracked and verified?

## Pillar 3: A ReGen Infinite Game Structure

This is where many projects fail. They have good land and good intentions, but they lack the organizational infrastructure to succeed long-term.

### The Complete Game

A well-structured project has clarity in:

**Organization**
- Clear roles and responsibilities
- Decision-making processes that work
- Succession planning for key positions
- Conflict resolution mechanisms

**Economics**
- Multiple revenue streams
- Realistic financial projections
- Cash flow management
- Path to sustainability

**Financials**
- Transparent bookkeeping
- Regular financial reporting
- Proper accounting practices
- Audit readiness

**Legal**
- Appropriate entity structure
- Clear contracts and agreements
- Regulatory compliance
- Risk management

### Why "Infinite Game"?

We use this term deliberately. A finite game has winners and losers, and then it ends. An Infinite Game is designed to continue indefinitely, adapting and evolving as needed.

Land projects should be built to last generations, not just until the founders burn out or move on.

**Key Questions:**
- Is the organizational structure documented and functional?
- Are the economics realistic and sustainable?
- Is financial management transparent and professional?
- Is the legal framework appropriate and compliant?

## Pillar 4: Quality Participants Can Join

A land project is only as strong as the people involved. The best projects attract and retain quality participants.

### Open to the Right People

This means:

- Clear pathways for new participants to join
- Fair and transparent selection processes
- Onboarding systems that work
- Culture that welcomes contribution

### Network Recommendations

When a project meets our standards, we can confidently recommend it to our network. This means:

- Directing potential residents, workers, and contributors to the project
- Connecting the project with complementary skills and resources
- Building the community the project needs to thrive

**Key Questions:**
- How do new participants join the project?
- What skills and contributions are needed?
- Is there a clear value proposition for participants?
- Does the culture support collaboration and growth?

## The 90% Council Vote

Even if a project meets all four criteria, investment is not automatic. All funding decisions require a 90% approval vote from the council of projects that govern the ReGen Civics fund.

This means:

- **Collective Wisdom**: Decisions reflect the judgment of experienced land stewards, not just our evaluation team
- **Peer Review**: Projects are assessed by others who understand the challenges and opportunities
- **High Standards**: The network maintains quality by being selective
- **Accountability**: Everyone has a stake in funding decisions

## Self-Assessment for Land Projects

If you are considering applying for investment through ReGen Civics, honestly assess your project against these four pillars:

| Pillar | Question | Your Answer |
|--------|----------|-------------|
| 1. Land Ownership | Do you have clear title in a good market? | |
| 2. Regeneration | Is the land measurably improving? | |
| 3. Game Structure | Are organization, economics, financials, and legal clear? | |
| 4. Participants | Can quality people easily join your project? | |

If you can answer "yes" to all four, you may be a good candidate for our fund.

## Next Steps

**For Land Projects Ready to Apply:**

1. Review your project against the four pillars
2. Gather documentation for due diligence
3. [Apply for Season 2](/seasons) to begin the evaluation process

**For Investors Seeking Quality Projects:**

1. Understand that we only fund projects meeting these criteria
2. [Schedule a call](/schedule) to discuss investment opportunities
3. [Access our Investment Thesis](/investor) for detailed fund information

The regenerative renaissance needs strong foundations. These four pillars ensure that the projects we support have what it takes to succeed for generations.

[Apply for Season 2](/seasons)`,
    author: 'ReGen Civics Team',
    date: 'Feb 5, 2026',
    readTime: '10 min read',
    image: cdnImg('https://assets.regencivics.earth/yFrwKokjZNoFvXuz.jpg'),
    tags: ['Investment', 'Land Projects', 'Due Diligence', 'Evaluation Criteria', 'Foundation'],
    featured: false,
    isVideo: false
  },
  {
    id: 'claim-your-land-project-or-organisation',
    slug: 'claim-your-land-project-or-organisation',
    title: 'Your Space Is Waiting: How to Claim Your Land Project or Organisation',
    excerpt: 'If you have been part of a ReGen Civics incubator season, or if your organisation has partnered with us before, your project is already on the site. Here is how to claim it.',
    content: `If you have been part of a ReGen Civics incubator season, or if your organisation has partnered with us before, your project is already on the site. What is not yet connected is you, the person behind it, with the keys to your space.

Claiming your project or organisation does a few things. It gives you a presence in our community space. It connects your profile to your project's forum thread, so you can host conversations and answer questions directly. And it opens up the steward tools: endorsing quests for your applicants, sharing updates, and eventually receiving applications from people who want to work with you.

Here is how to do it.

## Step 1: Create your player profile

If you do not already have an account on [regencivics.earth](https://regencivics.earth), start there. Create an account using the email you want associated with your project. Your player profile is where your claim will live.

## Step 2: Go to your profile and find the claim option

Once you are logged in, open your player profile (top right corner of the nav, or your name/avatar). Look for a section called "Claim a Project or Organisation." Select whether you are claiming a land project or an alliance organisation.

## Step 3: Fill out the claim form

**For land projects**, the form asks for the same kind of information as the incubator application: your land status, your community stage, what your project is working on, and how you want to show up in the network. This is how we verify the claim and fill out your project's public profile.

**For alliance organisations**, the form is simpler: your role, your org's website, what you do, and what kinds of collaboration you are looking for.

Your claim goes into a review queue. It does not go live immediately.

## Step 4: Wait for approval

We review each claim to confirm the connection between the person and the project. Once approved, your profile is connected to your project's space. You will get a notification when it goes through.

## Step 5: You are in

After approval, your project page in the community space is yours. You can post updates, respond to community questions in your forum thread, and manage your quest endorsements from your profile.

If you want to update your project's description, location, or other details after claiming, you will be able to do that from your profile too.

## Questions?

Post in the [Community Forum](https://regencivics.earth/community) or reply to this post. We are here and actively reviewing claims.

---

*This is a living network. Every project that claims its space makes the whole thing more real. We are glad you are here.*`,
    author: 'ReGen Civics Team',
    date: 'Mar 14, 2026',
    readTime: '4 min read',
    image: cdnImg('https://assets.regencivics.earth/yFrwKokjZNoFvXuz.jpg'),
    tags: ['How-To', 'Land Projects', 'Organisations', 'Community', 'Stewardship'],
    featured: false,
    isVideo: false
  },
  {
    id: 'your-seeds-contributions-live-on',
    slug: 'your-seeds-contributions-live-on',
    title: 'Your SEEDS Contributions Live On',
    excerpt: 'If you spent years contributing to SEEDS, Hypha, or other regenerative projects and were never fully compensated, your contributions could live on in ReGen Civics.',
    content: `[CLAIM_SEEDS_BUTTON]

If you've contributed to SEEDS, Hypha, local food systems, regenerative governance experiments, community currencies, and other critical infrastructure for our Regenerative Renaissance and you were never fully compensated for that work, your contributions could live on in ReGen Civics.

This post is specific to our roots in SEEDS. You can watch a quick mini-documentary on SEEDS here if you haven't seen it yet.

[Short Documentary](https://youtu.be/h2K_f-E4hJM?si=rd6TuSc-qyVUSwCU)

This is all part of the foundations of what we are building now, and we intend to start by recognizing and inviting those foundations in.

ReGen Civics is building the infrastructure to account for all these unaccounted and historical contributions. Something like a shared record of what the movement has already put in, visible and available to all of us, backing the tokens we are distributing now.

This way we can collectively raise funds, donations, investments, etc. that recognize all of our shared work and have the shared center to begin coordinating more effectively around.

## What do we mean by contributions?

We are not only talking about financial contributions (though they are the easiest to track!)

We work with the eight forms of capital:

**Social capital:** relationships, networks, trust you built

**Material capital:** tools, equipment, land improvements, physical infrastructure

**Financial capital:** money/crypto invested or donated

**Living capital:** ecological restoration, food forests, soil health, biodiversity

**Intellectual capital:** research, documentation, writing, design, code

**Experiential capital:** knowledge passed on, mentorship, facilitation, training

**Spiritual capital:** ceremonies, spiritual practices, trauma work, deep healing, the intangible things that hold communities together

**Cultural capital:** art, music, stories, identity, meaning

If you gave any of these things to the regenerative mission ReGen Civics is serving without being fully compensated, that is the kind of contribution we want to account for.

If it aligns with our mission and you want to join us in going forward, we want to acknowledge your past!

We've created a draft calculator to try and quantify these contributions. Use the calculator and give suggestions on how to evolve it here:

[Calculator](/calculator)

## How it works

The token is called $ReGen. For every $ReGen token we give out, we are committed to receiving an equal amount of value pooled here in documented contributions. This is what backs the token: not speculation, not promises, but the actual work the movement has already done and continues to do, tracked on-chain for all investors, donors, etc. to see.

### To bring your contributions in, you make a historical proposal.

You document what you contributed, across which forms of capital, and submit that for community review. Once reviewed and accepted, those contributions are recorded in the ReGen Civics ecosystem and you receive $ReGen tokens representing them.

The process runs through Hypha's DAO tools at [hypha.earth](https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution), which handle the proposal structure and the governance of token distribution.

## How to start

**Step 1: Count your contributions.** Use the 8 Forms of Capital calculator to map what you contributed and give it a rough value. The calculator helps you think through categories you might not have counted: relationships, ecological work, and more. [Open the calculator here](/calculator).

For all value you're claiming you need to provide proof of impact (what was delivered, if it's financial value you need to show how much you spent. For SEEDS you'll need to provide your SEEDS account, that 12 character account name, in your proposal for verification that you didn't sell or spend your Seeds that you bought).

**Step 2: Write your proposal.** Come to the [forum thread for contributions discussion](/community/post/625). Read what others are writing, share your own thinking, and refine your proposal together. Join the community conversation about how we value each other's work. Once you're confident with your proposal...

**Step 3: Submit through Hypha.** Bring your proposal to [hypha.earth](https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution) for community review. The ReGen Civics community votes on proposals and $ReGen tokens are distributed on approval.

**Step 4: Your contributions live here.** After approval, your contributions become part of the shared record. They are accessible, visible, and they back the tokens circulating in the movement. Your work becomes part of the foundation and as we grow your value grows with us. Welcome to the team!

[!WARNING]
Our ecosystem is rooted in trust. Without that we have nothing. So, we have zero tolerance for fraud. If your claim isn't verified on chain, or you attempt to misrepresent your contributions, your claim will be denied and you'll lose your opportunity to claim again and be banned from participating in ReGen Civics.

## A note on SEEDS specifically

If you were active in the SEEDS ecosystem and accumulated Seeds tokens or contribution records there, those reflect real work and real relationships.

SEEDS has its own accounting for many of these contributions, and we are working on how to recognize that history here. SEEDS is still running and will have its own relaunch and count its own history again. We're just doubling down on that because we want to recognize and acknowledge where we come from!

Important note: We won't be replicating or accounting for Campaign Distributions (if you got seeds through a campaign proposal) as those were given out on the expectation that you would do things, not that you have already done them. If you went ahead and fulfilled the agreements for that campaign (you did the thing, planted the community garden, set up the local food hub, etc.) then use "the thing" as your contribution proposal.

If you have SEEDS contribution records you want to bring into ReGen Civics, bring them to the [forum thread](/community/post/625). We will figure out the best path together.

## What this is building toward

Every token we give out should be backed by something real that our movement values. Not promises. Not projected future value. The actual work, relationships, knowledge, land stewardship, and culture that people in this movement have been building for years.

When the token has that backing, it means something. When you hold $ReGen, you are holding a piece of a shared record of what this movement has built together. That is what we are co-creating. Then on top of these foundations we can build new economic and financial systems to serve our movement.

Come to the forum. Bring your contributions. They have always been worth something. Now we are building the infrastructure to say so out loud.

# The Three Foundations: $SEEDS, $ReGen, and $RCivics

$SEEDS: a global permissionless currency, continuing its path toward interconnected financial protocols as a fully decentralised protocol

$ReGen: the currency of this new network, designed for regenerative land projects and the organisations that support them, less decentralised, more focused and more connected to land projects

$RCivics: equity in the ReGen Fund, the bridge foundation that connects regenerative vision to real capital deployment

"Think of ReGen Civics as a bridge. $RCivics is one foundation on the ground, rooted in the tools of capital of the current dominant Games. $ReGen is the other foundation, rooted in the future we're building together, the new Games we're co-creating." Rieki Cordon

[Join the contributions discussion](/community/post/625)

[CLAIM_SEEDS_BUTTON]`,
    author: 'ReGen Civics Team',
    date: 'Mar 18, 2026',
    readTime: '7 min read',
    image: '/og/seeds-contributions.webp',
    tags: ['Tokens', 'Contributions', 'SEEDS', 'Regenerative Economics', '8 Forms of Capital', 'Hypha', 'History'],
    featured: false,
    isVideo: false
  }
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find(post => post.slug === slug);
}

export function getFeaturedPost(): BlogPost | undefined {
  return blogPosts.find(post => post.featured);
}

export function getRecentPosts(count: number = 3): BlogPost[] {
  return blogPosts.slice(0, count);
}
