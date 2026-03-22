/**
 * Schedule Page
 * Design: Magical community gathering space theme
 * Features: Calendar integration, Zoom meeting info
 */

import { useState } from 'react';
import { Link } from 'wouter';
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
  Copy,
  Check,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedSection } from '@/components/AnimatedSection';
import { SEO, pageSEO } from '@/components/SEO';
import { JsonLD, schemas } from '@/components/JsonLD';
import { BackButton } from "@/components/BackButton";
import { RelatedContent, relatedContentMap } from "@/components/RelatedContent";
import AMABanner from "@/components/AMABanner";
import { PageWrapper } from "@/components/PageWrapper";
import { trpc } from '@/lib/trpc';



// Zoom meeting details
const ZOOM_INFO = {
  topic: "ReGen Civics Season 2",
  description: "Join ReGen Civics in Season 2! Helping land projects evolve to the next stage of their regenerative journeys.",
  link: "https://us06web.zoom.us/j/5776315796?pwd=w43yb4Kpa6WAniIx1tHAqYINj3zoPx.1",
  meetingId: "577 631 5796",
  passcode: "333",
  dialIn: {
    us: "+17193594580,,5776315796#,,,,*333#",
    nyc: "+19292056099,,5776315796#,,,,*333#"
  },
  joinInstructions: "https://us06web.zoom.us/meetings/5776315796/invitations?signature=f2f6tE4yeiG0uSqLztgjLo0KBp9JN497HFbYvmXqnEU"
};

// YouTube playlist for Season 1 recordings
const YOUTUBE_PLAYLIST = "https://www.youtube.com/watch?v=AJZI0OiRPeU&list=PL3Xi8vZSmBTSUZsQ82awoNIQS8ceBQ4io";

