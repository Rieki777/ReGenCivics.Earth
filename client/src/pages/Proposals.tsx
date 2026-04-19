/**
 * Community Proposals page.
 * Signal-based governance: submit proposals, vote, filter by category and status.
 */
import { useState, useMemo } from "react";
import { ChevronUp, Plus, X, Send, Filter } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { AnimatedSection } from "@/components/AnimatedSection";
import { PageTransition } from "@/components/PageTransition";
import { BackButton } from "@/components/BackButton";

const CATEGORIES = [
  { value: "fund_allocation", label: "Fund Allocation" },
  { value: "game_variable", label: "Game Variable Change" },
  { value: "new_quest", label: "New Quest" },
  { value: "food_economy", label: "Food Economy" },
  { value: "platform_feature", label: "Platform Feature" },
  { value: "community", label: "Community Initiative" },
  { value: "bff_initiative", label: "BFF Initiative" },
  { value: "partnership", label: "Partnership" },
  { value: "community_agreement", label: "Community Agreement" },
  { value: "other", label: "Other" },
] as const;

const TEMPLATE_TYPES = [
  { value: "fund_allocation", label: "Fund Allocation" },
  { value: "game_variable_change", label: "Game Variable Change" },
  { value: "new_quest", label: "New Quest" },
  { value: "food_economy", label: "Food Economy" },
  { value: "platform_feature", label: "Platform Feature" },
  { value: "community_initiative", label: "Community Initiative" },
  { value: "bff_initiative", label: "BFF Initiative" },
  { value: "partnership", label: "Partnership" },
] as const;

