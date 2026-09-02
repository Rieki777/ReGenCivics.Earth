/**
 * Shared Season 2 / Open Access calendar data.
 *
 * /schedule and /season2 both render add-to-calendar buttons from this module
 * so titles, times, timezones, and ICS/Google links cannot drift.
 */

// Riverside studio details
export const RIVERSIDE_INFO = {
  topic: "ReGen Civics Season 2",
  description: "Join ReGen Civics in Season 2! Helping land projects evolve to the next stage of their regenerative journeys.",
  roomUrl: "https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b",
};

/**
 * Open Access Sessions run 1:00 to 3:00 PM Eastern on each new moon.
 * Dates here are computed from astronomical new moon times converted to
 * US Eastern, then rolled forward one year from the current active date.
 *
 * Timezone abbrev is whatever applies in US Eastern on that calendar date:
 * EDT (UTC-4) during daylight saving time, EST (UTC-5) otherwise.
 */
export type OpenAccessSession = {
  date: string;        // local ISO date in ET, YYYY-MM-DD
  dayName: string;     // day of week in ET for that date
  timezone: 'EDT' | 'EST';
  startUtc: string;    // compact UTC timestamp: YYYYMMDDTHHMMSSZ
  endUtc: string;
};

export const NEW_MOON_SESSIONS: OpenAccessSession[] = [
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

export const OPEN_ACCESS_TITLE = "ReGen Civics Open Access Session";
export const OPEN_ACCESS_DESC  = "Open community session for the ReGenerative Renaissance. Drop in, meet the community, ask questions, no commitment required.";

export function parseCompactUtc(stamp: string): Date {
  return new Date(stamp.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z'));
}

export function openAccessGoogleUrl(session: OpenAccessSession): string {
  const details = encodeURIComponent(`${OPEN_ACCESS_DESC}\n\nRiverside: ${RIVERSIDE_INFO.roomUrl}\n\nYouTube Livestream: https://www.youtube.com/@SEEDSRegenerativeEconomies`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(OPEN_ACCESS_TITLE)}&dates=${session.startUtc}/${session.endUtc}&details=${details}&location=Online+via+Riverside`;
}

export function openAccessIcsUrl(session: OpenAccessSession): string {
  const desc = `${OPEN_ACCESS_DESC}\\n\\nRiverside: ${RIVERSIDE_INFO.roomUrl}\\n\\nYouTube Livestream: https://www.youtube.com/@SEEDSRegenerativeEconomies`;
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${session.startUtc}\nDTEND:${session.endUtc}\nSUMMARY:${OPEN_ACCESS_TITLE}\nDESCRIPTION:${desc}\nLOCATION:Online via Riverside\nEND:VEVENT\nEND:VCALENDAR`;
  return `data:text/calendar;charset=utf8,${encodeURIComponent(ics)}`;
}

export function openAccessFallbackEvent(session: OpenAccessSession, idx: number) {
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
export const upcomingEventsFallback = [
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
export function toGcalDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
}

export function buildGoogleCalendarUrl(event: { title: string; startTime: string | Date; endTime?: string | Date | null; description?: string | null }) {
  const start = new Date(event.startTime);
  const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const details = encodeURIComponent(`${event.description ?? ''}\n\nRiverside: ${RIVERSIDE_INFO.roomUrl}\n\nYouTube: https://www.youtube.com/@SEEDSRegenerativeEconomies`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${toGcalDate(start)}/${toGcalDate(end)}&details=${details}&location=Online+via+Riverside`;
}

export function buildIcsDataUrl(event: { title: string; startTime: string | Date; endTime?: string | Date | null; description?: string | null }) {
  const start = new Date(event.startTime);
  const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const desc = `${event.description ?? ''}\\n\\nRiverside: ${RIVERSIDE_INFO.roomUrl}`;
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${fmt(start)}\nDTEND:${fmt(end)}\nSUMMARY:${event.title}\nDESCRIPTION:${desc}\nLOCATION:Online via Riverside\nEND:VEVENT\nEND:VCALENDAR`;
  return `data:text/calendar;charset=utf8,${encodeURIComponent(ics)}`;
}

export type CalendarFallbackEvent = {
  id: number;
  title: string;
  date: string;
  time: string;
  timezone: string;
  duration: string;
  description: string;
  type: string;
  googleCalendarUrl: string;
  appleCalendarUrl: string;
};

/** End of 2026-09-11 in America/Los_Angeles. September is PDT (UTC-7). */
export const APPLICATIONS_CLOSE = new Date("2026-09-11T23:59:59-07:00");

export const SEASON_2_SERIES_GOOGLE_URL =
  "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Season+2+Episode&dates=20260926T150000Z/20260926T170000Z&details=ReGen+Civics+Season+2+Incubator+weekly+episode.%0A%0ARiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Riverside&recur=RRULE:FREQ=WEEKLY;COUNT=13";

export const SEASON_2_SERIES_ICS_URL =
  "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20260926T150000Z%0ADTEND:20260926T170000Z%0ARRULE:FREQ=WEEKLY;COUNT=13%0ASUMMARY:ReGen+Civics+Season+2+Episode%0ADESCRIPTION:Weekly+ReGen+Civics+Season+2+Incubator+episode+(11AM-1PM+EST).%5Cn%5CnRiverside:+https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Riverside%0AEND:VEVENT%0AEND:VCALENDAR";

export function upcomingOpenAccessSessions(nowMs: number = Date.now()): OpenAccessSession[] {
  return NEW_MOON_SESSIONS.filter((s) => parseCompactUtc(s.startUtc).getTime() > nowMs);
}

export function season2EpisodeEvents(): CalendarFallbackEvent[] {
  return upcomingEventsFallback.filter((e) => e.type === "episode") as CalendarFallbackEvent[];
}

export function formatSessionLong(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function formatSessionMonthDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
