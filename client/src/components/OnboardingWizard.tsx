/**
 * OnboardingWizard
 * Shown once to new users (tracked in localStorage) after they first log in.
 * 4 steps: Welcome → Your Role → Your Focus → Get Started
 */

import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { X, ChevronRight, Leaf, Users, BookOpen, Coins, MapPin, Droplets, Zap, Wheat, Landmark, Music, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "onboarding_complete";
const NEW_ACCOUNT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type Role = "Regenerator" | "Investor" | "Ally" | "Learner";
type FocusArea = "Land" | "Water" | "Energy" | "Food" | "Governance" | "Culture" | "Finance";

const ROLES: { value: Role; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: "Regenerator",
    label: "Regenerator",
    description: "I steward or build regenerative land projects",
    icon: <Leaf className="w-5 h-5" />,
  },
  {
    value: "Investor",
    label: "Investor",
    description: "I want to align my capital with regenerative outcomes",
    icon: <Coins className="w-5 h-5" />,
  },
  {
    value: "Ally",
    label: "Ally",
    description: "I support the movement through skills, time, or community",
    icon: <Users className="w-5 h-5" />,
  },
  {
    value: "Learner",
    label: "Learner",
    description: "I am here to learn, explore, and grow",
    icon: <BookOpen className="w-5 h-5" />,
  },
];

const FOCUS_AREAS: { value: FocusArea; icon: React.ReactNode }[] = [
  { value: "Land", icon: <MapPin className="w-4 h-4" /> },
  { value: "Water", icon: <Droplets className="w-4 h-4" /> },
  { value: "Energy", icon: <Zap className="w-4 h-4" /> },
  { value: "Food", icon: <Wheat className="w-4 h-4" /> },
  { value: "Governance", icon: <Landmark className="w-4 h-4" /> },
  { value: "Culture", icon: <Music className="w-4 h-4" /> },
  { value: "Finance", icon: <DollarSign className="w-4 h-4" /> },
];

const ROLE_TO_PATH: Record<Role, string> = {
  Regenerator: "land_project",
  Investor: "investor",
  Ally: "ally",
  Learner: "player",
};

// ─── Action cards shown on step 4 ─────────────────────────────────────────────

const ACTION_CARDS: { title: string; description: string; href: string; cta: string }[] = [
  {
    title: "Explore the Community",
    description: "Join discussions, ask questions, and connect with fellow regenerators.",
    href: "/community",
    cta: "Visit Forum",
  },
  {
    title: "View Active Projects",
    description: "Discover land projects across the globe seeking support and collaboration.",
    href: "/map",
    cta: "See the Map",
  },
  {
    title: "Complete Your Profile",
    description: "Set up your player profile to start questing and connect with others.",
    href: "/profile",
    cta: "Build Profile",
  },
];

// ─── Progress Dots ─────────────────────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? "w-3 h-3 bg-[#7dd87d]"
              : i < current
              ? "w-2 h-2 bg-[#7dd87d]/50"
              : "w-2 h-2 bg-white/20"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Step components ───────────────────────────────────────────────────────────

function StepWelcome() {
  return (
    <div className="text-center">
      {/* Illustration placeholder */}
      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#2d5a3d] to-[#1a472a] border-2 border-[#7dd87d]/40 flex items-center justify-center">
        <Leaf className="w-12 h-12 text-[#7dd87d]" />
      </div>

      <h2
        className="text-2xl font-bold text-white mb-3"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Welcome to ReGen Civics!
      </h2>
      <p className="text-white/70 text-sm leading-relaxed max-w-sm mx-auto">
        You have joined an Infinite Game for the ReGenerative Renaissance. A living network of land projects, investors, allies, and learners co-creating a healthier world.
      </p>
      <p className="text-[#7dd87d]/80 text-xs mt-4">
        Let us take 60 seconds to personalise your experience.
      </p>
    </div>
  );
}

function StepRole({ selected, onSelect }: { selected: Role | null; onSelect: (r: Role) => void }) {
  return (
    <div>
      <h2
        className="text-xl font-bold text-white mb-1 text-center"
        style={{ fontFamily: "var(--font-display)" }}
      >
        What is your primary role?
      </h2>
      <p className="text-white/70 text-xs text-center mb-5">You can always change this later in your profile.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ROLES.map((role) => {
          const isSelected = selected === role.value;
          return (
            <button
              key={role.value}
              onClick={() => onSelect(role.value)}
              className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-200 ${
                isSelected
                  ? "border-[#7dd87d] bg-[#7dd87d]/10"
                  : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10"
              }`}
            >
              <div
                className={`mt-0.5 p-2 rounded-lg flex-shrink-0 ${
                  isSelected ? "bg-[#7dd87d]/20 text-[#7dd87d]" : "bg-white/10 text-white/60"
                }`}
              >
                {role.icon}
              </div>
              <div>
                <p className={`font-semibold text-sm ${isSelected ? "text-[#7dd87d]" : "text-white"}`}>
                  {role.label}
                </p>
                <p className="text-white/70 text-xs mt-0.5 leading-snug">{role.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepFocus({
  selected,
  onToggle,
}: {
  selected: FocusArea[];
  onToggle: (area: FocusArea) => void;
}) {
  return (
    <div>
      <h2
        className="text-xl font-bold text-white mb-1 text-center"
        style={{ fontFamily: "var(--font-display)" }}
      >
        What are your focus areas?
      </h2>
      <p className="text-white/70 text-xs text-center mb-5">Select all that resonate with you.</p>

      <div className="flex flex-wrap gap-2 justify-center">
        {FOCUS_AREAS.map((area) => {
          const isSelected = selected.includes(area.value);
          return (
            <button
              key={area.value}
              onClick={() => onToggle(area.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all duration-200 ${
                isSelected
                  ? "border-[#7dd87d] bg-[#7dd87d]/15 text-[#7dd87d]"
                  : "border-white/20 bg-white/5 text-white/70 hover:border-white/40 hover:bg-white/10"
              }`}
            >
              {area.icon}
              {area.value}
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <p className="text-[#7dd87d]/70 text-xs text-center mt-4">
          {selected.length} area{selected.length !== 1 ? "s" : ""} selected
        </p>
      )}
    </div>
  );
}

