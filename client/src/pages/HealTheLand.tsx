/**
 * Heal the Land, Heal Ourselves Page
 * Route: /heal-the-land
 * Design: Dark green theme, direct voice, grounded and warm
 * Content: The ministry program connecting land health and human health
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AnimatedSection } from "@/components/AnimatedSection";
import { SEO } from "@/components/SEO";
import { ArrowRight, Leaf, Heart, Home } from "lucide-react";
import { ReadingTime } from "@/components/ReadingTime";
import { Pullquote } from "@/components/Pullquote";
import { RiverDivider } from "@/components/dividers/RiverDivider";

function StageCard({
  emoji,
  title,
  description,
  icon: Icon,
}: {
  emoji: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}) {
  return (
    <div
      className="rounded-2xl border border-white/10 p-6 md:p-8 flex flex-col"
      style={{ background: "rgba(255,255,255,0.05)" }}
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{emoji}</span>
        <Icon className="w-5 h-5" style={{ color: "#7dd87d" }} />
      </div>
      <h3
        className="text-xl md:text-2xl font-bold text-white mb-3"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h3>
      <p
        className="text-white/80 leading-relaxed safe-prose"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {description}
      </p>
    </div>
  );
}

export default function HealTheLand() {
  return (
    <>
      <SEO
        title="Heal the Land, Heal Ourselves | ReGen Civics"
        description="By bringing life back to the ecosystems around us, we bring life back into ourselves. Food outreach, gardening days, and land residency through the Church of the Regenerative Earth."
        url="/heal-the-land"
      />

      <div className="min-h-screen" style={{ background: "#1a472a" }}>
        {/* Hero */}
        <section className="relative py-24 md:py-36 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <AnimatedSection animation="slide-up">
              <h1
                className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Heal the Land, Heal Ourselves
              </h1>
              <ReadingTime words={1500} />
              <p
                className="text-lg md:text-xl mb-10 leading-relaxed max-w-2xl mx-auto"
                style={{ color: "#d4a574", fontFamily: "var(--font-body)" }}
              >
                By bringing life back to the ecosystems around us, we bring life back into ourselves. And all our dis-eases melt away.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/land#heal-program">
                  <Button
                    size="lg"
                    className="text-[#1a472a] font-bold px-8 py-6 text-lg rounded-full"
                    style={{ backgroundColor: "#7dd87d", fontFamily: "var(--font-display)" }}
                  >
                    Partner with Us
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/community">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10 font-bold px-8 py-6 text-lg rounded-full"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Join a Gardening Day
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* The Belief */}
        <section className="py-16 md:py-24 px-4" style={{ background: "rgba(0,0,0,0.15)" }}>
          <div className="max-w-3xl mx-auto">
            <AnimatedSection animation="slide-up">
              <h2
                className="story-grow text-3xl md:text-4xl font-bold text-white mb-8 text-center"
                style={{ fontFamily: "var(--font-display)" }}
              >
                The Belief
              </h2>
              <div className="space-y-6">
                <p
                  className="text-white/85 text-lg leading-relaxed safe-prose prose-readable"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  We frame land health and human health as two separate problems. They are the same problem. When the land loses its living complexity, we lose ours. When the land heals, we feel it in our bodies, our moods, our sense of purpose.
                </p>
                <p
                  className="text-white/85 text-lg leading-relaxed safe-prose prose-readable"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  The Church of the Regenerative Earth was built on this belief: we are the land. Not symbolically. We are literally made of the same stuff. Healing one heals the other.
                </p>
              </div>
            </AnimatedSection>
          </div>
        </section>

        <Pullquote>When the land heals, we feel it in our bodies, our moods, our sense of purpose.</Pullquote>

        <RiverDivider className="my-8 max-w-4xl mx-auto px-4" />

        {/* The Three Stages */}
        <section className="py-16 md:py-24 px-4">
          <div className="max-w-6xl mx-auto">
            <AnimatedSection animation="slide-up">
              <h2
                className="story-grow text-3xl md:text-4xl font-bold text-white mb-12 text-center"
                style={{ fontFamily: "var(--font-display)" }}
              >
                The Three Stages
              </h2>
            </AnimatedSection>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <AnimatedSection animation="slide-up" delay={0}>
                <StageCard
                  emoji="🌱"
                  title="Food Outreach"
                  icon={Leaf}
                  description="Regeneratively grown food offered free or heavily discounted to anyone in our bioregion who needs it. No application. No means test. No shame. Food is sacred. If you need it, you are welcome to it."
                />
              </AnimatedSection>
              <AnimatedSection animation="slide-up" delay={100}>
                <StageCard
                  emoji="🤲"
                  title="Gardening Days"
                  icon={Heart}
                  description="Regular community days on land project sites. Part land work, part ceremony, part shared meal. You come to tend the land. The land tends you back. Open to all community members."
                />
              </AnimatedSection>
              <AnimatedSection animation="slide-up" delay={200}>
                <StageCard
                  emoji="🏡"
                  title="Land Residency"
                  icon={Home}
                  description="For those called to go deeper. Extended time living alongside a land project being restored. You heal through the land's care. The land heals through yours. A belonging program, not a treatment program."
                />
              </AnimatedSection>
            </div>
          </div>
        </section>

        <RiverDivider className="my-8 max-w-4xl mx-auto px-4" />

        {/* For Land Project Sponsors */}
        <section className="py-16 md:py-24 px-4" style={{ background: "rgba(0,0,0,0.15)" }}>
          <div className="max-w-5xl mx-auto">
            <AnimatedSection animation="slide-up">
              <h2
                className="text-3xl md:text-4xl font-bold text-white mb-12 text-center"
                style={{ fontFamily: "var(--font-display)" }}
              >
                For Land Project Sponsors
              </h2>
            </AnimatedSection>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-12">
              <AnimatedSection animation="slide-up" delay={0}>
                <div
                  className="rounded-2xl border border-white/10 p-6 md:p-8"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <h3
                    className="text-xl font-bold mb-5"
                    style={{ color: "#7dd87d", fontFamily: "var(--font-display)" }}
                  >
                    You Bring:
                  </h3>
                  <ul className="space-y-3">
                    {[
                      "Land and growing capacity",
                      "Willingness to host community days",
                      "Space for residents",
                      "Alignment with regenerative values",
                    ].map((item, i) => (
                      <li
                        key={i}
                        className="text-white/80 flex items-start gap-3"
                        style={{ fontFamily: "var(--font-body)" }}
                      >
                        <span style={{ color: "#7dd87d" }} className="mt-0.5 flex-shrink-0">
                          +
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedSection>
              <AnimatedSection animation="slide-up" delay={100}>
                <div
                  className="rounded-2xl border border-white/10 p-6 md:p-8"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <h3
                    className="text-xl font-bold mb-5"
                    style={{ color: "#d4a574", fontFamily: "var(--font-display)" }}
                  >
                    We Bring:
                  </h3>
                  <ul className="space-y-3">
                    {[
                      "Active community and spiritual container",
                      "Stewardship labor",
                      "Free Game Building for your local food system",
                      "Custom quest curriculum",
                      "$ReGen token rewards",
                      "Governance design and community onboarding support",
                    ].map((item, i) => (
                      <li
                        key={i}
                        className="text-white/80 flex items-start gap-3"
                        style={{ fontFamily: "var(--font-body)" }}
                      >
                        <span style={{ color: "#d4a574" }} className="mt-0.5 flex-shrink-0">
                          +
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedSection>
            </div>
            <AnimatedSection animation="slide-up">
              <div className="text-center">
                <Link href="/land#heal-program">
                  <Button
                    size="lg"
                    className="text-[#1a472a] font-bold px-8 py-6 text-lg rounded-full"
                    style={{ backgroundColor: "#d4a574", fontFamily: "var(--font-display)" }}
                  >
                    Apply as a Land Project Partner
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="py-20 md:py-28 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <AnimatedSection animation="slide-up">
              <h2
                className="text-3xl md:text-4xl font-bold text-white mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Ready to get your hands in the soil?
              </h2>
              <p
                className="text-white/70 text-lg mb-10 leading-relaxed"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Whether you have land to share or you are looking for a place to belong, there is a way in.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/land#heal-program">
                  <Button
                    size="lg"
                    className="text-[#1a472a] font-bold px-8 py-6 text-lg rounded-full"
                    style={{ backgroundColor: "#7dd87d", fontFamily: "var(--font-display)" }}
                  >
                    Bring Your Land Project
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/quest">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10 font-bold px-8 py-6 text-lg rounded-full"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Start a Quest
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </AnimatedSection>
          </div>
        </section>
        {/* Church Context */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-3xl">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-[#d4a574]/20 text-center">
              <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-display)" }}>
                The Church of the Regenerative Earth
              </h3>
              <p className="text-white/60 text-sm leading-relaxed mb-4 safe-prose">
                We are a faith community. A 508(c)(1)(a) ministry. Our beliefs are simple: we are the land, we are one, and life is meant to be better and better and better. Our land projects are our places of worship. Our quests are our spiritual formation. Healing the land and healing ourselves are the same act.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href="/quest">
                  <Button variant="outline" className="border-[#7dd87d]/30 text-[#7dd87d] hover:bg-[#7dd87d]/10 text-sm">
                    Play a Quest
                  </Button>
                </Link>
                <Link href="/community">
                  <Button variant="outline" className="border-[#d4a574]/30 text-[#d4a574] hover:bg-[#d4a574]/10 text-sm">
                    Join the Community
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
