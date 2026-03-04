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
import { useState, useMemo } from "react";
import { AnimatedSection } from "@/components/AnimatedSection";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { SocialLinks } from "@/components/SocialLinks";
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
  const { t } = useLanguage();

  const { data: categories, isLoading } = trpc.forum.categories.useQuery();

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

        {/* Quest Suggestions CTA */}
        <ScrollRevealMotion>
          <Link href="/community/quests">
            <div className="mt-6 bg-gradient-to-r from-[#1a472a] to-[#2d5a3f] rounded-xl p-5 border border-[#7dd87d]/30 hover:border-[#7dd87d]/60 transition-all cursor-pointer group overflow-hidden relative">
              <div className="absolute top-2 right-2 opacity-20">
                <FloatElement amplitude={5} duration={3}>
                  <Sparkles className="w-8 h-8 text-[#7dd87d]" />
                </FloatElement>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-5 h-5 text-[#7dd87d]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-base mb-0.5" style={{ fontFamily: 'var(--font-display)' }}>
                    Suggest the Next Quest
                  </h3>
                  <p className="text-white/60 text-sm" style={{ fontFamily: 'var(--font-body)' }}>
                    Submit quest ideas and vote for your favorites. Community-driven questing!
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-[#7dd87d] group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </ScrollRevealMotion>

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
      </section>


    </div>
    </PageTransition>
  );
}