function StepGetStarted({ onClose }: { onClose: () => void }) {
  return (
    <div>
      <h2
        className="text-xl font-bold text-white mb-1 text-center"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Here is your personalised path
      </h2>
      <p className="text-white/70 text-xs text-center mb-5">Start anywhere. The game is infinite.</p>

      <div className="flex flex-col gap-3">
        {ACTION_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            onClick={onClose}
            className="flex items-center justify-between p-4 rounded-xl border border-white/15 bg-white/5 hover:border-[#7dd87d]/50 hover:bg-[#7dd87d]/5 transition-all duration-200 group"
          >
            <div className="flex-1 min-w-0 pr-3">
              <p className="font-semibold text-sm text-white group-hover:text-[#7dd87d] transition-colors">
                {card.title}
              </p>
              <p className="text-white/70 text-xs mt-0.5 leading-snug">{card.description}</p>
            </div>
            <div className="flex items-center gap-1 text-[#7dd87d] text-xs font-semibold flex-shrink-0">
              {card.cta}
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export interface OnboardingWizardProps {
  /** The authenticated user object from useAuth(). */
  user: {
    createdAt?: string | Date | null;
  } | null;
}

export function OnboardingWizard({ user }: OnboardingWizardProps) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0); // 0-based: 0=Welcome 1=Role 2=Focus 3=GetStarted
  const [role, setRole] = useState<Role | null>(null);
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);

  const updateProfileMutation = trpc.userProfiles.updateProfile.useMutation();

  // Determine visibility on mount
  useEffect(() => {
    if (!user) return;

    try {
      // Already completed onboarding
      if (localStorage.getItem(STORAGE_KEY)) return;

      // Only show for new accounts (created within last 7 days), or if createdAt is unavailable
      if (user.createdAt) {
        const createdAt = new Date(user.createdAt as string | Date);
        const isNewAccount = Date.now() - createdAt.getTime() < NEW_ACCOUNT_WINDOW_MS;
        if (!isNewAccount) {
          // Account is older than 7 days, mark complete and skip
          localStorage.setItem(STORAGE_KEY, "true");
          return;
        }
      }

      setVisible(true);
    } catch {
      // localStorage unavailable or date parse error, skip silently
    }
  }, [user]);

  const handleClose = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  const handleNext = () => {
    if (step === 1 && role) {
      // Store role in localStorage as backup
      try {
        localStorage.setItem("onboarding_role", role);
      } catch { /* ignore */ }
    }

    if (step === 2) {
      // Persist focus areas via trpc and localStorage
      const questInterestsValue = focusAreas.join(",");
      if (questInterestsValue) {
        updateProfileMutation.mutate(
          { questInterests: questInterestsValue },
          {
            onError: () => {
              // Fallback already stored in localStorage below
            },
          }
        );
      }
      try {
        if (focusAreas.length > 0) {
          localStorage.setItem("onboarding_focus", JSON.stringify(focusAreas));
        }
      } catch { /* ignore */ }
    }

    if (step < 3) {
      setStep((s) => s + 1);
    } else {
      handleClose();
    }
  };

  const handleSkip = () => {
    // Store selections so far before closing
    try {
      if (role) localStorage.setItem("onboarding_role", role);
      if (focusAreas.length > 0) localStorage.setItem("onboarding_focus", JSON.stringify(focusAreas));
    } catch { /* ignore */ }
    handleClose();
  };

  const toggleFocusArea = (area: FocusArea) => {
    setFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  // Determine if "Next" should be enabled
  const canProceed = step !== 1 || role !== null;

  const isLastStep = step === 3;

  if (!visible) return null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      aria-label="Welcome to ReGen Civics"
    >
      {/* Modal panel */}
      <div className="relative w-full max-w-md bg-[#0d1f12] border border-[#7dd87d]/20 rounded-2xl shadow-2xl shadow-black/60 p-6">
        {/* Skip / close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-white/60 hover:text-white/70 transition-colors"
          aria-label="Skip onboarding"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Progress dots */}
        <ProgressDots total={4} current={step} />

        {/* Step content */}
        <div className="min-h-[280px] flex flex-col justify-center">
          {step === 0 && <StepWelcome />}
          {step === 1 && <StepRole selected={role} onSelect={setRole} />}
          {step === 2 && <StepFocus selected={focusAreas} onToggle={toggleFocusArea} />}
          {step === 3 && <StepGetStarted onClose={handleClose} />}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
          {/* Skip link (hidden on last step) */}
          {!isLastStep ? (
            <button
              onClick={handleSkip}
              className="text-white/60 hover:text-white/70 text-sm transition-colors"
            >
              Skip for now
            </button>
          ) : (
            <span />
          )}

          <Button
            onClick={handleNext}
            disabled={!canProceed}
            className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-bold px-6 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLastStep ? "Get Started" : "Next"}
            {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
