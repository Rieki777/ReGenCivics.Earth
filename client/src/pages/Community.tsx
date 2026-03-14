/**
 * Community Forum - Main Page
 * Categories overview with post counts, recent activity, and new post CTA
 * Design: Enchanted forest storybook theme, playful and welcoming
 */
import { Link, useLocation } from "wouter";
import { 
  MessageCircle, Sprout, Coins, Handshake, Scale, BookOpen, 
  UserPlus, Lightbulb, ArrowRight, Plus, Users, Eye, Clock,
  Leaf, Sparkles, TrendingUp, Search, Trees, Vote, Gamepad2,
  Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SEO, pageSEO } from "@/components/SEO";
import { BackButton } from "@/components/BackButton";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useState, useMemo, useEffect } from "react";
import { AnimatedSection } from "@/components/AnimatedSection";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { SocialLinks } from "@/components/SocialLinks";
import { NewsletterSignupInline } from "@/components/NewsletterSignup";
import { isNewsletterSubscribed } from "@/utils/newsletter";
import AMABanner from "@/components/AMABanner";
import { BannerDisplay } from "@/components/BannerDisplay";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageTransition, ScrollRevealMotion, HoverCard, FloatElement } from "@/components/PageTransition";
import { motion } from "framer-motion";

// Icon mapping for categories
const iconMap: Record<string, React.ReactNode> = {
  MessageCircle: <MessageCircle className="w-5 h-5" />,
  Sprout: <Sprout className="w-5 h-5" />,
  Coins: <Coins className="w-5 h-5" />,
  Handshake: <Handshake className="w-5 h-5" />,
  Scale: <Scale className="w-5 h-5" />,
  BookOpen: <BookOpen className="w-5 h-5" />,
  UserPlus: <UserPlus className="w-5 h-5" />,
  Lightbulb: <Lightbulb className="w-5 h-5" />,
  Trees: <Trees className="w-5 h-5" />,
  TrendingUp: <TrendingUp className="w-5 h-5" />,
  Vote: <Vote className="w-5 h-5" />,
  Gamepad2: <Gamepad2 className="w-5 h-5" />,
  Heart: <Heart className="w-5 h-5" />,
  Users: <Users className="w-5 h-5" />,
  Leaf: <Leaf className="w-5 h-5" />,
  Sparkles: <Sparkles className="w-5 h-5" />,
};

