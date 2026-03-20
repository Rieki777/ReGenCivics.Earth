/**
 * SEO Component
 * Manages page-specific meta tags, Open Graph, and Twitter cards
 */

import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  author?: string;
  publishedTime?: string;
}

const BASE_URL = 'https://regencivics.earth';
const DEFAULT_IMAGE = 'https://assets.regencivics.earth/iZVeEDJwzuNVQLOg.jpg';
const SITE_NAME = 'ReGen Civics Alliance';

export function SEO({
  title,
  description,
  keywords,
  image = DEFAULT_IMAGE,
  url = '',
  type = 'website',
  author,
  publishedTime
}: SEOProps) {
  const fullTitle = title.includes('ReGen Civics') ? title : `${title} | ReGen Civics`;
  const fullUrl = `${BASE_URL}${url}`;
  const fullImage = image.startsWith('http') ? image : `${BASE_URL}${image}`;

  useEffect(() => {
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

    // Open Graph tags
    setMetaTag('og:title', fullTitle, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:image', fullImage, true);
    setMetaTag('og:url', fullUrl, true);
    setMetaTag('og:type', type, true);
    setMetaTag('og:site_name', SITE_NAME, true);
    setMetaTag('og:locale', 'en_US', true);

    // Twitter Card tags
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', fullTitle);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', fullImage);
    setMetaTag('twitter:site', '@ReGenCivics');

    // Additional SEO tags
    setMetaTag('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    
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

  }, [fullTitle, description, keywords, fullImage, fullUrl, type, author, publishedTime]);

  return null;
}

// Page-specific SEO configurations
export const pageSEO = {
  home: {
    title: 'ReGen Civics: Infinite Game for the Regenerative Renaissance',
    description: 'Join the Regenerative Renaissance. ReGen Civics is a venture fund and alliance helping regenerative land projects succeed through capital, governance tools, and a supportive network. Healthier lands = Healthier people = Increasing real world value.',
    keywords: 'regenerative investing, impact investing, land projects, ecovillages, sustainable finance, regenerative economy, land-backed investment, community development, regenerative renaissance, infinite game',
    image: 'https://assets.regencivics.earth/iZVeEDJwzuNVQLOg.jpg',
    url: '/'
  },
  seasons: {
    title: 'Seasons: Join Our Regenerative Journey',
    description: 'Apply for Season 3 of ReGen Civics opening in 2026. Build your regenerative portfolio, connect with land projects, and prepare for fund launch in Late 2026.',
    keywords: 'regenerative season, land project application, regenerative portfolio, impact investment opportunity, ecovillage funding, sustainable land development',
    image: 'https://assets.regencivics.earth/dLRruVvEitjLUEgU.jpg',
    url: '/seasons'
  },
  schedule: {
    title: 'Schedule: Community Sessions & Events',
    description: 'Join ReGen Civics community sessions, open calls, and events. Connect with fellow regenerators, learn about our governance model, and participate in the Infinite Game.',
    keywords: 'regenerative community, online events, impact investing community, ecovillage network, sustainable finance events',
    image: 'https://assets.regencivics.earth/MnRHvgPyBDbKYbay.jpg',
    url: '/schedule'
  },
  game: {
    title: 'The Game: How ReGen Civics Works',
    description: 'An infinite game -- no finish line, no winners, just a growing civilization we\'re building together. Here\'s how the ReGen Civics game works.',
    keywords: 'regenerative game, token economy, DAO governance, contribution tracking, regenerative tokens, impact rewards',
    image: 'https://assets.regencivics.earth/ocDzkDHpivHtGCWo.jpg',
    url: '/game'
  },
  quest: {
    title: 'Quests: Regenerative Actions & Rewards',
    description: 'Quests are how you participate. Each one moves healing into the world -- your body, your land, your community. Earn rewards doing the work that actually matters.',
    keywords: 'regenerative quests, impact actions, earn tokens, food forest, gut health, regenerative lifestyle, sustainable living',
    image: 'https://assets.regencivics.earth/kdpmqczDwXGfwTIK.jpg',
    url: '/quest'
  },
  team: {
    title: 'Team: Join Our Dynamic Organization',
    description: 'A distributed team working to make the Regenerative Renaissance real. Meet the people behind ReGen Civics.',
    keywords: 'regenerative team, join DAO, regenerative ikigai, impact careers, sustainable jobs, regenerative organization',
    image: 'https://assets.regencivics.earth/PPEoXqTcNBKerkDe.jpg',
    url: '/team'
  },
  opportunity: {
    title: 'Investment Opportunity: Regenerative Land Fund',
    description: 'For accredited investors ready to put capital to work in the regenerative transition. Here\'s the investment opportunity inside ReGen Civics.',
    keywords: 'regenerative investment, impact fund, land investment, sustainable investing, ESG investment, regenerative agriculture investment',
    image: 'https://assets.regencivics.earth/GUIluaYPZOUiwyLA.jpg',
    url: '/opportunity'
  },
  socials: {
    title: 'Connect: Social Media & Community',
    description: 'Connect with ReGen Civics across social platforms. Join our Discord, follow us on Twitter, subscribe to our YouTube, and stay updated on the Regenerative Renaissance.',
    keywords: 'regenerative community, discord server, twitter, youtube, social media, regenerative network',
    image: 'https://assets.regencivics.earth/iZVeEDJwzuNVQLOg.jpg',
    url: '/socials'
  },
  apply: {
    title: 'Apply: Land Project Application | ReGen Civics',
    description: 'Apply to bring your regenerative land project into the ReGen Civics ecosystem. Season 3 applications open 2026.',
    keywords: 'land project application, regenerative project funding, ecovillage application, sustainable land development, regenerative community application',
    image: 'https://assets.regencivics.earth/dLRruVvEitjLUEgU.jpg',
    url: '/apply'
  },
  loi: {
    title: 'Letter of Intent | ReGen Civics',
    description: 'Submit your Letter of Intent to invest in the ReGen Civics Regenerative Land Fund. Express your commitment to financing the transition to regenerative civilizations.',
    keywords: 'letter of intent, investment commitment, regenerative fund, impact investing, accredited investor',
    image: 'https://assets.regencivics.earth/GUIluaYPZOUiwyLA.jpg',
    url: '/loi'
  },
  connect: {
    title: 'Connect With Us | ReGen Civics',
    description: 'Get in touch with the ReGen Civics team. Whether you\'re an investor, land project, alliance partner, or player -- we want to hear from you.',
    keywords: 'contact regenerative fund, impact investing contact, regenerative community, partnership inquiry',
    image: '/og/connect.webp',
    url: '/connect'
  },
  map: {
    title: 'Global Project Map | ReGen Civics',
    description: 'Land projects, alliance orgs, and players mapped across the world. See where regeneration is happening right now.',
    keywords: 'regenerative projects map, ecovillage locations, sustainable communities, global regeneration, land project directory',
    image: '/og/map.webp',
    url: '/map'
  },
  fund: {
    title: 'The ReGen Civics Fund | Regenerative Land Investment',
    description: 'ReGen Civics runs a venture fund for regenerative land projects. Real land, diversified portfolio, community governed. Season 3 opens in 2026.',
    keywords: 'regenerative fund, land investment, impact fund, regenerative capital, crowd-pooling, land project funding',
    image: '/og/fund.webp',
    url: '/fund'
  },
  crowdPooling: {
    title: 'Crowd Pooling Tool | ReGen Civics',
    description: 'Pool capital with aligned investors to fund regenerative land projects. Coordinated impact, land-backed, and community governed.',
    keywords: 'crowd pooling, regenerative investing, pool capital, land project funding, collaborative investment',
    image: '/og/crowd-pooling.webp',
    url: '/crowd-pooling'
  },
  crowdPoolingProjects: {
    title: 'Land Project Campaigns | ReGen Civics Crowd Pooling',
    description: 'Browse active crowd pooling campaigns from regenerative land projects. Find projects aligned with your values and contribute directly.',
    keywords: 'land project campaigns, crowd pooling projects, regenerative investment campaigns, ecovillage funding',
    image: '/og/crowd-pooling.webp',
    url: '/crowd-pooling-projects'
  },
  riskDisclosure: {
    title: 'Risk Disclosure | ReGen Civics',
    description: 'Comprehensive risk disclosure for the ReGen Civics Regenerative Land Fund. Understand the risks associated with investing in regenerative land projects and alliance organizations.',
    keywords: 'investment risk disclosure, regenerative fund risks, impact investing risks, land investment risks',
    image: 'https://assets.regencivics.earth/GUIluaYPZOUiwyLA.jpg',
    url: '/risk-disclosure'
  },
  termsOfUse: {
    title: 'Terms of Use | ReGen Civics',
    description: 'Terms of Use for the ReGen Civics website and platform. Please review these terms carefully before using our services.',
    keywords: 'terms of use, terms of service, legal terms, website terms',
    image: 'https://assets.regencivics.earth/iZVeEDJwzuNVQLOg.jpg',
    url: '/terms-of-use'
  },
  privacyPolicy: {
    title: 'Privacy Policy | ReGen Civics',
    description: 'Privacy Policy for ReGen Civics. Learn how we collect, use, and protect your personal information.',
    keywords: 'privacy policy, data protection, personal information, GDPR compliance',
    image: 'https://assets.regencivics.earth/iZVeEDJwzuNVQLOg.jpg',
    url: '/privacy-policy'
  },
  disclaimers: {
    title: 'Disclaimers | ReGen Civics',
    description: 'Legal disclaimers for the ReGen Civics website and investment materials. This is not an offer to sell securities.',
    keywords: 'legal disclaimers, investment disclaimers, securities disclaimer, not financial advice',
    image: 'https://assets.regencivics.earth/GUIluaYPZOUiwyLA.jpg',
    url: '/disclaimers'
  },
  investorForm: {
    title: 'Investor Information | ReGen Civics',
    description: 'Provide your information to explore the ReGen Civics investment opportunity. Accredited investors seeking to finance the regenerative transition.',
    keywords: 'investor form, accredited investor, regenerative fund application, impact investment inquiry',
    image: 'https://assets.regencivics.earth/GUIluaYPZOUiwyLA.jpg',
    url: '/investor-form'
  },
  community: {
    title: 'Community Forum | ReGen Civics',
    description: 'The ReGen Civics forum. Where players, investors, land stewards, and builders connect, coordinate, and tell the truth.',
    keywords: 'regenerative community forum, impact investing discussion, ecovillage community, regenerative economy discussion, land project forum',
    image: '/og/community.webp',
    url: '/community'
  },
  land: {
    title: 'Land Projects | ReGen Civics',
    description: 'Real land projects doing the hard work of regenerating soil, water, community, and local economy. These are the projects we\'re backing.',
    keywords: 'regenerative land projects, ecovillages, sustainable farms, land-backed investment',
    image: 'https://assets.regencivics.earth/iZVeEDJwzuNVQLOg.jpg',
    url: '/land'
  },
  ally: {
    title: 'Alliance Organizations | ReGen Civics',
    description: 'The alliance organizations co-creating the Regenerative Renaissance alongside ReGen Civics. A network built on shared values, not just shared logos.',
    keywords: 'regenerative alliance, partner organizations, regenerative network',
    image: 'https://assets.regencivics.earth/iZVeEDJwzuNVQLOg.jpg',
    url: '/ally'
  },
  play: {
    title: 'Players | ReGen Civics',
    description: 'The players inside ReGen Civics. Contributors, builders, and healers doing quests and co-creating the new civilization one action at a time.',
    keywords: 'regenerative players, contributors, regenerative community members',
    image: 'https://assets.regencivics.earth/iZVeEDJwzuNVQLOg.jpg',
    url: '/play'
  },
  blog: {
    title: 'Blog | ReGen Civics',
    description: 'Writings from the ReGen Civics community. Strategy, stories from land projects, game design notes, and updates from the movement.',
    keywords: 'regenerative blog, land project stories, regenerative renaissance writing',
    image: 'https://assets.regencivics.earth/iZVeEDJwzuNVQLOg.jpg',
    url: '/blog'
  },
  governance: {
    title: 'Governance | ReGen Civics',
    description: 'Voice-based governance rooted in land and contribution. How ReGen Civics makes decisions, and who has a say.',
    keywords: 'regenerative governance, DAO, voice tokens, community governance',
    image: 'https://assets.regencivics.earth/iZVeEDJwzuNVQLOg.jpg',
    url: '/governance'
  },
  calculator: {
    title: 'Contribution Calculator | ReGen Civics',
    description: 'Run the numbers on your crowd pooling contribution and see how your capital compounds with others to fund regenerative land projects.',
    keywords: 'contribution calculator, crowd pooling calculator, regenerative investment calculator',
    image: 'https://assets.regencivics.earth/iZVeEDJwzuNVQLOg.jpg',
    url: '/calculator'
  }
};

export default SEO;
