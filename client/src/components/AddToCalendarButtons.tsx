/**
 * Back-compat wrapper. New call sites should use CalendarCta so Subscribe
 * stays the primary action and one-shot Google/Apple adds stay secondary.
 */
export { CalendarCta as AddToCalendarButtons } from "./CalendarCta";
