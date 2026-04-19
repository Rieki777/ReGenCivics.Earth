/**
 * Features & Bug Reports - Community-driven propose-and-vote for features
 * and bug reports. The form branches on formType ("feature" | "bug").
 */
import { useState, useMemo } from "react";
import { ChevronUp, MessageCircle, Plus, X, Send, Lightbulb, CheckCircle2, Hammer, Rocket } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { BackButton } from "@/components/BackButton";
import { AnimatedSection } from "@/components/AnimatedSection";
import { Link } from "wouter";

const CATEGORIES = ["Site", "Quests", "Forum", "Map", "Fund", "Game", "Events", "Other"];

const STATUS_BADGES: Record<string, { label: string; color: string; icon: typeof Lightbulb }> = {
  open: { label: "Open", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Lightbulb },
  planned: { label: "Planned", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: CheckCircle2 },
  building: { label: "Building", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: Hammer },
  shipped: { label: "Shipped", color: "bg-[#7dd87d]/10 text-[#7dd87d] border-[#7dd87d]/20", icon: Rocket },
};

export default function FeatureSuggestions() {
  const { isAuthenticated } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState<"votes" | "newest">("votes");
  const [formType, setFormType] = useState<"feature" | "bug">("feature");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const suggestionsQuery = trpc.features.list.useQuery({ sortBy });
  const myVotesQuery = trpc.features.myVotes.useQuery(undefined, { enabled: isAuthenticated });

  const createMutation = trpc.features.create.useMutation({
    onSuccess: () => { setTitle(""); setDescription(""); setCategory(""); setShowForm(false); suggestionsQuery.refetch(); },
  });
  const voteMutation = trpc.features.toggleVote.useMutation({
    onSuccess: () => { suggestionsQuery.refetch(); myVotesQuery.refetch(); },
  });

  const myVotes = useMemo(() => new Set(myVotesQuery.data || []), [myVotesQuery.data]);
  const suggestions = suggestionsQuery.data || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO
        title="Features & Bug Reports | ReGen Civics"
        description="Propose and vote on features for the ReGen Civics platform."
        image="/og/features.webp"
        url="/features"
      />
      <BackButton />

      <section className="relative pt-24 pb-10 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Features & Bug Reports
          </h1>
          <p className="text-white/70 text-base max-w-xl mx-auto mb-8 safe-prose">
            This site belongs to everyone building here. Propose features, report bugs, vote on what matters, and help shape what gets built next.
          </p>

          {isAuthenticated ? (
            <Button onClick={() => setShowForm(!showForm)} className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold px-6 py-3 rounded-full">
              {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {showForm ? "Close" : "Suggest or Report"}
            </Button>
          ) : (
            <a href={getLoginUrl()} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#7dd87d] text-[#1a472a] font-bold">
              Sign In to Suggest
            </a>
          )}
        </div>
      </section>

      {showForm && (
        <section className="max-w-2xl mx-auto px-4 mb-8">
          <div className="bg-white/10 border border-white/20 rounded-2xl p-6 space-y-4">
            {/* Bug / Feature toggle */}
            <div className="flex gap-2 bg-white/5 rounded-lg p-0.5 border border-white/10 w-fit">
              <button onClick={() => setFormType("feature")} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${formType === "feature" ? "bg-[#7dd87d]/20 text-[#7dd87d]" : "text-white/50"}`}>Feature Request</button>
              <button onClick={() => setFormType("bug")} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${formType === "bug" ? "bg-red-500/20 text-red-400" : "text-white/50"}`}>Report a Bug</button>
            </div>

            <input value={title} onChange={e => setTitle(e.target.value)} placeholder={formType === "bug" ? "What's broken?" : "Feature title"} className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm placeholder:text-white/55 outline-none focus:ring-1 focus:ring-[#7dd87d]/50" maxLength={300} />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={formType === "bug" ? "What happened? What did you expect? Steps to reproduce if possible." : "Describe what you'd like to see and why it matters."} className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm placeholder:text-white/55 outline-none focus:ring-1 focus:ring-[#7dd87d]/50 min-h-[100px] resize-y" maxLength={5000} />
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm outline-none">
              <option value="" className="bg-[#1a472a]">Category (optional)</option>
              {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#1a472a]">{c}</option>)}
            </select>
            <Button onClick={() => { if (title.trim() && description.trim()) createMutation.mutate({ title: `[${formType === "bug" ? "Bug" : "Feature"}] ${title.trim()}`, description: description.trim(), category: category || undefined }); }} disabled={!title.trim() || !description.trim() || createMutation.isPending} className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold rounded-full px-6">
              <Send className="w-4 h-4 mr-2" /> {createMutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </section>
      )}

      <div className="max-w-3xl mx-auto px-4 pb-20">
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/60 text-sm">{suggestions.length} {suggestions.length === 1 ? "item" : "items"}</span>
          <div className="flex gap-1 bg-white/5 rounded-lg p-0.5 border border-white/10">
            <button onClick={() => setSortBy("votes")} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${sortBy === "votes" ? "bg-[#7dd87d]/20 text-[#7dd87d]" : "text-white/50"}`}>Top</button>
            <button onClick={() => setSortBy("newest")} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${sortBy === "newest" ? "bg-[#7dd87d]/20 text-[#7dd87d]" : "text-white/50"}`}>New</button>
          </div>
        </div>

        <div className="space-y-3">
          {suggestions.map((s, i) => {
            const hasVoted = myVotes.has(s.id);
            const badge = STATUS_BADGES[s.status];
            return (
              <AnimatedSection key={s.id} delay={i * 0.03}>
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors">
                  <div className="flex gap-3">
                    <button onClick={() => { if (!isAuthenticated) { window.location.href = getLoginUrl(); return; } voteMutation.mutate({ suggestionId: s.id }); }} className={`flex flex-col items-center gap-0.5 min-w-[44px] pt-1 transition-colors ${hasVoted ? "text-[#7dd87d]" : "text-white/60 hover:text-[#7dd87d]"}`} aria-label={hasVoted ? "Remove vote" : "Vote"}>
                      <ChevronUp className="w-5 h-5" />
                      <span className="text-sm font-bold">{s.voteCount}</span>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap min-w-0">
                        <h3 className="font-bold text-white text-sm">{s.title}</h3>
                        {badge && <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badge.color}`}>{badge.label}</span>}
                        {s.category && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 border border-white/10">{s.category}</span>}
                      </div>
                      <p className="text-white/60 text-sm mb-2 safe-prose">{s.description}</p>
                      <div className="flex items-center gap-3 text-white/55 text-xs">
                        <span>{s.authorName}</span>
                        {s.forumThreadId && (
                          <Link href={`/community/post/${s.forumThreadId}`} className="inline-flex items-center gap-1 text-[#7dd87d]/60 hover:text-[#7dd87d]">
                            <MessageCircle className="w-3 h-3" /> Discuss
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </div>
  );
}
