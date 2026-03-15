/**
 * StructuredData Component
 * Provides JSON-LD structured data for AI search optimization
 */

import { useEffect } from 'react';

const BASE_URL = 'https://www.regencivics.earth';

// Organization schema
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "ReGen Civics Alliance",
  "alternateName": "ReGen Civics",
  "url": BASE_URL,
  "logo": "https://regencivics.earth/images/logos/regencivics-logo-dark-transparent-rounded.png",
  "description": "A venture fund and alliance helping regenerative land projects succeed through capital, governance tools, and a supportive network.",
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
  ]
};

// WebSite schema for sitelinks search box
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "ReGen Civics",
  "url": BASE_URL,
  "description": "An Infinite Game for the Regenerative Renaissance. Join the movement to fund and support regenerative land projects worldwide.",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": `${BASE_URL}/glossary?q={search_term_string}`
    },
    "query-input": "required name=search_term_string"
  }
};

// Investment Fund schema
const investmentFundSchema = {
  "@context": "https://schema.org",
  "@type": "InvestmentFund",
  "name": "ReGen Civics Regenerative Land Fund",
  "description": "A diversified portfolio approach to regenerative land investment, providing capital to ecovillages, regenerative farms, and sustainable communities.",
  "url": `${BASE_URL}/opportunity`,
  "provider": {
    "@type": "Organization",
    "name": "ReGen Civics Alliance"
  },
  "investmentType": "Impact Investment",
  "feesAndCommissionsSpecification": "Performance-based fees aligned with regenerative outcomes"
};

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
        "text": "ReGen Civics is a venture fund and alliance helping regenerative land projects succeed through capital, governance tools, and a supportive network. We connect impact investors with ecovillages, regenerative farms, and sustainable communities worldwide."
      }
    },
    {
      "@type": "Question",
      "name": "How can I invest in regenerative land projects?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "You can invest through the ReGen Civics fund, which provides a diversified portfolio approach to regenerative land investment. Visit our Opportunity page to learn more about investment minimums, expected returns, and how to get started."
      }
    },
    {
      "@type": "Question",
      "name": "What is the Infinite Game?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The Infinite Game is our approach to regenerative development. Unlike finite games played to win, infinite games are played to continue playing. We design our systems to create lasting positive impact for generations, not just short-term returns."
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
      investmentFundSchema,
      faqSchema,
      eventSchema,
      courseSchema
    ];

    schemas.forEach((schema, index) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = `structured-data-${index}`;
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
