/**
 * Seed the four demo crowdpooling campaigns (CROWDPOOLING_PLATFORM_SPEC.md,
 * locked decision 3: demo data stays, clearly labeled).
 *
 * Converts the hardcoded sampleProjects from CrowdPoolingProjects.tsx into
 * real DB campaigns with isDemo=1, so the gallery, campaign detail page,
 * needs registry, claim flow, updates journal, and partner blocks all have
 * fully worked examples covering every need kind and all nine capitals.
 *
 * Run AFTER migrations 0202-0205 and seed-crowdpool-config.ts:
 *   npx tsx scripts/seed-demo-campaigns.ts
 *
 * Idempotent: campaigns are keyed by (title, isDemo=1). On re-run each demo
 * campaign row is refreshed in place and its child rows (items,
 * contributions, updates, partner links) are deleted and re-seeded.
 *
 * Consistency guarantee: campaign_items.quantityClaimed / quantityDelivered
 * and the campaign-level pledged totals are COMPUTED from the seeded
 * contribution rows (claimed = accepted + fulfilled + thanked, delivered =
 * fulfilled + thanked), never hand-set, so progress bars always agree with
 * the ledger. All contributor names and emails are fictional (@example.com).
 */
import "dotenv/config";
import mysql from "mysql2/promise";

// ── Types ────────────────────────────────────────────────────────────────────

type NeedKind = "item" | "role" | "shift" | "loan" | "knowledge" | "crypto";
type CapitalType =
  | "intellectual" | "social" | "material" | "financial" | "living"
  | "cultural" | "spiritual" | "experiential" | "health";
type ContributionType = "land" | "equipment" | "role" | "resource" | "financial" | "knowledge";
type ContributionStatus = "pending" | "accepted" | "fulfilled" | "thanked" | "expired";

type DemoNeed = {
  key: string;                 // Local key so contributions can reference this need
  kind: NeedKind;
  capitalType: CapitalType;
  name: string;
  description: string;
  quantityWanted: number;
  unit?: string;
  estimatedValue: number;      // Total value of the whole need, campaign currency
  groupClaimable?: boolean;
  priorityPinned?: boolean;
  needDeadlineDays?: number;   // Days from now
  shiftStartDays?: number;     // Shifts: start, days from now
  shiftHours?: number;         // Shifts: length in hours
  loanStartDays?: number;      // Loans: custody window start, days from now
  loanEndDays?: number;        // Loans: custody window end, days from now
  hoursPerWeek?: number;       // Roles
  durationMonths?: number;     // Roles
};

type DemoContribution = {
  needKey?: string;            // Omit for a freeform offer
  name: string;
  email: string;
  type: ContributionType;
  title: string;
  description?: string;
  quantity: number;
  estimatedValue: number;
  status: ContributionStatus;
  isAnonymous?: boolean;
  submittedDaysAgo: number;
  acknowledgedNote?: string;   // Required when status is thanked
};

type DemoUpdate = { title: string; body: string; daysAgo: number };

type DemoPartnerLink = {
  partner: "maearth" | "gosteward";
  label: string;
  url: string;
  cachedRaised: number;
  cachedContributorCount: number;
  cachedPercent: number;
};

type DemoCampaign = {
  title: string;
  description: string;
  location: string;
  currency: string;
  financialTarget: number;
  durationDays: number;
  startedDaysAgo: number;
  projectImageUrl: string;
  videoUrl?: string;
  daoLink?: string;
  story: {
    vision: string;
    landStatus: string;
    landSize: string;
    currentPhase: string;
    timeline: string;
    legalStructure: string;
    governanceModel: string;
    membershipModel: string;
    housingPlans: string;
    foodSystems: string;
    waterSystems: string;
    energySystems: string;
    educationPrograms: string;
    communityEngagement: string;
    impactMetrics: string;
    challenges: string;
    teamSize: number;
    teamDescription: string;
    regenerativePractices: string;
  };
  needs: DemoNeed[];
  contributions: DemoContribution[];
  updates: DemoUpdate[];
  partnerLinks: DemoPartnerLink[];
};

// ── Date helpers ─────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY_MS);
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS);

// ── Legacy column mapping (category stays for back-compat reads) ─────────────

function legacyCategory(kind: NeedKind): "equipment" | "role" | "resource" {
  if (kind === "role" || kind === "shift" || kind === "knowledge") return "role";
  if (kind === "loan") return "equipment";
  return "resource"; // item, crypto
}

// ── The four demo campaigns ──────────────────────────────────────────────────

