/**
 * Community Forum - Category Thread Listing
 * Shows all threads in a specific category with sorting and new post CTA
 */
import { Link, useLocation, useParams } from "wouter";
import {
  MessageCircle, ArrowLeft, Plus, Eye, Clock, Heart,
  ChevronRight, Pin, Lock, UserPlus, BookOpen, Users, MapPin
} from "lucide-react";
import { TaoSpinner } from "@/components/TaoSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/BackButton";
import { FollowButton } from "@/components/FollowButton";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useState, useMemo } from "react";
import { AnimatedSection } from "@/components/AnimatedSection";
import { PageTransition } from "@/components/PageTransition";
import { NewsletterSignupInline } from "@/components/NewsletterSignup";
import { isNewsletterSubscribed } from "@/utils/newsletter";
import { decodeEntities } from "@/utils/sanitize";
import KnowledgeMapPanel from "@/components/KnowledgeMapPanel";

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

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const TAG_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  lesson: { label: "#lesson", color: "#92400e", bg: "#f0ebe3" },
  "seeking-support": { label: "#seeking-support", color: "#1a472a", bg: "#f0f7f0" },
  "offering-support": { label: "#offering-support", color: "#1a472a", bg: "#f0f7f0" },
};

const POST_TYPE_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  case_study: { label: "Case Study", color: "#92400e", bg: "#f0ebe3" },
  seeking_team: { label: "Seeking Team", color: "#5b21b6", bg: "#ede9fe" },
  discussion: { label: "Dialogue", color: "#1a472a", bg: "#f0f7f0" },
};

const THREAD_STAGE_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  idea: { label: "Idea", color: "#1a472a", bg: "#f0f7f0" },
  experiment: { label: "Experiment", color: "#1a472a", bg: "#f0f7f0" },
  result: { label: "Result", color: "#92400e", bg: "#f0ebe3" },
};

function ThreadStageBadge({ stage }: { stage: string }) {
  const style = THREAD_STAGE_STYLES[stage];
  if (!style) return null;
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ color: style.color, backgroundColor: style.bg }}
    >
      {style.label}
    </span>
  );
}

function PostTagBadge({ tag }: { tag: string }) {
  const style = TAG_STYLES[tag];
  if (!style) return null;
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ color: style.color, backgroundColor: style.bg }}
    >
      {style.label}
    </span>
  );
}

function PostTypeBadge({ postType }: { postType: string }) {
  const style = POST_TYPE_STYLES[postType];
  if (!style || postType === "discussion") return null;
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ color: style.color, backgroundColor: style.bg }}
    >
      {style.label}
    </span>
  );
}

