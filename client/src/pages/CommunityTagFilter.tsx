/**
 * Community Forum - Tag-filtered post view
 * Displays all posts across categories that share a given tag.
 * Tags: lesson | seeking-support | offering-support
 */
import { Link, useParams } from "wouter";
import {
  MessageCircle, ArrowLeft, Clock, Eye, ChevronRight, Pin, BookOpen, Heart, Users
} from "lucide-react";
import { TaoSpinner } from "@/components/TaoSpinner";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/BackButton";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AnimatedSection } from "@/components/AnimatedSection";
import { PageTransition } from "@/components/PageTransition";

type ValidTag = "lesson" | "seeking-support" | "offering-support";

const TAG_META: Record<ValidTag, { label: string; description: string; color: string; bg: string; icon: React.ReactNode }> = {
  lesson: {
    label: "#lesson",
    description: "Real-world insights and learnings shared by the community.",
    color: "#92400e",
    bg: "#f0ebe3",
    icon: <BookOpen className="w-5 h-5" />,
  },
  "seeking-support": {
    label: "#seeking-support",
    description: "Members looking for help, feedback, or expertise.",
    color: "#1a472a",
    bg: "#f0f7f0",
    icon: <Heart className="w-5 h-5" />,
  },
  "offering-support": {
    label: "#offering-support",
    description: "Members with something to offer or who want to help.",
    color: "#1a472a",
    bg: "#f0f7f0",
    icon: <Users className="w-5 h-5" />,
  },
};

function timeAgo(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
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
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function PostTagBadge({ tag }: { tag: string }) {
  const meta = TAG_META[tag as ValidTag];
  if (!meta) return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ color: meta.color, backgroundColor: meta.bg }}
    >
      {meta.label}
    </span>
  );
}

export default function CommunityTagFilter() {
  const { tag } = useParams<{ tag: string }>();
  const { isAuthenticated } = useAuth();

  const validTag = (["lesson", "seeking-support", "offering-support"] as ValidTag[]).includes(tag as ValidTag)
    ? (tag as ValidTag)
    : null;

  const { data: posts, isLoading } = trpc.forum.getTaggedPosts.useQuery(
    { tag: validTag! },
    { enabled: !!validTag }
  );

  if (!isAuthenticated) {
    window.location.href = "/community";
    return null;
  }

  if (!validTag) {
    return (
      <div className="min-h-screen bg-[#f8f5f0] flex items-center justify-center">
        <p className="text-[#1a472a]/80">Unknown tag.</p>
      </div>
    );
  }

  const meta = TAG_META[validTag];

  if (isLoading) {
    return <TaoSpinner fullPage size={72} />;
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#f8f5f0]">
        <BackButton />

        {/* Header */}
        <section className="pt-24 pb-6 md:pt-28 md:pb-8 bg-gradient-to-b from-[#1a472a] to-[#2d5a3d]">
          <div className="container px-4 max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-4" style={{ fontFamily: "var(--font-body)" }}>
              <Link href="/community" className="hover:text-white/80 transition-colors">Forum</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white/80">{meta.label}</span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: meta.bg, color: meta.color }}
              >
                {meta.icon}
              </div>
              <h1
                className="text-2xl md:text-3xl font-bold text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {meta.label}
              </h1>
            </div>
            <p className="text-white/70 text-sm" style={{ fontFamily: "var(--font-body)" }}>
              {meta.description}
            </p>
          </div>
        </section>

        {/* Post list */}
        <section className="container px-4 max-w-4xl mx-auto py-6">
          {!posts || posts.length === 0 ? (
            <div className="text-center py-16">
              <MessageCircle className="w-16 h-16 text-[#4a7c59]/20 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-[#1a472a] mb-2" style={{ fontFamily: "var(--font-display)" }}>
                No posts yet
              </h2>
              <p className="text-[#1a472a]/80 text-sm mb-4" style={{ fontFamily: "var(--font-body)" }}>
                Be the first to tag a post with {meta.label}.
              </p>
              <Link href="/community/new">
                <span className="inline-block bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-bold rounded-full px-5 py-2 text-sm cursor-pointer" style={{ fontFamily: "var(--font-display)" }}>
                  Start a Thread
                </span>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {posts.map((post, index) => {
                let parsedTags: string[] = [];
                try { parsedTags = post.tags ? JSON.parse(post.tags) : []; } catch { /* ignore */ }
                return (
                  <AnimatedSection key={post.id} delay={index * 0.03}>
                    <Link href={`/community/post/${post.id}`}>
                      <div className="bg-white rounded-xl overflow-hidden border border-[#e8e4de] hover:border-[#7dd87d]/40 hover:shadow-sm transition-all duration-200 cursor-pointer group">
                        {post.generatedImageUrl && (
                          <div className="w-full h-32 overflow-hidden">
                            <img src={post.generatedImageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" width={800} height={128} loading="lazy" />
                          </div>
                        )}
                        <div className="flex items-start gap-3 p-4">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4a7c59] to-[#7dd87d] flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                            {getInitials(post.authorName || "A")}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              {post.isPinned === 1 && <Pin className="w-3 h-3 text-[#d4a574] flex-shrink-0" />}
                              <h3
                                className="font-semibold text-[#1a472a] text-sm md:text-base group-hover:text-[#4a7c59] transition-colors truncate"
                                style={{ fontFamily: "var(--font-display)" }}
                              >
                                {post.title}
                              </h3>
                            </div>
                            {parsedTags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-1">
                                {parsedTags.map(t => <PostTagBadge key={t} tag={t} />)}
                              </div>
                            )}
                            <p className="text-[#1a472a]/80 text-xs line-clamp-1 mb-1.5" style={{ fontFamily: "var(--font-body)" }}>
                              {post.content.replace(/[#*_~`]/g, "").slice(0, 120)}
                            </p>
                            <div className="flex items-center gap-3 text-[#1a472a]/80 text-xs" style={{ fontFamily: "var(--font-body)" }}>
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
                  </AnimatedSection>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </PageTransition>
  );
}
