/** Types for shared/applicationLint.mjs (the application draft lint core). */

/** A question's limits: the seed JSON uses snake_case, database rows camelCase. */
export interface LintQuestion {
  char_limit?: number | null;
  word_limit?: number | null;
  charLimit?: number | null;
  wordLimit?: number | null;
}

export interface LintResult {
  chars: number;
  words: number;
  /** Hard rules: over a limit, G5, a retired claim, a dash. */
  errors: string[];
  /** Context decides: AI words, contrast framing, unconfirmed numbers. */
  warnings: string[];
}

export interface MetricLike {
  display?: string | number | null;
  displayValue?: string | number | null;
  value?: string | number | null;
  valueNumeric?: string | number | null;
}

export declare const AI_WORDS: string[];
export declare const CONTRAST_PATTERNS: RegExp[];
/** [VERIFY ...], [DECIDE], [TODO], $X, [N]: never allowed into a portal. */
export declare const PLACEHOLDER_PATTERNS: RegExp[];

/** Split a markdown draft into order -> answer by numbered headings. */
export declare function parseDraft(markdown: string): Map<number, string>;
/** Characters as a portal counts them: code points, newlines included. */
export declare function charCount(text: string): number;
export declare function wordCount(text: string): number;
/** Numbers that read as claims ($10K, 50+, 66, 12%); years and small counts are skipped. */
export declare function extractNumbers(text: string): string[];
/** "$10K" and "10,000" both become "10000"; percentages keep their sign. */
export declare function normalizeNumber(raw: string): string | null;
/** Lint one answer against one question. Pure. */
export declare function lintAnswer(question: LintQuestion, answer: string, confirmedNumbers?: Set<string>): LintResult;
/** Confirmed numbers as a set of normalized strings, from metrics rows. */
export declare function confirmedNumberSet(rows: MetricLike[] | null | undefined): Set<string>;
