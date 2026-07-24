/**
 * Shared helpers for the funding pipeline portal.
 *
 * Lives in shared/ because both sides need the dash rule: the server scrubs
 * generated copy before storing it, and the client scrubs the research columns
 * on the way to the screen (the seed carries ranges written with en-dashes,
 * like "$250K-$5M+").
 */

/**
 * Strip em-dashes and en-dashes out of copy.
 *
 * STEERING section 1.1 bans them in everything a person reads. The positioning
 * kernel tells the model the same thing, and the model reaches for one anyway,
 * so this is the enforcement rather than the ask.
 *
 * An en-dash between numbers is a range, so it becomes "to", which is how the
 * memo and the answer bank already write ranges ("7% to 345%"). Everything else
 * becomes a comma or a hyphen, whichever keeps the sentence readable.
 */
export function stripBannedDashes(text: string): string {
  return text
    // Numeric range: 7-345, $250K-$5M+, 15-25%. The unit character before the
    // dash matters: the seed writes sizes as "$250K-$5M+", not "$250-$5".
    .replace(/(\d[\d,.]*\s*(?:%|[KMBkmb])?)\s*[–—]\s*(\$?\d)/g, "$1 to $2")
    // Spaced dash used as a break: "weeks - not years".
    .replace(/\s+[–—]\s+/g, ", ")
    // Tight em-dash between words: "months—each build".
    .replace(/([^\s])—([^\s])/g, "$1, $2")
    // Anything left: a tight en-dash is a compound, an em-dash is a break.
    .replace(/–/g, "-")
    .replace(/—/g, ", ")
    // The replacements above can leave ", ," or " ,".
    .replace(/,\s*,+/g, ",")
    .replace(/\s+,/g, ",");
}

/** Scrub a nullable field for display. Returns "" when there is nothing to show. */
export function cleanField(value: string | null | undefined): string {
  return value ? stripBannedDashes(value) : "";
}
