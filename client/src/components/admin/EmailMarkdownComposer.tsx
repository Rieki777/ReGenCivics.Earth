/**
 * Markdown email body editor: toolbar, write/preview tabs, forest-on-white fields.
 * Preview uses the same converter as send, including letter layout chrome.
 * Body Write tab uses the shared DictationButton (same mic as Harvest / Broadcast /
 * Write-with-me) so Outbound Write and Applications letters can dictate at the caret.
 *
 * Features popover lists every capability (formatting, Button/CTA, Image,
 * callouts, layouts, merge tokens, Write-with-me prompt tip) so applicants and
 * newsletter composers can discover what announcement layout actually renders.
 */

import { useRef, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  applyMarkdownLinePrefix,
  applyMarkdownWrap,
  insertMarkdownBlock,
  safeImageSrc,
} from "@shared/emailMarkdown";
import { markdownLetterDocument } from "@shared/letterHtml";
import { NEWSLETTER_POSTAL_ADDRESS, type LetterLayout } from "@shared/letterLayout";
import {
  Bold,
  CircleHelp,
  CornerDownRight,
  Heading2,
  ImagePlus,
  Italic,
  Link,
  List,
  ListOrdered,
  MessageSquareWarning,
  Minus,
  Quote,
  RectangleHorizontal,
} from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SmartImagePicker } from "@/components/SmartImagePicker";
import { DictationButton } from "@/components/admin/dictation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const EMAIL_FIELD_CLASS =
  "bg-white dark:bg-white text-[#1a472a] dark:text-[#1a472a] placeholder:text-[#1a472a]/55 dark:placeholder:text-[#1a472a]/55 border-[#4a7c59]/30";

const TOOLBAR_BTN =
  "inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-md border border-[#4a7c59]/30 text-[#1a472a] bg-white hover:bg-[#f0f7f0] text-xs pointer-coarse:min-h-11 pointer-coarse:min-w-11";

interface Props {
  subject: string;
  body: string;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  layout?: LetterLayout;
  onLayoutChange?: (layout: LetterLayout) => void;
  subjectId?: string;
  bodyId?: string;
  showSubject?: boolean;
  showLayout?: boolean;
  minHeightClass?: string;
  variant?: "application" | "newsletter";
  unsubscribeUrl?: string;
}

type FeatureItem = { name: string; help: string; note?: string };

const FEATURE_CATALOG: FeatureItem[] = [
  { name: "Bold / italic", help: "Toolbar wraps selection as **bold** or *italic*." },
  {
    name: "Headings",
    help: "Toolbar ## inserts an H2. Type # or ### yourself for H1 / H3 (same forest heading styles in HTML).",
  },
  {
    name: "Lists",
    help: "Bullets (-), nested (indented -), and numbered (1.). Nesting works in HTML email and PDF.",
  },
  {
    name: "Link",
    help: "Toolbar inserts [text](url) in-sentence. Keep it inline for plain text links.",
  },
  {
    name: "Inline code",
    help: "Wrap with backticks: `like this`. Renders as monospace in HTML email.",
  },
  {
    name: "Quote",
    help: "Toolbar prefixes > . In announcement/one-pager HTML, quotes become callout boxes; in plain they stay blockquotes.",
  },
  {
    name: "Callout (Important)",
    help: 'Callout button inserts > Important: your note here. Lines starting with Important: (or **Important:**) also become callouts in announcement/one-pager.',
  },
  { name: "Horizontal rule", help: "Inserts --- on its own line for a divider in HTML and PDF." },
  {
    name: "Button (CTA)",
    help: "Button dialog inserts a standalone [Label](url) on its own line. Same effect as a bare URL or markdown link alone on a line.",
    note: "Announcement/one-pager HTML → forest button. Plain → ordinary text link. Available on applicant and newsletter composers.",
  },
  {
    name: "Image",
    help: "Inserts ![alt](https://assets.regencivics.earth/…). Allowed hosts: regencivics.earth, www, assets.",
    note: "Toolbar: newsletter only. HTML email can show safe images; PDF download ignores images (jsPDF skips them). Do not rely on images in one-pager PDFs.",
  },
  {
    name: "Letter layouts",
    help: "Plain: simpler letter body; send path may add the generic branded wrap (no announcement logo chrome). Announcement: forest header with logo + footer; standalone links→buttons; quotes/Important→callouts. One-pager: same announcement chrome with tighter width/padding — still paginates in PDF if content is long.",
  },
  {
    name: "Merge tokens",
    help: "Use {{name}}, {{email}}, and {{projectName}} — left in the draft and substituted per recipient on send (and stay visible in PDF samples).",
  },
  {
    name: "Write-with-me",
    help: 'Ask by feature name, e.g. "use announcement layout, add a Schedule CTA on its own line, and an Important callout about the deadline." Starter chips cover common asks.',
  },
];

