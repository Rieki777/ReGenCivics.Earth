/**
 * Outbound Write: newsletter composer, audience, preview confirm, send.
 */
import { useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { EmailMarkdownComposer } from "@/components/admin/EmailMarkdownComposer";
import { EmailDraftAgent } from "@/components/admin/EmailDraftAgent";
import { EmailSaveTemplateBar } from "@/components/admin/EmailSaveTemplateBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  NEWSLETTER_SOURCES,
  newsletterSourceLabel,
  type NewsletterSource,
} from "@/lib/outboundAudience";
import {
  isLetterLayout,
  isNewsletterEmailTemplateRow,
  type LetterLayout,
} from "@shared/letterLayout";

const NEWSLETTER_BUILTINS = [{ id: "nl_blank", label: "Blank letter" }];

export function AdminOutboundWrite() {
  const [issueId, setIssueId] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [layout, setLayout] = useState<LetterLayout>("announcement");
  const [templateKey, setTemplateKey] = useState("nl_blank");
  const [source, setSource] = useState<NewsletterSource | "all">("all");
  const [preview, setPreview] = useState<{
    subject: string;
    recipientCount: number;
    confirmToken: string;
    html: string;
  } | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [result, setResult] = useState<string | null>(null);

  const savedQuery = trpc.email.getCustomTemplates.useQuery();
  const saveDraft = trpc.outbound.saveDraft.useMutation();
  const sendPreview = trpc.outbound.sendPreview.useMutation();
  const confirmSend = trpc.outbound.confirmSend.useMutation();
  const listActive = trpc.newsletter.listActive.useQuery();

  const savedLetters = useMemo(
    () => (savedQuery.data ?? []).filter((row) => isNewsletterEmailTemplateRow(row)),
    [savedQuery.data],
  );

  const audienceCount = useMemo(() => {
    const rows = listActive.data ?? [];
    if (source === "all") return rows.length;
    return rows.filter((row) => (row.source || "other") === source).length;
  }, [listActive.data, source]);

  const audience = {
    sources: source === "all" ? [] : [source],
    activeOnly: true as const,
  };

  const audienceLabel = source === "all"
    ? "active subscribers"
    : `active ${newsletterSourceLabel(source)} subscribers`;

  const loadTemplate = (key: string) => {
    setTemplateKey(key);
    const saved = savedLetters.find((row) => row.templateKey === key);
    if (saved?.customBody) {
      setSubject(saved.customSubject || "");
      setBody(saved.customBody);
      setLayout(isLetterLayout(saved.layout) ? saved.layout : "announcement");
    }
  };

  const persistDraft = async () => {
    const saved = await saveDraft.mutateAsync({
      issueId: issueId ?? undefined,
      subject,
      body,
      layout,
      templateKey: templateKey === "nl_blank" ? null : templateKey,
      audience,
    });
    setIssueId(saved.id);
    return saved.id;
  };

  const handlePreview = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Write a subject and body first.");
      return;
    }
    try {
      const id = await persistDraft();
      const p = await sendPreview.mutateAsync({ issueId: id });
      setPreview({
        subject: p.subject,
        recipientCount: p.recipientCount,
        confirmToken: p.confirmToken,
        html: p.html,
      });
      setResult(null);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Preview failed.");
    }
  };

  const handleConfirm = async () => {
    if (!issueId || !preview) return;
    try {
      const r = await confirmSend.mutateAsync({
        issueId,
        confirmToken: preview.confirmToken,
        idempotencyKey,
      });
      const message = r.duplicate
        ? "Already sent (double-click caught, nothing re-sent)."
        : `Sent to ${r.recipientCount} subscriber${r.recipientCount === 1 ? "" : "s"}${r.failedCount ? `, ${r.failedCount} failed` : ""}.`;
      setResult(message);
      toast.success(message);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Send refused.");
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card className="bg-white border-2 border-[#1a472a]/10">
        <CardHeader>
          <CardTitle className="text-[#1a472a]" style={{ fontFamily: "var(--font-display)" }}>
            Write a letter
          </CardTitle>
          <CardDescription>
            Full markdown, CTA buttons, images from assets.regencivics.earth, and a preview with the unsubscribe footer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1">
              <Label className="text-[#1a472a] text-xs">Audience</Label>
              <Select value={source} onValueChange={(v) => { setSource(v as NewsletterSource | "all"); setPreview(null); }}>
                <SelectTrigger className="bg-white min-w-[12rem] border-[#1a472a]/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All active subscribers</SelectItem>
                  {NEWSLETTER_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>{newsletterSourceLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[#1a472a] text-xs">Saved letter</Label>
              <Select value={templateKey} onValueChange={loadTemplate}>
                <SelectTrigger className="bg-white min-w-[12rem] border-[#1a472a]/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NEWSLETTER_BUILTINS.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                  {savedLetters.map((row) => (
                    <SelectItem key={row.templateKey} value={row.templateKey}>
                      {row.label || row.templateKey}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="self-end text-sm text-[#1a472a]/80 pb-2">
              {audienceCount} active subscriber{audienceCount === 1 ? "" : "s"}
            </p>
          </div>

          <EmailMarkdownComposer
            subject={subject}
            body={body}
            layout={layout}
            onSubjectChange={(v) => { setSubject(v); setPreview(null); }}
            onBodyChange={(v) => { setBody(v); setPreview(null); }}
            onLayoutChange={(v) => { setLayout(v); setPreview(null); }}
            variant="newsletter"
            minHeightClass="min-h-[240px]"
          />

          <EmailSaveTemplateBar
            subject={subject}
            body={body}
            layout={layout}
            builtinTemplates={NEWSLETTER_BUILTINS}
            currentKey={templateKey}
            onSaved={(key) => setTemplateKey(key)}
            kind="newsletter"
          />

          {result ? (
            <p className="text-sm text-[#1a472a] font-medium">{result}</p>
          ) : !preview ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                className="bg-[#1a472a] hover:bg-[#2d5a3d] text-white"
                disabled={sendPreview.isPending || saveDraft.isPending}
                onClick={() => void handlePreview()}
              >
                {(sendPreview.isPending || saveDraft.isPending) ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Preview send to {audienceCount}
              </Button>
              {(sendPreview.isError || saveDraft.isError) && (
                <p className="text-sm text-red-700">
                  {sendPreview.error?.message || saveDraft.error?.message}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 space-y-2">
              <p className="text-sm text-amber-900">
                <span className="font-semibold">Subject:</span> {preview.subject}
              </p>
              <p className="text-sm text-amber-900">
                This sends to <span className="font-semibold">{preview.recipientCount} subscriber{preview.recipientCount === 1 ? "" : "s"}</span> and cannot be unsent. Confirm is bound to this exact text and audience.
              </p>
              <iframe
                title="Send preview"
                sandbox=""
                referrerPolicy="no-referrer"
                srcDoc={preview.html}
                className="w-full min-h-[220px] bg-white rounded-md border border-amber-200"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  className="bg-[#1a472a] hover:bg-[#2d5a3d] text-white"
                  disabled={confirmSend.isPending}
                  onClick={() => void handleConfirm()}
                >
                  {confirmSend.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Confirm send to {preview.recipientCount}
                </Button>
                <Button type="button" variant="ghost" className="text-[#2d5a3d]" onClick={() => setPreview(null)}>
                  Cancel
                </Button>
              </div>
              {confirmSend.isError && (
                <p className="text-sm text-red-700">{confirmSend.error.message}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <EmailDraftAgent
        currentSubject={subject}
        currentBody={body}
        currentLayout={layout}
        statusLabel={audienceLabel}
        audienceLabel={audienceLabel}
        recipientCount={audienceCount}
        variant="newsletter"
        onApply={(draft) => {
          setSubject(draft.subject);
          setBody(draft.body);
          if (draft.layout) setLayout(draft.layout);
          setPreview(null);
        }}
      />
    </div>
  );
}
