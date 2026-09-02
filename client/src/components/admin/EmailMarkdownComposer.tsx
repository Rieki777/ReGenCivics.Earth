/**
 * Markdown email body editor: toolbar, write/preview tabs, forest-on-white fields.
 * Preview uses the same converter as send, including letter layout chrome.
 */

import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  applyMarkdownLinePrefix,
  applyMarkdownWrap,
} from "@shared/emailMarkdown";
import { markdownLetterDocument } from "@shared/letterHtml";
import type { LetterLayout } from "@shared/letterLayout";
import { Bold, CornerDownRight, Heading2, Italic, Link, List, ListOrdered, Quote } from "lucide-react";

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
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState("write");

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

  const previewHtml = markdownLetterDocument(body || "_Nothing to preview yet._", layout);

  return (
    <div className="space-y-3 apply-form-dark">
      {showSubject && (
        <div className="space-y-1">
          <Label htmlFor={subjectId} className="text-[#1a472a]">Subject</Label>
          <Input
            id={subjectId}
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
            <SelectTrigger id={`${bodyId}-layout`} className={EMAIL_FIELD_CLASS}>
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
                : "Same as announcement, tighter, meant for a one-page PDF."}
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
              <div className="flex flex-wrap gap-1" role="toolbar" aria-label="Markdown formatting">
                <button type="button" className={TOOLBAR_BTN} onClick={() => applyWrap("**", "**", "bold")} aria-label="Bold">
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button type="button" className={TOOLBAR_BTN} onClick={() => applyWrap("*", "*", "italic")} aria-label="Italic">
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button type="button" className={TOOLBAR_BTN} onClick={() => applyPrefix("## ")} aria-label="Heading">
                  <Heading2 className="w-3.5 h-3.5" />
                </button>
                <button type="button" className={TOOLBAR_BTN} onClick={() => applyPrefix("- ")} aria-label="Bullet list">
                  <List className="w-3.5 h-3.5" />
                </button>
                <button type="button" className={TOOLBAR_BTN} onClick={() => applyPrefix("  - ")} aria-label="Nested bullet">
                  <CornerDownRight className="w-3.5 h-3.5" />
                </button>
                <button type="button" className={TOOLBAR_BTN} onClick={() => applyPrefix("1. ")} aria-label="Numbered list">
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button type="button" className={TOOLBAR_BTN} onClick={insertLink} aria-label="Link">
                  <Link className="w-3.5 h-3.5" />
                </button>
                <button type="button" className={TOOLBAR_BTN} onClick={() => applyPrefix("> ")} aria-label="Quote">
                  <Quote className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          <TabsContent value="write" className="mt-2">
            <Textarea
              ref={textareaRef}
              id={bodyId}
              value={body}
              onChange={(e) => onBodyChange(e.target.value)}
              className={`${EMAIL_FIELD_CLASS} ${minHeightClass} text-sm font-mono`}
              placeholder="Write markdown. Use {{name}}, {{email}}, and {{projectName}}."
            />
            <p className="text-xs text-[#1a472a]/70 mt-1">
              Markdown: **bold**, *italic*, lists, [links](https://), ## headings. A link on its own line becomes a button in announcement layout. Tokens stay as {"{{name}}"}.
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
    </div>
  );
}
