/**
 * Interactive content blocks for the ReGen Ship blog post. Rendered via
 * SPECIAL_MARKERS in BlogPost.tsx so the key sections read as designed,
 * active elements instead of plain paragraphs. These render on the dark
 * article background, so text is light with green and gold accents.
 */
import { Link } from "wouter";
import { Anchor, Sparkles, Share2, ClipboardCheck, Dice5, ArrowRight } from "lucide-react";
import { FreeVoyageLadder as SharedFreeVoyageLadder } from "@/components/ship/FreeVoyageLadder";

/** The interactive ladder, on the dark article background, with article spacing. */
export function FreeVoyageLadder() {
  return (
    <div className="my-10">
      <SharedFreeVoyageLadder onDark />
    </div>
  );
}

/** Three active cards: reach 150 points, you're in the draw, bookings unlock more. */
export function ShipQuestSteps() {
  const steps = [
    { icon: ClipboardCheck, title: "Reach 150 points", body: "Real regenerative actions, each worth points, each one verified. No single action is required." },
    { icon: Dice5, title: "You're in the draw", body: "Reach 150 points and you're in every draw. Your points are your raffle tickets, so every point above raises your odds." },
    { icon: Share2, title: "Bookings unlock more", body: "Help fill the calendar. More free voyages release as she books up, and you're in every single draw." },
  ];
  return (
    <div className="my-8 grid gap-3 sm:grid-cols-3">
      {steps.map(({ icon: Icon, title, body }, i) => (
        <div key={title} className="rounded-xl border border-[#7dd87d]/20 bg-[#7dd87d]/5 p-4 transition-all hover:-translate-y-1 hover:border-[#7dd87d]/40 hover:bg-[#7dd87d]/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffd700]/20 text-[#ffd700] font-bold text-sm">{i + 1}</span>
            <Icon className="h-5 w-5 text-[#7dd87d]" />
          </div>
          <p className="font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm leading-snug text-white/70">{body}</p>
        </div>
      ))}
    </div>
  );
}

/** Closing call to action, a glowing gold panel. */
export function ShipArticleCTA() {
  const links: Array<{ href: string; label: string; primary?: boolean }> = [
    { href: "/ship/quest", label: "Enter the quest", primary: true },
    { href: "/ship/quest/rules", label: "Read the rules" },
    { href: "/ship", label: "See the ship" },
  ];
  return (
    <div className="my-10 quest-card-gold rounded-2xl border border-[#ffd700]/50 bg-gradient-to-br from-[#ffd700]/15 to-[#d4a574]/10 p-6 text-center">
      <Anchor className="h-8 w-8 mx-auto text-[#ffd700] mb-2" />
      <h3 className="text-xl font-bold text-white mb-1">Free voyages, drawn as she books up</h3>
      <p className="text-white/80 mb-5">The more of us who help her fill the calendar, the more of us sail free.</p>
      <div className="flex flex-wrap justify-center gap-3">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`inline-flex items-center gap-1 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
              l.primary
                ? "bg-[#ffd700] text-[#1a472a] hover:bg-[#ffe14d]"
                : "border border-white/40 text-white hover:bg-white/10"
            }`}
          >
            {l.label} {l.primary && <ArrowRight className="h-4 w-4" />}
          </Link>
        ))}
      </div>
    </div>
  );
}

/** A large pull quote to break up the reading and set the tone. */
export function ShipPullQuote() {
  return (
    <blockquote className="my-10 border-l-4 border-[#ffd700] pl-5">
      <p className="text-xl sm:text-2xl font-semibold text-white leading-snug flex items-start gap-2">
        <Sparkles className="h-6 w-6 text-[#ffd700] flex-shrink-0 mt-1" />
        The more the fleet sails, the more of us sail free.
      </p>
    </blockquote>
  );
}
