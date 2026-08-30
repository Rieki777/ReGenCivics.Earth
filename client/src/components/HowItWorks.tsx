/**
 * HowItWorks - Interactive step-by-step flow showing how ReGen Civics works.
 * Animated, mobile-first, with expandable steps and a visual progress indicator.
 */
import { useState } from "react";
import { 
  Sprout, Users, Coins, Globe, ArrowRight, ChevronDown,
  Leaf, Handshake, Target, Infinity
} from "lucide-react";
import { AnimatedSection } from "@/components/AnimatedSection";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FUND } from "@shared/fund";

// Each path is one of the interconnected ways people show up to ReGen
// Civics. They are not sequential steps. The numbers and "5 steps"
// framing were removed 2026-04-24 because each path builds on and
// supports the others; there is no "first then second."
const steps = [
  {
    title: "Land Projects Apply",
    summary: "Regenerative land projects join through our seasonal accelerator program.",
    detail: "Projects go through a curated selection process during each Season. We evaluate ecological potential, team strength, community impact, and financial viability. Selected projects receive mentorship, governance tools, and access to the alliance network.",
    icon: Sprout,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/20",
    borderColor: "border-emerald-400/30",
  },
  {
    title: "Alliance Partners Support",
    summary: "Organizations contribute expertise, technology, and services to strengthen projects.",
    detail: "Alliance partners provide the infrastructure regenerative projects need: legal frameworks, regenerative agriculture consulting, renewable energy systems, construction expertise, and governance tools. Partners exchange services for equity and $RCivics tokens.",
    icon: Handshake,
    color: "text-violet-400",
    bgColor: "bg-violet-400/20",
    borderColor: "border-violet-400/30",
  },
  {
    title: "Investors Fund the Portfolio",
    summary: "Diversified exposure to the regenerative land economy, once the fund is formed.",
    detail: `${FUND.statement} As designed, it will pool capital across a curated portfolio of land projects and alliance organizations, so the diversification reduces risk while maximizing systemic impact. ${FUND.eligibility} The proposed minimum is $250,000.`,
    icon: Coins,
    color: "text-amber-400",
    bgColor: "bg-amber-400/20",
    borderColor: "border-amber-400/30",
  },
  {
    title: "Players Grow the Game",
    summary: "Anyone can play the Infinite Game, completing quests that heal land and community.",
    detail: "The Infinite Game is open to everyone. Complete quests focused on personal health, community building, and ecological restoration. Earn tokens, build your regenerative portfolio, and contribute to a movement that grows stronger with every player.",
    icon: Target,
    color: "text-rose-400",
    bgColor: "bg-rose-400/20",
    borderColor: "border-rose-400/30",
  },
  {
    title: "Regenerative Economic Systems",
    summary: "The land projects, organizations, and food producers create the foundations for entirely new economic systems. Welcome to the Infinite Game.",
    detail: "Healthy land appreciates. Thriving communities generate economic activity. Food systems become local. Governance becomes participatory. Alliance services create recurring value. Together these pieces form the foundation of regenerative economies that grow stronger the more people participate.",
    icon: Infinity,
    color: "text-[#7dd87d]",
    bgColor: "bg-[#7dd87d]/20",
    borderColor: "border-[#7dd87d]/30",
  },
];

export default function HowItWorks() {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  return (
    <section className="relative py-12 md:py-16">
      <div className="container max-w-4xl">
        <AnimatedSection animation="fade-in" className="text-center mb-10">
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 text-shadow-strong"
            style={{ fontFamily: "var(--font-display)" }}
          >
            How It Works
          </h2>
          <p
            className="text-white/80 text-base md:text-lg max-w-2xl mx-auto text-shadow-subtle"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Each path builds on and supports the others
          </p>
        </AnimatedSection>

        {/* Steps */}
        <div className="relative">
          {/* Vertical connecting line */}
          <div className="absolute left-6 md:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-400/50 via-amber-400/50 to-[#7dd87d]/50 hidden md:block" />

          <div className="space-y-4">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isExpanded = expandedStep === idx;

              return (
                <AnimatedSection key={idx} animation="slide-up" delay={idx * 100}>
                  <button
                    onClick={() => setExpandedStep(isExpanded ? null : idx)}
                    className="w-full text-left"
                  >
                    <div
                      className={`glass-panel glass-panel-interactive p-5 md:p-6 ${step.borderColor} ${
                        isExpanded ? "scale-[1.01] shadow-lg" : ""
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Path icon (numbers removed; these are not sequential steps) */}
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          <div
                            className={`w-12 h-12 md:w-14 md:h-14 rounded-full ${step.bgColor} flex items-center justify-center transition-transform ${
                              isExpanded ? "scale-110" : ""
                            }`}
                          >
                            <Icon className={`w-6 h-6 md:w-7 md:h-7 ${step.color}`} />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 pt-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3
                              className={`text-lg md:text-xl font-bold text-white`}
                              style={{ fontFamily: "var(--font-display)" }}
                            >
                              {step.title}
                            </h3>
                            <ChevronDown
                              className={`w-5 h-5 ${step.color} flex-shrink-0 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </div>
                          <p className="text-white/70 text-sm md:text-base mt-1 leading-relaxed">
                            {step.summary}
                          </p>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                              <p className="text-white/60 text-sm leading-relaxed">
                                {step.detail}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </AnimatedSection>
              );
            })}
          </div>
        </div>

        {/* Start Your Journey Cards */}
        <AnimatedSection animation="fade-in" delay={600} className="mt-10">
          <h3
            className="text-center text-white/80 text-base font-semibold mb-5 uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-accent)' }}
          >
            Start Your Journey
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: Sprout,
                title: "Play Quests",
                description: "Heal yourself and the Earth through guided regenerative quests. Earn $ReGen tokens.",
                href: "/quest",
                color: "text-[#7dd87d]",
                border: "border-[#7dd87d]/30 hover:border-[#7dd87d]/60",
              },
              {
                icon: Globe,
                title: "Join the Network",
                description: "Connect with land projects, alliance orgs, and regenerators in your bioregion.",
                href: "/community",
                color: "text-emerald-300",
                border: "border-emerald-500/30 hover:border-emerald-500/60",
              },
              {
                icon: Handshake,
                title: "Invest or Partner",
                description: "Put capital to work in regenerative land projects, or bring your org into the alliance.",
                href: "/connect",
                color: "text-amber-300",
                border: "border-amber-500/30 hover:border-amber-500/60",
              },
            ].map((card) => (
              <Link key={card.href} href={card.href}>
                <div
                  className={`flex flex-col gap-3 p-5 rounded-2xl border transition-all cursor-pointer ${card.border}`}
                  style={{ backgroundColor: 'rgba(0, 40, 0, 0.88)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
                >
                  <card.icon className={`w-7 h-7 ${card.color}`} />
                  <div>
                    <h4
                      className="font-bold text-white text-base mb-1"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {card.title}
                    </h4>
                    <p className="text-white/80 text-sm leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-semibold ${card.color} mt-auto`}>
                    Get started <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
