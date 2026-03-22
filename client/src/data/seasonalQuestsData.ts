/**
 * Seasonal quests — the 18 new quests from QUEST_MASTER_SHEET Part 4.
 * These are not yet in the seasons carousel; they render in SeasonalQuestFeed.
 */

export interface SeasonalQuest {
  id: string;
  title: string;
  season: "spring" | "summer" | "fall" | "winter" | "any";
  tagline: string;
  description: string;
  deliverable: string;
  estimatedTime: string;
  element: "earth" | "water" | "fire" | "air";
  reward?: { regen: number; rvoice: number };
}

export const seasonalQuestsData: SeasonalQuest[] = [
  // Spring
  {
    id: "healing-five-bodies",
    title: "Healing the Five Bodies",
    season: "spring",
    tagline: "Tend to every layer of yourself this season.",
    description:
      "Most healing traditions recognize multiple layers of the human being: Soul, Physical, Emotional, Mental, and Spiritual. Create a daily and seasonal practice that tends to all five. Design it with both masculine and feminine lenses. Document and share your practice.",
    deliverable: "A documented daily practice tending all five bodies, with reflections on what you noticed.",
    estimatedTime: "Ongoing practice, at least one month",
    element: "fire",
    reward: { regen: 144, rvoice: 1 },
  },
  {
    id: "study-natural-hygiene",
    title: "Study Natural Hygiene",
    season: "spring",
    tagline: "What actually creates health? Go back to the source.",
    description:
      "Natural hygiene is the tradition arguing that health comes from clean air, pure water, vital foods, rest, sunlight, and right relationship. Spend one month studying this tradition and practicing its core principles. Read at least one primary text. Document how your understanding of your own body and health changes.",
    deliverable: "A written reflection on your key learnings and how your health practices shifted.",
    estimatedTime: "One month practice",
    element: "earth",
    reward: { regen: 111, rvoice: 1 },
  },
  {
    id: "community-currency",
    title: "Launch a Community Currency",
    season: "spring",
    tagline: "Plant the seeds of a new economy.",
    description:
      "Research existing community currencies (SEEDS, Sarafu, Bristol Pound, BerkShares). Design and coordinate the launch of a currency for your community or bioregion. This can start as a simple skills exchange ledger or grow into a full token system. Host a launch event. Document the design process and launch.",
    deliverable: "A launched currency, a documented design process, and a short video or write-up of the event.",
    estimatedTime: "2-3 months",
    element: "water",
    reward: { regen: 333, rvoice: 1 },
  },

  // Summer
  {
    id: "friendship-free-animal",
    title: "Friendship with a Free Animal",
    season: "summer",
    tagline: "Build a relationship on their terms.",
    description:
      "Build a genuine friendship with a wild or semi-wild animal. Not taming. Not feeding to the point of dependency. A real friendship built on mutual trust and respect, in which the animal chooses to be in relationship with you. Spend time consistently in the same place. Let the animal come to you.",
    deliverable:
      "A documented account of the relationship as it developed, with reflections on attention, patience, and non-human intelligence.",
    estimatedTime: "Ongoing, minimum one season",
    element: "earth",
    reward: { regen: 111, rvoice: 1 },
  },
  {
    id: "honey-moon",
    title: "Your Honey Moon",
    season: "summer",
    tagline: "A lunar cycle of simplicity and sweetness.",
    description:
      "For one full moon cycle (28-29 days), reduce your diet to primarily raw honey and bee pollen, supplemented with water, herbal teas, and small amounts of whole foods as needed. This is a mono-diet cleanse, not a starvation fast. Document what changes in your body, mind, mood, and clarity.",
    deliverable: "A written or recorded account of the full lunar cycle, shared with the community.",
    estimatedTime: "One lunar cycle (28-29 days)",
    element: "fire",
    reward: { regen: 144, rvoice: 1 },
  },
  {
    id: "singing-food-forest",
    title: "Singing to Your Food Forest",
    season: "summer",
    tagline: "Sound is relationship. Tend your land with your voice.",
    description:
      "Plants respond to sound. The act of singing to something you tend deepens your relationship to it and to the act of care. Develop a regular practice of singing to your garden, food forest, or the woods near you. Invent songs. Use songs you know. Hum if that is what comes. Document the practice.",
    deliverable:
      "A recording or video of you singing to your garden, and a reflection on what changed.",
    estimatedTime: "Daily practice, one month",
    element: "air",
    reward: { regen: 77, rvoice: 1 },
  },
  {
    id: "animal-spirit-totems",
    title: "Animal Spirit Totems and Bioregional Clan",
    season: "summer",
    tagline: "Who are your wild kin?",
    description:
      "Research the animals, plants, fungi, and elements most significant in your bioregion. Identify which ones you feel most called to. Learn about them deeply. Create something expressing this connection (art, writing, ceremony, costume, song). Identify or create your bioregional clan identity with others in your region.",
    deliverable: "A piece of art, ceremony, or written account expressing your bioregional identity.",
    estimatedTime: "2-4 weeks of research and creation",
    element: "air",
    reward: { regen: 111, rvoice: 1 },
  },

  // Fall
  {
    id: "future-casting",
    title: "Future Casting: Collective Time Travel",
    season: "fall",
    tagline: "Where are we actually heading? Go see.",
    description:
      "Do a guided meditation or solo journey in which you travel forward in time to a regenerative future. Experience it fully: what does it look like, smell like, taste like, feel like? Come back and write your account. Not a wish list. A sensory, specific story of a real day in that future. Share it with the community.",
    deliverable: "A written account of a day in a regenerative future, shared to help build our collective vision.",
    estimatedTime: "One journey session, plus writing time",
    element: "air",
    reward: { regen: 77, rvoice: 1 },
  },
  {
    id: "eating-sunlight",
    title: "Eating Sunlight: Plant to Mouth for One Month",
    season: "fall",
    tagline: "What does alive food actually feel like?",
    description:
      "For one full month, eat at least one item daily that goes directly from a living plant into your mouth with no processing, cooking, or storage in between. A leaf from your garden. A berry from a bush. A herb from a pot on your windowsill. Document what you notice in your body and your relationship to food.",
    deliverable: "A documented month of plant-to-mouth eating, with observations on what changed.",
    estimatedTime: "One month daily practice",
    element: "earth",
    reward: { regen: 99, rvoice: 1 },
  },
  {
    id: "becoming-trauma-informed",
    title: "Becoming Trauma Informed",
    season: "fall",
    tagline: "Understanding trauma changes how you see everything.",
    description:
      "Watch Gabor Mate's trauma masterclass in full. Apply what you learn to your understanding of yourself, your family history, and the communities you are part of. Write a reflection on how this changes your understanding and practice. Trauma is not an exception in our culture. Understanding it changes how we see behavior, addiction, conflict, and healing.",
    deliverable: "A written reflection on how trauma-informed understanding changes your perspective and practice.",
    estimatedTime: "One week of watching, ongoing integration",
    element: "water",
    reward: { regen: 111, rvoice: 1 },
  },

  // Winter
  {
    id: "write-childrens-book",
    title: "Write a Children's Book",
    season: "winter",
    tagline: "Show the next generation what we are building.",
    description:
      "Write a children's book about a day in the life of a regenerative civilization. Not a utopian lecture. A story. What does a child experience in a world where food grows everywhere, where communities are designed around human and ecological flourishing? Make it true to that world, not just a criticism of this one. Illustrate it if you can.",
    deliverable: "A completed children's book, shared with the community.",
    estimatedTime: "2-6 weeks of writing and illustration",
    element: "air",
    reward: { regen: 177, rvoice: 1 },
  },
  {
    id: "make-a-song",
    title: "Make a Song for the ReGeneration",
    season: "winter",
    tagline: "Our movement needs a hymn. Yours might be it.",
    description:
      "Write and record a song about regeneration for our shared Hymns for the ReGeneration album. It does not need to be polished. It needs to be real. Songs that will matter to this movement will come from lived experience, not from trying to sound like something. Any instrument, any genre, any length. Share it with the community.",
    deliverable: "A recorded song, shared with the community.",
    estimatedTime: "Hours to weeks depending on your process",
    element: "fire",
    reward: { regen: 111, rvoice: 1 },
  },
  {
    id: "recreate-personal-cycles",
    title: "Recreate Your Personal Cycles",
    season: "winter",
    tagline: "Align your life with the rhythms that actually govern it.",
    description:
      "Study the natural cycles that govern life: lunar cycles, solar cycles, seasonal cycles, circadian rhythms, the 13-moon calendar. Map your own energy, creativity, rest, and social needs across at least one full lunar cycle. Design a personal calendar that aligns your rhythms with natural cycles rather than the industrial work week. Live it for one month.",
    deliverable: "A documented personal cycle map and a one-month reflection on living by it.",
    estimatedTime: "One month of tracking, one month of practice",
    element: "earth",
    reward: { regen: 111, rvoice: 1 },
  },

  // Anytime
  {
    id: "decrease-expenses",
    title: "Decrease Expenses, Increase Joy",
    season: "any",
    tagline: "What are you paying for that isn't making your life better?",
    description:
      "Track your spending for one month. Identify purchases that did not actually increase your joy or wellbeing. Replace at least three of them with alternatives that cost less and feel better. Make a short video sharing your before and after: what you cut, what you replaced it with, and whether the trade felt like a gain or a loss.",
    deliverable: "A short video or written account of your before and after.",
    estimatedTime: "One month of tracking",
    element: "earth",
    reward: { regen: 77, rvoice: 1 },
  },
  {
    id: "hermetic-seal",
    title: "Hermetic Seal: Transmuting Sexual Energy",
    season: "any",
    tagline: "What becomes possible when you redirect your most potent energy?",
    description:
      "Sexual energy is one of the most potent creative forces available to us. This quest is about consciously redirecting that energy rather than expending it. A period of no orgasm, with intention placed on channeling the energy into creative work, projects, healing, or spiritual practice. Document what changes in your focus, creativity, and vitality.",
    deliverable: "A reflection on what changed in your focus, creativity, and vitality during the practice.",
    estimatedTime: "Minimum two weeks, one lunar cycle recommended",
    element: "fire",
    reward: { regen: 144, rvoice: 1 },
  },
  {
    id: "start-friend-pool",
    title: "Start a Friend Pool",
    season: "any",
    tagline: "Practice collective resource management with people you trust.",
    description:
      "Gather 3 to 10 friends and pool some resources together toward meeting your group's shared needs. This can be as simple as a shared grocery run, a skill swap circle, a tool library, or a shared savings fund for group goals. Practice collective resource management at a small scale. Document how you set it up, what agreements you made, and what you learned.",
    deliverable: "A documented account of your pool: how you set it up, your agreements, and what you learned.",
    estimatedTime: "Ongoing, start small",
    element: "water",
    reward: { regen: 111, rvoice: 1 },
  },
  {
    id: "present-parenting",
    title: "Present Parenting: The First Three Years",
    season: "any",
    tagline: "The most important years. Show up for them.",
    description:
      "If you have or are expecting a child in the first three years of life, this quest is an invitation to prioritize presence over productivity. Whatever it takes, give your child at least 8 hours per day of genuine attentive presence. Document the practice, the challenges, the support systems you needed to build, and what you observed in your child and yourself.",
    deliverable: "A documented reflection on the practice, challenges, and what you observed.",
    estimatedTime: "3 years (ongoing commitment)",
    element: "earth",
    reward: { regen: 444, rvoice: 1 },
  },
  {
    id: "fifth-agreement",
    title: "The Fifth Agreement",
    season: "any",
    tagline: "The stories we tell about reality shape the reality we live in.",
    description:
      "Read The Fifth Agreement by Don Miguel Ruiz and Don Jose Ruiz. This book extends the Four Agreements into a full manual for breaking old agreements about reality and making new ones. Join the monthly book club on the forum. After reading and putting the lessons into practice, share your perspective as an article, video, or voice recording.",
    deliverable: "A reflection shared with the community: what you want others in this game to understand from your reading.",
    estimatedTime: "2-4 weeks reading, ongoing practice",
    element: "air",
    reward: { regen: 99, rvoice: 1 },
  },

  // ─── New quests added Fix 90 ────────────────────────────────────────────────
  // These quests have new IDs distinct from the entries above.
  // Quests whose IDs already exist above (healing-five-bodies, study-natural-hygiene,
  // friendship-free-animal, singing-food-forest, animal-spirit-totems, future-casting,
  // eating-sunlight, becoming-trauma-informed, write-childrens-book, recreate-personal-cycles,
  // hermetic-seal, start-friend-pool, present-parenting) are already represented above.

  // Spring
  {
    id: "regen-financial-systems",
    title: "ReGen Financial Systems",
    season: "spring",
    tagline: "Money as a regenerative tool.",
    description:
      "This quest is about understanding how money can flow regeneratively. Learn about gift economies, mutual credit, and community currencies, then make one concrete change to how you use money.",
    deliverable: "A personal financial system map showing one regenerative shift you have made.",
    estimatedTime: "Weekend workshop or 2-week self-directed",
    element: "air",
    reward: { regen: 333, rvoice: 1 },
  },

  // Summer
  {
    id: "your-honey-moon",
    title: "Your Honey Moon",
    season: "summer",
    tagline: "A month of sweetness.",
    description:
      "For one full moon cycle, practice bringing sweetness into every day. This might be honey in your tea, a kind word, a moment of beauty. Document your practice.",
    deliverable: "A documented practice of one act of sweetness or beauty per day for a lunar month.",
    estimatedTime: "One full moon cycle",
    element: "water",
    reward: { regen: 144, rvoice: 1 },
  },

  // Winter
  {
    id: "make-song-regeneration",
    title: "Make a Song for the ReGeneration",
    season: "winter",
    tagline: "Music as medicine.",
    description:
      "Music carries what words alone cannot. Write and record a song for the regenerative movement. It can be simple or complex, personal or political. Offer it to the community.",
    deliverable: "A recorded song (any style, any length) offered to the community.",
    estimatedTime: "One to three weeks",
    element: "fire",
    reward: { regen: 111, rvoice: 1 },
  },

  // Anytime
  {
    id: "decrease-expenses-increase-joy",
    title: "Decrease Expenses, Increase Joy",
    season: "any",
    tagline: "Elegant simplicity.",
    description:
      "Voluntary simplicity and regenerative abundance are not opposites. This quest challenges you to find one area where spending less opens up more life.",
    deliverable: "A written report on one expense you eliminated and how your joy changed.",
    estimatedTime: "One month experiment",
    element: "air",
    reward: { regen: 77, rvoice: 1 },
  },
  {
    id: "the-fifth-agreement",
    title: "The Fifth Agreement",
    season: "any",
    tagline: "Skepticism as wisdom.",
    description:
      "Based on Don Miguel Ruiz's work, the Fifth Agreement is: be skeptical but learn to listen. This quest is an invitation to study and practice this agreement in your relationships.",
    deliverable: "A written reflection on how the Fifth Agreement is changing your relationships.",
    estimatedTime: "2-4 week reading and reflection",
    element: "air",
    reward: { regen: 99, rvoice: 1 },
  },

  // Ringing Cedars — Wave 1.6
  {
    id: "ringing-cedars",
    title: "The Ringing Cedars",
    season: "any",
    tagline: "Ancient wisdom for a regenerative world.",
    description:
      "Read the Ringing Cedars of Russia series by Vladimir Megre. 10 books carrying an unbroken thread of knowledge about how humans once lived in genuine harmony with the Earth. Read with a regenerative lens: notice how her people organized communities, tended land, raised children, and thought about the long arc of civilization. Post a reflection in the forum after each book. Claim your tokens when you finish.",
    deliverable:
      "One forum post per book reflecting through a regenerative lens. Claim tokens once at the end (33 $ReGen + 1 RGVoice per book; full series: 333 $ReGen + 10 RGVoice + cedar tree badge).",
    estimatedTime: "Self-paced. One book is 4-10 hours; full series over weeks or months.",
    element: "air",
    reward: { regen: 33, rvoice: 1 },
  },
];

export type { SeasonalQuest as default };
