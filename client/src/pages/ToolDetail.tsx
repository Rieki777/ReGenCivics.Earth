/**
 * /tools/:slug: one tool in the ReGen Tools Library.
 *
 * Reads the fields tools.getBySlug returns (pricingModel, shortSummary,
 * longDescription, toolKind, totalClicks, categories as objects, endorsements
 * with comment). Until 2026-10-13 it read pricing, description, type,
 * clickCount and endorsement text, which the server never sent, and
 * tool.pricing.charAt threw: every tool page showed "Something went wrong".
 *
 * ADR-73 adds who brought the tool (an approved Alliance Partner), how many
 * accepted land projects use it, and an edit panel for the tool's owner.
 */
import { useState } from "react";
import { Wrench, ExternalLink, ArrowLeft, ThumbsUp, Users, Globe, Tag, Loader2, Handshake, Sprout, Pencil } from "lucide-react";
import { SEO } from "@/components/SEO";
import { AnimatedSection } from "@/components/AnimatedSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useParams } from "wouter";
import { TaoSpinner } from "@/components/TaoSpinner";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { TOOL_KINDS, usedByLine } from "@shared/toolLibrary";

export function pricingLabel(pricingModel: string | null | undefined): string {
  const p = pricingModel || "free";
  if (p === "open_source") return "Open Source";
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function pricingClass(p: string | null | undefined): string {
  switch (p || "free") {
    case "free": return "bg-[#7dd87d]/10 text-[#7dd87d] border-[#7dd87d]/20";
    case "open_source": return "bg-blue-500/10 text-blue-300 border-blue-500/20";
    case "freemium": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    default: return "bg-purple-500/10 text-purple-300 border-purple-500/20";
  }
}

export function kindLabel(tool: { toolKind?: string | null; isPhysical?: unknown }): string | null {
  const k = TOOL_KINDS.find((x) => x.id === tool.toolKind);
  if (k) return k.label;
  return tool.isPhysical ? "Physical tool" : null;
}

type EditableTool = {
  id: number;
  name: string;
  websiteUrl: string;
  shortSummary: string | null;
  longDescription: string | null;
  gettingStartedUrl: string | null;
  toolKind: string | null;
  isOpenSource: boolean | number | null;
};

const editField = "mt-1 block w-full min-h-11 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60";

function OwnerEditPanel({ tool, onSaved }: { tool: EditableTool; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(tool.name);
  const [websiteUrl, setWebsiteUrl] = useState(tool.websiteUrl);
  const [summary, setSummary] = useState(tool.shortSummary ?? "");
  const [description, setDescription] = useState(tool.longDescription ?? "");
  const [gettingStarted, setGettingStarted] = useState(tool.gettingStartedUrl ?? "");
  const [kind, setKind] = useState(tool.toolKind ?? "software");
  const [openSource, setOpenSource] = useState(!!tool.isOpenSource);
  const update = trpc.tools.updateMine.useMutation({
    onSuccess: () => { toast.success("Your listing is updated."); setOpen(false); onSaved(); },
    onError: (e) => toast.error(e.message),
  });

  if (!open) {
    return (
      <Button type="button" variant="outline" className="min-h-11 border-[#7dd87d]/40 bg-transparent text-[#7dd87d] hover:bg-[#7dd87d]/10" onClick={() => setOpen(true)}>
        <Pencil className="mr-2 h-4 w-4" /> Edit your listing
      </Button>
    );
  }
  return (
    <form
          noValidate
      className="mt-2 w-full space-y-3 rounded-xl border border-[#7dd87d]/30 bg-white/5 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        update.mutate({
          toolId: tool.id,
          name: name.trim(),
          websiteUrl,
          shortSummary: summary,
          longDescription: description,
          gettingStartedUrl: gettingStarted,
          toolKind: kind,
          isOpenSource: openSource,
        });
      }}
    >
      <p className="text-sm font-semibold text-white">Edit your listing</p>
      <label className="block text-sm text-white/85">Name<input className={editField} value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="block text-sm text-white/85">Link<input className={editField} type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} /></label>
      <label className="block text-sm text-white/85">Short description<textarea className={`${editField} min-h-[70px]`} value={summary} onChange={(e) => setSummary(e.target.value)} /></label>
      <label className="block text-sm text-white/85">More detail (optional)<textarea className={`${editField} min-h-[90px]`} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      <label className="block text-sm text-white/85">Getting started link (optional)<input className={editField} type="url" value={gettingStarted} onChange={(e) => setGettingStarted(e.target.value)} /></label>
      <div className="flex flex-wrap gap-2">
        {TOOL_KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            aria-pressed={kind === k.id}
            onClick={() => setKind(k.id)}
            className={`min-h-11 rounded-full border px-3 text-sm ${kind === k.id ? "border-[#7dd87d] bg-[#7dd87d]/20 text-white" : "border-white/20 text-white/80"}`}
          >
            {k.label}
          </button>
        ))}
        <label className="flex min-h-11 items-center gap-2 text-sm text-white/85">
          <input type="checkbox" checked={openSource} onChange={(e) => setOpenSource(e.target.checked)} /> Open source
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="min-h-11 bg-[#7dd87d] font-bold text-[#1a472a] hover:bg-[#9de89d]" disabled={update.isPending || !name.trim()}>
          {update.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save
        </Button>
        <Button type="button" variant="ghost" className="min-h-11 text-white/80" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}

