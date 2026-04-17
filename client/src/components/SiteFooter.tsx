/**
 * SiteFooter - Shared footer component for all pages.
 * Includes: copyright, social links, legal links, Manage Cookies, and email preferences.
 * Mobile-first layout matching the enchanted forest theme.
 */

import { Link } from "wouter";
import { SocialLinks } from "@/components/SocialLinks";
import { resetCookieConsent } from "@/components/CookieConsent";
import { Cookie, Lightbulb, Mail } from "lucide-react";
import { FooterSearch } from "@/components/FooterSearch";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { NewsletterSignupInline } from "@/components/NewsletterSignup";

export default function SiteFooter() {
  return (
    <footer className="relative py-8 md:py-10 border-t border-white/10" role="contentinfo" aria-label="Site footer">
      <div className="container">
        {/* Top row: Logo + Tagline */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center gap-2 mb-2">
            <img
              src="/images/logos/regencivics-logo-dark-transparent-rounded.webp"
              alt="ReGen Civics"
              width="56"
              height="56"
              className="h-14 w-14 object-contain"
            />
          </div>
          <p className="text-white/70 text-xs max-w-sm leading-relaxed">
            An Infinite Game for the Regenerative Renaissance.
            Healthier lands, healthier people, increasing real world value.
          </p>
        </div>

        {/* Primary actions nav for sitelink signals */}
        <nav aria-label="Primary actions" className="flex flex-wrap justify-center gap-4 mb-8">
          <Link href="/community" className="text-[#7dd87d] hover:text-white text-sm font-medium transition-colors py-1.5 px-3">
            Sign In
          </Link>
          <Link href="/apply" className="text-[#7dd87d] hover:text-white text-sm font-medium transition-colors py-1.5 px-3">
            Apply
          </Link>
          <Link href="/quest" className="text-[#7dd87d] hover:text-white text-sm font-medium transition-colors py-1.5 px-3">
            Quests
          </Link>
          <Link href="/crowd-pooling" className="text-[#7dd87d] hover:text-white text-sm font-medium transition-colors py-1.5 px-3">
            Crowd Pooling
          </Link>
          <Link href="/fund" className="text-[#7dd87d] hover:text-white text-sm font-medium transition-colors py-1.5 px-3">
            The Fund
          </Link>
          <Link href="/community" className="text-[#7dd87d] hover:text-white text-sm font-medium transition-colors py-1.5 px-3">
            Community
          </Link>
          <Link href="/glossary" className="text-[#7dd87d] hover:text-white text-sm font-medium transition-colors py-1.5 px-3">
            Glossary
          </Link>
        </nav>

        {/* Suggest a Feature standout CTA */}
        <div className="mb-8 px-4 py-5 rounded-2xl bg-gradient-to-br from-[#7dd87d]/15 to-[#4a7c59]/10 border border-[#7dd87d]/30 text-center">
          <h3 className="text-[#7dd87d] text-lg font-semibold mb-1">Help shape this platform</h3>
          <p className="text-white/70 text-sm mb-3">
            Community governance means your ideas become the build queue. Drop what you want next.
          </p>
          <Link href="/features">
            <span className="inline-flex items-center gap-2 bg-[#7dd87d] text-[#0d2818] hover:bg-[#9de89d] font-semibold px-6 py-3 rounded-xl shadow-md min-h-[44px] transition-colors cursor-pointer">
              <Lightbulb className="w-4 h-4" />
              Suggest a Feature
            </span>
          </Link>
        </div>

        {/* Middle row: Navigation columns */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-6 mb-8 text-sm">
          {/* Explore */}
          <div>
            <h3
              className="text-[#7dd87d] font-bold text-xs uppercase tracking-wider mb-3"
              style={{ fontFamily: "var(--font-accent)" }}
            >
              Explore
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/fund" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
                  Investors
                </Link>
              </li>
              <li>
                <Link href="/land" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
                  Land Projects
                </Link>
              </li>
              <li>
                <Link href="/ally" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
                  Alliance Partners
                </Link>
              </li>
              <li>
                <Link href="/play" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
                  Players
                </Link>
              </li>
            </ul>
          </div>

          {/* Participate */}
          <div>
            <h3
              className="text-[#7dd87d] font-bold text-xs uppercase tracking-wider mb-3"
              style={{ fontFamily: "var(--font-accent)" }}
            >
              Participate
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/seasons" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
                  Seasons
                </Link>
              </li>
              <li>
                <Link href="/schedule" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
                  Open Sessions
                </Link>
              </li>
              <li>
                <Link href="/apply" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
                  Apply
                </Link>
              </li>
              <li>
                <Link href="/team" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
                  Team
                </Link>
              </li>
            </ul>
          </div>

          {/* Game */}
          <div>
            <h3
              className="text-[#7dd87d] font-bold text-xs uppercase tracking-wider mb-3"
              style={{ fontFamily: "var(--font-accent)" }}
            >
              Game
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/game" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
                  Game Overview
                </Link>
              </li>
              <li>
                <Link href="/game-mechanics" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
                  Game Mechanics
                </Link>
              </li>
              <li>
                <Link href="/quest" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
                  Start Questing
                </Link>
              </li>
              <li>
                <Link href="/crowd-pooling-projects" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
                  Crowd Pool Campaigns
                </Link>
              </li>
              <li>
                <Link href="/crowd-pooling" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
                  Crowd Pool Calculator
                </Link>
              </li>
              <li>
                <Link href="/calculator" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
                  Contribution Calculator
                </Link>
              </li>
              <li>
                <Link href="/governance" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
                  Governance
                </Link>
              </li>
              <li>
                <Link href="/tokenomics" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
                  Tokenomics
                </Link>
              </li>
              <li>
                <Link href="/bionomics" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
                  Bionomics
                </Link>
              </li>
              <li>
                <Link href="/tools" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
                  Tools Library
                </Link>
              </li>
              <li>
                <Link href="/bionomics#local-food-economies" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
                  Local Food Economy
                </Link>
              </li>
            </ul>
          </div>

          {/* Learn */}
          <div>
            <h3
              className="text-[#7dd87d] font-bold text-xs uppercase tracking-wider mb-3"
              style={{ fontFamily: "var(--font-accent)" }}
            >
              Learn
            </h3>
            <ul className="space-y-2">
              <li><Link href="/blog" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">Blog</Link></li>
              <li><Link href="/glossary" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">Glossary</Link></li>
              <li><Link href="/community" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">Community Forum</Link></li>
              <li><Link href="/map" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">World Map</Link></li>
              <li><Link href="/connect" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">Connect</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3
              className="text-[#7dd87d] font-bold text-xs uppercase tracking-wider mb-3"
              style={{ fontFamily: "var(--font-accent)" }}
            >
              Legal
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy-policy" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms-of-use" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link href="/risk-disclosure" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
                  Risk Disclosure
                </Link>
              </li>
              <li>
                <Link href="/disclaimers" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
                  Disclaimers
                </Link>
              </li>
            </ul>
          </div>

          {/* Subscribe + Preferences */}
          <div className="col-span-2 md:col-span-1">
            <h3
              className="text-[#7dd87d] font-bold text-xs uppercase tracking-wider mb-3"
              style={{ fontFamily: "var(--font-accent)" }}
            >
              Stay in the Loop
            </h3>
            <NewsletterSignupInline className="mb-4" />
            <ul className="space-y-2">
              <li>
                <button
                  onClick={resetCookieConsent}
                  className="text-white/60 hover:text-white transition-colors text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Cookie className="w-3 h-3" />
                  Manage Cookies
                </button>
              </li>
              <li>
                <Link href="/unsubscribe" className="text-white/60 hover:text-white transition-colors text-xs inline-flex items-center gap-1.5">
                  <Mail className="w-3 h-3" />
                  Email Preferences
                </Link>
              </li>
              <li>
                <PWAInstallButton />
              </li>
            </ul>
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <FooterSearch />
        </div>

        {/* Social links */}
        <div className="flex justify-center mb-6">
          <SocialLinks size="md" gap="lg" />
        </div>

        {/* Bottom row: Copyright */}
        <div className="border-t border-white/10 pt-4 text-center">
          <p className="text-white/65 text-xs">
            &copy; {new Date().getFullYear()}{" "}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noope