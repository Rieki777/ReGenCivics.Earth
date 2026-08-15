/**
 * The Rite of Truth deck: 33 oracle cards drawn on the Saturday rite aboard the
 * ReGen Ship (Sanctuary of Love season). Each card carries a title, its section
 * of the deck, a depth (Light or Deep), an epigraph (the quoted line it grows
 * from), and the prompt itself (the truth question a crew answers by the fire).
 *
 * The draw is ceremonial, never scored. Within a session the deck is walked once
 * without repeats, then it reshuffles whole. See useRiteDraw in
 * client/src/components/ship/RiteOfTruthDeck.tsx.
 *
 * Card art lives in client/public/images/ship/rite-cards/ as card-NN-slug.webp,
 * generated with the nano-banana-pro skill. Prompts are recorded in
 * docs/ship/RITE_OF_TRUTH_ART_PROMPTS.md; the deck content in
 * docs/ship/RITE_OF_TRUTH_DECK.md.
 */

export type RiteDepth = "Light" | "Deep";

export interface RiteCard {
  /** 1-based position in the deck, matching the card art filename. */
  id: number;
  /** Stable slug, matches the image filename (card-NN-slug.webp). */
  slug: string;
  title: string;
  /** The movement of the deck this card belongs to. */
  section: string;
  depth: RiteDepth;
  /** The quoted line the card grows from. */
  epigraph: string;
  /** The truth question the crew answers aloud. */
  prompt: string;
  /** Path passed to shipImg(): images/ship/<image>. */
  image: string;
}

/** Build the asset path for a card by id + slug. */
function cardImage(id: number, slug: string): string {
  return `rite-cards/card-${String(id).padStart(2, "0")}-${slug}.webp`;
}

