import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PageSectionProps {
  children: ReactNode;
  className?: string;
  /** Removes default vertical padding — use when nesting inside another section */
  noPadding?: boolean;
  as?: "section" | "div" | "article";
}

/**
 * PageSection — the standard section wrapper.
 *
 * Applies consistent horizontal padding and vertical rhythm from design tokens:
 *   px-4 md:px-8 (spacing.md → spacing.xl)
 *   py-12 md:py-16 (3rem → 4rem vertical rhythm)
 *
 * Use this instead of hand-rolling px/py on every section.
 */
export function PageSection({
  children,
  className,
  noPadding = false,
  as: Tag = "section",
}: PageSectionProps) {
  return (
    <Tag
      className={cn(
        "w-full px-4 md:px-8",
        !noPadding && "py-12 md:py-16",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export default PageSection;
