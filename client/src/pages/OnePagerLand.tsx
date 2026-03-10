/**
 * Printable One-Pager: Land Projects
 * Print-optimized, branded summary for land project teams to share
 */
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, MapPin, Shield, TrendingUp, Users, Sprout, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { SEO } from "@/components/SEO";

export default function OnePagerLand() {
  return (
    <div className="min-h-screen bg-white">
      <SEO title="Land Projects One-Pager | ReGen Civics" description="Printable summary for regenerative land project teams considering the ReGen Civics alliance." />
      
      {/* Print Controls - hidden on print */}
      <div className="print:hidden bg-[#1a472a] text-white py-3 px-4 flex items-center justify-between sticky top-0 z-50">
        <Link href="/land" className="flex items-center gap-2 text-sm hover:text-[#7dd87d] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Land Projects
        </Link>
        <Button
          onClick={() => window.print()}
          className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] font-bold px-4 py-2 rounded-full text-sm"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print / Save as PDF
        </Button>
      </div>

      {/* Printable Content */}
      <div className="max-w-[800px] mx-auto px-6 py-8 print:px-8 print:py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-[#7dd87d]">
          <div className="flex items-center gap-3">
            <SeedOfLifeIcon className="w-10 h-10 text-[#4a7c59]" />
            <div>
              <h1 className="text-2xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                ReGen Civics
              </h1>
              <p className="text-sm text-[#4a7c59]">Land Projects Program</p>
            </div>
          </div>
          <div className="text-right text-xs text-[#1a472a]/80">
            <p>regencivics.earth/land</p>
            <p>info@regencivics.earth</p>
          </div>
        </div>

        {/* Tagline */}
        <div className="bg-[#f0f7f0] rounded-lg p-4 mb-6 text-center">
          <p className="text-lg font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
            Growing the regenerative renaissance: one village, one project, one quest at a time.
          </p>
        </div>

        {/* What is ReGen Civics for Land Projects? */}
        <h2 className="text-lg font-bold text-[#1a472a] mb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <MapPin className="w-5 h-5 text-[#4a7c59]" />
          What is ReGen Civics for Land Projects?
        </h2>
        <p className="text-sm text-[#1a472a]/80 mb-4 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
          ReGen Civics is a venture fund and alliance that helps regenerative land projects launch their own local economies. 
          We provide funding, governance tools, financial infrastructure, and a global network of partners to help your project 
          become self-sustaining and scalable.
        </p>

        {/* Two Columns: What You Receive + Two Paths */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 print:grid-cols-2">
          <div>
            <h3 className="text-sm font-bold text-[#1a472a] mb-2 flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)' }}>
              <Sprout className="w-4 h-4 text-[#7dd87d]" />
              What You Receive
            </h3>
            <ul className="space-y-1.5 text-xs text-[#1a472a]/80" style={{ fontFamily: 'var(--font-body)' }}>
              {[
                "Seed funding (up to $250K initial)",
                "Local token economy design",
                "Governance framework (DAO tools)",
                "Impact measurement system",
                "Legal entity structuring",
                "Alliance network access",
                "Ongoing mentorship and support",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#7dd87d] flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1a472a] mb-2 flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)' }}>
              <TrendingUp className="w-4 h-4 text-[#d4a574]" />
              Two Paths
            </h3>
            <div className="space-y-3">
              <div className="bg-[#f8f5f0] p-2.5 rounded-lg">
                <p className="text-xs font-bold text-[#1a472a] mb-1">Mature Projects</p>
                <p className="text-[10px] text-[#1a472a]/85 leading-relaxed">
                  Existing communities with land, team, and track record. Ready for economic infrastructure, 
                  token systems, and scaling support.
                </p>
              </div>
              <div className="bg-[#f8f5f0] p-2.5 rounded-lg">
                <p className="text-xs font-bold text-[#1a472a] mb-1">Early-Stage Projects</p>
                <p className="text-[10px] text-[#1a472a]/85 leading-relaxed">
                  Visionary teams with land access and regenerative plans. Need funding, structure, 
                  and mentorship to launch.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Selection Criteria */}
        <h2 className="text-lg font-bold text-[#1a472a] mb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Shield className="w-5 h-5 text-[#4a7c59]" />
          What We Look For
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6 print:grid-cols-3">
          {[
            { title: "Regenerative Mission", desc: "Clear commitment to ecological restoration and community wellbeing" },
            { title: "Land Access", desc: "Secured or in-progress land rights with development potential" },
            { title: "Team Capacity", desc: "Dedicated team with relevant skills and local knowledge" },
            { title: "Community Roots", desc: "Existing or planned community engagement and local partnerships" },
            { title: "Economic Vision", desc: "Openness to local economy design and token-based systems" },
            { title: "Impact Potential", desc: "Measurable ecological, social, and economic outcomes" },
          ].map((item, i) => (
            <div key={i} className="bg-[#f0f7f0] p-2 rounded">
              <p className="text-[10px] font-bold text-[#1a472a] mb-0.5">{item.title}</p>
              <p className="text-[9px] text-[#1a472a]/85 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* The Journey */}
        <h2 className="text-lg font-bold text-[#1a472a] mb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Users className="w-5 h-5 text-[#4a7c59]" />
          The Journey
        </h2>
        <div className="flex items-center gap-1 md:gap-2 mb-6">
          {[
            { step: "1", label: "Apply" },
            { step: "2", label: "Discovery Call" },
            { step: "3", label: "Assessment" },
            { step: "4", label: "Onboarding" },
            { step: "5", label: "Launch" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1 md:gap-2 flex-1">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#4a7c59] text-white flex items-center justify-center text-[10px] md:text-xs font-bold">
                  {item.step}
                </div>
                <p className="text-[9px] md:text-[10px] text-[#1a472a]/85 mt-1 text-center">{item.label}</p>
              </div>
              {i < 4 && <div className="flex-1 h-0.5 bg-[#7dd87d]/40 mt-[-12px]" />}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-[#1a472a] rounded-lg p-4 text-center">
          <p className="text-white font-bold text-sm mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            Ready to Transform Your Land Project?
          </p>
          <p className="text-white/70 text-xs mb-2">
            Apply at regencivics.earth/land or email info@regencivics.earth
          </p>
          <div className="flex items-center justify-center gap-4 text-[#7dd87d] text-xs">
            <span>regencivics.earth/land</span>
            <span>|</span>
            <span>Season 3 Opening 2026</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-[#e8e4de] flex items-center justify-between text-[9px] text-[#1a472a]/40">
          <span>ReGen Civics Alliance - Land Projects One-Pager</span>
          <span>An Infinite Game for the Regenerative Renaissance</span>
        </div>
      </div>
    </div>
  );
}
