/**
 * Optional needs/offers capture for application forms (Phase B2).
 * Every application form in the system carries this section; the text flows
 * into the needs and offers board (project_needs / player_offers), tagged
 * with the source form, and joins deterministic matching.
 * Spec: CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md.
 */

interface NeedsOffersFieldsProps {
  needsText: string;
  offersText: string;
  onNeedsChange: (v: string) => void;
  onOffersChange: (v: string) => void;
  /** "light" for cream/white form backgrounds, "dark" for glass panels. */
  variant?: "light" | "dark";
}

export function NeedsOffersFields({
  needsText,
  offersText,
  onNeedsChange,
  onOffersChange,
  variant = "light",
}: NeedsOffersFieldsProps) {
  const label =
    variant === "dark" ? "block text-white/80 text-sm mb-1" : "block text-[#1a472a] text-sm font-medium mb-1";
  const hint = variant === "dark" ? "text-white/60 text-xs" : "text-[#1a472a]/75 text-xs";
  const field =
    variant === "dark"
      ? "w-full rounded-xl border bg-white/5 border-white/15 text-white placeholder-white/30 px-3 py-2 text-sm focus:outline-none focus:border-[#7dd87d]/40"
      : "w-full rounded-md border bg-white border-[#1a472a]/20 text-[#1a472a] placeholder-[#1a472a]/40 px-3 py-2 text-sm focus:outline-none focus:border-[#7dd87d]/60";

  return (
    <div className="space-y-4">
      <div>
        <label className={label}>What do you need? (optional)</label>
        <textarea
          value={needsText}
          onChange={(e) => onNeedsChange(e.target.value.slice(0, 2000))}
          rows={2}
          placeholder="Tools, skills, materials, hands. Specific asks find matches."
          className={field}
        />
      </div>
      <div>
        <label className={label}>What can you offer? (optional)</label>
        <textarea
          value={offersText}
          onChange={(e) => onOffersChange(e.target.value.slice(0, 2000))}
          rows={2}
          placeholder="Skills, time, tools, materials you'd share with the network."
          className={field}
        />
      </div>
      <p className={hint}>
        These feed the ReGen needs and offers board. When a need meets an offer, both sides get an introduction
        email.
      </p>
    </div>
  );
}