export default function CommunityCategory() {
  const { slug } = useParams<{ slug: string }>();
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [alreadySubscribed] = useState(() => isNewsletterSubscribed());

  const { data: category, isLoading: catLoading } = trpc.forum.categoryBySlug.useQuery(
    { slug: slug || '' },
    { enabled: !!slug }
  );

  const { data: postsResult, isLoading: postsLoading } = trpc.forum.posts.useQuery(
    { categoryId: category?.id, limit: 50 },
    { enabled: !!category?.id }
  );
  const posts = postsResult?.posts;

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const sortMode = (category?.sortMode === 'numerical') ? 'numerical' : 'activity';
  const utils = trpc.useUtils();
  const updateCategory = trpc.forum.updateCategory.useMutation({
    onSuccess: () => { utils.forum.categoryBySlug.invalidate(); utils.forum.posts.invalidate(); },
  });
  const setPostSortOrder = trpc.forum.setPostSortOrder.useMutation({
    onSuccess: () => { utils.forum.posts.invalidate(); },
  });

  const isLoading = catLoading || postsLoading;

  // Soft gate for unauthenticated users -- show an inline join prompt instead of hard redirect
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-24 text-center">
        <div className="max-w-md space-y-4">
          <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
            Join to participate in this forum
          </h2>
          <p className="text-white/60 text-sm">
            Create a free account to read and reply to forum dialogues, share your land project, and connect with the ReGen Civics community.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => {
                // Send the user straight into the actual OAuth account-creation
                // flow instead of the /connect interest form. /connect is for
                // telling us what you're interested in, not for making an
                // account. After OAuth they land back at this same forum page.
                const returnTo = window.location.pathname;
                sessionStorage.setItem("returnTo", returnTo);
                window.location.href = getLoginUrl(returnTo);
              }}
              className="px-6 py-3 rounded-lg bg-[#7dd87d] text-[#1a472a] font-bold hover:bg-[#7dd87d]/90 transition-colors"
            >
              Create Account
            </button>
            <button
              onClick={() => { window.location.href = '/community'; }}
              className="px-6 py-3 rounded-lg border border-[#7dd87d]/40 text-[#7dd87d] hover:border-[#7dd87d]/70 transition-colors"
            >
              Back to Community
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (catLoading) {
    return <TaoSpinner fullPage size={72} />;
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-[#f8f5f0]">
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <MessageCircle className="w-12 h-12 text-[#4a7c59]/30 mb-3" />
          <h2 className="text-xl font-bold text-[#1a472a] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Category Not Found
          </h2>
          <p className="text-[#1a472a]/80 mb-4" style={{ fontFamily: 'var(--font-body)' }}>
            This dialogue topic doesn't exist.
          </p>
          <Link href="/community">
            <Button variant="outline" className="border-[#4a7c59] text-[#4a7c59]">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Forum
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-[#f8f5f0]">
      <BackButton />

      {/* Category Header */}
      <section className="pt-24 pb-6 md:pt-28 md:pb-8 bg-gradient-to-b from-[#1a472a] to-[#2d5a3d]">
        <div className="container px-4 max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-white/70 text-sm mb-4" style={{ fontFamily: 'var(--font-body)' }}>
            <Link href="/community" className="hover:text-white/80 transition-colors">Forum</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/80">{category.name}</span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 
                className="text-2xl md:text-3xl font-bold text-white mb-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {category.name}
              </h1>
              {category.description && (
                <p className="text-white/70 text-sm md:text-base" style={{ fontFamily: 'var(--font-body)' }}>
                  {category.description}
                </p>
              )}
            </div>
            <FollowButton targetType="category" targetId={String(category.id)} targetLabel={category.name} className="flex-shrink-0" />
          </div>

          {/* Admin: choose how this board orders its threads */}
          {isAdmin && category && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-white/60 text-xs" style={{ fontFamily: 'var(--font-body)' }}>Sort threads by:</span>
              <div className="inline-flex items-center gap-1 bg-[#0d2818]/60 border border-white/15 rounded-full p-0.5">
                {([['activity', 'Latest activity'], ['numerical', 'Numerical']] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => updateCategory.mutate({ id: category.id, sortMode: mode })}
                    disabled={updateCategory.isPending}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all disabled:opacity-50 ${
                      sortMode === mode ? 'bg-[#7dd87d] text-[#0d2818]' : 'text-white/75 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {sortMode === 'numerical' && (
                <span className="text-white/40 text-xs">Lower number shows first</span>
              )}
            </div>
          )}

          {/* New Thread Button */}
          <div className="mt-4">
            {isAuthenticated ? (
              <Button 
                onClick={() => navigate(`/community/new?category=${category.id}`)}
                className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-bold px-5 py-2 rounded-full text-sm"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                New Thread
              </Button>
            ) : (
              <Button 
                onClick={() => window.location.href = getLoginUrl()}
                className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-bold px-5 py-2 rounded-full text-sm"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <UserPlus className="w-4 h-4 mr-1.5" />
                Sign In to Post
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Thread List */}
      <section className="container px-4 max-w-4xl mx-auto py-6">
        {category && <KnowledgeMapPanel categoryId={category.id} categoryName={category.name} />}
        {postsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !posts || posts.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className="w-16 h-16 text-[#4a7c59]/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-[#1a472a] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              No threads yet
            </h3>
            <p className="text-[#1a472a]/80 text-sm mb-4" style={{ fontFamily: 'var(--font-body)' }}>
              Be the first to start a conversation in {category.name}!
            </p>
            {isAuthenticated && (
              <Button 
                onClick={() => navigate(`/community/new?category=${category.id}`)}
                className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-bold rounded-full"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Start First Thread
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {posts.map((post, index) => (
              <AnimatedSection key={post.id} delay={index * 0.03}>
                <div className="relative">
                {isAdmin && sortMode === 'numerical' && (
                  <div
                    className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-white/95 rounded-lg border border-[#e8e4de] shadow-sm px-1.5 py-1"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  >
                    <span className="text-[#4a7c59] text-xs font-semibold">#</span>
                    <input
                      type="number"
                      defaultValue={post.sortOrder}
                      aria-label="Sort position"
                      onClick={(e) => e.preventDefault()}
                      onBlur={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!Number.isNaN(v) && v !== post.sortOrder) setPostSortOrder.mutate({ id: post.id, sortOrder: v });
                      }}
                      className="w-12 text-sm text-[#1a472a] bg-white border border-[#e8e4de] rounded px-1 py-0.5 focus:outline-none focus:border-[#7dd87d]"
                    />
                  </div>
                )}
                <Link href={`/community/post/${post.id}`}>
                  <div className="bg-white rounded-xl overflow-hidden border border-[#e8e4de] hover:border-[#7dd87d]/40 hover:shadow-sm transition-all duration-200 cursor-pointer group">
                    {post.generatedImageUrl && (
                      <div className="w-full h-32 overflow-hidden">
                        <img src={post.generatedImageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" width={800} height={128} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      </div>
                    )}
                    <div className="flex items-start gap-3 p-4">
                      {/* Author Avatar */}
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4a7c59] to-[#7dd87d] flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                        {getInitials(post.authorName || 'A')}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          {post.isPinned === 1 && (
                            <Pin className="w-3 h-3 text-[#d4a574] flex-shrink-0" />
                          )}
                          {post.isLocked === 1 && (
                            <Lock className="w-3 h-3 text-[#1a472a]/80 flex-shrink-0" />
                          )}
                          <h3
                            className="font-semibold text-[#1a472a] text-sm md:text-base group-hover:text-[#4a7c59] transition-colors truncate"
                            style={{ fontFamily: 'var(--font-display)' }}
                          >
                            {decodeEntities(post.title)}
                          </h3>
                        </div>

                        {/* Post type, thread stage, and tag badges */}
                        {(() => {
                          let parsedTags: string[] = [];
                          try { parsedTags = post.tags ? JSON.parse(post.tags) : []; } catch { /* ignore */ }
                          const hasStage = !!(post as any).threadStage;
                          return (
                            <>
                              {(post.postType || hasStage || parsedTags.length > 0 || (post as any).bioregionName) && (
                                <div className="flex flex-wrap gap-1 mb-1">
                                  {post.postType && <PostTypeBadge postType={post.postType} />}
                                  {hasStage && <ThreadStageBadge stage={(post as any).threadStage} />}
                                  {parsedTags.map(t => <PostTagBadge key={t} tag={t} />)}
                                  {(post as any).bioregionName && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-100 text-teal-800 border border-teal-200">
                                      <MapPin className="w-2.5 h-2.5" />
                                      {(post as any).bioregionName}
                                    </span>
                                  )}
                                </div>
                              )}
                            </>
                          );
                        })()}

                        {/* Preview of content */}
                        <p className="text-[#1a472a]/80 text-xs line-clamp-1 mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>
                          {post.content.replace(/[#*_~`]/g, '').slice(0, 120)}
                        </p>

                        {/* Meta info */}
                        <div className="flex items-center gap-3 text-[#1a472a]/80 text-xs" style={{ fontFamily: 'var(--font-body)' }}>
                          <span className="font-medium text-[#4a7c59]/70">{post.authorName}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeAgo(post.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {post.replyCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {post.viewCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
                </div>
              </AnimatedSection>
            ))}
          </div>
        )}
      </section>

      {/* Newsletter CTA */}
      <section className="container px-4 max-w-4xl mx-auto pb-10">
        <div className="mt-2 p-4 rounded-xl border border-[#7dd87d]/20 bg-[#0d2818]/40">
          <p className="text-white/70 text-sm font-medium mb-3" style={{ fontFamily: 'var(--font-display)' }}>
            Stay updated: get the ReGen Civics digest in your inbox
          </p>
          {alreadySubscribed ? (
            <p className="text-white/70 text-xs flex items-center gap-1.5">
              ✓ You're subscribed.{" "}
              <a href="/profile?tab=settings" className="underline underline-offset-2 hover:text-white/80 transition-colors">Manage preferences</a>
              {" · "}
              <a href="/connect" className="underline underline-offset-2 hover:text-white/80 transition-colors">Connect with us</a>
            </p>
          ) : (
            <NewsletterSignupInline />
          )}
        </div>
      </section>
    </div>
    </PageTransition>
  );
}
