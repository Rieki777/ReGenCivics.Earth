/**
 * ProfileHeader
 * Renders the hero section for the player profile page.
 * State lives in PlayerProfile.tsx and is passed as props.
 */
import React from "react";
import { AnimatedSection } from "@/components/AnimatedSection";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";

interface ProfileHeaderProps {
  displayName?: string;
}

export function ProfileHeader({ displayName }: ProfileHeaderProps) {
  return (
    <section className="relative py-16 px-4">
      <div className="container mx-auto max-w-4xl">
        <AnimatedSection animation="slide-up">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-[#7dd87d]/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-[#7dd87d]/30">
              <SeedOfLifeIcon className="w-5 h-5 text-[#7dd87d]" />
              <span className="text-[#7dd87d] font-medium">Game Profile</span>
            </div>
            <h1
              className="text-4xl md:text-5xl font-bold text-white mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {displayName ? (
                <>
                  <span className="text-[#7dd87d]">{displayName}</span>'s Profile
                </>
              ) : (
                <>
                  Your <span className="text-[#7dd87d]">Player</span> Profile
                </>
              )}
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Track your contributions, earn tokens, and connect your Base blockchain account to
              verify your on-chain identity.
            </p>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
