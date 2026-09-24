/**
 * Seasons: the ReGen Civics Year.
 *
 * The page opens on the wheel (SeasonWheel): the four seasons, what each one is
 * for, and where we are right now. Below it: this winter's Season 2 incubator,
 * who each cohort is for and how it is chosen, the gatherings that turn the
 * year, the journey so far, and the way in.
 *
 * Until 2026-09-24 this page called the incubator "Spring" and ran three
 * different four-season models at once (the hero, the rhythm cards, and a
 * "project growth cycle"). Rye's rulings that day: the incubator is the Design
 * Season (winter); the seasons go by Design, Resource, Build, and Rest; the
 * timelines are loose this first year; Season 2 applications are closed.
 * The seasons now come from shared/regenYear.ts, Season 2's weeks from
 * shared/season2Curriculum.ts, its dates from shared/sessionClock.ts, and every
 * word about the Fund from shared/fund.ts. Nothing on this page restates them.
 */

import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  BookOpen,
  Building,
  Calendar,
  CheckCircle,
  ChevronDown,
  Clock,
  Compass,
  MapPin,
  Moon,
  Radio,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AnimatedSection } from "@/components/AnimatedSection";
import { SEO, pageSEO } from "@/components/SEO";
import { BackButton } from "@/components/BackButton";
import { RelatedContent, relatedContentMap } from "@/components/RelatedContent";
import { SeasonWheel } from "@/components/SeasonWheel";
import { SEASON_LOOK } from "@/lib/seasonLook";
import { SEASON2_CURRICULUM } from "@shared/season2Curriculum";
import {
  SEASON2_EPISODE_DATES,
  SESSION_DURATION_HOURS,
  SESSION_START_HOUR_PT,
  sessionEndUtc,
  sessionStartUtc,
} from "@shared/sessionClock";
import { JOIN_PATH, SEEDS_YOUTUBE_URL } from "@shared/sessionLinks";
import {
  REGEN_SEASONS,
  REGEN_SEASON_ORDER,
  TURNING_POINTS,
  regenSeasonSpan,
  type RegenSeasonKey,
} from "@shared/regenYear";
import { FUND } from "@shared/fund";
import { APPLY_BUTTON_LABEL } from "@shared/applicationWindow";
import { ApplicationsNotice } from "@/components/ApplicationsNotice";

const display = { fontFamily: "var(--font-display)" } as const;
const WINTER = SEASON_LOOK.winter;

const pacificDay = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "America/Los_Angeles",
});
const pacificShort = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "America/Los_Angeles",
});

