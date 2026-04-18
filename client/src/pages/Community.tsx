/**
 * Community Forum - Main Page
 * Categories overview with post counts, recent activity, and new post CTA
 * Design: Enchanted forest storybook theme, playful and welcoming
 */
import { Link, useLocation } from "wouter";
import {
  MessageCircle, Sprout, Coins, Handshake, Scale, BookOpen,
  UserPlus, Lightbulb, ArrowRight, Plus, Users,
  Leaf, Sparkles, TrendingUp, Search, Trees, Vote, Gamepad2,
  Heart, MapPin, Pencil, Trash2, X, Check, Building2, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SmartImagePicker } from "@/components/SmartImagePicker";
import { SEO, pageSEO } from "@/components/SEO";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { resolveAssetUrl } from "@/lib/utils";
import { useState, useMemo, useEffect, useRef } from "react";
import { AnimatedSection } from "@/components/AnimatedSection";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { SocialLinks } from "@/components/SocialLinks";
import { NewsletterSignupInline } from "@/components/NewsletterSignup";
import { isNewsletterSubscribed } from "@/utils/newsletter";
import { BannerDisplay } from "@/components/BannerDisplay";
import { PageTransition, ScrollRevealMotion } from "@/components/PageTransition";
import { LandscapeSVG } from "@/components/backgrounds/LandscapeSVG";

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

// Static card images for land projects - augmented at runtime with DB data
const STATIC_PROJECT_META: Record<string, { image: string; location?: string }> = {
  "Finca Sagrada": { image: "/community/finca-sagrada.webp", location: "Ecuador" },
  "Liminal Village": { image: "/community/liminal-village.webp", location: "Italy" },
  "Traditional Dream Factory": { image: "/community/traditional-dream-factory.webp", location: "Portugal" },
  "Heartland Collective": { image: "/community/heartland-collective.webp", location: "USA" },
  "StarSeed Village": { image: "/community/starseed-village.webp" },
  "The Nyx": { image: "/community/nyx.webp" },
  "NeighbourGood": { image: "/community/neighbourgood.webp", location: "South Africa" },
  "La Tierra": { image: "/community/la-tierra.webp" },
};

// Projects that are no longer active in the alliance
const REMOVED_PROJECTS = new Set([
  "Ubuntu",
  "Tioga",
  "Tabi",
  "LaLa Gardens Cooperative",
  "Highland Lake CampUS",
]);

