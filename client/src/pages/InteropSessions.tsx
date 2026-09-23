/**
 * Interoperability Circle (/interop-sessions)
 *
 * Two doors for the movement in one page: Season Two, which starts Saturday,
 * and the Circle, the weekly tools working group that builds the foundation
 * every play runs on.
 *
 * The Circle's time is a live, rolling vote rather than a fixed slot. Each
 * browser holds one vote it can move at any time, the tally refreshes every
 * few seconds, and the slot in the lead is the slot the group meets in. As
 * people join and leave the lead moves and the calendar buttons follow it.
 */

import { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Clock, ExternalLink, Video, Wrench } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { PageWrapper } from '@/components/PageWrapper';
import { BackButton } from '@/components/BackButton';
import { AnimatedSection } from '@/components/AnimatedSection';
import { trpc } from '@/lib/trpc';

type SlotKey = 'tue' | 'wed' | 'thu';

interface Slot {
  key: SlotKey;
  /** 0 = Sunday, matching Date#getDay. */
  weekday: number;
  label: string;
  /** Pacific wall-clock hour, 24h. */
  hourPT: number;
  zones: string;
}

const SLOTS: Slot[] = [
  { key: 'tue', weekday: 2, label: 'Tuesdays, 10:00am PT', hourPT: 10, zones: '10:00am PT · 1:00pm ET · 6:00pm UK' },
  { key: 'wed', weekday: 3, label: 'Wednesdays, 4:00pm PT', hourPT: 16, zones: '4:00pm PT · 7:00pm ET' },
  { key: 'thu', weekday: 4, label: 'Thursdays, 6:00pm PT', hourPT: 18, zones: '6:00pm PT · 9:00pm ET' },
];

const VOTER_KEY_STORAGE = 'interop-voter-key';
const VOTE_STORAGE = 'interop-my-vote';
const NAME_STORAGE = 'interop-my-name';

/** A random id this browser keeps, so someone with no account still gets one vote. */
function readVoterKey(): string {
  const fresh = 'v' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
  try {
    const existing = window.localStorage.getItem(VOTER_KEY_STORAGE);
    if (existing && /^[A-Za-z0-9_-]{8,64}$/.test(existing)) return existing;
    window.localStorage.setItem(VOTER_KEY_STORAGE, fresh);
  } catch {
    // Private windows and blocked storage: the key lives for this page load only.
  }
  return fresh;
}

function readStored(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Nothing to do: the vote still lives on the server under the voter key.
  }
}

/**
 * The next date a slot falls on, as a UTC instant.
 * Pacific is UTC-7 through November 1, 2026, which covers every session this
 * page schedules; the offset is applied explicitly so the instant is right
 * whatever timezone the visitor's browser is in.
 */
const PT_OFFSET_HOURS = 7;

function nextOccurrence(slot: Slot, from: Date = new Date()): Date {
  const candidate = new Date(Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate(),
    slot.hourPT + PT_OFFSET_HOURS,
    0, 0, 0,
  ));
  while (candidate.getUTCDay() !== slot.weekday || candidate.getTime() <= from.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }
  return candidate;
}

function formatPacificDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Los_Angeles',
  });
}

/** YYYYMMDDTHHMMSSZ, the shape both Google Calendar and .ics want. */
function icsStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

const SESSION_MINUTES = 90;

