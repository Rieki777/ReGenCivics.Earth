/**
 * Crowd Pooling Page
 * A dedicated page for the Crowd Pooling Tool with benefits and philosophy video
 */

import { Link } from "wouter";
import { ArrowLeft, Users, Info, Sparkles, ExternalLink, DollarSign, Unlock, Scale, Leaf, ChevronDown, ChevronUp, Play, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import CrowdPoolingTool from "@/components/CrowdPoolingTool";
import { SEO } from "@/components/SEO";
import { BackButton } from "@/components/BackButton";

// Sign In CTA Component
function SignInCTA() {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading || isAuthenticated) return null;
  
  return (
    <div className="mt-8 bg-white rounded-2xl p-6 border border-[#7dd87d]/30 shadow-sm text-center">
      <BackButton />
      <h3 className="text-lg font-bold text-[#1a472a] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
        Track Your Contributions
      </h3>
      <p className="text-[#1a472a]/85 text-sm mb-4">
        Sign in to save your contributions and track your impact across projects
      </p>
      <Button
        className="bg-[#1a472a] hover:bg-[#2d5a3d]"
        onClick={() => window.location.href = getLoginUrl()}
      >
        <LogIn className="w-4 h-4 mr-2" />
        Sign In to Get Started
      </Button>
    </div>
  );
}

