/**
 * Seed the reference Plays for the Vision Play launch (2026-08), plus the
 * discussion thread for the "What Steers Civilization" article.
 *
 * Idempotent: plays are matched by slug and skipped if present; the forum
 * thread is matched by title. The Gift Lineage entry seeds as 'pending' on
 * purpose: it publishes only after our indigenous elders review the framing.
 *
 * Usage: npx tsx scripts/seed-vision-plays.ts [--dry-run]
 */
import mysql from "mysql2/promise";

const DRY_RUN = process.argv.includes("--dry-run");

type SeedPlay = {
  name: string;
  slug: string;
  kind: "vision" | "culture";
  status: "approved" | "pending";
  creatorProjectName: string;
  communityType: string;
  scale: "small" | "medium" | "large";
  pricingModel: "free" | "open_source";
  summary: string;
  needsFramework?: string;
  receipts?: string;
  robustness?: {
    redundancy: number;
    diversity: number;
    biophilia: number;
    rootedness: number;
    slack: number;
    circularity: number;
    note?: string;
  };
  sections: Partial<Record<
    | "sectionIdentity"
    | "sectionGovernance"
    | "sectionEconomics"
    | "sectionLandEcology"
    | "sectionSeasons"
    | "sectionScaling",
    string
  >>;
};

