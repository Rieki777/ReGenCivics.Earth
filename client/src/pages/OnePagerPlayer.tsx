/**
 * Printable One-Pager: Players / Community Members
 * Print-optimized, branded summary for people interested in playing the infinite game
 */
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Gamepad2, Compass, Star, Heart, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { SEO } from "@/components/SEO";

export default function OnePagerPlayer() {
  return (
    <div className="min-h-screen bg-white">
      <SEO title="Player One-Pager | ReGen Civics" description="Printable summary for players interested in joining the ReGen Civics infinite game." />
      
      <div className="print:hidden bg-[#1a472a] text-white py-3 px-4 flex items-center justify-between sticky top-0 z-50">
        <Link href="/game" className="flex items-center gap-2 text-sm hover:text-[#7dd87d] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to The Game
        </Link>
        <Button onClick={() => window.print()} className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] font-bold px-4 py-2 rounded-full text-sm">
          <Printer className="w-4 h-4 mr-2" />
          Print / Save as PDF
        </Button>
      </div>

      <div className="max-w-[800px] mx-auto px-6 py-8 print:px-8 print:py-4">
        <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-[#7dd87d]">
          <div className="flex items-center gap-3">
            <SeedOfLifeIcon className="w-10 h-10 text-[#4a7c59]" />
            <div>
              <h1 className="text-2xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>ReGen Civics</h1>
              <p className="text-sm text-[#7dd87d]">The Infinite Game</p>
            </div>
          </div>
          <div className="text-right text-xs text-[#1a472a]/80">
            <p>regencivics.earth/game</p>
            <p>play@regencivics.earth</p>
          </div>
        </div>

        <div className="bg-[#f0f7f0] rounded-lg p-4 mb-6 text-center">
          <p className="text-lg font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
            Growing the regenerative renaissance: one village, one project, one quest at a time.
          </p>
        </div>

        <h2 className="text-lg font-bold text-[#1a472a] mb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Gamepad2 className="w-5 h-5 text-[#7dd87d]" />
          What is the Infinite Game?
        </h2>
        <p className="text-sm text-[#1a472a]/80 mb-4 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
          ReGen Civics is designed as an infinite game where the goal is not to win, but to keep playing. 
          As a Player, you complete quests that contribute to real-world regenerative outcomes: planting trees, 
          restoring ecosystems, building communities, and creating local economies. Every action earns Seeds 
          (our community currency) and builds your reputation in the network.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 print:grid-cols-2">
          <div>
            <h3 className="text-sm font-bold text-[#1a472a] mb-2 flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)' }}>
              <Compass className="w-4 h-4 text-[#7dd87d]" />
              How to Play
            </h3>
            <div className="space-y-2">
              {[
                { step: "1", title: "Create Your Profile", desc: "Sign up and choose your player archetype" },
                { step: "2", title: "Join a Season", desc: "Each season has themed quests and goals" },
                { step: "3", title: "Complete Quests", desc: "Real-world and digital tasks that create impact" },
                { step: "4", title: "Earn Seeds", desc: "Community currency for your contributions" },
                { step: "5", title: "Level Up", desc: "Unlock new quests, roles, and governance rights" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#4a7c59] text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5">{item.step}</div>
                  <div>
                    <p className="text-[10px] font-bold text-[#1a472a]">{item.title}</p>
                    <p className="text-[9px] text-[#1a472a]/80">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1a472a] mb-2 flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)' }}>
              <Star className="w-4 h-4 text-[#d4a574]" />
              Quest Categories
            </h3>
            <div className="space-y-1.5">
              {[
                { name: "Ecological Quests", desc: "Tree planting, soil restoration, water conservation", icon: "🌱" },
                { name: "Community Quests", desc: "Events, workshops, skill sharing, mentoring", icon: "🤝" },
                { name: "Governance Quests", desc: "Proposals, voting, policy design, facilitation", icon: "🏛" },
                { name: "Economic Quests", desc: "Local currency, marketplace, business incubation", icon: "💰" },
                { name: "Knowledge Quests", desc: "Research, documentation, education, storytelling", icon: "📚" },
                { name: "Creative Quests", desc: "Art, music, design, cultural expression", icon: "🎨" },
              ].map((item, i) => (
                <div key={i} className="bg-[#f8f5f0] p-1.5 rounded flex items-start gap-1.5">
                  <span className="text-sm flex-shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-[10px] font-bold text-[#1a472a]">{item.name}</p>
                    <p className="text-[9px] text-[#1a472a]/80">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-[#1a472a] mb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Heart className="w-5 h-5 text-[#e07a5f]" />
          What Players Receive
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6 print:grid-cols-4">
          {[
            { icon: "🌱", title: "Seeds Currency", desc: "Earn and spend in the local economy" },
            { icon: "🏆", title: "Reputation", desc: "Build your regenerative track record" },
            { icon: "🗳", title: "Governance", desc: "Vote on community decisions" },
            { icon: "🌍", title: "Real Impact", desc: "See your contributions grow" },
          ].map((item, i) => (
            <div key={i} className="bg-[#f0f7f0] p-2 rounded text-center">
              <span className="text-xl block mb-1">{item.icon}</span>
              <p className="text-[10px] font-bold text-[#1a472a]">{item.title}</p>
              <p className="text-[9px] text-[#1a472a]/80">{item.desc}</p>
            </div>
          ))}
        </div>

        <h2 className="text-lg font-bold text-[#1a472a] mb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Sparkles className="w-5 h-5 text-[#d4a574]" />
          Seasons
        </h2>
        <p className="text-xs text-[#1a472a]/85 mb-3" style={{ fontFamily: 'var(--font-body)' }}>
          The game runs in seasons aligned with natural cycles. Each season introduces new quests, 
          challenges, and rewards. Season 3 begins in 2026.
        </p>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { name: "Spring", theme: "Planting", color: "bg-green-100 text-green-800" },
            { name: "Summer", theme: "Growing", color: "bg-yellow-100 text-yellow-800" },
            { name: "Autumn", theme: "Harvesting", color: "bg-orange-100 text-orange-800" },
            { name: "Winter", theme: "Reflecting", color: "bg-blue-100 text-blue-800" },
          ].map((item, i) => (
            <div key={i} className={`${item.color} p-2 rounded text-center`}>
              <p className="text-[10px] font-bold">{item.name}</p>
              <p className="text-[9px] opacity-70">{item.theme}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#1a472a] rounded-lg p-4 text-center">
          <p className="text-white font-bold text-sm mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            Ready to Play?
          </p>
          <p className="text-white/70 text-xs mb-2">Join at regencivics.earth/game or attend an Open Session</p>
          <div className="flex items-center justify-center gap-4 text-[#7dd87d] text-xs">
            <span>regencivics.earth/game</span>
            <span>|</span>
            <span>Season 3 Coming 2026</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#e8e4de] flex items-center justify-between text-[9px] text-[#1a472a]/40">
          <span>ReGen Civics - Player One-Pager</span>
          <span>An Infinite Game for the Regenerative Renaissance</span>
        </div>
      </div>
    </div>
  );
}
