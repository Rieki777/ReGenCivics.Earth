/**
 * Custom Games for Land Projects  -  Coming Soon teaser page
 * Route: /custom-games
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { AnimatedSection } from "@/components/AnimatedSection";
import NewsletterSignup from "@/components/NewsletterSignup";
import { BackButton } from "@/components/BackButton";
import { Gamepad2, Sparkles, ArrowRight, Map, Users, Sprout } from "lucide-react";

export default function CustomGames() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO
        title="Custom Games for Land Projects  -  ReGen Civics"
        description="We'll replicate some of what we built here on ReGen Civics to help you create a custom game specific to your land project."
      />

      <div className="container mx-auto px-4 pt-8 pb-4">
        <BackButton />
      </div>

      {/* Hero */}
      <section className="container mx-auto px-4 py-16 md:py-24 text-center">
        <AnimatedSection animation="fade-in">
          <Badge className="mb-6 bg-[#7dd87d]/20 text-[#7dd87d] border border-[#7dd87d]/40 text-sm px-4 py-1">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 inline" />
            Coming Soon
          </Badge>

          <h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Custom Games for Your Land Project
          </h1>

          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed mb-10">
            We'll replicate some of what we built here on ReGen Civics to help you create a
            custom game specific to your land project!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/connect">
              <Button
                size="lg"
                className="bg-gradient-to-r from-[#7dd87d] to-[#4a7c59] text-white font-bold px-8 hover:shadow-[0_0_20px_rgba(125,216,125,0.4)] transition-all"
              >
                Express Interest
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/land">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-[#7dd87d]/50 text-[#7dd87d] hover:bg-[#7dd87d]/10 px-8"
              >
                Submit Your Land Project
              </Button>
            </Link>
          </div>
        </AnimatedSection>
      </section>

      {/* What's included */}
      <section className="container mx-auto px-4 py-12">
        <AnimatedSection animation="slide-up">
          <h2
            className="text-2xl font-bold text-white text-center mb-8"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What you'll get
          </h2>
          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: Gamepad2,
                title: "Custom Quest System",
                desc: "Your own quests tailored to your land project's values and milestones.",
              },
              {
                icon: Users,
                title: "Community Engagement",
                desc: "Tools to engage your community through gamified contribution tracking.",
              },
              {
                icon: Map,
                title: "Your Own Map",
                desc: "A living map of your land, projects, and alliance connections.",
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

      {/* CTA */}
      <section className="container mx-auto px-4 py-12 max-w-xl">
        <AnimatedSection animation="fade-in">
          <div className="bg-white/5 border border-[#7dd87d]/20 rounded-2xl p-8 text-center">
            <Sprout className="w-8 h-8 text-[#7dd87d] mx-auto mb-4" />
            <h2
              className="text-2xl font-bold text-white mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Interested in Your Own Game?
            </h2>
            <p className="text-white/60 text-sm mb-6">
              Sign up and we'll reach out when we're ready to build with you.
            </p>
            <NewsletterSignup />
          </div>
        </AnimatedSection>
      </section>
    </div>
  );
}
