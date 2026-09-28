/**
 * Governance Page - ReGen Civics
 *
 * Two spaces: the Game, governed today by RGVoice on Hypha, and the ReGen
 * Network Cooperative, in design, meant to vote one member, one vote.
 *
 * Rewritten 2026-09-27 (Phase 0, FUNDING_ENGINE_PLAN v1.2). The fund side of
 * this page described a weighted voice split with an investor seat, success
 * fees and profit shares to token holders, a fee split and a countdown to a
 * dashboard date that had passed. The fund is now a cooperative in design, so
 * every sentence about it comes from COOP in shared/fund.ts. The two fund token
 * logos were dropped too: both carry the old fund name baked into the art, and
 * one reads "Invest in Regenerative Futures". The old page is tagged
 * archive/fund-pages-2026-09-27.
 */
import { Users, Globe, CheckCircle2, Zap as ZapIcon, Landmark, Coins } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/BackButton";
import { useState } from "react";
import { PageWrapper } from "@/components/PageWrapper";
import { SEO, pageSEO } from "@/components/SEO";
import { JsonLD } from "@/components/JsonLD";
import { cdnImg } from "@/lib/utils";
import { Pullquote } from "@/components/Pullquote";
import { TLDR } from "@/components/TLDR";
import { MobileTableOfContents, type TocSection } from "@/components/MobileTableOfContents";
import { WhoHoldsVoteChart } from "@/components/governance/WhoHoldsVoteChart";
import { StarsDivider } from "@/components/dividers/StarsDivider";
import { COOP } from "@shared/fund";

const GOVERNANCE_SECTIONS: TocSection[] = [
  { id: 'gov-comparison', title: 'Cooperative and Game' },
  { id: 'gov-tokens', title: 'Two Tokens, Two Powers' },
  { id: 'gov-coop-design', title: 'Cooperative Design' },
  { id: 'gov-game-structure', title: 'Game Governance' },
  { id: 'gov-why-matters', title: 'Why It Matters' },
  { id: 'gov-infrastructure', title: 'Movement Infrastructure' },
  { id: 'gov-dashboard', title: 'Governance on Hypha' },
  { id: 'gov-cta', title: 'Get Involved' },
];

type Space = 'game' | 'coop';

