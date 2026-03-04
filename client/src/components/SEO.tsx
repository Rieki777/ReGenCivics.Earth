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

const BASE_URL = 'https://www.regencivics.earth';
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
    description: 'Discover how the ReGen Civics game works. Learn about our token system, governance model, contribution tracking, and how you can earn while regenerating the planet.',
    keywords: 'regenerative game, token economy, DAO governance, contribution tracking, regenerative tokens, impact rewards',
    image: 'https://assets.regencivics.earth/ocDzkDHpivHtGCWo.jpg',
    url: '/game'
  },
  quest: {
    title: 'Quests: Regenerative Actions & Rewards',
    description: 'Complete quests to earn tokens and contribute to the Regenerative Renaissance. From gut health to food forests, each quest heals a different aspect of reality.',
    keywords: 'regenerative quests, impact actions, earn tokens, food forest, gut health, regenerative lifestyle, sustainable living',
    image: 'https://assets.regencivics.earth/kdpmqczDwXGfwTIK.jpg',
    url: '/quest'
  },
  team: {
    title: 'Team: Join Our Dynamic Organization',
    description: 'Meet the ReGen Civics team and discover how to join our dynamic, self-organizing community. Find your Regenerative Ikigai and contribute to the movement.',
    keywords: 'regenerative team, join DAO, regenerative ikigai, impact careers, sustainable jobs, regenerative organization',
    image: 'https://assets.regencivics.earth/PPEoXqTcNBKerkDe.jpg',
    url: '/team'
  },
  opportunity: {
    title: 'Investment Opportunity: Regenerative Land Fund',
    description: 'Invest in the future of regenerative land projects. ReGen Civics offers a diversified portfolio approach to impact investing with land-backed security.',
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
    description: 'Apply to join the ReGen Civics ecosystem. Submit your regenerative land project for consideration in our portfolio and gain access to funding, governance tools, and alliance support.',
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
    description: 'Get in touch with the ReGen Civics team. Whether you are an investor, land project, alliance partner, or player, we would love to hear from you.',
    keywords: 'contact regenerative fund, impact investing contact, regenerative community, partnership inquiry',
    image: 'https://assets.regencivics.earth/iZVeEDJwzuNVQLOg.jpg',
    url: '/connect'
  },
  map: {
    title: 'Global Project Map | ReGen Civics',
    description: 'Explore regenerative land projects and alliance organizations worldwide on our interactive globe. See where the Regenerative Renaissance is taking root.',
    keywords: 'regenerative projects map, ecovillage locations, sustainable communities, global regeneration, land project directory',
    image: 'https://assets.regencivics.earth/ocDzkDHpivHtGCWo.jpg',
    url: '/map'
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
    description: 'Join the ReGen Civics community discussion. Share ideas, connect with fellow regenerators, discuss land projects, investment strategies, and governance tools.',
    keywords: 'regenerative community forum, impact investing discussion, ecovillage community, regenerative economy discussion, land project forum',
    image: 'https://assets.regencivics.earth/iZVeEDJwzuNVQLOg.jpg',
    url: '/community'
  }
};

export default SEO;