const STATUS_OPTIONS = [
  { value: "signaling", label: "Signaling", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { value: "threshold_reached", label: "Threshold Reached", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { value: "in_review", label: "In Review", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { value: "approved", label: "Approved", color: "bg-[#7dd87d]/10 text-[#7dd87d] border-[#7dd87d]/20" },
  { value: "rejected", label: "Rejected", color: "bg-red-500/10 text-red-400 border-red-500/20" },
  { value: "implemented", label: "Implemented", color: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
];

function getCategoryLabel(value: string) {
  return CATEGORIES.find(c => c.value === value)?.label ?? value;
}

function getStatusStyle(value: string) {
  return STATUS_OPTIONS.find(s => s.value === value) ?? STATUS_OPTIONS[0];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Proposals() {
  const { user, isAuthenticated } = useAuth();
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [templateType, setTemplateType] = useState<string>("");

  const proposalsQuery = trpc.proposals.list.useQuery({
    category: categoryFilter || undefined,
    status: statusFilter || undefined,
    limit: 50,
  });
  const myVotesQuery = trpc.proposals.myVotes.useQuery(undefined, { enabled: isAuthenticated });

  const createMutation = trpc.proposals.create.useMutation({
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setCategory("");
      setTemplateType("");
      setDialogOpen(false);
      proposalsQuery.refetch();
    },
  });

  const signalVoteMutation = trpc.proposals.signalVote.useMutation({
    onSuccess: () => { proposalsQuery.refetch(); myVotesQuery.refetch(); },
  });

  const removeVoteMutation = trpc.proposals.removeVote.useMutation({
    onSuccess: () => { proposalsQuery.refetch(); myVotesQuery.refetch(); },
  });

  const myVotes = useMemo(() => new Set(myVotesQuery.data || []), [myVotesQuery.data]);
  const proposals = proposalsQuery.data || [];

  // Co-Creator+ check: explorer is the base tier, everything else qualifies
  const isCoCreatorPlus = isAuthenticated && user && (user as any).citizenshipTier && (user as any).citizenshipTier !== "explorer";

  function handleVote(proposalId: number) {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    if (myVotes.has(proposalId)) {
      removeVoteMutation.mutate({ proposalId });
    } else {
      signalVoteMutation.mutate({ proposalId });
    }
  }

  function handleSubmit() {
    if (!title.trim() || !description.trim() || !category) return;
    createMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      category: category as any,
      templateType: templateType || undefined,
    });
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
        <SEO
          title="Community Proposals | ReGen Civics"
          description="Shape the direction of ReGen Civics. Submit proposals, signal your support, and help the community decide what matters."
        />
        <BackButton />

        {/* Hero */}
        <section className="relative pt-24 pb-10 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <AnimatedSection>
              <h1
                className="text-3xl md:text-5xl font-bold text-white mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Community Proposals
              </h1>
              <p className="text-white/70 text-base max-w-xl mx-auto mb-8">
                Shape the direction of ReGen Civics. Submit proposals, signal your support, and help the community decide what matters.
              </p>
            </AnimatedSection>

            {isCoCreatorPlus ? (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold px-6 py-3 rounded-full">
                    <Plus className="w-4 h-4 mr-2" />
                    New Proposal
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1a472a] border border-white/20 text-white max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-white text-lg font-bold">Submit a Proposal</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <input
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Proposal title"
                      className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm placeholder:text-white/55 outline-none focus:ring-1 focus:ring-[#7dd87d]/50"
                      maxLength={200}
                    />
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Describe your proposal. What should change and why?"
                      className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm placeholder:text-white/55 outline-none focus:ring-1 focus:ring-[#7dd87d]/50 min-h-[120px] resize-y"
                    />
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm outline-none"
                    >
                      <option value="" className="bg-[#1a472a]">Select category</option>
                      {CATEGORIES.map(c => (
                        <option key={c.value} value={c.value} className="bg-[#1a472a]">{c.label}</option>
                      ))}
                    </select>
                    <select
                      value={templateType}
                      onChange={e => setTemplateType(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm outline-none"
                    >
                      <option value="" className="bg-[#1a472a]">Template type (optional)</option>
                      {TEMPLATE_TYPES.map(t => (
                        <option key={t.value} value={t.value} className="bg-[#1a472a]">{t.label}</option>
                      ))}
                    </select>
                    <Button
                      onClick={handleSubmit}
                      disabled={!title.trim() || !description.trim() || !category || createMutation.isPending}
                      className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold rounded-full px-6 w-full"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {createMutation.isPending ? "Submitting..." : "Submit Proposal"}
                    </Button>
                    {createMutation.isError && (
                      <p className="text-red-400 text-sm">{createMutation.error?.message || "Something went wrong."}</p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            ) : isAuthenticated ? (
              <p className="text-white/60 text-sm">Co-Creator tier or above required to submit proposals.</p>
            ) : (
              <a
                href={getLoginUrl()}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#7dd87d] text-[#1a472a] font-bold"
              >
                Sign In to Participate
              </a>
            )}
          </div>
        </section>

        {/* Filter bar */}
        <section className="max-w-3xl mx-auto px-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-4 h-4 text-white/60" />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1.5 text-sm outline-none"
            >
              <option value="" className="bg-[#1a472a]">All Categories</option>
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value} className="bg-[#1a472a]">{c.label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1.5 text-sm outline-none"
            >
              <option value="" className="bg-[#1a472a]">All Statuses</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value} className="bg-[#1a472a]">{s.label}</option>
              ))}
            </select>
            <span className="text-white/60 text-sm ml-auto">
              {proposals.length} proposal{proposals.length !== 1 ? "s" : ""}
            </span>
          </div>
        </section>

        {/* Proposal cards */}
        <div className="max-w-3xl mx-auto px-4 pb-20">
          {proposalsQuery.isLoading ? (
            <div className="text-center py-12 text-white/60">Loading proposals...</div>
          ) : proposals.length === 0 ? (
            <div className="text-center py-12 text-white/60">
              No proposals yet. Be the first to submit one.
            </div>
          ) : (
            <div className="space-y-3">
              {proposals.map((p: any, i: number) => {
                const hasVoted = myVotes.has(p.id);
                const status = getStatusStyle(p.status);
                return (
                  <AnimatedSection key={p.id} delay={i * 0.03}>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors">
                      <div className="flex gap-3">
                        {/* Vote button */}
                        <button
                          onClick={() => handleVote(p.id)}
                          className={`flex flex-col items-center gap-0.5 min-w-[44px] pt-1 transition-colors ${
                            hasVoted ? "text-[#7dd87d]" : "text-white/60 hover:text-[#7dd87d]"
                          }`}
                          aria-label={hasVoted ? "Remove vote" : "Signal vote"}
                        >
                          <ChevronUp className="w-5 h-5" />
                          <span className="text-sm font-bold">{p.signalVoteCount ?? 0}</span>
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-bold text-white text-sm">{p.title}</h3>
                            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 rounded-full border ${status.color}`}>
                              {status.label}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 border border-white/10">
                              {getCategoryLabel(p.category)}
                            </Badge>
                          </div>
                          <p className="text-white/60 text-sm mb-2 line-clamp-2">{p.description}</p>
                          <div className="flex items-center gap-3 text-white/55 text-xs">
                            <span>{p.authorName ?? `User #${p.authorId}`}</span>
                            {p.createdAt && <span>{formatDate(p.createdAt)}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </AnimatedSection>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
