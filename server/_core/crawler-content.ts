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
 * Three content sources:
 *   1. PAGE_CONTENT: hand-written prose for stable marketing/info routes.
 *      Keep in sync with the live page copy when pages change substantially.
 *   2. Learn hub articles: rendered from shared/learnContent, the same
 *      module the React page reads, so the crawler HTML and the human page
 *      cannot drift apart.
 *   3. Forum posts and project pages: rendered from the DB at request time
 *      with a small TTL cache, including DiscussionForumPosting / Project
 *      JSON-LD. A project page reads through resolveProjectPage
 *      (server/lib/project-page.ts), the same read as projects.getPublic.
 *      /campaign/:id is not here: a public campaign answers a 301 to its
 *      project page (server/lib/campaign-redirect.ts).
 */
import * as db from "../db";
import { jsonLdAuthor, landProjectTeamAttribution, TEAM_USER_NAME } from "../lib/team-user";
import { COOP, COOP_LINEAGE_HEADING } from "../../shared/fund";
import { NEEDS_SECTION, SITE_TAGLINE } from "../../shared/siteCopy";
import { CROWDPOOLING_WORDING } from "../lib/content-canon";
import { HOW_IT_WORKS, START_DOOR } from "../../shared/crowdpoolCopy";
import { CROWDPOOL_READINESS, READINESS_INTRO, READINESS_TITLE } from "../../shared/crowdpoolReadiness";
import { REGEN_SEASONS, REGEN_SEASON_ORDER, SEASON_ONE } from "../../shared/regenYear";
import { ACCEPTANCE_LINE, APPLICATIONS, APPLICATIONS_HEADLINE, APPLICATIONS_STATUS } from "../../shared/applicationWindow";
import { SEASON2_CURRICULUM } from "../../shared/season2Curriculum";
import { getNetworkFeed } from "../lib/network-feed";
import { serverCurrencyFormatter } from "../lib/currency-format";
import { decodeBasicEntities } from "../../shared/htmlText";
import { progressLines } from "../../shared/campaignProgress";
import { kindForItem, needTitle, needVerb } from "../../shared/crowdpoolNeedAction";
import {
  LEARN_ARTICLES,
  getLearnArticle,
  parseInline,
  stripInline,
  type LearnArticle,
  type LearnSection,
} from "@shared/learnContent";

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
  /**
   * The page's canonical path when it differs from the request path. A
   * project page answers any slug for its id, so an old slug names the
   * current one as canonical (server/_core/vite.ts).
   */
  canonicalPath?: string;
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
//
// Every sentence about the cooperative comes from COOP (shared/fund.ts), and a
// page that describes it carries COOP.notAnOffer once. Until 2026-09-27 this
// block described a fund with a return target, which search engines and AI
// assistants read and repeated; scripts/check-fund-claims.mjs now fails the
// build if that language comes back here.

/** The crowdpool lane's binding wording, used verbatim wherever this prose describes crowdpooling. */
const CROWDPOOLING = CROWDPOOLING_WORDING;

/** "A cooperative regenerative society" reads as a subtitle after a colon. */
const COOP_TAGLINE_LOWER = COOP.tagline.charAt(0).toLowerCase() + COOP.tagline.slice(1);

const COOP_PRINCIPLES_HTML = `<ul>
          ${COOP.designPrinciples
            .map((p) => `<li><strong>${escapeHtml(p.title)}.</strong> ${escapeHtml(p.body)}</li>`)
            .join("\n          ")}
        </ul>`;

