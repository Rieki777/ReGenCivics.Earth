/**
 * Blog Page
 * Design: Stories and updates from the ReGen Civics journey
 * Features: How-To's section at top, community video suggestion voting
 */

import React, { useState } from 'react';
import { Link } from 'wouter';
import { Calendar, Clock, ArrowRight, BookOpen, Home as HomeIcon, Play, Video, ThumbsUp, Plus, ChevronDown, ChevronUp, Lightbulb, Send, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AnimatedSection } from '@/components/AnimatedSection';
import { SEO } from '@/components/SEO';
import { blogPosts, getFeaturedPost } from '@/data/blogPosts';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { BackButton } from "@/components/BackButton";

// How-To video categories
const howToCategories = [
  { id: 'how_to_play', label: 'How to Play the Game', icon: '🎮' },
  { id: 'how_to_participate', label: 'How to Participate', icon: '🤝' },
  { id: 'how_to_invest', label: 'How to Invest', icon: '💰' },
  { id: 'how_to_apply', label: 'How to Apply', icon: '📝' },
  { id: 'how_to_contribute', label: 'How to Contribute', icon: '🌱' },
  { id: 'other', label: 'Other Topics', icon: '💡' },
];

// Video Suggestion Card Component
function VideoSuggestionCard({ 
  suggestion, 
  onVote 
}: { 
  suggestion: any;
  onVote: (id: number) => void;
}) {
  const category = howToCategories.find(c => c.id === suggestion.category);
  
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-[#7dd87d]/20 hover:border-[#7dd87d]/40 transition-all">
      <BackButton />
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{category?.icon || '💡'}</span>
            <span className="text-xs text-[#7dd87d] bg-[#7dd87d]/20 px-2 py-0.5 rounded-full">
              {category?.label || 'Other'}
            </span>
          </div>
          <h4 className="text-white font-semibold mb-1">{suggestion.title}</h4>
          {suggestion.description && (
            <p className="text-white/60 text-sm line-clamp-2">{suggestion.description}</p>
          )}
          {suggestion.status === 'completed' && suggestion.completedBlogSlug && (
            <Link href={`/blog/${suggestion.completedBlogSlug}`}>
              <span className="inline-flex items-center gap-1 mt-2 text-[#7dd87d] text-sm hover:underline">
                <Play className="w-3 h-3" /> Watch Video
              </span>
            </Link>
          )}
        </div>
        <button
          onClick={() => onVote(suggestion.id)}
          className="flex flex-col items-center gap-1 px-3 py-2 bg-[#7dd87d]/20 hover:bg-[#7dd87d]/30 rounded-lg transition-colors"
        >
          <ThumbsUp className="w-5 h-5 text-[#7dd87d]" />
          <span className="text-white font-bold text-sm">{suggestion.voteCount}</span>
        </button>
      </div>
      {suggestion.status !== 'pending' && suggestion.status !== 'approved' && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            suggestion.status === 'in_production' ? 'bg-amber-500/20 text-amber-400' :
            suggestion.status === 'completed' ? 'bg-green-500/20 text-green-400' :
            'bg-gray-500/20 text-gray-400'
          }`}>
            {suggestion.status === 'in_production' ? '🎬 In Production' :
             suggestion.status === 'completed' ? '✅ Completed' :
             suggestion.status}
          </span>
        </div>
      )}
    </div>
  );
}

// Suggest Video Form Component
function SuggestVideoForm({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('other');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  
  const createMutation = trpc.videoSuggestions.create.useMutation({
    onSuccess: () => {
      toast.success('Suggestion submitted! Your vote has been counted.');
      setTitle('');
      setDescription('');
      setCategory('other');
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit suggestion');
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a title for your suggestion');
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      category: category as any,
      submitterEmail: email.trim() || undefined,
      submitterName: name.trim() || undefined,
    });
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-white/80 text-sm mb-1 block">What video would you like to see? *</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., How to submit a proposal to the DAO"
          className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
          required
        />
      </div>
      
      <div>
        <label className="text-white/80 text-sm mb-1 block">Category</label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="bg-white/10 border-white/20 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {howToCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.icon} {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <label className="text-white/80 text-sm mb-1 block">Additional details (optional)</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What specific questions should the video answer?"
          className="bg-white/10 border-white/20 text-white placeholder:text-white/60 min-h-[80px]"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white/80 text-sm mb-1 block">Your email (to track votes)</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
          />
        </div>
        <div>
          <label className="text-white/80 text-sm mb-1 block">Your name (optional)</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
          />
        </div>
      </div>
      
      <Button 
        type="submit" 
        className="w-full bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a]"
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? (
          <>Submitting...</>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            Submit Suggestion
          </>
        )}
      </Button>
    </form>
  );
}

export default function Blog() {
  const featuredPost = getFeaturedPost();
  const howToPosts = blogPosts.filter(post => post.tags.includes('How-To') || post.tags.includes('Tutorial') || post.tags.includes('Foundation'));
  const howToSlugs = new Set(howToPosts.map(p => p.slug));
  // Exclude featured post AND any posts already shown in How-To section
  const recentPosts = blogPosts.filter(post => !post.featured && !howToSlugs.has(post.slug));
  
  const [howToExpanded, setHowToExpanded] = useState(true);
  const [votingExpanded, setVotingExpanded] = useState(true);
  const [voteEmail, setVoteEmail] = useState('');
  const [showVoteDialog, setShowVoteDialog] = useState(false);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<number | null>(null);
  
  // Fetch video suggestions
  const { data: suggestions, refetch: refetchSuggestions } = trpc.videoSuggestions.list.useQuery();
  
  const voteMutation = trpc.videoSuggestions.vote.useMutation({
    onSuccess: () => {
      toast.success('Vote recorded! Thank you for your input.');
      refetchSuggestions();
      setShowVoteDialog(false);
      setVoteEmail('');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to vote');
    },
  });
  
  const handleVoteClick = (id: number) => {
    setSelectedSuggestionId(id);
    setShowVoteDialog(true);
  };
  
  const handleVoteSubmit = () => {
    if (!voteEmail.trim()) {
      toast.error('Please enter your email to vote');
      return;
    }
    if (selectedSuggestionId) {
      voteMutation.mutate({ id: selectedSuggestionId, email: voteEmail.trim() });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a472a] via-[#2d5a3d] to-[#1a472a]">
      <SEO 
        title="Blog: Stories & Updates | ReGen Civics"
        description="Stories, insights, and updates from our journey toward a regenerative civilization."
        url="https://regencivics.earth/blog"
        image="https://assets.regencivics.earth/pKiFMAPaeLLVmxyg.png"
      />
      
      {/* Hero Section */}
      <section className="relative min-h-[40vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://assets.regencivics.earth/HLqyyIzLDuYQyaHt.jpg" 
            alt="ReGen Civics Community" 
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a472a]/80 via-[#1a472a]/60 to-[#1a472a]" />
        </div>
        
        <div className="relative z-10 container mx-auto px-4 text-center">
          <AnimatedSection animation="slide-up">
            <div className="inline-flex items-center gap-2 bg-[#7dd87d]/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-[#7dd87d]/30">
              <BookOpen className="w-5 h-5 text-[#7dd87d]" />
              <span className="text-[#7dd87d] font-medium">Stories & Updates</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
              The <span className="text-[#7dd87d]">ReGen</span> Blog
            </h1>
            
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Stories, insights, and updates from our journey toward a regenerative civilization.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* How-To's Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <AnimatedSection animation="slide-up">
            <button 
              onClick={() => setHowToExpanded(!howToExpanded)}
              className="w-full flex items-center justify-between mb-6 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#7dd87d] rounded-full flex items-center justify-center">
                  <Video className="w-5 h-5 text-[#1a472a]" />
                </div>
                <div className="text-left">
                  <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                    How-To's & Foundations
                  </h2>
                  <p className="text-white/60 text-sm">Learn how to play the Game, participate in the alliance, and foundational knowledge for land projects</p>
                </div>
              </div>
              {howToExpanded ? (
                <ChevronUp className="w-6 h-6 text-[#7dd87d]" />
              ) : (
                <ChevronDown className="w-6 h-6 text-[#7dd87d]" />
              )}
            </button>
            
            {howToExpanded && (
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/20 mb-8">
                {howToPosts.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    {howToPosts.map(post => (
                      <Link key={post.id} href={"/blog/" + post.slug}>
                        <div className="group bg-white/5 rounded-xl overflow-hidden border border-[#7dd87d]/20 hover:border-[#7dd87d]/40 transition-all cursor-pointer">
                          <div className="aspect-video overflow-hidden relative">
                            <img 
                              src={post.image} 
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                            {post.isVideo && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <div className="w-12 h-12 bg-[#7dd87d] rounded-full flex items-center justify-center">
                                  <Play className="w-6 h-6 text-[#1a472a] fill-current ml-1" />
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="text-white font-semibold group-hover:text-[#7dd87d] transition-colors line-clamp-2">
                              {post.title}
                            </h3>
                            <p className="text-white/50 text-sm mt-1">{post.readTime}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Video className="w-12 h-12 text-white/30 mx-auto mb-3" />
                    <p className="text-white/60">How-To videos coming soon!</p>
                    <p className="text-white/40 text-sm mt-1">Vote below for the videos you want to see first</p>
                  </div>
                )}
                
                {/* Community Video Suggestions */}
                <div className="border-t border-white/10 pt-6">
                  <button 
                    onClick={() => setVotingExpanded(!votingExpanded)}
                    className="w-full flex items-center justify-between mb-4"
                  >
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-amber-400" />
                      <h3 className="text-lg font-semibold text-white">Community Video Suggestions</h3>
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                        Vote for what you want to learn!
                      </span>
                    </div>
                    {votingExpanded ? (
                      <ChevronUp className="w-5 h-5 text-white/60" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-white/60" />
                    )}
                  </button>
                  
                  {votingExpanded && (
                    <>
                      {suggestions && suggestions.length > 0 ? (
                        <div className="grid md:grid-cols-2 gap-3 mb-4">
                          {suggestions.slice(0, 6).map((suggestion) => (
                            <VideoSuggestionCard 
                              key={suggestion.id} 
                              suggestion={suggestion}
                              onVote={handleVoteClick}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-white/5 rounded-xl mb-4">
                          <p className="text-white/60">No suggestions yet. Be the first to suggest a video!</p>
                        </div>
                      )}
                      
                      {/* Suggest a Video Button */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30">
                            <Plus className="w-4 h-4 mr-2" />
                            Suggest a How-To Video
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-[#1a472a] border-[#7dd87d]/30 max-w-md">
                          <DialogHeader>
                            <DialogTitle className="text-white flex items-center gap-2">
                              <Lightbulb className="w-5 h-5 text-amber-400" />
                              Suggest a Video Topic
                            </DialogTitle>
                          </DialogHeader>
                          <SuggestVideoForm onSuccess={() => refetchSuggestions()} />
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                </div>
              </div>
            )}
          </AnimatedSection>
        </div>
      </section>

      {/* Vote Dialog */}
      <Dialog open={showVoteDialog} onOpenChange={setShowVoteDialog}>
        <DialogContent className="bg-[#1a472a] border-[#7dd87d]/30 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <ThumbsUp className="w-5 h-5 text-[#7dd87d]" />
              Vote for this suggestion
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-white/70 text-sm">
              Enter your email to vote. This helps us prevent duplicate votes.
            </p>
            <Input
              type="email"
              value={voteEmail}
              onChange={(e) => setVoteEmail(e.target.value)}
              placeholder="your@email.com"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
            />
            <Button 
              onClick={handleVoteSubmit}
              className="w-full bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a]"
              disabled={voteMutation.isPending}
            >
              {voteMutation.isPending ? 'Voting...' : 'Submit Vote'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Featured Post */}
      {featuredPost && (
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-5xl">
            <AnimatedSection animation="slide-up">
              <h2 className="text-sm font-bold text-[#7dd87d] uppercase tracking-wider mb-6">Featured</h2>
              
              <Link href={"/blog/" + featuredPost.slug}>
                <div className="group bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-[#7dd87d]/20 hover:border-[#7dd87d]/40 transition-all duration-300 cursor-pointer">
                  <div className="aspect-[21/9] overflow-hidden relative">
                    <img 
                      src={featuredPost.image} 
                      alt={featuredPost.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    {featuredPost.isVideo && (
                      <div className="absolute top-4 left-4">
                        <span className="bg-red-500/90 text-white text-sm font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                          <Play className="w-4 h-4 fill-current" />
                          VIDEO
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-8">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {featuredPost.tags.map(tag => (
                        <span key={tag} className="bg-[#7dd87d]/20 text-[#7dd87d] text-xs font-medium px-3 py-1 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 group-hover:text-[#7dd87d] transition-colors" style={{ fontFamily: 'var(--font-display)' }}>
                      {featuredPost.title}
                    </h3>
                    <p className="text-white/70 mb-6 line-clamp-2">{featuredPost.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-white/50 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {featuredPost.date}
                        </span>
                        <span className="flex items-center gap-1">
                          {featuredPost.isVideo ? <Play className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          {featuredPost.readTime}
                        </span>
                      </div>
                      <span className="text-[#7dd87d] font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                        {featuredPost.isVideo ? 'Watch' : 'Read'} <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </AnimatedSection>
          </div>
        </section>
      )}

      {/* Recent Posts */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <AnimatedSection animation="slide-up">
            <h2 className="text-sm font-bold text-[#7dd87d] uppercase tracking-wider mb-6">Recent Posts</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {recentPosts.map(post => (
                <Link key={post.id} href={"/blog/" + post.slug}>
                  <div className="group bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-[#7dd87d]/20 hover:border-[#7dd87d]/40 transition-all duration-300 cursor-pointer h-full">
                    <div className="aspect-[16/9] overflow-hidden relative">
                      <img 
                        src={post.image} 
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      {post.isVideo && (
                        <div className="absolute top-3 left-3">
                          <span className="bg-red-500/90 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                            <Play className="w-3 h-3 fill-current" />
                            VIDEO
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {post.tags.map(tag => (
                          <span key={tag} className="bg-[#7dd87d]/20 text-[#7dd87d] text-xs font-medium px-2 py-0.5 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#7dd87d] transition-colors line-clamp-2" style={{ fontFamily: 'var(--font-display)' }}>
                        {post.title}
                      </h3>
                      <p className="text-white/60 text-sm mb-4 line-clamp-2">{post.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-white/50 text-xs">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {post.date}
                          </span>
                          <span className="flex items-center gap-1">
                            {post.isVideo ? <Play className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {post.readTime}
                          </span>
                        </div>
                        <span className="text-[#7dd87d] text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                          {post.isVideo ? 'Watch' : 'Read'} <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <AnimatedSection animation="slide-up">
            <div className="bg-gradient-to-r from-[#7dd87d]/20 to-[#4a9f4a]/20 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-[#7dd87d]/30 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                Stay in the <span className="text-[#7dd87d]">Loop</span>
              </h2>
              <p className="text-white/70 mb-6">
                Get updates on new blog posts, Season 3 announcements, and community events.
              </p>
              <Link href="/socials">
                <Button className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] font-semibold px-8 py-3 rounded-xl">
                  Join Our Community
                </Button>
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Back to Home */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <Link href="/">
            <Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10">
              <HomeIcon className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
