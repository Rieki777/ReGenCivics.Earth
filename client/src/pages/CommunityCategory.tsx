/**
 * Community Forum - Category Thread Listing
 * Shows all threads in a specific category with sorting and new post CTA
 */
import { Link, useLocation, useParams } from "wouter";
import {
  MessageCircle, ArrowLeft, Plus, Eye, Clock, Heart,
  ChevronRight, Pin, Lock, UserPlus
} from "lucide-react";
import { TaoSpinner } from "@/components/TaoSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/BackButton";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useState, useMemo } from "react";
import { AnimatedSection } from "@/components/AnimatedSection";
import { PageTransition } from "@/components/PageTransition";
import { motion } from "framer-motion";

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

export default function CommunityCategory() {
  const { slug } = useParams<{ slug: string }>();
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const { data: category, isLoading: catLoading } = trpc.forum.categoryBySlug.useQuery(
    { slug: slug || '' },
    { enabled: !!slug }
  );

  const { data: posts, isLoading: postsLoading } = trpc.forum.posts.useQuery(
    { categoryId: category?.id, limit: 50, offset: 0 },
    { enabled: !!category?.id }
  );

  const isLoading = catLoading || postsLoading;

  // Redirect non-authenticated users to the community gate page
  if (!isAuthenticated) {
    window.location.href = '/community';
    return null;
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
          <p className="text-[#1a472a]/60 mb-4" style={{ fontFamily: 'var(--font-body)' }}>
            This discussion topic doesn't exist.
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
      <section className="pt-24 pb-6 md:pt-28 md:pb-8 bg-gradient-to-b from-[#1a472a] to-[#2d5a3f]">
        <div className="container px-4 max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-white/50 text-sm mb-4" style={{ fontFamily: 'var(--font-body)' }}>
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
          </div>

          {/* New Thread Button */}
          <div className="mt-4">
            {isAuthenticated ? (
              <Button 
                onClick={() => navigate(`/community/new?category=${category.id}`)}
                className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] font-bold px-5 py-2 rounded-full text-sm"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                New Thread
              </Button>
            ) : (
              <Button 
                onClick={() => window.location.href = getLoginUrl()}
                className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] font-bold px-5 py-2 rounded-full text-sm"
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
            <p className="text-[#1a472a]/60 text-sm mb-4" style={{ fontFamily: 'var(--font-body)' }}>
              Be the first to start a conversation in {category.name}!
            </p>
            {isAuthenticated && (
              <Button 
                onClick={() => navigate(`/community/new?category=${category.id}`)}
                className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] font-bold rounded-full"
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
                <Link href={`/community/post/${post.id}`}>
                  <div className="bg-white rounded-xl p-4 border border-[#e8e4de] hover:border-[#7dd87d]/40 hover:shadow-sm transition-all duration-200 cursor-pointer group">
                    <div className="flex items-start gap-3">
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
                            <Lock className="w-3 h-3 text-[#1a472a]/40 flex-shrink-0" />
                          )}
                          <h3 
                            className="font-semibold text-[#1a472a] text-sm md:text-base group-hover:text-[#4a7c59] transition-colors truncate"
                            style={{ fontFamily: 'var(--font-display)' }}
                          >
                            {post.title}
                          </h3>
                        </div>
                        
                        {/* Preview of content */}
                        <p className="text-[#1a472a]/50 text-xs line-clamp-1 mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>
                          {post.content.replace(/[#*_~`]/g, '').slice(0, 120)}
                        </p>

                        {/* Meta info */}
                        <div className="flex items-center gap-3 text-[#1a472a]/40 text-xs" style={{ fontFamily: 'var(--font-body)' }}>
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
            ))}
          </div>
        )}
      </section>
    </div>
    </PageTransition>
  );
}