function googleCalendarUrl(slot: Slot): string {
  const start = nextOccurrence(slot);
  const end = new Date(start.getTime() + SESSION_MINUTES * 60_000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: 'ReGen Civics: Interoperability Circle',
    dates: `${icsStamp(start)}/${icsStamp(end)}`,
    details: 'Weekly working group for the tools under the land projects. Details and the live time vote: https://regencivics.earth/interop-sessions',
    location: 'Online',
    recur: 'RRULE:FREQ=WEEKLY',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function icsHref(slot: Slot): string {
  const start = nextOccurrence(slot);
  const end = new Date(start.getTime() + SESSION_MINUTES * 60_000);
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ReGen Civics//Interoperability Circle//EN',
    'BEGIN:VEVENT',
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    'RRULE:FREQ=WEEKLY',
    'SUMMARY:ReGen Civics: Interoperability Circle',
    'DESCRIPTION:Weekly working group for the tools under the land projects. https://regencivics.earth/interop-sessions',
    'LOCATION:Online',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  return `data:text/calendar;charset=utf8,${encodeURIComponent(body)}`;
}

export default function InteropSessions() {
  const [voterKey, setVoterKey] = useState('');
  const [myVote, setMyVote] = useState<SlotKey | ''>('');
  const [name, setName] = useState('');

  useEffect(() => {
    setVoterKey(readVoterKey());
    const stored = readStored(VOTE_STORAGE);
    if (stored === 'tue' || stored === 'wed' || stored === 'thu') setMyVote(stored);
    setName(readStored(NAME_STORAGE));
  }, []);

  const tally = trpc.interopSessions.tally.useQuery(undefined, {
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
  const vote = trpc.interopSessions.vote.useMutation({
    onSuccess: () => { void tally.refetch(); },
  });

  const counts = useMemo(() => {
    const map: Record<string, { count: number; names: string[] }> = {};
    for (const s of SLOTS) map[s.key] = { count: 0, names: [] };
    for (const row of tally.data?.slots ?? []) {
      if (map[row.slot]) map[row.slot] = { count: row.count, names: row.names };
    }
    return map;
  }, [tally.data]);

  const total = SLOTS.reduce((sum, s) => sum + counts[s.key].count, 0);
  const leader = useMemo(() => {
    let best = SLOTS[0];
    for (const s of SLOTS) if (counts[s.key].count > counts[best.key].count) best = s;
    return counts[best.key].count > 0 ? best : null;
  }, [counts]);

  const calendarSlot = leader ?? SLOTS[0];
  const nextDate = formatPacificDate(nextOccurrence(calendarSlot));

  function castVote(slot: SlotKey) {
    if (!voterKey) return;
    setMyVote(slot);
    writeStored(VOTE_STORAGE, slot);
    writeStored(NAME_STORAGE, name);
    vote.mutate({ slot, voterKey, displayName: name.trim() || undefined });
  }

  return (
    <PageWrapper>
      <SEO
        title="Interoperability Circle | ReGen Civics"
        description="Two ways to build with us: ReGen Civics Season Two for land projects, and the weekly Interoperability Circle for the people building the tools underneath them. Pick the Circle's time here."
        url="https://regencivics.earth/interop-sessions"
      />

      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#14301f] to-[#0d2818]">
        <div className="max-w-4xl mx-auto px-4 py-10 md:py-16">
          <BackButton />

          <AnimatedSection>
            <header className="mt-6 mb-12">
              <p className="text-[#7dd87d] text-xs font-semibold tracking-[0.2em] uppercase mb-3">
                Two places to build together
              </p>
              <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-4">
                Season Two and the Interoperability Circle
              </h1>
              <p className="text-white/70 text-lg max-w-2xl">
                One is for the land projects and the plays they are running. The other is for the people
                building the tools underneath them. Most of us belong in both.
              </p>
            </header>
          </AnimatedSection>

          {/* Season Two */}
          <AnimatedSection>
            <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-[#7dd87d]/30 p-6 md:p-8 mb-8">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-5 h-5 text-[#7dd87d]" />
                <p className="text-[#7dd87d] text-xs font-semibold tracking-[0.2em] uppercase">Starts Saturday</p>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">ReGen Civics Season Two</h2>
              <p className="text-white/75 mb-4">
                Thirteen weeks with thirteen land projects, starting with Selection Day on Saturday,
                September 26. Each week the cohort designs one layer of their game: governance, legal and
                land structure, economics, financing, then a shared crowdpooling launch where the world
                decides what to pool into.
              </p>
              <p className="text-white/75 mb-6">
                This is for you if you hold a land project, or a recipe, a play, a game for regenerating a
                particular land body. A river, a community, a watershed, a bioregion, a two acre food
                commons. Any scale.
              </p>

              <div className="bg-[#7dd87d]/15 border border-[#7dd87d]/40 rounded-xl p-5 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="w-5 h-5 text-[#7dd87d]" />
                  <h3 className="text-white font-bold">Bring a 3 to 5 minute video to Saturday</h3>
                </div>
                <p className="text-white/80 text-sm">
                  Everyone joining Season Two comes to Saturday's session with a 3 to 5 minute video or
                  presentation about their project. Make it social media style: the vision and purpose of
                  what you are aiming to create, not a technical walkthrough. Filmed on a phone is perfect.
                  It becomes part of the Season Two introduction and your crowdpooling campaign.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="/season2"
                  className="inline-flex items-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] px-4 py-2 rounded-xl font-semibold transition-colors text-sm"
                >
                  Season Two, and how it works
                </a>
                <a
                  href="/schedule"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm border border-white/20"
                >
                  <Calendar className="w-4 h-4" />
                  Add all sessions to your calendar
                </a>
              </div>
            </section>
          </AnimatedSection>

          {/* The Circle */}
          <AnimatedSection>
            <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 md:p-8 mb-8">
              <div className="flex items-center gap-3 mb-3">
                <Wrench className="w-5 h-5 text-[#e3ac4f]" />
                <p className="text-[#e3ac4f] text-xs font-semibold tracking-[0.2em] uppercase">New, weekly</p>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">The Interoperability Circle</h2>
              <p className="text-white/75 mb-6">
                The tools track that holds up the first one. We bring our repos, our bots and our agents
                into one room and build a foundation the whole stack can plug into, so the plays coming out
                of Season Two have something incredible to run on.
              </p>

              <ol className="space-y-4 mb-6">
                {[
                  ['Foundation', 'Everyone brings their repo and their agents. Our bots synthesize a draft of what the shared foundation should be, we put it on the screen, and we shape and agree on it together in the session.'],
                  ['Onboarding pathway', 'How a protocol or tool plugs into that foundation, and what the path in looks like for each of the things we are already running.'],
                  ['Integration sessions, ongoing', 'Weekly working sessions that produce the templates and pathways, tool by tool, plus the route for any other tool in the movement to come in the same way.'],
                ].map(([title, body], i) => (
                  <li key={title} className="flex gap-4">
                    <span className="text-[#e3ac4f] font-bold text-xl leading-7 w-6 shrink-0">{i + 1}</span>
                    <p className="text-white/75">
                      <span className="text-white font-semibold">{title}.</span> {body}
                    </p>
                  </li>
                ))}
              </ol>

              <p className="text-white/75">
                All of it in service of the plays, recipes and games that build new economic systems for
                bioregions, land projects and the communities holding them.
              </p>
            </section>
          </AnimatedSection>

          {/* Rolling time vote */}
          <AnimatedSection>
            <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-[#e3ac4f]/30 p-6 md:p-8 mb-8">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-5 h-5 text-[#e3ac4f]" />
                <p className="text-[#e3ac4f] text-xs font-semibold tracking-[0.2em] uppercase">Live vote</p>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">When the Circle meets</h2>
              <p className="text-white/75 mb-6">
                Ninety minutes, every week. The slot with the most hands is the slot we run in, and it keeps
                counting as people join and leave. Move your hand whenever your week changes and the session
                moves with the group.
              </p>

              <label className="block mb-5">
                <span className="block text-white/60 text-sm mb-2">Your name, so the group knows who is coming (optional)</span>
                <input
                  id="interop-voter-name"
                  type="text"
                  value={name}
                  maxLength={80}
                  onChange={(e) => { setName(e.target.value); writeStored(NAME_STORAGE, e.target.value); }}
                  placeholder="Name or project"
                  className="w-full sm:max-w-sm bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-[#e3ac4f]"
                />
              </label>

              <div className="space-y-4">
                {SLOTS.map((slot) => {
                  const { count, names } = counts[slot.key];
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  const isLeader = leader?.key === slot.key && count > 0;
                  const isMine = myVote === slot.key;
                  return (
                    <div
                      key={slot.key}
                      className={`rounded-xl border p-5 transition-colors ${isMine ? 'border-[#7dd87d] bg-[#7dd87d]/10' : 'border-white/15 bg-white/5'}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-white font-bold text-lg">{slot.label}</h3>
                            {isLeader && (
                              <span className="text-[#1a472a] bg-[#7dd87d] text-xs font-bold px-2 py-0.5 rounded-full">
                                Leading
                              </span>
                            )}
                          </div>
                          <p className="text-white/50 text-sm tabular-nums">{slot.zones}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => castVote(slot.key)}
                          disabled={!voterKey || vote.isPending}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 ${
                            isMine
                              ? 'bg-[#7dd87d] text-[#1a472a]'
                              : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                          }`}
                        >
                          {isMine ? <><CheckCircle2 className="w-4 h-4" /> You are in</> : 'I can make this'}
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full bg-[#e3ac4f] transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-white/60 text-sm tabular-nums whitespace-nowrap">
                          {count === 1 ? '1 hand' : `${count} hands`}
                        </span>
                      </div>
                      {names.length > 0 && (
                        <p className="text-white/50 text-xs mt-2">{names.join(', ')}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-white/75 mb-1">
                  {leader
                    ? <>Right now the Circle meets <span className="text-white font-semibold">{leader.label}</span>.</>
                    : <>No hands up yet. The first pick sets the slot.</>}
                </p>
                <p className="text-white/50 text-sm mb-4">Next session: {nextDate}. Times shown in Pacific.</p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={googleCalendarUrl(calendarSlot)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#e3ac4f] hover:bg-[#f0c36c] text-[#2b1f06] px-4 py-2 rounded-xl font-semibold transition-colors text-sm"
                  >
                    <Calendar className="w-4 h-4" />
                    Add the Circle to Google Calendar
                  </a>
                  <a
                    href={icsHref(calendarSlot)}
                    download="regen-civics-interoperability-circle.ics"
                    className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm border border-white/20"
                  >
                    Apple or Outlook
                  </a>
                </div>
                <p className="text-white/40 text-xs mt-3">
                  The calendar buttons follow the leading slot, so grab them again if the lead moves.
                </p>
              </div>
            </section>
          </AnimatedSection>

          {/* Prep */}
          <AnimatedSection>
            <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 md:p-8 mb-8">
              <h2 className="text-xl font-bold text-white mb-4">Come to the first Circle with three things</h2>
              <ul className="space-y-2 text-white/75 list-disc pl-5">
                <li>A link to your repo, or whatever stands in for it today.</li>
                <li>One or two sentences on what your tool does and who it serves.</li>
                <li>The bot or agent you would put to work in the session.</li>
              </ul>
            </section>
          </AnimatedSection>

          <AnimatedSection>
            <div className="flex flex-wrap gap-3 pb-8">
              <a
                href="https://www.youtube.com/@SEEDSRegenerativeEconomies"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Follow the season live on YouTube
              </a>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </PageWrapper>
  );
}
