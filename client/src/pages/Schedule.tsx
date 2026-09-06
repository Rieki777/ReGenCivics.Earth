/**
 * Schedule Page
 * Design: Magical community gathering space theme
 * Features: Calendar integration, Riverside studio info
 */

import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import {
  Calendar,
  Clock,
  Video,
  ExternalLink,
  Plus,
  ChevronDown,
  ChevronUp,
  MapPin,
  Users,
  Home as HomeIcon,
  Bell,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedSection } from '@/components/AnimatedSection';
import { SEO, pageSEO } from '@/components/SEO';
import { JsonLD, schemas } from '@/components/JsonLD';
import { BackButton } from "@/components/BackButton";
import { RelatedContent, relatedContentMap } from "@/components/RelatedContent";
import { PageWrapper } from "@/components/PageWrapper";
import { trpc } from '@/lib/trpc';
import { cdnImg } from "@/lib/utils";
import { useAuth } from '@/_core/hooks/useAuth';
import { CalendarCta, CalendarSubscribeButton } from "@/components/CalendarCta";
import {
  RIVERSIDE_INFO,
  upcomingEventsFallback,
  upcomingOpenAccessSessions as listUpcomingOpenAccessSessions,
  formatSessionLong,
  formatSessionMonthDay,
  formatOpenAccessWhen,
  formatOpenAccessStart,
  formatDualZoneStart,
  openAccessGoogleUrl,
  openAccessIcsUrl,
  buildGoogleCalendarUrl,
  buildIcsDataUrl,
  SEASON_2_SERIES_GOOGLE_URL,
  SEASON_2_SERIES_ICS_URL,
  OPEN_ACCESS_PITCH,
  sessionTopic,
} from "@/lib/seasonEvents";



function ReplayButton({ eventId }: { eventId: number }) {
  const { data: recording } = trpc.recordings.byEventId.useQuery({ eventId });
  if (!recording) return null;
  const url = recording.youtubeUrl ?? recording.riversideUrl;
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-semibold transition-colors text-sm"
    >
      <Video className="w-4 h-4" />
      Watch Replay
    </a>
  );
}

// Format a second offset as m:ss or h:mm:ss.
function fmtTs(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
    : `${m}:${String(ss).padStart(2, "0")}`;
}

// Deep-link into the YouTube player at a given second.
function chapterUrl(youtubeUrl: string, tSeconds: number): string {
  const sep = youtubeUrl.includes("?") ? "&" : "?";
  return `${youtubeUrl}${sep}t=${Math.max(0, Math.floor(tSeconds))}s`;
}

/**
 * RecordingDetail: the understanding produced by the coordination pipeline for
 * a recording. Overview, chapters (deep-linked into the player), decisions,
 * action items, and a collapsible timestamped transcript. Fetched on demand.
 */
