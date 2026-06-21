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
import { BioregionSelect } from "@/components/BioregionSelect";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useState, useEffect, useMemo, useRef } from "react";
import { ForumMarkdown, MarkdownHints } from "@/components/ForumMarkdown";
import { MarkdownToolbar, useMarkdownShortcuts } from "@/components/MarkdownToolbar";
import { RichEditor } from "@/components/RichEditor";
import { PageTransition } from "@/components/PageTransition";
import { FileUploadInput } from "@/components/FileUploadInput";
import { LinkPreviewCard } from "@/components/LinkPreviewCard";
import { useLinkPreview } from "@/hooks/useLinkPreview";
import { toast } from "sonner";

type PostTag = "lesson" | "seeking-support" | "offering-support";
type PostType = "discussion" | "case_study" | "seeking_team";
type ThreadStage = "idea" | "experiment" | "result";

const SEEKING_TEAM_TEMPLATE = `Project name or working title:

What stage you are at (idea / prototype / active / scaling):

What you are building (2-3 sentences):

Roles you are looking for:

Skills or experience that would help:

Time commitment (hours/week, duration):

How to express interest (reply here / DM / email):`;

const CASE_STUDY_TEMPLATE = `What we tried:


What worked:


What did not work:


What we would do differently:


Resources and links:`;

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
  const [selectedTags, setSelectedTags] = useState<PostTag[]>([]);
  const [postType, setPostType] = useState<PostType>("discussion");
  const [isThreadChain, setIsThreadChain] = useState(false);
  const [threadStage, setThreadStage] = useState<ThreadStage>("idea");
  const [chainId, setChainId] = useState<string>("");
  const [bioregionId, setBioregionId] = useState<number | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const handleMarkdownShortcuts = useMarkdownShortcuts(contentRef, content, setContent);

  const { data: categories, isLoading: catsLoading } = trpc.forum.categories.useQuery();
  const { preview: linkPreview, isLoading: linkPreviewLoading, url: linkPreviewUrl } = useLinkPreview(content);

  const createPostMutation = trpc.forum.createPost.useMutation({
    onSuccess: (data) => {
      toast.success("Thread created!");
      navigate(`/community/post/${data.id}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create thread");
    },
  });

  function handlePostTypeChange(newType: PostType) {
    setPostType(newType);
    if (newType === "seeking_team" && content === "") {
      setContent(SEEKING_TEAM_TEMPLATE);
    } else if (newType === "case_study" && content === "") {
      setContent(CASE_STUDY_TEMPLATE);
    } else if (newType === "seeking_team" && (content === CASE_STUDY_TEMPLATE)) {
      setContent(SEEKING_TEAM_TEMPLATE);
    } else if (newType === "case_study" && (content === SEEKING_TEAM_TEMPLATE)) {
      setContent(CASE_STUDY_TEMPLATE);
    } else if (newType === "discussion" && (content === SEEKING_TEAM_TEMPLATE || content === CASE_STUDY_TEMPLATE)) {
      setContent("");
    }
  }

  function toggleTag(tag: PostTag) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }

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
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      postType: postType !== "discussion" ? postType : undefined,
      threadStage: isThreadChain ? threadStage : undefined,
      chainId: isThreadChain && chainId.trim() ? parseInt(chainId.trim()) : undefined,
      bioregionId: bioregionId ?? undefined,
    });
    // Attachments: uploadedFiles will be displayed in the post
  };

  const isValid = title.trim().length >= 3 && content.trim().length >= 10 && categoryId;

  // Per-topic placeholder + helper line. Matches against the selected
  // category name (case-insensitive substring) so this works for the
  // existing forum categories without needing a per-id mapping.
  const selectedCategoryName = categories?.find((c) => String(c.id) === categoryId)?.name ?? "";
  const topicGuidance = (() => {
    const n = selectedCategoryName.toLowerCase();
    if (n.includes("alliance")) {
      return {
        titlePlaceholder: "Name of your alliance organization",
        contentPlaceholder:
          "What your org offers the movement (tools, resources, services, products, assets) and what the movement can offer back (roles to fill, resources needed). Be specific about offers and asks.",
      };
    }
    if (n.includes("land project") || n.includes("earth")) {
      return {
        titlePlaceholder: "Name of your land project",
        contentPlaceholder:
          "Where it is, what stage it's at, the practices you're rooted in, and what you'd like from the movement (allies, capital, residents, advice). Be specific about offers and asks.",
      };
    }
    if (n.includes("water")) {
      return {
        titlePlaceholder: "A clear, descriptive title for your topic",
        contentPlaceholder:
          "Share the conversation you want to start about flow, finance, currencies, or capital. Be specific about what you're inviting people to respond to.",
      };
    }
    if (n.includes("fire")) {
      return {
        titlePlaceholder: "A clear, descriptive title for your topic",
        contentPlaceholder:
          "Share the practice, ritual, or transformation you want to talk about. Be specific about offers (skills you bring) and asks (what you'd like back).",
      };
    }
    if (n.includes("air")) {
      return {
        titlePlaceholder: "A clear, descriptive title for your topic",
        contentPlaceholder:
          "Share the agreement, governance pattern, or coordination question on your mind. Be specific about decisions you're inviting input on.",
      };
    }
    if (n.includes("seeking") || n.includes("team")) {
      return {
        titlePlaceholder: "Project name + the role(s) you're seeking",
        contentPlaceholder:
          "Project name, where it is, what stage, and the role(s) you need filled. Include the time commitment, what someone gets back, and how to reach you.",
      };
    }
    return {
      titlePlaceholder: "Give your thread a clear, descriptive title",
      contentPlaceholder: "Write your post here...",
    };
  })();
  
  // Format attachments display in content
  const contentWithAttachments = uploadedFiles.length > 0 
    ? content + '\n\n**Attachments:**\n' + uploadedFiles.map(f => `- [${f.name}](${f.url})`).join('\n')
    : content;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1f12] via-[#0d2818] to-[#122e1c]">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-[#7dd87d] animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-gradient-to-b from-[#0a1f12] via-[#0d2818] to-[#122e1c]">
      <BackButton />

      {/* Header */}
      <section className="pt-24 pb-4 md:pt-28 md:pb-6 bg-gradient-to-b from-[#1a472a] to-[#2d5a3d]">
        <div className="container px-4 max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-white/70 text-sm mb-3" style={{ fontFamily: 'var(--font-body)' }}>
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

          {/* Post Type */}
          <div className="bg-white rounded-xl border border-[#e8e4de] p-4 md:p-5">
            <Label className="text-[#1a472a] font-bold text-sm mb-2 block" style={{ fontFamily: 'var(--font-display)' }}>
              Post Type
            </Label>
            <div className="flex flex-wrap gap-2">
              {([
                { value: "discussion", label: "Discussion" },
                { value: "case_study", label: "Case Study" },
                { value: "seeking_team", label: "Seeking Team" },
              ] as { value: PostType; label: string }[]).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handlePostTypeChange(opt.value)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                    postType === opt.value
                      ? "bg-[#4a7c59] text-white border-[#4a7c59]"
                      : "bg-white text-[#4a7c59] border-[#4a7c59]/30 hover:border-[#4a7c59]"
                  }`}
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {postType === "seeking_team" && (
              <p className="text-xs text-[#1a472a]/80 mt-2" style={{ fontFamily: 'var(--font-body)' }}>
                A structured template will be pre-filled in the content field.
              </p>
            )}
            {postType === "case_study" && (
              <p className="text-xs text-[#1a472a]/80 mt-2" style={{ fontFamily: 'var(--font-body)' }}>
                A case study template will be pre-filled. The #lesson tag will be applied automatically.
              </p>
            )}
          </div>

          {/* Thread Chain (Discussion only) */}
          {postType === "discussion" && (
            <div className="bg-white rounded-xl border border-[#e8e4de] p-4 md:p-5">
              <Label className="text-[#1a472a] font-bold text-sm mb-2 block" style={{ fontFamily: 'var(--font-display)' }}>
                Thread Chain (Optional)
              </Label>
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={isThreadChain}
                  onChange={e => setIsThreadChain(e.target.checked)}
                  className="accent-[#4a7c59]"
                />
                <span className="text-[#1a472a]/70 text-sm" style={{ fontFamily: 'var(--font-body)' }}>
                  This is part of a thread chain (Idea to Experiment to Result)
                </span>
              </label>
              {isThreadChain && (
                <div className="space-y-3 pl-6">
                  <div>
                    <p className="text-[#1a472a]/80 text-xs mb-2" style={{ fontFamily: 'var(--font-body)' }}>Stage:</p>
                    <div className="flex flex-wrap gap-2">
                      {([
                        { value: "idea" as ThreadStage, label: "Idea", emoji: "Seed", color: "#1a472a", bg: "#f0f7f0" },
                        { value: "experiment" as ThreadStage, label: "Experiment", emoji: "Flask", color: "#1a472a", bg: "#f0f7f0" },
                        { value: "result" as ThreadStage, label: "Result", emoji: "Leaf", color: "#92400e", bg: "#f0ebe3" },
                      ]).map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setThreadStage(opt.value)}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
                          style={threadStage === opt.value
                            ? { backgroundColor: opt.bg, color: opt.color, borderColor: opt.color }
                            : { backgroundColor: "white", color: "#1a472a", borderColor: "#e8e4de" }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {threadStage !== "idea" && (
                    <div>
                      <label className="text-[#1a472a]/80 text-xs mb-1 block" style={{ fontFamily: 'var(--font-body)' }}>
                        Linking to chain (post ID of the original Idea, optional):
                      </label>
                      <Input
                        type="number"
                        value={chainId}
                        onChange={e => setChainId(e.target.value)}
                        placeholder="e.g. 42"
                        className="border-[#e8e4de] focus:border-[#7dd87d] text-[#1a472a] max-w-[120px]"
                        style={{ fontFamily: 'var(--font-body)' }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div className="bg-white rounded-xl border border-[#e8e4de] p-4 md:p-5">
            <Label className="text-[#1a472a] font-bold text-sm mb-2 block" style={{ fontFamily: 'var(--font-display)' }}>
              Title
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={topicGuidance.titlePlaceholder}
              maxLength={300}
              className="border-[#e8e4de] focus:border-[#7dd87d] focus:ring-[#7dd87d]/20 text-[#1a472a]"
              style={{ fontFamily: 'var(--font-body)' }}
            />
            <p className="text-[10px] text-[#1a472a]/75 mt-1 text-right">{title.length}/300</p>
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
                  <p className="text-[#1a472a]/75 italic">Nothing to preview yet...</p>
                )}
              </div>
            ) : (
              <RichEditor
                value={content}
                onChange={setContent}
                placeholder={topicGuidance.contentPlaceholder}
                className="min-h-[200px] text-[#1a472a]"
              />
            )}
            <div className="flex items-center justify-between mt-1">
              <MarkdownHints />
              <p className="text-[10px] text-[#1a472a]/75">{content.length}/10,000</p>
            </div>
            {linkPreviewUrl && (
              <LinkPreviewCard
                url={linkPreviewUrl}
                title={linkPreview?.title}
                description={linkPreview?.description}
                image={linkPreview?.image}
                siteName={linkPreview?.siteName}
                loading={linkPreviewLoading}
              />
            )}
          </div>

          {/* Tags */}
          <div className="bg-white rounded-xl border border-[#e8e4de] p-4 md:p-5">
            <Label className="text-[#1a472a] font-bold text-sm mb-2 block" style={{ fontFamily: 'var(--font-display)' }}>
              Tags (Optional)
            </Label>
            <div className="space-y-2">
              {([
                { tag: "lesson" as PostTag, label: "#lesson", description: "This post documents a real-world insight or learning", color: "#92400e", bg: "#f0ebe3" },
                { tag: "seeking-support" as PostTag, label: "#seeking-support", description: "I need help, feedback, or expertise", color: "#1a472a", bg: "#f0f7f0" },
                { tag: "offering-support" as PostTag, label: "#offering-support", description: "I have something to offer or want to help", color: "#1a472a", bg: "#f0f7f0" },
              ]).map(({ tag, label, description, color, bg }) => {
                const isChecked = selectedTags.includes(tag) || (tag === "lesson" && postType === "case_study");
                const isDisabled = tag === "lesson" && postType === "case_study";
                return (
                  <label
                    key={tag}
                    className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${isChecked ? "bg-[#f8f5f0]" : "hover:bg-[#f8f5f0]/50"} ${isDisabled ? "opacity-70" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isDisabled}
                      onChange={() => !isDisabled && toggleTag(tag)}
                      className="mt-0.5 accent-[#4a7c59]"
                    />
                    <span className="flex-1">
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-xs font-bold mr-2"
                        style={{ color, backgroundColor: bg }}
                      >
                        {label}
                      </span>
                      <span className="text-[#1a472a]/80 text-xs" style={{ fontFamily: 'var(--font-body)' }}>
                        {description}
                        {isDisabled && " (auto-applied for Case Study)"}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* C17: Bioregion tag (optional) */}
          <div className="bg-white rounded-xl border border-[#e8e4de] p-4 md:p-5">
            <Label className="text-[#1a472a] font-bold text-sm mb-1 block" style={{ fontFamily: 'var(--font-display)' }}>
              Bioregion Tag <span className="text-[#1a472a]/80 font-normal text-xs ml-1">(optional)</span>
            </Label>
            <p className="text-xs text-[#1a472a]/80 mb-3" style={{ fontFamily: 'var(--font-body)' }}>
              Tag this post to a bioregion so others in that area can find it.
            </p>
            <BioregionSelect
              value={bioregionId}
              onChange={setBioregionId}
              placeholder="Search bioregions..."
              variant="light"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 justify-end">
            <Link href="/community">
              <Button type="button" variant="outline" className="border-[#e8e4de] text-[#1a472a]/80 rounded-full">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={!isValid || createPostMutation.isPending}
              className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-bold rounded-full px-6"
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