export default function ToolDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";
  const { isAuthenticated } = useAuth();
  const [endorseText, setEndorseText] = useState("");
  const utils = trpc.useUtils();

  const { data: tool, isLoading } = trpc.tools.getBySlug.useQuery(
    { slug },
    { enabled: !!slug, staleTime: 30_000 }
  );
  const mine = trpc.tools.mine.useQuery(undefined, { enabled: isAuthenticated, staleTime: 60_000 });

  const trackClick = trpc.tools.trackClick.useMutation();

  const endorseMutation = trpc.tools.endorse.useMutation({
    onSuccess: () => {
      setEndorseText("");
      utils.tools.getBySlug.invalidate({ slug });
    },
  });

  const { data: relatedTools } = trpc.tools.list.useQuery(
    { limit: 5 },
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

  const categories: Array<{ name: string; slug?: string }> = Array.isArray(tool.categories) ? tool.categories : [];
  const regions: string[] = Array.isArray(tool.regions) ? tool.regions : [];
  const endorsements: Array<{ id: number; userName: string | null; comment: string | null; createdAt: string }> = Array.isArray(tool.endorsements) ? tool.endorsements : [];
  const kind = kindLabel(tool);
  const usedBy = usedByLine(tool.usedByProjects);
  const editable = (mine.data ?? []).find((m) => m.id === tool.id) ?? null;
  const related = (relatedTools ?? []).filter((rt: any) => rt.id !== tool.id).slice(0, 4);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO
        title={`${tool.name} | Tools Library | ReGen Civics`}
        description={tool.shortSummary ?? `${tool.name} in the ReGen Tools Library.`}
        url={`/tools/${slug}`}
      />

      {/* Back button */}
      <div className="pt-20 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/tools">
            <button className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors mb-6 min-h-11">
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
                    loading="lazy"
                    decoding="async"
                    className="w-16 h-16 rounded-xl object-cover border border-white/10 flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-[#7dd87d]/10 border border-[#7dd87d]/20 flex items-center justify-center flex-shrink-0">
                    <Wrench className="w-8 h-8 text-[#7dd87d]" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h1
                    className="text-2xl sm:text-3xl font-bold text-white mb-2 break-words"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {tool.name}
                  </h1>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={`text-xs ${pricingClass(tool.pricingModel)}`}>{pricingLabel(tool.pricingModel)}</Badge>
                    {kind && <Badge className="bg-white/5 text-white/80 border-white/10 text-xs">{kind}</Badge>}
                    {!!tool.isOpenSource && tool.pricingModel !== "open_source" && (
                      <Badge className="bg-blue-500/10 text-blue-300 border-blue-500/20 text-xs">Open Source</Badge>
                    )}
                  </div>
                </div>
              </div>

              {(tool.partnerName || usedBy) && (
                <div className="mb-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                  {tool.partnerName && (
                    <span className="flex items-center gap-1.5 text-[#c9f2c9]">
                      <Handshake className="h-4 w-4 text-[#7dd87d]" aria-hidden="true" />
                      Alliance Partner:{" "}
                      {tool.partnerUrl ? (
                        <a href={tool.partnerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2">{tool.partnerName}</a>
                      ) : (
                        <span className="font-semibold">{tool.partnerName}</span>
                      )}
                    </span>
                  )}
                  {usedBy && (
                    <span className="flex items-center gap-1.5 text-[#c9f2c9]">
                      <Sprout className="h-4 w-4 text-[#7dd87d]" aria-hidden="true" /> {usedBy}
                    </span>
                  )}
                </div>
              )}

              {tool.shortSummary && (
                <p className="text-white/85 text-base leading-relaxed mb-3">{tool.shortSummary}</p>
              )}
              {tool.longDescription && (
                <p className="text-white/70 text-sm leading-relaxed mb-5 whitespace-pre-wrap">{tool.longDescription}</p>
              )}

              {/* Categories */}
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {categories.map((cat, i) => (
                    <span
                      key={cat.slug ?? `${cat.name}-${i}`}
                      className="text-xs px-3 py-1 rounded-full bg-white/5 text-white/70 border border-white/10 flex items-center gap-1"
                    >
                      <Tag className="w-3 h-3" /> {cat.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Regions */}
              {regions.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {regions.map((region) => (
                    <span
                      key={region}
                      className="text-xs px-3 py-1 rounded-full bg-blue-500/5 text-blue-200 border border-blue-500/10 flex items-center gap-1"
                    >
                      <Globe className="w-3 h-3" /> {region}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats + CTA */}
              <div className="flex flex-wrap items-center gap-4">
                {tool.websiteUrl && (
                  <Button asChild className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold min-h-11">
                    <a
                      href={tool.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackClick.mutate({ toolId: tool.id })}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" /> Visit Website
                    </a>
                  </Button>
                )}
                {tool.gettingStartedUrl && (
                  <a href={tool.gettingStartedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm text-[#7dd87d] underline">
                    Getting started
                  </a>
                )}
                <span className="text-white/70 text-xs flex items-center gap-1">
                  <Users className="w-3 h-3" /> {tool.totalClicks ?? 0} views
                </span>
                {endorsements.length > 0 && (
                  <span className="text-white/70 text-xs flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" /> {endorsements.length} endorsement{endorsements.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              {editable && (
                <div className="mt-5 border-t border-white/10 pt-4">
                  <OwnerEditPanel
                    tool={editable}
                    onSaved={() => {
                      utils.tools.getBySlug.invalidate({ slug });
                      utils.tools.mine.invalidate();
                    }}
                  />
                </div>
              )}
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

            {isAuthenticated ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                <textarea
                  value={endorseText}
                  onChange={(e) => setEndorseText(e.target.value)}
                  placeholder="Share why you recommend this tool and how you have used it..."
                  aria-label="Your endorsement"
                  className="w-full rounded-lg border border-white/45 bg-white/5 px-3 py-2 text-white placeholder:text-white/70 text-sm resize-y min-h-[80px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd87d]/60 mb-3"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={() => endorseMutation.mutate({ toolId: tool.id, comment: endorseText })}
                    disabled={!endorseText.trim() || endorseMutation.isPending}
                    size="sm"
                    className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold min-h-11"
                  >
                    {endorseMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <ThumbsUp className="w-4 h-4 mr-1" />
                    )}
                    Endorse
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 text-center">
                <p className="text-white/70 text-sm mb-3">Sign in to share your endorsement.</p>
                <a href={getLoginUrl()}>
                  <Button
                    size="sm"
                    className="bg-[#7dd87d]/20 text-[#7dd87d] border border-[#7dd87d]/30 hover:bg-[#7dd87d]/30 min-h-11"
                  >
                    Sign In
                  </Button>
                </a>
              </div>
            )}

            {endorsements.length > 0 ? (
              <div className="space-y-3">
                {endorsements.map((e) => {
                  const who = e.userName?.trim() || "A member";
                  return (
                    <div key={e.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/70 text-xs font-bold">
                          {who.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white/80 text-sm font-medium">{who}</span>
                        <span className="text-white/70 text-xs">{new Date(e.createdAt).toLocaleDateString()}</span>
                      </div>
                      {e.comment && <p className="text-white/75 text-sm leading-relaxed">{e.comment}</p>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-white/70 text-sm">No endorsements yet. Be the first to share your experience.</p>
            )}
          </AnimatedSection>
        </div>
      </section>

      {/* Related Tools */}
      {related.length > 0 && (
        <section className="px-4 pb-20">
          <div className="max-w-3xl mx-auto">
            <AnimatedSection>
              <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
                More tools
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {related.map((rt: any) => (
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
                          <Badge className="text-[10px] bg-white/5 text-white/70 border-white/10 mt-0.5">{pricingLabel(rt.pricingModel)}</Badge>
                        </div>
                      </div>
                      {rt.shortSummary && <p className="text-white/70 text-xs line-clamp-2">{rt.shortSummary}</p>}
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