function RecordingDetail({ id }: { id: number }) {
  const { data, isLoading } = trpc.recordings.getPublic.useQuery({ id });
  const [showTranscript, setShowTranscript] = useState(false);
  if (isLoading) return <p className="text-white/60 text-sm px-3 pb-3">Loading…</p>;
  if (!data) return null;
  const chapters = (data.chaptersJson as Array<{ tSeconds: number; title: string }> | null) ?? [];
  const decisions = (data.decisionsJson as string[] | null) ?? [];
  const actionItems = (data.actionItemsJson as Array<{ owner: string; item: string }> | null) ?? [];
  const transcript = (data.transcriptJson as Array<{ start: number; text: string }> | null) ?? [];
  const yt = data.youtubeUrl;

  if (!data.overview && chapters.length === 0 && decisions.length === 0 && actionItems.length === 0 && transcript.length === 0) {
    return <p className="text-white/60 text-sm px-3 pb-3">No summary yet for this session.</p>;
  }

  return (
    <div className="px-3 pb-4 pt-1 space-y-4 text-sm border-t border-white/10">
      {data.overview && <p className="text-white/80 leading-relaxed pt-3">{data.overview}</p>}

      {chapters.length > 0 && (
        <div>
          <h5 className="text-[#7dd87d] font-semibold text-[11px] uppercase tracking-wide mb-2">Chapters</h5>
          <ul className="space-y-1">
            {chapters.map((c, i) => (
              <li key={i}>
                {yt ? (
                  <a href={chapterUrl(yt, c.tSeconds)} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-[#7dd87d] transition-colors">
                    <span className="text-[#7dd87d]/70 font-mono mr-2">{fmtTs(c.tSeconds)}</span>{c.title}
                  </a>
                ) : (
                  <span className="text-white/80"><span className="text-white/60 font-mono mr-2">{fmtTs(c.tSeconds)}</span>{c.title}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {decisions.length > 0 && (
        <div>
          <h5 className="text-[#7dd87d] font-semibold text-[11px] uppercase tracking-wide mb-2">Decisions</h5>
          <ul className="list-disc list-inside space-y-1 text-white/80">
            {decisions.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </div>
      )}

      {actionItems.length > 0 && (
        <div>
          <h5 className="text-[#7dd87d] font-semibold text-[11px] uppercase tracking-wide mb-2">Action items</h5>
          <ul className="space-y-1 text-white/80">
            {actionItems.map((a, i) => (
              <li key={i}><span className="text-[#7dd87d]/80 font-medium">{a.owner}:</span> {a.item}</li>
            ))}
          </ul>
        </div>
      )}

      {transcript.length > 0 && (
        <div>
          <button onClick={() => setShowTranscript((v) => !v)} className="text-white/60 hover:text-white text-xs inline-flex items-center gap-1">
            {showTranscript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showTranscript ? "Hide transcript" : "Show transcript"}
          </button>
          {showTranscript && (
            <div className="mt-2 max-h-64 overflow-y-auto space-y-1 pr-2">
              {transcript.map((seg, i) => (
                <p key={i} className="text-white/60 leading-relaxed">
                  {yt ? (
                    <a href={chapterUrl(yt, seg.start)} target="_blank" rel="noopener noreferrer" className="text-[#7dd87d]/60 font-mono mr-2 hover:text-[#7dd87d]">{fmtTs(seg.start)}</a>
                  ) : (
                    <span className="text-white/60 font-mono mr-2">{fmtTs(seg.start)}</span>
                  )}
                  {seg.text}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * RecordingsSection: the most recent session recordings, ingested by the
 * coordination pipeline (YouTube poll) or the Riverside webhook. Each card
 * expands to show the pipeline's understanding (RecordingDetail).
 * Renders nothing if there are no recordings yet.
 */
function RecordingsSection() {
  const { data: recordings = [] } = trpc.recordings.list.useQuery({ limit: 12 });
  const [expandedId, setExpandedId] = useState<number | null>(null);
  if (!recordings || recordings.length === 0) return null;

  return (
    <section className="py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/20">
          <h3 className="text-2xl font-bold text-white mb-1">Episode Recordings</h3>
          <p className="text-white/60 text-sm mb-5">Catch up on past sessions.</p>
          <div className="grid grid-cols-1 gap-4">
            {recordings.map((r: any) => {
              const url = r.youtubeUrl ?? null;
              const date = r.sessionDate ? new Date(r.sessionDate).toLocaleDateString() : null;
              const expanded = expandedId === r.id;
              return (
                <div key={r.id} className="bg-white/5 rounded-xl border border-white/10 hover:border-[#7dd87d]/30 transition-colors overflow-hidden">
                  <div className="flex gap-3 p-3">
                    {r.thumbnailUrl ? (
                      <img
                        src={r.thumbnailUrl}
                        alt=""
                        width={120}
                        height={68}
                        className="w-30 h-17 rounded-lg object-cover flex-shrink-0"
                        loading="lazy"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-30 h-17 rounded-lg bg-[#1a472a] flex-shrink-0 flex items-center justify-center">
                        <Video className="w-6 h-6 text-[#7dd87d]/80" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-semibold text-sm line-clamp-2">{r.title || "Untitled session"}</h4>
                      {date && <p className="text-white/70 text-xs mt-1">{date}</p>}
                      <div className="flex items-center gap-3 mt-2">
                        {url && (
                          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 text-xs font-semibold">
                            <Video className="w-3.5 h-3.5" /> Watch
                          </a>
                        )}
                        {r.forumPostId && (
                          <Link href={`/community/post/${r.forumPostId}`} className="text-[#7dd87d]/80 hover:text-[#7dd87d] text-xs">Discuss</Link>
                        )}
                        <button
                          onClick={() => setExpandedId(expanded ? null : r.id)}
                          className="ml-auto inline-flex items-center gap-1 text-white/60 hover:text-white text-xs"
                        >
                          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          {expanded ? "Less" : "Details"}
                        </button>
                      </div>
                    </div>
                  </div>
                  {expanded && <RecordingDetail id={r.id} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// YouTube playlist for Season 1 recordings
const YOUTUBE_PLAYLIST = "https://www.youtube.com/watch?v=AJZI0OiRPeU&list=PL3Xi8vZSmBTSUZsQ82awoNIQS8ceBQ4io";

export default function Schedule() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "historical">("upcoming");
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);
  // Per-event reminder signup
  const [reminderOpenFor, setReminderOpenFor] = useState<number | null>(null);
  const [reminderEmail, setReminderEmail] = useState<string>('');
  const [reminderPhone, setReminderPhone] = useState<string>(''); // #4 SMS
  const [reminderSuccess, setReminderSuccess] = useState<{ id: number; type: 'reminder' | 'waitlist' } | null>(null);
  // #9. Agenda suggestions
  const [agendaOpenFor, setAgendaOpenFor] = useState<number | null>(null);
  const [agendaEmail, setAgendaEmail] = useState('');
  const [agendaText, setAgendaText] = useState('');
  const [agendaSuccess, setAgendaSuccess] = useState<number | null>(null);
  // #12. User's local timezone for display
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // #23. Token balance for signed-in users
  const { user } = useAuth();
  const { data: tokenData } = trpc.events.myTokenBalance.useQuery(undefined, { enabled: !!user });

  // Upcoming Open Access Sessions (every new moon). Computed once per render so
  // the "next" card, banner, and supporting list always reflect the same data.
  const upcomingOpenAccessSessions = listUpcomingOpenAccessSessions();
  const nextOpenAccessSession = upcomingOpenAccessSessions[0] ?? null;
  const followingOpenAccessSessions = upcomingOpenAccessSessions.slice(1, 3);

  // Fetch events from DB (falls back gracefully while loading)
  // includeCompleted so historical tab has data
  const { data: dbEvents } = trpc.events.list.useQuery({ includeCompleted: true });
  // #8. Signup counts for social proof
  const { data: signupCountsData } = trpc.events.publicSignupCounts.useQuery();
  const signupCountMap: Record<number, number> = Object.fromEntries(
    (signupCountsData ?? []).map(({ eventId, count }) => [eventId, Number(count)])
  );

  // Use DB events if available, otherwise fall back to hardcoded list until DB is ready
  const upcomingEvents = (dbEvents && dbEvents.length > 0 ? dbEvents : upcomingEventsFallback).map(ev => ({
    ...ev,
    startTime: (ev as any).startTime ?? null,
    googleCalendarUrl: (ev as any).googleCalendarUrl ?? ((ev as any).startTime ? buildGoogleCalendarUrl(ev as any) : ''),
    appleCalendarUrl: (ev as any).appleCalendarUrl ?? ((ev as any).startTime ? buildIcsDataUrl(ev as any) : ''),
  }));

  // Filter events based on the active tab
  const filteredEvents = activeTab === "upcoming"
    ? upcomingEvents.filter(e => (e as any).status !== "completed" && (e as any).status !== "cancelled")
    : upcomingEvents
        .filter(e => (e as any).status === "completed")
        .sort((a, b) => {
          const aTime = (a as any).startTime ? new Date((a as any).startTime).getTime() : 0;
          const bTime = (b as any).startTime ? new Date((b as any).startTime).getTime() : 0;
          return bTime - aTime; // newest first
        });

  // First upcoming event, auto-expand it
  const firstUpcomingId = filteredEvents.find(e => (e as any).status !== 'completed' && (e as any).status !== 'cancelled')?.id ?? null;
  const effectiveExpanded = expandedEvent !== null ? expandedEvent : firstUpcomingId;

  const reminderMutation = trpc.events.signup.useMutation();
  const agendaMutation = trpc.events.suggestAgendaItem.useMutation();
  const unsubscribeMutation = trpc.events.unsubscribe.useMutation();

  // #18. Handle unsubscribe query param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const unsubEventId = params.get('unsubscribe');
    const unsubEmail = params.get('email');
    if (unsubEventId && unsubEmail) {
      unsubscribeMutation.mutate(
        { eventId: parseInt(unsubEventId, 10), email: unsubEmail },
        {
          onSuccess: () => {
            toast.success("You've been unsubscribed from reminders for this event.");
          },
          onError: () => {
            toast.error("Could not unsubscribe. Please try again.");
          },
        }
      );
      // Clean the URL
      const url = new URL(window.location.href);
      url.searchParams.delete('unsubscribe');
      url.searchParams.delete('email');
      window.history.replaceState({}, '', url.pathname);
    }
  }, []);

  const submitReminder = (event: { id: number; title: string }) => {
    if (!reminderEmail.trim()) return;
    const eventId = event.id;
    reminderMutation.mutate(
      {
        eventId: event.id,
        email: reminderEmail.trim(),
        phone: reminderPhone.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          setReminderSuccess({ id: eventId, type: (data as any).signupType ?? 'reminder' });
          setReminderOpenFor(null);
          setReminderEmail('');
          setReminderPhone('');
          setTimeout(() => setReminderSuccess(null), 8000);
        },
      }
    );
  };

  const submitAgenda = (eventId: number) => {
    if (!agendaText.trim() || !agendaEmail.trim()) return;
    agendaMutation.mutate(
      { eventId, authorEmail: agendaEmail.trim(), suggestion: agendaText.trim() },
      {
        onSuccess: () => {
          setAgendaSuccess(eventId);
          setAgendaOpenFor(null);
          setAgendaEmail('');
          setAgendaText('');
          setTimeout(() => setAgendaSuccess(null), 6000);
        },
      }
    );
  };

  const formatDate = (dateStr: string) => {
    // Parse date parts directly to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <PageWrapper>
    <div className="min-h-screen bg-gradient-to-b from-[#1a472a] via-[#2d5a3d] to-[#1a472a]">
      {/* Open Session Announcement Banner */}
      {nextOpenAccessSession && (
        <div className="bg-[#7dd87d]/20 border-b border-[#7dd87d]/30 px-4 py-3 text-center">
          <p className="text-[#7dd87d] font-medium text-sm md:text-base">
            🌿 Next Open Access Session: {nextOpenAccessSession.dayName}, {formatSessionLong(nextOpenAccessSession.date)} at {formatOpenAccessStart(nextOpenAccessSession)}.{" "}
            {sessionTopic(nextOpenAccessSession.date)
              ? `We're talking ${sessionTopic(nextOpenAccessSession.date)!.headline}. Free and open to all.`
              : "Every new moon, free and open to all."}
          </p>
        </div>
      )}
      <BackButton />
      <SEO {...pageSEO.schedule} />
      <JsonLD data={schemas.event({
        name: "ReGen Civics Open Community Call",
        description: "Monthly community sessions, open calls, and events where regenerators connect, coordinate, and co-create the ReGenerative Renaissance. Join investors, land stewards, and players.",
        startDate: "2026-04-01",
        url: "https://regencivics.earth/schedule",
      })} />
      
      {/* Hero Section */}
      <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={cdnImg("https://assets.regencivics.earth/MnRHvgPyBDbKYbay.jpg")}
            alt="Community Gathering"
            className="w-full h-full object-cover"
            width="1920"
            height="1080"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a472a]/70 via-[#1a472a]/50 to-[#1a472a]" />
        </div>
        
        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-[#7dd87d]/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-[#7dd87d]/30">
            <Calendar className="w-5 h-5 text-[#7dd87d]" />
            <span className="text-[#7dd87d] font-medium">Season 2 Schedule</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            Upcoming <span className="text-[#7dd87d]">Episodes</span>
          </h1>
          
          <p className="text-xl text-white/80 max-w-2xl mx-auto safe-prose">
            Join our gatherings and be part of the ReGenerative Renaissance. Add events to your calendar and tune in!
          </p>
        </div>
      </section>

      {/* Quick Add to Calendar Section */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Next Open Access Session (first card) */}
            {nextOpenAccessSession && (
              <div className="bg-gradient-to-br from-[#7dd87d]/30 to-[#4a7c59]/20 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/40 ring-2 ring-[#7dd87d]/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#7dd87d]/30 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-[#7dd87d]" />
                  </div>
                  <div>
                    <span className="inline-block bg-[#7dd87d] text-[#1a472a] text-xs font-bold px-2 py-0.5 rounded-full mb-1">NEXT SESSION</span>
                    <h3 className="text-lg font-bold text-white">Open Access Session</h3>
                  </div>
                </div>
                <p className="text-white/70 text-sm mb-1">
                  {nextOpenAccessSession.dayName}, {formatSessionLong(nextOpenAccessSession.date)} at {formatOpenAccessWhen(nextOpenAccessSession)}
                </p>
                {(() => {
                  const topic = sessionTopic(nextOpenAccessSession.date);
                  return topic ? (
                    <div className="mb-4 rounded-lg bg-[#7dd87d]/15 border border-[#7dd87d]/30 p-3">
                      <div className="text-[#7dd87d] text-[10px] font-bold tracking-wider uppercase mb-1">This session</div>
                      <div className="text-white font-semibold text-sm mb-1">{topic.headline}</div>
                      <p className="text-white/75 text-xs leading-relaxed">{topic.body}</p>
                    </div>
                  ) : (
                    <p className="text-white/70 text-xs mb-4">Every new moon. {OPEN_ACCESS_PITCH}</p>
                  );
                })()}
                <div className="mb-4">
                  <CalendarCta
                    googleUrl={openAccessGoogleUrl(nextOpenAccessSession)}
                    appleUrl={openAccessIcsUrl(nextOpenAccessSession)}
                    appleDownload="regen-civics-open-session.ics"
                  />
                </div>
                {followingOpenAccessSessions.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#7dd87d]/80 font-bold mb-1">Also coming up</p>
                    <ul className="text-white/60 text-xs space-y-0.5">
                      {followingOpenAccessSessions.map(s => (
                        <li key={s.date}>
                          {s.dayName}, {formatSessionMonthDay(s.date)} · {formatOpenAccessStart(s)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Subscribe to All Events */}
            <div className="bg-gradient-to-br from-[#4a7c59]/20 to-[#2d5a3d]/20 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[#7dd87d]" />
                </div>
                <h3 className="text-lg font-bold text-white">All Events</h3>
              </div>
              <p className="text-white/60 text-sm mb-4">Subscribe and new events appear automatically.</p>
              <CalendarSubscribeButton />
              <p className="text-white/70 text-xs mt-3">Live calendar. Times stay current if they change.</p>
            </div>

            {/* Season 2 Episodes (last card) */}
            <div className="bg-gradient-to-br from-[#7dd87d]/20 to-[#4a7c59]/10 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[#7dd87d]" />
                </div>
                <h3 className="text-lg font-bold text-white">Season 2 Episodes</h3>
              </div>
              <p className="text-white/60 text-sm mb-4">All 13 weekly episodes, 11:00 AM Pacific, 2:00 PM Eastern, Sept-Dec 2026</p>
              <CalendarCta
                googleUrl={SEASON_2_SERIES_GOOGLE_URL}
                appleUrl={SEASON_2_SERIES_ICS_URL}
                appleDownload="regen-civics-season-2.ics"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Riverside Studio Info */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-gradient-to-r from-[#7dd87d]/20 to-[#4a7c59]/20 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/30">
            <div className="flex items-center gap-3 mb-4">
              <Video className="w-6 h-6 text-[#7dd87d]" />
              <h2 className="text-xl font-bold text-white">All Episodes via Riverside</h2>
            </div>

            <p className="text-white/60 text-sm mb-4">Join via your browser. No download required.</p>

            <a
              href={RIVERSIDE_INFO.roomUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              <Video className="w-5 h-5" />
              Join on Riverside
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Episode Recordings are rendered inline on each completed event
          card in the Historical tab below (Watch Recording button). The
          standalone RecordingsSection was removed so the page has one
          canonical place to find past sessions. */}

      {/* Follow Along with YouTube */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-gradient-to-r from-[#7dd87d]/20 to-[#4a7c59]/20 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/30">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-3">Follow Along with the Whole Season!</h3>
              <p className="text-[#7dd87d] text-lg font-semibold mb-2">
                Seasons are streamed live on YouTube!
              </p>
              <p className="text-white/70 mb-4 max-w-2xl mx-auto">
                You can follow along with the journey even if your project isn't selected. Add the whole season to your calendar and tune in each week. Sometimes there are opportunities for the audience to ask questions and participate.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href={YOUTUBE_PLAYLIST}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  Watch Season 1 Recordings
                </a>
                <a
                  href="https://www.youtube.com/@SEEDSRegenerativeEconomies?sub_confirmation=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-800 px-6 py-3 rounded-xl font-medium transition-colors"
                >
                  <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  Subscribe to YouTube
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* #23. Token balance widget for signed-in users */}
      {user && tokenData && tokenData.balance > 0 && (
        <section className="px-4 pt-4">
          <div className="container mx-auto max-w-4xl">
            <div className="inline-flex items-center gap-2 bg-[#7dd87d]/15 border border-[#7dd87d]/30 rounded-full px-4 py-2">
              <span className="w-5 h-5 rounded-full bg-[#7dd87d]/30 flex items-center justify-center text-xs">
                <svg className="w-3 h-3 text-[#7dd87d]" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
              </span>
              <span className="text-[#7dd87d] font-semibold text-sm">$ReGen Balance: {tokenData.balance}</span>
              <span className="text-white/60 text-xs">from {tokenData.entries.length} event{tokenData.entries.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </section>
      )}

      {/* Events List */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-white mb-6 text-center" style={{ fontFamily: 'var(--font-display)' }}>
            {activeTab === "upcoming" ? <>Upcoming <span className="text-[#7dd87d]">Events</span></> : <>Past <span className="text-[#7dd87d]">Events</span></>}
          </h2>

          {/* Tabs */}
          <div className="flex justify-center gap-2 mb-8">
            <button
              onClick={() => { setActiveTab("upcoming"); setExpandedEvent(null); }}
              className={`px-5 py-2 rounded-xl font-medium text-sm transition-colors ${
                activeTab === "upcoming"
                  ? "bg-[#7dd87d] text-[#1a472a]"
                  : "bg-white/10 text-white/60 hover:bg-white/15 hover:text-white"
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => { setActiveTab("historical"); setExpandedEvent(null); }}
              className={`px-5 py-2 rounded-xl font-medium text-sm transition-colors ${
                activeTab === "historical"
                  ? "bg-[#7dd87d] text-[#1a472a]"
                  : "bg-white/10 text-white/60 hover:bg-white/15 hover:text-white"
              }`}
            >
              Historical
            </button>
          </div>

          <div className="space-y-4">
            {filteredEvents.length === 0 && (
              <p className="text-center text-white/70 py-8">
                {activeTab === "upcoming" ? "No upcoming events scheduled yet." : "No past events to show."}
              </p>
            )}
            {filteredEvents.map((event) => (
              <div 
                key={event.id}
                className={`bg-white/5 backdrop-blur-sm rounded-2xl border transition-all duration-300 overflow-hidden ${(event as any).status === 'completed' ? 'opacity-60' : ''} ${
                  event.type === 'open' 
                    ? 'border-[#7dd87d]/50 ring-2 ring-[#7dd87d]/20' 
                    : 'border-[#7dd87d]/20 hover:border-[#7dd87d]/40'
                }`}
              >
                <button
                  onClick={() => setExpandedEvent(effectiveExpanded === event.id ? null : event.id)}
                  className="w-full p-6 text-left"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {event.type === 'open' && (
                        <span className="inline-block bg-[#7dd87d] text-[#1a472a] text-xs font-bold px-2 py-1 rounded-full mb-2">
                          OPEN ACCESS
                        </span>
                      )}
                      <h3 className="text-xl font-bold text-white">
                        <Link href={`/events/${event.id}`} className="hover:text-[#7dd87d] transition-colors" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                          {event.title}
                        </Link>
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-white/60">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {(event as any).startTime
                            ? new Date((event as any).startTime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                            : (event as any).date === 'TBD' ? 'Date TBD' : formatDate((event as any).date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {(event as any).startTime ? (() => {
                            const d = new Date((event as any).startTime);
                            const dual = formatDualZoneStart(d);
                            const localTime = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: userTz, timeZoneName: 'short' });
                            const localTzAbbr = new Intl.DateTimeFormat('en-US', { timeZone: userTz, timeZoneName: 'short' }).format(d).split(' ').pop() ?? '';
                            const alreadyShown = dual.includes(localTzAbbr);
                            return alreadyShown ? dual : `${dual} (${localTime} your time)`;
                          })()
                            : (event as any).time === 'TBD' ? 'Time TBD' : `${(event as any).time} ${(event as any).timezone}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          Online
                        </span>
                        {/* #8. Social proof signup count */}
                        {signupCountMap[event.id] > 0 && (
                          <span className="flex items-center gap-1 text-[#7dd87d]/80">
                            <Users className="w-4 h-4" />
                            {signupCountMap[event.id]} {signupCountMap[event.id] === 1 ? 'person' : 'people'} signed up
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {effectiveExpanded === event.id ? (
                        <ChevronUp className="w-5 h-5 text-[#7dd87d]" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-white/70" />
                      )}
                    </div>
                  </div>
                </button>
                
                {effectiveExpanded === event.id && (
                  <div className="px-6 pb-6 pt-0 border-t border-white/10">
                    <p className="text-white/70 mb-6 mt-4 safe-prose">{event.description}</p>
                    {/* #25. Guest speaker info */}
                    {(event as any).guestSpeakerName && (
                      <div className="bg-[#7dd87d]/10 border border-[#7dd87d]/20 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#7dd87d]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Users className="w-4 h-4 text-[#7dd87d]" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">
                            With {(event as any).guestSpeakerName}{(event as any).guestSpeakerTopic ? ` on ${(event as any).guestSpeakerTopic}` : ''}
                          </p>
                          {(event as any).guestSpeakerBio && (
                            <p className="text-white/70 text-xs mt-1">{(event as any).guestSpeakerBio}</p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-3">
                      {event.googleCalendarUrl ? (
                        <div className="w-full">
                          <CalendarCta
                            googleUrl={event.googleCalendarUrl}
                            appleUrl={event.appleCalendarUrl || event.googleCalendarUrl}
                            appleDownload={`${event.title.replace(/\s+/g, '-')}.ics`}
                          />
                        </div>
                      ) : null}
                      
                      {/* Watch Recording (shows once recording is linked) */}
                      {(event as any).youtubeUrl && (event as any).status === 'completed' && (
                        <a
                          href={(event as any).youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                        >
                          <Video className="w-5 h-5" />
                          Watch Recording
                        </a>
                      )}

                      {/* Replay button for completed events with linked recording */}
                      {(event as any).status === 'completed' && (event as any).recordingId && !(event as any).youtubeUrl && (
                        <ReplayButton eventId={event.id} />
                      )}

                      {/* Join link: DB riversideUrl takes priority, then fallback to RIVERSIDE_INFO */}
                      {(event as any).status !== 'completed' && (
                        (event as any).riversideRoomUrl ? (
                          <a
                            href={(event as any).riversideRoomUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                          >
                            <Video className="w-5 h-5" />
                            Join on Riverside
                          </a>
                        ) : (
                          <a
                            href={(event as any).riversideRoomUrl ?? RIVERSIDE_INFO.roomUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] px-4 py-2 rounded-xl font-medium transition-colors"
                          >
                            <Video className="w-5 h-5" />
                            Join on Riverside
                          </a>
                        )
                      )}

                      {/* Per-event reminder / waitlist */}
                      {reminderSuccess?.id === event.id ? (
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm border ${reminderSuccess.type === 'waitlist' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' : 'bg-[#7dd87d]/20 text-[#7dd87d] border-[#7dd87d]/30'}`}>
                          <Check className="w-4 h-4" />
                          {reminderSuccess.type === 'waitlist' ? "You're on the waitlist" : "Reminder set!"}
                        </span>
                      ) : reminderOpenFor === event.id ? (
                        <div className="flex flex-col gap-2 w-full mt-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="email"
                              placeholder="your@email.com"
                              value={reminderEmail}
                              onChange={(e) => setReminderEmail(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && submitReminder(event)}
                              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-white/60 text-sm focus:outline-none focus:border-[#7dd87d]/60"
                              autoComplete="email"
                              inputMode="email"
                              enterKeyHint="go"
                            />
                            <button
                              onClick={() => submitReminder(event)}
                              disabled={reminderMutation.isPending || !reminderEmail.trim()}
                              className="bg-[#7dd87d] hover:bg-[#9de89d] disabled:opacity-50 text-[#1a472a] px-4 py-2 rounded-xl font-medium text-sm transition-colors whitespace-nowrap"
                            >
                              {reminderMutation.isPending ? '...' : 'Notify me'}
                            </button>
                            <button
                              onClick={() => { setReminderOpenFor(null); setReminderEmail(''); setReminderPhone(''); }}
                              className="text-white/60 hover:text-white/70 px-2 py-2 text-sm"
                            >
                              ✕
                            </button>
                          </div>
                          {/* #4. Optional SMS */}
                          <input
                            type="tel"
                            placeholder="+1 555 000 0000 (optional, get a text reminder too)"
                            value={reminderPhone}
                            onChange={(e) => setReminderPhone(e.target.value)}
                            className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/70 text-xs focus:outline-none focus:border-[#7dd87d]/40"
                            autoComplete="tel"
                            inputMode="tel"
                            enterKeyHint="go"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => setReminderOpenFor(event.id)}
                          className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm border border-white/10"
                        >
                          <Bell className="w-4 h-4" />
                          {(event as any).maxAttendees ? 'Join Waitlist' : 'Get Reminder'}
                        </button>
                      )}

                      {/* #9. Suggest agenda item */}
                      {agendaSuccess === event.id ? (
                        <span className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-300 px-4 py-2 rounded-xl font-medium text-sm border border-purple-500/30">
                          <Check className="w-4 h-4" />
                          Suggestion sent!
                        </span>
                      ) : agendaOpenFor === event.id ? (
                        <div className="flex flex-col gap-2 w-full mt-2">
                          <textarea
                            placeholder="What should we cover in this session?"
                            value={agendaText}
                            onChange={(e) => setAgendaText(e.target.value)}
                            rows={2}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-white/60 text-sm focus:outline-none focus:border-purple-400/60 resize-none"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="email"
                              placeholder="your@email.com"
                              value={agendaEmail}
                              onChange={(e) => setAgendaEmail(e.target.value)}
                              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-white/60 text-sm focus:outline-none focus:border-purple-400/60"
                              autoComplete="email"
                              inputMode="email"
                              enterKeyHint="go"
                            />
                            <button
                              onClick={() => submitAgenda(event.id)}
                              disabled={agendaMutation.isPending || !agendaText.trim() || !agendaEmail.trim()}
                              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors whitespace-nowrap"
                            >
                              {agendaMutation.isPending ? '...' : 'Submit'}
                            </button>
                            <button
                              onClick={() => { setAgendaOpenFor(null); setAgendaText(''); setAgendaEmail(''); }}
                              className="text-white/60 hover:text-white/70 px-2 py-2 text-sm"
                            >✕</button>
                          </div>
                        </div>
                      ) : (event as any).status !== 'completed' ? (
                        <button
                          onClick={() => setAgendaOpenFor(event.id)}
                          className="inline-flex items-center gap-2 bg-white/5 hover:bg-purple-600/20 text-white/70 hover:text-purple-300 px-4 py-2 rounded-xl font-medium transition-colors text-sm border border-white/10 hover:border-purple-500/30"
                        >
                          <Plus className="w-4 h-4" />
                          Suggest agenda item
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Note about TBD dates — only relevant for upcoming episodes.
              Hidden under the Historical tab because past episodes
              already have their final times. */}
          {activeTab === "upcoming" && (
            <div className="mt-6 text-center">
              <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-sm px-6 py-3 rounded-xl border border-white/10">
                <Clock className="w-5 h-5 text-[#7dd87d]" />
                <span className="text-white/60">Episode day/time may be adjusted during the 1st Episode based on the 13 selected projects' availability</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* How to Join */}
      <section className="py-16 px-4 bg-[#0d2818]">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-white mb-8 text-center" style={{ fontFamily: 'var(--font-display)' }}>
            How to <span className="text-[#7dd87d]">Join</span>
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/20 text-center">
              <div className="w-12 h-12 bg-[#7dd87d]/20 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-[#7dd87d]">1</div>
              <h3 className="font-bold text-white mb-2">Add to Calendar</h3>
              <p className="text-white/60 text-sm">Click "Add to Calendar" to save events and get reminders.</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/20 text-center">
              <div className="w-12 h-12 bg-[#7dd87d]/20 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-[#7dd87d]">2</div>
              <h3 className="font-bold text-white mb-2">Join on Riverside or YouTube</h3>
              <p className="text-white/60 text-sm">Open the room link in your browser at the scheduled time. No download needed.</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/20 text-center">
              <div className="w-12 h-12 bg-[#7dd87d]/20 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-[#7dd87d]">3</div>
              <h3 className="font-bold text-white mb-2">Participate</h3>
              <p className="text-white/60 text-sm">Engage in discussions, ask questions, and connect with the community.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Want to Join <span className="text-[#7dd87d]">Season 2</span>?
          </h2>
          <p className="text-white/70 mb-8 safe-prose">
            Applications are now open for land projects interested in joining the next Season cohort.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/seasons">
              <Button size="lg" variant="outline" className="border-[#7dd87d] text-[#7dd87d] hover:bg-[#7dd87d]/10 rounded-xl">
                Learn About Next Season
              </Button>
            </Link>
            <Link href="/apply">
              <Button size="lg" className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] rounded-xl">
                Apply Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Related Content */}
      <RelatedContent pages={relatedContentMap.schedule.pages} blog={relatedContentMap.schedule.blog} />
    </div>
    </PageWrapper>
  );
}
