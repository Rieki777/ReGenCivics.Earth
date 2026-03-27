/**
 * BackButton - Disabled. Returns null to safely remove all 27 floating back
 * buttons without breaking existing imports.
 */
export function BackButton({
  fallbackPath = "/",
  label = "Back",
  inline = false,
}: {
  fallbackPath?: string;
  label?: string;
  inline?: boolean;
}) {
  return null;
}
