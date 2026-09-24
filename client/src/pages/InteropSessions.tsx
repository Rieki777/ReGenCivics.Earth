/**
 * Interoperability Circle (/interop-sessions)
 *
 * Two doors for the movement in one page: Season Two, which starts Saturday,
 * and the Circle, the weekly tools working group that builds the foundation
 * every play runs on.
 *
 * The Circle's time is a live, rolling vote rather than a fixed slot. Each
 * browser raises a hand for every slot it can make and can change them at any
 * time. The vote feeds the scheduled slot (see shared/interopCircle.ts and
 * ADR-56): the weekly sessions are real events rows with sign-ups, reminders
 * and a calendar feed, and this page reads them back through
 * interopSessions.schedule.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, CheckCircle2, Clock, ExternalLink, Mail, UserRound, Video, Wrench } from 'lucide-react';
import { INTEROP_SLOTS, interopSlot, isInteropSlotKey, type InteropSlotKey } from '@shared/interopCircle';
import { repoLabel } from '@shared/interopTools';
import { CALENDAR_FEEDS } from '@/lib/calendarLinks';
import { SubscribeButtons } from '@/components/CalendarCta';
import { AuthDialog } from '@/components/AuthDialog';
import { useAuth } from '@/_core/hooks/useAuth';
import { SEO } from '@/components/SEO';
import { PageWrapper } from '@/components/PageWrapper';
import { BackButton } from '@/components/BackButton';
import { AnimatedSection } from '@/components/AnimatedSection';
import { trpc } from '@/lib/trpc';
import { seasonTwoPhase } from '@shared/seasonTwoPhase';

type SlotKey = InteropSlotKey;
/** Fallback only. The offered set comes from the server so admin can change it. */
const DEFAULT_SLOTS = INTEROP_SLOTS;

const VOTER_KEY_STORAGE = 'interop-voter-key';
const VOTE_STORAGE = 'interop-my-vote';
const NAME_STORAGE = 'interop-my-name';
const EMAIL_STORAGE = 'interop-my-email';
const REPO_STORAGE = 'interop-my-repo';
const AGENT_STORAGE = 'interop-my-agent';

/** 32 hex characters of CSPRNG output, or a last-resort fallback where crypto is absent. */
function randomKeyBody(): string {
  try {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
  }
}

/**
 * A random id this browser keeps, so someone with no account still gets one vote.
 *
 * The key is a bearer credential: anyone holding it can change or withdraw that
 * vote. Math.random seeded alongside Date.now was guessable enough that knowing
 * roughly when someone voted narrowed the search, so this uses the CSPRNG and
 * falls back only where crypto is genuinely absent.
 */
function readVoterKey(): string {
  const fresh = 'v' + randomKeyBody();
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

function formatSession(d: Date | string): string {
  return new Date(d).toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: 'America/Los_Angeles', timeZoneName: 'short',
  });
}