const PAGE_CONTENT: Record<string, { html: string; jsonld?: object }> = {
  "/": {
    html: `
      <article>
        <h1>ReGen Civics: tools and a game for the Regenerative Renaissance</h1>
        <p>${escapeHtml(SITE_TAGLINE)} ${escapeHtml(NEEDS_SECTION.body)}</p>
        <p>ReGen Civics builds the tools and runs the in-real-life game that regenerative land projects use today: ecovillages, regenerative farms, intentional communities, and restoration projects healing their land and bioregions. We run a 13-week incubator, coordinate crowdpooling for land projects, and operate a quest-based game where anyone can contribute to real-world regeneration and earn tokens for verified work.</p>
        <p>Founded in 2023, ReGen Civics grew out of the SEEDS regenerative economy movement. It starts from one idea: healthier lands lead to healthier people.</p>
        <h2>Four ways in</h2>
        <ul>
          <li><a href="/apply">Land projects</a> apply to the incubator for governance tools, economic design, and a crowdpool launch with their cohort.</li>
          <li><a href="/crowd-pooling">Contributors</a> back land projects through crowdpooling. ${escapeHtml(CROWDPOOLING)}</li>
          <li><a href="/ally">Alliance partners</a> join the network of organizations co-creating the Regenerative Renaissance.</li>
          <li><a href="/quest">Players</a> complete quests that move healing into the world and earn $ReGen tokens.</li>
        </ul>
        <h2>The cooperative, in design</h2>
        <p>${escapeHtml(COOP.statement)}</p>
        <p>Land projects, people and organizations can <a href="/loi">tell us they're interested</a>. ${escapeHtml(COOP.interestPromise)}</p>
        <p>${escapeHtml(COOP.notAnOffer)}</p>
        <p>Explore <a href="/fund">the cooperative</a>, <a href="/game">the game</a>, <a href="/community">the community forum</a>, and <a href="/glossary">the glossary</a>.</p>
      </article>
    `,
  },
  "/fund": {
    html: `
      <article>
        <h1>The ${escapeHtml(COOP.name)}: ${escapeHtml(COOP_TAGLINE_LOWER)}</h1>
        <p><strong>${escapeHtml(COOP.statusLabel)}.</strong> ${escapeHtml(COOP.statement)}</p>
        <h2>How it is being designed to work</h2>
        <p>${escapeHtml(COOP.designPrinciplesNote)}</p>
        ${COOP_PRINCIPLES_HTML}
        <h2>Where it stands</h2>
        <p>${escapeHtml(COOP.whereItStands)}</p>
        <p>${escapeHtml(COOP.entities)}</p>
        <h2>Tokens</h2>
        <p>${escapeHtml(COOP.tokensNote)} ${escapeHtml(COOP.coopTokens.rcivics)} ${escapeHtml(COOP.coopTokens.rcvoice)}</p>
        <h2>Tell us you're interested</h2>
        <p>Land projects, people, organizations and funders can <a href="/loi">tell us they're interested</a> and which of the nine forms of capital they might bring. ${escapeHtml(COOP.interestPromise)}</p>
        <p>${escapeHtml(COOP.notAnOffer)}</p>
        <p>Read <a href="/opportunity">how you can help design it</a>, <a href="/learn/nine-forms-of-capital">the nine forms of capital</a>, and <a href="/disclaimers">the disclaimers</a>.</p>
      </article>
    `,
  },
  "/game": {
    html: `
      <article>
        <h1>The Infinite Game: play for the Regenerative Renaissance</h1>
        <p>The ReGen Civics game is a real-world game where completing quests produces measurable regenerative impact: growing food, restoring soil, building community, sharing knowledge, healing land and people. Players earn $ReGen tokens for verified contributions, and those contributions compound into reputation and governance voice in the Game.</p>
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
        <h1>Help design the ${escapeHtml(COOP.name)}</h1>
        <p>${escapeHtml(COOP.statement)}</p>
        <p>${escapeHtml(COOP.whereItStands)} Land projects, people, organizations and funders can <a href="/loi">tell us they're interested</a>. ${escapeHtml(COOP.interestPromise)}</p>
        <h2>${escapeHtml(COOP_LINEAGE_HEADING)}</h2>
        <p>ReGen Civics grew out of the SEEDS regenerative economy movement. The Game's governance runs on Hypha DAO on the Base network. Season 1 was the first incubator, in ${SEASON_ONE.year}: ${SEASON_ONE.applied} land projects applied, ${SEASON_ONE.presented} presented, and ${SEASON_ONE.selected} were selected. Season 2 opened at the September 2026 equinox. The cooperative itself has no record yet, because it does not exist yet.</p>
        <h2>The design principles</h2>
        <p>${escapeHtml(COOP.designPrinciplesNote)}</p>
        ${COOP_PRINCIPLES_HTML}
        <p>${escapeHtml(COOP.notAnOffer)}</p>
        <p>Read <a href="/fund">the cooperative overview</a>, meet <a href="/land">the land projects</a>, or see <a href="/seasons">how the seasons work</a>.</p>
      </article>
    `,
  },
  "/governance": {
    html: `
      <article>
        <h1>Governance: voice rooted in land and contribution</h1>
        <p>ReGen Civics uses voice-based governance: decision power in the Game flows from verified contribution. RGVoice is the Game's governance token. It governs the ReGen Game (quests, community, game economics), and it is earned through participation, never purchased. Decisions run through the Hypha DAO framework on the Base network, so they are recorded on chain. ${escapeHtml(COOP.coopTokens.rcvoice)}</p>
        <p>Members raise proposals, the community deliberates in the <a href="/community">forum</a>, and ratified decisions execute through our machine governance pipeline. Anyone can review <a href="/proposals">community proposals</a> or the live <a href="/assembly">assembly</a>. The result is governance that stays accountable to the people doing the regenerative work and to the land itself.</p>
      </article>
    `,
  },
  "/tokenomics": {
    html: `
      <article>
        <h1>Tokenomics: the four ReGen Civics tokens</h1>
        <p>ReGen Civics has four tokens. Two belong to the Game and are in use today. Two come from the earlier fund design. ${escapeHtml(COOP.tokensNote)}</p>
        <ul>
          <li><strong>$ReGen</strong>: tracks contributions in the ReGen Game. Earned through quests, bounties, and verified regenerative work.</li>
          <li><strong>RGVoice</strong>: governance voice in the ReGen Game. Earned through participation, never purchased.</li>
          <li><strong>$RCivics</strong>: ${escapeHtml(COOP.coopTokens.rcivics)}</li>
          <li><strong>RCVoice</strong>: ${escapeHtml(COOP.coopTokens.rcvoice)}</li>
        </ul>
        <p>Tokens operate on the Base network (Coinbase's L2) via the Hypha DAO framework, keeping fees minimal. Contributions are recorded in an append-only ledger, and private balances bridge one way to public on-chain tokens through a claim process. See the <a href="/game">game</a>, <a href="/governance">governance</a>, and <a href="/bionomics">bionomics</a> for how the Game's tokens work.</p>
      </article>
    `,
  },
  "/bionomics": {
    html: `
      <article>
        <h1>Bionomics: an economy modelled on living systems</h1>
        <p>Bionomics is our name for an economic system that works the way ecosystems work: value flows in cycles, waste becomes food, diversity creates resilience, and health compounds. In practice this means contribution scores, gratitude tokens, seasonal harvests, and bioregional value flows that reward work which heals land and community rather than extracts from them.</p>
        <p>We measure success across nine forms of capital: financial, social, intellectual, material, living, cultural, spiritual, experiential, and health. The first eight are Ethan Roland and Gregory Landua's 8 Forms of Capital. The ninth, health capital, is ours: body vitality, wellness, movement, rest, and care, which the original eight have no place for. Money is one form of wealth among nine, and our accounting reflects that. See <a href="/learn/nine-forms-of-capital">the nine forms of capital</a>, <a href="/tokenomics">tokenomics</a> for the token mechanics, and <a href="/glossary">the glossary</a> for the full vocabulary.</p>
      </article>
    `,
  },
  "/glossary": {
    html: `
      <article>
        <h1>Glossary: the vocabulary of the Regenerative Renaissance</h1>
        <p><strong>Regenerative Renaissance:</strong> a cultural and economic shift where human systems work with natural systems. Where sustainability maintains the status quo, regeneration actively rebuilds and restores degraded ecosystems, communities, and economies.</p>
        <p><strong>Infinite Game:</strong> a game played to continue playing rather than to win. ReGen Civics designs its game, tools, and governance for impact that compounds across generations.</p>
        <p><strong>Ecovillage:</strong> an intentional community designed around ecological regeneration, shared governance, and local economy, typically on rural land with food production and shared infrastructure.</p>
        <p><strong>Intentional community:</strong> a group of people who choose to live together or share resources around common values, spanning ecovillages, cohousing, land cooperatives, and community land trusts.</p>
        <p><strong>Bioregion:</strong> a geographic area defined by natural boundaries such as watersheds and ecosystems rather than political lines. Bioregionalism organizes economy and governance at this scale.</p>
        <p><strong>Regenerative finance (ReFi):</strong> financial systems designed to fund the restoration of ecosystems and communities.</p>
        <p><strong>HEIST framework:</strong> Holistic Ecosystemic Impact and Sustainability Toolkit, our method for evaluating land projects across whole systems, interconnections, measurable outcomes, and long-term viability.</p>
        <p><strong>Nine forms of capital:</strong> financial, social, intellectual, material, living, cultural, spiritual, experiential, and health. The first eight come from Ethan Roland and Gregory Landua's 8 Forms of Capital (2011). ReGen Civics added health capital, meaning body vitality, wellness, movement, rest, and care. See <a href="/learn/nine-forms-of-capital">why we added a ninth</a>.</p>
        <p><strong>Crowdpooling:</strong> ${escapeHtml(CROWDPOOLING)}</p>
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
        { "@type": "DefinedTerm", name: "Nine forms of capital", description: "Financial, social, intellectual, material, living, cultural, spiritual, experiential, and health capital. The first eight are Ethan Roland and Gregory Landua's 8 Forms of Capital; ReGen Civics added health capital, meaning body vitality, wellness, movement, rest, and care.", url: `${SITE}/learn/nine-forms-of-capital` },
        { "@type": "DefinedTerm", name: "Health capital", description: "The physical and emotional vitality a person holds, and the work that builds it in others: movement, rest, bodywork, nutrition, recovery, and care. The ninth form of capital, added by ReGen Civics to the standard eight.", url: `${SITE}/learn/nine-forms-of-capital` },
        { "@type": "DefinedTerm", name: "Crowdpooling", description: CROWDPOOLING },
        { "@type": "DefinedTerm", name: "Quest", description: "A structured action producing measurable regenerative impact, verified by peers and rewarded in tokens." },
        { "@type": "DefinedTerm", name: "Gratitude economy", description: "A system where thanks is tracked as social proof, raising contributor reputation and earnings." },
        { "@type": "DefinedTerm", name: "Regenerative ikigai", description: "The intersection of what you love, what you are good at, what the world needs, and what you can be paid for, applied to planetary restoration." },
      ],
    },
  },
  "/assembly": {
    html: `
      <article>
        <h1>The Assembly: community governance for the Game</h1>
        <p>The Assembly is the community-governed space of the ReGen Civics Game. Anyone in the community can raise a proposal, signal where they stand, and help decide what advances to an on-chain vote on <a href="/governance">Hypha on Base</a>.</p>
        <h2>How a proposal moves</h2>
        <ul>
          <li>Forming: the idea gathers signals and a synthesized read of the forum conversation.</li>
          <li>Last call: a final window for late objections before the vote opens.</li>
          <li>Deciding: the binding vote runs on Hypha on Base.</li>
          <li>Record: the full trail of every ratified change stays public: the conversation, the vote, and what changed.</li>
        </ul>
        <h2>The Evolution Engine</h2>
        <p>The Game grows by the hands of the people playing it. When a proposal passes, our own automation can take it from there: build it, ship it, and let the Game evolve. Every machine-built change waits 24 hours in the open before going live, any Steward can pause it in that window, a person signs off on each ship while the system earns trust, and two failed ships in a row pull the machine back a level automatically. The community votes on how much room the machine gets.</p>
        <p>Walkthrough proposals marked Example show each stage with realistic content. Real decisions live alongside them and in the <a href="/community">community forum</a>. Read <a href="/governance">how governance works</a> or see the <a href="/tokenomics">token model</a> behind voting voice.</p>
      </article>
    `,
  },
  "/apply": {
    html: `
      <article>
        <h1>Apply to the ReGen Civics incubator</h1>
        <p>The incubator (also called the Season 2 accelerator) is a 13-week program for regenerative land projects: ecovillages, farms, restoration projects, and intentional communities that want governance structures, economic design, and a crowdpool launch with their cohort. Season 2 began in September 2026. ${escapeHtml(APPLICATIONS_STATUS)}</p>
        <h2>What the program covers</h2>
        <ul>
          ${SEASON2_CURRICULUM.map((ep) => `<li>Week ${ep.week}: ${escapeHtml(ep.title)}.</li>`).join("\n          ")}
        </ul>
        <p><strong>What support do projects get?</strong> Governance frameworks, token economics design, crowdpool preparation, marketing support, legal templates, and access to the alliance network. <strong>Do projects retain ownership?</strong> Yes, always. Read <a href="/seasons">how seasons work</a> and <a href="/blog/how-to-apply-for-season-2">the application guide</a>, then apply on this page.</p>
      </article>
    `,
  },
  // Read from shared/regenYear.ts, the same definition the page renders. This
  // block used to say Season 1 graduated in 2025 and 2026; it ran in 2022 (43
  // applications, 16 presented, 13 selected, per Rye 2026-09-24).
  "/seasons": {
    html: `
      <article>
        <h1>Seasons: the ReGen Civics Year</h1>
        <p>ReGen Civics runs on a yearly wheel of four seasons named for what they are for: Design, Resource, Build, and Rest. They loosely follow winter, spring, summer, and fall, and turn at the solstices and equinoxes with a recap and passoff; the September one is the Handoff Festival, when the outgoing cohort hands the wheel to the new one on Selection Day. Each numbered Season starts with a Design Season and a new cohort of regenerative land projects and follows it once around the wheel. Timelines are loose in this first full turn and adjust to what the year needs.</p>
        <ul>
          ${REGEN_SEASON_ORDER.map((key) => {
            const s = REGEN_SEASONS[key];
            return `<li><strong>${escapeHtml(s.title)} (${escapeHtml(s.pattern.toLowerCase())}).</strong> ${escapeHtml(s.summary)}</li>`;
          }).join("\n          ")}
        </ul>
        <p>Season 1 was the first incubator, in ${SEASON_ONE.year}: ${SEASON_ONE.applied} land projects applied, ${SEASON_ONE.presented} presented, and ${SEASON_ONE.selected} were selected. A long stretch of building the tools followed. Season 2 opened at the September 2026 equinox with a public Selection Day, and its 13-week Design Season runs to the December solstice. The cohort and every community project that's ready launch a shared crowdpool at the March equinox. ${escapeHtml(APPLICATIONS_STATUS)} <a href="/apply">Apply here</a>. To see what a season looks like from the inside, read <a href="/blog/remembering-season-1">Remembering Season 1</a>.</p>
      </article>
    `,
  },
  "/land": {
    html: `
      <article>
        <h1>Land projects in the ReGen Civics network</h1>
        <p>ReGen Civics supports regenerative land projects around the world: ecovillages, regenerative farms, agroforestry projects, watershed restoration efforts, and intentional communities, each working to heal soil, water, biodiversity, and community while building a durable local economy.</p>
        <p>If you have land and want to build community or regenerate it, the incubator exists for exactly that: <a href="/apply">apply for the next season</a>. Explore projects on the <a href="/map">living map</a> or back one through <a href="/crowd-pooling">crowdpooling</a>. ${escapeHtml(CROWDPOOLING)}</p>
      </article>
    `,
  },
  // /investor redirects here (Phase 0 route contract), so the interest page
  // carries the prose the old investor journey did.
  "/loi": {
    html: `
      <article>
        <h1>Tell us you're interested in the ${escapeHtml(COOP.name)}</h1>
        <p>${escapeHtml(COOP.statement)}</p>
        <p>Land projects, people, organizations and funders can use this page to tell us they're interested and which of the nine forms of capital they might bring. ${escapeHtml(COOP.interestPromise)}</p>
        <p>${escapeHtml(COOP.notAnOffer)}</p>
        <p>Read about <a href="/fund">the cooperative</a>, <a href="/learn/nine-forms-of-capital">the nine forms of capital</a>, and <a href="/seasons">the seasons</a>.</p>
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

  // ── Routes the phase -2 agent baseline measured as blank ─────────────────
  // Each of the four below was an empty shell to any agent that does not run
  // JavaScript. The prose is taken from the live page, read in a browser on
  // 2026-09-27, and condensed: no claim here is written fresh. That rule is
  // the point rather than a style preference. The baseline caught models
  // inventing a "Village Subscription", a "whole systems village as a service
  // model" and "30+ organizations in the Alliance" against a registry holding
  // fifteen, and this file is exactly where an invention would be quoted back
  // as fact.

  "/season2": {
    html: `
      <article>
        <h1>Season Two: thirteen seats, selected on the Equinox</h1>
        <p>Season Two selects thirteen regenerative land projects across every stage, scale, and approach to regeneration. The cohort builds its models together, then launches, with every community project that is ready, into one shared crowdpooling campaign where the world decides what to pool into. Projects that graduate become the foundation of what the cooperative is being designed to steward.</p>
        ${APPLICATIONS.rolling
          ? `<p><strong>${escapeHtml(APPLICATIONS_HEADLINE)}</strong> ${escapeHtml(ACCEPTANCE_LINE)}</p>`
          : `<p><strong>Season Two applications are closed.</strong> You can follow along live, and you can apply for the next season at any time: applications are held, and no emails go out about them until the next season is closer.</p>`}
        <h2>How a season works</h2>
        <ul>
          <li><strong>Selected.</strong> A season council of players from past seasons picks thirteen projects on the Equinox, built for range across maturity, scale, and approach.</li>
          <li><strong>Built.</strong> Thirteen teams design their governance, legal, economic and financial models together, reviewing each other's work against the standard an investor will actually apply.</li>
          <li><strong>Graduated.</strong> After thirteen weeks, projects that finish with everything they need go live together in one shared crowdpooling campaign. At least nine, and the aim is all thirteen. Community projects that are ready join them.</li>
          <li><strong>Pooled and funded.</strong> The world decides which projects to pool money, land, equipment and labor into. What comes through becomes the foundation of what the cooperative is being designed to steward.</li>
        </ul>
        <h2>What it costs</h2>
        <p>No fee to apply and no fee to take part. What a project brings is its team's time and a token swap that makes the alliance and the project co-invested in each other. Every model, template, legal structure and framework built during the season is open-sourced, because charging admission to the on-ramp would work against growing the ReGenerative Renaissance.</p>
        <p>Thirteen weeks of accelerator covering governance, legal structure, economics and financing, designed alongside twelve other projects. A network that carries some of what usually falls on one or two founders. A shared crowdpooling launch, so a project raises alongside the network rather than alone.</p>
        <p>See <a href="/apply">how to apply for the next season</a>, <a href="/schedule">the upcoming sessions</a>, or <a href="/create-campaign#ready">what a project needs to crowdpool</a>.</p>
      </article>
    `,
  },

  // A contributor's page (bundle 1, section 16.2): how helping works, from
  // the same constants the page reads, and one line for a land project.
  "/crowd-pooling": {
    html: `
      <article>
        <h1>Map your Character Gifts</h1>
        <p>${escapeHtml(CROWDPOOLING)}</p>
        <h2>How helping a land project works</h2>
        <p>${HOW_IT_WORKS.map((s) => escapeHtml(s.body)).join(" ")}</p>
        <p>Crowd pooling on this page is a character sheet. Name the gifts you could bring now and the roles you could take on later, then download a PDF or save the gift map to your profile. Every open need across every campaign is on <a href="/campaigns?tab=needs">the Needs tab</a>.</p>
        <p>Bringing a land project? <a href="/create-campaign#ready">See what it shows before its campaign opens</a>.</p>
      </article>
    `,
  },

  // The creator front door (bundle 1, section 16.1), built from shared
  // constants so it cannot drift. Titles only: an item's need and show text
  // stay off crawler prose (item 3's wording is Rye's open question).
  "/create-campaign": {
    html: `
      <article>
        <h1>Bring your land project to crowdpooling</h1>
        <p>${escapeHtml(START_DOOR.lede)} Apply for the season, get ready with the eight things the review checks, list what your project needs, and send it for review.</p>
        <h2>${escapeHtml(READINESS_TITLE)}</h2>
        <p>${escapeHtml(READINESS_INTRO)}</p>
        <ol>${CROWDPOOL_READINESS.map((i) => `<li>${escapeHtml(i.title)}</li>`).join("")}</ol>
        <p>Each item's full wording is on <a href="/create-campaign#ready">the page</a>. See <a href="/apply">how to apply</a> and <a href="/campaigns">the campaigns</a>.</p>
      </article>
    `,
  },

  "/game-mechanics": {
    html: `
      <article>
        <h1>Game mechanics: every variable visible and tunable</h1>
        <p>Every variable in the ReGen Games is visible and tunable. The page publishes live values and a simulator showing how a change would affect scoring, harvest shares and gratitude budgets.</p>
        <h2>Citizenship tiers</h2>
        <p>You grow into this society at your own pace. Everyone starts as an Explorer and earns deeper participation through real contribution. Each tier carries different powers, gratitude budgets and governance weight.</p>
        <p>The page covers live variables, how bounties are valued, the game simulator, gratitude system variables and the Living Tree. See also <a href="/game">the Infinite Game</a>, <a href="/bionomics">the living economy</a> and <a href="/glossary">the glossary</a>.</p>
      </article>
    `,
  },

  "/connect": {
    html: `
      <article>
        <h1>Connect: which path calls to you</h1>
        <p>A short form that routes a person to the right part of ReGen Civics, so what follows is relevant to them. More than one path can apply, and the form can be filled in more than once.</p>
        <h2>The seven paths</h2>
        <ul>
          <li><strong>Land Partner.</strong> I steward or own land and would like to explore joining the Alliance.</li>
          <li><strong>Create with ReGens.</strong> I want to co-create with one or more of the Alliance organizations.</li>
          <li><strong>Alliance Partner.</strong> I represent an organization and want to explore joining the Alliance.</li>
          <li><strong>Finance the Renaissance.</strong> I represent a fund or institution interested in systemic regeneration.</li>
          <li><strong>Live.</strong> I want to co-create with one or more of the ReGen land projects.</li>
          <li><strong>Role in ReGen Civics.</strong> Apply for a role directly.</li>
          <li><strong>Something else.</strong> A unique way to contribute.</li>
        </ul>
        <p>If you already have an account you can continue an existing application. See also <a href="/apply">applying to the incubator</a>, <a href="/loi">the cooperative in design</a> and <a href="/schedule">the upcoming sessions</a>.</p>
      </article>
    `,
  },

  "/play": {
    html: `
      <article>
        <h1>Play the Infinite Game: ways in for five minutes or five years</h1>
        <p>Everyone can play. Whether you have five minutes or five years, there is a way to participate in regenerating civilization, and the level is yours to choose. Quests can be browsed without an account; signing in is what lets you earn $ReGen and submit deliverables.</p>
        <h2>Easy mode: low dedication, high impact</h2>
        <ul>
          <li><strong>Quest.</strong> Complete games and tasks.</li>
          <li><strong>Trade.</strong> Take part as a bioregional merchant.</li>
          <li><strong>Claim.</strong> Record the contributions you have already made.</li>
        </ul>
        <h2>High dedication</h2>
        <p>For people who want to build, lead, or root in: <strong>join</strong> an existing organization or village, or <strong>catalyze</strong> a new one.</p>
        <h2>Two tokens, and they are not the Fund's</h2>
        <p>ReGen Game tokens are the in-game currency and RGVoice tokens carry governance. These are distinct from the Fund tokens; the two sides are explained in <a href="/bionomics">the living economy</a> and <a href="/tokenomics">tokenomics</a>.</p>
        <p>If you are not sure where to start, <a href="/schedule">join an open session first</a>, or go straight to <a href="/quest">the quest board</a>. The mechanics are published in full at <a href="/game-mechanics">game mechanics</a>.</p>
      </article>
    `,
  },

  "/ally": {
    html: `
      <article>
        <h1>The Alliance Network: for organizations supporting land projects</h1>
        <p>An alliance of organizations weaving a support network for regenerative land projects worldwide. Each organization brings something the others cannot, and pooled, that becomes real capacity for land projects. Instead of searching for clients one at a time, a partner reaches a pipeline of regenerative land projects that need what they already offer.</p>
        <h2>What joining gives an organization</h2>
        <ul>
          <li>Connection to land projects across the network.</li>
          <li>Fundraising alongside the alliance rather than alone.</li>
          <li>Shared infrastructure.</li>
          <li>Governance and voice in how the alliance runs.</li>
        </ul>
        <h2>How to join</h2>
        <p>Five steps: apply, onboard, collaborate, agree an equity, service or token swap, then grow together. The alliance is looking for organizations across every domain needed to support regenerative land projects.</p>
        <p>See <a href="/network">the land projects your organization could support</a>, <a href="/crowd-pooling">crowd pooling</a>, <a href="/tools">the tools directory</a>, or <a href="/team">the people building this</a>.</p>
      </article>
    `,
  },

  // ── The Ship ─────────────────────────────────────────────────────────────
  // A real, bookable offering, and every sub-page of it was invisible to an
  // agent. Someone asking an assistant "where can I rent an RV in southern
  // Oregon" or "is there a sober, plant-based road trip I can book" was being
  // answered from everything except us.
  //
  // The rates below carry their own expiry ("through early April 2027")
  // exactly as the page states it, so a reader can tell for themselves whether
  // the number is still current. A price with no condition attached is the
  // kind of claim that goes stale silently and sends someone at a number that
  // no longer exists.

  "/ship/book": {
    html: `
      <article>
        <h1>Book a voyage aboard the ReGen Ship</h1>
        <p>The Ship is a 2006 Fleetwood Revolution, 40 feet, with solar, battery, water and propane systems. Her home anchorage is Ashland, Oregon. Voyages board Monday at 5pm and return the following Monday at 11am, and up to four weeks can be chained for a longer sail.</p>
        <h2>What it costs</h2>
        <p>Her full rate is 600 US dollars a night. Through early April 2027 that is 50 percent off, so 300 dollars a night, which is 2,100 dollars for a voyage week against a full rate of 4,200. Plus applicable taxes. Multi-week savings stack on top: 5 percent off two weeks, 10 percent off three, 15 percent off a month.</p>
        <p>The discount is a trial year, and it is discounted because she is twenty years old and carries her quirks honestly.</p>
        <h2>The turnover</h2>
        <p>The Keeper resets her on the Monday turnover between 11am and 5pm, topping up propane and water before the next crew boards. Tanks reset on every turnover, including between chained weeks.</p>
        <p>Read the <a href="/ship/terms">Voyage Covenant and rental terms</a> before booking: crew size, travel radius, included miles and the clean-vessel rules are all stated there. The <a href="/ship/guide">voyage guide</a> covers what to pack and how she drives.</p>
      </article>
    `,
  },

  "/ship/terms": {
    html: `
      <article>
        <h1>Voyage Covenant and rental terms</h1>
        <p>Version 1.0, effective 16 July 2026. These terms apply to every voyage aboard the ReGen Ship. The agreement is between the Church of the Regenerative Earth, also doing business as ReGen Civics, and the person who books plus every approved driver and guest aboard.</p>
        <h2>The voyage at a glance</h2>
        <ul>
          <li><strong>Voyage window.</strong> Monday 5pm to Monday 11am. Whole weeks, chain up to four.</li>
          <li><strong>Travel radius.</strong> 500 miles from Ashland, up to 1,250 miles on a four-week sail. Farther needs written permission first.</li>
          <li><strong>Miles included.</strong> 1,000 road miles, then 50 cents a mile.</li>
          <li><strong>Drivers.</strong> 25 or older, licensed, approved on Outdoorsy. Never drive after cannabis.</li>
          <li><strong>Crew size.</strong> Up to 4 aboard, or 5 when at least 3 are children.</li>
          <li><strong>Clean vessel.</strong> Meat, alcohol and smoke free inside, the whole voyage, unless agreed otherwise.</li>
          <li><strong>Pets.</strong> Not allowed as a rule. Exceptions need written approval and a pet fee.</li>
          <li><strong>Security deposit.</strong> 1,500 US dollars, refundable, held on Outdoorsy and returned after inspection.</li>
          <li><strong>Late return.</strong> 50 dollars an hour for the first 12 hours, then 600 dollars a day.</li>
          <li><strong>Her quirks.</strong> Rented as she is. A 2006; the leveling jacks are partly manual.</li>
        </ul>
        <p>The box above is the quick read. The full agreement on the page is what governs, and it should be read before sailing. Booking and current rates are at <a href="/ship/book">book a voyage</a>.</p>
      </article>
    `,
  },

  "/ship/guide": {
    html: `
      <article>
        <h1>The voyage guide: everything you need to sail her well</h1>
        <h2>Before you arrive</h2>
        <p>Pack light and pack clean. The Ship stocks her own soaps, cleaning materials, linens, towels and cookware, so most of that can stay at home. Bring clothes, a food plan and an open week. Read the water doctrine before packing a single toiletry, because it shapes what can and cannot come aboard.</p>
        <h2>The two-hour orientation</h2>
        <p>Every first-time crew starts with a two-hour orientation with the Ship Keeper: a walk of the whole ship, her systems hands-on, and the water doctrine, driving and turnover. Nothing in it is hard. The orientation is how it becomes second nature before you pull away.</p>
        <h2>Driving her: you are the captain</h2>
        <p>She is 40 feet long. The ship language exists to break the "just another car" mindset, because that mindset is dangerous in an RV. Wide turns, steer toward the center. The driver must be 25 or older, hold a valid license, be verified before the voyage, and be capable of driving a 40-foot vehicle on the chosen route. Staying on main roads and using the bikes around towns is strongly advised.</p>
        <p><strong>MCS: Mindful, Careful, Slow.</strong> Mindful is your full mind aware and present. Careful is your heart centered: never take the captain's seat angry, anxious or overwhelmed. Slow is taking it easy, because an accident causes far more traffic than going gently ever will.</p>
        <p><strong>The cannabis rule, plainly.</strong> She sails Oregon, Washington and California, where the sacrament is legal, and driving after partaking is never okay. You are liable for damages and the insurance deductible. Arrive, set up fully, confirm the Ship will not move again that day, and then enjoy what you enjoy.</p>
        <h2>Her quirks, honestly</h2>
        <p>She is twenty-plus years old and has the quirks of any ship her age. One leveling jack currently needs manual operation, and the jacks are a comfort rather than a requirement. Quirks like these are exactly why the trial year is discounted.</p>
        <p>See the <a href="/ship/terms">Voyage Covenant and rental terms</a> and <a href="/ship/book">open weeks and rates</a>.</p>
      </article>
    `,
  },

  "/custom-games": {
    html: `
      <article>
        <h1>Custom Games: a coordination game for your land project</h1>
        <p>A complete coordination game for a community, built on the same foundation as Amora and owned outright by the project running it. Three to five projects per season.</p>
        <h2>Who it is for</h2>
        <p><strong>Founders</strong> starting a land project who want clear agreements from day one: who decides, how money flows, how new people come in, written down and playable. <strong>Investors</strong> putting money into a land project who want a live window into decisions, money and progress without chasing anyone for updates.</p>
        <h2>The problem it addresses</h2>
        <p>Land projects fail on coordination long before they fail on permaculture. The soil improves, the gardens go in, and the project still unravels: coordination breaks first, then money opacity, then burnout in the two people carrying everything.</p>
        <p>Without a structure that can hold new people, every person who joins adds weight to the same two or three who carry the risk. More members should mean more capacity; instead it means more to hold, more to explain, more to chase. Structure is what turns willing people into contributing people, so the work spreads and the founders stop being the single point of failure.</p>
        <h2>Running in production</h2>
        <p>Amora is a regenerative village rising in Costa Rica and the first client. Their game runs today: four paths into the village, quests with consent-based crediting, a Gratitude currency, twelve stages of growth, a living map where every building traces back to a funded build or a claimed quest, and Maia, their own AI guide.</p>
        <p>See <a href="/network">the games already in the network</a>, or <a href="/season2">Season Two</a>, which is the route in for projects that want the structure before the software.</p>
      </article>
    `,
  },

  // No "/loi" here on purpose. One landed on main first (see the entry above,
  // near the other fund pages) and it is the better of the two: it builds every
  // sentence from COOP in shared/fund.ts, so the cooperative's disclaimers
  // cannot drift between the page and the crawler. Mine hardcoded the same
  // sentences, which is exactly the drift that constants module exists to
  // prevent. Two lanes wrote this route on the same day and the duplicate key
  // failed CI with TS1117.

  "/calculator": {
    html: `
      <article>
        <h1>Contribution calculator: nine forms of capital</h1>
        <p>A tool for estimating the value of a contribution across the nine forms of capital, so a contribution that is not money can still be counted.</p>
        <p><strong>It is experimental, and the figures are not guaranteed rewards.</strong> The values are estimates to help someone think through their contributions holistically. It is impossible to fully quantify the intangible, and the argument for the tool is that if everyone uses the same one the results are more equitable. The calculator itself is evolved by proposals through the game.</p>
        <h2>What it counts</h2>
        <p>Financial capital covers direct contribution, funds raised or facilitated, revenue generated and costs saved, each with its own crediting standard. The other eight forms of capital are stepped through in turn, and a running total is carried across all nine.</p>
        <p>Once a value is calculated, a proposal is submitted on Hypha. See <a href="/game-mechanics">game mechanics</a> for how contribution is valued in the wider game. Help given through a land project's crowdpooling campaign goes through that campaign's page and is recorded in the project's own token.</p>
      </article>
    `,
  },

  "/marketplace": {
    html: `
      <article>
        <h1>The Connection Hub: what you offer and what you need</h1>
        <p>Where regenerators find each other. People share what they can offer the community and what they could use help with, across skills, resources, time, knowledge, land and capital, and can mark themselves as seeking collaborators or looking to join a project.</p>
        <p>Entries are shared from a member profile. Exchange also happens on LocalScale.org, which the hub links out to.</p>
        <p>Related ways to be matched to work: <a href="/bounties">open bounties</a>, <a href="/quest">the quest board</a> and <a href="/play">the player paths</a>.</p>
      </article>
    `,
  },
};

export function getStaticPageContent(reqPath: string): CrawlerContent | null {
  const entry = PAGE_CONTENT[reqPath];
  if (!entry) return null;
  return { bodyHtml: wrapForInjection(entry.html), jsonld: entry.jsonld };
}

// ── Learn hub: rendered from the shared content module ───────────────────────
// The React page (client/src/pages/LearnArticle.tsx) renders the same
// LearnArticle objects. One content source, two renderers, so what GPTBot
// fetches and what a human reads are the same words by construction.

function inlineToHtml(text: string): string {
  return parseInline(text)
    .map((t) =>
      t.type === "link"
        ? `<a href="${escapeHtml(t.href)}">${escapeHtml(t.label)}</a>`
        : escapeHtml(t.value),
    )
    .join("");
}

function sectionToHtml(s: LearnSection): string {
  const paras = (s.paragraphs || []).map((p) => `<p>${inlineToHtml(p)}</p>`).join("\n");
  const bullets = s.bullets?.length
    ? `<ul>${s.bullets.map((b) => `<li>${inlineToHtml(b)}</li>`).join("")}</ul>`
    : "";
  const table = s.table
    ? `<figure>
        <table>
          <caption>${escapeHtml(s.table.caption)}</caption>
          <thead><tr>${s.table.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>
          <tbody>${s.table.rows
            .map((r) => `<tr>${r.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
            .join("")}</tbody>
        </table>
        <figcaption>Source: ${
          s.table.sourceUrl
            ? `<a href="${escapeHtml(s.table.sourceUrl)}">${escapeHtml(s.table.source)}</a>`
            : escapeHtml(s.table.source)
        }</figcaption>
      </figure>`
    : "";
  const figure = s.figure
    ? `<figure>
        <p><strong>${escapeHtml(s.figure.value)}</strong> ${escapeHtml(s.figure.label)}</p>
        <figcaption>Source: ${
          s.figure.sourceUrl
            ? `<a href="${escapeHtml(s.figure.sourceUrl)}">${escapeHtml(s.figure.source)}</a>`
            : escapeHtml(s.figure.source)
        }</figcaption>
      </figure>`
    : "";
  return `<section>
      <h2>${escapeHtml(s.heading)}</h2>
      ${paras}
      ${bullets}
      ${table}
      ${figure}
    </section>`;
}

function learnArticleHtml(a: LearnArticle): string {
  const related = a.related
    .map((slug) => getLearnArticle(slug))
    .filter((x): x is LearnArticle => Boolean(x));

  return `
    <article>
      <h1>${escapeHtml(a.title)}</h1>
      <p><strong>${escapeHtml(stripInline(a.answer))}</strong></p>
      <p>By ${escapeHtml(a.author)}, ${escapeHtml(a.authorTitle)}.
        Published <time datetime="${a.published}">${a.published}</time>.
        Updated <time datetime="${a.updated}">${a.updated}</time>.</p>
      ${a.sections.map(sectionToHtml).join("\n")}
      <section>
        <h2>Questions people ask</h2>
        ${a.faqs.map((f) => `<h3>${escapeHtml(f.question)}</h3><p>${escapeHtml(f.answer)}</p>`).join("\n")}
      </section>
      <section>
        <h2>Next step</h2>
        <ul>${a.nextSteps
          .map(
            (n) =>
              `<li><a href="${escapeHtml(n.href)}">${escapeHtml(n.label)}</a>: ${escapeHtml(n.blurb)}</li>`,
          )
          .join("")}</ul>
      </section>
      ${
        related.length
          ? `<section><h2>Related</h2><ul>${related
              .map((r) => `<li><a href="/learn/${r.slug}">${escapeHtml(r.title)}</a></li>`)
              .join("")}</ul></section>`
          : ""
      }
    </article>
  `;
}

function learnArticleJsonLd(a: LearnArticle): object {
  const url = `${SITE}/learn/${a.slug}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: a.title,
        description: stripInline(a.answer),
        url,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        author: { "@type": "Person", name: a.author, jobTitle: a.authorTitle },
        datePublished: a.published,
        dateModified: a.updated,
        publisher: {
          "@type": "Organization",
          name: "ReGen Civics",
          url: SITE,
        },
        about: a.related.map((slug) => ({ "@type": "Thing", name: slug.replace(/-/g, " ") })),
      },
      {
        // Anchored to this URL so it wins over the shell's site-wide FAQPage,
        // which is scoped to the homepage in client/index.html.
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        url,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        name: a.title,
        mainEntity: a.faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "ReGen Civics", item: SITE },
          { "@type": "ListItem", position: 2, name: "Learn", item: `${SITE}/learn` },
          { "@type": "ListItem", position: 3, name: a.title, item: url },
        ],
      },
    ],
  };
}

