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
import { SEO, pageSEO } from "@/components/SEO";
import { BackButton } from "@/components/BackButton";
import { pageCopy } from "@/data/pageCopy";
import { cdnImg } from "@/lib/utils";

// Sign In CTA Component
function SignInCTA() {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading || isAuthenticated) return null;
  
  return (
    <div className="mt-8 bg-white rounded-2xl p-6 border border-[#7dd87d]/30 shadow-sm text-center">
      <BackButton />
      <h3 className="text-lg font-bold text-[#1a472a] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
        {pageCopy.crowdPooling.signIn.heading}
      </h3>
      <p className="text-[#1a472a]/85 text-sm mb-4">
        {pageCopy.crowdPooling.signIn.body}
      </p>
      <Button
        className="bg-[#1a472a] hover:bg-[#2d5a3d]"
        onClick={() => window.location.href = getLoginUrl()}
      >
        <LogIn className="w-4 h-4 mr-2" />
        {pageCopy.crowdPooling.signIn.button}
      </Button>
    </div>
  );
}

export default function CrowdPooling() {
  const [benefitsExpanded, setBenefitsExpanded] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f5f0] to-[#f0ebe0]">
      <SEO {...pageSEO.crowdPooling} breadcrumbs={[{ name: "Home", url: "/" }, { name: "Crowd Pooling", url: "/crowd-pooling" }]} />
      
      {/* Header with Background Image */}
      <header className="relative bg-[#1a472a] text-white py-4 px-4 sticky top-16 z-40 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src={cdnImg("https://assets.regencivics.earth/LITCLobaccHmqZcc.jpg")}
            alt="Crowd Pooling - Community members bringing diverse resources together"
            width="1920"
            height="1080"
            className="w-full h-full object-cover opacity-20"
            loading="lazy"
          />
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
              {pageCopy.crowdPooling.toolIntro.title}
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
              <span className="text-sm font-medium">{pageCopy.crowdPooling.toolIntro.title}</span>
            </div>
            <h1 
              className="text-3xl md:text-4xl font-bold text-[#1a472a] mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {pageCopy.crowdPooling.heading}
            </h1>
            <p className="text-[#1a472a]/85 max-w-xl mx-auto safe-prose">
              {pageCopy.crowdPooling.subtext}
            </p>
            <p className="mt-3 text-[#1a472a]/70 text-sm max-w-xl mx-auto">
              {pageCopy.crowdPooling.browseCampaigns}{" "}
              <Link href="/crowd-pooling-projects" className="text-[#4a7c59] font-medium hover:underline">
                {pageCopy.crowdPooling.browseCampaignsLink}
              </Link>
            </p>
            <p className="text-[#1a472a]/80 text-sm max-w-xl mx-auto mt-2">
              {pageCopy.crowdPooling.toolIntro.subheading}
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
                {pageCopy.crowdPooling.benefits.heading}
              </h2>
              {benefitsExpanded ? (
                <ChevronUp className="w-5 h-5 text-[#7dd87d]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#7dd87d]" />
              )}
            </button>
            
            {benefitsExpanded && (
              <div className="grid md:grid-cols-2 gap-4">
                {pageCopy.crowdPooling.benefits.items.map((item, idx) => {
                  const icons = [DollarSign, Unlock, Scale, Leaf];
                  const Icon = icons[idx] || Leaf;
                  return (
                    <div key={item.title} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-[#7dd87d]" />
                        </div>
                        <h3 className="font-bold">{item.title}</h3>
                      </div>
                      <p className="text-white/80 text-sm">{item.body}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Info box */}
          <div className="bg-white rounded-xl p-4 mb-8 border border-[#7dd87d]/30 shadow-sm">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-[#4a7c59] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-[#1a472a]/80 safe-prose min-w-0">
                <p className="mb-2">
                  <strong>How to use this tool:</strong>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[#1a472a]/85">
                  {pageCopy.crowdPooling.howTo.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
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
                  {pageCopy.crowdPooling.submit.heading}
                </h3>
                <p className="text-[#1a472a]/85 text-sm max-w-lg mx-auto">
                  {pageCopy.crowdPooling.submit.body}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a 
                href="https://app.hypha.earth/en/dho/regen-games/agreements"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] text-lg py-3 px-6 ring-2 ring-[#7dd87d]/30 w-full sm:w-auto">
                  <ExternalLink className="w-5 h-5 mr-2" />
                  {pageCopy.crowdPooling.submit.submitLabel}
                </Button>
              </a>
              <Link href="/crowd-pooling-projects">
                <Button className="bg-white/10 hover:bg-white/20 text-white border border-[#7dd87d]/40 text-lg py-3 px-6 w-full sm:w-auto">
                  <Users className="w-5 h-5 mr-2" />
                  {pageCopy.crowdPooling.submit.viewProjectsLabel}
                </Button>
              </Link>
            </div>
            
            <p className="text-center text-xs text-[#1a472a]/70 mt-3">
              {pageCopy.crowdPooling.submit.footer}
            </p>
          </div>

          {/* Philosophy Video Section */}
          <div className="mt-8 bg-white rounded-2xl p-6 border border-[#7dd87d]/30 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Play className="w-5 h-5 text-[#4a7c59]" />
              <h3 className="text-lg font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                {pageCopy.crowdPooling.philosophy.heading}
              </h3>
            </div>
            <p className="text-[#1a472a]/85 text-sm mb-4 safe-prose">
              {pageCopy.crowdPooling.philosophy.body}
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
                <h3 className="font-bold text-[#1a472a] mb-2">{pageCopy.crowdPooling.related[0].heading}</h3>
                <p className="text-sm text-[#1a472a]/60">
                  {pageCopy.crowdPooling.related[0].body}
                </p>
              </div>
            </Link>
            <Link href="/blog/introducing-games-and-quests">
              <div className="bg-white rounded-xl p-4 border border-[#7dd87d]/30 hover:border-[#7dd87d] transition-colors cursor-pointer">
                <h3 className="font-bold text-[#1a472a] mb-2">{pageCopy.crowdPooling.related[1].heading}</h3>
                <p className="text-sm text-[#1a472a]/60">
                  {pageCopy.crowdPooling.related[1].body}
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
