/**
 * ReGen Civics Co-Creators Guide / Game Guide
 *
 * Route: /co-creators-guide
 * Linked from: /governance page
 */

import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  BookOpen,
  ArrowRight,
  Heart,
  Users,
  Compass,
  Crown,
  Star,
  Circle,
  CheckCircle2,
  MessageCircle,
  Leaf,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  ClipboardList,
  Receipt,
  UserCheck,
  Vote,
  Sparkles,
  Globe,
  TreePine,
  Zap,
  Lightbulb,
  Wrench,
  PlayCircle,
  PlusCircle,
} from "lucide-react";

// Hypha Links (regen-games DHO)
const HYPHA_BASE = "https://app.hypha.earth/en/dho/regen-games";

const hyphaActions = [
  {
    icon: ClipboardList,
    title: "Start with an Agreement",
    subtitle: "Proposing a role, quest, or new contribution",
    description:
      "Before you begin any new type of contribution (a seasonal role, a quest, or a new initiative), open it to the community with an Agreement. Describe what you're bringing, what ReGen Civics receives, and what you're requesting in return. The community votes. Value in = value out.",
    cta: "Create Agreement",
    href: `${HYPHA_BASE}/agreements/create`,
    color: "border-teal-500/30 bg-teal-50",
    iconColor: "text-teal-700",
    iconBg: "bg-teal-100",
  },
  {
    icon: Receipt,
    title: "Claim Your Tokens",
    subtitle: "After completing a task, pay period, or season",
    description:
      "When you've done the work (completed a quest, finished a season as a role holder, or reached a milestone), come back and propose a Contribution Claim. Detail what you delivered, what ReGen Civics gained, and claim your tokens. This is how the value you create becomes visible and rewarded.",
    cta: "Propose a Contribution",
    href: `${HYPHA_BASE}/agreements/create/propose-contribution`,
    color: "border-emerald-500/30 bg-emerald-50",
    iconColor: "text-emerald-700",
    iconBg: "bg-emerald-100",
  },
  {
    icon: DollarSign,
    title: "Propose Expenses",
    subtitle: "When your work has real costs",
    description:
      "If your contribution requires purchasing materials, covering travel, or paying for services that benefit the community, propose those expenses for reimbursement. Be transparent and specific. The community is the budget committee here, and how you handle shared resources is part of your contribution.",
    cta: "Pay for Expenses",
    href: `${HYPHA_BASE}/agreements/create/pay-for-expenses`,
    color: "border-amber-500/30 bg-amber-50",
    iconColor: "text-amber-700",
    iconBg: "bg-amber-100",
  },
  {
    icon: UserCheck,
    title: "Delegate Your Voice",
    subtitle: "Trust someone to vote on your behalf",
    description:
      "Your voice is your governance power. It grows as you contribute. If you trust another member to represent your perspective while you're away or unavailable, you can delegate your voice to them. Choose someone whose judgment aligns with yours and whose commitment to the mission you trust.",
    cta: "View Members",
    href: `${HYPHA_BASE}/members`,
    color: "border-purple-500/30 bg-purple-50",
    iconColor: "text-purple-700",
    iconBg: "bg-purple-100",
  },
];