function getLearnIndexContent(): CrawlerContent {
  const inner = `
    <article>
      <h1>Learn: practical answers for land projects and communities</h1>
      <p>Plain answers to the questions people ask before starting a community, funding a land project, or choosing how a group makes decisions. Written from what we run: a 13-week incubator for regenerative land projects, crowdpooling that accounts for what people bring to them, and a game that tracks contribution across nine forms of capital.</p>
      <ul>
        ${LEARN_ARTICLES.map(
          (a) =>
            `<li><a href="/learn/${a.slug}">${escapeHtml(a.title)}</a>: ${escapeHtml(stripInline(a.answer))}</li>`,
        ).join("\n")}
      </ul>
      <p>Start with <a href="/apply">the incubator</a>, <a href="/crowd-pooling">crowdpooling</a>, or <a href="/community">the community forum</a>.</p>
    </article>
  `;
  return {
    title: "Learn: Land, Community, Funding, Governance | ReGen Civics",
    description:
      "Practical answers on starting a community on your land, intentional community structures and funding, ecovillages, governance models, crowd pooling, and the nine forms of capital.",
    bodyHtml: wrapForInjection(inner),
    jsonld: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "ReGen Civics Learn",
      url: `${SITE}/learn`,
      description:
        "Answer-first guides for land stewards, community founders, and funders of regenerative projects.",
      hasPart: LEARN_ARTICLES.map((a) => ({
        "@type": "Article",
        headline: a.title,
        url: `${SITE}/learn/${a.slug}`,
        description: stripInline(a.answer),
        datePublished: a.published,
        dateModified: a.updated,
        author: { "@type": "Person", name: a.author },
      })),
    },
  };
}

