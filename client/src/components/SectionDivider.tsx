import { cn } from "@/lib/utils";

interface SectionDividerProps {
  className?: string;
}

/**
 * SectionDivider — a horizontal rule using the sage border token at
 * standard opacity. Replace inline <hr> or border-t dividers with this.
 */
export function SectionDivider({ className }: SectionDividerProps) {
  return (
    <hr
      className={cn("border-0 border-t border-[#4a7c59]/30 my-8", className)}
      aria-hidden="true"
    />
  );
}

export default SectionDivider;