const PLAYS: SeedPlay[] = [
  {
    name: "The ReGen Civics Play",
    slug: "the-regen-civics-play",
    kind: "culture",
    status: "approved",
    creatorProjectName: "ReGen Civics",
    communityType: "Network",
    scale: "large",
    pricingModel: "open_source",
    summary:
      "The play we run. A fund and a game: quests and gratitude make contribution legible, Crowdpooling gathers the resources projects need across nine forms of capital, seasons carry the curriculum, and a bridge lets old-game capital fund new-game land. Shared as the library's reference implementation, scored the way we ask everyone to score: honestly.",
    needsFramework:
      "Needs surface through play. Players and land projects name what they need through quests, the forum, and the Crowdpooling needs registry, which spans nine forms of capital: financial, material, living, intellectual, experiential, social, cultural, spiritual, and relational. Measurement happens where the needs are met: campaign fulfillment rates, gratitude flows between players, quest completions, and season retrospectives. More-than-human needs enter through the land projects themselves; every project in the incubator carries regeneration commitments for its soil, water, and habitat.",
    receipts:
      "Running live at regencivics.earth since 2025. Two incubator seasons, a working four-token ledger, live Crowdpooling campaigns, a governance assembly that ratifies changes to the game, and the ReGen Ship sailing Cascadia as a floating program of the Church of the Regenerative Earth.",
    robustness: {
      redundancy: 3,
      diversity: 4,
      biophilia: 4,
      rootedness: 3,
      slack: 2,
      circularity: 3,
      note:
        "Slack is our weakest mark. A young movement runs lean and we feel it. The design answer is more players holding more of the game, which is partly what this library is for.",
    },
    sections: {
      sectionIdentity:
        "ReGen Civics grew out of sixteen years inside the regenerative movement, including the SEEDS economic experiments. The founding question never changed: land projects doing the most important work on Earth keep failing for lack of coordination, capital, and shared systems. The play is a civic game that networks them, and a fund that finances them, run as one organism with two faces.",
      sectionEconomics:
        "Two sides, one bridge. The Game runs on $ReGen (earned through quests, gratitude, and contribution) and RGVoice (governance weight earned by showing up). The Fund runs on $RCivics and RCVoice, speaking the old game's language so institutional capital can cross. Balances live on a private ledger first, with a one-way claim bridge to public tokens. Gratitude cycles on a lunar rhythm. Crowdpooling campaigns pool what money alone can't: land, labor, expertise, relationships.",
      sectionGovernance:
        "RGVoice holders steer the Game. Proposals move through an evolution engine into an assembly, and ratified changes execute against the platform itself, so the rules of the game are governed inside the game. The Fund keeps a conventional structure on purpose: legibility is its job.",
      sectionLandEcology:
        "The play exists for the land. Incubator projects steward real acreage, plant food forests, and carry regeneration commitments as membership terms. The ReGen Ship program plants seeds along every voyage, and harvests of every kind flow back through the network.",
      sectionSeasons:
        "The game runs in seasons. Each season carries a 13-episode curriculum across governance, economics, legal structure, and land, with seasonal roles organized in circles. Seasons close with a harvest: what worked enters the pattern library, what broke gets redesigned.",
      sectionScaling:
        "Bioregional. The play replicates by networking land projects within a bioregion, then federating bioregions. Each project runs its own game locally; the network layer moves resources, patterns, and people between them.",
    },
  },
  {
    name: "The Mondragón Play",
    slug: "the-mondragon-play",
    kind: "culture",
    status: "approved",
    creatorProjectName: "Reference entry (Mondragón Corporation)",
    communityType: "Cooperative",
    scale: "large",
    pricingModel: "free",
    summary:
      "Worker-owned cooperative federation in the Basque Country, running since 1956. One worker, one vote. Pay solidarity between the lowest and highest earners. A shared bank, university, and social security system. And the practice that defines it: when a member cooperative fails, the federation reabsorbs its workers instead of letting them fall.",
    needsFramework:
      "Subsistence and protection sit at the center: the play exists so that work is secure and dignity survives downturns. Participation is met structurally (every worker votes), understanding through Mondragón University and constant training, identity through deep Basque rootedness. Measured in employment held through crises, wage solidarity ratios, and cooperative survival rates across decades.",
    receipts:
      "Nearly seventy years. On the order of seventy thousand worker-owners across dozens of cooperatives. It survived the end of Franco, globalization, and the 2008 crash. When Fagor Electrodomésticos failed in 2013, most of its workers were relocated into sister cooperatives within the federation.",
    robustness: {
      redundancy: 5,
      diversity: 3,
      biophilia: 2,
      rootedness: 5,
      slack: 4,
      circularity: 4,
      note:
        "The strongest modern receipts for redundancy and rootedness in this library. Ecological design is its thin edge; a community adopting Mondragón's bones would want to graft on a living-world link.",
    },
    sections: {
      sectionIdentity:
        "Founded in the Basque town of Mondragón in 1956 by the priest José María Arizmendiarrieta and five of his students, beginning with a small stove factory. The context mattered: a wounded post-war region rebuilding itself with its own hands.",
      sectionEconomics:
        "Capital is subordinate to labor. Workers buy membership, surpluses are shared and pooled, and pay bands hold solidarity ratios between lowest and highest earners. Intercooperation funds and the Laboral Kutxa credit union act as the federation's shared bloodstream, moving resources from strong cooperatives to struggling ones.",
      sectionGovernance:
        "Each cooperative is sovereign: a general assembly of one member, one vote elects its governing council, with social councils carrying worker voice into management. The federation level coordinates without owning.",
      sectionLandEcology:
        "Thin by design and era: this is industrial cooperativism. The play proves the social architecture; its ecological sections are largely unwritten.",
      sectionScaling:
        "A federation of autonomous cooperatives, each small enough to govern itself, networked into something large enough to matter. Growth happens by seeding new cooperatives, and the shared institutions (bank, university, social security) are what let small units act at scale.",
    },
  },
  {
    name: "The Kibbutz Play",
    slug: "the-kibbutz-play",
    kind: "culture",
    status: "approved",
    creatorProjectName: "Reference entry",
    communityType: "Intentional Community",
    scale: "medium",
    pricingModel: "free",
    summary:
      "Village-scale communal economies begun at Degania in 1910: collective ownership, shared dining, rotating work branches, and needs met from a common budget. Around 270 communities have run this play, and its century of versions holds some of the best data anywhere on what communal economies do well and where they strain.",
    needsFramework:
      "Subsistence, protection, and belonging are collectivized: the community feeds, houses, and holds its members from a common budget. Participation runs through the general assembly. The play's own history surfaced its hard tradeoff: identity and freedom strained under strong homogeneity, and the modern versions loosened the play to answer that. Measured in member retention, and in the votes communities cast on their own rules.",
    receipts:
      "A century and counting, across roughly 270 communities. The 1980s debt crisis forced the play's largest patch: most kibbutzim voted themselves into renewed models with differential salaries and strong mutual guarantees, keeping the commons that mattered most.",
    robustness: {
      redundancy: 3,
      diversity: 2,
      biophilia: 3,
      rootedness: 4,
      slack: 3,
      circularity: 3,
      note:
        "The century of receipts cuts both ways: proof the play works, and proof of where it strains. Homogeneity kept it coherent and cost it adaptability until the renewed versions loosened it.",
    },
    sections: {
      sectionIdentity:
        "Begun at Degania on the shore of the Sea of Galilee in 1910 by a small group determined to live communal agriculture. The form spread to hundreds of villages and became one of the most studied communal economies in history.",
      sectionEconomics:
        "The classic version: members work in branches (fields, kitchen, industry), income flows to a common budget, and the community meets needs directly with housing, food, education, and care. The renewed version keeps mutual guarantees and shared assets while allowing differential salaries.",
      sectionGovernance:
        "The general assembly of members decides the large questions; elected committees run daily domains. The renewal era showed the assembly could change the play's own core rules and survive.",
      sectionLandEcology:
        "Agriculture sits at the founding heart of the play, from orchards to fishponds, though much of it industrialized along with the century. Modern communities vary widely in ecological practice.",
      sectionScaling:
        "Replication by pattern: each community is its own instance of the play, federated through movements that share knowledge, finance, and political voice. The play scales by copying, and each copy adapts.",
    },
  },
  {
    name: "The Doughnut City Play",
    slug: "the-doughnut-city-play",
    kind: "vision",
    status: "approved",
    creatorProjectName: "Reference entry (after Kate Raworth and DEAL)",
    communityType: "Urban Community",
    scale: "large",
    pricingModel: "free",
    summary:
      "Run a city's economy inside the doughnut: a social foundation no resident falls below, an ecological ceiling the city stops breaking through. The needs list is explicit, measured, and public, which makes this the clearest needs-first play in the library and the best model for what declaring your needs actually looks like.",
    needsFramework:
      "The most explicit needs framework in the library. The social foundation names twelve dimensions no resident should fall below: food, water, health, education, income and work, peace and justice, political voice, social equity, gender equality, housing, networks, and energy. The ecological ceiling names nine planetary boundaries the city must stop overshooting, standing in for the more-than-human world. A city portrait measures both sides in public, so the whole city can see where it falls short and where it overshoots.",
    receipts:
      "Amsterdam adopted a city portrait in 2020, with Brussels, Melbourne, and a growing network of doughnut coalitions following. The framework is open through the Doughnut Economics Action Lab. What remains untested is depth: no city has yet rebuilt its budget and zoning fully around the portrait.",
    robustness: {
      redundancy: 3,
      diversity: 4,
      biophilia: 4,
      rootedness: 4,
      slack: 3,
      circularity: 4,
      note:
        "Measurement is the superpower here: the play can see its own failures. Its fragility is political, since the portrait only steers as hard as the city government holding it.",
    },
    sections: {
      sectionIdentity:
        "Drawn from Kate Raworth's Doughnut Economics and carried into practice by the Doughnut Economics Action Lab and city coalitions. Designed for cities and towns ready to say out loud what their residents need and what their watershed can bear.",
      sectionEconomics:
        "The portrait steers the levers a city already holds: procurement, zoning, budgets, housing policy, business licensing. Shortfalls in the foundation pull investment; overshoots of the ceiling pull regulation and redesign. The coordination design is the feedback loop between the public portrait and every department that spends.",
      sectionGovernance:
        "City government holds the formal wheel; civic coalitions hold the portrait and keep it honest. The play steers by making the gap between the two visible and public.",
      sectionLandEcology:
        "The ecological ceiling is structural: nine planetary boundaries scaled to the city. The more-than-human world sits inside the accounting instead of outside it.",
      sectionScaling:
        "Any city can self-portrait, and the method is open. The play scales by copying between cities and by deepening within one, from portrait to procurement to budget.",
    },
  },
  {
    name: "The Rooted Commons Play",
    slug: "the-rooted-commons-play",
    kind: "vision",
    status: "approved",
    creatorProjectName: "Composed reference entry",
    communityType: "Land Trust",
    scale: "medium",
    pricingModel: "open_source",
    summary:
      "A stack of three proven parts: a community land trust takes land off the speculative market forever, a mutual credit currency keeps exchange alive when dollars are scarce, and a worker cooperative anchors livelihoods. Each part has decades of receipts on its own. Running them as one play is the experiment, and that honesty is the point of listing it.",
    needsFramework:
      "Protection first: permanently affordable housing through the trust, so no member's home rides the speculative market. Subsistence through cooperative livelihoods and local exchange that keeps working when national money tightens. Participation through the trust's tripartite governance. Measured in housing cost burden, local trade volume through the credit network, and cooperative payroll held through downturns.",
    receipts:
      "Each part alone: community land trusts since 1969 (New Communities in Georgia) with hundreds operating today, including Burlington's Champlain Housing Trust at the largest scale. Mutual credit at business scale in Sardinia's Sardex network. Worker cooperatives everywhere Mondragón's story reaches. The full stack together is the untested move.",
    robustness: {
      redundancy: 4,
      diversity: 3,
      biophilia: 3,
      rootedness: 5,
      slack: 3,
      circularity: 4,
      note:
        "Three separate failure domains that back each other up: if dollars dry up, credit clears trade; if jobs thin, the trust keeps homes; if one leg fails, the others hold people while it's rebuilt.",
    },
    sections: {
      sectionIdentity:
        "A composed play: three lineages braided on purpose, designed for a town, neighborhood, or county ready to root its economy in place. Nobody owns it; adopt it, adapt it, report back.",
      sectionEconomics:
        "The trust holds land and leases it at use-value, removing ground rent from every other flow. The mutual credit network lets member businesses and households clear trade with each other interest-free, denominated in the national unit but created by the trades themselves. The anchor cooperative employs where the community most needs work done, and its surplus recycles into the stack.",
      sectionGovernance:
        "Three wheels, deliberately separate: the trust's tripartite board (residents, wider community, public interest), the credit network's stewards, and the cooperative's worker assembly. Coupled by overlapping membership rather than a single council, so no one capture point steers everything.",
      sectionLandEcology:
        "Trust land can hold more than homes: farms, forest commons, and watershed land under permanent stewardship terms, with ecological covenants written into the ground leases themselves.",
      sectionScaling:
        "County by county. Each instance is sovereign; instances share documents, lease templates, and credit-network bridges. The play spreads the way land trusts already spread, by neighbors copying neighbors.",
    },
  },
  {
    name: "The Gift Lineage",
    slug: "the-gift-lineage",
    kind: "culture",
    status: "pending",
    creatorProjectName: "Held with our indigenous elders (in review)",
    communityType: "Bioregional Hub",
    scale: "medium",
    pricingModel: "free",
    summary:
      "Humanity's oldest play. Status flows to those who give the most, needs are met through webs of generosity and obligation, and wealth that pools too long is redistributed in ceremony. This entry gathers what the gift lineages teach, and it publishes only when our elders say it carries their worlds rightly.",
    receipts:
      "Millennia. Longer than any other entry in this library, on every inhabited continent. The potlatch of the Pacific Northwest carried its lineage straight through generations of colonial prohibition, which is its own robustness receipt.",
    sections: {
      sectionIdentity:
        "This entry honors gift economies as lineages we learn from, held in relationship with the elders of the Church of the Regenerative Earth, whose words we value deeply. It is deliberately unfinished until they have shaped it. The potlatch of the Pacific Northwest peoples stands here as one expression among many, named with respect and without claim.",
      sectionEconomics:
        "In a gift economy, provisioning and standing run through the same channel: giving. Surplus moves toward need because moving it is what wealth is for, and hoarding is what poverty looks like. Redistribution is ceremonial, public, and honored.",
    },
  },
];

