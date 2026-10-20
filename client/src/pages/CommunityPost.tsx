/**
 * Community Forum - Post Detail Page
 * Shows a single thread with all replies, like functionality, and reply form
 */
import { Link, useLocation, useParams } from "wouter";
import {
  MessageCircle, ArrowLeft, Heart, Eye, Clock, Send,
  ChevronRight, Pin, Lock, Loader2, Trash2, CornerDownRight,
  AlertCircle, Flag, Shield, User, Globe2, Languages, Check, Pencil, X, Save, Link2, Sparkles,
  BellRing, BellOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { BackButton } from "@/components/BackButton";
import { SEO } from "@/components/SEO";
import { SmartImagePicker } from "@/components/SmartImagePicker";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";
import { AnimatedSection } from "@/components/AnimatedSection";
import { PageTransition } from "@/components/PageTransition";
import { useLanguage } from "@/contexts/LanguageContext";
import { ForumMarkdown } from "@/components/ForumMarkdown";
import { MarkdownToolbar } from "@/components/MarkdownToolbar";
import { RichEditor, type RichEditorHandle } from "@/components/RichEditor";
import { ProjectConnectionsPanel as ProjectConnectionsPanelBase } from "@/components/ProjectConnectionsPanel";
import { BadgeRingAvatar } from "@/components/BadgeRingAvatar";
import { CitizenshipBadge } from "@/components/game/TierBadge";
import { EmojiReactions } from "@/components/EmojiReactions";
import { GratitudeButton } from "@/components/GratitudeButton";
import { ForumThreadDecisionBanner } from "@/components/governance/ForumThreadDecisionBanner";
import { GovernanceLifecycleStrip } from "@/components/governance/GovernanceLifecycleStrip";
import { PerspectiveControl } from "@/components/governance/PerspectiveControl";
import { RaiseModal } from "@/components/assembly/RaiseModal";
import { Vote } from "lucide-react";
import ThreadRootsBase from "@/components/ThreadRoots";
import { LinkPreviewCard } from "@/components/LinkPreviewCard";
import { decodeEntities } from "@/utils/sanitize";
import { useLinkPreview } from "@/hooks/useLinkPreview";

type ForumPostData = inferRouterOutputs<AppRouter>["forum"]["postById"];

// The page hands these stable props, so a like or an open menu leaves the
// thread tree and the related-projects panel alone.
const ThreadRoots = memo(ThreadRootsBase);
const ProjectConnectionsPanel = memo(ProjectConnectionsPanelBase);

function scrollToReply(replyId: number) {
  const el = document.getElementById(`reply-${replyId}`);
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function timeAgo(date: Date | string | number): string {
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

/** Renders a link preview for content that contains a URL */
function ContentLinkPreview({ content }: { content: string }) {
  const { preview, isLoading, url } = useLinkPreview(content);
  if (!url) return null;
  return (
    <LinkPreviewCard
      url={url}
      title={preview?.title}
      description={preview?.description}
      image={preview?.image}
      siteName={preview?.siteName}
      loading={isLoading}
    />
  );
}

const STAGE_LABELS: Record<string, string> = { idea: "Idea", experiment: "Experiment", result: "Result" };
const STAGE_ORDER = ["idea", "experiment", "result"];

const ChainNav = memo(function ChainNav({ postId, chainId, currentStage }: { postId: number; chainId: number; currentStage: string }) {
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
              {i > 0 && <span className="text-[#1a472a]/75 text-xs">→</span>}
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
});

/**
 * The reply box. It owns the draft so a keystroke re-renders only this box,
 * not the whole thread above it. draftRef keeps the text if the box remounts
 * (the thread reloading), as the page-level state it replaced did.
 */
const ReplyComposer = memo(function ReplyComposer({
  postId,
  replyingTo,
  onPosted,
  editorRef,
  draftRef,
}: {
  postId: number;
  replyingTo: number | null;
  onPosted: () => void;
  editorRef: React.RefObject<RichEditorHandle | null>;
  draftRef: React.RefObject<string>;
}) {
  const utils = trpc.useUtils();
  const [replyContent, setReplyContent] = useState(() => draftRef.current);
  useEffect(() => { draftRef.current = replyContent; }, [draftRef, replyContent]);

  // Link preview for the reply composer
  const { preview: replyLinkPreview, isLoading: replyLinkPreviewLoading, url: replyLinkPreviewUrl } = useLinkPreview(replyContent);

  const createReplyMutation = trpc.forum.createReply.useMutation({
    onSuccess: () => {
      setReplyContent("");
      onPosted();
      utils.forum.replies.invalidate({ postId });
      utils.forum.postById.invalidate({ id: postId });
      toast.success("Reply posted!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to post reply");
    },
  });

  const handleSubmitReply = () => {
    if (!replyContent.trim()) return;
    createReplyMutation.mutate({
      postId,
      content: replyContent.trim(),
      parentReplyId: replyingTo || undefined,
    });
  };

  return (
    <>
      {/* compact reply editor */}
      <RichEditor
        ref={editorRef}
        value={replyContent}
        onChange={setReplyContent}
        placeholder="Share your thoughts..."
        className="min-h-[100px] text-[#1a472a] mb-3"
      />
      {replyLinkPreviewUrl && (
        <LinkPreviewCard
          url={replyLinkPreviewUrl}
          title={replyLinkPreview?.title}
          description={replyLinkPreview?.description}
          image={replyLinkPreview?.image}
          siteName={replyLinkPreview?.siteName}
          loading={replyLinkPreviewLoading}
        />
      )}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmitReply}
          disabled={!replyContent.trim() || createReplyMutation.isPending}
          className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-bold rounded-full px-5 text-sm"
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
    </>
  );
});

/** The post's edit form. It holds the edits, so typing re-renders only the form. */
const PostEditForm = memo(function PostEditForm({ post, onClose }: { post: ForumPostData; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [editTitle, setEditTitle] = useState(() => decodeEntities(post.title));
  const [editContent, setEditContent] = useState(post.content);
  const [editImageUrl, setEditImageUrl] = useState(post.generatedImageUrl || '');

  const updatePostMutation = trpc.forum.updatePost.useMutation({
    onSuccess: () => {
      utils.forum.postById.invalidate({ id: post.id });
      toast.success("Post updated");
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update post");
    },
  });

  return (
    <div className="px-4 md:px-6 py-4 space-y-3">
      <input
        value={editTitle}
        onChange={(e) => setEditTitle(e.target.value)}
        className="w-full px-3 py-2 text-sm font-semibold bg-white border border-[#7dd87d]/40 rounded-lg text-[#1a472a] focus:outline-none focus:border-[#7dd87d]"
        placeholder="Post title..."
      />
      <textarea
        value={editContent}
        onChange={(e) => setEditContent(e.target.value)}
        rows={16}
        className="w-full px-3 py-2 text-sm font-mono bg-white border border-[#7dd87d]/40 rounded-lg text-[#1a472a] resize-y focus:outline-none focus:border-[#7dd87d]"
        placeholder="Post content (markdown supported)..."
      />
      <SmartImagePicker value={editImageUrl} onChange={setEditImageUrl} context="forum" label="Post image" theme="light" />
      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#1a472a]/80 hover:text-[#1a472a] border border-[#1a472a]/20 rounded-lg transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
        <button
          onClick={() => updatePostMutation.mutate({ id: post.id, title: editTitle, content: editContent, generatedImageUrl: editImageUrl || null })}
          disabled={updatePostMutation.isPending}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-[#1a472a] text-white rounded-lg hover:bg-[#2d5a3d] transition-colors disabled:opacity-60"
        >
          <Save className="w-3.5 h-3.5" />
          {updatePostMutation.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
});

type PostCardProps = {
  post: ForumPostData;
  language: string;
  isAuthenticated: boolean;
  canDeletePost: boolean;
  following: boolean;
  effectiveStage: string | null;
  perspectiveVoices: number;
  likedPost: boolean;
  postLikes: number;
  onLikePost: () => void;
  onDeletePost: (id: number) => void;
};

/**
 * The original post. It keeps its own menus, edit form and translation, and
 * takes plain values from the page, so activity in the replies below does not
 * re-render it.
 */
const PostCard = memo(function PostCard({
  post, language, isAuthenticated, canDeletePost, following, effectiveStage,
  perspectiveVoices, likedPost, postLikes, onLikePost, onDeletePost,
}: PostCardProps) {
  const utils = trpc.useUtils();
  const [editingPost, setEditingPost] = useState(false);
  const closeEdit = useCallback(() => setEditingPost(false), []);
  const [promotionOpen, setPromotionOpen] = useState(false);
  const [confirmingSensing, setConfirmingSensing] = useState(false);
  const inGovernance = effectiveStage !== null;

  // Governance entry: "Sense the room" moves a dialogue thread into Sensing.
  const enterSensing = trpc.forum.enterSensing.useMutation({
    onSuccess: () => {
      setConfirmingSensing(false);
      utils.forum.postById.invalidate({ id: post.id });
      utils.forum.perspectives.get.invalidate({ threadId: post.id });
    },
    onError: (err) => {
      setConfirmingSensing(false);
      toast.error(err.message || "Could not enter Sensing");
    },
  });

  const setThreadSubscription = trpc.notifications.subscriptions.set.useMutation({
    onSuccess: () => utils.notifications.subscriptions.forThread.invalidate({ postId: post.id }),
  });

  // Translation state
  const [translatedPost, setTranslatedPost] = useState<string | null>(null);
  const [translatingPost, setTranslatingPost] = useState(false);
  const translateMutation = trpc.translate.content.useMutation();

  const handleTranslatePost = async () => {
    if (translatingPost) return;
    setTranslatingPost(true);
    try {
      const result = await translateMutation.mutateAsync({
        contentType: 'post' as const,
        contentId: post.id,
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

  // Copy link state
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    copyToClipboard(window.location.href).then((ok) => {
      if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
    });
  };

  // Flag dropdown state
  const [showFlagMenu, setShowFlagMenu] = useState(false);

  const submitReportMutation = trpc.moderation.submitReport.useMutation({
    onSuccess: () => {
      toast.success("Report submitted. Moderators will review it.");
    },
    onError: () => {
      toast.error("Failed to submit report. Please try again.");
    },
  });

  return (
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
              {(post as any).authorCitizenshipTier && (post as any).authorCitizenshipTier !== 'explorer' && (
                <CitizenshipBadge tier={(post as any).authorCitizenshipTier} size="sm" />
              )}
              <Badge variant="secondary" className="bg-[#f0f7f0] text-[#4a7c59] border-0 text-[10px] px-1.5 py-0">
                Author
              </Badge>
            </div>
            {/* B.4: Bioregion display (requires server to include bioregion on post author data) */}
            {(post as any).authorBioregion && <span className="block text-[10px] text-[#1a472a]/80">{(post as any).authorBioregion}</span>}
            <div className="flex items-center gap-3 text-[#1a472a]/80 text-xs mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
              <span>{formatDate(post.createdAt)}</span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {post.viewCount} views
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isAuthenticated && (
              <button
                onClick={() => {
                  // Following now: mute. Not following yet, or muted: follow.
                  const nextMuted = following;
                  setThreadSubscription.mutate({ postId: post.id, muted: nextMuted });
                }}
                className={`flex items-center gap-1 p-1 transition-colors ${
                  following
                    ? 'text-[#4a7c59] hover:text-[#1a472a]'
                    : 'text-[#1a472a]/75 hover:text-[#4a7c59]'
                }`}
                title={following ? 'Following this thread. Tap to mute.' : 'Get notified about new replies'}
                aria-label={following ? 'Mute this thread' : 'Follow this thread'}
                aria-pressed={following}
              >
                {following
                  ? <BellRing className="w-3.5 h-3.5" />
                  : <BellOff className="w-3.5 h-3.5" />}
              </button>
            )}
            {isAuthenticated && (
              <div className="relative">
                <button
                  onClick={() => setShowFlagMenu(!showFlagMenu)}
                  className="flex items-center gap-1 text-[#1a472a]/75 hover:text-amber-500 p-1 transition-colors"
                  title="Flag this content"
                  aria-label="Flag this content"
                >
                  <Flag className="w-3.5 h-3.5" />
                </button>
                {showFlagMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowFlagMenu(false)} />
                    <div className="absolute right-0 bottom-full mb-1 z-20 bg-[#1a472a] border border-white/20 rounded-xl shadow-xl w-52 py-1 overflow-hidden">
                      <p className="text-white/60 text-xs px-3 py-2 border-b border-white/10">Flag this content</p>
                      <button
                        onClick={() => {
                          submitReportMutation.mutate({ postId: post.id, reason: "inappropriate", severity: "soft" });
                          setShowFlagMenu(false);
                        }}
                        className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors"
                      >
                        <p className="text-amber-300 text-sm font-medium">🖐 Tend to</p>
                        <p className="text-white/70 text-xs mt-0.5">Needs attention, not urgent. Notifies mods.</p>
                      </button>
                      <button
                        onClick={() => {
                          submitReportMutation.mutate({ postId: post.id, reason: "inappropriate", severity: "hard" });
                          setShowFlagMenu(false);
                        }}
                        className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors"
                      >
                        <p className="text-red-400 text-sm font-medium">🚩 Hard Stop</p>
                        <p className="text-white/70 text-xs mt-0.5">Serious violation. Hides post immediately.</p>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            {canDeletePost && !editingPost && (
              <button
                onClick={() => setEditingPost(true)}
                className="text-[#4a7c59] hover:text-[#1a472a] p-1 pointer-coarse:min-h-11 pointer-coarse:min-w-11 inline-flex items-center justify-center transition-colors"
                title="Edit post"
                aria-label="Edit post"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {canDeletePost && (
              <button
                onClick={() => onDeletePost(post.id)}
                className="text-red-400 hover:text-red-600 p-1 pointer-coarse:min-h-11 pointer-coarse:min-w-11 inline-flex items-center justify-center transition-colors"
                title="Delete post"
                aria-label="Delete post"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Post Content / Edit Form */}
        {editingPost ? (
          <PostEditForm post={post} onClose={closeEdit} />
        ) : (
        <div className="px-4 md:px-6 py-4 text-[#1a472a]/80 text-sm leading-relaxed safe-prose min-w-0" style={{ fontFamily: 'var(--font-body)' }}>
          {translatedPost ? (
            <div>
              <div className="mb-2 px-2 py-1 bg-[#f0f7f0] rounded text-xs text-[#4a7c59] inline-flex items-center gap-1">
                <Languages className="w-3 h-3" />
                Translated to {language.toUpperCase()}
                <button
                  onClick={() => setTranslatedPost(null)}
                  className="ml-2 text-[#1a472a]/75 hover:text-[#1a472a] underline"
                >
                  Show original
                </button>
              </div>
              <ForumMarkdown content={translatedPost} />
            </div>
          ) : (
            <ForumMarkdown content={post.content} />
          )}
          <ContentLinkPreview content={post.content} />
        </div>
        )}

        {/* Governance lifecycle — only once the thread has entered the pipeline */}
        {inGovernance && (
          <div className="px-4 md:px-6 pb-2 space-y-3">
            <GovernanceLifecycleStrip
              threadId={post.id}
              governanceStage={effectiveStage as any}
              sensingStartedBy={(post as any).sensingStartedBy ?? null}
            />
            {(effectiveStage === "sensing" || effectiveStage === "proposal") && (
              <PerspectiveControl threadId={post.id} />
            )}
          </div>
        )}

        {/* Living backlink banner: shows if this thread has been promoted to a formal decision */}
        <div className="px-4 md:px-6 pb-2">
          <ForumThreadDecisionBanner threadId={post.id} />
          {isAuthenticated && (
            <div className="flex items-center justify-end gap-4 mt-1 flex-wrap">
              {inGovernance && perspectiveVoices > 0 && (
                <span className="text-[11px] text-[#1a472a]/75">
                  {perspectiveVoices === 1 ? "1 person has" : `${perspectiveVoices} people have`} weighed in
                </span>
              )}
              {!inGovernance && (
                confirmingSensing ? (
                  <span className="flex items-center gap-3 flex-wrap text-[11px]">
                    <span className="text-[#1a472a]/80">
                      Start sensing the room on this thread? This invites everyone to share where they stand.
                    </span>
                    <button
                      type="button"
                      onClick={() => enterSensing.mutate({ threadId: post.id })}
                      disabled={enterSensing.isPending}
                      className="inline-flex items-center gap-1 font-bold text-[#1a472a] underline hover:text-[#4a7c59] transition-colors"
                    >
                      {enterSensing.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                      Start sensing
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingSensing(false)}
                      className="text-[#1a472a]/75 hover:text-[#4a7c59] transition-colors"
                    >
                      Not yet
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingSensing(true)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#4a7c59] hover:text-[#1a472a] transition-colors"
                    title="Gauge where we stand as we move to a formal proposal."
                  >
                    <Eye className="w-3 h-3" />
                    Sense the room
                  </button>
                )
              )}
              <button
                type="button"
                onClick={() => setPromotionOpen(true)}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#4a7c59] hover:text-[#1a472a] transition-colors"
                title="Raise this thread as a proposal in the Assembly, the Game's community-governed space."
              >
                <Vote className="w-3 h-3" />
                Raise in Assembly
              </button>
            </div>
          )}
        </div>
        <RaiseModal threadId={post.id} threadTitle={post.title} open={promotionOpen} onClose={() => setPromotionOpen(false)} />

        {/* Emoji Reactions + Gratitude on post */}
        <div className="px-4 md:px-6 pb-2 flex items-center gap-2 flex-wrap">
          <EmojiReactions postId={post.id} />
          <GratitudeButton
            recipientHandle={(post as any).authorHandle}
            sourceType="forum_post"
            sourceId={post.id}
          />
        </div>

        {/* Post Actions */}
        <div className="px-4 md:px-6 pb-4 flex items-center gap-4 border-t border-[#e8e4de] pt-3">
          <button
            onClick={onLikePost}
            className={`flex items-center gap-1.5 text-sm transition-colors ${
              likedPost
                ? 'text-red-500'
                : 'text-[#1a472a]/80 hover:text-red-400'
            }`}
          >
            <Heart className={`w-4 h-4 ${likedPost ? 'fill-current' : ''}`} />
            <span>{postLikes}</span>
          </button>
          <span className="flex items-center gap-1.5 text-[#1a472a]/80 text-sm">
            <MessageCircle className="w-4 h-4" />
            {post.replyCount} {post.replyCount === 1 ? 'reply' : 'replies'}
          </span>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-xs text-[#1a472a]/80 hover:text-[#1a472a]/80 transition-colors"
            title="Copy link to post"
          >
            <Link2 className="w-4 h-4" />
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          {/* B.7: Propose as Quest */}
          <a
            href={`/community/quests?propose=true&title=${encodeURIComponent(post.title)}&threadId=${post.id}`}
            className="flex items-center gap-1 text-xs text-[#1a472a]/80 hover:text-[#4a7c59] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Propose as Quest
          </a>
          {language !== 'en' && !translatedPost && (
            <button
              onClick={handleTranslatePost}
              disabled={translatingPost}
              className="flex items-center gap-1.5 text-sm text-[#1a472a]/75 hover:text-[#4a7c59] transition-colors ml-auto"
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
  );
});

type ReplyItemProps = {
  index: number;
  replyId: number;
  content: string;
  authorName: string;
  authorAvatar: string | null;
  authorBadges: string[];
  authorHandle: string | null;
  authorTier: string | null;
  /** "5m ago", worked out by the parent so it stays current whenever the thread re-renders. */
  timeAgoLabel: string;
  isNested: boolean;
  isOp: boolean;
  canDelete: boolean;
  canReply: boolean;
  canFlag: boolean;
  liked: boolean;
  likeCount: number;
  triedCount: number;
  triedPending: boolean;
  flagMenuOpen: boolean;
  showTranslate: boolean;
  translated: string | undefined;
  translating: boolean;
  onLike: (replyId: number) => void;
  onTriedThis: (replyId: number) => void;
  onReplyTo: (replyId: number) => void;
  onDelete: (replyId: number) => void;
  onToggleFlagMenu: (replyId: number) => void;
  onCloseFlagMenu: () => void;
  onReport: (replyId: number, severity: "soft" | "hard") => void;
  onTranslate: (replyId: number, content: string) => void;
  onShowOriginal: (replyId: number) => void;
};

/**
 * One reply. Its props are plain values and handlers that take the reply id,
 * so liking, translating or flagging one reply re-renders only that reply.
 */
const ReplyItem = memo(function ReplyItem({
  index, replyId, content, authorName, authorAvatar, authorBadges, authorHandle, authorTier,
  timeAgoLabel, isNested, isOp, canDelete, canReply, canFlag, liked, likeCount, triedCount,
  triedPending, flagMenuOpen, showTranslate, translated, translating, onLike, onTriedThis,
  onReplyTo, onDelete, onToggleFlagMenu, onCloseFlagMenu, onReport, onTranslate, onShowOriginal,
}: ReplyItemProps) {
  return (
    <AnimatedSection delay={index * 0.03}>
      <div id={`reply-${replyId}`} className={`bg-white rounded-xl border border-[#e8e4de] overflow-hidden ${isNested ? 'ml-6 md:ml-10' : ''}`}>
        <div className="px-4 py-3 flex items-start gap-3">
          {isNested && (
            <CornerDownRight className="w-4 h-4 text-[#4a7c59]/30 flex-shrink-0 mt-1" />
          )}
          <BadgeRingAvatar
            avatarUrl={authorAvatar}
            displayName={authorName}
            badges={authorBadges}
            size={32}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-[#1a472a] text-xs" style={{ fontFamily: 'var(--font-display)' }}>
                {authorName}
              </span>
              {authorTier && authorTier !== 'explorer' && (
                <CitizenshipBadge tier={authorTier} size="sm" />
              )}
              {isOp && (
                <Badge variant="secondary" className="bg-[#f0f7f0] text-[#4a7c59] border-0 text-[10px] px-1.5 py-0">
                  OP
                </Badge>
              )}
              <span className="text-[#1a472a]/75 text-[10px]">{timeAgoLabel}</span>
            </div>
            <div className="text-[#1a472a]/75 text-sm leading-relaxed safe-prose" style={{ fontFamily: 'var(--font-body)' }}>
              {translated ? (
                <div>
                  <div className="mb-1 px-1.5 py-0.5 bg-[#f0f7f0] rounded text-[10px] text-[#4a7c59] inline-flex items-center gap-1">
                    <Languages className="w-2.5 h-2.5" />
                    Translated
                    <button
                      onClick={() => onShowOriginal(replyId)}
                      className="ml-1 underline text-[#1a472a]/80 hover:text-[#1a472a]"
                    >
                      Original
                    </button>
                  </div>
                  <ForumMarkdown content={translated} />
                </div>
              ) : (
                <ForumMarkdown content={content} />
              )}
              <ContentLinkPreview content={content} />
            </div>
            {/* Emoji Reactions + Gratitude on reply */}
            <div className="flex items-center gap-2 flex-wrap">
              <EmojiReactions replyId={replyId} />
              <GratitudeButton
                recipientHandle={authorHandle}
                sourceType="forum_reply"
                sourceId={replyId}
              />
            </div>

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <button
                onClick={() => onLike(replyId)}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  liked
                    ? 'text-red-500'
                    : 'text-[#1a472a]/75 hover:text-red-400'
                }`}
              >
                <Heart className={`w-3 h-3 ${liked ? 'fill-current' : ''}`} />
                <span>{likeCount}</span>
              </button>
              <button
                onClick={() => onTriedThis(replyId)}
                disabled={triedPending}
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
              {canReply && (
                <button
                  onClick={() => {
                    onReplyTo(replyId);
                  }}
                  className="text-[#1a472a]/75 hover:text-[#4a7c59] text-xs flex items-center gap-1 transition-colors"
                >
                  <CornerDownRight className="w-3 h-3" />
                  Reply
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => onDelete(replyId)}
                  className="text-[#1a472a]/20 hover:text-red-500 text-xs flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
              {canFlag && (
                <div className="relative">
                  <button
                    onClick={() => onToggleFlagMenu(replyId)}
                    className="text-[#1a472a]/20 hover:text-amber-500 text-xs flex items-center gap-1 transition-colors"
                    title="Flag this reply"
                    aria-label="Flag this reply"
                  >
                    <Flag className="w-3 h-3" />
                  </button>
                  {flagMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={onCloseFlagMenu} />
                      <div className="absolute right-0 bottom-full mb-1 z-20 bg-[#1a472a] border border-white/20 rounded-xl shadow-xl w-52 py-1 overflow-hidden">
                        <p className="text-white/60 text-xs px-3 py-2 border-b border-white/10">Flag this reply</p>
                        <button
                          onClick={() => onReport(replyId, "soft")}
                          className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors"
                        >
                          <p className="text-amber-300 text-sm font-medium">🖐 Tend to</p>
                          <p className="text-white/70 text-xs mt-0.5">Needs attention, not urgent. Notifies mods.</p>
                        </button>
                        <button
                          onClick={() => onReport(replyId, "hard")}
                          className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors"
                        >
                          <p className="text-red-400 text-sm font-medium">🚩 Hard Stop</p>
                          <p className="text-white/70 text-xs mt-0.5">Serious violation. Hides post immediately.</p>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              {showTranslate && !translated && (
                <button
                  onClick={() => onTranslate(replyId, content)}
                  disabled={translating}
                  className="text-[#1a472a]/75 hover:text-[#4a7c59] text-xs flex items-center gap-1 transition-colors ml-auto"
                >
                  {translating ? (
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
});

export default function CommunityPost() {
  const { id } = useParams<{ id: string }>();
  const postId = parseInt(id || '0');
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const replyDraftRef = useRef("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'post' | 'reply'; id: number } | null>(null);
  const replyRef = useRef<RichEditorHandle>(null);
  const replyFormRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();
  const { language } = useLanguage();

  // The decision row (when one exists) outranks the thread's stored stage:
  // the ReGen Gov app moves decisions without writing back to forumPosts.
  const { data: threadDecision } = trpc.governance.getDecisionStatus.useQuery(
    { threadId: postId },
    { staleTime: 30_000, enabled: postId > 0 }
  );

  // Translation state (the post's own lives in PostCard)
  const [translatedReplies, setTranslatedReplies] = useState<Record<number, string>>({});
  const [translatingReplyId, setTranslatingReplyId] = useState<number | null>(null);
  // The one-at-a-time guard reads a ref, so the handler stays the same
  // function and the other replies keep their props.
  const translatingReplyRef = useRef<number | null>(null);

  const translateMutation = trpc.translate.content.useMutation();
  const translateContent = translateMutation.mutateAsync;

  const handleTranslateReply = useCallback(async (replyId: number, content: string) => {
    if (translatingReplyRef.current) return;
    translatingReplyRef.current = replyId;
    setTranslatingReplyId(replyId);
    try {
      const result = await translateContent({
        contentType: 'reply' as const,
        contentId: replyId,
        targetLang: language,
        sourceText: content,
      });
      setTranslatedReplies(prev => ({ ...prev, [replyId]: result.translatedContent }));
    } catch {
      toast.error('Translation failed. Please try again.');
    } finally {
      translatingReplyRef.current = null;
      setTranslatingReplyId(null);
    }
  }, [language, translateContent]);

  const handleShowOriginalReply = useCallback((replyId: number) => {
    setTranslatedReplies(prev => { const n = {...prev}; delete n[replyId]; return n; });
  }, []);

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

  // Participation context for the governance actions ("N people have weighed in")
  const { data: threadPerspectives } = trpc.forum.perspectives.get.useQuery(
    { threadId: postId },
    {
      staleTime: 30_000,
      enabled:
        postId > 0 &&
        ((post as any)?.governanceStage === "sensing" ||
          (post as any)?.governanceStage === "proposal" ||
          !!threadDecision),
    }
  );
  // Thread follow state (bell toggle in the post header). Null = not following.
  const { data: subscription } = trpc.notifications.subscriptions.forThread.useQuery(
    { postId },
    { enabled: postId > 0 && !!user }
  );

  // Read tracking (Phase 2): viewing the thread clears its unread state
  // everywhere. Fires once per visit, after replies settle.
  const markPostRead = trpc.forumFeed.markPostRead.useMutation();
  const markedReadRef = useRef(false);
  useEffect(() => {
    if (markedReadRef.current || !user || postId <= 0 || repliesLoading) return;
    markedReadRef.current = true;
    const timer = setTimeout(() => {
      markPostRead.mutate({ postId, replyCount: replies?.length ?? 0 });
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, postId, repliesLoading]);

  // Detect if this is a land project or alliance org forum space
  const isEntitySpace = post?.categorySlug === 'land-projects' || post?.categorySlug === 'alliance-partners';
  const entityOrgName = post?.title
    ?.replace(/ - Land Project Forum$/, '')
    ?.replace(/ - Alliance Organisation Forum$/, '')
    ?.replace(/ - Alliance Forum$/, '') ?? '';
  const { data: orgEndorsements } = trpc.quest.getEndorsementsByOrgName.useQuery(
    { orgName: entityOrgName },
    { enabled: isEntitySpace && !!entityOrgName, staleTime: 10 * 60 * 1000 }
  );

  // The heart and its count change on the tap; the server's answer settles
  // them, and an error puts them back.
  const likesInput = { postId, userId: user?.id };
  const toggleLikeMutation = trpc.forum.toggleLike.useMutation({
    onMutate: async (vars) => {
      await utils.forum.likes.cancel(likesInput);
      const prev = utils.forum.likes.getData(likesInput);
      utils.forum.likes.setData(likesInput, (old) => {
        if (!old) return old;
        if (vars.replyId) {
          const id = vars.replyId;
          const had = old.likedReplies.includes(id);
          return {
            ...old,
            likedReplies: had ? old.likedReplies.filter((r) => r !== id) : [...old.likedReplies, id],
            replyLikes: { ...old.replyLikes, [id]: Math.max(0, (old.replyLikes[id] ?? 0) + (had ? -1 : 1)) },
          };
        }
        return { ...old, likedPost: !old.likedPost, postLikes: Math.max(0, old.postLikes + (old.likedPost ? -1 : 1)) };
      });
      return { prev };
    },
    // The rollback lives here, not in onError, so the app-wide onError in
    // main.tsx (the too-many-requests toast) still runs.
    onSettled: (_data, error, _vars, context) => {
      if (error && context?.prev) utils.forum.likes.setData(likesInput, context.prev);
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

  // Reply flag dropdown state (the post's own lives in PostCard)
  const [showReplyFlagMenu, setShowReplyFlagMenu] = useState<number | null>(null);

  const submitReportMutation = trpc.moderation.submitReport.useMutation({
    onSuccess: () => {
      toast.success("Report submitted. Moderators will review it.");
    },
    onError: () => {
      toast.error("Failed to submit report. Please try again.");
    },
  });
  const submitReport = submitReportMutation.mutate;

  const toggleReplyFlagMenu = useCallback((replyId: number) => {
    setShowReplyFlagMenu(open => open === replyId ? null : replyId);
  }, []);
  const closeReplyFlagMenu = useCallback(() => setShowReplyFlagMenu(null), []);
  const handleReportReply = useCallback((replyId: number, severity: "soft" | "hard") => {
    submitReport({ replyId, reason: "inappropriate", severity });
    setShowReplyFlagMenu(null);
  }, [submitReport]);

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
  const incrementTriedThis = incrementTriedThisMutation.mutate;

  const handleTriedThis = useCallback((replyId: number) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    incrementTriedThis({ replyId });
  }, [isAuthenticated, incrementTriedThis]);

  // Focus and scroll to reply editor when replying to someone
  useEffect(() => {
    if (replyingTo !== null) {
      setTimeout(() => {
        replyFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        replyRef.current?.focus();
      }, 50);
    }
  }, [replyingTo]);

  // Notification deep-link landing: /community/post/:id#reply-:rid scrolls to
  // that exact comment once replies are loaded and pulses it. A deleted reply
  // shows a small inline note instead of failing silently.
  const [missingReplyNote, setMissingReplyNote] = useState(false);
  const deepLinkedRef = useRef(false);
  useEffect(() => {
    if (deepLinkedRef.current || !replies || replies.length === 0) return;
    const match = window.location.hash.match(/^#reply-(\d+)$/);
    if (!match) return;
    deepLinkedRef.current = true;
    const targetId = parseInt(match[1]);
    if (!replies.some((r: any) => r.id === targetId)) {
      setMissingReplyNote(true);
      return;
    }
    setTimeout(() => {
      const el = document.getElementById(`reply-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('reply-highlight-pulse');
        setTimeout(() => el.classList.remove('reply-highlight-pulse'), 2500);
      }
    }, 150);
  }, [replies]);

  // The handlers below stay the same functions across renders (mutate is
  // stable), so the memoized post card and reply rows can skip re-rendering.
  const toggleLike = toggleLikeMutation.mutate;

  const handleLikePost = useCallback(() => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    toggleLike({ postId });
  }, [isAuthenticated, toggleLike, postId]);

  const handleLikeReply = useCallback((replyId: number) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    toggleLike({ replyId });
  }, [isAuthenticated, toggleLike]);

  const handleDeletePost = useCallback((id: number) => setDeleteTarget({ type: 'post', id }), []);
  const handleDeleteReply = useCallback((id: number) => setDeleteTarget({ type: 'reply', id }), []);
  const handleReplyPosted = useCallback(() => setReplyingTo(null), []);

  const threadRootsReplies = useMemo(() => (replies ?? []).map(r => ({
    id: r.id,
    authorName: r.authorName,
    authorAvatar: r.authorAvatar ?? '',
    parentId: r.parentReplyId ?? null,
    depth: r.parentReplyId ? 1 : 0,
  })), [replies]);

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'post') {
      deletePostMutation.mutate({ id: deleteTarget.id });
    } else {
      deleteReplyMutation.mutate({ id: deleteTarget.id });
    }
  };

  // Redirect non-authenticated users to the community gate page
  if (postLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1f12] via-[#0d2818] to-[#122e1c]">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-[#7dd87d] animate-spin" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1f12] via-[#0d2818] to-[#122e1c]">
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <MessageCircle className="w-12 h-12 text-[#7dd87d]/75 mb-3" />
          <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Thread Not Found
          </h2>
          <p className="text-white/65 mb-4" style={{ fontFamily: 'var(--font-body)' }}>
            This dialogue thread doesn't exist or has been removed.
          </p>
          <Link href="/community">
            <Button variant="outline" className="border-[#7dd87d]/40 text-[#7dd87d] hover:bg-[#7dd87d]/10">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Forum
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isAdminOrSuper = user?.role === 'admin' || user?.role === 'superadmin';
  const canDeletePost = user && (user.id === post.authorId || isAdminOrSuper);

  // Effective governance stage. A live decision row outranks the stored stage
  // because the ReGen Gov app advances decisions without writing forumPosts.
  const storedStage = (post as any).governanceStage as string | null | undefined;
  const decisionStatus = threadDecision ? String((threadDecision as any).status) : null;
  const decisionTerminal = decisionStatus !== null && ["ratified", "declined", "cancelled"].includes(decisionStatus);
  const effectiveStage = decisionTerminal
    ? "decided"
    : threadDecision
    ? "proposal"
    : storedStage === "sensing" || storedStage === "proposal" || storedStage === "decided"
    ? storedStage
    : null;
  const perspectiveVoices = ((threadPerspectives as any)?.tallies ?? []).reduce(
    (sum: number, t: any) => sum + Number(t.count ?? 0),
    0
  );
  const following = !!subscription && !subscription.muted;

  return (
    <PageTransition>
    <div className="min-h-screen bg-gradient-to-b from-[#0a1f12] via-[#0d2818] to-[#122e1c]">
      <SEO
        title={`${decodeEntities(post.title)} | ReGen Civics Community`}
        description={post.content?.slice(0, 155) || `A forum post by ${post.authorName} in the ReGen Civics community.`}
        url={`/community/post/${post.id}`}
        type="article"
        author={post.authorName}
      />
      <BackButton />

      {/* Header */}
      <section className="pt-24 pb-4 md:pt-28 md:pb-6 bg-gradient-to-b from-[#1a472a] to-[#2d5a3d]">
        <div className="container px-4 max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-white/70 text-sm mb-3 flex-wrap" style={{ fontFamily: 'var(--font-body)' }}>
            <Link href="/community" className="hover:text-white/80 transition-colors">Forum</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/community/c/${post.categorySlug}`} className="hover:text-white/80 transition-colors">
              {post.categoryName}
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/80 truncate max-w-[200px]">{decodeEntities(post.title)}</span>
          </div>

          {/* Type + stage badges */}
          {(post.postType && post.postType !== 'discussion' || post.threadStage) && (
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {post.postType === 'case_study' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#f0ebe3] text-[#92400e]">Case Study</span>
              )}
              {post.postType === 'seeking_team' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#ede9fe] text-[#5b21b6]">Seeking Team</span>
              )}
              {post.threadStage === 'idea' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#f0f7f0] text-[#1a472a]">Idea</span>
              )}
              {post.threadStage === 'experiment' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#f0f7f0] text-[#1a472a]">Experiment</span>
              )}
              {post.threadStage === 'result' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#f0ebe3] text-[#92400e]">Result</span>
              )}
            </div>
          )}

          <div className="flex items-start gap-2">
            {post.isPinned === 1 && <Pin className="w-4 h-4 text-[#d4a574] mt-1.5 flex-shrink-0" />}
            {post.isLocked === 1 && <Lock className="w-4 h-4 text-white/60 mt-1.5 flex-shrink-0" />}
            <h1
              className="text-xl md:text-2xl font-bold text-white"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {decodeEntities(post.title)}
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container px-4 max-w-4xl mx-auto py-6">
        {/* Original Post */}
        <PostCard
          post={post}
          language={language}
          isAuthenticated={isAuthenticated}
          canDeletePost={!!canDeletePost}
          following={following}
          effectiveStage={effectiveStage}
          perspectiveVoices={perspectiveVoices}
          likedPost={!!likes?.likedPost}
          postLikes={likes?.postLikes || 0}
          onLikePost={handleLikePost}
          onDeletePost={handleDeletePost}
        />

        {/* Related Projects (C15) */}
        {postId > 0 && <ProjectConnectionsPanel postId={postId} />}

        {/* Quest Endorsements (Fix 107) - shown on land project and alliance org forum spaces */}
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
            <p className="text-[#1a472a]/75 text-[10px] mt-2">
              {entityOrgName} endorses these quests for their applicants and community members.
            </p>
          </div>
        )}

        {/* Thread Chain Navigation (C8) */}
        {post.threadStage && (post.chainId || post.id) && (
          <ChainNav postId={post.id} chainId={post.chainId ?? post.id} currentStage={post.threadStage} />
        )}

        {/* B.1: Thread Roots visualization */}
        {replies && replies.length > 2 && (
          <div className="mb-4">
            <ThreadRoots
              replies={threadRootsReplies}
              onNodeClick={scrollToReply}
            />
          </div>
        )}

        {/* Replies */}
        {missingReplyNote && (
          <div className="mb-4 bg-[#f0ebe3] border border-[#d4a574]/40 rounded-lg px-4 py-3 text-sm text-[#92400e]">
            That reply is no longer here.
          </div>
        )}
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
            <h3 className="text-sm font-bold text-[#1a472a]/80 uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
              Replies ({replies.length})
            </h3>
            {replies.map((reply, index) => (
              <ReplyItem
                key={reply.id}
                index={index}
                replyId={reply.id}
                content={reply.content}
                authorName={reply.authorName}
                authorAvatar={reply.authorAvatar}
                authorBadges={reply.authorBadges}
                authorHandle={(reply as any).authorHandle}
                authorTier={(reply as any).authorCitizenshipTier}
                timeAgoLabel={timeAgo(reply.createdAt)}
                isNested={!!reply.parentReplyId}
                isOp={reply.authorId === post.authorId}
                canDelete={!!user && (user.id === reply.authorId || isAdminOrSuper)}
                canReply={isAuthenticated && post.isLocked !== 1}
                canFlag={isAuthenticated}
                liked={!!likes?.likedReplies?.includes(reply.id)}
                likeCount={likes?.replyLikes?.[reply.id] || 0}
                triedCount={triedThisCounts[reply.id] ?? reply.triedThis ?? 0}
                triedPending={incrementTriedThisMutation.isPending && incrementTriedThisMutation.variables?.replyId === reply.id}
                flagMenuOpen={showReplyFlagMenu === reply.id}
                showTranslate={language !== 'en'}
                translated={translatedReplies[reply.id]}
                translating={translatingReplyId === reply.id}
                onLike={handleLikeReply}
                onTriedThis={handleTriedThis}
                onReplyTo={setReplyingTo}
                onDelete={handleDeleteReply}
                onToggleFlagMenu={toggleReplyFlagMenu}
                onCloseFlagMenu={closeReplyFlagMenu}
                onReport={handleReportReply}
                onTranslate={handleTranslateReply}
                onShowOriginal={handleShowOriginalReply}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 mb-6 bg-white/5 border border-white/10 rounded-xl">
            <MessageCircle className="w-10 h-10 text-white/30 mx-auto mb-2" />
            <p className="text-white/75 text-sm" style={{ fontFamily: 'var(--font-body)' }}>
              No replies yet. Be the first to respond!
            </p>
          </div>
        )}

        {/* Reply Form */}
        {post.isLocked === 1 ? (
          <div className="bg-[#f0f0e8] rounded-xl p-4 flex items-center gap-3 text-[#1a472a]/80">
            <Lock className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm" style={{ fontFamily: 'var(--font-body)' }}>
              This thread is locked. No new replies can be added.
            </p>
          </div>
        ) : isAuthenticated ? (
          <div ref={replyFormRef} className="bg-white rounded-xl border border-[#e8e4de] p-4 md:p-5">
            {replyingTo && (
              <div className="flex items-center gap-2 mb-3 text-xs text-[#4a7c59] bg-[#f0f7f0] px-3 py-1.5 rounded-lg">
                <CornerDownRight className="w-3 h-3" />
                <span>Replying to a comment</span>
                <button 
                  onClick={() => setReplyingTo(null)}
                  className="ml-auto text-[#1a472a]/80 hover:text-[#1a472a]"
                >
                  Cancel
                </button>
              </div>
            )}
            <ReplyComposer
              postId={postId}
              replyingTo={replyingTo}
              onPosted={handleReplyPosted}
              editorRef={replyRef}
              draftRef={replyDraftRef}
            />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#e8e4de] p-5 text-center">
            <p className="text-[#1a472a]/80 text-sm mb-3" style={{ fontFamily: 'var(--font-body)' }}>
              Sign in to join the conversation
            </p>
            <Button 
              onClick={() => window.location.href = getLoginUrl()}
              className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-bold rounded-full"
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
            <DialogDescription className="text-[#1a472a]/80" style={{ fontFamily: 'var(--font-body)' }}>
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