function getLearnContent(slug: string): CrawlerContent | null {
  const article = getLearnArticle(slug);
  if (!article) return null;
  return {
    title: `${article.metaTitle} | ReGen Civics`,
    description: article.metaDescription,
    bodyHtml: wrapForInjection(learnArticleHtml(article)),
    jsonld: learnArticleJsonLd(article),
  };
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
      const [authors, cats] = await Promise.all([
        db.getUsersByIds(authorIds),
        db.listForumCategories(),
      ]);
      const categorySlug = cats.find((c) => c.id === post.categoryId)?.slug;
      const team = landProjectTeamAttribution(categorySlug);
      const authorName = (uid: number) => authors[uid]?.name || "Anonymous";
      const postAuthorName = team?.authorName || authorName(post.authorId);
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
          <p>Posted by ${escapeHtml(postAuthorName)} in the ReGen Civics community forum.</p>
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
        author: team
          ? { "@type": "Organization", name: TEAM_USER_NAME }
          : jsonLdAuthor(authors[post.authorId]),
        datePublished: iso(post.createdAt),
        commentCount: replies.length,
        comment: replies.slice(0, 50).map((r) => ({
          "@type": "Comment",
          text: r.content.slice(0, 1000),
          author: jsonLdAuthor(authors[r.authorId]),
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

// ── Project pages: DB-driven, cached ────────────────────────────────────────
// /project/:key is the campaign page (build spec 2026-09-25, section 8.8).
// Keyed by the requested key; any slug for one id resolves to the same page,
// and canonicalPath names the real one.
const PROJECT_CACHE_TTL_MS = 10 * 60 * 1000;
const PROJECT_CACHE_MAX = 200;
const projectCache = new Map<string, { at: number; value: CrawlerContent | null }>();

/** Stored campaign text is entity-encoded once (sanitizeInput): decode, then escape. */
function plain(s: string | null | undefined): string {
  return decodeBasicEntities(String(s ?? "")).trim();
}

export async function getProjectContent(key: string): Promise<CrawlerContent | null> {
  const cached = projectCache.get(key);
  if (cached && Date.now() - cached.at < PROJECT_CACHE_TTL_MS) return cached.value;

  let value: CrawlerContent | null = null;
  try {
    // Loaded on demand: the page read pulls in the campaigns router, which
    // the static and Learn routes never need.
    const { resolvePublicProjectPage } = await import("../lib/project-page");
    const page = await resolvePublicProjectPage(key);
    if (page) {
      const name = plain(page.project.name) || "Land project";
      const place = [plain(page.project.location), plain(page.project.country)].filter(Boolean).join(", ");
      const url = `${SITE}${page.canonicalPath}`;
      const front = page.front;

      let campaignHtml = "";
      let openLine: string | null = null;
      let descText = "";
      if (front) {
        const lines = progressLines(front.progress, serverCurrencyFormatter(front.currency));
        openLine = lines.open;
        descText = plain(front.description).replace(/\s+/g, " ");
        const open = front.items
          .filter((it) => {
            const np = front.progress.byNeed[it.id];
            return np && !np.filled && needVerb(kindForItem(it)) !== null;
          })
          .slice(0, 12)
          .map((it) => {
            const np = front.progress.byNeed[it.id];
            return `<li>${escapeHtml(`${needVerb(kindForItem(it))}: ${plain(needTitle(it))} (${np.status.text})`)}</li>`;
          });
        campaignHtml = `
          <h2>${escapeHtml(plain(front.title))}</h2>
          ${textToHtml(plain(front.description))}
          <p>${escapeHtml(lines.inKind)}</p>
          <p>${escapeHtml(lines.money)}</p>
          ${lines.open ? `<p>${escapeHtml(lines.open)}</p>` : ""}
          ${open.length ? `<h2>What this project needs</h2><ul>${open.join("")}</ul>` : ""}
        `;
      }

      const inner = `
        <article>
          <h1>${escapeHtml(name)}</h1>
          ${place ? `<p>${escapeHtml(place)}</p>` : ""}
          ${campaignHtml}
        </article>
      `;

      const jsonld = {
        "@context": "https://schema.org",
        "@type": "Project",
        name,
        ...(descText ? { description: descText.slice(0, 2000) } : {}),
        url,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        ...(place ? { location: { "@type": "Place", name: place } } : {}),
        publisher: { "@type": "Organization", name: "ReGen Civics", url: SITE },
      };

      const description = [openLine, descText].filter(Boolean).join(" ").slice(0, 160);
      value = {
        title: `Contribute to ${name} | ReGen Civics`,
        ...(description ? { description } : {}),
        bodyHtml: wrapForInjection(inner),
        jsonld,
        canonicalPath: page.canonicalPath,
      };
    }
  } catch (err) {
    console.warn(`[crawler-content] project page render failed:`, (err as Error)?.message);
    value = null;
  }

  // Simple bounded cache: evict oldest entry when full.
  if (projectCache.size >= PROJECT_CACHE_MAX) {
    const oldest = projectCache.keys().next().value;
    if (oldest !== undefined) projectCache.delete(oldest);
  }
  projectCache.set(key, { at: Date.now(), value });
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
// ── /schedule: the dated sessions ────────────────────────────────────────────
// The highest-value route on the site for an agent, and it was blank to one.
//
// The phase -2 baseline asked four models and ChatGPT the four funnel
// questions, 36 answers in total, and not one came back with a date. A
// specific dated session is the only object an agent can put on a calendar and
// set a reminder for; "explore our ecosystem" is not. The sessions have been
// in production for humans the whole time.
//
// Built from the events table rather than hand-written, because a hand-written
// date is wrong the week after it is written, and a stale date sends a
// stranger to a call that already happened. Future events only.
const SCHEDULE_CACHE_TTL_MS = 10 * 60 * 1000;
let scheduleCache: { at: number; value: CrawlerContent | null } | null = null;

const SESSION_KIND: Record<string, string> = {
  open: "Open Access Session",
  episode: "Season Two episode",
  special: "Special session",
};

export async function getScheduleContent(): Promise<CrawlerContent | null> {
  if (scheduleCache && Date.now() - scheduleCache.at < SCHEDULE_CACHE_TTL_MS) {
    return scheduleCache.value;
  }

  let value: CrawlerContent | null = null;
  try {
    const rows = await db.getUpcomingEventsSnapshot(12);
    const url = `${SITE}/schedule`;

    const dated = rows.map((e) => {
      const start = new Date(e.startTime as unknown as string);
      const kind = SESSION_KIND[e.type] ?? "Session";
      const episode =
        e.type === "episode" && e.episodeNumber
          ? ` (${e.season ? `${e.season}, ` : ""}episode ${e.episodeNumber})`
          : "";
      // Spelled out as well as ISO. A model reading prose lifts the readable
      // form; a model reading JSON-LD takes the ISO one. Both are the same
      // instant, and the timezone is named so neither has to guess.
      const readable = start.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
      const time = start.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
      });
      return { e, start, kind, episode, readable, time };
    });

    const items = dated
      .map(
        ({ e, kind, episode, readable, time }) => `
        <section>
          <h3>${escapeHtml(e.title)}${escapeHtml(episode)}</h3>
          <p><strong>${escapeHtml(kind)}.</strong> ${escapeHtml(readable)} at ${escapeHtml(time)} UTC.</p>
          ${e.description ? textToHtml(e.description) : ""}
          <p><a href="${SITE}/schedule">Register on the schedule page</a>.</p>
        </section>`,
      )
      .join("\n");

    const next = dated[0];
    const lead = next
      ? `The next session is ${escapeHtml(next.e.title)} on ${escapeHtml(next.readable)} at ${escapeHtml(next.time)} UTC.`
      : `No sessions are currently scheduled. New dates are posted here and in the newsletter.`;

    const inner = `
      <article>
        <h1>Upcoming ReGen Civics sessions</h1>
        <p>${lead} Sessions are open calls anyone can join: Open Access Sessions run monthly, and Season Two episodes run weekly through the incubator cohort. Attending one is the lowest-commitment way to meet the people involved, and nothing is asked of you beforehand.</p>
        <h2>The schedule</h2>
        ${items || "<p>Nothing scheduled right now.</p>"}
        <p>If none of these work, <a href="${SITE}/newsletter">the newsletter</a> carries the next dates, and <a href="${SITE}/community">the forum</a> is open to read without an account.</p>
      </article>
    `;

    // One Event node per session. This is the object a browsing agent extracts
    // to offer "add to calendar", and the reason this route was prioritised.
    const jsonld = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Upcoming ReGen Civics sessions",
      url,
      numberOfItems: dated.length,
      itemListElement: dated.map(({ e, start, kind }, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Event",
          name: e.title,
          description: e.description ?? kind,
          startDate: start.toISOString(),
          ...(e.endTime
            ? { endDate: new Date(e.endTime as unknown as string).toISOString() }
            : {}),
          eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
          eventStatus: "https://schema.org/EventScheduled",
          // The join url is deliberately the schedule page, never the raw
          // meeting link: an agent that hands a stranger a live Zoom url has
          // routed round every gate the registration step exists to provide.
          location: { "@type": "VirtualLocation", url },
          organizer: { "@type": "Organization", name: "ReGen Civics", url: SITE },
        },
      })),
    };

    value = { title: "Upcoming sessions", bodyHtml: wrapForInjection(inner), jsonld };
  } catch {
    value = null;
  }

  scheduleCache = { at: Date.now(), value };
  return value;
}

