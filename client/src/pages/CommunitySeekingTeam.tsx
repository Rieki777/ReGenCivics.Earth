/**
 * Community Forum - Seeking Team feed
 * All posts with postType "seeking_team" across the forum.
 */
import { Link } from "wouter";
import { MessageCircle, Clock, Eye, ChevronRight, Users } from "lucide-react";
import { TaoSpinner } from "@/components/TaoSpinner";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { AnimatedSection } from "@/components/AnimatedSection";
import { PageTransition } from "@/components/PageTransition";

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
  return `${Math.floor(days / 30)}mo ago`;
}

export default function CommunitySeekingTeam() {
  const { isAuthenticated } = useAuth();
  const { data: posts, isLoading } = trpc.forum.postsByType.useQuery({ postType: "seeking_team", limit: 50 });

  if (!isAuthenticated) {
    window.location.href = "/community";
    return null;
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#f8f5f0]">
        <BackButton />

        <section className="pt-24 pb-8 bg-gradient-to-b from-[#1a472a] to-[#2d5a3d]">
          <div className="container px-4 max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-3">
              <Link href="/community" className="hover:text-white/80 transition-colors">Forum</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white/80">Seeking Team</span>
            </div>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  Seeking Team
                </h1>
                <p className="text-white/60 text-sm" style={{ fontFamily: "var(--font-body)" }}>
                  Projects looking for collaborators, contributors, and builders.
                </p>
              </div>
              {isAuthenticated && (
                <Link href="/community/new">
                  <Button className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-bold rounded-full text-sm flex-shrink-0">
                    <Users className="w-4 h-4 mr-2" />
                    Post a Seeking Team
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </section>

        <section className="container px-4 max-w-4xl mx-auto py-6">
          {isLoading ? (
            <TaoSpinner fullPage size={48} />
          ) : !posts || posts.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-[#4a7c59]/30 mx-auto mb-3" />
              <p className="text-[#1a472a]/60 mb-4" style={{ fontFamily: "var(--font-body)" }}>
                No team posts yet. Are you building something and looking for collaborators?
              </p>
              {isAuthenticated ? (
                <Link href="/community/new">
                  <Button className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-bold rounded-full">
                    Post in Seeking Team
                  </Button>
                </Link>
              ) : (
                <Button onClick={() => window.location.href = getLoginUrl()} className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-bold rounded-full">
                  Sign in to post
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post, i) => (
                <AnimatedSection key={post.id} delay={i * 0.04}>
                  <Link href={`/community/post/${post.id}`}>
                    <div className="bg-white rounded-xl border border-[#e8e4de] hover:border-[#7dd87d]/40 hover:shadow-md transition-all p-4 md:p-5 cursor-pointer group">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#ede9fe] text-[#5b21b6]">
                              Seeking Team
                            </span>
                            <Badge variant="secondary" className="bg-[#f0f7f0] text-[#4a7c59] border-0 text-[10px] px-1.5">
                              {post.categoryName}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-[#1a472a] text-sm group-hover:text-[#4a7c59] transition-colors" style={{ fontFamily: "var(--font-display)" }}>
                            {post.title}
                          </h3>
                          <div className="flex items-center gap-3 mt-1.5 text-[#1a472a]/40 text-xs">
                            <span>{post.authorName}</span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              {timeAgo(post.createdAt)}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Eye className="w-3 h-3" />
                              {post.viewCount ?? 0}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <MessageCircle className="w-3 h-3" />
                              {post.replyCount ?? 0}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#4a7c59]/30 group-hover:text-[#7dd87d] group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
                      </div>
                    </div>
                  </Link>
                </AnimatedSection>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageTransition>
  );
}