const DEMO_CAMPAIGNS: DemoCampaign[] = [
  // ══ 1. Harmony Valley Ecovillage ══════════════════════════════════════════
  {
    title: "Harmony Valley Ecovillage",
    description:
      "A 150-acre regenerative community focused on permaculture, food forests, and sustainable housing for 50 families.",
    location: "Costa Rica, Guanacaste Province",
    currency: "USD",
    financialTarget: 500000,
    durationDays: 120,
    startedDaysAgo: 40,
    projectImageUrl: "https://assets.regencivics.earth/ptLdEEmSgyEQKzmF.jpg",
    videoUrl: "https://youtu.be/jxKR-WneJp0",
    daoLink: "https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution",
    story: {
      vision:
        "Create a thriving regenerative community where 50 families live in harmony with nature, growing their own food, sharing resources, and demonstrating that sustainable living is not only possible but beautiful.",
      landStatus: "Owned",
      landSize: "150 acres",
      currentPhase: "Infrastructure Development",
      timeline: "5 years to full development",
      legalStructure: "Non-profit Foundation + Land Trust",
      governanceModel: "Sociocracy with consent-based decision making",
      membershipModel: "Equity buy-in with sliding scale options",
      housingPlans: "50 eco-homes using natural building techniques",
      foodSystems: "Food forest, market garden, aquaponics, community kitchen",
      waterSystems: "Rainwater harvesting, greywater recycling, constructed wetlands",
      energySystems: "100% solar with battery backup, biogas from composting",
      educationPrograms: "Permaculture Design Course, Natural Building workshops, Children's forest school",
      communityEngagement: "Monthly open days, volunteer program, local farmer partnerships",
      impactMetrics: "Carbon sequestration, biodiversity increase, water retention, community wellbeing surveys",
      challenges: "Initial infrastructure costs, navigating local regulations, building community trust",
      teamSize: 12,
      teamDescription: "Combined 50+ years in permaculture, community development, and sustainable building",
      regenerativePractices:
        "Food forest establishment, natural building with local materials, water retention landscapes, solar energy, community composting and biogas",
    },
    needs: [
      // Items
      {
        key: "cedar-posts", kind: "item", capitalType: "material",
        name: "Cedar fence posts", unit: "posts",
        description: "Rot-resistant cedar posts for perimeter and paddock fencing around the food forest zones.",
        quantityWanted: 200, estimatedValue: 3000, groupClaimable: true, priorityPinned: true,
        needDeadlineDays: 45,
      },
      {
        key: "fruit-trees", kind: "item", capitalType: "living",
        name: "Fruit tree saplings", unit: "trees",
        description: "Mango, citrus, avocado, and breadfruit saplings for the first two food forest zones.",
        quantityWanted: 150, estimatedValue: 4500, groupClaimable: true,
        needDeadlineDays: 60,
      },
      {
        key: "water-tank", kind: "item", capitalType: "material",
        name: "5000L rainwater tank", unit: "tanks",
        description: "Food-grade polyethylene tanks for the community kitchen rainwater harvesting system.",
        quantityWanted: 2, estimatedValue: 2400,
      },
      // Roles across the social, cultural, spiritual, and health capitals
      {
        key: "community-organizer", kind: "role", capitalType: "social",
        name: "Community Organizer",
        description: "Hold the social fabric: welcome new members, run the monthly open days, and keep our volunteer program humming.",
        quantityWanted: 1, estimatedValue: 19500, hoursPerWeek: 15, durationMonths: 12, priorityPinned: true,
      },
      {
        key: "conflict-evolutionary", kind: "role", capitalType: "social",
        name: "Conflict Evolutionary",
        description: "Guide the community through disagreements with restorative practices and consent-based facilitation.",
        quantityWanted: 1, estimatedValue: 9600, hoursPerWeek: 6, durationMonths: 12,
      },
      {
        key: "dance-coordinator", kind: "role", capitalType: "cultural",
        name: "Dance Coordinator",
        description: "Bring the village to life with weekly ecstatic dance, folk dance evenings, and harvest celebrations.",
        quantityWanted: 1, estimatedValue: 4800, hoursPerWeek: 4, durationMonths: 12,
      },
      {
        key: "ceremony-holder", kind: "role", capitalType: "spiritual",
        name: "Ceremony Holder",
        description: "Hold seasonal ceremonies, land blessings, and rites of passage for the community.",
        quantityWanted: 1, estimatedValue: 4800, hoursPerWeek: 4, durationMonths: 12,
      },
      {
        key: "yoga-instructor", kind: "role", capitalType: "health",
        name: "Yoga Instructor",
        description: "Morning yoga and breathwork sessions for residents and volunteers, three times a week.",
        quantityWanted: 1, estimatedValue: 7200, hoursPerWeek: 6, durationMonths: 12,
      },
      {
        key: "permaculture-lead", kind: "role", capitalType: "intellectual",
        name: "Permaculture Design Lead",
        description: "Lead the design and implementation of food forests and regenerative agriculture systems, and train community members.",
        quantityWanted: 1, estimatedValue: 18200, hoursPerWeek: 20, durationMonths: 6,
      },
      // Shifts
      {
        key: "planting-day", kind: "shift", capitalType: "experiential",
        name: "Food forest planting day", unit: "people",
        description: "One full day planting the zone 2 food forest together. Tools, lunch, and music provided. Bring gloves and a hat.",
        quantityWanted: 20, estimatedValue: 2000, groupClaimable: true,
        shiftStartDays: 21, shiftHours: 8,
      },
      {
        key: "cob-work-party", kind: "shift", capitalType: "experiential",
        name: "Natural building work party", unit: "people",
        description: "Two days of cob wall raising on the community kitchen. Learn natural building by doing it.",
        quantityWanted: 15, estimatedValue: 2400, groupClaimable: true,
        shiftStartDays: 35, shiftHours: 16,
      },
      // Loans
      {
        key: "wood-chipper", kind: "loan", capitalType: "material",
        name: "Wood chipper (loan)",
        description: "A chipper for six weeks to turn cleared brush into mulch for the new tree rows. We cover fuel and return it serviced.",
        quantityWanted: 1, estimatedValue: 1200,
        loanStartDays: 14, loanEndDays: 56,
      },
      {
        key: "farm-truck", kind: "loan", capitalType: "material",
        name: "Pickup truck (loan)",
        description: "A truck for two months of hauling posts, tanks, and saplings from town. We insure and maintain it while in our care.",
        quantityWanted: 1, estimatedValue: 2000,
        loanStartDays: 7, loanEndDays: 67,
      },
      // Knowledge
      {
        key: "pond-consult", kind: "knowledge", capitalType: "intellectual",
        name: "Pond design consultation",
        description: "Two sessions with an experienced water retention designer to finalize the swale and pond layout before the rains.",
        quantityWanted: 1, estimatedValue: 800,
      },
      // Crypto (decision 7: trackable money on-platform)
      {
        key: "crypto-infra", kind: "crypto", capitalType: "financial",
        name: "Crypto contribution (USDC on Base)", unit: "USD",
        description: "Crypto pledges toward the water and solar infrastructure. Pledged on-platform, delivered on receipt. Fiat gifts and loans go through our partners below.",
        quantityWanted: 25000, estimatedValue: 25000, groupClaimable: true,
      },
    ],
    contributions: [
      {
        needKey: "cedar-posts", name: "Sana Cypress", email: "sana.cypress@example.com",
        type: "resource", title: "80 cedar posts from our family mill",
        description: "Milled last season, dried and ready. We can deliver to the land.",
        quantity: 80, estimatedValue: 1200, status: "fulfilled", submittedDaysAgo: 28,
      },
      {
        needKey: "cedar-posts", name: "Milo Farrow", email: "milo.farrow@example.com",
        type: "resource", title: "40 cedar posts",
        quantity: 40, estimatedValue: 600, status: "accepted", submittedDaysAgo: 9,
      },
      {
        needKey: "fruit-trees", name: "Teodora Brightwater", email: "teodora.b@example.com",
        type: "resource", title: "60 saplings from our nursery",
        description: "Mango and citrus, one to two years old, healthy rootstock.",
        quantity: 60, estimatedValue: 1800, status: "thanked", submittedDaysAgo: 32,
        acknowledgedNote: "The saplings are in the ground and thriving. The mango row is already a favorite walk. Thank you, Teodora, from all of us.",
      },
      {
        needKey: "water-tank", name: "Petra Skovlund", email: "petra.skov@example.com",
        type: "resource", title: "One 5000L tank",
        quantity: 1, estimatedValue: 1200, status: "expired", submittedDaysAgo: 40,
      },
      {
        needKey: "yoga-instructor", name: "Ana Sofia Rios", email: "anasofia.rios@example.com",
        type: "role", title: "Yoga and breathwork, three mornings a week",
        description: "500hr certified, ten years teaching, moving to Guanacaste in the fall.",
        quantity: 1, estimatedValue: 7200, status: "accepted", submittedDaysAgo: 12,
      },
      {
        needKey: "dance-coordinator", name: "Luz Caminante", email: "luz.caminante@example.com",
        type: "role", title: "Dance facilitation offer",
        description: "I lead ecstatic dance and Latin folk dance evenings and would love to hold this.",
        quantity: 1, estimatedValue: 4800, status: "pending", submittedDaysAgo: 3,
      },
      {
        needKey: "pond-consult", name: "Wren Hollis", email: "wren.hollis@example.com",
        type: "knowledge", title: "Pond and swale design sessions",
        description: "Keyline design specialist, 15 years of water retention projects in the tropics.",
        quantity: 1, estimatedValue: 800, status: "fulfilled", submittedDaysAgo: 22,
      },
      {
        needKey: "planting-day", name: "Rio Verde Permaculture Club", email: "club@rioverde.example.com",
        type: "role", title: "Six of us for the planting day",
        quantity: 6, estimatedValue: 600, status: "accepted", submittedDaysAgo: 6,
      },
      {
        needKey: "crypto-infra", name: "Anonymous", email: "anon.giver@example.com",
        type: "financial", title: "5000 USDC toward the water system",
        quantity: 5000, estimatedValue: 5000, status: "accepted", isAnonymous: true, submittedDaysAgo: 8,
      },
      {
        needKey: "crypto-infra", name: "Jonah Petrides", email: "jonah.petrides@example.com",
        type: "financial", title: "3500 USDC for solar",
        quantity: 3500, estimatedValue: 3500, status: "fulfilled", submittedDaysAgo: 18,
      },
    ],
    updates: [
      {
        title: "The first posts are in the ground", daysAgo: 30,
        body: "The cedar posts from the Cypress family mill arrived on Tuesday. By Friday the first hundred meters of paddock fence stood along the ridge line. Every post that goes in means one more zone protected from the neighbor's cattle and one step closer to planting. The crew celebrated with fresh coconut water on the new fence line. More posts are still needed, so if you have cedar, we have holes waiting.",
      },
      {
        title: "Sixty fruit trees have a home", daysAgo: 14,
        body: "Teodora drove three hours with a truck full of mango and citrus saplings, and we planted every one of them before the afternoon rain. The zone 2 food forest is no longer a drawing on paper. It is sixty small trees with mulch rings, drip lines, and names. Walk the rows with us at the next open day and pick one to watch grow.",
      },
      {
        title: "Work party dates are set", daysAgo: 5,
        body: "Two dates for your calendar. The food forest planting day happens in three weeks, and the cob work party on the community kitchen follows two weeks after. Tools, lunch, and music are on us. Bring gloves, a hat, and anyone who wants to learn by doing. Claim a spot through the needs list so we know how much lunch to cook.",
      },
    ],
    partnerLinks: [
      {
        partner: "maearth", label: "Give through Ma Earth",
        url: "https://maearth.com/projects/harmony-valley-ecovillage",
        cachedRaised: 52000, cachedContributorCount: 41, cachedPercent: 35,
      },
      {
        partner: "gosteward", label: "Lend through GoSteward",
        url: "https://www.gosteward.com/campaigns/harmony-valley-ecovillage",
        cachedRaised: 33000, cachedContributorCount: 12, cachedPercent: 22,
      },
    ],
  },

  // ══ 2. Terra Nova Regenerative Farm ═══════════════════════════════════════
  {
    title: "Terra Nova Regenerative Farm",
    description:
      "Converting 200 hectares of degraded farmland into a thriving regenerative agriculture demonstration site.",
    location: "Portugal, Alentejo Region",
    currency: "EUR",
    financialTarget: 350000,
    durationDays: 160,
    startedDaysAgo: 45,
    projectImageUrl: "https://assets.regencivics.earth/wwnJXOsxkrlwtDre.jpg",
    daoLink: "https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution",
    story: {
      vision:
        "Transform degraded agricultural land into a model of regenerative farming that restores soil health, increases biodiversity, and provides sustainable livelihoods.",
      landStatus: "Long-term lease (50 years)",
      landSize: "200 hectares",
      currentPhase: "Soil Restoration",
      timeline: "7 years to full productivity",
      legalStructure: "Cooperative",
      governanceModel: "Democratic cooperative with one member, one vote",
      membershipModel: "Worker-owner cooperative shares",
      housingPlans: "Renovated farmhouse + 10 new eco-cabins",
      foodSystems: "Silvopasture, market garden, olive groves, cork oak restoration",
      waterSystems: "Keyline design, swales, dam restoration",
      energySystems: "Solar panels, wind turbine, biomass heating",
      educationPrograms: "Regenerative agriculture courses, intern program",
      communityEngagement: "Farm-to-table restaurant, agritourism",
      impactMetrics: "Soil organic matter increase, water infiltration rates, crop yields",
      challenges: "Drought conditions, initial soil degradation, market access",
      teamSize: 8,
      teamDescription: "Agricultural scientists, experienced farmers, business developers",
      regenerativePractices:
        "Keyline water design, silvopasture, cover cropping, compost tea programs, cork oak restoration, rotational grazing",
    },
    needs: [
      {
        key: "olive-saplings", kind: "item", capitalType: "living",
        name: "Olive and cork oak saplings", unit: "trees",
        description: "Drought-hardy olive and cork oak saplings to restore the degraded east slopes.",
        quantityWanted: 300, estimatedValue: 6000, groupClaimable: true, priorityPinned: true,
        needDeadlineDays: 75,
      },
      {
        key: "hand-tools", kind: "item", capitalType: "material",
        name: "Broadforks and hand tool sets", unit: "sets",
        description: "Quality broadforks, hoes, and pruning kits for the market garden crew and course participants.",
        quantityWanted: 10, estimatedValue: 1500, groupClaimable: true,
      },
      {
        key: "compost", kind: "item", capitalType: "living",
        name: "Finished compost", unit: "cubic meters",
        description: "Mature compost to inoculate the worst of the depleted fields while our own windrows come online.",
        quantityWanted: 40, estimatedValue: 2000, groupClaimable: true,
      },
      {
        key: "soil-scientist", kind: "role", capitalType: "intellectual",
        name: "Soil Scientist",
        description: "Monitor and improve soil health through testing and regenerative practices. Soil testing, amendment recommendations, progress tracking.",
        quantityWanted: 1, estimatedValue: 40000, hoursPerWeek: 25, durationMonths: 10, priorityPinned: true,
      },
      {
        key: "community-organizer-tn", kind: "role", capitalType: "social",
        name: "Community Organizer",
        description: "Weave the cooperative together: member onboarding, village relations, and the monthly farm lunches.",
        quantityWanted: 1, estimatedValue: 12000, hoursPerWeek: 12, durationMonths: 12,
      },
      {
        key: "storyteller", kind: "role", capitalType: "cultural",
        name: "Storyteller",
        description: "Collect and tell the story of this land: the old farmers' memories, the restoration as it unfolds, evenings by the fire.",
        quantityWanted: 1, estimatedValue: 4800, hoursPerWeek: 5, durationMonths: 10,
      },
      {
        key: "meditation-leader", kind: "role", capitalType: "spiritual",
        name: "Meditation Leader",
        description: "Hold morning sits and quiet walking meditations for the crew through the long restoration seasons.",
        quantityWanted: 1, estimatedValue: 3600, hoursPerWeek: 4, durationMonths: 10,
      },
      {
        key: "massage-therapist", kind: "role", capitalType: "health",
        name: "Massage Therapist",
        description: "Keep the field crew's bodies working: weekly bodywork sessions during planting and harvest pushes.",
        quantityWanted: 1, estimatedValue: 5200, hoursPerWeek: 5, durationMonths: 8,
      },
      {
        key: "swale-day", kind: "shift", capitalType: "experiential",
        name: "Swale digging weekend", unit: "people",
        description: "Two days shaping the keyline swales on the east slope before the autumn rains. Machines cut, hands finish.",
        quantityWanted: 16, estimatedValue: 2600, groupClaimable: true,
        shiftStartDays: 28, shiftHours: 16,
      },
      {
        key: "olive-planting", kind: "shift", capitalType: "experiential",
        name: "Olive planting weekend", unit: "people",
        description: "Plant the first 150 trees of the new grove together. Cooperative lunch under the cork oaks included.",
        quantityWanted: 20, estimatedValue: 3000, groupClaimable: true,
        shiftStartDays: 49, shiftHours: 16,
      },
      {
        key: "excavator-loan", kind: "loan", capitalType: "material",
        name: "Mini excavator (loan)",
        description: "Three weeks of excavator time to cut the main swales and repair the old dam. Our operator is licensed and insured.",
        quantityWanted: 1, estimatedValue: 3500,
        loanStartDays: 21, loanEndDays: 42,
      },
      {
        key: "keyline-consult", kind: "knowledge", capitalType: "intellectual",
        name: "Keyline design review",
        description: "A day walking the land with an experienced keyline designer to check our survey before the excavator arrives.",
        quantityWanted: 1, estimatedValue: 900,
      },
      {
        key: "crypto-tn", kind: "crypto", capitalType: "financial",
        name: "Crypto contribution (USDC on Base)", unit: "EUR",
        description: "Crypto pledges toward sapling purchases and the dam repair. Fiat gifts and loans route through our partners below.",
        quantityWanted: 18000, estimatedValue: 18000, groupClaimable: true,
      },
    ],
    contributions: [
      {
        needKey: "olive-saplings", name: "Ines Alvor", email: "ines.alvor@example.com",
        type: "resource", title: "120 olive saplings from our nursery",
        description: "Galega variety, drought-proven, two years old.",
        quantity: 120, estimatedValue: 2400, status: "fulfilled", submittedDaysAgo: 30,
      },
      {
        needKey: "olive-saplings", name: "Duarte Ferreira e Filhos", email: "duarte.filhos@example.com",
        type: "resource", title: "80 cork oak saplings",
        quantity: 80, estimatedValue: 1600, status: "accepted", submittedDaysAgo: 10,
      },
      {
        needKey: "compost", name: "Quinta do Sol Nascente", email: "quinta.sol@example.com",
        type: "resource", title: "15 cubic meters of finished compost",
        description: "Two-year windrow compost from our dairy, lab tested.",
        quantity: 15, estimatedValue: 750, status: "thanked", submittedDaysAgo: 35,
        acknowledgedNote: "The first fields we spread it on are already greening ahead of the rest. Your compost gave this soil its first real meal in decades. Obrigado.",
      },
      {
        needKey: "hand-tools", name: "Marta Guimaraes", email: "marta.guim@example.com",
        type: "resource", title: "Three broadfork and tool sets",
        quantity: 3, estimatedValue: 450, status: "accepted", submittedDaysAgo: 7,
      },
      {
        needKey: "soil-scientist", name: "Dr. Levi Ashgrove", email: "levi.ashgrove@example.com",
        type: "role", title: "Soil science support, 25 hours a week",
        description: "PhD in soil microbiology, ten seasons of restoration fieldwork in dryland systems.",
        quantity: 1, estimatedValue: 40000, status: "accepted", submittedDaysAgo: 14,
      },
      {
        needKey: "massage-therapist", name: "Beatriz Solano", email: "beatriz.solano@example.com",
        type: "role", title: "Weekly bodywork for the crew",
        quantity: 1, estimatedValue: 5200, status: "pending", submittedDaysAgo: 4,
      },
      {
        needKey: "excavator-loan", name: "Alentejo Earthworks Coop", email: "earthworks.coop@example.com",
        type: "equipment", title: "Mini excavator for three weeks",
        description: "Kubota U27 with buckets, available in the window you listed.",
        quantity: 1, estimatedValue: 3500, status: "accepted", submittedDaysAgo: 11,
      },
      {
        needKey: "keyline-consult", name: "Old claim (released)", email: "keyline.gone@example.com",
        type: "knowledge", title: "Keyline walk-through",
        quantity: 1, estimatedValue: 900, status: "expired", submittedDaysAgo: 44,
      },
      {
        needKey: "crypto-tn", name: "Fen Marlowe", email: "fen.marlowe@example.com",
        type: "financial", title: "2500 USDC for saplings",
        quantity: 2500, estimatedValue: 2500, status: "fulfilled", submittedDaysAgo: 20,
      },
    ],
    updates: [
      {
        title: "The soil is starting to answer", daysAgo: 25,
        body: "The compost from Quinta do Sol Nascente went onto the worst two hectares three weeks ago, and this morning the infiltration test held water twice as long as the baseline. Small numbers, big feeling. Dr. Ashgrove starts with us next month and will put real measurements behind what our boots already know. The east slope is waking up.",
      },
      {
        title: "Swales before the autumn rains", daysAgo: 8,
        body: "The excavator is booked, the keyline survey is nearly done, and the swale digging weekend now has nine of the sixteen hands we need. If you have ever wanted to learn water harvesting earthworks with your own shovel, this is the weekend. Every meter of swale we finish before the rains is water in the ground next summer.",
      },
    ],
    partnerLinks: [
      {
        partner: "maearth", label: "Give through Ma Earth",
        url: "https://maearth.com/projects/terra-nova-regenerative-farm",
        cachedRaised: 38000, cachedContributorCount: 27, cachedPercent: 29,
      },
      {
        partner: "gosteward", label: "Lend through GoSteward",
        url: "https://www.gosteward.com/campaigns/terra-nova-regenerative-farm",
        cachedRaised: 27000, cachedContributorCount: 9, cachedPercent: 18,
      },
    ],
  },

  // ══ 3. Pachamama Learning Village ═════════════════════════════════════════
  {
    title: "Pachamama Learning Village",
    description:
      "An indigenous-led project creating a learning center for traditional ecological knowledge and modern regenerative practices.",
    location: "Ecuador, Andes Mountains",
    currency: "USD",
    financialTarget: 250000,
    durationDays: 180,
    startedDaysAgo: 30,
    projectImageUrl: "https://assets.regencivics.earth/qDMEazGCLoNCuxiS.jpg",
    daoLink: "https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution",
    story: {
      vision:
        "Bridge ancient wisdom and modern sustainability by creating a learning center where indigenous knowledge keepers share traditional ecological practices.",
      landStatus: "Community-owned ancestral land",
      landSize: "80 acres",
      currentPhase: "Learning Center Construction",
      timeline: "3 years to operational",
      legalStructure: "Indigenous Community Foundation",
      governanceModel: "Traditional council with elder guidance",
      membershipModel: "Community membership with visitor programs",
      housingPlans: "Traditional construction methods, 20 guest cabins",
      foodSystems: "Chakra gardens, medicinal plants, traditional crops",
      waterSystems: "Spring-fed systems, traditional irrigation",
      energySystems: "Micro-hydro, solar",
      educationPrograms: "Traditional medicine, sustainable agriculture, language preservation",
      communityEngagement: "Cultural exchanges, research partnerships",
      impactMetrics: "Knowledge preservation, youth engagement, biodiversity",
      challenges: "Preserving traditions while adapting to change, funding sustainability",
      teamSize: 25,
      teamDescription: "Elders, traditional healers, educators, young leaders",
      regenerativePractices:
        "Chakra polyculture gardens, traditional terracing, spring protection, medicinal plant cultivation, ancestral seed saving",
    },
    needs: [
      {
        key: "adobe-blocks", kind: "item", capitalType: "material",
        name: "Adobe blocks", unit: "blocks",
        description: "Pressed adobe blocks for the learning center walls, made to the traditional local dimensions.",
        quantityWanted: 2000, estimatedValue: 3000, groupClaimable: true, priorityPinned: true,
        needDeadlineDays: 50,
      },
      {
        key: "medicinal-starts", kind: "item", capitalType: "living",
        name: "Medicinal plant starts", unit: "plants",
        description: "Starts and cuttings for the medicine garden: the elders' full list is available on request.",
        quantityWanted: 400, estimatedValue: 2000, groupClaimable: true,
      },
      {
        key: "cabin-bedding", kind: "item", capitalType: "material",
        name: "Guest cabin bedding sets", unit: "sets",
        description: "Warm bedding for the first eight guest cabins hosting visiting students and researchers.",
        quantityWanted: 16, estimatedValue: 1600, groupClaimable: true,
      },
      {
        key: "traditions-keeper", kind: "role", capitalType: "cultural",
        name: "Traditions Keeper",
        description: "Work beside the elders to document songs, weaving patterns, and the agricultural calendar, and teach them to the young ones.",
        quantityWanted: 1, estimatedValue: 9000, hoursPerWeek: 10, durationMonths: 12, priorityPinned: true,
      },
      {
        key: "ceremony-holder-pl", kind: "role", capitalType: "spiritual",
        name: "Ceremony Holder",
        description: "Support the elders in holding the seasonal ceremonies and the daily fire, under their guidance.",
        quantityWanted: 1, estimatedValue: 4800, hoursPerWeek: 5, durationMonths: 12,
      },
      {
        key: "fitness-leader", kind: "role", capitalType: "health",
        name: "Community Fitness Leader",
        description: "Morning movement for builders and students: stretching, strength, and mountain walks at altitude.",
        quantityWanted: 1, estimatedValue: 4200, hoursPerWeek: 5, durationMonths: 10,
      },
      {
        key: "welcome-steward", kind: "role", capitalType: "social",
        name: "Welcome Steward",
        description: "Receive visiting students and researchers, hold orientation, and make sure guests move through the village respectfully.",
        quantityWanted: 1, estimatedValue: 6000, hoursPerWeek: 8, durationMonths: 12,
      },
      {
        key: "doc-specialist", kind: "role", capitalType: "intellectual",
        name: "Documentation Specialist",
        description: "Record and preserve traditional knowledge through video, audio, and written documentation. Interview elders, create educational materials, manage the archive.",
        quantityWanted: 1, estimatedValue: 16800, hoursPerWeek: 20, durationMonths: 7,
      },
      {
        key: "minga-build", kind: "shift", capitalType: "experiential",
        name: "Learning center minga (build day)", unit: "people",
        description: "A traditional minga to raise the second classroom's adobe walls. Shared meal from the chakra gardens at midday.",
        quantityWanted: 30, estimatedValue: 3000, groupClaimable: true,
        shiftStartDays: 18, shiftHours: 9,
      },
      {
        key: "garden-shift", kind: "shift", capitalType: "experiential",
        name: "Medicine garden planting morning", unit: "people",
        description: "Plant the terraced medicine garden with the healers, learning each plant as it goes in.",
        quantityWanted: 12, estimatedValue: 1200, groupClaimable: true,
        shiftStartDays: 32, shiftHours: 5,
      },
      {
        key: "camera-kit", kind: "loan", capitalType: "material",
        name: "Video camera kit (loan)",
        description: "A camera, tripod, and audio kit for three months of elder interviews while our own equipment fund grows.",
        quantityWanted: 1, estimatedValue: 1800,
        loanStartDays: 10, loanEndDays: 100,
      },
      {
        key: "curriculum-session", kind: "knowledge", capitalType: "intellectual",
        name: "Bilingual curriculum design session",
        description: "Help our educators shape the Kichwa and Spanish learning materials into a course others can teach.",
        quantityWanted: 1, estimatedValue: 700,
      },
      {
        key: "crypto-pl", kind: "crypto", capitalType: "financial",
        name: "Crypto contribution (USDC on Base)", unit: "USD",
        description: "Crypto pledges toward the micro-hydro system and the archive. Fiat gifts route through our partners below.",
        quantityWanted: 15000, estimatedValue: 15000, groupClaimable: true,
      },
    ],
    contributions: [
      {
        needKey: "adobe-blocks", name: "Taller Tierra Viva", email: "tierra.viva@example.com",
        type: "resource", title: "600 adobe blocks",
        description: "Pressed to your dimensions, cured four weeks.",
        quantity: 600, estimatedValue: 900, status: "fulfilled", submittedDaysAgo: 24,
      },
      {
        needKey: "adobe-blocks", name: "Nina Quispe", email: "nina.quispe@example.com",
        type: "resource", title: "400 blocks from the family workshop",
        quantity: 400, estimatedValue: 600, status: "accepted", submittedDaysAgo: 8,
      },
      {
        needKey: "medicinal-starts", name: "Jardin de las Abuelas", email: "jardin.abuelas@example.com",
        type: "resource", title: "150 medicine plant starts",
        description: "From the grandmothers' garden, matched to the elders' list.",
        quantity: 150, estimatedValue: 750, status: "thanked", submittedDaysAgo: 26,
        acknowledgedNote: "The healers walked the new terraces naming every plant you sent. The garden already smells like medicine. Pagui, from the whole council.",
      },
      {
        needKey: "minga-build", name: "Escuela Andina cohort", email: "escuela.andina@example.com",
        type: "role", title: "Ten students for the minga",
        quantity: 10, estimatedValue: 1000, status: "accepted", submittedDaysAgo: 5,
      },
      {
        needKey: "doc-specialist", name: "Camilo Rendon", email: "camilo.rendon@example.com",
        type: "role", title: "Documentation work, 20 hours weekly",
        description: "Documentary filmmaker, fluent Spanish, learning Kichwa, references available.",
        quantity: 1, estimatedValue: 16800, status: "pending", submittedDaysAgo: 2,
      },
      {
        needKey: "camera-kit", name: "Andes Media Collective", email: "andes.media@example.com",
        type: "equipment", title: "Full camera kit for the interview season",
        quantity: 1, estimatedValue: 1800, status: "fulfilled", submittedDaysAgo: 16,
      },
      {
        needKey: "cabin-bedding", name: "Old pledge (released)", email: "bedding.gone@example.com",
        type: "resource", title: "Four bedding sets",
        quantity: 4, estimatedValue: 400, status: "expired", submittedDaysAgo: 29,
      },
      {
        needKey: "crypto-pl", name: "Anonymous", email: "quiet.friend@example.com",
        type: "financial", title: "2000 USDC for the micro-hydro",
        quantity: 2000, estimatedValue: 2000, status: "accepted", isAnonymous: true, submittedDaysAgo: 7,
      },
    ],
    updates: [
      {
        title: "The minga raised the first walls", daysAgo: 21,
        body: "Forty hands, one day, and the first classroom now stands shoulder height in adobe. The elders blessed the corners at sunrise and the youngest children pressed their palms into the final course of blocks. The blocks from Taller Tierra Viva laid true and straight. The second classroom minga is on the calendar, and there is a place in the line for you.",
      },
      {
        title: "Recording the elders", daysAgo: 10,
        body: "The camera kit arrived from the Andes Media Collective and the first three interviews are done. Mama Rosa spoke for two hours about the water ceremonies and the old terracing songs. Each recording goes into the community archive with her family's consent, in Kichwa first, Spanish second. This is the heart of the whole project and it has begun.",
      },
    ],
    partnerLinks: [
      {
        partner: "maearth", label: "Give through Ma Earth",
        url: "https://maearth.com/projects/pachamama-learning-village",
        cachedRaised: 31000, cachedContributorCount: 54, cachedPercent: 34,
      },
      {
        partner: "gosteward", label: "Lend through GoSteward",
        url: "https://www.gosteward.com/campaigns/pachamama-learning-village",
        cachedRaised: 14000, cachedContributorCount: 6, cachedPercent: 15,
      },
    ],
  },

  // ══ 4. Rewild Britain Sanctuary ═══════════════════════════════════════════
  {
    title: "Rewild Britain Sanctuary",
    description:
      "A 500-acre rewilding project restoring native forests and creating wildlife corridors in the Scottish Highlands.",
    location: "Scotland, Highlands",
    currency: "GBP",
    financialTarget: 750000,
    durationDays: 300,
    startedDaysAgo: 60,
    projectImageUrl: "https://assets.regencivics.earth/FuQmXVqMDIJIpIbl.jpg",
    daoLink: "https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution",
    story: {
      vision:
        "Restore the Scottish Highlands to their natural state, bringing back native forests, wildlife, and creating corridors for species to thrive.",
      landStatus: "Purchased through community buyout",
      landSize: "500 acres",
      currentPhase: "Native Tree Planting",
      timeline: "20 years for full forest establishment",
      legalStructure: "Community Land Trust",
      governanceModel: "Community board with expert advisors",
      membershipModel: "Supporter membership with voting rights",
      housingPlans: "Minimal footprint: ranger station, research cabin",
      foodSystems: "Wild foraging education, no agriculture",
      waterSystems: "Natural watershed restoration",
      energySystems: "Off-grid solar for minimal facilities",
      educationPrograms: "Rewilding courses, wildlife monitoring training, school visits",
      communityEngagement: "Volunteer tree planting days, wildlife watching tours",
      impactMetrics: "Tree survival rates, wildlife sightings, carbon sequestration",
      challenges: "Deer management, long timeline, climate uncertainty",
      teamSize: 6,
      teamDescription: "Ecologists, foresters, community organizers",
      regenerativePractices:
        "Native woodland restoration, peatland rewetting, natural regeneration zones, deer pressure management, wildlife corridor design",
    },
    needs: [
      {
        key: "tree-whips", kind: "item", capitalType: "living",
        name: "Native tree whips", unit: "whips",
        description: "Birch, rowan, oak, and Scots pine whips of local provenance for the glen planting zones.",
        quantityWanted: 5000, estimatedValue: 7500, groupClaimable: true, priorityPinned: true,
        needDeadlineDays: 90,
      },
      {
        key: "deer-fencing", kind: "item", capitalType: "material",
        name: "Deer fencing rolls", unit: "rolls",
        description: "High-tensile deer fencing to protect the young planting zones until the trees are away.",
        quantityWanted: 40, estimatedValue: 6000, groupClaimable: true,
      },
      {
        key: "camera-traps", kind: "item", capitalType: "material",
        name: "Camera traps", unit: "units",
        description: "Trail cameras for the wildlife monitoring grid across the corridor zones.",
        quantityWanted: 12, estimatedValue: 1800, groupClaimable: true,
      },
      {
        key: "wildlife-ecologist", kind: "role", capitalType: "intellectual",
        name: "Wildlife Ecologist",
        description: "Monitor wildlife populations and design habitat improvements. Camera trap monitoring, species surveys, habitat assessment.",
        quantityWanted: 1, estimatedValue: 58240, hoursPerWeek: 35, durationMonths: 12, priorityPinned: true,
      },
      {
        key: "nursery-manager", kind: "role", capitalType: "living",
        name: "Tree Nursery Manager",
        description: "Manage the native tree nursery and coordinate planting programs. Seed collection, nursery care, planting events.",
        quantityWanted: 1, estimatedValue: 26400, hoursPerWeek: 30, durationMonths: 10,
      },
      {
        key: "community-organizer-rb", kind: "role", capitalType: "social",
        name: "Community Organizer",
        description: "Keep the trust's supporter community alive: member days, school visits, and the village liaison work.",
        quantityWanted: 1, estimatedValue: 10400, hoursPerWeek: 10, durationMonths: 12,
      },
      {
        key: "storyteller-rb", kind: "role", capitalType: "cultural",
        name: "Storyteller",
        description: "Lead heritage walks and gather the glen's old stories from the last generation who herded here.",
        quantityWanted: 1, estimatedValue: 4160, hoursPerWeek: 4, durationMonths: 12,
      },
      {
        key: "guide-rb", kind: "role", capitalType: "spiritual",
        name: "Guide",
        description: "Hold quiet walks and sit spots for volunteers and visitors, letting the land do the teaching.",
        quantityWanted: 1, estimatedValue: 3120, hoursPerWeek: 3, durationMonths: 12,
      },
      {
        key: "fitness-leader-rb", kind: "role", capitalType: "health",
        name: "Community Fitness Leader",
        description: "Hill fitness sessions for planting volunteers, so a day on the slopes builds bodies instead of breaking them.",
        quantityWanted: 1, estimatedValue: 3120, hoursPerWeek: 3, durationMonths: 12,
      },
      {
        key: "planting-weekend-1", kind: "shift", capitalType: "experiential",
        name: "Glen planting weekend (November)", unit: "people",
        description: "Two days planting whips in the lower glen. Bothy accommodation, hot meals, and all tools provided.",
        quantityWanted: 25, estimatedValue: 3750, groupClaimable: true,
        shiftStartDays: 24, shiftHours: 14,
      },
      {
        key: "planting-weekend-2", kind: "shift", capitalType: "experiential",
        name: "Corridor planting weekend (December)", unit: "people",
        description: "Planting the burn-side corridor that links the two mature woods. The most important trees on the map.",
        quantityWanted: 25, estimatedValue: 3750, groupClaimable: true,
        shiftStartDays: 52, shiftHours: 14,
      },
      {
        key: "atv-loan", kind: "loan", capitalType: "material",
        name: "Quad bike and trailer (loan)",
        description: "Eight weeks of quad and trailer to move whips, stakes, and fencing up the glen tracks through planting season.",
        quantityWanted: 1, estimatedValue: 2400,
        loanStartDays: 20, loanEndDays: 76,
      },
      {
        key: "peatland-consult", kind: "knowledge", capitalType: "intellectual",
        name: "Peatland restoration consult",
        description: "Two site days with a peatland specialist to plan the rewetting of the upper bog before winter.",
        quantityWanted: 1, estimatedValue: 1000,
      },
      {
        key: "crypto-rb", kind: "crypto", capitalType: "financial",
        name: "Crypto contribution (USDC on Base)", unit: "GBP",
        description: "Crypto pledges toward fencing and the monitoring grid. Fiat gifts and loans route through our partners below.",
        quantityWanted: 30000, estimatedValue: 30000, groupClaimable: true,
      },
    ],
    contributions: [
      {
        needKey: "tree-whips", name: "Glen Affric Nurseries (fictional)", email: "glenaffric.nursery@example.com",
        type: "resource", title: "1500 birch and rowan whips",
        description: "Local provenance, cell grown, ready for the November window.",
        quantity: 1500, estimatedValue: 2250, status: "fulfilled", submittedDaysAgo: 35,
      },
      {
        needKey: "tree-whips", name: "Morag Kintail", email: "morag.kintail@example.com",
        type: "resource", title: "500 Scots pine whips",
        quantity: 500, estimatedValue: 750, status: "accepted", submittedDaysAgo: 12,
      },
      {
        needKey: "deer-fencing", name: "Highland Fencing Supplies (fictional)", email: "highland.fencing@example.com",
        type: "resource", title: "Ten rolls of deer fencing",
        quantity: 10, estimatedValue: 1500, status: "thanked", submittedDaysAgo: 40,
        acknowledgedNote: "Your fencing now guards the whole lower glen enclosure. We watched a herd of reds walk the line and move on. The trees inside will make it because of you.",
      },
      {
        needKey: "camera-traps", name: "Struan Wildlife Group", email: "struan.wildlife@example.com",
        type: "resource", title: "Four camera traps",
        quantity: 4, estimatedValue: 600, status: "fulfilled", submittedDaysAgo: 25,
      },
      {
        needKey: "nursery-manager", name: "Eilidh Rowanberry", email: "eilidh.rowan@example.com",
        type: "role", title: "Nursery management through the season",
        description: "Horticulture background, three seasons at a native tree nursery in Argyll.",
        quantity: 1, estimatedValue: 26400, status: "accepted", submittedDaysAgo: 15,
      },
      {
        needKey: "planting-weekend-1", name: "Inverness Hill Runners", email: "hillrunners@example.com",
        type: "role", title: "Eight runners for the November weekend",
        quantity: 8, estimatedValue: 1200, status: "accepted", submittedDaysAgo: 6,
      },
      {
        needKey: "guide-rb", name: "Callum Braeside", email: "callum.braeside@example.com",
        type: "role", title: "Quiet walks and sit spots offer",
        quantity: 1, estimatedValue: 3120, status: "pending", submittedDaysAgo: 3,
      },
      {
        needKey: "atv-loan", name: "Old offer (released)", email: "quad.gone@example.com",
        type: "equipment", title: "Quad bike loan",
        quantity: 1, estimatedValue: 2400, status: "expired", submittedDaysAgo: 55,
      },
      {
        needKey: "crypto-rb", name: "Anonymous", email: "highland.friend@example.com",
        type: "financial", title: "4000 USDC for the fencing fund",
        quantity: 4000, estimatedValue: 4000, status: "accepted", isAnonymous: true, submittedDaysAgo: 9,
      },
      {
        needKey: "crypto-rb", name: "Skye Meadowsweet", email: "skye.meadow@example.com",
        type: "financial", title: "1500 USDC for camera traps",
        quantity: 1500, estimatedValue: 1500, status: "fulfilled", submittedDaysAgo: 22,
      },
    ],
    updates: [
      {
        title: "The lower glen is fenced", daysAgo: 32,
        body: "The last strainer post went in on Thursday and the lower glen enclosure is complete. Fifteen hundred whips from the nursery are heeled in and waiting for the November planting weekend. Standing at the top gate you can see the whole shape of the future wood laid out in fence line. Twenty years from now this view will be canopy.",
      },
      {
        title: "The camera traps caught a pine marten", daysAgo: 15,
        body: "Three weeks after the Struan group's cameras went up, camera six on the burn-side corridor recorded a pine marten crossing at dusk. It is the first confirmed record on this ground in living memory. The corridor route we chose is already being used before a single tree of it is planted. The wildlife is telling us we drew the map right.",
      },
      {
        title: "November planting weekend is filling up", daysAgo: 4,
        body: "Eight of the twenty five places for the November weekend are already claimed by the Inverness Hill Runners, who say they will race each other up the slope with the whip bags. Bothy bunks, hot meals, and tools are all sorted. If you want a place, claim it on the needs list and bring warm socks.",
      },
    ],
    partnerLinks: [
      {
        partner: "maearth", label: "Give through Ma Earth",
        url: "https://maearth.com/projects/rewild-britain-sanctuary",
        cachedRaised: 96000, cachedContributorCount: 88, cachedPercent: 46,
      },
      {
        partner: "gosteward", label: "Lend through GoSteward",
        url: "https://www.gosteward.com/campaigns/rewild-britain-sanctuary",
        cachedRaised: 54000, cachedContributorCount: 17, cachedPercent: 26,
      },
    ],
  },
];

