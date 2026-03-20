export interface WelcomeAboardQuest {
  id: string; // "welcome-aboard-1" through "welcome-aboard-10"
  number: number;
  title: string;
  tagline: string;
  reward: string;
  forumUrl: string;
  about: string;
  steps: string[];
  bonus?: string;
}

export const WELCOME_ABOARD_QUESTS: WelcomeAboardQuest[] = [
  {
    id: "welcome-aboard-1",
    number: 1,
    title: "Share Your Experience and Give Constructive Feedback",
    tagline: "Your perspective makes the site better for everyone.",
    reward: "33 $ReGen + 0.1 RGVoice",
    forumUrl: "/community/quests-gameplay",
    about:
      "ReGen Civics is a living project, and your experience on the site is genuinely valuable data. This quest invites you to reflect on what you felt, noticed, and imagined while exploring. What sparked curiosity? What felt confusing? What would make this a place you would want to bring your whole community into? You do not need to be a developer or designer. Your honest human experience is exactly what is needed.",
    steps: [
      "Comment on the forum post for this quest (link below). Share your honest thoughts about your experience on the site: what is working, what could be clearer, and any improvements you would love to see.",
      "Post on your social media (any platform) sharing your feedback or impressions of the site. Positive, constructive, or anything in between. All signal is good signal.",
      "Include a link to your social post inside your forum comment to complete the quest.",
    ],
  },
  {
    id: "welcome-aboard-2",
    number: 2,
    title: "Write Your Regenerative Origin Story",
    tagline: "What woke you up? How did you get here?",
    reward: "33 $ReGen + 0.1 RGVoice",
    forumUrl: "/community/general",
    about:
      "Every person in this community arrived here through a story. A book, a conversation, a crisis, a piece of land, a moment of grief or wonder that cracked something open. This quest invites you to write that story down. Not as a polished essay, but as a genuine account: what woke you up to the regenerative path, and how did you find your way here? When we share our origin stories, we recognise each other. We remember that this is not an accident. We are all here on purpose.",
    steps: [
      "Write your Regenerative Origin Story: what called you to this work, and how did you arrive at ReGen Civics? A paragraph is enough. A page is welcome.",
      "Share it in the forum post below.",
      "Post it on social media (a thread, a caption, an article) and include the link in your forum comment to complete the quest.",
    ],
  },
  {
    id: "welcome-aboard-3",
    number: 3,
    title: "Do a Regenerative Act",
    tagline: "Bring the Game into the physical world.",
    reward: "33 $ReGen + 0.1 RGVoice",
    forumUrl: "/community/quests-gameplay",
    about:
      "The most powerful quests bridge the digital and the physical. This one is simple: do one small, intentional regenerative act in the real world today. Plant something. Cook a meal with locally sourced food. Help repair something that would otherwise go to landfill. Thank a farmer. Clean up a stretch of waterway or trail. Pick up litter on your walk. Compost for the first time. Say no to single-use plastic all day. The act does not have to be grand. It has to be real, intentional, and yours. The value is in doing and in witnessing each other doing.",
    steps: [
      "Do one real, intentional regenerative act in the physical world. It can be anything: gardening, cooking, repairing, connecting, giving, cleaning, creating.",
      "Share what you did in the forum post below. A photo, a paragraph, or even a sentence. Just make it real.",
      "Post about your act on social media to inspire others, and link to your post in your forum comment.",
    ],
  },
  {
    id: "welcome-aboard-4",
    number: 4,
    title: "Connect with Your Bioregion",
    tagline: "Know where you are. Know what you belong to.",
    reward: "33 $ReGen + 0.1 RGVoice",
    forumUrl: "/community/land-projects",
    about:
      "Most of us live in places we can name but cannot truly read. We know our street address but not our watershed. We know our city but not which migratory birds pass through it each spring. We know our country but not which old-growth trees once covered the land we walk on. This quest is an invitation to research your bioregion, the living ecological community you inhabit, and share what you discover. This kind of rooted knowledge is the foundation of all genuine regenerative action. You cannot tend what you do not know.",
    steps: [
      "Research your bioregion. Find out what watershed you live in, what native plants and animals call your area home, and one thing about the ecological or land history of where you are. (Try watershedproject.org or inaturalist.org as a starting point.)",
      "Share three things you discovered and one thing that surprised you in the forum post below.",
      "Post your bioregion discovery on social media to invite others into this kind of rootedness, and include the link in your forum comment.",
    ],
  },
  {
    id: "welcome-aboard-5",
    number: 5,
    title: "Make Friends and Support",
    tagline: "New here? Someone needs you. Already settled in? Someone needs you too.",
    reward: "33 $ReGen + 0.1 RGVoice",
    forumUrl: "/community/c/make-friends",
    about:
      "The Regenerative Renaissance is not built by isolated individuals. It is built by people who find each other. This quest is simple: reach out to someone in the ReGen Civics community you have not connected with before. Welcome a newcomer. Answer a question someone left unanswered. Respond to an origin story that moved you. Introduce yourself to someone whose project interests you. You do not need a reason beyond genuine curiosity and care. A community that notices its members and reaches toward them is a community worth belonging to.",
    steps: [
      "Find someone in the ReGen Civics community you have not connected with yet. Reach out: leave a comment, send a message, respond to something they posted.",
      "Share the connection in the forum post below. Who did you reach out to and why? What came of it?",
      "Post about the value of community-building in the regenerative movement on social media, and link to your post in your forum comment.",
    ],
  },
  {
    id: "welcome-aboard-6",
    number: 6,
    title: "Pledge Your Gift",
    tagline: "What do you bring to the Regenerative Renaissance?",
    reward: "33 $ReGen + 0.1 RGVoice",
    forumUrl: "/community/c/pledge-gift",
    about:
      "The Regenerative Renaissance needs every gift, not just farmers and ecologists, but storytellers, coders, musicians, healers, teachers, lawyers, cooks, architects, parents, and elders. This quest invites you into a moment of genuine self-inquiry: What is the unique gift you carry? What would you contribute if you knew it was needed and valued? You do not need to have it fully figured out. A direction, an intention, a question you are following, all of these count. Writing it down and sharing it with a community who cares is itself a powerful act.",
    steps: [
      "Write your Gift Pledge: a 1-5 sentence statement of what you bring or want to bring to the Regenerative Renaissance. It can be concrete or directional.",
      "Share your pledge in the forum post below.",
      "Post your pledge on social media as a public commitment and link to it in your forum comment.",
    ],
  },
  {
    id: "welcome-aboard-7",
    number: 7,
    title: "Explore Our Foundations",
    tagline: "11+ years of exploration, distilled into a short playlist of videos.",
    reward: "33 $ReGen + 0.1 RGVoice",
    forumUrl: "/community/resources-learning",
    about:
      "ReGen Civics did not emerge overnight. It grew from more than a decade of asking hard questions about land, money, governance, and what healing a civilisation actually takes. This quest invites you to watch the Foundational Series: four short videos that distil that journey and illuminate the vision we are building toward together. After watching, you will understand not just what ReGen Civics is, but why it has to exist. Then share what you found with the people in your life who are also searching.",
    steps: [
      "Watch the Foundational Series (4 videos) at: regencivics.earth/foundations",
      "Write a reflection, summary, or creative response. It could be a paragraph, an article, a poem, a thread. Even a single sentence of genuine insight counts.",
      "Share your reflection in the forum post below and post it on social media. Include the link in your forum comment.",
    ],
  },
  {
    id: "welcome-aboard-8",
    number: 8,
    title: "Refer an Organisation Project",
    tagline: "Who helps land regenerate? Bring them too.",
    reward: "33 $ReGen + 0.1 RGVoice",
    forumUrl: "/community/alliance-partners",
    about:
      "Behind every healthy land project is a web of support: legal advisors, infrastructure builders, seed banks, water engineers, permaculture educators, carbon verifiers, funding facilitators, and more. Land cannot regenerate in isolation; it needs a whole ecosystem of expertise and care around it. These are the Organisation Projects. This quest asks you to look at your network and ask: who is doing the enabling work? Invite them in. Every organisation that joins strengthens the conditions for land to heal.",
    steps: [
      "Share the ReGen Civics site (regencivics.earth) with any organisations that support land projects in a regenerative way: legal, infrastructure, education, funding, technology, ecological services, and more.",
      "Comment in the forum post below: share who you reached out to and/or link to a social media post inviting organisations to join.",
      "Include your social post link in your forum comment to complete the quest.",
    ],
    bonus: "If an organisation you referred is selected to join the Alliance, you earn an additional 2,222 $ReGen tokens.",
  },
  {
    id: "welcome-aboard-9",
    number: 9,
    title: "Refer a Land Project",
    tagline: "Know someone stewarding land? Bring them in.",
    reward: "33 $ReGen + 0.1 RGVoice",
    forumUrl: "/community/c/refer-land",
    about:
      "The ReGen Civics Alliance is only as strong as the land it is rooted in. Land projects, farms, forests, rewilding initiatives, food forests, regenerative homesteads: these are not just projects. They are places where healing is actively happening. They are the heart of what we are building together. If you know someone doing this work, this quest is an invitation to bridge them in. A single introduction can ripple out in ways neither of you can predict.",
    steps: [
      "Share the ReGen Civics site (regencivics.earth) with any land project stewards you know. A message, an email, a mention. Any outreach counts.",
      "Comment in the forum post below: share who you reached out to (name, project, or just a description is fine) and/or link to a social media post where you have invited land projects to join the alliance.",
      "Include your social media post link in your forum comment to complete the quest.",
    ],
    bonus: "If a land project you referred is selected to join the Alliance, you earn an additional 2,222 $ReGen tokens for making the connection happen.",
  },
  {
    id: "welcome-aboard-10",
    number: 10,
    title: "Dream Up a Regenerative Quest",
    tagline: "Step from player to co-creator of the Game.",
    reward: "33 $ReGen + 0.1 RGVoice",
    forumUrl: "/community/quests",
    about:
      "Every great game is shaped by the people who play it. This quest invites you into the creative heart of ReGen Civics: imagining new quests that add value to the Regenerative Renaissance. The best quests are ones that draw on your unique gifts and life purpose, bridge multiple forms of capital (social, ecological, financial, intellectual), are inherently scalable, and are genuinely fun to play. Before brainstorming, try this: take the question to sleep with you. Let your dreaming mind offer something unexpected.",
    steps: [
      "Sleep on a quest idea, let your subconscious work on it overnight.",
      "Write up your quest idea and share it in the forum post below. Include: a title, a brief description of what the player does, and what value it creates for the ecosystem.",
      "Post your quest idea on social media to open the invitation to others, and include your social post link in your forum comment.",
    ],
    bonus: "If your quest idea is voted to the top by the community and implemented into the Game, you earn an additional 1,111 $ReGen tokens.",
  },
];
