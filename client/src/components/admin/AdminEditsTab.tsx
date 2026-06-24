/**
 * AdminEditsTab: edited-cut publishing surface (Phase 4, Movement
 * Coordination Engine).
 *
 * Lists recordings with their ingest status and current edited
 * YouTube URL (if any). Rye pastes the post-cut URL here; the server
 * stores it on the recording and notifies the assignees of every
 * completed call task tied to that recording.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Loader2, Save, Scissors, Trash2 } from "lucide-react";

type RecordingRow = {
  id: number;
  title: string;
  sessionDate: Date | string | null;
  youtubeVideoId: string | null;
  editedYoutubeUrl: string | null;
  recordingKind: string;
  overview: string | null;
  createdAt: Date | string;
};

function RawLink({ videoId }: { videoId: string | null }) {
  if (!videoId) return <span className="text-xs text-stone-400">no raw video</span>;
  return (
    <a
      href={`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-sage-700 hover:text-sage-900 inline-flex items-center gap-1"
    >
      raw <ExternalLink className="w-3 h-3" />
    </a>
  );
}

function RecordingCard({ row, onChanged }: { row: RecordingRow; onChanged: () => void }) {
  const [draft, setDraft] = useState(row.editedYoutubeUrl ?? "");
  const setCut = trpc.callTasks.setEditedCut.useMutation({ onSuccess: onChanged });
  const dirty = (draft ?? "").trim() !== (row.editedYoutubeUrl ?? "").trim();
  const date = row.sessionDate ? new Date(row.sessionDate as string) : new Date(row.createdAt as string);

  return (
    <Card className="border-stone-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="font-semibold text-stone-900">{row.title}</p>
            <p className="text-xs text-stone-500 mt-0.5">
              {date.toLocaleDateString()} · <RawLink videoId={row.youtubeVideoId} />
            </p>
          </div>
          {row.editedYoutubeUrl && (
            <a
              href={row.editedYoutubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
            >
              edited cut <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-stone-400 shrink-0" />
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1 text-sm"
          />
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={() => setCut.mutate({ recordingId: row.id, editedYoutubeUrl: draft })}
            disabled={!dirty || setCut.isPending}
          >
            {setCut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            Save
          </Button>
          {row.editedYoutubeUrl && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => { setDraft(""); setCut.mutate({ recordingId: row.id, editedYoutubeUrl: null }); }}
              disabled={setCut.isPending}
              title="Clear the edited cut (does not delete tasks)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {setCut.data && "notified" in setCut.data && (
          <p className="text-xs text-emerald-700">
            Saved. Notified {setCut.data.notified} completed-task assignee{setCut.data.notified === 1 ? "" : "s"}.
          </p>
        )}
        {setCut.error && (
          <p className="text-xs text-red-700">{setCut.error.message}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminEditsTab() {
  const list = trpc.callTasks.adminListRecordings.useQuery({ limit: 50 });
  const rows = (list.data ?? []) as RecordingRow[];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="w-5 h-5" />
          Edited cuts
        </CardTitle>
        <p className="text-sm text-stone-600">
          Paste the post-cut YouTube link to publish the edited highlight for a session. Saving notifies every completed-task assignee for that recording.
        </p>
      </CardHeader>
      <CardContent>
        {list.isLoading && (
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading recordings...
          </div>
        )}
        {!list.isLoading && rows.length === 0 && (
          <p className="text-sm text-stone-500">No recordings yet. Run the pipeline from the Call Tasks tab to ingest your first session.</p>
        )}
        <div className="space-y-3">
          {rows.map((row) => (
            <RecordingCard key={row.id} row={row} onChanged={() => list.refetch()} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