// Game vs Cooperative voice toggle
function VoiceToggle({ onModeChange }: { onModeChange?: (mode: Space) => void }) {
  const [activeMode, setActiveMode] = useState<Space>('game');

  const handleModeChange = (mode: Space) => {
    setActiveMode(mode);
    onModeChange?.(mode);
  };

  return (
    <div className="space-y-6">
      {/* Toggle */}
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={() => handleModeChange('game')}
          aria-pressed={activeMode === 'game'}
          className={`px-7 py-3 min-h-[44px] rounded-xl font-bold text-base transition-all ${
            activeMode === 'game'
              ? 'bg-purple-700 text-white shadow-lg shadow-purple-700/30'
              : 'bg-[#1a472a]/60 border-2 border-purple-500/40 text-purple-400 hover:border-purple-500/60'
          }`}
        >
          Game Governance
        </button>
        <button
          onClick={() => handleModeChange('coop')}
          aria-pressed={activeMode === 'coop'}
          className={`px-7 py-3 min-h-[44px] rounded-xl font-bold text-base transition-all ${
            activeMode === 'coop'
              ? 'bg-[#d4a574] text-[#1a472a] shadow-lg shadow-[#d4a574]/30'
              : 'bg-[#1a472a]/60 border-2 border-[#d4a574]/40 text-[#d4a574] hover:border-[#d4a574]/60'
          }`}
        >
          The Cooperative
        </button>
      </div>

      {/* Game Mode */}
      {activeMode === 'game' && (
        <div className="bg-gradient-to-br from-purple-900/30 to-[#1a472a]/60 rounded-2xl p-8 border border-purple-500/40 space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <img
              src={cdnImg("https://assets.regencivics.earth/dWhwxPMVWDYiuDpF.png")}
              alt="RGVoice Game Token"
              width="96"
              height="96"
              className="w-24 h-24 object-contain flex-shrink-0"
              loading="lazy"
            />
            <div>
              <h3 className="text-2xl font-bold text-purple-400 mb-2">RGVoice: Game Governance</h3>
              <p className="text-white/80 leading-relaxed">
                In the ReGen Game, RGVoice is earned through completing quests and contributing to the Game ecosystem. Voice decays 3% monthly, ensuring governance always stays with those who are currently active and engaged.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-[#0d2818]/60 rounded-xl p-5 border border-purple-500/30">
              <p className="text-purple-400 font-bold text-lg mb-3">How It's Earned</p>
              <ul className="space-y-2 text-sm text-white/80">
                <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">✦</span> Complete quests to earn RGVoice tokens</li>
                <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">✦</span> Contribute to game proposals and community decisions</li>
                <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">✦</span> Mentor other players and build community</li>
                <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">✦</span> Organize seasonal events and quests</li>
              </ul>
            </div>
            <div className="bg-[#0d2818]/60 rounded-xl p-5 border border-purple-500/30">
              <p className="text-purple-400 font-bold text-lg mb-3">Key Traits</p>
              <ul className="space-y-2 text-sm text-white/80">
                <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">✦</span> Merit-based: earned through activity, never purchased</li>
                <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">✦</span> <strong className="text-purple-300">3% monthly decay</strong> keeps governance with active players</li>
                <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">✦</span> Non-tradable: your voice stays yours</li>
                <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">✦</span> Governs game rules, quest design, and seasonal decisions</li>
                <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">✦</span> Paired with $ReGen, the Game's token, which records contributions</li>
              </ul>
            </div>
          </div>

          <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-500/20 text-center">
            <p className="text-purple-300 text-sm">
              <strong>The 3% decay rule</strong> is a core design feature of the Infinite Game. It ensures that those who shaped the past don't permanently control the future. Stay active, stay relevant.
            </p>
          </div>
        </div>
      )}

      {/* Cooperative Mode */}
      {activeMode === 'coop' && (
        <div className="bg-gradient-to-br from-[#d4a574]/15 to-[#1a472a]/60 rounded-2xl p-8 border border-[#d4a574]/40 space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-[#d4a574]/15 border-2 border-[#d4a574]/50 flex items-center justify-center flex-shrink-0">
              <Landmark className="w-12 h-12 text-[#d4a574]" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-[#d4a574] mb-2">The Cooperative: {COOP.statusLabel}</h3>
              <p className="text-white/80 leading-relaxed">{COOP.statement}</p>
            </div>
          </div>

          <h4 className="text-lg font-bold text-[#d4a574] mb-3 text-center">How the Cooperative Is Designed to Vote</h4>
          <WhoHoldsVoteChart />

          <div className="bg-[#0d2818]/60 rounded-xl p-5 border border-[#d4a574]/30">
            <p className="text-[#d4a574] font-bold text-lg mb-2">Where RCVoice Stands</p>
            <p className="text-sm text-white/80 leading-relaxed">{COOP.coopTokens.rcvoice}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Two Tokens Section with linked toggle state
function TwoTokensSection() {
  const [mode, setMode] = useState<Space>('game');

  return (
    <>
      <div className="mb-8">
        <h3 className="text-xl font-bold text-white/90 mb-2 text-center">Voice works differently in each space</h3>
        <p className="text-white/60 text-center text-sm mb-6">Click to explore how voice works in the Game and how the cooperative is designed to vote</p>
        <VoiceToggle onModeChange={setMode} />
      </div>

      {/* Token box that follows the toggle */}
      {mode === 'coop' ? (
        <div className="bg-[#1a472a]/60 rounded-xl p-6 border-l-4 border-[#d4a574] transition-all">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 rounded-full bg-[#d4a574]/20 border border-[#d4a574]/40 flex items-center justify-center flex-shrink-0">
              <Coins className="w-6 h-6 text-[#d4a574]" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-bold text-[#d4a574]">$RCivics</h3>
          </div>
          <p className="text-white/80 leading-relaxed">{COOP.coopTokens.rcivics}</p>
        </div>
      ) : (
        <div className="bg-[#0d2818]/70 rounded-xl p-6 border-l-4 border-[#7dd87d] transition-all">
          <div className="flex items-center gap-4 mb-4">
            <img
              src={cdnImg("https://assets.regencivics.earth/ZWOtkRNjdCWfFFed.png")}
              alt="$ReGen Token"
              width="48"
              height="48"
              className="w-12 h-12 object-contain flex-shrink-0"
              loading="lazy"
            />
            <h3 className="text-xl font-bold text-[#7dd87d]">$ReGen: The Game's Token</h3>
          </div>
          <p className="text-white/80 leading-relaxed">
            $ReGen records contributions to the Game: quests, gratitude and seasonal harvests. What else it does inside the Game is ours to co-create. Players propose its uses and decide them together through governance.
          </p>
          <div className="mt-5 bg-[#7dd87d]/10 rounded-lg p-4 border border-[#7dd87d]/20">
            <p className="text-[#7dd87d] text-sm font-semibold text-center">{COOP.tokensNote}</p>
          </div>
        </div>
      )}
    </>
  );
}

// Governance on Hypha. Undated on purpose: the countdown this replaced pointed
// at a launch date that had already passed.
function HyphaGovernancePanel() {
  return (
    <div className="bg-[#0d2818]/70 rounded-2xl border border-[#7dd87d]/30 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a472a] to-[#0d2818] p-6 border-b border-[#7dd87d]/20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7dd87d]/20 border border-[#7dd87d]/40 mb-3">
          <span className="w-2 h-2 rounded-full bg-[#7dd87d]" />
          <span className="text-[#7dd87d] text-sm font-semibold">Dashboard in progress</span>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Live Governance on Hypha</h3>
        <p className="text-white/60 text-sm">Voice and active proposals already live on Hypha. We are building the dashboard that brings them onto this page.</p>
      </div>

      <div className="p-4 sm:p-8">
        {/* Preview wireframe: example proposals, not live data */}
        <div className="opacity-60 pointer-events-none select-none max-w-md mx-auto">
          <div className="bg-[#1a472a]/50 rounded-xl p-5 border border-[#7dd87d]/20">
            <p className="text-[#7dd87d] font-semibold text-sm mb-3">Example proposals</p>
            <div className="space-y-2">
              {["Season 2 Quest Themes", "New Alliance Partner: EcoLegal", "Seasonal Festival Agenda"].map(p => (
                <div key={p} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                  <span className="w-2 h-2 rounded-full bg-[#7dd87d] flex-shrink-0" />
                  <span className="text-white/60 text-xs min-w-0 truncate">{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <a href="https://app.hypha.earth/en/dho/regen-games/agreements" target="_blank" rel="noopener noreferrer">
            <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold min-h-[44px]">
              Open the Game Space on Hypha →
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Governance() {
  return (
    <PageWrapper>
      <SEO {...pageSEO.governance} />
      <JsonLD data={{
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "ReGen Civics Governance",
        "description": "Voice-based governance rooted in land and contribution. How ReGen Civics makes decisions, and who has a say.",
        "url": "https://regencivics.earth/governance",
        "isPartOf": { "@type": "WebSite", "url": "https://regencivics.earth" }
      }} />
    <div className="min-h-screen bg-gradient-to-b from-[#1a472a] to-[#0d2818]">
      <BackButton />
      <MobileTableOfContents sections={GOVERNANCE_SECTIONS} fallbackTitle="Governance" />

      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-5 py-2 mb-6 rounded-full bg-[#7dd87d] text-[#1a472a] text-sm font-semibold">
              <Globe className="w-5 h-5" />
              <span>Governance as Coordination Infrastructure</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
              How We Govern Regenerative Systems
            </h1>

            <p className="text-xl text-white/90 leading-relaxed safe-prose">
              ReGen Civics coordinates through Gratitude and Proposals. Internal signaling happens here. Formal governance and binding votes happen on <a href="https://app.hypha.earth" target="_blank" rel="noopener noreferrer" className="text-[#7dd87d] hover:underline">Hypha</a>, where vote weight comes from RGVoice held.
            </p>
          </div>
        </div>
      </section>

      {/* TLDR */}
      <div className="container max-w-4xl mx-auto px-4 mt-8">
        <TLDR points={[
          "RGVoice carries vote weight in the Game. Players earn it through quests, and it wanes 3% a month.",
          `The ${COOP.name} is in design. It is designed to vote one member, one vote.`,
          "Proposals start in the community forum, move to the ReGen Gov app for voting, then formalize on Hypha",
        ]} />
      </div>

      {/* Coordination Tools */}
      <section data-reveal className="py-12 px-4">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-[#7dd87d] mb-8 text-center" style={{ fontFamily: 'var(--font-display)' }}>
              Two Tools for Coordination
            </h2>
            {/* Contribution Scores card was removed 2026-04-23 until the scoring
                system is actually built out. Grid collapsed from 3 → 2 columns. */}
            <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="text-2xl mb-2">🙏</div>
                <h3 className="text-white font-bold mb-1">Gratitude</h3>
                <p className="text-white/60 text-sm">Send gratitude tokens to recognize valuable contributions. Your budget and multiplier grow with your citizenship tier.</p>
                <Link href="/economy" className="text-[#7dd87d] text-xs mt-2 block hover:underline">How gratitude works</Link>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="text-2xl mb-2">📜</div>
                <h3 className="text-white font-bold mb-1">Proposals</h3>
                <p className="text-white/60 text-sm safe-prose">Any Co-Creator can submit a proposal. The community signals support. Proposals that reach threshold move to <a href="https://app.hypha.earth" target="_blank" rel="noopener noreferrer" className="text-[#7dd87d] hover:underline">Hypha</a> for formal governance.</p>
                <Link href="/assembly" className="text-[#7dd87d] text-xs mt-2 block hover:underline">Visit the Assembly</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Pullquote>Two spaces, two governance systems, one shared mission. Voice is earned, and it stays with the people doing the work.</Pullquote>

      {/* Cooperative vs Game Governance Comparison Chart */}
      <section id="gov-comparison" data-reveal className="py-16 px-4 bg-[#0d2818]/50">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-[#7dd87d] mb-4 text-center">The Cooperative and the Game: Governance at a Glance</h2>
            <p className="text-white/80 text-lg leading-relaxed mb-4 text-center max-w-3xl mx-auto safe-prose">
              Two spaces, two ways of deciding, one shared mission. The Game runs today. The cooperative is in design.
            </p>
            <p className="text-white/60 text-sm leading-relaxed mb-10 text-center max-w-3xl mx-auto safe-prose">
              {COOP.designPrinciplesNote}
            </p>

            {/* Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left py-4 px-4 text-white/70 font-medium w-1/3">Dimension</th>
                    <th className="py-4 px-4 w-1/3">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-[#d4a574]/15 border border-[#d4a574]/50 flex items-center justify-center">
                          <Landmark className="w-5 h-5 text-[#d4a574]" aria-hidden="true" />
                        </div>
                        <span className="text-[#d4a574] font-bold text-base">The Cooperative</span>
                        <span className="text-white/70 text-xs">{COOP.statusLabel}</span>
                      </div>
                    </th>
                    <th className="py-4 px-4 w-1/3">
                      <div className="flex flex-col items-center gap-2">
                        <img
                          src={cdnImg("https://assets.regencivics.earth/dWhwxPMVWDYiuDpF.png")}
                          alt="RGVoice"
                          width="40"
                          height="40"
                          className="w-10 h-10 object-contain"
                          loading="lazy"
                        />
                        <span className="text-purple-400 font-bold text-base">ReGen Game</span>
                        <span className="text-white/70 text-xs">Play &amp; Community</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {[
                    {
                      dimension: 'How Decisions Are Made',
                      coop: 'One member, one vote',
                      game: 'Votes weighted by RGVoice',
                      coopColor: 'text-[#d4a574]',
                      gameColor: 'text-purple-400',
                    },
                    {
                      dimension: 'Who Takes Part',
                      coop: 'Land projects and the people who work with them',
                      game: 'Players, Quest Creators, Community Builders',
                      coopColor: 'text-white/80',
                      gameColor: 'text-white/80',
                    },
                    {
                      dimension: 'How Voice Is Held',
                      coop: "Through membership, which can't be sold or traded",
                      game: 'Merit-based: complete quests, contribute to community',
                      coopColor: 'text-white/80',
                      gameColor: 'text-white/80',
                    },
                    {
                      dimension: 'Voice Decay',
                      coop: 'Not part of the design: one member, one vote',
                      game: '3% monthly decay: keeps governance with active players',
                      coopColor: 'text-white/80',
                      gameColor: 'text-purple-300',
                    },
                    {
                      dimension: 'Leadership',
                      coop: 'A small elected board that rotates. The network hires the people who run the day-to-day work.',
                      game: 'No voting committee. Anyone can earn voice.',
                      coopColor: 'text-white/80',
                      gameColor: 'text-white/80',
                    },
                    {
                      dimension: 'What It Governs',
                      coop: 'Shared land, tools and services that members use',
                      game: 'Quest design, game rules, seasonal decisions',
                      coopColor: 'text-white/80',
                      gameColor: 'text-white/80',
                    },
                    {
                      dimension: 'Tokens',
                      coop: 'RCVoice and $RCivics come from the earlier fund design. Their role, if any, is being reviewed with counsel.',
                      game: 'RGVoice (voice) and $ReGen (the Game\'s token)',
                      coopColor: 'text-white/80',
                      gameColor: 'text-white/80',
                    },
                    {
                      dimension: 'Where It Stands',
                      coop: 'In design. Not yet a legal entity, and it accepts no money.',
                      game: 'Running today, with binding votes on Hypha DHO (on-chain)',
                      coopColor: 'text-[#d4a574]',
                      gameColor: 'text-purple-300',
                    },
                  ].map(({ dimension, coop, game, coopColor, gameColor }) => (
                    <tr key={dimension} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4 text-white/60 font-medium">{dimension}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={coopColor}>{coop}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={gameColor}>{game}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom note */}
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              <div className="bg-[#d4a574]/10 rounded-xl p-5 border border-[#d4a574]/30 text-center">
                <p className="text-[#d4a574] font-bold mb-2">The Cooperative</p>
                <p className="text-white/70 text-sm safe-prose">{COOP.whereItStands}</p>
                <Link href="/fund" className="inline-block mt-3">
                  <Button size="sm" className="bg-[#d4a574] text-[#1a472a] hover:bg-[#c49060] font-bold min-h-[44px]">
                    About the Cooperative &rarr;
                  </Button>
                </Link>
              </div>
              <div className="bg-purple-900/20 rounded-xl p-5 border border-purple-500/30 text-center">
                <p className="text-purple-400 font-bold mb-2">Game Governance</p>
                <p className="text-white/70 text-sm safe-prose">Designed for active community participation. The 3% decay rule ensures governance always belongs to those who are currently playing and contributing.</p>
                <a href="https://app.hypha.earth/en/dho/regen-games/agreements" target="_blank" rel="noopener noreferrer" className="inline-block mt-3">
                  <Button size="sm" className="bg-purple-700 text-white hover:bg-purple-800 font-bold min-h-[44px]">
                    Explore Game Governance &rarr;
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <StarsDivider className="my-8" />

      {/* Two Tokens, Two Powers */}
      <section id="gov-tokens" className="py-16 px-4">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-[#7dd87d] mb-4 text-center">Two Tokens, Two Powers</h2>
            <p className="text-white/80 text-lg leading-relaxed mb-10 text-center max-w-3xl mx-auto safe-prose">
              The Game uses two tokens. RGVoice governs decisions. $ReGen records contributions. The two are designed to work together.
            </p>
            <div className="flex justify-center mb-8">
              <img
                src="/images/governance/two-tokens-bridge.webp"
                alt="Two rivers meeting at a living bridge, one carrying coins and scales, the other carrying seeds, wreaths and open hands"
                width="1200"
                height="675"
                className="w-full rounded-xl shadow-2xl"
                loading="lazy"
              />
            </div>
            {/* Voice toggle + the token box that follows it */}
            <TwoTokensSection />
          </div>
        </div>
      </section>

      {/* Cooperative Design */}
      <section id="gov-coop-design" className="py-16 px-4 bg-[#0d2818]/50">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-[#7dd87d] mb-8 flex items-center gap-3 min-w-0">
              <Users className="w-8 h-8 flex-shrink-0" />
              <span className="min-w-0">{COOP.name}: How It Is Being Designed</span>
            </h2>

            <p className="text-white/90 text-lg leading-relaxed mb-8 safe-prose">
              {COOP.statement}
            </p>

            <p className="text-white/70 text-base leading-relaxed mb-6 safe-prose">
              {COOP.designPrinciplesNote}
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-10 safe-prose">
              {COOP.designPrinciples.map((p) => (
                <div key={p.title} className="bg-[#1a472a]/50 rounded-lg p-6 border-l-4 border-[#d4a574]">
                  <h3 className="text-lg font-bold text-[#d4a574] mb-2">{p.title}</h3>
                  <p className="text-white/80 text-sm leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>

            <div className="bg-[#0d2818]/50 rounded-lg p-6 border border-[#7dd87d]/30 text-center">
              <p className="text-white/80 text-sm leading-relaxed mb-4 safe-prose">{COOP.whereItStands}</p>
              <Link href="/loi">
                <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold min-h-[44px]">
                  Tell us you're interested
                </Button>
              </Link>
              <p className="text-white/60 text-xs mt-3 max-w-xl mx-auto safe-prose">{COOP.interestPromise}</p>
            </div>

            <p className="text-white/50 text-xs mt-6 text-center safe-prose">{COOP.notAnOffer}</p>
          </div>
        </div>
      </section>

      {/* Game Governance Section */}
      <section id="gov-game-structure" className="py-16 px-4 bg-[#0d2818]/50">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-[#7dd87d] mb-8 flex items-center gap-3 min-w-0">
              <ZapIcon className="w-8 h-8 flex-shrink-0" />
              <span className="min-w-0">ReGen Game: By the Players, For the Players</span>
            </h2>

            <p className="text-white/90 text-lg leading-relaxed mb-12 safe-prose">
              The ReGen Game runs on <strong>governance by active participation</strong>. Players earn voice through Quest completion and contributions, ensuring that those who are most engaged in the Game's mission have the greatest say in its direction.
            </p>

            {/* How Player Voice Works */}
            <div className="space-y-6 mb-12">
              <div className="bg-[#1a472a]/50 rounded-lg p-6 border-l-4 border-[#7dd87d]">
                <h3 className="text-xl font-bold text-[#7dd87d] mb-3">Earn Voice Through Action</h3>
                <p className="text-white/80">
                  Every quest completed = voice earned. Every contribution made = voice earned. The more you play and contribute, the more your voice grows. There's no minimum threshold; everyone who participates has a voice.
                </p>
              </div>

              <div className="bg-[#1a472a]/50 rounded-lg p-6 border-l-4 border-[#7dd87d]">
                <h3 className="text-xl font-bold text-[#7dd87d] mb-3">Monthly Voice Decay (3%)</h3>
                <p className="text-white/80">
                  Voice wanes by 3% each month. This ensures the game continuously shifts governance power to current active players. It doesn't matter if you joined a few years into the game; your voice grows with your participation and the game always belongs to those playing now.
                </p>
              </div>

              <div className="bg-[#1a472a]/50 rounded-lg p-6 border-l-4 border-[#7dd87d]">
                <h3 className="text-xl font-bold text-[#7dd87d] mb-3">Governance Through Growth</h3>
                <p className="text-white/80">
                  Quests are designed to increase your understanding, health, capability, awareness, and decision-making abilities. The more you play, the better equipped you are to make wise decisions about the Game's direction. Our thesis: the Game should be governed by those actively working on themselves.
                </p>
              </div>
            </div>

            {/* Seasonal Voting Process */}
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">Seasonal Voting Process</h3>
              <p className="text-white/80 text-sm mb-8 text-center">
                Every season, the ReGen Civics community gathers to propose, discuss, and vote on what shapes the Game and its direction.
              </p>
              <div className="flex justify-center">
                <img
                  src="/images/governance/seasonal-cycle.webp"
                  alt="Seasonal cycle showing the four seasons and the Seasonal Ceremony that begins each new cycle"
                  className="w-full max-w-2xl rounded-xl"
                  loading="lazy"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            </div>

            {/* Why This Model Works */}
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-white mb-6">Why?</h3>
              <div className="space-y-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-[#7dd87d]/30">
                  <h4 className="text-lg font-bold text-[#7dd87d] mb-3">Decentralized by Design</h4>
                  <p className="text-white/80">
                    No single player or group can dominate governance. Voice is earned through participation and naturally redistributes through monthly waning. The Game remains decentralized and responsive to the active community.
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-[#7dd87d]/30">
                  <h4 className="text-lg font-bold text-[#7dd87d] mb-3">Meritocratic and Inclusive</h4>
                  <p className="text-white/80">
                    There's no gatekeeping or voting committee. Anyone can participate and earn voice. New players can quickly gain influence by engaging deeply with quests and contributing to the community.
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-[#7dd87d]/30">
                  <h4 className="text-lg font-bold text-[#7dd87d] mb-3">Aligned with Regeneration</h4>
                  <p className="text-white/80">
                    Governance power flows to those who are most committed to personal and collective regeneration. The Game's direction is shaped by players who are actively healing themselves and contributing to the movement.
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-[#7dd87d]/30">
                  <h4 className="text-lg font-bold text-[#7dd87d] mb-3">Future-Proof</h4>
                  <p className="text-white/80">
                    The monthly voice decay ensures the Game never becomes stale or controlled by early players. As new seasons begin and new players join, the Game continuously refreshes its governance. It's always a Game for active players.
                  </p>
                </div>
              </div>
            </div>

            {/* Game Governance in Action */}
            <div className="bg-[#1a472a]/50 rounded-lg p-6 border border-[#7dd87d]/30">
              <h3 className="text-xl font-bold text-[#7dd87d] mb-4">Game Governance in Action</h3>
              <p className="text-white/80 mb-4">
                Players use their voice to:
              </p>
              <ul className="space-y-2 text-white/80 text-sm">
                <li className="flex gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#7dd87d] flex-shrink-0" />
                  <span>Vote on new quest designs and seasonal themes</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#7dd87d] flex-shrink-0" />
                  <span>Vote on Quest completion proposals submitted by other Players, confirming each quest was completed and the work did what it set out to do</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#7dd87d] flex-shrink-0" />
                  <span>Propose and approve Game rule changes</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#7dd87d] flex-shrink-0" />
                  <span>Determine token distribution and reward structures</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#7dd87d] flex-shrink-0" />
                  <span>Shape the Game's evolution and long-term vision</span>
                </li>
              </ul>
              <div className="mt-4 bg-[#7dd87d]/10 rounded-lg p-4 border border-[#7dd87d]/20">
                <p className="text-[#7dd87d] text-sm">
                  <strong>Why this matters:</strong> When you submit a Quest completion proposal, other Players will read it and learn from your work. This is why we make our proposals add real value: your contribution becomes part of the collective knowledge of the Game.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Collective Governance Matters */}
      <section id="gov-why-matters" className="py-16 px-4 bg-[#0d2818]/50">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-[#7dd87d] mb-12 text-center">
              Why Collective Governance Matters
            </h2>

            <div className="space-y-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-[#7dd87d]/30">
                <h3 className="text-xl font-bold text-[#7dd87d] mb-3">Building Trust Through Participation</h3>
                <p className="text-white/80">
                  When people have a voice in decisions that affect them, they come to care about the outcomes. Collective governance turns stakeholders into stewards.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-[#7dd87d]/30">
                <h3 className="text-xl font-bold text-[#7dd87d] mb-3">Distributed Wisdom</h3>
                <p className="text-white/80">
                  No single perspective holds all the answers. By bringing together land projects, domain experts, alliance organizations, players, and the people living in these communities, we access diverse wisdom and reduce blind spots.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-[#7dd87d]/30">
                <h3 className="text-xl font-bold text-[#7dd87d] mb-3">Regenerative Alignment</h3>
                <p className="text-white/80">
                  Governance structures that reflect regenerative principles (distributed, adaptive, inclusive, and growth-oriented) will naturally produce regenerative outcomes.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-[#7dd87d]/30">
                <h3 className="text-xl font-bold text-[#7dd87d] mb-3">Movement Infrastructure</h3>
                <p className="text-white/80">
                  ReGen Civics governance builds the infrastructure for a regenerative movement. We're modeling what collective governance can look like at scale and trying diverse strategies to reach our goals.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Governance as Movement Infrastructure */}
      <section id="gov-infrastructure" className="py-16 px-4 bg-[#0d2818]/50">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-[#7dd87d] mb-8 text-center">
              Governance as Movement Infrastructure
            </h2>

            <p className="text-white/90 text-lg leading-relaxed mb-8 text-center safe-prose">
              The governance systems we build today become the templates for tomorrow's regenerative societies. By creating transparent, participatory, and adaptive governance structures, we're demonstrating what's possible when we trust people to make wise decisions about their own futures.
            </p>

            <p className="text-white/90 text-lg leading-relaxed text-center safe-prose">
              The ReGenerative Renaissance requires governance that evolves with our understanding, includes those most affected by decisions, and aligns incentives toward collective wellbeing. ReGen Civics governance is designed to do exactly that.
            </p>
          </div>
        </div>
      </section>

      {/* Governance on Hypha */}
      <section id="gov-dashboard" className="py-16 px-4">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-[#7dd87d] mb-4 text-center">Governance on Hypha</h2>
            <p className="text-white/80 text-lg leading-relaxed mb-10 text-center max-w-3xl mx-auto safe-prose">
              Voice and active proposals live on Hypha, open for all to see.
            </p>
            <HyphaGovernancePanel />
          </div>
        </div>
      </section>

      <StarsDivider className="my-8" />

      {/* CTA Section */}
      <section id="gov-cta" className="py-20 px-4">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              Access Live Governance Spaces
            </h2>
            <p className="text-xl text-white/90 mb-8 safe-prose">
              Explore our live governance systems, join the next Seasonal Festival, or apply to become a land project or alliance partner.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="https://app.hypha.earth/en/dho/regen-civics/agreements" target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold">
                  ReGen Civics on Hypha →
                </Button>
              </a>
              <a href="https://app.hypha.earth/en/dho/regen-games/agreements" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="border-[#7dd87d] text-[#7dd87d] hover:bg-[#7dd87d]/10 font-bold">
                  Explore Game Governance →
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
    </PageWrapper>
  );
}
