/**
 * StructuredData Component
 * Provides JSON-LD structured data for AI search optimization
 */

import { useEffect } from 'react';

const BASE_URL = 'https://regencivics.earth';

// Organization schema
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "ReGen Civics Alliance",
  "alternateName": "ReGen Civics",
  "url": BASE_URL,
  "logo": "https://regencivics.earth/images/logos/regencivics-logo-dark-transparent-rounded.webp",
  "description": "A venture fund and alliance helping regenerative land projects pool resources, grow their economies, attract investment, and co-create thriving communities.",
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
    "Impact Investing",
    "Sustainable Finance",
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
    { "@type": "Thing", "name": "Impact Investing" },
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
  "description": "An Infinite Game for the ReGenerative Renaissance. Join the movement to fund and support regenerative land projects worldwide.",
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
      "description": "Apply to bring your regenerative land project into the ReGen Civics ecosystem. Season 2 applications open now.",
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
      "description": "Pool capital with aligned contributors to fund regenerative land projects directly.",
      "url": `${BASE_URL}/crowd-pooling`
    },
    {
      "@type": "SiteNavigationElement",
      "name": "The Fund",
      "description": "The ReGen Civics venture fund for regenerative land projects. Real land, diversified portfolio, community governed.",
      "url": `${BASE_URL}/fund`
    },
    {
      "@type": "SiteNavigationElement",
      "name": "Community",
      "description": "The ReGen Civics forum where players, investors, land stewards, and builders connect and coordinate.",
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
// The fund is in formation and is not a legal entity. There is nothing to
// describe as a financial product. The Organization schema for ReGen Civics
// below stays: that one is true. Facts live in shared/fund.ts.

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
        "text": "ReGen Civics is a platform and alliance helping regenerative land projects pool resources, grow their economies, attract investment, and co-create thriving communities. We connect impact investors with ecovillages, regenerative farms, and sustainable communities worldwide. The ReGen Civics Fund is in formation and is not yet a legal entity."
      }
    },
    {
      "@type": "Question",
      "name": "How can I invest in regenerative land projects?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The ReGen Civics Fund is in formation and is not yet accepting capital. You can sign a non-binding Letter of Intent, or invest directly in specific projects today through crowd pooling. Visit our Opportunity page for the thesis and the proposed terms."
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
        "text": "You can join by attending our community sessions, completing quests, or applying to become a land project in our portfolio. Visit our Team page to learn about open roles, or check the Schedule page for upcoming events."
      }
    },
    {
      "@type": "Question",
      "name": "What are ReGen Civics tokens?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "ReGen Civics uses two token systems: utility tokens ($Regen and $RCivics) for tracking contributions and rewards, and governance tokens (RGVoice and Fund Voice) for participating in decision-making. These tokens help coordinate our decentralized organization."
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
