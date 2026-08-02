/**
 * Rich content blocks for the "Your SEEDS Contributions Live On" blog post.
 * Rendered via SPECIAL_MARKERS in BlogPost.tsx so the post's key sections read
 * as designed blocks instead of plain paragraphs.
 */

import React from 'react';
import {
  Users,
  Wrench,
  Coins,
  Sprout,
  BookOpen,
  GraduationCap,
  Sparkles,
  Palette,
  HeartPulse,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

// The nine capitals of shared/capitals.ts, in the order this post reads them.
// Health is ours, added to the standard eight; see /learn/nine-forms-of-capital.
const FORMS_OF_CAPITAL: { icon: React.ElementType; name: string; desc: string }[] = [
  { icon: Users, name: 'Social capital', desc: 'relationships, networks, trust you built' },
  { icon: Wrench, name: 'Material capital', desc: 'tools, equipment, land improvements, physical infrastructure' },
  { icon: Coins, name: 'Financial capital', desc: 'money or crypto invested or donated' },
  { icon: Sprout, name: 'Living capital', desc: 'ecological restoration, food forests, soil health, biodiversity' },
  { icon: BookOpen, name: 'Intellectual capital', desc: 'research, documentation, writing, design, code' },
  { icon: GraduationCap, name: 'Experiential capital', desc: 'knowledge passed on, mentorship, facilitation, training' },
  { icon: Sparkles, name: 'Spiritual capital', desc: 'ceremonies, spiritual practices, trauma work, deep healing, the intangible things that hold communities together' },
  { icon: Palette, name: 'Cultural capital', desc: 'art, music, stories, identity, meaning' },
  { icon: HeartPulse, name: 'Health capital', desc: 'movement, bodywork, nutrition, recovery, the care that kept people able to work' },
];

/** The nine forms of capital as an icon grid. */
export function NineFormsOfCapital() {
  return (
    <div className="my-8 grid gap-3 sm:grid-cols-2">
      {FORMS_OF_CAPITAL.map(({ icon: Icon, name, desc }) => (
        <div
          key={name}
          className="flex items-start gap-3 rounded-xl border border-[#7dd87d]/20 bg-[#7dd87d]/5 p-4 transition-colors hover:border-[#7dd87d]/40 hover:bg-[#7dd87d]/10"
        >
          <span className="flex-shrink-0 rounded-lg bg-[#7dd87d]/15 p-2 text-[#7dd87d]">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-white">{name}</p>
            <p className="text-sm leading-snug text-white/70">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Zero-tolerance fraud warning, rendered as a callout instead of raw [!WARNING]. */
export function FraudWarningCallout() {
  return (
    <div className="my-8 flex gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-5">
      <AlertTriangle className="h-6 w-6 flex-shrink-0 text-red-400" />
      <div className="min-w-0">
        <p className="font-bold text-red-300">Zero tolerance for fraud</p>
        <p className="mt-1 text-sm leading-relaxed text-white/80">
          Our ecosystem is rooted in trust. Without that we have nothing. If your claim
          isn't verified on chain, or you attempt to misrepresent your contributions, your
          claim will be denied, you'll lose your opportunity to claim again, and you'll be
          banned from participating in ReGen Civics.
        </p>
      </div>
    </div>
  );
}

/** Prominent CTA for people who simply bought SEEDS and want to claim their $ReGen. */
export function ClaimSeedsCTA() {
  return (
    <div className="my-8 rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/15 to-amber-600/5 p-6 text-center sm:p-8">
      <h3 className="text-2xl font-bold text-white sm:text-3xl">
        Claim your <span className="text-amber-400">$ReGen</span> for the SEEDS you bought
      </h3>
      <p className="mx-auto mt-3 max-w-xl text-white/80">
        If you purchased SEEDS and want to simply claim your $ReGen, price your purchase and
        claim it here. It takes a few minutes.
      </p>
      <a
        href="/claim-seeds"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-8 py-4 text-lg font-bold text-white shadow-[0_0_24px_rgba(245,158,11,0.4)] transition-all hover:bg-amber-600 hover:shadow-[0_0_36px_rgba(245,158,11,0.6)]"
      >
        Price your purchase and claim
        <ArrowRight className="h-5 w-5" />
      </a>
    </div>
  );
}
