/**
 * Outbound Write: newsletter composer, audience, preview confirm, send.
 */
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { EmailMarkdownComposer } from "@/components/admin/EmailMarkdownComposer";
import { EmailDraftAgent } from "@/components/admin/EmailDraftAgent";
import { EmailSaveTemplateBar } from "@/components/admin/EmailSaveTemplateBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  NEWSLETTER_SOURCES,
  audienceChoiceLabel,
  audienceChoiceValue,
  audienceFromChoice,
  listAudienceGroups,
  listChoiceCount,
  newsletterSourceLabel,
  parseAudienceChoiceValue,
  type AudienceChoice,
  type NewsletterSource,
  type OutboundAudienceList,
} from "@/lib/outboundAudience";
import {
  defaultScheduleLocal,
  formatPacificSchedule,
  pacificDatetimeLocalToUtc,
} from "@shared/outboundSchedule";
import {
  isLetterLayout,
  isNewsletterEmailTemplateRow,
  type LetterLayout,
} from "@shared/letterLayout";
import {
  OUTBOUND_WRITE_EMPTY_CONTENT_MESSAGE,
  OUTBOUND_WRITE_FILL_EVENT,
  clearOutboundWriteFill,
  consumeOutboundWriteFill,
  outboundWriteContentReady,
  type OutboundWriteFill,
} from "@shared/outboundWriteFill";

const NEWSLETTER_BUILTINS = [{ id: "nl_blank", label: "Blank letter" }];

export type OutboundWritePrefill = {
  subject: string;
  body: string;
  layout: LetterLayout;
  source: NewsletterSource | "all";
  /** An email list (campaign followers, all campaigns, a waitlist). Replaces `source` when set. */
  list?: OutboundAudienceList | null;
};

function choiceFromPrefill(prefill?: OutboundWritePrefill | null): AudienceChoice {
  if (prefill?.list) return { kind: "list", list: prefill.list };
  return { kind: "newsletter", source: prefill?.source ?? "all" };
}