// Events - Open Session March 29. Season 2 starts September 2026
// Episodes run 11:00 AM - 1:00 PM EST (16:00-18:00 UTC) for 13 weeks
const upcomingEvents = [
  {
    id: 0,
    title: "Season 2 Community Session",
    date: "2026-03-29",
    time: "1:00 PM",
    timezone: "EST",
    duration: "2 hours",
    description: "Join us for an open introduction to Season 2! Learn about the program, meet the community, discover if this journey is right for your land project, and help us select the best day/time for the 13-week episodes.",
    type: "open",
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Season+2+Community+Session&dates=20260329T180000Z/20260329T200000Z&details=Join+us+for+an+open+introduction+to+Season+2.%0A%0AZoom:+https://us06web.zoom.us/j/5776315796%0AMeeting+ID:+577+631+5796%0APasscode:+333%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Zoom",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20260329T180000Z%0ADTEND:20260329T200000Z%0ASUMMARY:ReGen+Civics+Season+2+Community+Session%0ADESCRIPTION:Join+us+for+an+open+introduction+to+Season+2.%5Cn%5CnZoom:+https://us06web.zoom.us/j/5776315796%5CnMeeting+ID:+577+631+5796%5CnPasscode:+333%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Zoom%0AEND:VEVENT%0AEND:VCALENDAR"
  },
  {
    id: 100,
    title: "ReGen Civics Alliance Launch Party",
    date: "2026-04-22",
    time: "11:00 AM",
    timezone: "EDT",
    duration: "2-3 hours",
    description: "Speaking during the main portion of this event is invite only. Apply to be an alliance member if you'd like to be considered for an invitation. However, anyone can attend the call and see the magic. We'll likely have a session at the end of the event for everyone to talk and meet.",
    type: "open",
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Alliance+Launch+Party&dates=20260422T150000Z/20260422T180000Z&details=ReGen+Civics+Alliance+Launch+Party%0A%0ASpeaking+during+the+main+portion+is+invite+only.+Apply+to+be+an+alliance+member+for+an+invitation.+Anyone+can+attend+and+see+the+magic.%0A%0AZoom:+https://us06web.zoom.us/j/5776315796%0AMeeting+ID:+577+631+5796%0APasscode:+333%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Zoom",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20260422T150000Z%0ADTEND:20260422T180000Z%0ASUMMARY:ReGen+Civics+Alliance+Launch+Party%0ADESCRIPTION:Speaking+during+the+main+portion+is+invite+only.+Apply+to+be+an+alliance+member+for+an+invitation.+Anyone+can+attend+and+see+the+magic.%5Cn%5CnZoom:+https://us06web.zoom.us/j/5776315796%5CnMeeting+ID:+577+631+5796%5CnPasscode:+333%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Zoom%0AEND:VEVENT%0AEND:VCALENDAR"
  },
  {
    id: 1,
    title: "Week 1: Selection Day",
    date: "2026-09-26",
    time: "11:00 AM",
    timezone: "EDT",
    duration: "2 hours",
    description: "First steps of the ReGen Civics Incubator. Meet the selected projects, set intentions, and begin mapping your regenerative vision together.",
    type: "episode",
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Week+1:+Selection+Day&dates=20260926T150000Z/20260926T170000Z&details=First+steps+of+the+ReGen+Civics+Incubator.%0A%0AZoom:+https://us06web.zoom.us/j/5776315796%0AMeeting+ID:+577+631+5796%0APasscode:+333%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Zoom",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20260926T150000Z%0ADTEND:20260926T170000Z%0ASUMMARY:ReGen+Civics+Week+1:+Selection+Day%0ADESCRIPTION:First+steps+of+the+ReGen+Civics+Incubator.%5Cn%5CnZoom:+https://us06web.zoom.us/j/5776315796%5CnMeeting+ID:+577+631+5796%5CnPasscode:+333%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Zoom%0AEND:VEVENT%0AEND:VCALENDAR"
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
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Week+2:+Incubator+Overview&dates=20261003T150000Z/20261003T170000Z&details=Deep+dive+into+the+incubator+structure.%0A%0AZoom:+https://us06web.zoom.us/j/5776315796%0AMeeting+ID:+577+631+5796%0APasscode:+333%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Zoom",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20261003T150000Z%0ADTEND:20261003T170000Z%0ASUMMARY:ReGen+Civics+Week+2:+Incubator+Overview%0ADESCRIPTION:Deep+dive+into+the+incubator+structure.%5Cn%5CnZoom:+https://us06web.zoom.us/j/5776315796%5CnMeeting+ID:+577+631+5796%5CnPasscode:+333%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Zoom%0AEND:VEVENT%0AEND:VCALENDAR"
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
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Week+3:+DAO/DHO/Org+Co-Creation+Part+1&dates=20261010T150000Z/20261010T170000Z&details=Introduction+to+decentralized+autonomous+organizations.%0A%0AZoom:+https://us06web.zoom.us/j/5776315796%0AMeeting+ID:+577+631+5796%0APasscode:+333%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Zoom",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20261010T150000Z%0ADTEND:20261010T170000Z%0ASUMMARY:ReGen+Civics+Week+3:+DAO/DHO/Org+Co-Creation+Part+1%0ADESCRIPTION:Introduction+to+decentralized+autonomous+organizations.%5Cn%5CnZoom:+https://us06web.zoom.us/j/5776315796%5CnMeeting+ID:+577+631+5796%5CnPasscode:+333%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Zoom%0AEND:VEVENT%0AEND:VCALENDAR"
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
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Week+4:+DAO/DHO/Org+Co-Creation+Part+2&dates=20261017T150000Z/20261017T170000Z&details=Practical+implementation+of+governance+frameworks.%0A%0AZoom:+https://us06web.zoom.us/j/5776315796%0AMeeting+ID:+577+631+5796%0APasscode:+333%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Zoom",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20261017T150000Z%0ADTEND:20261017T170000Z%0ASUMMARY:ReGen+Civics+Week+4:+DAO/DHO/Org+Co-Creation+Part+2%0ADESCRIPTION:Practical+implementation+of+governance+frameworks.%5Cn%5CnZoom:+https://us06web.zoom.us/j/5776315796%5CnMeeting+ID:+577+631+5796%5CnPasscode:+333%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Zoom%0AEND:VEVENT%0AEND:VCALENDAR"
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
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Week+5:+Game+Guides+%26+Economic+Systems&dates=20261024T150000Z/20261024T170000Z&details=Co-creating+project+Game+Guides+and+economic+systems.%0A%0AZoom:+https://us06web.zoom.us/j/5776315796%0AMeeting+ID:+577+631+5796%0APasscode:+333%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Zoom",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20261024T150000Z%0ADTEND:20261024T170000Z%0ASUMMARY:ReGen+Civics+Week+5:+Game+Guides+%26+Economic+Systems%0ADESCRIPTION:Co-creating+project+Game+Guides+and+economic+systems.%5Cn%5CnZoom:+https://us06web.zoom.us/j/5776315796%5CnMeeting+ID:+577+631+5796%5CnPasscode:+333%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Zoom%0AEND:VEVENT%0AEND:VCALENDAR"
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
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Week+6:+Intro+to+the+ReGen+Civics+DHO&dates=20261031T150000Z/20261031T170000Z&details=Introduction+to+the+ReGen+Civics+DHO.%0A%0AZoom:+https://us06web.zoom.us/j/5776315796%0AMeeting+ID:+577+631+5796%0APasscode:+333%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Zoom",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20261031T150000Z%0ADTEND:20261031T170000Z%0ASUMMARY:ReGen+Civics+Week+6:+Intro+to+the+ReGen+Civics+DHO%0ADESCRIPTION:Introduction+to+the+ReGen+Civics+DHO.%5Cn%5CnZoom:+https://us06web.zoom.us/j/5776315796%5CnMeeting+ID:+577+631+5796%5CnPasscode:+333%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Zoom%0AEND:VEVENT%0AEND:VCALENDAR"
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
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Week+7:+Ecosystem+Map+%26+Policies&dates=20261107T160000Z/20261107T180000Z&details=Ecosystem+mapping+and+policy+design.%0A%0AZoom:+https://us06web.zoom.us/j/5776315796%0AMeeting+ID:+577+631+5796%0APasscode:+333%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Zoom",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20261107T160000Z%0ADTEND:20261107T180000Z%0ASUMMARY:ReGen+Civics+Week+7:+Ecosystem+Map+%26+Policies%0ADESCRIPTION:Ecosystem+mapping+and+policy+design.%5Cn%5CnZoom:+https://us06web.zoom.us/j/5776315796%5CnMeeting+ID:+577+631+5796%5CnPasscode:+333%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Zoom%0AEND:VEVENT%0AEND:VCALENDAR"
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
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Week+8:+Tokenomics+Part+1&dates=20261114T160000Z/20261114T180000Z&details=Token-assisted+land-based+economies.%0A%0AZoom:+https://us06web.zoom.us/j/5776315796%0AMeeting+ID:+577+631+5796%0APasscode:+333%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Zoom",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20261114T160000Z%0ADTEND:20261114T180000Z%0ASUMMARY:ReGen+Civics+Week+8:+Tokenomics+Part+1%0ADESCRIPTION:Token-assisted+land-based+economies.%5Cn%5CnZoom:+https://us06web.zoom.us/j/5776315796%5CnMeeting+ID:+577+631+5796%5CnPasscode:+333%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Zoom%0AEND:VEVENT%0AEND:VCALENDAR"
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
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Week+9:+Tokenomics+Part+2&dates=20261121T160000Z/20261121T180000Z&details=Practical+token+design+for+your+project.%0A%0AZoom:+https://us06web.zoom.us/j/5776315796%0AMeeting+ID:+577+631+5796%0APasscode:+333%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Zoom",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20261121T160000Z%0ADTEND:20261121T180000Z%0ASUMMARY:ReGen+Civics+Week+9:+Tokenomics+Part+2%0ADESCRIPTION:Practical+token+design+for+your+project.%5Cn%5CnZoom:+https://us06web.zoom.us/j/5776315796%5CnMeeting+ID:+577+631+5796%5CnPasscode:+333%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Zoom%0AEND:VEVENT%0AEND:VCALENDAR"
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
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Week+10:+Legal+Structures+Part+1&dates=20261128T160000Z/20261128T180000Z&details=Exploring+legal+structures+for+regenerative+projects.%0A%0AZoom:+https://us06web.zoom.us/j/5776315796%0AMeeting+ID:+577+631+5796%0APasscode:+333%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Zoom",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20261128T160000Z%0ADTEND:20261128T180000Z%0ASUMMARY:ReGen+Civics+Week+10:+Legal+Structures+Part+1%0ADESCRIPTION:Exploring+legal+structures+for+regenerative+projects.%5Cn%5CnZoom:+https://us06web.zoom.us/j/5776315796%5CnMeeting+ID:+577+631+5796%5CnPasscode:+333%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Zoom%0AEND:VEVENT%0AEND:VCALENDAR"
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
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Week+11:+Legal+Structures+Part+2&dates=20261205T160000Z/20261205T180000Z&details=Practical+considerations+for+land+ownership+and+compliance.%0A%0AZoom:+https://us06web.zoom.us/j/5776315796%0AMeeting+ID:+577+631+5796%0APasscode:+333%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Zoom",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20261205T160000Z%0ADTEND:20261205T180000Z%0ASUMMARY:ReGen+Civics+Week+11:+Legal+Structures+Part+2%0ADESCRIPTION:Practical+considerations+for+land+ownership+and+compliance.%5Cn%5CnZoom:+https://us06web.zoom.us/j/5776315796%5CnMeeting+ID:+577+631+5796%5CnPasscode:+333%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Zoom%0AEND:VEVENT%0AEND:VCALENDAR"
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
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Week+12:+Coordination+%26+Minimum+Viable+Economies&dates=20261212T160000Z/20261212T180000Z&details=Creating+minimum+viable+regenerative+economies.%0A%0AZoom:+https://us06web.zoom.us/j/5776315796%0AMeeting+ID:+577+631+5796%0APasscode:+333%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Zoom",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20261212T160000Z%0ADTEND:20261212T180000Z%0ASUMMARY:ReGen+Civics+Week+12:+Coordination+%26+Minimum+Viable+Economies%0ADESCRIPTION:Creating+minimum+viable+regenerative+economies.%5Cn%5CnZoom:+https://us06web.zoom.us/j/5776315796%5CnMeeting+ID:+577+631+5796%5CnPasscode:+333%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Zoom%0AEND:VEVENT%0AEND:VCALENDAR"
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
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Week+13:+Season+Overview+%26+Project+Updates&dates=20261219T160000Z/20261219T180000Z&details=Season+finale+and+project+updates.%0A%0AZoom:+https://us06web.zoom.us/j/5776315796%0AMeeting+ID:+577+631+5796%0APasscode:+333%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Zoom",
    appleCalendarUrl: "data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20261219T160000Z%0ADTEND:20261219T180000Z%0ASUMMARY:ReGen+Civics+Week+13:+Season+Overview+%26+Project+Updates%0ADESCRIPTION:Season+finale+and+project+updates.%5Cn%5CnZoom:+https://us06web.zoom.us/j/5776315796%5CnMeeting+ID:+577+631+5796%5CnPasscode:+333%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Zoom%0AEND:VEVENT%0AEND:VCALENDAR"
  }
];

