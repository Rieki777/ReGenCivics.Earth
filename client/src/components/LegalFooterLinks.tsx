/**
 * LegalFooterLinks - Shared legal links for all page footers
 * Provides consistent links to Risk Disclosure, Terms of Use, Privacy Policy, and Full Disclaimers
 */

import { Link } from "wouter";

export function LegalFooterLinks() {
  return (
    <div className="flex flex-wrap justify-center gap-3 sm:gap-4 text-xs text-white/65 mt-3">
      <Link href="/risk-disclosure" className="hover:text-white/60 transition-colors">
        Risk Disclosure
      </Link>
      <span className="text-white/35">|</span>
      <Link href="/terms-of-use" className="hover:text-white/60 transition-colors">
        Terms of Use
      </Link>
      <span className="text-white/35">|</span>
      <Link href="/privacy-policy" className="hover:text-white/60 transition-colors">
        Privacy Policy
      </Link>
      <span className="text-white/35">|</span>
      <Link href="/disclaimers" className="hover:text-white/60 transition-colors">
        Disclaimers
      </Link>
    </div>
  );
}
