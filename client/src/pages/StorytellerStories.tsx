/**
 * StorytellerStories
 * Route: /community/decisions/stories
 *
 * Living archive of how decisions actually went down. Storytellers are
 * non-voting community members assigned to high-stakes decisions to write
 * a 300-600 word narrative after ratification. This page lists them.
 *
 * Spec: FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md section 2.5
 */
import { trpc } from "@/lib/trpc";
import { SEO } from "@/components/SEO";
import { BackButton } from "@/components/BackButton";
import { Link } from "wouter";
import { BookOpen, ArrowRight, Sparkles } from "lucide-react";

export default function StorytellerStories() {
  const { data: narratives, isLoading } = trpc.governance.listPublishedNarratives.useQuery({ limit: 30 });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO title="Storyteller narratives | ReGen Civics" description="How past decisions actually went down. Written by community storytellers." />
      <BackButton />

      <section className="pt-20 pb-6 px-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-7 h-7 text-amber-300" />
          <h1 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
            Storyteller narratives
          </h1>
        </div>
        <p className="text-white/65 text-sm max-w-2xl">
          For high-stakes decisions, a non-voting community storyteller is assigned at decision-open time. After the decision ratifies, they write a 300-600 word narrative covering what was at stake, what was argued, and why this path was chosen. These are the living history of how the community has decided things over time.
        </p>
      </section>

      <section className="px-4 max-w-3xl mx-auto pb-16">
        {isLoading ? (
          <p className="text-white/70 text-sm">Loading...</p>
        ) : (narratives?.length ?? 0) === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <Sparkles className="w-10 h-10 text-amber-300/60 mx-auto mb-3" />
            <h2 className="text-white text-lg font-bold mb-2">No published narratives yet</h2>
            <p className="text-white/65 text-sm">
              When the first high-stakes decision ratifies and a storyteller publishes their narrative, it lands here. Want to be a storyteller? Toggle the option in your profile.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {(narratives ?? []).map((n: any) => (
              <li key={n.id}>
                <Link
                  href={`/community/decisions/stories/${n.id}`}
                  className="block bg-white/5 hover:bg-white/8 border border-white/10 hover:border-amber-300/30 rounded-2xl p-5 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h2 className="text-white font-bold text-base group-hover:text-amber-200 transition-colors">{n.title}</h2>
                      <p className="text-white/65 text-sm leading-relaxed mt-2 line-clamp-3">
                        {(n.narrativeBody ?? "").slice(0, 280)}
                        {(n.narrativeBody?.length ?? 0) > 280 && "..."}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-white/70 mt-3">
                        <span>{n.wordCount} words</span>
                        {n.publishedAt && <span>· published {new Date(n.publishedAt).toLocaleDateString()}</span>}
                        <span className="text-amber-300/80 ml-auto inline-flex items-center gap-1">
                          Read <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
