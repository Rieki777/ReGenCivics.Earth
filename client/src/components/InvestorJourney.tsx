/**
 * TakePartJourney: "How to take part" in the cooperative, as a short quest.
 * Shows each step as a checkable milestone; progress stays in this browser
 * (localStorage) and nowhere else.
 *
 * The file keeps its old name so imports do not churn during the Phase 0 copy
 * rewrite. Until 2026-09-27 it was the "Investor Quest": explore the
 * portfolio, submit investor information, "track your portfolio". The
 * cooperative accepts no money and has no portfolio, so the steps now lead to
 * the design, an open session, the interest form and the community forum.
 * It uses a fresh storage key, so old investor-journey progress never shows up
 * against the new steps.
 */
import { useState, useEffect } from "react";
import {
  BookOpen, MessageSquare, PenLine, Users,
  CheckCircle2, Circle, ArrowRight, Sparkles
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AnimatedSection } from "@/components/AnimatedSection";

type JourneyStep = {
  id: string;
  title: string;
  description: string;
  action: string;
  href: string;
  icon: typeof BookOpen;
  color: string;
};

const journeySteps: JourneyStep[] = [
  {
    id: "read",
    title: "Read the design",
    description: "See how the cooperative is being designed to work.",
    action: "Read it",
    href: "/opportunity",
    icon: BookOpen,
    color: "#7dd87d",
  },
  {
    id: "session",
    title: "Come to an open session",
    description: "Meet the team at an open community session.",
    action: "See the schedule",
    href: "/schedule",
    icon: MessageSquare,
    color: "#7dd87d",
  },
  {
    id: "interest",
    title: "Tell us you're interested",
    description: "Fill in the short interest form. No money, no commitment.",
    action: "Open the form",
    href: "/loi",
    icon: PenLine,
    color: "#d4a574",
  },
  {
    id: "hello",
    title: "Say hello",
    description: "Introduce yourself in the community forum.",
    action: "Open the forum",
    href: "/community",
    icon: Users,
    color: "#f97316",
  },
];

const STORAGE_KEY = "regen-coop-take-part";

function getCompletedSteps(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return new Set(JSON.parse(stored));
  } catch {}
  return new Set();
}

function saveCompletedSteps(steps: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(steps)));
  } catch {}
}

export default function TakePartJourney() {
  const [completed, setCompleted] = useState<Set<string>>(() => getCompletedSteps());

  useEffect(() => {
    saveCompletedSteps(completed);
  }, [completed]);

  const toggleStep = (id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const progress = Math.round((completed.size / journeySteps.length) * 100);

  return (
    <section className="relative py-12 md:py-16 px-4">
      <div className="container max-w-3xl">
        <AnimatedSection animation="fade-in" className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel-light text-[#7dd87d] text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            Your quest
          </div>
          <h2
            className="text-2xl md:text-3xl font-bold text-white mb-2 text-shadow-strong"
            style={{ fontFamily: "var(--font-display)" }}
          >
            How to take part
          </h2>
          <p className="text-white/70 text-sm md:text-base">
            Check off each step as you go. Your progress stays in this browser.
          </p>
        </AnimatedSection>

        {/* Progress Bar */}
        <AnimatedSection animation="fade-in" delay={100}>
          <div className="glass-panel p-4 mb-6 border-[#7dd87d]/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                Progress
              </span>
              <span className="text-[#7dd87d] text-sm font-bold">{progress}%</span>
            </div>
            <div
              className="w-full h-2 bg-white/10 rounded-full overflow-hidden"
              role="progressbar"
              aria-label="Steps checked off"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div
                className="h-full bg-gradient-to-r from-[#7dd87d] to-[#d4a574] rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </AnimatedSection>

        {/* Steps */}
        <div className="space-y-3">
          {journeySteps.map((step, idx) => {
            const isCompleted = completed.has(step.id);

            return (
              <AnimatedSection key={step.id} animation="slide-up" delay={idx * 80}>
                <div
                  className={`glass-panel glass-panel-interactive p-4 md:p-5 ${
                    isCompleted ? "border-[#7dd87d]/40 opacity-80" : "border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Completion toggle */}
                    <button
                      type="button"
                      onClick={() => toggleStep(step.id)}
                      className="flex-shrink-0 group min-w-[44px] min-h-[44px] flex items-center justify-center"
                      aria-pressed={isCompleted}
                      aria-label={isCompleted ? `Mark ${step.title} as not done` : `Mark ${step.title} as done`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-8 h-8 text-[#7dd87d] group-hover:scale-110 transition-transform" />
                      ) : (
                        <Circle
                          className="w-8 h-8 group-hover:scale-110 transition-transform"
                          style={{ color: step.color + "80" }}
                        />
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`text-base font-bold ${
                          isCompleted ? "text-white/70 line-through" : "text-white"
                        }`}
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {step.title}
                      </h3>
                      <p className="text-white/70 text-xs mt-0.5">{step.description}</p>
                    </div>

                    {/* Action button */}
                    {!isCompleted && (
                      <Button
                        asChild
                        size="sm"
                        className="text-xs border border-white/20 text-white/80 hover:text-white hover:bg-white/10 bg-transparent rounded-lg flex-shrink-0"
                      >
                        <Link href={step.href}>
                          {step.action}
                          <ArrowRight className="w-3 h-3 ml-1" aria-hidden="true" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </AnimatedSection>
            );
          })}
        </div>

        {/* Completion message */}
        {progress === 100 && (
          <AnimatedSection animation="scale-in" delay={200} className="text-center mt-6">
            <div className="glass-panel p-6 border-[#7dd87d]/30">
              <Sparkles className="w-8 h-8 text-[#7dd87d] mx-auto mb-3" aria-hidden="true" />
              <p className="text-white font-bold text-lg mb-1" style={{ fontFamily: "var(--font-display)" }}>
                Quest complete
              </p>
              <p className="text-white/60 text-sm">
                Every step is checked. Thank you for helping shape the cooperative.
              </p>
            </div>
          </AnimatedSection>
        )}
      </div>
    </section>
  );
}
