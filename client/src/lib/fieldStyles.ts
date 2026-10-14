/**
 * Field styles for a light card (white or parchment) on a public page.
 *
 * Public pages run with <html class="dark">, and the shared Input, Textarea
 * and Select carry dark: fills and a dark-theme placeholder colour. On a white
 * card those turn the field grey and the placeholder near invisible (1.28:1
 * on the player profile form). These classes win back the light look with a
 * 3:1 edge and a 4.5:1 placeholder (pnpm ui:audit:live).
 */
export const LIGHT_CARD_FIELD =
  "bg-white dark:bg-white text-[#1a472a] border-[#1a472a]/60 placeholder:text-[#1a472a]/70 focus-visible:border-[#1a472a] focus-visible:ring-[#7dd87d]/50";