// ── /campaigns and /bounties: the two list routes ────────────────────────────
// Built from rows rather than written as prose, for the same reason /schedule
// is. A hand-written sentence about "active campaigns" goes stale the week a
// campaign closes, and a stale listing sends someone at something that is over.
// The rows are already public on the rendered page; this puts them where an
// agent that does not run JavaScript can read them.
//
// Both are deliberately thin. Only what a person needs to decide whether to
// look further, and a link to the page that holds the rest. No contact
// details, no internal ids.
const LIST_CACHE_TTL_MS = 10 * 60 * 1000;
const listCache = new Map<string, { at: number; value: CrawlerContent | null }>();

async function cachedList(
  key: string,
  build: () => Promise<CrawlerContent | null>,
): Promise<CrawlerContent | null> {
  const hit = listCache.get(key);
  if (hit && Date.now() - hit.at < LIST_CACHE_TTL_MS) return hit.value;
  let value: CrawlerContent | null = null;
  try {
    value = await build();
  } catch {
    value = null;
  }
  listCache.set(key, { at: Date.now(), value });
  return value;
}

/** ItemList wrapper, the shape a browsing agent extracts a listing from. */
function itemList(name: string, url: string, items: object[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item,
    })),
  };
}

export async function getCampaignsListContent(): Promise<CrawlerContent | null> {
  return cachedList("campaigns", async () => {
    const rows = await db.listCampaigns("active");
    const url = `${SITE}/campaigns`;

    const money = (n: unknown, currency: string | null) => {
      const v = Number(n ?? 0);
      if (!Number.isFinite(v) || v <= 0) return null;
      return `${currency || "USD"} ${v.toLocaleString("en-US")}`;
    };

    const sections = rows
      .map((c: any) => {
        const target = money(c.financialTarget, c.currency);
        const pledged = money(c.pledgedTotal, c.currency);
        const where = c.location ? ` in ${escapeHtml(c.location)}` : "";
        // Pledged is stated only alongside the target. A raised figure with
        // nothing to compare it to reads as bigger or smaller than it is.
        const progress =
          target && pledged ? `<p>Pledged so far: ${escapeHtml(pledged)} of ${escapeHtml(target)}.</p>` : target ? `<p>Target: ${escapeHtml(target)}.</p>` : "";
        return `
        <section>
          <h3><a href="${SITE}/campaign/${c.id}">${escapeHtml(c.title ?? c.projectName ?? "Campaign")}</a></h3>
          <p>${escapeHtml(c.projectName ?? "")}${where}.</p>
          ${c.description ? textToHtml(String(c.description).slice(0, 600)) : ""}
          ${progress}
        </section>`;
      })
      .join("\n");

    const lead = rows.length
      ? `${rows.length} land project ${rows.length === 1 ? "campaign is" : "campaigns are"} open for contributions right now.`
      : `No campaigns are open for contributions right now. New ones are announced in the newsletter and at the open sessions.`;

    const inner = `
      <article>
        <h1>Land project campaigns open for contributions</h1>
        <p>${lead} Crowd pooling means a campaign accepts land, money, equipment, skills, time and knowledge, not money alone, so there is a way in that does not depend on what you can spend. Each campaign below links to its own page with the full detail.</p>
        ${sections || ""}
        <p>How an offer works, and a map of what you could bring: <a href="${SITE}/crowd-pooling">crowd pooling</a>. Every open need: <a href="${SITE}/campaigns?tab=needs">the Needs tab</a>. Next dated call: <a href="${SITE}/schedule">the schedule</a>.</p>
      </article>
    `;

    const jsonld = itemList(
      "Land project campaigns open for contributions",
      url,
      rows.map((c: any) => ({
        "@type": "Project",
        name: c.title ?? c.projectName ?? "Campaign",
        description: c.description ? String(c.description).slice(0, 300) : undefined,
        url: `${SITE}/campaign/${c.id}`,
        ...(c.location ? { location: { "@type": "Place", name: c.location } } : {}),
      })),
    );

    return { title: "Land project campaigns", bodyHtml: wrapForInjection(inner), jsonld };
  });
}