// How the game works in practice: scenario cards
const gameScenarios = [
  {
    icon: PlusCircle,
    color: "border-teal-500 bg-teal-50",
    iconColor: "text-teal-700",
    iconBg: "bg-teal-100",
    scenario: "You want to design a new quest",
    route: "Agreements",
    routeHref: `${HYPHA_BASE}/agreements/create`,
    explanation:
      "Describe the quest: what players will do, what the community gains, how tokens will be awarded on completion. The community votes to approve it. Once it passes, you're the quest designer. Go build it.",
    example: "\"I want to create a quest called Seed Saving Basics: players learn and practice seed saving, share a photo, and earn 80 tokens.\"",
  },
  {
    icon: PlayCircle,
    color: "border-emerald-500 bg-emerald-50",
    iconColor: "text-emerald-700",
    iconBg: "bg-emerald-100",
    scenario: "You completed a quest",
    route: "Contributions",
    routeHref: `${HYPHA_BASE}/agreements/create/propose-contribution`,
    explanation:
      "After you've done the work, come to Hypha and file a Contribution Claim. Show what you completed, attach your artifact or proof, and claim your tokens. This is how your effort becomes part of the permanent record.",
    example: "\"I completed the Bioregion Mapping quest. Here's the map I made. Claiming 120 tokens as agreed.\"",
  },
  {
    icon: Lightbulb,
    color: "border-purple-500 bg-purple-50",
    iconColor: "text-purple-700",
    iconBg: "bg-purple-100",
    scenario: "You want to propose an upgrade to the game",
    route: "Agreements",
    routeHref: `${HYPHA_BASE}/agreements/create`,
    explanation:
      "Got an idea for a new feature, a better process, or a change to how governance works? Propose it as an Agreement. Describe the change, why it improves the game, and what it costs (in time or tokens, if anything). The community decides.",
    example: "\"I want to propose we add a mentor role to the game: experienced players who onboard new ones, earning 50 tokens per mentee who completes their first quest.\"",
  },
  {
    icon: DollarSign,
    color: "border-amber-500 bg-amber-50",
    iconColor: "text-amber-700",
    iconBg: "bg-amber-100",
    scenario: "You had expenses in service of the community",
    route: "Expenses",
    routeHref: `${HYPHA_BASE}/agreements/create/pay-for-expenses`,
    explanation:
      "Hosting costs, materials for a community event, tools bought to run a quest, travel to represent the project: if it served ReGen Civics and was in the spirit of a community agreement, you can propose reimbursement. Document the expense clearly and submit it.",
    example: "\"I paid $47 for the domain we agreed to use for the land project directory. Requesting reimbursement.\"",
  },
];

interface NavPill {
  id: string;
  label: string;
}

const navPills: NavPill[] = [
  { id: "how-to-play", label: "How to Play" },
  { id: "r-ikigai", label: "R-Ikigai" },
  { id: "tokens", label: "Token Economy" },
  { id: "voice", label: "Voice & Governance" },
  { id: "hypha", label: "Hypha Platform" },
  { id: "circles", label: "Circles" },
  { id: "progression", label: "Path of Growth" },
];

const tokenItems = {
  earn: [
    { label: "Quests", range: "40 to 300 tokens" },
    { label: "Circle Roles (seasonal)", range: "200 to 500 / month" },
    { label: "Land Stewardship Shifts", range: "60 to 120" },
    { label: "Governance Participation", range: "Variable" },
  ],
  hold: [
    "Visible on your member profile",
    "Reflects your full contribution history",
    "Earns governance voice weight",
    "Records the trust the community has built with you",
  ],
  use: [
    "Cover community dues and shared expenses",
    "Convert to cash or equity as the project matures",
    "Participate in governance at greater weight",
    "Signal your contribution in Land Share discussions",
  ],
};

const circles = [
  { name: "Governance Circle", focus: "Sociocratic decisions, consent processes, constitutional updates" },
  { name: "Land and Ecology Circle", focus: "Regenerative land use, permaculture, ecological restoration" },
  { name: "Community Life Circle", focus: "Events, conflict resolution, celebration, and social fabric" },
  { name: "Economic Circle", focus: "Token economy, Hearts design, financial sustainability" },
  { name: "Communications Circle", focus: "Storytelling, social media, outreach, and platform growth" },
  { name: "Technology Circle", focus: "Platform development, tools, and digital infrastructure" },
];

const progressionStages = [
  { label: "Explorer", phase: "early", description: "Learning the game and the mission" },
  { label: "Player", phase: "early", description: "Completing first quests, earning first tokens" },
  { label: "Contributor", phase: "member", description: "Regular quest completion, Circle participation" },
  { label: "Circle Member", phase: "member", description: "Holding governance voice, seasonal roles" },
  { label: "Co-Creator", phase: "cocreator", description: "Shaping the game itself, proposing new systems" },
  { label: "Guide", phase: "guide", description: "Mentoring new players, holding institutional wisdom" },
];

