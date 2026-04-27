/**
 * Custom Games for Land Projects
 * Route: /custom-games
 */

import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { AnimatedSection } from "@/components/AnimatedSection";
import { BackButton } from "@/components/BackButton";
import { CustomGameWaitlistForm } from "@/components/CustomGameWaitlistForm";
import { Sparkles, ArrowRight, Map, Users, Sprout, X } from "lucide-react";
import { PageWrapper } from "@/components/PageWrapper";

const FEATURE_CARDS = [
  {
    icon: Users,
    title: "Foundations for Building with Others",
    desc: "Shared values, rituals, and culture infrastructure so your community has a living foundation, not just a website.",
    detail: "We help you articulate and encode the values, rituals, and culture practices that will hold your community together through the hard parts. This becomes the living foundation that new members enter into from day one.",
  },
  {
    icon: Map,
    title: "Clear Agreements, Roles, and Decision-Making",
    desc: "Custom governance flows for your project: who decides what, how disputes are resolved, how new members join.",
    detail: "We design the decision-making architecture specific to your project. Who has a say, how conflicts get resolved, how new members move from visitor to contributor to core team. Built for real communities, not boardrooms.",
  },
  {
    icon: Map,
    title: "Custom Website per Community Persona",
    desc: "Residents, investors, business owners, and core team each get their own entry path, onboarding journey, and dashboard view.",
    detail: "Different people arrive at your project with different needs and questions. We build persona-specific entry points so each type of visitor gets the right welcome, the right information, and the right next step.",
  },
  {
    icon: Sprout,
    title: "Quest System per Persona",
    desc: "Role-specific quests that guide each person from arrival through deep contribution.",
    detail: "Stop doing manual onboarding one person at a time. Quests guide each persona through the journey from curious visitor to active contributor, tracking completion and rewarding the milestones that matter to your project.",
  },
];

export default function CustomGames() {
  const [showForm, setShowForm] = useState(false);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  return (
    <PageWrapper>
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
            <Button
              size="lg"
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-[#7dd87d] to-[#4a7c59] text-white font-bold px-8 hover:shadow-[0_0_20px_rgba(125,216,125,0.4)] transition-all"
            >
              <Sprout className="w-4 h-4 mr-2" />
              Join Waitlist
            </Button>
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
          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {FEATURE_CARDS.map((item, idx) => {
              const Icon = item.icon;
              const isExpanded = expandedCard === idx;
              return (
                <div
                  key={item.title}
                  className="bg-white/5 border border-[#7dd87d]/20 rounded-2xl p-6 hover:bg-white/10 transition-colors"
                >
                  <div className="w-12 h-12 bg-[#7dd87d]/20 rounded-full flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-[#7dd87d]" />
                  </div>
                  <h3 className="font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-white/70">{item.desc}</p>
                  {isExpanded && (
                    <p className="text-sm text-white/60 mt-3 leading-relaxed">{item.detail}</p>
                  )}
                  <button
                    onClick={() => setExpandedCard(isExpanded ? null : idx)}
                    className="mt-3 text-xs text-[#7dd87d] hover:text-[#7dd87d]/80 transition-colors"
                  >
                    {isExpanded ? "Show less" : "Learn more"}
                  </button>
                </div>
              );
            })}
          </div>
        </AnimatedSection>
      </section>

      {/* Pricing + Waitlist CTA */}
      <section className="container mx-auto px-4 py-12 max-w-2xl">
        <AnimatedSection animation="fade-in">
          <div className="bg-white/5 border border-[#7dd87d]/20 rounded-2xl p-8 text-center space-y-4">
            <Sprout className="w-8 h-8 text-[#7dd87d] mx-auto" />
            <h2
              className="text-2xl font-bold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Ready to Build Your Own Game?
            </h2>
            <p className="text-white/70 text-sm max-w-lg mx-auto">
              Custom Land Games are designed for land projects that have purchased land and are ready to start coordinating real community growth. Each persona (residents, investors, business owners, core team) gets their own onboarding path, so you stop doing manual onboarding.
            </p>
            <div className="inline-block bg-[#d4a574]/15 border border-[#d4a574]/30 rounded-xl px-5 py-3">
              <p className="text-[#d4a574] text-lg font-bold">$20,000</p>
              <p className="text-white/50 text-xs">Investment in coordination infrastructure</p>
            </div>
            <p className="text-white/50 text-xs">
              We take on a small number of projects per season so each one gets genuine attention from our team.
            </p>
            <Button
              size="lg"
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-[#7dd87d] to-[#4a7c59] text-white font-bold px-10 hover:shadow-[0_0_20px_rgba(125,216,125,0.4)] transition-all"
            >
              <Sprout className="w-4 h-4 mr-2" />
              Join Waitlist
            </Button>
            <p className="text-white/50 text-xs">
              We take on 3-5 projects per season. Outreach-to-kickoff typically takes 5 business days.
            </p>
          </div>
        </AnimatedSection>
      </section>

      {/* Waitlist Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div className="relative bg-[#0d2818] border border-[#7dd87d]/25 rounded-2xl shadow-2xl w-full max-w-lg my-8 p-6">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white/80 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <h2
              className="text-xl font-bold text-white mb-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Join the Waitlist
            </h2>
            <p className="text-white/50 text-sm mb-6">
              Tell us about your land project and we'll be in touch.
            </p>
            <CustomGameWaitlistForm onClose={() => setShowForm(false)} />
          </div>
        </div>
      )}
    </div>
    </PageWrapper>
  );
}
