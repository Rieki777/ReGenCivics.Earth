/**
 * One event on Admin > Events, and the reminder email editor that opens
 * inside it. Each card is memoized and gets plain values plus handlers that
 * stay the same function across renders, so typing anywhere on the tab, or
 * opening one card's roster or editor, re-renders that card and not every
 * event (STEERING.md section 13). Moved out of AdminEventsTab's
 * renderEventCard; the markup is unchanged.
 */
import { memo, useEffect, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Edit,
  Loader2,
  Trash2,
  Send,
  Clock,
  Bell,
  CheckCheck,
  AlertTriangle,
  Users,
} from "lucide-react";
import { siteJoinUrl } from '@/lib/calendarLinks';
import { trpc } from "@/lib/trpc";
import { AdminEventAutoReminders } from "@/components/admin/AdminEventAutoReminders";
import { AfterSessionChecklist } from "@/components/admin/AfterSessionChecklist";
import { LiveSessionRunbook } from "@/components/admin/LiveSessionRunbook";
import {
  eventHasWatchPath,
  resolveEventStart,
  toMs,
  type EventTemporalPhase,
} from "@/lib/eventTemporal";
import type { AppRouter } from "../../../../server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;
export type AdminEvent = RouterOutputs["events"]["adminList"][number];
type AutoReminderRow = RouterOutputs["events"]["listAutoReminders"][number];
type RecordingRow = RouterOutputs["recordings"]["adminList"][number];
type ProjectRoster = RouterOutputs["events"]["projectRoster"];

/**
 * The reminder editor's subject, body and send time while it is closed. The
 * page owns it: Send Reminders fills it before the editor opens, the editor
 * starts from it and copies its text back, so a filter switch that unmounts
 * the card brings back what was typed.
 */
export type ReminderDraft = { customSubject: string; customBody: string; scheduleFor: string };

/**
 * The page's setters, mutation calls, refetch and draft ref. Every member is
 * the same function (or ref) for the page's lifetime, so the object is too,
 * and passing it does not make a memoized card re-render.
 */
export type EventCardActions = {
  startEdit: (ev: AdminEvent) => void;
  setRosterEventId: Dispatch<SetStateAction<number | null>>;
  setReminderEditorOpen: Dispatch<SetStateAction<number | null>>;
  setAutoReminderOpen: Dispatch<SetStateAction<number | null>>;
  setReminderSuccess: Dispatch<SetStateAction<number | null>>;
  setFollowupSuccess: Dispatch<SetStateAction<number | null>>;
  setSpeakerIntroSuccess: Dispatch<SetStateAction<number | null>>;
  setScheduleSuccess: Dispatch<SetStateAction<number | null>>;
  setPreflightEventId: Dispatch<SetStateAction<number | null>>;
  setPreflightConfirmed: Dispatch<SetStateAction<boolean>>;
  sendFollowup: ReturnType<typeof trpc.events.sendFollowup.useMutation>["mutate"];
  sendSpeakerIntro: ReturnType<typeof trpc.events.sendSpeakerIntro.useMutation>["mutate"];
  deleteEvent: ReturnType<typeof trpc.events.delete.useMutation>["mutate"];
  sendReminder: ReturnType<typeof trpc.events.sendReminders.useMutation>["mutateAsync"];
  refetch: () => unknown;
  reminderDraft: MutableRefObject<ReminderDraft>;
};

const typeColors: Record<string, string> = {
  open: 'bg-blue-500/20 text-blue-300',
  episode: 'bg-green-500/20 text-green-300',
  special: 'bg-purple-500/20 text-purple-300',
};
const statusColors: Record<string, string> = {
  upcoming: 'bg-yellow-500/20 text-yellow-300',
  live: 'bg-red-500/20 text-red-300 animate-pulse',
  completed: 'bg-emerald-500/25 text-[#7dd87d] border border-[#7dd87d]/40',
  cancelled: 'bg-[#3d4a3d] text-[#f8f5f0]',
};

