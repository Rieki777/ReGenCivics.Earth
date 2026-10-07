import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Edit,
  ExternalLink,
  Loader2,
  Trash2,
  Send,
  Radio,
  MessageSquare,
  Mail,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { queueOutboundWriteFill } from "@shared/outboundWriteFill";
import { isLetterLayout } from "@shared/letterLayout";
import { CourseTimestamps } from "@/components/admin/CourseTimestamps";
import { chapterStamp, chapterWatchUrl, coerceChapters } from "@shared/youtubeChapters";
import { extractYoutubeVideoId } from "@shared/youtubeVideoId";

const YOUTUBE_CONNECT_ERRORS: Record<string, string> = {
  missing_client: "Google sign-in is not configured on the server yet.",
  not_admin: "Sign in as an admin, then connect the channel.",
  bad_state: "That connect link expired. Click Connect YouTube channel again.",
  no_refresh: "Google did not return a long-lived connection. Click Connect YouTube channel again.",
  no_channel: "That Google account has no YouTube channel. Sign in as the channel owner.",
  denied: "The Google prompt was closed before the channel connected.",
  exchange: "Google did not finish the connection. Click Connect YouTube channel again.",
};

function transcriptSourceLabel(source: string | null | undefined): string | null {
  if (source === "youtube_owner") return "Transcript source: YouTube channel captions";
  if (source === "youtube_timedtext") return "Transcript source: public captions";
  return null;
}