export default function Community() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [alreadySubscribed] = useState(() => isNewsletterSubscribed());
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const sectionPanelRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleSectionClick = (id: string) => {
    const next = activeSection === id ? null : id;
    setActiveSection(next);
    if (next) {
      // Slight delay so the panel renders before scrolling
      setTimeout(() => {
        sectionPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  };
  // Debounce search query for post full-text search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  // Admin category management state
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryDesc, setEditCategoryDesc] = useState("");
  const [showCreateCategory, setShowCreateCategory] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatSlug, setNewCatSlug] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatImageUrl, setNewCatImageUrl] = useState("");
  const utils = trpc.useUtils();
  const createCategoryMutation = trpc.forum.createCategory.useMutation({
    onSuccess: () => { utils.forum.categories.invalidate(); setShowCreateCategory(null); setNewCatName(""); setNewCatSlug(""); setNewCatDesc(""); setNewCatImageUrl(""); },
  });
  const updateCategoryMutation = trpc.forum.updateCategory.useMutation({
    onSuccess: () => { utils.forum.categories.invalidate(); setEditingCategoryId(null); },
  });
  const deleteCategoryMutation = trpc.forum.deleteCategory.useMutation({
    onSuccess: () => { utils.forum.categories.invalidate(); },
  });

  // Track forum visit so ProgressiveOnboarding can show the "Back to Forum" card
  useEffect(() => {
    try { localStorage.setItem('regen_visited_forum', 'true'); } catch { /* ignore */ }
  }, []);

  const FIVE_MIN = 5 * 60 * 1000;
  const { data: categories, isLoading } = trpc.forum.categories.useQuery(undefined, { staleTime: FIVE_MIN });
  const { data: landProjectThreads } = trpc.forum.activeProjectThreads.useQuery(undefined, { staleTime: FIVE_MIN });
  const { data: organisationThreads } = trpc.forum.activeOrganisationThreads.useQuery(undefined, { staleTime: FIVE_MIN });
  const { data: airThreads, isLoading: airLoading } = trpc.forum.activeAirThreads.useQuery(undefined, { staleTime: FIVE_MIN });
  const { data: questThreads } = trpc.forum.activeQuestThreads.useQuery(undefined, { staleTime: FIVE_MIN });
  const { data: alliancePartnerThreads } = trpc.forum.activeAlliancePartnerThreads.useQuery(undefined, { staleTime: FIVE_MIN });
  const { data: pulseData } = trpc.forum.communityPulse.useQuery(undefined, { staleTime: FIVE_MIN });
  const { data: activeLandProjectsData } = trpc.community.activeLandProjects.useQuery(undefined, { staleTime: 10 * 60 * 1000 });

  // Infinite scroll for forum posts
  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.forum.posts.useInfiniteQuery(
    { limit: 20 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      staleTime: FIVE_MIN,
    }
  );

  // IntersectionObserver for auto-loading next page
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten all pages of posts for use in trending
  const allPosts = useMemo(
    () => postsData?.pages.flatMap((page) => page.posts) ?? [],
    [postsData]
  );

  const trendingPosts = useMemo(
    () => allPosts.length > 0
      ? [...allPosts].sort((a, b) => (b.replyCount ?? 0) - (a.replyCount ?? 0)).slice(0, 3)
      : undefined,
    [allPosts]
  );

  // Full-text post search (only when debounced query is >= 2 chars)
  const isSearching = debouncedSearchQuery.length >= 2;
  const { data: searchResults, isFetching: isSearchFetching } = trpc.forum.search.useQuery(
    { q: debouncedSearchQuery },
    { enabled: isSearching, staleTime: 30 * 1000 }
  );

  // Slugs shown in dedicated section panels - exclude from General list
  const SECTION_SLUGS = new Set([
    'quests-gameplay', 'epic-quests', 'alliance-partners', 'air-conversations',
    'land-projects',
    'rites-of-passage', 'welcome-aboard-quests',
    'land-general', 'alliance-general', 'bioregions',
  ]);

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    const base = categories.filter(c => !SECTION_SLUGS.has(c.slug));
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase();
    return base.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  }, [categories, searchQuery]);

  // The land-projects category to display under Earth

  const totalPosts = useMemo(() => {
    if (!categories) return 0;
    return categories.reduce((sum, c) => sum + (c.postCount || 0), 0);
  }, [categories]);

  // Merge DB location data into PROJECT_META (DB location overrides static if present)
  const PROJECT_META: Record<string, { image: string; location?: string; websiteUrl?: string }> = useMemo(() => {
    const merged: Record<string, { image: string; location?: string; websiteUrl?: string }> = { ...STATIC_PROJECT_META };
    for (const p of (activeLandProjectsData ?? [])) {
      const existing = merged[p.projectName];
      merged[p.projectName] = {
        image: existing?.image ?? "",
        location: p.location || p.country || existing?.location,
        websiteUrl: p.websiteUrl ?? undefined,
      };
    }
    return merged;
  }, [activeLandProjectsData]);

  return (
    <PageTransition>
    <div className="min-h-screen bg-[#f8f5f0]">
      <SEO {...pageSEO.community} breadcrumbs={[{ name: "Home", url: "/" }, { name: "Community", url: "/community" }]} />
      <BannerDisplay bannerKey="community-banner" />

      {/* Hero Section */}
      <section className="relative pt-24 pb-12 md:pt-32 md:pb-16 overflow-hidden">
        <LandscapeSVG seed="community" className="absolute inset-0 text-[#7dd87d] pointer-events-none z-0" />
        {/* Background image */}
        <picture>
          <source media="(max-width: 767px)" srcSet="/images/backgrounds/community-hero-mobile.webp" />
          <img
            src="/images/backgrounds/community-hero.webp"
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ objectPosition: "center top" }}
            loading="eager"
          />
        </picture>
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d2818]/65 via-[#1a472a]/60 to-[#f8f5f0]" />

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
              Community Forum
            </span>
          </div>

          <h1
            className="text-3xl md:text-5xl font-bold text-white mb-3"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Gathering Grove
          </h1>
          <p className="text-white/80 text-base md:text-lg max-w-2xl mx-auto mb-6" style={{ fontFamily: 'var(--font-body)' }}>
            Where regenerators connect, share wisdom, and grow together.
            Every conversation plants a seed for the future.
          </p>

          {/* Stats bar */}
          <div className="flex items-center justify-center gap-6 text-white/90 text-sm mb-6">
            <div className="flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4" />
              <span>{totalPosts} {totalPosts === 1 ? 'thread' : 'threads'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>{categories?.length || 0} topics</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {isAuthenticated ? (
              <Button
                onClick={() => navigate('/community/new')}
                className="breathing-cta bg-gradient-to-r from-[#7dd87d] to-[#9de89d] text-[#1a472a] font-bold px-6 py-2.5 rounded-full"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Start a Discussion
              </Button>
            ) : (
              <Button
                onClick={() => window.location.href = getLoginUrl()}
                className="breathing-cta bg-gradient-to-r from-[#7dd87d] to-[#9de89d] text-[#1a472a] font-bold px-6 py-2.5 rounded-full"
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
      <section className="container px-4 max-w-4xl mx-auto mt-4 mb-6 relative z-20">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a7c59]/50" />
          <Input
            placeholder="Search posts and topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white border-[#4a7c59]/20 rounded-xl focus:border-[#7dd87d] focus:ring-[#7dd87d]/20 text-[#1a472a]"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a7c59]/40 hover:text-[#4a7c59] transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Post search results overlay */}
        {isSearching && (
          <div className="mt-2 bg-white border border-[#e8e4de] rounded-xl shadow-lg overflow-hidden">
            {isSearchFetching ? (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-[#4a7c59]">
                <span className="w-3 h-3 rounded-full border-2 border-[#7dd87d] border-t-transparent animate-spin" />
                Searching...
              </div>
            ) : !searchResults || searchResults.length === 0 ? (
              <div className="px-4 py-4 text-sm text-[#1a472a]/50 text-center">
                No results found for &ldquo;{debouncedSearchQuery}&rdquo;
              </div>
            ) : (
              <ul>
                {searchResults.map((post) => (
                  <li key={post.id}>
                    <Link
                      href={`/community/post/${post.id}`}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-[#f0f7f0] transition-colors border-b border-[#e8e4de] last:border-0"
                      onClick={() => setSearchQuery("")}
                    >
                      <MessageCircle className="w-4 h-4 text-[#7dd87d] flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1a472a] truncate">{post.title}</p>
                        <p className="text-xs text-[#4a7c59]/60 truncate">
                          {post.categoryName} &middot; {post.authorName}
                        </p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[#4a7c59]/30 flex-shrink-0 mt-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* Community Pulse Strip */}
      <div className="flex items-center gap-6 px-4 py-2 bg-[#7dd87d]/25 border-y border-[#7dd87d]/30 text-sm text-[#1a472a]">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#7dd87d] animate-pulse" />
          {pulseData?.posts7d ?? 0} posts this week
        </span>
        <span>{pulseData?.replies7d ?? 0} replies</span>
        <span className="ml-auto text-xs text-[#4a7c59]/70">Live community activity</span>
      </div>

      {/* Welcome Card */}
      <div className="mx-4 mt-4 p-4 rounded-xl bg-[#f0f7f0] border border-[#7dd87d]/30">
        <h2 className="text-[#1a472a] font-semibold text-base mb-1">Welcome to the Community Space</h2>
        <p className="text-[#4a7c59] text-sm">
          This is where land projects and regenerative orgs host their forum spaces. Join a conversation,
          share a quest completion, or ask a question in the quest threads.
        </p>
      </div>

      {/* 5-Section Cards + Expandable Panels */}
      <section className="container px-4 max-w-4xl mx-auto pb-16">

        {/* Trending This Week */}
        {isLoading ? (
          <div className="mb-8 mt-6">
            <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-3" />
            <div className="grid gap-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-[#1a472a]/10 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-12 ml-2" />
                </div>
              ))}
            </div>
          </div>
        ) : trendingPosts && trendingPosts.length > 0 ? (
          <div className="mb-8 mt-6">
            <h2 className="text-lg font-bold text-[#1a472a] mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#7dd87d]" />
              Trending This Week
            </h2>
            <div className="grid gap-2">
              {trendingPosts.map(post => (
                <Link key={post.id} href={`/community/post/${post.id}`} className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-[#1a472a]/10 hover:border-[#7dd87d]/40 hover:bg-[#f0f7f0] transition-all group">
                  <span className="text-sm font-medium text-[#1a472a] truncate group-hover:text-[#2d6a4f]">{post.title}</span>
                  <span className="text-xs text-[#1a472a]/50 ml-2 shrink-0">{post.replyCount ?? 0} replies</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {/* ── Section Cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6 mt-6">

          {/* General */}
          <button
            onClick={() => handleSectionClick('general')}
            className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 h-44 text-left group col-span-2 sm:col-span-1 ${activeSection === 'general' ? 'ring-2 ring-[#7dd87d] shadow-lg shadow-[#7dd87d]/20' : 'hover:shadow-md'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-[#1a472a] to-[#2d5a3f]" />
            <img src="/game-infinite-forest.webp" alt="Infinite Forest game world" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity" width={800} height={600} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="text-2xl mb-1">🌿</div>
              <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'var(--font-display)' }}>General</p>
              <p className="text-white/60 text-xs">Open Topics</p>
            </div>
            {activeSection === 'general' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#7dd87d]" />}
          </button>

          {/* Earth */}
          <button
            onClick={() => handleSectionClick('earth')}
            className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 h-44 text-left group ${activeSection === 'earth' ? 'ring-2 ring-[#d4a574] shadow-lg shadow-[#d4a574]/20' : 'hover:shadow-md'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-[#3d2b1f] to-[#5c3d2e]" />
            <img src="/community/finca-sagrada.webp" alt="Finca Sagrada land project" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity" width={800} height={600} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="text-2xl mb-1">🌍</div>
              <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'var(--font-display)' }}>Earth</p>
              <p className="text-white/60 text-xs">Land Projects</p>
            </div>
            {activeSection === 'earth' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#d4a574]" />}
          </button>

          {/* Water */}
          <button
            onClick={() => handleSectionClick('water')}
            className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 h-44 text-left group ${activeSection === 'water' ? 'ring-2 ring-[#7dd87d] shadow-lg shadow-[#7dd87d]/20' : 'hover:shadow-md'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-[#1e3a5f] to-[#2d5a7f]" />
            <img src="/community/liminal-village.webp" alt="Liminal Village land project" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:opacity-45 transition-opacity" width={800} height={600} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="text-2xl mb-1">🌊</div>
              <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'var(--font-display)' }}>Water</p>
              <p className="text-white/60 text-xs">Alliance Partners</p>
            </div>
            {activeSection === 'water' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#7dd87d]" />}
          </button>

          {/* Fire */}
          <button
            onClick={() => handleSectionClick('fire')}
            className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 h-44 text-left group ${activeSection === 'fire' ? 'ring-2 ring-[#fb923c] shadow-lg shadow-[#fb923c]/20' : 'hover:shadow-md'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-[#7c2d12] to-[#9a3412]" />
            <img src="/images/quests/quest-00-fire.webp" alt="Fire quest challenge" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-45 group-hover:opacity-55 transition-opacity" width={800} height={600} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="text-2xl mb-1">🔥</div>
              <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'var(--font-display)' }}>Fire</p>
              <p className="text-white/60 text-xs">Quests &amp; Challenges</p>
            </div>
            {activeSection === 'fire' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#fb923c]" />}
          </button>

          {/* Air */}
          <button
            onClick={() => handleSectionClick('air')}
            className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 h-44 text-left group ${activeSection === 'air' ? 'ring-2 ring-slate-400 shadow-lg shadow-slate-400/20' : 'hover:shadow-md'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-[#374151] to-[#4b5563]" />
            <img src="/blog-hero-bridging-worlds.webp" alt="Bridging worlds between communities" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-25 group-hover:opacity-35 transition-opacity" width={800} height={600} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="text-2xl mb-1">🍃</div>
              <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'var(--font-display)' }}>Air</p>
              <p className="text-white/60 text-xs">Clarity & Agreements</p>
            </div>
            {activeSection === 'air' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-slate-400" />}
          </button>

        </div>

        {/* ── Expandable Section Panels ────────────────────────────────── */}
        <div ref={sectionPanelRef} />

        {/* GENERAL panel */}
        {activeSection === 'general' && (
          <div className="bg-white border border-[#e8e4de] rounded-2xl p-5 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🌿</span>
              <h2 className="font-bold text-[#1a472a] text-lg" style={{ fontFamily: 'var(--font-display)' }}>General: Open Topics</h2>
            </div>
            <p className="text-[#1a472a]/60 text-sm mb-4">Introductions, resources, governance, and open conversations.</p>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-[#f8f5f0] rounded-xl p-5 animate-pulse">
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
              <div className="text-center py-16">
                <Trees className="w-16 h-16 text-[#7dd87d]/40 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#1a472a] mb-2">The forest is quiet here</h3>
                <p className="text-[#1a472a]/60 mb-4">
                  {searchQuery ? 'No discussions match your search yet. Be the first to start one.' : 'No categories yet. Check back soon!'}
                </p>
                {searchQuery && (
                  isAuthenticated ? (
                    <Link href="/community/new">
                      <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]">Start a Discussion</Button>
                    </Link>
                  ) : (
                    <Button onClick={() => window.location.href = getLoginUrl()} className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]">
                      <UserPlus className="w-4 h-4 mr-2" /> Sign In to Participate
                    </Button>
                  )
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCategories.map((category, index) => (
                  <AnimatedSection key={category.id} delay={index * 0.05}>
                    {editingCategoryId === category.id ? (
                      <div className="bg-white rounded-xl p-4 border border-[#7dd87d]/50">
                        <input
                          className="w-full border border-[#e8e4de] rounded-lg px-3 py-1.5 text-sm text-[#1a472a] mb-2 focus:outline-none focus:border-[#7dd87d]"
                          value={editCategoryName}
                          onChange={e => setEditCategoryName(e.target.value)}
                          placeholder="Category name"
                        />
                        <input
                          className="w-full border border-[#e8e4de] rounded-lg px-3 py-1.5 text-sm text-[#1a472a] mb-3 focus:outline-none focus:border-[#7dd87d]"
                          value={editCategoryDesc}
                          onChange={e => setEditCategoryDesc(e.target.value)}
                          placeholder="Description (optional)"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateCategoryMutation.mutate({ id: category.id, name: editCategoryName, description: editCategoryDesc })}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7dd87d] text-[#1a472a] text-xs font-semibold rounded-lg hover:bg-[#9de89d] transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" /> Save
                          </button>
                          <button
                            onClick={() => setEditingCategoryId(null)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl p-4 md:p-5 border border-[#e8e4de] hover:border-[#7dd87d]/40 hover:shadow-md transition-all duration-200 group">
                        <div className="flex items-start gap-3 md:gap-4">
                          <Link href={`/community/c/${category.slug}`} className="flex items-start gap-3 md:gap-4 flex-1 min-w-0 cursor-pointer">
                            {category.imageUrl ? (
                              <img src={resolveAssetUrl(category.imageUrl)} alt={category.name} className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover flex-shrink-0 transition-transform group-hover:scale-110" width={48} height={48} loading="lazy" />
                            ) : (
                              <div
                                className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                                style={{ backgroundColor: `${category.color}20`, color: category.color || '#4a7c59' }}
                              >
                                {iconMap[category.icon || 'MessageCircle'] || <MessageCircle className="w-5 h-5" />}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3
                                className="font-bold text-[#1a472a] text-base md:text-lg group-hover:text-[#4a7c59] transition-colors truncate"
                                style={{ fontFamily: 'var(--font-display)' }}
                              >
                                {category.name}
                              </h3>
                              <p className="text-[#1a472a]/60 text-sm line-clamp-2" style={{ fontFamily: 'var(--font-body)' }}>
                                {category.description}
                              </p>
                            </div>
                          </Link>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <Badge variant="secondary" className="bg-[#f0f7f0] text-[#4a7c59] border-0 text-xs">
                              {category.postCount || 0} {(category.postCount || 0) === 1 ? 'thread' : 'threads'}
                            </Badge>
                            {isAdmin ? (
                              <div className="flex gap-1 mt-1">
                                <button
                                  onClick={() => { setEditingCategoryId(category.id); setEditCategoryName(category.name); setEditCategoryDesc(category.description || ""); }}
                                  className="p-1 rounded hover:bg-[#f0f7f0] text-[#4a7c59]/60 hover:text-[#4a7c59] transition-colors"
                                  title="Edit category"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => { if (confirm(`Delete "${category.name}"? This cannot be undone.`)) deleteCategoryMutation.mutate({ id: category.id }); }}
                                  className="p-1 rounded hover:bg-red-50 text-red-400/60 hover:text-red-500 transition-colors"
                                  title="Delete category"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <ArrowRight className="w-4 h-4 text-[#4a7c59]/30 group-hover:text-[#7dd87d] group-hover:translate-x-1 transition-all" />
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </AnimatedSection>
                ))}
              </div>
            )}

            {isAdmin && (
              <div className="mt-4 pt-4 border-t border-[#e8e4de]">
                {showCreateCategory === 'general' ? (
                  <div className="bg-[#f0f7f0] rounded-xl p-4 border border-[#7dd87d]/30">
                    <p className="text-[#1a472a] text-sm font-semibold mb-3">New Category</p>
                    <input className="w-full border border-[#e8e4de] rounded-lg px-3 py-1.5 text-sm text-[#1a472a] mb-2 focus:outline-none focus:border-[#7dd87d]" value={newCatName} onChange={e => { setNewCatName(e.target.value); setNewCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')); }} placeholder="Name" />
                    <input className="w-full border border-[#e8e4de] rounded-lg px-3 py-1.5 text-sm text-[#1a472a] mb-2 focus:outline-none focus:border-[#7dd87d]" value={newCatSlug} onChange={e => setNewCatSlug(e.target.value)} placeholder="slug (auto-generated)" />
                    <input className="w-full border border-[#e8e4de] rounded-lg px-3 py-1.5 text-sm text-[#1a472a] mb-2 focus:outline-none focus:border-[#7dd87d]" value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} placeholder="Description (optional)" />
                    <div className="mb-3"><SmartImagePicker value={newCatImageUrl} onChange={setNewCatImageUrl} context="default" label="Category image" theme="light" /></div>
                    <div className="flex gap-2">
                      <button onClick={() => createCategoryMutation.mutate({ name: newCatName, slug: newCatSlug, description: newCatDesc || undefined, imageUrl: newCatImageUrl || undefined })} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7dd87d] text-[#1a472a] text-xs font-semibold rounded-lg hover:bg-[#9de89d] transition-colors"><Check className="w-3.5 h-3.5" /> Create</button>
                      <button onClick={() => setShowCreateCategory(null)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors"><X className="w-3.5 h-3.5" /> Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowCreateCategory('general')} className="flex items-center gap-1.5 text-sm text-[#4a7c59] hover:text-[#1a472a] transition-colors">
                    <Plus className="w-4 h-4" /> Add category to General
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* EARTH panel */}
        {activeSection === 'earth' && (
          <div className="bg-white border border-[#e8e4de] rounded-2xl p-5 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🌍</span>
              <h2 className="font-bold text-[#1a472a] text-lg" style={{ fontFamily: 'var(--font-display)' }}>Earth: Land Projects</h2>
            </div>
            <p className="text-[#1a472a]/60 text-sm mb-4">Land project spaces. Where the work is rooted.</p>

            {/* Earth quest-style cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Land Project Spaces */}
              <Link href="/community/c/land-projects">
                <div className="relative rounded-xl overflow-hidden border border-[#d4a574]/40 hover:border-[#d4a574]/60 hover:shadow-md transition-all cursor-pointer group h-36">
                  <img src="/images/quests/quest-03-healing-wholes.webp" alt="Land project spaces" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-55 transition-opacity" width={800} height={600} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-emerald-950/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'var(--font-display)' }}>Land Project Spaces</p>
                    <p className="text-white/60 text-xs">Where the work is rooted</p>
                  </div>
                </div>
              </Link>

              {/* Apply */}
              <Link href="/apply">
                <div className="relative rounded-xl overflow-hidden border border-[#d4a574]/40 hover:border-[#d4a574]/60 hover:shadow-md transition-all cursor-pointer group h-36">
                  <img src="/images/quests/quest-02-saving-seeds.webp" alt="Apply to join with your land project" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-55 transition-opacity" width={800} height={600} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-emerald-950/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'var(--font-display)' }}>Apply</p>
                    <p className="text-white/60 text-xs">Bring your land project in</p>
                  </div>
                </div>
              </Link>
            </div>

            {/* Bioregions card */}
            <div className="mb-3">
              <Link href="/community/c/bioregions">
                <div className="bg-[#f8f5f0] rounded-xl p-4 border border-[#e8e4de] hover:border-[#d4a574]/50 hover:shadow-md transition-all cursor-pointer group flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#d4a574]/15 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 text-[#5c3d2e]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1a472a] text-sm group-hover:text-[#5c3d2e] transition-colors">Bioregions</p>
                    <p className="text-[#1a472a]/50 text-xs line-clamp-1">Where bioregions organising for regeneration meet, share, and find each other</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#4a7c59]/30 group-hover:text-[#d4a574] group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </Link>
            </div>

            {/* General land discussion card */}
            <div className="mb-4">
              <Link href="/community/c/land-general">
                <div className="bg-[#f8f5f0] rounded-xl p-4 border border-[#e8e4de] hover:border-[#d4a574]/50 hover:shadow-md transition-all cursor-pointer group flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#d4a574]/15 flex items-center justify-center flex-shrink-0">
                    <Sprout className="w-5 h-5 text-[#5c3d2e]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1a472a] text-sm group-hover:text-[#5c3d2e] transition-colors">Land General</p>
                    <p className="text-[#1a472a]/50 text-xs line-clamp-1">General discussion about land projects, regenerative land practices, and stewardship</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#4a7c59]/30 group-hover:text-[#d4a574] group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </Link>
            </div>

            {/* Individual land project spaces */}
            {!landProjectThreads || landProjectThreads.filter((t: { id: number; title: string }) => !REMOVED_PROJECTS.has(t.title.replace(/ - Land Project Forum$/, ""))).length === 0 ? (
              <p className="text-[#1a472a]/50 text-sm bg-[#f8f5f0] rounded-xl p-4 border border-[#e8e4de]">
                Land project spaces will appear here as projects join the alliance.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {landProjectThreads
                  .filter((thread: { id: number; title: string }) => {
                    const projectName = thread.title.replace(/ - Land Project Forum$/, "");
                    return !REMOVED_PROJECTS.has(projectName);
                  })
                  .map((thread: { id: number; title: string }) => {
                    const projectName = thread.title.replace(/ - Land Project Forum$/, "");
                    const meta = PROJECT_META[projectName];
                    return (
                      <Link key={thread.id} href={`/community/post/${thread.id}`}>
                        <div className="bg-[#f8f5f0] rounded-xl overflow-hidden border border-[#e8e4de] hover:border-[#d4a574]/40 hover:shadow-md transition-all cursor-pointer group">
                          <div className="h-28 bg-[#4a7c59]/10 relative overflow-hidden">
                            {meta?.image ? (
                              <img
                                src={meta.image}
                                alt={projectName}
                                width={800}
                                height={500}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                                decoding="async"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Trees className="w-10 h-10 text-[#4a7c59]/30" />
                              </div>
                            )}
                            {meta?.location && (
                              <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/45 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
                                <MapPin className="w-2.5 h-2.5" />
                                {meta.location}
                              </div>
                            )}
                          </div>
                          <div className="px-4 py-3 flex items-center justify-between">
                            <div className="min-w-0">
                              <p className="font-semibold text-[#1a472a] text-sm group-hover:text-[#4a7c59] transition-colors truncate">
                                {projectName}
                              </p>
                              <p className="text-[#1a472a]/50 text-xs">Visit Space</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-[#4a7c59]/30 group-hover:text-[#d4a574] group-hover:translate-x-1 transition-all flex-shrink-0" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            )}

            {isAdmin && (
              <div className="mt-4 pt-4 border-t border-[#e8e4de]">
                <button onClick={() => setShowCreateCategory(showCreateCategory === 'earth' ? null : 'earth')} className="flex items-center gap-1.5 text-sm text-[#4a7c59] hover:text-[#1a472a] transition-colors">
                  <Plus className="w-4 h-4" /> Add category under Earth
                </button>
                {showCreateCategory === 'earth' && (
                  <div className="mt-3 bg-[#f0f7f0] rounded-xl p-4 border border-[#7dd87d]/30">
                    <input className="w-full border border-[#e8e4de] rounded-lg px-3 py-1.5 text-sm text-[#1a472a] mb-2 focus:outline-none focus:border-[#7dd87d]" value={newCatName} onChange={e => { setNewCatName(e.target.value); setNewCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')); }} placeholder="Name" />
                    <input className="w-full border border-[#e8e4de] rounded-lg px-3 py-1.5 text-sm text-[#1a472a] mb-2 focus:outline-none focus:border-[#7dd87d]" value={newCatSlug} onChange={e => setNewCatSlug(e.target.value)} placeholder="slug" />
                    <input className="w-full border border-[#e8e4de] rounded-lg px-3 py-1.5 text-sm text-[#1a472a] mb-2 focus:outline-none focus:border-[#7dd87d]" value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} placeholder="Description (optional)" />
                    <div className="mb-3"><SmartImagePicker value={newCatImageUrl} onChange={setNewCatImageUrl} context="default" label="Category image" theme="light" /></div>
                    <div className="flex gap-2">
                      <button onClick={() => createCategoryMutation.mutate({ name: newCatName, slug: newCatSlug, description: newCatDesc || undefined, imageUrl: newCatImageUrl || undefined })} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7dd87d] text-[#1a472a] text-xs font-semibold rounded-lg hover:bg-[#9de89d] transition-colors"><Check className="w-3.5 h-3.5" /> Create</button>
                      <button onClick={() => setShowCreateCategory(null)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors"><X className="w-3.5 h-3.5" /> Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* WATER panel */}
        {activeSection === 'water' && (
          <div className="bg-white border border-[#e8e4de] rounded-2xl p-5 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🌊</span>
              <h2 className="font-bold text-[#1a472a] text-lg" style={{ fontFamily: 'var(--font-display)' }}>Water: Alliance Partners</h2>
            </div>
            <p className="text-[#1a472a]/60 text-sm mb-4">Alliance organisations. Networks and partners moving together.</p>

            {/* Water quest-style cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Alliance Partners */}
              <Link href="/community/c/alliance-partners">
                <div className="relative rounded-xl overflow-hidden border border-blue-200/60 hover:border-blue-400/60 hover:shadow-md transition-all cursor-pointer group h-36">
                  <img src="/images/quests/quest-01-potion-brewing.webp" alt="Alliance partners and collaboration" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-55 transition-opacity" width={800} height={600} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-950/80 via-blue-950/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'var(--font-display)' }}>Alliance Partners</p>
                    <p className="text-white/60 text-xs">Networks moving together</p>
                  </div>
                </div>
              </Link>

              {/* Governance */}
              <Link href="/community/c/governance">
                <div className="relative rounded-xl overflow-hidden border border-blue-200/60 hover:border-blue-400/60 hover:shadow-md transition-all cursor-pointer group h-36">
                  <img src="/images/quests/quest-11-coordination-patterns.webp" alt="Governance and coordination" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-55 transition-opacity" width={800} height={600} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-950/80 via-blue-950/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'var(--font-display)' }}>Governance</p>
                    <p className="text-white/60 text-xs">How we coordinate</p>
                  </div>
                </div>
              </Link>

              {/* Crowd Pooling */}
              <Link href="/crowd-pooling">
                <div className="relative rounded-xl overflow-hidden border border-blue-200/60 hover:border-blue-400/60 hover:shadow-md transition-all cursor-pointer group h-36">
                  <img src="/images/quests/quest-06-healing-circles.webp" alt="Crowd pooling capital together" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-55 transition-opacity" width={800} height={600} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-950/80 via-blue-950/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'var(--font-display)' }}>Crowd Pooling</p>
                    <p className="text-white/60 text-xs">Pool capital for land projects</p>
                  </div>
                </div>
              </Link>

              {/* Alliance General */}
              <Link href="/community/c/alliance-general">
                <div className="relative rounded-xl overflow-hidden border border-blue-200/60 hover:border-blue-400/60 hover:shadow-md transition-all cursor-pointer group h-36">
                  <img src="/images/quests/quest-04-dreaming-spaces-of-love.webp" alt="Alliance general discussion" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-55 transition-opacity" width={800} height={600} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-950/80 via-blue-950/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'var(--font-display)' }}>Alliance General</p>
                    <p className="text-white/60 text-xs">Alliance talk, new ideas</p>
                  </div>
                </div>
              </Link>
            </div>

            {!organisationThreads || organisationThreads.length === 0 ? (
              <div className="bg-[#f8f5f0] rounded-xl p-4 border border-[#e8e4de]">
                <p className="text-[#1a472a]/50 text-sm mb-3">
                  Alliance partner spaces will appear here as organisations join.
                </p>
                <Link href="/community/c/alliance-partners">
                  <span className="inline-flex items-center gap-1 text-[#4a7c59] text-sm font-semibold hover:text-[#1a472a] transition-colors cursor-pointer">
                    Browse Alliance Partners <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {organisationThreads.map((thread: { id: number; title: string }) => (
                    <Link key={thread.id} href={`/community/post/${thread.id}`}>
                      <div className="bg-[#f8f5f0] rounded-xl overflow-hidden border border-[#e8e4de] hover:border-[#7dd87d]/40 hover:shadow-md transition-all cursor-pointer group">
                        <div className="h-20 bg-blue-500/10 relative overflow-hidden flex items-center justify-center">
                          <Building2 className="w-8 h-8 text-[#0369a1]/30" />
                        </div>
                        <div className="px-4 py-3 flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="font-semibold text-[#1a472a] text-sm group-hover:text-[#0369a1] transition-colors truncate">
                              {thread.title}
                            </p>
                            <p className="text-[#1a472a]/50 text-xs">Visit Space</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-[#4a7c59]/30 group-hover:text-[#7dd87d] group-hover:translate-x-1 transition-all flex-shrink-0" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                <Link href="/community/c/alliance-partners">
                  <span className="inline-flex items-center gap-1 text-[#4a7c59] text-sm font-semibold hover:text-[#1a472a] transition-colors cursor-pointer mt-2">
                    View all in Alliance Partners <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </div>
            )}

            {isAdmin && (
              <div className="mt-4 pt-4 border-t border-[#e8e4de]">
                <button onClick={() => setShowCreateCategory(showCreateCategory === 'water' ? null : 'water')} className="flex items-center gap-1.5 text-sm text-[#4a7c59] hover:text-[#1a472a] transition-colors">
                  <Plus className="w-4 h-4" /> Add category under Water
                </button>
                {showCreateCategory === 'water' && (
                  <div className="mt-3 bg-[#f0f7f0] rounded-xl p-4 border border-[#7dd87d]/30">
                    <input className="w-full border border-[#e8e4de] rounded-lg px-3 py-1.5 text-sm text-[#1a472a] mb-2 focus:outline-none focus:border-[#7dd87d]" value={newCatName} onChange={e => { setNewCatName(e.target.value); setNewCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')); }} placeholder="Name" />
                    <input className="w-full border border-[#e8e4de] rounded-lg px-3 py-1.5 text-sm text-[#1a472a] mb-2 focus:outline-none focus:border-[#7dd87d]" value={newCatSlug} onChange={e => setNewCatSlug(e.target.value)} placeholder="slug" />
                    <input className="w-full border border-[#e8e4de] rounded-lg px-3 py-1.5 text-sm text-[#1a472a] mb-2 focus:outline-none focus:border-[#7dd87d]" value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} placeholder="Description (optional)" />
                    <div className="mb-3"><SmartImagePicker value={newCatImageUrl} onChange={setNewCatImageUrl} context="default" label="Category image" theme="light" /></div>
                    <div className="flex gap-2">
                      <button onClick={() => createCategoryMutation.mutate({ name: newCatName, slug: newCatSlug, description: newCatDesc || undefined, imageUrl: newCatImageUrl || undefined })} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7dd87d] text-[#1a472a] text-xs font-semibold rounded-lg hover:bg-[#9de89d] transition-colors"><Check className="w-3.5 h-3.5" /> Create</button>
                      <button onClick={() => setShowCreateCategory(null)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors"><X className="w-3.5 h-3.5" /> Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* FIRE panel */}
        {activeSection === 'fire' && (
          <div className="bg-white border border-[#e8e4de] rounded-2xl p-5 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🔥</span>
              <h2 className="font-bold text-[#1a472a] text-lg" style={{ fontFamily: 'var(--font-display)' }}>Fire: Quests and Challenges</h2>
            </div>
            <p className="text-[#1a472a]/60 text-sm mb-4">Quests and challenges. Where regeneration gets real.</p>

            <div className="grid grid-cols-2 gap-3">

              {/* Welcome Aboard Quests */}
              <Link href="/community/c/welcome-aboard-quests">
                <div className="relative rounded-xl overflow-hidden border border-amber-200/60 hover:border-amber-400/60 hover:shadow-md transition-all cursor-pointer group h-36">
                  <img src="/images/quests/quest-05-rites-of-love.webp" alt="Welcome Aboard quests" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-55 transition-opacity" width={800} height={600} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-amber-950/80 via-amber-950/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'var(--font-display)' }}>Welcome Aboard Quests</p>
                    <p className="text-white/60 text-xs">10 quests to get started</p>
                  </div>
                </div>
              </Link>

              {/* Rites of Passage */}
              <Link href="/community/c/rites-of-passage">
                <div className="relative rounded-xl overflow-hidden border border-amber-200/60 hover:border-amber-400/60 hover:shadow-md transition-all cursor-pointer group h-36">
                  <img src="/images/quests/quest-00-fire.webp" alt="Rites of Passage quests" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-55 transition-opacity" width={800} height={600} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-amber-950/80 via-amber-950/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'var(--font-display)' }}>Rites of Passage</p>
                    <p className="text-white/60 text-xs">Quests 0-13</p>
                  </div>
                </div>
              </Link>

              {/* All Quests */}
              <Link href="/community/c/quests-gameplay">
                <div className="relative rounded-xl overflow-hidden border border-amber-200/60 hover:border-amber-400/60 hover:shadow-md transition-all cursor-pointer group h-36">
                  <img src="/images/quests/quest-00-fire.webp" alt="Fire quest challenge" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-55 transition-opacity" width={800} height={600} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-amber-950/80 via-amber-950/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'var(--font-display)' }}>All Quests</p>
                    <p className="text-white/60 text-xs">Browse the full list</p>
                  </div>
                </div>
              </Link>

              {/* Epic Quests */}
              <div className="relative cursor-default">
                <div className="relative rounded-xl overflow-hidden border border-amber-200/60 hover:border-amber-400/60 transition-all h-36">
                  <img src="/images/quests/quest-08-medicine-journey.webp" alt="Epic quests coming soon" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-40 transition-opacity" width={800} height={600} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-amber-950/80 via-amber-950/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'var(--font-display)' }}>Epic Quests</p>
                    <p className="text-white/60 text-xs">Long-form challenges, coming soon</p>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl z-10">
                  <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Coming Soon</span>
                </div>
              </div>

              {/* General Discussion */}
              <Link href="/community/c/quests-gameplay">
                <div className="relative rounded-xl overflow-hidden border border-amber-200/60 hover:border-amber-400/60 hover:shadow-md transition-all cursor-pointer group h-36">
                  <img src="/images/quests/quest-01-potion-brewing.webp" alt="General quest discussion" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-55 transition-opacity" width={800} height={600} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-amber-950/80 via-amber-950/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'var(--font-display)' }}>General Discussion</p>
                    <p className="text-white/60 text-xs">Quest talk, new ideas</p>
                  </div>
                </div>
              </Link>

            </div>

            {/* Suggest a Quest */}
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <Link href="/community/quests" className="block border-l-4 border-green-500 bg-green-50 rounded-xl p-5 hover:bg-green-100 transition-colors group">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <h3 className="font-semibold text-[#1a472a] mb-1 group-hover:text-green-700 transition-colors">Got an idea for a quest?</h3>
                    <p className="text-sm text-[#1a472a]/60">Propose it here. The community votes and the best ones get built.</p>
                  </div>
                </div>
              </Link>
              <Link href="/features" className="block border-l-4 border-amber-500 bg-amber-50 rounded-xl p-5 hover:bg-amber-100 transition-colors group">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🔧</span>
                  <div>
                    <h3 className="font-semibold text-[#1a472a] mb-1 group-hover:text-amber-700 transition-colors">Got an idea for a feature?</h3>
                    <p className="text-sm text-[#1a472a]/60">Suggest improvements to the site. Vote on what gets built next.</p>
                  </div>
                </div>
              </Link>
            </div>

            <p className="text-[#1a472a]/40 text-xs mt-3">
              This site is built by the community. All code is open source on <a href="https://github.com/Rieki777/ReGenCivics.Earth" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#1a472a]/60">GitHub</a>.
            </p>

            {isAdmin && (
              <div className="mt-4 pt-4 border-t border-amber-200/60">
                <button onClick={() => setShowCreateCategory(showCreateCategory === 'fire' ? null : 'fire')} className="flex items-center gap-1.5 text-sm text-amber-700 hover:text-amber-900 transition-colors">
                  <Plus className="w-4 h-4" /> Add category under Fire
                </button>
                {showCreateCategory === 'fire' && (
                  <div className="mt-3 bg-amber-50 rounded-xl p-4 border border-amber-200/60">
                    <input className="w-full border border-amber-200 rounded-lg px-3 py-1.5 text-sm text-[#1a472a] mb-2 focus:outline-none focus:border-amber-400 bg-white" value={newCatName} onChange={e => { setNewCatName(e.target.value); setNewCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')); }} placeholder="Name" />
                    <input className="w-full border border-amber-200 rounded-lg px-3 py-1.5 text-sm text-[#1a472a] mb-2 focus:outline-none focus:border-amber-400 bg-white" value={newCatSlug} onChange={e => setNewCatSlug(e.target.value)} placeholder="slug" />
                    <input className="w-full border border-amber-200 rounded-lg px-3 py-1.5 text-sm text-[#1a472a] mb-3 focus:outline-none focus:border-amber-400 bg-white" value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} placeholder="Description (optional)" />
                    <div className="flex gap-2">
                      <button onClick={() => createCategoryMutation.mutate({ name: newCatName, slug: newCatSlug, description: newCatDesc || undefined, imageUrl: newCatImageUrl || undefined })} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors"><Check className="w-3.5 h-3.5" /> Create</button>
                      <button onClick={() => setShowCreateCategory(null)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors"><X className="w-3.5 h-3.5" /> Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* AIR panel */}
        {activeSection === 'air' && (
          <div className="bg-white border border-[#e8e4de] rounded-2xl p-5 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🍃</span>
              <h2 className="font-bold text-[#1a472a] text-lg" style={{ fontFamily: 'var(--font-display)' }}>Air: Clarity & Agreements</h2>
            </div>
            <p className="text-[#1a472a]/60 text-sm mb-4">
              Where we get clear on how we show up. Agreements, healthy conversations, and the things worth saying out loud.
            </p>

            {/* Air quest-style cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Healthy Conversations */}
              <Link href="/community/c/air-conversations">
                <div className="relative rounded-xl overflow-hidden border border-slate-200/60 hover:border-slate-400/60 hover:shadow-md transition-all cursor-pointer group h-36">
                  <img src="/images/quests/quest-10-communication-patterns.webp" alt="Healthy conversations and clearing space" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-55 transition-opacity" width={800} height={600} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'var(--font-display)' }}>Healthy Conversations</p>
                    <p className="text-white/60 text-xs">Clear what's stagnant</p>
                  </div>
                </div>
              </Link>

              {/* Community Guidelines */}
              <Link href="/community/guidelines">
                <div className="relative rounded-xl overflow-hidden border border-slate-200/60 hover:border-slate-400/60 hover:shadow-md transition-all cursor-pointer group h-36">
                  <img src="/images/quests/quest-12-breathplay-future-dreaming.webp" alt="Community agreements" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-55 transition-opacity" width={800} height={600} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'var(--font-display)' }}>Community Agreements</p>
                    <p className="text-white/60 text-xs">How we hold space together</p>
                  </div>
                </div>
              </Link>

              {/* Roles Dialogue */}
              <Link href="/community/post/634">
                <div className="relative rounded-xl overflow-hidden border border-slate-200/60 hover:border-slate-400/60 hover:shadow-md transition-all cursor-pointer group h-36">
                  <img src="/images/quests/roles-dialogue.png" alt="Roles dialogue" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-55 transition-opacity" width={800} height={600} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'var(--font-display)' }}>Roles Dialogue</p>
                    <p className="text-white/60 text-xs">What roles are missing?</p>
                  </div>
                </div>
              </Link>
            </div>

            {airLoading ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="animate-pulse bg-[#f8f5f0] rounded-xl p-4 border border-slate-200/60">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : !airThreads || airThreads.length === 0 ? (
              <div className="flex items-center justify-between gap-3 bg-[#f8f5f0] rounded-xl p-4 border border-slate-200/60">
                <p className="text-[#1a472a]/50 text-sm min-w-0" style={{ fontFamily: 'var(--font-body)' }}>
                  No threads yet. Be the first to clear the air.
                </p>
                <Link href="/community/c/air-conversations">
                  <span className="text-slate-600 text-sm font-medium hover:text-slate-800 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1">
                    Start a thread <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {airThreads.map((thread: { id: number; title: string }) => (
                  <Link key={thread.id} href={`/community/post/${thread.id}`}>
                    <div className="bg-[#f8f5f0] rounded-xl overflow-hidden border border-slate-200/60 hover:border-slate-400/60 hover:shadow-md transition-all cursor-pointer group">
                      <div className="h-20 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                        <MessageCircle className="w-8 h-8 text-slate-300/40" />
                      </div>
                      <div className="px-4 py-3 flex items-center justify-between">
                        <div className="min-w-0">
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

            {isAdmin && (
              <div className="mt-4 pt-4 border-t border-slate-200/60">
                <button onClick={() => setShowCreateCategory(showCreateCategory === 'air' ? null : 'air')} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 transition-colors">
                  <Plus className="w-4 h-4" /> Add category under Air
                </button>
                {showCreateCategory === 'air' && (
                  <div className="mt-3 bg-slate-50 rounded-xl p-4 border border-slate-200/60">
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-[#1a472a] mb-2 focus:outline-none focus:border-slate-400 bg-white" value={newCatName} onChange={e => { setNewCatName(e.target.value); setNewCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')); }} placeholder="Name" />
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-[#1a472a] mb-2 focus:outline-none focus:border-slate-400 bg-white" value={newCatSlug} onChange={e => setNewCatSlug(e.target.value)} placeholder="slug" />
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-[#1a472a] mb-3 focus:outline-none focus:border-slate-400 bg-white" value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} placeholder="Description (optional)" />
                    <div className="flex gap-2">
                      <button onClick={() => createCategoryMutation.mutate({ name: newCatName, slug: newCatSlug, description: newCatDesc || undefined, imageUrl: newCatImageUrl || undefined })} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-white text-xs font-semibold rounded-lg hover:bg-slate-700 transition-colors"><Check className="w-3.5 h-3.5" /> Create</button>
                      <button onClick={() => setShowCreateCategory(null)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors"><X className="w-3.5 h-3.5" /> Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tag filter and chain shortcuts */}
        <div className="mt-6 flex flex-wrap gap-2 overflow-x-auto">
          <Link href="/community/lessons">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#fef3c7] border border-[#d97706]/20 text-[#92400e] text-sm font-medium hover:border-[#d97706]/50 transition-colors cursor-pointer">
              <BookOpen className="w-3.5 h-3.5" />
              #lesson
            </span>
          </Link>
          <Link href="/community/seeking-support">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0f7f0] border border-[#4a7c59]/20 text-[#1a472a] text-sm font-medium hover:border-[#4a7c59]/50 transition-colors cursor-pointer">
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

        {/* Infinite scroll sentinel */}
        <div ref={loadMoreRef} className="mt-4" aria-hidden="true" />
        {isFetchingNextPage && (
          <div className="flex items-center justify-center py-4 gap-2 text-sm text-[#4a7c59]">
            <span className="w-4 h-4 rounded-full border-2 border-[#7dd87d] border-t-transparent animate-spin" />
            Loading more posts...
          </div>
        )}

        {/* Community Guidelines */}
        <div className="mt-6 bg-[#f0f7f0] rounded-xl p-5 border border-[#7dd87d]/20">
          <div className="flex items-start gap-3">
            <Leaf className="w-5 h-5 text-[#4a7c59] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-[#1a472a] text-sm mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                Community Guidelines
              </h3>
              <p className="text-[#1a472a]/70 text-xs leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                Be kind, be honest, be regenerative. Share what you know, ask what you don't. Every voice matters here.
              </p>
            </div>
          </div>
        </div>

        {/* Newsletter CTA */}
        <ScrollRevealMotion>
          <div className="mt-6 p-6 rounded-2xl border border-[#7dd87d]/30 bg-[#7dd87d]/10">
            <h3 className="text-[#1a472a] font-bold text-lg flex items-center gap-2 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
              🌿 Get the Weekly Digest
            </h3>
            <p className="text-[#4a7c59] text-sm mt-1 mb-4" style={{ fontFamily: 'var(--font-body)' }}>
              Stay updated with the best conversations from the week.
            </p>
            {alreadySubscribed ? (
              <p className="text-[#4a7c59] text-xs flex items-center gap-1.5">
                ✓ You're subscribed.{" "}
                <a href="/profile?tab=settings" className="underline underline-offset-2 hover:text-[#1a472a] transition-colors">Manage preferences</a>
                {" · "}
                <a href="/connect" className="underline underline-offset-2 hover:text-[#1a472a] transition-colors">Connect with us on something specific</a>
              </p>
            ) : (
              <NewsletterSignupInline />
            )}
          </div>
        </ScrollRevealMotion>

      </section>

    </div>
    </PageTransition>
  );
}