export function AdminOutboundWrite({
  prefill,
}: {
  prefill?: OutboundWritePrefill | null;
} = {}) {
  const [issueId, setIssueId] = useState<number | null>(null);
  const [subject, setSubject] = useState(prefill?.subject ?? "");
  const [body, setBody] = useState(prefill?.body ?? "");
  /** Body from last Write-with-me Apply; used for voice_rules learning on save/send. */
  const [aiDraftBody, setAiDraftBody] = useState<string | null>(null);
  const [layout, setLayout] = useState<LetterLayout>(prefill?.layout ?? "announcement");
  const [templateKey, setTemplateKey] = useState("nl_blank");
  const [choice, setChoice] = useState<AudienceChoice>(() => choiceFromPrefill(prefill));
  const [preview, setPreview] = useState<{
    subject: string;
    recipientCount: number;
    confirmToken: string;
    html: string;
  } | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [result, setResult] = useState<string | null>(null);
  const [scheduleLocal, setScheduleLocal] = useState(() => defaultScheduleLocal());

  const savedQuery = trpc.email.getCustomTemplates.useQuery();
  const saveDraft = trpc.outbound.saveDraft.useMutation();
  const sendPreview = trpc.outbound.sendPreview.useMutation();
  const confirmSend = trpc.outbound.confirmSend.useMutation();
  const scheduleSend = trpc.outbound.scheduleSend.useMutation();
  const listActive = trpc.newsletter.listActive.useQuery();
  const listAudiences = trpc.outbound.listAudiences.useQuery();

  useEffect(() => {
    if (!prefill) return;
    setIssueId(null);
    setSubject(prefill.subject);
    setBody(prefill.body);
    setAiDraftBody(null);
    setLayout(prefill.layout);
    setChoice(choiceFromPrefill(prefill));
    setPreview(null);
    setResult(null);
  }, [prefill]);

  const savedLetters = useMemo(
    () => (savedQuery.data ?? []).filter((row) => isNewsletterEmailTemplateRow(row)),
    [savedQuery.data],
  );

  const audienceCount = useMemo(() => {
    const listCount = listChoiceCount(choice, listAudiences.data);
    if (listCount !== null) return listCount;
    const rows = listActive.data ?? [];
    if (choice.kind !== "newsletter" || choice.source === "all") return rows.length;
    return rows.filter((row) => (row.source || "other") === choice.source).length;
  }, [listActive.data, listAudiences.data, choice]);

  // A list audience replaces the newsletter sources (server/lib/outboundAudience.ts).
  const audience = audienceFromChoice(choice);

  const audienceLabel = audienceChoiceLabel(choice, listAudiences.data);
  const listGroups = useMemo(() => listAudienceGroups(listAudiences.data, choice), [listAudiences.data, choice]);
  const countNoun = choice.kind === "list" ? "person" : "active subscriber";
  const countNounPlural = choice.kind === "list" ? "people" : "active subscribers";

  const canPreview = useMemo(
    () => outboundWriteContentReady(subject, body),
    [subject, body],
  );

  const applyFill = (fill: OutboundWriteFill) => {
    if (!fill.subject?.trim() && !fill.body?.trim() && !fill.layout) return;
    if (fill.subject !== undefined) setSubject(fill.subject);
    if (fill.body !== undefined) setBody(fill.body);
    if (fill.layout) setLayout(fill.layout);
    setPreview(null);
    toast.success("Draft filled in Outbound Write. Review, then use Preview send.");
  };

  useEffect(() => {
    const pending = consumeOutboundWriteFill();
    if (pending) applyFill(pending);
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<OutboundWriteFill>).detail;
      if (!detail) return;
      clearOutboundWriteFill();
      applyFill(detail);
    };
    window.addEventListener(OUTBOUND_WRITE_FILL_EVENT, handler);
    return () => window.removeEventListener(OUTBOUND_WRITE_FILL_EVENT, handler);
    // Mount-only: pending fill + live assistant events.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      aiDraftBody: aiDraftBody ?? undefined,
    });
    setIssueId(saved.id);
    return saved.id;
  };

  const handlePreview = async () => {
    if (!canPreview) {
      toast.error(OUTBOUND_WRITE_EMPTY_CONTENT_MESSAGE);
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
        aiDraftBody: aiDraftBody ?? undefined,
      });
      const message = r.duplicate
        ? "Already sent (double-click caught, nothing re-sent)."
        : `Sent to ${r.recipientCount} ${r.recipientCount === 1 ? "person" : "people"}${r.failedCount ? `, ${r.failedCount} failed` : ""}.`;
      setResult(message);
      toast.success(message);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Send refused.");
    }
  };

  const handleSchedule = async () => {
    if (!issueId || !preview) return;
    try {
      const scheduledFor = pacificDatetimeLocalToUtc(scheduleLocal).toISOString();
      const r = await scheduleSend.mutateAsync({
        issueId,
        confirmToken: preview.confirmToken,
        idempotencyKey,
        scheduledFor,
        aiDraftBody: aiDraftBody ?? undefined,
      });
      const when = formatPacificSchedule(new Date(r.scheduledFor));
      const message = `Scheduled for ${when}. ${r.recipientCount} ${r.recipientCount === 1 ? "person" : "people"}. Open Sent to cancel or reschedule.`;
      setResult(message);
      toast.success(message);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Schedule refused.");
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
            Full markdown, CTA buttons, images from assets.regencivics.earth, and a preview with the email preferences footer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1">
              <Label className="text-[#1a472a] text-xs">Audience</Label>
              <Select
                value={audienceChoiceValue(choice)}
                onValueChange={(v) => {
                  const next = parseAudienceChoiceValue(v);
                  if (next) { setChoice(next); setPreview(null); }
                }}
              >
                <SelectTrigger className="bg-white min-w-[12rem] max-w-full border-[#1a472a]/20" aria-label="Audience">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Newsletter</SelectLabel>
                    <SelectItem value="nl:all">All active subscribers</SelectItem>
                    {NEWSLETTER_SOURCES.map((s) => (
                      <SelectItem key={s} value={`nl:${s}`}>{newsletterSourceLabel(s)}</SelectItem>
                    ))}
                  </SelectGroup>
                  {listGroups.map((g) => (
                    <SelectGroup key={g.label}>
                      <SelectLabel>{g.label}</SelectLabel>
                      {g.options.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}{o.count !== null ? ` (${o.count})` : ""}
                        </SelectItem>
                      ))}
                    </SelectGroup>
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
              {audienceCount} {audienceCount === 1 ? countNoun : countNounPlural}
            </p>
          </div>
          {choice.kind === "list" && (
            <p className="text-xs text-[#1a472a]/80">
              {audienceLabel}. Each letter carries that person's own "Stop these emails" link in place of the newsletter preferences footer.
            </p>
          )}

          <EmailMarkdownComposer
            subject={subject}
            body={body}
            layout={layout}
            onSubjectChange={(v) => { setSubject(v); setPreview(null); }}
            onBodyChange={(v) => { setBody(v); setPreview(null); }}
            onLayoutChange={(v) => { setLayout(v); setPreview(null); }}
            variant="newsletter"
            subjectId="outbound-write-subject"
            bodyId="outbound-write-body"
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
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  className="bg-[#1a472a] hover:bg-[#2d5a3d] text-white"
                  disabled={sendPreview.isPending || saveDraft.isPending || !canPreview}
                  onClick={() => void handlePreview()}
                  data-testid="outbound-write-preview-send"
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
              {!canPreview && (
                <p className="text-xs text-[#2d5a3d]" data-testid="outbound-write-preview-hint">
                  Add a subject and body to preview.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 space-y-2">
              <p className="text-sm text-amber-900">
                <span className="font-semibold">Subject:</span> {preview.subject}
              </p>
              <p className="text-sm text-amber-900">
                This sends to <span className="font-semibold">{preview.recipientCount} {preview.recipientCount === 1 ? "person" : "people"}</span> ({audienceLabel}) and cannot be unsent. Confirm is bound to this exact text and audience.
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
                  disabled={confirmSend.isPending || scheduleSend.isPending || !canPreview}
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
                  Back to draft
                </Button>
              </div>
              <div className="flex flex-wrap items-end gap-2 pt-1">
                <div className="space-y-1">
                  <Label htmlFor="outbound-schedule-at" className="text-[#1a472a] text-xs">
                    Schedule for… (Pacific time)
                  </Label>
                  <Input
                    id="outbound-schedule-at"
                    type="datetime-local"
                    value={scheduleLocal}
                    onChange={(e) => setScheduleLocal(e.target.value)}
                    className="bg-white min-w-[12rem] border-[#1a472a]/20"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#1a472a]/30 text-[#1a472a]"
                  disabled={scheduleSend.isPending || confirmSend.isPending || !scheduleLocal || !canPreview}
                  onClick={() => void handleSchedule()}
                >
                  {scheduleSend.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CalendarClock className="w-4 h-4 mr-2" />
                  )}
                  Schedule send
                </Button>
              </div>
              {(confirmSend.isError || scheduleSend.isError) && (
                <p className="text-sm text-red-700">
                  {confirmSend.error?.message || scheduleSend.error?.message}
                </p>
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
          setAiDraftBody(draft.body);
          if (draft.layout) setLayout(draft.layout);
          setPreview(null);
          toast.success("Draft applied. Review it, then use Preview send.");
        }}
      />
    </div>
  );
}
