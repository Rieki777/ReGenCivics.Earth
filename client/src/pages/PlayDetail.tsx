/**
 * Play Detail - Individual play page with collapsible sections, endorsements, and adopt
 * Route: /plays/:slug
 */
import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import {
  ArrowLeft,
  Gamepad2,
  ExternalLink,
  Users,
  Eye,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Check,
  Download,
} from "lucide-react";
import { SEO } from "@/components/SEO";
import { AnimatedSection } from "@/components/AnimatedSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { TaoSpinner } from "@/components/TaoSpinner";
import { getLoginUrl } from "@/const";

const PLAY_SECTIONS = [
  { key: "sectionIdentity", label: "Identity and Origin" },
  { key: "sectionGovernance", label: "Governance Model" },
  { key: "sectionEconomics", label: "Economic Design" },
  { key: "sectionLegal", label: "Legal Structure" },
  { key: "sectionRoles", label: "Roles and Circles" },
  { key: "sectionSeasons", label: "Seasonal Rhythm" },
  { key: "sectionLandEcology", label: "Land and Ecology" },
  { key: "sectionAgreements", label: "Community Agreements" },
  { key: "sectionConflict", label: "Conflict Resolution" },
  { key: "sectionHealth", label: "Health and Wellbeing" },
  { key: "sectionEducation", label: "Education and Knowledge" },
  { key: "sectionCulture", label: "Culture and Social Life" },
  { key: "sectionExternalRelations", label: "External Relations" },
  { key: "sectionScaling", label: "Scaling and Evolution" },
] as const;