export default function Schedule() {
  const [expandedEvent, setExpandedEvent] = useState<number | null>(1);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  // Per-event reminder signup
  const [reminderOpenFor, setReminderOpenFor] = useState<number | null>(null);
  const [reminderEmail, setReminderEmail] = useState<string>('');
  const [reminderSuccess, setReminderSuccess] = useState<number | null>(null);

  const reminderMutation = trpc.newsletter.subscribe.useMutation();

  const submitReminder = (event: { id: number; title: string }) => {
    if (!reminderEmail.trim()) return;
    const eventId = event.id;
    reminderMutation.mutate(
      {
        email: reminderEmail.trim(),
        name: `[EVENT: ${event.title}]`,
        source: 'other',
      },
      {
        onSuccess: () => {
          setReminderSuccess(eventId);
          setReminderOpenFor(null);
          setReminderEmail('');
          setTimeout(() => setReminderSuccess(null), 6000);
        },
      }
    );
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    // Toast notification handled by state
    setTimeout(() => setCopiedField(null), 2000);
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
      <AMABanner />
      {/* Open Session Announcement Banner */}
      <div className="bg-[#7dd87d]/20 border-b border-[#7dd87d]/30 px-4 py-3 text-center">
        <p className="text-[#7dd87d] font-medium text-sm md:text-base">
          🌿 Open Session call is Sunday March 29th with the SEEDS community and other friends of the Regenerative Renaissance
        </p>
      </div>
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
            src="https://assets.regencivics.earth/MnRHvgPyBDbKYbay.jpg"
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
          
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Join our gatherings and be part of the regenerative renaissance. Add events to your calendar and tune in!
          </p>
        </div>
      </section>

      {/* Quick Add to Calendar Section */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Add Whole Season */}
            <div className="bg-gradient-to-br from-[#7dd87d]/20 to-[#4a9f4a]/10 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[#7dd87d]" />
                </div>
                <h3 className="text-lg font-bold text-white">Season 2 Episodes</h3>
              </div>
              <p className="text-white/60 text-sm mb-4">All 13 weekly episodes, Sept–Dec 2026</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Season+2+Episode&dates=20260926T150000Z/20260926T170000Z&details=ReGen+Civics+Season+2+Incubator+weekly+episode.%0A%0AZoom:+https://us06web.zoom.us/j/5776315796%0AMeeting+ID:+577+631+5796%0APasscode:+333%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Zoom&recur=RRULE:FREQ=WEEKLY;COUNT=13"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-800 px-4 py-2 rounded-xl font-medium transition-colors text-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path d="M19.5 3H4.5C3.67 3 3 3.67 3 4.5V19.5C3 20.33 3.67 21 4.5 21H19.5C20.33 21 21 20.33 21 19.5V4.5C21 3.67 20.33 3 19.5 3Z" fill="#4285F4"/>
                    <path d="M12 8V16M8 12H16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Google Calendar
                </a>
                <a
                  href="data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20260926T150000Z%0ADTEND:20260926T170000Z%0ARRULE:FREQ=WEEKLY;COUNT=13%0ASUMMARY:ReGen+Civics+Season+2+Episode%0ADESCRIPTION:Weekly+ReGen+Civics+Season+2+Incubator+episode+(11AM-1PM+EST).%5Cn%5CnZoom:+https://us06web.zoom.us/j/5776315796%5CnMeeting+ID:+577+631+5796%5CnPasscode:+333%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Zoom%0AEND:VEVENT%0AEND:VCALENDAR"
                  download="regen-civics-season-2.ics"
                  className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 3H7C5.9 3 5 3.9 5 5V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V5C19 3.9 18.1 3 17 3ZM12 18C11.45 18 11 17.55 11 17C11 16.45 11.45 16 12 16C12.55 16 13 16.45 13 17C13 17.55 12.55 18 12 18ZM15 14H9V6H15V14Z"/>
                  </svg>
                  Apple/Outlook (.ics)
                </a>
              </div>
            </div>
            
            {/* Subscribe to All Events */}
            <div className="bg-gradient-to-br from-[#4a9f4a]/20 to-[#2d5a3d]/20 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[#7dd87d]" />
                </div>
                <h3 className="text-lg font-bold text-white">All Events</h3>
              </div>
              <p className="text-white/60 text-sm mb-4">Subscribe and new events appear automatically — no re-downloading</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="https://calendar.google.com/calendar/u/0?cid=63ce71cca81ab47fb9986b4bc1dd379eba3da72ecc93a9b8424c5c49812fa69f%40group.calendar.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] px-4 py-2 rounded-xl font-semibold transition-colors text-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path d="M19.5 3H4.5C3.67 3 3 3.67 3 4.5V19.5C3 20.33 3.67 21 4.5 21H19.5C20.33 21 21 20.33 21 19.5V4.5C21 3.67 20.33 3 19.5 3Z" fill="#4285F4"/>
                    <path d="M12 8V16M8 12H16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Subscribe (Google)
                </a>
                <a
                  href="webcal://calendar.google.com/calendar/ical/63ce71cca81ab47fb9986b4bc1dd379eba3da72ecc93a9b8424c5c49812fa69f%40group.calendar.google.com/public/basic.ics"
                  className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 3H7C5.9 3 5 3.9 5 5V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V5C19 3.9 18.1 3 17 3ZM12 18C11.45 18 11 17.55 11 17C11 16.45 11.45 16 12 16C12.55 16 13 16.45 13 17C13 17.55 12.55 18 12 18ZM15 14H9V6H15V14Z"/>
                  </svg>
                  Apple/Outlook (live)
                </a>
                <a
                  href="/regen-civics-all-events.ics"
                  download="regen-civics-all-events.ics"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white/60 hover:text-white px-3 py-2 rounded-xl font-medium transition-colors text-xs border border-white/10"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                  </svg>
                  Snapshot .ics
                </a>
              </div>
              <p className="text-white/30 text-xs mt-3">Live subscription updates automatically as new events are added</p>
            </div>

            {/* Add Next Event */}
            <div className="bg-gradient-to-br from-[#7dd87d]/30 to-[#4a9f4a]/20 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/40 ring-2 ring-[#7dd87d]/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#7dd87d]/30 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-[#7dd87d]" />
                </div>
                <div>
                  <span className="inline-block bg-[#7dd87d] text-[#1a472a] text-xs font-bold px-2 py-0.5 rounded-full mb-1">NEXT EVENT</span>
                  <h3 className="text-lg font-bold text-white">Open Access Session</h3>
                </div>
              </div>
              <p className="text-white/60 text-sm mb-2">March 29, 2026 at 1:00 PM - 3:00 PM EST</p>
              <p className="text-white/50 text-xs mb-4">Open introduction to Season 2 - no commitment required!</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=ReGen+Civics+Season+2+Open+Access+Session&dates=20260329T180000Z/20260329T200000Z&details=Join+us+for+an+open+introduction+to+Season+2.%0A%0AZoom:+https://us06web.zoom.us/j/5776315796%0AMeeting+ID:+577+631+5796%0APasscode:+333%0A%0AYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies&location=Online+via+Zoom"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] px-4 py-2 rounded-xl font-semibold transition-colors text-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path d="M19.5 3H4.5C3.67 3 3 3.67 3 4.5V19.5C3 20.33 3.67 21 4.5 21H19.5C20.33 21 21 20.33 21 19.5V4.5C21 3.67 20.33 3 19.5 3Z" fill="currentColor"/>
                    <path d="M12 8V16M8 12H16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Add to Google
                </a>
                <a
                  href="data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:20260329T180000Z%0ADTEND:20260329T200000Z%0ASUMMARY:ReGen+Civics+Season+2+Open+Access+Session%0ADESCRIPTION:Join+us+for+an+open+introduction+to+Season+2+(1PM-3PM+EST).%5Cn%5CnZoom:+https://us06web.zoom.us/j/5776315796%5CnMeeting+ID:+577+631+5796%5CnPasscode:+333%5Cn%5CnYouTube+Livestream:+https://www.youtube.com/@SEEDSRegenerativeEconomies%0ALOCATION:Online+via+Zoom%0AEND:VEVENT%0AEND:VCALENDAR"
                  download="regen-civics-open-session.ics"
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

      {/* Zoom Meeting Info */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-gradient-to-r from-[#7dd87d]/20 to-[#4a9f4a]/20 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/30">
            <div className="flex items-center gap-3 mb-4">
              <Video className="w-6 h-6 text-[#7dd87d]" />
              <h2 className="text-xl font-bold text-white">All Episodes via Zoom</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white/60 text-sm mb-1">Meeting ID</p>
                <div className="flex items-center justify-between">
                  <span className="text-white font-mono">{ZOOM_INFO.meetingId}</span>
                  <button 
                    onClick={() => copyToClipboard(ZOOM_INFO.meetingId, 'Meeting ID')}
                    className="text-[#7dd87d] hover:text-[#9de89d] transition-colors"
                  >
                    {copiedField === 'Meeting ID' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white/60 text-sm mb-1">Passcode</p>
                <div className="flex items-center justify-between">
                  <span className="text-white font-mono">{ZOOM_INFO.passcode}</span>
                  <button 
                    onClick={() => copyToClipboard(ZOOM_INFO.passcode, 'Passcode')}
                    className="text-[#7dd87d] hover:text-[#9de89d] transition-colors"
                  >
                    {copiedField === 'Passcode' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            
            <a 
              href={ZOOM_INFO.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#2D8CFF] hover:bg-[#2681eb] text-white px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              <Video className="w-5 h-5" />
              Join Zoom Meeting
              <ExternalLink className="w-4 h-4" />
            </a>
            
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-white/50 text-sm">
                <strong>One-tap mobile:</strong> {ZOOM_INFO.dialIn.us} (US) | {ZOOM_INFO.dialIn.nyc} (New York)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Follow Along with YouTube */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-gradient-to-r from-[#7dd87d]/20 to-[#4a9f4a]/20 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/30">
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

      {/* Events List */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-white mb-8 text-center" style={{ fontFamily: 'var(--font-display)' }}>
            Upcoming <span className="text-[#7dd87d]">Events</span>
          </h2>
          
          <div className="space-y-4">
            {upcomingEvents.map((event) => (
              <div 
                key={event.id}
                className={`bg-white/5 backdrop-blur-sm rounded-2xl border transition-all duration-300 overflow-hidden ${
                  event.type === 'open' 
                    ? 'border-[#7dd87d]/50 ring-2 ring-[#7dd87d]/20' 
                    : 'border-[#7dd87d]/20 hover:border-[#7dd87d]/40'
                }`}
              >
                <button
                  onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                  className="w-full p-6 text-left"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      {event.type === 'open' && (
                        <span className="inline-block bg-[#7dd87d] text-[#1a472a] text-xs font-bold px-2 py-1 rounded-full mb-2">
                          OPEN ACCESS
                        </span>
                      )}
                      <h3 className="text-xl font-bold text-white">{event.title}</h3>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-white/60">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {event.date === 'TBD' ? 'Date TBD' : formatDate(event.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {event.time === 'TBD' ? 'Time TBD' : `${event.time} ${event.timezone}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          Online via Zoom
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {expandedEvent === event.id ? (
                        <ChevronUp className="w-5 h-5 text-[#7dd87d]" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-white/50" />
                      )}
                    </div>
                  </div>
                </button>
                
                {expandedEvent === event.id && (
                  <div className="px-6 pb-6 pt-0 border-t border-white/10">
                    <p className="text-white/70 mb-6 mt-4">{event.description}</p>
                    
                    <div className="flex flex-wrap gap-3">
                      {event.googleCalendarUrl ? (
                        <a
                          href={event.googleCalendarUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-800 px-4 py-2 rounded-xl font-medium transition-colors"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                            <path d="M19.5 3H4.5C3.67 3 3 3.67 3 4.5V19.5C3 20.33 3.67 21 4.5 21H19.5C20.33 21 21 20.33 21 19.5V4.5C21 3.67 20.33 3 19.5 3Z" fill="#4285F4"/>
                            <path d="M12 8V16M8 12H16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                          Add to Google Calendar
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-2 bg-white/20 text-white/60 px-4 py-2 rounded-xl font-medium cursor-not-allowed">
                          <Calendar className="w-5 h-5" />
                          Calendar link coming soon
                        </span>
                      )}
                      
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
                      
                      <a
                        href={ZOOM_INFO.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-[#2D8CFF] hover:bg-[#2681eb] text-white px-4 py-2 rounded-xl font-medium transition-colors"
                      >
                        <Video className="w-5 h-5" />
                        Join Zoom
                      </a>

                      {/* Per-event reminder */}
                      {reminderSuccess === event.id ? (
                        <span className="inline-flex items-center gap-2 bg-[#7dd87d]/20 text-[#7dd87d] px-4 py-2 rounded-xl font-medium text-sm border border-[#7dd87d]/30">
                          <Check className="w-4 h-4" />
                          Reminder set!
                        </span>
                      ) : reminderOpenFor === event.id ? (
                        <div className="flex items-center gap-2 w-full mt-2">
                          <input
                            type="email"
                            placeholder="your@email.com"
                            value={reminderEmail}
                            onChange={(e) => setReminderEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && submitReminder(event)}
                            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#7dd87d]/60"
                            autoFocus
                          />
                          <button
                            onClick={() => submitReminder(event)}
                            disabled={reminderMutation.isPending || !reminderEmail.trim()}
                            className="bg-[#7dd87d] hover:bg-[#6bc86b] disabled:opacity-50 text-[#1a472a] px-4 py-2 rounded-xl font-medium text-sm transition-colors"
                          >
                            {reminderMutation.isPending ? '...' : 'Notify me'}
                          </button>
                          <button
                            onClick={() => { setReminderOpenFor(null); setReminderEmail(''); }}
                            className="text-white/40 hover:text-white/70 px-2 py-2 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReminderOpenFor(event.id)}
                          className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm border border-white/10"
                        >
                          <Bell className="w-4 h-4" />
                          Get Reminder
                        </button>
                      )}
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
              <h3 className="font-bold text-white mb-2">Join Zoom or Youtube</h3>
              <p className="text-white/60 text-sm">Use the meeting link or dial in at the scheduled time.</p>
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
          <p className="text-white/70 mb-8">
            Applications are now open for land projects interested in joining the next Season cohort.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/seasons">
              <Button size="lg" variant="outline" className="border-[#7dd87d] text-[#7dd87d] hover:bg-[#7dd87d]/10 rounded-xl">
                Learn About Next Season
              </Button>
            </Link>
            <Link href="/apply">
              <Button size="lg" className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] rounded-xl">
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