export default function ReGenCoCreatorsGuide() {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* HERO */}
      <section className="py-24 bg-gradient-to-br from-emerald-900 to-teal-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-80 h-80 bg-emerald-400 rounded-full blur-3xl" />
        </div>
        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <BookOpen className="w-16 h-16 mx-auto mb-6 opacity-90" />
              <h1 className="font-display text-5xl md:text-6xl font-bold mb-6 leading-tight">
                The ReGen Civics Game Guide
              </h1>
              <p className="text-lg md:text-xl text-white/90 leading-relaxed max-w-2xl mx-auto safe-prose">
                How this game works. How the economy works. How decisions get made, how to use
                Hypha, and what the path from Explorer to Guide looks like.
              </p>
              <p className="text-sm text-white/50 mt-4">
                Also called: The Co-Creators Guide
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* QUICK NAV */}
      <section className="sticky top-16 z-40 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="container py-4">
          <div className="overflow-x-auto">
            <div className="flex gap-2 min-w-min">
              {navPills.map((pill) => (
                <motion.button
                  key={pill.id}
                  onClick={() => scrollToSection(pill.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap bg-emerald-100 text-emerald-900 hover:bg-emerald-200 transition-colors"
                >
                  {pill.label}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW TO PLAY: scenario-based guide */}
      <section id="how-to-play" className="py-20 bg-gray-50">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="max-w-5xl mx-auto"
          >
            <div className="mb-12 text-center">
              <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-3">
                How to Play the Game
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                Four scenarios you'll run into as a co-creator, and exactly where to go in Hypha
                for each one.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {gameScenarios.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={s.scenario}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.08 }}
                    className={`rounded-2xl border-2 ${s.color} p-6`}
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${s.iconColor}`} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-300 mb-1">When</p>
                        <h3 className="font-bold text-gray-900 text-lg leading-snug">{s.scenario}</h3>
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm leading-relaxed mb-4 safe-prose">{s.explanation}</p>

                    <div className="bg-white/70 rounded-xl px-4 py-3 mb-4 border border-gray-200">
                      <p className="text-xs font-semibold text-gray-300 mb-1">Example</p>
                      <p className="text-sm text-gray-700 italic">{s.example}</p>
                    </div>

                    <a
                      href={s.routeHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 text-sm font-semibold ${s.iconColor} hover:underline`}
                    >
                      Go to {s.route} on Hypha
                      <ExternalLink className="w-4 h-4 opacity-60" />
                    </a>
                  </motion.div>
                );
              })}
            </div>

            {/* Summary rule */}
            <div className="mt-10 rounded-2xl bg-emerald-900 text-white p-6 md:p-8 text-center">
              <h3 className="font-bold text-xl mb-3">The simple rule</h3>
              <p className="text-emerald-100 max-w-2xl mx-auto leading-relaxed safe-prose">
                Before you start something new, open an <strong>Agreement</strong>. After you've done
                the work, file a <strong>Contribution</strong>. If you had costs, submit an{" "}
                <strong>Expense</strong>. That's the whole loop.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* R-IKIGAI */}
      <section id="r-ikigai" className="py-20 bg-white">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="max-w-5xl mx-auto"
          >
            <div className="mb-12">
              <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-3">
                Your R-Ikigai
              </h2>
              <p className="text-gray-500 text-lg">
                The intersection of what you love, what you're good at, what the ReGenerative Renaissance needs, and what earns you tokens.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Venn */}
              <div className="relative w-full h-80 flex items-center justify-center">
                <svg viewBox="0 0 400 400" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                  <circle cx="200" cy="130" r="90" fill="rgba(16,185,129,0.2)" stroke="rgba(16,185,129,0.5)" strokeWidth="2" />
                  <circle cx="280" cy="240" r="90" fill="rgba(20,184,166,0.2)" stroke="rgba(20,184,166,0.5)" strokeWidth="2" />
                  <circle cx="120" cy="240" r="90" fill="rgba(5,150,105,0.2)" stroke="rgba(5,150,105,0.5)" strokeWidth="2" />
                  <circle cx="200" cy="200" r="60" fill="rgba(251,191,36,0.3)" stroke="rgba(251,191,36,0.6)" strokeWidth="2" />
                  <text x="200" y="72" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#065f46">What You LOVE</text>
                  <text x="325" y="260" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#065f46">What You're GOOD AT</text>
                  <text x="78" y="325" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#065f46">What We NEED</text>
                  <text x="285" y="145" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#92400e">What Earns TOKENS</text>
                  <text x="200" y="207" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#134e4a">R-Ikigai</text>
                </svg>
              </div>

              {/* Descriptions */}
              <div className="space-y-5">
                {[
                  { color: "border-emerald-500 bg-emerald-50", title: "What You LOVE", icon: Heart, iconColor: "text-emerald-600", text: "Your authentic desires and what brings you alive. What would you do even if no one paid you?" },
                  { color: "border-teal-500 bg-teal-50", title: "What You're GOOD AT", icon: Star, iconColor: "text-teal-600", text: "Your natural abilities and hard-won expertise. What do others come to you for?" },
                  { color: "border-green-600 bg-green-50", title: "What We NEED", icon: Leaf, iconColor: "text-green-700", text: "The gaps in building the ReGenerative Renaissance. Where can your gifts fill a real need right now?" },
                  { color: "border-amber-500 bg-amber-50", title: "What Earns TOKENS", icon: DollarSign, iconColor: "text-amber-600", text: "Roles, quests, and contributions the community values and is willing to compensate." },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className={`p-4 rounded-lg border-l-4 ${item.color}`}>
                      <h4 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${item.iconColor}`} />
                        {item.title}
                      </h4>
                      <p className="text-sm text-gray-600">{item.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* TOKEN ECONOMY */}
      <section id="tokens" className="py-20 bg-emerald-50">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <div className="mb-12 text-center">
              <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-3">
                The Token Economy
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto safe-prose">
                Tokens track the value you contribute to the ReGenerative Renaissance. Every
                meaningful act creates a record. As the ecosystem grows, that record converts
                to real economic participation.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-8">
              {[
                { title: "Earn Tokens", icon: TrendingUp, items: tokenItems.earn, iconColor: "text-emerald-600", iconBg: "bg-emerald-100", itemIcon: CheckCircle2, itemColor: "text-emerald-600" },
                { title: "Hold Tokens", icon: Heart, items: tokenItems.hold, iconColor: "text-teal-600", iconBg: "bg-teal-100", itemIcon: Star, itemColor: "text-teal-600" },
                { title: "Use Tokens", icon: Zap, items: tokenItems.use, iconColor: "text-amber-600", iconBg: "bg-amber-100", itemIcon: ArrowRight, itemColor: "text-amber-600" },
              ].map((col) => {
                const ColIcon = col.icon;
                const ItemIcon = col.itemIcon;
                return (
                  <motion.div
                    key={col.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`w-12 h-12 rounded-lg ${col.iconBg} flex items-center justify-center`}>
                        <ColIcon className={`w-6 h-6 ${col.iconColor}`} />
                      </div>
                      <h3 className="font-bold text-xl text-gray-900">{col.title}</h3>
                    </div>
                    <div className="space-y-3">
                      {col.items.map((item, i) => (
                        <div key={i} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                          <ItemIcon className={`w-5 h-5 ${col.itemColor} mt-0.5 flex-shrink-0`} />
                          <div>
                            {typeof item === "string" ? (
                              <p className="text-sm text-gray-700">{item}</p>
                            ) : (
                              <>
                                <p className="text-sm font-medium text-gray-900">{(item as any).label}</p>
                                <p className="text-xs text-gray-500">{(item as any).range}</p>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Flow */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 text-center">
              <h3 className="font-bold text-gray-900 mb-4">How Tokens Flow Through the Game</h3>
              <div className="flex flex-col md:flex-row items-center justify-center gap-3 flex-wrap min-w-0">
                {["Contribution", "Tokens Earned", "Governance Weight Grows", "Regenerative Loop"].map((step, i, arr) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-emerald-100 rounded-lg text-sm font-medium text-emerald-900">{step}</div>
                    {i < arr.length - 1 && <ArrowRight className="w-5 h-5 text-gray-300" />}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* VOICE & GOVERNANCE */}
      <section id="voice" className="py-20 bg-white">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <div className="mb-12 text-center">
              <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-3">
                Voice & Governance
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto safe-prose">
                ReGen Civics uses consent-based decision-making. Everyone holds a voice.
                That voice carries more weight the more you contribute.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
              <div>
                <h3 className="font-bold text-2xl text-gray-900 mb-6">How Proposals Work</h3>
                <div className="space-y-4">
                  {[
                    { step: "1", title: "Propose", description: "Anyone can raise a proposal. State clearly what you're bringing, what the community receives, and what you're requesting in return." },
                    { step: "2", title: "Clarify", description: "The circle asks clarifying questions: not debate, just understanding. Proposals may be refined." },
                    { step: "3", title: "Consent", description: "No reasoned objections means we move forward. We're not seeking unanimous love. Just no blocking concerns." },
                  ].map((item) => (
                    <div key={item.step} className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <span className="font-bold text-emerald-700">{item.step}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                        <p className="text-sm text-gray-500">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-2xl text-gray-900 mb-6">Key Principles</h3>
                {[
                  { icon: Circle, color: "border-emerald-500 bg-emerald-50", iconColor: "text-emerald-600", title: "Circles Hold Authority", text: "Each circle has decision-making power in its domain. No single person overrides the circle." },
                  { icon: MessageCircle, color: "border-teal-500 bg-teal-50", iconColor: "text-teal-600", title: "Objections vs. Disagreements", text: "A reasoned objection blocks progress. A preference is noted but doesn't stop the work. Know the difference." },
                  { icon: AlertCircle, color: "border-amber-500 bg-amber-50", iconColor: "text-amber-600", title: "Anyone Can Raise Concerns", text: "If you see a problem, say it. Silence isn't consent. Concerns make decisions better." },
                  { icon: Users, color: "border-purple-500 bg-purple-50", iconColor: "text-purple-600", title: "Voice Grows With Contribution", text: "The more you contribute, the more weight your vote carries on proposals. Skin in the game." },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className={`p-4 rounded-lg border-2 ${item.color}`}>
                      <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${item.iconColor}`} />
                        {item.title}
                      </h4>
                      <p className="text-sm text-gray-600">{item.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* HYPHA PLATFORM */}
      <section id="hypha" className="py-20 bg-teal-950 text-white">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <div className="mb-12 text-center max-w-3xl mx-auto">
              <span className="text-sm font-medium uppercase tracking-wide text-teal-300">
                Our Governance Platform
              </span>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4 mt-2">
                Hypha
              </h2>
              <p className="text-teal-100 text-lg safe-prose">
                Where governance happens in practice. Open-source, transparent, and owned by its
                contributors. No CEO. No board doling out budgets. Every proposal asks: does this
                contribution serve the mission equal to what's being requested?
              </p>
              <div className="mt-6">
                <a
                  href={HYPHA_BASE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-teal-500 text-white text-sm font-medium hover:bg-teal-400 transition-colors"
                >
                  Open ReGen Civics on Hypha
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Value philosophy */}
            <div className="max-w-3xl mx-auto mb-12 rounded-2xl border border-teal-700 bg-teal-900/50 p-6 md:p-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-teal-700 flex items-center justify-center flex-shrink-0">
                  <Vote className="w-5 h-5 text-teal-200" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg mb-2">
                    Value In = Value Out
                  </h3>
                  <p className="text-teal-100 text-sm leading-relaxed safe-prose">
                    Every proposal asks the community one question: does this contribution serve
                    ReGen Civics equal to the tokens being requested? Not time spent. Time is
                    not a contribution. What matters is value created, clearly articulated, and
                    honestly assessed. Your voice in those votes carries more weight the more
                    you contribute.
                  </p>
                </div>
              </div>
            </div>

            {/* 4 Action Cards */}
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {hyphaActions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <motion.div
                    key={action.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.08 }}
                    className="rounded-2xl bg-white p-6"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-10 h-10 rounded-xl ${action.iconBg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${action.iconColor}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{action.title}</h3>
                        <p className={`text-xs font-medium ${action.iconColor}`}>{action.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-gray-500 text-sm leading-relaxed mb-5 safe-prose">
                      {action.description}
                    </p>
                    <a
                      href={action.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 hover:underline"
                    >
                      {action.cta}
                      <ExternalLink className="w-4 h-4 opacity-50" />
                    </a>
                  </motion.div>
                );
              })}
            </div>

            {/* Sense > Propose > Create */}
            <div className="mt-12 max-w-3xl mx-auto grid sm:grid-cols-3 gap-4 text-center">
              {[
                { label: "Sense", description: "Find where your gifts are most needed right now" },
                { label: "Propose", description: "Open your intention to the community for consent" },
                { label: "Create", description: "Do the work. Document it. Claim what you're owed." },
              ].map((step) => (
                <div key={step.label} className="rounded-xl bg-teal-900/60 border border-teal-700 p-5">
                  <div className="text-2xl font-display font-bold text-teal-300 mb-2">{step.label}</div>
                  <p className="text-teal-100 text-sm">{step.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CIRCLES */}
      <section id="circles" className="py-20 bg-white">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <div className="mb-12 text-center">
              <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-3">
                Our Circles
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                ReGen Civics is organized into domain-specific circles, each with its own
                authority, budget, and contribution opportunities.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {circles.map((circle, idx) => (
                <motion.div
                  key={circle.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.07 }}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-4">
                    <Circle className="w-5 h-5 text-emerald-700" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{circle.name}</h3>
                  <p className="text-sm text-gray-500">{circle.focus}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* PATH OF GROWTH */}
      <section id="progression" className="py-20 bg-emerald-950 text-white">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <div className="mb-12 text-center">
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-3">
                Path of Growth
              </h2>
              <p className="text-emerald-200 text-lg max-w-2xl mx-auto">
                Your journey through ReGen Civics, from first exploration to deepest
                co-creation. Each stage has its own rights, responsibilities, and opportunities.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {progressionStages.map((stage, idx) => {
                const colors: Record<string, string> = {
                  early: "bg-emerald-800/50 border-emerald-600",
                  member: "bg-teal-800/50 border-teal-500",
                  cocreator: "bg-cyan-800/50 border-cyan-500",
                  guide: "bg-amber-800/50 border-amber-500",
                };
                return (
                  <motion.div
                    key={stage.label}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.06 }}
                    className={`rounded-xl border p-5 ${colors[stage.phase]}`}
                  >
                    <div className="font-display text-xl font-bold text-white mb-2">{stage.label}</div>
                    <p className="text-sm text-white/70">{stage.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="py-20 bg-white">
        <div className="container max-w-2xl text-center">
          <Sparkles className="w-10 h-10 text-emerald-600 mx-auto mb-4" />
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-4">
            Ready to Start Playing?
          </h2>
          <p className="text-gray-500 mb-8 safe-prose">
            Open Hypha, find a quest that fits your R-Ikigai, and make your first proposal.
            The game is waiting for your gifts.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`${HYPHA_BASE}/agreements/create`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-700 text-white font-medium hover:bg-emerald-600 transition-colors"
            >
              Open Hypha
              <ExternalLink className="w-4 h-4" />
            </a>
            <Link href="/quest">
              <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-emerald-700 text-emerald-700 font-medium hover:bg-emerald-50 transition-colors">
                Browse Quests
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
