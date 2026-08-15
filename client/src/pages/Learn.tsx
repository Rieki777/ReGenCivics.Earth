/**
 * Learn hub index. Content comes from shared/learnContent, the same module
 * the server reads to inject crawler-visible HTML, so the page a human reads
 * and the page GPTBot fetches are the same words.
 */
import { Link } from "wouter";
import { BookOpen, ArrowRight } from "lucide-react";
import { SEO } from "@/components/SEO";
import { PageTransition } from "@/components/PageTransition";
import { AnimatedSection } from "@/components/AnimatedSection";
import { LEARN_ARTICLES, learnSummary } from "@shared/learnContent";

export default function Learn() {
  return (
    <PageTransition>
      <div className="min-h-screen">
        <SEO
          title="Learn: Land, Community, Funding, Governance | ReGen Civics"
          description="Practical answers on starting a community on your land, intentional community structures and funding, ecovillages, governance models, crowd pooling, and the nine forms of capital."
          url="/learn"
        />

        <section className="py-16 md:py-24 px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7dd87d]/10 text-[#7dd87d] text-sm mb-6"
              style={{ fontFamily: "var(--font-accent)" }}
            >
              <BookOpen className="w-4 h-4" />
              <span>Learn</span>
            </div>
            <h1
              className="text-3xl md:text-5xl font-bold text-white mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Practical answers for land projects and communities
            </h1>
            <p className="text-white/60 text-base md:text-lg max-w-2xl mx-auto safe-prose">
              Plain answers to the questions people ask before starting a community, funding a
              land project, or choosing how a group makes decisions. Written from what we run: a
              13-week incubator for regenerative land projects, a fund that invests in them, and a
              game that tracks contribution across nine forms of capital.
            </p>
          </div>
        </section>

        <section className="pb-16 md:pb-24 px-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {LEARN_ARTICLES.map((article, i) => (
              <AnimatedSection key={article.slug} delay={Math.min(i * 0.05, 0.3)}>
                <Link
                  href={`/learn/${article.slug}`}
                  className="block p-6 rounded-xl bg-white/5 border border-white/10 hover:border-[#7dd87d]/30 transition-colors pointer-coarse:min-h-11"
                >
                  <h2
                    className="text-white font-bold text-lg md:text-xl mb-2"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {article.title}
                  </h2>
                  <p className="text-white/70 text-sm leading-relaxed safe-prose">
                    {learnSummary(article)}
                  </p>
                  <span className="inline-flex items-center gap-1 mt-3 text-[#7dd87d] text-xs">
                    Read <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              </AnimatedSection>
            ))}
          </div>

          <div className="max-w-3xl mx-auto mt-10 text-center">
            <p className="text-white/60 text-sm safe-prose">
              Start with{" "}
              <Link href="/apply" className="text-[#7dd87d] hover:underline">
                the incubator
              </Link>
              ,{" "}
              <Link href="/fund" className="text-[#7dd87d] hover:underline">
                the fund
              </Link>
              , or{" "}
              <Link href="/community" className="text-[#7dd87d] hover:underline">
                the community forum
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
