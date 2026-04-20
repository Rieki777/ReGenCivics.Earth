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

/**
 * RecordingsSection: shows the most recent episode recordings published via
 * the Riverside webhook. Pulled from the recordings table on the server.
 * Renders nothing if there are no recordings yet.
 */
function RecordingsSection() {
  const { data: recordings = [] } = trpc.recordings.list.useQuery({ limit: 12 });
  if (!recordings || recordings.length === 0) return null;

  return (
    <section className="py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/20">
          <h3 className="text-2xl font-bold text-white mb-1">Episode Recordings</h3>
          <p className="text-white/60 text-sm mb-5">Catch up on past sessions.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recordings.map((r: any) => {
              const url = r.youtubeUrl ?? null;
              const date = r.sessionDate ? new Date(r.sessionDate).toLocaleDateString() : null;
              return (
                <a
                  key={r.id}
                  href={url ?? (r.forumPostId ? `/community/post/${r.forumPostId}` : "#")}
                  target={url ? "_blank" : undefined}
                  rel={url ? "noopener noreferrer" : undefined}
                  className="group flex gap-3 bg-white/5 hover:bg-white/8 rounded-xl p-3 border border-white/10 hover:border-[#7dd87d]/40 transition-colors"
                >
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
                      <Video className="w-6 h-6 text-[#7dd87d]/60" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-semibold text-sm group-hover:text-[#7dd87d] transition-colors line-clamp-2">
                      {r.title || "Untitled session"}
                    </h4>
                    {date && <p className="text-white/50 text-xs mt-1">{date}</p>}
                    {r.forumPostId && (
                      <p className="text-[#7dd87d]/70 text-[11px] mt-1">Discuss in forum</p>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// Riverside studio details
const RIVERSIDE_INFO = {
  topic: "ReGen Civics Season 2",
  description: "Join ReGen Civics in Season 2! Helping land projects evolve to the next stage of their regenerative journeys.",
  roomUrl: "https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b",
};

// YouTube playlist for Season 1 recordings
const YOUTUBE_PLAYLIST = "https://www.youtube.com/watch?v=AJZI0OiRPeU&list=PL3Xi8vZSmBTSUZsQ82awoNIQS8ceBQ4io";

/**
 * Open Access Sessions run 1:00 to 3:00 PM Eastern on each new moon.
 * Dates here are computed from astronomical new moon times converted to
 * US Eastern, then rolled forward one year from the current active date.
 *
 * Timezone abbrev is whatever applies in US Eastern on that calendar date:
 * EDT (UTC-4) during daylight saving time, EST (UTC-5) otherwise.
 */
type OpenAccessSession = {
  date: string;        // local ISO date in ET, YYYY-MM-DD
  dayName: string;     // day of week in ET for that date
  timezone: 'EDT' | 'EST';
  startUtc: string;    // compact UTC timestamp: YYYYMMDDTHHMMSSZ
  endUtc: string;
};

const NEW_MOON_SESSIONS: OpenAccessSession[] = [
  { date: '2026-05-16', dayName: 'Saturday',  timezone: 'EDT', startUtc: '20260516T170000Z', endUtc: '20260516T190000Z' },
  { date: '2026-06-14', dayName: 'Sunday',    timezone: 'EDT', startUtc: '20260614T170000Z', endUtc: '20260614T190000Z' },
  { date: '2026-07-14', dayName: 'Tuesday',   timezone: 'EDT', startUtc: '20260714T170000Z', endUtc: '20260714T190000Z' },
  { date: '2026-08-12', dayName: 'Wednesday', timezone: 'EDT', startUtc: '20260812T170000Z', endUtc: '20260812T190000Z' },
  { date: '2026-09-10', dayName: 'Thursday',  timezone: 'EDT', startUtc: '20260910T170000Z', endUtc: '20260910T190000Z' },
  { date: '2026-10-10', dayName: 'Saturday',  timezone: 'EDT', startUtc: '20261010T170000Z', endUtc: '20261010T190000Z' },
  { date: '2026-11-09', dayName: 'Monday',    timezone: 'EST', startUtc: '20261109T180000Z', endUtc: '20261109T200000Z' },
  { date: '2026-12-08', dayName: 'Tuesday',   timezone: 'EST', startUtc: '20261208T180000Z', endUtc: '20261208T200000Z' },
  { date: '2027-01-07', dayName: 'Thursday',  timezone: 'EST', startUtc: '20270107T180000Z', endUtc: '20270107T200000Z' },
  { date: '2027-02-06', dayName: 'Saturday',  timezone: 'EST', startUtc: '20270206T180000Z', endUtc: '20270206T200000Z' },
  { date: '2027-03-08', dayName: 'Monday',    timezone: 'EST', startUtc: '20270308T180000Z', endUtc: '20270308T200000Z' },
  { date: '2027-04-06', dayName: 'Tuesday',   timezone: 'EDT', startUtc: '20270406T170000Z', endUtc: '20270406T190000Z' },
];

const OPEN_ACCESS_TITLE = "ReGen Civics Open Access Session";
const OPEN_ACCESS_DESC  = "Open community session for the Regenerative Renaissance. Drop in, meet the community, ask questions, no commitment required.";

function parseCompactUtc(stamp: string): Date {
  return new Date(stamp.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z'));
}

function openAccessGoogleUrl(session: OpenAccessSession): string {
  const details = encodeURIComponent(`${OPEN_ACCESS_DESC}\n\nRiverside: ${RIVERSIDE_INFO.roomUrl}\n\nYouTube Livestream: https://www.youtube.com/@SEEDSRegenerativeEconomies`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(OPEN_ACCESS_TITLE)}&dates=${session.startUtc}/${session.endUtc}&details=${details}&location=Online+via+Riverside`;
}

function openAccessIcsUrl(session: OpenAccessSession): string {
  const desc = `${OPEN_ACCESS_DESC}\\n\\nRiverside: ${RIVERSIDE_INFO.roomUrl}\\n\\nYouTube Livestream: https://www.youtube.com/@SEEDSRegenerativeEconomies`;
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${session.startUtc}\nDTEND:${session.endUtc}\nSUMMARY:${OPEN_ACCESS_TITLE}\nDESCRIPTION:${desc}\nLOCATION:Online via Riverside\nEND:VEVENT\nEND:VCALENDAR`;
  return `data:text/calendar;charset=utf8,${encodeURIComponent(ics)}`;
}

function openAccessFallbackEvent(session: OpenAccessSession, idx: number) {
  return {
    id: 200 + idx,
    title: OPEN_ACCESS_TITLE,
    date: session.date,
    time: "1:00 PM",
    timezone: session.timezone,
    duration: "2 hours",
    description: OPEN_ACCESS_DESC,
    type: "open",
    googleCalendarUrl: openAccessGoogleUrl(session),
    appleCalendarUrl: openAccessIcsUrl(session),
  };
}

// Fallback hardcoded events, used only if the DB events table is empty or unreachable
// The DB is the real source of truth once migrations have run.
const upcomingEventsFallback = [
  ...NEW_MOON_SESSIONS.map(openAccessFallbackEvent),
  {
    id: 1,
    title: "Week 1: Selection Day",
    date: "2026-09-26",
    time: "11:00 AM",
    timezone: "EDT",
    duration: "2 hours",
    description: "First steps of the ReGen Civics Incubator. Meet the selected projects, set intentions, and begin mapping your regenerative vision together.",
    type: "episode",
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Week+1:+Selection+Day&dates=20260926T150000Z/20260926T170000Z&details=First+steps+of+the+ReGen+Civics+Incubator.%0A%0ARiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Riverside",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20260926T150000Z%0ADTEND:20260926T170000Z%0ASUMMARY:ReGen+Civics+Week+1:+Selection+Day%0ADESCRIPTION:First+steps+of+the+ReGen+Civics+Incubator.%5Cn%5CnRiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Riverside%0AEND:VEVENT%0AEND:VCALENDAR"
  },
  {
    id: 2,
    title: "Week 2: Incubator Overview",
    date: "2026-10-03",
    time: "11:00 AM",
    timezone: "EDT",
    duration: "2 hours",
    description: "Starting Season 2! Deep dive into the incubator structure, expectations, and how we'll journey together over the next 13 episodes.",
    type: "episode",
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Week+2:+Incubator+Overview&dates=20261003T150000Z/20261003T170000Z&details=Deep+dive+into+the+incubator+structure.%0A%0ARiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Riverside",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20261003T150000Z%0ADTEND:20261003T170000Z%0ASUMMARY:ReGen+Civics+Week+2:+Incubator+Overview%0ADESCRIPTION:Deep+dive+into+the+incubator+structure.%5Cn%5CnRiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Riverside%0AEND:VEVENT%0AEND:VCALENDAR"
  },
  {
    id: 3,
    title: "Week 3: DAO/DHO/Org Co-Creation Part 1",
    date: "2026-10-10",
    time: "11:00 AM",
    timezone: "EDT",
    duration: "2 hours",
    description: "Designing the structure of our projects. Introduction to decentralized autonomous organizations and how to structure your community.",
    type: "episode",
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Week+3:+DAO/DHO/Org+Co-Creation+Part+1&dates=20261010T150000Z/20261010T170000Z&details=Introduction+to+decentralized+autonomous+organizations.%0A%0ARiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Riverside",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20261010T150000Z%0ADTEND:20261010T170000Z%0ASUMMARY:ReGen+Civics+Week+3:+DAO/DHO/Org+Co-Creation+Part+1%0ADESCRIPTION:Introduction+to+decentralized+autonomous+organizations.%5Cn%5CnRiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Riverside%0AEND:VEVENT%0AEND:VCALENDAR"
  },
  {
    id: 4,
    title: "Week 4: DAO/DHO/Org Co-Creation Part 2",
    date: "2026-10-17",
    time: "11:00 AM",
    timezone: "EDT",
    duration: "2 hours",
    description: "Continuing to design the structure of our projects. Practical implementation of governance frameworks and community design.",
    type: "episode",
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Week+4:+DAO/DHO/Org+Co-Creation+Part+2&dates=20261017T150000Z/20261017T170000Z&details=Practical+implementation+of+governance+frameworks.%0A%0ARiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Riverside",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20261017T150000Z%0ADTEND:20261017T170000Z%0ASUMMARY:ReGen+Civics+Week+4:+DAO/DHO/Org+Co-Creation+Part+2%0ADESCRIPTION:Practical+implementation+of+governance+frameworks.%5Cn%5CnRiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Riverside%0AEND:VEVENT%0AEND:VCALENDAR"
  },
  {
    id: 5,
    title: "Week 5: Game Guides & Economic Systems",
    date: "2026-10-24",
    time: "11:00 AM",
    timezone: "EDT",
    duration: "2 hours",
    description: "Co-creating project 'Game Guides' and kickstarting our economic systems. How to document your project's unique plays and patterns.",
    type: "episode",
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Week+5:+Game+Guides+%26+Economic+Systems&dates=20261024T150000Z/20261024T170000Z&details=Co-creating+project+Game+Guides+and+economic+systems.%0A%0ARiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Riverside",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20261024T150000Z%0ADTEND:20261024T170000Z%0ASUMMARY:ReGen+Civics+Week+5:+Game+Guides+%26+Economic+Systems%0ADESCRIPTION:Co-creating+project+Game+Guides+and+economic+systems.%5Cn%5CnRiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Riverside%0AEND:VEVENT%0AEND:VCALENDAR"
  },
  {
    id: 6,
    title: "Week 6: Intro to the ReGen Civics DHO",
    date: "2026-10-31",
    time: "11:00 AM",
    timezone: "EDT",
    duration: "2 hours",
    description: "Introduction to the ReGen Civics DHO and the first steps in setting up yours. How our alliance operates and how you can participate.",
    type: "episode",
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Week+6:+Intro+to+the+ReGen+Civics+DHO&dates=20261031T150000Z/20261031T170000Z&details=Introduction+to+the+ReGen+Civics+DHO.%0A%0ARiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Riverside",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20261031T150000Z%0ADTEND:20261031T170000Z%0ASUMMARY:ReGen+Civics+Week+6:+Intro+to+the+ReGen+Civics+DHO%0ADESCRIPTION:Introduction+to+the+ReGen+Civics+DHO.%5Cn%5CnRiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Riverside%0AEND:VEVENT%0AEND:VCALENDAR"
  },
  {
    id: 7,
    title: "Week 7: Ecosystem Map & Policies",
    date: "2026-11-07",
    time: "11:00 AM",
    timezone: "EST",
    duration: "2 hours",
    description: "Evolving our culture through ecosystem mapping and policy design. How we co-create the rules of our regenerative game.",
    type: "episode",
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Week+7:+Ecosystem+Map+%26+Policies&dates=20261107T160000Z/20261107T180000Z&details=Ecosystem+mapping+and+policy+design.%0A%0ARiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Riverside",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20261107T160000Z%0ADTEND:20261107T180000Z%0ASUMMARY:ReGen+Civics+Week+7:+Ecosystem+Map+%26+Policies%0ADESCRIPTION:Ecosystem+mapping+and+policy+design.%5Cn%5CnRiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Riverside%0AEND:VEVENT%0AEND:VCALENDAR"
  },
  {
    id: 8,
    title: "Week 8: Tokenomics Part 1",
    date: "2026-11-14",
    time: "11:00 AM",
    timezone: "EST",
    duration: "2 hours",
    description: "The art and science of our token-assisted land-based economies. Understanding how tokens can support regenerative projects.",
    type: "episode",
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Week+8:+Tokenomics+Part+1&dates=20261114T160000Z/20261114T180000Z&details=Token-assisted+land-based+economies.%0A%0ARiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Riverside",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20261114T160000Z%0ADTEND:20261114T180000Z%0ASUMMARY:ReGen+Civics+Week+8:+Tokenomics+Part+1%0ADESCRIPTION:Token-assisted+land-based+economies.%5Cn%5CnRiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Riverside%0AEND:VEVENT%0AEND:VCALENDAR"
  },
  {
    id: 9,
    title: "Week 9: Tokenomics Part 2",
    date: "2026-11-21",
    time: "11:00 AM",
    timezone: "EST",
    duration: "2 hours",
    description: "Continuing the art and theory of our token-assisted land-based economies. Practical token design for your project.",
    type: "episode",
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Week+9:+Tokenomics+Part+2&dates=20261121T160000Z/20261121T180000Z&details=Practical+token+design+for+your+project.%0A%0ARiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Riverside",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20261121T160000Z%0ADTEND:20261121T180000Z%0ASUMMARY:ReGen+Civics+Week+9:+Tokenomics+Part+2%0ADESCRIPTION:Practical+token+design+for+your+project.%5Cn%5CnRiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Riverside%0AEND:VEVENT%0AEND:VCALENDAR"
  },
  {
    id: 10,
    title: "Week 10: Legal Structures Part 1",
    date: "2026-11-28",
    time: "11:00 AM",
    timezone: "EST",
    duration: "2 hours",
    description: "Exploring the expansive world of legal structures. How do our projects relate to nation states and existing legal frameworks?",
    type: "episode",
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Week+10:+Legal+Structures+Part+1&dates=20261128T160000Z/20261128T180000Z&details=Exploring+legal+structures+for+regenerative+projects.%0A%0ARiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Riverside",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20261128T160000Z%0ADTEND:20261128T180000Z%0ASUMMARY:ReGen+Civics+Week+10:+Legal+Structures+Part+1%0ADESCRIPTION:Exploring+legal+structures+for+regenerative+projects.%5Cn%5CnRiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Riverside%0AEND:VEVENT%0AEND:VCALENDAR"
  },
  {
    id: 11,
    title: "Week 11: Legal Structures Part 2",
    date: "2026-12-05",
    time: "11:00 AM",
    timezone: "EST",
    duration: "2 hours",
    description: "Continuing to explore legal structures. Practical considerations for land ownership, community agreements, and compliance.",
    type: "episode",
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Week+11:+Legal+Structures+Part+2&dates=20261205T160000Z/20261205T180000Z&details=Practical+considerations+for+land+ownership+and+compliance.%0A%0ARiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Riverside",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20261205T160000Z%0ADTEND:20261205T180000Z%0ASUMMARY:ReGen+Civics+Week+11:+Legal+Structures+Part+2%0ADESCRIPTION:Practical+considerations+for+land+ownership+and+compliance.%5Cn%5CnRiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Riverside%0AEND:VEVENT%0AEND:VCALENDAR"
  },
  {
    id: 12,
    title: "Week 12: Coordination & Minimum Viable Economies",
    date: "2026-12-12",
    time: "11:00 AM",
    timezone: "EST",
    duration: "2 hours",
    description: "Meeting our needs through coordination structures. How do we create minimum viable regenerative economies? How do we thrive?",
    type: "episode",
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Week+12:+Coordination+%26+Minimum+Viable+Economies&dates=20261212T160000Z/20261212T180000Z&details=Creating+minimum+viable+regenerative+economies.%0A%0ARiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Riverside",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20261212T160000Z%0ADTEND:20261212T180000Z%0ASUMMARY:ReGen+Civics+Week+12:+Coordination+%26+Minimum+Viable+Economies%0ADESCRIPTION:Creating+minimum+viable+regenerative+economies.%5Cn%5CnRiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Riverside%0AEND:VEVENT%0AEND:VCALENDAR"
  },
  {
    id: 13,
    title: "Week 13: Season Overview & Project Updates",
    date: "2026-12-19",
    time: "11:00 AM",
    timezone: "EST",
    duration: "2 hours",
    description: "A complete overview of the ReGen Civics Incubator journey. Project stewards share updates on their progress and celebrate our collective achievements.",
    type: "episode",
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Week+13:+Season+Overview+%26+Project+Updates&dates=20261219T160000Z/20261219T180000Z&details=Season+finale+and+project+updates.%0A%0ARiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Riverside",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20261219T160000Z%0ADTEND:20261219T180000Z%0ASUMMARY:ReGen+Civics+Week+13:+Season+Overview+%26+Project+Updates%0ADESCRIPTION:Season+finale+and+project+updates.%5Cn%5CnRiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Riverside%0AEND:VEVENT%0AEND:VCALENDAR"
  }
];

// ─── Calendar URL helpers ────────────────────────────────────────────────────
function toGcalDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
}

function buildGoogleCalendarUrl(event: { title: string; startTime: string | Date; endTime?: string | Date | null; description?: string | null }) {
  const start = new Date(event.startTime);
  const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const details = encodeURIComponent(`${event.description ?? ''}\n\nRiverside: ${RIVERSIDE_INFO.roomUrl}\n\nYouTube: https://www.youtube.com/@SEEDSRegenerativeEconomies`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${toGcalDate(start)}/${toGcalDate(end)}&details=${details}&location=Online+via+Riverside`;
}

function buildIcsDataUrl(event: { title: string; startTime: string | Date; endTime?: string | Date | null; description?: string | null }) {
  const start = new Date(event.startTime);
  const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const desc = `${event.description ?? ''}\\n\\nRiverside: ${RIVERSIDE_INFO.roomUrl}`;
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${fmt(start)}\nDTEND:${fmt(end)}\nSUMMARY:${event.title}\nDESCRIPTION:${desc}\nLOCATION:Online via Riverside\nEND:VEVENT\nEND:VCALENDAR`;
  return `data:text/calendar;charset=utf8,${encodeURIComponent(ics)}`;
}
// ─────────────────────────────────────────────────────────────────────────────

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
  const upcomingOpenAccessSessions = NEW_MOON_SESSIONS
    .filter(s => parseCompactUtc(s.startUtc).getTime() > Date.now());
  const nextOpenAccessSession = upcomingOpenAccessSessions[0] ?? null;
  const followingOpenAccessSessions = upcomingOpenAccessSessions.slice(1, 3);
  const formatSessionMonthDay = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  const formatSessionLong = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

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
            🌿 Next Open Access Session: {nextOpenAccessSession.dayName}, {formatSessionLong(nextOpenAccessSession.date)} at 1:00 PM {nextOpenAccessSession.timezone}. Every new moon, open to all.
          </p>
        </div>
      )}
      <BackButton />
      <SEO {...pageSEO.schedule} />
      <JsonLD data={schemas.event({
        name: "ReGen Civics Open Community Call",
        description: "Monthly community sessions, open calls, and events where regenerators connect, coordinate, and co-create the Regenerative Renaissance. Join investors, land stewards, and players.",
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
            Join our gatherings and be part of the regenerative renaissance. Add events to your calendar and tune in!
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
                  {nextOpenAccessSession.dayName}, {formatSessionLong(nextOpenAccessSession.date)} at 1:00 - 3:00 PM {nextOpenAccessSession.timezone}
                </p>
                <p className="text-white/55 text-xs mb-4">Every new moon. Open to anyone curious about the Regenerative Renaissance.</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <a
                    href={openAccessGoogleUrl(nextOpenAccessSession)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] px-4 py-2 rounded-xl font-semibold transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path d="M19.5 3H4.5C3.67 3 3 3.67 3 4.5V19.5C3 20.33 3.67 21 4.5 21H19.5C20.33 21 21 20.33 21 19.5V4.5C21 3.67 20.33 3 19.5 3Z" fill="#4285f4"/>
                      <path d="M12 8V16M8 12H16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Google Calendar
                  </a>
                  <a
                    href={openAccessIcsUrl(nextOpenAccessSession)}
                    download="regen-civics-open-session.ics"
                    className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm border border-white/20"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17 3H7C5.9 3 5 3.9 5 5V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V5C19 3.9 18.1 3 17 3ZM12 18C11.45 18 11 17.55 11 17C11 16.45 11.45 16 12 16C12.55 16 13 16.45 13 17C13 17.55 12.55 18 12 18ZM15 14H9V6H15V14Z"/>
                    </svg>
                    Apple/Outlook
                  </a>
                </div>
                {followingOpenAccessSessions.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#7dd87d]/80 font-bold mb-1">Also coming up</p>
                    <ul className="text-white/60 text-xs space-y-0.5">
                      {followingOpenAccessSessions.map(s => (
                        <li key={s.date}>
                          {s.dayName}, {formatSessionMonthDay(s.date)} - 1:00 PM {s.timezone}
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
              <p className="text-white/60 text-sm mb-4">Subscribe and new events appear automatically. No re-downloading needed.</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="https://calendar.google.com/calendar/u/0?cid=63ce71cca81ab47fb9986b4bc1dd379eba3da72ecc93a9b8424c5c49812fa69f%40group.calendar.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] px-4 py-2 rounded-xl font-semibold transition-colors text-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path d="M19.5 3H4.5C3.67 3 3 3.67 3 4.5V19.5C3 20.33 3.67 21 4.5 21H19.5C20.33 21 21 20.33 21 19.5V4.5C21 3.67 20.33 3 19.5 3Z" fill="#4285f4"/>
                    <path d="M12 8V16M8 12H16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Google Calendar
                </a>
                <a
                  href="webcal://calendar.google.com/calendar/ical/63ce71cca81ab47fb9986b4bc1dd379eba3da72ecc93a9b8424c5c49812fa69f%40group.calendar.google.com/public/basic.ics"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm border border-white/20"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 3H7C5.9 3 5 3.9 5 5V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V5C19 3.9 18.1 3 17 3ZM12 18C11.45 18 11 17.55 11 17C11 16.45 11.45 16 12 16C12.55 16 13 16.45 13 17C13 17.55 12.55 18 12 18ZM15 14H9V6H15V14Z"/>
                  </svg>
                  Apple/Outlook
                </a>
                <a
                  href="/regen-civics-all-events.ics"
                  download="regen-civics-all-events.ics"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white px-4 py-2 rounded-xl font-medium transition-colors text-xs border border-white/10"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                  </svg>
                  Download .ics
                </a>
              </div>
              <p className="text-white/55 text-xs mt-3">Live subscription updates automatically as new events are added</p>
            </div>

            {/* Season 2 Episodes (last card) */}
            <div className="bg-gradient-to-br from-[#7dd87d]/20 to-[#4a7c59]/10 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[#7dd87d]" />
                </div>
                <h3 className="text-lg font-bold text-white">Season 2 Episodes</h3>
              </div>
              <p className="text-white/60 text-sm mb-4">All 13 weekly episodes, Sept-Dec 2026</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Season+2+Episode&dates=20260926T150000Z/20260926T170000Z&details=ReGen+Civics+Season+2+Incubator+weekly+episode.%0A%0ARiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Riverside&recur=RRULE:FREQ=WEEKLY;COUNT=13"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] px-4 py-2 rounded-xl font-semibold transition-colors text-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path d="M19.5 3H4.5C3.67 3 3 3.67 3 4.5V19.5C3 20.33 3.67 21 4.5 21H19.5C20.33 21 21 20.33 21 19.5V4.5C21 3.67 20.33 3 19.5 3Z" fill="#4285f4"/>
                    <path d="M12 8V16M8 12H16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Google Calendar
                </a>
                <a
                  href="data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20260926T150000Z%0ADTEND:20260926T170000Z%0ARRULE:FREQ=WEEKLY;COUNT=13%0ASUMMARY:ReGen+Civics+Season+2+Episode%0ADESCRIPTION:Weekly+ReGen+Civics+Season+2+Incubator+episode+(11AM-1PM+EST).%5Cn%5CnRiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Riverside%0AEND:VEVENT%0AEND:VCALENDAR"
                  download="regen-civics-season-2.ics"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm border border-white/20"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 3H7C5.9 3 5 3.9 5 5V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V5C19 3.9 18.1 3 17 3ZM12 18C11.45 18 11 17.55 11 17C11 16.45 11.45 16 12 16C12.55 16 13 16.45 13 17C13 17.55 12.55 18 12 18ZM15 14H9V6H15V14Z"/>
                  </svg>
                  Apple/Outlook
                </a>
              </div>
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

      {/* Episode Recordings */}
      <RecordingsSection />

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
              <p className="text-center text-white/50 py-8">
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
                            const stored = `${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} ${(event as any).timezone ?? 'UTC'}`;
                            // #12, show user's local time if different timezone
                            const localTime = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: userTz, timeZoneName: 'short' });
                            const storedTz = (event as any).timezone ?? 'UTC';
                            const localTzAbbr = new Intl.DateTimeFormat('en-US', { timeZone: userTz, timeZoneName: 'short' }).format(d).split(' ').pop() ?? '';
                            return storedTz !== localTzAbbr ? `${stored} (${localTime} your time)` : stored;
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
                        <ChevronDown className="w-5 h-5 text-white/50" />
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
                            <p className="text-white/50 text-xs mt-1">{(event as any).guestSpeakerBio}</p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-3">
                      {/* #5. Save to Calendar buttons, more prominent */}
                      {event.googleCalendarUrl ? (
                        <a
                          href={event.googleCalendarUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] px-4 py-2 rounded-xl font-semibold transition-colors"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                            <path d="M19.5 3H4.5C3.67 3 3 3.67 3 4.5V19.5C3 20.33 3.67 21 4.5 21H19.5C20.33 21 21 20.33 21 19.5V4.5C21 3.67 20.33 3 19.5 3Z" fill="#4285f4"/>
                            <path d="M12 8V16M8 12H16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                          Save to Calendar
                        </a>
                      ) : null}

                      {event.appleCalendarUrl && (
                        <a
                          href={event.appleCalendarUrl}
                          download={`${event.title.replace(/\s+/g, '-')}.ics`}
                          className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17 3H7C5.9 3 5 3.9 5 5V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V5C19 3.9 18.1 3 17 3ZM12 18C11.45 18 11 17.55 11 17C11 16.45 11.45 16 12 16C12.55 16 13 16.45 13 17C13 17.55 12.55 18 12 18ZM15 14H9V6H15V14Z"/>
                          </svg>
                          Add to Apple Calendar
                        </a>
                      )}
                      
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
                              autoFocus
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
                            className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/55 text-xs focus:outline-none focus:border-[#7dd87d]/40"
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
                          className="inline-flex items-center gap-2 bg-white/5 hover:bg-purple-600/20 text-white/50 hover:text-purple-300 px-4 py-2 rounded-xl font-medium transition-colors text-sm border border-white/10 hover:border-purple-500/30"
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
          
          {/* Note about TBD dates */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-sm px-6 py-3 rounded-xl border border-white/10">
              <Clock className="w-5 h-5 text-[#7dd87d]" />
              <span className="text-white/60">Episode day/time may be adjusted during the 1st Episode based on the 13 selected projects' availability</span>
            </div>
          </div>
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
