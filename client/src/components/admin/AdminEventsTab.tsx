import { memo, useCallback, useMemo, useRef, useState, useSyncExternalStore, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2,
  Plus,
  Clock,
  Bell,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePersistFn } from "@/hooks/usePersistFn";
import { AdminEventReminderCronHealth } from "@/components/admin/AdminEventReminderCronHealth";
import { AdminInteropCircle } from "@/components/admin/AdminInteropCircle";
import { AdminSeasonSchedule } from "@/components/admin/AdminSeasonSchedule";
import { SessionBoardExport } from "@/components/admin/SessionBoardExport";
import { EventCard, type AdminEvent, type EventCardActions, type ReminderDraft } from "@/components/admin/AdminEventCard";
import {
  adminEventStatusLabel,
  deriveEventTemporalPhase,
  isEventPastForAdmin,
  partitionEventsByTemporal,
} from "@/lib/eventTemporal";

const defaultForm = {
  title: '', description: '', type: 'open' as const, startTime: '', endTime: '',
  timezone: 'EDT', zoomUrl: '', riversideRoomUrl: '', youtubeUrl: '',
  season: '', episodeNumber: '', maxAttendees: '',
  guestSpeakerName: '', guestSpeakerBio: '', guestSpeakerTopic: '',
};

type EventFormData = typeof defaultForm;

/**
 * The create / edit form's values, kept outside React state the way
 * ShipFields' useTextStore keeps one field's text. The page writes it where it
 * used to call setFormData (Add Event, Edit, Cancel, after a create) and reads
 * it on save, without re-rendering; each field subscribes to its own value, so
 * a keystroke re-renders that one field and not the event list (STEERING.md
 * section 13).
 */
type EventFormStore = {
  get: () => EventFormData;
  set: (next: EventFormData | ((prev: EventFormData) => EventFormData)) => void;
  subscribe: (onChange: () => void) => () => void;
};

