/**
 * StructuredData Component
 * Provides JSON-LD structured data for AI search optimization
 */

import { useEffect } from 'react';
import { APPLICATIONS_SHORT } from "@shared/applicationWindow";
import { COOP } from "@shared/fund";

const BASE_URL = 'https://regencivics.earth';

// The crowdpool lane's binding wording (Phase 0 spec). Verbatim wherever a
// surface describes crowdpooling; client/index.html carries a pasted copy.
const CROWDPOOLING =
  "Crowdpooling coordinates and accounts for what people bring to land projects: " +
  "time, things, skills, land and money. Money goes through outside partners each " +
  "project holds, never through ReGen Civics. The campaigns shown today are " +
  "examples; real campaigns open when Season 2 starts crowdpooling.";

// Organization schema
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "ReGen Civics Alliance",
  "alternateName": "ReGen Civics",
  "url": BASE_URL,
  "logo": "https://regencivics.earth/images/logos/regencivics-logo-dark-transparent-rounded.webp",
  "description": "An in-real-life game and alliance helping regenerative land projects pool resources, grow their economies, and co-create thriving communities.",
  "foundingDate": "2023",
  "sameAs": [
    "https://www.youtube.com/@SEEDSRegenerativeEconomies",
    "https://discord.gg/JGmApbPDPd",
    "https://t.me/+Zl_GNPpL8TE3YTFh"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "url": `${BASE_URL}/socials`
  },
  "areaServed": "Worldwide",
  "knowsAbout": [
    "Regenerative Agriculture",
    "Cooperatives",
    "Regenerative Economics",
    "Ecovillages",
    "Land Conservation",
    "Community Development",
    "Decentralized Governance",
    "Token Economics"
  ],
  "speakable": {
    "@type": "SpeakableSpecification",
    "cssSelector": ["h1", ".hero-description", ".site-description"]
  },
  "about": [
    { "@type": "Thing", "name": "Regenerative Agriculture" },
    { "@type": "Thing", "name": "Cooperatives" },
    { "@type": "Thing", "name": "Land Conservation" },
    { "@type": "Thing", "name": "Community Governance" },
    { "@type": "Thing", "name": "Ecovillages" }
  ],
  "mentions": [
    { "@type": "Thing", "name": "ReGenerative Renaissance" },
    { "@type": "Thing", "name": "Infinite Game" },
    { "@type": "Thing", "name": "Crowd Pooling" }
  ]
};

// WebSite schema for sitelinks search box
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "ReGen Civics",
  "url": BASE_URL,
  "description": "An Infinite Game for the ReGenerative Renaissance. Do quests, earn tokens, and support regenerative land projects worldwide.",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": `${BASE_URL}/search?q={search_term_string}`
    },
    "query-input": "required name=search_term_string"
  }
};

// SiteNavigationElement schema for Google sitelinks
const siteNavigationSchema = {
  "@context": "https://schema.org",
  "@type": "SiteNavigationElement",
  "name": "Main Navigation",
  "hasPart": [
    {
      "@type": "SiteNavigationElement",
      "name": "Sign In",
      "description": "Sign in to your ReGen Civics account to access the community, track quests, and manage your profile.",
      "url": `${BASE_URL}/community`
    },
    {
      "@type": "SiteNavigationElement",
      "name": "Apply",
      "description": `Apply to bring your regenerative land project into the ReGen Civics ecosystem. ${APPLICATIONS_SHORT}.`,
      "url": `${BASE_URL}/apply`
    },
    {
      "@type": "SiteNavigationElement",
      "name": "Quests",
      "description": "Browse and complete quests that heal the earth and grow the movement. Earn tokens for real-world regenerative actions.",
      "url": `${BASE_URL}/quest`
    },
    {
      "@type": "SiteNavigationElement",
      "name": "Bounties",
      "description": "Claim a bounty and earn $ReGen for real regenerative work, with transparent, community-governed rewards.",
      "url": `${BASE_URL}/bounties`
    },
    {
      "@type": "SiteNavigationElement",
      "name": "Crowd Pooling",
      "description": CROWDPOOLING,
      "url": `${BASE_URL}/crowd-pooling`
    },
    {
      "@type": "SiteNavigationElement",
      "name": "The Cooperative",
      "description": COOP.statementShort,
      "url": `${BASE_URL}/fund`
    },
    {
      "@type": "SiteNavigationElement",
      "name": "Community",
      "description": "The ReGen Civics forum where players, land stewards, allies, and builders connect and coordinate.",
      "url": `${BASE_URL}/community`
    }
  ]
};

