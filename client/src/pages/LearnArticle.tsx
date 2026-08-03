/**
 * A Learn hub article. Renders a LearnArticle from shared/learnContent, the
 * same object server/_core/crawler-content.ts turns into the crawler-visible
 * HTML and the FAQPage / Article JSON-LD. One content source, two renderers.
 */
import { Link, Redirect, useParams } from "wouter";
import { ArrowRight, BookOpen } from "lucide-react";
import { SEO } from "@/components/SEO";
import { PageTransition } from "@/components/PageTransition";
import { AnimatedSection } from "@/components/AnimatedSection";
import {
  getLearnArticle,
  parseInline,
  stripInline,
  type LearnSection,
} from "@shared/learnContent";

/** Renders `[label](/href)` inline links as real links, everything else as text. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((token, i) =>
        token.type === "link" ? (
          token.href.startsWith("http") ? (
            <a
              key={i}
              href={token.href}
              className="text-[#7dd87d] hover:underline"
              rel="noopener noreferrer"
              target="_blank"
            >
              {token.label}
            </a>
          ) : (
            <Link key={i} href={token.href} className="text-[#7dd87d] hover:underline">
              {token.label}
            </Link>
          )
        ) : (
          <span key={i}>{token.value}</span>
        ),
      )}
    </>
  );
}

function SourceLine({ source, sourceUrl }: { source: string; sourceUrl?: string }) {
  return (
    <figcaption className="text-white/50 text-xs mt-2 safe-prose">
      Source:{" "}
      {sourceUrl ? (
        <Link href={sourceUrl} className="text-[#7dd87d]/80 hover:underline">
          {source}
        </Link>
      ) : (
        source
      )}
    </figcaption>
  );
}

function Section({ section }: { section: LearnSection }) {
  return (
    <section className="mt-10">
      <h2
        className="text-white font-bold text-xl md:text-2xl mb-3"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {section.heading}
      </h2>

      {section.paragraphs?.map((p, i) => (
        <p key={i} className="text-white/75 text-sm md:text-base leading-relaxed mb-3 safe-prose">
          <Inline text={p} />
        </p>
      ))}

      {section.bullets && section.bullets.length > 0 && (
        <ul className="list-disc pl-5 space-y-2 my-4">
          {section.bullets.map((b, i) => (
            <li key={i} className="text-white/75 text-sm md:text-base leading-relaxed safe-prose">
              <Inline text={b} />
            </li>
          ))}
        </ul>
      )}

      {section.table && (
        <figure className="my-6">
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs md:text-sm">
              <caption className="text-white/60 text-xs p-3 text-left safe-prose">
                {section.table.caption}
              </caption>
              <thead>
                <tr className="bg-white/10">
                  {section.table.columns.map((c) => (
                    <th key={c} className="p-3 text-white font-bold whitespace-nowrap">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.table.rows.map((row, ri) => (
                  <tr key={ri} className="border-t border-white/10 align-top">
                    {row.map((cell, ci) => (
                      <td key={ci} className="p-3 text-white/70 safe-prose">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <SourceLine source={section.table.source} sourceUrl={section.table.sourceUrl} />
        </figure>
      )}

      {section.figure && (
        <figure className="my-6 p-5 rounded-xl bg-[#7dd87d]/10 border border-[#7dd87d]/20">
          <p
            className="text-[#7dd87d] font-bold text-2xl md:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {section.figure.value}
          </p>
          <p className="text-white/75 text-sm mt-1 safe-prose">{section.figure.label}</p>
          <SourceLine source={section.figure.source} sourceUrl={section.figure.sourceUrl} />
        </figure>
      )}
    </section>
  );
}

export default function LearnArticle() {
  const params = useParams<{ slug: string }>();
  const article = getLearnArticle(params.slug ?? "");

  if (!article) return <Redirect to="/learn" />;

  const related = article.related
    .map((slug) => getLearnArticle(slug))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  return (
    <PageTransition>
      <div className="min-h-screen">
        <SEO
          title={`${article.metaTitle} | ReGen Civics`}
          description={article.metaDescription}
          url={`/learn/${article.slug}`}
          type="article"
          author={article.author}
          publishedTime={article.published}
          breadcrumbs={[
            { name: "ReGen Civics", url: "/" },
            { name: "Learn", url: "/learn" },
            { name: article.title, url: `/learn/${article.slug}` },
          ]}
        />

        <article className="max-w-3xl mx-auto px-4 py-16 md:py-24">
          <Link
            href="/learn"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7dd87d]/10 text-[#7dd87d] text-sm mb-6 pointer-coarse:min-h-11"
            style={{ fontFamily: "var(--font-accent)" }}
          >
            <BookOpen className="w-4 h-4" />
            <span>Learn</span>
          </Link>

          <h1
            className="text-3xl md:text-4xl font-bold text-white mb-5"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {article.title}
          </h1>

          {/* The direct answer. Answer engines lift this, so it stays first. */}
          <p className="text-white text-base md:text-lg leading-relaxed p-5 rounded-xl bg-white/5 border-l-2 border-[#7dd87d] safe-prose">
            {stripInline(article.answer)}
          </p>

          <p className="text-white/50 text-xs mt-4 safe-prose">
            By {article.author}, {article.authorTitle}. Published{" "}
            <time dateTime={article.published}>{article.published}</time>. Updated{" "}
            <time dateTime={article.updated}>{article.updated}</time>.
          </p>

          {article.sections.map((s, i) => (
            <AnimatedSection key={s.heading} delay={Math.min(i * 0.04, 0.2)}>
              <Section section={s} />
            </AnimatedSection>
          ))}

          <section className="mt-12">
            <h2
              className="text-white font-bold text-xl md:text-2xl mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Questions people ask
            </h2>
            <div className="space-y-3">
              {article.faqs.map((faq) => (
                <div key={faq.question} className="p-5 rounded-xl bg-white/5 border border-white/10">
                  <h3
                    className="text-white font-bold text-base mb-2"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {faq.question}
                  </h3>
                  <p className="text-white/70 text-sm leading-relaxed safe-prose">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-12">
            <h2
              className="text-white font-bold text-xl md:text-2xl mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Next step
            </h2>
            <div className="space-y-3">
              {article.nextSteps.map((step) => (
                <Link
                  key={step.href}
                  href={step.href}
                  className="block p-5 rounded-xl bg-[#7dd87d]/10 border border-[#7dd87d]/25 hover:border-[#7dd87d]/50 transition-colors pointer-coarse:min-h-11"
                >
                  <span className="inline-flex items-center gap-1 text-[#7dd87d] font-bold text-base">
                    {step.label} <ArrowRight className="w-4 h-4" />
                  </span>
                  <p className="text-white/70 text-sm mt-1 leading-relaxed safe-prose">
                    {step.blurb}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {related.length > 0 && (
            <section className="mt-12">
              <h2
                className="text-white font-bold text-xl md:text-2xl mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Related
              </h2>
              <ul className="space-y-2">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/learn/${r.slug}`}
                      className="text-[#7dd87d] text-sm hover:underline inline-flex items-center gap-1 pointer-coarse:min-h-11"
                    >
                      {r.title} <ArrowRight className="w-3 h-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
      </div>
    </PageTransition>
  );
}
