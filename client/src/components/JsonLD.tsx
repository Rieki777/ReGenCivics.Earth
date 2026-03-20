/**
 * JsonLD - Injects JSON-LD structured data into the document head.
 * Used for rich results in search engines.
 */

interface JsonLDProps {
  data: Record<string, unknown>;
}

export function JsonLD({ data }: JsonLDProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ─── Common schema builders ───────────────────────────────────────────────────

export const schemas = {
  organization: () => ({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ReGen Civics",
    url: "https://regencivics.earth",
    logo: "https://regencivics.earth/images/logos/regencivics-logo-dark-transparent-rounded.webp",
    description:
      "ReGen Civics is a regenerative investment fund and infinite game connecting investors, land projects, alliance partners, and players in the regenerative renaissance.",
    sameAs: [
      "https://chat.whatsapp.com/KArQzEs0UQuLsGaLTvbp34",
      "https://discord.gg/8aTzTxH3Qe",
      "https://www.youtube.com/@SEEDSRegenerativeEconomies",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "team@regencivics.earth",
      contactType: "customer support",
    },
  }),

  website: () => ({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ReGen Civics",
    url: "https://regencivics.earth",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://regencivics.earth/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  }),

  investmentFund: () => ({
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: "ReGen Civics Alliance Fund",
    description:
      "A venture fund investing in regenerative land projects and alliance organizations globally. Open to accredited investors.",
    provider: {
      "@type": "Organization",
      name: "ReGen Civics",
      url: "https://regencivics.earth",
    },
    url: "https://regencivics.earth/opportunity",
  }),

  faqPage: (faqs: Array<{ question: string; answer: string }>) => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }),

  breadcrumb: (items: Array<{ name: string; url: string }>) => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }),

  event: (event: {
    name: string;
    description: string;
    startDate: string;
    url: string;
  }) => ({
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.name,
    description: event.description,
    startDate: event.startDate,
    url: event.url,
    organizer: {
      "@type": "Organization",
      name: "ReGen Civics",
      url: "https://regencivics.earth",
    },
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
  }),
};
