import { useState, useEffect } from "react";
import { X, ExternalLink, CheckCircle2, Clock, Coins, Vote, Sparkles, ArrowRight, PlayCircle, Send, Info, Download, FileDown } from "lucide-react";
import { QuestTier3Media } from "@/components/QuestTier3Media";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { SubmitToDAOModal } from "@/components/SubmitToDAOModal";

interface QuestStep {
  step: number;
  title: string;
  description: string;
}

interface QuestDetails {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  storyCard?: string; // 3-4 sentence narrative, shown at top of modal in italics
  rewards: { regen: number; rvoice: number };
  deliverable: string;
  estimatedTime: string;
  steps: QuestStep[];
  resources?: { title: string; url: string }[];
  tips?: string[];
  videoUrl?: string; // YouTube video URL for the quest tutorial
}

// PDF guide slugs for static files in public/quest-guides/
const QUEST_PDF_SLUGS: Record<string, string> = {
  "quest-0": "quest-00-fire",
  "quest-1": "quest-01-potions",
  "quest-2": "quest-02-seeds",
  "quest-3": "quest-03-healing-wholes",
  "food-foresting": "quest-04-food-foresting",
  "quest-4": "quest-05-dreaming-spaces",
  "quest-5": "quest-06-rites-of-love",
  "quest-6": "quest-07-healing-circles",
  "quest-7": "quest-08-wild-foraging",
  "quest-8": "quest-09-medicine-journey",
  "quest-9": "quest-09b-tree-talk",
  "quest-10": "quest-10-nvc",
  "quest-11": "quest-11-coordination-patterns",
  "quest-12": "quest-12-breathplay",
  "quest-13": "quest-13-fasting",
  "quest-14": "quest-14-love-to-heal-your-body",
};