// The InvestmentFund schema was removed 2026-08-30.
//
// It was mounted on EVERY non-admin page, not just /fund, and it declared an
// InvestmentFund entity to every crawler that loaded any route: a third name
// for the fund, a provider ("ReGen Civics Alliance") that is not a legal
// entity, and a feesAndCommissionsSpecification for fees nobody has agreed.
// JsonLD.tsx carried a second, differently named schema for the same thing.
//
// Since 2026-09-27 the fund is a cooperative in design, and it is not a legal
// entity. There is nothing to describe as a financial product. The
// Organization schema for ReGen Civics above stays: that one is true. Facts
// about the cooperative live in shared/fund.ts (COOP).

// FAQ schema for common questions
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is ReGen Civics?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": `ReGen Civics builds the tools and runs the in-real-life game that regenerative land projects use today. Its year turns through four seasons: land projects design their games, crowdpool what they need, build on the land, and rest. ${COOP.entities}`
      }
    },
    {
      "@type": "Question",
      "name": `What is the ${COOP.name}?`,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": `${COOP.statement} You can tell us you're interested at regencivics.earth/loi. ${COOP.interestPromise}`
      }
    },
    {
      "@type": "Question",
      "name": "How can I support regenerative land projects?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": `Play the Game, join a season, or bring what you have to a land project through crowdpooling. ${CROWDPOOLING}`
      }
    },
    {
      "@type": "Question",
      "name": "What is the Infinite Game?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The Infinite Game is our approach to regenerative development. Unlike finite games played to win, infinite games are played to continue playing. We design our systems to create lasting positive impact that compounds across generations."
      }
    },
    {
      "@type": "Question",
      "name": "How do I join ReGen Civics?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "You can join by attending our community sessions, completing quests, or applying to bring your land project into the next season. Visit our Team page to learn about open roles, or check the Schedule page for upcoming events."
      }
    },
    {
      "@type": "Question",
      "name": "What are ReGen Civics tokens?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": `The Game has two tokens: $ReGen, earned for contributions like quests and bounties, and RGVoice, which carries governance voice in the Game. ${COOP.tokensNote} ${COOP.coopTokens.rcivics} ${COOP.coopTokens.rcvoice}`
      }
    }
  ]
};

// Event schema for community sessions
const eventSchema = {
  "@context": "https://schema.org",
  "@type": "EventSeries",
  "name": "ReGen Civics Community Sessions",
  "description": "Weekly online gatherings for the regenerative community to connect, learn, and collaborate on building a regenerative civilization.",
  "url": `${BASE_URL}/schedule`,
  "organizer": {
    "@type": "Organization",
    "name": "ReGen Civics Alliance"
  },
  "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
  "eventStatus": "https://schema.org/EventScheduled",
  "isAccessibleForFree": true
};

// Course schema for the incubator program
const courseSchema = {
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "ReGen Civics Incubator Program",
  "description": "A 13-week program helping regenerative land projects develop governance, tokenomics, and community structures for long-term success.",
  "url": `${BASE_URL}/seasons`,
  "provider": {
    "@type": "Organization",
    "name": "ReGen Civics Alliance"
  },
  "courseMode": "online",
  "numberOfCredits": "13 weeks",
  "educationalLevel": "Professional Development",
  "teaches": [
    "Decentralized Governance",
    "Token Economics",
    "Community Building",
    "Legal Structures for Land Projects",
    "Regenerative Agriculture"
  ]
};

export function StructuredData() {
  useEffect(() => {
    // Remove any existing structured data scripts
    const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
    existingScripts.forEach(script => script.remove());

    // Add all structured data schemas
    const schemas = [
      organizationSchema,
      websiteSchema,
      siteNavigationSchema,
      faqSchema,
      eventSchema,
      courseSchema
    ];

    const nonce = (window as any).__NONCE__;
    schemas.forEach((schema, index) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = `structured-data-${index}`;
      if (nonce) script.setAttribute('nonce', nonce);
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    });

    return () => {
      // Cleanup on unmount
      schemas.forEach((_, index) => {
        const script = document.getElementById(`structured-data-${index}`);
        if (script) script.remove();
      });
    };
  }, []);

  return null;
}

export default StructuredData;