function ToolbarTip({
  label,
  tip,
  children,
}: {
  label: string;
  tip: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{children}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-left">
        <p className="font-medium">{label}</p>
        <p className="opacity-90">{tip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function EmailMarkdownComposer({
  subject,
  body,
  onSubjectChange,
  onBodyChange,
  layout = "plain",
  onLayoutChange,
  subjectId = "email-subject",
  bodyId = "email-body",
  showSubject = true,
  showLayout = true,
  minHeightClass = "min-h-[180px]",
  variant = "application",
  unsubscribeUrl,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState("write");
  const [ctaOpen, setCtaOpen] = useState(false);
  const [ctaLabel, setCtaLabel] = useState("Read more");
  const [ctaHref, setCtaHref] = useState("https://regencivics.earth/");
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [featuresOpen, setFeaturesOpen] = useState(false);

  const applyWrap = (before: string, after: string, placeholder: string) => {
    const el = textareaRef.current;
    if (!el) {
      onBodyChange(before + placeholder + after);
      return;
    }
    const result = applyMarkdownWrap(
      el.value,
      el.selectionStart,
      el.selectionEnd,
      before,
      after,
      placeholder,
    );
    onBodyChange(result.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  const applyPrefix = (prefix: string) => {
    const el = textareaRef.current;
    if (!el) {
      onBodyChange(prefix + body);
      return;
    }
    const result = applyMarkdownLinePrefix(el.value, el.selectionStart, prefix);
    onBodyChange(result.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  const insertLink = () => {
    const href = window.prompt("Link URL", "https://");
    if (!href) return;
    applyWrap("[", `](${href.trim()})`, "link text");
  };

  const insertBlock = (block: string) => {
    const el = textareaRef.current;
    if (!el) {
      onBodyChange(body ? `${body}\n\n${block}` : block);
      return;
    }
    const result = insertMarkdownBlock(el.value, el.selectionStart, block);
    onBodyChange(result.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  const insertCallout = () => {
    insertBlock("> Important: your note here");
  };

  const confirmCta = () => {
    const href = ctaHref.trim();
    const label = ctaLabel.trim() || "Read more";
    if (!href) return;
    insertBlock(`[${label}](${href})`);
    setCtaOpen(false);
  };

  const confirmImage = () => {
    const src = safeImageSrc(imageUrl.trim());
    if (!src) return;
    const alt = imageAlt.trim() || "Image";
    insertBlock(`![${alt}](${src})`);
    setImageOpen(false);
    setImageUrl("");
    setImageAlt("");
  };

  const previewHtml = markdownLetterDocument(
    body || "_Nothing to preview yet._",
    layout,
    variant === "newsletter"
      ? { unsubscribeUrl: unsubscribeUrl || "https://regencivics.earth/email-preferences", postalAddress: NEWSLETTER_POSTAL_ADDRESS }
      : undefined,
  );

  return (
    <div className="space-y-3 apply-form-dark">
      {showSubject && (
        <div className="space-y-1">
          <Label htmlFor={subjectId} className="text-[#1a472a]">Subject</Label>
          <Input
            id={subjectId}
            data-testid={subjectId}
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            className={EMAIL_FIELD_CLASS}
          />
        </div>
      )}

      {showLayout && onLayoutChange && (
        <div className="space-y-1">
          <Label htmlFor={`${bodyId}-layout`} className="text-[#1a472a]">Letter layout</Label>
          <Select value={layout} onValueChange={(v) => onLayoutChange(v as LetterLayout)}>
            <SelectTrigger id={`${bodyId}-layout`} data-testid={`${bodyId}-layout`} className={EMAIL_FIELD_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="plain">Plain letter</SelectItem>
              <SelectItem value="announcement">Announcement (header, buttons, callouts)</SelectItem>
              <SelectItem value="one_pager">One-pager (PDF page)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-[#1a472a]/70">
            {layout === "plain"
              ? "Text links stay in the sentence. The send path adds the usual forest header."
              : layout === "announcement"
                ? "A forest header, logo, and footer. A link on its own line becomes a button. Quotes become callouts."
                : "Same announcement chrome with tighter margins; PDF can still paginate if the letter is long."}
          </p>
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor={bodyId} className="text-[#1a472a]">Body</Label>
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList className="bg-[#f0f7f0] text-[#1a472a]">
              <TabsTrigger value="write" className="text-[#1a472a] data-[state=active]:bg-white">
                Write
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-[#1a472a] data-[state=active]:bg-white">
                Preview
              </TabsTrigger>
            </TabsList>
            {tab === "write" && (
              <div className="flex flex-wrap items-center gap-2">
                <DictationButton
                  value={body}
                  onChange={onBodyChange}
                  targetRef={textareaRef}
                  label="Dictate body"
                  errorAlign="end"
                />
                <div className="flex flex-wrap gap-1" role="toolbar" aria-label="Markdown formatting">
                  <ToolbarTip label="Bold" tip="Wrap selection as **bold**.">
                    <button type="button" className={TOOLBAR_BTN} title="Bold — **text**" onClick={() => applyWrap("**", "**", "bold")} aria-label="Bold">
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                  </ToolbarTip>
                  <ToolbarTip label="Italic" tip="Wrap selection as *italic*.">
                    <button type="button" className={TOOLBAR_BTN} title="Italic — *text*" onClick={() => applyWrap("*", "*", "italic")} aria-label="Italic">
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                  </ToolbarTip>
                  <ToolbarTip label="Heading" tip="Prefix the line with ## .">
                    <button type="button" className={TOOLBAR_BTN} title="Heading — ## title" onClick={() => applyPrefix("## ")} aria-label="Heading">
                      <Heading2 className="w-3.5 h-3.5" />
                    </button>
                  </ToolbarTip>
                  <ToolbarTip label="Bullet list" tip="Prefix the line with - .">
                    <button type="button" className={TOOLBAR_BTN} title="Bullet list — - item" onClick={() => applyPrefix("- ")} aria-label="Bullet list">
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </ToolbarTip>
                  <ToolbarTip label="Nested bullet" tip="Indented - for a nested list item.">
                    <button type="button" className={TOOLBAR_BTN} title="Nested bullet — indented - item" onClick={() => applyPrefix("  - ")} aria-label="Nested bullet">
                      <CornerDownRight className="w-3.5 h-3.5" />
                    </button>
                  </ToolbarTip>
                  <ToolbarTip label="Numbered list" tip="Prefix the line with 1. .">
                    <button type="button" className={TOOLBAR_BTN} title="Numbered list — 1. item" onClick={() => applyPrefix("1. ")} aria-label="Numbered list">
                      <ListOrdered className="w-3.5 h-3.5" />
                    </button>
                  </ToolbarTip>
                  <ToolbarTip label="Link" tip="Insert [text](url). Alone on a line in announcement → button.">
                    <button type="button" className={TOOLBAR_BTN} title="Link — [text](url); alone on a line becomes a button in announcement" onClick={insertLink} aria-label="Link">
                      <Link className="w-3.5 h-3.5" />
                    </button>
                  </ToolbarTip>
                  <ToolbarTip label="Quote" tip="Prefix with > . Announcement turns quotes into callouts.">
                    <button type="button" className={TOOLBAR_BTN} title="Quote — > text (callout in announcement)" onClick={() => applyPrefix("> ")} aria-label="Quote">
                      <Quote className="w-3.5 h-3.5" />
                    </button>
                  </ToolbarTip>
                  <ToolbarTip label="Horizontal rule" tip="Insert --- as a divider.">
                    <button type="button" className={TOOLBAR_BTN} title="Horizontal rule — ---" onClick={() => insertBlock("---")} aria-label="Horizontal rule">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  </ToolbarTip>
                  <ToolbarTip label="Callout" tip='Inserts > Important: … — styled as a callout in announcement/one-pager.'>
                    <button
                      type="button"
                      className={TOOLBAR_BTN}
                      title="Callout — > Important: your note here"
                      onClick={insertCallout}
                      aria-label="Insert callout"
                      data-testid="composer-insert-callout"
                    >
                      <MessageSquareWarning className="w-3.5 h-3.5" />
                      <span className="ml-1 hidden sm:inline">Callout</span>
                    </button>
                  </ToolbarTip>
                  <ToolbarTip label="Button (CTA)" tip="Insert a standalone link that announcement/one-pager render as a forest button.">
                    <button
                      type="button"
                      className={TOOLBAR_BTN}
                      title="Insert button — standalone [Label](url) becomes a CTA in announcement"
                      onClick={() => setCtaOpen(true)}
                      aria-label="Insert button"
                      data-testid="composer-insert-button"
                    >
                      <RectangleHorizontal className="w-3.5 h-3.5" />
                      <span className="ml-1 hidden sm:inline">Button</span>
                    </button>
                  </ToolbarTip>
                  {variant === "newsletter" && (
                    <ToolbarTip label="Image" tip="Insert ![alt](https://assets.regencivics.earth/…). Newsletter toolbar only.">
                      <button
                        type="button"
                        className={TOOLBAR_BTN}
                        title="Insert image — assets.regencivics.earth hosts only"
                        onClick={() => setImageOpen(true)}
                        aria-label="Insert image"
                        data-testid="composer-insert-image"
                      >
                        <ImagePlus className="w-3.5 h-3.5" />
                        <span className="ml-1 hidden sm:inline">Image</span>
                      </button>
                    </ToolbarTip>
                  )}
                  <Popover open={featuresOpen} onOpenChange={setFeaturesOpen}>
                    <ToolbarTip label="Features" tip="See every formatting, CTA, layout, and Write-with-me tip.">
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={TOOLBAR_BTN}
                          title="All composer features"
                          aria-label="Composer features"
                          aria-expanded={featuresOpen}
                          data-testid="composer-features"
                        >
                          <CircleHelp className="w-3.5 h-3.5" />
                          <span className="ml-1 hidden sm:inline">Features</span>
                        </button>
                      </PopoverTrigger>
                    </ToolbarTip>
                    <PopoverContent
                      align="end"
                      className="w-[min(100vw-2rem,22rem)] max-h-[min(70vh,28rem)] overflow-y-auto bg-white text-[#1a472a] border-[#4a7c59]/30 p-3"
                      data-testid="composer-features-popover"
                    >
                      <p className="text-sm font-semibold mb-2">What you can add</p>
                      <ul className="space-y-2.5 text-xs">
                        {FEATURE_CATALOG.map((item) => (
                          <li key={item.name} className="border-b border-[#4a7c59]/15 pb-2 last:border-0 last:pb-0">
                            <p className="font-medium text-[#1a472a]">{item.name}</p>
                            <p className="text-[#1a472a]/80 mt-0.5">{item.help}</p>
                            {item.note ? <p className="text-[#1a472a]/60 mt-0.5 italic">{item.note}</p> : null}
                          </li>
                        ))}
                      </ul>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>
          <TabsContent value="write" className="mt-2">
            <Textarea
              ref={textareaRef}
              id={bodyId}
              data-testid={bodyId}
              value={body}
              onChange={(e) => onBodyChange(e.target.value)}
              className={`${EMAIL_FIELD_CLASS} ${minHeightClass} text-sm font-mono`}
              placeholder="Write markdown. Use {{name}}, {{email}}, and {{projectName}}."
            />
            <p className="text-xs text-[#1a472a]/70 mt-1">
              {variant === "newsletter"
                ? "Markdown: **bold**, *italic*, lists, [links](https://), ## headings, ![images](https://assets.regencivics.earth/...). Insert Button puts a CTA on its own line. Preview includes the email preferences footer. Open Features for the full catalog."
                : "Markdown: **bold**, *italic*, lists, [links](https://), ## headings. Button inserts a CTA; a link on its own line becomes a button in announcement layout. Tokens stay as {{name}}. Open Features for the full catalog."}
            </p>
          </TabsContent>
          <TabsContent value="preview" className="mt-2">
            <p className="text-sm font-semibold text-[#1a472a] mb-2 break-words">{subject || "(no subject)"}</p>
            <iframe
              title="Email preview"
              sandbox=""
              referrerPolicy="no-referrer"
              srcDoc={previewHtml}
              className="w-full min-h-[280px] bg-white rounded-md border border-[#4a7c59]/20"
            />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={ctaOpen} onOpenChange={setCtaOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#1a472a]">Insert a button</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="cta-label" className="text-[#1a472a]">Label</Label>
              <Input id="cta-label" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} className={EMAIL_FIELD_CLASS} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cta-href" className="text-[#1a472a]">URL</Label>
              <Input id="cta-href" value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} className={EMAIL_FIELD_CLASS} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCtaOpen(false)}>Cancel</Button>
            <Button type="button" className="bg-[#4a7c59] hover:bg-[#3d6849] text-white" onClick={confirmCta}>
              Insert button
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent className="bg-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#1a472a]">Insert an image</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <SmartImagePicker
              value={imageUrl}
              onChange={setImageUrl}
              label="Image"
              theme="light"
              context="blog"
            />
            <p className="text-xs text-[#1a472a]/70">
              Hosts stay on assets.regencivics.earth. Other URLs will not render in the sent letter.
            </p>
            <div className="space-y-1">
              <Label htmlFor="image-alt" className="text-[#1a472a]">Alt text</Label>
              <Input id="image-alt" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} className={EMAIL_FIELD_CLASS} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImageOpen(false)}>Cancel</Button>
            <Button
              type="button"
              className="bg-[#4a7c59] hover:bg-[#3d6849] text-white"
              disabled={!safeImageSrc(imageUrl.trim())}
              onClick={confirmImage}
            >
              Insert image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
