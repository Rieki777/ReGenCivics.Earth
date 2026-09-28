/**
 * Form control classes for the funding admin panels. Same contract as
 * FIELD_CLASS in client/src/pages/AdminFunding.tsx: the site declares
 * color-scheme dark, so every control on these light surfaces pins
 * [color-scheme:light] and explicit colors, or native widgets render dark.
 */
export const FIELD_CLASS =
  "[color-scheme:light] w-full rounded-md border border-[#1a472a]/30 bg-white " +
  "text-[#1a472a] dark:text-[#1a472a] dark:bg-white " +
  "placeholder:text-[#1a472a]/75 dark:placeholder:text-[#1a472a]/75 " +
  "px-2.5 py-2 text-base md:text-sm pointer-coarse:min-h-11 " +
  "focus:outline-none focus:ring-2 focus:ring-[#1a472a]/40 focus:border-[#1a472a]/50";

export const SELECT_CLASS = `${FIELD_CLASS} pr-7`;

/** YYYY-MM-DD from whatever the API returns for a DATE or TIMESTAMP column. */
export function ymd(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? value : value.toISOString();
  return d.slice(0, 10);
}