export const RITE_OF_TRUTH_CARDS: RiteCard[] = [
  {
    id: 1,
    slug: "the-fire",
    title: "The Fire",
    section: "Keystone",
    depth: "Deep",
    epigraph:
      "Fire burns up the stories, the maladaptions, the perspectives that no longer serve us. We start and end by the fire.",
    prompt:
      "Name one story or belief you are ready to let burn tonight. Speak it aloud, then release it to the flames.",
    image: cardImage(1, "the-fire"),
  },
  {
    id: 2,
    slug: "the-forgotten-pleasure",
    title: "The Forgotten Pleasure",
    section: "Imagine the Pleasures",
    depth: "Light",
    epigraph: "There's a pleasure in this life we've forgotten how to feel.",
    prompt: "Name one pleasure you have forgotten how to feel. Speak it back into being.",
    image: cardImage(2, "the-forgotten-pleasure"),
  },
  {
    id: 3,
    slug: "sun-ripe",
    title: "Sun-Ripe",
    section: "Imagine the Pleasures",
    depth: "Light",
    epigraph: "Bite into the sunlight, juice exploding ecstasy.",
    prompt:
      "Share a simple sensory pleasure you love, a taste, a warmth, a sound, and why it delights you.",
    image: cardImage(3, "sun-ripe"),
  },
  {
    id: 4,
    slug: "pleasure-as-compass",
    title: "Pleasure as Compass",
    section: "Imagine the Pleasures",
    depth: "Deep",
    epigraph: "Pleasure is our compass, pleasure is the sign.",
    prompt: "What is one thing your body knows is true that your mind keeps arguing with?",
    image: cardImage(4, "pleasure-as-compass"),
  },
  {
    id: 5,
    slug: "the-shade-youll-become",
    title: "The Shade You'll Become",
    section: "Imagine the Pleasures",
    depth: "Deep",
    epigraph:
      "You'll become the shade for seven generations more of children who will play.",
    prompt:
      "What do you want to still be giving long after you are gone? Speak the legacy you are planting.",
    image: cardImage(5, "the-shade-youll-become"),
  },
  {
    id: 6,
    slug: "who-you-look-up-to",
    title: "Who You Look Up To",
    section: "Children",
    depth: "Light",
    epigraph: "Who do the children look up to?",
    prompt: "Who did you look up to at twelve, and who looks up to you now? Speak both names.",
    image: cardImage(6, "who-you-look-up-to"),
  },
  {
    id: 7,
    slug: "the-mirror",
    title: "The Mirror",
    section: "Children",
    depth: "Light",
    epigraph: "The children are our clearest mirror.",
    prompt: "What has a child taught you that you did not expect?",
    image: cardImage(7, "the-mirror"),
  },
  {
    id: 8,
    slug: "present-not-performing",
    title: "Present, Not Performing",
    section: "Children",
    depth: "Deep",
    epigraph: "They're not broken, they're responding to a world with nothing real to say.",
    prompt:
      "Where in your life are you performing instead of being present? Name the audience you are playing to.",
    image: cardImage(8, "present-not-performing"),
  },
  {
    id: 9,
    slug: "what-youll-refuse-to-pass-on",
    title: "What You'll Refuse to Pass On",
    section: "Children",
    depth: "Deep",
    epigraph: "You were also handed a world you didn't choose or dream.",
    prompt:
      "What were you handed that you are still healing from? What will you refuse to pass on?",
    image: cardImage(9, "what-youll-refuse-to-pass-on"),
  },
  {
    id: 10,
    slug: "add-dont-subtract",
    title: "Add, Don't Subtract",
    section: "Addiction to Addition",
    depth: "Light",
    epigraph: "It's not about subtraction, that's the old way.",
    prompt: "What would you add to your life this moon, rather than take away?",
    image: cardImage(10, "add-dont-subtract"),
  },
  {
    id: 11,
    slug: "what-truly-nourishes",
    title: "What Truly Nourishes",
    section: "Addiction to Addition",
    depth: "Light",
    epigraph: "Add what's missing in.",
    prompt:
      "Name one thing you already add to your life that truly nourishes you. Where could you offer yourself more of it?",
    image: cardImage(11, "what-truly-nourishes"),
  },
  {
    id: 12,
    slug: "the-signal",
    title: "The Signal",
    section: "Addiction to Addition",
    depth: "Deep",
    epigraph: "Every craving is a signal, every urge a cry for help.",
    prompt:
      "Name one thing you reach for to fill the in-between. Say aloud the real need underneath it.",
    image: cardImage(12, "the-signal"),
  },
  {
    id: 13,
    slug: "no-more-shame",
    title: "No More Shame",
    section: "Addiction to Addition",
    depth: "Deep",
    epigraph: "Shame never healed anyone, judgment never set us free.",
    prompt:
      "Offer yourself one sentence of compassion you have been withholding. Say it out loud.",
    image: cardImage(13, "no-more-shame"),
  },
  {
    id: 14,
    slug: "the-holy-hunger",
    title: "The Holy Hunger",
    section: "Cult to Culture",
    depth: "Light",
    epigraph: "The hunger was always holy, the longing was always true.",
    prompt:
      "What longing brought you to this fire? Name the hunger honestly. It was always holy.",
    image: cardImage(14, "the-holy-hunger"),
  },
  {
    id: 15,
    slug: "books-wide-open",
    title: "Books Wide Open",
    section: "Cult to Culture",
    depth: "Light",
    epigraph: "We put the books wide open.",
    prompt: "Name one thing you are grateful is out in the open here, nothing hidden.",
    image: cardImage(15, "books-wide-open"),
  },
  {
    id: 16,
    slug: "where-you-stepped-aside",
    title: "Where You Stepped Aside",
    section: "Cult to Culture",
    depth: "Deep",
    epigraph: "One voice became THE voice, and the rest of us just stepped aside.",
    prompt:
      "Where have you handed your voice away to someone else's? Name where you would take it back.",
    image: cardImage(16, "where-you-stepped-aside"),
  },
  {
    id: 17,
    slug: "what-you-leave-at-the-door",
    title: "What You Leave at the Door",
    section: "Cult to Culture",
    depth: "Deep",
    epigraph: "When you have to leave yourself at the door just to be welcome here.",
    prompt:
      "What part of yourself do you leave at the door to belong? Bring it to the table now.",
    image: cardImage(17, "what-you-leave-at-the-door"),
  },
  {
    id: 18,
    slug: "from-i-to-we",
    title: "From I to We",
    section: "We Are The Land",
    depth: "Light",
    epigraph: "From the I, I, I to the WE, WE, WE.",
    prompt:
      "Name one thing you have been carrying as \"mine\" that could become \"ours\" with this crew.",
    image: cardImage(18, "from-i-to-we"),
  },
  {
    id: 19,
    slug: "come-here-with-a-crew",
    title: "Come Here With a Crew",
    section: "We Are The Land",
    depth: "Light",
    epigraph: "We didn't come here randomly, we came here with a crew.",
    prompt: "Who at this fire feels like part of your crew, and what drew you together?",
    image: cardImage(19, "come-here-with-a-crew"),
  },
  {
    id: 20,
    slug: "refined-by-fire",
    title: "Refined by Fire",
    section: "We Are The Land",
    depth: "Deep",
    epigraph:
      "All our suffering wasn't random. It was refining us, preparing us for something great.",
    prompt: "Name a hardship that forged you. What did it make you strong enough to do?",
    image: cardImage(20, "refined-by-fire"),
  },
  {
    id: 21,
    slug: "why-you-came",
    title: "Why You Came",
    section: "We Are The Land",
    depth: "Deep",
    epigraph:
      "We crossed the veils of amnesia to be here now, we took the sacred vow.",
    prompt:
      "If you chose to be here in these times, what did you come to do? Speak the mission you feel.",
    image: cardImage(21, "why-you-came"),
  },
  {
    id: 22,
    slug: "shared-needs",
    title: "Shared Needs",
    section: "Love-Based Civilization",
    depth: "Light",
    epigraph:
      "We come together to identify all our shared needs and devise a way to meet them all.",
    prompt:
      "Name one need you have been carrying alone that someone here might share. Then ask the table.",
    image: cardImage(22, "shared-needs"),
  },
  {
    id: 23,
    slug: "gratitude-as-currency",
    title: "Gratitude as Currency",
    section: "Love-Based Civilization",
    depth: "Light",
    epigraph: "What gratitude might you receive that would leave you jumping for joy?",
    prompt:
      "Speak gratitude to one person at this fire, specific enough that they feel it in their chest.",
    image: cardImage(23, "gratitude-as-currency"),
  },
  {
    id: 24,
    slug: "provision-without-possession",
    title: "Provision Without Possession",
    section: "Love-Based Civilization",
    depth: "Light",
    epigraph: "The pleasures aren't ours alone.",
    prompt:
      "What could you meet more easily by sharing it than by owning it? Name one thing you would pool with this crew.",
    image: cardImage(24, "provision-without-possession"),
  },
  {
    id: 25,
    slug: "belonging",
    title: "Belonging",
    section: "Love-Based Civilization",
    depth: "Light",
    epigraph: "Real community, real land, real purpose.",
    prompt:
      "When did you last feel you truly belonged? What was present then that you could invite back into your days?",
    image: cardImage(25, "belonging"),
  },
  {
    id: 26,
    slug: "love-multiplies-capacity",
    title: "Love Multiplies Capacity",
    section: "Love-Based Civilization",
    depth: "Light",
    epigraph:
      "In a thriving body with a thriving mind, all other quests become joyful and easeful.",
    prompt:
      "Tell a time love made you more capable than you are alone: stronger, braver, more resourceful. Tell the whole story.",
    image: cardImage(26, "love-multiplies-capacity"),
  },
  {
    id: 27,
    slug: "what-the-land-would-give-you",
    title: "What the Land Would Give You",
    section: "Love-Based Civilization",
    depth: "Light",
    epigraph: "Extending past our human selves to all of existence.",
    prompt:
      "Which of your needs could the land meet, if you let it: water, medicine, awe, rest? Name one, and how you would receive it.",
    image: cardImage(27, "what-the-land-would-give-you"),
  },
  {
    id: 28,
    slug: "love-as-a-nutrient",
    title: "Love as a Nutrient",
    section: "Love-Based Civilization",
    depth: "Deep",
    epigraph: "Love is a nutrient. The more we are in love, the more our bodies are nourished.",
    prompt:
      "Name a need alive in you right now: food, rest, safety, touch. How would meeting it with love change the way you meet it?",
    image: cardImage(28, "love-as-a-nutrient"),
  },
  {
    id: 29,
    slug: "the-garden-loves-you-back",
    title: "The Garden Loves You Back",
    section: "Love-Based Civilization",
    depth: "Deep",
    epigraph: "When you love a garden, it loves you back.",
    prompt:
      "Where do you give love and receive nothing? Where do you receive and give nothing back? Name one relationship you would bring into balance.",
    image: cardImage(29, "the-garden-loves-you-back"),
  },
  {
    id: 30,
    slug: "enough",
    title: "Enough",
    section: "Love-Based Civilization",
    depth: "Deep",
    epigraph:
      "We built a civilization on scarcity because we believed there would never be enough love.",
    prompt:
      "Where do you still act as if there isn't enough? What becomes possible the moment you trust there is?",
    image: cardImage(30, "enough"),
  },
  {
    id: 31,
    slug: "reverence-changes-the-yield",
    title: "Reverence Changes the Yield",
    section: "Love-Based Civilization",
    depth: "Deep",
    epigraph: "When love is in the hands that harvest, the tree fundamentally knows.",
    prompt:
      "Where would your work bear more fruit if you did it with reverence instead of force? Give one real example.",
    image: cardImage(31, "reverence-changes-the-yield"),
  },
  {
    id: 32,
    slug: "the-need-under-the-anger",
    title: "The Need Under the Anger",
    section: "Love-Based Civilization",
    depth: "Deep",
    epigraph:
      "It's not what others do, but the images we create in our heads that produce our anger.",
    prompt:
      "Name someone you have blamed. What need of yours went unmet? Speak the need, not the blame.",
    image: cardImage(32, "the-need-under-the-anger"),
  },
  {
    id: 33,
    slug: "one-body",
    title: "One Body",
    section: "Love-Based Civilization",
    depth: "Deep",
    epigraph:
      "Healing ourselves, our communities, our bioregions, and our Earth, which are all the same thing.",
    prompt:
      "Name one act of love toward yourself that is also an act of love toward the whole. Commit to it aloud.",
    image: cardImage(33, "one-body"),
  },
];

/** Total cards in the deck. One full walk draws each exactly once. */
export const RITE_DECK_SIZE = RITE_OF_TRUTH_CARDS.length;
