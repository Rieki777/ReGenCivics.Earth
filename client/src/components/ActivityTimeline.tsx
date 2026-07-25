/**
 * Activity Timeline Component
 * Merges email history + internal notes into a single chronological feed.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Mail, MessageSquare, ChevronRight, Clock, CheckCircle, XCircle, MousePointer } from "lucide-react";

interface ActivityTimelineProps {
  email: string;
  contactType: string;
  contactId: number;
}

type TimelineItem =
  | { kind: "email"; id: number; date: Date; subject: string; status: string; openedAt: string | null; clickedAt: string | null }
  | { kind: "note"; id: number; date: Date; note: string; authorName: string };

function statusIcon(status: string) {
  if (status === "delivered") return <CheckCircle className="w-3 h-3 text-green-500" />;
  if (status === "bounced" || status === "failed") return <XCircle className="w-3 h-3 text-red-500" />;
  return <Clock className="w-3 h-3 text-gray-300" />;
}

export function ActivityTimeline({ email, contactType, contactId }: ActivityTimelineProps) {
  const [open, setOpen] = useState(false);

  const { data: logs, isLoading: logsLoading } = trpc.email.getLogsForEmail.useQuery(
    { email },
    { enabled: open && !!email }
  );
  const { data: notes, isLoading: notesLoading } = trpc.contactNotes.list.useQuery(
    { contactType, contactId },
    { enabled: open }
  );

  const isLoading = logsLoading || notesLoading;

  const items: TimelineItem[] = [
    ...(logs || []).map((l: any): TimelineItem => ({
      kind: "email",
      id: l.id,
      date: new Date(l.sentAt),
      subject: l.subject || "(no subject)",
      status: l.status || "sent",
      openedAt: l.openedAt,
      clickedAt: l.clickedAt,
    })),
    ...(notes || []).map((n: any): TimelineItem => ({
      kind: "note",
      id: n.id,
      date: new Date(n.createdAt),
      note: n.note,
      authorName: n.authorName || "Admin",
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const total = (logs?.length || 0) + (notes?.length || 0);

  return (
    <div className="border-t border-[#1a472a]/10 pt-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-xs text-[#1a472a]/80 hover:text-[#1a472a] transition-colors w-full"
      >
        <Clock className="w-3.5 h-3.5" />
        <span className="font-medium">Activity Timeline</span>
        {open && total > 0 && <span className="text-[#7dd87d]">({total})</span>}
        <ChevronRight className={`w-3.5 h-3.5 ml-auto transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="mt-3 space-y-2 pl-2 border-l-2 border-[#1a472a]/10">
          {isLoading && <p className="text-xs text-[#1a472a]/80 py-2">Loading…</p>}
          {!isLoading && items.length === 0 && (
            <p className="text-xs text-[#1a472a]/80 py-2">No activity yet.</p>
          )}
          {items.map((item) => (
            <div key={`${item.kind}-${item.id}`} className="relative pl-4">
              {/* dot */}
              <span className="absolute left-[-5px] top-2 w-2 h-2 rounded-full bg-[#4a7c59]/40 border border-[#4a7c59]" />

              {item.kind === "email" ? (
                <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-2 text-xs">
                  <div className="flex items-center gap-1.5 text-blue-700 font-medium">
                    <Mail className="w-3 h-3" />
                    {item.subject}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-blue-500/70">
                    {statusIcon(item.status)}
                    <span>{item.status}</span>
                    {item.openedAt && (
                      <span className="flex items-center gap-0.5 text-indigo-400">
                        <CheckCircle className="w-2.5 h-2.5" /> opened
                      </span>
                    )}
                    {item.clickedAt && (
                      <span className="flex items-center gap-0.5 text-purple-400">
                        <MousePointer className="w-2.5 h-2.5" /> clicked
                      </span>
                    )}
                    <span className="ml-auto">{item.date.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50/60 border border-amber-100 rounded-lg p-2 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                    <MessageSquare className="w-3 h-3" />
                    Note by {item.authorName}
                  </div>
                  <p className="mt-1 text-[#1a472a]/75 whitespace-pre-wrap">{item.note}</p>
                  <p className="text-[10px] text-amber-500/60 mt-1">{item.date.toLocaleString()}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