function hourLabel(h: number) {
  return `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;
}
const SESSION_TIME = `${hourLabel(SESSION_START_HOUR_PT)} Pacific`;

/** The thirteen weeks with their real dates, from the shared curriculum and clock. */
const WEEKS = SEASON2_CURRICULUM.map((ep) => {
  const ymd = SEASON2_EPISODE_DATES[ep.week - 1];
  return { ...ep, start: ymd ? sessionStartUtc(ymd) : null };
});

type Season2Status =
  | { phase: "before"; selectionDay: Date }
  | { phase: "during"; week: number; title: string; next: Date | null }
  | { phase: "after" };

function season2Status(now: Date): Season2Status {
  const first = WEEKS[0]?.start;
  const lastYmd = SEASON2_EPISODE_DATES[SEASON2_EPISODE_DATES.length - 1];
  if (!first) return { phase: "after" };
  if (now < first) return { phase: "before", selectionDay: first };
  if (now > sessionEndUtc(lastYmd)) return { phase: "after" };
  let week = 1;
  WEEKS.forEach((w) => {
    if (w.start && now >= w.start) week = w.week;
  });
  const next = WEEKS[week]?.start ?? null;
  return { phase: "during", week, title: WEEKS[week - 1].title, next };
}

// ─── The journey, placed on the wheel ───────────────────────────────────────

const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Sep to Dec 2026", "Dec 2026 to Mar 2027": one season of a cohort's year. */
function windowLabel(key: RegenSeasonKey, winterYear: number) {
  const next = REGEN_SEASON_ORDER[(REGEN_SEASON_ORDER.indexOf(key) + 1) % 4];
  const startYear = key === "winter" || key === "spring" ? winterYear : winterYear + 1;
  const endYear = key === "winter" ? winterYear : winterYear + 1;
  const a = MONTH[TURNING_POINTS[key].month - 1];
  const b = MONTH[TURNING_POINTS[next].month - 1];
  return startYear === endYear ? `${a} to ${b} ${endYear}` : `${a} ${startYear} to ${b} ${endYear}`;
}

type Stop = {
  id: string;
  when: string;
  title: string;
  label: string;
  color: string;
  /** Where this stop sits on the wheel, for working out past, now and next. */
  at: [seasonNumber: number, season: RegenSeasonKey] | "past";
  items: string[];
};

const S2_WINTER_YEAR = 2026;

const JOURNEY: Stop[] = [
  {
    id: "s1",
    when: "2022",
    title: "Season 1",
    label: "The first incubator",
    color: "#d4a574",
    at: "past",
    items: [
      "43 land projects applied, 16 presented, and 13 became our first cohort",
      "The Regenerative Infinite Games framework, built and tested",
      "The 13-week curriculum, developed and refined",
      "The first alliance partners and the idea of crowdpooling",
    ],
  },
  {
    id: "long-winter",
    when: "2022 to 2026",
    title: "The long build",
    label: "Rest, research, and building the tools",
    color: "#d4a574",
    at: "past",
    items: [
      "Tokenomics and the two tokens of the Game, designed",
      "Quests, Games, and crowdpooling built out",
      "Hypha DAO governance, implemented and refined",
      "The Fund designed and Letters of Intent opened",
      "Legal and regulatory research for the Fund",
    ],
  },
  {
    id: "s2-winter",
    when: windowLabel("winter", S2_WINTER_YEAR),
    title: "Season 2 · Design",
    label: "Thirteen land projects design their games",
    color: SEASON_LOOK.winter.color,
    at: [2, "winter"],
    items: [
      "Selection Day opens the season in public",
      "13 weeks: governance, Game Guides, economies, tokens, legal structures",
      "The ReGen Game template and custom land games",
      "$ReGen and RGVoice live on Base for the Game",
    ],
  },
  {
    id: "s2-spring",
    when: windowLabel("spring", S2_WINTER_YEAR),
    title: "Resource",
    label: "The shared crowdpool",
    color: SEASON_LOOK.spring.color,
    at: [2, "spring"],
    items: [
      "The cohort launches one shared crowdpool",
      "Roles filled, tools lent, time and materials pledged",
      `Letters of Intent build toward the Fund's founding event (target launch ${FUND.launchTarget})`,
    ],
  },
  {
    id: "s2-summer",
    when: windowLabel("summer", S2_WINTER_YEAR),
    title: "Build",
    label: "On the land",
    color: SEASON_LOOK.summer.color,
    at: [2, "summer"],
    items: [
      "Gardens planted and buildings raised across the cohort's land",
      "Work parties, land visits, and festivals",
    ],
  },
  {
    id: "s2-fall",
    when: windowLabel("fall", S2_WINTER_YEAR),
    title: "Rest",
    label: "Harvest and rest",
    color: SEASON_LOOK.fall.color,
    at: [2, "fall"],
    items: [
      "Harvest gatherings at the land projects",
      "Rest, healing, and village life",
      "Season 3 applications",
    ],
  },
  {
    id: "s3",
    when: `From ${MONTH[TURNING_POINTS.winter.month - 1]} ${S2_WINTER_YEAR + 1}`,
    title: "Season 3 · Design",
    label: "The Handoff Festival",
    color: SEASON_LOOK.winter.color,
    at: [3, "winter"],
    items: [
      "The Season 2 cohort celebrates its harvest and hands the wheel on",
      "A new cohort of land projects sits down to design their games",
    ],
  },
];

