export interface RitesForumPost {
  slug: string;
  questId: number;
  title: string;
  body: string;
  seeds: { author: string; handle: string; body: string }[];
}

export const RITES_OF_PASSAGE_FORUM_POSTS: RitesForumPost[] = [
  {
    slug: "rites-quest-0-fire",
    questId: 0,
    title: "Quest 0: Fire — Transforming the Stories That No Longer Serve Us",
    body: `This is the beginning. Quest 0 is about burning the stories that no longer serve you to make room for new ones to grow.

Record a 3-7 minute video sharing who you are and why you are here. What stories are you ready to let go of? What do you want to build in their place?

Share your video or written reflection below. This is where the journey starts.`,
    seeds: [
      {
        author: "Kai Rautio",
        handle: "@kai_firekeeper",
        body: "I spent three days writing down every belief I had about what success looked like, then I burned the list in my backyard fire pit. Recorded my reflection the next morning. Still processing it. The act of naming what I was carrying was the real quest. Video: [Kai's reflection](https://youtube.com/example_fire)\n\n[EXAMPLE COMMENT - share your own Fire quest reflection below]",
      },
    ],
  },
  {
    slug: "rites-quest-1-potion-brewing",
    questId: 1,
    title: "Quest 1: Potion Brewing — Diversifying Our Inner Soils",
    body: `Quest 1 takes us into the invisible kingdoms: microbiomes, fungi, bacteria, and soil. The life beneath our feet and inside our bodies that makes everything else possible.

Your deliverable: a "Showcasing my Potions" video or article. What ferments, brews, or living cultures are you tending? What have you learned about the microbial world?

Share your potions and discoveries below.`,
    seeds: [
      {
        author: "Anouk van der Berg",
        handle: "@anouk_ferments",
        body: "I have been brewing water kefir and kombucha for two years now but this quest made me actually research what is happening at the microbial level. Made a short video walking through my fermentation shelf and explaining the symbiotic cultures in each jar. Post: [Anouk's video](https://instagram.com/p/example_potion)\n\n[EXAMPLE COMMENT - share your potions below]",
      },
    ],
  },
  {
    slug: "rites-quest-2-saving-seeds",
    questId: 2,
    title: "Quest 2: Saving Seeds — Sovereignty & Co-Evolution",
    body: `Quest 2 is about seed sovereignty. Growing plants that know us, and consciously evolving alongside the plants that nourish us.

Your deliverable: add seeds to swap in your LocalScale profile, or share what seeds you are saving and why.

What varieties are you preserving? What is the story of the seeds in your life?`,
    seeds: [
      {
        author: "Priya Mehta",
        handle: "@priya_seedsaver",
        body: "My grandmother sent me heirloom tomato seeds from Gujarat that have been in our family for at least four generations. This year I grew them out for the first time in British soil. They produced small, incredibly flavourful fruit. I saved seed from the strongest plants. Article: [Priya's seed story](https://medium.com/example_seeds)\n\n[EXAMPLE COMMENT - share your seed saving story below]",
      },
    ],
  },
  {
    slug: "rites-quest-3-healing-wholes",
    questId: 3,
    title: "Quest 3: Healing Wholes — Food Abundance",
    body: `Quest 3 is about gardening our bioregions and homesteads. Healing our relationship to plants and extending our inner soils to relate directly with the land around us.

Your deliverable: a "Showcasing my Healing Whole" video or article. What are you growing? How is your relationship with your garden or land changing?

Share your gardens, experiments, and lessons below.`,
    seeds: [
      {
        author: "Diego Morales",
        handle: "@diego_milpa",
        body: "I converted a 3x4 metre patch of lawn into a three sisters garden this spring: corn, beans, and squash growing together. The beans fix nitrogen for the corn, the squash leaves shade the soil. It is an old system and watching it work in real time has taught me more than any book. Photos: [Diego's milpa](https://instagram.com/p/example_healing)\n\n[EXAMPLE COMMENT - share your garden or land healing story below]",
      },
    ],
  },
  {
    slug: "rites-quest-4-dreaming-spaces-of-love",
    questId: 4,
    title: "Quest 4: Dreaming Spaces of Love — Family Homesteads",
    body: `Quest 4 invites you to design, dream, and co-create your ideal home, garden, and life. A "Kins Domain" for your family of life, intended to meet all your needs.

Your deliverable: a "Map of my current or future Space of Love" video or picture. What does your dream homestead look like? What are you building toward?

Share your visions, sketches, plans, and progress below.`,
    seeds: [
      {
        author: "Linnea Strand",
        handle: "@linnea_kins",
        body: "I drew a full map of my future Space of Love on A3 paper. 1 hectare, fruit forest on the south slope, a natural swimming pond, a cob house with a living roof, and a community kitchen for neighbours. I do not own the land yet. But drawing it made it feel real for the first time. Photo of the map: [Linnea's Space of Love](https://instagram.com/p/example_space)\n\n[EXAMPLE COMMENT - share your Space of Love vision below]",
      },
    ],
  },
  {
    slug: "rites-quest-5-rites-of-love",
    questId: 5,
    title: "Quest 5: Rites of Love — We are the Land",
    body: `Quest 5 is about sacred connection to the Earth and to the people we love. Marrying the Earth and your beloved, remembering we are one with our Spaces of Love.

Your deliverable: a video, article, or... get married! Whatever form your rite of love takes, share it here.

What does it mean to you to be one with the land? Share your rites below.`,
    seeds: [
      {
        author: "Rumi Tanaka",
        handle: "@rumi_earthrites",
        body: "My partner and I did a small ceremony at dawn on the land we are stewarding. We planted a tree together and spoke about what we want this place to become. No officiant, no audience, just us and the land. It was the most real thing I have done in years. Reflection: [Rumi's rite](https://medium.com/example_rites)\n\n[EXAMPLE COMMENT - share your rite of love below]",
      },
    ],
  },
  {
    slug: "rites-quest-6-healing-circles",
    questId: 6,
    title: "Quest 6: Healing Circles — Community Gathering",
    body: `Quest 6 asks you to gather in natural spaces with 10 or more other humans to swap and practice healing modalities. Share whatever modality you are most aligned with.

Your deliverable: a "How we gathered, what we learned" video or article.

How did you bring people together? What happened when you did? Share your healing circle stories below.`,
    seeds: [
      {
        author: "Ayo Ogundimu",
        handle: "@ayo_circles",
        body: "Organised a healing circle in a park in Lagos with 14 people. We did a round of breathwork, then paired off for active listening exercises, then came back together to share. Most of us were strangers at the start. By the end we were exchanging numbers and planning the next one. Video recap: [Ayo's circle](https://youtube.com/example_circle)\n\n[EXAMPLE COMMENT - share your healing circle experience below]",
      },
    ],
  },
  {
    slug: "rites-quest-7-wild-foraging",
    questId: 7,
    title: "Quest 7: Wild Foraging — Deep Nourishment",
    body: `Quest 7 is about foraging mushrooms, medicinal herbs, berries, and tree magic. Eating sunlight and enjoying food plant-to-mouth while attuning to our ideal diets.

Your deliverable: a "What did I harvest and what did I do with it?" video or article.

What wild foods are growing around you? Share your foraging finds below.`,
    seeds: [
      {
        author: "Signe Eriksen",
        handle: "@signe_wildfoods",
        body: "Went out yesterday and found chanterelles, wood sorrel, and wild garlic within a 20-minute walk of my house. Made a simple pasta with all three. It costs nothing and tastes like the forest distilled. The identification process forces you to slow down and really look at what is growing around you. Post: [Signe's forage](https://instagram.com/p/example_forage)\n\n[EXAMPLE COMMENT - share your foraging story below]",
      },
    ],
  },
  {
    slug: "rites-quest-8-medicine-journey",
    questId: 8,
    title: "Quest 8: Medicine Journey — Inner Exploration",
    body: `Quest 8 is a guided journey into the depths of consciousness. Exploring the medicine within and around us.

Your deliverable: a reflection on your medicine journey. This is deeply personal work, so share only what feels right.

What did you discover? What shifted? Share your reflections below.`,
    seeds: [
      {
        author: "Ezra Whitfield",
        handle: "@ezra_innerwork",
        body: "My medicine journey was a 4-day silent retreat in the mountains. No substances, just silence, fasting, and sitting with whatever came up. What came up was grief I did not know I was carrying. I wrote about it afterward. Not ready to share the full piece publicly yet, but the short version: I came back lighter. Reflection: [Ezra's journey notes](https://medium.com/example_medicine)\n\n[EXAMPLE COMMENT - share your own medicine journey reflection below]",
      },
    ],
  },
  {
    slug: "rites-quest-9-tree-talk",
    questId: 9,
    title: "Quest 9: Tree Talk — Forest Communication",
    body: `Quest 9 is about learning to communicate with and understand the wisdom of trees. Deepening our relationship with the forest.

Your deliverable: a "My conversation with trees" video or article. Go spend time with a tree. Sit with it. Listen. See what happens.

Share your tree talk experiences below.`,
    seeds: [
      {
        author: "Maren Lindqvist",
        handle: "@maren_treespeaker",
        body: "There is a 400-year-old oak near my village. I have walked past it thousands of times. For this quest I sat at its base for two hours with a notebook. What I noticed: the sound of the wind through its canopy changes throughout the day. Birds use different branches at different times. There is a whole schedule happening that I had never paid attention to. Video: [Maren's tree talk](https://youtube.com/example_tree)\n\n[EXAMPLE COMMENT - share your tree talk experience below]",
      },
    ],
  },
  {
    slug: "rites-quest-10-communication-patterns",
    questId: 10,
    title: "Quest 10: Communication Patterns — How We Relate",
    body: `Quest 10 is about exploring and improving our patterns of communication. Learning to listen deeply and speak authentically.

Your deliverable: a reflection on communication patterns. What patterns do you notice in how you relate to others? What would you like to change?

Share your reflections and experiments below.`,
    seeds: [
      {
        author: "Ines Cardoso",
        handle: "@ines_relating",
        body: "I recorded myself in three different conversations (with permission) and listened back. The patterns were humbling: I interrupt, I finish people's sentences, and I start formulating my response before they finish speaking. Recognising it is the first step. Working on it now. Post: [Ines's reflection](https://linkedin.com/posts/example_comm)\n\n[EXAMPLE COMMENT - share your communication pattern reflection below]",
      },
    ],
  },
  {
    slug: "rites-quest-11-coordination-patterns",
    questId: 11,
    title: "Quest 11: Coordination Patterns — How We Organize",
    body: `Quest 11 is about understanding how we coordinate as groups. Exploring governance, decision-making, and collective action.

Your deliverable: an analysis of coordination patterns. How does your community, project, or team make decisions? What works? What breaks down?

Share your observations and experiments below.`,
    seeds: [
      {
        author: "Tariq Mansoor",
        handle: "@tariq_governance",
        body: "I mapped the actual decision-making patterns in our local food co-op vs the ones in our charter. They are almost completely different. The formal process involves proposals and votes. The real process involves three people having coffee and then telling everyone else what was decided. Writing up the gap analysis now. Thread: [Tariq's analysis](https://x.com/tariq_governance/status/example_coord)\n\n[EXAMPLE COMMENT - share your coordination pattern observations below]",
      },
    ],
  },
  {
    slug: "rites-quest-12-breathplay-future-dreaming",
    questId: 12,
    title: "Quest 12: Breathplay & Future Dreaming — Visioning Together",
    body: `Quest 12 uses breathwork to access expanded states and dream into the future we want to create together.

Your deliverable: a vision board or future dreaming video. What future are you breathing into existence?

Share your visions, dreamings, and breathwork experiences below.`,
    seeds: [
      {
        author: "Zara Njoku",
        handle: "@zara_breathwork",
        body: "Led a 90-minute breathwork session with 8 friends in my living room, followed by a collective visioning exercise. We each drew what we saw during the breathwork. The overlaps between our visions were striking: water, trees, children playing, and circles of people cooking together. Compiled our drawings into a group vision board. Photos: [Zara's vision board](https://instagram.com/p/example_breath)\n\n[EXAMPLE COMMENT - share your breathwork or future dreaming experience below]",
      },
    ],
  },
  {
    slug: "rites-quest-13-fasting",
    questId: 13,
    title: "Quest 13: Fasting — Regenerative Ikigai",
    body: `Quest 13 is about discovering your unique purpose through the practice of fasting and deep reflection. Minimum: a 3-day fast. Return to this quest whenever you need to reset and rediscover your role in the regenerative movement.

Your deliverable: a "My Regenerative Ikigai" reflection. What is your purpose? What role are you here to play?

Share your fasting experiences and ikigai reflections below.`,
    seeds: [
      {
        author: "Nils Bergstrom",
        handle: "@nils_faster",
        body: "Just finished a 5-day water fast. Days 1-2 were rough. Day 3, something shifted. By day 4 I had a clarity about my work that I have been chasing for months. My ikigai: I am here to build bridges between traditional ecological knowledge and modern governance systems. That sentence came to me on an empty stomach and it has not left. Reflection: [Nils's ikigai](https://medium.com/example_fasting)\n\n[EXAMPLE COMMENT - share your fasting or ikigai reflection below]",
      },
    ],
  },
];

// Food Foresting quest forum post (goes in land-projects category)
export const FOOD_FORESTING_FORUM_POST: RitesForumPost = {
  slug: "food-foresting-being-human-again",
  questId: -1, // special: featured quest, not numbered
  title: "Food Foresting: Being Human Again",
  body: `Go out with your friends and family and plant seeds for fruiting plants in public spaces, parks, forests, and anywhere nature can thrive. This quest is about turning our planet into a food forest where hunger is no longer relevant.

Your deliverable: a video (under 3 minutes) and/or a written article documenting your adventure. What did you plant? Where? What was the joy of being human again?

Share your food foresting stories, photos, and videos below.`,
  seeds: [
    {
      author: "Miriam Achebe",
      handle: "@miriam_foodforest",
      body: "Spent Saturday morning with my kids and two other families guerrilla-planting fruit trees in an abandoned lot near our neighbourhood. We put in 4 mango seedlings and 6 papaya starts. The kids were covered in dirt and grinning. That is what being human again looks like. Video: [Miriam's planting day](https://youtube.com/example_foodforest)\n\n[EXAMPLE COMMENT - share your food foresting story below]",
    },
  ],
};
