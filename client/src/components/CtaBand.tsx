/**
 * CtaBand — a single, beautiful end-of-page call to action.
 *
 * Used to give every key page one obvious next step. Two tones: "forest" for
 * dark sections and "cream" for light ones. Renders a primary action plus an
 * optional secondary link, with an ambient glow and a quiet entrance that
 * respects prefers-reduced-motion.
 *
 * Primary action can be a route (href) or a handler (onClick). Both fire an
 * analytics cta_click with the given `cta` id so the funnel is measurable.
 */
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type Tone = "forest" | "cream";

export interface CtaBandProps {
  /** Small uppercase label above the title. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  primaryLabel: string;
  primaryHref?: string;
  onPrimaryClick?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
  onSecondaryClick?: () => void;
  /** Stable id for analytics, e.g. "home_hero", "fund_footer". */
  cta: string;
  tone?: Tone;
  className?: string;
}

const TONES: Record<Tone, {
  section: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  primary: string;
  secondary: string;
  glowA: string;
  glowB: string;
}> = {
  forest: {
    section: "bg-gradient-to-b from-[#0d2818] to-[#0a1f0f] text-white",
    eyebrow: "text-[#7dd87d]/80 border-[#7dd87d]/30 bg-[#7dd87d]/10",
    title: "text-white",
    subtitle: "text-white/70",
    primary: "bg-[#7dd87d] text-[#0d2818] hover:bg-[#9de89d]",
    secondary: "text-white/85 border-white/25 hover:bg-white/10",
    glowA: "bg-[#7dd87d]/20",
    glowB: "bg-[#2d7d8a]/15",
  },
  cream: {
    section: "bg-gradient-to-b from-[#f4efe7] to-[#e9e2d6] text-[#1a472a]",
    eyebrow: "text-[#1a472a]/75 border-[#7dd87d]/30 bg-white/60",
    title: "text-[#1a472a]",
    subtitle: "text-[#1a472a]/75",
    primary: "bg-[#1a472a] text-white hover:bg-[#0d2818]",
    secondary: "text-[#1a472a] border-[#1a472a]/25 hover:bg-[#1a472a]/5",
    glowA: "bg-[#7dd87d]/25",
    glowB: "bg-[#1a472a]/10",
  },
};

export function CtaBand({
  eyebrow,
  title,
  subtitle,
  primaryLabel,
  primaryHref,
  onPrimaryClick,
  secondaryLabel,
  secondaryHref,
  onSecondaryClick,
  cta,
  tone = "forest",
  className,
}: CtaBandProps) {
  const t = TONES[tone];

  const firePrimary = () => {
    analytics.ctaClick(`${cta}_primary`, cta);
    onPrimaryClick?.();
  };
  const fireSecondary = () => {
    analytics.ctaClick(`${cta}_secondary`, cta);
    onSecondaryClick?.();
  };

  const primaryClass = cn(
    "group/cta inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-bold shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7dd87d] min-h-[48px]",
    t.primary
  );
  const secondaryClass = cn(
    "inline-flex items-center justify-center gap-2 rounded-full border px-6 py-3 text-base font-semibold transition-colors min-h-[48px]",
    t.secondary
  );

  return (
    <section className={cn("relative overflow-hidden py-16 md:py-20 px-4", t.section, className)}>
      <div className={cn("pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl", t.glowA)} />
      <div className={cn("pointer-events-none absolute -bottom-28 -right-20 w-96 h-96 rounded-full blur-3xl", t.glowB)} />

      <div className="container relative max-w-3xl mx-auto text-center motion-safe:animate-[fadeInUp_0.6s_ease-out]">
        {eyebrow && (
          <span className={cn("inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] border rounded-full px-4 py-1.5 mb-5", t.eyebrow)}>
            {eyebrow}
          </span>
        )}
        <h2
          className={cn("text-3xl md:text-4xl lg:text-[2.75rem] font-bold leading-tight", t.title)}
          style={{ fontFamily: "var(--font-display, serif)" }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className={cn("text-base md:text-lg mt-4 leading-relaxed max-w-xl mx-auto", t.subtitle)}>
            {subtitle}
          </p>
        )}

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          {primaryHref ? (
            <Link href={primaryHref} onClick={firePrimary} className={primaryClass}>
              {primaryLabel}
              <ArrowRight className="w-5 h-5 transition-transform group-hover/cta:translate-x-1" />
            </Link>
          ) : (
            <button type="button" onClick={firePrimary} className={primaryClass}>
              {primaryLabel}
              <ArrowRight className="w-5 h-5 transition-transform group-hover/cta:translate-x-1" />
            </button>
          )}

          {secondaryLabel && (secondaryHref ? (
            <Link href={secondaryHref} onClick={fireSecondary} className={secondaryClass}>
              {secondaryLabel}
            </Link>
          ) : (
            <button type="button" onClick={fireSecondary} className={secondaryClass}>
              {secondaryLabel}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default CtaBand;