export async function getBountiesListContent(): Promise<CrawlerContent | null> {
  return cachedList("bounties", async () => {
    const rows = await db.getOpenBountiesSnapshot(15);
    const url = `${SITE}/bounties`;

    const sections = rows
      .map((b: any) => {
        const tier = b.tier ? `<p>Tier: ${escapeHtml(String(b.tier))}.</p>` : "";
        return `
        <section>
          <h3>${escapeHtml(b.title ?? "Bounty")}</h3>
          ${b.body ? textToHtml(String(b.body).slice(0, 500)) : ""}
          ${tier}
        </section>`;
      })
      .join("\n");

    const lead = rows.length
      ? `${rows.length} ${rows.length === 1 ? "bounty is" : "bounties are"} open for claiming.`
      : `No bounties are open right now. New ones are posted as the work appears.`;

    const inner = `
      <article>
        <h1>Open bounties: paid work in the Infinite Game</h1>
        <p>${lead} A bounty is a named piece of work the community needs, with a token reward attached. Bounties can be browsed without an account, and most can be done remotely, so this is one of the ways to contribute without relocating.</p>
        ${sections || ""}
        <p>How valuation works is published at <a href="${SITE}/game-mechanics">game mechanics</a>. Other ways in that need no relocation: <a href="${SITE}/play">the player paths</a> and <a href="${SITE}/quest">the quest board</a>.</p>
      </article>
    `;

    const jsonld = itemList(
      "Open bounties",
      url,
      rows.map((b: any) => ({
        "@type": "CreativeWork",
        name: b.title ?? "Bounty",
        description: b.body ? String(b.body).slice(0, 300) : undefined,
        url,
      })),
    );

    return { title: "Open bounties", bodyHtml: wrapForInjection(inner), jsonld };
  });
}

