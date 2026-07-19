/**
 * ReGen Community Onboarding
 *
 * Route: /regen-community-onboarding
 * A welcome hub for new members: the four entry paths and the Welcome Aboard
 * quests. Renders the same logged-out and logged-in; only the primary call to
 * action adapts. See the regen-community-onboarding skill for the source design.
 */

import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Compass,
  Users,
  Sprout,
  TrendingUp,
  Handshake,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const ENTRY_PATHS = [
  {
    icon: Users,
    title: "ReGen Game Players",
    who: "Community members and movement participants.",
    blurb:
      "Start with a first quest, earn your first tokens, and find where you belong.",
    href: "/quest",
    cta: "Play the game",
  },
  {
    icon: Sprout,
    title: "Land Projects",
    who: "Stewards of regenerative land.",
    blurb:
      "Tell us about your project, feel seen, and step into the incubator.",
    href: "/apply",
    cta: "Apply with your project",
  },
  {
    icon: TrendingUp,
    title: "Investors",
    who: "Capital allocators funding real-world regeneration.",
    blurb: "See the structure, the projects, and the returns.",
    href: "/investor",
    cta: "Explore the fund",
  },
  {
    icon: Handshake,
    title: "Alliance Partners",
    who: "Organisations with expertise or services to share.",
    blurb: "Find your value exchange and your fit in the network.",
    href: "/connect",
    cta: "Connect with us",
  },
];

const WELCOME_QUESTS = [
  "Share your experience and give constructive feedback",
  "Write your regenerative origin story",
  "Do a regenerative act",
  "Connect with your bioregion",
  "Make friends and support",
  "Pledge your gift",
  "Explore our foundations",
  "Refer an organisation project",
  "Refer a land project",
  "Dream up a regenerative quest",
];

const NEXT_STEPS = [
  {
    stage: "Arrival",
    text: "Pick your path and take one step. One invitation, not five.",
  },
  {
    stage: "First win",
    text: "Complete your first quest in your first week. It is meant to be small.",
  },
  {
    stage: "Rooting",
    text: "Connect with at least one other person here. Quest 5 is built for exactly this.",
  },
  {
    stage: "Contribution",
    text: "Earn a role, not just a seat. Your RGVoice becomes real votes, and Quest 10 invites you to design what comes next.",
  },
];

export default function RegenCommunityOnboarding() {
  const { isAuthenticated } = useAuth();
  const primaryCtaLabel = isAuthenticated
    ? "Go to your quests"
    : "Create your profile and start";

  return (
    <div className="min-h-screen bg-[#0d2818] text-white">
      <SEO
        title="Welcome Aboard: Join the ReGen Civics Community"
        description="New here? Find your path into the Regenerative Renaissance and start the Welcome Aboard quests. Four ways in, one first step you can take today."
        keywords="regen civics onboarding, community onboarding, welcome aboard quests, regenerative renaissance, how to join, regen game"
        url="/regen-community-onboarding"
      />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#1a472a] to-[#0d2818] px-4 pt-16 pb-14 border-b border-[#7dd87d]/20">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 text-[#7dd87d] text-xs font-semibold uppercase tracking-widest mb-4">
            <Compass className="w-4 h-4" />
            Welcome Aboard
          </div>
          <h1
            className="text-3xl md:text-5xl font-bold mb-5"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Find your place in the Regenerative Renaissance
          </h1>
          <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            You are not starting from scratch. You are joining something already
            in motion. However you arrived, there is a path here for you and a
            first step you can take today.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link
              href="/profile?tab=quests"
              className="inline-flex items-center justify-center gap-2 bg-[#7dd87d] text-[#0d2818] font-semibold px-6 py-3 rounded-xl hover:bg-[#6bc76b] transition-colors"
            >
              {primaryCtaLabel}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/quest"
              className="inline-flex items-center justify-center gap-2 border border-[#7dd87d]/40 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/5 transition-colors"
            >
              Browse the quests
            </Link>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-4 py-14 space-y-16">
        {/* Four entry paths */}
        <section>
          <h2
            className="text-2xl md:text-3xl font-bold mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Four ways in
          </h2>
          <p className="text-white/70 mb-8 max-w-2xl">
            Most people arrive through one of four doors. Pick the one that fits
            where you are right now. You can always walk through the others
            later.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {ENTRY_PATHS.map((path) => {
              const Icon = path.icon;
              return (
                <div
                  key={path.title}
                  className="border border-white/10 rounded-2xl bg-white/[0.03] backdrop-blur-sm p-6 flex flex-col"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Icon className="w-6 h-6 text-[#7dd87d]" />
                    <h3
                      className="text-lg font-bold"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {path.title}
                    </h3>
                  </div>
                  <p className="text-[#7dd87d]/90 text-sm font-medium mb-1">
                    {path.who}
                  </p>
                  <p className="text-white/75 text-sm leading-relaxed mb-5">
                    {path.blurb}
                  </p>
                  <Link
                    href={path.href}
                    className="mt-auto inline-flex items-center gap-1.5 text-[#7dd87d] font-semibold text-sm hover:text-[#7dd87d]/80 transition-colors"
                  >
                    {path.cta}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* Welcome Aboard quests */}
        <section>
          <h2
            className="text-2xl md:text-3xl font-bold mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Your first steps: the Welcome Aboard quests
          </h2>
          <p className="text-white/70 mb-6 max-w-2xl leading-relaxed">
            Ten small, meaningful acts root you in the community. Each takes
            fifteen to sixty minutes: a reflection shared on the forum, and a
            note about it to your world. Every quest is worth 33 $ReGen and 0.1
            RGVoice. Finish all ten and you earn 330 $ReGen, 1 RGVoice, and your
            first Claim.
          </p>
          <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-2 mb-8">
            {WELCOME_QUESTS.map((quest, i) => (
              <li key={quest} className="flex gap-3 text-white/80 text-sm">
                <span className="text-[#7dd87d] font-bold w-5 shrink-0">
                  {i + 1}
                </span>
                <span>{quest}</span>
              </li>
            ))}
          </ol>
          <Link
            href="/profile?tab=quests"
            className="inline-flex items-center gap-2 bg-[#7dd87d] text-[#0d2818] font-semibold px-6 py-3 rounded-xl hover:bg-[#6bc76b] transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Start your Welcome Aboard quests
          </Link>
        </section>

        {/* What happens next */}
        <section>
          <h2
            className="text-2xl md:text-3xl font-bold mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What happens next
          </h2>
          <div className="space-y-4">
            {NEXT_STEPS.map((step) => (
              <div key={step.stage} className="flex gap-4">
                <div className="text-[#7dd87d] font-semibold w-28 shrink-0 text-sm pt-0.5">
                  {step.stage}
                </div>
                <p className="text-white/80 text-sm leading-relaxed">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
          <p className="text-white/70 text-sm mt-8">
            Want the full picture? Read the{" "}
            <Link
              href="/co-creators-guide"
              className="text-[#7dd87d] underline hover:text-[#7dd87d]/80"
            >
              co-creators guide
            </Link>{" "}
            or meet everyone in the{" "}
            <Link
              href="/community"
              className="text-[#7dd87d] underline hover:text-[#7dd87d]/80"
            >
              community
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
