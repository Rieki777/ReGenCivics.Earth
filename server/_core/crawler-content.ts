/**
 * Crawler-visible content injection.
 *
 * AI crawlers (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot) fetch HTML
 * and do not execute JavaScript, so the SPA shell shows them an empty body.
 * This module supplies real HTML content for the initial response on the
 * routes that matter most, using the same technique as the blog prerender
 * (scripts/prerender-blog.mjs): content lives in a <noscript> block plus an
 * off-screen aria-hidden div injected before <div id="root">. Humans get the
 * React app; crawlers get the prose. Same HTML for everyone, so no cloaking.
 *
 * Two content sources:
 *   1. PAGE_CONTENT: hand-written prose for stable marketing/info routes.
 *      Keep in sync with the live page copy when pages change substantially.
 *   2. Forum posts: rendered from the DB at request time with a small TTL
 *      cache, including DiscussionForumPosting JSON-LD.
 */
import * as db from "../db";
import { getNetworkFeed } from "../lib/network-feed";

const SITE = "https://regencivics.earth";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Plain text / light markdown to paragraphs. Forum content is user text;
// escape everything, then restore simple paragraph structure.
function textToHtml(text: string): string {
  return escapeHtml(text)
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

export type CrawlerContent = {
  title?: string;
  description?: string;
  bodyHtml: string;
  jsonld?: object;
};

// Wrap content the same way the blog prerender does: visible to no-JS
// crawlers via <noscript>, present in the DOM for HTML-fetching bots via
// the off-screen div, invisible to humans once React mounts.
export function wrapForInjection(innerHtml: string): string {
  return `
    <noscript>${innerHtml}</noscript>
    <div id="__crawler_content__" style="position:absolute;left:-99999px;top:auto;width:1px;height:1px;overflow:hidden;" aria-hidden="true">${innerHtml}</div>
  `;
}

// ── Static page prose ────────────────────────────────────────────────────────
// Answer-first: the opening sentences answer "what is this page" directly.
// Written to match the live site copy and llms-full.txt. Plain language.
const PAGE_CONTENT: Record<string, { html: string; jsonld?: object }> = {
  "/": {
    html: `
      <article>
        <h1>ReGen Civics: a fund and a game for the Regenerative Renaissance</h1>
        <p>ReGen Civics is a venture fund and an in-real-life game that supports regenerative land projects: ecovillages, regenerative farms, intentional communities, and restoration projects healing their land and bioregions. We connect impact investors with land projects, run a 13-week incubator, and operate a quest-based game where anyone can contribute to real-world regeneration and earn tokens for verified work.</p>
        <p>Founded in 2023, ReGen Civics grew out of the SEEDS regenerative economy movement. The thesis is simple: healthier lands lead to healthier people and increasing real-world value.</p>
        <h2>Four ways in</h2>
        <ul>
          <li><a href="/investor">Investors</a> put capital to work through the fund or through crowd pooling into specific projects.</li>
          <li><a href="/apply">Land projects</a> apply to the incubator for governance tools, economic design, and pathways to funding.</li>
          <li><a href="/ally">Alliance partners</a> join the network of organizations co-creating the Regenerative Renaissance.</li>
          <li><a href="/quest">Players</a> complete quests that move healing into the world and earn $ReGen tokens.</li>
        </ul>
        <p>As of mid-2026 the network includes 42 land projects, 15 alliance partner organizations, 8 bioregional hubs, and over 800 active players who have completed more than 3,700 quests. Explore <a href="/fund">the fund</a>, <a href="/game">the game</a>, <a href="/community">the community forum</a>, and <a href="/glossary">the glossary</a>.</p>
      </article>
    `,
  },
  "/fund": {
    html: `
      <article>
        <h1>The ReGen Civics Fund: invest in regenerative land</h1>
        <p>The ReGen Civics Fund pools capital to invest in regenerative land projects: ecovillages, regenerative farms, agroforestry operations, and community land ventures that restore ecosystems while building durable local economies. Investors get a diversified portfolio of land-backed projects, screened through our HEIST framework (Holistic Ecosystemic Impact and Sustainability Toolkit) and supported by our incubator so their odds of success rise after investment.</p>
        <h2>How it works</h2>
        <p>Projects enter through the incubator, where they build governance structures, design their economics, and prepare for investment. The fund invests in projects that graduate with strong fundamentals. Community members can also invest directly in specific projects through crowd pooling: community-centered economic cooperatives (CCECs) that democratize access to land-based investment.</p>
        <h2>Questions investors ask</h2>
        <p><strong>What returns can I expect?</strong> Target returns of 8 to 12% annually, blended financial plus impact returns, varying by project maturity.</p>
        <p><strong>How is risk managed?</strong> Diversification across projects, bioregions, and risk profiles, plus due diligence, insurance where possible, and reserve funds.</p>
        <p><strong>Do projects keep ownership?</strong> Yes. We facilitate funding and support; projects remain independently owned and operated.</p>
        <p>Start with the <a href="/opportunity">investment opportunity overview</a>, the <a href="/investor">investor journey</a>, or submit a <a href="/loi">letter of intent</a>. Full <a href="/risk-disclosure">risk disclosure here</a>.</p>
      </article>
    `,
  },
  "/game": {
    html: `
      <article>
        <h1>The Infinite Game: play for the Regenerative Renaissance</h1>
        <p>The ReGen Civics game is a real-world game where completing quests produces measurable regenerative impact: growing food, restoring soil, building community, sharing knowledge, healing land and people. Players earn $ReGen tokens for verified contributions, and those contributions compound into reputation, governance voice, and real economic participation.</p>
        <p>Unlike finite games played to win, infinite games are played to continue playing. We design systems for lasting positive impact that compounds across generations.</p>
        <h2>How to play</h2>
        <ul>
          <li>Browse the <a href="/quest">quest board</a> and accept quests that match your interests and skills.</li>
          <li>Complete the actions and submit proof: photos, stories, data.</li>
          <li>Receive peer review and gratitude from the community.</li>
          <li>Earn tokens when your work is verified.</li>
        </ul>
        <p>Gratitude is tracked as a form of social proof: when someone thanks a contributor, that raises their reputation and future earnings. See <a href="/tokenomics">tokenomics</a>, <a href="/game-mechanics">game mechanics</a>, and <a href="/bounties">the bounties marketplace</a>.</p>
      </article>
    `,
  },
  "/opportunity": {
    html: `
      <article>
        <h1>The investment opportunity</h1>
        <p>Regenerative land projects produce real assets: healthy soil, food systems, housing, tourism, timber, carbon, and thriving communities. ReGen Civics packages that value for investors through a fund (diversified portfolio) and crowd pooling (direct investment in specific projects). Both are anchored in land, screened through the HEIST framework, and supported by an incubator that raises project success rates after investment.</p>
        <p>The regenerative transition is one of the largest reallocation opportunities of this generation: capital moving from extractive systems into systems that rebuild the living world while returning blended financial and impact value. Read the <a href="/fund">fund overview</a>, meet <a href="/land">the land projects</a>, or begin the <a href="/investor">investor journey</a>.</p>
      </article>
    `,
  },
  "/governance": {
    html: `
      <article>
        <h1>Governance: voice rooted in land and contribution</h1>
        <p>ReGen Civics uses voice-based governance: decision power flows from verified contribution, not from capital alone. Two governance tokens exist. RGVoice governs the ReGen Game (quests, community, game economics). Fund Voice governs fund investment decisions. Both operate through the Hypha DAO framework on the Base network, so decisions are recorded transparently on chain.</p>
        <p>Members raise proposals, the community deliberates in the <a href="/community">forum</a>, and ratified decisions execute through our machine governance pipeline. Anyone can review <a href="/proposals">community proposals</a> or the live <a href="/assembly">assembly</a>. The result is governance that stays accountable to the people doing the regenerative work and to the land itself.</p>
      </article>
    `,
  },
  "/tokenomics": {
    html: `
      <article>
        <h1>Tokenomics: four tokens, two games</h1>
        <p>ReGen Civics runs on four tokens across two connected systems: the Fund (anchored in existing finance) and the Game (anchored in regenerative contribution).</p>
        <ul>
          <li><strong>$ReGen</strong> (utility): tracks contributions in the ReGen Game. Earned through quests, bounties, and verified regenerative work.</li>
          <li><strong>RGVoice</strong> (governance): decision-making voice in the ReGen Game.</li>
          <li><strong>$RCivics</strong> (utility): tracks contributions to the Alliance and Fund.</li>
          <li><strong>Fund Voice / RCVoice</strong> (governance): voice in fund investment decisions.</li>
        </ul>
        <p>Tokens operate on the Base network (Coinbase's L2) via the Hypha DAO framework, keeping fees minimal. Contributions are recorded in an append-only ledger, and private balances bridge one way to public on-chain tokens through a claim process. See the <a href="/game">game</a>, <a href="/governance">governance</a>, and <a href="/bionomics">bionomics</a> for how value flows through the system.</p>
      </article>
    `,
  },
  "/bionomics": {
    html: `
      <article>
        <h1>Bionomics: an economy modelled on living systems</h1>
        <p>Bionomics is our name for an economic system that works the way ecosystems work: value flows in cycles, waste becomes food, diversity creates resilience, and health compounds. In practice this means contribution scores, gratitude tokens, seasonal harvests, and bioregional value flows that reward work which heals land and community rather than extracts from them.</p>
        <p>We measure success across nine forms of capital: financial, social, intellectual, material, living, cultural, spiritual, experiential, and influence. Money is one form of wealth among many, and our accounting reflects that. See <a href="/tokenomics">tokenomics</a> for the token mechanics and <a href="/glossary">the glossary</a> for the full vocabulary.</p>
      </article>
    `,
  },
  "/glossary": {
    html: `
      <article>
        <h1>Glossary: the vocabulary of the Regenerative Renaissance</h1>
        <p><strong>Regenerative Renaissance:</strong> a cultural and economic shift where human systems work with natural systems. Where sustainability maintains the status quo, regeneration actively rebuilds and restores degraded ecosystems, communities, and economies.</p>
        <p><strong>Infinite Game:</strong> a game played to continue playing rather than to win. ReGen Civics designs its fund, game, and governance for impact that compounds across generations.</p>
        <p><strong>Ecovillage:</strong> an intentional community designed around ecological regeneration, shared governance, and local economy, typically on rural land with food production and shared infrastructure.</p>
        <p><strong>Intentional community:</strong> a group of people who choose to live together or share resources around common values, spanning ecovillages, cohousing, land cooperatives, and community land trusts.</p>
        <p><strong>Bioregion:</strong> a geographic area defined by natural boundaries such as watersheds and ecosystems rather than political lines. Bioregionalism organizes economy and governance at this scale.</p>
        <p><strong>Regenerative finance (ReFi):</strong> financial systems designed to fund the restoration of ecosystems and communities, aligning returns with ecological and social health.</p>
        <p><strong>HEIST framework:</strong> Holistic Ecosystemic Impact and Sustainability Toolkit, our method for evaluating land projects across whole systems, interconnections, measurable outcomes, and long-term viability.</p>
        <p><strong>Nine forms of capital:</strong> financial, social, intellectual, material, living, cultural, spiritual, experiential, and influence. A full accounting of the wealth a community holds and creates.</p>
        <p><strong>Crowd pooling (CCEC):</strong> community-centered economic cooperatives that let groups pool capital and collectively invest in regenerative projects they believe in.</p>
        <p><strong>Quest:</strong> a structured action producing measurable regenerative impact, completed by players, verified by peers, and rewarded in $ReGen tokens.</p>
        <p><strong>Gratitude economy:</strong> a system where thanks is tracked as social proof, raising the reputation and future earnings of contributors.</p>
        <p><strong>Regenerative ikigai:</strong> the intersection of what you love, what you are good at, what the world needs, and what you can be paid for, applied to planetary restoration.</p>
      </article>
    `,
    jsonld: {
      "@context": "https://schema.org",
      "@type": "DefinedTermSet",
      name: "ReGen Civics Glossary",
      url: `${SITE}/glossary`,
      hasDefinedTerm: [
        { "@type": "DefinedTerm", name: "Regenerative Renaissance", description: "A cultural and economic shift where human systems work with natural systems, actively rebuilding and restoring degraded ecosystems, communities, and economies." },
        { "@type": "DefinedTerm", name: "Infinite Game", description: "A game played to continue playing rather than to win; systems designed for impact that compounds across generations." },
        { "@type": "DefinedTerm", name: "Ecovillage", description: "An intentional community designed around ecological regeneration, shared governance, and local economy." },
        { "@type": "DefinedTerm", name: "Intentional community", description: "A group of people who choose to live together or share resources around common values." },
        { "@type": "DefinedTerm", name: "Bioregion", description: "A geographic area defined by natural boundaries such as watersheds and ecosystems rather than political lines." },
        { "@type": "DefinedTerm", name: "Regenerative finance (ReFi)", description: "Financial systems designed to fund the restoration of ecosystems and communities." },
        { "@type": "DefinedTerm", name: "HEIST framework", description: "Holistic Ecosystemic Impact and Sustainability Toolkit for evaluating regenerative land projects." },
        { "@type": "DefinedTerm", name: "Nine forms of capital", description: "Financial, social, intellectual, material, living, cultural, spiritual, experiential, and influence capital." },
        { "@type": "DefinedTerm", name: "Crowd pooling (CCEC)", description: "Community-centered economic cooperatives that pool capital to invest in regenerative projects." },
        { "@type": "DefinedTerm", name: "Quest", description: "A structured action producing measurable regenerative impact, verified by peers and rewarded in tokens." },
        { "@type": "DefinedTerm", name: "Gratitude economy", description: "A system where thanks is tracked as social proof, raising contributor reputation and earnings." },
        { "@type": "DefinedTerm", name: "Regenerative ikigai", description: "The intersection of what you love, what you are good at, what the world needs, and what you can be paid for, applied to planetary restoration." },
      ],
    },
  },
  "/apply": {
    html: `
      <article>
        <h1>Apply to the ReGen Civics incubator</h1>
        <p>The incubator (also called the Season 2 accelerator) is a 13-week program for regenerative land projects: ecovillages, farms, restoration projects, and intentional communities that want governance structures, economic design, and pathways to investment. Season 2 starts September 2026 and applications are open now.</p>
        <h2>What the program covers</h2>
        <ul>
          <li>Weeks 1 to 4: foundation. Governance, tokenomics, community structure.</li>
          <li>Weeks 5 to 8: growth. Marketing, partnerships, funding strategies.</li>
          <li>Weeks 9 to 12: scale. Expansion, replication, impact measurement.</li>
          <li>Week 13: demo day. Pitch to investors and showcase achievements.</li>
        </ul>
        <p><strong>What support do projects get?</strong> Governance frameworks, token economics design, investor preparation, marketing support, legal templates, and access to the alliance network. <strong>Do projects retain ownership?</strong> Yes, always. Read <a href="/seasons">how seasons work</a> and <a href="/blog/how-to-apply-for-season-2">the application guide</a>, then apply on this page.</p>
      </article>
    `,
  },
  "/seasons": {
    html: `
      <article>
        <h1>Seasons: how the incubator runs</h1>
        <p>ReGen Civics runs in seasons. Each season, a cohort of regenerative land projects moves through the 13-week incubator (an accelerator for land projects) together: building governance, designing their economic game, and preparing for investment, with demo day at the end. Season 1 graduated its first cohort in 2025 and 2026. Season 2 begins September 2026.</p>
        <p>Between seasons, the community keeps playing: quests continue, the forum stays active, and alliance partners support projects year round. If you steward land and want your project in the next cohort, <a href="/apply">apply here</a>. To see what a season looks like from the inside, read <a href="/blog/remembering-season-1">Remembering Season 1</a>.</p>
      </article>
    `,
  },
  "/land": {
    html: `
      <article>
        <h1>Land projects in the ReGen Civics network</h1>
        <p>ReGen Civics supports regenerative land projects around the world: ecovillages, regenerative farms, agroforestry projects, watershed restoration efforts, and intentional communities. As of mid-2026 the network includes 42 land projects across 8 bioregional hubs, each working to heal soil, water, biodiversity, and community while building a durable local economy.</p>
        <p>If you have land and want to build community or regenerate it, the incubator exists for exactly that: <a href="/apply">apply for the next season</a>. Explore projects on the <a href="/map">living map</a> or support one directly through <a href="/crowd-pooling">crowd pooling</a>.</p>
      </article>
    `,
  },
  "/investor": {
    html: `
      <article>
        <h1>The investor journey</h1>
        <p>Investing in ReGen Civics means putting capital into regenerative land projects with support structures that raise their odds of success. Start by understanding the <a href="/fund">fund</a> and the <a href="/opportunity">opportunity</a>, review the <a href="/risk-disclosure">risk disclosure</a>, then submit a <a href="/loi">letter of intent</a>. From there we talk through fit: fund participation for diversified exposure, or crowd pooling for direct investment into specific projects you believe in.</p>
        <p>Target returns are 8 to 12% annually, blended financial and impact returns. Investors also gain voice: Fund Voice governance tokens give participating investors a say in fund decisions.</p>
      </article>
    `,
  },
  "/community": {
    html: `
      <article>
        <h1>The ReGen Civics community</h1>
        <p>The community forum is where regenerators, land projects, and alliance partners coordinate the Regenerative Renaissance: sharing what works on the land, forming teams, asking hard questions about governance and finance, and celebrating completed quests. All discussions are public and readable by anyone; each post serves its full thread content at /community/post/{id}.</p>
        <p>Browse <a href="/community/members">the member directory</a>, find <a href="/community/seeking-team">people seeking teams</a>, or read <a href="/community/guidelines">the community guidelines</a>. Joining is free: create a profile and start contributing.</p>
      </article>
    `,
  },
  "/team": {
    html: `
      <article>
        <h1>The people behind ReGen Civics</h1>
        <p>ReGen Civics is built by a distributed community of contributors: community builders, developers, land stewards, game designers, and movement catalysts. The project is led by Rye (Rieki Cordon), founder and movement builder, who has spent years building regenerative economic tools since the SEEDS movement. The team works non-hierarchically, coordinating through the same governance and quest systems the platform offers to everyone else.</p>
      </article>
    `,
  },
  "/quest": {
    html: `
      <article>
        <h1>Quests: regenerative actions with real rewards</h1>
        <p>Quests are structured actions that produce measurable regenerative impact: gut health protocols, food forest planting, community building, ecological restoration, knowledge sharing. Each quest describes the actions, the proof required, and the $ReGen token reward. Players submit evidence, peers verify it, and verified work earns tokens and gratitude.</p>
        <p>Quests range from personal healing practices to multi-week land projects. Browse the board, pick what matches your skills and place, and start playing the <a href="/game">Infinite Game</a>.</p>
      </article>
    `,
  },
  "/tools": {
    html: `
      <article>
        <h1>The Regen Civilization Tools Library</h1>
        <p>A curated library of every kind of tool the Regenerative Renaissance needs: software for governance and coordination, hardware for land work, currency and finance systems, food system designs, and community process guides. Each entry explains what the tool does, who it serves, and how to start using it. The library is community-maintained; anyone can <a href="/tools/submit">submit a tool</a>.</p>
      </article>
    `,
  },
  "/ship": {
    html: `
      <article>
        <h1>The ReGen Ship: sail Cascadia, plant as you go</h1>
        <p>The ReGen Ship is a regenerative pirate ship you can book for a voyage: a 40-foot land yacht (2006 Fleetwood Revolution LE) with wood and stone trim, two bedrooms, two bathrooms, a full galley, Starlink, and spring water in her tanks. Built for a couple, up to four aboard in comfort, or five when at least three are children. She sails Cascadia: Crater Lake, Mount Shasta, hot springs, waterfalls, food forests, and the land projects of the ReGen Civics network.</p>
        <p>Every voyage carries a treasure chest of seeds. Everywhere you go, you plant, turning pine plantations back toward the food forests this land once knew. She anchors at The Sanctuary in Ashland, Oregon, and 10% of every voyage buys her back into community ownership through the Church of the Regenerative Earth.</p>
        <h2>Voyages</h2>
        <ul>
          <li>The Standard Sail: one week through the Cascadia highlights.</li>
          <li>The Half Honeymoon and The Honeymoon: one or two weeks made for couples.</li>
          <li>The Full Lunar Cycle: four weeks, one whole moon aboard.</li>
        </ul>
        <p><a href="/ship/book">Book a voyage</a>, enter the <a href="/ship/quest">Free Passage Quest</a> (complete regenerative actions and you are in every free-voyage draw), or read <a href="/blog/the-regen-ship">the ship's story</a>. She is the flagship of the ReGen Fleet: as more ships join, the fleet becomes a way to visit and serve land projects across the bioregion.</p>
      </article>
    `,
  },
  "/heal-the-land": {
    html: `
      <article>
        <h1>Heal the Land, Heal Ourselves</h1>
        <p>A community healing ministry of the Church of the Regenerative Earth, partnered with ReGen Civics. We offer free food, community gardening days, and land residency opportunities: healing people through healing land. For land project sponsors, we offer free Game Building support to bring the quest system to your land.</p>
        <p>The ministry practices regenerative spirituality: ceremony, stewardship, and reciprocity with the living world, guided by community elders and indigenous wisdom keepers.</p>
      </article>
    `,
  },
};

export function getStaticPageContent(reqPath: string): CrawlerContent | null {
  const entry = PAGE_CONTENT[reqPath];
  if (!entry) return null;
  return { bodyHtml: wrapForInjection(entry.html), jsonld: entry.jsonld };
}

// ── Forum posts: DB-driven, cached ──────────────────────────────────────────
const FORUM_CACHE_TTL_MS = 10 * 60 * 1000;
const FORUM_CACHE_MAX = 500;
const forumCache = new Map<number, { at: number; value: CrawlerContent | null }>();

export async function getForumPostContent(id: number): Promise<CrawlerContent | null> {
  const cached = forumCache.get(id);
  if (cached && Date.now() - cached.at < FORUM_CACHE_TTL_MS) return cached.value;

  let value: CrawlerContent | null = null;
  try {
    const post = await db.getForumPostSnapshot(id);
    if (post) {
      const replies = await db.listForumReplies(id);
      const authorIds = [post.authorId, ...replies.map((r) => r.authorId)];
      const authors = await db.getUsersByIds(authorIds);
      const authorName = (uid: number) => authors[uid]?.name || "Anonymous";
      const url = `${SITE}/community/post/${id}`;
      const iso = (d: Date | string | null | undefined) =>
        d ? new Date(d).toISOString() : undefined;

      const repliesHtml = replies
        .map(
          (r) => `
          <section>
            <h3>Reply from ${escapeHtml(authorName(r.authorId))}</h3>
            ${textToHtml(r.content)}
          </section>`,
        )
        .join("\n");

      const inner = `
        <article>
          <h1>${escapeHtml(post.title)}</h1>
          <p>Posted by ${escapeHtml(authorName(post.authorId))} in the ReGen Civics community forum.</p>
          ${textToHtml(post.content)}
          ${replies.length ? `<h2>${replies.length} ${replies.length === 1 ? "reply" : "replies"}</h2>` : ""}
          ${repliesHtml}
        </article>
      `;

      const jsonld = {
        "@context": "https://schema.org",
        "@type": "DiscussionForumPosting",
        headline: post.title,
        text: post.content.slice(0, 2000),
        url,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        author: { "@type": "Person", name: authorName(post.authorId) },
        datePublished: iso(post.createdAt),
        commentCount: replies.length,
        comment: replies.slice(0, 50).map((r) => ({
          "@type": "Comment",
          text: r.content.slice(0, 1000),
          author: { "@type": "Person", name: authorName(r.authorId) },
          dateCreated: iso(r.createdAt),
        })),
        publisher: { "@type": "Organization", name: "ReGen Civics", url: SITE },
      };

      const desc = post.content.replace(/\s+/g, " ").trim().slice(0, 160);
      value = {
        title: `${post.title} | ReGen Civics Community`,
        description: desc,
        bodyHtml: wrapForInjection(inner),
        jsonld,
      };
    }
  } catch (err) {
    console.warn(`[crawler-content] forum post ${id} render failed:`, (err as Error)?.message);
    value = null;
  }

  // Simple bounded cache: evict oldest entry when full.
  if (forumCache.size >= FORUM_CACHE_MAX) {
    const oldest = forumCache.keys().next().value;
    if (oldest !== undefined) forumCache.delete(oldest);
  }
  forumCache.set(id, { at: Date.now(), value });
  return value;
}

// ── Campaigns: DB-driven, cached ─────────────────────────────────────────────
const CAMPAIGN_CACHE_TTL_MS = 10 * 60 * 1000;
const CAMPAIGN_CACHE_MAX = 200;
const campaignCache = new Map<number, { at: number; value: CrawlerContent | null }>();

export async function getCampaignContent(id: number): Promise<CrawlerContent | null> {
  const cached = campaignCache.get(id);
  if (cached && Date.now() - cached.at < CAMPAIGN_CACHE_TTL_MS) return cached.value;

  let value: CrawlerContent | null = null;
  try {
    const campaign = await db.getCampaignById(id);
    // Only surface live campaigns to crawlers. Drafts, funded, and closed
    // campaigns stay out of the injected content and the index.
    if (campaign && campaign.status === "active") {
      const items = await db.getCampaignItems(id);
      const url = `${SITE}/campaign/${id}`;

      // One short label per need, from whichever field the item carries.
      const needLabels = items
        .map((it) =>
          (it.roleTitle || it.equipmentName || it.resourceName || it.landDescription || "").trim(),
        )
        .filter(Boolean)
        .slice(0, 12);
      const needsHtml = needLabels.length
        ? `<h2>What this project needs</h2>\n<ul>${needLabels
            .map((n) => `<li>${escapeHtml(n)}</li>`)
            .join("")}</ul>`
        : "";

      const where = campaign.location ? ` in ${escapeHtml(campaign.location)}` : "";
      const inner = `
        <article>
          <h1>${escapeHtml(campaign.title)}</h1>
          <p>${escapeHtml(campaign.projectName)}${where}, crowd pooling on ReGen Civics.</p>
          ${textToHtml(campaign.description)}
          ${needsHtml}
        </article>
      `;

      const descText = campaign.description.replace(/\s+/g, " ").trim();
      const jsonld = {
        "@context": "https://schema.org",
        "@type": "Project",
        name: campaign.title,
        description: descText.slice(0, 2000),
        url,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        ...(campaign.location
          ? { location: { "@type": "Place", name: campaign.location } }
          : {}),
        publisher: { "@type": "Organization", name: "ReGen Civics", url: SITE },
      };

      value = {
        title: `${campaign.title} | ReGen Civics Crowd Pooling`,
        description: descText.slice(0, 160),
        bodyHtml: wrapForInjection(inner),
        jsonld,
      };
    }
  } catch (err) {
    console.warn(`[crawler-content] campaign ${id} render failed:`, (err as Error)?.message);
    value = null;
  }

  // Simple bounded cache: evict oldest entry when full.
  if (campaignCache.size >= CAMPAIGN_CACHE_MAX) {
    const oldest = campaignCache.keys().next().value;
    if (oldest !== undefined) campaignCache.delete(oldest);
  }
  campaignCache.set(id, { at: Date.now(), value });
  return value;
}

// ── The network of games: registry-driven, cached upstream ───────────────────
/**
 * /network, the other half of the foundation credit.
 *
 * Every custom game we deliver carries a credit line linking back here
 * (shared/foundationCredit.ts). This page links back out to each game, which is
 * what makes it a network rather than a one-way footer. The outbound links have
 * to be in the HTML a crawler fetches, so they are rendered here at request time
 * rather than by the React page: same reason the credit itself is injected on
 * the game's side.
 *
 * No caching layer of its own. getNetworkFeed() already caches for ten minutes,
 * and building this string from it is cheap.
 */
export async function getNetworkPageContent(): Promise<CrawlerContent | null> {
  try {
    const feed = await getNetworkFeed();
    const url = `${SITE}/network`;

    const entries = feed.games
      .map((g) => {
        const projectLink = g.projectUrl
          ? ` Project site: <a href="${escapeHtml(g.projectUrl)}">${escapeHtml(g.projectUrl.replace(/^https?:\/\//, ""))}</a>.`
          : "";
        const count =
          g.feed && g.feed.projectCount > 0
            ? ` Publishes ${g.feed.projectCount} project${g.feed.projectCount === 1 ? "" : "s"} to the federation feed.`
            : "";
        const state = g.status === "live" ? "Live" : "In build";
        return `
        <section>
          <h3><a href="${escapeHtml(g.url)}">${escapeHtml(g.name)}</a></h3>
          <p>${escapeHtml(g.blurb)} ${escapeHtml(g.location)}. ${state} since ${escapeHtml(g.since)}.${count}${projectLink}</p>
        </section>`;
      })
      .join("\n");

    const inner = `
      <article>
        <h1>The ReGen Civics network of regenerative games</h1>
        <p>Land projects run their own coordination game: a web app on their domain, in their brand, holding their data, that shows residents, business builders, core team, and investors how the project actually works. Each game below was built with ReGen Civics and is owned outright by the project running it. ${feed.games.length} ${feed.games.length === 1 ? "game is" : "games are"} in the network today.</p>
        <h2>Games in the network</h2>
        ${entries}
        <h2>How a game joins</h2>
        <p>A land project designs its game through an intake conversation, then a generation session produces a working first draft, then three to six months of co-creation with their team, then handoff: their code, their data, their keys. Read <a href="/custom-games">how custom games work</a> or start with <a href="/custom-games/apply">the intake</a>.</p>
        <p>Every game publishes a machine-readable directory of its own projects at /api/federation/projects.json, the same format ReGen Civics publishes at <a href="/api/federation/projects.json">its own federation feed</a>, so partner networks can read the whole network from one shape.</p>
      </article>
    `;

    const jsonld = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "The ReGen Civics network of regenerative games",
      description: feed.description,
      url,
      isPartOf: { "@type": "WebSite", name: "ReGen Civics", url: SITE },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: feed.games.length,
        itemListElement: feed.games.map((g, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "WebSite",
            name: g.name,
            url: g.url,
            description: g.blurb,
            ...(g.location ? { about: { "@type": "Place", name: g.location } } : {}),
          },
        })),
      },
      publisher: { "@type": "Organization", name: "ReGen Civics", url: SITE },
    };

    return {
      title: "The Network of Regenerative Games: ReGen Civics",
      description:
        "Land projects running their own coordination game, built with ReGen Civics and owned outright by the project.",
      bodyHtml: wrapForInjection(inner),
      jsonld,
    };
  } catch (err) {
    console.warn("[crawler-content] network page render failed:", (err as Error)?.message);
    return null;
  }
}

// ── Route resolution ─────────────────────────────────────────────────────────
export async function resolveCrawlerContent(reqPath: string): Promise<CrawlerContent | null> {
  const campaignMatch = reqPath.match(/^\/campaign\/(\d+)$/);
  if (campaignMatch) return getCampaignContent(Number(campaignMatch[1]));
  const forumMatch = reqPath.match(/^\/community\/post\/(\d+)$/);
  if (forumMatch) return getForumPostContent(Number(forumMatch[1]));
  if (reqPath === "/network") return getNetworkPageContent();
  return getStaticPageContent(reqPath);
}
