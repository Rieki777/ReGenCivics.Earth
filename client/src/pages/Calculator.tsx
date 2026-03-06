/**
 * Contribution Calculator Page
 * A standalone page for the 8 Forms of Capital contribution calculator
 */

import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, AlertTriangle, Calculator as CalcIcon, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { ContributionCalculator } from "@/components/ContributionCalculator";
import { AnimatedSection } from "@/components/AnimatedSection";
import { SEO } from "@/components/SEO";
import { CalculatorWeightsSheet } from "@/components/CalculatorWeightsSheet";
import { BackButton } from "@/components/BackButton";

// Sign In CTA Component
function SignInCTA() {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading || isAuthenticated) return null;
  
  return (
    <div className="mt-8 pt-6 border-t border-white/20">
      <BackButton />
      <p className="text-white/70 mb-4">Sign in to save your calculations and track your contributions</p>
      <Button
        size="lg"
        className="rounded-xl bg-white hover:bg-white/90 text-[#1a472a]"
        style={{ fontFamily: 'var(--font-accent)' }}
        onClick={() => window.location.href = getLoginUrl()}
      >
        <Users className="mr-2 w-5 h-5" />
        Sign In to Track Progress
      </Button>
    </div>
  );
}

export default function Calculator() {
  return (
    <div className="min-h-screen bg-[#f8f5f0]">
      <SEO 
        title="Contribution Calculator | ReGen Civics"
        description="Calculate the value of your contributions across the 8 Forms of Capital. An experimental tool for quantifying impact in the ReGen Game."
        image="https://assets.regencivics.earth/ocDzkDHpivHtGCWo.jpg"
      />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a472a] to-[#2d5a3d] py-6">
        <div className="container px-4">
          <Link href="/game">
            <Button variant="ghost" className="text-white hover:bg-white/10 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Game
            </Button>
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#7dd87d] flex items-center justify-center">
              <CalcIcon className="w-8 h-8 text-[#1a472a]" />
            </div>
            <div>
              <h1 
                className="text-3xl md:text-4xl font-bold text-white"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Contribution Calculator
              </h1>
              <p className="text-white/70">
                Estimate the value of your contributions across the 8 Forms of Capital
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Experimental Warning Banner */}
      <div className="bg-amber-50 border-y-2 border-amber-300">
        <div className="container px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-900" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 mb-1">Experimental Tool</h3>
              <p className="text-amber-800 text-sm">
                This calculator is experimental and figures provided here aren't guaranteed rewards, just a helpful tool we're playing with. The values are estimates to help you think through your contributions holistically.
              </p>
              <div className="mt-3">
                <CalculatorWeightsSheet />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Calculator Section */}
      <section className="py-12">
        <div className="container px-4">
          <AnimatedSection animation="slide-up">
            <ContributionCalculator />
          </AnimatedSection>
        </div>
      </section>
      
      {/* Footer CTA */}
      <section className="py-12 bg-[#1a472a]">
        <div className="container px-4 text-center">
          <Sparkles className="w-12 h-12 text-[#7dd87d] mx-auto mb-4" />
          <h2 
            className="text-2xl md:text-3xl font-bold text-white mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Ready to Submit Your Contribution?
          </h2>
          <p className="text-white/70 max-w-2xl mx-auto mb-6">
            Once you've calculated your contribution value, submit a proposal on Hypha.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a 
              href="https://app.hypha.earth/en/dho/regen-games/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="lg"
                className="rounded-xl bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]"
                style={{ fontFamily: 'var(--font-accent)' }}
              >
                Submit Proposal on Hypha
              </Button>
            </a>
            <Link href="/game">
              <Button
                size="lg"
                variant="outline"
                className="rounded-xl border-2 border-[#7dd87d] text-[#7dd87d] hover:bg-[#7dd87d]/20"
                style={{ fontFamily: 'var(--font-accent)' }}
              >
                Learn More About the Game
              </Button>
            </Link>
          </div>
          
          {/* Sign In CTA */}
          <SignInCTA />
        </div>
      </section>
    </div>
  );
}
