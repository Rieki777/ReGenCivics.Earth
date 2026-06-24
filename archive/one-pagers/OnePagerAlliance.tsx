/**
 * Printable One-Pager: Alliance Partners
 * Print-optimized, branded summary for organizations considering alliance partnership
 */
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Handshake, Network, Globe, Zap, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { SEO } from "@/components/SEO";

export default function OnePagerAlliance() {
  return (
    <div className="min-h-screen bg-white">
      <SEO title="Alliance Partners One-Pager | ReGen Civics" description="Printable summary for organizations considering joining the ReGen Civics Alliance." />
      
      {/* Print Controls */}
      <div className="print:hidden bg-[#1a472a] text-white py-3 px-4 flex items-center justify-between sticky top-0 z-50">
        <Link href="/ally" className="flex items-center gap-2 text-sm hover:text-[#7dd87d] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Alliance
        </Link>
        <Button onClick={() => window.print()} className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] font-bold px-4 py-2 rounded-full text-sm">
          <Printer className="w-4 h-4 mr-2" />
          Print / Save as PDF
        </Button>
      </div>

      <div className="max-w-[800px] mx-auto px-6 py-8 print:px-8 print:py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-[#d4a574]">
          <div className="flex items-center gap-3">
            <SeedOfLifeIcon className="w-10 h-10 text-[#4a7c59]" />
            <div>
              <h1 className="text-2xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>ReGen Civics</h1>
              <p className="text-sm text-[#d4a574]">Alliance Partnership</p>
            </div>
          </div>
          <div className="text-right text-xs text-[#1a472a]/60">
            <p>regencivics.earth/ally</p>
            <p>info@regencivics.earth</p>
          </div>
        </div>

        <div className="bg-[#faf5ef] rounded-lg p-4 mb-6 text-center">
          <p className="text-lg font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
            Growing the regenerative renaissance: one village, one project, one quest at a time.
          </p>
        </div>

        <h2 className="text-lg font-bold text-[#1a472a] mb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Handshake className="w-5 h-5 text-[#d4a574]" />
          What is the ReGen Civics Alliance?
        </h2>
        <p className="text-sm text-[#1a472a]/80 mb-4 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
          The Alliance is a network of organizations, consultancies, and service providers who support regenerative 
          land projects with their expertise. As an Alliance Partner, your org. provides specialized services 
          to projects in the network while gaining access to a growing pipeline of regenerative development opportunities.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 print:grid-cols-2">
          <div>
            <h3 className="text-sm font-bold text-[#1a472a] mb-2 flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)' }}>
              <Zap className="w-4 h-4 text-[#d4a574]" />
              Alliance Benefits
            </h3>
            <ul className="space-y-1.5 text-xs text-[#1a472a]/80" style={{ fontFamily: 'var(--font-body)' }}>
              {["Access to regenerative project pipeline", "Revenue from service delivery", "Co-investment opportunities", "Brand alignment with regenerative movement", "Network of complementary partners", "Impact reporting and credentials", "Governance participation rights"].map((item, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#d4a574] flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1a472a] mb-2 flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)' }}>
              <Network className="w-4 h-4 text-[#4a7c59]" />
              Partner Categories
            </h3>
            <div className="space-y-1.5">
              {[
                { name: "Regenerative Agriculture", desc: "Permaculture, agroforestry, soil restoration" },
                { name: "Architecture & Design", desc: "Sustainable building, community planning" },
                { name: "Legal & Governance", desc: "Entity structuring, DAO frameworks, compliance" },
                { name: "Technology", desc: "Blockchain, impact measurement, platforms" },
                { name: "Finance & Impact", desc: "Impact investing, fund management, auditing" },
                { name: "Education & Culture", desc: "Training, curriculum, community building" },
              ].map((item, i) => (
                <div key={i} className="bg-[#f8f5f0] p-1.5 rounded flex items-start gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#d4a574] flex-shrink-0 mt-1.5" />
                  <div>
                    <p className="text-[10px] font-bold text-[#1a472a]">{item.name}</p>
                    <p className="text-[9px] text-[#1a472a]/60">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-[#1a472a] mb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Globe className="w-5 h-5 text-[#4a7c59]" />
          How the Alliance Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 print:grid-cols-3">
          {[
            { step: "1", title: "Join", desc: "Apply with your organization's profile, expertise, and service offerings." },
            { step: "2", title: "Match", desc: "Get matched with land projects that need your specific skills and services." },
            { step: "3", title: "Deliver & Earn", desc: "Provide services, earn revenue, and build your regenerative portfolio." },
          ].map((item, i) => (
            <div key={i} className="bg-[#f0f7f0] p-3 rounded-lg text-center">
              <div className="w-8 h-8 rounded-full bg-[#4a7c59] text-white flex items-center justify-center text-xs font-bold mx-auto mb-2">{item.step}</div>
              <p className="text-xs font-bold text-[#1a472a] mb-1">{item.title}</p>
              <p className="text-[10px] text-[#1a472a]/70 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { value: "50+", label: "Alliance Partners" },
            { value: "12", label: "Active Projects" },
            { value: "8", label: "Countries" },
            { value: "$2.5M+", label: "Deployed Capital" },
          ].map((item, i) => (
            <div key={i} className="text-center bg-[#faf5ef] p-2 rounded">
              <p className="text-lg font-bold text-[#d4a574]" style={{ fontFamily: 'var(--font-display)' }}>{item.value}</p>
              <p className="text-[9px] text-[#1a472a]/60">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#1a472a] rounded-lg p-4 text-center">
          <p className="text-white font-bold text-sm mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            Bring Your Expertise to the Regenerative Renaissance
          </p>
          <p className="text-white/70 text-xs mb-2">Apply at regencivics.earth/ally or email partnerships@regencivics.earth</p>
          <div className="flex items-center justify-center gap-4 text-[#d4a574] text-xs">
            <span>regencivics.earth/ally</span>
            <span>|</span>
            <span>Alliance Applications Open</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#e8e4de] flex items-center justify-between text-[9px] text-[#1a472a]/40">
          <span>ReGen Civics Alliance - Partner One-Pager</span>
          <span>An Infinite Game for the Regenerative Renaissance</span>
        </div>
      </div>
    </div>
  );
}
