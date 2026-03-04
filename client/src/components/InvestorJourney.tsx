/**
 * InvestorJourney - Gamified investor progress tracker.
 * Shows the investor journey as a quest-like progression with visual milestones.
 * Persists progress in localStorage.
 */
import { useState, useEffect } from "react";
import { 
  BookOpen, MessageSquare, FileText, Coins, Rocket,
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
    id: "learn",
    title: "Learn the Vision",
    description: "Explore how regenerative land projects create lasting value",
    action: "Read the Thesis",
    href: "/opportunity",
    icon: BookOpen,
    color: "#7dd87d",
  },
  {
    id: "connect",
    title: "Join a Session",
    description: "Attend an open community session and meet the team",
    action: "View Schedule",
    href: "/schedule",
    icon: MessageSquare,
    color: "#60a5fa",
  },
  {
    id: "explore",
    title: "Explore the Portfolio",
    description: "Review land projects, alliance partners, and the fund structure",
    action: "See Projects",
    href: "/map",
    icon: FileText,
    color: "#fbbf24",
  },
  {
    id: "invest",
    title: "Express Interest",
    description: "Submit your investor information or sign a Letter of Intent",
    action: "Get Started",
    href: "/investor",
    icon: Coins,
    color: "#f97316",
  },
  {
    id: "activate",
    title: "Activate Your Impact",
    description: "Fund the regenerative renaissance and track your portfolio",
    action: "Begin",
    href: "/loi",
    icon: Rocket,
    color: "#ef4444",
  },
];

const STORAGE_KEY = "regen-investor-journey";

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

export default function InvestorJourney() {
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
    <section className="relative py-12 md:py-16">
      <div className="container max-w-3xl">
        <AnimatedSection animation="fade-in" className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel-light text-[#7dd87d] text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" />
            Your Investor Quest
          </div>
          <h2
            className="text-2xl md:text-3xl font-bold text-white mb-2 text-shadow-strong"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Your Journey to Impact
          </h2>
          <p className="text-white/70 text-sm md:text-base">
            Track your progress through the investor journey
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
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#7dd87d] to-[#fbbf24] rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </AnimatedSection>

        {/* Steps */}
        <div className="space-y-3">
          {journeySteps.map((step, idx) => {
            const Icon = step.icon;
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
                      onClick={() => toggleStep(step.id)}
                      className="flex-shrink-0 group"
                      aria-label={isCompleted ? `Mark ${step.title} as incomplete` : `Mark ${step.title} as complete`}
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
                    <div className="flex-1">
                      <h3
                        className={`text-base font-bold ${
                          isCompleted ? "text-white/50 line-through" : "text-white"
                        }`}
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {step.title}
                      </h3>
                      <p className="text-white/50 text-xs mt-0.5">{step.description}</p>
                    </div>

                    {/* Action button */}
                    {!isCompleted && (
                      <Link href={step.href}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs border-white/20 text-white/70 hover:text-white hover:bg-white/10 bg-transparent rounded-lg flex-shrink-0"
                        >
                          {step.action}
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
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
              <Sparkles className="w-8 h-8 text-[#7dd87d] mx-auto mb-3" />
              <p className="text-white font-bold text-lg mb-1" style={{ fontFamily: "var(--font-display)" }}>
                Quest Complete!
              </p>
              <p className="text-white/60 text-sm">
                You have explored every step. Ready to activate your impact?
              </p>
            </div>
          </AnimatedSection>
        )}
      </div>
    </section>
  );
}
