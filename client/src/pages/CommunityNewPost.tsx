/**
 * Community Forum - New Post Creation
 * Form to create a new discussion thread with category selection
 */
import { Link, useLocation, useSearch } from "wouter";
import { 
  ArrowLeft, Send, Loader2, MessageCircle, ChevronRight,
  Sprout, Coins, Handshake, Scale, BookOpen, UserPlus, Lightbulb,
  Eye, EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BackButton } from "@/components/BackButton";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useState, useEffect, useMemo, useRef } from "react";
import { ForumMarkdown, MarkdownHints } from "@/components/ForumMarkdown";
import { MarkdownToolbar, useMarkdownShortcuts } from "@/components/MarkdownToolbar";
import { PageTransition } from "@/components/PageTransition";
import { FileUploadInput } from "@/components/FileUploadInput";
import { toast } from "sonner";

export default function CommunityNewPost() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const preselectedCategory = searchParams.get('category');

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState<string>(preselectedCategory || "");
  const [showPreview, setShowPreview] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const handleMarkdownShortcuts = useMarkdownShortcuts(contentRef, content, setContent);

  const { data: categories, isLoading: catsLoading } = trpc.forum.categories.useQuery();

  const createPostMutation = trpc.forum.createPost.useMutation({
    onSuccess: (data) => {
      toast.success("Thread created!");
      navigate(`/community/post/${data.id}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create thread");
    },
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [authLoading, isAuthenticated]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !categoryId) {
      toast.error("Please fill in all fields");
      return;
    }
    // TODO: Add attachment support to forum posts schema
    createPostMutation.mutate({
      categoryId: parseInt(categoryId),
      title: title.trim(),
      content: content.trim(),
    });
    // Attachments: uploadedFiles will be displayed in the post
  };

  const isValid = title.trim().length >= 3 && content.trim().length >= 10 && categoryId;
  
  // Format attachments display in content
  const contentWithAttachments = uploadedFiles.length > 0 
    ? content + '\n\n**Attachments:**\n' + uploadedFiles.map(f => `- [${f.name}](${f.url})`).join('\n')
    : content;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f8f5f0]">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-[#4a7c59] animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-[#f8f5f0]">
      <BackButton />

      {/* Header */}
      <section className="pt-24 pb-4 md:pt-28 md:pb-6 bg-gradient-to-b from-[#1a472a] to-[#2d5a3f]">
        <div className="container px-4 max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-white/50 text-sm mb-3" style={{ fontFamily: 'var(--font-body)' }}>
            <Link href="/community" className="hover:text-white/80 transition-colors">Forum</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/80">New Thread</span>
          </div>

          <h1 
            className="text-2xl md:text-3xl font-bold text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Start a Discussion
          </h1>
          <p className="text-white/60 text-sm mt-1" style={{ fontFamily: 'var(--font-body)' }}>
            Share your ideas, questions, or experiences with the community
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="container px-4 max-w-3xl mx-auto py-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Category Selection */}
          <div className="bg-white rounded-xl border border-[#e8e4de] p-4 md:p-5">
            <Label className="text-[#1a472a] font-bold text-sm mb-2 block" style={{ fontFamily: 'var(--font-display)' }}>
              Topic
            </Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="border-[#e8e4de] focus:border-[#7dd87d] focus:ring-[#7dd87d]/20 text-[#1a472a]">
                <SelectValue placeholder="Choose a topic for your thread" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {catsLoading ? (
                  <SelectItem value="loading" disabled>Loading topics...</SelectItem>
                ) : categories?.map(cat => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    <span className="flex items-center gap-2">
                      <span 
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: cat.color || '#4a7c59' }}
                      />
                      {cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="bg-white rounded-xl border border-[#e8e4de] p-4 md:p-5">
            <Label className="text-[#1a472a] font-bold text-sm mb-2 block" style={{ fontFamily: 'var(--font-display)' }}>
              Title
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your thread a clear, descriptive title"
              maxLength={300}
              className="border-[#e8e4de] focus:border-[#7dd87d] focus:ring-[#7dd87d]/20 text-[#1a472a]"
              style={{ fontFamily: 'var(--font-body)' }}
            />
            <p className="text-[10px] text-[#1a472a]/30 mt-1 text-right">{title.length}/300</p>
          </div>

          {/* File Upload */}
          <div className="bg-white rounded-xl border border-[#e8e4de] p-4 md:p-5">
            <Label className="text-[#1a472a] font-bold text-sm mb-2 block" style={{ fontFamily: 'var(--font-display)' }}>
              Attachments (Optional)
            </Label>
            <FileUploadInput
              onFilesUpload={setUploadedFiles}
              maxFiles={5}
              maxSize={10 * 1024 * 1024}
            />
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl border border-[#e8e4de] p-4 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-[#1a472a] font-bold text-sm" style={{ fontFamily: 'var(--font-display)' }}>
                Content
              </Label>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-[#4a7c59] text-xs flex items-center gap-1 hover:text-[#7dd87d] transition-colors"
              >
                {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showPreview ? 'Edit' : 'Preview'}
              </button>
            </div>
            
            {showPreview ? (
              <div className="min-h-[200px] p-3 bg-[#f8f5f0] rounded-lg text-[#1a472a]/80 text-sm leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                {content ? (
                  <ForumMarkdown content={content} />
                ) : (
                  <p className="text-[#1a472a]/30 italic">Nothing to preview yet...</p>
                )}
              </div>
            ) : (
              <>
                <MarkdownToolbar textareaRef={contentRef} value={content} onChange={setContent} />
                <Textarea
                  ref={contentRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleMarkdownShortcuts}
                  placeholder="Write your post here... Use the toolbar above or keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+K)"
                  className="min-h-[200px] border-[#e8e4de] focus:border-[#7dd87d] focus:ring-[#7dd87d]/20 text-[#1a472a] resize-y rounded-t-none border-t-0"
                  style={{ fontFamily: 'var(--font-body)' }}
                  maxLength={10000}
                />
              </>
            )}
            <div className="flex items-center justify-between mt-1">
              <MarkdownHints />
              <p className="text-[10px] text-[#1a472a]/30">{content.length}/10,000</p>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 justify-end">
            <Link href="/community">
              <Button type="button" variant="outline" className="border-[#e8e4de] text-[#1a472a]/60 rounded-full">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={!isValid || createPostMutation.isPending}
              className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] font-bold rounded-full px-6"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {createPostMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Send className="w-4 h-4 mr-1.5" />
              )}
              Post Thread
            </Button>
          </div>
        </form>
      </section>
    </div>
    </PageTransition>
  );
}