export default function CrowdPooling() {
  const [benefitsExpanded, setBenefitsExpanded] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f5f0] to-[#f0ebe0]">
      <SEO 
        title="Crowd Pooling Tool - ReGen Civics"
        description="Pool capital from multiple contributors for your land project. Track immediate contributions and future value commitments."
        keywords="crowd pooling, land project funding, community capital, regenerative finance"
      />
      
      {/* Header with Background Image */}
      <header className="relative bg-[#1a472a] text-white py-4 px-4 sticky top-0 z-50 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://assets.regencivics.earth/LITCLobaccHmqZcc.jpg"
            alt="Crowd Pooling - Community members bringing diverse resources together"
            className="w-full h-full object-cover opacity-20"
          loading="lazy" />
        </div>
        
        {/* Content */}
        <div className="relative z-10">
        <div className="container flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" className="text-white hover:bg-white/10 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#7dd87d]" />
            <span className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              Crowd Pooling Tool
            </span>
          </div>
        </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container py-8 md:py-12">
        <div className="max-w-3xl mx-auto">
          {/* Page intro */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-4 rounded-full bg-[#7dd87d]/20 text-[#1a472a]">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Community Capital Pooling</span>
            </div>
            <h1 
              className="text-3xl md:text-4xl font-bold text-[#1a472a] mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Pool Resources for Your Land Project
            </h1>
            <p className="text-[#1a472a]/85 max-w-xl mx-auto">
              This tool helps land projects aggregate contributions from multiple community members.
              Each contributor fills out their own form, and the project can combine all contributions
              to show the total pooled resources.
            </p>
          </div>

          {/* Benefits Callout - Collapsible */}
          <div className="bg-gradient-to-br from-[#1a472a] to-[#2d5a3d] rounded-2xl p-6 mb-8 text-white shadow-lg">
            <button 
              onClick={() => setBenefitsExpanded(!benefitsExpanded)}
              className="w-full flex items-center justify-between mb-4"
            >
              <h2 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                <Sparkles className="w-5 h-5 text-[#7dd87d]" />
                Why Crowd Pooling?
              </h2>
              {benefitsExpanded ? (
                <ChevronUp className="w-5 h-5 text-[#7dd87d]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#7dd87d]" />
              )}
            </button>
            
            {benefitsExpanded && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-[#7dd87d]" />
                    </div>
                    <h3 className="font-bold">Reduce Financial Burden</h3>
                  </div>
                  <p className="text-white/80 text-sm">
                    Dramatically reduce the perceived financial funding needed by recognizing all forms of capital, not just money.
                  </p>
                </div>
                
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
                      <Unlock className="w-5 h-5 text-[#7dd87d]" />
                    </div>
                    <h3 className="font-bold">Unlock Hidden Assets</h3>
                  </div>
                  <p className="text-white/80 text-sm">
                    Access assets that could never have been bought, like land that was not for sale but wanted to be part of your vision.
                  </p>
                </div>
                
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
                      <Scale className="w-5 h-5 text-[#7dd87d]" />
                    </div>
                    <h3 className="font-bold">Equal Contributions</h3>
                  </div>
                  <p className="text-white/80 text-sm">
                    Create a process from the start for everyone to bring an equal contribution over time, regardless of their financial situation.
                  </p>
                </div>
                
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
                      <Leaf className="w-5 h-5 text-[#7dd87d]" />
                    </div>
                    <h3 className="font-bold">Regenerative Foundations</h3>
                  </div>
                  <p className="text-white/80 text-sm">
                    Build the diverse foundations for a regenerative economic system from the very onset of your project.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Info box */}
          <div className="bg-white rounded-xl p-4 mb-8 border border-[#7dd87d]/30 shadow-sm">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-[#4a7c59] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-[#1a472a]/80">
                <p className="mb-2">
                  <strong>How to use this tool:</strong>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[#1a472a]/85">
                  <li>Enter your project name and target funding amount</li>
                  <li>Add your immediate contributions (land, money, equipment, etc.)</li>
                  <li>Add your future value commitments (roles you will fill)</li>
                  <li>Download your PDF contribution summary</li>
                  <li>Share the tool link with other contributors to aggregate all contributions</li>
                </ol>
              </div>
            </div>
          </div>
          
          {/* The tool */}
          <CrowdPoolingTool />
          
          {/* Submit Proposal Section */}
          <div className="mt-8 bg-gradient-to-r from-[#7dd87d]/20 to-[#4a7c59]/20 rounded-2xl p-6 border border-[#7dd87d]/30">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-[#1a472a] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                Ready to Submit Your Contribution?
              </h3>
              <p className="text-[#1a472a]/85 text-sm max-w-lg mx-auto">
                Take your project contributions straight to the project's DAO during their Crowd Pooling game.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a 
                href="https://app.hypha.earth/en/dho/regen-games/agreements"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-[#1a472a] hover:bg-[#2d5a3d] w-full sm:w-auto">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Submit Proposal to DAO
                </Button>
              </a>
              <Link href="/crowd-pooling-projects">
                <Button variant="outline" className="border-[#1a472a]/30 w-full sm:w-auto">
                  <Users className="w-4 h-4 mr-2" />
                  View Projects Crowd Pooling
                </Button>
              </Link>
            </div>
            
            <p className="text-center text-xs text-[#1a472a]/70 mt-3">
              Click "View Projects Crowd Pooling" to see the list of projects currently accepting contributions
            </p>
          </div>

          {/* Philosophy Video Section */}
          <div className="mt-8 bg-white rounded-2xl p-6 border border-[#7dd87d]/30 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Play className="w-5 h-5 text-[#4a7c59]" />
              <h3 className="text-lg font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                The Philosophy of Crowd Pooling
              </h3>
            </div>
            <p className="text-[#1a472a]/85 text-sm mb-4">
              Watch this introduction video to understand the deeper philosophy behind the Crowd Pooling process
              and how it transforms the way communities fund and launch regenerative projects.
            </p>
            <div className="aspect-video rounded-xl overflow-hidden bg-[#1a472a]/10">
              <iframe
                src="https://www.youtube-nocookie.com/embed/jxKR-WneJp0"
                title="Crowd Pooling Philosophy"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
          
          {/* Related links */}
          <div className="mt-8 grid md:grid-cols-2 gap-4">
            <Link href="/calculator">
              <div className="bg-white rounded-xl p-4 border border-[#7dd87d]/30 hover:border-[#7dd87d] transition-colors cursor-pointer">
                <h3 className="font-bold text-[#1a472a] mb-2">Contribution Calculator</h3>
                <p className="text-sm text-[#1a472a]/60">
                  Calculate your individual contribution value across 8 forms of capital
                </p>
              </div>
            </Link>
            <Link href="/blog/introducing-games-and-quests">
              <div className="bg-white rounded-xl p-4 border border-[#7dd87d]/30 hover:border-[#7dd87d] transition-colors cursor-pointer">
                <h3 className="font-bold text-[#1a472a] mb-2">Learn About Games & Quests</h3>
                <p className="text-sm text-[#1a472a]/60">
                  Discover how to play the Infinite Game and earn tokens through contribution
                </p>
              </div>
            </Link>
          </div>
          
          {/* Sign In CTA */}
          <SignInCTA />
        </div>
      </main>
    </div>
  );
}