export default function InteropSessions() {
  const [voterKey, setVoterKey] = useState('');
  const [mySlots, setMySlots] = useState<SlotKey[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [agent, setAgent] = useState('');
  // Set when someone arrives on a ?leave=<token> link from the Circle's own mail.
  const [leftCircle, setLeftCircle] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    setVoterKey(readVoterKey());
    // Stored as a comma list; a single key from before multi-select parses the same.
    setMySlots(readStored(VOTE_STORAGE).split(',').filter(isInteropSlotKey));
    setEmail(readStored(EMAIL_STORAGE));
    setName(readStored(NAME_STORAGE));
    setRepoUrl(readStored(REPO_STORAGE));
    setAgent(readStored(AGENT_STORAGE));
  }, []);

  // Signed-in members get their account email prefilled, unless they typed one.
  useEffect(() => {
    if (user?.email) setEmail((current) => current || user.email!);
  }, [user?.email]);

  const emailRef = useRef<HTMLInputElement | null>(null);
  const tally = trpc.interopSessions.tally.useQuery(undefined, {
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
  const setSlots = trpc.interopSessions.setSlots.useMutation({
    onSuccess: () => { void tally.refetch(); },
  });
  const schedule = trpc.interopSessions.schedule.useQuery(undefined, { refetchInterval: 60_000 });
  const directory = trpc.interopSessions.directory.useQuery(undefined, { refetchInterval: 60_000 });
  const join = trpc.interopSessions.join.useMutation({
    onSuccess: () => { void schedule.refetch(); void directory.refetch(); },
  });
  const leave = trpc.interopSessions.leave.useMutation({
    onSuccess: () => { setLeftCircle(true); void schedule.refetch(); },
  });

  // The Circle's mail links here with a signed token rather than an address, so
  // leaving is one click from the footer and nobody can cancel a stranger.
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('leave');
    if (!token) return;
    leave.mutate({ token });
    // Drop the token from the URL so it does not sit in history or get shared.
    window.history.replaceState({}, '', window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submitJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    writeStored(EMAIL_STORAGE, trimmed);
    writeStored(NAME_STORAGE, name);
    writeStored(REPO_STORAGE, repoUrl);
    writeStored(AGENT_STORAGE, agent);
    join.mutate({
      email: trimmed,
      name: name.trim() || undefined,
      repoUrl: repoUrl.trim() || undefined,
      agent: agent.trim() || undefined,
    });
  }

  const scheduledSlot = schedule.data?.slot ? interopSlot(schedule.data.slot, tally.data?.offered) : null;
  const sessions = schedule.data?.sessions ?? [];

  // The offered slots are a setting, so the page renders whatever the server
  // says rather than a list compiled into the bundle. The defaults only stand
  // in for the first render before the tally lands.
  const SLOTS = useMemo(() => tally.data?.offered ?? DEFAULT_SLOTS, [tally.data]);

  const counts = useMemo(() => {
    const map: Record<string, { count: number; names: string[] }> = {};
    for (const s of SLOTS) map[s.key] = { count: 0, names: [] };
    for (const row of tally.data?.slots ?? []) {
      if (map[row.slot]) map[row.slot] = { count: row.count, names: row.names };
    }
    return map;
  }, [tally.data, SLOTS]);

  const total = SLOTS.reduce((sum, s) => sum + (counts[s.key]?.count ?? 0), 0);
  const leader = useMemo(() => {
    let best = SLOTS[0];
    for (const s of SLOTS) if ((counts[s.key]?.count ?? 0) > (counts[best.key]?.count ?? 0)) best = s;
    return best && (counts[best.key]?.count ?? 0) > 0 ? best : null;
  }, [counts, SLOTS]);
  const movingSoon = scheduledSlot && leader && leader.key !== scheduledSlot.key && !schedule.data?.pinned;
  // Recomputed on render rather than stored, so an open tab retires the
  // Selection Day copy at the cutoff without needing a reload.
  const seasonTwoOpen = seasonTwoPhase() === 'before';
  // Raising a hand and being reachable are different things: the vote is
  // anonymous, so without this a slot can win with nobody we can write to.
  const votedButNotJoined = mySlots.length > 0 && !join.isSuccess;

  function focusEmail() {
    emailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    emailRef.current?.focus({ preventScroll: true });
  }


  function toggleSlot(slot: SlotKey) {
    if (!voterKey) return;
    const next = SLOTS.map((s) => s.key).filter((k) =>
      k === slot ? !mySlots.includes(k) : mySlots.includes(k),
    );
    setMySlots(next);
    writeStored(VOTE_STORAGE, next.join(','));
    writeStored(NAME_STORAGE, name);
    setSlots.mutate({ slots: next, voterKey, displayName: name.trim() || undefined });
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
                <p className="text-[#7dd87d] text-xs font-semibold tracking-[0.2em] uppercase">
                  {seasonTwoOpen ? 'Starts Saturday' : 'Running now'}
                </p>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">ReGen Civics Season Two</h2>
              <p className="text-white/75 mb-4">
                {seasonTwoOpen
                  ? 'Thirteen weeks with thirteen land projects, starting with Selection Day on Saturday, September 26. Each week the cohort designs one layer of their game: governance, legal and land structure, economics, financing, then a shared crowdpooling launch where the world decides what to pool into.'
                  : 'Thirteen weeks with thirteen land projects, already under way. Each week the cohort designs one layer of their game: governance, legal and land structure, economics, financing, then a shared crowdpooling launch where the world decides what to pool into. The schedule has every session, past and upcoming.'}
              </p>
              <p className="text-white/75 mb-6">
                This is for you if you hold a land project, or a recipe, a play, a game for regenerating a
                particular land body. A river, a community, a watershed, a bioregion, a two acre food
                commons. Any scale.
              </p>

              {seasonTwoOpen && (
              <div className="bg-[#7dd87d]/15 border border-[#7dd87d]/40 rounded-xl p-5 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="w-5 h-5 text-[#7dd87d]" />
                  <h3 className="text-white font-bold">Bring a 3 to 5 minute video or live presentation to Saturday</h3>
                </div>
                <p className="text-white/80 text-sm mb-3">
                  Everyone joining Season Two comes to Saturday's session with a 3 to 5 minute video about
                  their project, or ready to give that presentation live. Make it social media style: the
                  vision and purpose of what you are aiming to create. Save the technical detail for the
                  weeks ahead. It becomes part of the Season Two introduction and your crowdpooling campaign.
                </p>
                <ul className="text-white/80 text-sm list-disc pl-5 space-y-1">
                  <li>Keep it tight. Five minutes is the hard stop.</li>
                  <li>Keep it concise and coherent: one project, one clear story.</li>
                  <li>Film in landscape mode, with your phone turned sideways. A phone is all you need.</li>
                </ul>
              </div>
              )}

              <div className="flex flex-wrap gap-3">
                <a
                  href={seasonTwoOpen ? '/season2' : '/schedule'}
                  className="inline-flex items-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] px-4 py-2 rounded-xl font-semibold transition-colors text-sm"
                >
                  {seasonTwoOpen ? 'Season Two, and how it works' : 'Every session, past and upcoming'}
                </a>
                <a
                  href={seasonTwoOpen ? '/schedule' : '/season2'}
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm border border-white/20"
                >
                  <Calendar className="w-4 h-4" />
                  {seasonTwoOpen ? 'Add all sessions to your calendar' : 'Season Two, and how it works'}
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
                Ninety minutes, every week. Tap every slot you can make. The slot with the most hands is the
                slot we run in, and it keeps counting as people join and leave. Change your picks whenever your
                week changes and the session moves with the group.
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
                  const isMine = mySlots.includes(slot.key);
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
                          onClick={() => toggleSlot(slot.key)}
                          disabled={!voterKey || setSlots.isPending}
                          aria-pressed={isMine}
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
                  {scheduledSlot
                    ? <>The Circle meets <span className="text-white font-semibold">{scheduledSlot.label}</span>.</>
                    : leader
                      ? <>Right now the vote leads for <span className="text-white font-semibold">{leader.label}</span>.</>
                      : <>No hands up yet. The first pick sets the slot.</>}
                </p>
                {movingSoon && (
                  <p className="text-[#e3ac4f] text-sm mb-1">
                    {leader.label} has taken the lead. If it holds for a day, sessions more than three days out move
                    there and everyone signed up gets an email.
                  </p>
                )}
                {schedule.data?.pinned && (
                  <p className="text-white/50 text-sm mb-1">The organizers have set this time for now. The vote keeps counting.</p>
                )}
                {sessions.length > 0 && (
                  <ul className="text-white/60 text-sm mt-2 space-y-0.5 tabular-nums">
                    {sessions.map((s) => <li key={s.id}>{formatSession(s.startTime)}</li>)}
                  </ul>
                )}

                {votedButNotJoined && (
                  <div className="mt-5 pt-5 border-t border-white/10">
                    <p className="text-white/75 text-sm mb-3">
                      Your hand is counted, and it is anonymous. If you want the room link and a reminder before
                      the session, leave an email too.
                    </p>
                    <button
                      type="button"
                      onClick={focusEmail}
                      className="inline-flex items-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] px-4 py-2 rounded-xl font-semibold transition-colors text-sm min-h-[44px]"
                    >
                      <Mail className="w-4 h-4" />
                      Get the reminders too
                    </button>
                  </div>
                )}
              </div>
            </section>
          </AnimatedSection>

          {/* The register the sign-up builds: what the movement is actually running. */}
          {(directory.data?.entries.length ?? 0) > 0 && (
            <AnimatedSection>
              <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-[#7dd87d]/30 p-6 md:p-8 mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <Wrench className="w-5 h-5 text-[#7dd87d]" />
                  <p className="text-[#7dd87d] text-xs font-semibold tracking-[0.2em] uppercase">The register</p>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">What we are bringing</h2>
                <p className="text-white/75 mb-5">
                  Every repo and agent people have added so far. This is the list the first session starts from,
                  and it grows every time somebody signs up. Add yours below.
                </p>
                <ul className="divide-y divide-white/10">
                  {directory.data!.entries.map((entry, i) => (
                    <li key={i} className="py-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-white font-medium">{entry.name ?? 'Someone'}</span>
                      {entry.repoUrl && (
                        <a
                          href={entry.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="inline-flex items-center gap-1 text-[#7dd87d] hover:text-[#9de89d] text-sm underline underline-offset-2"
                        >
                          {repoLabel(entry.repoUrl)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {entry.agent && <span className="text-white/60 text-sm">builds with {entry.agent}</span>}
                    </li>
                  ))}
                </ul>
                {(directory.data!.total ?? 0) > directory.data!.entries.length && (
                  <p className="text-white/40 text-xs mt-4">
                    Showing the {directory.data!.entries.length} most recently updated of {directory.data!.total}.
                  </p>
                )}
              </section>
            </AnimatedSection>
          )}

          {/* Join: optional. Anyone can come; signing up adds reminders, recaps and a profile. */}
          <AnimatedSection>
            <section id="join" className="bg-white/5 backdrop-blur-sm rounded-2xl border border-[#7dd87d]/30 p-6 md:p-8 mb-8">
              <div className="flex items-center gap-3 mb-3">
                <Mail className="w-5 h-5 text-[#7dd87d]" />
                <p className="text-[#7dd87d] text-xs font-semibold tracking-[0.2em] uppercase">Optional</p>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Come as you are, or sign up for more</h2>
              <p className="text-white/75 mb-4">
                Anyone can come to the Circle, no sign-up needed. Add the calendar below and every invite carries
                the room link. Signing up gets you three more things:
              </p>
              <ul className="space-y-3 mb-6">
                {[
                  ['Email reminders', 'The day before and an hour before, with the room link. If the vote moves the time, you hear first.'],
                  ['Recaps', 'After each session: what we built, what we agreed, and what comes next.'],
                  ['A profile', 'Your place on ReGen Civics, which will soon run on the shared infrastructure this Circle is building.'],
                ].map(([title, body]) => (
                  <li key={title} className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#7dd87d] shrink-0 mt-0.5" />
                    <p className="text-white/75">
                      <span className="text-white font-semibold">{title}.</span> {body}
                    </p>
                  </li>
                ))}
              </ul>
              {(schedule.data?.members ?? 0) === 1 && <p className="text-white/50 text-sm mb-3">1 person has signed up so far.</p>}
              {(schedule.data?.members ?? 0) > 1 && <p className="text-white/50 text-sm mb-3">{schedule.data!.members} people have signed up so far.</p>}

              {leftCircle && (
                <p className="inline-flex items-center gap-2 text-[#7dd87d] font-semibold mb-4">
                  <CheckCircle2 className="w-5 h-5" />
                  You have left the Circle. No more reminders. Sign up again below whenever you want back in.
                </p>
              )}
              {leave.isError && (
                <p className="text-red-300 text-sm mb-4">{leave.error.message || 'That leave link is not valid any more.'}</p>
              )}
              {join.isSuccess ? (
                <p className="inline-flex items-center gap-2 text-[#7dd87d] font-semibold mb-4">
                  <CheckCircle2 className="w-5 h-5" />
                  {join.data?.alreadyMember ? 'You were already signed up. See you there.' : 'You are signed up. Check your email for the details.'}
                </p>
              ) : (
                <form onSubmit={submitJoin} className="mb-2">
                  <div className="flex flex-col sm:flex-row gap-3 mb-3">
                    <input
                      ref={emailRef}
                      type="email"
                      required
                      value={email}
                      maxLength={320}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      aria-label="Email for Circle reminders and recaps"
                      className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-[#7dd87d] min-h-[44px]"
                    />
                    <button
                      type="submit"
                      disabled={join.isPending}
                      className="inline-flex items-center justify-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] px-5 py-2 rounded-xl font-semibold transition-colors text-sm disabled:opacity-60 min-h-[44px]"
                    >
                      {join.isPending ? 'Signing up...' : 'Send me reminders and recaps'}
                    </button>
                  </div>
                  {/* The tools directory. Both optional, and second, so the
                      shortest path through this form is still one field. */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="url"
                      value={repoUrl}
                      maxLength={500}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="Your repo (optional)"
                      aria-label="The repository your tool lives in, optional"
                      className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-[#7dd87d] min-h-[44px]"
                    />
                    <input
                      type="text"
                      value={agent}
                      maxLength={120}
                      onChange={(e) => setAgent(e.target.value)}
                      placeholder="Your agent (optional)"
                      aria-label="The agent you build with, optional"
                      className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-[#7dd87d] min-h-[44px]"
                    />
                  </div>
                </form>
              )}
              {join.isError && (
                <p className="text-red-300 text-sm mb-4">{join.error.message || 'That did not go through. Try again in a minute.'}</p>
              )}
              <p className="text-white/40 text-xs mb-5">
                An email is all reminders need. Your name comes from the field above. Every email has a link to leave.
                The repo and agent build the register of what the movement is running, so the first session can start
                from a real list instead of a blank screen. Leave them empty if you would rather not say.
              </p>

              <div className="flex flex-wrap items-center gap-3 mb-8">
                {isAuthenticated ? (
                  <a
                    href="/profile"
                    className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm border border-white/20"
                  >
                    <UserRound className="w-4 h-4" />
                    Your profile
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAuthOpen(true)}
                    className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm border border-white/20"
                  >
                    <UserRound className="w-4 h-4" />
                    Create your profile
                  </button>
                )}
                <span className="text-white/50 text-sm">Sign in with Google or email.</span>
              </div>

              <p className="text-white/75 mb-3">
                Just want it on your calendar? This calendar follows the vote, so it moves when the Circle moves.
              </p>
              <SubscribeButtons feed={CALENDAR_FEEDS.interopCircle} />
            </section>
          </AnimatedSection>
          <AuthDialog
            open={authOpen}
            onOpenChange={setAuthOpen}
            onLogin={() => setAuthOpen(false)}
            title="Create your ReGen Civics profile"
          />

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
