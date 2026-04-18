/**
 * BlogPost Page
 * Design: Individual blog post view with full content and video support
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useLocation } from 'wouter';
import { Calendar, Clock, ArrowLeft, User, Rocket, Compass, Play, Share2, List, ChevronDown, ChevronUp, Pencil, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedSection } from '@/components/AnimatedSection';
import { SEO } from '@/components/SEO';
import { JsonLD, schemas } from '@/components/JsonLD';
import { getBlogPost, blogPosts } from '@/data/blogPosts';
import { FoodProductionInfographic } from '@/components/FoodProductionInfographic';
import { AnimalPopulationInfographic } from '@/components/AnimalPopulationInfographic';
import { BackButton } from "@/components/BackButton";
import { renderInlineMarkdown } from "@/components/BlogInlineMarkdown";
import { RelatedContent, relatedContentMap } from "@/components/RelatedContent";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BlurImage } from "@/components/BlurImage";

export default function BlogPost() {
  const params = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const post = getBlogPost(params.slug || '');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');

  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin';

  const { data: override, refetch: refetchOverride } = trpc.blog.getOverride.useQuery(
    { slug: params.slug || '' },
    { enabled: !!params.slug, staleTime: 5 * 60 * 1000 }
  );
  const saveOverride = trpc.blog.saveOverride.useMutation({
    onSuccess: () => {
      toast.success('Post saved.');
      setEditMode(false);
      refetchOverride();
    },
    onError: (e) => toast.error(e.message || 'Failed to save'),
  });

  // The displayed content: override from DB takes precedence over static
  const activeContent = override?.content ?? post?.content ?? '';
  
  // Extract headers for table of contents
  const tableOfContents = useMemo(() => {
    if (!post) return [];
    const headers: { level: number; text: string; id: string }[] = [];
    const paragraphs = activeContent.split('\n\n');
    
    paragraphs.forEach((paragraph) => {
      if (paragraph.startsWith('## ')) {
        const text = paragraph.replace('## ', '');
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        headers.push({ level: 2, text, id });
      } else if (paragraph.startsWith('### ')) {
        const text = paragraph.replace('### ', '');
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        headers.push({ level: 3, text, id });
      }
    });
    
    return headers;
  }, [post, activeContent]);

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const progress = (scrollTop / (documentHeight - windowHeight)) * 100;
      setScrollProgress(Math.min(100, Math.max(0, progress)));
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a472a] via-[#2d5a3d] to-[#1a472a] flex items-center justify-center">
      <BackButton />
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Post Not Found</h1>
          <p className="text-white/60 mb-8">The blog post you are looking for does not exist.</p>
          <Link href="/blog">
            <Button className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const relatedPosts = blogPosts.filter(p => p.id !== post.id).slice(0, 2);
  const pageTitle = post.title + " | ReGen Civics Blog";
  const pageUrl = "https://regencivics.earth/blog/" + post.slug;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a472a] via-[#2d5a3d] to-[#1a472a]">
      <SEO
        title={pageTitle}
        description={post.excerpt || post.content?.substring(0, 155)}
        url={pageUrl}
        image={post.image}
        type="article"
        author={post.author}
        publishedTime={post.date}
      />
      <JsonLD data={schemas.blogPosting({
        title: post.title,
        excerpt: post.excerpt || post.content?.substring(0, 155) || '',
        author: post.author,
        date: post.date,
        image: post.image,
        url: pageUrl,
        tags: post.tags,
      })} />
      <JsonLD data={schemas.breadcrumb([
        { name: "Home", url: "https://regencivics.earth" },
        { name: "Blog", url: "https://regencivics.earth/blog" },
        { name: post.title, url: pageUrl },
      ])} />
      
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-[#1a472a]/50">
        <div 
          className="h-full bg-gradient-to-r from-[#7dd87d] to-[#4a7c59] transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>
      
      {/* Table of Contents - Collapsible */}
      {tableOfContents.length > 0 && (
        <div className="fixed right-4 top-24 z-40 max-w-xs hidden lg:block">
          <div className="bg-[#1a472a]/90 backdrop-blur-sm rounded-lg border border-[#7dd87d]/30 overflow-hidden">
            <button
              onClick={() => setTocOpen(!tocOpen)}
              className="w-full flex items-center justify-between px-4 py-3 text-white hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-2 font-semibold text-sm">
                <List className="w-4 h-4 text-[#7dd87d]" />
                Table of Contents
              </span>
              {tocOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {tocOpen && (
              <div>
                <nav className="px-4 py-3 max-h-[50vh] overflow-y-auto border-b border-white/10">
                  {tableOfContents.map((header) => (
                    <a
                      key={header.id}
                      href={`#${header.id}`}
                      className={`block py-2 text-sm text-white/70 hover:text-[#7dd87d] transition-colors ${
                        header.level === 3 ? 'pl-4' : ''
                      }`}
                      onClick={() => {
                        const element = document.getElementById(header.id);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                    >
                      {header.text}
                    </a>
                  ))}
                </nav>
                {/* Social Share Buttons */}
                <div className="px-4 py-3">
                  <p className="text-xs text-white/60 mb-2 font-semibold">Share this post:</p>
                  <div className="flex gap-2">
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(pageUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1da1f2]/20 hover:bg-[#1da1f2]/30 text-[#1da1f2] rounded-lg border border-[#1da1f2]/30 hover:border-[#1da1f2]/50 transition-all duration-200 text-xs font-medium"
                      title="Share on Twitter"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      Twitter
                    </a>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0a66c2]/20 hover:bg-[#0a66c2]/30 text-[#0a66c2] rounded-lg border border-[#0a66c2]/30 hover:border-[#0a66c2]/50 transition-all duration-200 text-xs font-medium"
                      title="Share on LinkedIn"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      LinkedIn
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Hero Section */}
      <section className="relative min-h-[50vh] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          <BlurImage
            src={post.image}
            alt={post.title}
            className="w-full h-full"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            placeholderColor="#1a472a"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a472a] via-[#1a472a]/60 to-transparent" />
        </div>
        
        <div className="relative z-10 container mx-auto px-4 pb-12">
          <AnimatedSection animation="slide-up">
            <button 
              onClick={() => setLocation('/blog')}
              className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Blog
            </button>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {post.isVideo && (
                <span className="bg-red-500/90 text-white text-sm font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 fill-current" />
                  VIDEO
                </span>
              )}
              {post.tags.map(tag => (
                <span key={tag} className="bg-[#7dd87d]/20 backdrop-blur-sm text-[#7dd87d] text-sm font-medium px-3 py-1 rounded-full border border-[#7dd87d]/30">
                  {tag}
                </span>
              ))}
            </div>
            
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 max-w-4xl" style={{ fontFamily: 'var(--font-display)' }}>
              {post.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-6 text-white/60">
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {post.date}
              </span>
              <span className="flex items-center gap-2">
                {post.isVideo ? <Play className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                {post.readTime}
              </span>
              <span className="flex items-center gap-2">
                <User className="w-5 h-5" />
                By {post.author}
              </span>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Video Embed Section (if video post) */}
      {post.isVideo && post.videoUrl && (
        <section className="py-8 px-4">
          <div className="container mx-auto max-w-4xl">
            <AnimatedSection animation="fade-in">
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border-4 border-[#7dd87d]/30">
                <iframe
                  src={post.videoUrl}
                  title={post.title}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <div className="mt-4 text-center">
                <span className="inline-flex items-center gap-2 text-white/60 text-sm">
                  <Play className="w-4 h-4" />
                  Duration: {post.videoDuration}
                </span>
              </div>
            </AnimatedSection>
          </div>
        </section>
      )}

      {/* Content */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          {/* Admin edit controls */}
          {isSuperAdmin && !editMode && (
            <div className="flex items-center justify-between mb-6 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <span className="text-amber-400 text-xs font-semibold flex items-center gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> Admin
              </span>
              <Button
                size="sm"
                className="gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40"
                onClick={() => { setEditContent(activeContent); setEditMode(true); }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Post
              </Button>
            </div>
          )}
          {isSuperAdmin && editMode && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <p className="text-amber-400 text-xs font-semibold mb-3 flex items-center gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> Editing post (markdown supported)
              </p>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-[60vh] bg-black/40 text-white/90 border border-white/20 rounded-xl p-4 text-sm font-mono resize-y focus:outline-none focus:border-[#7dd87d]/50"
                placeholder="Post content (markdown)..."
              />
              <div className="flex gap-2 mt-3 justify-end">
                <Button size="sm" variant="ghost" className="text-white/60 hover:text-white" onClick={() => setEditMode(false)}>
                  <X className="w-3.5 h-3.5 mr-1" /> Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-[#7dd87d] text-[#0d2818] hover:bg-[#9de89d] font-semibold"
                  onClick={() => saveOverride.mutate({ slug: params.slug || '', content: editContent })}
                  disabled={saveOverride.isPending}
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {saveOverride.isPending ? 'Saving…' : 'Save Post'}
                </Button>
              </div>
            </div>
          )}
          <AnimatedSection animation="fade-in">
            <article className="prose prose-lg prose-invert max-w-none">
              <div
                className="drop-cap text-white/80 leading-relaxed space-y-6"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {(() => {
                  const SPECIAL_MARKERS: Record<string, React.ReactElement> = {
                    '[FOOD_PRODUCTION_INFOGRAPHIC]': <FoodProductionInfographic />,
                    '[ANIMAL_POPULATION_INFOGRAPHIC]': <AnimalPopulationInfographic />,
                    '[CLAIM_SEEDS_BUTTON]': (
                      <div className="flex justify-center my-6">
                        <a
                          href="/claim-seeds"
                          className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all font-bold text-lg shadow-[0_0_24px_rgba(245,158,11,0.4)] hover:shadow-[0_0_36px_rgba(245,158,11,0.6)]"
                        >
                          Claim Your SEEDS Financial Contributions
                        </a>
                      </div>
                    ),
                  };

                  const hasMarkers = Object.keys(SPECIAL_MARKERS).some(
                    marker => activeContent.includes(marker)
                  );

                  const mdComponents = {
                    ol: ({children}: {children?: React.ReactNode}) => <ol className="list-decimal ml-6 mb-4 space-y-1">{children}</ol>,
                    ul: ({children}: {children?: React.ReactNode}) => <ul className="list-disc ml-6 mb-4 space-y-1">{children}</ul>,
                    li: ({children}: {children?: React.ReactNode}) => <li className="ml-2">{children}</li>,
                    h1: ({children}: {children?: React.ReactNode}) => <h1 className="text-3xl font-bold mb-4 mt-6">{children}</h1>,
                    h2: ({children}: {children?: React.ReactNode}) => <h2 className="text-2xl font-bold mb-3 mt-5 scroll-mt-24">{children}</h2>,
                    h3: ({children}: {children?: React.ReactNode}) => <h3 className="text-xl font-semibold mb-2 mt-4 scroll-mt-24">{children}</h3>,
                    p: ({children}: {children?: React.ReactNode}) => <p className="mb-4 leading-relaxed">{children}</p>,
                    a: ({href, children}: {href?: string; children?: React.ReactNode}) => <a href={href} className="text-green-400 hover:text-green-300 underline">{children}</a>,
                    blockquote: ({children}: {children?: React.ReactNode}) => <blockquote className="border-l-4 border-green-500 pl-4 italic my-4 text-white/70">{children}</blockquote>,
                    strong: ({children}: {children?: React.ReactNode}) => <strong className="font-semibold">{children}</strong>,
                    em: ({children}: {children?: React.ReactNode}) => <em className="italic">{children}</em>,
                    code: ({children}: {children?: React.ReactNode}) => <code className="bg-white/10 px-1 rounded text-sm font-mono">{children}</code>,
                    pre: ({children}: {children?: React.ReactNode}) => <pre className="bg-white/10 p-4 rounded-lg overflow-x-auto my-4">{children}</pre>,
                  };

                  if (!hasMarkers) {
                    // No special markers: render entire content as one block (preserves list numbering)
                    return (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                        {activeContent}
                      </ReactMarkdown>
                    );
                  }

                  // Has special markers: accumulate consecutive non-marker paragraphs into
                  // a single markdown chunk so that multi-item numbered lists stay in one
                  // <ol> and increment correctly.
                  const paragraphs = activeContent.split('\n\n');
                  const segments: Array<{ type: 'markdown'; text: string } | { type: 'component'; key: string }> = [];

                  for (const para of paragraphs) {
                    const trimmed = para.trim();
                    if (SPECIAL_MARKERS[trimmed] !== undefined) {
                      segments.push({ type: 'component', key: trimmed });
                    } else {
                      const last = segments[segments.length - 1];
                      if (last && last.type === 'markdown') {
                        last.text += '\n\n' + para;
                      } else {
                        segments.push({ type: 'markdown', text: para });
                      }
                    }
                  }

                  return (
                    <>
                      {segments.map((seg, i) => {
                        if (seg.type === 'component') {
                          return <React.Fragment key={i}>{SPECIAL_MARKERS[seg.key]}</React.Fragment>;
                        }
                        return (
                          <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} components={mdComponents}>
                            {seg.text}
                          </ReactMarkdown>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </article>
          </AnimatedSection>

          {/* Social Share Buttons */}
          <AnimatedSection animation="fade-in">
            <div className="mt-12 pt-8 border-t border-white/10">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2 text-white/60">
                  <Share2 className="w-5 h-5" />
                  <span className="font-medium">Share this post:</span>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(pageUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-[#1da1f2]/20 hover:bg-[#1da1f2]/30 text-[#1da1f2] rounded-lg border border-[#1da1f2]/30 hover:border-[#1da1f2]/50 transition-all duration-200 font-medium text-sm"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    Twitter
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-[#0a66c2]/20 hover:bg-[#0a66c2]/30 text-[#0a66c2] rounded-lg border border-[#0a66c2]/30 hover:border-[#0a66c2]/50 transition-all duration-200 font-medium text-sm"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    LinkedIn
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-[#1877f2]/20 hover:bg-[#1877f2]/30 text-[#1877f2] rounded-lg border border-[#1877f2]/30 hover:border-[#1877f2]/50 transition-all duration-200 font-medium text-sm"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </a>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <AnimatedSection animation="slide-up">
            <div className="bg-gradient-to-r from-[#7dd87d]/20 to-[#4a7c59]/20 backdrop-blur-sm rounded-2xl p-8 border border-[#7dd87d]/30">
              <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                Ready to Join the <span className="text-[#7dd87d]">Game</span>?
              </h2>
              <p className="text-white/70 mb-6">
                Start your regenerative journey today.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/quest">
                  <Button className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-semibold">
                    <Rocket className="w-4 h-4 mr-2" />
                    Start Your Quest
                  </Button>
                </Link>
                <Link href="/schedule">
                  <Button variant="outline" className="border-[#7dd87d]/50 text-[#7dd87d] hover:bg-[#7dd87d]/10">
                    <Compass className="w-4 h-4 mr-2" />
                    Join Open Session
                  </Button>
                </Link>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-3xl">
            <AnimatedSection animation="slide-up">
              <h2 className="text-xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
                Related <span className="text-[#7dd87d]">Posts</span>
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                {relatedPosts.map(relatedPost => (
                  <Link key={relatedPost.id} href={"/blog/" + relatedPost.slug}>
                    <div className="group bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden border border-[#7dd87d]/20 hover:border-[#7dd87d]/40 transition-all duration-300 cursor-pointer">
                      <div className="aspect-[16/9] overflow-hidden relative">
                        <BlurImage
                          src={relatedPost.image}
                          alt={relatedPost.title}
                          className="absolute inset-0 group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        {relatedPost.isVideo && (
                          <div className="absolute top-3 left-3">
                            <span className="bg-red-500/90 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                              <Play className="w-3 h-3 fill-current" />
                              VIDEO
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#7dd87d] transition-colors line-clamp-2">
                          {relatedPost.title}
                        </h3>
                        <p className="text-white/60 text-sm line-clamp-2">{relatedPost.excerpt}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </section>
      )}

      {/* Related Content */}
      <RelatedContent pages={relatedContentMap.blog.pages} />

      {/* Back to Blog */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <Link href="/blog">
            <Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
