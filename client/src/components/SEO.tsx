/**
 * SEO Component
 * Manages page-specific meta tags, Open Graph, and Twitter cards
 */

import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'wouter';
import { schemas } from "@/components/JsonLD";
import { FUND } from "@shared/fund";

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  author?: string;
  publishedTime?: string;
  breadcrumbs?: Array<{ name: string; url: string }>;
  noIndex?: boolean;
}

const BASE_URL = 'https://regencivics.earth';
const DEFAULT_IMAGE = `${BASE_URL}/og-default.jpg`;
const SITE_NAME = 'ReGen Civics Alliance';

export function SEO({
  title,
  description,
  keywords,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  author,
  publishedTime,
  breadcrumbs,
  noIndex = false,
}: SEOProps) {
  const [location] = useLocation();
  const effectiveUrl = url ?? location;
  const fullTitle = title.includes('ReGen Civics') ? title : `${title} | ReGen Civics`;
  const fullUrl = effectiveUrl.startsWith('http') ? effectiveUrl : `${BASE_URL}${effectiveUrl}`;
  const fullImage = image.startsWith('http') ? image : `${BASE_URL}${image}`;

  useLayoutEffect(() => {
    // Update document title
    document.title = fullTitle;

    // Helper to update or create meta tag
    const setMetaTag = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attr}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Basic meta tags
    setMetaTag('description', description);
    if (keywords) setMetaTag('keywords', keywords);
    if (author) setMetaTag('author', author);

    // OG/Twitter image alt: derive from title so screen readers and
    // accessibility-aware crawlers (Mastodon, LinkedIn share previews) get
    // descriptive text instead of an unannounced image.
    const imageAlt = `${fullTitle} preview image`;

    // Open Graph tags
    setMetaTag('og:title', fullTitle, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:image', fullImage, true);
    setMetaTag('og:image:width', '1200', true);
    setMetaTag('og:image:height', '630', true);
    setMetaTag('og:image:alt', imageAlt, true);
    setMetaTag('og:url', fullUrl, true);
    setMetaTag('og:type', type, true);
    setMetaTag('og:site_name', SITE_NAME, true);
    setMetaTag('og:locale', 'en_US', true);

    // Twitter Card tags
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', fullTitle);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', fullImage);
    setMetaTag('twitter:image:alt', imageAlt);
    setMetaTag('twitter:site', '@ReGenCivics');

    // Additional SEO tags
    setMetaTag('robots', noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    
    // Article-specific tags
    if (type === 'article' && publishedTime) {
      setMetaTag('article:published_time', publishedTime, true);
    }

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', fullUrl);

    // Breadcrumb structured data
    const existingBreadcrumb = document.getElementById('seo-breadcrumb-ld');
    if (existingBreadcrumb) existingBreadcrumb.remove();
    if (breadcrumbs && breadcrumbs.length > 0) {
      const breadcrumbItems = breadcrumbs.map((item) => ({
        name: item.name,
        url: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
      }));
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'seo-breadcrumb-ld';
      // Strict CSP: tag the script with the per-request nonce so the
      // dynamically-created element passes CSP. ld+json is data, not code,
      // but Chromium checks CSP at element creation time regardless.
      const nonce = (window as any).__NONCE__;
      if (nonce) script.setAttribute('nonce', nonce);
      script.textContent = JSON.stringify(schemas.breadcrumb(breadcrumbItems));
      document.head.appendChild(script);
    }

  }, [fullTitle, description, keywords, fullImage, fullUrl, type, author, publishedTime, breadcrumbs]);

  return null;
}

