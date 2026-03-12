export interface QuestForumPost {
  slug: string;
  title: string;
  body: string;
  seeds: { author: string; handle: string; body: string }[];
}

export const QUEST_FORUM_POSTS: QuestForumPost[] = [
  {
    slug: "feedback",
    title: "Quest 1: Share Your Experience and Give Constructive Feedback",
    body: `This is the place to share your experience on the ReGen Civics site and give constructive feedback. There are no wrong answers here. Whether you loved it, found it confusing, or have big ideas for how to make it better, we want to hear it all.

To complete Quest 1:
1. Leave a comment below sharing your honest thoughts about the site. What is working? What could be improved? What excited you?
2. Post your thoughts on social media too (link to your post in your comment here).

Your voice helps us build something extraordinary together.`,
    seeds: [
      {
        author: "Solange Beaumont",
        handle: "@solange_regen",
        body: "I found the quests section a bit hard to find at first. Took me a while to realise it was in the profile section. Once I found it though, I was hooked. The token reward structure is really clever. Would love to see a brief onboarding flow that introduces first-time visitors to the Game concept right away. Shared this on my Instagram: instagram.com/p/example1\n\n[EXAMPLE COMMENT - share your own experience below]",
      },
      {
        author: "Tobias Wrenfield",
        handle: "@tobias_earthwise",
        body: "Really impressed by the scope of what is being built here. My main feedback is that the \"How It Works\" section on the home page could be even more visual, maybe a short animated explainer. The vision is big and new visitors need to feel it quickly before they commit to exploring further. Posted a thread on X about it: x.com/tobias_earthwise/status/example\n\n[EXAMPLE COMMENT - share your own experience below]",
      },
      {
        author: "Yemi Adeyinka",
        handle: "@yemi_soilandstars",
        body: "As someone who has been in the regenerative agriculture space for years, it is refreshing to see governance and game mechanics applied to ecosystem stewardship. Two suggestions: clearer explanations of what $ReGen and RGVoice tokens actually do on-chain, and a map view of all the land projects. Would draw me back daily. LinkedIn post here: linkedin.com/posts/example\n\n[EXAMPLE COMMENT - share your own experience below]",
      },
    ],
  },
  {
    slug: "origin-story",
    title: "Quest 2: Write Your Regenerative Origin Story",
    body: `This is where we collect the stories of how we each found our way here. Every origin story is different. Every one matters.

To complete Quest 2:
1. Write your Regenerative Origin Story below. What woke you up? How did you get here? A paragraph is enough. A page is welcome.
2. Share it on social media and link to your post in your comment here.

When we share our stories, we recognise each other.`,
    seeds: [
      {
        author: "Amara Diallo",
        handle: "@amara_soilstories",
        body: "I grew up watching my grandmother tend her garden in Dakar with a kind of attention I did not understand until much later. She never called it regenerative but she was composting before I knew the word. I came to this work after a decade in finance, realising the money was flowing everywhere except toward the land. ReGen Civics is the first place I have seen both things held together. Post: instagram.com/p/example_origin1\n\n[EXAMPLE COMMENT - share your own origin story below]",
      },
      {
        author: "Luca Andersson",
        handle: "@luca_regen_north",
        body: "Mine is embarrassingly simple: I watched a documentary about soil microbes at 2am and could not sleep for three days after. Something just clicked. I started reading everything, quit a comfortable job, and spent two years on a farm in southern Sweden. I still do not know where I am going but I know what direction I am facing. Shared on X: x.com/luca_regen_north/status/example_origin\n\n[EXAMPLE COMMENT - share your own origin story below]",
      },
      {
        author: "Fatimah Osei",
        handle: "@fatimah_ecosystems",
        body: "I came to this through grief, honestly. A river I grew up swimming in ran dry when I was 22. I needed somewhere to put that grief that was not just rage. Regenerative work gave me somewhere to put it that also builds something. That is the whole answer. Post: linkedin.com/posts/example_origin\n\n[EXAMPLE COMMENT - share your own origin story below]",
      },
    ],
  },
  {
    slug: "regen-act",
    title: "Quest 3: Do a Regenerative Act",
    body: `This is our collective log of real regenerative actions taken by ReGen Civics players in the physical world. Every act counts. Every act is a vote for the world we want.

To complete Quest 3:
1. Do one real, intentional regenerative act today, however small.
2. Share what you did below. A photo, a description, anything real.
3. Post about it on social media and link to your post in your comment.

When we witness each other doing, something shifts.`,
    seeds: [
      {
        author: "Mireille Fontenot",
        handle: "@mireille_jardinage",
        body: "I planted six native wildflowers along the verge outside my building. Had to check first that it was not illegal in my council (it nearly was). But it is done. My small act of guerrilla rewilding. Post: instagram.com/p/example6. Already inspired my neighbour to do the same.\n\n[EXAMPLE COMMENT - share your own regenerative act below]",
      },
      {
        author: "Josue Ramirez",
        handle: "@josue_tierra_libre",
        body: "I spent an hour picking up plastic along a 300-metre stretch of the river near my house. It is something I walk past every day and look away from. Not anymore. Post: x.com/josue_tierra_libre/status/example6. And a commitment to do it monthly.\n\n[EXAMPLE COMMENT - share your own regenerative act below]",
      },
      {
        author: "Hana Kowalczyk",
        handle: "@hana_ferments",
        body: "My regenerative act was starting my first compost bin. I have wanted to do this for two years and Quest 3 made me actually do it. It is just a box in the corner of my balcony for now, but it is alive. Shared the setup on TikTok: tiktok.com/@hana_ferments/example6.\n\n[EXAMPLE COMMENT - share your own regenerative act below]",
      },
    ],
  },
  {
    slug: "bioregion",
    title: "Quest 4: Connect with Your Bioregion",
    body: `This is our bioregional atlas: a growing map of where ReGen Civics players are rooted and what they are discovering about their home places.

To complete Quest 4:
1. Research your bioregion. (Try watershedproject.org or inaturalist.org as a starting point.)
2. Share three things you discovered and what surprised you in the comments below.
3. Post on social media about your bioregion and link to your post here.

The more we know our places, the better we can tend them.`,
    seeds: [
      {
        author: "Astrid Bergholm",
        handle: "@astrid_nordmark",
        body: "I am in the Angermanälven watershed in northern Sweden. A river system I had never thought about even though I drink from it. Discovered that the area has one of Scandinavia's last wild salmon runs. And that three centuries ago, this whole hillside was open pasture with 40+ farm families. Now it is mostly spruce monoculture. Shared: instagram.com/p/example7\n\n[EXAMPLE COMMENT - share your bioregion discoveries below]",
      },
      {
        author: "Emmanuel Kariuki",
        handle: "@emmanuel_mtaro",
        body: "I live in Nairobi but I learned I am in the Nairobi River watershed. A river so degraded most residents do not know it flows beneath them. Found a local restoration group I am now volunteering with. Three things: I live in the Ngong Hills bioregion, the area was historically Maasai grazing territory, and there are 600+ bird species within 50km of where I sit. Post: x.com/emmanuel_mtaro/status/example7\n\n[EXAMPLE COMMENT - share your bioregion discoveries below]",
      },
      {
        author: "Siobhan Ni Mhurchu",
        handle: "@siobhan_bogland",
        body: "I am in the west of Ireland in the Connaught blanket bog ecoregion. One of the rarest habitats on Earth and largely destroyed in the 20th century. What surprised me: intact bogs in my county store more carbon per hectare than tropical rainforest. I had no idea. Post: linkedin.com/posts/example7\n\n[EXAMPLE COMMENT - share your bioregion discoveries below]",
      },
    ],
  },
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
        body: "I read Valentina's origin story and sent her a message because she mentioned translation between indigenous land knowledge and policy language. That is exactly the gap I keep running into in my systems design work. We ended up on a 90-minute call. That call would not have happened without this quest. Post: x.com/baraka_systems/status/example_friends\n\n[EXAMPLE COMMENT - share your connection story below]",
      },
      {
        author: "Clara van den Berg",
        handle: "@clara_storytells",
        body: "I welcomed three people who posted their origin stories this week. One of them is a filmmaker in Lagos working on exactly the kind of land documentation I want to do. We are already planning a collaboration. This is what the platform is for. Post: linkedin.com/posts/example_friends\n\n[EXAMPLE COMMENT - share your connection story below]",
      },
      {
        author: "Dario Marchetti",
        handle: "@dario_regen_it",
        body: "I answered a question in the forum that had been sitting unanswered for four days. Small thing. But the person replied saying it was the first time they felt like someone had actually seen them on the platform. That is everything. Post: instagram.com/p/example_friends\n\n[EXAMPLE COMMENT - share your connection story below]",
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
        body: "My gift is translation. Not just language (I speak Spanish, English, and Nahuatl) but translation between worlds. Between indigenous land knowledge and policy language. Between local wisdom and global movements. I pledge to spend at least 2 hours a week using this gift for the Alliance. Post: instagram.com/p/example8\n\n[EXAMPLE COMMENT - share your gift pledge below]",
      },
      {
        author: "Baraka Njoroge",
        handle: "@baraka_systems",
        body: "I am a systems designer and I pledge to apply that lens to the governance challenges that regenerative land projects face. How do you make equitable decisions across a distributed land alliance? That is my question and my gift. Post: x.com/baraka_systems/status/example8\n\n[EXAMPLE COMMENT - share your gift pledge below]",
      },
      {
        author: "Clara van den Berg",
        handle: "@clara_storytells",
        body: "I am a filmmaker and I pledge to document three land projects in the ReGen Civics Alliance over the next year. Real stories, told with care. Stories are how movements move. This is my contribution. Post: linkedin.com/posts/example8\n\n[EXAMPLE COMMENT - share your gift pledge below]",
      },
    ],
  },
  {
    slug: "foundations",
    title: "Quest 7: Explore Our Foundations",
    body: `This is where we share what struck us from the Foundational Series. Watch the four videos at regencivics.earth/foundations, then come back here to share your reflections.

What resonated? What surprised you? What questions did it open up? What would you share with a friend to bring them into this world?

To complete Quest 7:
1. Watch the Foundational Series (all 4 videos, or as many as you can).
2. Write a reflection, summary, or creative response in the comments below.
3. Share your response on social media and link to it here.

This is an invitation to bring others into the vision.`,
    seeds: [
      {
        author: "Dario Marchetti",
        handle: "@dario_regen_it",
        body: "Just finished all four videos and my biggest takeaway is the concept of \"coordinating at the speed of trust.\" We have all the solutions. What we lack is the governance layer to connect them. ReGen Civics is proposing exactly that. Wrote a summary article: medium.com/@dario_regen/example5\n\n[EXAMPLE COMMENT - share your reflection below]",
      },
      {
        author: "Fatimah Osei",
        handle: "@fatimah_ecosystems",
        body: "Video 3 shifted something in me. The idea that we are not building an organisation but an ecosystem hit differently. I have been in too many movements that became institutions and lost their aliveness. The game framing could be the antidote. Shared on Instagram: instagram.com/p/example5\n\n[EXAMPLE COMMENT - share your reflection below]",
      },
      {
        author: "Luca Andersson",
        handle: "@luca_regen_north",
        body: "I wrote a short invitation post for my network after watching: \"If you have been wondering what regenerative civilisation actually looks like in practice, start here.\" Three friends have already reached out asking how to join. Post: x.com/luca_regen_north/status/example5\n\n[EXAMPLE COMMENT - share your reflection below]",
      },
    ],
  },
  {
    slug: "refer-org",
    title: "Quest 8: Refer an Organisation Project",
    body: `Behind every piece of healing land is a web of organisations making it possible. This is where we build that web together.

To complete Quest 8:
1. Share regencivics.earth with any organisations in your network that support regenerative land: legal aid, carbon markets, seed libraries, water engineering, ecological education, regenerative finance, and beyond.
2. Comment below: who did you reach out to, and why are they a good fit for the Alliance?

If an organisation you referred joins the Alliance, you earn a 2,222 $ReGen bonus.`,
    seeds: [
      {
        author: "Nkechi Okonkwo",
        handle: "@nkechi_regenlaw",
        body: "I work adjacent to environmental law and shared this with two firms specialising in land trusts and commons governance. Also reached out to a regenerative agriculture certification body. These are exactly the kinds of organisations the Alliance needs. Post: instagram.com/p/example3\n\n[EXAMPLE COMMENT - share who you referred below]",
      },
      {
        author: "Sven Lindqvist",
        handle: "@sven_regenfinance",
        body: "Shared with a Nordic regenerative finance organisation and a circular economy accelerator. The concept of organisations earning tokens for contributing is exciting to them. Post: linkedin.com/posts/example3\n\n[EXAMPLE COMMENT - share who you referred below]",
      },
      {
        author: "Amara Diallo",
        handle: "@amara_agroforestry",
        body: "I am part of an agroforestry technical assistance network and shared this across our whole community. Probably 30+ organisations. The referral bonus really motivates people to follow through. Post: x.com/amara_agroforestry/status/example3\n\n[EXAMPLE COMMENT - share who you referred below]",
      },
    ],
  },
  {
    slug: "refer-land",
    title: "Quest 9: Refer a Land Project",
    body: `Land is where healing begins. This is where we celebrate every land project that finds its way into the Alliance through one of us.

To complete Quest 9:
1. Share regencivics.earth with any land project stewards you know: farms, rewilding initiatives, food forests, regenerative homesteads, community gardens, you name it.
2. Come back and comment below: share who you reached out to and why, or link to a social post inviting land projects in.

If a project you referred joins the Alliance, you earn a 2,222 $ReGen bonus.`,
    seeds: [
      {
        author: "Marisela Vega-Torres",
        handle: "@marisela_tierra",
        body: "I sent the link to the folks running Bosque de Luz, a 40-acre food forest project in Costa Rica I have been volunteering with. Also messaged three permaculture groups. Post: instagram.com/p/example2. Fingers crossed they apply.\n\n[EXAMPLE COMMENT - share who you referred below]",
      },
      {
        author: "Callum Ashford",
        handle: "@callum_rewild",
        body: "Shared this with the Dartmoor Wilder Grazing project in the UK. They are doing incredible work with mob-grazing and native tree planting. Also sent to two community land trust networks I am part of. Post: x.com/callum_rewild/status/example2\n\n[EXAMPLE COMMENT - share who you referred below]",
      },
      {
        author: "Preethi Sundaram",
        handle: "@preethi_farmcircles",
        body: "I run a network connecting small-scale organic farmers across South India and shared this with about 15 project leads in our WhatsApp group. Posted on LinkedIn about the referral bonus too. That alone got a lot of interest. Post: linkedin.com/posts/example2\n\n[EXAMPLE COMMENT - share who you referred below]",
      },
    ],
  },
  {
    slug: "quests",
    title: "Quest 10: Dream Up a Regenerative Quest",
    body: `This is where the next generation of ReGen Civics quests is born. You are invited to be a co-creator of the Game.

The best quest ideas:
- Are tied to real regenerative action or connection
- Draw on the creator's gifts or life purpose
- Add value across multiple forms of capital
- Can scale to coordinate thousands of people
- Are genuinely fun, or moving, or beautiful to do

To complete Quest 10:
1. Share your quest idea below: title, description, and what value it creates.
2. Post it on social media too and link to your post in your comment.

The highest-voted quest idea will be implemented into the Game, earning the creator an additional 1,111 $ReGen.

Ready to go further? Visit your profile to track all your quests: https://regencivics.earth/profile?tab=quests`,
    seeds: [
      {
        author: "Izabela Nowak",
        handle: "@iza_regen",
        body: "My dream quest (had this idea at 3am): \"The Mycelium Quest.\" Players map every connection they have to someone doing regenerative work, visualise their personal network as a mycelium diagram, and share it. The value: making invisible connective tissue visible. Post: instagram.com/p/example4\n\n[EXAMPLE COMMENT - share your quest idea below]",
      },
      {
        author: "Kweku Mensah",
        handle: "@kweku_earthgames",
        body: "Quest idea: \"The Seed Sovereignty Quest.\" Save seeds from something you grew, document it, and gift them to someone else in the community. Creates living chains of seed stewardship across the Alliance. Post: x.com/kweku_earthgames/status/example4. Already getting traction.\n\n[EXAMPLE COMMENT - share your quest idea below]",
      },
      {
        author: "Rosa Villareal",
        handle: "@rosa_tierra_viva",
        body: "I woke up with this one: \"The Ancestor Quest.\" Interview an elder in your community about how land was cared for when they were young. Record a few minutes, transcribe the wisdom, and share it in the forum. Our elders carry irreplaceable ecological knowledge. We are losing it fast. Post: linkedin.com/posts/example4\n\n[EXAMPLE COMMENT - share your quest idea below]",
      },
    ],
  },
];
