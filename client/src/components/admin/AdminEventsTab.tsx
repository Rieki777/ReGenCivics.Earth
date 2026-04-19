import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Edit,
  Loader2,
  Plus,
  Trash2,
  Send,
  Clock,
  Bell,
  ClipboardList,
  CheckCheck,
  AlertTriangle,
  Users,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

export function AdminEventsTab() {
  const { data: allEvents = [], refetch, isLoading } = trpc.events.adminList.useQuery();
  const { data: signupCounts = [] } = trpc.events.signupCounts.useQuery();
  const { data: agendaSuggestions = [] } = trpc.events.listAgendaSuggestions.useQuery({});
  const createMutation = trpc.events.create.useMutation({ onSuccess: () => { refetch(); setShowCreate(false); setFormData(defaultForm); } });
  const updateMutation = trpc.events.update.useMutation({ onSuccess: () => { refetch(); setEditingId(null); } });
  const deleteMutation = trpc.events.delete.useMutation({ onSuccess: () => refetch() });
  const reminderMutation = trpc.events.sendReminders.useMutation();
  const agendaUpdateMutation = trpc.events.updateAgendaSuggestion.useMutation({ onSuccess: () => { refetch(); } });
  const rollupMutation = trpc.events.sendSeasonRollup.useMutation();
  const followupMutation = trpc.events.sendFollowup.useMutation();
  const markAttendanceMutation = trpc.events.markAttendance.useMutation({ onSuccess: () => { refetchAttendance(); } });
  const removeAttendanceMutation = trpc.events.removeAttendance.useMutation({ onSuccess: () => { refetchAttendance(); } });
  const speakerIntroMutation = trpc.events.sendSpeakerIntro.useMutation();
  const [followupSuccess, setFollowupSuccess] = useState<number | null>(null);
  const [checkinCopied, setCheckinCopied] = useState<number | null>(null);
  const [speakerIntroSuccess, setSpeakerIntroSuccess] = useState<number | null>(null);
  const [scheduleFor, setScheduleFor] = useState('');
  const [scheduleSuccess, setScheduleSuccess] = useState<number | null>(null);

  const defaultForm = {
    title: '', description: '', type: 'open' as const, startTime: '', endTime: '',
    timezone: 'EDT', zoomUrl: '', riversideRoomUrl: '', youtubeUrl: '',
    season: '', episodeNumber: '', maxAttendees: '',
    guestSpeakerName: '', guestSpeakerBio: '', guestSpeakerTopic: '',
  };

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [attendanceEventId, setAttendanceEventId] = useState<number | null>(null);
  const [attendanceInput, setAttendanceInput] = useState('');
  const [formData, setFormData] = useState(defaultForm);
  const [reminderSuccess, setReminderSuccess] = useState<number | null>(null);
  const [reminderEditorOpen, setReminderEditorOpen] = useState<number | null>(null);
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [rollupSeason, setRollupSeason] = useState('');
  const [showAgendaFor, setShowAgendaFor] = useState<number | null>(null);
  const [preflightEventId, setPreflightEventId] = useState<number | null>(null);
  const [preflightConfirmed, setPreflightConfirmed] = useState(false);

  const { data: attendanceList = [], refetch: refetchAttendance } = trpc.events.listAttendance.useQuery(
    { eventId: attendanceEventId! },
    { enabled: attendanceEventId !== null }
  );
  const { data: tokenLeaderboard = [] } = trpc.events.tokenLeaderboard.useQuery({ limit: 10 });

  const countMap = Object.fromEntries(signupCounts.map(r => [r.eventId, r.count]));

  function startEdit(ev: any) {
    setEditingId(ev.id);
    setFormData({
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
  }

  function handleSave() {
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
  }

  const typeColors: Record<string, string> = {
    open: 'bg-blue-500/20 text-blue-300',
    episode: 'bg-green-500/20 text-green-300',
    special: 'bg-purple-500/20 text-purple-300',
  };
  const statusColors: Record<string, string> = {
    upcoming: 'bg-yellow-500/20 text-yellow-300',
    live: 'bg-red-500/20 text-red-300 animate-pulse',
    completed: 'bg-gray-500/20 text-gray-300',
    cancelled: 'bg-gray-700/30 text-gray-500',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Events</h2>
          <p className="text-sm text-white/50">Manage schedule events. Events appear on the Schedule page automatically.</p>
        </div>
        <Button onClick={() => { setShowCreate(true); setEditingId(null); setFormData(defaultForm); }}
          className="bg-green-600 hover:bg-green-700 text-white">
          <Plus size={14} className="mr-1" /> Add Event
        </Button>
      </div>

      {/* Create / Edit Form */}
      {(showCreate || editingId !== null) && (
        <Card className="bg-[#0d2818] border-green-800/40">
          <CardHeader>
            <CardTitle className="text-white text-base">{editingId !== null ? 'Edit Event' : 'New Event'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label className="text-white/70 text-xs">Title *</Label>
                <Input value={formData.title} onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                  placeholder="Week 1: Selection Day" className="bg-white/5 border-white/20 text-white mt-1" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-white/70 text-xs">Description</Label>
                <Textarea value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="What will this session cover?" className="bg-white/5 border-white/20 text-white mt-1 resize-none" />
              </div>
              <div>
                <Label className="text-white/70 text-xs">Type</Label>
                <Select value={formData.type} onValueChange={v => setFormData(f => ({ ...f, type: v as any }))}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open Session</SelectItem>
                    <SelectItem value="episode">Incubator Episode</SelectItem>
                    <SelectItem value="special">Special Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70 text-xs">Timezone display (e.g., EDT)</Label>
                <Input value={formData.timezone} onChange={e => setFormData(f => ({ ...f, timezone: e.target.value }))}
                  placeholder="EDT" className="bg-white/5 border-white/20 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/70 text-xs">Start Time (local, stored as UTC)</Label>
                <Input type="datetime-local" value={formData.startTime} onChange={e => setFormData(f => ({ ...f, startTime: e.target.value }))}
                  className="bg-white/5 border-white/20 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/70 text-xs">End Time (optional)</Label>
                <Input type="datetime-local" value={formData.endTime} onChange={e => setFormData(f => ({ ...f, endTime: e.target.value }))}
                  className="bg-white/5 border-white/20 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/70 text-xs">Season (e.g., Season 2)</Label>
                <Input value={formData.season} onChange={e => setFormData(f => ({ ...f, season: e.target.value }))}
                  placeholder="Season 2" className="bg-white/5 border-white/20 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/70 text-xs">Episode Number</Label>
                <Input type="number" value={formData.episodeNumber} onChange={e => setFormData(f => ({ ...f, episodeNumber: e.target.value }))}
                  placeholder="1" className="bg-white/5 border-white/20 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/70 text-xs">Max Attendees <span className="text-white/55 font-normal">(leave blank for unlimited)</span></Label>
                <Input type="number" value={formData.maxAttendees} onChange={e => setFormData(f => ({ ...f, maxAttendees: e.target.value }))}
                  placeholder="e.g. 50 (triggers waitlist when full)" className="bg-white/5 border-white/20 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/70 text-xs">Riverside Room URL <span className="text-purple-400 font-normal">(primary join link)</span></Label>
                <Input value={formData.riversideRoomUrl} onChange={e => setFormData(f => ({ ...f, riversideRoomUrl: e.target.value }))}
                  placeholder="https://riverside.fm/studio/..." className="bg-white/5 border-white/20 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/70 text-xs">Zoom URL <span className="text-white/55 font-normal">(fallback, only shown if no Riverside)</span></Label>
                <Input value={formData.zoomUrl} onChange={e => setFormData(f => ({ ...f, zoomUrl: e.target.value }))}
                  placeholder="https://us06web.zoom.us/..." className="bg-white/5 border-white/20 text-white mt-1" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-white/70 text-xs">YouTube URL (livestream or premiere)</Label>
                <Input value={formData.youtubeUrl} onChange={e => setFormData(f => ({ ...f, youtubeUrl: e.target.value }))}
                  placeholder="https://youtube.com/live/..." className="bg-white/5 border-white/20 text-white mt-1" />
              </div>
              {/* #25. Guest Speaker Fields */}
              <div className="md:col-span-2 border-t border-white/10 pt-3 mt-1">
                <p className="text-white/50 text-xs font-medium uppercase tracking-wide mb-2">Guest Speaker (optional)</p>
              </div>
              <div>
                <Label className="text-white/70 text-xs">Speaker Name</Label>
                <Input value={formData.guestSpeakerName} onChange={e => setFormData(f => ({ ...f, guestSpeakerName: e.target.value }))}
                  placeholder="Jane Doe" className="bg-white/5 border-white/20 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/70 text-xs">Speaker Topic</Label>
                <Input value={formData.guestSpeakerTopic} onChange={e => setFormData(f => ({ ...f, guestSpeakerTopic: e.target.value }))}
                  placeholder="Regenerative land economics" className="bg-white/5 border-white/20 text-white mt-1" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-white/70 text-xs">Speaker Bio</Label>
                <Textarea value={formData.guestSpeakerBio} onChange={e => setFormData(f => ({ ...f, guestSpeakerBio: e.target.value }))}
                  rows={2} placeholder="Brief bio for the introduction email" className="bg-white/5 border-white/20 text-white mt-1 resize-none" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={!formData.title || !formData.startTime || createMutation.isPending || updateMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white">
                {(createMutation.isPending || updateMutation.isPending) ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                {editingId !== null ? 'Save Changes' : 'Create Event'}
              </Button>
              <Button variant="ghost" onClick={() => { setShowCreate(false); setEditingId(null); setFormData(defaultForm); }}
                className="text-white/60 hover:text-white">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events List */}
      {isLoading && <div className="text-center py-8 text-white/60"><Loader2 size={24} className="animate-spin mx-auto" /></div>}

      <div className="space-y-2">
        {allEvents.map(ev => {
          const signupCount = Number(countMap[ev.id] ?? 0);
          const startDate = ev.startTime ? new Date(ev.startTime) : null;
          const dateStr = startDate ? startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : '-';
          const timeStr = startDate ? startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : '';
          return (
            <Card key={ev.id} className={`bg-[#0a1f14] border-white/10 ${ev.status === 'cancelled' ? 'opacity-50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[ev.type] ?? ''}`}>{ev.type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[ev.status] ?? ''}`}>{ev.status}</span>
                      {ev.season && <span className="text-xs text-white/60">{ev.season}{ev.episodeNumber ? ` · Ep ${ev.episodeNumber}` : ''}</span>}
                    </div>
                    <p className="font-medium text-white text-sm truncate">{ev.title}</p>
                    <p className="text-xs text-white/50 mt-0.5">{dateStr} {timeStr} {ev.timezone ?? ''}</p>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-white/60">
                      <span><Bell size={11} className="inline mr-1" />{signupCount} reminder signup{signupCount !== 1 ? 's' : ''}</span>
                      {ev.riversideRoomUrl && <a href={ev.riversideRoomUrl} target="_blank" rel="noreferrer" className="text-green-400 hover:underline">Riverside room ↗</a>}
                      {ev.youtubeUrl && <a href={ev.youtubeUrl} target="_blank" rel="noreferrer" className="text-red-400 hover:underline">YouTube ↗</a>}
                      {ev.recordingId && <span className="text-purple-400">Recording #{ev.recordingId}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:flex-col sm:items-end">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(ev)}
                      className="text-white/60 hover:text-white hover:bg-white/10 h-7 px-2 text-xs">
                      <Edit size={11} className="mr-1" /> Edit
                    </Button>
                    {reminderSuccess === ev.id
                      ? <Button size="sm" variant="ghost" disabled className="text-yellow-400 h-7 px-2 text-xs">
                          <CheckCheck size={11} className="mr-1" /> Sent!
                        </Button>
                      : <Button size="sm" variant="ghost"
                          onClick={() => {
                            setReminderEditorOpen(reminderEditorOpen === ev.id ? null : ev.id);
                            if (reminderEditorOpen !== ev.id) {
                              setCustomSubject(`Reminder: ${ev.title} is tomorrow`);
                              setCustomBody(ev.description ?? '');
                              if (ev.startTime) {
                                const dayBefore = new Date(ev.startTime);
                                dayBefore.setDate(dayBefore.getDate() - 1);
                                dayBefore.setHours(9, 0, 0, 0);
                                setScheduleFor(dayBefore.toISOString().slice(0, 16));
                              }
                            }
                          }}
                          className="text-white/60 hover:text-yellow-300 hover:bg-yellow-500/10 h-7 px-2 text-xs">
                          <Bell size={11} className="mr-1" />
                          {reminderEditorOpen === ev.id ? 'Cancel' : 'Send Reminders'}
                        </Button>}
                    {/* #17. Send Follow-up for completed events */}
                    {ev.status === 'completed' && (
                      followupSuccess === ev.id
                        ? <Button size="sm" variant="ghost" disabled className="text-green-400 h-7 px-2 text-xs">
                            <CheckCheck size={11} className="mr-1" /> Follow-up Sent!
                          </Button>
                        : <Button size="sm" variant="ghost"
                            onClick={() => {
                              if (confirm(`Send "How was it?" follow-up email to everyone who signed up for "${ev.title}"?`)) {
                                followupMutation.mutate({ eventId: ev.id }, {
                                  onSuccess: () => {
                                    setFollowupSuccess(ev.id);
                                    setTimeout(() => setFollowupSuccess(null), 4000);
                                  },
                                });
                              }
                            }}
                            disabled={followupMutation.isPending}
                            className="text-white/60 hover:text-green-300 hover:bg-green-500/10 h-7 px-2 text-xs">
                            <Send size={11} className="mr-1" />
                            {followupMutation.isPending ? 'Sending...' : 'Send Follow-up'}
                          </Button>
                    )}
                    {/* #25. Send Speaker Intro (only if event has a guest speaker) */}
                    {(ev as any).guestSpeakerName && (
                      speakerIntroSuccess === ev.id
                        ? <Button size="sm" variant="ghost" disabled className="text-purple-400 h-7 px-2 text-xs">
                            <CheckCheck size={11} className="mr-1" /> Speaker Intro Sent!
                          </Button>
                        : <Button size="sm" variant="ghost"
                            onClick={() => {
                              if (confirm(`Send speaker introduction email for "${(ev as any).guestSpeakerName}" to all signups?`)) {
                                speakerIntroMutation.mutate({ eventId: ev.id }, {
                                  onSuccess: () => {
                                    setSpeakerIntroSuccess(ev.id);
                                    setTimeout(() => setSpeakerIntroSuccess(null), 4000);
                                  },
                                });
                              }
                            }}
                            disabled={speakerIntroMutation.isPending}
                            className="text-white/60 hover:text-purple-300 hover:bg-purple-500/10 h-7 px-2 text-xs">
                            <Users size={11} className="mr-1" />
                            {speakerIntroMutation.isPending ? 'Sending...' : 'Send Speaker Intro'}
                          </Button>
                    )}
                    <Button size="sm" variant="ghost"
                      onClick={() => { if (confirm(`Delete "${ev.title}"?`)) deleteMutation.mutate({ id: ev.id }); }}
                      className="text-white/60 hover:text-red-400 hover:bg-red-500/10 h-7 px-2 text-xs">
                      <Trash2 size={11} className="mr-1" /> Delete
                    </Button>
                  </div>
                </div>

                {/* Guest speaker info display */}
                {(ev as any).guestSpeakerName && (
                  <div className="border-t border-white/10 px-4 py-2">
                    <span className="text-xs text-purple-400">Guest: {(ev as any).guestSpeakerName}{(ev as any).guestSpeakerTopic ? `, ${(ev as any).guestSpeakerTopic}` : ''}</span>
                  </div>
                )}

                {/* #16. Check-in URL and copy button */}
                {(ev as any).checkinToken && (
                  <div className="border-t border-white/10 px-4 py-2 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-white/60">Check-in URL:</span>
                    <code className="text-xs text-[#7dd87d] bg-white/5 px-2 py-0.5 rounded break-all">
                      {window.location.origin}/checkin/{(ev as any).checkinToken}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/checkin/${(ev as any).checkinToken}`);
                        setCheckinCopied(ev.id);
                        setTimeout(() => setCheckinCopied(null), 2000);
                      }}
                      className="text-xs text-white/60 hover:text-[#7dd87d] transition-colors flex items-center gap-1"
                    >
                      {checkinCopied === ev.id ? <><CheckCheck size={11} /> Copied!</> : <><ClipboardList size={11} /> Copy</>}
                    </button>
                  </div>
                )}

                {/* Inline email editor */}
                {reminderEditorOpen === ev.id && (
                  <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-3">
                    <p className="text-xs text-white/50 font-medium uppercase tracking-wide">Preview &amp; Edit Reminder Email</p>
                    <div>
                      <Label className="text-white/60 text-xs">Subject line</Label>
                      <Input
                        value={customSubject}
                        onChange={e => setCustomSubject(e.target.value)}
                        className="bg-white/5 border-white/20 text-white text-sm mt-1"
                        placeholder={`Reminder: ${ev.title} is tomorrow`}
                      />
                    </div>
                    <div>
                      <Label className="text-white/60 text-xs">Body paragraph (shown below the date)</Label>
                      <Textarea
                        value={customBody}
                        onChange={e => setCustomBody(e.target.value)}
                        rows={4}
                        className="bg-white/5 border-white/20 text-white text-sm mt-1 resize-none"
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
                        <p className="text-gray-500 text-sm m-0">
                          {ev.startTime ? new Date(ev.startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                          {ev.startTime ? ` at ${new Date(ev.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} ${ev.timezone ?? ''}` : ''}
                        </p>
                        {(customBody || ev.description) && (
                          <p className="text-gray-600 text-sm leading-relaxed m-0">{customBody || ev.description}</p>
                        )}
                        <div className="flex gap-2 pt-1 flex-wrap">
                          <span className="bg-[#0a66c2] text-white px-4 py-2 rounded-lg text-xs font-bold">Join on Zoom</span>
                          <span className="border-2 border-[#1a472a] text-[#1a472a] px-4 py-2 rounded-lg text-xs font-bold">View Schedule</span>
                        </div>
                      </div>
                      <div className="bg-[#f0f7f0] px-5 py-3 text-center">
                        <p className="text-gray-300 text-xs m-0">You signed up for a reminder for this event.</p>
                      </div>
                    </div>

                    <p className="text-xs text-white/60">Subject: <span className="text-white/70">{customSubject || `Reminder: ${ev.title} is tomorrow`}</span></p>
                    <p className="text-xs text-white/60">Sending to <span className="text-white/70">{Number(countMap[ev.id] ?? 0)} people</span> who signed up for this event.</p>

                    <div className="flex flex-wrap items-end gap-2">
                      <Button
                        disabled={reminderMutation.isPending || Number(countMap[ev.id] ?? 0) === 0}
                        onClick={() => { setPreflightEventId(ev.id); setPreflightConfirmed(false); }}
                        className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs h-8 px-4"
                      >
                        {Number(countMap[ev.id] ?? 0) === 0
                          ? 'No signups yet'
                          : `Review & Send to ${Number(countMap[ev.id] ?? 0)} ${Number(countMap[ev.id] ?? 0) === 1 ? 'person' : 'people'}`}
                      </Button>

                      {/* #24. Schedule for later */}
                      <div className="flex items-end gap-1.5">
                        <div>
                          <Label className="text-white/60 text-xs">Schedule for...</Label>
                          <Input
                            type="datetime-local"
                            value={scheduleFor}
                            onChange={e => setScheduleFor(e.target.value)}
                            className="bg-white/5 border-white/20 text-white text-xs h-8 mt-0.5 w-48"
                          />
                        </div>
                        <Button
                          disabled={!scheduleFor || reminderMutation.isPending || Number(countMap[ev.id] ?? 0) === 0}
                          onClick={async () => {
                            const result = await reminderMutation.mutateAsync({
                              id: ev.id,
                              customSubject: customSubject || undefined,
                              customBody: customBody || undefined,
                              scheduledFor: new Date(scheduleFor).toISOString(),
                            });
                            setScheduleSuccess(ev.id);
                            setReminderEditorOpen(null);
                            setScheduleFor('');
                            setTimeout(() => setScheduleSuccess(null), 6000);
                          }}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 px-3"
                        >
                          <Clock size={11} className="mr-1" /> Schedule
                        </Button>
                      </div>
                    </div>
                    {scheduleSuccess === ev.id && (
                      <p className="text-xs text-blue-400">Reminder scheduled. It will send at the selected time (lost if server restarts).</p>
                    )}

                    {/* #22 Preflight checklist dialog */}
                    {preflightEventId === ev.id && (() => {
                      const signupCount = Number(countMap[ev.id] ?? 0);
                      const hasJoinLink = !!(ev.riversideRoomUrl || ev.zoomUrl);
                      const isUpcoming = new Date(ev.startTime) > new Date();
                      const alreadySent = !!(ev as any).reminderSent;

                      return (
                        <Dialog open onOpenChange={(open) => { if (!open) setPreflightEventId(null); }}>
                          <DialogContent className="bg-[#0a1f14] border-white/20 text-white max-w-md">
                            <DialogHeader>
                              <DialogTitle className="text-white text-base">Preflight Check: Send Reminders</DialogTitle>
                              <DialogDescription className="text-white/50 text-sm">{ev.title}</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-3 py-2">
                              {/* Join link check */}
                              <div className="flex items-center gap-2 text-sm">
                                {hasJoinLink
                                  ? <CheckCheck size={14} className="text-green-400 flex-shrink-0" />
                                  : <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />}
                                <span className={hasJoinLink ? 'text-white/70' : 'text-red-300'}>
                                  {hasJoinLink ? 'Join link is set' : 'No join link set (Zoom or Riverside URL missing)'}
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
                                className="text-white/50 hover:text-white text-xs"
                              >
                                Cancel
                              </Button>
                              <Button
                                disabled={!preflightConfirmed || reminderMutation.isPending}
                                onClick={async () => {
                                  await reminderMutation.mutateAsync({
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
                                {reminderMutation.isPending
                                  ? <><Loader2 size={12} className="animate-spin mr-1" /> Sending...</>
                                  : `Send Reminders`}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Setup reminder */}
      <Card className="bg-[#0a1f14] border-yellow-800/30 mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-yellow-400 text-sm flex items-center gap-2"><Clock size={14} /> Auto-Reminder Cron Setup</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-white/60 space-y-1">
          <p>Reminders send automatically if you set up the Railway cron job:</p>
          <ol className="list-decimal list-inside space-y-1 text-white/50">
            <li>In Railway: New Service → Cron Job</li>
            <li>Schedule: <code className="bg-white/10 px-1 rounded">0 * * * *</code> (hourly)</li>
            <li>Command: <code className="bg-white/10 px-1 rounded break-all">curl -X POST https://regencivics.earth/api/cron/event-reminders -H "Authorization: Bearer $CRON_SECRET"</code></li>
            <li>Add <code className="bg-white/10 px-1 rounded">CRON_SECRET</code> as an env var on both services (any secure random string)</li>
          </ol>
          <p className="mt-2">The same cron job also auto-updates event status (upcoming → live → completed) based on start/end times.</p>
        </CardContent>
      </Card>

      {/* #10. Season Rollup Email */}
      <Card className="bg-[#0a1f14] border-[#7dd87d]/20 mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-[#7dd87d] text-sm flex items-center gap-2"><Bell size={14} /> Season Rollup Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-white/60">Sends a "here's what we built together" digest to all event signups + newsletter subscribers for a completed season.</p>
          <div className="flex items-center gap-2">
            <input
              value={rollupSeason}
              onChange={e => setRollupSeason(e.target.value)}
              placeholder="Season name (e.g. Season 2)"
              className="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#7dd87d]/50"
            />
            <button
              onClick={() => {
                if (!rollupSeason.trim()) return;
                if (window.confirm(`Send season rollup email for "${rollupSeason}" to all signups + newsletter subscribers?`)) {
                  rollupMutation.mutate({ season: rollupSeason.trim() });
                }
              }}
              disabled={rollupMutation.isPending || !rollupSeason.trim()}
              className="bg-[#7dd87d] hover:bg-[#9de89d] disabled:opacity-50 text-[#1a472a] px-4 py-1.5 rounded-lg font-medium text-sm transition-colors whitespace-nowrap"
            >
              {rollupMutation.isPending ? 'Sending...' : 'Send Rollup'}
            </button>
          </div>
          {rollupMutation.isSuccess && (
            <p className="text-[#7dd87d] text-xs">Sent to {(rollupMutation.data as any)?.sent ?? 0} recipients.</p>
          )}
        </CardContent>
      </Card>

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
                    <p className="text-white/50 text-xs mb-1">{eventTitle} · {s.authorName || s.authorEmail}</p>
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
      <Card className="bg-white/5 border border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-amber-400 text-sm flex items-center gap-2">
            ✦ Event Attendance + $ReGen Token Awards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-white/50 text-xs">
            Mark who actually attended a completed event. Each person earns 33 $ReGen tokens, recorded in the contribution ledger.
          </p>

          {/* Event selector */}
          <div className="flex gap-2">
            <select
              value={attendanceEventId ?? ''}
              onChange={e => { setAttendanceEventId(e.target.value ? Number(e.target.value) : null); setAttendanceInput(''); }}
              className="flex-1 bg-white/10 text-white text-sm rounded px-3 py-2 border border-white/20"
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
                        className="text-white/55 hover:text-red-400 text-xs px-2 py-1 rounded"
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add attendees input */}
              <div className="space-y-2">
                <label className="text-white/60 text-xs">Add attendees (one email per line, or paste a comma-separated list):</label>
                <textarea
                  value={attendanceInput}
                  onChange={e => setAttendanceInput(e.target.value)}
                  placeholder="jane@example.com&#10;alex@example.com"
                  rows={4}
                  className="w-full bg-white/10 text-white text-sm rounded px-3 py-2 border border-white/20 placeholder:text-white/55 font-mono"
                />
                <button
                  onClick={() => {
                    const emails = attendanceInput
                      .split(/[\n,;]+/)
                      .map(e => e.trim())
                      .filter(e => e.includes('@'));
                    if (emails.length === 0) return;
                    if (window.confirm(`Mark ${emails.length} attendee(s) for this event? Each will earn 33 $ReGen tokens.`)) {
                      markAttendanceMutation.mutate({
                        eventId: attendanceEventId,
                        attendees: emails.map(email => ({ email })),
                      });
                      setAttendanceInput('');
                    }
                  }}
                  disabled={markAttendanceMutation.isPending || !attendanceInput.trim()}
                  className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm px-4 py-2 rounded font-medium"
                >
                  {markAttendanceMutation.isPending ? 'Marking...' : 'Mark Attendance + Award Tokens'}
                </button>
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
                    <span className="text-white/50">#{i + 1} {entry.email}</span>
                    <span className="text-amber-400 font-medium">{entry.total} $ReGen</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