// Page-specific SEO configurations
export const pageSEO = {
  home: {
    title: 'ReGen Civics: Infinite Game for the ReGenerative Renaissance',
    description: 'A fund and a game for regenerative land projects. Do quests, earn tokens, fund real-world regeneration.',
    keywords: 'regenerative investing, impact investing, land projects, ecovillages, sustainable finance, regenerative economy, land-backed investment, community development, ReGenerative Renaissance, infinite game',
    image: `${BASE_URL}/og-default.jpg`,
    url: '/'
  },
  seasons: {
    title: 'Seasons: Join Our Regenerative Journey',
    description: 'Apply for Season 2 of ReGen Civics starting September 2026. Build your regenerative portfolio, connect with land projects, and join the incubator.',
    keywords: 'regenerative season, land project application, regenerative portfolio, impact investment opportunity, ecovillage funding, sustainable land development',
    image: '/og/seasons.jpg',
    url: '/seasons'
  },
  schedule: {
    title: 'Schedule: Community Sessions & Events',
    description: 'Join ReGen Civics community sessions, open calls, and events. Connect with fellow regenerators, learn about our governance model, and participate in the Infinite Game.',
    keywords: 'regenerative community, online events, impact investing community, ecovillage network, sustainable finance events',
    image: '/og/schedule.jpg',
    url: '/schedule'
  },
  game: {
    title: 'The Game: How ReGen Civics Works',
    description: 'An infinite game with no finish line. A growing civilization we\'re building together. Here\'s how the ReGen Civics game works.',
    keywords: 'regenerative game, token economy, DAO governance, contribution tracking, regenerative tokens, impact rewards',
    image: '/og/game.jpg',
    url: '/game'
  },
  quest: {
    title: 'Quests: Regenerative Actions & Rewards',
    description: 'Quests are how you participate. Each one moves healing into the world: your body, your land, your community. Earn rewards doing the work that actually matters.',
    keywords: 'regenerative quests, impact actions, earn tokens, food forest, gut health, regenerative lifestyle, sustainable living',
    image: '/og/quest.jpg',
    url: '/quest'
  },
  team: {
    title: 'Team: Join Our Dynamic Organization',
    description: 'A distributed team working to make the ReGenerative Renaissance real. Meet the people behind ReGen Civics.',
    keywords: 'regenerative team, join DAO, regenerative ikigai, impact careers, sustainable jobs, regenerative organization',
    image: '/og/team.jpg',
    url: '/team'
  },
  opportunity: {
    title: 'Investment Thesis: the ReGen Civics Fund, in formation',
    description: `${FUND.statementShort} Read the thesis and the proposed terms.`,
    keywords: 'regenerative investment, impact fund, land investment, sustainable investing, ESG investment, regenerative agriculture investment',
    image: '/og/opportunity.jpg',
    url: '/opportunity'
  },
  socials: {
    title: 'Connect: Social Media & Community',
    description: 'Connect with ReGen Civics across social platforms. Join our Discord, follow us on Twitter, subscribe to our YouTube, and stay updated on the ReGenerative Renaissance.',
    keywords: 'regenerative community, discord server, twitter, youtube, social media, regenerative network',
    image: `${BASE_URL}/og-default.jpg`,
    url: '/socials'
  },
  apply: {
    title: 'Apply: Land Project Application | ReGen Civics',
    description: 'Apply to bring your regenerative land project into the ReGen Civics ecosystem. Season 2 applications open now for September 2026.',
    keywords: 'land project application, regenerative project funding, ecovillage application, sustainable land development, regenerative community application',
    image: '/og/seasons.jpg',
    url: '/apply'
  },
  loi: {
    title: 'Letter of Intent | ReGen Civics',
    description: `Submit a non-binding Letter of Intent for the ${FUND.name}, which is in formation. It carries no obligation.`,
    keywords: 'letter of intent, investment commitment, regenerative fund, impact investing, accredited investor',
    image: '/og/opportunity.jpg',
    url: '/loi'
  },
  connect: {
    title: 'Connect With Us | ReGen Civics',
    description: 'Get in touch with the ReGen Civics team. Whether you\'re an investor, land project, alliance partner, or player, we want to hear from you.',
    keywords: 'contact regenerative fund, impact investing contact, regenerative community, partnership inquiry',
    image: 'https://regencivics.earth/og/connect.jpg',
    url: '/connect'
  },
  map: {
    title: 'Global Project Map | ReGen Civics',
    description: 'Land projects, alliance orgs, and players mapped across the world. See where regeneration is happening right now.',
    keywords: 'regenerative projects map, ecovillage locations, sustainable communities, global regeneration, land project directory',
    image: 'https://regencivics.earth/og/map.jpg',
    url: '/map'
  },
  fund: {
    title: 'The ReGen Civics Fund | Regenerative Land Investment',
    description: 'ReGen Civics runs a venture fund for regenerative land projects. Real land, diversified portfolio, community governed. Season 2 starts September 2026.',
    keywords: 'regenerative fund, land investment, impact fund, regenerative capital, crowd-pooling, land project funding',
    image: 'https://regencivics.earth/og/fund.jpg',
    url: '/fund'
  },
  crowdPooling: {
    title: 'Crowd Pooling Tool | ReGen Civics',
    description: 'Pool capital with aligned investors to fund regenerative land projects. Coordinated impact, land-backed, and community governed.',
    keywords: 'crowd pooling, regenerative investing, pool capital, land project funding, collaborative investment',
    image: 'https://regencivics.earth/og/crowd-pooling.jpg',
    url: '/crowd-pooling'
  },
  crowdPoolingProjects: {
    title: 'Land Project Campaigns | ReGen Civics Crowd Pooling',
    description: 'Browse active crowd pooling campaigns from regenerative land projects. Find projects aligned with your values and contribute directly.',
    keywords: 'land project campaigns, crowd pooling projects, regenerative investment campaigns, ecovillage funding',
    image: 'https://regencivics.earth/og/crowd-pooling.jpg',
    url: '/crowd-pooling-projects'
  },
  riskDisclosure: {
    title: 'Risk Disclosure | ReGen Civics',
    description: `Full risk disclosure for the ${FUND.name}. Understand the risks of investing in regenerative land projects and alliance organizations.`,
    keywords: 'investment risk disclosure, regenerative fund risks, impact investing risks, land investment risks',
    image: '/og/opportunity.jpg',
    url: '/risk-disclosure'
  },
  termsOfUse: {
    title: 'Terms of Use | ReGen Civics',
    description: 'Terms of Use for the ReGen Civics website and platform. Please review these terms carefully before using our services.',
    keywords: 'terms of use, terms of service, legal terms, website terms',
    image: `${BASE_URL}/og-default.jpg`,
    url: '/terms-of-use'
  },
  privacyPolicy: {
    title: 'Privacy Policy | ReGen Civics',
    description: 'Privacy Policy for ReGen Civics. Learn how we collect, use, and protect your personal information.',
    keywords: 'privacy policy, data protection, personal information, GDPR compliance',
    image: `${BASE_URL}/og-default.jpg`,
    url: '/privacy-policy'
  },
  disclaimers: {
    title: 'Disclaimers | ReGen Civics',
    description: 'Legal disclaimers for the ReGen Civics website and investment materials. This is not an offer to sell securities.',
    keywords: 'legal disclaimers, investment disclaimers, securities disclaimer, not financial advice',
    image: '/og/opportunity.jpg',
    url: '/disclaimers'
  },
  investorForm: {
    title: 'Investor Information | ReGen Civics',
    description: `Explore the ReGen Civics investment thesis. The fund is in formation, target launch ${FUND.launchTarget}.`,
    keywords: 'investor form, accredited investor, regenerative fund application, impact investment inquiry',
    image: '/og/opportunity.jpg',
    url: '/investor-form'
  },
  community: {
    title: 'Community Forum | ReGen Civics',
    description: 'The ReGen Civics forum. Where players, investors, land stewards, and builders connect, coordinate, and tell the truth.',
    keywords: 'regenerative community forum, impact investing discussion, ecovillage community, regenerative economy discussion, land project forum',
    image: '/og/community.jpg',
    url: '/community'
  },
  land: {
    title: 'Land Projects | ReGen Civics',
    description: 'Real land projects doing the hard work of regenerating soil, water, community, and local economy. These are the projects we\'re backing.',
    keywords: 'regenerative land projects, ecovillages, sustainable farms, land-backed investment',
    image: '/og/land.jpg',
    url: '/land'
  },
  bionomics: {
    title: 'Bionomics | ReGen Civics',
    description: 'A living economy modelled on ecosystems. How ReGen Civics builds bioregional value flows that work like mycelium and forests.',
    keywords: 'bionomics, regenerative economy, living systems economics, bioregional finance, ecosystem economics',
    image: '/og/bionomics.jpg',
    url: '/bionomics'
  },
  hymnBook: {
    title: 'Hymn Book | ReGen Civics',
    description: 'Songs of the ReGenerative Renaissance. A growing collection of hymns from the movement.',
    keywords: 'regenerative hymns, hymn book, regenerative music, songs of the renaissance',
    image: '/og/hymn-book.jpg',
    url: '/hymn-book'
  },
  features: {
    title: 'Features & Bug Reports | ReGen Civics',
    description: 'Propose features, report bugs, vote on what matters, and help shape the tools that build the ReGenerative Renaissance.',
    keywords: 'feature suggestions, bug reports, community voting, regenerative platform, product feedback',
    image: '/og/features.jpg',
    url: '/features'
  },
  ally: {
    title: 'Alliance Organizations | ReGen Civics',
    description: 'The alliance organizations co-creating the ReGenerative Renaissance alongside ReGen Civics. A network built on shared values and real collaboration.',
    keywords: 'regenerative alliance, partner organizations, regenerative network',
    image: `${BASE_URL}/og-default.jpg`,
    url: '/ally'
  },
  play: {
    title: 'Players | ReGen Civics',
    description: 'The players inside ReGen Civics. Contributors, builders, and healers doing quests and co-creating the new civilization one action at a time.',
    keywords: 'regenerative players, contributors, regenerative community members',
    image: `${BASE_URL}/og-default.jpg`,
    url: '/play'
  },
  blog: {
    title: 'Blog | ReGen Civics',
    description: 'Writings from the ReGen Civics community. Strategy, stories from land projects, game design notes, and updates from the movement.',
    keywords: 'regenerative blog, land project stories, ReGenerative Renaissance writing',
    image: `${BASE_URL}/og-default.jpg`,
    url: '/blog'
  },
  governance: {
    title: 'Governance | ReGen Civics',
    description: 'Voice-based governance rooted in land and contribution. How ReGen Civics makes decisions, and who has a say.',
    keywords: 'regenerative governance, DAO, voice tokens, community governance',
    image: '/og/governance.jpg',
    url: '/governance'
  },
  calculator: {
    title: 'Contribution Calculator | ReGen Civics',
    description: 'Run the numbers on your crowd pooling contribution and see how your capital compounds with others to fund regenerative land projects.',
    keywords: 'contribution calculator, crowd pooling calculator, regenerative investment calculator',
    image: `${BASE_URL}/og-default.jpg`,
    url: '/calculator'
  },
  showcase: {
    title: 'Community Showcase | ReGen Civics',
    description: 'Artifacts, completions, and creations from the ReGen Civics community. See what players are building, growing, and healing.',
    keywords: 'regenerative showcase, community creations, quest completions, player artifacts',
    image: `${BASE_URL}/og-default.jpg`,
    url: '/showcase'
  },
  messages: {
    title: 'Messages | ReGen Civics',
    description: 'Your messages and conversations within the ReGen Civics community.',
    keywords: 'messages, community chat, regenerative community',
    image: `${BASE_URL}/og-default.jpg`,
    url: '/messages'
  },
  shapeNextSession: {
    title: 'Shape the Next Session | ReGen Civics',
    description: 'Tell us what you want covered and whether you will be there. Help shape the next community session.',
    keywords: 'community session, feedback, regenerative community, session planning',
    image: `${BASE_URL}/og-default.jpg`,
    url: '/shape-next-session'
  },
  marketplace: {
    title: 'Gifts + Needs Marketplace | ReGen Civics',
    description: 'Share your gifts and find what you need. The community marketplace for regenerative projects, skills, and resources.',
    keywords: 'marketplace, gifts, needs, regenerative exchange, community resources',
    image: `${BASE_URL}/og-default.jpg`,
    url: '/marketplace'
  },
  createCampaign: {
    title: 'Create a Campaign | ReGen Civics Crowd Pooling',
    description: 'Launch a crowd pooling campaign for your regenerative land project. Attract aligned investors and build community support.',
    keywords: 'create campaign, crowd pooling, regenerative fundraising, land project campaign',
    image: `${BASE_URL}/og-default.jpg`,
    url: '/create-campaign'
  },
  coCreatorsGuide: {
    title: 'Co-Creators Guide | ReGen Civics',
    description: 'The guide for ReGen Civics co-creators. Roles, expectations, and how to contribute to the ReGenerative Renaissance.',
    keywords: 'co-creators, guide, regenerative community, contributor roles',
    image: `${BASE_URL}/og-default.jpg`,
    url: '/co-creators-guide'
  },
  newsletter: {
    title: 'Newsletter | ReGen Civics',
    description: 'Stay connected with the ReGenerative Renaissance. Monthly updates on land projects, quests, and community milestones.',
    keywords: 'newsletter, regenerative updates, community news',
    image: `${BASE_URL}/og-default.jpg`,
    url: '/newsletter'
  },
  tokenomics: {
    title: 'Tokenomics | ReGen Civics',
    description: 'How the ReGen Civics token system works. Dual-layer governance, contribution tracking, and value flows across the network.',
    keywords: 'tokenomics, token system, governance tokens, regenerative economics',
    image: `${BASE_URL}/og-default.jpg`,
  
    url: '/tokenomics'
  },
  tools: {
    title: 'Regen Civilization Tools Library | ReGen Civics',
    description: 'Every tool the ReGenerative Renaissance needs. Software, hardware, governance, currency, food systems. Describe your challenge, find your tools.',
    keywords: 'regenerative tools, community tools, governance tools, DAO tools, food systems, permaculture tools, open source',
    image: '/og/tools.jpg',
    url: '/tools'
  },
  healTheLand: {
    title: 'Heal the Land, Heal Ourselves | Church of the Regenerative Earth',
    description: 'A community healing ministry offering free food, gardening days, and land residency. For land project sponsors: free Game Building in exchange for hosting the program.',
    keywords: 'land healing, community ministry, regenerative food, gardening days, land residency, regenerative earth, church',
    image: `${BASE_URL}/og-default.jpg`,
    url: '/heal-the-land'
  }
};

export default SEO;