// The legal pages are NOT served here, and that is a finding rather than an
// omission. See docs/agent-surface/LEGAL-PAGES-BLOCKED.md.
//
// scripts/extract-legal-content.mjs works and pulled 31 KB of verbatim policy
// text out of the four components. Wiring it up failed the fund-claims guard,
// which is right: the pages describe a Regulation D offering to accredited  fund-claims-allow: naming the retired claim is the whole point of this note; see docs/agent-surface/LEGAL-PAGES-BLOCKED.md
// investors, with a Private Placement Memorandum, preferred returns, token
// listings and secondary markets. On 2026-09-27 the fund became a cooperative
// in design, and that guard exists because "a purchasing cooperative keeps its
// bought-for-use footing only while nothing in the funnel promises upside".
//
// Publishing those pages to agents would re-assert, in the most quotable place
// on the site, the securities story the project retired the day before. The
// pages need rewriting by Rye and counsel first; the extractor is ready for
// them the moment they do.

/**
 * /community/guidelines: the community agreements, from rows.
 *
 * Built from the table rather than written, because the page says in its own
 * words that these "evolve as the community does": they are proposed and voted
 * on, so a frozen copy would be a promise the community did not make. Only
 * active agreements are listed, for the same reason.
 */
export async function getGuidelinesContent(): Promise<CrawlerContent | null> {
  return cachedList("guidelines", async () => {
    const rows = await db.listCommunityAgreements("votes", "active", 50);
    const url = `${SITE}/community/guidelines`;

    const byCategory = new Map<string, any[]>();
    for (const r of rows as any[]) {
      const key = r.category || "General";
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key)!.push(r);
    }

    const sections = [...byCategory.entries()]
      .map(
        ([category, items]) => `
        <section>
          <h2>${escapeHtml(category)}</h2>
          ${items
            .map(
              (a) => `
          <h3>${escapeHtml(a.title ?? "")}</h3>
          ${a.description ? textToHtml(String(a.description)) : ""}`,
            )
            .join("\n")}
        </section>`,
      )
      .join("\n");

    const lead = rows.length
      ? `${rows.length} ${rows.length === 1 ? "agreement is" : "agreements are"} active.`
      : `No agreements are active yet.`;

    const inner = `
      <article>
        <h1>Community agreements</h1>
        <p>The Gathering Grove is a space for people building a regenerative world, and these agreements keep it honest, generous and worth showing up for. ${lead} They evolve as the community does: anyone signed in can propose a change, and the community votes.</p>
        ${sections}
        <p>The forum is open to read without an account: <a href="${SITE}/community">the Gathering Grove</a>.</p>
      </article>
    `;

    const jsonld = itemList(
      "Community agreements",
      url,
      (rows as any[]).map((a) => ({
        "@type": "CreativeWork",
        name: a.title ?? "",
        description: a.description ? String(a.description).slice(0, 300) : undefined,
        url,
      })),
    );

    return { title: "Community agreements", bodyHtml: wrapForInjection(inner), jsonld };
  });
}

export async function resolveCrawlerContent(reqPath: string): Promise<CrawlerContent | null> {
  if (reqPath === "/schedule") return getScheduleContent();
  if (reqPath === "/community/guidelines") return getGuidelinesContent();
  if (reqPath === "/campaigns") return getCampaignsListContent();
  if (reqPath === "/bounties") return getBountiesListContent();
  if (reqPath === "/learn") return getLearnIndexContent();
  const learnMatch = reqPath.match(/^\/learn\/([a-z0-9-]+)$/);
  if (learnMatch) return getLearnContent(learnMatch[1]);
  const projectMatch = reqPath.match(/^\/project\/([a-z0-9-]+)$/);
  if (projectMatch) return getProjectContent(projectMatch[1]);
  const forumMatch = reqPath.match(/^\/community\/post\/(\d+)$/);
  if (forumMatch) return getForumPostContent(Number(forumMatch[1]));
  if (reqPath === "/network") return getNetworkPageContent();
  return getStaticPageContent(reqPath);
}
