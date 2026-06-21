/**
 * Economy Page - The Regenerative Economy
 * Route: /economy
 * Design: Dark green theme, direct voice, grounded explanations
 * Content: How the three coordination tools work, citizenship tiers, seasonal harvest
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AnimatedSection } from "@/components/AnimatedSection";
import { SEO } from "@/components/SEO";
import { PageTransition } from "@/components/PageTransition";
import {
  ArrowRight,
  BarChart3,
  Heart,
  Vote,
  Sprout,
  Compass,
  TreeDeciduous,
  Crown,
  Users,
  Coins,
  Star,
  ExternalLink,
} from "lucide-react";

// Tier card for citizenship levels
function TierCard({
  title,
  emoji,
  description,
  requirements,
  powers,
  accentColor,
}: {
  title: string;
  emoji: string;
  description: string;
  requirements: string[];
  powers: string[];
  accentColor: string;
}) {
  return (
    <div
      className="rounded-2xl border border-white/10 p-6 md:p-8 flex flex-col"
      style={{ background: "rgba(255,255,255,0.05)" }}
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{emoji}</span>
        <h3
          className="text-xl md:text-2xl font-bold text-white"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h3>
      </div>
      <p
        className="text-white/80 mb-5 leading-relaxed"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {description}
      </p>
      <div className="mb-4">
        <h4
          className="text-sm uppercase tracking-wider mb-2"
          style={{ color: accentColor, fontFamily: "var(--font-display)" }}
        >
          Requirements
        </h4>
        <ul className="space-y-1">
          {requirements.map((req, i) => (
            <li
              key={i}
              className="text-white/70 text-sm flex items-start gap-2"
              style={{ fontFamily: "var(--font-body)" }}
            >
              <span style={{ color: accentColor }} className="mt-0.5">
                +
              </span>
              {req}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-auto">
        <h4
          className="text-sm uppercase tracking-wider mb-2"
          style={{ color: accentColor, fontFamily: "var(--font-display)" }}
        >
          Powers
        </h4>
        <ul className="space-y-1">
          {powers.map((power, i) => (
            <li
              key={i}
              className="text-white/70 text-sm flex items-start gap-2"
              style={{ fontFamily: "var(--font-body)" }}
            >
              <span style={{ color: accentColor }} className="mt-0.5">
                +
              </span>
              {power}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Harvest split visual
function HarvestSplit({
  label,
  percent,
  color,
  description,
}: {
  label: string;
  percent: number;
  color: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold text-[#1a472a]"
        style={{ backgroundColor: color, fontFamily: "var(--font-display)" }}
      >
        {percent}%
      </div>
      <div>
        <h4
          className="text-white font-bold text-lg"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {label}
        </h4>
        <p
          className="text-white/70 text-sm leading-relaxed"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

export default function Economy() {
  return (
    <PageTransition>
      <SEO
        title="The Regenerative Economy | ReGen Civics"
        description="A real economic system built through gameplay. Contribution scores, gratitude tokens, seasonal harvests, and open governance. Every variable is yours to shape."
        url="/economy"
      />

      <div className="min-h-screen" style={{ background: "#1a472a" }}>
        {/* Hero */}
        <section className="relative pt-28 pb-20 px-4 md:px-8 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute top-20 left-1/4 w-96 h-96 rounded-full blur-3xl"
              style={{ background: "#7dd87d" }}
            />
            <div
              className="absolute bottom-10 right-1/4 w-64 h-64 rounded-full blur-3xl"
              style={{ background: "#7dd87d" }}
            />
          </div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <AnimatedSection>
              <h1
                className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                The Regenerative Economy
              </h1>
              <p
                className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed"
                style={{ fontFamily: "var(--font-body)" }}
              >
                A real economic system, built through gameplay. Three
                coordination tools. Open governance. A currency grounded in
                regenerative food systems. Every variable is yours to shape.
              </p>
            </AnimatedSection>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 md:py-24 px-4 md:px-8">
          <div className="max-w-4xl mx-auto">
            <AnimatedSection>
              <h2
                className="text-3xl md:text-4xl font-bold text-white mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                How It Works
              </h2>
              <p
                className="text-white/70 mb-12 text-lg leading-relaxed max-w-3xl"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Every society coordinates with tools. Markets, governments, tax codes. Ours are failing. They subsidize the destruction of forests, make it profitable to poison rivers, and concentrate wealth upward. We built different tools.
              </p>
            </AnimatedSection>

            <div className="grid gap-10 md:gap-14">
              {/* Tool 1: Contribution Scores */}
              <AnimatedSection>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#7dd87d]/20 flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-6 h-6 text-[#7dd87d]" />
                  </div>
                  <div>
                    <h3
                      className="text-xl md:text-2xl font-bold text-white mb-3"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Contribution Scores
                    </h3>
                    <div
                      className="space-y-3 text-white/75 leading-relaxed"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      <p>
                        We track a growing range of contributions: quests completed, people invited, land projects endorsed, transactions facilitated, proposals passed, forum engagement, events attended, food produced and distributed.
                      </p>
                      <p>
                        Each action earns points. Points are ranked against all other players on a percentile scale from 0 to 99. Your score determines your share of the seasonal Harvest and your governance voice.
                      </p>
                      <p>
                        The percentile system is the key. A billionaire and a community gardener are scored on the same 0 to 99 scale. Hoarding has diminishing returns. Contributing does not. Over time, wealth distributes outward. Scores decay, so active contributors earn more than people resting on history.
                      </p>
                      <p>
                        What counts as a "contribution" is up to us. The community decides through governance what to track, what to reward, and how to weight it.
                      </p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>

              {/* Tool 2: Gratitude */}
              <AnimatedSection>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#7dd87d]/20 flex items-center justify-center flex-shrink-0">
                    <Heart className="w-6 h-6 text-[#7dd87d]" />
                  </div>
                  <div>
                    <h3
                      className="text-xl md:text-2xl font-bold text-white mb-3"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Gratitude
                    </h3>
                    <div
                      className="space-y-3 text-white/75 leading-relaxed"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      <p>
                        Some of the most valuable things people do are invisible to any tracking system. Caring for elders. Making art. Holding space after loss. Teaching for free because it needed sharing. Growing food for neighbors.
                      </p>
                      <p>
                        Each cycle (roughly 29.5 days, tied to lunar months), you receive a budget of gratitude tokens. Send them to people for anything you're grateful for. Holding gratitude does nothing. It activates when sent.
                      </p>
                      <p>
                        At cycle's end, a pot of tokens is distributed proportionally to the people who received the most gratitude. Acknowledgment becomes economic value. The more people participating, the more accurately value distributes. Swarm intelligence applied to meeting each other's needs.
                      </p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>

              {/* Tool 3: Proposals */}
              <AnimatedSection>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#7dd87d]/20 flex items-center justify-center flex-shrink-0">
                    <Vote className="w-6 h-6 text-[#7dd87d]" />
                  </div>
                  <div>
                    <h3
                      className="text-xl md:text-2xl font-bold text-white mb-3"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Proposals
                    </h3>
                    <div
                      className="space-y-3 text-white/75 leading-relaxed"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      <p>
                        Any Steward or Sage can create a proposal. Fund a land project. Adjust a harvest ratio. Create a new quest category. Change a contribution metric. Allocate resources to a{" "}
                        <a
                          href="https://app.hypha.earth"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#7dd87d] underline underline-offset-2 hover:text-white transition-colors"
                        >
                          Bioregional Financing Facility (BFF)
                        </a>
                        .
                      </p>
                      <p>
                        Proposals go to a vote. Stewards and Sages cast Trust Tokens (governance tokens earned through contribution). If a proposal passes quorum and unity thresholds, it executes. Voice is proportional to contribution, not wealth.
                      </p>
                      <p>
                        Together, the three tools cover the full range of how humans create value for each other. Proposals for collective decisions. Contribution Scores for quantitative coordination. Gratitude for qualitative coordination.
                      </p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* Citizenship Tiers */}
        <section
          className="py-16 md:py-24 px-4 md:px-8"
          style={{ background: "rgba(0,0,0,0.15)" }}
        >
          <div className="max-w-5xl mx-auto">
            <AnimatedSection>
              <h2
                className="text-3xl md:text-4xl font-bold text-white mb-4 text-center"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Growth Tiers
              </h2>
              <p
                className="text-white/70 mb-12 text-lg text-center max-w-2xl mx-auto leading-relaxed"
                style={{ fontFamily: "var(--font-body)" }}
              >
                You grow into this society at your own pace. No one is excluded.
                Everyone starts somewhere.
              </p>
            </AnimatedSection>

            <div className="grid md:grid-cols-2 gap-6">
              <AnimatedSection>
                <TierCard
                  title="Explorer"
                  emoji="🧭"
                  description="You just got here. Welcome. Free transactions, access to quests, and your first contributions start counting immediately."
                  requirements={[
                    "Create an account",
                    "That's it",
                  ]}
                  powers={[
                    "Free transactions",
                    "Access to quests",
                    "Forum participation",
                    "Gratitude sending (starter budget)",
                  ]}
                  accentColor="#7dd87d"
                />
              </AnimatedSection>

              <AnimatedSection>
                <TierCard
                  title="Co-Creator"
                  emoji="🌱"
                  description="Earned through quests, invitations, and consistent participation. Your contributions start earning you a share of the Harvest."
                  requirements={[
                    "Complete onboarding quests",
                    "Invite at least 1 person",
                    "Active for 1+ season",
                  ]}
                  powers={[
                    "Harvest share based on contribution score",
                    "Full gratitude budget (100/cycle)",
                    "Endorsement power for land projects",
                    "Access to marketplace on LocalScale.org",
                  ]}
                  accentColor="#a8e6a8"
                />
              </AnimatedSection>

              <AnimatedSection>
                <TierCard
                  title="Steward"
                  emoji="🌳"
                  description="Earned through deeper contribution and longer participation. Stewards carry governance weight. You can propose, vote, and shape the rules."
                  requirements={[
                    "Sustained contribution across 3+ seasons",
                    "Reputation score above 50th percentile",
                    "Community vouching from existing Stewards",
                  ]}
                  powers={[
                    "Trust Tokens for governance voting",
                    "Proposal creation rights",
                    "Enhanced gratitude budget (200/cycle)",
                    "Land project evaluation access",
                    "Governance on Hypha (app.hypha.earth)",
                  ]}
                  accentColor="#ffd700"
                />
              </AnimatedSection>

              <AnimatedSection>
                <TierCard
                  title="Sage"
                  emoji="🏔️"
                  description="The long-game players. Sages have demonstrated deep, consistent contribution across many seasons. Their voice carries the most weight in governance."
                  requirements={[
                    "Sustained contribution across 6+ seasons",
                    "Reputation score above 80th percentile",
                    "Track record of successful proposals",
                    "Community recognition through gratitude",
                  ]}
                  powers={[
                    "Maximum governance weight",
                    "Seasonal council participation",
                    "Ability to endorse or flag proposals",
                    "Mentor matching for newer players",
                    "Enhanced Harvest multiplier",
                  ]}
                  accentColor="#e0b0ff"
                />
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* The Harvest */}
        <section className="py-16 md:py-24 px-4 md:px-8">
          <div className="max-w-4xl mx-auto">
            <AnimatedSection>
              <h2
                className="text-3xl md:text-4xl font-bold text-white mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                The Harvest
              </h2>
              <p
                className="text-white/70 mb-6 text-lg leading-relaxed max-w-3xl"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Every season, new $ReGen tokens are created and distributed. In conventional economies, new money is created by central banks as debt with interest, then distributed to banks. Value flows upward. In ours, new tokens are created to match growth in economic activity. No debt. No interest. Distributed directly to the people building this thing.
              </p>
            </AnimatedSection>

            <AnimatedSection>
              <div
                className="rounded-2xl border border-white/10 p-6 md:p-10"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <h3
                  className="text-xl font-bold text-[#7dd87d] mb-8"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Seasonal Distribution
                </h3>

                <div className="space-y-8">
                  <HarvestSplit
                    label="To All Contributors"
                    percent={30}
                    color="#7dd87d"
                    description="Distributed based on contribution scores. The more you contribute to the health of the planet, your community, and the economy, the more you receive. This is a Universal Earned Income."
                  />
                  <HarvestSplit
                    label="To Bioregional Financing Facilities"
                    percent={20}
                    color="#a8e6a8"
                    description="Active regions and Bioregional Financing Facilities (BFFs) receive funding to support local food systems, land projects, and community infrastructure."
                  />
                  <HarvestSplit
                    label="To Organizations"
                    percent={20}
                    color="#ffd700"
                    description="Qualifying organizations, including local food producers, earn based on regenerative reputation. The more regenerative the operation (rated by community members), the bigger the multiplier."
                  />
                  <HarvestSplit
                    label="Shared Treasury"
                    percent={30}
                    color="#e0b0ff"
                    description="Governed by proposals. Which land projects get funded. What new quests get created. How the rules evolve. This is the community's money, directed by the community."
                  />
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection>
              <div className="mt-10 space-y-4">
                <p
                  className="text-white/75 leading-relaxed"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  For local food producers, the Harvest has extra weight. Organizations that facilitate local food trade earn higher contribution multipliers. A food co-op earns tokens every time members transact through the system. The economy pays you to grow and distribute good food. Transactions are free. You save the 3 to 30% that payment processors normally take, and you earn on top of that. Better design, better outcome.
                </p>
                <p
                  className="text-white/75 leading-relaxed"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  Every variable here is open. The percentile thresholds, the harvest ratios, the gratitude budget, the reputation curves. We use the{" "}
                  <Link href="/community" className="text-[#7dd87d] underline underline-offset-2 hover:text-white transition-colors">
                    Forum
                  </Link>{" "}
                  to dialogue about how to improve the Game. We use proposals through{" "}
                  <a
                    href="https://app.hypha.earth"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#7dd87d] underline underline-offset-2 hover:text-white transition-colors"
                  >
                    Hypha
                  </a>{" "}
                  to decide. And now we can actually build what we decide, fast.
                </p>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* Hook Banner */}
        <section
          className="py-16 md:py-20 px-4 md:px-8"
          style={{ background: "#2d2a26" }}
        >
          <div className="max-w-3xl mx-auto text-center">
            <AnimatedSection>
              <p
                className="text-2xl md:text-4xl font-bold mb-6 leading-tight"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "#faf8f3",
                }}
              >
                The more we Play the Game the more fun and real this new world becomes.
              </p>
              <p
                className="text-lg mb-8 leading-relaxed"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "rgba(250,248,243,0.7)",
                }}
              >
                Every quest feeds into this economic system. Three coordination tools. Open governance. A currency grounded in regenerative food systems. Every player who joins makes this society more real.
              </p>
              <Link href="/play">
                <Button
                  size="lg"
                  className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold text-lg px-8 py-6 rounded-xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Start Playing
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </AnimatedSection>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="py-16 md:py-24 px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <AnimatedSection>
              <h2
                className="text-3xl md:text-4xl font-bold text-white mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Start Playing
              </h2>
              <p
                className="text-white/70 mb-10 text-lg max-w-xl mx-auto"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Every player who joins makes this society more real. That's the
                whole point.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/quest">
                  <Button
                    size="lg"
                    className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold text-lg px-8 py-6 rounded-xl w-full sm:w-auto"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    <Sprout className="w-5 h-5 mr-2" />
                    Start Your First Quest
                  </Button>
                </Link>

                <Link href="/game">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-[#7dd87d] text-[#7dd87d] hover:bg-[#7dd87d]/10 font-bold text-lg px-8 py-6 rounded-xl w-full sm:w-auto"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    <Compass className="w-5 h-5 mr-2" />
                    Learn About the Game
                  </Button>
                </Link>
              </div>
            </AnimatedSection>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
