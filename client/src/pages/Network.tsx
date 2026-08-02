/**
 * The ReGen Civics network of regenerative games.
 * Route: /network
 *
 * The return half of the foundation credit. Every custom game we deliver carries
 * a credit line linking back to regencivics.earth (shared/foundationCredit.ts);
 * this page links back out to each game, so the credit is a two-way network.
 *
 * The links a crawler needs are already in the HTML before this component
 * mounts: server/_core/crawler-content.ts renders the same list at request time,
 * because GPTBot, ClaudeBot, and PerplexityBot fetch HTML without running
 * JavaScript. This page is the version humans read.
 */

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, ExternalLink, Globe, KeyRound, Network as NetworkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { AnimatedSection } from "@/components/AnimatedSection";
import { BackButton } from "@/components/BackButton";
import { PageWrapper } from "@/components/PageWrapper";
import { NETWORK_GAMES, listedGames, type NetworkGame } from "@shared/networkRegistry";

const display = { fontFamily: "var(--font-display)" } as const;

type GameView = NetworkGame & {
  feed?: { projectCount: number; description: string | null; generatedAt: string | null } | null;
};

function GameCard({ game }: { game: GameView }) {
  const host = game.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <article className="bg-white/5 border border-[#7dd87d]/20 rounded-2xl p-6 md:p-8 hover:bg-white/10 transition-colors">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <h3 className="text-xl md:text-2xl font-bold text-white" style={display}>
          {game.name}
        </h3>
        <span
          className={
            game.status === "live"
              ? "text-xs uppercase tracking-wide px-2.5 py-1 rounded-full bg-[#7dd87d]/20 text-[#7dd87d] border border-[#7dd87d]/40"
              : "text-xs uppercase tracking-wide px-2.5 py-1 rounded-full bg-[#d4a574]/20 text-[#d4a574] border border-[#d4a574]/40"
          }
        >
          {game.status === "live" ? "Live" : "In build"}
        </span>
      </div>

      <p className="text-white/75 leading-relaxed mb-2">{game.blurb}</p>
      <p className="text-sm text-white/50 mb-5">
        {game.location}
        {game.feed && game.feed.projectCount > 0
          ? ` · ${game.feed.projectCount} project${game.feed.projectCount === 1 ? "" : "s"} in its federation feed`
          : ""}
      </p>

      <div className="flex flex-wrap gap-3">
        <a
          href={game.url}
          className="inline-flex items-center gap-2 text-[#7dd87d] hover:text-[#9de89d] font-semibold pointer-coarse:min-h-11"
        >
          {host}
          <ExternalLink className="w-4 h-4" />
        </a>
        {game.projectUrl ? (
          <a
            href={game.projectUrl}
            className="inline-flex items-center gap-2 text-white/55 hover:text-white/80 pointer-coarse:min-h-11"
          >
            {game.projectUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            <ExternalLink className="w-4 h-4" />
          </a>
        ) : null}
      </div>
    </article>
  );
}

export default function Network() {
  // The registry ships in the bundle, so the list renders instantly. The fetch
  // only adds what each game's own federation feed reports on top of it.
  const [games, setGames] = useState<GameView[]>(() => listedGames(NETWORK_GAMES));

  useEffect(() => {
    let cancelled = false;
    fetch("/api/network/games.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data || !Array.isArray(data.games)) return;
        setGames(data.games as GameView[]);
      })
      .catch(() => {
        /* the registry list is already on screen */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const liveCount = games.filter((g) => g.status === "live").length;

  return (
    <PageWrapper>
      <div className="min-h-screen bg-gradient-to-br from-[#0d2818] via-[#1a472a] to-[#0d2818]">
        <SEO
          title="The Network of Regenerative Games: ReGen Civics"
          description="Land projects running their own coordination game, built with ReGen Civics and owned outright by the project."
          url="/network"
        />

        <div className="container mx-auto px-4 pt-8 pb-4">
          <BackButton />
        </div>

        {/* Hero */}
        <section className="container mx-auto px-4 py-10 md:py-16 text-center">
          <AnimatedSection animation="fade-in">
            <div className="w-14 h-14 rounded-full bg-[#7dd87d]/15 border border-[#7dd87d]/30 flex items-center justify-center mx-auto mb-6">
              <NetworkIcon className="w-7 h-7 text-[#7dd87d]" />
            </div>
            <h1
              className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight"
              style={display}
            >
              The network of regenerative games
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
              Land projects run their own coordination game: a web app on their domain, in their
              brand, holding their data, that shows residents, business builders, core team, and
              investors how the project actually works. Each one below was built with ReGen Civics
              and belongs entirely to the project running it.
            </p>
          </AnimatedSection>
        </section>

        {/* The games */}
        <section className="container mx-auto px-4 pb-6">
          <AnimatedSection animation="slide-up">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-sm uppercase tracking-widest text-[#7dd87d] mb-5">
                {liveCount === 1 ? "One game live" : `${liveCount} games live`}
              </h2>
              <div className="grid gap-5">
                {games.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            </div>
          </AnimatedSection>
        </section>

        {/* What they share */}
        <section className="container mx-auto px-4 py-12">
          <AnimatedSection animation="slide-up">
            <div className="max-w-3xl mx-auto grid sm:grid-cols-3 gap-5">
              {[
                {
                  icon: KeyRound,
                  title: "Owned outright",
                  desc: "Code, data, and keys belong to the project. We change nothing after handoff unless they ask.",
                },
                {
                  icon: Globe,
                  title: "Their own language",
                  desc: "Their members, their currency, their guide's name and voice. The shape is shared, the culture is theirs.",
                },
                {
                  icon: NetworkIcon,
                  title: "Readable by machines",
                  desc: "Every game publishes its projects at /api/federation/projects.json, so partner networks read the whole network in one format.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="bg-white/5 border border-[#7dd87d]/15 rounded-2xl p-6"
                  >
                    <Icon className="w-6 h-6 text-[#7dd87d] mb-3" />
                    <h3 className="font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-sm text-white/60 leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </AnimatedSection>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 pb-20">
          <AnimatedSection animation="fade-in">
            <div className="max-w-2xl mx-auto bg-white/5 border border-[#7dd87d]/20 rounded-2xl p-8 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3" style={display}>
                Put your land project on this page
              </h2>
              <p className="text-white/65 mb-6 leading-relaxed">
                Design your game in one conversation, watch a first draft come back, then build it
                out with your team over three to six months. You own the result.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/custom-games">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-[#d4a574] to-[#ffd700] text-[#1a472a] font-bold px-8 pointer-coarse:min-h-11"
                  >
                    How custom games work
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/custom-games/apply">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 border-[#7dd87d]/50 text-[#7dd87d] hover:bg-[#7dd87d]/10 px-8 pointer-coarse:min-h-11"
                  >
                    Start the intake
                  </Button>
                </Link>
              </div>
            </div>
          </AnimatedSection>
        </section>
      </div>
    </PageWrapper>
  );
}
