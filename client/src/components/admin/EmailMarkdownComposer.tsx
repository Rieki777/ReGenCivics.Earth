/**
 * Markdown email body editor: toolbar, write/preview tabs, forest-on-white fields.
 * Preview uses the same markdownEmailDocument converter as send.
 */

import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  applyMarkdownLinePrefix,
  applyMarkdownWrap,
  markdownEmailDocument,
} from "@shared/emailMarkdown";
import { Bold, Heading2, Italic, Link, List, ListOrdered, Quote } from "lucide-react";

export const EMAIL_FIELD_CLASS =
  "bg-white dark:bg-white text-[#1a472a] dark:text-[#1a472a] placeholder:text-[#1a472a]/55 dark:placeholder:text-[#1a472a]/55 border-[#4a7c59]/30";

const TOOLBAR_BTN =
  "inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-md border border-[#4a7c59]/30 text-[#1a472a] bg-white hover:bg-[#f0f7f0] text-xs pointer-coarse:min-h-11 pointer-coarse:min-w-11";

interface Props {
  subject: string;
  body: string;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  subjectId?: string;
  bodyId?: string;
  showSubject?: boolean;
  minHeightClass?: string;
}

export function EmailMarkdownComposer({
  subject,
  body,
  onSubjectChange,
  onBodyChange,
  subjectId = "email-subject",
  bodyId = "email-body",
  showSubject = true,
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

  const previewHtml = markdownEmailDocument(body || "_Nothing to preview yet._");

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
              Markdown: **bold**, *italic*, lists, [links](https://), ## headings. Tokens stay as {"{{name}}"}.
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
