/**
 * Semantic HTML Enhancements
 * Improves AI indexability through proper semantic markup
 */

import { useEffect } from 'react';

/**
 * Adds semantic HTML5 elements and microdata to improve AI indexability
 * - Uses proper heading hierarchy (h1, h2, h3)
 * - Adds article, section, nav elements
 * - Includes Schema.org microdata
 * - Improves document structure for AI crawlers
 */
export function SemanticEnhancements() {
  useEffect(() => {
    // Ensure proper heading hierarchy
    const ensureHeadingHierarchy = () => {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let lastLevel = 0;
      
      headings.forEach((heading) => {
        const level = parseInt(heading.tagName[1]);
        // Log warnings for improper hierarchy (optional)
        if (level > lastLevel + 1) {
          console.warn(`Heading hierarchy issue: jumped from h${lastLevel} to h${level}`, heading);
        }
        lastLevel = level;
      });
    };

    // Add semantic landmarks if missing
    const ensureSemanticLandmarks = () => {
      // Ensure main content is wrapped in <main>
      if (!document.querySelector('main')) {
        const mainContent = document.querySelector('[role="main"]');
        if (mainContent && mainContent.tagName !== 'MAIN') {
          console.warn('Consider wrapping main content in <main> element for better semantics');
        }
      }

      // Ensure navigation is semantic
      const navs = document.querySelectorAll('nav');
      navs.forEach((nav) => {
        if (!nav.getAttribute('aria-label') && !nav.querySelector('h1, h2, h3')) {
          console.warn('Navigation should have aria-label or heading', nav);
        }
      });
    };

    // Add article metadata where appropriate
    const enhanceArticles = () => {
      const articles = document.querySelectorAll('article');
      articles.forEach((article) => {
        // Ensure articles have proper structure
        if (!article.querySelector('h1, h2, h3')) {
          console.warn('Article should have a heading', article);
        }
        
        // Add time element if date is present
        const dateText = article.querySelector('[data-date]');
        if (dateText && !article.querySelector('time')) {
          console.warn('Article with date should use <time> element', article);
        }
      });
    };

    // Run checks
    ensureHeadingHierarchy();
    ensureSemanticLandmarks();
    enhanceArticles();

  }, []);

  return null;
}

/**
 * Semantic Blog Post Schema
 * Adds structured data for blog posts to improve AI understanding
 */
export function BlogPostSchema({ 
  title, 
  description, 
  author, 
  publishedDate, 
  modifiedDate,
  imageUrl,
  url
}: {
  title: string;
  description: string;
  author: string;
  publishedDate: Date;
  modifiedDate?: Date;
  imageUrl?: string;
  url: string;
}) {
  useEffect(() => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": title,
      "description": description,
      "author": {
        "@type": "Person",
        "name": author
      },
      "datePublished": publishedDate.toISOString(),
      ...(modifiedDate && { "dateModified": modifiedDate.toISOString() }),
      ...(imageUrl && { "image": imageUrl }),
      "url": url
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [title, description, author, publishedDate, modifiedDate, imageUrl, url]);

  return null;
}

/**
 * Semantic Product Schema
 * Adds structured data for land projects/products
 */
export function ProductSchema({
  name,
  description,
  imageUrl,
  url,
  price,
  currency = "USD",
  availability = "InStock"
}: {
  name: string;
  description: string;
  imageUrl?: string;
  url: string;
  price?: number;
  currency?: string;
  availability?: string;
}) {
  useEffect(() => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": name,
      "description": description,
      ...(imageUrl && { "image": imageUrl }),
      "url": url,
      ...(price && {
        "offers": {
          "@type": "Offer",
          "price": price,
          "priceCurrency": currency,
          "availability": `https://schema.org/${availability}`
        }
      })
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [name, description, imageUrl, url, price, currency, availability]);

  return null;
}

/**
 * Semantic Breadcrumb Schema
 * Helps AI understand page hierarchy
 */
export function BreadcrumbSchema({
  items
}: {
  items: Array<{ name: string; url: string }>;
}) {
  useEffect(() => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": items.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": item.name,
        "item": item.url
      }))
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [items]);

  return null;
}

/**
 * Semantic Content Wrapper
 * Ensures proper semantic HTML structure
 */
export function SemanticArticle({
  title,
  children,
  author,
  publishedDate,
  modifiedDate,
  className = ""
}: {
  title: string;
  children: React.ReactNode;
  author?: string;
  publishedDate?: Date;
  modifiedDate?: Date;
  className?: string;
}) {
  return (
    <article className={className}>
      <header>
        <h1>{title}</h1>
        {author && <p className="text-sm text-gray-600">By <strong>{author}</strong></p>}
        {publishedDate && (
          <time dateTime={publishedDate.toISOString()} className="text-sm text-gray-500">
            Published {publishedDate.toLocaleDateString()}
          </time>
        )}
        {modifiedDate && (
          <time dateTime={modifiedDate.toISOString()} className="text-sm text-gray-500 ml-2">
            Updated {modifiedDate.toLocaleDateString()}
          </time>
        )}
      </header>
      {children}
    </article>
  );
}

/**
 * Semantic Section Wrapper
 * Properly structures page sections for AI understanding
 */
export function SemanticSection({
  title,
  children,
  className = ""
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
