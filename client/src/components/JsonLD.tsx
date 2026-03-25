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

  /** BlogPosting — for individual blog post pages. Enables Google Article rich results. */
  blogPosting: (post: {
    title: string;
    excerpt: string;
    author: string;
    date: string;
    image: string;
    url: string;
    tags?: string[];
  }) => ({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "ReGen Civics",
      url: "https://regencivics.earth",
      logo: {
        "@type": "ImageObject",
        url: "https://regencivics.earth/images/logos/regencivics-logo-dark-transparent-rounded.webp",
      },
    },
    image: post.image.startsWith("http") ? post.image : `https://regencivics.earth${post.image}`,
    url: post.url,
    mainEntityOfPage: { "@type": "WebPage", "@id": post.url },
    keywords: post.tags?.join(", "),
  }),
};
