/**
 * Schedule Page
 * Design: Magical community gathering space theme
 * Features: Calendar integration, live session join info
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
import { CalendarCta } from "@/components/CalendarCta";
import { CalendarFeedUrls } from "@/components/CalendarFeedUrls";
import { CalendarOptions } from "@/components/CalendarOptions";
import {
  PastEventCollapsedMeta,
  PastEventCollapsedWatch,
  PastEventExpandedPanel,
} from "@/components/schedule/PastEventRecording";
import {
  isScheduleEventPast,
  isPublicHistoricalEvent,
  toMs,
  resolveEventStart,
} from "@/lib/eventTemporal";
import {
  upcomingEventsFallback,
  upcomingOpenAccessSessions as listUpcomingOpenAccessSessions,
  parseCompactUtc,
  openAccessGoogleUrl,
  openAccessIcsUrl,
  buildGoogleCalendarUrl,
  buildIcsDataUrl,
  OPEN_ACCESS_PITCH,
  sessionTopic,
  SESSION_TIME_ZONE,
} from "@/lib/seasonEvents";
import {
  eventFeed,
  siteJoinUrl,
  formatLocalDate,
  formatLocalDateShort,
  formatRangeWithReference,
  formatStartWithReference,
} from "@/lib/calendarLinks";



// Past-event Watch / RecordingDetail / empty states live in
// @/components/schedule/PastEventRecording (Historical tab UX).

/** Signup counts stay private until a session has more than this many. */
const SIGNUP_COUNT_VISIBLE_FROM = 50;

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
  // Times are rendered by the helpers in lib/calendarLinks, which resolve the
  // reader's zone themselves and keep the date and the clock in the same one.

  // #23. Token balance for signed-in users
  const { user } = useAuth();
  const { data: tokenData } = trpc.events.myTokenBalance.useQuery(undefined, { enabled: !!user });

  // Upcoming Open Access Sessions (every new moon). Computed once per render so
  // the "next" card, banner, and supporting list always reflect the same data.
  const upcomingOpenAccessSessions = listUpcomingOpenAccessSessions();
  const nextOpenAccessSession = upcomingOpenAccessSessions[0] ?? null;
  const followingOpenAccessSessions = upcomingOpenAccessSessions.slice(1, 3);
  // Real Dates, so the date and the clock beside it can be rendered from one
  // zone. Rendering the date locally next to a Pacific clock is what showed a
  // Sydney reader "Sunday, September 27 at 11:00 AM PDT" for a Saturday event.
  const nextOpenStart = nextOpenAccessSession ? parseCompactUtc(nextOpenAccessSession.startUtc) : null;
  const nextOpenEnd = nextOpenAccessSession ? parseCompactUtc(nextOpenAccessSession.endUtc) : null;

  // Fetch events from DB (falls back gracefully while loading)
  // includeCompleted so historical tab has data
  const { data: dbEvents } = trpc.events.list.useQuery({ includeCompleted: true });
  // #8. Signup counts for social proof
  const { data: signupCountsData } = trpc.events.publicSignupCounts.useQuery();
  const signupCountMap: Record<number, number> = Object.fromEntries(
    (signupCountsData ?? []).map(({ eventId, count }) => [eventId, Number(count)])
  );

  // Use DB events if available, otherwise fall back to hardcoded list until DB is ready
  // The fallback carries every catalog date, past ones included, and its rows
  // have no `status` for the upcoming filter to key off. So until the query
  // resolved, the Upcoming tab listed May, June, July and August 2026 as though
  // they were still to come. Brief, but it is the first thing a reader sees and
  // it is wrong. Drop anything already past before it can render.
  const todayYmd = new Date().toLocaleDateString("en-CA", { timeZone: SESSION_TIME_ZONE });
  const fallbackEvents = upcomingEventsFallback.filter(e => e.date >= todayYmd);

  const upcomingEvents = (dbEvents && dbEvents.length > 0 ? dbEvents : fallbackEvents).map(ev => ({
    ...ev,
    startTime: (ev as any).startTime ?? null,
    googleCalendarUrl: (ev as any).googleCalendarUrl ?? ((ev as any).startTime ? buildGoogleCalendarUrl(ev as any) : ''),
    appleCalendarUrl: (ev as any).appleCalendarUrl ?? ((ev as any).startTime ? buildIcsDataUrl(ev as any) : ''),
  }));

  // Filter events based on the active tab — same past rule as admin
  // (endTime if present else startTime) plus completed/cancelled status.
  // Historical drops cancelled/canceled so phantom OA cancellations never
  // appear as past cards (ICS CANCELLED emission is unchanged).
  const filteredEvents = activeTab === "upcoming"
    ? upcomingEvents
        .filter((e) => !isScheduleEventPast(e as any))
        .sort((a, b) => {
          const aTime = toMs(resolveEventStart(a as any)) ?? 0;
          const bTime = toMs(resolveEventStart(b as any)) ?? 0;
          return aTime - bTime;
        })
    : upcomingEvents
        .filter((e) => isPublicHistoricalEvent(e as any))
        .sort((a, b) => {
          const aTime = toMs(resolveEventStart(a as any)) ?? 0;
          const bTime = toMs(resolveEventStart(b as any)) ?? 0;
          return bTime - aTime; // newest first
        });

  // First upcoming event, auto-expand it (only on Upcoming tab)
  const firstUpcomingId =
    activeTab === "upcoming" ? (filteredEvents[0]?.id ?? null) : null;
  const effectiveExpanded = expandedEvent !== null ? expandedEvent : firstUpcomingId;

  const reminderMutation = trpc.events.signup.useMutation();
  const agendaMutation = trpc.events.suggestAgendaItem.useMutation();
  const unsubscribeMutation = trpc.events.unsubscribe.useMutation();

  // #18. Handle unsubscribe query param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const unsubEventId = params.get('unsubscribe');
    const unsubEmail = params.get('email');
    // New mail carries a signed token; links already in inboxes carry the
    // address. Either is forwarded as-is and the server decides which it trusts.
    const unsubToken = params.get('token');
    if (unsubEventId && (unsubToken || unsubEmail)) {
      unsubscribeMutation.mutate(
        unsubToken
          ? { eventId: parseInt(unsubEventId, 10), token: unsubToken }
          : { eventId: parseInt(unsubEventId, 10), email: unsubEmail! },
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
      url.searchParams.delete('token');
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
      {nextOpenAccessSession && nextOpenStart && (
        <div className="bg-[#7dd87d]/20 border-b border-[#7dd87d]/30 px-4 py-3 text-center">
          <p className="text-[#7dd87d] font-medium text-sm md:text-base">
            🌿 Next Open Access Session: {formatLocalDate(nextOpenStart)} at {formatStartWithReference(nextOpenStart)}.{" "}
            {sessionTopic(nextOpenAccessSession.date)
              ? `We're talking ${sessionTopic(nextOpenAccessSession.date)!.short}. Free and open to all.`
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

      {/* The next open session, then the three ways to subscribe. */}
      {nextOpenAccessSession && nextOpenStart && nextOpenEnd && (
        <section className="py-8 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="bg-gradient-to-br from-[#7dd87d]/25 to-[#4a7c59]/15 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/40 ring-2 ring-[#7dd87d]/20">
              <span className="inline-block bg-[#7dd87d] text-[#1a472a] text-xs font-bold px-2 py-0.5 rounded-full mb-2">
                NEXT SESSION
              </span>
              <h2 className="text-xl font-bold text-white mb-1">Open Access Session</h2>
              <p className="text-white font-semibold text-sm">{formatLocalDate(nextOpenStart)}</p>
              <p className="text-white/65 text-sm mb-4">
                {formatRangeWithReference(nextOpenStart, nextOpenEnd)}
              </p>
              {(() => {
                const topic = sessionTopic(nextOpenAccessSession.date);
                if (!topic) return null;
                return (
                  <div className="mb-4 rounded-lg bg-[#7dd87d]/15 border border-[#7dd87d]/30 p-4">
                    <div className="text-[#7dd87d] text-[10px] font-bold tracking-wider uppercase mb-1">This session</div>
                    <div className="text-white font-semibold text-sm mb-1">{topic.headline}</div>
                    <p className="text-white/75 text-xs leading-relaxed">{topic.body}</p>
                  </div>
                );
              })()}
              {/* The standing pitch stays put whether or not this one has a topic:
                  a first-time reader still needs to know who the session is for. */}
              <p className="text-white/70 text-xs mb-4">Every new moon. {OPEN_ACCESS_PITCH}</p>
              <CalendarCta
                googleUrl={openAccessGoogleUrl(nextOpenAccessSession)}
                appleUrl={openAccessIcsUrl(nextOpenAccessSession)}
                appleDownload="regen-civics-open-session.ics"
              />
              {followingOpenAccessSessions.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] uppercase tracking-wider text-[#7dd87d]/80 font-bold mb-1">Also coming up</p>
                  <ul className="text-white/60 text-xs space-y-0.5">
                    {followingOpenAccessSessions.map((s) => {
                      const start = parseCompactUtc(s.startUtc);
                      return (
                        <li key={s.date}>
                          {formatLocalDateShort(start)} · {formatStartWithReference(start)}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <CalendarOptions />

      {/* Live call join info */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-gradient-to-r from-[#7dd87d]/20 to-[#4a7c59]/20 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/30">
            <div className="flex items-center gap-3 mb-4">
              <Video className="w-6 h-6 text-[#7dd87d]" />
              <h2 className="text-xl font-bold text-white">Join every episode live</h2>
            </div>

            <p className="text-white/60 text-sm mb-4">Join via your browser. No download required.</p>

            <a
              href={siteJoinUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              <Video className="w-5 h-5" />
              Join the call
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* The floor under every one-click subscribe path above. See the
          component for why a copyable URL has to exist alongside the buttons. */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <CalendarFeedUrls />
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
            {filteredEvents.map((event) => {
              const isPast = isScheduleEventPast(event as any);
              const recordingId = (event as any).recordingId as number | null | undefined;
              const eventYoutubeUrl = (event as any).youtubeUrl as string | null | undefined;
              const forumThreadId = (event as any).forumThreadId as number | null | undefined;
              const toggleExpand = () =>
                setExpandedEvent(effectiveExpanded === event.id ? null : event.id);

              return (
              <div 
                key={event.id}
                className={`bg-white/5 backdrop-blur-sm rounded-2xl border transition-all duration-300 overflow-hidden ${isPast ? 'opacity-80' : ''} ${
                  event.type === 'open' 
                    ? 'border-[#7dd87d]/50 ring-2 ring-[#7dd87d]/20' 
                    : 'border-[#7dd87d]/20 hover:border-[#7dd87d]/40'
                }`}
              >
                {/* Collapsed bar: expand control + (past) Watch outside the button so links are valid HTML */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 p-6">
                  <button
                    type="button"
                    onClick={toggleExpand}
                    className="flex-1 min-w-0 text-left"
                  >
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
                          ? formatLocalDate(new Date((event as any).startTime))
                          : (event as any).date === 'TBD' ? 'Date TBD' : formatDate((event as any).date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {(event as any).startTime ? (() => {
                          const start = new Date((event as any).startTime);
                          const end = (event as any).endTime
                            ? new Date((event as any).endTime)
                            : new Date(start.getTime() + 2 * 3_600_000);
                          return formatRangeWithReference(start, end);
                        })()
                          : (event as any).time === 'TBD' ? 'Time TBD' : `${(event as any).time} ${(event as any).timezone}`}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        Online
                      </span>
                      {!isPast && signupCountMap[event.id] > SIGNUP_COUNT_VISIBLE_FROM && (
                        <span className="flex items-center gap-1 text-[#7dd87d]/80">
                          <Users className="w-4 h-4" />
                          {signupCountMap[event.id]} {signupCountMap[event.id] === 1 ? 'person' : 'people'} signed up
                        </span>
                      )}
                    </div>
                    {isPast && (
                      <PastEventCollapsedMeta
                        eventId={event.id}
                        recordingId={recordingId}
                        eventYoutubeUrl={eventYoutubeUrl}
                        forumThreadId={forumThreadId}
                      />
                    )}
                  </button>

                  <div className="flex items-center gap-2 flex-shrink-0 self-start">
                    {isPast && (
                      <PastEventCollapsedWatch
                        eventId={event.id}
                        recordingId={recordingId}
                        eventYoutubeUrl={eventYoutubeUrl}
                        forumThreadId={forumThreadId}
                      />
                    )}
                    <button
                      type="button"
                      onClick={toggleExpand}
                      className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg hover:bg-white/10"
                      aria-label={effectiveExpanded === event.id ? "Collapse event" : "Expand event"}
                    >
                      {effectiveExpanded === event.id ? (
                        <ChevronUp className="w-5 h-5 text-[#7dd87d]" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-white/70" />
                      )}
                    </button>
                  </div>
                </div>
                
                {effectiveExpanded === event.id && (
                  isPast ? (
                    <PastEventExpandedPanel
                      eventId={event.id}
                      recordingId={recordingId}
                      eventYoutubeUrl={eventYoutubeUrl}
                      forumThreadId={forumThreadId}
                      eventType={event.type}
                      eventSeason={(event as any).season}
                      eventTitle={event.title}
                      description={event.description}
                      guestSpeakerName={(event as any).guestSpeakerName}
                      guestSpeakerTopic={(event as any).guestSpeakerTopic}
                      guestSpeakerBio={(event as any).guestSpeakerBio}
                    />
                  ) : (
                  <div className="px-6 pb-6 pt-0 border-t border-white/10">
                    <p className="text-white/70 mb-6 mt-4 safe-prose">{event.description}</p>
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
                            appleUrl={
                              (event as any).startTime
                                ? eventFeed(event.id).httpsUrl
                                : event.appleCalendarUrl || event.googleCalendarUrl
                            }
                            appleDownload={`${event.title.replace(/\s+/g, '-')}.ics`}
                          />
                        </div>
                      ) : null}

                      <a
                        href={siteJoinUrl(event.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                      >
                        <Video className="w-5 h-5" />
                        Join the call
                      </a>

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
                      ) : (
                        <button
                          onClick={() => setAgendaOpenFor(event.id)}
                          className="inline-flex items-center gap-2 bg-white/5 hover:bg-purple-600/20 text-white/70 hover:text-purple-300 px-4 py-2 rounded-xl font-medium transition-colors text-sm border border-white/10 hover:border-purple-500/30"
                        >
                          <Plus className="w-4 h-4" />
                          Suggest agenda item
                        </button>
                      )}
                    </div>
                  </div>
                  )
                )}
              </div>
              );
            })}
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
              <h3 className="font-bold text-white mb-2">Join the call or watch on YouTube</h3>
              <p className="text-white/60 text-sm">Open the join link in your browser at the scheduled time. No download needed.</p>
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
