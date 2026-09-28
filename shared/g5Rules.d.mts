/** Types for shared/g5Rules.mjs (the gate G5 rulebook, plain JS so CI can run it under node). */

export interface G5Rule {
  label: string;
  re: RegExp;
}

export interface G5Finding {
  /** 1-based line number within the text. */
  line: number;
  /** The rule label, or the retired claim. */
  claim: string;
  /** The matched text (absent for retired claims). */
  match?: string;
  /** The trimmed line, cut to 160 characters. */
  text: string;
}

export declare const RETIRED: string[];
export declare const G5_RULES: G5Rule[];
export declare const TRACTION_RULE: G5Rule;

/** Retired claims in one file or text. */
export declare function findRetired(rel: string, text: string): G5Finding[];
/** G5 phrases in one file or text; `rel` decides whether code comment lines are skipped. */
export declare function findG5(rel: string, text: string): G5Finding[];
/** Hardcoded traction numbers in one file or text. */
export declare function findTraction(rel: string, text: string): G5Finding[];
/** Retired claims plus G5 phrases in a piece of prose. */
export declare function lintProse(text: string): G5Finding[];
