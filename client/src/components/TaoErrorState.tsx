/**
 * TaoErrorState - Reusable on-brand error / empty-state display.
 * Used by NotFound.tsx, ErrorBoundary fallbacks, and session-expiry overlay.
 * Uses plain <a> tags (not router hooks) so buttons work inside ErrorBoundary
 * where router context may be unavailable.
 */
import { SeedOfLifeSpinner } from "./SeedOfLifeSpinner";

interface TaoErrorStateLink {
  label: string;
  href: string;
}

interface TaoErrorStateProps {
  message?: string;
  subtext?: string;
  showCTAs?: boolean;
  extraLinks?: TaoErrorStateLink[];
}

export function TaoErrorState({
  message = "When we think things are broken, ponder the TAO...",
  subtext,
  showCTAs = true,
  extraLinks,
}: TaoErrorStateProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#0a1a0a] to-[#1a472a] text-center px-6">
      <SeedOfLifeSpinner size={72} className="text-[#7dd87d] mx-auto mb-6" />
      <p
        className="text-[#d4a574] text-lg font-light tracking-wide max-w-sm leading-relaxed mt-2"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {message}
      </p>
      {subtext && (
        <p className="text-[#7a9e7a]/60 text-sm mt-3">{subtext}</p>
      )}
      {showCTAs && (
        <div className="flex flex-wrap gap-3 justify-center mt-10 relative z-10">
          <a
            href="/"
            className="px-5 py-2.5 bg-[#1a472a] border border-[#7dd87d]/30 text-[#7dd87d] rounded-lg text-sm hover:border-[#7dd87d]/60 transition-colors no-underline"
          >
            Return Home
          </a>
          <a
            href="/community"
            className="px-5 py-2.5 bg-[#7dd87d]/10 border border-[#7dd87d]/20 text-[#7dd87d]/80 rounded-lg text-sm hover:border-[#7dd87d]/40 transition-colors no-underline"
          >
            Visit Community
          </a>
          {extraLinks?.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-5 py-2.5 bg-[#7dd87d]/10 border border-[#7dd87d]/20 text-[#7dd87d]/80 rounded-lg text-sm hover:border-[#7dd87d]/40 transition-colors no-underline"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