interface QuestDetailModalProps {
  quest: QuestDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

// Quest details database
export const questDetailsData: Record<string, QuestDetails> = {
  "quest-0": {
    id: "quest-0",
    title: "Quest 0: Fire",
    subtitle: "Transforming Passion into Purpose",
    description: "Discover and articulate what truly lights you up. This foundational quest helps you connect with your inner fire and understand what drives you to create positive change in the world.",
    storyCard: "Before we can build anything new we have to be willing to let go of the old. Fire transmutes instantly. Stories, maladaptations, and perspectives that no longer serve us can be released in a single ceremony if we are willing. As our world gets more immersed in effective and personalized propaganda, Fire offers a different path: discerning truth directly, from our own relationship to ourselves and to life.",
    rewards: { regen: 111, rvoice: 1 },
    deliverable: "A video/article sharing your fire and passion",
    estimatedTime: "2-4 hours",
    videoUrl: "https://www.youtube.com/watch?v=U5ZTTy0SCaA",
    steps: [
      { step: 1, title: "Reflect", description: "Spend time in quiet reflection. What issues, causes, or activities make you feel most alive? What would you do even if you weren't paid?" },
      { step: 2, title: "Journal", description: "Write freely about your passions, dreams, and what you want to contribute to the world. Don't edit yourself." },
      { step: 3, title: "Identify Themes", description: "Look for patterns in your reflections. What themes emerge? What connects your various interests?" },
      { step: 4, title: "Create Your Story", description: "Craft a compelling narrative about your fire. This could be a 3-minute video or a written article." },
      { step: 5, title: "Share & Submit", description: "Share your creation with the community and submit for review." }
    ],
    resources: [
      { title: "Watch Intro Video", url: "https://www.youtube.com/watch?v=U5ZTTy0SCaA" },
      { title: "SEEDS Quest Guide", url: "https://explore.joinseeds.earth/regen-civics-infinite-game/play-the-game/quest" }
    ],
    tips: [
      "Be authentic - there's no right or wrong answer",
      "Consider recording multiple takes and choosing your favorite",
      "Share from the heart, not just the head"
    ]
  },
  "quest-1": {
    id: "quest-1",
    title: "Quest 1: Potions",
    subtitle: "Healing Modalities",
    description: "Make a healing potion to connect your gut to the ancient wisdom of your bioregion and home.",
    storyCard: "The Potions Quest introduces us to the world of living fermented foods, medicinal preparations, and the microbiome. Our gut has neurons and is considered by many researchers to be a second brain. When we add living microbiology to our system, we are literally changing the information processing happening in all three of our minds: gut, heart, and head. That's why we call these potions, as they have the ability to transform how we think, see, and relate to our world.",
    rewards: { regen: 111, rvoice: 1 },
    deliverable: "A 'Showcasing my Potions' video/article",
    estimatedTime: "3-5 hours",
    videoUrl: "https://www.youtube.com/watch?v=pbhGgg2GZUM",
    steps: [
      { step: 1, title: "Make Your Potion", description: "Follow along with the video to make your potion!" },
      { step: 2, title: "Select Your Potions", description: "Select 1-3 potions you want to showcase." },
      { step: 3, title: "Document Your Practice", description: "Create content showing how you prepared your potion." },
      { step: 4, title: "Share Your Creation", description: "Explain the benefits and how others might incorporate these practices. Any immediate effects, lesson, etc?" },
      { step: 5, title: "Submit Your Showcase", description: "Upload your video or article to your social medias and use your link to add to your proposal to our Game Space." }
    ],
    resources: [
      { title: "Watch Potions Tutorial Video", url: "https://www.youtube.com/watch?v=pbhGgg2GZUM" }
    ],
    tips: [
      "Focus on what you actually practice, not just theory",
      "Include practical tips others can use",
      "Share both the process and the results"
    ]
  },
  "quest-2": {
    id: "quest-2",
    title: "Quest 2: Seeds",
    subtitle: "Planting Abundance",
    description: "Connect with the power of seeds - both literal and metaphorical. This quest explores how small beginnings can create massive positive change.",
    storyCard: "The Seeds quest builds the practice of saving, documenting, and swapping seeds. We become participants in the oldest continuous human technology: the preservation of genetic diversity through care and attention. Every seed saved is a vote for biodiversity, for local food sovereignty, and for a future where communities feed themselves from their own land.",
    rewards: { regen: 111, rvoice: 1 },
    deliverable: "Adding seeds to swap in your LocalScale profile",
    estimatedTime: "1-2 hours",
    steps: [
      { step: 1, title: "Gather Your Seeds", description: "Collect seeds from plants you've grown, traded, or purchased. Consider heirloom and open-pollinated varieties." },
      { step: 2, title: "Document Your Collection", description: "Take photos and note the variety, source, and any growing tips for each seed type." },
      { step: 3, title: "Create Your Profile", description: "Set up or update your LocalScale profile with your seed offerings." },
      { step: 4, title: "List for Swap", description: "Add your seeds to the swap marketplace with clear descriptions." },
      { step: 5, title: "Connect & Trade", description: "Reach out to other seed savers and arrange swaps." }
    ],
    resources: [
      { title: "LocalScale Platform", url: "https://localscale.org" }
    ],
    tips: [
      "Include growing zone information",
      "Share stories about where seeds came from",
      "Consider offering seed saving workshops"
    ]
  },
  "quest-3": {
    id: "quest-3",
    title: "Quest 3: Healing Whole",
    subtitle: "Holistic Wellness",
    description: "This quest is all about creating spaces of deep healing in our Earth. Where a 'seed of abundance' will sprout forth from.",
    storyCard: "The Healing Whole quest is about creating spaces of deep healing in our Earth, digging holes, composting, working with fungi, building the soil microbiome that will receive our seeds and our food. The soil becomes a literal extension of our digestive system. What we put into the ground, we eventually put into ourselves. Healing the soil and healing our bodies are the same act.",
    rewards: { regen: 144, rvoice: 1 },
    deliverable: "Showcasing my Healing Whole video/article",
    estimatedTime: "3-5 hours",
    steps: [
      { step: 1, title: "Details Coming Soon", description: "We're working on detailed step-by-step instructions for this quest. Check back soon or join our community sessions to learn more!" }
    ],
    tips: [
      "Be vulnerable and authentic",
      "Include both challenges and breakthroughs",
      "Invite others to share their experiences"
    ]
  },
  "food-foresting": {
    id: "food-foresting",
    title: "Food Foresting: Being Human Again",
    subtitle: "Turning Earth into a Food Forest",
    description: "Go out with your friends and family and plant seeds for fruit trees in public spaces, parks, forests, and anywhere nature can thrive. This quest is all about turning our planet into a food forest where hunger is no longer relevant.",
    storyCard: "When we do the Food Foresting quest after the Potions quest, we hold fruit seeds in our mouths for several minutes before planting them. The saliva that now coats those seeds carries a vastly richer diversity of microbial life than it did before. We are literally seeding the Earth with the expanded ecosystem of our own body. Our DNA, our biology, our relationship to the land, encoded in every seed we plant.",
    rewards: { regen: 111, rvoice: 1 },
    deliverable: "A <3 min video and/or written article",
    estimatedTime: "2-4 hours",
    steps: [
      { step: 1, title: "Gather Your Crew", description: "Invite friends, family, or community members to join you on this adventure." },
      { step: 2, title: "Source Your Seeds/Seedlings", description: "Collect fruit tree seeds or small seedlings. Consider native species and what grows well in your area." },
      { step: 3, title: "Scout Locations", description: "Find suitable public spaces, parks, or forest edges where trees can thrive without being disturbed." },
      { step: 4, title: "Plant with Intention", description: "Plant your seeds/seedlings with care. Consider soil conditions, water access, and sunlight." },
      { step: 5, title: "Document & Share", description: "Record your adventure - what you planted, where, and the joy of being human again." },
      { step: 6, title: "Submit Your Story", description: "Share your video/article with the community. Include what you learned and insights gained." }
    ],
    tips: [
      "This quest can be done infinite times!",
      "Choose species that will thrive without maintenance",
      "Make it a celebration - bring snacks, music, joy",
      "Mark locations so you can return and check on your trees"
    ]
  },
  "quest-4": {
    id: "quest-4",
    title: "Quest 4: Dreaming Spaces of Love",
    subtitle: "Family Homesteads",
    description: "Designing, dreaming, and co-creating your ideal home, garden, and life, intended to meet all your needs. A Kins Domain for your family of life.",
    storyCard: "Most of us have spent so little time in spaces that were designed for us to actually rest, connect, and feel held. We have inherited an architecture of efficiency: offices, rentals, overhead lighting, no nature, no quiet. A space of love is not expensive or elaborate. It is intentional. It holds the needs of the people inside it. When you build a space like this and share it, you give others permission to want the same.",
    rewards: { regen: 111, rvoice: 1 },
    deliverable: "Map of my current/future Space of Love: video or picture with reflection",
    estimatedTime: "3-6 hours (ongoing practice)",
    steps: [
      { step: 1, title: "Reflect on what rest and love require", description: "Before building anything, sit with these questions: Where do you feel most at home? What does that place have that others lack? Write your answers down." },
      { step: 2, title: "Choose a space to work with", description: "Pick somewhere you have access to and can shape: your home, a community space, a backyard corner, or an outdoor area." },
      { step: 3, title: "Identify what the space currently lacks", description: "Walk through it slowly. Notice light, air, surfaces, sounds, smells. What does it invite? What does it make impossible?" },
      { step: 4, title: "Dream it into something different", description: "Sketch, write, or vision-board what this space could become. Bring in natural materials, living plants, comfortable seating arranged for conversation." },
      { step: 5, title: "Do at least one physical act of transformation", description: "Rearrange, plant, build, or clear something. Document the before and after." },
      { step: 6, title: "Use the space with others", description: "Gather someone you care about in this space. Share a meal, a conversation, or simply time. Notice what becomes possible between you." },
      { step: 7, title: "Document and share", description: "Create a short piece showing your space and what you learned from building and using it." }
    ],
    resources: [
      { title: "The Timeless Way of Building by Christopher Alexander", url: "https://en.wikipedia.org/wiki/The_Timeless_Way_of_Building" }
    ],
    tips: [
      "The single biggest change in most indoor spaces: add living plants and remove overhead fluorescent light.",
      "A space that invites connection faces seats toward each other, not toward a screen.",
      "Outdoor spaces count: a fire circle, a garden corner, a hammock grove. The Earth is the most healing space material there is."
    ]
  },
  "quest-5": {
    id: "quest-5",
    title: "Quest 5: Rites of Love",
    subtitle: "We are the Land",
    description: "Marrying the Earth and your beloved, remembering we're one with our Spaces of Love, and other Sacred Rites to connect with Earth and the people closest to you.",
    storyCard: "Love needs tending. Not just feeling, but practice. Most of us were never taught the practices that sustain love across years and decades. Rites are different from routines. A routine is something you do on autopilot. A rite is something you do with attention, marking it as significant. When you light a candle for a shared meal, when you build a fire together at the change of a season, when you find your way back to each other after a rupture. These are rites. Every healthy culture had them. This quest is an invitation to build some.",
    rewards: { regen: 99, rvoice: 1 },
    deliverable: "A written or recorded reflection on a rite you designed, practiced, and what it changed",
    estimatedTime: "2-4 hours (ongoing practice)",
    steps: [
      { step: 1, title: "Map the love relationships in your life", description: "Partner, friends, family, community, relationship to a place. Choose one or two to focus on for this quest." },
      { step: 2, title: "Identify where rites already exist", description: "Even informally. A morning exchange. An annual gathering. A way of greeting. Note what already exists and what it does for the relationship." },
      { step: 3, title: "Identify where rites are absent but needed", description: "Where does your relationship lack structure for difficult moments? For celebration? For repair?" },
      { step: 4, title: "Design at least one new rite", description: "Keep it simple and honest to who you are. A weekly check-in, a seasonal celebration, a repair practice for after conflict." },
      { step: 5, title: "Practice it at least three times", description: "Note how it changes the relationship across each instance." },
      { step: 6, title: "Reflect and share", description: "Write or record a reflection on what you built, what it felt like to practice it, and what it opened up." }
    ],
    resources: [
      { title: "The Five Love Languages by Gary Chapman", url: "https://5lovelanguages.com" },
      { title: "Braiding Sweetgrass by Robin Wall Kimmerer", url: "https://milkweed.org/book/braiding-sweetgrass" }
    ],
    tips: [
      "The simplest rites are often the most durable. A weekly 20-minute walk with a friend is a rite.",
      "Repair is the most important rite. Every relationship breaks at some point. Having an agreed-upon way to come back is worth more than any celebration ritual.",
      "Rites of place are often overlooked. Visiting land seasonally, tending a tree, returning to a river annually."
    ]
  },
  "quest-6": {
    id: "quest-6",
    title: "Quest 6: Healing Circles",
    subtitle: "Community Gathering",
    description: "Gathering in natural spaces with others to swap and practice healing modalities. Hold a genuine circle: a space for witnessing rather than fixing, for honest presence rather than advice.",
    storyCard: "Most of what passes for support in our culture is advice. Someone shares something painful and the listener immediately starts solving it. The result is that the person sharing feels even more alone, because what they needed was not a solution. They needed to be witnessed. A healing circle is a different technology. The circle format is ancient. Indigenous cultures around the world used circles for governance, healing, celebration, and grief. Most of us have never been in a genuinely held circle. When we have, something different becomes possible.",
    rewards: { regen: 144, rvoice: 1 },
    deliverable: "Documentation of a healing circle you held: the structure, what happened, and your reflection as the holder",
    estimatedTime: "4-8 hours (requires gathering others)",
    steps: [
      { step: 1, title: "Study the basics of circle-holding", description: "Understand the difference between advising and witnessing, between fixing and holding. Read at least one resource on facilitation or circle practice." },
      { step: 2, title: "Design your circle", description: "Who will you gather? What is the container? What is the opening to settle people in? What is the talking object or turn-taking structure? What is the closing?" },
      { step: 3, title: "Set agreements with the group", description: "Minimum: confidentiality, no advice unless asked, speak from your own experience, listen to understand rather than to respond. Read these aloud at the opening." },
      { step: 4, title: "Hold the circle", description: "Let each person speak without interruption. After each share, pause. You do not need to fill the silence. The silence is part of the work." },
      { step: 5, title: "Close with intention", description: "End with a brief closing round: one word or sentence from each person about what they are leaving with." },
      { step: 6, title: "Reflect and share", description: "After the circle, write or record a reflection on how it went. What worked? What did you learn about holding space?" }
    ],
    resources: [
      { title: "The Way of Council by Jack Zimmerman", url: "https://en.wikipedia.org/wiki/Council_(communication_practice)" },
      { title: "Joanna Macy's Work That Reconnects", url: "https://workthatreconnects.org" }
    ],
    tips: [
      "Your first circle will not be perfect. Hold it anyway. The practice is in the doing.",
      "The most common mistake: talking too much as the facilitator. Your job is to hold the container, not to fill it.",
      "Circles work best with 4 to 12 people. Outdoor circles around fire are particularly powerful."
    ]
  },
  "quest-7": {
    id: "quest-7",
    title: "Quest 7: Wild Foraging",
    subtitle: "Deep Nourishment",
    description: "Foraging mushrooms, medicinal herbs, berries, and tree magic. Eating sunlight and enjoying food plant-to-mouth while attuning to your ideal diet and your bioregion's wild abundance.",
    storyCard: "For most of human history, people knew the land around them intimately. They knew which plants healed and which ones harmed, which fungi fruited after rain, which berries ripened in which week of autumn. That knowledge was not stored in books. It lived in people, passed through hands and seasons and walking together. Wild foods carry things that cultivated foods do not: biodiversity in the microbiome, compounds shaped by real ecological pressure. Beyond the nutrition, foraging changes your relationship to a place. The land is no longer scenery. It is a conversation.",
    rewards: { regen: 111, rvoice: 1 },
    deliverable: "A field record (photos + notes) of your foraging sessions and a reflection on what changed in your relationship to the land",
    estimatedTime: "3-6 hours (field time + documentation)",
    steps: [
      { step: 1, title: "Learn your bioregion's wild edibles", description: "Start with 5-10 plants or fungi you can identify with certainty. Use local field guides. Join a local foraging walk if one exists. Certainty matters. Do not eat anything you cannot identify with confidence." },
      { step: 2, title: "Go out at least three times over two weeks", description: "Foraging as a single experience gives you little. Going out across different weather and terrain begins to give you a sense of patterns." },
      { step: 3, title: "Harvest with intention", description: "Take no more than a third of any plant in a given area. Leave the rest to seed, recover, and feed others. Where possible, give something back." },
      { step: 4, title: "Prepare and eat what you found", description: "Cook or use your harvest. Note the difference in taste, texture, and how your body responds compared to store-bought equivalents." },
      { step: 5, title: "Document your finds", description: "Photos of each species in situ. Notes on where, when, what condition, and what you did with it. Build a personal field record." },
      { step: 6, title: "Share your harvest and knowledge", description: "Cook for others using what you found. Share your field record. Teach someone one thing you learned." }
    ],
    resources: [
      { title: "iNaturalist: species ID and community verification", url: "https://www.inaturalist.org" },
      { title: "Plants For A Future: edible plants by region", url: "https://pfaf.org" }
    ],
    tips: [
      "Three non-negotiables: a local field guide, local expertise, and the rule that you eat only what you can identify with full certainty.",
      "Start with the most distinctive plants in your region: blackberries, elderberries, nettles, dandelions.",
      "Fall is the best season for fungi in most temperate climates. Spring is best for many greens."
    ]
  },
  "quest-8": {
    id: "quest-8",
    title: "Quest 8: Medicine Journey",
    subtitle: "Inner Exploration",
    description: "A guided journey into the depths of consciousness, exploring the medicine within and around us. Intentional inner journey, properly supported and integrated.",
    storyCard: "Something happens when a person goes deep enough into themselves that they cannot maintain the story they have been telling. The scaffolding comes down. And in that space, things become visible that ordinary consciousness keeps behind glass. These practices have been used by cultures around the world for thousands of years to facilitate healing, initiation, and contact with deeper dimensions of reality. They are not entertainment. They are not shortcuts. Used well, they are among the most powerful catalysts for transformation available to a human being. Integration is the work of taking what you found in the depths and actually living differently because of it.",
    rewards: { regen: 222, rvoice: 1 },
    deliverable: "A documented reflection on your journey and its integration, shared with the community",
    estimatedTime: "Preparation weeks to months, ceremony 1 to several days, integration ongoing",
    steps: [
      { step: 1, title: "Choose your practice", description: "Identify the form of inner journey you are called to. Ensure you are working legally within your jurisdiction, with appropriate support, and with clear intention." },
      { step: 2, title: "Prepare intentionally", description: "Preparation is not just dietary. Clear your calendar, tell the people close to you, set a clear intention for what you are entering the journey to meet. Write your intention down." },
      { step: 3, title: "Enter with good support", description: "A genuine guide or facilitator matters enormously. Someone who has walked this path many times, who knows how to hold space. Do not do a significant inner journey alone without experience." },
      { step: 4, title: "Come back with care", description: "The first 24-72 hours after a deep journey are critical. Protect them. Do not rush back to work, screens, or social situations. Rest. Write. Walk." },
      { step: 5, title: "Integrate over time", description: "Genuine integration takes weeks to months. Journal regularly. Talk with someone who can hold the complexity. Notice where the experience wants to change how you live." },
      { step: 6, title: "Create and share your artifact", description: "Write, record, or capture a reflection on your journey and its integration. What did you enter with? What did you find? What is different now?" }
    ],
    resources: [
      { title: "MAPS: research on therapeutic uses of plant medicines", url: "https://maps.org" },
      { title: "Zendo Project: harm reduction and support", url: "https://zendoproject.org" }
    ],
    tips: [
      "Preparation determines outcome more than people expect. How you enter shapes what you find.",
      "Your guide or facilitator is the most important decision you make. More important than the medicine or the practice itself.",
      "Integration is not complete when you feel good. It is complete when you live differently."
    ]
  },
  "quest-9": {
    id: "quest-9",
    title: "Quest 9: Tree Talk",
    subtitle: "Forest Communication",
    description: "Learning to communicate with and understand the wisdom of trees. Deepening your relationship with the forest through genuine attention and repeated return.",
    storyCard: "Trees communicate. That sentence would have seemed like poetry thirty years ago. Now it is science. Suzanne Simard's research showed that trees share carbon, water, and chemical signals through mycorrhizal networks underground. Old trees support younger trees of different species. When a tree is stressed, it sends warning compounds through the network. The forest responds. This quest asks you to build a real relationship with the trees near you. Not a walk in the woods. A relationship. You return to the same trees over time, learn to read what you are seeing, develop the habit of genuine attention rather than passing appreciation.",
    rewards: { regen: 99, rvoice: 1 },
    deliverable: "A documented account of your relationship with specific trees over at least three weeks, including what you learned to see and what changed",
    estimatedTime: "2-4 hours (spread across multiple visits)",
    steps: [
      { step: 1, title: "Find your trees", description: "Identify two or three trees within easy reach of your daily life. Ideally find at least one old tree in the oldest accessible forest or parkland near you." },
      { step: 2, title: "Visit regularly", description: "Return to the same trees at least once a week over the duration of this quest. Same trees. Different weather, different light, different states of your own attention." },
      { step: 3, title: "Learn to read what you see", description: "Study the basics of tree health: bark patterns, canopy shape, root surface, presence of fungi and lichen, which species share space with which." },
      { step: 4, title: "Practice genuine attention", description: "On at least three visits, spend 20+ minutes doing nothing except being with one tree. Sit at its base. Put your hands on the bark. Notice what changes in your body when you stop moving and start attending." },
      { step: 5, title: "Research the species you are working with", description: "Learn the ecology of your trees: how long they live, how they reproduce, what animals depend on them, their relationship to soil and water." },
      { step: 6, title: "Document and share", description: "Keep a field journal across your visits. Write or record a piece about your relationship with these specific trees. What did you learn to see?" }
    ],
    resources: [
      { title: "The Hidden Life of Trees by Peter Wohlleben", url: "https://en.wikipedia.org/wiki/The_Hidden_Life_of_Trees" },
      { title: "Finding the Mother Tree by Suzanne Simard", url: "https://suzannesimard.com/finding-the-mother-tree-book" },
      { title: "iNaturalist: species identification", url: "https://www.inaturalist.org" }
    ],
    tips: [
      "Slow down more than you think you need to. Most of what we miss in nature we miss because we are moving too fast.",
      "The old-growth forest floor is one of the most complete expressions of a living mycorrhizal network you can walk on.",
      "The talking that trees do is primarily chemical and subterranean. Learn to read the effects: the health of the whole stand, the relationships between species."
    ]
  },
  "quest-10": {
    id: "quest-10",
    title: "Quest 10: NVC",
    subtitle: "Nonviolent Communication",
    description: "Learn and practice Nonviolent Communication, the framework that bridges personal healing into collective co-creation. This is the language of needs, not judgments.",
    storyCard: "Quest 10 teaches us to speak from needs rather than judgments, to hear others without taking their pain as an attack, and to coordinate meeting shared needs together. This is the bridge from individual healing into collective co-creation. Every governance system, every community, every partnership becomes more functional when the people inside it know how to communicate in this way.",
    rewards: { regen: 177, rvoice: 1 },
    deliverable: "A written reflection, video, or recorded conversation showing your NVC practice",
    estimatedTime: "1-2 hours initial, ongoing practice",
    videoUrl: "https://www.youtube.com/watch?v=nWb2B2uPfMo",
    steps: [
      { step: 1, title: "Take the NVC course", description: "Find the recommended NVC materials and watch the attached course. Online courses, Rosenberg's books, and free recordings of his workshops are all valid starting points." },
      { step: 2, title: "Practice the four components", description: "Observation, Feeling, Need, Request. Apply them in your daily conversations. Start with low-stakes situations before bringing them into high-stakes ones." },
      { step: 3, title: "Find a practice partner", description: "NVC practiced alone is limited. Find someone else to study and practice with. Many cities have NVC practice circles, or find a partner in our forum." },
      { step: 4, title: "Apply in a real situation", description: "Bring NVC into a genuine conflict or tension in your life. Not to win. To connect." },
      { step: 5, title: "Reflect and share", description: "Write or record a reflection on what you learned. What shifted? Where did it get hard? What would you tell someone just starting?" },
      { step: 6, title: "Attend or host a community session", description: "The forum will have regular NVC discussion threads. Participate. If there isn't a session happening, start one." }
    ],
    resources: [
      { title: "NVC Academy", url: "https://nvctraining.com" },
      { title: "Gabor Mate on trauma and communication", url: "https://www.youtube.com/playlist?list=PL3Xi8vZSmBTRlD8Dnx6a16yeBTaSxKNdS" }
    ],
    tips: [
      "The hardest part is distinguishing observations from evaluations. Practice this first.",
      "\"I feel like you don't care about me\" is not a feeling. It's an interpretation. \"I feel hurt and lonely\" is a feeling.",
      "Gratitude is also NVC. Practice expressing gratitude in terms of what needs were met."
    ]
  },
  "quest-11": {
    id: "quest-11",
    title: "Quest 11: Coordination Patterns",
    subtitle: "How We Organize",
    description: "Understanding how groups coordinate without hierarchy. Exploring governance frameworks, decision-making patterns, and collective action, and actually using them in a real group.",
    storyCard: "Every group that tries to work together without a boss eventually hits the same wall. Who makes the final call? How do you handle disagreement? How do you stop a few people from dominating everything? These are not unsolvable problems. They are solved, repeatedly, by groups who have developed specific coordination patterns. Holacracy, Sociocracy, and consent-based governance are modern formalizations of much older practices. The indigenous consensus circle, the Quaker clearness committee, the commons governance of traditional fishing communities. Groups of humans have been solving the coordination problem for as long as humans have existed. We have more tools available than most people know.",
    rewards: { regen: 177, rvoice: 1 },
    deliverable: "A documented account of a coordination pattern you introduced and practiced in a real group, including reflection on what worked",
    estimatedTime: "Ongoing study + 1-3 group sessions (weeks to months)",
    steps: [
      { step: 1, title: "Learn the landscape of coordination patterns", description: "Study at least two different approaches to non-hierarchical coordination: Holacracy, Sociocracy, Circle Practice, or Commons Governance Principles (Elinor Ostrom)." },
      { step: 2, title: "Identify a real group to practice with", description: "A project team, household, community organization, or ReGen Civics game group. The practice needs real stakes and real people to be useful." },
      { step: 3, title: "Introduce at least one coordination pattern", description: "Choose something appropriate: a check-in round, a consent decision process, a role-clarity exercise, a retrospective format. Explain why you are introducing it." },
      { step: 4, title: "Run at least three sessions", description: "Run the same pattern at least three times before evaluating it. Patterns need iteration to show their value. Ask the group: what worked, what did not?" },
      { step: 5, title: "Document the pattern and your findings", description: "Write up what you did, how the group responded, what the pattern helped with, and what it did not address." },
      { step: 6, title: "Share your experience", description: "Post your write-up in the forum. Your documented experience is useful to others working on the same problems." }
    ],
    resources: [
      { title: "Reinventing Organizations by Frederic Laloux", url: "https://www.reinventingorganizations.com" },
      { title: "Sociocracy 3.0 Practical Guide (free)", url: "https://sociocracy30.org" },
      { title: "Governing the Commons by Elinor Ostrom", url: "https://en.wikipedia.org/wiki/Governing_the_Commons" }
    ],
    tips: [
      "The check-in round is the single most universally useful coordination pattern. Start every meeting with a brief personal check-in.",
      "Consent is different from consensus. Consensus requires everyone to agree. Consent requires no one to have a fundamental objection. Much faster.",
      "The most important governance question: not 'what structure do we use' but 'how do we make and revisit agreements.'"
    ]
  },
  "quest-12": {
    id: "quest-12",
    title: "Quest 12: Breathplay & Future Dreaming",
    subtitle: "Visioning Together",
    description: "Using breathwork to access expanded states and dream into the future we want to create together. A felt future is different from a thought-about future.",
    storyCard: "The breath is the fastest path to an altered state that most people have access to right now, without anything else. Extended intentional breathing affects CO2 and oxygen levels in ways that produce measurable shifts in consciousness: a quieting of the internal critic, an expansion of what feels possible. Most people who try to vision a regenerative future end up listing things: solar panels, permaculture gardens, governance. Genuine visioning is sensory and specific. You are in a place, in a time, experiencing something. The futures we can feel our way into are different from the futures we can only think about.",
    rewards: { regen: 111, rvoice: 1 },
    deliverable: "A sensory, specific written or recorded account of a future you visited during and after a breathwork session",
    estimatedTime: "3-5 hours (breathwork session + reflection)",
    steps: [
      { step: 1, title: "Learn your breathwork approach", description: "Kriya, Kundalini, Holotropic breathwork, Wim Hof, transformational breathing, or any intentional breathing practice. If new to breathwork, start with a guided online session before doing a full session alone." },
      { step: 2, title: "Prepare your space", description: "Create a comfortable lying-down space where you will not be interrupted for 45-90 minutes. Low light, comfortable temperature. Have a journal nearby for immediately afterward." },
      { step: 3, title: "Set your intention", description: "You are going into this session to vision a specific future: the world 20+ years from now, if things go well. Hold that intention lightly as you begin." },
      { step: 4, title: "Do a full breathwork session", description: "Follow your chosen method for 30-60 minutes. Let the visioning emerge naturally. You may find yourself somewhere unexpected. Go there." },
      { step: 5, title: "Write or record immediately after", description: "While the experience is still fresh, capture everything: what you saw, where you were, who was there, what it felt like, what surprised you. Do not edit yet." },
      { step: 6, title: "Compose your vision document", description: "After a day or two, return to your notes. Shape them into a coherent account of the future you visited. Make it sensory and specific. Share it with the community." }
    ],
    resources: [
      { title: "Wim Hof Method: structured breathing practice", url: "https://www.wimhofmethod.com" },
      { title: "Holotropic Breathwork by Stanislav Grof", url: "https://www.holotropic.com" }
    ],
    tips: [
      "If intense emotions arise during breathwork, stay with them. They are releases, not signs something is wrong.",
      "The most interesting visions are usually the ones you did not plan. Trust the unexpected details over the expected ones.",
      "Do not drive for at least a few hours after a deep session. Give yourself time to return fully."
    ]
  },
  "quest-13": {
    id: "quest-13",
    title: "Quest 13: Fasting",
    subtitle: "Regenerative Ikigai",
    description: "What is your role? Discovering your unique purpose through the practice of fasting and reflection. Repeatable. Each fast earns tokens and deepens the practice.",
    storyCard: "The body knows how to heal itself. What it needs, more often than any supplement or intervention, is time to stop processing long enough to do the work. When you fast, digestion stops. The gut goes quiet. That energy gets redirected. Autophagy kicks in: a cellular cleanup process the body cannot do while busy digesting. The 2016 Nobel Prize in Physiology was awarded for autophagy research. Cultures around the world have practiced intentional fasting for thousands of years. This quest is repeatable because the practice compounds. Early fasts are about the physical experience. Later fasts, once the body has adapted, become about something else. What remains when the usual drives go quiet.",
    rewards: { regen: 77, rvoice: 1 },
    deliverable: "A reflection document for each completed fast: dates, duration, key observations, and what shifted",
    estimatedTime: "Minimum 24 hours per completion (repeatable, no cap)",
    steps: [
      { step: 1, title: "Choose your fast", description: "Minimum for this quest: a clean 24-hour water fast (water and herbal tea only, no calories). If you have experience, consider extending to 48-72 hours or longer." },
      { step: 2, title: "Prepare your body", description: "In the days before a longer fast, reduce processed foods, sugar, and caffeine gradually. A clean transition into the fast reduces discomfort significantly." },
      { step: 3, title: "Prepare your environment", description: "Tell the people around you what you are doing. Clear your schedule of high-demand obligations. Have water, herbal tea, and electrolytes available." },
      { step: 4, title: "Fast with intention", description: "Note how you are feeling at the start, middle, and end. What is your energy? Your mood? Your clarity? Hunger comes in waves. When it comes, observe it. It passes." },
      { step: 5, title: "Break your fast gently", description: "Start with fruit, diluted juice, or broth. Give your digestive system a day to rebuild before returning to normal meals." },
      { step: 6, title: "Write your reflection", description: "Each time you complete a fast, write a brief account: what happened in your body, what happened in your mind, what surprised you. Over multiple fasts these become a record of a practice." }
    ],
    resources: [
      { title: "The Complete Guide to Fasting by Jason Fung", url: "https://www.doctorfung.com/the-complete-guide-to-fasting" },
      { title: "Dr. Valter Longo: fasting and longevity research", url: "https://valterlongo.com" }
    ],
    tips: [
      "The hardest part of any fast is the first 4-6 hours. Once past that, hunger becomes more manageable and the clarity begins.",
      "Coffee and tea without anything added do not significantly break the cellular benefits of fasting. If giving up coffee makes a fast impossible, keep it.",
      "People with diabetes, eating disorder history, or pregnancy should consult a doctor before fasting.",
      "Extended fasting requires electrolytes. Add salt and potassium to your water on days 2 and beyond."
    ]
  },
  "quest-14": {
    id: "quest-14",
    title: "Quest 14: Love to Heal Your Body",
    subtitle: "Listening to the Body's Wisdom",
    description: "A one moon cycle practice of body scanning meditation. Every other day, for one hour, you sit with your body and learn its language. You send love to the places that hold tension, pain, or numbness. Over 15 sessions, something shifts: the body starts communicating back.",
    storyCard: "Most of us live from the neck up. We think our way through the day, override the body's signals, and only pay attention when something breaks. This quest reverses that pattern. For one full moon cycle, every other day, you spend an hour in direct conversation with your body. You scan from feet to crown, you find the tension, and you send love there. Actual love, the way you would hold a child or a hurt animal. The body responds to this. Tension that has lived in the same places for years begins to loosen. Pain that seemed permanent starts to shift. By the end of the cycle, many people report that their body has started speaking to them in ways they can finally hear.",
    rewards: { regen: 111, rvoice: 1 },
    deliverable: "A reflection journal or video documenting your 15 sessions and what your body told you",
    estimatedTime: "1 moon cycle (~30 days, 15 sessions of 1 hour each)",
    steps: [
      { step: 1, title: "Set your moon cycle dates", description: "Pick your start date. Count forward 28-30 days. Mark every other day on your calendar. That gives you roughly 15 sessions. Block one hour for each. Morning works best for most people, before the day's noise starts." },
      { step: 2, title: "Prepare your space", description: "Find a quiet place where you can lie down or sit comfortably for an hour without interruption. A mat on the floor, a bed, a couch. No music, no guided audio. This is you and your body, nothing else." },
      { step: 3, title: "Begin each session with grounding", description: "Close your eyes. Take 10 slow breaths. Feel your weight against the surface below you. Let your muscles soften. There is nothing to do yet. Just arrive." },
      { step: 4, title: "Scan from feet to crown", description: "Move your attention slowly through your body. Start at the soles of your feet. Move through ankles, calves, knees, thighs, hips, belly, chest, shoulders, arms, hands, neck, face, crown. Spend at least a few breaths at each area. Notice what you find: tension, warmth, cold, numbness, tingling, pain, nothing." },
      { step: 5, title: "Send love to what you find", description: "When you find a place that holds tension or pain, stay there. Breathe into it. Imagine sending warmth and love directly to that spot, the way you would comfort someone you care about. Do not try to fix it. Just be with it. Let it know you are paying attention." },
      { step: 6, title: "Listen for the response", description: "After sending love to a tight area, wait. Sometimes the body responds with a release: a deep breath, a muscle twitch, a wave of emotion, a memory. Sometimes nothing happens. Both are fine. The practice is the listening, not the result." },
      { step: 7, title: "Journal after each session", description: "Write 3-5 sentences about what you noticed. Where was the tension today? Did anything shift? Did any emotions or images come up? Over 15 sessions, patterns will emerge that you could never see in a single sitting." },
      { step: 8, title: "Complete your reflection", description: "After your final session, review your journal entries. Write a summary of what changed over the moon cycle. What did your body tell you? What surprised you? Share your reflection with the community." }
    ],
    tips: [
      "The first 3-4 sessions often feel like nothing is happening. That is normal. Your nervous system is learning to trust that you are actually listening. The shift usually comes around session 5-7.",
      "If you find a spot that triggers strong emotion, stay with it gently. Crying, laughing, or shaking are all the body releasing stored tension. Let it happen without trying to understand it.",
      "Some people fall asleep during early sessions. This is the body catching up on rest it has been missing. If it keeps happening, try sitting upright instead of lying down.",
      "Do not skip sessions to 'make up' two in one day. The rest day between sessions is part of the practice. The body integrates during the off days."
    ]
  }
};

export function QuestDetailModal({ quest, isOpen, onClose }: QuestDetailModalProps) {
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  // Lock body scroll while the modal is open so touch scrolling stays
  // inside the modal instead of leaking to the page behind it.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen || !quest) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quest-modal-title"
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1a472a] via-[#1a472a] to-[#4a7c59] p-6 text-white relative">
          <button
            onClick={onClose}
            aria-label="Close quest details"
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="pr-10">
            <p className="text-[#7dd87d] text-sm font-medium mb-1">{quest.subtitle}</p>
            <h2 id="quest-modal-title" className="text-2xl font-bold mb-2">{quest.title}</h2>
            <p className="text-white/80 text-sm">{quest.description}</p>
          </div>

          {/* Rewards & Time */}
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full text-sm">
              <Coins className="w-4 h-4 text-[#7dd87d]" />
              <span>+{quest.rewards.regen}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-0.5 cursor-help">
                    $ReGen <Info className="w-3.5 h-3.5 text-[#7dd87d]/80" />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px] text-xs">
                  $ReGen tokens are earned by completing quests and track your regenerative contributions.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full text-sm">
              <Vote className="w-4 h-4 text-[#7dd87d]" />
              <span>+{quest.rewards.rvoice}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-0.5 cursor-help">
                    RGVoice <Info className="w-3.5 h-3.5 text-[#7dd87d]/80" />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px] text-xs">
                  RGVoice tokens represent your governance voting weight in the ReGen Civics Game.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full text-sm">
              <Clock className="w-4 h-4" />
              <span>{quest.estimatedTime}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[50vh] overflow-y-auto overscroll-contain">
          {/* Video / media hero */}
          {quest.videoUrl && (
            <div className="mb-6">
              <QuestTier3Media
                questId={parseInt(quest.id.replace('quest-', '').replace('food-foresting', '4')) || 0}
                slug={quest.id.replace('quest-', '').replace(/^\d+-?/, '') || 'quest'}
                videoUrl={quest.videoUrl}
                title={quest.title}
              />
            </div>
          )}

          {/* Old hardcoded embeds removed. QuestTier3Media above handles all quests with videoUrl. */}

          {/* Story card */}
          {quest.storyCard && (
            <div className="mb-6 bg-[#f0ebe3] border border-[#d4a574]/30 rounded-xl px-5 py-4">
              <p className="text-sm italic text-[#1a472a]/80 leading-relaxed">{quest.storyCard}</p>
            </div>
          )}

          {/* Steps */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-[#1a472a] mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#4a7c59]" />
              Step-by-Step Guide
            </h3>
            {quest.steps.length === 1 && quest.steps[0].title === "Details Coming Soon" ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-4">Full guide coming soon. Download the field guide PDF for now.</p>
                {QUEST_PDF_SLUGS[quest.id] ? (
                  <a
                    href={`/quest-guides/${QUEST_PDF_SLUGS[quest.id]}.pdf`}
                    download
                    className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#4a7c59] to-[#1a472a] hover:from-[#4a7c59] hover:to-[#256b29] text-white rounded-xl font-semibold transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Field Guide
                  </a>
                ) : (
                  <a
                    href={`/quest-guides/quest-${String(quest.id.replace('quest-', '')).padStart(2, '0')}-${quest.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.pdf`}
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#7dd87d]/20 border border-[#7dd87d]/40 text-[#7dd87d] rounded-lg hover:bg-[#7dd87d]/30 transition-all text-sm"
                  >
                    <FileDown className="w-4 h-4" />
                    Download Quest Guide (PDF)
                  </a>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {quest.steps.map((step) => (
                  <div key={step.step} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#7dd87d]/20 flex items-center justify-center text-[#4a7c59] font-bold text-sm">
                      {step.step}
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#1a472a]">{step.title}</h4>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                  </div>
                ))}
                {QUEST_PDF_SLUGS[quest.id] && (
                  <a
                    href={`/quest-guides/${QUEST_PDF_SLUGS[quest.id]}.pdf`}
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#4a7c59]/10 hover:bg-[#4a7c59]/20 text-[#4a7c59] rounded-lg text-sm font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Prefer to read? Download the field guide
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Deliverable */}
          <div className="mb-6 p-4 bg-[#f0ebe3] rounded-xl">
            <h3 className="font-bold text-[#1a472a] mb-2">📦 Deliverable</h3>
            <p className="text-sm text-[#1a472a]/80">{quest.deliverable}</p>
          </div>

          {/* Tips */}
          {quest.tips && quest.tips.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-[#1a472a] mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#7dd87d]" />
                Pro Tips
              </h3>
              <ul className="space-y-2">
                {quest.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    <ArrowRight className="w-4 h-4 text-[#4a7c59] flex-shrink-0 mt-0.5" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Resources */}
          {quest.resources && quest.resources.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-[#1a472a] mb-3">🔗 Resources</h3>
              <div className="flex flex-wrap gap-2">
                {quest.resources.map((resource, index) => (
                  <a
                    key={index}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-[#4a7c59]/10 hover:bg-[#4a7c59]/20 rounded-lg text-sm text-[#4a7c59] transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {resource.title}
                  </a>
                ))}
              </div>
            </div>
          )}
          {/* Video Reminder - UPDATE VIDEO_URL BELOW WHEN READY */}
          {(() => {
            // ╔════════════════════════════════════════════════════════════════╗
            // ║  🎬 VIDEO TUTORIAL LINK - UPDATE THIS WHEN READY!              ║
            // ║  Replace the empty string below with your YouTube video URL    ║
            // ║  Example: "https://youtu.be/pbhGgg2GZUM"                       ║
            // ╚════════════════════════════════════════════════════════════════╝
            const VIDEO_URL = ""; // <-- ADD YOUR VIDEO URL HERE
            
            return VIDEO_URL ? (
              <a
                href={VIDEO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl block hover:bg-green-100 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <PlayCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-800 text-sm">Watch: How to Apply for Your Tokens</h4>
                    <p className="text-xs text-green-700 mt-1">Click to watch the tutorial video on submitting your quest and earning tokens!</p>
                  </div>
                </div>
              </a>
            ) : (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <PlayCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-800 text-sm">Watch: How to Apply for Your Tokens</h4>
                    <p className="text-xs text-amber-700 mt-1">Video coming soon - check back for instructions on submitting your quest and earning tokens!</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Submit Quest Link */}
          <div className="p-4 bg-gradient-to-r from-[#4a7c59]/10 to-[#1a472a]/10 rounded-xl border border-[#4a7c59]/20">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-[#1a472a] text-sm flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Ready to Submit?
                </h4>
                <p className="text-xs text-[#1a472a]/70 mt-1">Submit your completed quest in the Game Space to earn tokens</p>
              </div>
              <a
                href="https://app.hypha.earth/en/dho/regen-games/agreements"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#4a7c59] hover:bg-[#4a7c59] text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                Go to Game Space
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 order-3 sm:order-1">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>

          </div>
          <div className="flex flex-col sm:flex-row gap-2 order-1 sm:order-2">
            {/* Start Quest Button - Links to video, disabled if no video */}
            <Button
              variant="outline"
              className={`border-[#4a7c59] text-[#4a7c59] hover:bg-[#4a7c59]/10 ${!quest.videoUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => {
                if (quest.videoUrl) {
                  window.open(quest.videoUrl, '_blank');
                }
              }}
              disabled={!quest.videoUrl}
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              {quest.videoUrl ? 'Start this Quest' : 'Video Coming Soon'}
            </Button>
            {/* Finish Quest Button - opens the SubmitToDAOModal */}
            <Button
              className="bg-gradient-to-r from-[#4a7c59] to-[#1a472a] hover:from-[#4a7c59] hover:to-[#256b29] text-white"
              onClick={() => setSubmitModalOpen(true)}
            >
              <Send className="w-4 h-4 mr-2" />
              Finish this Quest
            </Button>
            <SubmitToDAOModal
              isOpen={submitModalOpen}
              onClose={() => setSubmitModalOpen(false)}
              questId={quest.id}
              questTitle={quest.title}
              questDescription={quest.description}
              questDeliverable={quest.deliverable}
              regenReward={quest.rewards.regen}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
