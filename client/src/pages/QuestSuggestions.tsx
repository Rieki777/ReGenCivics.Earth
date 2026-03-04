/**
 * Quest Suggestions Page
 * "Suggest the Next Quest" - users can submit quest ideas and vote for favorites
 * Ranked by vote count, creating a community-driven quest priority list
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { getLoginUrl } from "@/const";
import { useState, useMemo } from "react";
import { 
  ArrowUp, Sparkles, Trophy, Flame, Clock, 
  ChevronUp, MessageCircle, Plus, X, Send,
  Compass, Zap, Target, Star
} from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

const QUEST_CATEGORIES = [
  { value: 'regeneration', label: 'Regeneration', icon: '🌱' },
  { value: 'community', label: 'Community', icon: '🤝' },
  { value: 'governance', label: 'Governance', icon: '🏛️' },
  { value: 'finance', label: 'Finance', icon: '💰' },
  { value: 'education', label: 'Education', icon: '📚' },
  { value: 'technology', label: 'Technology', icon: '⚡' },
  { value: 'creativity', label: 'Creativity', icon: '🎨' },
  { value: 'other', label: 'Other', icon: '✨' },
];

export default function QuestSuggestions() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState<'votes' | 'newest'>('votes');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  const suggestionsQuery = trpc.quests.suggestions.useQuery({ sortBy });
  const myVotesQuery = trpc.quests.myVotes.useQuery(undefined, { enabled: isAuthenticated });
  const createMutation = trpc.quests.create.useMutation({
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setCategory('');
      setShowForm(false);
      suggestionsQuery.refetch();
    },
  });
  const voteMutation = trpc.quests.toggleVote.useMutation({
    onSuccess: () => {
      suggestionsQuery.refetch();
      myVotesQuery.refetch();
    },
  });

  const myVotes = useMemo(() => new Set(myVotesQuery.data || []), [myVotesQuery.data]);

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) return;
    createMutation.mutate({ title: title.trim(), description: description.trim(), category: category || undefined });
  };

  const handleVote = (suggestionId: number) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    voteMutation.mutate({ suggestionId });
  };

  // Redirect non-authenticated users to the community gate page
  if (!isAuthenticated) {
    window.location.href = '/community';
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO title="Suggest the Next Quest | ReGen Civics" description="Submit quest ideas and vote for your favorites. Community-driven quest creation for the regenerative renaissance." />

      {/* Hero Section */}
      <section className="relative pt-24 pb-12 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-32 h-32 bg-[#7dd87d] rounded-full blur-[80px]" />
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-[#d4a574] rounded-full blur-[100px]" />
        </div>

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-[#7dd87d]/20 border border-[#7dd87d]/30">
              <Compass className="w-4 h-4 text-[#7dd87d]" />
              <span className="text-[#7dd87d] text-sm font-medium" style={{ fontFamily: 'var(--font-accent)' }}>
                Community-Driven Quests
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              {t('quest.suggestTitle')}
            </h1>
            <p className="text-white/70 text-base md:text-lg max-w-xl mx-auto mb-8" style={{ fontFamily: 'var(--font-body)' }}>
              {t('quest.suggestSubtitle')}
            </p>

            {isAuthenticated ? (
              <Button
                onClick={() => setShowForm(!showForm)}
                className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#6bc86b] font-bold px-6 py-3 rounded-full text-base"
                style={{ fontFamily: 'var(--font-accent)' }}
              >
                {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                {showForm ? t('common.close') : t('quest.submitSuggestion')}
              </Button>
            ) : (
              <a
                href={getLoginUrl()}
                className="inline-flex items-center gap-2 bg-[#7dd87d] text-[#1a472a] hover:bg-[#6bc86b] font-bold px-6 py-3 rounded-full text-base transition-colors"
                style={{ fontFamily: 'var(--font-accent)' }}
              >
                {t('auth.loginToPost')}
              </a>
            )}
          </motion.div>
        </div>
      </section>

      {/* Submission Form */}
      <AnimatePresence>
        {showForm && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-8 overflow-hidden"
          >
            <div className="max-w-2xl mx-auto bg-white/5 backdrop-blur-sm border border-[#7dd87d]/30 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-[#7dd87d] mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                Share Your Quest Idea
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-white/80 text-sm mb-1 block">{t('quest.questName')}</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Regenerative Agriculture Challenge"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-[#7dd87d]/50 transition-colors"
                    maxLength={300}
                  />
                </div>

                <div>
                  <label className="text-white/80 text-sm mb-1 block">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {QUEST_CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => setCategory(category === cat.value ? '' : cat.value)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                          category === cat.value
                            ? 'bg-[#7dd87d] text-[#1a472a] font-semibold'
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                      >
                        {cat.icon} {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-white/80 text-sm mb-1 block">{t('quest.questDescription')}</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the quest, its goals, and why it matters to the regenerative movement..."
                    rows={4}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-[#7dd87d]/50 transition-colors resize-none"
                    maxLength={5000}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    className="border-white/20 text-white/70 hover:bg-white/10"
                  >
                    {t('forum.cancel')}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!title.trim() || !description.trim() || createMutation.isPending}
                    className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#6bc86b] font-bold"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {createMutation.isPending ? t('common.loading') : t('quest.submitSuggestion')}
                  </Button>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Sort Controls */}
      <section className="px-4 pb-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            {t('quest.topSuggestions')}
          </h2>
          <div className="flex gap-1 bg-white/5 rounded-full p-1">
            <button
              onClick={() => setSortBy('votes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                sortBy === 'votes' ? 'bg-[#7dd87d] text-[#1a472a] font-semibold' : 'text-white/60 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" /> Top
            </button>
            <button
              onClick={() => setSortBy('newest')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                sortBy === 'newest' ? 'bg-[#7dd87d] text-[#1a472a] font-semibold' : 'text-white/60 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> New
            </button>
          </div>
        </div>
      </section>

      {/* Suggestions List */}
      <section className="px-4 pb-24">
        <div className="max-w-3xl mx-auto space-y-3">
          {suggestionsQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white/5 rounded-xl p-5 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-white/10 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-white/10 rounded w-3/4" />
                      <div className="h-4 bg-white/10 rounded w-full" />
                      <div className="h-4 bg-white/10 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : suggestionsQuery.data?.length === 0 ? (
            <div className="text-center py-16">
              <Sparkles className="w-12 h-12 text-[#7dd87d]/40 mx-auto mb-4" />
              <h3 className="text-white/60 text-lg mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                No quest suggestions yet
              </h3>
              <p className="text-white/40 text-sm mb-6">Be the first to suggest a quest for the community!</p>
              {isAuthenticated && (
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#6bc86b] font-bold rounded-full"
                >
                  <Plus className="w-4 h-4 mr-2" /> Suggest a Quest
                </Button>
              )}
            </div>
          ) : (
            suggestionsQuery.data?.map((suggestion, index) => {
              const hasVoted = myVotes.has(suggestion.id);
              const catInfo = QUEST_CATEGORIES.find(c => c.value === suggestion.category);

              return (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl p-4 md:p-5 transition-all group"
                >
                  <div className="flex gap-3 md:gap-4">
                    {/* Vote Button */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <button
                        onClick={() => handleVote(suggestion.id)}
                        disabled={voteMutation.isPending}
                        className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex flex-col items-center justify-center transition-all ${
                          hasVoted
                            ? 'bg-[#7dd87d] text-[#1a472a] shadow-lg shadow-[#7dd87d]/20'
                            : 'bg-white/10 text-white/60 hover:bg-[#7dd87d]/20 hover:text-[#7dd87d]'
                        }`}
                      >
                        <ChevronUp className="w-5 h-5" />
                        <span className="text-sm font-bold -mt-1">{suggestion.voteCount}</span>
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        {index < 3 && sortBy === 'votes' && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                            index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                            index === 1 ? 'bg-gray-400/20 text-gray-300' :
                            'bg-orange-500/20 text-orange-400'
                          }`}>
                            #{index + 1}
                          </span>
                        )}
                        <h3 className="text-white font-bold text-base leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                          {suggestion.title}
                        </h3>
                      </div>

                      <p className="text-white/60 text-sm leading-relaxed line-clamp-2 mb-2">
                        {suggestion.description}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-white/40">
                        {catInfo && (
                          <span className="bg-white/10 px-2 py-0.5 rounded-full">
                            {catInfo.icon} {catInfo.label}
                          </span>
                        )}
                        <span>by {suggestion.authorName}</span>
                        <span>{new Date(suggestion.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </section>

      {/* Back to Forum Link */}
      <section className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none">
        <Link
          href="/community"
          className="pointer-events-auto inline-flex items-center gap-2 bg-[#1a472a]/90 backdrop-blur-sm border border-[#7dd87d]/30 text-[#7dd87d] px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[#1a472a] transition-colors shadow-lg"
        >
          <MessageCircle className="w-4 h-4" />
          Back to Forum
        </Link>
      </section>
    </div>
  );
}