// ── Seeding logic ────────────────────────────────────────────────────────────

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set. Load .env first.");
    process.exit(1);
  }

  const conn = await mysql.createConnection(url);
  console.log("Connected to database.");

  // Demo campaigns need an owner. Prefer Rye, fall back to any admin, then any user.
  let ownerId: number | null = null;
  for (const query of [
    ["SELECT id FROM users WHERE email = ? LIMIT 1", ["rieki.cordon@gmail.com"]] as const,
    ["SELECT id FROM users WHERE role IN ('admin','superadmin') ORDER BY id LIMIT 1", []] as const,
    ["SELECT id FROM users ORDER BY id LIMIT 1", []] as const,
  ]) {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(query[0], query[1] as unknown as unknown[]);
    if (rows.length) { ownerId = rows[0].id as number; break; }
  }
  if (!ownerId) {
    console.error("No users exist yet. Sign in once, then re-run this seed.");
    await conn.end();
    process.exit(1);
  }
  console.log(`Demo campaign owner: userId=${ownerId}`);

  for (const demo of DEMO_CAMPAIGNS) {
    console.log(`\n── ${demo.title} ──`);

    // ── Upsert the campaign row (keyed by title + isDemo) ──────────────────
    const startedAt = daysAgo(demo.startedDaysAgo);
    const campaignFields = [
      demo.description, demo.title, demo.location, demo.currency,
      demo.financialTarget, demo.durationDays, startedAt, startedAt,
      demo.projectImageUrl, demo.videoUrl ?? null, demo.daoLink ?? null,
      demo.story.vision, demo.story.landStatus, demo.story.landSize,
      demo.story.currentPhase, demo.story.timeline, demo.story.legalStructure,
      demo.story.governanceModel, demo.story.membershipModel,
      demo.story.housingPlans, demo.story.foodSystems, demo.story.waterSystems,
      demo.story.energySystems, demo.story.educationPrograms,
      demo.story.communityEngagement, demo.story.impactMetrics,
      demo.story.challenges, demo.story.teamSize, demo.story.teamDescription,
      demo.story.regenerativePractices,
    ];

    const [existing] = await conn.execute<mysql.RowDataPacket[]>(
      "SELECT id FROM campaigns WHERE title = ? AND isDemo = 1 LIMIT 1",
      [demo.title],
    );

    let campaignId: number;
    if (existing.length) {
      campaignId = existing[0].id as number;
      await conn.execute(
        `UPDATE campaigns SET
           userId = ?, status = 'active', isDemo = 1,
           description = ?, projectName = ?, location = ?, currency = ?,
           financialTarget = ?, durationDays = ?, startedAt = ?, publishedAt = ?,
           projectImageUrl = ?, videoUrl = ?, daoLink = ?,
           vision = ?, landStatus = ?, landSize = ?, currentPhase = ?,
           timeline = ?, legalStructure = ?, governanceModel = ?,
           membershipModel = ?, housingPlans = ?, foodSystems = ?,
           waterSystems = ?, energySystems = ?, educationPrograms = ?,
           communityEngagement = ?, impactMetrics = ?, challenges = ?,
           teamSize = ?, teamDescription = ?, regenerativePractices = ?
         WHERE id = ?`,
        [ownerId, ...campaignFields, campaignId],
      );
      // Refresh children wholesale so re-runs stay deterministic.
      for (const table of ["campaign_items", "campaign_contributions", "campaign_updates", "campaign_partner_links"]) {
        await conn.execute(`DELETE FROM ${table} WHERE campaignId = ?`, [campaignId]);
      }
      console.log(`  refreshed campaign id=${campaignId}`);
    } else {
      const [result] = await conn.execute<mysql.ResultSetHeader>(
        `INSERT INTO campaigns
           (userId, status, isDemo, title,
            description, projectName, location, currency,
            financialTarget, durationDays, startedAt, publishedAt,
            projectImageUrl, videoUrl, daoLink,
            vision, landStatus, landSize, currentPhase, timeline,
            legalStructure, governanceModel, membershipModel, housingPlans,
            foodSystems, waterSystems, energySystems, educationPrograms,
            communityEngagement, impactMetrics, challenges, teamSize,
            teamDescription, regenerativePractices)
         VALUES (?, 'active', 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ownerId, demo.title, ...campaignFields],
      );
      campaignId = result.insertId;
      console.log(`  created campaign id=${campaignId}`);
    }

    // ── Insert needs ───────────────────────────────────────────────────────
    const needIdByKey = new Map<string, number>();
    for (const need of demo.needs) {
      const category = legacyCategory(need.kind);
      const isRoleLike = need.kind === "role" || need.kind === "shift" || need.kind === "knowledge";
      const [result] = await conn.execute<mysql.ResultSetHeader>(
        `INSERT INTO campaign_items
           (campaignId, category, kind, capitalType,
            quantityWanted, quantityClaimed, quantityDelivered,
            needDeadline, shiftStartsAt, shiftEndsAt, loanWindowStart, loanWindowEnd,
            groupClaimable, priorityPinned, estimatedValue,
            roleTitle, roleDescription, hoursPerWeek, durationMonths,
            equipmentName, equipmentQuantity,
            resourceName, resourceQuantity, resourceUnit, resourceDescription)
         VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          campaignId, category, need.kind, need.capitalType,
          need.quantityWanted,
          need.needDeadlineDays != null ? daysFromNow(need.needDeadlineDays) : null,
          need.shiftStartDays != null ? daysFromNow(need.shiftStartDays) : null,
          need.shiftStartDays != null && need.shiftHours != null
            ? new Date(daysFromNow(need.shiftStartDays).getTime() + need.shiftHours * 3600 * 1000)
            : null,
          need.loanStartDays != null ? daysFromNow(need.loanStartDays) : null,
          need.loanEndDays != null ? daysFromNow(need.loanEndDays) : null,
          need.groupClaimable ? 1 : 0,
          need.priorityPinned ? 1 : 0,
          need.estimatedValue,
          isRoleLike ? need.name : null,
          isRoleLike ? need.description : null,
          need.hoursPerWeek ?? null,
          need.durationMonths ?? null,
          need.kind === "loan" ? need.name : null,
          need.kind === "loan" ? need.quantityWanted : null,
          need.kind === "item" || need.kind === "crypto" ? need.name : null,
          need.kind === "item" || need.kind === "crypto" ? need.quantityWanted : null,
          need.unit ?? null,
          !isRoleLike ? need.description : null,
        ],
      );
      needIdByKey.set(need.key, result.insertId);
    }
    console.log(`  needs: ${demo.needs.length} across all nine capitals`);

    // ── Insert contributions ───────────────────────────────────────────────
    for (const c of demo.contributions) {
      const submittedAt = daysAgo(c.submittedDaysAgo);
      const reviewed = c.status !== "pending";
      const delivered = c.status === "fulfilled" || c.status === "thanked";
      await conn.execute(
        `INSERT INTO campaign_contributions
           (campaignId, campaignItemId, contributorName, contributorEmail,
            contributionType, title, description, quantityPledged,
            estimatedValue, status, isAnonymous, claimExpiresAt,
            submittedAt, reviewedAt, fulfilledAt, acknowledgedAt, acknowledgedNote)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          campaignId,
          c.needKey ? needIdByKey.get(c.needKey) ?? null : null,
          c.name, c.email, c.type, c.title, c.description ?? null,
          c.quantity, c.estimatedValue, c.status,
          c.isAnonymous ? 1 : 0,
          c.status === "accepted" ? daysFromNow(10) : c.status === "expired" ? daysAgo(5) : null,
          submittedAt,
          reviewed ? new Date(submittedAt.getTime() + 2 * DAY_MS) : null,
          delivered ? new Date(submittedAt.getTime() + 7 * DAY_MS) : null,
          c.status === "thanked" ? new Date(submittedAt.getTime() + 9 * DAY_MS) : null,
          c.acknowledgedNote ?? null,
        ],
      );
    }
    console.log(`  contributions: ${demo.contributions.length} (pending/accepted/fulfilled/thanked/expired mix)`);

    // ── Recompute need quantities from the contributions (decision 4) ──────
    // claimed = accepted + fulfilled + thanked. delivered = fulfilled + thanked.
    // expired claims release their quantity, pending reserves nothing.
    await conn.execute(
      `UPDATE campaign_items ci SET
         ci.quantityClaimed = (
           SELECT COALESCE(SUM(cc.quantityPledged), 0) FROM campaign_contributions cc
           WHERE cc.campaignItemId = ci.id AND cc.status IN ('accepted','fulfilled','thanked')
         ),
         ci.quantityDelivered = (
           SELECT COALESCE(SUM(cc.quantityPledged), 0) FROM campaign_contributions cc
           WHERE cc.campaignItemId = ci.id AND cc.status IN ('fulfilled','thanked')
         ),
         ci.pledgedValue = (
           SELECT COALESCE(SUM(cc.estimatedValue), 0) FROM campaign_contributions cc
           WHERE cc.campaignItemId = ci.id AND cc.status IN ('accepted','fulfilled','thanked')
         )
       WHERE ci.campaignId = ?`,
      [campaignId],
    );

    // ── Recompute the campaign's legacy aggregate columns ──────────────────
    await conn.execute(
      `UPDATE campaigns SET
         totalValue = (
           SELECT COALESCE(SUM(estimatedValue), 0) FROM campaign_items WHERE campaignId = campaigns.id
         ),
         equipmentValue = (
           SELECT COALESCE(SUM(estimatedValue), 0) FROM campaign_items
           WHERE campaignId = campaigns.id AND category = 'equipment'
         ),
         rolesValue = (
           SELECT COALESCE(SUM(estimatedValue), 0) FROM campaign_items
           WHERE campaignId = campaigns.id AND category = 'role'
         ),
         resourcesValue = (
           SELECT COALESCE(SUM(estimatedValue), 0) FROM campaign_items
           WHERE campaignId = campaigns.id AND category = 'resource'
         ),
         pledgedTotal = (
           SELECT COALESCE(SUM(estimatedValue), 0) FROM campaign_contributions
           WHERE campaignId = campaigns.id AND status IN ('accepted','fulfilled','thanked')
         ),
         pledgedEquipment = (
           SELECT COALESCE(SUM(estimatedValue), 0) FROM campaign_contributions
           WHERE campaignId = campaigns.id AND status IN ('accepted','fulfilled','thanked')
             AND contributionType = 'equipment'
         ),
         pledgedRoles = (
           SELECT COALESCE(SUM(estimatedValue), 0) FROM campaign_contributions
           WHERE campaignId = campaigns.id AND status IN ('accepted','fulfilled','thanked')
             AND contributionType IN ('role','knowledge')
         ),
         pledgedResources = (
           SELECT COALESCE(SUM(estimatedValue), 0) FROM campaign_contributions
           WHERE campaignId = campaigns.id AND status IN ('accepted','fulfilled','thanked')
             AND contributionType = 'resource'
         ),
         pledgedFinancial = (
           SELECT COALESCE(SUM(estimatedValue), 0) FROM campaign_contributions
           WHERE campaignId = campaigns.id AND status IN ('accepted','fulfilled','thanked')
             AND contributionType = 'financial'
         )
       WHERE id = ?`,
      [campaignId],
    );

    // ── Updates journal ────────────────────────────────────────────────────
    let updateNumber = 0;
    for (const u of [...demo.updates].sort((a, b) => b.daysAgo - a.daysAgo)) {
      updateNumber += 1;
      await conn.execute(
        `INSERT INTO campaign_updates
           (campaignId, authorId, updateNumber, title, body, publishedAt, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [campaignId, ownerId, updateNumber, u.title, u.body, daysAgo(u.daysAgo), daysAgo(u.daysAgo)],
      );
    }
    console.log(`  updates: ${demo.updates.length}`);

    // ── Partner links ──────────────────────────────────────────────────────
    for (const p of demo.partnerLinks) {
      await conn.execute(
        `INSERT INTO campaign_partner_links
           (campaignId, partner, label, url, cachedRaised, cachedContributorCount, cachedPercent, lastFetchedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [campaignId, p.partner, p.label, p.url, p.cachedRaised, p.cachedContributorCount, p.cachedPercent],
      );
    }
    console.log(`  partner links: ${demo.partnerLinks.map((p) => p.partner).join(", ")}`);
  }

  await conn.end();
  console.log("\nDemo campaign seed complete. All rows carry isDemo=1 and render with the Example badge.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
