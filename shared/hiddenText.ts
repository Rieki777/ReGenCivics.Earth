/**
 * Characters that let text hide or disguise itself on a public page or in a
 * prompt: control characters other than tab and line breaks, zero-width
 * characters, the word joiner and invisible operators, bidi overrides, the
 * byte-order mark, and the Unicode tag characters that can spell out text no
 * one sees. Built from code points, so no escape sequence lands in this file
 * as the character itself (shared/seasonSchedule.ts cleanNoteText keeps its
 * own, older set).
 */
const HIDDEN_TEXT = new RegExp(
  "[" +
    [[0x00, 0x08], [0x0b, 0x0c], [0x0e, 0x1f], [0x7f, 0x7f], [0x200b, 0x200f], [0x202a, 0x202e], [0x2060, 0x2064], [0x2066, 0x2069], [0xfeff, 0xfeff], [0xe0000, 0xe007f]]
      .map(([a, b]) => (a === b ? String.fromCodePoint(a) : `${String.fromCodePoint(a)}-${String.fromCodePoint(b)}`))
      .join("") +
    "]",
  "gu",
);

/** The text with every hidden character dropped; spacing and line breaks stay as they were. */
export function stripHiddenText(raw: string): string {
  return raw.replace(HIDDEN_TEXT, "");
}
