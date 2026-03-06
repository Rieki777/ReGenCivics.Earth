/**
 * ReGen Games — Coming Soon teaser page
 * Route: /regen-games
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { AnimatedSection } from "@/components/AnimatedSection";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { BackButton } from "@/components/BackButton";
import { Trophy, Globe, Heart, Users, Sparkles, ArrowRight } from "lucide-react";

export default function ReGenGames() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO
        title="The ReGen Games — ReGen Civics"
        description="What if the Olympics wasn't about competition, but collaboration? The ReGen Games are in-person events where we regenerate community gardens, villages, watersheds, and eventually whole bioregions."
      />

      <div className="container mx-auto px-4 pt-8 pb-4">
        <BackButton />
      </div>

      {/* Hero */}
      <section className="container mx-auto px-4 py-16 md:py-24 text-center">
        <AnimatedSection animation="fade-in">
          <Badge className="mb-6 bg-[#d4a574]/20 text-[#d4a574] border border-[#d4a574]/40 text-sm px-4 py-1">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 inline" />
            Coming Soon
          </Badge>

          <h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            The ReGen Games
          </h1>

          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed mb-8">
            What if the Olympics wasn't about competition, but collaboration? What if the goal
            wasn't physical but cultural? The ReGen Games are in-person events where we
            regenerate community gardens, villages, watersheds, and eventually whole bioregions.
          </p>

          <p className="text-base md:text-lg text-white/70 max-w-2xl mx-auto leading-relaxed mb-10">
            We do this by gathering and creating a growing diversity of games and sports centered
            around skills, gifts, and expressions in service to the ReGenerative Renaissance.
            All are welcome at the ReGen Games!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/connect">
              <Button
                size="lg"
                className="bg-gradient-to-r from-[#d4a574] to-[#ffd700] text-[#1a472a] font-bold px-8 hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all"
              >
                Stay Connected
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/quest">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-[#7dd87d]/50 text-[#7dd87d] hover:bg-[#7dd87d]/10 px-8"
              >
                Play the Quests Now
              </Button>
            </Link>
          </div>
        </AnimatedSection>
      </section>

      {/* Feature pillars */}
      <section className="container mx-auto px-4 py-12">
        <AnimatedSection animation="slide-up">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: Globe,
                title: "Bioregional Events",
                desc: "Regenerate gardens, villages, and watersheds through collaborative play.",
              },
              {
                icon: Users,
                title: "All Are Welcome",
                desc: "Games and sports for every skill level, background, and expression.",
              },
              {
                icon: Heart,
                title: "Collaboration First",
                desc: "Compete against our collective impact, not each other.",
              },
              {
                icon: Trophy,
                title: "ReGenerative Skills",
                desc: "Earn recognition for gifts in service to the living world.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="bg-white/5 border border-[#7dd87d]/20 rounded-2xl p-6 text-center hover:bg-white/10 transition-colors"
                >
                  <div className="w-12 h-12 bg-[#7dd87d]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-[#7dd87d]" />
                  </div>
                  <h3 className="font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-white/60">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </AnimatedSection>
      </section>

      {/* Newsletter CTA */}
      <section className="container mx-auto px-4 py-12 max-w-xl">
        <AnimatedSection animation="fade-in">
          <div className="bg-white/5 border border-[#7dd87d]/20 rounded-2xl p-8 text-center">
            <h2
              className="text-2xl font-bold text-white mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Be First to Know
            </h2>
            <p className="text-white/60 text-sm mb-6">
              Get notified when we announce the first ReGen Games event.
            </p>
            <NewsletterSignup />
          </div>
        </AnimatedSection>
      </section>
    </div>
  );
}
