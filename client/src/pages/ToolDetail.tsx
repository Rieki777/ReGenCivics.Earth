/**
 * Tool Detail - Individual tool page with endorsements
 * Route: /tools/:slug
 */
import { useState } from "react";
import { Wrench, ExternalLink, ArrowLeft, ThumbsUp, Users, Globe, Tag, Loader2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { AnimatedSection } from "@/components/AnimatedSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useParams } from "wouter";
import { TaoSpinner } from "@/components/TaoSpinner";
import { getLoginUrl } from "@/const";

export default function ToolDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";
  const { isAuthenticated } = useAuth();
  const [endorseText, setEndorseText] = useState("");

  const { data: tool, isLoading } = trpc.tools.getBySlug.useQuery(
    { slug },
    { enabled: !!slug, staleTime: 30_000 }
  );

  const endorseMutation = trpc.tools.endorse.useMutation({
    onSuccess: () => {
      setEndorseText("");
    },
  });

  const { data: relatedTools } = trpc.tools.list.useQuery(
    { limit: 4 },
    { enabled: !!tool, staleTime: 60_000 }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818] flex items-center justify-center">
        <TaoSpinner size={48} />
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818] flex items-center justify-center">
        <div className="text-center">
          <Wrench className="w-12 h-12 text-white/70 mx-auto mb-4" />
          <h2 className="text-white text-xl font-semibold mb-2">Tool not found</h2>
          <p className="text-white/70 mb-6">This tool may have been removed or the link is incorrect.</p>
          <Link href="/tools">
            <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Tools Library
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO
        title={`${tool.name} | Tools Library | ReGen Civics`}
        description={tool.summary}
        url={`/tools/${slug}`}
      />

      {/* Back button */}
      <div className="pt-20 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/tools">
            <button className="flex items-center gap-2 text-white/70 hover:text-white/70 text-sm transition-colors mb-6">
              <ArrowLeft className="w-4 h-4" /> Back to Tools Library
            </button>
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="px-4 pb-10">
        <div className="max-w-3xl mx-auto">
          <AnimatedSection>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
              <div className="flex items-start gap-4 mb-5">
                {tool.logoUrl ? (
                  <img
                    src={tool.logoUrl}
                    alt={tool.name}
                    className="w-16 h-16 rounded-xl object-cover border border-white/10 flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-[#7dd87d]/10 border border-[#7dd87d]/20 flex items-center justify-center flex-shrink-0">
                    <Wrench className="w-8 h-8 text-[#7dd87d]" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h1
                    className="text-2xl sm:text-3xl font-bold text-white mb-2"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {tool.name}
                  </h1>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={`text-xs ${
                      tool.pricing === "free"
                        ? "bg-[#7dd87d]/10 text-[#7dd87d] border-[#7dd87d]/20"
                        : tool.pricing === "open_source"
                        ? "bg-blue-500/10 text-blue-300 border-blue-500/20"
                        : tool.pricing === "freemium"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-purple-500/10 text-purple-300 border-purple-500/20"
                    }`}>
                      {tool.pricing === "open_source" ? "Open Source" : tool.pricing.charAt(0).toUpperCase() + tool.pricing.slice(1)}
                    </Badge>
                    {tool.type && (
                      <Badge className="bg-white/5 text-white/70 border-white/10 text-xs">
                        {tool.type === "digital" ? "Digital" : "Physical"}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-white/70 text-sm leading-relaxed mb-5">
                {tool.description}
              </p>

              {/* Categories */}
              {tool.categories?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {tool.categories.map((cat: string) => (
                    <span
                      key={cat}
                      className="text-xs px-3 py-1 rounded-full bg-white/5 text-white/70 border border-white/10 flex items-center gap-1"
                    >
                      <Tag className="w-3 h-3" /> {cat}
                    </span>
                  ))}
                </div>
              )}

              {/* Regions */}
              {tool.regions?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {tool.regions.map((region: string) => (
                    <span
                      key={region}
                      className="text-xs px-3 py-1 rounded-full bg-blue-500/5 text-blue-300/60 border border-blue-500/10 flex items-center gap-1"
                    >
                      <Globe className="w-3 h-3" /> {region}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats + CTA */}
              <div className="flex flex-wrap items-center gap-4">
                {tool.websiteUrl && (
                  <a href={tool.websiteUrl} target="_blank" rel="noopener noreferrer">
                    <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold">
                      <ExternalLink className="w-4 h-4 mr-2" /> Visit Website
                    </Button>
                  </a>
                )}
                <span className="text-white/70 text-xs flex items-center gap-1">
                  <Users className="w-3 h-3" /> {tool.clickCount ?? 0} views
                </span>
                {tool.endorsementCount > 0 && (
                  <span className="text-white/70 text-xs flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" /> {tool.endorsementCount} endorsements
                  </span>
                )}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Endorsements */}
      <section className="px-4 pb-10">
        <div className="max-w-3xl mx-auto">
          <AnimatedSection>
            <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Community Endorsements
            </h2>

            {/* Endorsement form */}
            {isAuthenticated ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                <textarea
                  value={endorseText}
                  onChange={(e) => setEndorseText(e.target.value)}
                  placeholder="Share why you recommend this tool and how you have used it..."
                  className="w-full bg-transparent text-white placeholder:text-white/70 text-sm resize-none min-h-[60px] focus:outline-none mb-3"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={() => endorseMutation.mutate({ toolId: tool!.id, comment: endorseText })}
                    disabled={!endorseText.trim() || endorseMutation.isPending}
                    size="sm"
                    className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold"
                  >
                    {endorseMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <ThumbsUp className="w-4 h-4 mr-1" />
                    )}
                    Endorse This Tool
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 text-center">
                <p className="text-white/70 text-sm mb-3">Sign in to share your endorsement.</p>
                <a href={getLoginUrl()}>
                  <Button
                    size="sm"
                    className="bg-[#7dd87d]/20 text-[#7dd87d] border border-[#7dd87d]/30 hover:bg-[#7dd87d]/30"
                  >
                    Sign In
                  </Button>
                </a>
              </div>
            )}

            {/* Endorsement list */}
            {tool.endorsements?.length > 0 ? (
              <div className="space-y-3">
                {tool.endorsements.map((e: { id: number; userName: string; text: string; createdAt: string }) => (
                  <div
                    key={e.id}
                    className="bg-white/[0.03] border border-white/8 rounded-xl p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-white/8 flex items-center justify-center text-white/60 text-xs font-bold">
                        {e.userName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white/70 text-sm font-medium">{e.userName}</span>
                      <span className="text-white/70 text-xs">
                        {new Date(e.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed">{e.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/70 text-sm">No endorsements yet. Be the first to share your experience.</p>
            )}
          </AnimatedSection>
        </div>
      </section>

      {/* Related Tools */}
      {relatedTools && relatedTools.length > 0 && (
        <section className="px-4 pb-20">
          <div className="max-w-3xl mx-auto">
            <AnimatedSection>
              <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
                Related Tools
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {relatedTools.map((rt: { id: number; slug: string; name: string; summary: string; logoUrl?: string; pricing: string }) => (
                  <Link key={rt.id} href={`/tools/${rt.slug}`}>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-[#7dd87d]/30 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3 mb-2">
                        {rt.logoUrl ? (
                          <img src={rt.logoUrl} alt={rt.name} className="w-8 h-8 rounded-lg object-cover border border-white/10" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-[#7dd87d]/10 border border-[#7dd87d]/20 flex items-center justify-center">
                            <Wrench className="w-4 h-4 text-[#7dd87d]" />
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium text-sm">{rt.name}</p>
                          <Badge className="text-[10px] bg-white/5 text-white/65 border-white/10 mt-0.5">
                            {rt.pricing === "open_source" ? "Open Source" : rt.pricing.charAt(0).toUpperCase() + rt.pricing.slice(1)}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-white/65 text-xs line-clamp-2">{rt.summary}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </section>
      )}
    </div>
  );
}