function createEventFormStore(initial: EventFormData): EventFormStore {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next) => {
      const resolved = typeof next === "function" ? next(value) : next;
      if (resolved === value) return;
      value = resolved;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** One value out of the form. The caller re-renders only when that value changes. */
function useEventFormValue<T>(store: EventFormStore, select: (data: EventFormData) => T): T {
  return useSyncExternalStore(store.subscribe, () => select(store.get()));
}

type EventFormTextField = Exclude<keyof EventFormData, "type">;

// The store prop is called `store`, not `form`: <input> and <textarea> have
// an HTML `form` attribute, and the two props would merge into one type.

/** An Input bound to one field of the form. */
const EventFormInput = memo(function EventFormInput({
  store,
  field,
  ...props
}: { store: EventFormStore; field: EventFormTextField } & Omit<ComponentProps<"input">, "value" | "onChange">) {
  const value = useEventFormValue(store, (f) => f[field]);
  return <Input value={value} onChange={e => store.set(f => ({ ...f, [field]: e.target.value }))} {...props} />;
});

/** A Textarea bound to one field of the form. */
const EventFormTextarea = memo(function EventFormTextarea({
  store,
  field,
  ...props
}: { store: EventFormStore; field: EventFormTextField } & Omit<ComponentProps<"textarea">, "value" | "onChange">) {
  const value = useEventFormValue(store, (f) => f[field]);
  return <Textarea value={value} onChange={e => store.set(f => ({ ...f, [field]: e.target.value }))} {...props} />;
});

/** The Type select, out of the typing path: a closed Radix Select still renders every item. */
const EventTypeSelect = memo(function EventTypeSelect({ store }: { store: EventFormStore }) {
  const type = useEventFormValue(store, (f) => f.type);
  return (
    <Select value={type} onValueChange={v => store.set(f => ({ ...f, type: v as any }))}>
      <SelectTrigger className="bg-white/10 border-white/45 text-white placeholder:text-white/70 mt-1">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="open">Open Session</SelectItem>
        <SelectItem value="episode">Incubator Episode</SelectItem>
        <SelectItem value="special">Special Event</SelectItem>
      </SelectContent>
    </Select>
  );
});

/** Save / Create. Re-renders when the title or start time turns empty or filled, not per keystroke. */
const EventFormSaveButton = memo(function EventFormSaveButton({
  store,
  isEditing,
  savePending,
  onSave,
}: {
  store: EventFormStore;
  isEditing: boolean;
  savePending: boolean;
  onSave: () => void;
}) {
  const missingRequired = useEventFormValue(store, (f) => !f.title || !f.startTime);
  return (
    <Button onClick={onSave} disabled={missingRequired || savePending}
      className="bg-green-600 hover:bg-green-700 text-white min-h-11">
      {savePending ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
      {isEditing ? 'Save Changes' : 'Create Event'}
    </Button>
  );
});

/**
 * The create / edit sheet. Its fields read the form store themselves, so the
 * sheet re-renders only when it opens or closes, switches between New and
 * Edit, or starts or stops saving.
 */
const EventFormSheet = memo(function EventFormSheet({
  open,
  isEditing,
  savePending,
  store,
  onOpenChange,
  onSave,
  onCancel,
}: {
  open: boolean;
  isEditing: boolean;
  savePending: boolean;
  store: EventFormStore;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0 bg-[#0d2818] border-green-800/40 text-white">
        <SheetHeader className="p-4 border-b border-white/10 text-left">
          <SheetTitle className="text-white text-base">{isEditing ? "Edit Event" : "New Event"}</SheetTitle>
        </SheetHeader>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <div className="md:col-span-2">
              <Label className="text-white/70 text-xs">Title *</Label>
              <EventFormInput store={store} field="title"
                placeholder="Week 1: Selection Day" className="bg-white/10 border-white/45 text-white placeholder:text-white/70 mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-white/70 text-xs">Description</Label>
              <EventFormTextarea store={store} field="description"
                rows={3} placeholder="What will this session cover?" className="bg-white/10 border-white/45 text-white placeholder:text-white/70 mt-1 resize-none" />
            </div>
            <div>
              <Label className="text-white/70 text-xs">Type</Label>
              <EventTypeSelect store={store} />
            </div>
            <div>
              <Label className="text-white/70 text-xs">Timezone display (e.g., EDT)</Label>
              <EventFormInput store={store} field="timezone"
                placeholder="EDT" className="bg-white/10 border-white/45 text-white placeholder:text-white/70 mt-1" />
            </div>
            <div>
              <Label className="text-white/70 text-xs">Start Time (local, stored as UTC)</Label>
              <EventFormInput type="datetime-local" store={store} field="startTime"
                className="bg-white/10 border-white/45 text-white placeholder:text-white/70 mt-1" />
            </div>
            <div>
              <Label className="text-white/70 text-xs">End Time (optional)</Label>
              <EventFormInput type="datetime-local" store={store} field="endTime"
                className="bg-white/10 border-white/45 text-white placeholder:text-white/70 mt-1" />
            </div>
            <div>
              <Label className="text-white/70 text-xs">Season (e.g., Season 2)</Label>
              <EventFormInput store={store} field="season"
                placeholder="Season 2" className="bg-white/10 border-white/45 text-white placeholder:text-white/70 mt-1" />
            </div>
            <div>
              <Label className="text-white/70 text-xs">Episode Number</Label>
              <EventFormInput type="number" store={store} field="episodeNumber"
                placeholder="1" className="bg-white/10 border-white/45 text-white placeholder:text-white/70 mt-1" />
            </div>
            <div>
              <Label className="text-white/70 text-xs">Max Attendees <span className="text-white/70 font-normal">(leave blank for unlimited)</span></Label>
              <EventFormInput type="number" store={store} field="maxAttendees"
                placeholder="e.g. 50 (triggers waitlist when full)" className="bg-white/10 border-white/45 text-white placeholder:text-white/70 mt-1" />
            </div>
            <div>
              <Label className="text-white/70 text-xs">Video room URL <span className="text-purple-400 font-normal">(where /join sends people for this event)</span></Label>
              <EventFormInput store={store} field="riversideRoomUrl"
                placeholder="https://…" className="bg-white/10 border-white/45 text-white placeholder:text-white/70 mt-1" />
            </div>
            <div>
              <Label className="text-white/70 text-xs">Backup meeting URL <span className="text-white/70 font-normal">(used if the video room URL is empty)</span></Label>
              <EventFormInput store={store} field="zoomUrl"
                placeholder="https://…" className="bg-white/10 border-white/45 text-white placeholder:text-white/70 mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-white/70 text-xs">YouTube URL (livestream or premiere)</Label>
              <EventFormInput store={store} field="youtubeUrl"
                placeholder="https://youtube.com/live/..." className="bg-white/10 border-white/45 text-white placeholder:text-white/70 mt-1" />
            </div>
            {/* #25. Guest Speaker Fields */}
            <div className="md:col-span-2 border-t border-white/10 pt-3 mt-1">
              <p className="text-white/70 text-xs font-medium uppercase tracking-wide mb-2">Guest Speaker (optional)</p>
            </div>
            <div>
              <Label className="text-white/70 text-xs">Speaker Name</Label>
              <EventFormInput store={store} field="guestSpeakerName"
                placeholder="Jane Doe" className="bg-white/10 border-white/45 text-white placeholder:text-white/70 mt-1" />
            </div>
            <div>
              <Label className="text-white/70 text-xs">Speaker Topic</Label>
              <EventFormInput store={store} field="guestSpeakerTopic"
                placeholder="Regenerative land economics" className="bg-white/10 border-white/45 text-white placeholder:text-white/70 mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-white/70 text-xs">Speaker Bio</Label>
              <EventFormTextarea store={store} field="guestSpeakerBio"
                rows={2} placeholder="Brief bio for the introduction email" className="bg-white/10 border-white/45 text-white placeholder:text-white/70 mt-1 resize-none" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <EventFormSaveButton store={store} isEditing={isEditing} savePending={savePending} onSave={onSave} />
            <Button variant="ghost" onClick={onCancel}
              className="text-white/60 hover:text-white min-h-11">Cancel</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
});

type SendRollup = ReturnType<typeof trpc.events.sendSeasonRollup.useMutation>["mutate"];

/** The season name box keeps its own text, so a keystroke re-renders the box and its button only. */
const SeasonRollupForm = memo(function SeasonRollupForm({ sendRollup, rollupPending }: { sendRollup: SendRollup; rollupPending: boolean }) {
  const [rollupSeason, setRollupSeason] = useState('');
  return (
    <div className="flex items-center gap-2">
      <input
        value={rollupSeason}
        onChange={e => setRollupSeason(e.target.value)}
        placeholder="Season name (e.g. Season 2)"
        className="flex-1 bg-white/5 border border-white/45 rounded-lg px-3 py-1.5 text-white text-sm placeholder:text-white/70 focus:outline-none focus:border-[#7dd87d]/50"
      />
      <button
        onClick={() => {
          if (!rollupSeason.trim()) return;
          if (window.confirm(`Send season rollup email for "${rollupSeason}" to all signups + newsletter subscribers?`)) {
            sendRollup({ season: rollupSeason.trim() });
          }
        }}
        disabled={rollupPending || !rollupSeason.trim()}
        className="bg-[#7dd87d] hover:bg-[#9de89d] disabled:opacity-50 text-[#1a472a] px-4 py-1.5 rounded-lg font-medium text-sm transition-colors whitespace-nowrap"
      >
        {rollupPending ? 'Sending...' : 'Send Rollup'}
      </button>
    </div>
  );
});

/** The season rollup card. Its mutation lives here: nothing else on the tab shows it. */
const SeasonRollupCard = memo(function SeasonRollupCard() {
  const rollupMutation = trpc.events.sendSeasonRollup.useMutation();
  return (
    <Card className="bg-[#0a1f14] border-[#7dd87d]/20 mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-[#7dd87d] text-sm flex items-center gap-2"><Bell size={14} /> Season Rollup Email</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-white/80">Sends a "here's what we built together" digest to all event signups + newsletter subscribers for a completed season.</p>
        <SeasonRollupForm sendRollup={rollupMutation.mutate} rollupPending={rollupMutation.isPending} />
        {rollupMutation.isSuccess && (
          <p className="text-[#7dd87d] text-xs">Sent to {(rollupMutation.data as any)?.sent ?? 0} recipients.</p>
        )}
      </CardContent>
    </Card>
  );
});

type MarkAttendance = ReturnType<typeof trpc.events.markAttendance.useMutation>["mutate"];

/**
 * The attendee box keeps its own text, so a keystroke re-renders the box and
 * its button, not the attendance list. The card keys it by event, so picking
 * another event starts it empty (what setAttendanceInput('') did).
 */
const AttendanceAdder = memo(function AttendanceAdder({
  attendanceEventId,
  markAttendance,
  markPending,
}: {
  attendanceEventId: number;
  markAttendance: MarkAttendance;
  markPending: boolean;
}) {
  const [attendanceInput, setAttendanceInput] = useState('');
  return (
    <>
      <label className="text-white/60 text-xs">Add attendees (one email per line, or paste a comma-separated list):</label>
      <textarea
        value={attendanceInput}
        onChange={e => setAttendanceInput(e.target.value)}
        placeholder="jane@example.com&#10;alex@example.com"
        rows={4}
        className="w-full bg-white/10 text-white text-sm rounded px-3 py-2 border border-white/45 placeholder:text-white/70 font-mono"
      />
      <button
        onClick={() => {
          const emails = attendanceInput
            .split(/[\n,;]+/)
            .map(e => e.trim())
            .filter(e => e.includes('@'));
          if (emails.length === 0) return;
          if (window.confirm(`Mark ${emails.length} attendee(s) for this event? Each will earn 33 $ReGen tokens.`)) {
            markAttendance({
              eventId: attendanceEventId,
              attendees: emails.map(email => ({ email })),
            });
            setAttendanceInput('');
          }
        }}
        disabled={markPending || !attendanceInput.trim()}
        className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm px-4 py-2 rounded font-medium"
      >
        {markPending ? 'Marking...' : 'Mark Attendance + Award Tokens'}
      </button>
    </>
  );
});

/** Attendance + token awards. Its state, queries and mutations live here: nothing else on the tab uses them. */
const EventAttendanceCard = memo(function EventAttendanceCard({ allEvents }: { allEvents: AdminEvent[] }) {
  const markAttendanceMutation = trpc.events.markAttendance.useMutation({ onSuccess: () => { refetchAttendance(); } });
  const removeAttendanceMutation = trpc.events.removeAttendance.useMutation({ onSuccess: () => { refetchAttendance(); } });
  const [attendanceEventId, setAttendanceEventId] = useState<number | null>(null);

  const { data: attendanceList = [], refetch: refetchAttendance } = trpc.events.listAttendance.useQuery(
    { eventId: attendanceEventId! },
    { enabled: attendanceEventId !== null }
  );
  const { data: tokenLeaderboard = [] } = trpc.events.tokenLeaderboard.useQuery({ limit: 10 });

  return (
    <Card className="bg-white/5 border border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-amber-400 text-sm flex items-center gap-2">
          ✦ Event Attendance + $ReGen Token Awards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-white/70 text-xs">
          Mark who actually attended a completed event. Each person earns 33 $ReGen tokens, recorded in the contribution ledger.
        </p>

        {/* Event selector */}
        <div className="flex gap-2">
          <select
            value={attendanceEventId ?? ''}
            onChange={e => { setAttendanceEventId(e.target.value ? Number(e.target.value) : null); }}
            className="flex-1 bg-white/10 text-white text-sm rounded px-3 py-2 border border-white/45"
          >
            <option value="">Select an event...</option>
            {allEvents.filter(e => e.status === 'completed' || e.status === 'live').map(e => (
              <option key={e.id} value={e.id}>{e.title} ({e.season ?? 'no season'})</option>
            ))}
          </select>
        </div>

        {attendanceEventId && (
          <div className="space-y-3">
            {/* Current attendance list */}
            {attendanceList.length > 0 && (
              <div className="bg-white/5 rounded-lg p-3 space-y-2">
                <p className="text-amber-400 text-xs font-medium">{attendanceList.length} confirmed attendees · {attendanceList.reduce((sum, a: any) => sum + (a.tokensAwarded ?? 0), 0)} $ReGen awarded</p>
                {attendanceList.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-white text-sm">{a.name || a.email}</span>
                      {a.name && <span className="text-white/60 text-xs ml-2">{a.email}</span>}
                      <span className="text-amber-400 text-xs ml-2">+{a.tokensAwarded} $ReGen</span>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm(`Remove attendance for ${a.email}? This will also remove their ${a.tokensAwarded} $ReGen tokens.`)) {
                          removeAttendanceMutation.mutate({ eventId: attendanceEventId, email: a.email });
                        }
                      }}
                      className="text-white/70 hover:text-red-400 text-xs px-2 py-1 rounded"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Add attendees input */}
            <div className="space-y-2">
              <AttendanceAdder
                key={attendanceEventId}
                attendanceEventId={attendanceEventId}
                markAttendance={markAttendanceMutation.mutate}
                markPending={markAttendanceMutation.isPending}
              />
              {markAttendanceMutation.isSuccess && (
                <p className="text-amber-400 text-xs">
                  Marked {(markAttendanceMutation.data as any)?.newlyMarked ?? 0} new attendees. {(markAttendanceMutation.data as any)?.tokensAwarded ?? 0} $ReGen awarded.
                </p>
              )}
            </div>
          </div>
        )}

        {/* $ReGen Leaderboard */}
        {tokenLeaderboard.length > 0 && (
          <div className="border-t border-white/10 pt-3">
            <p className="text-white/60 text-xs mb-2">$ReGen Leaderboard (top earners)</p>
            <div className="space-y-1">
              {tokenLeaderboard.map((entry: any, i: number) => (
                <div key={entry.email} className="flex items-center justify-between text-xs">
                  <span className="text-white/70">#{i + 1} {entry.email}</span>
                  <span className="text-amber-400 font-medium">{entry.total} $ReGen</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export function AdminEventsTab() {
  const { data: allEvents = [], refetch, isLoading } = trpc.events.adminList.useQuery();
  const { data: signupCounts = [] } = trpc.events.signupCounts.useQuery();
  const { data: autoReminders = [] } = trpc.events.listAutoReminders.useQuery();
  const { data: agendaSuggestions = [] } = trpc.events.listAgendaSuggestions.useQuery({});
  const { data: allRecordings = [] } = trpc.recordings.adminList.useQuery(undefined, { staleTime: 60_000 });
  const pastRecordingIds = useMemo(() => {
    const ids = new Set<number>();
    for (const ev of allEvents as Array<{ recordingId?: number | null }>) {
      if (ev.recordingId != null && ev.recordingId > 0) ids.add(ev.recordingId);
    }
    return [...ids];
  }, [allEvents]);
  const { data: letterStatuses = [] } = trpc.recordings.postSessionLetterStatuses.useQuery(
    { recordingIds: pastRecordingIds },
    { enabled: pastRecordingIds.length > 0, staleTime: 60_000 },
  );
  const recordingById = useMemo(() => {
    const map = new Map<number, (typeof allRecordings)[number]>();
    for (const r of allRecordings as Array<{ id: number }>) map.set(r.id, r as any);
    return map;
  }, [allRecordings]);
  const letterByRecordingId = useMemo(() => {
    const map = new Map<number, { issueId: number; status: string }>();
    for (const row of letterStatuses as Array<{ recordingId: number; issueId: number; status: string }>) {
      map.set(row.recordingId, { issueId: row.issueId, status: row.status });
    }
    return map;
  }, [letterStatuses]);
  const createMutation = trpc.events.create.useMutation({ onSuccess: () => { refetch(); setShowCreate(false); eventForm.set(defaultForm); } });
  const updateMutation = trpc.events.update.useMutation({ onSuccess: () => { refetch(); setEditingId(null); } });
  const deleteMutation = trpc.events.delete.useMutation({ onSuccess: () => refetch() });
  const reminderMutation = trpc.events.sendReminders.useMutation();
  const agendaUpdateMutation = trpc.events.updateAgendaSuggestion.useMutation({ onSuccess: () => { refetch(); } });
  const followupMutation = trpc.events.sendFollowup.useMutation();
  const speakerIntroMutation = trpc.events.sendSpeakerIntro.useMutation();
  const [followupSuccess, setFollowupSuccess] = useState<number | null>(null);
  const [speakerIntroSuccess, setSpeakerIntroSuccess] = useState<number | null>(null);
  const [scheduleSuccess, setScheduleSuccess] = useState<number | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [rosterEventId, setRosterEventId] = useState<number | null>(null);
  // The form's values live in a small store, not in this component's state:
  // a keystroke in the sheet re-renders that one field, not the event list.
  const [eventForm] = useState(() => createEventFormStore(defaultForm));
  const [reminderSuccess, setReminderSuccess] = useState<number | null>(null);
  const [eventsFilter, setEventsFilter] = useState<"upcoming" | "past" | "all">(() => {
    try {
      const f = new URLSearchParams(window.location.search).get("filter");
      if (f === "past" || f === "upcoming" || f === "all") return f;
    } catch { /* SSR / no window */ }
    return "upcoming";
  });
  const [pastExpanded, setPastExpanded] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get("filter") === "past";
    } catch {
      return false;
    }
  });
  const [reminderEditorOpen, setReminderEditorOpen] = useState<number | null>(null);
  const [autoReminderOpen, setAutoReminderOpen] = useState<number | null>(null);
  // The reminder editor keeps its subject, body and send time in its own
  // state; this holds them while it is closed (see ReminderDraft).
  const reminderDraft = useRef<ReminderDraft>({ customSubject: '', customBody: '', scheduleFor: '' });
  const [showAgendaFor, setShowAgendaFor] = useState<number | null>(null);
  const [preflightEventId, setPreflightEventId] = useState<number | null>(null);
  const [preflightConfirmed, setPreflightConfirmed] = useState(false);

  const { data: roster, isLoading: rosterLoading } = trpc.events.projectRoster.useQuery(
    { eventId: rosterEventId! },
    { enabled: rosterEventId !== null }
  );
  const countMap = Object.fromEntries(signupCounts.map(r => [r.eventId, r.count]));
  const autoReminderMap = Object.fromEntries(autoReminders.map(r => [r.eventId, r]));
  const { upcoming: upcomingEvents, past: pastEvents } = partitionEventsByTemporal(allEvents);


  const startEdit = useCallback((ev: any) => {
    setEditingId(ev.id);
    eventForm.set({
      title: ev.title ?? '',
      description: ev.description ?? '',
      type: ev.type ?? 'open',
      startTime: ev.startTime ? new Date(ev.startTime).toISOString().slice(0, 16) : '',
      endTime: ev.endTime ? new Date(ev.endTime).toISOString().slice(0, 16) : '',
      timezone: ev.timezone ?? 'EDT',
      zoomUrl: ev.zoomUrl ?? '',
      riversideRoomUrl: ev.riversideRoomUrl ?? '',
      youtubeUrl: ev.youtubeUrl ?? '',
      season: ev.season ?? '',
      maxAttendees: (ev as any).maxAttendees ? String((ev as any).maxAttendees) : '',
      episodeNumber: ev.episodeNumber ? String(ev.episodeNumber) : '',
      guestSpeakerName: ev.guestSpeakerName ?? '',
      guestSpeakerBio: ev.guestSpeakerBio ?? '',
      guestSpeakerTopic: ev.guestSpeakerTopic ?? '',
    });
  }, [eventForm]);

  // Reads editingId and the form at the moment Save is pressed (usePersistFn
  // always calls the latest version), while the sheet gets a stable handler.
  const handleSave = usePersistFn(() => {
    const formData = eventForm.get();
    const payload = {
      title: formData.title,
      description: formData.description || undefined,
      type: formData.type,
      startTime: formData.startTime,
      endTime: formData.endTime || undefined,
      timezone: formData.timezone,
      zoomUrl: formData.zoomUrl || undefined,
      riversideRoomUrl: formData.riversideRoomUrl || undefined,
      youtubeUrl: formData.youtubeUrl || undefined,
      season: formData.season || undefined,
      maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : undefined,
      episodeNumber: formData.episodeNumber ? parseInt(formData.episodeNumber) : undefined,
      guestSpeakerName: formData.guestSpeakerName || undefined,
      guestSpeakerBio: formData.guestSpeakerBio || undefined,
      guestSpeakerTopic: formData.guestSpeakerTopic || undefined,
    };
    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload as any);
    }
  });

  const onSheetOpenChange = useCallback((open: boolean) => {
    if (!open) { setShowCreate(false); setEditingId(null); }
  }, []);
  const cancelForm = useCallback(() => {
    setShowCreate(false); setEditingId(null); eventForm.set(defaultForm);
  }, [eventForm]);

  // Every member is a setter, the draft ref, or a function React Query keeps
  // the same across renders (mutate, mutateAsync, refetch), so this object is
  // stable and the memoized cards re-render only when their own values change.
  const cardActions = useMemo<EventCardActions>(() => ({
    startEdit,
    setRosterEventId,
    setReminderEditorOpen,
    setAutoReminderOpen,
    setReminderSuccess,
    setFollowupSuccess,
    setSpeakerIntroSuccess,
    setScheduleSuccess,
    setPreflightEventId,
    setPreflightConfirmed,
    sendFollowup: followupMutation.mutate,
    sendSpeakerIntro: speakerIntroMutation.mutate,
    deleteEvent: deleteMutation.mutate,
    sendReminder: reminderMutation.mutateAsync,
    refetch,
    reminderDraft,
  }), [startEdit, followupMutation.mutate, speakerIntroMutation.mutate, deleteMutation.mutate, reminderMutation.mutateAsync, refetch]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1a472a]">Events</h2>
          <p className="text-sm text-[#1a472a]/80">Manage schedule events. Events appear on the Schedule page automatically.</p>
        </div>
        <Button onClick={() => { setShowCreate(true); setEditingId(null); eventForm.set(defaultForm); }}
          className="bg-green-600 hover:bg-green-700 text-white">
          <Plus size={14} className="mr-1" /> Add Event
        </Button>
      </div>

      {/* Create / Edit Form: one-column sheet attached to Add Event */}
      <EventFormSheet
        open={showCreate || editingId !== null}
        isEditing={editingId !== null}
        savePending={createMutation.isPending || updateMutation.isPending}
        store={eventForm}
        onOpenChange={onSheetOpenChange}
        onSave={handleSave}
        onCancel={cancelForm}
      />

      {/* Events List */}
      {isLoading && <div className="text-center py-8 text-[#1a472a]/70"><Loader2 size={24} className="animate-spin mx-auto" /></div>}

      {(() => {
        // Each card is memoized (AdminEventCard.tsx). The clock-based values
        // are worked out here, on every render of the tab as before, so a
        // card's badge and grouping never disagree.
        const renderEventCard = (ev: (typeof allEvents)[number]) => (
          <EventCard
            key={ev.id}
            ev={ev}
            temporalPhase={deriveEventTemporalPhase(ev as any)}
            isPast={isEventPastForAdmin(ev as any)}
            displayStatus={adminEventStatusLabel(ev as any)}
            signupCount={Number(countMap[ev.id] ?? 0)}
            autoReminder={autoReminderMap[ev.id]}
            recordingById={recordingById}
            letterByRecordingId={letterByRecordingId}
            rosterOpen={rosterEventId === ev.id}
            roster={rosterEventId === ev.id ? roster : undefined}
            rosterLoading={rosterEventId === ev.id && rosterLoading}
            reminderEditorOpen={reminderEditorOpen === ev.id}
            autoReminderOpen={autoReminderOpen === ev.id}
            justSentReminders={reminderSuccess === ev.id}
            justSentFollowup={followupSuccess === ev.id}
            justSentSpeakerIntro={speakerIntroSuccess === ev.id}
            justScheduled={scheduleSuccess === ev.id}
            preflightOpen={preflightEventId === ev.id}
            preflightConfirmed={preflightEventId === ev.id && preflightConfirmed}
            followupPending={followupMutation.isPending}
            speakerIntroPending={speakerIntroMutation.isPending}
            reminderPending={reminderEditorOpen === ev.id && reminderMutation.isPending}
            actions={cardActions}
          />
        );

        const showUpcoming = eventsFilter === "upcoming" || eventsFilter === "all";
        const showPastSection = eventsFilter === "past" || eventsFilter === "all"
          || (eventsFilter === "upcoming" && pastEvents.length > 0);
        const pastCollapsed = eventsFilter === "upcoming" && !pastExpanded;

        return (
          <div className="space-y-6">
            <div
              className="flex flex-wrap items-center gap-2"
              role="tablist"
              aria-label="Filter events by time"
              data-testid="admin-events-filter"
            >
              {([
                ["upcoming", `Upcoming (${upcomingEvents.length})`],
                ["past", `Past (${pastEvents.length})`],
                ["all", `All (${allEvents.length})`],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={eventsFilter === value}
                  data-testid={`admin-events-filter-${value}`}
                  onClick={() => {
                    setEventsFilter(value);
                    if (value !== "upcoming") setPastExpanded(true);
                    try {
                      const url = new URL(window.location.href);
                      url.searchParams.set("tab", "events");
                      url.searchParams.set("filter", value);
                      window.history.replaceState(null, "", url.pathname + url.search);
                    } catch { /* history unavailable */ }
                  }}
                  className={`min-h-11 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                    eventsFilter === value
                      ? "bg-[#1a472a] text-[#7dd87d]"
                      : "bg-[#1a472a]/10 text-[#1a472a] hover:bg-[#1a472a]/15"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {showUpcoming && (
              <div className="space-y-3" data-testid="admin-events-upcoming">
                <div className="rounded-lg bg-[#0a1f14] border border-[#7dd87d]/35 px-3 py-2">
                  <h3 className="text-base md:text-lg font-bold text-white tracking-wide">
                    Upcoming <span className="text-[#7dd87d]">({upcomingEvents.length})</span>
                  </h3>
                  <p className="text-xs text-white/70 mt-0.5">Live and not-yet-started sessions. Reminder actions available here.</p>
                </div>
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-[#1a472a]/70">No upcoming events.</p>
                ) : (
                  upcomingEvents.map(renderEventCard)
                )}
              </div>
            )}

            {showPastSection && pastEvents.length > 0 && (
              <div className="space-y-3" data-testid="admin-events-past">
                <div className="rounded-lg bg-[#0a1f14] border border-white/15 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-white tracking-wide">
                      Past <span className="text-white/70">({pastEvents.length})</span>
                    </h3>
                    <p className="text-xs text-white/60 mt-0.5">
                      Derived from start/end times (not only cron status). Send Reminders is hidden for past events.
                    </p>
                  </div>
                  {eventsFilter === "upcoming" && (
                    <button
                      type="button"
                      data-testid="admin-events-past-toggle"
                      className="min-h-11 rounded-lg border border-white/25 px-3 text-sm font-medium text-[#7dd87d] hover:bg-white/5"
                      onClick={() => setPastExpanded((v) => !v)}
                    >
                      {pastCollapsed ? `Show Past (${pastEvents.length})` : "Hide Past"}
                    </button>
                  )}
                </div>
                {!pastCollapsed && pastEvents.map(renderEventCard)}
              </div>
            )}

            {eventsFilter === "past" && pastEvents.length === 0 && (
              <p className="text-sm text-[#1a472a]/70" data-testid="admin-events-past-empty">No past events.</p>
            )}
          </div>
        );
      })()}

      {/* Live cron health + setup */}
      <div className="mt-4 space-y-3">
        <AdminEventReminderCronHealth />
      </div>
      <AdminSeasonSchedule />
      <SessionBoardExport />
      <AdminInteropCircle />
      <Card className="bg-[#0a1f14] border-yellow-800/30 mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-yellow-400 text-sm flex items-center gap-2"><Clock size={14} /> Auto-Reminder Cron Setup</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-white/60 space-y-1">
          <p>Reminders send automatically if you set up the Railway cron job. Auto-reminders on each event (7d / 3d / 24h / 1h / 33m, with Season 2 / Open Access / custom audiences) use this same endpoint.</p>
          <ol className="list-decimal list-inside space-y-1 text-white/70">
            <li>In Railway: New Service → Cron Job</li>
            <li>Schedule: <code className="bg-white/10 px-1 rounded">0 * * * *</code> (hourly)</li>
            <li>Command: <code className="bg-white/10 px-1 rounded break-all">curl -X POST https://regencivics.earth/api/cron/event-reminders -H "Authorization: Bearer $CRON_SECRET"</code></li>
            <li>Add <code className="bg-white/10 px-1 rounded">CRON_SECRET</code> as an env var on both services (any secure random string)</li>
          </ol>
          <p className="mt-2">The same cron job also auto-updates event status (upcoming → live → completed) based on start/end times.</p>
        </CardContent>
      </Card>

      {/* #10. Season Rollup Email */}
      <SeasonRollupCard />

      {/* #9. Agenda Suggestions from Community */}
      {agendaSuggestions.length > 0 && (
        <Card className="bg-[#0a1f14] border-purple-800/30 mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-purple-400 text-sm flex items-center gap-2">
              <Bell size={14} /> Agenda Suggestions ({agendaSuggestions.filter((s: any) => s.status === 'pending').length} pending)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {agendaSuggestions.map((s: any) => {
              const eventTitle = allEvents.find(e => e.id === s.eventId)?.title ?? `Event #${s.eventId}`;
              return (
                <div key={s.id} className={`flex items-start gap-3 p-3 rounded-lg border ${s.status === 'pending' ? 'bg-white/5 border-white/10' : s.status === 'approved' ? 'bg-green-900/20 border-green-800/30 opacity-60' : 'bg-red-900/10 border-red-800/20 opacity-50'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/70 text-xs mb-1">{eventTitle} · {s.authorName || s.authorEmail}</p>
                    <p className="text-white text-sm">{s.suggestion}</p>
                  </div>
                  {s.status === 'pending' && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => agendaUpdateMutation.mutate({ id: s.id, status: 'approved' })}
                        className="bg-green-700 hover:bg-green-600 text-white text-xs px-2 py-1 rounded">✓</button>
                      <button onClick={() => agendaUpdateMutation.mutate({ id: s.id, status: 'rejected' })}
                        className="bg-red-800 hover:bg-red-700 text-white text-xs px-2 py-1 rounded">✕</button>
                    </div>
                  )}
                  {s.status !== 'pending' && (
                    <span className={`text-xs px-2 py-1 rounded ${s.status === 'approved' ? 'text-green-400' : 'text-red-400'}`}>{s.status}</span>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* #8 revised. Attendance Tracking + $ReGen Token Awards */}
      <EventAttendanceCard allEvents={allEvents} />
    </div>
  );
}