type EventCardProps = {
  ev: AdminEvent;
  /**
   * isPast, temporalPhase and displayStatus read the clock, so the page works
   * them out on each of its renders (as it groups the list), not the card.
   */
  isPast: boolean;
  temporalPhase: EventTemporalPhase;
  displayStatus: string;
  signupCount: number;
  autoReminder: AutoReminderRow | undefined;
  recordingById: Map<number, RecordingRow>;
  letterByRecordingId: Map<number, { issueId: number; status: string }>;
  /** The page's "which event" ids, each turned into "is it this one". */
  rosterOpen: boolean;
  roster: ProjectRoster | undefined;
  rosterLoading: boolean;
  reminderEditorOpen: boolean;
  autoReminderOpen: boolean;
  justSentReminders: boolean;
  justSentFollowup: boolean;
  justSentSpeakerIntro: boolean;
  justScheduled: boolean;
  preflightOpen: boolean;
  preflightConfirmed: boolean;
  /** Shared by every card, as the mutations are. */
  followupPending: boolean;
  speakerIntroPending: boolean;
  reminderPending: boolean;
  actions: EventCardActions;
};

export const EventCard = memo(function EventCard({
  ev,
  isPast,
  temporalPhase,
  displayStatus,
  signupCount,
  autoReminder,
  recordingById,
  letterByRecordingId,
  rosterOpen,
  roster,
  rosterLoading,
  reminderEditorOpen,
  autoReminderOpen,
  justSentReminders,
  justSentFollowup,
  justSentSpeakerIntro,
  justScheduled,
  preflightOpen,
  preflightConfirmed,
  followupPending,
  speakerIntroPending,
  reminderPending,
  actions,
}: EventCardProps) {
  const {
    startEdit,
    setRosterEventId,
    setReminderEditorOpen,
    setAutoReminderOpen,
    setFollowupSuccess,
    setSpeakerIntroSuccess,
    sendFollowup,
    sendSpeakerIntro,
    deleteEvent,
    refetch,
    reminderDraft,
  } = actions;
  // Prefer adminList.startTime; resolveEventStart also accepts snake_case / number.
  // Display via toMs so MySQL/epoch shapes match temporal grouping.
  const startRaw = resolveEventStart(ev as any);
  const startMs = toMs(startRaw as any);
  const startDate = startMs != null ? new Date(startMs) : null;
  const dateStr = startDate
    ? startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : '-';
  // timeZoneName, not ev.timezone. Formatting in the viewer's zone and
  // labelling it with a stored string showed "10:00 AM EDT" for a
  // 17:00Z event to a reader in California. Same bug as EventDetail.
  const timeStr = startDate
    ? startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" })
    : '';
  return (
    <Card key={ev.id} className={`bg-[#0a1f14] border-white/10 ${ev.status === 'cancelled' ? 'opacity-50' : ''}`} data-testid={isPast ? "admin-event-past" : "admin-event-upcoming"}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[ev.type] ?? ''}`}>{ev.type}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[displayStatus] ?? ''}`}>{displayStatus}</span>
              {ev.season && <span className="text-xs text-white/60">{ev.season}{ev.episodeNumber ? ` · Ep ${ev.episodeNumber}` : ''}</span>}
            </div>
            <p className="font-medium text-white text-sm truncate">{ev.title}</p>
            <p className="text-xs text-white/70 mt-0.5">{dateStr} {timeStr}</p>
            <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-white/60">
              <span><Bell size={11} className="inline mr-1" />{signupCount} reminder signup{signupCount !== 1 ? 's' : ''}</span>
              {!isPast && autoReminder?.enabled && (
                <span className="text-blue-300">Auto-remind on</span>
              )}
              {(ev.riversideRoomUrl || ev.zoomUrl) && <a href={siteJoinUrl(ev.id)} target="_blank" rel="noreferrer" className="text-green-400 hover:underline">Join link ↗</a>}
              {ev.youtubeUrl && <a href={ev.youtubeUrl} target="_blank" rel="noreferrer" className="text-red-400 hover:underline">YouTube ↗</a>}
              {ev.recordingId && <span className="text-purple-400">Recording #{ev.recordingId}</span>}
              {isPast && !eventHasWatchPath(ev as any) && (
                <span
                  className="text-amber-400/90"
                  data-testid="admin-event-no-recording"
                  title="Past session with no recordingId and no youtubeUrl — Historical cannot show Watch"
                >
                  No recording linked
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:flex-col sm:items-end">
            <Button size="sm" variant="ghost" onClick={() => startEdit(ev)}
              className="text-white/60 hover:text-white hover:bg-white/10 h-7 px-2 text-xs">
              <Edit size={11} className="mr-1" /> Edit
            </Button>
            <Button size="sm" variant="ghost"
              onClick={() => setRosterEventId(rosterOpen ? null : ev.id)}
              className="text-white/60 hover:text-white hover:bg-white/10 h-7 px-2 text-xs">
              <Users size={11} className="mr-1" /> {rosterOpen ? 'Hide' : "Who's coming"}
            </Button>
            {!isPast && (justSentReminders
              ? <Button size="sm" variant="ghost" disabled className="text-yellow-400 h-7 px-2 text-xs">
                  <CheckCheck size={11} className="mr-1" /> Sent!
                </Button>
              : <Button size="sm" variant="ghost"
                  onClick={() => {
                    setReminderEditorOpen(reminderEditorOpen ? null : ev.id);
                    if (!reminderEditorOpen) {
                      // What setCustomSubject / setCustomBody / setScheduleFor
                      // did here; the editor that opens starts from this draft.
                      reminderDraft.current.customSubject = `Reminder: ${ev.title} is tomorrow`;
                      reminderDraft.current.customBody = ev.description ?? '';
                      if (ev.startTime) {
                        const dayBefore = new Date(ev.startTime);
                        dayBefore.setDate(dayBefore.getDate() - 1);
                        dayBefore.setHours(9, 0, 0, 0);
                        reminderDraft.current.scheduleFor = dayBefore.toISOString().slice(0, 16);
                      }
                    }
                  }}
                  className="text-white/60 hover:text-yellow-300 hover:bg-yellow-500/10 h-7 px-2 text-xs">
                  <Bell size={11} className="mr-1" />
                  {reminderEditorOpen ? 'Cancel' : 'Send Reminders'}
                </Button>)}
            {!isPast && (
            <Button size="sm" variant="ghost"
              onClick={() => setAutoReminderOpen(autoReminderOpen ? null : ev.id)}
              className="text-white/60 hover:text-blue-300 hover:bg-blue-500/10 h-7 px-2 text-xs">
              <Clock size={11} className="mr-1" />
              {autoReminderOpen
                ? "Close auto-remind"
                : autoReminder?.enabled ? "Auto-remind on" : "Auto-remind"}
            </Button>
            )}
            {isPast && autoReminder?.enabled && (
              <span className="text-[11px] text-white/50 h-7 px-2 inline-flex items-center" title="Auto-remind was on; past events no longer send">
                <Clock size={11} className="mr-1" /> Auto-remind was on
              </span>
            )}
            {/* #17. Send Follow-up for completed events */}
            {(isPast || ev.status === 'completed') && (
              justSentFollowup
                ? <Button size="sm" variant="ghost" disabled className="text-green-400 h-7 px-2 text-xs">
                    <CheckCheck size={11} className="mr-1" /> Follow-up Sent!
                  </Button>
                : <Button size="sm" variant="ghost"
                    onClick={() => {
                      if (confirm(`Send "How was it?" follow-up email to everyone who signed up for "${ev.title}"?`)) {
                        sendFollowup({ eventId: ev.id }, {
                          onSuccess: () => {
                            setFollowupSuccess(ev.id);
                            setTimeout(() => setFollowupSuccess(null), 4000);
                          },
                        });
                      }
                    }}
                    disabled={followupPending}
                    className="text-white/60 hover:text-green-300 hover:bg-green-500/10 h-7 px-2 text-xs whitespace-nowrap">
                    <Send size={11} className="mr-1" />
                    {followupPending ? 'Sending...' : 'Send Follow-up'}
                  </Button>
            )}
            {/* #25. Send Speaker Intro (only if event has a guest speaker) */}
            {(ev as any).guestSpeakerName && (
              justSentSpeakerIntro
                ? <Button size="sm" variant="ghost" disabled className="text-purple-400 h-7 px-2 text-xs">
                    <CheckCheck size={11} className="mr-1" /> Speaker Intro Sent!
                  </Button>
                : <Button size="sm" variant="ghost"
                    onClick={() => {
                      if (confirm(`Send speaker introduction email for "${(ev as any).guestSpeakerName}" to all signups?`)) {
                        sendSpeakerIntro({ eventId: ev.id }, {
                          onSuccess: () => {
                            setSpeakerIntroSuccess(ev.id);
                            setTimeout(() => setSpeakerIntroSuccess(null), 4000);
                          },
                        });
                      }
                    }}
                    disabled={speakerIntroPending}
                    className="text-white/60 hover:text-purple-300 hover:bg-purple-500/10 h-7 px-2 text-xs">
                    <Users size={11} className="mr-1" />
                    {speakerIntroPending ? 'Sending...' : 'Send Speaker Intro'}
                  </Button>
            )}
            <Button size="sm" variant="ghost"
              onClick={() => { if (confirm(`Delete "${ev.title}"?`)) deleteEvent({ id: ev.id }); }}
              className="text-white/60 hover:text-red-400 hover:bg-red-500/10 h-7 px-2 text-xs">
              <Trash2 size={11} className="mr-1" /> Delete
            </Button>
          </div>
        </div>

        {!isPast && (temporalPhase === "live" || (ev as any).status === "live") && (
          <LiveSessionRunbook
            eventId={ev.id}
            eventTitle={ev.title}
            startTime={ev.startTime}
            timeZone={ev.timezone}
          />
        )}

        {isPast && (
          <AfterSessionChecklist
            event={ev as any}
            recording={
              ev.recordingId != null
                ? (recordingById.get(ev.recordingId) as any) ?? { id: ev.recordingId }
                : null
            }
            letter={
              ev.recordingId != null
                ? letterByRecordingId.get(ev.recordingId) ?? null
                : null
            }
            isPast={isPast}
            onMarkedCompleted={() => { void refetch(); }}
          />
        )}

        {/* Guest speaker info display */}
        {(ev as any).guestSpeakerName && (
          <div className="border-t border-white/10 px-4 py-2">
            <span className="text-xs text-purple-400">Guest: {(ev as any).guestSpeakerName}{(ev as any).guestSpeakerTopic ? `, ${(ev as any).guestSpeakerTopic}` : ''}</span>
          </div>
        )}

        <div className="border-t border-white/10 px-4 py-2">
          <span className="text-xs text-white/60">Personal check-in links go out in the follow-up email.</span>
        </div>

        {/* Inline email editor */}
        {!isPast && reminderEditorOpen && (
          <ReminderEditor
            ev={ev}
            isPast={isPast}
            signupCount={signupCount}
            justScheduled={justScheduled}
            preflightOpen={preflightOpen}
            preflightConfirmed={preflightConfirmed}
            reminderPending={reminderPending}
            actions={actions}
          />
        )}

        {!isPast && autoReminderOpen && (
          <AdminEventAutoReminders
            event={ev}
            saved={autoReminder}
          />
        )}

        {/* Who's coming, of the projects that applied. Rye's ask, 2026-08-28.
            Four groups and all of them visible: an inner join would answer
            the question by hiding the people it could not match. */}
        {rosterOpen && (
          <div className="mt-4 pt-4 border-t border-white/10">
            {rosterLoading && <p className="text-xs text-white/50">Reading signups and applications...</p>}
            {!rosterLoading && roster && (
              <>
                <p className="text-xs text-white/70 mb-3">
                  <span className="text-white font-medium">{roster.counts.responded} of {roster.counts.appliedTotal}</span> applied projects responded
                  {' · '}<span className="text-green-400">{roster.counts.coming} coming</span>
                  {' · '}<span className="text-white/60">{roster.counts.cancelled} cancelled</span>
                  {' · '}<span className="text-yellow-400">{roster.counts.unmatched} signup{roster.counts.unmatched === 1 ? '' : 's'} not matched to an application</span>
                  {roster.counts.ambiguous > 0 && <>{' · '}<span className="text-orange-400">{roster.counts.ambiguous} ambiguous</span></>}
                </p>

                {roster.counts.sharedAccountApplications > 0 && (
                  <p className="text-xs text-orange-300/80 mb-3">
                    Heads up: <span className="font-medium">{roster.counts.sharedAccountApplications} of {roster.counts.appliedTotal}</span> applications
                    share an account with another application. An email match cannot say which of those projects is
                    coming, only that the account holder signed up, so they are reported as ambiguous rather than
                    counted as attending. To answer this properly those founders need their own accounts, or an
                    application needs its own contact email.
                  </p>
                )}

                {roster.counts.appliedTotal > 0 && roster.counts.responded === 0 && (
                  <p className="text-xs text-white/50 mb-3">
                    Nobody has answered yet. The event page offers &ldquo;Get Reminder&rdquo; and says no commitment
                    is required, so there is currently nothing on it that records an intention to attend.
                  </p>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-green-400 mb-1.5">Applied and coming ({roster.coming.length})</p>
                    {roster.coming.length === 0
                      ? <p className="text-xs text-white/40">None yet.</p>
                      : roster.coming.map((r: any) => (
                          <div key={r.signupId} className="text-xs text-white/70 mb-1">
                            <span className="text-white">{r.projectName}</span>
                            <span className="text-white/50"> · {r.location} · {r.status}</span>
                            <br />
                            <span className="text-white/50">signed up as {r.signedUpName || r.accountName || 'no name given'} ({r.signedUpEmail})</span>
                          </div>
                        ))}
                  </div>

                  <div>
                    <p className="text-xs font-medium text-white/70 mb-1.5">Applied, no response yet ({roster.awaiting.length})</p>
                    {roster.awaiting.length === 0
                      ? <p className="text-xs text-white/40">Everybody has answered.</p>
                      : roster.awaiting.map((r: any) => (
                          <div key={r.applicationId} className="text-xs text-white/70 mb-1">
                            <span className="text-white">{r.projectName}</span>
                            <span className="text-white/50"> · {r.location} · {r.status}</span>
                            {r.accountEmail && <span className="text-white/40"> · {r.accountEmail}</span>}
                          </div>
                        ))}
                  </div>

                  <div>
                    <p className="text-xs font-medium text-yellow-400 mb-1.5">Coming, but not matched to an application ({roster.unmatched.length})</p>
                    {roster.unmatched.length === 0
                      ? <p className="text-xs text-white/40">None.</p>
                      : <>
                          <p className="text-xs text-white/40 mb-1">
                            Matched by email, so a founder who signed up with a different address than the one on
                            their account lands here rather than beside their project.
                          </p>
                          {roster.unmatched.map((r: any) => (
                            <div key={r.signupId} className="text-xs text-white/70 mb-1">
                              <span className="text-white">{r.name || 'no name given'}</span>
                              <span className="text-white/50"> · {r.email}</span>
                              {r.cancelledAt && <span className="text-white/40"> · cancelled</span>}
                            </div>
                          ))}
                        </>}
                  </div>

                  <div>
                    <p className="text-xs font-medium text-orange-400 mb-1.5">Ambiguous ({roster.ambiguous.length})</p>
                    {roster.ambiguous.length === 0
                      ? <p className="text-xs text-white/40">None.</p>
                      : roster.ambiguous.map((r: any) => (
                          <div key={r.signupId} className="text-xs text-white/70 mb-1.5">
                            <span className="text-white">{r.signedUpName || 'no name given'}</span>
                            <span className="text-white/50"> · {r.signedUpEmail}</span>
                            <br />
                            <span className="text-white/40">
                              that address is on {r.candidateCount} applications: {r.candidates.map((c: any) => c.projectName).join(', ')}
                            </span>
                          </div>
                        ))}
                  </div>

                  <div>
                    <p className="text-xs font-medium text-white/50 mb-1.5">Cancelled ({roster.cancelled.length})</p>
                    {roster.cancelled.length === 0
                      ? <p className="text-xs text-white/40">None.</p>
                      : roster.cancelled.map((r: any) => (
                          <div key={r.signupId} className="text-xs text-white/60 mb-1">
                            <span className="text-white/80">{r.projectName}</span>
                            <span className="text-white/40"> · changed their mind, not unanswered</span>
                          </div>
                        ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

/**
 * The reminder email editor keeps its own subject, body and send time, so a
 * keystroke re-renders the editor and its preview, not the card or the event
 * list. It starts from the page's draft and copies its text back after each
 * change, the way ProposeAgreementForm does (CommunityGuidelines.tsx).
 */
const ReminderEditor = memo(function ReminderEditor({
  ev,
  isPast,
  signupCount,
  justScheduled,
  preflightOpen,
  preflightConfirmed,
  reminderPending,
  actions,
}: {
  ev: AdminEvent;
  isPast: boolean;
  signupCount: number;
  justScheduled: boolean;
  preflightOpen: boolean;
  preflightConfirmed: boolean;
  reminderPending: boolean;
  actions: EventCardActions;
}) {
  const {
    setPreflightEventId,
    setPreflightConfirmed,
    setScheduleSuccess,
    setReminderEditorOpen,
    setReminderSuccess,
    sendReminder,
    refetch,
    reminderDraft,
  } = actions;
  const [customSubject, setCustomSubject] = useState(reminderDraft.current.customSubject);
  const [customBody, setCustomBody] = useState(reminderDraft.current.customBody);
  const [scheduleFor, setScheduleFor] = useState(reminderDraft.current.scheduleFor);
  useEffect(() => {
    reminderDraft.current = { customSubject, customBody, scheduleFor };
  }, [reminderDraft, customSubject, customBody, scheduleFor]);

  return (
    <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-3">
      <p className="text-xs text-white/70 font-medium uppercase tracking-wide">Preview &amp; Edit Reminder Email</p>
      <div>
        <Label className="text-white/60 text-xs">Subject line</Label>
        <Input
          value={customSubject}
          onChange={e => setCustomSubject(e.target.value)}
          className="bg-white/10 border-white/45 text-white placeholder:text-white/70 text-sm mt-1"
          placeholder={`Reminder: ${ev.title} is tomorrow`}
        />
      </div>
      <div>
        <Label className="text-white/60 text-xs">Body paragraph (shown below the date)</Label>
        <Textarea
          value={customBody}
          onChange={e => setCustomBody(e.target.value)}
          rows={4}
          className="bg-white/10 border-white/45 text-white placeholder:text-white/70 text-sm mt-1 resize-none"
          placeholder="What do you want people to know before they join? Leave blank to use the event description."
        />
      </div>

      {/* Live email preview */}
      <div className="rounded-xl overflow-hidden border border-white/10 text-sm">
        <div className="bg-gradient-to-r from-[#1a472a] to-[#2d5a3d] px-5 py-4 text-center">
          <p className="text-[#7dd87d] font-bold text-base m-0">ReGen Civics</p>
          <p className="text-[#a8e6a8] text-xs mt-1 m-0">Event reminder</p>
        </div>
        <div className="bg-white px-5 py-5 space-y-2">
          <p className="text-gray-300 text-xs m-0">Starting in ~24 hours</p>
          <p className="text-[#1a472a] font-bold text-base m-0">{ev.title}</p>
          <p className="text-white/80 text-sm m-0">
            {ev.startTime ? new Date(ev.startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''}
            {ev.startTime ? ` at ${new Date(ev.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} ${ev.timezone ?? ''}` : ''}
          </p>
          {(customBody || ev.description) && (
            <p className="text-white/85 text-sm leading-relaxed m-0">{customBody || ev.description}</p>
          )}
          <div className="flex gap-2 pt-1 flex-wrap">
            <span className="bg-purple-600 text-white px-4 py-2 rounded-lg text-xs font-bold">Join the call</span>
            <span className="border-2 border-[#1a472a] text-[#1a472a] px-4 py-2 rounded-lg text-xs font-bold">View Schedule</span>
          </div>
        </div>
        <div className="bg-[#f0f7f0] px-5 py-3 text-center">
          <p className="text-gray-300 text-xs m-0">Manage email preferences · View all events</p>
        </div>
      </div>

      <p className="text-xs text-white/60">Subject: <span className="text-white/70">{customSubject || `Reminder: ${ev.title} is tomorrow`}</span></p>
      <p className="text-xs text-white/60">Sending to <span className="text-white/70">{signupCount} people</span> who signed up for this event.</p>

      <div className="flex flex-wrap items-end gap-2">
        <Button
          disabled={reminderPending || signupCount === 0}
          onClick={() => { setPreflightEventId(ev.id); setPreflightConfirmed(false); }}
          className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs h-8 px-4"
        >
          {signupCount === 0
            ? 'No signups yet'
            : `Review & Send to ${signupCount} ${signupCount === 1 ? 'person' : 'people'}`}
        </Button>

        {/* #24. Schedule for later */}
        <div className="flex items-end gap-1.5">
          <div>
            <Label className="text-white/60 text-xs">Schedule for...</Label>
            <Input
              type="datetime-local"
              value={scheduleFor}
              onChange={e => setScheduleFor(e.target.value)}
              className="bg-white/10 border-white/45 text-white placeholder:text-white/70 text-xs h-8 mt-0.5 w-48"
            />
          </div>
          <Button
            disabled={!scheduleFor || reminderPending || signupCount === 0}
            onClick={async () => {
              const result = await sendReminder({
                id: ev.id,
                customSubject: customSubject || undefined,
                customBody: customBody || undefined,
                scheduledFor: new Date(scheduleFor).toISOString(),
              });
              setScheduleSuccess(ev.id);
              setReminderEditorOpen(null);
              setScheduleFor('');
              // The editor closes in this same render, so its effect never
              // copies the cleared time back: clear the page's draft here.
              reminderDraft.current = { ...reminderDraft.current, scheduleFor: '' };
              setTimeout(() => setScheduleSuccess(null), 6000);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 px-3"
          >
            <Clock size={11} className="mr-1" /> Schedule
          </Button>
        </div>
      </div>
      {justScheduled && (
        <p className="text-xs text-blue-400">Reminder scheduled. It will send at the selected time (lost if server restarts).</p>
      )}

      {/* #22 Preflight checklist dialog */}
      {preflightOpen && (() => {
        const hasJoinLink = !!(ev.riversideRoomUrl || ev.zoomUrl);
        const isUpcoming = !isPast;
        const alreadySent = !!(ev as any).reminderSent;

        return (
          <Dialog open onOpenChange={(open) => { if (!open) setPreflightEventId(null); }}>
            <DialogContent className="bg-[#0a1f14] border-white/20 text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white text-base">Preflight Check: Send Reminders</DialogTitle>
                <DialogDescription className="text-white/70 text-sm">{ev.title}</DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                {/* Join link check */}
                <div className="flex items-center gap-2 text-sm">
                  {hasJoinLink
                    ? <CheckCheck size={14} className="text-green-400 flex-shrink-0" />
                    : <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />}
                  <span className={hasJoinLink ? 'text-white/70' : 'text-red-300'}>
                    {hasJoinLink ? 'Join link is set' : 'No join link set (video room or backup URL missing)'}
                  </span>
                </div>

                {/* Upcoming check */}
                <div className="flex items-center gap-2 text-sm">
                  {isUpcoming
                    ? <CheckCheck size={14} className="text-green-400 flex-shrink-0" />
                    : <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />}
                  <span className={isUpcoming ? 'text-white/70' : 'text-red-300'}>
                    {isUpcoming ? 'Event is still upcoming' : 'Event start time has already passed'}
                  </span>
                </div>

                {/* Recipient count */}
                <div className="flex items-center gap-2 text-sm">
                  <Users size={14} className="text-blue-400 flex-shrink-0" />
                  <span className="text-white/70">
                    {signupCount} {signupCount === 1 ? 'person' : 'people'} will receive this email
                  </span>
                </div>

                {/* Already sent warning */}
                {alreadySent && (
                  <div className="flex items-start gap-2 text-sm bg-yellow-900/30 border border-yellow-700/40 rounded-lg p-3">
                    <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                    <span className="text-yellow-300">
                      Reminders were already sent for this event. Sending again will send duplicate emails.
                    </span>
                  </div>
                )}

                {/* Confirmation checkbox */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <Checkbox
                    id={`preflight-confirm-${ev.id}`}
                    checked={preflightConfirmed}
                    onCheckedChange={(val) => setPreflightConfirmed(!!val)}
                    className="border-white/30 data-[state=checked]:bg-[#7dd87d] data-[state=checked]:border-[#7dd87d]"
                  />
                  <Label htmlFor={`preflight-confirm-${ev.id}`} className="text-sm text-white/70 cursor-pointer">
                    I've reviewed and confirm sending to {signupCount} {signupCount === 1 ? 'person' : 'people'}
                  </Label>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setPreflightEventId(null)}
                  className="text-white/70 hover:text-white text-xs"
                >
                  Cancel
                </Button>
                <Button
                  disabled={!preflightConfirmed || reminderPending}
                  onClick={async () => {
                    await sendReminder({
                      id: ev.id,
                      customSubject: customSubject || undefined,
                      customBody: customBody || undefined,
                    });
                    setPreflightEventId(null);
                    setReminderSuccess(ev.id);
                    setReminderEditorOpen(null);
                    refetch();
                    setTimeout(() => setReminderSuccess(null), 4000);
                  }}
                  className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs h-8 px-4"
                >
                  {reminderPending
                    ? <><Loader2 size={12} className="animate-spin mr-1" /> Sending...</>
                    : `Send Reminders`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
});
