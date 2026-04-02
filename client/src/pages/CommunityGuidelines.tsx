/**
 * Community Agreements
 * Interactive propose-and-vote page for community norms.
 * Two sections: ratified agreements + open proposals.
 */

import { useState, useMemo } from "react";
import { Link } from "wouter";
import { ArrowLeft, ChevronUp, MessageCircle, Plus, X, Send, Shield, CheckCircle2, Clock } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { BackButton } from "@/components/BackButton";
import { AnimatedSection } from "@/components/AnimatedSection";

const AGREEMENT_CATEGORIES = [
  { value: 'Forum Conduct', label: 'Forum Conduct', icon: '💬' },
  { value: 'Moderation', label: 'Moderation', icon: '🛡️' },
  { value: 'Land Projects', label: 'Land Projects', icon: '🌍' },
  { value: 'Governance', label: 'Governance', icon: '🏛️' },
  { value: 'Social Spaces', label: 'Social Spaces', icon: '🤝' },
  { value: 'Events', label: 'Events', icon: '📅' },
];

export default function CommunityGuidelines() {
  const { isAuthenticated } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState<'votes' | 'newest'>('votes');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  const ratifiedQuery = trpc.agreements.list.useQuery({ status: 'ratified', sortBy: 'newest' });
  const proposalsQuery = trpc.agreements.list.useQuery({ status: 'open', sortBy });
  const myVotesQuery = trpc.agreements.myVotes.useQuery(undefined, { enabled: isAuthenticated });

  const createMutation = trpc.agreements.create.useMutation({
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setCategory('');
      setShowForm(false);
      proposalsQuery.refetch();
    },
  });
  const voteMutation = trpc.agreements.toggleVote.useMutation({
    onSuccess: () => {
      proposalsQuery.refetch();
      myVotesQuery.refetch();
    },
  });

  const myVotes = useMemo(() => new Set(myVotesQuery.data || []), [myVotesQuery.data]);

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) return;
    createMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      category: category || undefined,
    });
  };

  const handleVote = (agreementId: number) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    voteMutation.mutate({ agreementId });
  };

  const ratified = ratifiedQuery.data || [];
  const proposals = proposalsQuery.data || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO
        title="Community Agreements | ReGen Civics"
        description="Agreements that shape how we show up in the ReGen Civics community. Propose and vote on new ones."
      />
      <BackButton />

      {/* Hero */}
      <section className="relative pt-24 pb-10 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-32 h-32 bg-[#7dd87d] rounded-full blur-[80px]" />
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-[#d4a574] rounded-full blur-[100px]" />
        </div>

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-[#7dd87d]/20 border border-[#7dd87d]/30">
            <Shield className="w-4 h-4 text-[#7dd87d]" />
            <span className="text-[#7dd87d] text-sm font-medium" style={{ fontFamily: 'var(--font-accent)' }}>
              The Gathering Grove
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Community Agreements
          </h1>
          <p className="text-white/70 text-base md:text-lg max-w-xl mx-auto mb-8" style={{ fontFamily: 'var(--font-body)' }}>
            This is a space for people building a regenerative world. These agreements help us keep it honest, generous, and worth showing up for.
          </p>

          {isAuthenticated ? (
            <Button
              onClick={() => setShowForm(!showForm)}
              className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#6bc86b] font-bold px-6 py-3 rounded-full text-base"
              style={{ fontFamily: 'var(--font-accent)' }}
            >
              {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {showForm ? 'Close' : 'Propose an Agreement'}
            </Button>
          ) : (
            <a
              href={getLoginUrl()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#7dd87d] text-[#1a472a] font-bold hover:bg-[#6bc86b] transition-colors"
              style={{ fontFamily: 'var(--font-accent)' }}
            >
              Sign In to Propose
            </a>
          )}
        </div>
      </section>

      {/* Proposal Form */}
      {showForm && (
        <section className="max-w-2xl mx-auto px-4 mb-8">
          <AnimatedSection animation="slide-up">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 space-y-4">
              <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'var(--font-display)' }}>
                Propose a New Agreement
              </h3>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Agreement title (e.g. 'Give credit when sharing others' work')"
                className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm placeholder:text-white/30 outline-none focus:ring-1 focus:ring-[#7dd87d]/50"
                maxLength={300}
              />
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what this agreement means in practice. Why does it matter? How should it be applied?"
                className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm placeholder:text-white/30 outline-none focus:ring-1 focus:ring-[#7dd87d]/50 min-h-[120px] resize-y"
                maxLength={5000}
              />
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm outline-none"
              >
                <option value="" className="bg-[#1a3a1f]">Category (optional)</option>
                {AGREEMENT_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value} className="bg-[#1a3a1f]">{c.icon} {c.label}</option>
                ))}
              </select>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSubmit}
                  disabled={!title.trim() || !description.trim() || createMutation.isPending}
                  className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#6bc86b] font-bold rounded-full px-6"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {createMutation.isPending ? 'Submitting...' : 'Submit Proposal'}
                </Button>
                <span className="text-white/60 text-xs">A forum thread will be created for discussion.</span>
              </div>
            </div>
          </AnimatedSection>
        </section>
      )}

      <div className="max-w-3xl mx-auto px-4 pb-20 space-y-10">

        {/* Ratified Agreements */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-[#7dd87d]" />
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              Active Agreements
            </h2>
            <span className="text-white/60 text-sm ml-1">({ratified.length})</span>
          </div>

          {ratifiedQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse bg-white/5 rounded-xl p-5 border border-white/10">
                  <div className="h-5 bg-white/10 rounded w-1/3 mb-2" />
                  <div className="h-4 bg-white/5 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {ratified.map((agreement, index) => (
                <AnimatedSection key={agreement.id} delay={index * 0.05}>
                  <div className="bg-white/5 backdrop-blur-sm border border-[#7dd87d]/20 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#7dd87d]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4 text-[#7dd87d]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-white text-sm" style={{ fontFamily: 'var(--font-display)' }}>
                            {agreement.title}
                          </h3>
                          {agreement.category && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7dd87d]/10 text-[#7dd87d]/80 border border-[#7dd87d]/20">
                              {agreement.category}
                            </span>
                          )}
                        </div>
                        <p className="text-white/60 text-sm leading-relaxed">{agreement.description}</p>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          )}
        </section>

        {/* Open Proposals */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#d4a574]" />
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                Proposals
              </h2>
              <span className="text-white/60 text-sm ml-1">({proposals.length})</span>
            </div>

            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 border border-white/10">
              <button
                onClick={() => setSortBy('votes')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  sortBy === 'votes' ? 'bg-[#7dd87d]/20 text-[#7dd87d]' : 'text-white/50 hover:text-white/70'
                }`}
              >
                Top
              </button>
              <button
                onClick={() => setSortBy('newest')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  sortBy === 'newest' ? 'bg-[#7dd87d]/20 text-[#7dd87d]' : 'text-white/50 hover:text-white/70'
                }`}
              >
                New
              </button>
            </div>
          </div>

          {proposalsQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse bg-white/5 rounded-xl p-5 border border-white/10">
                  <div className="h-5 bg-white/10 rounded w-1/3 mb-2" />
                  <div className="h-4 bg-white/5 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : proposals.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
              <Shield className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-white/50 text-sm mb-1">No open proposals yet.</p>
              <p className="text-white/30 text-xs">Be the first to suggest an agreement for the community.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {proposals.map((proposal, index) => {
                const hasVoted = myVotes.has(proposal.id);
                const rank = sortBy === 'votes' ? index + 1 : null;
                return (
                  <AnimatedSection key={proposal.id} delay={index * 0.05}>
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors">
                      <div className="flex gap-3">
                        {/* Vote button */}
                        <button
                          onClick={() => handleVote(proposal.id)}
                          className={`flex flex-col items-center gap-0.5 min-w-[44px] pt-1 transition-colors ${
                            hasVoted
                              ? 'text-[#7dd87d]'
                              : 'text-white/60 hover:text-[#7dd87d]'
                          }`}
                          aria-label={hasVoted ? 'Remove vote' : 'Vote for this proposal'}
                        >
                          <ChevronUp className={`w-5 h-5 ${hasVoted ? 'text-[#7dd87d]' : ''}`} />
                          <span className="text-sm font-bold">{proposal.voteCount}</span>
                          {rank && rank <= 3 && sortBy === 'votes' && (
                            <span className={`text-[10px] font-bold mt-0.5 ${
                              rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-gray-300' : 'text-amber-600'
                            }`}>
                              #{rank}
                            </span>
                          )}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-bold text-white text-sm" style={{ fontFamily: 'var(--font-display)' }}>
                              {proposal.title}
                            </h3>
                            {proposal.category && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 border border-white/10">
                                {proposal.category}
                              </span>
                            )}
                          </div>
                          <p className="text-white/60 text-sm leading-relaxed mb-2">{proposal.description}</p>
                          <div className="flex items-center gap-3 text-white/30 text-xs">
                            <span>{proposal.authorName}</span>
                            {proposal.forumThreadId && (
                              <Link
                                href={`/community/post/${proposal.forumThreadId}`}
                                className="inline-flex items-center gap-1 text-[#7dd87d]/60 hover:text-[#7dd87d] transition-colors"
                              >
                                <MessageCircle className="w-3 h-3" />
                                Discuss
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
          )}
        </section>

        {/* Footer */}
        <div className="border-t border-white/10 pt-6">
          <p className="text-white/30 text-xs text-center">
            These agreements evolve as the community does. Propose changes, vote on what matters, and discuss in the forum.
          </p>
        </div>
      </div>
    </div>
  );
}
