/**
 * Event Series Landing Page (#21)
 * Shows all events for a given season, split into past and upcoming.
 * Route: /series/:season
 */

import { useRoute, Link } from "wouter";
import { Calendar, Clock, Video, Play, MessageSquare, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedSection } from "@/components/AnimatedSection";
import { SEO } from "@/components/SEO";
import { PageWrapper } from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";

const SEASON_DESCRIPTIONS: Record<string, string> = {
  "Season 2": "13 weeks of hands-on incubation for regenerative land projects. Each episode builds on the last, covering governance, finance, community building, and more.",
  "Season 1": "The first cohort of ReGen Civics. Where it all started.",
  "Open": "Open community sessions, launch events, and other gatherings outside the seasonal calendar.",
};

export default function EventSeries() {
  const [, params] = useRoute("/series/:season");
  const season = decodeURIComponent(params?.season ?? "");

  const { data: events = [], isLoading } = trpc.events.getBySeason.useQuery(
    { season },
    { enabled: !!season }
  );

  const now = new Date();
  const pastEvents = events.filter(e => new Date(e.startTime) < now || e.status === "completed");
  const upcomingEvents = events.filter(e => new Date(e.startTime) >= now && e.status !== "completed" && e.status !== "cancelled");

  const description = SEASON_DESCRIPTIONS[season] ?? `All events for ${season}.`;

  return (
    <PageWrapper>
      <SEO
        title={`${season} Events | ReGen Civics`}
        description={description}
      />

      <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <AnimatedSection>
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">{season}</h1>
            <p className="text-white/70 text-lg max-w-2xl mx-auto">{description}</p>
          </div>
        </AnimatedSection>

        {isLoading && (
          <div className="text-center py-16 text-white/70">Loading events...</div>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <AnimatedSection>
            <h2 className="text-2xl font-bold text-[#7dd87d] mb-6 flex items-center gap-2">
              <Calendar size={20} /> Upcoming
            </h2>
            <div className="space-y-4 mb-16">
              {upcomingEvents.map(ev => (
                <Card key={ev.id} className="bg-[#0a1f14]/80 border-[#7dd87d]/20 hover:border-[#7dd87d]/40 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold text-lg mb-1">{ev.title}</h3>
                        <p className="text-white/70 text-sm flex items-center gap-1.5 mb-2">
                          <Clock size={13} />
                          {new Date(ev.startTime).toLocaleDateString("en-US", {
                            weekday: "long", month: "long", day: "numeric", year: "numeric",
                          })}
                          {" at "}
                          {new Date(ev.startTime).toLocaleTimeString("en-US", {
                            hour: "numeric", minute: "2-digit",
                          })}
                          {ev.timezone ? ` ${ev.timezone}` : ""}
                        </p>
                        {ev.description && (
                          <p className="text-white/60 text-sm leading-relaxed">{ev.description}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <Link href={`/schedule`}>
                          <Button size="sm" className="bg-[#1a472a] text-[#7dd87d] border border-[#7dd87d]/40 hover:bg-[#7dd87d]/20">
                            Sign Up
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </AnimatedSection>
        )}

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <AnimatedSection>
            <h2 className="text-2xl font-bold text-white/80 mb-6 flex items-center gap-2">
              <Play size={20} /> Past Sessions
            </h2>
            <div className="space-y-3">
              {pastEvents.map(ev => (
                <Card key={ev.id} className="bg-[#0a1f14]/50 border-white/10 hover:border-white/20 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="text-white/80 font-medium mb-1">{ev.title}</h3>
                        <p className="text-white/60 text-xs flex items-center gap-1.5">
                          <Clock size={11} />
                          {new Date(ev.startTime).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {ev.youtubeUrl && (
                          <a href={ev.youtubeUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 px-2 text-xs">
                              <Video size={12} className="mr-1" /> Watch Recording
                            </Button>
                          </a>
                        )}
                        {ev.forumThreadId && (
                          <Link href={`/community/post/${ev.forumThreadId}`}>
                            <Button size="sm" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 h-7 px-2 text-xs">
                              <MessageSquare size={12} className="mr-1" /> Discussion
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </AnimatedSection>
        )}

        {!isLoading && events.length === 0 && (
          <div className="text-center py-16">
            <p className="text-white/70 text-lg mb-4">No events found for "{season}"</p>
            <Link href="/schedule">
              <Button variant="outline" className="border-[#7dd87d]/40 text-[#7dd87d] hover:bg-[#7dd87d]/10">
                View Full Schedule
              </Button>
            </Link>
          </div>
        )}

        <div className="text-center mt-12">
          <Link href="/schedule">
            <Button variant="ghost" className="text-white/70 hover:text-white">
              <ExternalLink size={14} className="mr-1.5" /> View Full Schedule
            </Button>
          </Link>
        </div>
      </div>
    </PageWrapper>
  );
}
