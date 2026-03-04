/**
 * ReGen Players Path - Biofi-style continuous background
 * Cards mention ReGen Game tokens + 1 RGVoice per action
 * Each card links to relevant section with big button
 * Finishes with massive CTA to /game and /quest
 */

import { Link } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Users,
  Sparkles,
  Coins,
  ShoppingBag,
  ScrollText,
  Handshake,
  Sprout,
  Crown,
  Heart,
  Calendar,
  Zap,
  Globe,
  ExternalLink,
  Compass,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import PageBackground from "@/components/PageBackground";
import { AnimatedSection } from "@/components/AnimatedSection";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { SocialLinks } from "@/components/SocialLinks";
import { SEO } from "@/components/SEO";
import { BackButton } from "@/components/BackButton";
import AutoplayVideo from "@/components/AutoplayVideo";

// Action card component with token info and linked button(s)
function ActionCard({
  icon: Icon,
  title,
  description,
  tokenInfo,
  linkTo,
  linkLabel,
  isExternal = false,
  links,
  accentColor = "text-[#7dd87d]",
  bgAccent = "bg-[#7dd87d]/15",
  borderAccent = "border-[#7dd87d]/20",
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  tokenInfo: string;
  linkTo: string;
  linkLabel: string;
  isExternal?: boolean;
  links?: { label: string; href: string; isExternal?: boolean; variant?: "primary" | "outline" }[];
  accentColor?: string;
  bgAccent?: string;
  borderAccent?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Build the links array: if `links` prop provided, use it; otherwise build from single linkTo/linkLabel
  const allLinks = links || [{ label: linkLabel, href: linkTo, isExternal, variant: "primary" as const }];
  
  return (
    <div className={`glass-panel p-6 md:p-8 ${borderAccent}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left"
      >
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-lg ${bgAccent} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-6 h-6 ${accentColor}`} />
          </div>
          <div className="flex-1">
            <h3
              className={`text-xl md:text-2xl font-bold text-white`}
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h3>
          </div>
          <div className="flex-shrink-0 mt-1">
            {isOpen ? (
              <ChevronUp className={`w-6 h-6 ${accentColor}`} />
            ) : (
              <ChevronDown className={`w-6 h-6 ${accentColor}`} />
            )}
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="mt-4 ml-16">
          <p className="text-white/70 text-base leading-relaxed mb-3">{description}</p>

          {/* Token earnings info */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${bgAccent} mb-4`}>
            <Coins className={`w-4 h-4 ${accentColor} flex-shrink-0`} />
            <p className={`text-sm font-medium ${accentColor}`}>{tokenInfo}</p>
          </div>

          {/* Button(s) */}
          <div className="flex flex-col gap-2">
            {allLinks.map((link, i) => {
              const isPrimary = link.variant !== "outline";
              if (link.isExternal) {
                return (
                  <a key={i} href={link.href} target="_blank" rel="noopener noreferrer" className="block">
                    <Button
                      className={isPrimary
                        ? `w-full bg-[#7dd87d] text-[#1a472a] hover:bg-[#6bc86b] font-bold py-3 text-base h-auto`
                        : `w-full font-bold py-3 text-base h-auto border-[#7dd87d]/40 text-[#7dd87d] hover:bg-[#7dd87d]/10`
                      }
                      variant={isPrimary ? "default" : "outline"}
                      style={{ fontFamily: "var(--font-accent)" }}
                    >
                      {link.label}
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </a>
                );
              }
              return (
                <Link key={i} href={link.href}>
                  <Button
                    className={isPrimary
                      ? `w-full bg-[#7dd87d] text-[#1a472a] hover:bg-[#6bc86b] font-bold py-3 text-base h-auto`
                      : `w-full font-bold py-3 text-base h-auto border-[#7dd87d]/40 text-[#7dd87d] hover:bg-[#7dd87d]/10`
                    }
                    variant={isPrimary ? "default" : "outline"}
                    style={{ fontFamily: "var(--font-accent)" }}
                  >
                    {link.label}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TokenSystemCollapsible() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="glass-panel p-6 md:p-8 border-amber-400/20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center">
              <Coins className="w-5 h-5 text-amber-400" />
            </div>
            <h3
              className="text-xl font-bold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Explore Token Details
            </h3>
          </div>
          {isOpen ? (
            <ChevronUp className="w-6 h-6 text-amber-400" />
          ) : (
            <ChevronDown className="w-6 h-6 text-amber-400" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="p-5 rounded-xl bg-amber-400/5 border border-amber-400/15">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-amber-400" />
                </div>
                <h3
                  className="text-xl font-bold text-amber-400"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  ReGen Game Tokens
                </h3>
              </div>
              <p className="text-white/70 text-base leading-relaxed">
                Our in-game currency earned through every action in the game. Trade them, spend them in the bioregional marketplace, or use them to access premium game features. These tokens flow through the regenerative economy.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#7dd87d]/5 border border-[#7dd87d]/15">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-[#7dd87d]" />
                </div>
                <h3
                  className="text-xl font-bold text-[#7dd87d]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  RGVoice Tokens
                </h3>
              </div>
              <p className="text-white/70 text-base leading-relaxed">
                1 RGVoice token for each action. These represent your governance voice in the ReGen Civics ecosystem. They give you voting power on fund allocation, project selection, alliance governance, and the evolution of the game itself.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                icon: ScrollText,
                label: "Earn Both",
                desc: "Every action earns ReGen Game tokens + 1 RGVoice",
              },
              {
                icon: Globe,
                label: "Govern",
                desc: "RGVoice = voting power on fund and alliance decisions",
              },
              {
                icon: Heart,
                label: "Grow",
                desc: "Your tokens and voice grow with participation over time",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="p-4 rounded-lg bg-white/5 border border-white/10 text-center"
              >
                <item.icon className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                <p
                  className="text-amber-400 text-sm font-bold mb-1"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {item.label}
                </p>
                <p className="text-white/50 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Play() {
  return (
    <PageBackground
      backgroundImage="https://assets.regencivics.earth/MjNNpKCrJVSfNhoW.webp"
      mobileBackgroundImage="https://assets.regencivics.earth/ZokDJKuGchcGPgoK.webp"
      blurPlaceholder="https://assets.regencivics.earth/YnxggxEPecMtDtdd.webp"
      mobileBlurPlaceholder="https://assets.regencivics.earth/WkKtePagbKLEHDCB.webp"
      overlayOpacity={0.6}
      theme="magic"
      blendColor="20, 30, 45"
      sectionOverlays={[
        { id: "hero", opacity: 0.40 },             // Hero - magical game world, show vibrancy
        { id: "why-games", opacity: 0.50 },         // Why games - let colorful art show
        { id: "seasons", opacity: 0.55 },            // Seasons overview
        { id: "how-to-play", opacity: 0.50 },        // How to play - engaging, lighter
        { id: "cta", opacity: 0.55 },                // Call to action
      ]}
    >
      <SEO
        title="Play - Join the Infinite Game"
        description="Everyone can play. Trade, quest, claim, join, or catalyze. Choose your level of dedication and help regenerate civilization through the Infinite Game."
        url="/play"
      />

      {/* Hero */}
      <section className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-4">
            <BackButton />
          </div>

          <AnimatedSection animation="fade-in">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full glass-panel-light text-amber-400 text-base"
              style={{ fontFamily: "var(--font-accent)" }}
            >
              <Sparkles className="w-5 h-5" />
              <span>Player Path</span>
            </div>
          </AnimatedSection>


          <AnimatedSection animation="slide-up" delay={200}>
            <h1
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 text-white leading-tight text-shadow-strong"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Anyone / <span className="text-amber-400">ReGen Players</span>
            </h1>
          </AnimatedSection>

          <AnimatedSection animation="slide-up" delay={400}>
            <p
              className="text-lg md:text-xl lg:text-2xl text-white/80 mb-4 leading-relaxed max-w-3xl mx-auto text-shadow-subtle"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Everyone can play. Whether you have five minutes or five years, there is a way to
              participate in regenerating civilization. Choose your level and jump in.
            </p>
            <p
              className="text-xl md:text-2xl text-amber-400 font-semibold mb-8 text-shadow-subtle"
              style={{ fontFamily: "var(--font-display)" }}
            >
              At what level do we want to play the Infinite Game?
            </p>
          </AnimatedSection>

          {/* Hero Video - Autoplay on scroll */}
          <AnimatedSection animation="scale-in" delay={600}>
            <div className="max-w-2xl mx-auto mb-8">
              <AutoplayVideo
                videoId="C9U0JTsqKv8"
                title="How to Play the Infinite Game"
                thumbnailUrl="https://assets.regencivics.earth/NnpPOudclSlFoAuh.png"
                thumbnailAlt="Playing the Game - Participating in the ReGenerative Renaissance"
                playLabel="How to Play the Infinite Game"
              />
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Easy Mode - Cards with token info and links */}
      <section className="py-12 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection animation="slide-up">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#7dd87d]/30" />
              <h2
                className="text-3xl md:text-5xl font-bold text-white text-center text-shadow-strong"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Easy <span className="text-[#7dd87d]">Mode</span>
              </h2>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#7dd87d]/30" />
            </div>
            <p
              className="text-white/60 text-center mb-8 max-w-xl mx-auto text-lg text-shadow-subtle"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Low dedication, high impact. Start here and go deeper whenever you are ready.
            </p>
          </AnimatedSection>

          <div className="space-y-4">
            <AnimatedSection animation="slide-up" delay={100}>
              <ActionCard
                icon={ScrollText}
                title="QUEST! Complete Games and Tasks"
                description="Brew potions from your microbiome, save seeds for your bioregion, forage wild mushrooms and herbs, dream your ideal homestead, host a healing circle, or learn to talk with trees. Each quest deepens your connection to the living world and earns you tokens."
                tokenInfo="Earn ReGen Game tokens + 1 RGVoice token for each quest completed"
                linkTo="/quest"
                linkLabel="Start Questing"
              />
            </AnimatedSection>

            <AnimatedSection animation="slide-up" delay={200}>
              <ActionCard
                icon={ShoppingBag}
                title="TRADE! As a Bioregional Merchant"
                description="Set up your fee-free shop at LocalScale.org and become a bioregional merchant. Sell your products, services, or crafts to the regenerative community. No platform fees, no middlemen, just direct connection."
                tokenInfo="Earn ReGen Game tokens + 1 RGVoice token for setting up your shop!"
                linkTo="https://localscale.org"
                linkLabel="Trade on LocalScale"
                isExternal={true}
                links={[
                  { label: "Trade on LocalScale", href: "https://localscale.org", isExternal: true, variant: "primary" },
                  { label: "Watch How to Use LocalScale", href: "https://youtu.be/BiaPoJDqYI0?si=mAp3p2VGXMdSyjlG", isExternal: true, variant: "outline" },
                ]}
              />
            </AnimatedSection>

            <AnimatedSection animation="slide-up" delay={300}>
              <ActionCard
                icon={Crown}
                title="CLAIM! Your Contributions"
                description="Already doing regenerative work? Claim your historical and current contributions to the ReGenerative Renaissance. Whether you have planted trees, built community, taught permaculture, or supported land projects, your contributions deserve recognition."
                tokenInfo="Earn ReGen Game tokens + 1 RGVoice token for each verified claim"
                linkTo="/game"
                linkLabel="Claim Contributions"
              />
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* High Dedication */}
      <section className="py-12 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection animation="slide-up">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-400/30" />
              <h2
                className="text-3xl md:text-5xl font-bold text-white text-center text-shadow-strong"
                style={{ fontFamily: "var(--font-display)" }}
              >
                High <span className="text-amber-400">Dedication</span>
              </h2>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-400/30" />
            </div>
            <p
              className="text-white/60 text-center mb-8 max-w-xl mx-auto text-lg text-shadow-subtle"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Ready to go deeper? These paths require more commitment and offer more impact.
            </p>
          </AnimatedSection>

          <div className="space-y-4">
            <AnimatedSection animation="slide-up" delay={100}>
              <ActionCard
                icon={Handshake}
                title="JOIN! An Existing Organization or Village"
                description="Join an existing organization in the alliance or a land project that is already underway. Bring your skills, energy, and vision to a community that is already building. Whether you are a designer, farmer, developer, teacher, healer, or builder, there is a place for you."
                tokenInfo="Earn unique tokens with the projects directly for your contributions!"
                linkTo="/connect"
                linkLabel="Find Your Community"
                accentColor="text-amber-400"
                bgAccent="bg-amber-400/15"
                borderAccent="border-amber-400/20"
              />
            </AnimatedSection>

            <AnimatedSection animation="slide-up" delay={200}>
              <ActionCard
                icon={Sprout}
                title="CATALYZE! A New Organization or Village"
                description="Have a vision for a new organization or village? We have a Crowd Pooling tool that helps projects crowd pool all the resources they need to get started or grow to the next stage of their maturity! Catalyze it into existence through the ReGen Civics network."
                tokenInfo="Co-create unique tokens by copying or creating a new Game for a new project."
                linkTo="/crowd-pooling-projects"
                linkLabel="Crowd Pool Campaigns"
                accentColor="text-amber-400"
                bgAccent="bg-amber-400/15"
                borderAccent="border-amber-400/20"
                links={[
                  { label: "Crowd Pool Campaigns", href: "/crowd-pooling-projects", variant: "primary" },
                  { label: "Watch Crowd Pooling Explainer", href: "https://youtu.be/jxKR-WneJp0", isExternal: true, variant: "outline" },
                ]}
              />
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Quest Animation */}
      <section className="py-8 md:py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection animation="fade-in">
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-[#7dd87d]/20">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-auto"
              >
                <source src="https://assets.regencivics.earth/WZgPeSZvhJLTVpCn.mp4" type="video/mp4" />
              </video>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Token System */}
      <section className="py-12 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection animation="slide-up">
            <h2
              className="text-3xl md:text-5xl font-bold text-white mb-3 text-center text-shadow-strong"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <span className="text-amber-400">ReGen Game Tokens</span> + <span className="text-[#7dd87d]">RGVoice</span>
            </h2>
            <p
              className="text-white/60 text-center mb-8 max-w-2xl mx-auto text-lg text-shadow-subtle"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Two tokens working together: ReGen Game tokens as our in-game currency, and RGVoice tokens for governance.
            </p>
            <div className="max-w-lg mx-auto mb-4 px-4 py-3 rounded-xl bg-amber-400/15 border border-amber-400/30 text-center">
              <p className="text-amber-400 font-bold text-base" style={{ fontFamily: "var(--font-display)" }}>
                NOTE: These tokens are unique from the Fund tokens!
              </p>
            </div>
          </AnimatedSection>

          <TokenSystemCollapsible />
        </div>
      </section>

      {/* MASSIVE CTA Section */}
      <section className="py-16 md:py-28 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Primary CTA - Learn More at /game */}
          <AnimatedSection animation="scale-in">
            <div className="glass-panel p-8 md:p-14 text-center border-amber-400/30 mb-6">
              <Globe className="w-16 h-16 text-amber-400 mx-auto mb-6" />
              <h2
                className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 text-shadow-strong"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Want to Learn <span className="text-amber-400">More?</span>
              </h2>
              <p className="text-white/70 text-lg md:text-xl mb-8 max-w-2xl mx-auto">
                Dive deep into the game mechanics, token economics, seasonal cycles, and how the Infinite Game creates real-world regenerative impact.
              </p>
              <Link href="/game">
                <Button
                  className="bg-amber-400 text-[#1a472a] hover:bg-amber-300 font-bold px-12 py-6 text-xl md:text-2xl h-auto shadow-lg shadow-amber-400/20"
                  style={{ fontFamily: "var(--font-accent)" }}
                >
                  <Globe className="w-7 h-7 mr-3" />
                  Explore the Game
                  <ArrowRight className="w-7 h-7 ml-3" />
                </Button>
              </Link>
            </div>
          </AnimatedSection>

          {/* Secondary CTA - Get Started at /quest */}
          <AnimatedSection animation="scale-in" delay={200}>
            <div className="glass-panel p-8 md:p-14 text-center border-[#7dd87d]/30">
              <Compass className="w-16 h-16 text-[#7dd87d] mx-auto mb-6" />
              <h2
                className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 text-shadow-strong"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Ready to <span className="text-[#7dd87d]">Start?</span>
              </h2>
              <p className="text-white/70 text-lg md:text-xl mb-8 max-w-2xl mx-auto">
                Jump straight into your first quest. No sign-up required. Just pick a quest and begin your journey in the Infinite Game.
              </p>
              <Link href="/quest">
                <Button
                  className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#6bc86b] font-bold px-12 py-6 text-xl md:text-2xl h-auto shadow-lg shadow-[#7dd87d]/20"
                  style={{ fontFamily: "var(--font-accent)" }}
                >
                  <Compass className="w-7 h-7 mr-3" />
                  Start Your Quest
                  <ArrowRight className="w-7 h-7 ml-3" />
                </Button>
              </Link>
            </div>
          </AnimatedSection>

          {/* Join Open Session */}
          <AnimatedSection animation="slide-up" delay={400}>
            <div className="text-center mt-8">
              <p className="text-white/50 text-base mb-3">Not sure where to start?</p>
              <Link href="/schedule">
                <Button
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 font-bold px-8 py-4 text-lg h-auto"
                  style={{ fontFamily: "var(--font-accent)" }}
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Join an Open Session First
                </Button>
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </PageBackground>
  );
}