function timeAgo(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function Community() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [alreadySubscribed] = useState(() => isNewsletterSubscribed());
  const { t } = useLanguage();

  // Track forum visit so ProgressiveOnboarding can show the "Back to Forum" card
  useEffect(() => {
    try { localStorage.setItem('regen_visited_forum', 'true'); } catch { /* ignore */ }
  }, []);

  const { data: categories, isLoading } = trpc.forum.categories.useQuery();
  const { data: landProjectThreads } = trpc.forum.activeProjectThreads.useQuery();
  const { data: organisationThreads } = trpc.forum.activeOrganisationThreads.useQuery();
  const { data: airThreads, isLoading: airLoading } = trpc.forum.activeAirThreads.useQuery();
  const { data: pulseData } = trpc.forum.communityPulse.useQuery();

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.description && c.description.toLowerCase().includes(q))
    );
  }, [categories, searchQuery]);

  const totalPosts = useMemo(() => {
    if (!categories) return 0;
    return categories.reduce((sum, c) => sum + (c.postCount || 0), 0);
  }, [categories]);

  const fireQuestData = [
    { id: "quest-0", title: "Quest 0: Fire", subtitle: "Letting burn what no longer serves", href: "/quest" },
    { id: "quest-4", title: "Quest 4: Food Foresting", subtitle: "Seed the land with what you want to grow", href: "/quest" },
    { id: "quest-10", title: "Quest 10: NVC", subtitle: "The bridge from healing into community", href: "/quest" },
  ];

  // Members-only gate: show branded sign-in page for non-authenticated visitors
  if (!isAuthenticated) {
    return (
      <PageTransition>
      <div className="min-h-screen bg-[#f8f5f0]">
        <SEO {...pageSEO.community} />
        <BackButton />
        <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a472a] via-[#2d5a3f] to-[#1a472a]" />
          <div className="absolute top-20 left-4 opacity-20">
            <Leaf className="w-24 h-24 text-[#7dd87d] animate-pulse" />
          </div>
          <div className="absolute bottom-20 right-8 opacity-15">
            <Sparkles className="w-16 h-16 text-[#d4a574]" />
          </div>
          <div className="absolute top-40 right-20 opacity-10">
            <Trees className="w-20 h-20 text-[#7dd87d]" />
          </div>
          <div className="container relative z-10 px-4 max-w-lg mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-[#7dd87d]/20 border border-[#7dd87d]/30">
                <SeedOfLifeIcon className="w-4 h-4 text-[#7dd87d]" />
                <span className="text-[#7dd87d] text-sm font-medium" style={{ fontFamily: 'var(--font-accent)' }}>
                  Members Only
                </span>
              </div>
              
              <h1 
                className="text-3xl md:text-5xl font-bold text-white mb-4"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Welcome to the<br />
                <span className="text-[#7dd87d]">Gathering Grove</span>
              </h1>
              
              <p className="text-white/80 text-base md:text-lg mb-3 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                A members-only space where regenerators connect, share wisdom, and grow together.
              </p>
              <p className="text-white/60 text-sm mb-8" style={{ fontFamily: 'var(--font-body)' }}>
                Create a free profile to join the conversation, suggest quests, and connect with the community.
              </p>

              <Button 
                onClick={() => window.location.href = getLoginUrl()}
                className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] font-bold px-8 py-3 rounded-full text-lg shadow-lg shadow-[#7dd87d]/20 hover:shadow-[#7dd87d]/40 transition-all"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Create Your Profile
              </Button>

              <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-[#7dd87d] text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>9</div>
                  <div className="text-white/50 text-xs">Topic Groves</div>
                </div>
                <div>
                  <div className="text-[#7dd87d] text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{totalPosts}</div>
                  <div className="text-white/50 text-xs">Discussions</div>
                </div>
                <div>
                  <div className="text-[#7dd87d] text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Free</div>
                  <div className="text-white/50 text-xs">To Join</div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-[#f8f5f0]">
      <SEO {...pageSEO.community} />
      <AMABanner />
      <BannerDisplay bannerKey="community-banner" />
      <BackButton />

      {/* Hero Section */}
      <section className="relative pt-24 pb-12 md:pt-32 md:pb-16 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a472a] via-[#2d5a3f] to-[#f8f5f0]" />
        
        {/* Decorative elements */}
        <div className="absolute top-20 left-4 opacity-20">
          <Leaf className="w-16 h-16 text-[#7dd87d]" />
        </div>
        <div className="absolute top-32 right-8 opacity-15">
          <Sparkles className="w-12 h-12 text-[#d4a574]" />
        </div>

        <div className="container relative z-10 px-4 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 rounded-full bg-[#7dd87d]/20 border border-[#7dd87d]/30">
            <SeedOfLifeIcon className="w-4 h-4 text-[#7dd87d]" />
            <span className="text-[#7dd87d] text-sm font-medium" style={{ fontFamily: 'var(--font-accent)' }}>
              {t('forum.title')}
            </span>
          </div>
          
          <h1 
            className="text-3xl md:text-5xl font-bold text-white mb-3"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {t('forum.subtitle')}
          </h1>
          <p className="text-white/80 text-base md:text-lg max-w-2xl mx-auto mb-6" style={{ fontFamily: 'var(--font-body)' }}>
            Where regenerators connect, share wisdom, and grow together.
            Every conversation plants a seed for the future.
          </p>

          {/* Stats bar */}
          <div className="flex items-center justify-center gap-6 text-white/70 text-sm mb-6">
            <div className="flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4" />
              <span>{totalPosts} {totalPosts === 1 ? t('forum.thread') : t('forum.threads')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>{categories?.length || 0} {t('forum.topics')}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {isAuthenticated ? (
              <Button 
                onClick={() => navigate('/community/new')}
                className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] font-bold px-6 py-2.5 rounded-full"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('forum.startDiscussion')}
              </Button>
            ) : (
              <Button 
                onClick={() => window.location.href = getLoginUrl()}
                className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] font-bold px-6 py-2.5 rounded-full"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Sign In to Join
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Search Bar */}
      <section className="container px-4 max-w-4xl mx-auto -mt-4 mb-6 relative z-20">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a7c59]/50" />
          <Input
            placeholder={t('forum.searchTopics')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white border-[#4a7c59]/20 rounded-xl focus:border-[#7dd87d] focus:ring-[#7dd87d]/20 text-[#1a472a]"
            style={{ fontFamily: 'var(--font-body)' }}
          />
        </div>
      </section>

      {/* Community Pulse Strip */}
      <section className="container px-4 max-w-4xl mx-auto py-3 border-b border-[#e8e4de] -mt-4 mb-4">
        <p className="text-[#1a472a]/70 text-sm text-center" style={{ fontFamily: 'var(--font-body)' }}>
          {pulseData && (pulseData.playersPostedThisWeek > 0 || pulseData.newThreadsThisWeek > 0)
            ? `${pulseData.playersPostedThisWeek} ${pulseData.playersPostedThisWeek === 1 ? 'player' : 'players'} posted this week · ${pulseData.newThreadsThisWeek} new ${pulseData.newThreadsThisWeek === 1 ? 'thread' : 'threads'}`
            : 'Community is warming up'}
        </p>
      </section>

      {/* Welcome Card (shown to unauthenticated users) */}
      {!isAuthenticated && (
        <section className="container px-4 max-w-4xl mx-auto mb-6">
          <div className="bg-[#f0f7f0] border border-[#7dd87d]/30 rounded-xl p-6">
            <h3 className="font-bold text-[#1a472a] text-base mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              New to ReGen Civics?
            </h3>
            <p className="text-[#1a472a]/70 text-sm mb-4" style={{ fontFamily: 'var(--font-body)' }}>
              Start here: introduce yourself, share what brought you to the regen movement, and find your first quest.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/quest">
                <span className="text-[#4a7c59] text-sm font-medium hover:text-[#1a472a] transition-colors cursor-pointer flex items-center gap-1">
                  Welcome Aboard Quests <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
              <Link href="/forum/welcome-aboard">
                <span className="text-[#4a7c59] text-sm font-medium hover:text-[#1a472a] transition-colors cursor-pointer flex items-center gap-1">
                  Introduce yourself <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
              <Link href="/profile">
                <span className="text-[#4a7c59] text-sm font-medium hover:text-[#1a472a] transition-colors cursor-pointer flex items-center gap-1">
                  Set up your profile <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Categories Grid */}
      <section className="container px-4 max-w-4xl mx-auto pb-16">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl p-5 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
                    <div className="h-4 bg-gray-100 rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-[#4a7c59]/30 mx-auto mb-3" />
            <p className="text-[#1a472a]/60" style={{ fontFamily: 'var(--font-body)' }}>
              {searchQuery ? 'No topics match your search.' : 'No categories yet. Check back soon!'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCategories.map((category, index) => (
              <AnimatedSection key={category.id} delay={index * 0.05}>
                <Link href={`/community/c/${category.slug}`}>
                  <div className="bg-white rounded-xl p-4 md:p-5 border border-[#e8e4de] hover:border-[#7dd87d]/40 hover:shadow-md transition-all duration-200 cursor-pointer group">
                    <div className="flex items-start gap-3 md:gap-4">
                      {/* Category Icon */}
                      <div
                        className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                        style={{ backgroundColor: `${category.color}20`, color: category.color || '#4a7c59' }}
                      >
                        {iconMap[category.icon || 'MessageCircle'] || <MessageCircle className="w-5 h-5" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3
                            className="font-bold text-[#1a472a] text-base md:text-lg group-hover:text-[#4a7c59] transition-colors truncate"
                            style={{ fontFamily: 'var(--font-display)' }}
                          >
                            {category.name}
                          </h3>
                        </div>
                        <p className="text-[#1a472a]/60 text-sm line-clamp-2" style={{ fontFamily: 'var(--font-body)' }}>
                          {category.description}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <Badge
                          variant="secondary"
                          className="bg-[#f0f7f0] text-[#4a7c59] border-0 text-xs"
                        >
                          {category.postCount || 0} {(category.postCount || 0) === 1 ? 'thread' : 'threads'}
                        </Badge>
                        <ArrowRight className="w-4 h-4 text-[#4a7c59]/30 group-hover:text-[#7dd87d] group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </div>
                </Link>
              </AnimatedSection>
            ))}
          </div>
        )}

        {/* Earth: Land Project Spaces */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-[#1a472a] mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            🌍 Earth
          </h2>
          <p className="text-[#1a472a]/60 text-sm mb-3" style={{ fontFamily: 'var(--font-body)' }}>
            Land project spaces. Where the work is rooted.
          </p>
          {!landProjectThreads || landProjectThreads.length === 0 ? (
            <p className="text-[#1a472a]/50 text-sm bg-white rounded-xl p-4 border border-[#e8e4de]">
              Land project spaces will appear here as projects join the alliance.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {landProjectThreads.map((thread: { id: number; title: string }) => {
                const projectName = thread.title.replace(/ - Land Project Forum$/, "");
                return (
                  <Link key={thread.id} href={`/community/post/${thread.id}`}>
                    <div className="bg-white rounded-xl p-4 border border-[#e8e4de] hover:border-[#7dd87d]/40 hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#7dd87d]/15 flex items-center justify-center flex-shrink-0">
                          <MessageCircle className="w-4 h-4 text-[#4a7c59]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#1a472a] text-sm truncate group-hover:text-[#4a7c59] transition-colors">
                            {projectName}
                          </p>
                          <p className="text-[#1a472a]/50 text-xs">Visit Forum</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#4a7c59]/30 group-hover:text-[#7dd87d] group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Water: Alliance Organisation Spaces */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-[#1a472a] mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            🌊 Water
          </h2>
          <p className="text-[#1a472a]/60 text-sm mb-3" style={{ fontFamily: 'var(--font-body)' }}>
            Alliance organisations. Networks and partners moving together.
          </p>
          {!organisationThreads || organisationThreads.length === 0 ? (
            <p className="text-[#1a472a]/50 text-sm bg-white rounded-xl p-4 border border-[#e8e4de]">
              Organisation spaces will appear here as partners join the alliance.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {organisationThreads.map((thread: { id: number; title: string }) => (
                <Link key={thread.id} href={`/community/post/${thread.id}`}>
                  <div className="bg-white rounded-xl p-4 border border-[#e8e4de] hover:border-[#7dd87d]/40 hover:shadow-md transition-all cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#d4a574]/15 flex items-center justify-center flex-shrink-0">
                        <Handshake className="w-4 h-4 text-[#4a7c59]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#1a472a] text-sm truncate group-hover:text-[#4a7c59] transition-colors">
                          {thread.title}
                        </p>
                        <p className="text-[#1a472a]/50 text-xs">Visit Forum</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#4a7c59]/30 group-hover:text-[#7dd87d] group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Fire: Quests and Challenges */}
        <div className="mt-8 bg-amber-50/50 rounded-2xl p-5 border border-amber-200/40">
          <h2 className="text-lg font-bold text-[#1a472a] mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            🔥 Fire
          </h2>
          <p className="text-[#1a472a]/60 text-sm mb-4" style={{ fontFamily: 'var(--font-body)' }}>
            Quests and challenges. Where regeneration gets real.
          </p>
          <div className="bg-amber-100/60 rounded-xl p-4 mb-4 flex items-center justify-between gap-3">
            <p className="text-amber-900/80 text-sm" style={{ fontFamily: 'var(--font-body)' }}>
              Looking for your next quest? The game is on.
            </p>
            <Link href="/quest">
              <span className="text-amber-700 text-sm font-semibold hover:text-amber-900 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1">
                Explore Quests <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {fireQuestData.map((quest) => (
              <div key={quest.id} className="bg-white rounded-xl p-4 border border-amber-200/60 hover:border-amber-400/60 hover:shadow-md transition-all group">
                <p className="font-semibold text-[#1a472a] text-sm mb-1 group-hover:text-amber-800 transition-colors" style={{ fontFamily: 'var(--font-display)' }}>
                  {quest.title}
                </p>
                <p className="text-[#1a472a]/50 text-xs mb-3" style={{ fontFamily: 'var(--font-body)' }}>
                  {quest.subtitle}
                </p>
                <Link href={quest.href}>
                  <span className="inline-flex items-center gap-1 text-amber-700 text-xs font-medium hover:text-amber-900 transition-colors cursor-pointer">
                    Join the Quest <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Air: Hard Conversations */}
        <div className="mt-8 bg-slate-50/50 rounded-2xl p-5 border border-slate-200/40">
          <h2 className="text-lg font-bold text-[#1a472a] mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            🍃 Air
          </h2>
          <p className="text-[#1a472a]/60 text-sm mb-4" style={{ fontFamily: 'var(--font-body)' }}>
            Some things need to move. This is where we say the hard thing, clear what's stagnant, and make space for what comes next.
          </p>
          {airLoading ? (
            <p className="text-[#1a472a]/40 text-sm">Loading...</p>
          ) : !airThreads || airThreads.length === 0 ? (
            <div className="flex items-center justify-between gap-3 bg-white rounded-xl p-4 border border-slate-200/60">
              <p className="text-[#1a472a]/50 text-sm" style={{ fontFamily: 'var(--font-body)' }}>
                No threads yet. Be the first to clear the air.
              </p>
              <Link href="/forum/air-conversations">
                <span className="text-slate-600 text-sm font-medium hover:text-slate-800 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1">
                  Start a thread <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {airThreads.map((thread: { id: number; title: string }) => (
                <Link key={thread.id} href={`/community/post/${thread.id}`}>
                  <div className="bg-white rounded-xl p-4 border border-slate-200/60 hover:border-slate-400/60 hover:shadow-md transition-all cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#1a472a] text-sm truncate group-hover:text-slate-700 transition-colors">
                          {thread.title}
                        </p>
                        <p className="text-[#1a472a]/50 text-xs">Join the conversation</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Tag filter and chain shortcuts */}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/community/lessons">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#fef3c7] border border-[#d97706]/20 text-[#92400e] text-sm font-medium hover:border-[#d97706]/50 transition-colors cursor-pointer">
              <BookOpen className="w-3.5 h-3.5" />
              #lesson
            </span>
          </Link>
          <Link href="/community/seeking-support">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#dbeafe] border border-[#3b82f6]/20 text-[#1e40af] text-sm font-medium hover:border-[#3b82f6]/50 transition-colors cursor-pointer">
              <Heart className="w-3.5 h-3.5" />
              #seeking-support
            </span>
          </Link>
          <Link href="/community/offering-support">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#dcfce7] border border-[#16a34a]/20 text-[#166534] text-sm font-medium hover:border-[#16a34a]/50 transition-colors cursor-pointer">
              <Users className="w-3.5 h-3.5" />
              #offering-support
            </span>
          </Link>
          <Link href="/community/chains">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ede9fe] border border-[#7c3aed]/20 text-[#5b21b6] text-sm font-medium hover:border-[#7c3aed]/50 transition-colors cursor-pointer">
              <TrendingUp className="w-3.5 h-3.5" />
              Thread Chains
            </span>
          </Link>
          <Link href="/community/seeking-team">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f3e8ff] border border-[#a855f7]/20 text-[#7e22ce] text-sm font-medium hover:border-[#a855f7]/50 transition-colors cursor-pointer">
              <Users className="w-3.5 h-3.5" />
              Seeking Team
            </span>
          </Link>
        </div>

        {/* Community Guidelines */}
        <div className="mt-6 bg-[#f0f7f0] rounded-xl p-5 border border-[#7dd87d]/20">
          <div className="flex items-start gap-3">
            <Leaf className="w-5 h-5 text-[#4a7c59] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-[#1a472a] text-sm mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                {t('forum.guidelines')}
              </h3>
              <p className="text-[#1a472a]/70 text-xs leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                {t('forum.guidelinesText')}
              </p>
            </div>
          </div>
        </div>

        {/* Newsletter CTA */}
        <ScrollRevealMotion>
          <div className="mt-6 p-4 rounded-xl border border-[#7dd87d]/20 bg-[#0d1f0d]/40">
            <h3 className="text-white/80 text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-display)' }}>
              Get the Weekly Digest
            </h3>
            {!alreadySubscribed && <NewsletterSignupInline />}
          </div>
        </ScrollRevealMotion>
      </section>


    </div>
    </PageTransition>
  );
}
