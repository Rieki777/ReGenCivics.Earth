/**
 * Community Forum - Post Detail Page
 * Shows a single thread with all replies, like functionality, and reply form
 */
import { Link, useLocation, useParams } from "wouter";
import {
  MessageCircle, ArrowLeft, Heart, Eye, Clock, Send,
  ChevronRight, Pin, Lock, Loader2, Trash2, CornerDownRight,
  AlertCircle, Flag, Shield, User, Globe2, Languages, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { BackButton } from "@/components/BackButton";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { AnimatedSection } from "@/components/AnimatedSection";
import { PageTransition } from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { ForumMarkdown, MarkdownHints } from "@/components/ForumMarkdown";
import { MarkdownToolbar, useMarkdownShortcuts } from "@/components/MarkdownToolbar";
import { ProjectConnectionsPanel } from "@/components/ProjectConnectionsPanel";
import { BadgeRingAvatar } from "@/components/BadgeRingAvatar";

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

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// Markdown rendering is now handled by ForumMarkdown component

const STAGE_LABELS: Record<string, string> = { idea: "Idea", experiment: "Experiment", result: "Result" };
const STAGE_ORDER = ["idea", "experiment", "result"];

function ChainNav({ postId, chainId, currentStage }: { postId: number; chainId: number; currentStage: string }) {
  const { data: chainPosts } = trpc.forum.chainPosts.useQuery({ chainId }, { staleTime: 60_000 });
  if (!chainPosts || chainPosts.length <= 1) return null;

  return (
    <div className="mb-4 bg-[#f0f7f0] border border-[#7dd87d]/25 rounded-xl px-4 py-3">
      <p className="text-[#4a7c59] text-xs font-semibold uppercase tracking-wide mb-2">Thread Chain</p>
      <div className="flex items-center gap-2 flex-wrap">
        {STAGE_ORDER.map((stage, i) => {
          const match = chainPosts.find(p => p.threadStage === stage);
          if (!match) return null;
          const isCurrent = match.id === postId;
          return (
            <span key={stage} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-[#4a7c59]/30 text-xs">→</span>}
              {isCurrent ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#1a472a] text-[#7dd87d]">
                  {STAGE_LABELS[stage]}
                </span>
              ) : (
                <Link href={`/community/post/${match.id}`}>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-[#7dd87d]/30 text-[#4a7c59] hover:border-[#7dd87d] transition-colors cursor-pointer">
                    {STAGE_LABELS[stage]}
                  </span>
                </Link>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function CommunityPost() {
  const { id } = useParams<{ id: string }>();
  const postId = parseInt(id || '0');
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [replyContent, setReplyContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'post' | 'reply'; id: number } | null>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const handleReplyShortcuts = useMarkdownShortcuts(replyRef, replyContent, setReplyContent);
  const utils = trpc.useUtils();
  const { language } = useLanguage();
  
  // Translation state
  const [translatedPost, setTranslatedPost] = useState<string | null>(null);
  const [translatingPost, setTranslatingPost] = useState(false);
  const [translatedReplies, setTranslatedReplies] = useState<Record<number, string>>({});
  const [translatingReplyId, setTranslatingReplyId] = useState<number | null>(null);

  const translateMutation = trpc.translate.content.useMutation();

  const handleTranslatePost = async () => {
    if (!post || translatingPost) return;
    setTranslatingPost(true);
    try {
      const result = await translateMutation.mutateAsync({
        contentType: 'post' as const,
        contentId: postId,
        targetLang: language,
        sourceText: post.content,
        sourceTitle: post.title,
      });
      setTranslatedPost(result.translatedContent);
    } catch {
      toast.error('Translation failed. Please try again.');
    } finally {
      setTranslatingPost(false);
    }
  };

  const handleTranslateReply = async (replyId: number, content: string) => {
    if (translatingReplyId) return;
    setTranslatingReplyId(replyId);
    try {
      const result = await translateMutation.mutateAsync({
        contentType: 'reply' as const,
        contentId: replyId,
        targetLang: language,
        sourceText: content,
      });
      setTranslatedReplies(prev => ({ ...prev, [replyId]: result.translatedContent }));
    } catch {
      toast.error('Translation failed. Please try again.');
    } finally {
      setTranslatingReplyId(null);
    }
  };

  const { data: post, isLoading: postLoading } = trpc.forum.postById.useQuery(
    { id: postId },
    { enabled: postId > 0 }
  );

  const { data: replies, isLoading: repliesLoading } = trpc.forum.replies.useQuery(
    { postId },
    { enabled: postId > 0 }
  );

  const { data: likes } = trpc.forum.likes.useQuery(
    { postId, userId: user?.id },
    { enabled: postId > 0 }
  );

  // Detect if this is a land project or alliance org forum space
  const isEntitySpace = post?.categorySlug === 'active-projects' || post?.categorySlug === 'active-organisations';
  const entityOrgName = post?.title
    ?.replace(/ - Land Project Forum$/, '')
    ?.replace(/ - Alliance Organisation Forum$/, '')
    ?.replace(/ - Alliance Forum$/, '') ?? '';
  const { data: orgEndorsements } = trpc.quest.getEndorsementsByOrgName.useQuery(
    { orgName: entityOrgName },
    { enabled: isEntitySpace && !!entityOrgName, staleTime: 10 * 60 * 1000 }
  );

  const createReplyMutation = trpc.forum.createReply.useMutation({
    onSuccess: () => {
      setReplyContent("");
      setReplyingTo(null);
      utils.forum.replies.invalidate({ postId });
      utils.forum.postById.invalidate({ id: postId });
      toast.success("Reply posted!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to post reply");
    },
  });

  const toggleLikeMutation = trpc.forum.toggleLike.useMutation({
    onSuccess: () => {
      utils.forum.likes.invalidate({ postId });
    },
  });

  const deletePostMutation = trpc.forum.deletePost.useMutation({
    onSuccess: () => {
      toast.success("Post deleted");
      navigate(`/community/c/${post?.categorySlug || 'general'}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete post");
    },
  });

  const deleteReplyMutation = trpc.forum.deleteReply.useMutation({
    onSuccess: () => {
      utils.forum.replies.invalidate({ postId });
      utils.forum.postById.invalidate({ id: postId });
      toast.success("Reply deleted");
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete reply");
    },
  });

  // Flag dropdown state
  const [showFlagMenu, setShowFlagMenu] = useState(false);
  const [showReplyFlagMenu, setShowReplyFlagMenu] = useState<number | null>(null);

  const submitReportMutation = trpc.moderation.submitReport.useMutation({
    onSuccess: () => {
      toast.success("Report submitted. Moderators will review it.");
    },
    onError: () => {
      toast.error("Failed to submit report. Please try again.");
    },
  });

  // "I tried this" optimistic counts: replyId -> count
  const [triedThisCounts, setTriedThisCounts] = useState<Record<number, number>>({});

  const incrementTriedThisMutation = trpc.forum.incrementTriedThis.useMutation({
    onSuccess: (data, variables) => {
      setTriedThisCounts(prev => ({ ...prev, [variables.replyId]: data.count }));
    },
    onError: (err) => {
      toast.error(err.message || "Failed to record. Try again");
    },
  });

  const handleTriedThis = (replyId: number) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    incrementTriedThisMutation.mutate({ replyId });
  };

  // Focus reply textarea when replying to someone
  useEffect(() => {
    if (replyingTo !== null && replyRef.current) {
      replyRef.current.focus();
    }
  }, [replyingTo]);

  const handleSubmitReply = () => {
    if (!replyContent.trim()) return;
    createReplyMutation.mutate({
      postId,
      content: replyContent.trim(),
      parentReplyId: replyingTo || undefined,
    });
  };

  const handleLikePost = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    toggleLikeMutation.mutate({ postId });
  };

  const handleLikeReply = (replyId: number) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    toggleLikeMutation.mutate({ replyId });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'post') {
      deletePostMutation.mutate({ id: deleteTarget.id });
    } else {
      deleteReplyMutation.mutate({ id: deleteTarget.id });
    }
  };

  // Redirect non-authenticated users to the community gate page
  if (!isAuthenticated) {
    window.location.href = '/community';
    return null;
  }

  if (postLoading) {
    return (
      <div className="min-h-screen bg-[#f8f5f0]">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-[#4a7c59] animate-spin" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#f8f5f0]">
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <MessageCircle className="w-12 h-12 text-[#4a7c59]/30 mb-3" />
          <h2 className="text-xl font-bold text-[#1a472a] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Thread Not Found
          </h2>
          <p className="text-[#1a472a]/60 mb-4" style={{ fontFamily: 'var(--font-body)' }}>
            This discussion thread doesn't exist or has been removed.
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

  const isAdminOrSuper = user?.role === 'admin' || user?.role === 'superadmin';
  const canDeletePost = user && (user.id === post.authorId || isAdminOrSuper);

  return (
    <PageTransition>
    <div className="min-h-screen bg-[#f8f5f0]">
      <BackButton />

      {/* Header */}
      <section className="pt-24 pb-4 md:pt-28 md:pb-6 bg-gradient-to-b from-[#1a472a] to-[#2d5a3f]">
        <div className="container px-4 max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-white/50 text-sm mb-3 flex-wrap" style={{ fontFamily: 'var(--font-body)' }}>
            <Link href="/community" className="hover:text-white/80 transition-colors">Forum</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/community/c/${post.categorySlug}`} className="hover:text-white/80 transition-colors">
              {post.categoryName}
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/80 truncate max-w-[200px]">{post.title}</span>
          </div>

          {/* Type + stage badges */}
          {(post.postType && post.postType !== 'discussion' || post.threadStage) && (
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {post.postType === 'case_study' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#fef3c7] text-[#92400e]">Case Study</span>
              )}
              {post.postType === 'seeking_team' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#ede9fe] text-[#5b21b6]">Seeking Team</span>
              )}
              {post.threadStage === 'idea' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#dcfce7] text-[#166534]">Idea</span>
              )}
              {post.threadStage === 'experiment' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#dbeafe] text-[#1e40af]">Experiment</span>
              )}
              {post.threadStage === 'result' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#fef3c7] text-[#92400e]">Result</span>
              )}
            </div>
          )}

          <div className="flex items-start gap-2">
            {post.isPinned === 1 && <Pin className="w-4 h-4 text-[#d4a574] mt-1.5 flex-shrink-0" />}
            {post.isLocked === 1 && <Lock className="w-4 h-4 text-white/40 mt-1.5 flex-shrink-0" />}
            <h1
              className="text-xl md:text-2xl font-bold text-white"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {post.title}
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container px-4 max-w-4xl mx-auto py-6">
        {/* Original Post */}
        <AnimatedSection>
          <div className="bg-white rounded-xl border border-[#e8e4de] overflow-hidden mb-6">
            {/* Post Header */}
            <div className="px-4 md:px-6 pt-4 md:pt-5 flex items-start gap-3">
              <BadgeRingAvatar
                avatarUrl={post.authorAvatar}
                displayName={post.authorName}
                badges={post.authorBadges}
                size={40}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/community/user/${post.authorId}`} className="font-semibold text-[#1a472a] text-sm hover:text-[#4a7c59] transition-colors" style={{ fontFamily: 'var(--font-display)' }}>
                    {post.authorName}
                  </Link>
                  <Badge variant="secondary" className="bg-[#f0f7f0] text-[#4a7c59] border-0 text-[10px] px-1.5 py-0">
                    Author
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-[#1a472a]/40 text-xs mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                  <span>{formatDate(post.createdAt)}</span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {post.viewCount} views
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {isAuthenticated && (
                  <div className="relative">
                    <button
                      onClick={() => setShowFlagMenu(!showFlagMenu)}
                      className="flex items-center gap-1 text-[#1a472a]/30 hover:text-amber-500 p-1 transition-colors"
                      title="Flag this content"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                    {showFlagMenu && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowFlagMenu(false)} />
                        <div className="absolute right-0 bottom-full mb-1 z-20 bg-[#1a472a] border border-white/20 rounded-xl shadow-xl w-52 py-1 overflow-hidden">
                          <p className="text-white/40 text-xs px-3 py-2 border-b border-white/10">Flag this content</p>
                          <button
                            onClick={() => {
                              submitReportMutation.mutate({ postId: post.id, reason: "inappropriate", severity: "soft" });
                              setShowFlagMenu(false);
                            }}
                            className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors"
                          >
                            <p className="text-amber-300 text-sm font-medium">🖐 Tend to</p>
                            <p className="text-white/50 text-xs mt-0.5">Needs attention, not urgent. Notifies mods.</p>
                          </button>
                          <button
                            onClick={() => {
                              submitReportMutation.mutate({ postId: post.id, reason: "inappropriate", severity: "hard" });
                              setShowFlagMenu(false);
                            }}
                            className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors"
                          >
                            <p className="text-red-400 text-sm font-medium">🚩 Hard Stop</p>
                            <p className="text-white/50 text-xs mt-0.5">Serious violation. Hides post immediately.</p>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {canDeletePost && (
                  <button
                    onClick={() => setDeleteTarget({ type: 'post', id: post.id })}
                    className="text-red-400 hover:text-red-600 p-1 transition-colors"
                    title="Delete post"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Post Content */}
            <div className="px-4 md:px-6 py-4 text-[#1a472a]/80 text-sm leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
              {translatedPost ? (
                <div>
                  <div className="mb-2 px-2 py-1 bg-[#f0f7f0] rounded text-xs text-[#4a7c59] inline-flex items-center gap-1">
                    <Languages className="w-3 h-3" />
                    Translated to {language.toUpperCase()}
                    <button 
                      onClick={() => setTranslatedPost(null)}
                      className="ml-2 text-[#1a472a]/50 hover:text-[#1a472a] underline"
                    >
                      Show original
                    </button>
                  </div>
                  <ForumMarkdown content={translatedPost} />
                </div>
              ) : (
                <ForumMarkdown content={post.content} />
              )}
            </div>

            {/* Post Actions */}
            <div className="px-4 md:px-6 pb-4 flex items-center gap-4 border-t border-[#e8e4de] pt-3">
              <button
                onClick={handleLikePost}
                className={`flex items-center gap-1.5 text-sm transition-colors ${
                  likes?.likedPost 
                    ? 'text-red-500' 
                    : 'text-[#1a472a]/40 hover:text-red-400'
                }`}
              >
                <Heart className={`w-4 h-4 ${likes?.likedPost ? 'fill-current' : ''}`} />
                <span>{likes?.postLikes || 0}</span>
              </button>
              <span className="flex items-center gap-1.5 text-[#1a472a]/40 text-sm">
                <MessageCircle className="w-4 h-4" />
                {post.replyCount} {post.replyCount === 1 ? 'reply' : 'replies'}
              </span>
              {language !== 'en' && !translatedPost && (
                <button
                  onClick={handleTranslatePost}
                  disabled={translatingPost}
                  className="flex items-center gap-1.5 text-sm text-[#4a7c59]/60 hover:text-[#4a7c59] transition-colors ml-auto"
                >
                  {translatingPost ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Languages className="w-3.5 h-3.5" />
                  )}
                  <span>Translate</span>
                </button>
              )}
            </div>
          </div>
        </AnimatedSection>

        {/* Related Projects (C15) */}
        {postId > 0 && <ProjectConnectionsPanel postId={postId} />}

        {/* Quest Endorsements (Fix 107) — shown on land project and alliance org forum spaces */}
        {isEntitySpace && orgEndorsements && orgEndorsements.length > 0 && (
          <div className="mb-4 bg-[#f0f7f0] border border-[#7dd87d]/25 rounded-xl px-4 py-4">
            <p className="text-[#4a7c59] text-xs font-semibold uppercase tracking-wide mb-3">
              Quest Endorsements
            </p>
            <div className="flex flex-wrap gap-2">
              {orgEndorsements.map((e) => (
                <span
                  key={`${e.questId}-${e.endorsementType}`}
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    e.endorsementType === 'required'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-[#7dd87d]/20 text-[#1a472a] border-[#7dd87d]/30'
                  }`}
                >
                  {e.endorsementType === 'required' ? '⭐ Required:' : '🌱 Recommended:'} {e.questId.replace('quest-', 'Quest ')}
                </span>
              ))}
            </div>
            <p className="text-[#4a7c59]/60 text-[10px] mt-2">
              {entityOrgName} endorses these quests for their applicants and community members.
            </p>
          </div>
        )}

        {/* Thread Chain Navigation (C8) */}
        {post.threadStage && (post.chainId || post.id) && (
          <ChainNav postId={post.id} chainId={post.chainId ?? post.id} currentStage={post.threadStage} />
        )}

        {/* Replies */}
        {repliesLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-1/4 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : replies && replies.length > 0 ? (
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-bold text-[#1a472a]/60 uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
              Replies ({replies.length})
            </h3>
            {replies.map((reply, index) => {
              const canDeleteReply = user && (user.id === reply.authorId || isAdminOrSuper);
              const isNested = !!reply.parentReplyId;
              
              return (
                <AnimatedSection key={reply.id} delay={index * 0.03}>
                  <div className={`bg-white rounded-xl border border-[#e8e4de] overflow-hidden ${isNested ? 'ml-6 md:ml-10' : ''}`}>
                    <div className="px-4 py-3 flex items-start gap-3">
                      {isNested && (
                        <CornerDownRight className="w-4 h-4 text-[#4a7c59]/30 flex-shrink-0 mt-1" />
                      )}
                      <BadgeRingAvatar
                        avatarUrl={reply.authorAvatar}
                        displayName={reply.authorName}
                        badges={reply.authorBadges}
                        size={32}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-[#1a472a] text-xs" style={{ fontFamily: 'var(--font-display)' }}>
                            {reply.authorName}
                          </span>
                          {reply.authorId === post.authorId && (
                            <Badge variant="secondary" className="bg-[#f0f7f0] text-[#4a7c59] border-0 text-[10px] px-1.5 py-0">
                              OP
                            </Badge>
                          )}
                          <span className="text-[#1a472a]/30 text-[10px]">{timeAgo(reply.createdAt)}</span>
                        </div>
                        <div className="text-[#1a472a]/70 text-sm leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                          {translatedReplies[reply.id] ? (
                            <div>
                              <div className="mb-1 px-1.5 py-0.5 bg-[#f0f7f0] rounded text-[10px] text-[#4a7c59] inline-flex items-center gap-1">
                                <Languages className="w-2.5 h-2.5" />
                                Translated
                                <button 
                                  onClick={() => setTranslatedReplies(prev => { const n = {...prev}; delete n[reply.id]; return n; })}
                                  className="ml-1 underline text-[#1a472a]/40 hover:text-[#1a472a]"
                                >
                                  Original
                                </button>
                              </div>
                              <ForumMarkdown content={translatedReplies[reply.id]} />
                            </div>
                          ) : (
                            <ForumMarkdown content={reply.content} />
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <button
                            onClick={() => handleLikeReply(reply.id)}
                            className={`flex items-center gap-1 text-xs transition-colors ${
                              likes?.likedReplies?.includes(reply.id)
                                ? 'text-red-500'
                                : 'text-[#1a472a]/30 hover:text-red-400'
                            }`}
                          >
                            <Heart className={`w-3 h-3 ${likes?.likedReplies?.includes(reply.id) ? 'fill-current' : ''}`} />
                            <span>{likes?.replyLikes?.[reply.id] || 0}</span>
                          </button>
                          {(() => {
                            const triedCount = triedThisCounts[reply.id] ?? reply.triedThis ?? 0;
                            return (
                              <button
                                onClick={() => handleTriedThis(reply.id)}
                                disabled={incrementTriedThisMutation.isPending && incrementTriedThisMutation.variables?.replyId === reply.id}
                                className={`flex items-center gap-1 text-xs border rounded px-2 py-0.5 transition-colors ${
                                  triedCount > 0
                                    ? 'text-green-700 border-green-300 font-semibold'
                                    : 'text-green-600 border-green-200 hover:text-green-700 hover:border-green-400'
                                }`}
                                title="Mark that you tried this"
                              >
                                <Check className="w-3 h-3" />
                                I tried this{triedCount > 0 ? ` (${triedCount})` : ''}
                              </button>
                            );
                          })()}
                          {isAuthenticated && post.isLocked !== 1 && (
                            <button
                              onClick={() => {
                                setReplyingTo(reply.id);
                                replyRef.current?.focus();
                              }}
                              className="text-[#1a472a]/30 hover:text-[#4a7c59] text-xs flex items-center gap-1 transition-colors"
                            >
                              <CornerDownRight className="w-3 h-3" />
                              Reply
                            </button>
                          )}
                          {canDeleteReply && (
                            <button
                              onClick={() => setDeleteTarget({ type: 'reply', id: reply.id })}
                              className="text-[#1a472a]/20 hover:text-red-500 text-xs flex items-center gap-1 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                          {isAuthenticated && (
                            <div className="relative">
                              <button
                                onClick={() => setShowReplyFlagMenu(showReplyFlagMenu === reply.id ? null : reply.id)}
                                className="text-[#1a472a]/20 hover:text-amber-500 text-xs flex items-center gap-1 transition-colors"
                                title="Flag this reply"
                              >
                                <Flag className="w-3 h-3" />
                              </button>
                              {showReplyFlagMenu === reply.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setShowReplyFlagMenu(null)} />
                                  <div className="absolute right-0 bottom-full mb-1 z-20 bg-[#1a472a] border border-white/20 rounded-xl shadow-xl w-52 py-1 overflow-hidden">
                                    <p className="text-white/40 text-xs px-3 py-2 border-b border-white/10">Flag this reply</p>
                                    <button
                                      onClick={() => {
                                        submitReportMutation.mutate({ replyId: reply.id, reason: "inappropriate", severity: "soft" });
                                        setShowReplyFlagMenu(null);
                                      }}
                                      className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors"
                                    >
                                      <p className="text-amber-300 text-sm font-medium">🖐 Tend to</p>
                                      <p className="text-white/50 text-xs mt-0.5">Needs attention, not urgent. Notifies mods.</p>
                                    </button>
                                    <button
                                      onClick={() => {
                                        submitReportMutation.mutate({ replyId: reply.id, reason: "inappropriate", severity: "hard" });
                                        setShowReplyFlagMenu(null);
                                      }}
                                      className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors"
                                    >
                                      <p className="text-red-400 text-sm font-medium">🚩 Hard Stop</p>
                                      <p className="text-white/50 text-xs mt-0.5">Serious violation. Hides post immediately.</p>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                          {language !== 'en' && !translatedReplies[reply.id] && (
                            <button
                              onClick={() => handleTranslateReply(reply.id, reply.content)}
                              disabled={translatingReplyId === reply.id}
                              className="text-[#4a7c59]/40 hover:text-[#4a7c59] text-xs flex items-center gap-1 transition-colors ml-auto"
                            >
                              {translatingReplyId === reply.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Languages className="w-3 h-3" />
                              )}
                              Translate
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 mb-6">
            <MessageCircle className="w-10 h-10 text-[#4a7c59]/20 mx-auto mb-2" />
            <p className="text-[#1a472a]/40 text-sm" style={{ fontFamily: 'var(--font-body)' }}>
              No replies yet. Be the first to respond!
            </p>
          </div>
        )}

        {/* Reply Form */}
        {post.isLocked === 1 ? (
          <div className="bg-[#f0f0e8] rounded-xl p-4 flex items-center gap-3 text-[#1a472a]/50">
            <Lock className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm" style={{ fontFamily: 'var(--font-body)' }}>
              This thread is locked. No new replies can be added.
            </p>
          </div>
        ) : isAuthenticated ? (
          <div className="bg-white rounded-xl border border-[#e8e4de] p-4 md:p-5">
            {replyingTo && (
              <div className="flex items-center gap-2 mb-3 text-xs text-[#4a7c59] bg-[#f0f7f0] px-3 py-1.5 rounded-lg">
                <CornerDownRight className="w-3 h-3" />
                <span>Replying to a comment</span>
                <button 
                  onClick={() => setReplyingTo(null)}
                  className="ml-auto text-[#1a472a]/40 hover:text-[#1a472a]"
                >
                  Cancel
                </button>
              </div>
            )}
            <MarkdownToolbar textareaRef={replyRef} value={replyContent} onChange={setReplyContent} compact />
            <Textarea
              ref={replyRef}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyDown={handleReplyShortcuts}
              placeholder="Share your thoughts... (Ctrl+B for bold, Ctrl+I for italic, Ctrl+K for link)"
              className="min-h-[100px] border-[#e8e4de] focus:border-[#7dd87d] focus:ring-[#7dd87d]/20 text-[#1a472a] resize-none mb-3 rounded-t-none border-t-0"
              style={{ fontFamily: 'var(--font-body)' }}
            />
            <div className="flex items-center justify-between">
              <MarkdownHints />
              <Button
                onClick={handleSubmitReply}
                disabled={!replyContent.trim() || createReplyMutation.isPending}
                className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] font-bold rounded-full px-5 text-sm"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {createReplyMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <Send className="w-4 h-4 mr-1.5" />
                )}
                Reply
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#e8e4de] p-5 text-center">
            <p className="text-[#1a472a]/60 text-sm mb-3" style={{ fontFamily: 'var(--font-body)' }}>
              Sign in to join the conversation
            </p>
            <Button 
              onClick={() => window.location.href = getLoginUrl()}
              className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] font-bold rounded-full"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Sign In
            </Button>
          </div>
        )}
      </section>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
              Delete {deleteTarget?.type === 'post' ? 'Thread' : 'Reply'}?
            </DialogTitle>
            <DialogDescription className="text-[#1a472a]/60" style={{ fontFamily: 'var(--font-body)' }}>
              {deleteTarget?.type === 'post' 
                ? 'This will permanently delete the thread and all its replies. This cannot be undone.'
                : 'This will permanently delete this reply. This cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" className="border-[#e8e4de] text-[#1a472a]">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleDelete}
              disabled={deletePostMutation.isPending || deleteReplyMutation.isPending}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {(deletePostMutation.isPending || deleteReplyMutation.isPending) && (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PageTransition>
  );
}