export function AdminRecordingsTab() {
  const { data: recs = [], refetch, isLoading } = trpc.recordings.adminList.useQuery();
  const youtube = trpc.recordings.youtubeConnection.useQuery();
  const updateMutation = trpc.recordings.update.useMutation({ onSuccess: () => refetch() });
  const sendEmailMutation = trpc.recordings.sendEmail.useMutation({
    onSuccess: (data) => {
      toast.success(`Email sent to ${data.sent} subscribers`);
      refetch();
    },
  });
  const deleteMutation = trpc.recordings.delete.useMutation({ onSuccess: () => refetch() });
  const reprocess = trpc.recordings.reprocess.useMutation({
    onSuccess: (data) => {
      if (data.ok) toast.success("Reprocess finished. Emails already sent stay sent.");
      else toast.error(data.reason ? `Processing failed: ${data.reason}` : "Reprocess did not finish");
      setConfirmReprocessId(null);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const repairLinks = trpc.recordings.repairEventLinks.useMutation({
    onSuccess: (data) => {
      toast.success(`Repair links checked ${data.examined} events and linked ${data.linked}.`);
      setConfirmRepair(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const [confirmReprocessId, setConfirmReprocessId] = useState<number | null>(null);
  const [confirmRepair, setConfirmRepair] = useState(false);
  const draftLetter = trpc.recordings.draftPostSessionLetter.useMutation({
    onSuccess: (res) => {
      queueOutboundWriteFill({
        subject: res.subject,
        body: res.body,
        layout: isLetterLayout(res.layout) ? res.layout : "announcement",
      });
      toast.success(
        res.created
          ? `Draft letter #${res.id} created`
          : `Draft letter #${res.id} ready (idempotent)`,
      );
      window.location.href = res.writeHref;
    },
    onError: (err) => toast.error(err.message || "Could not create draft"),
  });
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("youtube");
    if (flag === "connected") toast.success("YouTube channel connected.");
    if (flag === "error") {
      const reason = params.get("reason") ?? "";
      toast.error(YOUTUBE_CONNECT_ERRORS[reason] ?? "YouTube channel was not connected.");
    }
  }, []);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editYoutubeUrl, setEditYoutubeUrl] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [confirmEditedId, setConfirmEditedId] = useState<number | null>(null);
  const preview = trpc.recordings.editedEmailPreview.useQuery(
    { id: confirmEditedId ?? 0 },
    { enabled: confirmEditedId != null },
  );
  const { data: ledger = [] } = trpc.recordings.emailLedger.useQuery();
  const sendEdited = trpc.recordings.sendEditedEmail.useMutation({
    onSuccess: (data) => {
      toast.success(`Edited-recording email sent to ${data.sent} people`);
      setConfirmEditedId(null);
      refetch();
    },
    onError: (err) => toast.error(err.message || "Could not send the edited-recording email"),
  });

  function startEdit(rec: (typeof recs)[0]) {
    setEditingId(rec.id);
    setEditYoutubeUrl(rec.youtubeUrl ?? '');
    setEditSummary(rec.aiSummary ?? '');
  }
  function saveEdit(id: number) {
    updateMutation.mutate({ id, youtubeUrl: editYoutubeUrl || null, aiSummary: editSummary || null });
    setEditingId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1a472a]">Recordings</h2>
          <p className="text-[#1a472a]/85 text-sm mt-1">Recordings received from the recording platform via webhook. Add YouTube URLs and send email summaries from here.</p>
        </div>
        <Button variant="outline" onClick={() => setConfirmRepair(true)}>Repair links</Button>
      </div>
      <div className="rounded-xl border border-[#1a472a]/20 bg-white p-4" data-testid="youtube-connect">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#1a472a]">YouTube captions</p>
            <p className="text-sm text-[#1a472a]" data-testid="youtube-status">
              {youtube.isLoading
                ? "Checking the YouTube connection."
                : youtube.data?.migrationPending
                  ? "The database migration for this connection has not been applied yet."
                  : youtube.data?.connected
                    ? `Connected${youtube.data.channelTitle ? ` as ${youtube.data.channelTitle}` : ""}. Transcripts come from the channel owner's captions.`
                    : "Not connected. Transcripts use public captions when YouTube has published them."}
            </p>
          </div>
          <Button
            className="bg-[#1a472a] text-white"
            data-testid="connect-youtube"
            onClick={() => { window.location.href = "/api/youtube/oauth/start"; }}
          >
            {youtube.data?.connected ? "Reconnect YouTube channel" : "Connect YouTube channel"}
          </Button>
        </div>
      </div>
      {confirmRepair && (
        <div className="rounded-xl border border-[#1a472a]/20 bg-[#f0f7f0] p-4" data-testid="repair-links-confirm">
          <p className="text-sm text-[#1a472a] mb-3">
            Repair links attaches a recording to an event when the YouTube id, the session time, or the episode title matches one event.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-[#1a472a] text-white"
              disabled={repairLinks.isPending}
              onClick={() => repairLinks.mutate({ confirm: true })}
            >
              {repairLinks.isPending ? "Repairing…" : "Repair links"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmRepair(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <CourseTimestamps />

      {isLoading && <div className="text-[#1a472a]/85">Loading recordings…</div>}

      {!isLoading && recs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Radio className="w-12 h-12 mx-auto text-[#1a472a]/85 mb-4" />
            <p className="text-[#1a472a]/85">No recordings yet.</p>
            <p className="text-sm text-[#1a472a]/85 mt-2">
              New videos on the ReGen Civics YouTube channel appear here on their own, shortly after they're published.
            </p>
          </CardContent>
        </Card>
      )}

      {recs.map((rec) => (
        <Card key={rec.id} className={rec.emailSent ? 'border-green-500/30' : ''}>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-lg">{rec.title}</CardTitle>
                <CardDescription className="mt-1">
                  {rec.sessionDate ? new Date(rec.sessionDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Date unknown'}
                  {rec.durationSeconds ? ` · ${Math.floor(rec.durationSeconds / 60)} min` : ''}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {rec.emailSent ? (
                  <Badge variant="outline" className="border-green-500 text-green-600">Email sent</Badge>
                ) : (
                  <Badge variant="outline" className="border-yellow-500 text-yellow-600">Email pending</Badge>
                )}
                {rec.featured ? <Badge className="bg-purple-600">Featured</Badge> : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editingId === rec.id ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-[#1a472a]/85 mb-1 block">YouTube URL</Label>
                  <Input value={editYoutubeUrl} onChange={e => setEditYoutubeUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                </div>
                <div>
                  <Label className="text-xs text-[#1a472a]/85 mb-1 block">AI Summary</Label>
                  <Textarea value={editSummary} onChange={e => setEditSummary(e.target.value)} rows={4} placeholder="Paste or edit the summary shown in the email..." />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveEdit(rec.id)}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-3 text-sm">
                  {rec.youtubeUrl && (
                    <a href={rec.youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-red-500 hover:underline">
                      <ExternalLink className="w-3 h-3" /> YouTube
                    </a>
                  )}
                  {rec.riversideUrl && (
                    <a href={rec.riversideUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-purple-500 hover:underline">
                      <ExternalLink className="w-3 h-3" /> Recording
                    </a>
                  )}
                  {rec.forumPostId && (
                    <a href={`/community/post/${rec.forumPostId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-green-600 hover:underline">
                      <MessageSquare className="w-3 h-3" /> Forum post
                    </a>
                  )}
                </div>
                {rec.aiSummary && (
                  <p className="text-sm text-[#1a472a]/85 line-clamp-3">{rec.aiSummary}</p>
                )}
                {transcriptSourceLabel(rec.transcriptSource) && (
                  <p className="text-xs text-[#1a472a]/80" data-testid="transcript-source">
                    {transcriptSourceLabel(rec.transcriptSource)}
                  </p>
                )}
                {rec.lastError && (
                  <p className="text-sm text-red-700" data-testid="recording-last-error">
                    Processing failed: {rec.lastError}
                  </p>
                )}
                {(rec.processAttempts > 0 || rec.nextRetryAt) && (
                  <p className="text-xs text-[#1a472a]/70">
                    Tried {rec.processAttempts} {rec.processAttempts === 1 ? "time" : "times"}
                    {rec.nextRetryAt
                      ? `. Next retry ${new Date(rec.nextRetryAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`
                      : rec.processAttempts > 0
                        ? ". Automatic retries are finished"
                        : ""}
                  </p>
                )}
                <EditedCutPanel
                  rec={rec}
                  ledger={ledger}
                  confirming={confirmEditedId === rec.id}
                  recipientCount={preview.data?.recordingId === rec.id ? preview.data.count : null}
                  previewLoading={confirmEditedId === rec.id && preview.isLoading}
                  sending={sendEdited.isPending}
                  onAsk={() => setConfirmEditedId(rec.id)}
                  onCancel={() => setConfirmEditedId(null)}
                  onConfirm={() => sendEdited.mutate({ id: rec.id, confirm: true })}
                />
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => startEdit(rec)}>
                <Edit className="w-3 h-3 mr-1" /> Edit
              </Button>
              {confirmReprocessId === rec.id ? (
                <div className="flex flex-wrap items-center gap-2" data-testid="reprocess-confirm">
                  <p className="text-xs text-[#1a472a]">
                    Reprocess this recording? People who already got the letter will not get another one.
                  </p>
                  <Button
                    size="sm"
                    className="bg-[#1a472a] text-white"
                    disabled={reprocess.isPending}
                    onClick={() => reprocess.mutate({ id: rec.id, confirm: true })}
                  >
                    {reprocess.isPending ? "Reprocessing…" : "Reprocess"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmReprocessId(null)}>Cancel</Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setConfirmReprocessId(rec.id)}>
                  Reprocess
                </Button>
              )}
              {!rec.emailSent && !rec.editedEmailSent && (
                <Button
                  size="sm"
                  className="bg-green-700 hover:bg-green-800 text-white"
                  onClick={() => sendEmailMutation.mutate({ id: rec.id })}
                  disabled={sendEmailMutation.isPending}
                >
                  <Send className="w-3 h-3 mr-1" />
                  {sendEmailMutation.isPending ? 'Sending…' : 'Send Email Summary'}
                </Button>
              )}
              {!rec.emailSent && !!rec.editedEmailSent && !!(rec.aiSummary || rec.overview) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sendEmailMutation.mutate({ id: rec.id })}
                  disabled={sendEmailMutation.isPending}
                >
                  <Send className="w-3 h-3 mr-1" />
                  {sendEmailMutation.isPending ? 'Sending…' : 'Send session notes'}
                </Button>
              )}
              {rec.emailSent && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sendEmailMutation.mutate({ id: rec.id })}
                  disabled={sendEmailMutation.isPending}
                >
                  <Send className="w-3 h-3 mr-1" /> Resend Email
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                data-testid="draft-session-letter"
                onClick={() => draftLetter.mutate({ recordingId: rec.id })}
                disabled={draftLetter.isPending}
              >
                <Mail className="w-3 h-3 mr-1" />
                {draftLetter.isPending ? 'Drafting…' : 'Draft session letter'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => updateMutation.mutate({ id: rec.id, featured: rec.featured ? 0 : 1 })}
              >
                {rec.featured ? 'Unfeature' : '⭐ Feature'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => { if (confirm('Delete this recording record?')) deleteMutation.mutate({ id: rec.id }); }}
              >
                <Trash2 className="w-3 h-3 mr-1" /> Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="border-dashed">
        <CardContent className="py-6">
          <p className="text-sm text-[#1a472a]/85 font-medium mb-2">Where recordings come from</p>
          <p className="text-xs text-[#1a472a]/85">The site checks the YouTube channel's public feed on a schedule and adds each new video here with its transcript and summary, then sends the newsletter email and the forum post. No outside service is involved.</p>
          <p className="text-xs text-[#1a472a]/85 mt-2">The older Riverside webhook is off. It turns on only if <code className="bg-muted px-1 rounded">RIVERSIDE_WEBHOOK_SECRET</code> is set in Railway.</p>
        </CardContent>
      </Card>
    </div>
  );
}

type LedgerRow = {
  inquiryId: number | null;
  template: string | null;
  status: string;
  n: number | string;
};

function ledgerText(rows: LedgerRow[], recordingId: number, template: string): string {
  const mine = rows.filter((row) => row.inquiryId === recordingId && row.template === template);
  if (!mine.length) return "";
  return mine.map((row) => `${Number(row.n)} ${row.status}`).join(", ");
}

function EditedCutPanel({
  rec,
  ledger,
  confirming,
  recipientCount,
  previewLoading,
  sending,
  onAsk,
  onCancel,
  onConfirm,
}: {
  rec: {
    id: number;
    editedYoutubeUrl: string | null;
    editedYoutubeVideoId: string | null;
    editedEmailSent: number;
    descriptionChaptersJson: unknown;
  };
  ledger: LedgerRow[];
  confirming: boolean;
  recipientCount: number | null;
  previewLoading: boolean;
  sending: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const chapters = coerceChapters(rec.descriptionChaptersJson);
  const videoId = extractYoutubeVideoId(rec.editedYoutubeVideoId) || extractYoutubeVideoId(rec.editedYoutubeUrl);
  if (!rec.editedYoutubeUrl && chapters.length === 0 && !rec.editedEmailSent) return null;
  const counts = ledgerText(ledger, rec.id, "recording_edited");
  const people = recipientCount == null
    ? "Checking how many people are subscribed to recordings."
    : `This sends one letter to each person subscribed to recordings. ${recipientCount} ${recipientCount === 1 ? "person" : "people"}.`;
  return (
    <div className="rounded-md border border-[#1a472a]/15 bg-[#f0f7f0] p-3 space-y-2" data-testid="edited-cut-panel">
      {rec.editedYoutubeUrl && (
        <a href={rec.editedYoutubeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-[#1a472a] font-semibold hover:underline">
          <ExternalLink className="w-3 h-3" /> Edited cut
        </a>
      )}
      <p className="text-xs text-[#1a472a]">
        Edited email: {rec.editedEmailSent ? "sent" : "not sent"}
        {counts ? ` (${counts})` : ""}
      </p>
      {chapters.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#1a472a] mb-1">Jump to a moment</p>
          <ul className="max-h-48 overflow-auto text-sm space-y-1">
            {chapters.map((chapter) => (
              <li key={`${chapter.tSeconds}-${chapter.title}`}>
                {videoId ? (
                  <a href={chapterWatchUrl(videoId, chapter.tSeconds)} target="_blank" rel="noopener noreferrer" className="text-[#1a472a] hover:underline">
                    <span className="inline-block w-16 tabular-nums font-semibold text-[#2d5a3d]">{chapterStamp(chapter)}</span>
                    {chapter.title}
                  </a>
                ) : (
                  <span className="text-[#1a472a]">
                    <span className="inline-block w-16 tabular-nums font-semibold text-[#2d5a3d]">{chapterStamp(chapter)}</span>
                    {chapter.title}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {rec.editedYoutubeUrl && !confirming && (
        <Button type="button" size="sm" className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#7dd87d]/90" onClick={onAsk}>
          <Send className="w-3 h-3 mr-1" /> Send edited-recording email
        </Button>
      )}
      {confirming && (
        <div className="space-y-2" data-testid="edited-email-confirm">
          <p className="text-sm text-[#1a472a]">{previewLoading ? "Checking how many people are subscribed to recordings." : people}</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" className="bg-[#1a472a] text-white hover:bg-[#1a472a]/90" disabled={sending || previewLoading || recipientCount == null} onClick={onConfirm}>
              {sending ? "Sending…" : "Send now"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