const ARTICLE_THREAD = {
  title: "What Steers Civilization: designing the plays that come next",
  content:
    "Markets steer civilization with one instruction, and the best players at that game can feel it failing. Our new article walks through it and closes with the Design a Play quest.\n\nRead it at /blog/what-steers-civilization, study the library at /plays, and bring your play to /plays/submit. This thread is the commons for the conversation: half-formed designs, questions, and robustness arguments all welcome.",
};

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const conn = await mysql.createConnection(url);

  let inserted = 0;
  let skipped = 0;

  for (const play of PLAYS) {
    const [rows] = await conn.execute("SELECT id FROM plays WHERE slug = ? LIMIT 1", [play.slug]);
    if ((rows as any[]).length > 0) {
      console.log(`skip (exists): ${play.slug}`);
      skipped++;
      continue;
    }
    if (DRY_RUN) {
      console.log(`[dry-run] would insert: ${play.slug} (${play.kind}, ${play.status})`);
      inserted++;
      continue;
    }
    await conn.execute(
      `INSERT INTO plays
        (name, slug, kind, status, creatorProjectName, communityType, scale, pricingModel, summary,
         needsFramework, receipts, robustness,
         sectionIdentity, sectionGovernance, sectionEconomics, sectionLandEcology, sectionSeasons, sectionScaling)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        play.name,
        play.slug,
        play.kind,
        play.status,
        play.creatorProjectName,
        play.communityType,
        play.scale,
        play.pricingModel,
        play.summary,
        play.needsFramework ?? null,
        play.receipts ?? null,
        play.robustness ? JSON.stringify(play.robustness) : null,
        play.sections.sectionIdentity ?? null,
        play.sections.sectionGovernance ?? null,
        play.sections.sectionEconomics ?? null,
        play.sections.sectionLandEcology ?? null,
        play.sections.sectionSeasons ?? null,
        play.sections.sectionScaling ?? null,
      ],
    );
    console.log(`inserted: ${play.slug} (${play.kind}, ${play.status})`);
    inserted++;
  }

  // Article discussion thread in the 'plays' forum category.
  const [existingThread] = await conn.execute(
    "SELECT id FROM forumPosts WHERE title = ? LIMIT 1",
    [ARTICLE_THREAD.title],
  );
  if ((existingThread as any[]).length > 0) {
    console.log(`skip thread (exists): forumPosts id ${(existingThread as any[])[0].id}`);
  } else {
    const [cats] = await conn.execute("SELECT id FROM forumCategories WHERE slug = 'plays' LIMIT 1");
    const cat = (cats as any[])[0];
    const [admins] = await conn.execute(
      "SELECT id FROM users WHERE role IN ('superadmin','admin') ORDER BY id LIMIT 1",
    );
    const admin = (admins as any[])[0];
    if (!cat || !admin) {
      console.warn("skip thread: missing 'plays' forum category or admin user");
    } else if (DRY_RUN) {
      console.log(`[dry-run] would insert article thread in category ${cat.id} as user ${admin.id}`);
    } else {
      const [result] = await conn.execute(
        "INSERT INTO forumPosts (categoryId, authorId, title, content, isPinned, isLocked) VALUES (?, ?, ?, ?, 0, 0)",
        [cat.id, admin.id, ARTICLE_THREAD.title, ARTICLE_THREAD.content],
      );
      console.log(`inserted article thread: forumPosts id ${(result as any).insertId}`);
    }
  }

  console.log(`done. plays inserted: ${inserted}, skipped: ${skipped}${DRY_RUN ? " (dry run)" : ""}`);
  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