function PlaySection({
  title,
  content,
}: {
  title: string;
  content?: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const hasContent = content != null && content.trim().length > 0;

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${
              hasContent ? "bg-[#7dd87d]" : "bg-white/20"
            }`}
          />
          <span className="text-white font-medium">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-white/40" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40" />
        )}
      </button>
      {isOpen && (
        <div className="px-5 pb-5 border-t border-white/10">
          {hasContent ? (
            <div className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap pt-4">
              {content}
            </div>
          ) : (
            <p className="text-white/60 text-sm italic pt-4">
              This section has not been filled in yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PlayDetail() {
  const [, params] = useRoute("/plays/:slug");
  const slug = params?.slug;
  const { isAuthenticated } = useAuth();
  const [endorseText, setEndorseText] = useState("");
  const [adopted, setAdopted] = useState(false);
  const viewTracked = useRef(false);

  const { data: play, isLoading } = trpc.plays.getBySlug.useQuery(
    { slug: slug! },
    { enabled: !!slug, staleTime: 30_000 }
  );

  const trackViewMutation = trpc.plays.trackView.useMutation();

  useEffect(() => {
    if (play?.id && !viewTracked.current) {
      viewTracked.current = true;
      trackViewMutation.mutate({ playId: play.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play?.id]);

  const adoptMutation = trpc.plays.adopt.useMutation({
    onSuccess: () => {
      setAdopted(true);
    },
  });

  const endorseMutation = trpc.plays.endorse.useMutation({
    onSuccess: () => {
      setEndorseText("");
    },
  });

  const handleAdopt = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    if (!play) return;
    adoptMutation.mutate({ playId: play.id });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818] flex items-center justify-center">
        <TaoSpinner size={48} />
      </div>
    );
  }

  if (!play) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818] flex items-center justify-center">
        <div className="text-center">
          <Gamepad2 className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <h2 className="text-white text-xl font-semibold mb-2">
            Play not found
          </h2>
          <p className="text-white/50 mb-6">
            This play may have been removed or the link is incorrect.
          </p>
          <Link href="/plays">
            <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Plays
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const pricingBadgeClass =
    play.pricingModel === "free"
      ? "bg-[#7dd87d]/10 text-[#7dd87d] border-[#7dd87d]/20"
      : play.pricingModel === "open_source"
      ? "bg-blue-500/10 text-blue-300 border-blue-500/20"
      : "bg-purple-500/10 text-purple-300 border-purple-500/20";

  const pricingLabel =
    play.pricingModel === "open_source"
      ? "Open Source"
      : play.pricingModel === "free"
      ? "Free"
      : play.pricingModel === "paid"
      ? play.externalPriceLabel || "Paid"
      : play.pricingModel
      ? play.pricingModel.charAt(0).toUpperCase() + play.pricingModel.slice(1)
      : "Free";

  const filledSections = PLAY_SECTIONS.filter((s) => {
    const val = play[s.key as keyof typeof play] as string | null | undefined;
    return val != null && val.trim().length > 0;
  }).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO
        title={`${play.name} | Plays | ReGen Civics`}
        description={play.summary || `Explore the ${play.name} community play on ReGen Civics.`}
        url={`/plays/${slug}`}
      />

      {/* Back button */}
      <div className="pt-20 px-4">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/plays"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Plays
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <AnimatedSection>
              <div>
                <h1
                  className="text-3xl md:text-4xl font-bold text-white mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {play.name}
                </h1>
                {play.creatorProjectName && (
                  <p className="text-[#7dd87d] text-sm mb-3">
                    by {play.creatorProjectName}
                  </p>
                )}
                {play.summary && (
                  <p className="text-white/70 text-base leading-relaxed">
                    {play.summary}
                  </p>
                )}
              </div>
            </AnimatedSection>

            {/* Section completion indicator */}
            <div className="flex items-center gap-2 text-white/40 text-xs">
              <Check className="w-3.5 h-3.5" />
              <span>
                {filledSections} of {PLAY_SECTIONS.length} sections filled
              </span>
            </div>

            {/* Collapsible Sections */}
            <AnimatedSection>
              <div className="space-y-2">
                {PLAY_SECTIONS.map((section) => {
                  const content = play[
                    section.key as keyof typeof play
                  ] as string | null | undefined;
                  return (
                    <PlaySection
                      key={section.key}
                      title={section.label}
                      content={content}
                    />
                  );
                })}
              </div>
            </AnimatedSection>

            {/* Endorsements */}
            <AnimatedSection>
              <div className="mt-8">
                <h2
                  className="text-xl font-bold text-white mb-4"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Community Endorsements
                </h2>

                {/* Endorsement form */}
                {isAuthenticated ? (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                    <Textarea
                      value={endorseText}
                      onChange={(e) => setEndorseText(e.target.value)}
                      placeholder="Share why you recommend this play and how it has shaped your community..."
                      className="w-full bg-transparent text-white placeholder:text-white/40 text-sm resize-none min-h-[80px] border-0 focus-visible:ring-0 mb-3"
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={() =>
                          endorseMutation.mutate({
                            playId: play.id,
                            comment: endorseText,
                          })
                        }
                        disabled={
                          !endorseText.trim() || endorseMutation.isPending
                        }
                        size="sm"
                        className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold"
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        {endorseMutation.isPending
                          ? "Submitting..."
                          : "Endorse this Play"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 text-center">
                    <p className="text-white/50 text-sm mb-3">
                      Sign in to share your endorsement.
                    </p>
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
                {play.endorsements?.length > 0 ? (
                  <div className="space-y-3">
                    {play.endorsements.map(
                      (e: {
                        id: number;
                        userName: string;
                        comment: string | null;
                        createdAt: string;
                      }) => (
                        <div
                          key={e.id}
                          className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center text-white/60 text-xs font-bold">
                              {(e.userName || "?").charAt(0).toUpperCase()}
                            </div>
                            <span className="text-white/70 text-sm font-medium">
                              {e.userName}
                            </span>
                            <span className="text-white/40 text-xs">
                              {new Date(e.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {e.comment && (
                            <p className="text-white/60 text-sm leading-relaxed">
                              {e.comment}
                            </p>
                          )}
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-white/70 text-sm">
                    No endorsements yet. Be the first to share your experience.
                  </p>
                )}
              </div>
            </AnimatedSection>
          </div>

          {/* Sidebar (1/3 width on desktop, sticky) */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 space-y-4">
              {/* Cover image */}
              {play.coverImageUrl ? (
                <img
                  src={play.coverImageUrl}
                  alt={play.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full rounded-xl object-cover border border-white/10"
                />
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-[#7dd87d]/20 to-[#1a472a]/40 rounded-xl flex items-center justify-center border border-white/10">
                  <Gamepad2 className="w-16 h-16 text-[#7dd87d]/30" />
                </div>
              )}

              {/* Pricing badge */}
              <Badge className={`text-xs ${pricingBadgeClass}`}>
                {pricingLabel}
              </Badge>

              {/* Scale badge */}
              {play.scale && (
                <Badge className="text-xs bg-white/5 text-white/70 border-white/10 ml-2">
                  {play.scale.charAt(0).toUpperCase() + play.scale.slice(1)}{" "}
                  scale
                </Badge>
              )}

              {/* Stats */}
              <div className="flex gap-4 text-white/50 text-sm">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" /> {play.totalAdoptions ?? 0}{" "}
                  adopted
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" /> {play.totalViews ?? 0} views
                </span>
              </div>

              {/* Adopt button */}
              {adopted || adoptMutation.isSuccess ? (
                <Button
                  disabled
                  className="w-full bg-[#7dd87d]/20 text-[#7dd87d] border border-[#7dd87d]/30 font-bold"
                >
                  <Check className="w-4 h-4 mr-2" /> Adopted
                </Button>
              ) : (
                <Button
                  onClick={handleAdopt}
                  disabled={adoptMutation.isPending}
                  className="w-full bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold"
                >
                  <Users className="w-4 h-4 mr-2" />
                  {adoptMutation.isPending ? "Adopting..." : "Adopt this Play"}
                </Button>
              )}

              {adoptMutation.isError && (
                <p className="text-red-400 text-xs">
                  {adoptMutation.error?.message || "Could not adopt this play."}
                </p>
              )}

              {/* Category tags */}
              {play.categories?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {play.categories.map(
                    (cat: { name: string; slug: string; color?: string }) => (
                      <Link key={cat.slug} href={`/plays?category=${cat.slug}`}>
                        <span
                          className="text-xs px-3 py-1 rounded-full bg-white/5 text-white/60 border border-white/10 hover:border-[#7dd87d]/30 transition-colors cursor-pointer"
                        >
                          {cat.name}
                        </span>
                      </Link>
                    )
                  )}
                </div>
              )}

              {/* Website link */}
              {play.websiteUrl && (
                <a
                  href={play.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[#7dd87d] hover:text-[#9de89d] text-sm transition-colors"
                >
                  <ExternalLink className="w-4 h-4" /> Visit Website
                </a>
              )}

              {/* Forum discussion link */}
              {play.forumThreadId && (
                <Link
                  href={`/community/post/${play.forumThreadId}`}
                  className="flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors"
                >
                  <MessageCircle className="w-4 h-4" /> Forum Discussion
                </Link>
              )}

              {/* Community type */}
              {play.communityType && (
                <div className="text-white/40 text-xs pt-2 border-t border-white/10">
                  Community type: {play.communityType}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