function stopStatus(stop: Stop, now: Date): "complete" | "active" | "future" {
  if (stop.at === "past") return "complete";
  const span = regenSeasonSpan(now);
  const [n, key] = stop.at;
  const here = span.seasonNumber * 4 + REGEN_SEASON_ORDER.indexOf(span.season);
  const there = n * 4 + REGEN_SEASON_ORDER.indexOf(key);
  if (there < here) return "complete";
  if (there === here) return "active";
  return "future";
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function Seasons() {
  const now = useMemo(() => new Date(), []);
  const status = useMemo(() => season2Status(now), [now]);
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [selectionOpen, setSelectionOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0d2818]">
      <BackButton />
      <SEO {...pageSEO.seasons} />

      {/* ── 1. The wheel ── */}
      <SeasonWheel now={now} />

      {/* ── 2. This season: Season 2 opens with the Design Season ── */}
      <section id="season-2" className="relative py-20 px-4 bg-gradient-to-b from-[#0d2818] via-[#0e3334] to-[#0d2818]">
        <div className="container mx-auto max-w-5xl">
          <AnimatedSection animation="fade-in" className="text-center mb-12">
            <p
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6 text-sm font-semibold border"
              style={{ color: WINTER.color, background: `${WINTER.color}14`, borderColor: `${WINTER.color}40` }}
            >
              <WINTER.Icon className="h-4 w-4" aria-hidden="true" />
              Season 2 · the Design Season, {S2_WINTER_YEAR}
            </p>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-5 leading-tight" style={display}>
              This season, thirteen land projects{" "}
              <span style={{ color: WINTER.color }}>design their games</span>
            </h2>
            <p className="text-lg text-white/85 max-w-3xl mx-auto leading-relaxed safe-prose">
              Season 2 opens with the Design Season and our incubator. For 13 weeks, thirteen
              regenerative land projects design how their villages decide, share value, hold roles,
              and stay legal and fair. On the last week they launch into one shared crowdpool, and
              the Resource Season begins.
            </p>
          </AnimatedSection>

          {/* Where Season 2 is right now */}
          <AnimatedSection animation="slide-up" className="mb-12">
            <div
              className="glass-panel rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6"
              style={{ borderColor: `${WINTER.color}55` }}
            >
              <div
                className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: `${WINTER.color}22` }}
              >
                {status.phase === "during" ? (
                  <Radio className="w-7 h-7" style={{ color: WINTER.color }} aria-hidden="true" />
                ) : (
                  <Calendar className="w-7 h-7" style={{ color: WINTER.color }} aria-hidden="true" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {status.phase === "before" && (
                  <>
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-1" style={display}>
                      Selection Day is open to everyone
                    </h3>
                    <p className="text-white/80 safe-prose">
                      {pacificDay.format(status.selectionDay)}, {SESSION_TIME}. Every applying project
                      shares what they are building, and the season council chooses the thirteen live
                      on the call. Come and watch.
                    </p>
                  </>
                )}
                {status.phase === "during" && (
                  <>
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-1" style={display}>
                      Week {status.week} of 13: {status.title}
                    </h3>
                    <p className="text-white/80 safe-prose">
                      The cohort meets Saturdays at {SESSION_TIME}, and the sessions stream on the SEEDS
                      channel for anyone who wants to follow along.
                      {status.next ? ` Next session: ${pacificDay.format(status.next)}.` : ""}
                    </p>
                  </>
                )}
                {status.phase === "after" && (
                  <>
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-1" style={display}>
                      Season 2's Design Season is complete
                    </h3>
                    <p className="text-white/80 safe-prose">
                      The cohort designed their games and launched their crowdpool together. The
                      Resource Season is here: see what they are calling in.
                    </p>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-3 md:flex-col md:items-stretch">
                {status.phase === "before" && (
                  <a
                    href={JOIN_PATH}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                    style={{ background: WINTER.color, color: WINTER.ink }}
                  >
                    Join Selection Day
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                )}
                {status.phase === "during" && (
                  <a
                    href={SEEDS_YOUTUBE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                    style={{ background: WINTER.color, color: WINTER.ink }}
                  >
                    Watch on the SEEDS channel
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                )}
                {status.phase === "after" && (
                  <Link
                    href="/crowd-pooling"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                    style={{ background: SEASON_LOOK.spring.color, color: SEASON_LOOK.spring.ink }}
                  >
                    See the crowdpool
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                )}
                <Link
                  href="/schedule"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/25 px-5 py-2.5 font-semibold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                >
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  Full schedule
                </Link>
              </div>
            </div>
          </AnimatedSection>

          <ApplicationsNotice className="mb-12" />

          {/* How the weeks work */}
          <div className="grid md:grid-cols-3 gap-5 mb-12">
            {[
              {
                Icon: Clock,
                title: `${SESSION_DURATION_HOURS}-hour live sessions`,
                body: `Every Saturday at ${SESSION_TIME}: examples, tools, lessons, practical how-to's, and open questions.`,
              },
              {
                Icon: BookOpen,
                title: "Weekly deliverables",
                body: "Practical assignments between sessions, so every lesson lands straight in your own project.",
              },
              {
                Icon: Users,
                title: "Peer learning",
                body: "Thirteen projects working side by side, sharing what works and building alliances that last.",
              },
            ].map(({ Icon, title, body }, i) => (
              <AnimatedSection key={title} animation="slide-up" delay={i * 80}>
                <div className="h-full rounded-2xl bg-white/5 border border-white/10 p-6">
                  <Icon className="w-8 h-8 mb-4" style={{ color: WINTER.color }} aria-hidden="true" />
                  <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                  <p className="text-white/75 text-sm leading-relaxed">{body}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>

          {/* The thirteen weeks */}
          <Collapsible open={curriculumOpen} onOpenChange={setCurriculumOpen}>
            <CollapsibleTrigger className="w-full rounded-2xl border bg-white/5 p-5 md:p-6 text-left transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              style={{ borderColor: `${WINTER.color}40` }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `${WINTER.color}22` }}
                  >
                    <Calendar className="w-6 h-6" style={{ color: WINTER.color }} aria-hidden="true" />
                  </div>
                  <div>
                    <span className="block text-xl md:text-2xl font-bold text-white" style={display}>
                      The 13 weeks of the Design Season
                    </span>
                    <span className="block text-white/70 text-sm">
                      {WEEKS[0]?.start && WEEKS[12]?.start
                        ? `${pacificShort.format(WEEKS[0].start)} to ${pacificShort.format(WEEKS[12].start)}, Saturdays at ${SESSION_TIME}`
                        : "Saturdays through the winter"}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={`w-6 h-6 shrink-0 transition-transform duration-300 ${curriculumOpen ? "rotate-180" : ""}`}
                  style={{ color: WINTER.color }}
                  aria-hidden="true"
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ol className="mt-4 space-y-2">
                {WEEKS.map((w) => {
                  const isNow = status.phase === "during" && status.week === w.week;
                  return (
                    <li
                      key={w.week}
                      className="rounded-xl border bg-white/[0.04] p-4 md:p-5"
                      style={{ borderColor: isNow ? `${WINTER.color}99` : "rgba(255,255,255,0.1)" }}
                    >
                      <div className="flex items-start gap-4">
                        <span
                          className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold"
                          style={{ background: `${WINTER.color}22`, color: WINTER.color }}
                        >
                          {w.week}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <h4 className="text-base md:text-lg font-semibold text-white">{w.title}</h4>
                            {w.start && <span className="text-xs text-white/65">{pacificShort.format(w.start)}</span>}
                            {w.audience === "public" && (
                              <span
                                className="text-[0.65rem] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
                                style={{ background: WINTER.color, color: WINTER.ink }}
                              >
                                Open to everyone
                              </span>
                            )}
                            {isNow && <span className="text-xs font-semibold" style={{ color: WINTER.color }}>This week</span>}
                          </div>
                          <p className="mt-1 text-sm text-white/75 leading-relaxed safe-prose">{w.description}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </section>

      {/* ── 3. Who each cohort is for, and how it is chosen ── */}
      <section className="py-20 px-4 bg-[#0d2818]">
        <div className="container mx-auto max-w-5xl">
          <AnimatedSection animation="fade-in" className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-5" style={display}>
              Who each <span style={{ color: SEASON_LOOK.spring.color }}>cohort</span> is for
            </h2>
            <p className="text-lg text-white/80 max-w-3xl mx-auto safe-prose">
              Land projects of every size and stage, anywhere on Earth, plus the alliance partners who
              help them grow.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {[
              {
                Icon: MapPin,
                title: "Land projects",
                intro: "The minimum to apply:",
                items: [
                  "Land stewardship commitment (owned, leased, or in acquisition)",
                  "Core team of 3 or more committed members",
                  "Clear regenerative vision and values alignment",
                  "Capacity to take part fully in all 13 weeks",
                  "Willingness to share learnings with the network",
                ],
              },
              {
                Icon: Building,
                title: "Alliance partners",
                intro: "Organizations that support land projects:",
                items: [
                  "Construction, housing, energy, and infrastructure providers",
                  "Organizational, economic, and ecological design wisdom",
                  "Legal, governance, or technology expertise",
                  "Funding, investment, or financial services",
                  "Any other support for regenerative land projects",
                ],
              },
            ].map(({ Icon, title, intro, items }) => (
              <AnimatedSection key={title} animation="slide-up">
                <div className="h-full rounded-2xl bg-white/5 border border-[#7dd87d]/20 p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[#7dd87d]" aria-hidden="true" />
                    </div>
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                  </div>
                  <p className="text-white/75 mb-3 text-sm">{intro}</p>
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-white/80 text-sm">
                        <CheckCircle className="w-4 h-4 text-[#7dd87d] mt-0.5 shrink-0" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <div className="mb-8 rounded-2xl border border-[#7dd87d]/40 bg-[#7dd87d]/10 p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#7dd87d]/25 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-[#7dd87d]" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#7dd87d] mb-1">Free to apply and take part, for now</h3>
              <p className="text-white/80 text-sm leading-relaxed safe-prose">
                Applying and taking part is currently free for selected projects. As the program grows we
                intend to introduce application and participation fees to sustain the ecosystem. For now,
                if you are chosen, your commitment and full participation is your contribution.
              </p>
            </div>
          </div>

          <Collapsible open={selectionOpen} onOpenChange={setSelectionOpen}>
            <CollapsibleTrigger className="w-full rounded-2xl border border-white/15 bg-white/5 p-5 md:p-6 text-left transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#7dd87d]/20 flex items-center justify-center shrink-0">
                    <Compass className="w-6 h-6 text-[#7dd87d]" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="block text-xl md:text-2xl font-bold text-white" style={display}>
                      How the thirteen are chosen
                    </span>
                    <span className="block text-white/70 text-sm">
                      A season council of past projects and allies picks each cohort, in public
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={`w-6 h-6 shrink-0 text-[#7dd87d] transition-transform duration-300 ${selectionOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-6 md:p-8">
                <p className="text-white/80 mb-6 safe-prose">
                  The thirteen projects for each season are selected by representatives of the previous
                  seasons' allies and land projects.
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  {[
                    ["Peer review", "Past participants evaluate applications from real-world experience."],
                    ["Quality", "High-potential projects, so each cohort becomes strong case studies for the movement."],
                    ["Range", "From just starting to mature, from 1 acre to 50,000, from any country."],
                    ["Readiness", "Projects show the commitment and capacity to take part fully."],
                  ].map(([title, body]) => (
                    <div key={title} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-[#7dd87d] shrink-0 mt-0.5" aria-hidden="true" />
                      <div>
                        <h4 className="font-semibold text-white mb-1">{title}</h4>
                        <p className="text-white/70 text-sm">{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 pt-6 border-t border-white/10 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Star className="w-5 h-5 text-amber-400" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-400 mb-2">Priority for projects that support more projects</h4>
                    <p className="text-white/80 text-sm leading-relaxed safe-prose">
                      We give priority to land projects working toward becoming a case study and incubator
                      themselves: tracking and mapping their process, developing a unique "play" (a
                      replicable protocol others can learn from), and planning to host teams who come to
                      learn and run those protocols on their own land. Our deepest priority is the projects
                      that want to support more projects.
                    </p>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </section>

      {/* ── 4. A recap and passoff at every turn ── */}
      <section className="py-20 px-4 bg-gradient-to-b from-[#0d2818] to-[#10301f]">
        <div className="container mx-auto max-w-5xl">
          <AnimatedSection animation="fade-in" className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-5" style={display}>
              A recap and passoff at every <span className="text-[#d4a574]">turn</span>
            </h2>
            <p className="text-lg text-white/80 max-w-3xl mx-auto safe-prose">
              At every solstice and equinox, online or on the land, the season we're leaving recaps
              what it grew and passes off to the season ahead. We reflect, co-create what comes next,
              and choose our roles, quests, and projects. The September turn is the big one: the
              Handoff Festival, where the outgoing cohort hands the wheel to the new one.
            </p>
          </AnimatedSection>

          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {REGEN_SEASON_ORDER.map((key, i) => {
              const s = REGEN_SEASONS[key];
              const look = SEASON_LOOK[key];
              return (
                <li key={key}>
                  <AnimatedSection animation="slide-up" delay={i * 80} className="h-full">
                    <div
                      className="h-full rounded-2xl border bg-white/[0.04] p-5"
                      style={{ borderColor: `${look.color}40` }}
                    >
                      <p className="text-xs font-bold uppercase tracking-[0.16em] mb-3" style={{ color: look.color }}>
                        {TURNING_POINTS[key].label}
                      </p>
                      <div className="flex items-center gap-2 mb-2">
                        <look.Icon className="w-5 h-5" style={{ color: look.color }} aria-hidden="true" />
                        <h3 className="text-lg font-bold text-white" style={display}>
                          {s.title} begins
                        </h3>
                      </div>
                      <p className="text-sm text-white/75 leading-relaxed">{s.gathering}</p>
                    </div>
                  </AnimatedSection>
                </li>
              );
            })}
          </ol>

          <AnimatedSection animation="slide-up">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Moon className="w-6 h-6 text-[#f0ebe3]" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-bold text-white mb-1" style={display}>
                  The moon keeps time inside each season
                </h3>
                <p className="text-white/75 text-sm md:text-base leading-relaxed safe-prose">
                  Gratitude rounds follow the lunar cycle, and the Open Access Sessions meet with the new
                  moon. The seasons set the big arc of the year; the moon sets its heartbeat.
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── 5. The journey so far ── */}
      <section className="py-20 px-4 bg-gradient-to-b from-[#10301f] to-[#0d2818]">
        <div className="container mx-auto max-w-4xl">
          <AnimatedSection animation="fade-in" className="text-center mb-14">
            <p className="inline-flex items-center gap-2 bg-[#d4a574]/20 px-4 py-2 rounded-full mb-4 border border-[#d4a574]/30 text-[#d4a574] font-medium text-sm">
              <Star className="w-4 h-4" aria-hidden="true" />
              The story so far
            </p>
            <h2 className="text-3xl md:text-5xl font-bold text-white" style={display}>
              Season by <span className="text-[#7dd87d]">season</span>
            </h2>
            <p className="text-white/75 mt-4 max-w-2xl mx-auto safe-prose">
              From the first cohort in 2022, through a long stretch of building, to Season 2 and its
              first full turn of the wheel. The dates ahead are loose: we'll shape them to what this
              year needs.
            </p>
          </AnimatedSection>

          <ol className="relative">
            <div
              aria-hidden="true"
              className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px -translate-x-px bg-gradient-to-b from-[#d4a574]/40 via-[#8fd8e8]/40 to-[#8fd8e8]/10 hidden sm:block"
            />
            {JOURNEY.map((stop, idx) => {
              const st = stopStatus(stop, now);
              const right = idx % 2 === 1;
              return (
                <li key={stop.id} className="mb-10 sm:mb-12">
                  <AnimatedSection animation="slide-up" delay={Math.min(idx, 3) * 80}>
                    <div className={`relative flex items-start gap-5 sm:gap-6 ${right ? "sm:flex-row-reverse sm:text-right" : ""}`}>
                      <div className="relative z-10 shrink-0">
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center border-2 shadow-lg bg-[#0d2818]"
                          style={{
                            borderColor: stop.color,
                            boxShadow: st === "active" ? `0 0 0 6px ${stop.color}26, 0 0 24px ${stop.color}66` : undefined,
                          }}
                        >
                          {st === "complete" ? (
                            <CheckCircle className="w-7 h-7" style={{ color: stop.color }} aria-hidden="true" />
                          ) : st === "active" ? (
                            <span className="relative flex h-4 w-4">
                              <span
                                className="absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping"
                                style={{ background: stop.color }}
                              />
                              <span className="relative inline-flex h-4 w-4 rounded-full" style={{ background: stop.color }} />
                            </span>
                          ) : (
                            <Sparkles className="w-6 h-6" style={{ color: stop.color, opacity: 0.6 }} aria-hidden="true" />
                          )}
                        </div>
                      </div>
                      <div className={`flex-1 min-w-0 glass-panel rounded-2xl p-5 ${right ? "sm:mr-6" : "sm:ml-6"}`}>
                        <div className={`flex items-center gap-2 mb-2 flex-wrap ${right ? "sm:justify-end" : ""}`}>
                          <h3 className="text-white font-bold text-lg" style={display}>
                            {stop.title}
                          </h3>
                          <span
                            className="text-xs px-2.5 py-1 rounded-full font-semibold"
                            style={{ backgroundColor: `${stop.color}22`, color: stop.color, border: `1px solid ${stop.color}55` }}
                          >
                            {st === "complete" ? "Complete" : st === "active" ? "Now" : "Coming"}
                          </span>
                        </div>
                        <p className="text-white/65 text-sm mb-1">{stop.when}</p>
                        <p className="text-white font-semibold mb-3">{stop.label}</p>
                        <ul className="space-y-1.5">
                          {stop.items.map((item) => (
                            <li key={item} className={`flex items-start gap-2 text-white/75 text-sm ${right ? "sm:flex-row-reverse" : ""}`}>
                              <span style={{ color: stop.color }} className="mt-0.5 shrink-0" aria-hidden="true">
                                •
                              </span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </AnimatedSection>
                </li>
              );
            })}
          </ol>

          <p className="text-center text-sm text-white/65 max-w-2xl mx-auto safe-prose">
            {FUND.statementShort}{" "}
            <Link href="/fund" className="underline underline-offset-4 hover:text-white">
              How the Fund works
            </Link>
          </p>
        </div>
      </section>

      {/* ── 6. The way in ── */}
      <section className="py-20 px-4 bg-[#0d2818]">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6" style={display}>
            Find your <span className="text-[#7dd87d]">season</span>
          </h2>
          <p className="text-lg text-white/80 mb-8 safe-prose">
            Land projects start in the Design Season. Investors and allies come in through the
            Resource Season. Everyone is welcome on the land in the Build Season and at the harvest
            in the Rest Season.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {status.phase === "before" ? (
              <Button asChild size="lg" className="rounded-xl font-bold min-h-11" style={{ background: WINTER.color, color: WINTER.ink }}>
                <a href={JOIN_PATH}>
                  Join Selection Day
                  <ArrowRight className="ml-2 w-5 h-5" aria-hidden="true" />
                </a>
              </Button>
            ) : (
              <Button asChild size="lg" className="rounded-xl font-bold min-h-11" style={{ background: WINTER.color, color: WINTER.ink }}>
                <Link href="/season2">
                  Follow Season 2
                  <ArrowRight className="ml-2 w-5 h-5" aria-hidden="true" />
                </Link>
              </Button>
            )}
            <Button asChild size="lg" className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] rounded-xl font-bold min-h-11">
              <Link href="/apply">{APPLY_BUTTON_LABEL}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-xl border-white/30 bg-transparent text-white hover:bg-white/10 min-h-11">
              <Link href="/schedule">
                <Calendar className="mr-2 w-5 h-5" aria-hidden="true" />
                Open Access Sessions
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <RelatedContent pages={relatedContentMap.seasons.pages} blog={relatedContentMap.seasons.blog} />
    </div>
  );
}
