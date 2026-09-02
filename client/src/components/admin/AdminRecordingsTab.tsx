import { useState } from "react";
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
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function AdminRecordingsTab() {
  const { data: recs = [], refetch, isLoading } = trpc.recordings.adminList.useQuery();
  const updateMutation = trpc.recordings.update.useMutation({ onSuccess: () => refetch() });
  const sendEmailMutation = trpc.recordings.sendEmail.useMutation({
    onSuccess: (data) => {
      toast.success(`Email sent to ${data.sent} subscribers`);
      refetch();
    },
  });
  const deleteMutation = trpc.recordings.delete.useMutation({ onSuccess: () => refetch() });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editYoutubeUrl, setEditYoutubeUrl] = useState('');
  const [editSummary, setEditSummary] = useState('');

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
          <p className="text-[#1a472a]/85 text-sm mt-1">Recordings received from Riverside.fm via webhook. Add YouTube URLs and send email summaries from here.</p>
        </div>
      </div>

      {isLoading && <div className="text-[#1a472a]/85">Loading recordings…</div>}

      {!isLoading && recs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Radio className="w-12 h-12 mx-auto text-[#1a472a]/85 mb-4" />
            <p className="text-[#1a472a]/85">No recordings yet.</p>
            <p className="text-sm text-[#1a472a]/85 mt-2">
              Once you set up the Riverside webhook at <code className="bg-muted px-1 rounded text-xs">https://regencivics.earth/api/webhooks/riverside</code>, recordings will appear here automatically after each session.
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
                      <ExternalLink className="w-3 h-3" /> Riverside
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
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => startEdit(rec)}>
                <Edit className="w-3 h-3 mr-1" /> Edit
              </Button>
              {!rec.emailSent && (
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
          <p className="text-sm text-[#1a472a]/85 font-medium mb-2">Webhook setup</p>
          <p className="text-xs text-[#1a472a]/85">In Riverside: Settings → Integrations → Webhooks → add URL:</p>
          <code className="text-xs bg-muted px-2 py-1 rounded block mt-1 break-all">https://regencivics.earth/api/webhooks/riverside</code>
          <p className="text-xs text-[#1a472a]/85 mt-2">Set <code className="bg-muted px-1 rounded">RIVERSIDE_WEBHOOK_SECRET</code> in Railway to the signing secret from Riverside.</p>
        </CardContent>
      </Card>
    </div>
  );
}
