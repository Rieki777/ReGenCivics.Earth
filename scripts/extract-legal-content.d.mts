/**
 * Types for the legal-content extractor, so server/legal-content.test.ts can
 * import it without tsc falling back to `any`.
 *
 * The script stays plain .mjs because it also runs standalone from the command
 * line (`node scripts/extract-legal-content.mjs`), the same way every other
 * guard in scripts/ does.
 */
export interface ExtractedLegalPage {
  slug: string;
  title: string;
  lastUpdated: string | null;
  html: string | null;
}

export declare const LEGAL_PAGES: { slug: string; file: string }[];
export declare function jsxToHtml(src: string): string | null;
export declare function extractAll(): ExtractedLegalPage[];
export declare function render(pages: ExtractedLegalPage[]): string;
